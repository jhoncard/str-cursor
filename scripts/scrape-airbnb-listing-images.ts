/**
 * One-off: load a public Airbnb /h/ URL and print muscache image URLs.
 * Run: pnpm exec tsx scripts/scrape-airbnb-listing-images.ts
 */
import { chromium } from "playwright";

const LISTING_URL = "https://www.airbnb.com/h/tampacoziness";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
  });
  try {
    await page.goto(LISTING_URL, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.waitForTimeout(8_000);
    const urls = await page.evaluate(() => {
      const out = new Set<string>();
      for (const img of document.querySelectorAll("img[src]")) {
        const s = (img as HTMLImageElement).src;
        if (
          s &&
          (s.includes("muscache.com") ||
            s.includes("airbnbusercontent.com") ||
            /im\.pics/i.test(s))
        ) {
          out.add(s.split("?")[0]);
        }
      }
      // Sometimes photos are in picture/source
      for (const src of document.querySelectorAll("source[srcset]")) {
        const ss = (src as HTMLSourceElement).srcset;
        if (!ss) continue;
        const first = ss.split(",")[0]?.trim().split(/\s+/)[0];
        if (
          first &&
          (first.includes("muscache.com") ||
            first.includes("airbnbusercontent.com"))
        ) {
          out.add(first.split("?")[0]);
        }
      }
      return [...out];
    });
    console.log(JSON.stringify(urls, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
