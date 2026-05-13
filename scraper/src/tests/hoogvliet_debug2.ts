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
  await page.goto("https://www.hoogvliet.com/INTERSHOP/web/WFS/org-webshop-Site/nl_NL/-/EUR/ViewStandardCatalog-Browse?CategoryName=aanbiedingen&CatalogID=schappen", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    // Full HTML of first 3 product tiles
    const tiles = document.querySelectorAll<HTMLElement>(".product-tile.promotionProductTile");
    const samples = Array.from(tiles).slice(0, 3).map(t => t.outerHTML.substring(0, 1500));

    // Look for expiry date / validity info anywhere on page
    const dateEls = Array.from(document.querySelectorAll<HTMLElement>("[class*='valid'], [class*='date'], [class*='geldig'], [class*='expir'], [class*='period'], [class*='week']"))
      .slice(0, 10).map(el => ({ cls: el.className.substring(0, 60), text: el.textContent?.trim().substring(0, 80) }));

    // Category sections
    const catSections = Array.from(document.querySelectorAll<HTMLElement>("[class*='category'], [class*='Category'], h2, h3"))
      .slice(0, 15).map(el => ({ tag: el.tagName, cls: el.className.substring(0, 50), text: el.textContent?.trim().substring(0, 60) }));

    // Page-level date text
    const bodyText = document.body.innerText.substring(0, 500);

    return { tileCount: tiles.length, samples, dateEls, catSections, bodyText };
  });

  console.log("Tile count:", result.tileCount);
  console.log("\n--- Sample tile 1 ---\n", result.samples[0]);
  console.log("\n--- Sample tile 2 ---\n", result.samples[1]);
  console.log("\n--- Date elements ---\n", JSON.stringify(result.dateEls, null, 2));
  console.log("\n--- Category sections ---\n", JSON.stringify(result.catSections, null, 2));
  console.log("\n--- Body text start ---\n", result.bodyText);
  await browser.close();
}
debug().catch(console.error);
