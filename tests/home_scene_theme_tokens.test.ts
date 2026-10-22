import assert from "node:assert/strict";

import { LIQUID_GLASS_THEME_IDS, getActiveLiquidGlassVariant, liquidGlassTokens, setActiveLiquidGlassVariant } from "../constants/liquidGlassThemePalette";
import {
  HOME_SCENE_MIN_WHITE_CONTRAST, HOME_SCENE_SEAM_MIN, HOME_SCENE_THEME_LEVEL, HOME_SCENE_TWILIGHT_THEME_ID, homeSceneThemeTokens, homeSceneTokensForTheme,
} from "../components/home/v2/scene/home_scene_tokens";

// зачем (координатор 22.10; владелец после ползунков «сцена темнее» выбрал «как сейчас» — эталон home-scene-states.html под замком f2e478486):
// цвета «Сцены» Главной обязаны совпадать с формулой эталона (функция sceneTok страницы) на всех 23 темах в обоих оформлениях, днём и вечером:
// тёмное — 30 % градиента акцента поверх фона темы, свет bgGlow, без затемнения низа, шов с карточкой ≥ 1,34; светлые «Сумерки» — числа
// home-new-concepts.html A; остальные светлые — OKLCH L .47 → .28 с оттенком акцента. Ниже — формула эталона дословно (не импорт из кода).
const hx = (h: string) => { const s = String(h).replace("#", ""); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
const ha = (h: string) => { const s = String(h).replace("#", ""); return s.length === 8 ? parseInt(s.slice(6), 16) / 255 : 1; };
const mixc = (a: number[], b: number[], w: number) => a.map((v, i) => v * w + b[i] * (1 - w));
const rgba = (c: number[], a = 1) => `rgba(${c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(",")},${a})`;
const lumc = (c: number[]) => { const s = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
const ratioc = (a: number[], b: number[]) => { const x = lumc(a); const y = lumc(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const toLin = (v: number) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
const toSrgb = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
const oklchOf = (c: number[]) => {
  const [r, g, b] = c.map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
};
const fromOklch = (L: number, C: number, H: number) => {
  const a = C * Math.cos(H * Math.PI / 180); const b = C * Math.sin(H * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]
    .map((v) => Math.max(0, Math.min(255, toSrgb(Math.max(0, Math.min(1, v))))));
};
type Ref = { top: number[]; bot: number[]; glow: string; eveTop: number[]; eveBot: number[]; seam: number };
// sceneTok эталона; t — токены темы (на странице — снимок window.__THEMES; он равен liquidGlassTokens(id, { level: 'max' }), сверка 22.10)
const sceneTok = (id: string, ap: "dark" | "light", t: any): Ref => {
  const g = t.accentGradient || [t.accent, t.accent];
  if (ap === "dark") {
    const top = mixc(hx(g[0]), hx(t.bgTop), 0.3); const bot = mixc(hx(g[g.length - 1]), hx(t.bg), 0.3);
    const gl = (t.bgGlow && t.bgGlow[0]) || t.accentGlow;
    return { top, bot, glow: rgba(hx(gl), ha(gl)), eveTop: top, eveBot: bot, seam: ratioc(bot, hx(t.opaqueCard)) };
  }
  if (id === "ink") {
    const top = fromOklch(0.47, 0.14, 282); const bot = fromOklch(0.28, 0.10, 276);
    // на странице свет «Сумерек» — CSS oklch(.66 .13 300 / .9), тот же цвет
    return { top, bot, glow: rgba(fromOklch(0.66, 0.13, 300), 0.9), eveTop: fromOklch(0.30, 0.09, 285), eveBot: fromOklch(0.14, 0.05, 280), seam: ratioc(bot, hx("#FCFCFF")) };
  }
  const [, C, H] = oklchOf(hx(t.accent));
  const top = fromOklch(0.47, Math.min(C, 0.16), H); const bot = fromOklch(0.28, Math.min(C, 0.11), (H + 354) % 360);
  return { top, bot, glow: rgba(fromOklch(0.66, Math.min(C, 0.14), (H + 18) % 360), 0.9), eveTop: fromOklch(0.30, Math.min(C, 0.09), H), eveBot: fromOklch(0.14, Math.min(C, 0.05), H), seam: ratioc(bot, hx(t.opaqueCard)) };
};
const round = (c: number[]) => c.map((v) => Math.round(Math.max(0, Math.min(255, v))));
const rgbaNums = (s: string) => { const m = /^rgba\((\d+),(\d+),(\d+),([\d.e-]+)\)$/.exec(s); return m ? [Number(m[1]), Number(m[2]), Number(m[3]), Math.round(Number(m[4]) * 1e6)] : s; };

async function main(): Promise<void> {
  assert.equal(LIQUID_GLASS_THEME_IDS.length, 23, "в приложении 23 темы");
  assert.equal(HOME_SCENE_TWILIGHT_THEME_ID, "ink", "«Сумерки» — ink");

  // ── код = формула эталона: 23 темы × 2 оформления × день/вечер, токены уровня эталона (max) ──
  for (const id of LIQUID_GLASS_THEME_IDS) {
    for (const ap of ["dark", "light"] as const) {
      const theme = liquidGlassTokens(id, { level: "max", appearance: ap });
      const ref = sceneTok(id, ap, theme);
      for (const evening of [false, true]) {
        const code = homeSceneThemeTokens({ themeId: id, appearance: ap, theme }, evening);
        const tag = `${id}/${ap}${evening ? "/вечер" : ""}`;
        assert.deepEqual(hx(code.sceneTop), round(evening ? ref.eveTop : ref.top), `${tag}: верх сцены`);
        assert.deepEqual(hx(code.sceneBottom), round(evening ? ref.eveBot : ref.bot), `${tag}: низ сцены`);
        assert.deepEqual(rgbaNums(code.sceneGlow), rgbaNums(ref.glow), `${tag}: свет сцены`);
        assert.ok(Math.abs(code.seam - ref.seam) < 1e-9, `${tag}: шов ${code.seam} ≠ ${ref.seam}`);
        assert.equal(code.scrim, ap === "light", `${tag}: затемнение низа только в светлом`);
      }
    }
  }

  // ── шов и белый текст: на всех уровнях темы ──
  for (const level of ["calm", "accent", "max"] as const) {
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const ap of ["dark", "light"] as const) {
        const theme = liquidGlassTokens(id, { level, appearance: ap });
        for (const evening of [false, true]) {
          const k = homeSceneThemeTokens({ themeId: id, appearance: ap, theme }, evening);
          const tag = `${level}/${id}/${ap}${evening ? "/вечер" : ""}`;
          if (ap === "dark") assert.ok(k.seam >= HOME_SCENE_SEAM_MIN, `${tag}: шов ${k.seam.toFixed(3)} < ${HOME_SCENE_SEAM_MIN}`);
          assert.ok(k.whiteContrastTop >= HOME_SCENE_MIN_WHITE_CONTRAST, `${tag}: белый на верхе сцены ${k.whiteContrastTop.toFixed(2)}`);
        }
      }
    }
  }

  // ── «Сумерки» светлые — утверждённые числа, вечер — свой ──
  const ink = homeSceneThemeTokens({ themeId: "ink", appearance: "light", theme: liquidGlassTokens("ink", { level: "calm", appearance: "light" }) });
  assert.deepEqual(hx(ink.sceneTop), round(fromOklch(0.47, 0.14, 282)), "«Сумерки»: верх oklch(.47 .14 282) при любом уровне");
  assert.deepEqual(hx(ink.sceneBottom), round(fromOklch(0.28, 0.10, 276)));
  const inkEve = homeSceneThemeTokens({ themeId: "ink", appearance: "light", theme: liquidGlassTokens("ink", { level: "max", appearance: "light" }) }, true);
  assert.deepEqual(hx(inkEve.sceneTop), round(fromOklch(0.30, 0.09, 285)), "«Сумерки» вечером: oklch(.30 .09 285)");
  assert.deepEqual(rgbaNums(inkEve.eveningGlow), rgbaNums(rgba(fromOklch(0.58, 0.17, 25), 0.75)), "«Сумерки» вечером: свет oklch(.58 .17 25 / .75)");
  assert.equal(homeSceneThemeTokens({ themeId: "marine", appearance: "dark", theme: liquidGlassTokens("marine", { level: "max", appearance: "dark" }) }, true).eveningGlow, "rgba(214,92,70,0.62)");

  // ── владелец 22.10: «Сцена всегда как в макете» — при любом положении ползунка сцена = эталон («Спокойно» = «Максимум») ──
  assert.equal(HOME_SCENE_THEME_LEVEL, "max");
  const before = getActiveLiquidGlassVariant();
  try {
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const ap of ["dark", "light"] as const) {
        for (const evening of [false, true]) {
          const etalon = homeSceneThemeTokens({ themeId: id, appearance: ap, theme: liquidGlassTokens(id, { level: "max", appearance: ap }) }, evening);
          for (const level of ["calm", "accent", "max"] as const) {
            setActiveLiquidGlassVariant({ level, appearance: ap });
            assert.deepEqual(homeSceneTokensForTheme(id, ap, evening), etalon, `${id}/${ap}${evening ? "/вечер" : ""}: на ползунке «${level}» сцена ≠ эталону`);
          }
        }
      }
    }
  } finally {
    setActiveLiquidGlassVariant(before);
  }
}

if (typeof test === "function") {
  test("home_scene_theme_tokens", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
