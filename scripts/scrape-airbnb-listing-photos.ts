/**
 * Scrape listing photo URLs (miso Hosting original paths) from Airbnb /h/ pages.
 * Usage: pnpm exec tsx scripts/scrape-airbnb-listing-photos.ts [url ...]
 */
import { chromium } from "playwright";

function listingPhotoUrls(all: string[]): string[] {
  const hosting = all.filter(
    (u) =>
      u.includes("/miso/Hosting-") &&
      u.includes("/original/") &&
      /\.(jpe?g|webp|png)$/i.test(u)
  );
  const byHost = new Map<string, string[]>();
  for (const u of hosting) {
    const m = u.match(/Hosting-(\d+)/);
    if (!m) continue;
    const id = m[1];
    if (!byHost.has(id)) byHost.set(id, []);
    byHost.get(id)!.push(u);
  }
  if (byHost.size === 0) return [];
  let best: string[] = [];
  for (const arr of byHost.values()) {
    if (arr.length > best.length) best = arr;
  }
  return [...new Set(best)].sort();
}

async function scrapeOne(url: string): Promise<string[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "en-US",
  });
  const page = await context.newPage();
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(5_000);
    await page.evaluate(async () => {
      for (let i = 0; i < 6; i++) {
        window.scrollBy(0, 800);
        await new Promise((r) => setTimeout(r, 600));
      }
    });
    await page.waitForTimeout(8_000);
    const raw = await page.evaluate(() => {
      const out = new Set<string>();
      for (const img of document.querySelectorAll("img[src]")) {
        const s = (img as HTMLImageElement).src;
        if (
          s &&
          (s.includes("muscache.com") || s.includes("airbnbusercontent.com"))
        ) {
          out.add(s.split("?")[0]);
        }
      }
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
    return listingPhotoUrls(raw);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  const urls = process.argv.slice(2);
  if (!urls.length) {
    console.error("Usage: tsx scripts/scrape-airbnb-listing-photos.ts <url> [...]");
    process.exit(1);
  }
  const result: Record<string, string[]> = {};
  for (const u of urls) {
    console.error("Scraping", u, "...");
    result[u] = await scrapeOne(u);
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
