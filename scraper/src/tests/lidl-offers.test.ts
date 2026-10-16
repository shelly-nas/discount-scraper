import { describe, expect, it } from "vitest";
import LidlApiClient, { LidlOfferTile, lidlOfferQuantity, mapLidlOffer } from "../clients/LidlApiClient";

// 2026-10-18 23:59:59 Amsterdam
const END_18_OCT = 1792360799;

const tile = (fields: Partial<LidlOfferTile> = {}): LidlOfferTile => ({
  erpNumber: "0080846",
  productId: 11271234,
  fullTitle: "Knakworsten",
  category: "Food",
  canonicalUrl: "/p/knakworsten/p11271234",
  keyfacts: { description: "", wonCategoryPrimary: "Werelden van nood/Eten en dichtbij voedsel/Worst & Vlees/Worst" },
  price: { price: 1.19, oldPrice: 1.59, packaging: { text: "400 g" } },
  storeEndDate: END_18_OCT,
  ...fields,
});

const page = (tiles: LidlOfferTile[]) =>
  tiles
    .map((t) => `<div data-grid-data="${JSON.stringify(t).replace(/"/g, "&quot;")}"></div>`)
    .join("\n");

describe("lidlOfferQuantity", () => {
  it("prefers the pack size under the price", () => {
    expect(lidlOfferQuantity(tile())).toEqual({ value: 0.4, unit: "kg" });
    expect(lidlOfferQuantity(tile({ price: { price: 7.29, packaging: { text: "6x500 ml" } } }))).toEqual({
      value: 3,
      unit: "l",
    });
  });

  it("falls back to the key facts and the title", () => {
    const facts = tile({ price: { price: 9.99 }, keyfacts: { description: "<ul><li>32 rollen</li></ul>" } });
    expect(lidlOfferQuantity(facts)).toEqual({ value: 32, unit: "stuk" });
    const title = tile({ price: { price: 1 }, fullTitle: "Halfvolle melk 1 liter" });
    expect(lidlOfferQuantity(title)).toEqual({ value: 1, unit: "l" });
    expect(lidlOfferQuantity(tile({ price: { price: 1 }, fullTitle: "Prei" }))).toBeNull();
  });
});

describe("mapLidlOffer", () => {
  it("maps a tile with article number, old price, pack size and own end date", () => {
    const discount = mapLidlOffer(tile());
    expect(discount).toMatchObject({
      name: "Knakworsten",
      originalPrice: 1.59,
      discountPrice: 1.19,
      externalId: "0080846",
      productUrl: "https://www.lidl.nl/p/knakworsten/p11271234",
      quantity: { value: 0.4, unit: "kg" },
    });
    expect(discount?.expireDate).toMatch(/^2026-10-18T23:59:59/);
  });

  it("leaves the end date empty without one and ignores an old price at or below the price", () => {
    const discount = mapLidlOffer(tile({ storeEndDate: undefined, price: { price: 1.19, oldPrice: 1.19 } }));
    expect(discount).toMatchObject({ originalPrice: 0, expireDate: "" });
  });

  it("reads a Lidl Plus offer from lidlPlus and the region prices", () => {
    const discount = mapLidlOffer(
      tile({
        fullTitle: "Kipdijfilets",
        price: {},
        lidlPlus: [{ price: { price: 3.49, packaging: { text: "400 g" } }, lidlPlusText: "met Lidl Plus" }],
        regionsPrices: { "1": { currentLidlPlusPrice: { price: { price: 3.49, oldPrice: 4.89 } } } },
      })
    );
    expect(discount).toMatchObject({
      discountPrice: 3.49,
      originalPrice: 4.89,
      specialDiscount: "met Lidl Plus",
      quantity: { value: 0.4, unit: "kg" },
    });
  });

  it("skips tiles without a name or price", () => {
    expect(mapLidlOffer(tile({ fullTitle: "" }))).toBeNull();
    expect(mapLidlOffer(tile({ price: {} }))).toBeNull();
  });
});

describe("LidlApiClient", () => {
  it("dedupes products and uses the most common end date for the run", async () => {
    const later = END_18_OCT + 35 * 86400;
    const html = page([
      tile(),
      tile(),
      tile({ erpNumber: "2", fullTitle: "Kipdijfilets" }),
      tile({ erpNumber: "3", fullTitle: "Steenovenpizza", storeEndDate: later }),
      tile({ erpNumber: "4", fullTitle: "Rozen", storeEndDate: undefined }),
    ]);
    const http = { get: async () => ({ data: html }) } as any;
    const { discounts, expireDate } = await new LidlApiClient(http).fetchDiscounts();

    expect(discounts.map((d) => d.name)).toEqual(["Knakworsten", "Kipdijfilets", "Steenovenpizza", "Rozen"]);
    expect(expireDate).toMatch(/^2026-10-18/);
    expect(discounts[3].expireDate).toBe(expireDate);
  });

  it("fails when the page has no tiles", async () => {
    const http = { get: async () => ({ data: "<html></html>" }) } as any;
    await expect(new LidlApiClient(http).fetchDiscounts()).rejects.toThrow("no offer tiles");
  });
});
