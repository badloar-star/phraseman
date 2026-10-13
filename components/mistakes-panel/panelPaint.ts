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
  return [g.accentGraphic, g.accentBorder]; // зачем (светлый акцент): запасной градиент кольца — графика
}

// зачем (владелец 12.10, «второй вариант делаем», стиль «Тень»): контейнеры БЕЗ обводок и внутренних кромок. Прежние `ringShadow`/`bevelShadow`
// рисовали кольцо 1px и фаски `inset` — теперь возвращают пустой список, чтобы ни один вызов не вернул кромку. Вызовы вычищаются по экранам;
// плашку делают заливка и тень из components/v2/ShadowSurface.
/** @deprecated Кромок больше нет — всегда пустой список. */
export const ringShadow = (_ring?: string): BoxShadowValue[] => [];

/** @deprecated Кромок больше нет — всегда пустой список. */
export const bevelShadow = (_hi?: string, _ring?: string, _lo?: string): BoxShadowValue[] => [];

/** Заливка стеклянной карточки 150°: цвета темы в тёмной базе темы (deepBase), середина — база с альфой 0.58. */
export const glassFillColors = (g: GlassTokens, a: string, b: string) =>
  [`${mixDark(a, g.deepBase, 0.17)}B0`, `${g.deepBase}94`, `${mixDark(b, g.deepBase, 0.17)}A3`] as const;

/** Заливка плитки-значка 145°: цвет темы 60 % / 32 % в базах темы. */
// зачем (координатор 13.10, cards-v2-027; образец «Тени» — плитки значков плоские нейтральные, `.tile` #242426): в ТЁМНОМ плитка значка нейтральная при любой теме
// (у «Авроры» был градиент зелёный→фиолетовый); в светлом — прежний цвет темы.
export const iconTileColors = (g: GlassTokens, a: string, b: string) =>
  g.isLight
    ? ([mixDark(a, g.deepBase, 0.6), mixDark(b, g.deepBaseAlt, 0.32)] as const)
    : (['#33333A', '#2B2B31'] as const);

/** Диагонали 150° и 170° макета в долях бокса. */
export const DIAG_150 = { start: { x: 0.25, y: 0.07 }, end: { x: 0.75, y: 0.93 } } as const;
export const DIAG_170 = { start: { x: 0.42, y: 0.01 }, end: { x: 0.58, y: 0.99 } } as const;

// зачем (релизный пол 10.10, чтение светлых тем): «верно/неверно» — токены темы good/bad (контраст ≥ 4.5 на карточке, фоне и плашке во всех
// 23 темах). Раньше были литералы #6FD08C/#F2766B: на белой карточке светлой темы светло-зелёный текст почти не читался.
// Текстовые оттенки (okText/badText) в тёмных темах чуть светлее — как в макете «Панели»; в светлых совпадают с основным тоном.
export type MpColors = Readonly<{ ok: string; okText: string; bad: string; badText: string }>;
const mpCache = new WeakMap<GlassTokens, MpColors>();
export function mpColors(g: GlassTokens): MpColors {
  const hit = mpCache.get(g);
  if (hit) return hit;
  const lift = (hex: string) => (g.isLight ? hex : mixDark(hex, g.mediaInk, 0.72));
  const colors: MpColors = Object.freeze({ ok: g.good, okText: lift(g.good), bad: g.bad, badText: lift(g.bad) });
  mpCache.set(g, colors);
  return colors;
}
