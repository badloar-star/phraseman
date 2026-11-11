// ═══════════════════════════════════════════════════════════════════════════
// aurora_material.ts — материал «Аврора» со сценой «Рассвет»: все его цвета из оттенка и насыщенности темы.
//
// зачем (слово владельца 11.11: «супер, вот так очень нравится, утверждаем — точно так должно быть в приложении, точно как на макетах, 1 в 1»;
// утверждённый макет — docs/work/mockups/home-luxe-2026-11-11/aurora_rassvet.html): это ДОСЛОВНЫЙ перенос функции compute() макета. Порядок действий,
// константы и стражи контраста те же, поэтому сторож tests/aurora_material.test.ts сверяет цвета с числами, снятыми с макета, без допуска.
//
// Правила материала (как в макете):
//  • три ступени тона — фон экрана (самый глубокий), плашка (заметно светлее и спокойнее по цвету), вложенная плашка (ещё светлее);
//    разницу держит страж: в тёмном плашка светлеет, пока контраст с самым светлым местом фона (под пятном света) не станет ≥ 2,4;
//    в светлом фон темнеет от белой плашки до ≥ 1,6 (владелец выбрал «контраст плашек 100 %»);
//  • цветность считается ТОЛЬКО из ползунка насыщенности (0 % → 0, чистый серый) и оттенка ползунка, а не из оттенка акцента:
//    у серого акцента оттенок случайный (отсюда был жёлто-зелёный при низкой насыщенности — слово владельца 11.11);
//  • сцена «Рассвет» — три тона вокруг оттенка темы и тёплый свет снизу справа; страж держит белые подписи на сцене ≥ 4,6.
//
// Чистый модуль без React и сети. Материал есть только у тем-ползунков (`tune:H:S`); у остальных тем — null, они рисуются как раньше.
// ═══════════════════════════════════════════════════════════════════════════
import { oklchToHex } from './liquidGlassColor';
import { parseThemeTuneId } from './theme_tune';
import { AURORA_MATERIAL_ENABLED } from './aurora_material_flag';

// Выключатель живёт в отдельном модуле (aurora_material_flag.ts) — тесты подменяют его.
export { AURORA_MATERIAL_ENABLED } from './aurora_material_flag';

/** Сила разницы «фон ↔ плашка», 0…1. Владелец выбрал 100 % (макет, ползунок «Контраст плашек»). */
export const AURORA_PLATE_CONTRAST = 1;

export type AuroraAppearance = 'dark' | 'light';

export type AuroraMaterial = Readonly<{
  /** Фон экрана сверху вниз: верх, середина (60 % высоты), низ. */
  bgTop: string;
  bg: string;
  bgBottom: string;
  /** Два мягких пятна света на фоне (rgba). */
  bgGlow1: string;
  bgGlow2: string;
  /** Плашка: градиент 148° от cardFrom (верх-лево) к cardTo (62 % пути и дальше). */
  cardFrom: string;
  cardTo: string;
  /** Вложенная плашка: значки, пилюли, кнопки внутри плашки. */
  control: string;
  /** Вторичный текст на плашках (в тёмном светлее обычного); null — оставить токен темы. */
  secondary: string | null;
  /** Тень плашки: цвет основного слоя и мягкого слоя (мягкий — только в светлом). */
  shadow: string;
  shadowSoft: string | null;
  /** Главное действие вне сцены: градиент 98° и чернила на нём. */
  ctaFrom: string;
  ctaTo: string;
  ctaInk: string;
  ctaGlow: string;
  /** Цветные значки (подложка значка задания, строки настроек): градиент 150°, значок белый. */
  chipFrom: string;
  chipTo: string;
  /** Стекло плиток Главной без размытия: верх повторяет низ сцены, низ — тон плашки; два мягких пятна света. */
  frostTop: string;
  frostMid: string;
  frostBottom: string;
  frostGlow1: string;
  frostGlow2: string;
  /** Сцена «Рассвет». */
  scene: Readonly<{
    /** Градиент 168°: 0 %, 55 %, 100 %. */
    top: string;
    mid: string;
    bottom: string;
    /** Тёплый свет: эллипс 78 % × 76 % с центром (84 %, 104 %), гаснет к 70 % радиуса. */
    sun: string;
    sunAlpha: number;
    /** Пройденные дни на сцене: градиент 150° и чернила огонька. */
    dayFrom: string;
    dayTo: string;
    dayInk: string;
    dayGlow: string;
    /** Тёмная главная кнопка сцены и её тень. */
    ink: string;
    inkShadow: string;
    /** Контраст белого текста в зоне подписей дней (после стража). */
    whiteContrast: number;
  }>;
  /** Итог стражей: контраст плашки с фоном и вложенной плашки с плашкой. */
  plateContrast: number;
  controlContrast: number;
}>;

