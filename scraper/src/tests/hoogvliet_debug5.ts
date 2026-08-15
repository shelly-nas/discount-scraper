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

  // Intercept ALL requests to find any product-loading calls
  const allCalls: Array<{ url: string; method: string; status?: number }> = [];
  page.on("response", async resp => {
    const url = resp.url();
    if (!url.includes("google") && !url.includes("facebook") && !url.includes("doubleclick") && !url.includes("analytics") && !url.includes(".jpg") && !url.includes(".png") && !url.includes(".css") && !url.includes(".js") && !url.includes("wisepops") && !url.includes("usercentrics") && !url.includes("maps.")) {
      allCalls.push({ url: url.substring(0, 150), method: resp.request().method(), status: resp.status() });
    }
  });

  await page.goto("https://www.hoogvliet.com/INTERSHOP/web/WFS/org-webshop-Site/nl_NL/-/EUR/ViewStandardCatalog-Browse?CategoryName=aanbiedingen&CatalogID=schappen", { waitUntil: "domcontentloaded", timeout: 30000 });

  // Wait and trigger JS execution for dynamic blocks
  await page.waitForTimeout(3000);

  // Try clicking/triggering the dynamic block loading
  await page.evaluate(() => {
    // Try to trigger dynamic block loading manually
    const blocks = document.querySelectorAll("[data-dynamic-block]");
    console.log("Dynamic blocks found:", blocks.length);
  });

  // Scroll to trigger intersection observer
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(3000);

  const tileCount = await page.evaluate(() => document.querySelectorAll(".product-tile.promotionProductTile").length);
  console.log("Tiles after scroll:", tileCount);
  console.log("\nAll non-resource calls:");
  allCalls.forEach(c => console.log(`[${c.status}] ${c.method} ${c.url}`));

  // Also check if there are any other product listing pages (pagination)
  const paginationInfo = await page.evaluate(() => {
    const pagination = document.querySelector(".pagination, [class*='paging'], [class*='Paging']");
    return pagination?.outerHTML?.substring(0, 500) ?? "none";
  });
  console.log("\nPagination:", paginationInfo);

  // Check total product count hint in page
  const countHint = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("*")).filter(el =>
      el.children.length === 0 && /\d+\s*(product|artikel|aanbieding)/i.test(el.textContent ?? "")
    );
    return els.slice(0, 5).map(e => e.textContent?.trim().substring(0, 80));
  });
  console.log("\nCount hints:", countHint);

  await browser.close();
}
debug().catch(console.error);
