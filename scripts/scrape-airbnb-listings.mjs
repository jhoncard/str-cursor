import { chromium } from "playwright";

const listings = [
  { key: "cozy-room-tampa", url: "https://www.airbnb.com/h/tampacoziness" },
  { key: "room-paradise-tampa", url: "https://www.airbnb.com/h/tamparoomparadaise" },
  { key: "small-house-tampa", url: "https://www.airbnb.com/h/smallhousetampa" },
  { key: "st-pete-oasis", url: "https://www.airbnb.com/h/poolplaystpete" },
];

function toNumber(value) {
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function extractFromText(text) {
  const normalized = text.replace(/\u00a0/g, " ");

  const title =
    normalized.match(/^(.+?)\n(?:\d+\s+guest|\d+\s+bedroom|SUPERHOST|Entire home)/im)?.[1]?.trim() ?? null;

  const ratingMatch = normalized.match(/(\d\.\d{1,2})\s*[·•]?\s*(\d{1,4})\s+reviews?/i);
  const rating = toNumber(ratingMatch?.[1]);
  const reviewCount = ratingMatch?.[2] ? Number.parseInt(ratingMatch[2], 10) : null;

  const maxGuests = normalized.match(/(\d+)\s+guests?/i)?.[1];
  const bedrooms = normalized.match(/(\d+)\s+bedrooms?/i)?.[1];
  const beds = normalized.match(/(\d+)\s+beds?/i)?.[1];
  const bathrooms = normalized.match(/(\d+(?:\.\d+)?)\s+baths?/i)?.[1];

  const hostMatch = normalized.match(/Hosted by\s+([A-Za-z][A-Za-z\s'-]{1,40})/i);
  const hostName = hostMatch?.[1]?.trim() ?? null;
  const isSuperhost = /superhost/i.test(normalized);

  const checkInFrom = normalized.match(/Check-?in(?:\s+time)?\s*(?:after|from)\s*([0-9: ]+(?:AM|PM))/i)?.[1] ?? null;
  const checkOutBy = normalized.match(/Check-?out(?:\s+time)?\s*(?:before|by)\s*([0-9: ]+(?:AM|PM))/i)?.[1] ?? null;

  const cancellationPolicy =
    normalized.match(/(Free cancellation[^\n.]*[.\n]?)/i)?.[1]?.trim() ??
    normalized.match(/(Non-refundable[^\n.]*[.\n]?)/i)?.[1]?.trim() ??
    null;

  const nightlyPrice =
    toNumber(normalized.match(/\$([0-9]{2,5})(?:\s*night|\s*\/\s*night)/i)?.[1]) ??
    toNumber(normalized.match(/([0-9]{2,5})\s*USD\s*(?:night|\/\s*night)/i)?.[1]);

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let amenities = [];
  const amenitiesStart = lines.findIndex((line) => /what this place offers/i.test(line));
  if (amenitiesStart >= 0) {
    const amenityCandidates = lines.slice(amenitiesStart + 1, amenitiesStart + 40);
    amenities = amenityCandidates
      .filter(
        (line) =>
          !/show all/i.test(line) &&
          !/where you'll sleep/i.test(line) &&
          !/select check-in date/i.test(line) &&
          !/reviews/i.test(line) &&
          line.length > 2 &&
          line.length < 60
      )
      .slice(0, 12);
  }

  return {
    title,
    hostName,
    isSuperhost,
    rating,
    reviewCount,
    maxGuests: maxGuests ? Number.parseInt(maxGuests, 10) : null,
    bedrooms: bedrooms ? Number.parseInt(bedrooms, 10) : null,
    beds: beds ? Number.parseInt(beds, 10) : null,
    bathrooms: bathrooms ? Number.parseFloat(bathrooms) : null,
    nightlyPrice,
    checkInFrom,
    checkOutBy,
    cancellationPolicy,
    amenities,
  };
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const results = [];

for (const listing of listings) {
  try {
    await page.goto(listing.url, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(6000);

    const bodyText = await page.evaluate(() => document.body?.innerText || "");
    const url = page.url();

    results.push({
      key: listing.key,
      sourceUrl: listing.url,
      resolvedUrl: url,
      extracted: extractFromText(bodyText),
      sampleText: bodyText.slice(0, 2000),
    });
  } catch (error) {
    results.push({
      key: listing.key,
      sourceUrl: listing.url,
      error: String(error),
    });
  }
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
