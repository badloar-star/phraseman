function routeName(...parts: string[]): string {
  return parts.join('_');
}

export const POS_ANALYTICS_AUDIT_ROUTE_NAME = routeName('pos', 'analytics', 'audit');
export const FLASHCARDS_MARKET_DEV_ROUTE_NAME = routeName('flashcards', 'market', 'dev');
export const MOTION_LAB_ROUTE_NAME = routeName('motion', 'lab');

export const POS_ANALYTICS_AUDIT_ROUTE = `/${POS_ANALYTICS_AUDIT_ROUTE_NAME}`;
export const FLASHCARDS_MARKET_DEV_ROUTE = `/${FLASHCARDS_MARKET_DEV_ROUTE_NAME}`;
export const MOTION_LAB_ROUTE = `/${MOTION_LAB_ROUTE_NAME}`;

export const DEV_UTILITY_ROUTE_NAMES = [
  POS_ANALYTICS_AUDIT_ROUTE_NAME,
  MOTION_LAB_ROUTE_NAME,
] as const;

export const DEV_UTILITY_ROUTE_PATHS = [
  ...DEV_UTILITY_ROUTE_NAMES.map((name) => `/${name}`),
];
