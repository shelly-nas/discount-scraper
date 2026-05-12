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

  // scroll enough to load all sections
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(400);
  }

  const result = await page.evaluate(() => {
    // Dump first 3 offer-tile HTML to understand structure
    const tiles = document.querySelectorAll<HTMLElement>(".offer-tile");
    const sampleHtml = Array.from(tiles).slice(0, 3).map(t => t.outerHTML.substring(0, 1500));

    // Find section grids with category names
    const grids = document.querySelectorAll<HTMLElement>('[data-testid="product-tile-grid"]');
    const sections = Array.from(grids).map(g => ({
      id: g.id,
      tileCount: g.querySelectorAll(".offer-tile").length,
    }));

    // Count total offer tiles
    const totalTiles = document.querySelectorAll(".offer-tile").length;

    // Look for date/week information
    const dateTexts = Array.from(document.querySelectorAll<HTMLElement>("[class*='week'], [class*='date'], [class*='valid'], [class*='geldig']"))
      .slice(0, 10).map(el => ({ cls: el.className.substring(0, 60), text: el.textContent?.trim().substring(0, 80) }));

    // Look for __NEXT_DATA__ JSON (Next.js server data)
    const nextData = document.getElementById("__NEXT_DATA__")?.textContent?.substring(0, 2000) ?? "none";

    return { totalTiles, sampleHtml, sections, dateTexts, nextData };
  });

  console.log("Total offer tiles:", result.totalTiles);
  console.log("Sections:", JSON.stringify(result.sections, null, 2));
  console.log("Date texts:", JSON.stringify(result.dateTexts, null, 2));
  console.log("\n--- First tile HTML ---\n", result.sampleHtml[0]);
  console.log("\n--- __NEXT_DATA__ snippet ---\n", result.nextData);
  await browser.close();
}

debug().catch(console.error);
