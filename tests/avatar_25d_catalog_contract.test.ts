import { readFileSync } from "node:fs";
import path from "node:path";
import {
  avatar25dItemKey,
  avatar25dItemsForSlot,
  parseAvatar25dCatalog,
} from "../modules/avatar-25d/catalog";

const root = path.resolve(__dirname, "..");

const validItem = {
  id: "hair_wave_m",
  slot: "hair",
  file: "catalog/hair/hair_wave_m.png",
  sha256: "a".repeat(64),
  base: "base_m.png",
  acceptedAt: "2026-08-22T00:00:00.000Z",
};

describe("avatar 2.5D catalog contract", () => {
  it("принимает опубликованный манифест из assets (единственный источник приложения)", () => {
    const published = JSON.parse(
      readFileSync(path.join(root, "assets/avatar-25d/manifest.json"), "utf8"),
    );
    const catalog = parseAvatar25dCatalog(published);
    expect(catalog.version).toBe(1);
  });

  it("разбирает корректный каталог и раскладывает по слотам", () => {
    const catalog = parseAvatar25dCatalog({ version: 1, items: [validItem] });
    expect(avatar25dItemsForSlot(catalog, "hair")).toHaveLength(1);
    expect(avatar25dItemsForSlot(catalog, "outfit")).toHaveLength(0);
    expect(avatar25dItemKey(catalog.items[0])).toBe("hair/hair_wave_m");
  });

  it("отклоняет неизвестный слот, кривой путь файла, кривой sha и дубликаты", () => {
    expect(() => parseAvatar25dCatalog({ version: 1, items: [{ ...validItem, slot: "beard" }] }))
      .toThrow("bad_slot");
    expect(() => parseAvatar25dCatalog({ version: 1, items: [{ ...validItem, file: "../../etc/passwd" }] }))
      .toThrow("bad_file");
    expect(() => parseAvatar25dCatalog({ version: 1, items: [{ ...validItem, sha256: "xyz" }] }))
      .toThrow("bad_sha256");
    expect(() => parseAvatar25dCatalog({ version: 1, items: [validItem, validItem] }))
      .toThrow("duplicate");
    expect(() => parseAvatar25dCatalog({ version: 2, items: [] })).toThrow("unsupported_version");
  });
});
