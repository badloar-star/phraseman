// moment_firework_colors.ts — цвета искр фейерверка моментов Пика: оттенки текущей темы.
// зачем (закон владельца 22.10 «цвета — строго цвета и оттенки текущей темы»; 4 · ТЕМЫ через координатора): пять искр — шаги светлоты
// и насыщенности ТОГО ЖЕ тона, что акцент темы. Прежде — пять HEX образца, затем смысловые роли (золото, «хорошо», «инфо»): их тона
// одинаковы во всех темах и не совпадают с темой; затем ±18–36° вокруг акцента — снято замком ниже. Чистый модуль — сторож проверяет
// все темы без отрисовки.
// ЗАМОК ВЛАДЕЛЬЦА 22.10: «искры = оттенок темы, без сдвига тона» — тон каждой искры равен тону акцента; сторож
// tests/moment_firework_theme_shades.test.ts, реестр docs/work/OWNER_LOCKS.md. Ослабить — только по новому слову владельца.
import { oklchToHex } from '../../../constants/liquidGlassColor';
import { hueOfHex } from '../../../constants/liquidGlassPaletteRoles';
import type { GlassTokens } from '../../../constants/liquidGlassThemePalette';

/**
 * [светлота в тёмной, светлота в светлой, доля насыщенности]. В светлых темах искры темнее — читаются на светлом фоне;
 * в «Спокойно» насыщенность почти нулевая — искры серебристые в тон темы, как и вся спокойная тема.
 */
const SPARK_STEPS: readonly (readonly [dark: number, light: number, chroma: number])[] = [
  [0.9, 0.62, 0.7],
  [0.82, 0.54, 1],
  [0.74, 0.7, 0.9],
  [0.66, 0.48, 1.1],
  [0.97, 0.8, 0.25],
];
const CHROMA_CALM = 0.03;
const CHROMA_VIVID = 0.13;

/** Линейные sRGB-каналы цвета OKLCH без обрезки (та же формула, что oklchToHex) — влезает ли цвет в охват экрана. */
function inSrgbGamut(lightness: number, chroma: number, hue: number): boolean {
  const h = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(h);
  const b = chroma * Math.sin(h);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].every((channel) => channel >= -1e-4 && channel <= 1 + 1e-4);
}

/**
 * Наибольшая насыщенность ≤ want, при которой цвет ТОГО ЖЕ тона ещё в охвате sRGB.
 * зачем (замок «без сдвига тона»): у светлых искр синих тем обрезка каналов уводила тон к голубому на 16–26° — насыщенность
 * уменьшаем до границы охвата, тон остаётся тоном акцента.
 */
function gamutChroma(lightness: number, want: number, hue: number): number {
  if (inSrgbGamut(lightness, want, hue)) return want;
  let lo = 0;
  let hi = want;
  for (let i = 0; i < 18; i += 1) {
    const mid = (lo + hi) / 2;
    if (inSrgbGamut(lightness, mid, hue)) lo = mid;
    else hi = mid;
  }
  return lo;
}

export function momentFireworkColors(g: Pick<GlassTokens, 'accentGraphic' | 'isLight' | 'level'>): readonly string[] {
  // токена нет (старая тема, заглушка) — момент не падает: запасной тон hueOfHex, причина в журнал
  const source = typeof g.accentGraphic === 'string' ? g.accentGraphic : '';
  if (!source) console.warn('[MOMENT-FIREWORK] нет accentGraphic темы → запасной тон искр'); // guard-ok: ранний запасной путь называет причину
  const hue = hueOfHex(source);
  const chroma = g.level === 'calm' ? CHROMA_CALM : CHROMA_VIVID;
  return SPARK_STEPS.map(([dark, light, k]) => {
    const lightness = g.isLight ? light : dark;
    return oklchToHex(lightness, gamutChroma(lightness, chroma * k, hue), hue);
  });
}
