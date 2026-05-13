import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import axios from "axios";
chromium.use(StealthPlugin());

async function debug() {
  // First try: direct HTTP to see if we can get all products with a high page size param
  try {
    const resp = await axios.get(
      "https://www.hoogvliet.com/INTERSHOP/web/WFS/org-webshop-Site/nl_NL/-/EUR/ViewStandardCatalog-Browse?CategoryName=aanbiedingen&CatalogID=schappen&PageSize=200",
      { headers: { "Accept-Language": "nl-NL,nl;q=0.9", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }, timeout: 15000 }
    );
    const html: string = resp.data;
    const tileCount = (html.match(/promotionProductTile/g) ?? []).length;
    console.log("Direct HTTP tiles found:", tileCount);
    // Check for the CID pattern — all tiles share same CID or different?
    const cids = [...new Set((html.match(/CID=[A-Za-z0-9_]+/g) ?? []))];
    console.log("Unique CIDs:", cids.slice(0, 5));
    // Extract the period text
    const periodMatch = html.match(/(\d+\s+\w+\s+-\s+\d+\s+\w+)/);
    console.log("Period match:", periodMatch?.[0]);
  } catch(e: any) { console.log("Direct HTTP error:", e.message); }

  // Second: try the DynamicContentView URL with the CID from first tile
  try {
    const resp = await axios.get(
      "https://www.hoogvliet.com/INTERSHOP/web/WFS/org-webshop-Site/nl_NL/-/EUR/ViewDynamicContent-Serve?CID=TD4KGwJ_UIAAAAFkJoxTSXZ9",
      { headers: { "Accept-Language": "nl-NL,nl;q=0.9", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }, timeout: 10000 }
    );
    console.log("\nDynamic content status:", resp.status);
    console.log("Body:", String(resp.data).substring(0, 500));
  } catch(e: any) { console.log("Dynamic content error:", e.message); }

  // Third: try fetching with Playwright but wait for networkidle to load all dynamic blocks
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"] });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "nl-NL", timezoneId: "Europe/Amsterdam",
    extraHTTPHeaders: { "Accept-Language": "nl-NL,nl;q=0.9" },
  });

  const page = await context.newPage();
  const dynamicCalls: string[] = [];
  page.on("request", req => {
    const url = req.url();
    if (url.includes("Dynamic") || url.includes("AJAX") || url.includes("ajax") || url.includes("Serve")) {
      dynamicCalls.push(url.substring(0, 150));
    }
  });

  // Try PageSize=200
  await page.goto("https://www.hoogvliet.com/INTERSHOP/web/WFS/org-webshop-Site/nl_NL/-/EUR/ViewStandardCatalog-Browse?CategoryName=aanbiedingen&CatalogID=schappen&PageSize=200", 
    { waitUntil: "networkidle", timeout: 45000 });

  const tileCount2 = await page.evaluate(() => document.querySelectorAll(".product-tile.promotionProductTile").length);
  console.log("\nPlaywright networkidle tile count (PageSize=200):", tileCount2);
  console.log("Dynamic calls made:", dynamicCalls.slice(0, 5));

  // Check if period/date info is accessible
  const periodText = await page.evaluate(() => {
    const el = document.querySelector(".promotion-week-tabs, .filter-group, [class*='week-tab'], [class*='period']");
    return el?.textContent?.trim().substring(0, 200);
  });
  console.log("Period text:", periodText);

  await browser.close();
}
debug().catch(console.error);
