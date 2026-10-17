import { describe, it, expect, vi } from "vitest";
import HoogvlietGraphql, {
  HoogvlietListedProduct,
  hoogvlietBrand,
  hoogvlietEan,
  hoogvlietQuantity,
  hoogvlietUnitPrice,
} from "../clients/hoogvliet/HoogvlietGraphql";
import { promotionPrice } from "../utils/Promotion";
import HoogvlietCatalogClient, { mapHoogvlietProduct } from "../clients/catalog/HoogvlietCatalogClient";
import { folderExpireDate, mapHoogvlietDiscount } from "../clients/HoogvlietApiClient";
import { ICatalogProduct } from "../interfaces/ICatalogProduct";

vi.mock("../utils/Logger", () => ({
  scraperLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// No real waiting between requests in tests.
vi.spyOn(global, "setTimeout").mockImplementation(((fn: () => void) => {
  fn();
  return 0 as any;
}) as any);

const product = (sku: string, extra: Partial<HoogvlietListedProduct> = {}): HoogvlietListedProduct => ({
  sku,
  name: `Product ${sku}`,
  url_key: `product-${sku}`,
  small_image: { url: `https://img/${sku}.jpg` },
  price_range: { minimum_price: { regular_price: { value: 2.59 }, final_price: { value: 2.59 } } },
  sub_title_attributes: { volume: "500", unit: "Gram", qty_unit: "Prijs per kilo", price_per_qty_unit: "5.1800" },
  is_promotion: false,
  promotion_meta_data: null,
  category: "Zuivel, eieren, boter",
  ...extra,
});

const onPromotion = (label: string, regular: number, final: number, validTo = "2099-01-01T19:59:00+00:00") =>
  product("1", {
    price_range: { minimum_price: { regular_price: { value: regular }, final_price: { value: final } } },
    is_promotion: true,
    promotion_meta_data: { korting_label: label, valid_from: "2026-01-01T00:00:00+00:00", valid_to: validTo },
  });

describe("Hoogvliet product fields", () => {
  it("reads the pack quantity and unit price", () => {
    const sub = product("1").sub_title_attributes;
    expect(hoogvlietQuantity(sub)).toEqual({ value: 0.5, unit: "kg" });
    expect(hoogvlietUnitPrice(sub)).toBe("€5.18 per kilo");
    expect(hoogvlietQuantity(null)).toBeNull();
  });

  it("maps a catalog product with regular price and quantity", () => {
    expect(mapHoogvlietProduct(product("117005000"))).toEqual<ICatalogProduct>({
      externalId: "117005000",
      name: "Product 117005000",
      brand: null,
      category: "Zuivel, eieren, boter",
      unitSize: "500 gram",
      quantity: { value: 0.5, unit: "kg" },
      price: 2.59,
      priceSource: "supermarket",
      unitPrice: "€5.18 per kilo",
      imageUrl: "https://img/117005000.jpg",
      productUrl: "https://hoogvliet.nl/product/product-117005000",
      ean: null,
    });
  });

  it("reads the brand from the url key", () => {
    expect(hoogvlietBrand({ sku: "076401000", name: "Vol", url_key: "chocomel-vol-076401000" })).toBe("Chocomel");
    expect(
      hoogvlietBrand({
        sku: "1",
        name: "Pindakaas 100% Fijngemalen Pinda's",
        url_key: "calve-pindakaas-100-fijngemalen-pinda-apos-s-1",
      })
    ).toBe("Calve");
    expect(hoogvlietBrand({ sku: "2", name: "Zero sugar 4-pack", url_key: "cocacola-zero-sugar-4pack-2" })).toBe("Cocacola");
    expect(hoogvlietBrand({ sku: "3", name: "Chocomelange", url_key: "g-apos-woon-chocomelange-3" })).toBe("G'woon");
    // The name is the whole url key: no brand.
    expect(hoogvlietBrand({ sku: "4", name: "Bananen", url_key: "bananen-4" })).toBeNull();
  });

  it("reads the barcode from the GDSN label link", () => {
    const label =
      "https://gdsnprodwebstorage.blob.core.windows.net/x/8710912888888/08712800188322/528/Media/1/08712800188322_H1N1.png";
    expect(hoogvlietEan({ product_information: [{ title: "bijsluiter", content: label }] })).toBe("8712800188322");
    expect(hoogvlietEan({ product_information: [{ title: "ingredienten", content: "melk" }] })).toBeNull();
    expect(hoogvlietEan({ product_information: null })).toBeNull();
  });

  it("keeps the regular price in the catalog while the product is on offer", () => {
    expect(mapHoogvlietProduct(onPromotion("per zak 0,99", 1.83, 0.99))?.price).toBe(1.83);
  });
});

describe("Hoogvliet promotions", () => {
  it.each([
    ["per zak 0,99", 1.83, 0.99, 0.99],
    ["3 voor 6,00", 2.49, 2.49, 2],
    ["1 + 1 Gratis", 3.29, 3.29, 1.65],
    ["2 + 1 Gratis", 3, 3, 2],
    ["25% korting", 4, 4, 3],
    ["2e halve prijs", 2, 2, 1.5],
    ["voor 1,99", 2.19, 2.19, 1.99],
    ["Op = op", 2, 2, null],
    ["Gratis bezorging", 2, 2, null],
    ["€2,00 bezorgkorting", 5, 5, null],
  ])("prices '%s' per item", (label, regular, final, expected) => {
    expect(promotionPrice(label, regular, final)).toBe(expected);
  });

  it("maps a current promotion to a discount", () => {
    expect(mapHoogvlietDiscount(onPromotion("3 voor 6,00", 2.49, 2.49))).toMatchObject({
      name: "Product 1",
      originalPrice: 2.49,
      discountPrice: 2,
      specialDiscount: "3 voor 6,00",
      unitPrice: "€5.18 per kilo",
      supermarket: "Hoogvliet",
      productUrl: "https://hoogvliet.nl/product/product-1",
      externalId: "1",
    });
  });

  it("skips products without a current promotion", () => {
    expect(mapHoogvlietDiscount(product("1"))).toBeNull();
    expect(mapHoogvlietDiscount(onPromotion("per zak 0,99", 1.83, 0.99, "2020-01-01T00:00:00+00:00"))).toBeNull();
  });

  it("uses the most common end date as the folder end", () => {
    const d = (expireDate: string) => ({ expireDate }) as IProductDiscountDetails;
    expect(folderExpireDate([d("2026-10-20"), d("2026-12-30"), d("2026-10-20")])).toBe("2026-10-20");
  });
});

describe("Hoogvliet catalog client", () => {
  function fakeHttp() {
    const categories = [
      { uid: "S", name: "Feestdagen", url_path: "feestdagen-kerst-en-pasen" },
      { uid: "O", name: "Aanbiedingen", url_path: "aanbiedingen" },
      { uid: "A", name: "Zuivel", url_path: "zuivel" },
      { uid: "B", name: "Kaas", url_path: "kaas" },
    ];
    const listing: Record<string, string[][]> = {
      A: [["1", "2"], ["3"]],
      B: [["3", "4"]],
      S: [["1", "5"]],
      O: [["2", "6", "7"]],
    };
    return {
      post: vi.fn().mockImplementation(async (_url: string, body: any) => {
        if (body.query.includes("parent_id")) return { data: { data: { categories: { items: categories } } } };
        if (body.query.includes("categoryList")) {
          const pages = listing[body.variables.uid];
          return {
            data: {
              data: {
                categoryList: [{
                  products: {
                    page_info: { total_pages: pages.length },
                    items: pages[body.variables.page - 1].map((sku) => ({ sku })),
                  },
                }],
              },
            },
          };
        }
        const items = body.variables.skus.map((sku: string) =>
          product(sku, { __typename: sku === "6" ? "GroupedProduct" : "SimpleProduct" })
        );
        return { data: { data: { products: { items } } } };
      }),
    };
  }

  it("reads every category once, regular shelves before collection ones", async () => {
    const pages: ICatalogProduct[][] = [];
    await new HoogvlietCatalogClient(fakeHttp() as any).fetchCatalog(async (p) => {
      pages.push(p);
    });
    expect(pages.map((p) => p.map((x) => `${x.externalId}:${x.category}`))).toEqual([
      ["1:Zuivel", "2:Zuivel", "3:Zuivel"],
      ["4:Kaas"],
      ["5:Feestdagen"],
      ["7:Aanbiedingen"], // 6 is a promotion group
    ]);
  });

  it("does not retry GraphQL errors", async () => {
    const http = { post: vi.fn().mockResolvedValue({ data: { errors: [{ message: "Field x is not defined" }] } }) };
    await expect(new HoogvlietGraphql(http as any).categories()).rejects.toThrow(
      "Hoogvliet categories: Field x is not defined"
    );
    expect(http.post).toHaveBeenCalledTimes(1);
  });
});