// ───────────────────────── помощники (те же, что в макете) ─────────────────────────
const wrapHue = (h: number): number => ((h % 360) + 360) % 360;
/** OKLCH → #RRGGBB тем же преобразованием, что у всех тем приложения. */
const ok = (L: number, C: number, H: number): string => oklchToHex(L, Math.max(0, C), wrapHue(H));
const rgbOf = (hex: string): readonly [number, number, number] => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (hex: string, a: number): string => {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${a})`;
};
const lum = (hex: string): number => {
  const s = rgbOf(hex).map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * s[0]! + 0.7152 * s[1]! + 0.0722 * s[2]!;
};
const whiteOn = (hex: string): number => 1.05 / (lum(hex) + 0.05);
const ratio = (a: string, b: string): number => {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const mix = (a: string, b: string, k: number): string => {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return `#${x.map((v, i) => Math.round(v + (y[i]! - v) * k).toString(16).padStart(2, '0')).join('')}`;
};

/** «Сочная» цветность украшений из насыщенности 0…1: 0 при 0 %, ≈ 0,105 при стандартных 35 %, 0,21 при 100 %. */
const vividChroma = (sat: number): number => 0.21 * (1 - Math.pow(1 - sat, 1.6));
/** Стандартная насыщенность (35 %) — до неё формулы макета не тронуты. */
const AURORA_SAT_STANDARD = 0.35;
const CV_STANDARD = vividChroma(AURORA_SAT_STANDARD);
const CV_FULL = vividChroma(1);

