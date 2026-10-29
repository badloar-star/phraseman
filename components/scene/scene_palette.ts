// ═══════════════════════════════════════════════════════════════════════════
// scene_palette.ts — ЕДИНЫЙ источник цвета «Сцены»: scenePalette(themeId, appearance, screen, W, H).
//
// зачем (вердикт владельца 29.10: «Тёмная тема везде должна стать глубокое небо!!! а светлая — тон темы ярче и глубже! Это всех экранов касается»;
// координатор: «одна функция, перенос 1:1 из JS эталона»): дословный порт docs/design/v2-app/scene-approved.js (Макеты, 4b3e5eea9) — тёмное оформление =
// «Глубокое небо» (darkSky), светлое = «А — тон темы ярче и глубже» (lightA + затемнение низа «как сейчас» + страж ensureContrast). Порядок действий и
// константы те же, поэтому tests/scene_palette_parity.test.ts находит разницу 0 с функцией эталона на всех темах × оформлениях × экранах.
// Единственное отличие, названное явно: страж «Глубокого неба» (guardSky) в эталоне читает пиксели канвы, а в приложении канвы нет — здесь он считается
// по той же формуле яркости строк, но не по пикселям (звёзды в зоне текста не бывают: они выше 40 % высоты); проверка — по manifest.json кадров эталона.
// Чистый модуль без React и сети; вход — токены темы уровня «Максимум» (liquidGlassTokens), выход — числа (rgb 0…255 дробные, как в эталоне).
// ═══════════════════════════════════════════════════════════════════════════
import { liquidGlassTokens, type GlassTokens } from '../../constants/liquidGlassThemePalette';

export type Rgb = readonly number[];
export type SceneAppearance = 'dark' | 'light';
export type SceneScreen = 'home' | 'dialogs' | 'peak' | 'season';
export type SceneTokens = Pick<GlassTokens, 'accent' | 'opaqueCard'>;

/** px на dp кадра 1080 × 2400 эмулятора Сверки; в приложении — PixelRatio (затемнение низа задано в dp). */
export const SCENE_DP = 2.625;
/** Версия утверждённой спецификации эталона (scene-approved.js VERSION). */
export const SCENE_APPROVED_VERSION = '2026-10-29';

