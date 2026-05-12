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

  const result = await page.evaluate(() => {
    const raw = document.getElementById("__NEXT_DATA__")?.textContent ?? "{}";
    const data = JSON.parse(raw);
    const apiData: any[] = data?.props?.pageProps?.apiData ?? [];

    // apiData is an array of tuples: ["OFFER_GET", { res: { algoliaDataMap: {...} } }]
    const offerEntry = apiData.find((entry: any) => entry[0] === "OFFER_GET");
    const algoliaDataMap = offerEntry?.[1]?.res?.algoliaDataMap ?? {};

    const products = Object.values(algoliaDataMap) as any[];
    const sample = products.slice(0, 3).map(p => ({
      name: p.name,
      brandName: p.brandName,
      salesUnit: p.salesUnit,
      mainCategoryID: p.mainCategoryID,
      categoryIDs: p.categoryIDs,
      priceValue: p.currentPrice?.priceValue,
      validFrom: p.currentPrice?.validFrom,
      validUntil: p.currentPrice?.validUntil,
      promoText: p.currentPrice?.priceTagLabels,
      promotionPrices: p.promotionPrices?.length,
    }));

    const allValidUntils = products.map(p => p.currentPrice?.validUntil).filter(Boolean);
    const maxValidUntil = Math.max(...allValidUntils);
    const minValidFrom = Math.min(...products.map(p => p.currentPrice?.validFrom).filter(Boolean));

    return {
      totalProducts: products.length,
      sample,
      maxValidUntil,
      minValidFrom,
      maxDate: new Date(maxValidUntil * 1000).toISOString(),
      minDate: new Date(minValidFrom * 1000).toISOString(),
    };
  });

  console.log("Total products:", result.totalProducts);
  console.log("Date range:", result.minDate, "->", result.maxDate);
  console.log("Max validUntil unix:", result.maxValidUntil);
  console.log("\nSample products:", JSON.stringify(result.sample, null, 2));
  await browser.close();
}

debug().catch(console.error);
