function routeName(...parts: string[]): string {
  return parts.join('_');
}

export const POS_ANALYTICS_AUDIT_ROUTE_NAME = routeName('pos', 'analytics', 'audit');
export const FLASHCARDS_MARKET_DEV_ROUTE_NAME = routeName('flashcards', 'market', 'dev');
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
export const LEARNING_V2_MODES_SHOWCASE_ROUTE_NAME = routeName('learning', 'v2', 'modes', 'showcase');
export const LEARNING_V2_AUTHORING_PREVIEW_ROUTE_NAME = routeName('learning', 'v2', 'authoring', 'preview');
// зачем: полноэкранный runner — вложенный каталог с динамическим [family],
// поэтому здесь регистрируется только ПАПКА (Stack.Screen по имени каталога
// работает так же, как по имени файла — тот же паттерн, что LEARNING_V2_ROUTE_PREFIX).
export const LEARNING_V2_MODES_SHOWCASE_RUN_DIR_NAME = routeName('learning', 'v2', 'modes', 'showcase', 'run');

export const POS_ANALYTICS_AUDIT_ROUTE = `/${POS_ANALYTICS_AUDIT_ROUTE_NAME}`;
export const FLASHCARDS_MARKET_DEV_ROUTE = `/${FLASHCARDS_MARKET_DEV_ROUTE_NAME}`;
export const PHONE_STATE_SQLCIPHER_SMOKE_ROUTE = `/${PHONE_STATE_SQLCIPHER_SMOKE_ROUTE_NAME}`;
export const MOTION_SHOWCASE_ROUTE = `/${MOTION_SHOWCASE_ROUTE_NAME}`;
export const CANCEL_FLOW_PREVIEW_ROUTE = `/${CANCEL_FLOW_PREVIEW_ROUTE_NAME}`;
export const LEARNING_V2_MODES_SHOWCASE_ROUTE = `/${LEARNING_V2_MODES_SHOWCASE_ROUTE_NAME}`;
export const LEARNING_V2_AUTHORING_PREVIEW_ROUTE = `/${LEARNING_V2_AUTHORING_PREVIEW_ROUTE_NAME}`;
/**
 * зачем (владелец, 25.08): Learning V2 временно доступен только владельцу в
 * dev/internal сборке, сессии курса ещё дописываются параллельно. Это НЕ
 * `DEV_UTILITY_ROUTE_NAME` (та группа регистрируется как плоский `Stack.Screen`
 * по имени файла и в релизе не рендерится вовсе) — `learning-v2/*` живёт как
 * обычный вложенный expo-router каталог (course, session/[id], lesson/[id]),
 * поэтому здесь только ПУТЬ-префикс для отдельной проверки диплинка в
 * `_layout.tsx` (`isDevUtilityRoutePath`-подобный guard). Экраны внутри сами
 * себя не защищали — только `course.tsx` и `intro-reader-fixture.tsx` получили
 * прямой `ENABLE_DEV_TOOLS` guard в этом же коммите.
 */
export const LEARNING_V2_ROUTE_PREFIX = '/learning-v2';
/**
 * зачем (владелец, 24.08): магазин — будущий БОЕВОЙ экран, но пока без входа из
 * приложения. Единственная дверь — пункт в DEV-центре. Поэтому маршрут обычный
 * (`/shop`), а НЕ в DEV_UTILITY_ROUTE_NAMES: те прячутся из сборки, а магазин
 * должен просто получить вход в навигацию, когда его примут.
 */
export const SHOP_ROUTE = '/shop';

export const DEV_UTILITY_ROUTE_NAMES = [
  POS_ANALYTICS_AUDIT_ROUTE_NAME,
  MOTION_SHOWCASE_ROUTE_NAME,
  PHONE_STATE_SQLCIPHER_SMOKE_ROUTE_NAME,
  CANCEL_FLOW_PREVIEW_ROUTE_NAME,
  LEARNING_V2_MODES_SHOWCASE_ROUTE_NAME,
  LEARNING_V2_AUTHORING_PREVIEW_ROUTE_NAME,
  LEARNING_V2_MODES_SHOWCASE_RUN_DIR_NAME,
] as const;

export const DEV_UTILITY_ROUTE_PATHS = [
  ...DEV_UTILITY_ROUTE_NAMES.map((name) => `/${name}`),
];
