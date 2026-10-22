// moment_firework_colors.ts — цвета искр фейерверка моментов Пика: оттенки текущей темы.
// зачем (закон владельца 22.10 «цвета — строго цвета и оттенки текущей темы»; 4 · ТЕМЫ через координатора): пять искр — шаги светлоты
// и насыщенности вокруг тона акцента темы (±18–36°), как seasonThemedArt у карт эпизодов. Прежде — пять HEX образца, затем смысловые роли
// (золото, «хорошо», «инфо»): их тона одинаковы во всех темах и не совпадают с темой. Чистый модуль — сторож проверяет все темы без отрисовки.
import { oklchToHex } from '../../../constants/liquidGlassColor';
import { hueOfHex } from '../../../constants/liquidGlassPaletteRoles';
import type { GlassTokens } from '../../../constants/liquidGlassThemePalette';

/**
 * [светлота в тёмной, светлота в светлой, доля насыщенности, сдвиг тона]. В светлых темах искры темнее — читаются на светлом фоне;
 * в «Спокойно» насыщенность почти нулевая — искры серебристые в тон темы, как и вся спокойная тема.
 */
const SPARK_STEPS: readonly (readonly [dark: number, light: number, chroma: number, hueShift: number])[] = [
  [0.9, 0.62, 0.7, 0],
  [0.82, 0.54, 1, 18],
  [0.74, 0.7, 0.9, -18],
  [0.66, 0.48, 1.1, 36],
  [0.97, 0.8, 0.25, 0],
];
const CHROMA_CALM = 0.03;
const CHROMA_VIVID = 0.13;

export function momentFireworkColors(g: Pick<GlassTokens, 'accentGraphic' | 'isLight' | 'level'>): readonly string[] {
  // токена нет (старая тема, заглушка) — момент не падает: запасной тон hueOfHex, причина в журнал
  const source = typeof g.accentGraphic === 'string' ? g.accentGraphic : '';
  if (!source) console.warn('[MOMENT-FIREWORK] нет accentGraphic темы → запасной тон искр'); // guard-ok: ранний запасной путь называет причину
  const hue = hueOfHex(source);
  const chroma = g.level === 'calm' ? CHROMA_CALM : CHROMA_VIVID;
  return SPARK_STEPS.map(([dark, light, k, shift]) => oklchToHex(g.isLight ? light : dark, chroma * k, (hue + shift + 360) % 360));
}
