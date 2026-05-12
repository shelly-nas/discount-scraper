import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

chromium.use(StealthPlugin());

async function debug() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"] });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "nl-NL", timezoneId: "Europe/Amsterdam",
    extraHTTPHeaders: { "Accept-Language": "nl-NL,nl;q=0.9" },
  });
  const page = await context.newPage();
  await page.goto("https://www.aldi.nl/aanbiedingen.html", { waitUntil: "domcontentloaded", timeout: 30000 });

  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    // Check apiData
    const raw = document.getElementById("__NEXT_DATA__")?.textContent ?? "{}";
    const data = JSON.parse(raw);
    const apiData = data?.props?.pageProps?.apiData;
    const apiDataSummary = apiData ? JSON.stringify(apiData).substring(0, 1000) : "none";

    // Look at .product-tile elements (altCount1 = 216)
    const tiles = document.querySelectorAll<HTMLElement>(".product-tile");
    const sampleTiles = Array.from(tiles).slice(0, 3).map(t => ({
      html: t.outerHTML.substring(0, 800),
      dataAttrs: (() => {
        const attrs: Record<string, string> = {};
        for (const a of Array.from(t.attributes)) attrs[a.name] = a.value.substring(0, 100);
        return attrs;
      })(),
    }));

    return { apiDataSummary, tileCount: tiles.length, sampleTiles };
  });

  console.log("apiData:", result.apiDataSummary);
  console.log("\nproduct-tile count:", result.tileCount);
  console.log("\nSample tiles:", JSON.stringify(result.sampleTiles, null, 2));
  await browser.close();
}

debug().catch(console.error);
