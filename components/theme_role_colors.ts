// ═══════════════════════════════════════════════════════════════════════════
// theme_role_colors.ts — три «ролевых» цвета (подлежащее / связка / смысловая форма) из акцента ТЕКУЩЕЙ темы.
//
// зачем (владелец 28.10: «везде по цвету темы»; координатор: «роли грамматики и панель награды опроса — оттенки/сдвиги тона от акцента темы,
// роли остаются различимыми, текст ≥ 4,5:1»): разбор теории и интро урока красили роли фиксированными фиолетовым / янтарным / бирюзовым
// (#6D28D9, #B45309, #0F766E…), панель опроса — фиолетовой галочкой, при любой теме. Теперь оттенок = оттенок акцента темы, роли — сдвиги
// тона на 0° / +120° / +240° и разная светлота. Текст каждой роли ≥ 4,5:1 к поверхности (светлота подбирается шагами), различимость ролей между собой —
// расстояние в OKLab ≥ ROLE_MIN_DISTANCE. Попарный контраст 3:1 между тремя светлыми текстами на тёмной карточке математически недостижим
// (светлейший ≤ ~4,7:1 к карточке), поэтому различимость измеряется расстоянием цветов, а не контрастом.
// У серой темы насыщенность ролей не падает ниже ROLE_MIN_CHROMA — иначе три роли слились бы в один серый. Чистый модуль без React;
// страж — tests/theme_role_colors_guard.test.ts (все темы × оформления).
// ═══════════════════════════════════════════════════════════════════════════
import { homeSceneFromOklch, homeSceneOklchOf, relativeLuminance } from './home/v2/scene/home_scene_tokens';

export type ThemeRoleColors = Readonly<{
  subject: string;
  link: string;
  verb: string;
  /** Формула в тексте (интро, разбор): тот же цвет, что у подлежащего. */
  formula: string;
  /** Полупрозрачные подложки под ролевыми словами. */
  subjectBg: string;
  linkBg: string;
  verbBg: string;
}>;

/** Минимальная насыщенность роли: у серой темы три роли всё ещё различимы. */
export const ROLE_MIN_CHROMA = 0.075;
export const ROLE_MAX_CHROMA = 0.16;
/** Контраст текста роли к поверхности (WCAG AA). */
export const ROLE_TEXT_MIN_CONTRAST = 4.5;
/** Минимальное расстояние между ролями в OKLab (светлота и оттенок вместе). */
export const ROLE_MIN_DISTANCE = 0.1;
const HUE_STEPS = [0, 120, 240] as const;
/** Стартовая светлота ролей: тёмная поверхность — светлые тона, светлая — глубокие; дальше подбирается под контраст. */
const START_LIGHTNESS = { dark: [0.8, 0.88, 0.74], light: [0.46, 0.52, 0.4] } as const;
/** Оттенок запасного варианта, если акцент не hex: нейтральный сине-серый, а не фиолетовый. */
const FALLBACK_HUE = 250;
const HEX6 = /^#([0-9a-f]{6})$/i;
type Rgb = readonly [number, number, number];

const rgbOf = (hex: string): Rgb | null => {
  const m = HEX6.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hexOf = (c: Rgb): string => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
const norm = (h: number): number => ((h % 360) + 360) % 360;

function contrastOf(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return 1;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** '#rrggbb' + прозрачность → rgba(...); не hex — строка как есть. */
export function themeRoleAlpha(hex: string, alpha: number): string {
  const rgb = rgbOf(hex);
  return rgb ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})` : hex;
}

/** Один цвет роли: оттенок/насыщенность заданы, светлота сдвигается от стартовой, пока текст не наберёт нужный контраст к поверхности. */
function roleColor(hue: number, chroma: number, startL: number, surface: string, isLight: boolean): string {
  const dir = isLight ? -0.01 : 0.01;
  let l = startL;
  let best = hexOf(homeSceneFromOklch(l, chroma, hue));
  for (let i = 0; i < 45; i += 1) {
    best = hexOf(homeSceneFromOklch(l, chroma, hue));
    if (contrastOf(best, surface) >= ROLE_TEXT_MIN_CONTRAST) return best;
    l += dir;
  }
  return best;
}

const cache = new Map<string, ThemeRoleColors>();

/**
 * Цвета ролей для акцента темы (`accent`), поверхности под текстом (`surface`, карточка/фон) и оформления.
 * Результат мемоизируется по (акцент, поверхность, оформление): считается один раз на тему, а не на каждый кадр.
 */
export function themeRoleColors(accent: string, surface: string, isLight: boolean): ThemeRoleColors {
  const surfaceHex = HEX6.test(surface) ? surface : isLight ? '#FFFFFF' : '#000000';
  const key = `${accent}|${surfaceHex}|${isLight ? 'l' : 'd'}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const accentRgb = rgbOf(accent);
  const [, c, h] = accentRgb ? homeSceneOklchOf(accentRgb) : [0, 0, FALLBACK_HUE];
  const chroma = Math.max(ROLE_MIN_CHROMA, Math.min(ROLE_MAX_CHROMA, c));
  const starts = START_LIGHTNESS[isLight ? 'light' : 'dark'];
  const [subject, link, verb] = HUE_STEPS.map((step, i) => roleColor(norm(h + step), chroma, starts[i], surfaceHex, isLight)) as [string, string, string];
  const bgAlpha = isLight ? 0.12 : 0.13;
  const next: ThemeRoleColors = Object.freeze({
    subject,
    link,
    verb,
    formula: subject,
    subjectBg: themeRoleAlpha(subject, bgAlpha),
    linkBg: themeRoleAlpha(link, bgAlpha),
    verbBg: themeRoleAlpha(verb, bgAlpha),
  });
  cache.set(key, next);
  return next;
}
