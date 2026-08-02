function routeName(...parts: string[]): string {
  return parts.join('_');
}

export const SETTINGS_TESTERS_ROUTE_NAME = routeName('settings', 'testers');
export const POS_ANALYTICS_AUDIT_ROUTE_NAME = routeName('pos', 'analytics', 'audit');
export const ADMIN_REVIEW_TEST_ROUTE_NAME = routeName('admin', 'review', 'test');
export const ADMIN_INTRO_PREVIEW_ROUTE_NAME = routeName('admin', 'intro', 'preview');
export const ADMIN_PREMIUM_DELIVERY_TEST_ROUTE_NAME = routeName('admin', 'premium', 'delivery', 'test');
export const ADMIN_CELEBRATION_LAB_ROUTE_NAME = routeName('admin', 'celebration', 'lab');
export const ADMIN_SPEAKING_LAB_ROUTE_NAME = routeName('admin', 'speaking', 'lab');
export const ADMIN_TASKS_LAB_ROUTE_NAME = routeName('admin', 'tasks', 'lab');
export const ADMIN_REFERRAL_LAB_ROUTE_NAME = routeName('admin', 'referral', 'lab');
export const ADMIN_SOUND_LAB_ROUTE_NAME = routeName('admin', 'sound', 'lab');
export const FLASHCARDS_MARKET_DEV_ROUTE_NAME = routeName('flashcards', 'market', 'dev');
export const PERSONAL_PLAN_RUNTIME_DEV_ROUTE_NAME = routeName('personal', 'plan', 'runtime', 'dev');

export const SETTINGS_TESTERS_ROUTE = `/${SETTINGS_TESTERS_ROUTE_NAME}`;
export const POS_ANALYTICS_AUDIT_ROUTE = `/${POS_ANALYTICS_AUDIT_ROUTE_NAME}`;
export const ADMIN_CELEBRATION_LAB_ROUTE = `/${ADMIN_CELEBRATION_LAB_ROUTE_NAME}`;
export const ADMIN_SPEAKING_LAB_ROUTE = `/${ADMIN_SPEAKING_LAB_ROUTE_NAME}`;
export const ADMIN_REFERRAL_LAB_ROUTE = `/${ADMIN_REFERRAL_LAB_ROUTE_NAME}`;
export const ADMIN_SOUND_LAB_ROUTE = `/${ADMIN_SOUND_LAB_ROUTE_NAME}`;
export const FLASHCARDS_MARKET_DEV_ROUTE = `/${FLASHCARDS_MARKET_DEV_ROUTE_NAME}`;
export const PERSONAL_PLAN_RUNTIME_DEV_ROUTE = `/${PERSONAL_PLAN_RUNTIME_DEV_ROUTE_NAME}`;

export const DEV_UTILITY_ROUTE_NAMES = [
  ADMIN_REVIEW_TEST_ROUTE_NAME,
  ADMIN_INTRO_PREVIEW_ROUTE_NAME,
  ADMIN_PREMIUM_DELIVERY_TEST_ROUTE_NAME,
  ADMIN_CELEBRATION_LAB_ROUTE_NAME,
  ADMIN_SPEAKING_LAB_ROUTE_NAME,
  ADMIN_TASKS_LAB_ROUTE_NAME,
  ADMIN_REFERRAL_LAB_ROUTE_NAME,
  ADMIN_SOUND_LAB_ROUTE_NAME,
  SETTINGS_TESTERS_ROUTE_NAME,
  POS_ANALYTICS_AUDIT_ROUTE_NAME,
] as const;

export const DEV_UTILITY_ROUTE_PATHS = [
  ...DEV_UTILITY_ROUTE_NAMES.map((name) => `/${name}`),
  PERSONAL_PLAN_RUNTIME_DEV_ROUTE,
];
