import { describe, it, expect, vi } from "vitest";
import AhCatalogClient, { mapAhProduct } from "../clients/catalog/AhCatalogClient";
import { ICatalogProduct } from "../interfaces/ICatalogProduct";

vi.mock("../utils/Logger", () => ({
  scraperLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// No real waiting between pages in tests.
vi.spyOn(global, "setTimeout").mockImplementation(((fn: () => void) => {
  fn();
  return 0 as any;
}) as any);

const product = (id: number, extra: Record<string, unknown> = {}) => ({
  webshopId: id,
  title: `Product ${id}`,
  brand: "AH",
  salesUnitSize: "1 l",
  unitPriceDescription: "prijs per lt €1.19",
  priceBeforeBonus: 1.19,
  mainCategory: "Zuivel, eieren",
  images: [
    { width: 800, height: 800, url: "https://img/800.jpg" },
    { width: 200, height: 200, url: "https://img/200.jpg" },
  ],
  ...extra,
});

function fakeHttp(pages: Record<string, any>, failFirst?: number) {
  let failures = failFirst ?? 0;
  return {
    defaults: { headers: { common: {} as Record<string, string> } },
    post: vi.fn().mockResolvedValue({ data: { access_token: "token" } }),
    get: vi.fn().mockImplementation(async (url: string, config?: any) => {
      if (url.endsWith("/categories")) {
        return { data: [{ id: 1, name: "Zuivel" }, { id: 2, name: "Bakkerij" }] };
      }
      if (failures > 0) {
        failures--;
        throw { response: { status: 401 } };
      }
      const key = `${config.params.taxonomyId}:${config.params.page}`;
      return { data: pages[key] ?? { products: [], page: { totalPages: 0 } } };
    }),
  };
}

describe("AH catalog client", () => {
  it("maps regular price, image, unit size and product url", () => {
    const mapped = mapAhProduct(
      product(42, { currentPrice: 0.99, priceBeforeBonus: 1.19, isBonus: true }),
      "Fallback"
    )!;
    expect(mapped).toEqual({
      externalId: "42",
      name: "Product 42",
      brand: "AH",
      category: "Zuivel, eieren",
      unitSize: "1 l",
      price: 1.19,
      unitPrice: "prijs per lt €1.19",
      imageUrl: "https://img/200.jpg",
      productUrl: "https://www.ah.nl/producten/product/wi42",
    });
  });

  it("uses currentPrice when there is no bonus and skips products without a price", () => {
    expect(mapAhProduct(product(1, { priceBeforeBonus: undefined, currentPrice: 2.5 }), "x")!.price).toBe(2.5);
    expect(mapAhProduct(product(2, { priceBeforeBonus: undefined }), "x")).toBeNull();
  });

  it("walks every page of every category", async () => {
    const http = fakeHttp({
      "1:0": { products: [product(1), product(2)], page: { totalPages: 2 } },
      "1:1": { products: [product(3)], page: { totalPages: 2 } },
      "2:0": { products: [product(4)], page: { totalPages: 1 } },
    });
    const client = new AhCatalogClient(http as any);
    const pages: ICatalogProduct[][] = [];
    await client.fetchCatalog(async (p) => {
      pages.push(p);
    });

    expect(pages.map((p) => p.map((x) => x.externalId))).toEqual([["1", "2"], ["3"], ["4"]]);
    expect(http.defaults.headers.common.Authorization).toBe("Bearer token");
  });

  it("re-authenticates once when the token expires mid run", async () => {
    const http = fakeHttp({ "1:0": { products: [product(1)], page: { totalPages: 1 } } }, 1);
    const client = new AhCatalogClient(http as any);
    const seen: string[] = [];
    await client.fetchCatalog(async (p) => {
      seen.push(...p.map((x) => x.externalId));
    });

    expect(seen).toEqual(["1"]);
    expect(http.post).toHaveBeenCalledTimes(2);
  });
});