/** Материал из оттенка (0…359°), насыщенности (0…100 %) и оформления — перенос compute() макета. */
export function auroraMaterial(hue: number, saturation: number, appearance: AuroraAppearance): AuroraMaterial {
  const dark = appearance === 'dark';
  const SH = hue;
  const sat = saturation / 100;
  // «сочная» цветность украшений: 0 при 0 %, ≈ 0,105 при стандартных 35 %, 0,21 при 100 %; основа сцены и фона — спокойнее
  const Cv = vividChroma(sat);
  const Cb = Cv / 1.45;
  // зачем (владелец 11.11: «насыщенность почти ничего не делает, есть только граничные состояния» → «да, растянуть»): в макете цветность поверхностей
  // была min(потолок, Cv · множитель) — потолок достигался уже к ~56–65 % насыщенности, и последняя треть ползунка ничего не меняла.
  // Теперь от 0 до стандартных 35 % формула прежняя, а от 35 % до 100 % цветность доходит до того же потолка ровно к 100 %:
  // цвета при 0 %, 35 % и 100 % остались байт-в-байт как в утверждённом макете, изменилась только середина — ползунок работает на всей длине.
  const rise = (cap: number, factor: number): number => {
    if (sat <= AURORA_SAT_STANDARD) return Math.min(cap, Cv * factor);
    const from = Math.min(cap, CV_STANDARD * factor);
    return from + (cap - from) * ((Cv - CV_STANDARD) / (CV_FULL - CV_STANDARD));
  };

  const a1c = ok(0.64, Cv, SH + 52);
  const ctaFrom = ok(0.88, rise(0.1, 0.6), SH - 24);
  const ctaTo = ok(0.93, rise(0.09, 0.5), SH + 44);

  // три ступени тона и их страж
  const K = AURORA_PLATE_CONTRAST;
  const target = dark ? 1.5 + 0.9 * K : 1.2 + 0.4 * K;
  const pgTop = dark ? ok(0.115 - 0.07 * K, Cb * 0.9, SH - 10) : ok(0.925 - 0.04 * K, rise(0.07, 0.45), SH - 6);
  let pgL = 0.905;
  const pgC = rise(0.07, 0.45);
  let pgMid = dark ? ok(0.085 - 0.05 * K, Cb * 0.8, SH) : ok(pgL, pgC, SH);
  const glowA = dark ? 0.22 - 0.13 * K : 0.5 - 0.15 * K;
  const glow1 = ok(dark ? 0.34 : 0.84, Cv * 0.8, SH + 50);
  const glow2 = ok(dark ? 0.3 : 0.84, Cv * 0.8, SH - 40);
  let Lc = 0.27;
  const cardOf = (L: number): [string, string] => [ok(L + 0.05, rise(0.05, 0.32), SH + 30), ok(L, rise(0.04, 0.26), SH)];
  let card: [string, string] = dark ? cardOf(Lc) : ['#FFFFFF', ok(0.99, rise(0.008, 0.06), SH + 30)];
  if (dark) {
    const worst = mix(pgTop, glow1, glowA);
    while (ratio(card[1], worst) < target && Lc < 0.44) {
      Lc += 0.01;
      card = cardOf(Lc);
    }
  } else {
    while (ratio(card[1], pgMid) < target && pgL > 0.845) {
      pgL -= 0.005;
      pgMid = ok(pgL, pgC, SH);
    }
  }
  const control = dark ? ok(Lc + 0.14, rise(0.05, 0.3), SH) : ok(0.905, rise(0.035, 0.28), SH);
  const plateContrast = ratio(card[1], dark ? mix(pgTop, glow1, glowA) : pgMid);

  // сцена «Рассвет»
  const Cs = rise(0.11, 0.7);
  const sun = ok(0.88, rise(0.1, 0.6), SH + 55);
  const sun2 = ok(0.8, rise(0.13, 0.75), SH + 38);
  const sA = ok(0.34, Cs, SH - 18);
  const sB = ok(0.46, Cs, SH + 14);
  const sC = ok(0.56, Cs * 0.9, SH + 40);
  let orbA = 0.62;
  while (whiteOn(mix(sB, sun, orbA * 0.45)) < 4.6 && orbA > 0.1) orbA -= 0.04;
  const ink = ok(0.17, Cs * 0.5, SH);

  // стекло плиток: верх — низ рассветной сцены, низ — тон плашки
  const frostBottomHex = dark ? card[0] : '#FFFFFF';
  const tileTop = mix(sC, sun, orbA * 0.35);
  const shadowHex = dark ? ok(0.04, Cb * 0.4, SH) : ok(0.4, Cv * 0.7, SH);

  return Object.freeze({
    bgTop: pgTop,
    bg: pgMid,
    bgBottom: dark ? ok(0.1 - 0.06 * K, Cb * 0.8, SH + 8) : ok(pgL + 0.01, pgC, SH + 8),
    bgGlow1: rgba(glow1, glowA),
    bgGlow2: rgba(glow2, glowA),
    cardFrom: card[0],
    cardTo: card[1],
    control,
    secondary: dark ? ok(0.88, rise(0.03, 0.2), SH) : null,
    shadow: rgba(shadowHex, dark ? 0.95 : 0.34),
    shadowSoft: dark ? null : rgba(shadowHex, 0.1),
    ctaFrom,
    ctaTo,
    ctaInk: ok(0.2, Cb * 0.6, SH),
    ctaGlow: rgba(ok(0.7, Cv, SH + 10), 0.55),
    chipFrom: ok(0.52, Cv, SH - 24),
    chipTo: ok(0.42, Cv, SH + 34),
    frostTop: rgba(tileTop, 0.96),
    frostMid: rgba(mix(tileTop, frostBottomHex, 0.5), 0.96),
    frostBottom: rgba(frostBottomHex, 0.96),
    frostGlow1: rgba(a1c, dark ? 0.2 : 0.18),
    frostGlow2: rgba(ok(0.56, Cv, SH - 46), dark ? 0.16 : 0.12),
    scene: Object.freeze({
      top: sA,
      mid: sB,
      bottom: sC,
      sun,
      sunAlpha: orbA,
      dayFrom: sun,
      dayTo: sun2,
      dayInk: ok(0.22, Cs * 0.6, SH + 30),
      dayGlow: rgba(sun2, 0.5),
      ink,
      inkShadow: rgba(ink, 0.8),
      whiteContrast: whiteOn(mix(sB, sun, orbA * 0.45)),
    }),
    plateContrast,
    controlContrast: ratio(control, card[1]),
  });
}

const cache = new Map<string, AuroraMaterial>();
const CACHE_LIMIT = 48;

/**
 * Материал темы по её идентификатору. null — материал выключен или тема не из ползунков (именная, премиальная): такие темы рисуются прежними токенами.
 * Кэш модуля с потолком: считается один раз на (тема, оформление), перерисовки расчёта не повторяют.
 */
export function auroraMaterialForTheme(themeId: unknown, appearance: AuroraAppearance): AuroraMaterial | null {
  if (!AURORA_MATERIAL_ENABLED) return null;
  const tune = parseThemeTuneId(themeId);
  if (!tune) return null;
  const key = `${tune.H}|${tune.S}|${appearance}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const value = auroraMaterial(tune.H, tune.S, appearance);
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return value;
}