const norm = (h: number): number => ((h % 360) + 360) % 360;
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const hx = (h: string): number[] => {
  const s = String(h).replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const hex = (c: Rgb): string => `#${c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
const toLin = (v: number): number => {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};
const toSrgb = (v: number): number => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
const oklchOf = (c: Rgb): [number, number, number] => {
  const [r, g, b] = c.map(toLin) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
};
const okLin = (L: number, C: number, H: number): number[] => {
  const a = C * Math.cos(H * Math.PI / 180);
  const b = C * Math.sin(H * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
};
const inGamut = (c: readonly number[]): boolean => c.every((v) => v >= -0.0005 && v <= 1.0005);
/** Выход из охвата — уменьшаем насыщенность шагом .004 при тех же оттенке и светлоте (как oklchToHex приложения). */
const okRgb = (L: number, C: number, H: number): number[] => {
  let c = C;
  let lin = okLin(L, c, H);
  for (let i = 0; i < 60 && !inGamut(lin); i += 1) {
    c = Math.max(0, c - 0.004);
    lin = okLin(L, c, H);
  }
  return lin.map((v) => clamp(toSrgb(clamp(v, 0, 1)), 0, 255));
};
const lumc = (c: Rgb): number => {
  const s = c.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * s[0]! + 0.7152 * s[1]! + 0.0722 * s[2]!;
};
const ratioc = (a: Rgb, b: Rgb): number => {
  const x = lumc(a);
  const y = lumc(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const whiteOn = (c: Rgb): number => 1.05 / (lumc(c) + 0.05);
const col = (c: Rgb): { rgb: number[]; hex: string } => ({ rgb: c.map((v) => Math.round(v)), hex: hex(c) });
/** Детерминированный шум xorshift32 — одни и те же звёзды на любой платформе. */
const rng = (seed: number): (() => number) => {
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

/** 1. Палитра «А — тон темы ярче и глубже» (общая для обоих оформлений). */
export function paletteA(t: SceneTokens, appearance: SceneAppearance) {
  const dark = appearance === 'dark';
  const [, C, H] = oklchOf(hx(t.accent));
  const Ct = clamp(C * 1.6, 0.07, 0.17);
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

export type SceneLight = { cx: number; cy: number; rx: number; ry: number; color: number[]; a: number; fade: number };
export type SceneFormulaSpec = { top: number[]; bot: number[]; start: [number, number]; end: [number, number]; lights: SceneLight[]; scrim: { a: number; h: number } | null; guardSteps?: { scrim: number; top: number } };

/** 2. Сэмплер формульной сцены (painter из scene-recolor.js) — нужен стражу светлого режима. */
function painter(spec: SceneFormulaSpec, W: number, H: number): (x: number, y: number) => number[] {
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
    let r = top[0]! + (bot[0]! - top[0]!) * t;
    let g = top[1]! + (bot[1]! - top[1]!) * t;
    let b = top[2]! + (bot[2]! - top[2]!) * t;
    for (const l of lights) {
      const dx = (x - l.cx) / l.rx;
      const dy = (y - l.cy) / l.ry;
      const d = Math.sqrt(dx * dx + dy * dy) / l.fade;
      if (d < 1) {
        const a = l.a * (1 - d);
        r += (l.c[0]! - r) * a;
        g += (l.c[1]! - g) * a;
        b += (l.c[2]! - b) * a;
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

/** Страж контраста формульной сцены: белый ≥ 4,6 в зоне текста — затемнение низа растёт шагом .05; под значками статус-бара ≥ 2,8 — верхние света слабеют, верх темнеет. */
export function ensureContrast(spec: SceneFormulaSpec, W: number, H: number): SceneFormulaSpec {
  const s: SceneFormulaSpec = { ...spec, lights: spec.lights.map((l) => ({ ...l })), scrim: spec.scrim ? { ...spec.scrim } : null };
  const minAt = (ys: number[], xs: number[]): number => {
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

type Scrim = { a: number; h: number } | null;
/** Затемнение низа «как сейчас» у каждого экрана (вход стража): Главная/Пик .40 на 300 dp; Диалоги .34 на 60 % сцены; Сезон .36 на 320 dp. */
const OLD_SCRIM: Record<SceneScreen, (H: number, dp: number) => Scrim> = {
  home: (_H, dp) => ({ a: 0.4, h: 300 * dp }),
  peak: (_H, dp) => ({ a: 0.4, h: 300 * dp }),
  dialogs: (H) => ({ a: 0.34, h: H * 0.6 }),
  season: (_H, dp) => ({ a: 0.36, h: 320 * dp }),
};
/** Опции: premium — шесть премиум-тем (Главная/Пик без затемнения); dp — px на dp устройства (по умолчанию 2,625 кадра эмулятора, как в эталоне). */
export type SceneWarm = 'theme' | 'warmer' | 'band';
export type SceneOpts = { premium?: boolean; dp?: number; /** Главная после 20:00: «Небо + тёплый край» (владелец 29.10 ~08:05). */ evening?: boolean; warm?: SceneWarm };
const oldScrim = (screen: SceneScreen, H: number, opts?: SceneOpts): Scrim =>
  opts && opts.premium && screen !== 'dialogs' && screen !== 'season' ? null : (OLD_SCRIM[screen] ?? OLD_SCRIM.home)(H, opts?.dp ?? SCENE_DP);

/**
 * Вечер (Главная после 20:00) — «Небо + тёплый край» (слово владельца 29.10 ~08:05: небо остаётся, справа внизу лёгкий тёплый отсвет как намёк на угрозу серии, без красного и углей;
 * тёплый цвет — от оттенка темы). По умолчанию 'band' — «тёплый янтарь» (владелец 29.10 ~10:40). Дословный порт warmEdge эталона scene-approved.js.
 */
const WARM: Record<SceneWarm, (H: number) => number> = {
  theme: (H) => H,
  warmer: (H) => {
    const d = ((60 - H + 540) % 360) - 180;
    return norm(H + Math.sign(d) * Math.min(35, Math.abs(d)));
  },
  band: (H) => 40 + ((H % 60) / 60) * 40,
};
export function warmEdge(t: SceneTokens, mode?: SceneWarm) {
  const [, , H] = oklchOf(hx(t.accent));
  const m: SceneWarm = mode && WARM[mode] ? mode : 'band';
  const hue = WARM[m](H);
  const L = m === 'band' ? 0.78 : m === 'theme' ? 0.72 : 0.74;
  const C = m === 'band' ? 0.14 : m === 'theme' ? 0.12 : 0.13;
  const color = okRgb(L, C, hue);
  return { mode: m, hue: Math.round(hue * 10) / 10, cx: 0.92, cy: 1.02, rx: 0.55, ry: 0.42, color, hex: hex(color), a: 0.5, fade: 0.85, oklch: [L, C, Math.round(hue)] as [number, number, number] };
}
export type SceneWarmEdge = ReturnType<typeof warmEdge>;

/** 3. Светлое оформление — «А — тон темы ярче и глубже». */
export function lightA(t: SceneTokens, screen: SceneScreen, W: number, H: number, opts?: SceneOpts) {
  const p = paletteA(t, 'light');
  const old = oldScrim(screen, H, opts);
  const raw: SceneFormulaSpec = {
    top: p.top, bot: p.bot, start: [0.22, 0], end: [0.78, 1],
    lights: [
      { cx: 0.18, cy: 0, rx: 0.7, ry: 0.5, color: p.lightC, a: p.a1, fade: 0.7 },
      { cx: 0.86, cy: 1.02, rx: 0.8, ry: 0.42, color: p.light2C, a: p.a2, fade: 0.7 },
    ],
    scrim: old,
  };
  const ev = opts && opts.evening ? warmEdge(t, opts.warm) : null;
  if (ev) raw.lights.push({ cx: ev.cx, cy: ev.cy, rx: ev.rx, ry: ev.ry, color: ev.color, a: ev.a, fade: ev.fade }); // вечер: тот же тёплый край третьим светом, страж считает его
  const s = ensureContrast(raw, W, H);
  return {
    version: SCENE_APPROVED_VERSION, mode: (ev ? 'light-A-evening' : 'light-A') as 'light-A' | 'light-A-evening', name: ev ? 'А + тёплый край' : 'А — тон темы ярче и глубже', screen, size: { W, H }, palette: p, spec: s, warmEdge: ev,
    gradient: { start: [0.22, 0] as [number, number], end: [0.78, 1] as [number, number], top: col(s.top), bottom: col(s.bot) },
    lights: s.lights.map((l) => ({ cx: l.cx, cy: l.cy, rx: l.rx, ry: l.ry, color: col(l.color), a: +l.a.toFixed(2), fade: l.fade })),
    scrim: s.scrim ? { color: '#000000', a: s.scrim.a, h: Math.round(s.scrim.h), note: 'чёрный от 0 на высоте h от низа сцены до a у низа' } : null,
    guard: s.guardSteps!,
    order: ['gradient', 'light1', 'light2', 'scrim'] as const,
  };
}

/** Страж «Глубокого неба» по формуле (без канвы): средняя линейная яркость строк зоны текста; белый ≥ 4,6 — иначе затемнение низа. Возвращает альфы затемнения. */
export function guardSkyAnalytic(raw: { zen: number[]; mid: number[]; hor: number[]; gnd: number[]; bottom: number[]; lightC: number[]; haze: number[] }, W: number, H: number, stars: ReadonlyArray<{ x: number; y: number; r: number; a: number }> = [], probe?: { rowY?: (y: number) => number }, warm?: SceneWarmEdge | null): { aBottom: number; aTop: number } {
  const stops: Array<[number, number[]]> = [[0, raw.zen], [0.42, raw.mid], [0.66, raw.hor], [0.74, raw.hor], [0.8, raw.gnd], [1, raw.bottom]];
  const skyAt = (y: number): number[] => {
    const f = clamp(y / H, 0, 1);
    for (let i = 1; i < stops.length; i += 1) {
      const [f1, c1] = stops[i]!;
      const [f0, c0] = stops[i - 1]!;
      if (f <= f1) {
        const k = f1 === f0 ? 1 : (f - f0) / (f1 - f0);
        return c0.map((v, j) => v + (c1[j]! - v) * k);
      }
    }
    return stops[stops.length - 1]![1];
  };
  // порядок слоёв эталона: градиент → солнце → дымка → звёзды → виньетка; после каждого слоя цвет квантуется до 8 бит, как на канве
  const q = (c: number[]): number[] => c.map((v) => Math.round(clamp(v, 0, 255)));
  const layered = (x: number, y: number): number[] => {
    let c = q(skyAt(y));
    const dx = (x - 0.18 * W) / (0.62 * W);
    const dy = (y - 0.02 * H) / (0.46 * H);
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1) {
      const a = 0.72 * (1 - d);
      const base = c;
      c = q(base.map((v, j) => v + (raw.lightC[j]! - v) * a));
    }
    const hy0 = H * 0.62;
    const hy1 = H * 0.76;
    if (y >= hy0 && y <= hy1) {
      const k = (y - hy0) / (hy1 - hy0);
      const a = 0.34 * (1 - Math.abs(k - 0.5) * 2);
      const base = c;
      c = q(base.map((v, j) => v + (raw.haze[j]! - v) * a));
    }
    // вечер: тёплый край — эллиптический свет после дымки, до звёзд (порядок слоёв эталона)
    if (warm) {
      const wx = (x - warm.cx * W) / (warm.rx * W);
      const wy = (y - warm.cy * H) / (warm.ry * H);
      const wd = Math.sqrt(wx * wx + wy * wy);
      if (wd < warm.fade) {
        const a = warm.a * (1 - wd / warm.fade);
        const base = c;
        c = q(base.map((v, j) => v + (warm.color[j]! - v) * a));
      }
    }
    // звёзды: белые круги радиуса r (px) с альфой a в точке (x·W, y·H); край без сглаживания — на строках зоны текста звёзд нет (они выше 40 % H)
    for (const st of stars) {
      const sx = st.x * W - x;
      const sy = st.y * H - y;
      if (sx * sx + sy * sy <= st.r * st.r) c = q(c.map((v) => v + (255 - v) * st.a));
    }
    // виньетка: эллипс .78 W × .78 H от центра, чёрный: 0 на 45 % радиуса → .22 на краю
    const vx = (x - W / 2) / (W * 0.78);
    const vy = (y - H / 2) / (H * 0.78);
    const vr = Math.sqrt(vx * vx + vy * vy);
    if (vr > 0.45) {
      const a = 0.22 * clamp((vr - 0.45) / (1 - 0.45), 0, 1);
      c = q(c.map((v) => v * (1 - a)));
    }
    return c;
  };
  const lumLin = (c: number[]): number => 0.2126 * toLin(c[0]!) + 0.7152 * toLin(c[1]!) + 0.0722 * toLin(c[2]!);
  const rowY = (y: number): number => {
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
  const need = (Y: number, ratio: number): number => {
    const target = 1.05 / ratio - 0.05;
    return Y > target ? 1 - Math.pow(target / Y, 1 / 2.2) : 0;
  };
  return { aBottom: need(worst, 4.6), aTop: need(top, 3.5) };
}

/** 4. Тёмное оформление — «Глубокое небо». */
export function darkSky(t: SceneTokens, screen: SceneScreen, W: number, H: number, opts?: SceneOpts) {
  const p = paletteA(t, 'dark');
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
  const stars: Array<{ x: number; y: number; r: number; a: number }> = [];
  for (let i = 0; i < 70; i += 1) {
    const x = r();
    const y = r() * 0.4;
    const rad = 0.8 + r() * 1.8;
    const a = 0.18 + r() * 0.5;
    stars.push({ x, y, r: rad, a });
  }
  const ev = opts && opts.evening ? warmEdge(t, opts.warm) : null;
  const guard = guardSkyAnalytic({ zen, mid, hor, gnd, bottom, lightC: p.lightC, haze }, W, H, stars, undefined, ev);
  return {
    version: SCENE_APPROVED_VERSION, mode: (ev ? 'dark-sky-evening' : 'dark-sky') as 'dark-sky' | 'dark-sky-evening', name: ev ? 'Глубокое небо + тёплый край' : 'Глубокое небо', screen, size: { W, H }, palette: p, warmEdge: ev,
    gradient: {
      direction: 'vertical' as const,
      stops: [
        { at: 0, color: col(zen), oklch: [0.4, zenC, S] },
        { at: 0.42, color: col(mid), oklch: [0.47, midC, norm(S + 4)] },
        { at: 0.66, color: col(hor), oklch: [0.6, horC, norm(S + 12)] },
        { at: 0.74, color: col(hor) },
        { at: 0.8, color: col(gnd), oklch: [0.27, gndC, norm(S - 8)] },
        { at: 1, color: col(bottom), oklch: [0.22, botC, norm(S - 10)] },
      ],
    },
    sun: { cx: 0.18, cy: 0.02, rx: 0.62, ry: 0.46, color: col(p.lightC), a: 0.72, fade: 1 },
    haze: { y0: 0.62, y1: 0.76, color: col(haze), a: [0, 0.34, 0] as [number, number, number] },
    stars: { seed: 3, count: 70, yMax: 0.4, color: '#FFFFFF', list: stars },
    vignette: { scale: 0.78, inner: 0.45, a: 0.22 },
    guard,
    raw: { zen, mid, hor, gnd, bottom, haze, lightC: p.lightC },
    order: (ev ? ['gradient', 'sun', 'haze', 'warmEdge', 'stars', 'vignette', 'guard'] : ['gradient', 'sun', 'haze', 'stars', 'vignette', 'guard']) as readonly string[],
  };
}

export type ScenePaletteResult = ReturnType<typeof lightA> | ReturnType<typeof darkSky>;
/** Палитра «Глубокое небо» (в том числе вечерняя «небо + тёплый край»). */
export const isSkyPalette = (p: ScenePaletteResult): p is ReturnType<typeof darkSky> => p.mode === 'dark-sky' || p.mode === 'dark-sky-evening';

/** Чистая часть: токены темы уровня «Максимум» → утверждённая сцена (как SceneApproved.approved эталона). */
export function approvedScene(tokens: SceneTokens, appearance: SceneAppearance, screen: SceneScreen, W: number, H: number, opts?: SceneOpts): ScenePaletteResult {
  return appearance === 'dark' ? darkSky(tokens, screen, W, H, opts) : lightA(tokens, screen, W, H, opts);
}

/** Единый вход экранов. Токены — всегда уровня «Максимум» (сцена не зависит от ползунка яркости). W, H — px области сцены экрана. */
export function scenePalette(themeId: string, appearance: SceneAppearance, screen: SceneScreen, W: number, H: number, opts?: SceneOpts): ScenePaletteResult {
  const tokens = liquidGlassTokens(themeId, { level: 'max', appearance });
  return approvedScene(tokens, appearance, screen, W, H, opts);
}

/** Шесть премиум-тем: Главная/Пик у них сейчас без затемнения низа (вход стража другой). */
const PREMIUM_SCENE_THEMES: ReadonlySet<string> = new Set(['grad_full_olive', 'grad_full_ref_signal_lime', 'grad_full_ref_storm_violet', 'grad_full_titanium', 'grad_full_horizon', 'grad_full_ref_gravity_blue']);
export const isPremiumSceneTheme = (themeId: string): boolean => PREMIUM_SCENE_THEMES.has(themeId);

const cache = new Map<string, ScenePaletteResult>();
/**
 * Палитра сцены с кэшем модуля: считается ОДИН раз на (тема, оформление, экран, размер, dp), а не на каждую перерисовку.
 * зачем (координатор 29.10, скорость): палитра и 70 звёзд — чистая математика, ей нечего делать на каждом кадре; первый показ — ~1–3 мс, остальные — из кэша.
 */
export function scenePaletteCached(themeId: string, appearance: SceneAppearance, screen: SceneScreen, W: number, H: number, dp: number): ScenePaletteResult {
  const key = `${themeId}|${appearance}|${screen}|${Math.round(W)}|${Math.round(H)}|${dp}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const value = scenePalette(themeId, appearance, screen, Math.round(W), Math.round(H), { premium: isPremiumSceneTheme(themeId), dp });
  cache.set(key, value);
  return value;
}

