import { describe, expect, it } from "vitest";
import { AldiProduct } from "../clients/aldi/AldiAlgolia";
import { aldiCategoryFood, aldiFoodFilter } from "../clients/aldi/AldiFood";

let id = 1;
const product = (name: string, salesUnit: string, lvl0: string[] = [], lvl1: string[] = [], brandName?: string): AldiProduct => ({
  objectID: String(id++),
  name,
  brandName,
  salesUnit,
  categoryIDs: lvl0.length ? ["x"] : ["offer"],
  hierarchicalCategories: lvl0.length ? { lvl0, lvl1 } : null,
});

const food = (name: string, unit = "500 g") => product(name, unit, ["Vlees, vis en vega"]);
const nonFood = (name: string, unit = "500 ml", brand?: string) => product(name, unit, ["Huishouden"], [], brand);

const catalog = [
  food("Kipfilet"), food("Rundergehakt"), food("Kipdijfilet"), food("Varkenshaas"), food("Zalmfilet"),
  food("Prei", "Per stuk"), food("Knolselderij", "Per stuk"), food("Ananas", "Per stuk"),
  food("Halfvolle melk", "1 l"), food("Volle yoghurt", "1 l"), food("Kaas jong belegen"),
  nonFood("Afwasmiddel", "500 ml", "DREFT"), nonFood("Afwasmiddel citroen", "900 ml", "DUBRO"),
  nonFood("Wasmiddel", "40 wasbeurten", "TANDIL"), nonFood("Shampoo"),
  nonFood("Kattenvoer", "100 g", "CACHET"), nonFood("Toiletpapier", "8 rollen"),
];

describe("aldiCategoryFood", () => {
  it("reads food and non-food from the top-level category", () => {
    expect(aldiCategoryFood(food("Kipfilet"))).toBe(true);
    expect(aldiCategoryFood(nonFood("Afwasmiddel"))).toBe(false);
    // A food category wins over a mixed one (house brand, special range).
    expect(aldiCategoryFood(product("Melk", "1 l", ["ALDI merken", "Zuivel, eieren en boter"]))).toBe(true);
  });

  it("decides mixed ranges on the subcategory", () => {
    expect(aldiCategoryFood(product("Chocoladeletter", "65 g", ["Sintassortiment "], ["Sintassortiment  > Snoepgoed"]))).toBe(true);
    expect(aldiCategoryFood(product("Bouwset", "Per stuk", ["Sintassortiment "], ["Sintassortiment  > Bouwsets"]))).toBe(false);
    expect(aldiCategoryFood(product("Ijsbeker", "Per stuk", ["Speciaal assortiment"], ["Speciaal assortiment > Zomerassortiment"]))).toBeNull();
    expect(aldiCategoryFood(product("Pyjama", "Per set"))).toBeNull();
  });
});

describe("aldiFoodFilter", () => {
  const isFood = aldiFoodFilter(catalog);

  it("keeps food offers, also produce sold per piece", () => {
    expect(isFood(product("Kipfilet", "1 kg"))).toBe(true);
    expect(isFood(product("Halfvolle melk", "6x1 l"))).toBe(true);
    expect(isFood(product("Prei", "Per stuk"))).toBe(true);
  });

  it("drops household and pet offers with a pack size", () => {
    expect(isFood(product("Afwasmiddel", "900 ml"))).toBe(false);
    expect(isFood(product("Kattenvoer in saus", "48x100 g", [], [], "CACHET"))).toBe(false);
  });

  it("drops unknown items sold per piece, pair or set", () => {
    expect(isFood(product("Badstof pyjama", "Per set", [], [], "UP2FASHION"))).toBe(false);
    expect(isFood(product("Winterlaarzen", "Per paar"))).toBe(false);
  });

  it("follows the product's own category when it has one", () => {
    expect(isFood(nonFood("Kipfilet spray"))).toBe(false);
    expect(isFood(food("Shampoo-vormige snoepjes"))).toBe(true);
  });

  it("keeps everything when the catalog has no non-food to learn from", () => {
    expect(aldiFoodFilter([food("Kipfilet")])(product("Pyjama", "Per set"))).toBe(true);
  });
});
