// зачем (решение координатора 25.10, вариант Б; правило владельца theme-colors-only): значок «непрочитано» был постоянным
// #EF4444 с белой цифрой — 3,76 при пороге 4,5 и мимо темы. Теперь один источник для конверта на Главной, точек в почте
// и в центре уведомлений: заливка — красный ТЕКУЩЕЙ темы (bad), при нехватке отличимости сдвигается к тексту темы
// (темнее в светлом, светлее в тёмном), пока не даст ≥ 3 к каждой поверхности, где лежит (сцена Главной, фон, шторка,
// карточка, контрол); цифра — текст или фон темы, что контрастнее, доведённый до ≥ 4,5. Сторож:
// tests/notification_badge_theme_paint_2026_10_25.test.ts (174 сочетания).
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver, legibleOn } from '../constants/liquidGlassSurfaceRoles';
import { colorContrast } from '../constants/color_contrast';
import { homeSceneTokensForTheme } from './home/v2/scene/home_scene_tokens';

export type NotificationBadgePaint = Readonly<{ fill: string; ink: string }>;
/** Где лежит значок: «scene» — конверт в шапке Главной (поверх сцены), «sheet» — точки в почте и в центре уведомлений. */
export type NotificationBadgePlace = 'scene' | 'sheet';

/** Минимум отличимости кружка от поверхности (не-текстовый контраст, WCAG 1.4.11). */
export const NOTIFICATION_BADGE_FILL_MIN = 3;
/** Минимум для цифры на кружке. */
export const NOTIFICATION_BADGE_INK_MIN = 4.5;

type Tokens = ReturnType<typeof liquidGlassTokens>;

/**
 * Поверхности под значком. Сцена Главной и светлая шторка лежат по разные стороны яркости — один тон не даёт ≥ 3 к обеим
 * (замер 25.10: 78 из 174), поэтому место задаётся явно.
 */
export function notificationBadgeSurfaces(themeId: string, g: Tokens, place: NotificationBadgePlace): string[] {
  if (place === 'scene') {
    const scene = homeSceneTokensForTheme(themeId, g.isLight ? 'light' : 'dark');
    return [scene.sceneTop, scene.sceneBottom].map((s) => flattenOver(s, g.bg));
  }
  const sheet = flattenOver(g.opaqueSheet, g.bg);
  // строка непрочитанного письма в центре уведомлений подсвечена glass.selected поверх шторки
  return [g.bg, g.bgTop, g.bgBottom, g.opaqueSheet, g.opaqueCard, g.opaqueControl].map((s) => flattenOver(s, g.bg))
    .concat(flattenOver(g.selected, sheet));
}

export function notificationBadgePaintFor(themeId: string, g: Tokens, place: NotificationBadgePlace): NotificationBadgePaint {
  const surfaces = notificationBadgeSurfaces(themeId, g, place);
  // к тексту темы (темнее в светлом, светлее в тёмном); не вышло — в обратную сторону
  const away = legibleOn(g.bad, g.text, surfaces, NOTIFICATION_BADGE_FILL_MIN);
  const fill = surfaces.every((s) => colorContrast(away, s.slice(0, 7)) >= NOTIFICATION_BADGE_FILL_MIN)
    ? away
    : legibleOn(g.bad, g.bg, surfaces, NOTIFICATION_BADGE_FILL_MIN);
  const toward = colorContrast(g.text.slice(0, 7), fill) >= colorContrast(g.bg.slice(0, 7), fill) ? g.text : g.bg;
  const ink = legibleOn(toward, toward, [fill], NOTIFICATION_BADGE_INK_MIN);
  return { fill, ink };
}

const cache = new Map<string, NotificationBadgePaint>();

/** Краска значка для активной темы; кэш по теме, уровню и оформлению. */
export function notificationBadgePaint(themeId: string, place: NotificationBadgePlace): NotificationBadgePaint {
  const g = liquidGlassTokens(themeId);
  const key = `${themeId}|${g.level}|${g.appearance}|${g.intensity}|${place}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const paint = notificationBadgePaintFor(themeId, g, place);
  cache.set(key, paint);
  return paint;
}