/** Верхний цвет сцены (#RRGGBB): тёмное — зенит «неба», светлое — верх «А» после стража. Для шапки, статус-бара, кнопки «назад». */
export function sceneTopHex(p: ScenePaletteResult): string {
  return isSkyPalette(p) ? p.gradient.stops[0]!.color.hex : p.gradient.top.hex;
}
/** Нижний цвет сцены (#RRGGBB): тёмное — низ «неба», светлое — низ «А». */
export function sceneBottomHex(p: ScenePaletteResult): string {
  return isSkyPalette(p) ? p.gradient.stops[5]!.color.hex : p.gradient.bottom.hex;
}

/**
 * Контраст белого текста на зоне текста ПОСЛЕ стража (число для сторожа «белый ≥ 4,6»).
 * Светлое — минимум по тем же точкам, что страж ensureContrast (x .06…94 × y .52…92). Тёмное — худшая средняя яркость строки зоны y .62…92 H (там затемнение стража уже полное),
 * с учётом затемнения стража (чёрный, альфа aBottom + .04 с 42 до 62 % высоты; модель яркости эталона: Y × (1 − a)^2,2).
 */
export function sceneTextZoneWhiteContrast(p: ScenePaletteResult): number {
  const { W, H } = p.size;
  if (!isSkyPalette(p)) {
    const paint = painter(p.spec, W, H);
    let mn = 99;
    for (const fy of [0.52, 0.6, 0.68, 0.76, 0.84, 0.92]) for (const fx of [0.06, 0.2, 0.35, 0.5, 0.65, 0.8, 0.94]) mn = Math.min(mn, whiteOn(paint(Math.round(fx * W), Math.round(fy * H))));
    return mn;
  }
  const probe: { rowY?: (y: number) => number } = {};
  guardSkyAnalytic(p.raw, W, H, p.stars.list, probe, p.warmEdge);
  const aB = p.guard.aBottom > 0 ? Math.min(0.7, p.guard.aBottom + 0.04) : 0;
  let mn = 99;
  for (let y = Math.round(H * 0.62); y <= H * 0.92; y += 6) {
    const yAfter = probe.rowY!(y) * Math.pow(1 - aB, 2.2);
    mn = Math.min(mn, 1.05 / (yAfter + 0.05));
  }
  return mn;
}
