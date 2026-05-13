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
  const dynamicCalls: Array<{ url: string; status: number }> = [];

  page.on("response", async resp => {
    const url = resp.url();
    if (url.includes("Dynamic") || url.includes("dynamic") || url.includes("Block") || url.includes("CID=")) {
      let body = "";
      try { body = (await resp.text()).substring(0, 300); } catch {}
      dynamicCalls.push({ url: url.substring(0, 200), status: resp.status() });
      if (body) console.log(`[${resp.status()}] ${url.substring(0, 120)}\nBody: ${body}\n`);
    }
  });

  await page.goto("https://www.hoogvliet.com/INTERSHOP/web/WFS/org-webshop-Site/nl_NL/-/EUR/ViewStandardCatalog-Browse?CategoryName=aanbiedingen&CatalogID=schappen", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Scroll to trigger dynamic block loading
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(2000);

  console.log("Dynamic calls found:", dynamicCalls.length);
  dynamicCalls.forEach(c => console.log(`[${c.status}] ${c.url}`));

  // After scrolling, check how many tiles are now loaded
  const tileCount = await page.evaluate(() => {
    const tiles = document.querySelectorAll(".product-tile.promotionProductTile");
    // Get first tile's full name
    const first = tiles[0];
    const name = first?.querySelector(".product-name, .product-title, [class*='name'], [class*='title']")?.textContent?.trim();
    const price = first?.querySelector("[class*='price']")?.textContent?.trim();
    const fullHtml = first?.outerHTML?.substring(0, 2000);
    return { count: tiles.length, name, price, fullHtml };
  });
  console.log("\nAfter scroll - tile count:", tileCount.count);
  console.log("Name:", tileCount.name, "| Price:", tileCount.price);
  console.log("\nFull first tile:\n", tileCount.fullHtml);

  await browser.close();
}
debug().catch(console.error);
