import {
  SESSION_ATTEMPT_DENYLIST,
  SESSION_ATTEMPT_ROUTE_ENTRIES,
  SESSION_ATTEMPT_ROUTES,
  classifySessionAttemptRoute,
} from '../app/session_attempts/session_attempts_registry';

const EXPECTED_ROUTES = [
  '/lesson1',
  '/lesson_words',
  '/lesson_irregular_verbs',
  '/mistake_practice_session',
  '/flashcards_blitz_session',
  '/flashcards_listening_session',
  '/flashcards_speaking_session',
  '/learning_v2_direct_session_player_v1',
  '/learning-v2/session/[id]',
] as const;

describe('session attempts route registry', () => {
  test('classifies every known non-Arena learning route exactly once', () => {
    expect(SESSION_ATTEMPT_ROUTES).toEqual(EXPECTED_ROUTES);
    expect(new Set(SESSION_ATTEMPT_ROUTES).size).toBe(SESSION_ATTEMPT_ROUTES.length);
    expect(SESSION_ATTEMPT_ROUTE_ENTRIES.map(({ route }) => route)).toEqual(EXPECTED_ROUTES);
    expect(SESSION_ATTEMPT_ROUTE_ENTRIES.every(({ spendsEnergy }) => spendsEnergy)).toBe(true);
  });

  test('binds each route to a focused integration contract', () => {
    for (const entry of SESSION_ATTEMPT_ROUTE_ENTRIES) {
      expect(entry.integrationTest).toMatch(
        /^tests\/[a-z0-9_\-[\].]+(?:\.test\.tsx|_gate\.ts)$/,
      );
    }
  });

  test('keeps Arena in an explicit denylist and outside the allowlist', () => {
    expect(SESSION_ATTEMPT_DENYLIST).toEqual(['/arena', '/arena/**']);
    expect(SESSION_ATTEMPT_ROUTES.some((route) => route.startsWith('/arena'))).toBe(false);
    expect(classifySessionAttemptRoute('/arena')).toBe('denied');
    expect(classifySessionAttemptRoute('/arena/match/abc')).toBe('denied');
  });

  test('normalizes concrete Learning V2 session ids to the registered route', () => {
    expect(classifySessionAttemptRoute('/learning-v2/session/episode-01-session-01')).toBe('enabled');
    expect(classifySessionAttemptRoute('/lesson_words')).toBe('enabled');
    expect(classifySessionAttemptRoute('/settings')).toBe('unclassified');
  });
});
