import fs from "node:fs";
import path from "node:path";
import { DARK } from "../constants/theme";
import {
  LIQUID_GLASS_THEME_IDS,
  liquidGlassTokens,
  makeLiquidGlassTheme,
} from "../constants/liquidGlassThemePalette";
import { paletteContrast } from "../constants/liquidGlassPaletteRoles";
import { getV2Palette } from "../constants/v2Style";
import { SELECTABLE_THEME_MODES } from "../app/theme_access_policy";

// зачем (координатор 12.10 07:25): прежняя версия закрепляла модель «9 тем-режимов с выбором и ценами» (indigo по умолчанию, список
// в политике доступа). В 2.0 видимые темы — реестр Liquid Glass (29 тем: 23 + 6 премиум), а `ThemeMode` остался только как совместимый
// «графитовый» алиас. Тест приведён к этой модели; он по-прежнему сторожит: старые названия не возвращаются, уцелевшие карты
// тем чисты от удалённых ключей, а токен accentText доходит до экранов по ВСЕМ путям (с токенами темы и без них).
const root = path.resolve(__dirname, "..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const LEGACY_COMPAT_UNION =
  "export type ThemeMode = 'dark' | 'gold' | 'olive' | 'midnight' | 'ember' | 'aurora' | 'volt' | 'indigo' | 'sagePorcelain';";
const LEGACY_THEME_TOMBSTONES = [
  "minimalDark",
  "candyBlue",
  "business",
  "businessLight",
] as const;
// Карты тем, которые ещё существуют (часть прежних файлов удалена вместе с фичами).
const THEME_MAP_FILES = [
  "app/coin_icons.ts",
  "app/home_last_lesson_assets.ts",
  "components/ReferralInviteBannerArt.tsx",
  "constants/streakIconAssets.ts",
  "constants/screenBackground.ts",
  "constants/statsThemeChrome.ts",
  "constants/themedToastChrome.ts",
] as const;
const VARIANTS = (["calm", "accent", "max"] as const).flatMap((level) =>
  (["dark", "light"] as const).map((appearance) => ({ level, appearance, intensity: level === "calm" ? 0 : level === "accent" ? 0.5 : 1 })),
);

describe("live interface theme contract (Liquid Glass 2.0)", () => {
  const themeSource = read("constants/theme.ts");
  const contextSource = read("components/ThemeContext.tsx");

  test("visible themes are the Liquid Glass registry; ThemeMode is only the compatibility alias", () => {
    const union = themeSource.match(/export type ThemeMode\s*=\s*[^;]+;/)?.[0];
    expect(union).toBe(LEGACY_COMPAT_UNION);
    // зачем (координатор 25.10): премиум-темы видимые — их показывают в выборе тем и выдают за достижения, поэтому они в реестре: 23 + 6 = 29
    expect(LIQUID_GLASS_THEME_IDS).toHaveLength(29);
    expect(new Set(LIQUID_GLASS_THEME_IDS).size).toBe(29);
    // совместимый режим один — графитовый алиас; продаваемых «режимов» нет
    expect([...SELECTABLE_THEME_MODES]).toEqual(["dark"]);
  });

  test("every historical persisted value collapses to the Graphite alias, removed names stay out of the theme map", () => {
    expect(contextSource).toContain("const LEGACY_GRAPHITE_THEME_MODE: ThemeMode = 'dark';");
    expect(contextSource).toContain("void AsyncStorage.setItem('app_theme', LEGACY_GRAPHITE_THEME_MODE);");
    for (const removed of LEGACY_THEME_TOMBSTONES) {
      expect(contextSource).not.toMatch(new RegExp(`\\b${removed}\\b`));
    }
  });

  test("removes legacy palettes and business-only flat-mode selection", () => {
    for (const identifier of ["MINIMAL_DARK", "CANDY_BLUE", "BUSINESS", "BUSINESS_LIGHT"]) {
      expect(themeSource).not.toMatch(new RegExp(`export const ${identifier}\\b`));
      expect(contextSource).not.toMatch(new RegExp(`\\b${identifier}\\b`));
    }
    expect(contextSource).not.toMatch(/effectiveThemeMode === 'business(?:Light)?'/);
    expect(contextSource).not.toContain("isFlat");
    expect(fs.existsSync(path.join(root, "constants/flatDesign.ts"))).toBe(false);
  });

  test("removes the business-only icon color adapter and its imports", () => {
    expect(fs.existsSync(path.join(root, "constants/monoIcon.ts"))).toBe(false);
    const offenders: string[] = [];
    const visit = (directory: string) => {
      if (!fs.existsSync(directory)) return;
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) visit(absolutePath);
        else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
          const source = fs.readFileSync(absolutePath, "utf8");
          if (/constants\/monoIcon|\bmonoIcon\s*\(|\bisBusinessMode\s*\(/.test(source)) {
            offenders.push(path.relative(root, absolutePath).replace(/\\/g, "/"));
          }
        }
      }
    };
    ["app", "components", "constants", "hooks", "lib", "modules"].forEach((r) => visit(path.join(root, r)));
    expect(offenders).toEqual([]);
  });

  test("keeps every surviving theme map free of removed runtime keys and fallbacks", () => {
    const offenders: string[] = [];
    for (const relativePath of THEME_MAP_FILES) {
      const source = read(relativePath);
      for (const removed of LEGACY_THEME_TOMBSTONES) {
        const key = new RegExp(`(?:^|\\n)\\s*${removed}\\s*:`, "m");
        const lookup = new RegExp(`\\.${removed}\\b|\\[['"]${removed}['"]\\]`);
        if (key.test(source) || lookup.test(source)) offenders.push(`${relativePath}:${removed}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("accentText reaches the screens on every path: Theme object, V2 palette with tokens, V2 palette without tokens", () => {
    const bad: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const variant of VARIANTS) {
        const g = liquidGlassTokens(id, variant);
        const theme = makeLiquidGlassTheme(id, DARK, variant);
        // путь 1: Theme (с токенами) отдаёт тот же accentText, что токены
        if (!theme.accentText || theme.accentText !== g.accentText) bad.push(`Theme ${id}|${variant.level}|${variant.appearance}`);
        // путь 2: палитра V2 по теме, собранной из токенов
        const p = getV2Palette(theme, "dark");
        const ratio = paletteContrast(p.accentText.slice(0, 7), g.opaqueCard.slice(0, 7));
        if (ratio < 4.5) bad.push(`V2 ${id}|${variant.level}|${variant.appearance}=${ratio.toFixed(2)}`);
      }
    }
    // путь 3: палитра V2 по «голому» Theme без токенов — тёмный запасной вариант должен читаться на своей стеклянной поверхности
    const fallback = getV2Palette(DARK, "dark");
    expect(typeof fallback.accentText).toBe("string");
    const fallbackRatio = paletteContrast(fallback.accentText.slice(0, 7), fallback.sheet.slice(0, 7));
    if (fallbackRatio < 4.5) bad.push(`V2 без токенов=${fallbackRatio.toFixed(2)}`);
    expect(bad.slice(0, 30)).toEqual([]);
  });
});
