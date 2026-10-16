import { describe, it, expect, vi } from "vitest";
import { DirkOffer, DirkProduct, dirkProductUrl } from "../clients/dirk/DirkGraphql";
import { mapDirkProduct } from "../clients/catalog/DirkCatalogClient";
import { mapDirkOffer, mapDirkOfferProduct } from "../clients/DirkApiClient";
import { PlusProduct, plusUnitSize } from "../clients/plus/PlusSite";
import { mapPlusProduct } from "../clients/catalog/PlusCatalogClient";
import { mapPlusDiscount } from "../clients/PlusApiClient";
import { AldiProduct, aldiCategory, aldiName, parseAldiFolder } from "../clients/aldi/AldiAlgolia";
import { mapAldiProduct } from "../clients/catalog/AldiCatalogClient";
import { aldiLinkedId, mapAldiDiscount } from "../clients/AldiApiClient";
import { parseQuantity } from "../utils/Quantity";

vi.mock("../utils/Logger", () => ({
  scraperLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const NOW = new Date(2026, 9, 16, 10, 0, 0); // 16 Oct 2026

describe("parseQuantity per kilo", () => {
  it("reads a whole pack size 'Per kilo' as 1 kg, not a price per kilo", () => {
    expect(parseQuantity("Per kilo")).toEqual({ value: 1, unit: "kg" });
    expect(parseQuantity("per liter")).toEqual({ value: 1, unit: "l" });
    expect(parseQuantity("€5.18 per kilo")).toBeNull();
  });
});

const dirkProduct = (extra: Partial<DirkProduct> = {}): DirkProduct => ({
  productId: 5526,
  normalPrice: 1.85,
  offerPrice: 0,
  startDate: null,
  endDate: null,
  productOffer: null,
  productInformation: {
    headerText: "Hak Sperziebonen fijn gebroken",
    subText: "",
    packaging: "340 g",
    image: "artikelen/248509_1.png",
    department: "Aardappelen, groente & fruit",
    webgroup: "Groenteconserven",
    brand: "Hak",
  },
  ...extra,
});

const dirkOffer = (extra: Partial<DirkOffer> = {}): DirkOffer => ({
  offerId: 139736,
  headerText: "Hak groente of appelmoes",
  subText: null,
  promotionText: null,
  normalPrice: 2.85,
  offerPrice: 0.89,
  startDate: "2026-10-14T00:00:00.000Z",
  endDate: "2026-10-20T23:59:00.000Z",
  type: "MultiProductOffer",
  packaging: "Pot 330 - 370 gram.",
  productIds: [5526],
  ...extra,
});

describe("Dirk", () => {
  it("maps a product to the catalog with its regular price, quantity and page", () => {
    const product = mapDirkProduct(dirkProduct())!;
    expect(product).toMatchObject({
      externalId: "5526",
      name: "Hak Sperziebonen fijn gebroken",
      brand: "Hak",
      category: "Aardappelen, groente & fruit",
      unitSize: "340 g",
      quantity: { value: 0.34, unit: "kg" },
      price: 1.85,
      priceSource: "supermarket",
      unitPrice: "€5.44 per kilo",
      imageUrl: "https://web-fileserver.dirk.nl/artikelen/248509_1.png",
    });
    expect(product.productUrl).toBe(
      "https://www.dirk.nl/boodschappen/aardappelen-groente-fruit/groenteconserven/hak-sperziebonen-fijn-gebroken/5526"
    );
    expect(mapDirkProduct(dirkProduct({ normalPrice: 0 }))).toBeNull();
  });

  it("links an offer to each product it covers, at that product's regular price", () => {
    const discount = mapDirkOfferProduct(dirkOffer(), dirkProduct({ offerPrice: 0.89 }), "Fallback")!;
    expect(discount).toMatchObject({
      name: "Hak Sperziebonen fijn gebroken",
      originalPrice: 1.85,
      discountPrice: 0.89,
      quantity: { value: 0.34, unit: "kg" },
      externalId: "5526",
      expireDate: "2026-10-20T23:59:00.000Z",
      productUrl: dirkProductUrl(dirkProduct()),
    });
  });

  it("works out a multi-buy label per item", () => {
    const discount = mapDirkOfferProduct(
      dirkOffer({ promotionText: "2 voor 3,00", offerPrice: 3 }),
      dirkProduct({ normalPrice: 1.99, offerPrice: 0 }),
      "Fallback"
    )!;
    expect(discount.discountPrice).toBe(1.5);
  });

  it("keeps an offer without known products as one discount by name", () => {
    expect(mapDirkOffer(dirkOffer(), "Groente")).toMatchObject({
      name: "Hak groente of appelmoes Pot 330 - 370 gram.",
      discountPrice: 0.89,
      category: "Groente",
    });
    expect(mapDirkOffer(dirkOffer(), "Groente").externalId).toBeUndefined();
  });
});

const plusProduct = (extra: Partial<PlusProduct> = {}): PlusProduct => ({
  SKU: "155013",
  Brand: "Campina",
  Name: "Campina Halfvolle melk",
  Product_Subtitle: "Per 1000 ml",
  Slug: "campina-halfvolle-melk-pak-1000-ml-155013",
  ImageURL: "https://images.ctfassets.net/155013.png",
  OriginalPrice: "1.49",
  NewPrice: "0.0",
  Categories: { List: [{ Name: "Zuivel, eieren, boter" }, { Name: "Verse zuivel" }] },
  IsAvailable: true,
  PromotionLabel: "",
  PromotionBasedLabel: "",
  PromotionStartDate: "1900-01-01",
  PromotionEndDate: "1900-01-01",
  IsFreeDeliveryOffer: false,
  ...extra,
});

describe("PLUS", () => {
  it("maps a product to the catalog", () => {
    expect(mapPlusProduct(plusProduct())).toMatchObject({
      externalId: "155013",
      name: "Campina Halfvolle melk",
      category: "Zuivel, eieren, boter",
      unitSize: "1000 ml",
      quantity: { value: 1, unit: "l" },
      price: 1.49,
      unitPrice: "€1.49 per liter",
      productUrl: "https://www.plus.nl/product/campina-halfvolle-melk-pak-1000-ml-155013",
    });
    expect(plusUnitSize(plusProduct({ Product_Subtitle: "Per kilo" }))).toBe("Per kilo");
    expect(mapPlusProduct(plusProduct({ IsAvailable: false }))).toBeNull();
  });

  it("maps offers per item from NewPrice or the label, linked by SKU", () => {
    const single = mapPlusDiscount(plusProduct({ NewPrice: "1.29", PromotionEndDate: "2026-10-20" }), NOW)!;
    expect(single).toMatchObject({ originalPrice: 1.49, discountPrice: 1.29, externalId: "155013" });
    expect(single.expireDate.startsWith("2026-10-20T23:59:59")).toBe(true);

    const free = mapPlusDiscount(
      plusProduct({ OriginalPrice: "2.79", PromotionLabel: "1+1 GRATIS", PromotionEndDate: "2026-10-20" }),
      NOW
    )!;
    expect(free.discountPrice).toBe(1.4);

    const multi = mapPlusDiscount(
      plusProduct({ OriginalPrice: "3.59", PromotionLabel: "2 VOOR 6.00", PromotionEndDate: "2026-11-24" }),
      NOW
    )!;
    expect(multi.discountPrice).toBe(3);
  });

  it("skips delivery offers and expired promotions", () => {
    expect(
      mapPlusDiscount(plusProduct({ PromotionLabel: "Gratis bezorging BIJ 10.00 EURO", PromotionEndDate: "2026-10-20" }), NOW)
    ).toBeNull();
    expect(mapPlusDiscount(plusProduct({ NewPrice: "1.29", PromotionEndDate: "2026-10-01" }), NOW)).toBeNull();
  });
});

const aldiProduct = (extra: Partial<AldiProduct> = {}): AldiProduct => ({
  objectID: "1243839",
  name: "Protein melk drink",
  brandName: "MILSANI",
  salesUnit: "1 l",
  productSlug: "protein-melk-drink-1243839",
  mainCategoryID: "verse-zuivel",
  categoryIDs: ["verse-zuivel", "proteine"],
  hierarchicalCategories: {
    lvl0: ["Speciaal assortiment", "Zuivel, eieren en boter"],
    lvl1: ["Speciaal assortiment > Proteïne", "Zuivel, eieren en boter > Verse zuivel"],
  },
  assets: [{ type: "primary", url: "https://s7g10.scene7.com/1243839" }],
  currentPrice: { priceValue: 1.49, validFrom: 1791496800, validUntil: 1793401199 },
  isAvailable: true,
  ...extra,
});

describe("Aldi", () => {
  it("maps a regular product, filed under the shelf of its main category", () => {
    expect(aldiName(aldiProduct())).toBe("MILSANI Protein melk drink");
    expect(aldiCategory(aldiProduct())).toBe("Zuivel, eieren en boter");
    expect(mapAldiProduct(aldiProduct())).toMatchObject({
      externalId: "1243839",
      price: 1.49,
      quantity: { value: 1, unit: "l" },
      productUrl: "https://www.aldi.nl/product/protein-melk-drink-1243839.html",
    });
    expect(mapAldiProduct(aldiProduct({ categoryIDs: ["offer"] }))).toBeNull();
  });

  const offer = (extra: Partial<AldiProduct> = {}) =>
    aldiProduct({
      objectID: "91243839",
      categoryIDs: ["offer"],
      mainCategoryID: "offer",
      currentPrice: { priceValue: 0.99, validFrom: 1792015200, validUntil: 1793401199 },
      ...extra,
    });

  it("links an offer to the regular article: same id, or the id after a leading 9", () => {
    const regular = new Map([["1243839", aldiProduct()]]);
    expect(aldiLinkedId("1243839", regular)).toBe("1243839");
    expect(aldiLinkedId("91243839", regular)).toBe("1243839");
    expect(aldiLinkedId("91245290", regular)).toBeNull();
  });

  it("is valid until the end of its folder category, not the offer object's own date", () => {
    const regular = new Map([["1243839", aldiProduct()]]);
    const discount = mapAldiDiscount(offer(), regular, "2026-10-18", NOW)!;
    expect(discount).toMatchObject({
      externalId: "1243839",
      originalPrice: 1.49,
      discountPrice: 0.99,
      category: "Zuivel, eieren en boter",
    });
    expect(discount.expireDate.startsWith("2026-10-18T23:59:59")).toBe(true);
    expect(mapAldiDiscount(offer(), new Map(), "2026-10-18", NOW)).toMatchObject({ externalId: "91243839", originalPrice: 0 });
    expect(mapAldiDiscount(offer(), regular, "2026-10-11", NOW)).toBeNull();
  });

  it("takes the struck-through price as regular price and prices '2 VOOR' per item", () => {
    const strike = offer({
      currentPrice: { priceValue: 1.19, validFrom: 1, validUntil: 2, strikePrice: { strikePriceValue: 2.39 } },
    });
    expect(mapAldiDiscount(strike, new Map(), "2026-10-18", NOW)).toMatchObject({ originalPrice: 2.39, discountPrice: 1.19 });
    const two = offer({
      currentPrice: { priceValue: 2, validFrom: 1, validUntil: 2, priceTagLabels: { promoText1: "2 VOOR" } },
    });
    expect(mapAldiDiscount(two, new Map(), "2026-10-18", NOW)!.discountPrice).toBe(1);
  });

  it("reads the folder categories and products from the offers page", () => {
    const apiData = JSON.stringify([
      ["OFFER_GET", { res: {
        categories: [
          { title: "Vanaf maandag", startDate: "2026-10-12", endDate: "2026-10-18",
            content: [{ productIds: ["1243839"] }, { productIds: ["91245290"] }] },
        ],
        algoliaDataMap: { "1243839": { name: "Protein melk drink" }, "91245290": { name: "Toiletblok" } },
      } }],
    ]);
    const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { apiData } } })}</script></html>`;
    const folder = parseAldiFolder(html)!;
    expect(folder.categories).toEqual([
      { title: "Vanaf maandag", startDate: "2026-10-12", endDate: "2026-10-18", productIds: ["1243839", "91245290"] },
    ]);
    expect(folder.products.get("91245290")).toMatchObject({ objectID: "91245290", name: "Toiletblok" });
    expect(parseAldiFolder("<html></html>")).toBeNull();
  });
});
