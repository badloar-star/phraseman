export const SESSION_ATTEMPT_ROUTES = Object.freeze([
  '/lesson1',
  '/lesson_words',
  '/lesson_irregular_verbs',
  '/mistake_practice_session',
  '/flashcards_swipe',
  '/flashcards_blitz_session',
  '/flashcards_listening_session',
  '/flashcards_speaking_session',
  '/learning_v2_direct_session_player_v1',
  '/learning-v2/session/[id]',
] as const);

export type SessionAttemptRoute = typeof SESSION_ATTEMPT_ROUTES[number];

export const SESSION_ATTEMPT_DENYLIST = Object.freeze([
  '/arena',
  '/arena/**',
] as const);

export type SessionAttemptRouteEntry = Readonly<{
  route: SessionAttemptRoute;
  spendsEnergy: true;
  integrationTest: `tests/${string}`;
}>;

export const SESSION_ATTEMPT_ROUTE_ENTRIES: readonly SessionAttemptRouteEntry[] = Object.freeze([
  Object.freeze({
    route: '/lesson1',
    spendsEnergy: true,
    integrationTest: 'tests/lesson_session_attempts_integration.test.tsx',
  }),
  Object.freeze({
    route: '/lesson_words',
    spendsEnergy: true,
    integrationTest: 'tests/lesson_words_attempts_integration.test.tsx',
  }),
  Object.freeze({
    route: '/lesson_irregular_verbs',
    spendsEnergy: true,
    integrationTest: 'tests/irregular_verbs_attempts_integration.test.tsx',
  }),
  Object.freeze({
    route: '/mistake_practice_session',
    spendsEnergy: true,
    integrationTest: 'tests/mistake_practice_attempts_integration.test.tsx',
  }),
  Object.freeze({
    route: '/flashcards_swipe',
    spendsEnergy: true,
    integrationTest: 'tests/fc_swipe_attempts_integration.test.tsx',
  }),
  Object.freeze({
    route: '/flashcards_blitz_session',
    spendsEnergy: true,
    integrationTest: 'tests/fc_blitz_attempts_integration.test.tsx',
  }),
  Object.freeze({
    route: '/flashcards_listening_session',
    spendsEnergy: true,
    integrationTest: 'tests/fc_listening_attempts_integration.test.tsx',
  }),
  Object.freeze({
    route: '/flashcards_speaking_session',
    spendsEnergy: true,
    integrationTest: 'tests/fc_speaking_attempts_integration.test.tsx',
  }),
  Object.freeze({
    route: '/learning_v2_direct_session_player_v1',
    spendsEnergy: true,
    integrationTest: 'tests/learning_v2_session_attempts_runtime_gate.ts',
  }),
  Object.freeze({
    route: '/learning-v2/session/[id]',
    spendsEnergy: true,
    integrationTest: 'tests/learning_v2_session_attempts_runtime_gate.ts',
  }),
]);

export type SessionAttemptRouteClassification = 'enabled' | 'denied' | 'unclassified';

function normalizedPathname(route: string): string {
  const pathname = route.trim().split(/[?#]/u, 1)[0] ?? '';
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}
export function classifySessionAttemptRoute(route: string): SessionAttemptRouteClassification {
  const pathname = normalizedPathname(route);
  if (pathname === '/arena' || pathname.startsWith('/arena/')) return 'denied';
  if (
    pathname === '/learning-v2/session/[id]'
    || pathname.startsWith('/learning-v2/session/')
  ) {
    return 'enabled';
  }
  return (SESSION_ATTEMPT_ROUTES as readonly string[]).includes(pathname)
    ? 'enabled'
    : 'unclassified';
}
