/**
 * Краски «Панели» (макет docs/design/v2-app/mistakes-panel.html).
 *
 * зачем (владелец: раздел «Мои ошибки» — 1 в 1 с макетом): формулы цвета и кромок взяты замером макета, а не на глаз.
 * Два цвета темы (--g1/--g2 макета) лежат в пятнах фона bgGlow; у светлых тем пятен нет — запасной путь через акцент.
 */
import type { BoxShadowValue } from 'react-native';

import type { GlassTokens } from '../../constants/liquidGlassThemePalette';

/** Смешивает цвет темы с тёмным основанием (как color-mix макета: доля темы + основание). */
export function mixDark(hex: string, base: string, t: number): string {
  const c = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = c(hex.length >= 7 ? hex : '#888888');
  const b = c(base);
  return `#${a.map((v, i) => Math.round(v * t + b[i]! * (1 - t)).toString(16).padStart(2, '0')).join('')}`;
}

/** Два цвета темы для градиентов. */
export function themePair(g: GlassTokens): readonly [string, string] {
  const glow = g.bgGlow;
  if (glow && glow[0] && glow[1] && glow[0].slice(1, 7) !== '000000' && glow[1].slice(1, 7) !== '000000') {
    return [glow[0].slice(0, 7), glow[1].slice(0, 7)];
  }
  const gr = g.accentGradient;
  if (gr && gr.length >= 2) return [gr[0]!, gr[gr.length - 1]!];
  return [g.accent, g.accentBorder];
}

/** Внутренняя «кромка» макета (границ нет): тонкое кольцо 1px. */
export const ringShadow = (ring: string): BoxShadowValue[] => [
  { inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: ring },
];

/** Подсветка сверху-слева + тень снизу-справа + кольцо — как у карточек макета. */
// зачем (замечание владельца 10.10): нижняя кромка — токен темы (bevelLo); литерал остался только значением по умолчанию для старых вызовов.
export const bevelShadow = (hi: string, ring: string, lo: string = 'rgba(0,0,0,0.45)' /* theme-exempt: значение по умолчанию */): BoxShadowValue[] => [
  { inset: true, offsetX: 1, offsetY: 1.5, blurRadius: 0, spreadDistance: -0.2, color: hi },
  { inset: true, offsetX: -1, offsetY: -1.5, blurRadius: 0, spreadDistance: -0.2, color: lo },
  { inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: ring },
];

/** Заливка стеклянной карточки 150°: цвета темы в тёмной базе темы (deepBase), середина — база с альфой 0.58. */
export const glassFillColors = (g: GlassTokens, a: string, b: string) =>
  [`${mixDark(a, g.deepBase, 0.17)}B0`, `${g.deepBase}94`, `${mixDark(b, g.deepBase, 0.17)}A3`] as const;

/** Заливка плитки-значка 145°: цвет темы 60 % / 32 % в базах темы. */
export const iconTileColors = (g: GlassTokens, a: string, b: string) =>
  [mixDark(a, g.deepBase, 0.6), mixDark(b, g.deepBaseAlt, 0.32)] as const;

/** Диагонали 150° и 170° макета в долях бокса. */
export const DIAG_150 = { start: { x: 0.25, y: 0.07 }, end: { x: 0.75, y: 0.93 } } as const;
export const DIAG_170 = { start: { x: 0.42, y: 0.01 }, end: { x: 0.58, y: 0.99 } } as const;

export const MP_COLORS = {
  ok: '#6FD08C',
  okText: '#8DEBB0',
  bad: '#F2766B',
  badText: '#FF9C93',
  hairline: 'rgba(255,255,255,0.07)',
  chip: 'rgba(255,255,255,0.07)',
  track: 'rgba(255,255,255,0.1)',
  ghost: 'rgba(255,255,255,0.1)',
} as const;
