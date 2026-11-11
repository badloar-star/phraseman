"use strict";
var PM = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // docs/work/mockups/home-luxe-2026-11-11/pm_entry.ts
  var pm_entry_exports = {};
  __export(pm_entry_exports, {
    THEME_TUNE_CMAX: () => THEME_TUNE_CMAX,
    THEME_TUNE_STANDARD: () => THEME_TUNE_STANDARD,
    approvedScene: () => approvedScene,
    homeSceneTokensForTheme: () => homeSceneTokensForTheme,
    homeSceneWarmTone: () => homeSceneWarmTone,
    isSkyPalette: () => isSkyPalette,
    liquidGlassTokens: () => liquidGlassTokens,
    nestedShadowStyle: () => nestedShadowStyle,
    oklchToHex: () => oklchToHex,
    plateGradient: () => plateGradient,
    plateShadowStyle: () => plateShadowStyle,
    raisedGradient: () => raisedGradient,
    raisedShadowStyle: () => raisedShadowStyle,
    sceneFrameToneHex: () => sceneFrameToneHex,
    sceneTopHex: () => sceneTopHex,
    skyToneHex: () => skyToneHex,
    themeTuneId: () => themeTuneId
  });

  // constants/liquidGlassColor.ts
  var clamp = (value) => Math.max(0, Math.min(1, value));
  var byte = (value) => Math.round(clamp(value) * 255).toString(16).padStart(2, "0").toUpperCase();
  function oklchToHex(lightness, chroma2, hue) {
    const h = hue * Math.PI / 180;
    const a = chroma2 * Math.cos(h);
    const b = chroma2 * Math.sin(h);
    const l_ = lightness + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = lightness - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = lightness - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;
    return `#${[
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    ].map((channel4) => channel4 <= 31308e-7 ? 12.92 * channel4 : 1.055 * channel4 ** (1 / 2.4) - 0.055).map(byte).join("")}`;
  }
  var alpha = (hex3, opacity) => `${hex3}${byte(opacity)}`;
  var oklchA = (lightness, chroma2, hue, opacity) => alpha(oklchToHex(lightness, chroma2, hue), opacity);

  // constants/liquidGlassSurfaceRoles.ts
  var hex6 = (hex3) => /^#[0-9A-Fa-f]{6}/.test(hex3) ? hex3.slice(0, 7).toUpperCase() : "#000000";
  function mixSurfaceHex(from, to, k) {
    const a = Number.parseInt(hex6(from).slice(1), 16);
    const b = Number.parseInt(hex6(to).slice(1), 16);
    const ch = (shift) => Math.round((a >> shift & 255) * (1 - k) + (b >> shift & 255) * k).toString(16).padStart(2, "0");
    return `#${ch(16)}${ch(8)}${ch(0)}`.toUpperCase();
  }
  var withAlpha = (hex3, opacity) => `${hex6(hex3)}${Math.round(opacity * 255).toString(16).padStart(2, "0").toUpperCase()}`;
  var lum = (hex3) => {
    const n = Number.parseInt(hex6(hex3).slice(1), 16);
    const ch = (shift) => {
      const c = (n >> shift & 255) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * ch(16) + 0.7152 * ch(8) + 0.0722 * ch(0);
  };
  var ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  function flattenOver(top, bottom) {
    const hex3 = top.trim().match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
    const rgba = top.trim().match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    let rgb2;
    let a = 1;
    if (hex3) {
      const n = Number.parseInt(hex3[1], 16);
      rgb2 = [n >> 16 & 255, n >> 8 & 255, n & 255];
      a = hex3[2] ? Number.parseInt(hex3[2], 16) / 255 : 1;
    } else if (rgba) {
      rgb2 = [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])];
      a = rgba[4] === void 0 ? 1 : Number(rgba[4]);
    } else return hex6(bottom);
    const base = Number.parseInt(hex6(bottom).slice(1), 16);
    const ch = (i, shift) => Math.round(rgb2[i] * a + (base >> shift & 255) * (1 - a)).toString(16).padStart(2, "0");
    return `#${ch(0, 16)}${ch(1, 8)}${ch(2, 0)}`.toUpperCase();
  }
  function legibleOn(color, toward, surfaces, min) {
    let tone = hex6(color);
    const against = surfaces.map(hex6);
    for (let k = 0; k <= 1.0001; k += 0.05) {
      tone = mixSurfaceHex(color, toward, Math.min(k, 1));
      if (against.every((bg) => ratio(tone, bg) >= min)) return tone;
    }
    return hex6(toward);
  }
  function nonTextTone(t, from, min, extra = []) {
    const against = [t.opaqueCard, t.card, t.opaqueSheet, t.opaqueControl, t.bg, ...extra].map(hex6);
    for (let k = from; k <= 1.0001; k += 0.02) {
      const tone = mixSurfaceHex(t.opaqueCard, t.text, Math.min(k, 1));
      if (against.every((bg) => ratio(tone, bg) >= min)) return tone;
    }
    return hex6(t.text);
  }
  var labL = (hex3) => {
    const y = lum(hex3);
    return y > 8856e-6 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
  };
  var PLATE_BG_MIN_DL = 3;
  function separatedFromBackground(color, toward, backgrounds, minDL = PLATE_BG_MIN_DL) {
    const bgL = backgrounds.map(labL);
    for (let k = 0; k <= 0.6001; k += 0.02) {
      const tone = k === 0 ? hex6(color) : mixSurfaceHex(color, toward, k);
      if (bgL.every((l) => Math.abs(labL(tone) - l) >= minDL)) return tone;
    }
    return hex6(color);
  }
  var LIGHT_SHADOW_BASE = "#282850";
  function deriveLiquidGlassSurfaceRoles(t) {
    const tintShare = { calm: 0.35, accent: 0.55, max: 0.75 }[t.level ?? "calm"];
    const tinted = t.shadowTint.length > 7 ? mixSurfaceHex(LIGHT_SHADOW_BASE, t.shadowTint, tintShare) : LIGHT_SHADOW_BASE;
    const lightShadow = (alpha2) => withAlpha(tinted, alpha2);
    const shadowStyle = t.isLight ? {
      plateFillFrom: hex6(t.opaqueCard),
      sheetPlateFillFrom: hex6(t.opaqueCard),
      sheetPlateFillTo: separatedFromBackground(
        mixSurfaceHex(t.opaqueCard, t.opaqueControl, 0.55),
        t.text,
        [t.bg, ...t.bgTop ? [t.bgTop] : [], ...t.bgBottom ? [t.bgBottom] : []]
      ),
      plateFillTo: separatedFromBackground(
        mixSurfaceHex(t.opaqueCard, t.opaqueControl, 0.55),
        t.text,
        [t.bg, ...t.bgTop ? [t.bgTop] : [], ...t.bgBottom ? [t.bgBottom] : []]
      ),
      raisedFillFrom: hex6(t.opaqueCard),
      raisedFillTo: mixSurfaceHex(t.opaqueCard, t.opaqueControl, 0.25),
      plateShadow: lightShadow(0.34),
      plateShadowSoft: lightShadow(0.06),
      nestedShadow: lightShadow(0.28),
      raisedShadow: lightShadow(0.46),
      raisedShadowSoft: lightShadow(0.08),
      dividerTone: "rgba(20,20,40,0.06)"
    } : {
      plateFillFrom: mixSurfaceHex(t.bg, "#FFFFFF", 0.085),
      plateFillTo: mixSurfaceHex(t.bg, "#FFFFFF", 0.04),
      // зачем (cards-v2-017/020, поручение координатора 15.10): плитки шторок считались от ФОНА, а шторка светлее фона — плитка выходила темнее шторки и сливалась. Тут — от заливки шторки.
      sheetPlateFillFrom: mixSurfaceHex(t.opaqueSheet, "#FFFFFF", 0.085),
      sheetPlateFillTo: mixSurfaceHex(t.opaqueSheet, "#FFFFFF", 0.04),
      raisedFillFrom: mixSurfaceHex(t.bg, "#FFFFFF", 0.15),
      raisedFillTo: mixSurfaceHex(t.bg, "#FFFFFF", 0.07),
      plateShadow: "rgba(0,0,0,0.75)",
      plateShadowSoft: "rgba(0,0,0,0)",
      nestedShadow: "rgba(0,0,0,0.6)",
      raisedShadow: "rgba(0,0,0,0.9)",
      raisedShadowSoft: "rgba(0,0,0,0)",
      dividerTone: "rgba(255,255,255,0.07)"
    };
    const extraSurfaces = [shadowStyle.raisedFillFrom, ...t.bgTop ? [t.bgTop] : []];
    const iconMuted = nonTextTone(t, 0.4, 3.2, extraSurfaces);
    const trackOff = nonTextTone(t, 0.32, 3.1, extraSurfaces);
    if (t.isLight) {
      return Object.freeze({
        deepBase: mixSurfaceHex(t.opaqueControl, "#000000", 0.08),
        deepBaseAlt: t.opaqueControl,
        mediaScrim: "rgba(0,0,0,0.45)",
        mediaInk: "#FFFFFF",
        mediaInkSoft: "rgba(255,255,255,0.78)",
        bevelHi: "rgba(255,255,255,0.90)",
        bevelLo: "rgba(0,0,0,0.10)",
        dropShadow: t.shadowTint.length > 7 ? t.shadowTint : "rgba(0,0,0,0.16)",
        hairlineSoft: withAlpha(t.text, 0.1),
        iconMuted,
        trackOff,
        ...shadowStyle
      });
    }
    return Object.freeze({
      deepBase: mixSurfaceHex(t.bg, "#000000", 0.35),
      deepBaseAlt: mixSurfaceHex(t.bg, "#000000", 0.6),
      mediaScrim: withAlpha(mixSurfaceHex(t.bg, "#000000", 0.35), 0.58),
      mediaInk: "#FFFFFF",
      mediaInkSoft: "rgba(255,255,255,0.70)",
      bevelHi: "rgba(255,255,255,0.30)",
      bevelLo: "rgba(0,0,0,0.45)",
      dropShadow: "rgba(0,0,0,0.85)",
      hairlineSoft: withAlpha(t.text, 0.08),
      iconMuted,
      trackOff,
      ...shadowStyle
    });
  }

  // constants/liquidGlassPaletteRoles.ts
  var clamp01 = (v) => Math.max(0, Math.min(1, v));
  var toByte = (v) => Math.round(clamp01(v) * 255);
  var hex2 = (n) => n.toString(16).padStart(2, "0").toUpperCase();
  function oklchToHexLocal(lightness, chroma2, hue) {
    const h = hue * Math.PI / 180;
    const a = chroma2 * Math.cos(h);
    const b = chroma2 * Math.sin(h);
    const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const lin = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    ];
    return `#${lin.map((c) => c <= 31308e-7 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055).map((c) => hex2(toByte(c))).join("")}`;
  }
  function hueOfHex(hex3, fallback = 260) {
    const n = Number.parseInt(hex3.slice(1, 7), 16);
    if (!Number.isFinite(n)) return fallback;
    const lin = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    const [r, g, b] = lin;
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    if (Math.hypot(a, bb) < 4e-3) return fallback;
    return (Math.atan2(bb, a) * 180 / Math.PI + 360) % 360;
  }
  function luminance(hex3) {
    const n = Number.parseInt(hex3.slice(1, 7), 16);
    const ch = (shift) => {
      const c = (n >> shift & 255) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * ch(16) + 0.7152 * ch(8) + 0.0722 * ch(0);
  }
  function paletteContrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }
  function toContrast(hue, chroma2, start, dir, min, against) {
    let lightness = start;
    let color = oklchToHexLocal(lightness, chroma2, hue);
    for (let i = 0; i < 60; i += 1) {
      if (against.every((bg) => paletteContrast(color, bg) >= min)) return color;
      lightness = clamp01(lightness + dir * 0.012);
      color = oklchToHexLocal(lightness, chroma2, hue);
    }
    return color;
  }
  var withAlpha2 = (hex3, opacity) => `${hex3}${hex2(toByte(opacity))}`;
  var ROLE_HUES = {
    Blue: 250,
    Green: 150,
    Orange: 55,
    Red: 25,
    Pink: 350,
    Purple: 305,
    Indigo: 275,
    Teal: 190,
    Gold: 85
  };
  var LEVEL_KEYS = ["A1", "A2", "B1", "B2"];
  function deriveLiquidGlassPaletteRoles(t) {
    const surfaces = [t.opaqueCard, t.bg, t.opaqueControl, ...t.bgTop ? [t.bgTop] : []].map((c) => c.slice(0, 7));
    const k = clamp01(t.intensity);
    const dark = !t.isLight;
    const chroma2 = 0.05 + 0.07 * k;
    const out = {};
    const semantic = [["good", 150, 0.13, 0.77], ["bad", 25, 0.15, 0.7], ["warn", 88, 0.14, 0.84], ["info", 240, 0.11, 0.78]];
    for (const [name, hue, sc, darkL] of semantic) {
      const isBad = name === "bad";
      const against = isBad && t.opaqueSheet ? [...surfaces, t.opaqueSheet.slice(0, 7)] : surfaces;
      const c = toContrast(hue, sc, dark ? darkL : 0.52, dark ? 1 : -1, isBad ? 4.8 : 4.5, against);
      out[name] = c;
      out[`${name}Soft`] = withAlpha2(c, dark ? 0.16 : 0.14);
    }
    out.scrim = dark ? "rgba(0,0,0,0.60)" : "rgba(20,22,28,0.45)";
    out.scrimStrong = dark ? "rgba(0,0,0,0.80)" : "rgba(20,22,28,0.70)";
    const roleHues = { ...ROLE_HUES };
    const tile = (hue, c) => {
      const deep = toContrast(hue, c, dark ? 0.52 : 0.5, -1, 4.5, ["#FFFFFF"]);
      const top = toContrast(hue, c, dark ? 0.66 : 0.58, -1, 3, ["#FFFFFF"]);
      return [top, deep];
    };
    for (const [name, hue] of Object.entries(roleHues)) {
      const [top, deep] = tile(hue, chroma2);
      out[`tile${name}`] = top;
      out[`tile${name}Deep`] = deep;
    }
    {
      const [top, deep] = tile(255, 0.015);
      out.tileGray = top;
      out.tileGrayDeep = deep;
    }
    const categories = [["Streak", 45], ["Lessons", 250], ["Combo", 305], ["Special", 350], ["Medal", 85]];
    for (const [name, hue] of categories) {
      const [top, deep] = tile(hue, chroma2);
      out[`ach${name}`] = top;
      out[`ach${name}Deep`] = deep;
    }
    const medals = [["Bronze", 55, 0.09], ["Silver", 250, 0.012], ["Gold", 85, 0.125], ["Platinum", 225, 0.02]];
    for (const [name, hue, c] of medals) {
      const [top, deep] = tile(hue, c);
      out[`medal${name}`] = top;
      out[`medal${name}Deep`] = deep;
    }
    const baseHue = hueOfHex(t.opaqueControl);
    LEVEL_KEYS.forEach((key, i) => {
      const hue = (baseHue + i * 18) % 360;
      const bg = oklchToHexLocal(dark ? 0.3 - i * 0.015 : 0.94 - i * 0.02, 0.02 + 0.03 * k, hue);
      out[`level${key}Bg`] = bg;
      out[`level${key}`] = toContrast(hue, 0.04 + 0.07 * k, dark ? 0.86 - i * 0.04 : 0.4 + i * 0.02, dark ? 1 : -1, 4.5, [bg]);
    });
    return Object.freeze(out);
  }
  var SEMANTIC = ["good", "bad", "warn", "info"];
  var ROLE_NAMES = [...Object.keys(ROLE_HUES), "Gray"];
  var ACH = ["Streak", "Lessons", "Combo", "Special", "Medal"];
  var MEDALS = ["Bronze", "Silver", "Gold", "Platinum"];
  var LIQUID_GLASS_PALETTE_ROLE_KEYS = Object.freeze([
    ...SEMANTIC,
    ...SEMANTIC.map((n) => `${n}Soft`),
    "scrim",
    "scrimStrong",
    ...ROLE_NAMES.flatMap((n) => [`tile${n}`, `tile${n}Deep`]),
    ...ACH.flatMap((n) => [`ach${n}`, `ach${n}Deep`]),
    ...MEDALS.flatMap((n) => [`medal${n}`, `medal${n}Deep`]),
    ...LEVEL_KEYS.flatMap((n) => [`level${n}`, `level${n}Bg`])
  ]);

  // constants/liquidGlassButtonTokens.ts
  var SURFACE_MIN = 1.7;
  var DISABLED_SURFACE_MIN = 1.5;
  var TEXT_MIN = 4.6;
  var CTA_SURFACE_MIN = 3;
  var CTA_INK_MIN = 4.5;
  var CTA_VS_SECONDARY_MIN = 1.3;
  var DISABLED_INK_TARGET = 4.6;
  var DANGER_SURFACE_MIN = 1.5;
  var DANGER_INK_MIN = 4.6;
  var hex62 = (hex3) => /^#[0-9A-Fa-f]{6}/.test(hex3) ? hex3.slice(0, 7).toUpperCase() : "#000000";
  var rgb = (hex3) => {
    const h = hex62(hex3).slice(1);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  var lum2 = (hex3) => {
    const [r, g, b] = rgb(hex3).map((v) => v / 255).map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  var ratio2 = (a, b) => {
    const x = lum2(a);
    const y = lum2(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  var mix = (from, to, k) => {
    const a = rgb(from);
    const b = rgb(to);
    const c = (i) => Math.round(a[i] * (1 - k) + b[i] * k).toString(16).padStart(2, "0");
    return `#${c(0)}${c(1)}${c(2)}`.toUpperCase();
  };
  function underSurfaces(t) {
    return [t.bg, t.bgTop, t.bgBottom, t.opaqueCard, t.opaqueSheet];
  }
  var minOver = (color, under) => Math.min(...under.map((s) => ratio2(color, s)));
  var chroma = (hex3) => {
    const c = rgb(hex3);
    return (Math.max(...c) - Math.min(...c)) / 255;
  };
  var NEUTRAL_CHROMA_MAX = 0.03;
  var ACCENT_CHROMA_MIN = 0.05;
  var TONE_SHARE = 0.3;
  function fillLine(t) {
    const tone = chroma(t.opaqueControl) < NEUTRAL_CHROMA_MAX && chroma(t.cta) >= ACCENT_CHROMA_MIN;
    return { start: tone ? mix(t.opaqueControl, t.cta, TONE_SHARE) : hex62(t.opaqueControl), toward: tone ? mix(t.text, t.cta, 0.2) : t.text };
  }
  function disabledFill(t, secondary) {
    const under = underSurfaces(t);
    let best = secondary;
    for (let k = 0.02; k <= 1.0001; k += 0.02) {
      const c = mix(secondary, t.opaqueSheet, k);
      if (minOver(c, under) < DISABLED_SURFACE_MIN) break;
      best = c;
    }
    return best;
  }
  function secondaryFill(t) {
    const under = underSurfaces(t);
    const { start, toward } = fillLine(t);
    let best = start;
    let bestScore = -1;
    for (let k = 0; k <= 0.9001; k += 0.02) {
      const c = mix(start, toward, k);
      const rs = minOver(c, under);
      const rt = ratio2(t.text, c);
      if (rs >= SURFACE_MIN && rt >= TEXT_MIN) return c;
      const score = Math.min(rs / SURFACE_MIN, 1) + Math.min(rt / TEXT_MIN, 1);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  }
  function primaryFor(t, secondary, ink, toward) {
    const under = underSurfaces(t);
    const cta = hex62(t.cta);
    const inkIsLight = lum2(ink) > 0.5;
    const ok = (c) => minOver(c, under) >= CTA_SURFACE_MIN && ratio2(c, secondary) >= CTA_VS_SECONDARY_MIN && ratio2(ink, c) >= CTA_INK_MIN;
    let best = cta;
    let bestSurface = -1;
    for (let k = 0; k <= 0.9001; k += 4e-3) {
      const c = k === 0 ? cta : mix(cta, toward, k);
      const inkOk = ratio2(ink, c) >= CTA_INK_MIN;
      if (!inkOk && k > 0 && !inkIsLight) break;
      if (!inkOk) continue;
      if (ok(c)) return { fill: c, ok: true, surface: minOver(c, under) };
      const surface = minOver(c, under);
      if (ratio2(c, secondary) >= CTA_VS_SECONDARY_MIN && surface > bestSurface) {
        bestSurface = surface;
        best = c;
      }
    }
    return { fill: best, ok: false, surface: bestSurface < 0 ? minOver(cta, under) : bestSurface };
  }
  function primaryRoles(t, secondary) {
    const ink = hex62(t.ctaInk);
    const first = primaryFor(t, secondary, ink, t.text);
    if (first.ok) return { fill: first.fill, ink };
    const white = "#FFFFFF";
    if (ink !== white) {
      const alt = primaryFor(t, secondary, white, "#000000");
      if (alt.ok || alt.surface > first.surface) return { fill: alt.fill, ink: white };
    }
    return { fill: first.fill, ink };
  }
  var redHue = (hex3) => {
    const [r, g, b] = rgb(hex3);
    const mx = Math.max(r, g, b);
    const d = mx - Math.min(r, g, b);
    if (d === 0) return false;
    const h = ((mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + 360) % 360;
    return (h <= 20 || h >= 340) && chroma(hex3) >= 0.08;
  };
  function dangerRoles(t) {
    const under = underSurfaces(t);
    let fallback = { dangerFill: mix(t.opaqueSheet, t.bad, 0.4), dangerInk: hex62(t.text) };
    const level = Math.round(Math.max(0, Math.min(1, lum2(t.opaqueSheet) ** (1 / 2.2))) * 255).toString(16).padStart(2, "0");
    for (const base of [t.opaqueSheet, `#${level}${level}${level}`]) {
      for (let k = 0.1; k <= 0.7001; k += 0.02) {
        const fill = mix(base, t.bad, k);
        if (minOver(fill, under) < DANGER_SURFACE_MIN || !redHue(fill)) continue;
        for (let m = 0.2; m <= 1.0001; m += 0.05) {
          const ink = mix(t.bad, t.text, Math.min(m, 1));
          if (ratio2(ink, fill) >= DANGER_INK_MIN) return { dangerFill: fill, dangerInk: ink };
        }
        fallback = { dangerFill: fill, dangerInk: hex62(t.text) };
      }
    }
    return fallback;
  }
  function deriveLiquidGlassButtonRoles(t) {
    const buttonFill = secondaryFill(t);
    const buttonFillDisabled = disabledFill(t, buttonFill);
    let buttonInkDisabled = hex62(t.text);
    for (let a = 0.98; a >= 0.2; a -= 0.02) {
      const candidate = mix(buttonFillDisabled, t.text, a);
      if (ratio2(candidate, buttonFillDisabled) < DISABLED_INK_TARGET) break;
      buttonInkDisabled = candidate;
    }
    const primary = primaryRoles(t, buttonFill);
    return { buttonFill, buttonFillDisabled, buttonInkDisabled, ctaFill: primary.fill, ctaFillInk: primary.ink, ...dangerRoles(t) };
  }

  // constants/theme_tune.ts
  var THEME_TUNE_STANDARD = Object.freeze({ H: 250, S: 35 });
  var THEME_TUNE_S_STANDARD = 35;
  var THEME_TUNE_K_MAX = 3;
  var THEME_TUNE_CMAX = 0.16;
  var S_FLOOR = 0;
  var ID_RE = /^tune:(\d{1,3}):(\d{1,3})$/;
  var clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
  var wrapHue = (h) => (Math.round(h) % 360 + 360) % 360;
  function normalizeThemeTune(input) {
    const h = typeof input.H === "number" && Number.isFinite(input.H) ? wrapHue(input.H) : THEME_TUNE_STANDARD.H;
    const s = typeof input.S === "number" && Number.isFinite(input.S) ? clampInt(input.S, 0, 100) : THEME_TUNE_STANDARD.S;
    return Object.freeze({ H: h, S: s });
  }
  function themeTuneId(tune) {
    const n = normalizeThemeTune(tune);
    return `tune:${n.H}:${n.S}`;
  }
  function parseThemeTuneId(id) {
    if (typeof id !== "string") return null;
    const m = ID_RE.exec(id);
    if (!m) return null;
    const H = Number(m[1]);
    const S = Number(m[2]);
    if (H > 359 || S > 100) return null;
    return Object.freeze({ H, S });
  }
  var themeTuneChromaScale = (S) => Math.min(THEME_TUNE_K_MAX, Math.max(S_FLOOR, S) / THEME_TUNE_S_STANDARD);
  function tunedBaseTokens(tune) {
    const { H, S } = normalizeThemeTune(tune);
    const k = themeTuneChromaScale(S);
    const c = (v) => v * k;
    const tone = (lightness, chroma2) => oklchToHex(lightness, c(chroma2), H);
    const tint = tone(0.78, 0.026);
    return Object.freeze({
      bg: tone(0.105, 0.014),
      bgTop: tone(0.155, 0.018),
      bgBottom: tone(0.14, 0.018),
      opaqueCard: tone(0.15, 0.018),
      opaqueSheet: tone(0.18, 0.02),
      opaqueControl: tone(0.24, 0.022),
      card: alpha(tone(0.15, 0.018), 0.9),
      sheet: alpha(tone(0.17, 0.02), 0.74),
      glassEdge: alpha(tone(0.9, 0.02), 0.12),
      lightTint: alpha(tone(0.94, 0.024), 0.92),
      cta: tone(0.92, 0.028),
      ctaInk: tone(0.12, 0.018),
      text: tone(0.985, 6e-3),
      secondary: tone(0.82, 0.016),
      mutedText: tone(0.78, 0.016),
      line: alpha(tone(0.92, 0.018), 0.1),
      selected: alpha(tint, 0.2)
    });
  }
  function themeTuneVivid(tune) {
    const { H, S } = normalizeThemeTune(tune);
    return Object.freeze({ fam: "gem", h: H, h2: H, c: S / 100 * THEME_TUNE_CMAX });
  }

  // constants/liquidGlassThemeVariants.ts
  var LIQUID_GLASS_COLOR_LEVELS = ["calm", "accent", "max"];
  var DEFAULT_LIQUID_GLASS_VARIANT = Object.freeze({ level: "calm", appearance: "dark", intensity: 0 });
  function resolveLiquidGlassColorLevel(value) {
    return typeof value === "string" && LIQUID_GLASS_COLOR_LEVELS.includes(value) ? value : "calm";
  }
  function resolveLiquidGlassAppearance(value) {
    return value === "light" ? "light" : "dark";
  }
  var LIQUID_GLASS_VIVID = Object.freeze({
    graphite: { fam: "metal", h: 250, h2: 215, c: 0.04 },
    polar: { fam: "nature", h: 244, h2: 212, c: 0.095 },
    slate: { fam: "gem", h: 262, h2: 262, c: 0.15 },
    ink: { fam: "night", h: 282, h2: 305, c: 0.085 },
    lavender: { fam: "gem", h: 305, h2: 305, c: 0.15 },
    iris: { fam: "night", h: 332, h2: 292, c: 0.085 },
    rose: { fam: "metal", h: 22, h2: 58, c: 0.075 },
    terracotta: { fam: "nature", h: 32, h2: 72, c: 0.14 },
    taupe: { fam: "metal", h: 58, h2: 78, c: 0.085 },
    olive: { fam: "metal", h: 78, h2: 92, c: 0.115 },
    sage: { fam: "gem", h: 160, h2: 160, c: 0.14 },
    eucalyptus: { fam: "nature", h: 186, h2: 145, c: 0.12 },
    marine: { fam: "nature", h: 216, h2: 186, c: 0.11 }
  });
  var CLEAR = "#00000000";
  function direction(deg) {
    const rad = deg * Math.PI / 180;
    const dx = Math.sin(rad) / 2;
    const dy = -Math.cos(rad) / 2;
    const r = (n) => Math.round(n * 1e3) / 1e3;
    return { start: { x: r(0.5 - dx), y: r(0.5 - dy) }, end: { x: r(0.5 + dx), y: r(0.5 + dy) } };
  }
  function calmDarkRoles(t) {
    const dir = direction(180);
    return Object.freeze({
      level: "calm",
      appearance: "dark",
      isLight: false,
      accent: t.cta,
      accentInk: t.ctaInk,
      accentText: t.cta,
      accentBright: t.cta,
      accentSoft: t.selected,
      accentBorder: t.lightTint,
      accentCap: t.cta,
      accentTile: t.opaqueControl,
      accentGlow: CLEAR,
      accentGradient: Object.freeze([t.cta, t.cta]),
      accentGradientStart: dir.start,
      accentGradientEnd: dir.end,
      progressGradient: Object.freeze([t.cta, t.cta]),
      overline: t.secondary,
      bgGlow: Object.freeze([CLEAR, CLEAR, CLEAR]),
      cardSmoke: Object.freeze([CLEAR, CLEAR]),
      shadowTint: "#000000"
    });
  }
  function darkVividRoles(v, t, level) {
    const { fam, h, h2, c } = v;
    const night = fam === "night";
    const a = oklchToHex(night ? 0.84 : 0.8, c, h);
    const aHi = oklchToHex(night ? 0.92 : 0.9, night ? c * 0.6 : c * 0.72, h);
    const aLo = oklchToHex(night ? 0.72 : 0.66, night ? c : c * 1.04, h);
    const a2 = oklchToHex(0.79, c, h2);
    const byFam = {
      gem: { g: [aHi, a, aLo], deg: 172, p: [aLo, a, aHi] },
      metal: {
        g: [oklchToHex(0.93, c * 0.55, h), oklchToHex(0.76, c, h), oklchToHex(0.9, c * 0.6, h2), oklchToHex(0.72, c, h)],
        deg: 112,
        p: [oklchToHex(0.7, c, h), oklchToHex(0.92, c * 0.55, h2), oklchToHex(0.78, c, h)]
      },
      nature: { g: [a, a2], deg: 115, p: [a2, a] },
      night: { g: [aHi, a], deg: 180, p: [aLo, a, aHi] }
    }[fam];
    const dir = direction(byFam.deg);
    const max = level === "max";
    const glow1 = fam === "gem" ? oklchA(0.6, c, h, 0.82) : fam === "metal" ? oklchA(0.54, c * 0.78, h, 0.66) : night ? oklchA(0.52, c * 1.15, h, 0.7) : oklchA(0.58, c, h, 0.78);
    const glow2 = fam === "metal" ? oklchA(0.48, c * 0.7, h2, 0.46) : fam === "nature" ? oklchA(0.58, c, h2, 0.7) : night ? oklchA(0.46, c * 1.05, h2, 0.52) : oklchA(0.54, c, h2, 0.62);
    return Object.freeze({
      level,
      appearance: "dark",
      isLight: false,
      accent: a,
      accentInk: oklchToHex(0.2, c * 0.38, h),
      accentText: a,
      accentBright: aHi,
      accentSoft: max ? oklchA(0.48, c, h, 0.62) : oklchA(0.42, c, h, 0.42),
      accentBorder: a,
      accentCap: oklchToHex(0.78, c, h),
      accentTile: oklchA(0.36, c * 0.78, h, 0.94),
      accentGlow: oklchA(0.62, c, h, 0.55),
      accentGradient: Object.freeze(byFam.g),
      accentGradientStart: dir.start,
      accentGradientEnd: dir.end,
      progressGradient: Object.freeze(byFam.p),
      overline: max ? oklchToHex(0.86, c * 0.7, h) : t.secondary,
      bgGlow: Object.freeze(max ? [glow1, glow2, oklchA(0.42, c * 0.85, h, 0.52)] : [CLEAR, CLEAR, CLEAR]),
      cardSmoke: Object.freeze(max ? [oklchA(0.66, c, h, 0.3), oklchA(0.62, c, h2, 0.18)] : [CLEAR, CLEAR]),
      shadowTint: "#000000"
    });
  }
  function darkMaxBase(v, t) {
    const { fam, h, h2, c } = v;
    const card = oklchToHex(0.225, c * 0.36, h);
    const sheet = oklchToHex(0.19, c * 0.26, h);
    return Object.freeze({
      ...t,
      bg: oklchToHex(0.15, c * 0.36, h),
      bgTop: fam === "metal" ? oklchToHex(0.24, c * 0.45, h) : oklchToHex(0.25, c * 0.62, h),
      bgBottom: oklchToHex(0.19, c * 0.48, h2),
      opaqueCard: card,
      opaqueSheet: sheet,
      opaqueControl: oklchToHex(0.29, c * 0.34, h),
      card: alpha(card, 0.92),
      sheet: alpha(sheet, 0.96),
      glassEdge: oklchA(0.92, c * 0.6, h, 0.15),
      text: oklchToHex(0.985, 6e-3, h),
      secondary: oklchToHex(0.84, c * 0.24, h),
      mutedText: oklchToHex(0.7, c * 0.22, h),
      line: oklchA(0.9, c * 0.6, h, 0.15),
      selected: oklchA(0.78, c, h, 0.2)
    });
  }
  function lightBase(v, level) {
    const { h, h2, c } = v;
    const tn = Math.max(6e-3, Math.min(0.016, c * 0.11));
    const max = level === "max";
    const text = oklchToHex(0.21, tn * 1.3, h);
    const card = max ? oklchToHex(0.993, c * 0.08, h) : oklchToHex(0.997, tn * 0.15, h);
    const sheet = oklchToHex(0.99, tn * 0.3, h);
    return Object.freeze({
      bg: max ? oklchToHex(0.945, c * 0.22 + 6e-3, h) : oklchToHex(0.955, tn, h),
      bgTop: max ? oklchToHex(0.97, c * 0.14, h) : oklchToHex(0.975, tn * 0.7, h),
      bgBottom: max ? oklchToHex(0.93, c * 0.26 + 6e-3, h2) : oklchToHex(0.945, tn, h),
      opaqueCard: card,
      opaqueSheet: sheet,
      opaqueControl: max ? oklchToHex(0.9, c * 0.25, h) : oklchToHex(0.915, tn * 1.2, h),
      card: alpha(card, max ? 0.93 : 0.97),
      sheet: alpha(sheet, 0.98),
      glassEdge: max ? oklchA(0.45, c * 0.6, h, 0.2) : oklchA(0.35, tn * 2, h, 0.13),
      lightTint: alpha(text, 0.92),
      // зачем: нейтральная кнопка в светлом — «чернильный» тон темы с белым текстом (контраст ≥ 4.5).
      cta: oklchToHex(0.24, c * 0.28 + 9e-3, h),
      ctaInk: "#FFFFFF",
      // зачем (PM-033, аудит контраста 01.10): при L .57 приглушённый текст на карточке давал 4.32–4.48 < 4.5 во всех светлых темах.
      text,
      secondary: oklchToHex(0.47, tn * 1.6, h),
      mutedText: oklchToHex(0.55, tn * 1.4, h),
      line: max ? oklchA(0.45, c * 0.6, h, 0.14) : oklchA(0.35, tn * 2, h, 0.09),
      selected: oklchA(0.3, c * 0.35 + 0.01, h, 0.08)
    });
  }
  function whiteSafe(maxL, chroma2, hue) {
    const lum3 = (hex3) => {
      const n = Number.parseInt(hex3.slice(1, 7), 16);
      const ch = (s) => {
        const v = (n >> s & 255) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * ch(16) + 0.7152 * ch(8) + 0.0722 * ch(0);
    };
    let l = maxL;
    let color = oklchToHex(l, chroma2, hue);
    while (l > 0.2 && 1.05 / (lum3(color) + 0.05) < 4.55) {
      l -= 5e-3;
      color = oklchToHex(l, chroma2, hue);
    }
    return color;
  }
  function lightRoles(v, t, level) {
    const { fam, h, h2, c } = v;
    const tn = Math.max(6e-3, Math.min(0.016, c * 0.11));
    const calm = level === "calm";
    const max = level === "max";
    const shadowTint = oklchA(0.35, c * 0.6 + 0.01, h, 0.16);
    if (calm) {
      const a3 = oklchToHex(0.3, c * 0.35 + 0.01, h);
      const dir2 = direction(180);
      return Object.freeze({
        level,
        appearance: "light",
        isLight: true,
        accent: oklchToHex(0.24, c * 0.28 + 9e-3, h),
        accentInk: "#FFFFFF",
        accentText: a3,
        accentBright: a3,
        accentSoft: oklchA(0.3, c * 0.35 + 0.01, h, 0.08),
        accentBorder: a3,
        accentCap: oklchA(0.3, 0.01, h, 0.1),
        accentTile: oklchA(0.93, tn * 1.3, h, 0.97),
        accentGlow: oklchA(0.25, c * 0.3, h, 0.35),
        accentGradient: Object.freeze([oklchToHex(0.3, c * 0.3 + 0.01, h), oklchToHex(0.18, c * 0.25 + 8e-3, h)]),
        accentGradientStart: dir2.start,
        accentGradientEnd: dir2.end,
        progressGradient: Object.freeze([oklchToHex(0.26, c * 0.3 + 0.01, h), oklchToHex(0.42, c * 0.35 + 0.01, h)]),
        overline: t.secondary,
        bgGlow: Object.freeze([CLEAR, CLEAR, CLEAR]),
        cardSmoke: Object.freeze([CLEAR, CLEAR]),
        shadowTint
      });
    }
    const cc = fam === "night" ? c * 1.3 + 0.02 : c * 1.05 + 0.02;
    const a = oklchToHex(0.52, cc, h);
    const aHi = whiteSafe(0.55, cc, h);
    const aLo = oklchToHex(0.45, cc, h);
    const aText = oklchToHex(h >= 140 && h <= 200 ? 0.44 : 0.47, cc, h);
    const a2 = oklchToHex(0.52, cc, h2);
    const byFam = {
      gem: { g: [aHi, a, aLo], deg: 172, p: [aLo, aHi] },
      metal: {
        // зачем (аудит читаемости 10.10, пункт 3 координатора): первая точка градиента L .58 при малой насыщенности металла (Графит/Сланец/Чернила/
        // Роза/Таупе/Олива/Шалфей) давала белому тексту кнопки 4.27–4.46 < 4.5 на «Акценте»/«Максимуме» в светлом; L .55 — все 21 шаг проходят.
        g: [whiteSafe(0.55, c * 0.9 + 0.02, h), oklchToHex(0.45, c + 0.02, h), oklchToHex(0.56, c * 0.8 + 0.02, h2), oklchToHex(0.43, c + 0.02, h)],
        deg: 112,
        p: [oklchToHex(0.46, c + 0.02, h), oklchToHex(0.6, c * 0.8 + 0.02, h2), oklchToHex(0.5, c + 0.02, h)]
      },
      nature: { g: [a, a2], deg: 115, p: [a2, a] },
      night: { g: [aHi, aLo], deg: 180, p: [aLo, aHi] }
    }[fam];
    const dir = direction(byFam.deg);
    return Object.freeze({
      level,
      appearance: "light",
      isLight: true,
      accent: a,
      accentInk: "#FFFFFF",
      accentText: aText,
      accentBright: a,
      accentSoft: oklchA(0.94, c * 0.4 + 6e-3, h, 0.97),
      accentBorder: a,
      accentCap: oklchA(0.55, c, h, 0.16),
      accentTile: max ? oklchA(0.9, c * 0.55, h, 0.97) : oklchA(0.94, c * 0.3 + 5e-3, h, 0.97),
      accentGlow: oklchA(0.45, c, h, 0.4),
      accentGradient: Object.freeze(byFam.g),
      accentGradientStart: dir.start,
      accentGradientEnd: dir.end,
      progressGradient: Object.freeze(byFam.p),
      overline: aText,
      bgGlow: Object.freeze(max ? [oklchA(0.86, c * 0.8, h, 0.7), oklchA(0.88, c * 0.7, h2, 0.6), oklchA(0.92, c * 0.45, h, 0.5)] : [CLEAR, CLEAR, CLEAR]),
      cardSmoke: Object.freeze(max ? [oklchA(0.84, c * 0.9, h, 0.5), oklchA(0.86, c * 0.75, h2, 0.36)] : [CLEAR, CLEAR]),
      shadowTint
    });
  }
  function buildLiquidGlassVariant(id, calmDark, variant) {
    const tune = parseThemeTuneId(id);
    const vivid = tune ? themeTuneVivid(tune) : LIQUID_GLASS_VIVID[id] ?? LIQUID_GLASS_VIVID.graphite;
    if (variant.appearance === "light") {
      const base2 = lightBase(vivid, variant.level);
      return Object.freeze({ ...base2, ...lightRoles(vivid, base2, variant.level) });
    }
    if (variant.level === "calm") return Object.freeze({ ...calmDark, ...calmDarkRoles(calmDark) });
    const base = variant.level === "max" ? darkMaxBase(vivid, calmDark) : calmDark;
    return Object.freeze({ ...base, ...darkVividRoles(vivid, base, variant.level) });
  }

  // constants/liquidGlassThemeIntensity.ts
  var LIQUID_GLASS_LEVEL_INTENSITY = Object.freeze({
    calm: 0,
    accent: 0.5,
    max: 1
  });
  var LIQUID_GLASS_INTENSITY_STEP = 0.05;
  var LIQUID_GLASS_INTENSITY_DETENTS = Object.freeze([0, 0.25, 0.5, 0.75, 1]);
  var MAX_BUCKET_FROM = 0.75;
  function clampLiquidGlassIntensity(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
  }
  function quantizeLiquidGlassIntensity(value) {
    const steps = Math.round(clampLiquidGlassIntensity(value) / LIQUID_GLASS_INTENSITY_STEP);
    return Math.round(steps * LIQUID_GLASS_INTENSITY_STEP * 100) / 100;
  }
  function liquidGlassLevelForIntensity(value) {
    const q = quantizeLiquidGlassIntensity(value);
    if (q === 0) return "calm";
    return q >= MAX_BUCKET_FROM ? "max" : "accent";
  }
  function intensityForLiquidGlassLevel(level) {
    return LIQUID_GLASS_LEVEL_INTENSITY[level];
  }
  function parseColor(value) {
    const s = value.trim();
    if (s.startsWith("#")) {
      const hex3 = s.slice(1);
      if (hex3.length === 3) {
        return { r: parseInt(hex3[0] + hex3[0], 16), g: parseInt(hex3[1] + hex3[1], 16), b: parseInt(hex3[2] + hex3[2], 16), a: 1, hasAlpha: false };
      }
      if (hex3.length === 6 || hex3.length === 8) {
        return {
          r: parseInt(hex3.slice(0, 2), 16),
          g: parseInt(hex3.slice(2, 4), 16),
          b: parseInt(hex3.slice(4, 6), 16),
          a: hex3.length === 8 ? parseInt(hex3.slice(6, 8), 16) / 255 : 1,
          hasAlpha: hex3.length === 8
        };
      }
      return null;
    }
    const m = /^rgba?\(([^)]+)\)$/i.exec(s);
    if (!m) return null;
    const parts = m[1].split(",").map((p) => Number(p.trim()));
    if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1, hasAlpha: true };
  }
  var hex22 = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0").toUpperCase();
  function mixLiquidGlassColor(from, to, t) {
    if (t <= 0) return from;
    if (t >= 1) return to;
    const a = parseColor(from);
    const b = parseColor(to);
    if (!a || !b) return t < 0.5 ? from : to;
    const alpha2 = a.a + (b.a - a.a) * t;
    const ch = (x, y) => alpha2 <= 0 ? x + (y - x) * t : (x * a.a * (1 - t) + y * b.a * t) / alpha2;
    const rgb2 = `#${hex22(ch(a.r, b.r))}${hex22(ch(a.g, b.g))}${hex22(ch(a.b, b.b))}`;
    return a.hasAlpha || b.hasAlpha ? `${rgb2}${hex22(alpha2 * 255)}` : rgb2;
  }
  function sampleGradient(stops, at) {
    if (stops.length === 1) return stops[0];
    const pos = at * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(pos));
    return mixLiquidGlassColor(stops[i], stops[i + 1], pos - i);
  }
  function mixGradient(from, to, t) {
    const n = Math.max(from.length, to.length);
    const out = [];
    for (let i = 0; i < n; i += 1) {
      const at = n === 1 ? 0 : i / (n - 1);
      out.push(mixLiquidGlassColor(sampleGradient(from, at), sampleGradient(to, at), t));
    }
    return Object.freeze(out);
  }
  var isPoint = (v) => typeof v === "object" && v !== null && !Array.isArray(v) && typeof v.x === "number" && typeof v.y === "number";
  function blendLiquidGlassTokens(from, to, t) {
    const out = {};
    for (const key of Object.keys(to)) {
      const a = from[key];
      const b = to[key];
      if (typeof a === "string" && typeof b === "string") out[key] = mixLiquidGlassColor(a, b, t);
      else if (Array.isArray(a) && Array.isArray(b)) out[key] = mixGradient(a, b, t);
      else if (isPoint(a) && isPoint(b)) {
        const r = (n) => Math.round(n * 1e3) / 1e3;
        out[key] = Object.freeze({ x: r(a.x + (b.x - a.x) * t), y: r(a.y + (b.y - a.y) * t) });
      } else out[key] = b;
    }
    return out;
  }
  function buildLiquidGlassIntensityTokens(id, calmDark, appearance, intensity) {
    const q = quantizeLiquidGlassIntensity(intensity);
    const at = (level2) => buildLiquidGlassVariant(id, calmDark, { level: level2, appearance });
    if (q === 0) return at("calm");
    if (q === 0.5) return at("accent");
    if (q === 1) return at("max");
    const [from, to, t] = q < 0.5 ? [at("calm"), at("accent"), q / 0.5] : [at("accent"), at("max"), (q - 0.5) / 0.5];
    const level = liquidGlassLevelForIntensity(q);
    return Object.freeze({ ...blendLiquidGlassTokens(from, to, t), level });
  }

  // constants/liquidGlassGradientThemes.ts
  var LIQUID_GLASS_GRADIENT_THEMES = [
    { id: "grad_aurora", glowA: "#38E0AA", glowB: "#7C5CFF", accent: "#7EF0C8", onAccent: "#04261D" },
    { id: "grad_iris", glowA: "#788CFF", glowB: "#FF78C8", accent: "#C7C9FF", onAccent: "#1B1C4A" },
    { id: "grad_magma", glowA: "#FF5A28", glowB: "#FFAA3C", accent: "#FFB27A", onAccent: "#3A1204" },
    { id: "grad_midnight", glowA: "#286EFF", glowB: "#00D2FF", accent: "#8CC4FF", onAccent: "#06224D" },
    { id: "grad_champagne", glowA: "#F0BE78", glowB: "#E68296", accent: "#F3D39A", onAccent: "#3A2608" },
    { id: "grad_jade", glowA: "#14BEA0", glowB: "#1E78C8", accent: "#7FE6D2", onAccent: "#032A24" },
    { id: "grad_orchid", glowA: "#D246FF", glowB: "#FF3C8C", accent: "#EAA6FF", onAccent: "#3A0A4A" },
    { id: "grad_ice", glowA: "#96DCFF", glowB: "#78A0FF", accent: "#BFE6FF", onAccent: "#0A2A44" },
    { id: "grad_coral", glowA: "#FF645A", glowB: "#FFA046", accent: "#FFB0A0", onAccent: "#4A0F0A" },
    { id: "grad_lilac", glowA: "#A78BFA", glowB: "#60A5FA", accent: "#D4C8FF", onAccent: "#24164A" },
    // Премиальные темы достижений. Цвет работает на всём экране через те же
    // семантические токены; уникальный арт Главной приезжает отдельным remote pack.
    { id: "grad_full_olive", glowA: "#778624", glowB: "#151E10", accent: "#C9D880", onAccent: "#10151B" },
    { id: "grad_full_ref_signal_lime", glowA: "#101406", glowB: "#020406", accent: "#C2FF46", onAccent: "#081017" },
    { id: "grad_full_ref_storm_violet", glowA: "#110C14", glowB: "#020406", accent: "#D697FF", onAccent: "#081017" },
    { id: "grad_full_titanium", glowA: "#34383D", glowB: "#0A0C0F", accent: "#FF665B", onAccent: "#10151B" },
    { id: "grad_full_horizon", glowA: "#12385A", glowB: "#060E1A", accent: "#FFBB78", onAccent: "#10151B" },
    { id: "grad_full_ref_gravity_blue", glowA: "#0B1214", glowB: "#020406", accent: "#86DFFF", onAccent: "#081017" }
  ];
  var LIQUID_GLASS_GRADIENT_THEME_IDS = Object.freeze(
    LIQUID_GLASS_GRADIENT_THEMES.map((t) => t.id)
  );
  var BY_ID = new Map(LIQUID_GLASS_GRADIENT_THEMES.map((t) => [t.id, t]));
  function liquidGlassGradientTheme(id) {
    return typeof id === "string" ? BY_ID.get(id) ?? null : null;
  }
  var CLEAR2 = "#00000000";
  var MOCK_CARD = "#18181BB8";
  var MOCK_EDGE = "#FFFFFF17";
  var MOCK_TILE = "#2A2A2C";
  var MOCK_CTA = "#F2F1F6";
  var LIGHT_BASE = "#F6F6F8";
  var LIGHT_INK = "#1C1C1F";
  function channel(v) {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }
  function luminance2(hex3) {
    const n = (i) => channel(parseInt(hex3.slice(i, i + 2), 16));
    return 0.2126 * n(1) + 0.7152 * n(3) + 0.0722 * n(5);
  }
  function liquidGlassContrast(a, b) {
    const [hi, lo] = [luminance2(a), luminance2(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }
  function liquidGlassButtonInk(bg, themeDark) {
    if (liquidGlassContrast("#FFFFFF", bg) >= 4.5) return "#FFFFFF";
    if (liquidGlassContrast(themeDark, bg) >= 4.5) return themeDark;
    return "#000000";
  }
  var pickInk = liquidGlassButtonInk;
  function buildLiquidGlassGradientLightTokens(def, intensity) {
    const k = quantizeLiquidGlassIntensity(intensity);
    const deepA = mixLiquidGlassColor("#000000", def.glowA, 0.52);
    const deepText = mixLiquidGlassColor("#000000", def.glowA, 0.42);
    const bgTop = mixLiquidGlassColor(LIGHT_BASE, def.glowA, 0.22 * k);
    const bgBottom = mixLiquidGlassColor(LIGHT_BASE, def.glowB, 0.2 * k);
    const cta = mixLiquidGlassColor(LIGHT_INK, def.accent, k);
    const ink = pickInk(cta, def.onAccent);
    const fill = mixLiquidGlassColor(LIGHT_INK, deepA, k);
    const tile = mixLiquidGlassColor("#F0F0F3", def.accent, 0.4 * k);
    const text = "#111114";
    const dir = { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };
    return Object.freeze({
      bg: bgBottom,
      bgTop,
      bgBottom,
      opaqueCard: "#FFFFFF",
      opaqueSheet: "#FFFFFF",
      opaqueControl: "#ECECEF",
      card: "#FFFFFF",
      sheet: "#FFFFFF",
      glassEdge: "#00000000",
      lightTint: alpha(text, 0.92),
      cta,
      ctaInk: ink,
      text,
      secondary: "#5C5C63",
      mutedText: "#6E6E75",
      line: "#00000014",
      selected: mixLiquidGlassColor("#0000000D", alpha(def.accent, 0.3), k),
      level: liquidGlassLevelForIntensity(k),
      appearance: "light",
      isLight: true,
      accent: cta,
      accentInk: ink,
      // зачем: ссылки/огонь на светлом фоне — глубокий тон, чтобы держать контраст ≥ 4.5.
      accentText: mixLiquidGlassColor("#3A3A40", deepText, k),
      accentBright: mixLiquidGlassColor("#3A3A40", deepText, k),
      accentSoft: mixLiquidGlassColor("#0000000D", alpha(def.accent, 0.3), k),
      accentBorder: fill,
      accentCap: mixLiquidGlassColor("#0000001A", alpha(deepA, 0.18), k),
      accentTile: tile,
      accentGlow: mixLiquidGlassColor(CLEAR2, alpha(def.accent, 0.4), k),
      accentGradient: Object.freeze([cta, cta]),
      accentGradientStart: dir.start,
      accentGradientEnd: dir.end,
      progressGradient: Object.freeze([fill, fill]),
      overline: "#5C5C63",
      // В «Пастели» пятен нет — цвет даёт сама заливка фона.
      bgGlow: Object.freeze([CLEAR2, CLEAR2, CLEAR2]),
      cardSmoke: Object.freeze([CLEAR2, CLEAR2]),
      shadowTint: "#00000038"
    });
  }
  function buildLiquidGlassGradientTokens(def, graphite, intensity) {
    const k = quantizeLiquidGlassIntensity(intensity);
    const mix2 = (base, share) => mixLiquidGlassColor(base, def.accent, share);
    const cta = mix2(MOCK_CTA, k);
    const fill = mix2("#FFFFFF", k);
    const glowOpacity = 0.08 + 0.62 * k;
    const dir = { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };
    return Object.freeze({
      ...graphite,
      card: mix2(MOCK_CARD, k * 0.1),
      opaqueCard: mix2(graphite.opaqueCard, k * 0.1),
      opaqueSheet: mix2(graphite.opaqueSheet, k * 0.1),
      opaqueControl: mix2(graphite.opaqueControl, k * 0.1),
      glassEdge: mix2(MOCK_EDGE, k * 0.3),
      cta,
      ctaInk: def.onAccent,
      selected: mixLiquidGlassColor(graphite.selected, alpha(def.accent, 0.19), k),
      level: liquidGlassLevelForIntensity(k),
      appearance: "dark",
      isLight: false,
      accent: cta,
      accentInk: def.onAccent,
      accentText: mix2(graphite.cta, k),
      accentBright: mix2(graphite.cta, k),
      accentSoft: mixLiquidGlassColor(graphite.selected, alpha(def.accent, 0.24), k),
      accentBorder: mix2(graphite.cta, k),
      accentCap: cta,
      accentTile: mix2(MOCK_TILE, k * 0.16),
      accentGlow: mixLiquidGlassColor(CLEAR2, alpha(def.accent, 0.55), k),
      accentGradient: Object.freeze([cta, cta]),
      accentGradientStart: dir.start,
      accentGradientEnd: dir.end,
      progressGradient: Object.freeze([fill, fill]),
      overline: graphite.secondary,
      // Пятна фона рисует V2Backdrop (один статичный SVG-слой) — порядок как в макете: A, B, A.
      bgGlow: Object.freeze([alpha(def.glowA, glowOpacity), alpha(def.glowB, glowOpacity), alpha(def.glowA, glowOpacity)]),
      cardSmoke: Object.freeze([CLEAR2, CLEAR2]),
      shadowTint: "#000000"
    });
  }

  // constants/premiumThemeVisualSpecs.ts
  var SPECS = Object.freeze([
    { id: "grad_full_olive", packId: "olive", dark: ["#10170d", "#424c28", "#333d20", "#586035"], light: ["#e6ead5", "#f5f5de", "#e7edc9", "#c9d3a5"], accent: "#dbe591", ink: "#34410d", edge: "#bac573", sceneTop: "#778624", sceneBottom: "#151e10" },
    { id: "grad_full_ref_signal_lime", packId: "lime", dark: ["#040709", "#1c2613", "#0d120c", "#212c15"], light: ["#f9ffed", "#fdfff9", "#f8ffe9", "#f4ffde"], accent: "#c2ff46", ink: "#445919", edge: "#c2ff46", sceneTop: "#101406", sceneBottom: "#020406" },
    { id: "grad_full_ref_storm_violet", packId: "amethyst", dark: ["#040709", "#1e1929", "#0e0c15", "#241e2f"], light: ["#fbf5ff", "#fefcff", "#faf3ff", "#f8ecff"], accent: "#d697ff", ink: "#4b3559", edge: "#d697ff", sceneTop: "#110c14", sceneBottom: "#020406" },
    { id: "grad_full_titanium", packId: "titanium", dark: ["#121416", "#3c4248", "#292f34", "#4b5055"], light: ["#e0e3e5", "#f6f7f8", "#dce1e4", "#bfc7ce"], accent: "#ff8c80", ink: "#a92d26", edge: "#c9d1d8", sceneTop: "#34383d", sceneBottom: "#0a0c0f" },
    { id: "grad_full_horizon", packId: "horizon", dark: ["#091723", "#2b4659", "#203344", "#395b6c"], light: ["#dde8ef", "#f2f8ff", "#d8e7f2", "#b4cbd8"], accent: "#ffd09a", ink: "#805022", edge: "#8dafc4", sceneTop: "#12385a", sceneBottom: "#060e1a" },
    { id: "grad_full_ref_gravity_blue", packId: "singularity", dark: ["#040709", "#142229", "#0a1015", "#19282f"], light: ["#f3fcff", "#fbfeff", "#f0fbff", "#e9f9ff"], accent: "#86dfff", ink: "#2f4e59", edge: "#86dfff", sceneTop: "#0b1214", sceneBottom: "#020406" }
  ]);
  var BY_ID2 = new Map(SPECS.map((spec) => [spec.id, spec]));
  function premiumThemeVisualSpec(id) {
    return typeof id === "string" ? BY_ID2.get(id) ?? null : null;
  }
  function channel2(hex3, offset) {
    return Number.parseInt(hex3.slice(offset, offset + 2), 16);
  }
  function mixPremiumHex(from, to, amount) {
    const blend = (offset) => Math.round(channel2(from, offset) * (1 - amount) + channel2(to, offset) * amount).toString(16).padStart(2, "0");
    return `#${blend(1)}${blend(3)}${blend(5)}`;
  }
  function linear(value) {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }
  function luminance3(hex3) {
    return 0.2126 * linear(channel2(hex3, 1)) + 0.7152 * linear(channel2(hex3, 3)) + 0.0722 * linear(channel2(hex3, 5));
  }
  function contrast(a, b) {
    const [hi, lo] = [luminance3(a), luminance3(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }
  function premiumSceneTop(spec) {
    let top = spec.sceneTop;
    while (contrast("#ffffff", top) < 5) top = mixPremiumHex(top, "#000000", 0.04);
    return top;
  }
  function premiumThemeTokenOverrides(id, appearance) {
    const spec = premiumThemeVisualSpec(id);
    if (!spec) return null;
    const dark = appearance === "dark";
    const [bg, from, to, dock] = dark ? spec.dark : spec.light;
    const ink = dark ? "#fff9f6" : "#181a20";
    const muted = dark ? "#dacfd0" : "#55505b";
    const accent = dark ? spec.accent : spec.ink;
    const cta = mixPremiumHex(spec.accent, "#ffffff", 0.82);
    return Object.freeze({
      bg,
      bgTop: bg,
      bgBottom: bg,
      opaqueCard: to,
      opaqueSheet: to,
      opaqueControl: from,
      card: to,
      sheet: to,
      text: ink,
      secondary: muted,
      mutedText: muted,
      accent,
      accentBright: accent,
      accentText: accent,
      accentTextSafe: accent,
      accentGraphic: accent,
      cta,
      ctaInk: spec.ink,
      ctaFill: cta,
      ctaText: spec.ink,
      ctaFillFrom: cta,
      ctaFillTo: cta,
      plateFillFrom: from,
      plateFillTo: to,
      sheetPlateFillFrom: from,
      sheetPlateFillTo: to,
      raisedFillFrom: from,
      raisedFillTo: to,
      deepBase: to,
      deepBaseAlt: bg,
      premiumDock: dock,
      premiumDockInk: ink,
      premiumEdge: spec.edge
    });
  }
  var PREMIUM_MOTION_PIGMENTS = Object.freeze({
    grad_full_olive: Object.freeze({ sheen: "#d3cd6a44", rimLight: "#ebe9ab66", rimShade: "#bec86030" }),
    grad_full_titanium: Object.freeze({ glare: "#c8d0d533", edgeLight: "#eff3f577", edgeShade: "#b8c9d530", ember: "#ff322966", emberRim: "#ff857166" }),
    grad_full_horizon: Object.freeze({ planet: "#050e19", dawnRim: "#ffd09e", dawnGlow: "#ffb75c55", skyGlow: "#52b8e952", skyHaze: "#4fa6e12c", outerRim: "#9dd7f955" }),
    /** Фон холста под WebGL (alpha:false) — виден только до первого кадра шейдера. */
    canvasBackdrop: "#020406"
  });

  // constants/theme_sliders_flag.ts
  var BASE_FLAG = true;
  var IS_STORE = false;
  var IS_DEV_BUILD = false;
  var DEV_FORCE_ON = IS_DEV_BUILD && !IS_STORE && false;
  var THEME_SLIDERS_V1_ENABLED = BASE_FLAG || DEV_FORCE_ON;
  var THEME_SLIDERS_V1_SOURCE = DEV_FORCE_ON ? "dev" : "const";
  if (IS_DEV_BUILD) {
    console.log("[THEME-SLIDERS]", JSON.stringify({ flag: THEME_SLIDERS_V1_ENABLED, source: THEME_SLIDERS_V1_SOURCE, store: IS_STORE }));
  }

  // constants/liquidGlassThemePalette.ts
  var LIQUID_GLASS_TINT_THEME_IDS = [
    "graphite",
    "polar",
    "slate",
    "ink",
    "lavender",
    "iris",
    "rose",
    "terracotta",
    "taupe",
    "olive",
    "sage",
    "eucalyptus",
    "marine"
  ];
  var LIQUID_GLASS_THEME_IDS = Object.freeze([
    ...LIQUID_GLASS_TINT_THEME_IDS,
    ...LIQUID_GLASS_GRADIENT_THEME_IDS
  ]);
  var HUES = {
    polar: 225,
    slate: 245,
    ink: 275,
    lavender: 300,
    iris: 320,
    rose: 350,
    terracotta: 40,
    taupe: 65,
    olive: 110,
    sage: 150,
    eucalyptus: 180,
    marine: 205
  };
  function normalizeVariant(requested) {
    const level = resolveLiquidGlassColorLevel(requested.level);
    const raw = typeof requested.intensity === "number" && Number.isFinite(requested.intensity) ? requested.intensity : intensityForLiquidGlassLevel(level);
    const intensity = quantizeLiquidGlassIntensity(raw);
    return { level: liquidGlassLevelForIntensity(intensity), appearance: resolveLiquidGlassAppearance(requested.appearance), intensity };
  }
  var GRAPHITE = Object.freeze({
    bg: "#0C0D10",
    bgTop: "#181A1F",
    bgBottom: "#16181D",
    // зачем (гейт «приложение = макет», паритет Learn 05.10): карточка «Затмения» = `--card #151517`
    // kit.css (макеты 2.0: learn.html, хаб «Карточки» и др.); было #222429 — светлее макета.
    // Плашки/контролы/шторки (#222429) не тронуты — их сверка отдельно.
    opaqueCard: "#151517",
    opaqueSheet: "#222429",
    opaqueControl: "#222429",
    // зачем (сверка packs-simple-001, 05.10): стекло карточки = `--card #151517` макета на 0.9 альфы — как стекло кита 2.0
    // (adaptV2PaletteToGlass) и правило «стекло непрозрачное ≥ 0.9»; было #1D1E21 на 38 % — строки каталога темнее макета.
    card: "#151517E6",
    sheet: "#16171ABD",
    glassEdge: "#FFFFFF24",
    lightTint: "#F4F5F8EB",
    cta: "#F2F1F6",
    ctaInk: "#0B0C0E",
    text: "#FFFFFF",
    secondary: "#B8B9BD",
    mutedText: "#B8B9BD",
    line: "#FFFFFF17",
    selected: "#B4BCCF30"
  });
  function tintedTokens(hue) {
    const dark = (lightness, chroma2 = 0.018) => oklchToHex(lightness, chroma2, hue);
    const light = (lightness, chroma2 = 0.018) => oklchToHex(lightness, chroma2, hue);
    const tint = light(0.78, 0.026);
    return Object.freeze({
      bg: dark(0.105, 0.014),
      bgTop: dark(0.155, 0.018),
      bgBottom: dark(0.14, 0.018),
      opaqueCard: dark(0.15, 0.018),
      opaqueSheet: dark(0.18, 0.02),
      opaqueControl: dark(0.24, 0.022),
      // зачем (владелец 05.10 «решения — рекомендуемые»; правило «стекло 2.0 непрозрачное ≥ 0.9»): стекло карточки =
      // opaqueCard темы на 0.9 — как «Затмение» (bf4f4996d) и кит V2; было 46 % — фон просвечивал, карточки темнее макета.
      card: alpha(dark(0.15, 0.018), 0.9),
      sheet: alpha(dark(0.17, 0.02), 0.74),
      glassEdge: alpha(light(0.9, 0.02), 0.12),
      lightTint: alpha(light(0.94, 0.024), 0.92),
      cta: light(0.92, 0.028),
      ctaInk: dark(0.12, 0.018),
      text: light(0.985, 6e-3),
      secondary: light(0.82, 0.016),
      mutedText: light(0.78, 0.016),
      line: alpha(light(0.92, 0.018), 0.1),
      selected: alpha(tint, 0.2)
    });
  }
  var TOKEN_REGISTRY = Object.freeze({
    graphite: GRAPHITE,
    ...Object.fromEntries(Object.entries(HUES).map(([id, hue]) => [id, tintedTokens(hue)]))
  });
  var activeVariant = normalizeVariant(DEFAULT_LIQUID_GLASS_VARIANT);
  var VARIANT_CACHE_LIMIT = 160;
  var variantCache = /* @__PURE__ */ new Map();
  var PREMIUM_PIGMENT_KEYS = [
    "bg",
    "bgTop",
    "bgBottom",
    "opaqueCard",
    "opaqueSheet",
    "opaqueControl",
    "card",
    "sheet",
    "plateFillFrom",
    "plateFillTo",
    "sheetPlateFillFrom",
    "sheetPlateFillTo",
    "raisedFillFrom",
    "raisedFillTo",
    "deepBase",
    "deepBaseAlt",
    "premiumDock",
    "premiumDockInk",
    "premiumEdge",
    "text"
  ];
  function pickPremiumPigments(overrides) {
    if (!overrides) return {};
    const out = {};
    for (const key of PREMIUM_PIGMENT_KEYS) if (overrides[key] !== void 0) out[key] = overrides[key];
    return out;
  }
  function premiumLegibleRoles(overrides, built, roles) {
    if (!overrides) return {};
    const card = overrides.opaqueCard ?? built.opaqueCard;
    const control = overrides.opaqueControl ?? built.opaqueControl;
    const text = overrides.text ?? built.text;
    const on = (soft) => [card, control, flattenOver(soft, card), flattenOver(soft, control)];
    const accent = overrides.accent ?? built.accent;
    const darkInk = "#000000";
    const lightInk = "#FFFFFF";
    const pickInk2 = (fills) => {
      const candidates = [text, built.accentInk, lightInk, darkInk];
      const worst = (c) => Math.min(...fills.map((f) => contrastHex(c, f)));
      return candidates.reduce((best, c) => worst(c) > worst(best) ? c : best, candidates[0]);
    };
    const good = legibleOn(roles.good, text, on(roles.goodSoft), 4.55);
    const bad = legibleOn(roles.bad, text, on(roles.badSoft), 4.55);
    const cta = overrides.cta ?? overrides.ctaFill ?? accent;
    const inkCandidates = [overrides.ctaInk, overrides.bg, text].filter((c) => typeof c === "string" && /^#[0-9a-f]{6}/i.test(c));
    const onSemantic = (c) => Math.min(Math.max(contrastHex(c, good), contrastHex(lightInk, good)), Math.max(contrastHex(c, bad), contrastHex(lightInk, bad)));
    const score = (c) => Math.min(contrastHex(c, cta) / 4.5, onSemantic(c) / 4.5);
    const ctaInk = inkCandidates.reduce((best, c) => score(c) > score(best) ? c : best, inkCandidates[0]);
    const inkFills = [accent, ...built.accentGradient ?? []].filter((c) => /^#[0-9a-f]{6}/i.test(c)).map((c) => c.slice(0, 7));
    const a2 = (hex3, alpha2) => `${hex3.slice(0, 7)}${Math.round(Math.max(0, Math.min(1, alpha2)) * 255).toString(16).padStart(2, "0")}`;
    const bgSolid = (overrides.bg ?? built.bg ?? card).slice(0, 7);
    const glass = flattenOver(a2(control, 0.9), bgSolid);
    const cap = overrides.accentCap ?? built.accentCap;
    const capAlpha = cap && cap.length === 9 ? Number.parseInt(cap.slice(7, 9), 16) / 255 : 1;
    const pill = cap ? flattenOver(a2(cap, 0.32 * capAlpha), glass) : glass;
    const brightRaw = overrides.accentBright ?? built.accentBright;
    const accentBright = brightRaw ? legibleOn(brightRaw, text, [pill, glass], 3.2) : void 0;
    return { good, bad, accentInk: pickInk2(inkFills), ctaInk, ...accentBright ? { accentBright } : {} };
  }
  var contrastHex = (a, b) => {
    const l = (h) => {
      const n = Number.parseInt(h.slice(1, 7), 16);
      const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => {
        const x = v / 255;
        return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const la = l(a);
    const lb = l(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  function liquidGlassTokens(id, requested = activeVariant) {
    const variant = requested && typeof requested === "object" ? normalizeVariant(requested) : activeVariant;
    const themeId = resolveLiquidGlassTheme(id);
    const key = `${themeId}|${variant.intensity}|${variant.appearance}`;
    const cached = variantCache.get(key);
    if (cached) {
      variantCache.delete(key);
      variantCache.set(key, cached);
      return cached;
    }
    const rawBuilt = buildThemeTokens(themeId, variant);
    const premiumOverrides = premiumThemeTokenOverrides(themeId, variant.appearance);
    const premiumAccent = premiumOverrides?.accent;
    const built = premiumOverrides ? { ...rawBuilt, ...premiumOverrides, ...premiumAccent ? { accentGradient: Object.freeze([premiumAccent, premiumAccent]) } : {} } : rawBuilt;
    const surfaceRoles = deriveLiquidGlassSurfaceRoles(built);
    const selectedOver = [built.opaqueCard, built.opaqueSheet, built.bg].map((under) => flattenOver(built.selected, under));
    const mutedText = legibleOn(built.mutedText, built.text, built.isLight ? [
      built.bg,
      built.bgTop,
      built.bgBottom,
      built.opaqueCard,
      built.opaqueControl,
      built.opaqueSheet,
      surfaceRoles.plateFillFrom,
      surfaceRoles.plateFillTo,
      surfaceRoles.raisedFillFrom,
      surfaceRoles.raisedFillTo,
      ...selectedOver
    ] : selectedOver, 4.55);
    const secondary = legibleOn(built.secondary, built.text, selectedOver, 4.55);
    const accentOnTint = [built.opaqueCard, built.opaqueSheet, built.bg].map((under) => flattenOver(built.accentSoft, under));
    const plateTint = flattenOver(`${built.accent.slice(0, 7)}1F`, built.opaqueCard);
    const accentText = legibleOn(built.accentText, built.text, [...accentOnTint, flattenOver(built.accentSoft, plateTint)], 4.55);
    const earlyButtonFill = deriveLiquidGlassButtonRoles({ ...built, bad: deriveLiquidGlassPaletteRoles({ ...built, intensity: variant.intensity }).bad }).buttonFill;
    const accentGraphicRaw = legibleOn(built.accent, built.text, [
      built.bg,
      built.bgTop,
      built.bgBottom,
      built.opaqueCard,
      built.opaqueControl,
      built.opaqueSheet,
      earlyButtonFill
    ], 3.2);
    const accentGraphic = accentGraphicRaw.toLowerCase() === built.accent.toLowerCase() ? built.accent : accentGraphicRaw;
    const paletteRoles = deriveLiquidGlassPaletteRoles({ ...built, intensity: variant.intensity });
    const tokens = Object.freeze({
      ...built,
      secondary,
      accentText,
      accentGraphic,
      accentTextSafe: built.isLight ? accentText : built.accent,
      mutedText,
      ...surfaceRoles,
      // зачем (владелец 13.10, №35): роли кнопок — вторичная/отключённая/главная заливки, не сливающиеся с фоном ни в одной теме (constants/liquidGlassButtonTokens.ts)
      ...deriveLiquidGlassButtonRoles({ ...built, bad: paletteRoles.bad }),
      // зачем (релизный пол 10.10): good/bad/warn/info, скрим, плитки, достижения, медали, уровни A1–B2 — токены всех тем.
      ...paletteRoles,
      // Последним слоем: derivation общего дизайн-системного набора не должна
      // сдвинуть ни один утверждённый пигмент премиальной коллекции.
      // зачем (4 · ТЕМЫ 24.10, слово владельца «Пусть чинит 4 · Темы»): последним слоем закрепляются только ПИГМЕНТЫ поверхностей премиум-темы.
      // Производные роли (вторичный текст, акцент-текст/графика, главная кнопка) уже посчитаны от этих же пигментов общими legibleOn/deriveButtonRoles;
      // прежний полный спред перетирал их сырыми значениями, и в светлом оформлении кнопка пейвола сливалась с листом (1,01–1,15).
      ...pickPremiumPigments(premiumOverrides),
      ...premiumLegibleRoles(premiumOverrides, built, paletteRoles),
      intensity: variant.intensity
    });
    variantCache.set(key, tokens);
    if (variantCache.size > VARIANT_CACHE_LIMIT) {
      const oldest = variantCache.keys().next().value;
      if (oldest !== void 0) variantCache.delete(oldest);
    }
    return tokens;
  }
  function isTintTheme(id) {
    return Object.prototype.hasOwnProperty.call(TOKEN_REGISTRY, id);
  }
  function buildThemeTokens(themeId, variant) {
    const tune = parseThemeTuneId(themeId);
    if (tune) return buildLiquidGlassIntensityTokens(themeId, tunedBaseTokens(tune), variant.appearance, variant.intensity);
    const gradient = liquidGlassGradientTheme(themeId);
    if (gradient && variant.appearance === "light") {
      return buildLiquidGlassGradientLightTokens(gradient, variant.intensity);
    }
    if (gradient) {
      const graphiteDark = buildLiquidGlassIntensityTokens("graphite", TOKEN_REGISTRY.graphite, "dark", 0);
      return buildLiquidGlassGradientTokens(gradient, graphiteDark, variant.intensity);
    }
    const tintId = isTintTheme(themeId) ? themeId : "graphite";
    return buildLiquidGlassIntensityTokens(tintId, TOKEN_REGISTRY[tintId], variant.appearance, variant.intensity);
  }
  function resolveLiquidGlassTheme(id, _hasPlus) {
    if (THEME_SLIDERS_V1_ENABLED && parseThemeTuneId(id)) return id;
    return typeof id === "string" && LIQUID_GLASS_THEME_IDS.includes(id) ? id : "graphite";
  }

  // components/scene/scene_palette.ts
  var SCENE_DP = 2.625;
  var SCENE_APPROVED_VERSION = "2026-10-29";
  var norm = (h) => (h % 360 + 360) % 360;
  var clamp2 = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  var hx = (h) => {
    const s = String(h).replace("#", "");
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  };
  var hex = (c) => `#${c.map((v) => Math.round(clamp2(v, 0, 255)).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  var toLin = (v) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  var toSrgb = (v) => 255 * (v <= 31308e-7 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  var oklchOf = (c) => {
    const [r, g, b] = c.map(toLin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
  };
  var okLin = (L, C, H) => {
    const a = C * Math.cos(H * Math.PI / 180);
    const b = C * Math.sin(H * Math.PI / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  };
  var inGamut = (c) => c.every((v) => v >= -5e-4 && v <= 1.0005);
  var okRgb = (L, C, H) => {
    let c = C;
    let lin = okLin(L, c, H);
    for (let i = 0; i < 60 && !inGamut(lin); i += 1) {
      c = Math.max(0, c - 4e-3);
      lin = okLin(L, c, H);
    }
    return lin.map((v) => clamp2(toSrgb(clamp2(v, 0, 1)), 0, 255));
  };
  var lumc = (c) => {
    const s = c.map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
  };
  var ratioc = (a, b) => {
    const x = lumc(a);
    const y = lumc(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  var whiteOn = (c) => 1.05 / (lumc(c) + 0.05);
  var col = (c) => ({ rgb: c.map((v) => Math.round(v)), hex: hex(c) });
  var rng = (seed) => {
    let s = seed >>> 0 || 1;
    return () => {
      s ^= s << 13;
      s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      return s / 4294967296;
    };
  };
  function paletteA(t, appearance) {
    const dark = appearance === "dark";
    const [, C, H] = oklchOf(hx(t.accent));
    const Ct = clamp2(C * 1.6, 0.07, 0.17);
    const Cb = Ct * 0.7;
    const Lt0 = dark ? 0.5 : 0.52;
    let Lt = Lt0;
    let top = okRgb(Lt, Ct, H);
    for (let L = Lt; whiteOn(top) < 4.6 && L > 0.2; L -= 0.01) {
      top = okRgb(L, Ct, H);
      Lt = L;
    }
    const Lb0 = dark ? 0.3 : 0.28;
    let Lb = Lb0;
    let bot = okRgb(Lb, Cb, norm(H - 8));
    const card = hx(t.opaqueCard);
    if (dark) {
      for (let L = Lb; ratioc(bot, card) < 1.34 && L < 0.5; L += 0.01) {
        bot = okRgb(L, Cb, norm(H - 8));
        Lb = L;
      }
    }
    const Cl = Math.max(0.06, Ct * 0.9);
    const lightC = okRgb(0.8, Cl, H);
    const light2C = okRgb(0.62, Cl, norm(H + 18));
    return { H, C, S: Math.round(H), Ct, Cb, Cl, Lt: +Lt.toFixed(2), Lb: +Lb.toFixed(2), top, bot, lightC, light2C, Lh: Math.round(H), Lh2: Math.round(norm(H + 18)), a1: 0.85, a2: 0.55, whiteTop: whiteOn(top), seam: ratioc(bot, card) };
  }
  function painter(spec, W, H) {
    const top = spec.top;
    const bot = spec.bot;
    const s = spec.start;
    const e = spec.end;
    const sx = s[0] * W;
    const sy = s[1] * H;
    const vx = (e[0] - s[0]) * W;
    const vy = (e[1] - s[1]) * H;
    const vv = vx * vx + vy * vy;
    const lights = spec.lights.map((l) => ({ cx: l.cx * W, cy: l.cy * H, rx: l.rx * W, ry: l.ry * H, c: l.color, a: l.a, fade: l.fade || 1 }));
    const scrim = spec.scrim && spec.scrim.a > 0 ? spec.scrim : null;
    return (x, y) => {
      let t = ((x - sx) * vx + (y - sy) * vy) / vv;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      let r = top[0] + (bot[0] - top[0]) * t;
      let g = top[1] + (bot[1] - top[1]) * t;
      let b = top[2] + (bot[2] - top[2]) * t;
      for (const l of lights) {
        const dx = (x - l.cx) / l.rx;
        const dy = (y - l.cy) / l.ry;
        const d = Math.sqrt(dx * dx + dy * dy) / l.fade;
        if (d < 1) {
          const a = l.a * (1 - d);
          r += (l.c[0] - r) * a;
          g += (l.c[1] - g) * a;
          b += (l.c[2] - b) * a;
        }
      }
      if (scrim && y > H - scrim.h) {
        const k = 1 - scrim.a * (y - (H - scrim.h)) / scrim.h;
        r *= k;
        g *= k;
        b *= k;
      }
      return [r, g, b];
    };
  }
  function ensureContrast(spec, W, H) {
    const s = { ...spec, lights: spec.lights.map((l) => ({ ...l })), scrim: spec.scrim ? { ...spec.scrim } : null };
    const minAt = (ys, xs) => {
      const paint = painter(s, W, H);
      let mn = 99;
      for (const fy of ys) for (const fx of xs) {
        const v = whiteOn(paint(Math.round(fx * W), Math.round(fy * H)));
        if (v < mn) mn = v;
      }
      return mn;
    };
    const TX = [0.06, 0.2, 0.35, 0.5, 0.65, 0.8, 0.94];
    const TY = [0.52, 0.6, 0.68, 0.76, 0.84, 0.92];
    let a = s.scrim ? s.scrim.a : 0;
    let steps = 0;
    while (minAt(TY, TX) < 4.6 && a < 0.8 && steps < 16) {
      a += 0.05;
      s.scrim = { a: +a.toFixed(2), h: Math.round(H * 0.52) };
      steps += 1;
    }
    let topSteps = 0;
    while (minAt([0.01, 0.04, 0.07], [0.04, 0.12, 0.84, 0.95]) < 2.8 && topSteps < 12) {
      s.lights.forEach((l) => {
        if (l.cy <= 0.1) l.a = Math.max(0.25, l.a - 0.08);
      });
      s.top = s.top.map((v) => v * 0.95);
      topSteps += 1;
    }
    s.guardSteps = { scrim: steps, top: topSteps };
    return s;
  }
  var OLD_SCRIM = {
    home: (_H, dp) => ({ a: 0.4, h: 300 * dp }),
    peak: (_H, dp) => ({ a: 0.4, h: 300 * dp }),
    dialogs: (H) => ({ a: 0.34, h: H * 0.6 }),
    season: (_H, dp) => ({ a: 0.36, h: 320 * dp })
  };
  var oldScrim = (screen, H, opts) => opts && opts.premium && screen !== "dialogs" && screen !== "season" ? null : (OLD_SCRIM[screen] ?? OLD_SCRIM.home)(H, opts?.dp ?? SCENE_DP);
  var WARM = {
    theme: (H) => H,
    warmer: (H) => {
      const d = (60 - H + 540) % 360 - 180;
      return norm(H + Math.sign(d) * Math.min(35, Math.abs(d)));
    },
    band: (H) => 40 + H % 60 / 60 * 40
  };
  function warmEdge(t, mode) {
    const [, , H] = oklchOf(hx(t.accent));
    const m = mode && WARM[mode] ? mode : "band";
    const hue = WARM[m](H);
    const L = m === "band" ? 0.78 : m === "theme" ? 0.72 : 0.74;
    const C = m === "band" ? 0.14 : m === "theme" ? 0.12 : 0.13;
    const color = okRgb(L, C, hue);
    return { mode: m, hue: Math.round(hue * 10) / 10, cx: 0.92, cy: 1.02, rx: 0.55, ry: 0.42, color, hex: hex(color), a: 0.5, fade: 0.85, oklch: [L, C, Math.round(hue)] };
  }
  function lightA(t, screen, W, H, opts) {
    const p = paletteA(t, "light");
    const old = oldScrim(screen, H, opts);
    const raw = {
      top: p.top,
      bot: p.bot,
      start: [0.22, 0],
      end: [0.78, 1],
      lights: [
        { cx: 0.18, cy: 0, rx: 0.7, ry: 0.5, color: p.lightC, a: p.a1, fade: 0.7 },
        { cx: 0.86, cy: 1.02, rx: 0.8, ry: 0.42, color: p.light2C, a: p.a2, fade: 0.7 }
      ],
      scrim: old
    };
    const ev = opts && opts.evening ? warmEdge(t, opts.warm) : null;
    if (ev) raw.lights.push({ cx: ev.cx, cy: ev.cy, rx: ev.rx, ry: ev.ry, color: ev.color, a: ev.a, fade: ev.fade });
    const s = ensureContrast(raw, W, H);
    return {
      version: SCENE_APPROVED_VERSION,
      mode: ev ? "light-A-evening" : "light-A",
      name: ev ? "\u0410 + \u0442\u0451\u043F\u043B\u044B\u0439 \u043A\u0440\u0430\u0439" : "\u0410 \u2014 \u0442\u043E\u043D \u0442\u0435\u043C\u044B \u044F\u0440\u0447\u0435 \u0438 \u0433\u043B\u0443\u0431\u0436\u0435",
      screen,
      size: { W, H },
      palette: p,
      spec: s,
      warmEdge: ev,
      gradient: { start: [0.22, 0], end: [0.78, 1], top: col(s.top), bottom: col(s.bot) },
      lights: s.lights.map((l) => ({ cx: l.cx, cy: l.cy, rx: l.rx, ry: l.ry, color: col(l.color), a: +l.a.toFixed(2), fade: l.fade })),
      scrim: s.scrim ? { color: "#000000", a: s.scrim.a, h: Math.round(s.scrim.h), note: "\u0447\u0451\u0440\u043D\u044B\u0439 \u043E\u0442 0 \u043D\u0430 \u0432\u044B\u0441\u043E\u0442\u0435 h \u043E\u0442 \u043D\u0438\u0437\u0430 \u0441\u0446\u0435\u043D\u044B \u0434\u043E a \u0443 \u043D\u0438\u0437\u0430" } : null,
      guard: s.guardSteps,
      order: ["gradient", "light1", "light2", "scrim"]
    };
  }
  function guardSkyAnalytic(raw, W, H, stars = [], probe, warm) {
    const stops = [[0, raw.zen], [0.42, raw.mid], [0.66, raw.hor], [0.74, raw.hor], [0.8, raw.gnd], [1, raw.bottom]];
    const skyAt = (y) => {
      const f = clamp2(y / H, 0, 1);
      for (let i = 1; i < stops.length; i += 1) {
        const [f1, c1] = stops[i];
        const [f0, c0] = stops[i - 1];
        if (f <= f1) {
          const k = f1 === f0 ? 1 : (f - f0) / (f1 - f0);
          return c0.map((v, j) => v + (c1[j] - v) * k);
        }
      }
      return stops[stops.length - 1][1];
    };
    const q = (c) => c.map((v) => Math.round(clamp2(v, 0, 255)));
    const layered = (x, y) => {
      let c = q(skyAt(y));
      const dx = (x - 0.18 * W) / (0.62 * W);
      const dy = (y - 0.02 * H) / (0.46 * H);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 1) {
        const a = 0.72 * (1 - d);
        const base = c;
        c = q(base.map((v, j) => v + (raw.lightC[j] - v) * a));
      }
      const hy0 = H * 0.62;
      const hy1 = H * 0.76;
      if (y >= hy0 && y <= hy1) {
        const k = (y - hy0) / (hy1 - hy0);
        const a = 0.34 * (1 - Math.abs(k - 0.5) * 2);
        const base = c;
        c = q(base.map((v, j) => v + (raw.haze[j] - v) * a));
      }
      if (warm) {
        const wx = (x - warm.cx * W) / (warm.rx * W);
        const wy = (y - warm.cy * H) / (warm.ry * H);
        const wd = Math.sqrt(wx * wx + wy * wy);
        if (wd < warm.fade) {
          const a = warm.a * (1 - wd / warm.fade);
          const base = c;
          c = q(base.map((v, j) => v + (warm.color[j] - v) * a));
        }
      }
      for (const st of stars) {
        const sx = st.x * W - x;
        const sy = st.y * H - y;
        if (sx * sx + sy * sy <= st.r * st.r) c = q(c.map((v) => v + (255 - v) * st.a));
      }
      const vx = (x - W / 2) / (W * 0.78);
      const vy = (y - H / 2) / (H * 0.78);
      const vr = Math.sqrt(vx * vx + vy * vy);
      if (vr > 0.45) {
        const a = 0.22 * clamp2((vr - 0.45) / (1 - 0.45), 0, 1);
        c = q(c.map((v) => v * (1 - a)));
      }
      return c;
    };
    const lumLin = (c) => 0.2126 * toLin(c[0]) + 0.7152 * toLin(c[1]) + 0.0722 * toLin(c[2]);
    const rowY = (y) => {
      let s = 0;
      let n = 0;
      for (let x = 40; x < W - 40; x += 6) {
        s += lumLin(layered(x, y));
        n += 1;
      }
      return s / n;
    };
    if (probe) probe.rowY = rowY;
    let worst = 0;
    for (let y = Math.round(H * 0.5); y < H * 0.96; y += 6) worst = Math.max(worst, rowY(y));
    let top = 0;
    for (let y = 4; y < 80; y += 6) top = Math.max(top, rowY(y));
    const need = (Y, ratio3) => {
      const target = 1.05 / ratio3 - 0.05;
      return Y > target ? 1 - Math.pow(target / Y, 1 / 2.2) : 0;
    };
    return { aBottom: need(worst, 4.6), aTop: need(top, 3.5) };
  }
  function darkSky(t, screen, W, H, opts) {
    const p = paletteA(t, "dark");
    const S = p.S;
    const C = p.C;
    const zenC = Math.min(0.17, C + 0.03);
    const midC = Math.min(0.15, C + 0.01);
    const horC = Math.min(0.13, C + 0.02);
    const gndC = Math.min(0.1, C);
    const botC = Math.min(0.08, C);
    const zen = okRgb(0.4, zenC, S);
    const mid = okRgb(0.47, midC, norm(S + 4));
    const hor = okRgb(0.6, horC, norm(S + 12));
    const gnd = okRgb(0.27, gndC, norm(S - 8));
    const bottom = okRgb(0.22, botC, norm(S - 10));
    const haze = okRgb(0.8, 0.08, p.Lh);
    const r = rng(3);
    const stars = [];
    for (let i = 0; i < 70; i += 1) {
      const x = r();
      const y = r() * 0.4;
      const rad = 0.8 + r() * 1.8;
      const a = 0.18 + r() * 0.5;
      stars.push({ x, y, r: rad, a });
    }
    const ev = opts && opts.evening ? warmEdge(t, opts.warm) : null;
    const guard = guardSkyAnalytic({ zen, mid, hor, gnd, bottom, lightC: p.lightC, haze }, W, H, stars, void 0, ev);
    return {
      version: SCENE_APPROVED_VERSION,
      mode: ev ? "dark-sky-evening" : "dark-sky",
      name: ev ? "\u0413\u043B\u0443\u0431\u043E\u043A\u043E\u0435 \u043D\u0435\u0431\u043E + \u0442\u0451\u043F\u043B\u044B\u0439 \u043A\u0440\u0430\u0439" : "\u0413\u043B\u0443\u0431\u043E\u043A\u043E\u0435 \u043D\u0435\u0431\u043E",
      screen,
      size: { W, H },
      palette: p,
      warmEdge: ev,
      gradient: {
        direction: "vertical",
        stops: [
          { at: 0, color: col(zen), oklch: [0.4, zenC, S] },
          { at: 0.42, color: col(mid), oklch: [0.47, midC, norm(S + 4)] },
          { at: 0.66, color: col(hor), oklch: [0.6, horC, norm(S + 12)] },
          { at: 0.74, color: col(hor) },
          { at: 0.8, color: col(gnd), oklch: [0.27, gndC, norm(S - 8)] },
          { at: 1, color: col(bottom), oklch: [0.22, botC, norm(S - 10)] }
        ]
      },
      sun: { cx: 0.18, cy: 0.02, rx: 0.62, ry: 0.46, color: col(p.lightC), a: 0.72, fade: 1 },
      haze: { y0: 0.62, y1: 0.76, color: col(haze), a: [0, 0.34, 0] },
      stars: { seed: 3, count: 70, yMax: 0.4, color: "#FFFFFF", list: stars },
      vignette: { scale: 0.78, inner: 0.45, a: 0.22 },
      guard,
      raw: { zen, mid, hor, gnd, bottom, haze, lightC: p.lightC },
      order: ev ? ["gradient", "sun", "haze", "warmEdge", "stars", "vignette", "guard"] : ["gradient", "sun", "haze", "stars", "vignette", "guard"]
    };
  }
  var isSkyPalette = (p) => p.mode === "dark-sky" || p.mode === "dark-sky-evening";
  function approvedScene(tokens, appearance, screen, W, H, opts) {
    return appearance === "dark" ? darkSky(tokens, screen, W, H, opts) : lightA(tokens, screen, W, H, opts);
  }
  var SCENE_SKY_TONE_MIX = 0.25;
  function skyToneHex(p) {
    return hex(p.raw.mid.map((v, i) => v + (p.raw.hor[i] - v) * SCENE_SKY_TONE_MIX));
  }
  function sceneTopHex(p) {
    return isSkyPalette(p) ? skyToneHex(p) : p.gradient.top.hex;
  }
  function sceneFrameToneHex(p) {
    if (isSkyPalette(p)) return skyToneHex(p);
    const top = p.gradient.top.rgb;
    const bot = p.gradient.bottom.rgb;
    return hex(top.map((v, i) => (v + bot[i]) / 2));
  }

  // components/home/v2/scene/home_scene_tokens.ts
  var FALLBACK_ACCENT = "#5B49D6";
  var HEX = /^#([0-9a-f]{6})$/i;
  function channel3(v) {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function relativeLuminance(hex3) {
    const m = HEX.exec(hex3);
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return 0.2126 * channel3(n >> 16 & 255) + 0.7152 * channel3(n >> 8 & 255) + 0.0722 * channel3(n & 255);
  }
  function whiteContrastOn(hex3) {
    const l = relativeLuminance(hex3);
    return l === null ? 1 : 1.05 / (l + 0.05);
  }
  var HOME_SCENE_DARK_ACCENT_MIX = 0.3;
  var HOME_SCENE_TWILIGHT_THEME_ID = "ink";
  var EVENING_GLOW = "rgba(214,92,70,0.62)";
  var TWILIGHT_CARD = "#FCFCFF";
  var HEX6_OR_8 = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i;
  var rgbOf = (hex3) => {
    const m = HEX6_OR_8.exec(hex3);
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  };
  var alphaOf = (hex3) => {
    const m = HEX6_OR_8.exec(hex3);
    return m && m[2] ? parseInt(m[2], 16) / 255 : 1;
  };
  var clamp255 = (v) => Math.max(0, Math.min(255, v));
  var hexOf = (c) => `#${c.map((v) => Math.round(clamp255(v)).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  var rgbaOf = (c, a) => `rgba(${c.map((v) => Math.round(clamp255(v))).join(",")},${a})`;
  var mixRgb = (a, b, w) => [a[0] * w + b[0] * (1 - w), a[1] * w + b[1] * (1 - w), a[2] * w + b[2] * (1 - w)];
  var lumRgb = (c) => {
    const s = c.map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
  };
  var ratioRgb = (a, b) => {
    const x = lumRgb(a);
    const y = lumRgb(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  var toLin2 = (v) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  var toSrgb2 = (v) => 255 * (v <= 31308e-7 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  function homeSceneOklchOf(c) {
    const [r, g, b] = c.map(toLin2);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
  }
  function homeSceneFromOklch(L, C, H) {
    const a = C * Math.cos(H * Math.PI / 180);
    const b = C * Math.sin(H * Math.PI / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
    return lin.map((v) => clamp255(toSrgb2(Math.max(0, Math.min(1, v)))));
  }
  var EMBER = rgbaOf(homeSceneFromOklch(0.66, 0.19, 28), 0.55);
  function todayRingTokens(accent) {
    const [, C, H] = homeSceneOklchOf(accent);
    const chroma2 = Math.max(0.06, Math.min(C, 0.14));
    const ring1 = hexOf(homeSceneFromOklch(0.94, chroma2 * 0.7, H));
    const ring2 = hexOf(homeSceneFromOklch(0.86, chroma2, (H + 18) % 360));
    const ring3 = hexOf(homeSceneFromOklch(0.78, chroma2, (H + 342) % 360));
    return { todayRing: [ring1, ring2, ring3], todayRingTrack: rgbaOf(homeSceneFromOklch(0.94, chroma2 * 0.7, H), 0.22), todayRingDone: ring1 };
  }
  var PREMIUM_SCENE_WHITE_TARGET = 6.2;
  function deepenForWhite(c, target) {
    if (whiteContrastOn(hexOf(c)) >= target) return c;
    const [L, C, H] = homeSceneOklchOf(c);
    for (let l = L; l > 0.05; l -= 0.01) {
      const next = homeSceneFromOklch(l, C, H);
      if (whiteContrastOn(hexOf(next)) >= target) return next;
    }
    return homeSceneFromOklch(0.05, C, H);
  }
  function homeSceneThemeTokens(input, evening = false) {
    const t = input.theme;
    const accent = rgbOf(t.accent) ?? rgbOf(FALLBACK_ACCENT);
    const done = (top2, bot2, glow, eveTop, eveBot, eveningGlow, scrim, seam) => {
      const sceneTop = hexOf(evening ? eveTop : top2);
      return Object.freeze({
        sceneTop,
        sceneBottom: hexOf(evening ? eveBot : bot2),
        sceneGlow: glow,
        sceneEmber: EMBER,
        whiteContrastTop: whiteContrastOn(sceneTop),
        eveningGlow,
        scrim,
        seam,
        ...todayRingTokens(accent)
      });
    };
    const premium = premiumThemeVisualSpec(input.themeId);
    if (premium) {
      const top2 = deepenForWhite(rgbOf(premiumSceneTop(premium)) ?? accent, PREMIUM_SCENE_WHITE_TARGET);
      const bot2 = rgbOf(premium.sceneBottom) ?? rgbOf(t.bg);
      const glow = `${premium.edge}25`;
      return done(top2, bot2, glow, top2, bot2, glow, false, ratioRgb(bot2, rgbOf(t.opaqueCard) ?? [0, 0, 0]));
    }
    if (input.appearance === "dark") {
      const grad = t.accentGradient.length > 0 ? t.accentGradient : [t.accent, t.accent];
      const first = rgbOf(grad[0]) ?? accent;
      const last = rgbOf(grad[grad.length - 1]) ?? accent;
      const top2 = mixRgb(first, rgbOf(t.bgTop) ?? [0, 0, 0], HOME_SCENE_DARK_ACCENT_MIX);
      const bot2 = mixRgb(last, rgbOf(t.bg) ?? [0, 0, 0], HOME_SCENE_DARK_ACCENT_MIX);
      const glowHex = t.bgGlow.length > 0 && t.bgGlow[0] || t.accentGlow;
      const glowRgb = rgbOf(glowHex);
      const glow = glowRgb ? rgbaOf(glowRgb, alphaOf(glowHex)) : glowHex;
      return done(top2, bot2, glow, top2, bot2, EVENING_GLOW, false, ratioRgb(bot2, rgbOf(t.opaqueCard) ?? [0, 0, 0]));
    }
    if (input.themeId === HOME_SCENE_TWILIGHT_THEME_ID) {
      const top2 = homeSceneFromOklch(0.47, 0.14, 282);
      const bot2 = homeSceneFromOklch(0.28, 0.1, 276);
      return done(
        top2,
        bot2,
        rgbaOf(homeSceneFromOklch(0.66, 0.13, 300), 0.9),
        homeSceneFromOklch(0.3, 0.09, 285),
        homeSceneFromOklch(0.14, 0.05, 280),
        rgbaOf(homeSceneFromOklch(0.58, 0.17, 25), 0.75),
        true,
        ratioRgb(bot2, rgbOf(TWILIGHT_CARD))
      );
    }
    const [, C, H] = homeSceneOklchOf(accent);
    const top = homeSceneFromOklch(0.47, Math.min(C, 0.16), H);
    const bot = homeSceneFromOklch(0.28, Math.min(C, 0.11), (H + 354) % 360);
    return done(
      top,
      bot,
      rgbaOf(homeSceneFromOklch(0.66, Math.min(C, 0.14), (H + 18) % 360), 0.9),
      homeSceneFromOklch(0.3, Math.min(C, 0.09), H),
      homeSceneFromOklch(0.14, Math.min(C, 0.05), H),
      EVENING_GLOW,
      true,
      ratioRgb(bot, rgbOf(t.opaqueCard) ?? [255, 255, 255])
    );
  }
  var HOME_SCENE_THEME_LEVEL = "max";
  function homeSceneTokensForTheme(themeId, appearance, evening = false) {
    return homeSceneThemeTokens({ themeId, appearance, theme: liquidGlassTokens(themeId, { level: HOME_SCENE_THEME_LEVEL, appearance }) }, evening);
  }

  // components/home/v2/scene/home_scene_warm_tone.ts
  var hexToRgb = (hex3) => [1, 3, 5].map((i) => parseInt(hex3.slice(i, i + 2), 16));
  var toHex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  var cache = /* @__PURE__ */ new Map();
  function homeSceneWarmTone(accentHex) {
    const hit = cache.get(accentHex);
    if (hit) return hit;
    const [, chroma2, hue] = homeSceneOklchOf(hexToRgb(accentHex));
    const c = Math.max(0.04, Math.min(chroma2, 0.12));
    const next = Object.freeze({
      flame: toHex(homeSceneFromOklch(0.94, c * 0.55, hue)),
      low: toHex(homeSceneFromOklch(0.92, c * 0.75, hue))
    });
    cache.set(accentHex, next);
    return next;
  }

  // constants/lite_mode_flag.ts
  var liteModeOn = false;
  function isLiteModeOn() {
    return liteModeOn;
  }

  // constants/liquidGlassShadowStyle.ts
  var devShadowsOff = false;
  var NO_SHADOW = [];
  var layer = (offsetY, blurRadius, spreadDistance, color) => ({ offsetX: 0, offsetY, blurRadius, spreadDistance, color });
  var gradient180 = (from, to) => ({ colors: [from, to], start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } });
  function plateGradient(g) {
    return gradient180(g.plateFillFrom, g.plateFillTo);
  }
  function raisedGradient(g) {
    return gradient180(g.raisedFillFrom, g.raisedFillTo);
  }
  function plateShadowStyle(g) {
    if (devShadowsOff || isLiteModeOn()) return NO_SHADOW;
    return g.isLight ? [layer(14, 26, -14, g.plateShadow), layer(1, 3, 0, g.plateShadowSoft)] : [layer(16, 28, -14, g.plateShadow)];
  }
  function nestedShadowStyle(g) {
    if (devShadowsOff || isLiteModeOn()) return NO_SHADOW;
    return [g.isLight ? layer(5, 10, -5, g.nestedShadow) : layer(6, 12, -6, g.nestedShadow)];
  }
  function raisedShadowStyle(g) {
    if (devShadowsOff || isLiteModeOn()) return NO_SHADOW;
    return g.isLight ? [layer(26, 40, -14, g.raisedShadow), layer(2, 4, 0, g.raisedShadowSoft)] : [layer(26, 40, -14, g.raisedShadow)];
  }
  return __toCommonJS(pm_entry_exports);
})();
