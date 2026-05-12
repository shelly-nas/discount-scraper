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

  // Scroll fully to load all lazy sections
  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    // Full __NEXT_DATA__ — look for product arrays
    const raw = document.getElementById("__NEXT_DATA__")?.textContent ?? "{}";
    const data = JSON.parse(raw);

    // Recursively find arrays that look like products (have name + price)
    function findProducts(obj: any, depth = 0): any[] {
      if (depth > 8 || !obj) return [];
      if (Array.isArray(obj)) {
        // Check if items look like products
        if (obj.length > 0 && obj[0]?.name && (obj[0]?.price !== undefined || obj[0]?.priceNormal !== undefined)) {
          return obj;
        }
        return obj.flatMap((item: any) => findProducts(item, depth + 1));
      }
      if (typeof obj === "object") {
        return Object.values(obj).flatMap((v: any) => findProducts(v, depth + 1));
      }
      return [];
    }

    const products = findProducts(data);

    // Also look at actual DOM product tiles after full scroll
    const productTiles = document.querySelectorAll<HTMLElement>("[data-testid='product-tile']");
    const sampleTileHtml = Array.from(productTiles).slice(0, 2).map(t => t.outerHTML.substring(0, 1000));

    // Count product tiles
    const tileCount = productTiles.length;

    // Also try other selectors
    const altCount1 = document.querySelectorAll(".product-tile").length;
    const altCount2 = document.querySelectorAll("[class*='productTile']").length;
    const altCount3 = document.querySelectorAll("[data-testid*='product']").length;

    return {
      nextDataProductCount: products.length,
      sampleProduct: products[0] ? JSON.stringify(products[0]).substring(0, 500) : "none",
      tileCount, altCount1, altCount2, altCount3,
      sampleTileHtml,
    };
  });

  console.log("Next.js products found:", result.nextDataProductCount);
  console.log("Sample product:", result.sampleProduct);
  console.log("DOM tile counts:", { tileCount: result.tileCount, altCount1: result.altCount1, altCount2: result.altCount2, altCount3: result.altCount3 });
  console.log("Sample tile HTML:", result.sampleTileHtml[0] ?? "none");

  // Also dump full __NEXT_DATA__ keys at top level
  const nextDataKeys = await page.evaluate(() => {
    const raw = document.getElementById("__NEXT_DATA__")?.textContent ?? "{}";
    const data = JSON.parse(raw);
    function getKeys(obj: any, prefix = ""): string[] {
      if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return [];
      return Object.keys(obj).flatMap(k => {
        const val = obj[k];
        if (typeof val === "object" && val !== null && !Array.isArray(val) && prefix.split(".").length < 4) {
          return [`${prefix}${k}`, ...getKeys(val, `${prefix}${k}.`)];
        }
        if (Array.isArray(val) && val.length > 0) return [`${prefix}${k} [array:${val.length}]`];
        return [`${prefix}${k}`];
      });
    }
    return getKeys(JSON.parse(raw)).slice(0, 80);
  });
  console.log("\n__NEXT_DATA__ keys:", nextDataKeys);

  await browser.close();
}

debug().catch(console.error);
