function routeName(...parts: string[]): string {
  return parts.join('_');
}

export const POS_ANALYTICS_AUDIT_ROUTE_NAME = routeName('pos', 'analytics', 'audit');
export const PHONE_STATE_SQLCIPHER_SMOKE_ROUTE_NAME = routeName('_phone', 'state', 'sqlcipher', 'smoke');
// зачем: витрина «Движение · все поверхности» заменила старую Motion Lab
// (решение владельца 2026-08-16): пункты запускают РЕАЛЬНЫЕ экраны/модалки.
export const MOTION_SHOWCASE_ROUTE_NAME = routeName('motion', 'showcase');
// зачем (владелец, 24.08): витрина сценариев ОТПИСКИ — шаг удержания при отмене
// подписки нельзя проверить руками без настоящей платной подписки. Экран чисто
// служебный, поэтому живёт в DEV_UTILITY_ROUTE_NAMES и в релиз не попадает.
export const CANCEL_FLOW_PREVIEW_ROUTE_NAME = routeName('_dev', 'cancel', 'flow', 'preview');
// зачем (владелец, 25.08): ОТДЕЛЬНЫЙ подраздел DEV Hub — не встроенный список
// внутри «Движение · все поверхности», а свой собственный пункт со списком
// 7 одобренных режимов, каждый открывается ПОЛНОЭКРАННЫМ работающим маршрутом.
export const DIALOGUE_V2_VISUAL_FIXTURE_ROUTE_NAME = routeName('dialogue', 'v2', 'visual', 'fixture');

export const POS_ANALYTICS_AUDIT_ROUTE = `/${POS_ANALYTICS_AUDIT_ROUTE_NAME}`;
export const PHONE_STATE_SQLCIPHER_SMOKE_ROUTE = `/${PHONE_STATE_SQLCIPHER_SMOKE_ROUTE_NAME}`;
export const MOTION_SHOWCASE_ROUTE = `/${MOTION_SHOWCASE_ROUTE_NAME}`;
export const CANCEL_FLOW_PREVIEW_ROUTE = `/${CANCEL_FLOW_PREVIEW_ROUTE_NAME}`;
export const DIALOGUE_V2_VISUAL_FIXTURE_ROUTE = `/${DIALOGUE_V2_VISUAL_FIXTURE_ROUTE_NAME}`;
/**
 * зачем (владелец, 24.08): магазин — будущий БОЕВОЙ экран, но пока без входа из
 * приложения. Единственная дверь — пункт в DEV-центре. Поэтому маршрут обычный
 * (`/shop`), а НЕ в DEV_UTILITY_ROUTE_NAMES: те прячутся из сборки, а магазин
 * должен просто получить вход в навигацию, когда его примут.
 */
export const SHOP_ROUTE = '/shop';
/** DEV-превью экранов Шпиля на моках (app/dev_spire_preview.tsx): в релизе уводит на Главную. */
export const SPIRE_PREVIEW_ROUTE = '/dev_spire_preview';
/** DEV-превью «моментов вовлечения» Пика на моках (app/dev_moments_preview.tsx): в релизе уводит на Главную. */
export const MOMENTS_PREVIEW_ROUTE = '/dev_moments_preview';

export const DEV_UTILITY_ROUTE_NAMES = [
  POS_ANALYTICS_AUDIT_ROUTE_NAME,
  MOTION_SHOWCASE_ROUTE_NAME,
  PHONE_STATE_SQLCIPHER_SMOKE_ROUTE_NAME,
  CANCEL_FLOW_PREVIEW_ROUTE_NAME,
  DIALOGUE_V2_VISUAL_FIXTURE_ROUTE_NAME,
] as const;

export const DEV_UTILITY_ROUTE_PATHS = DEV_UTILITY_ROUTE_NAMES.map((name) => `/${name}`);
