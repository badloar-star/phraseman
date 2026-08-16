function routeName(...parts: string[]): string {
  return parts.join('_');
}

export const POS_ANALYTICS_AUDIT_ROUTE_NAME = routeName('pos', 'analytics', 'audit');
export const FLASHCARDS_MARKET_DEV_ROUTE_NAME = routeName('flashcards', 'market', 'dev');
// зачем: витрина «Движение · все поверхности» заменила старую Motion Lab
// (решение владельца 2026-08-16): пункты запускают РЕАЛЬНЫЕ экраны/модалки.
export const MOTION_SHOWCASE_ROUTE_NAME = routeName('motion', 'showcase');

export const POS_ANALYTICS_AUDIT_ROUTE = `/${POS_ANALYTICS_AUDIT_ROUTE_NAME}`;
export const FLASHCARDS_MARKET_DEV_ROUTE = `/${FLASHCARDS_MARKET_DEV_ROUTE_NAME}`;
export const MOTION_SHOWCASE_ROUTE = `/${MOTION_SHOWCASE_ROUTE_NAME}`;

export const DEV_UTILITY_ROUTE_NAMES = [
  POS_ANALYTICS_AUDIT_ROUTE_NAME,
  MOTION_SHOWCASE_ROUTE_NAME,
] as const;

export const DEV_UTILITY_ROUTE_PATHS = [
  ...DEV_UTILITY_ROUTE_NAMES.map((name) => `/${name}`),
];
