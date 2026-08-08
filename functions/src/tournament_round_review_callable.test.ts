import * as admin from 'firebase-admin';
import { tournamentRoundReview } from './tournaments';

jest.mock('./auth_identity', () => ({
  resolveStableUidForAuth: jest.fn(async () => 'stable-player'),
}));

type CallableRunner = (request: { auth?: { uid: string }; data?: unknown }) => Promise<unknown>;
type Snapshot = { id: string; exists: boolean; data: () => Record<string, unknown> };

const snapshot = (id: string, data: Record<string, unknown>): Snapshot => ({
  id,
  exists: true,
  data: () => data,
});

function reviewRunner(): CallableRunner {
  return (tournamentRoundReview as unknown as { run: CallableRunner }).run;
}

describe('tournamentRoundReview callable', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns only the documented review fields with the stored explanation after completion', async () => {
    const roomRef = {
      get: jest.fn(async () => snapshot('finished-room', {
        state: 'results',
        players: [{ id: 'stable-player', isBot: false }],
        rounds: [{
          roundNo: 4,
          results: {
            'stable-player': { review: [{ taskId: 'q1', correct: false, given: 2, timedOut: true }] },
          },
        }],
      })),
      collection: jest.fn(() => ({ doc: jest.fn((id: string) => ({ id })) })),
    };
    const db = {
      collection: jest.fn(() => ({ doc: jest.fn(() => roomRef) })),
      getAll: jest.fn(async () => [snapshot('q1', {
        mode: 'choice',
        payload: {
          phrase: 'Choose the right preposition',
          options: ['at', 'in', 'on'],
          correctIndex: 1,
          correctTokens: ['in'],
          audioUri: 'https://cdn.example/q1.mp3',
        },
        explanation: { ruleNote: 'Use in for months.', example: 'in July' },
        internalOnly: 'must not reach the client',
      })]),
    };
    jest.spyOn(admin, 'firestore').mockReturnValue(db as unknown as FirebaseFirestore.Firestore);

    await expect(reviewRunner()({ auth: { uid: 'auth-player' }, data: { roomId: 'finished-room' } }))
      .resolves.toEqual({
        ok: true,
        items: [{
          roundNo: 4,
          taskId: 'q1',
          mode: 'choice',
          correct: false,
          timedOut: true,
          given: 2,
          phrase: 'Choose the right preposition',
          options: ['at', 'in', 'on'],
          correctIndex: 1,
          correctTokens: ['in'],
          audioUri: 'https://cdn.example/q1.mp3',
          explanation: { ruleNote: 'Use in for months.', example: 'in July' },
        }],
      });
  });

  it('returns safe per-part review data for aggregate time attacks without leaking nested task fields', async () => {
    const roomRef = {
      get: jest.fn(async () => snapshot('aggregate-room', {
        state: 'results',
        players: [{ id: 'stable-player', isBot: false }],
        rounds: [{
          roundNo: 2,
          results: {
            'stable-player': { review: [{ taskId: 'aggregate-1', correct: false, given: { selectedIndexes: [1] } }] },
          },
        }],
      })),
      collection: jest.fn(() => ({ doc: jest.fn((id: string) => ({ id })) })),
    };
    const db = {
      collection: jest.fn(() => ({ doc: jest.fn(() => roomRef) })),
      getAll: jest.fn(async () => [snapshot('aggregate-1', {
        mode: 'time_attack',
        payload: {
          prompt: 'Match each phrase',
          items: [
            { prompt: 'to be on time', options: ['опаздывать', 'быть вовремя'], correctIndex: 1, explanation: { ruleNote: 'Time is punctuality.', example: 'I am on time.' }, privateHint: 'never expose' },
            { prompt: 'to be late', options: ['опаздывать', 'быть вовремя'], correctIndex: 0, privateHint: 'never expose' },
          ],
          internalOnly: 'must not reach the client',
        },
      })]),
    };
    jest.spyOn(admin, 'firestore').mockReturnValue(db as unknown as FirebaseFirestore.Firestore);

    await expect(reviewRunner()({ auth: { uid: 'auth-player' }, data: { roomId: 'aggregate-room' } }))
      .resolves.toEqual({
        ok: true,
        items: [{
          roundNo: 2,
          taskId: 'aggregate-1',
          mode: 'time_attack',
          correct: false,
          given: { selectedIndexes: [1] },
          phrase: '',
          options: [],
          correctIndex: null,
          correctTokens: [],
          audioUri: '',
          explanation: null,
          aggregatePrompt: 'Match each phrase',
          aggregateItems: [
            {
              prompt: 'to be on time',
              options: ['опаздывать', 'быть вовремя'],
              correctIndex: 1,
              selectedIndex: 1,
              correct: true,
              explanation: { ruleNote: 'Time is punctuality.', example: 'I am on time.' },
            },
            {
              prompt: 'to be late',
              options: ['опаздывать', 'быть вовремя'],
              correctIndex: 0,
              selectedIndex: null,
              correct: false,
              explanation: null,
            },
          ],
        }],
      });
  });

  it('returns all six speed-match mappings with the player choice or skip, without leaking task internals', async () => {
    const english = ['bread', 'water', 'table', 'window', 'street', 'morning'];
    const russian = ['хлеб', 'вода', 'стол', 'окно', 'улица', 'утро'];
    const roomRef = {
      get: jest.fn(async () => snapshot('speed-match-room', {
        state: 'results',
        players: [{ id: 'stable-player', isBot: false }],
        rounds: [{
          roundNo: 3,
          results: {
            'stable-player': {
              review: [{ taskId: 'speed-match-1', correct: false, given: { selectedIndexes: [0, 4, -1, 3, 2] } }],
            },
          },
        }],
      })),
      collection: jest.fn(() => ({ doc: jest.fn((id: string) => ({ id })) })),
    };
    const db = {
      collection: jest.fn(() => ({ doc: jest.fn(() => roomRef) })),
      getAll: jest.fn(async () => [snapshot('speed-match-1', {
        mode: 'speed_match',
        payload: {
          prompt: 'Соедини пары',
          items: english.map((prompt, correctIndex) => ({
            prompt,
            options: russian,
            correctIndex,
            explanation: {
              ruleNote: `${prompt} has one exact translation.`,
              example: `I know ${prompt}. — Я знаю ${prompt}.`,
              wrongOptionReasons: russian.map((_, optionIndex) => optionIndex === correctIndex ? '' : `Wrong pair ${optionIndex}.`),
            },
            privateHint: 'never expose',
          })),
          rightOptions: russian,
          internalOnly: 'must not reach the client',
        },
      })]),
    };
    jest.spyOn(admin, 'firestore').mockReturnValue(db as unknown as FirebaseFirestore.Firestore);

    const result = await reviewRunner()({ auth: { uid: 'auth-player' }, data: { roomId: 'speed-match-room' } });
    expect(JSON.stringify(result)).not.toContain('privateHint');
    expect(JSON.stringify(result)).not.toContain('internalOnly');
    const speedPairs = (result as { items: Array<{ speedMatchPairs: Array<Record<string, unknown>> }> })
      .items[0].speedMatchPairs;
    expect(speedPairs).toEqual(expect.arrayContaining([
      expect.objectContaining({ explanation: expect.objectContaining({ ruleNote: 'bread has one exact translation.' }) }),
      expect.objectContaining({ selectedTrapReason: 'Wrong pair 4.', explanation: expect.objectContaining({ ruleNote: 'water has one exact translation.' }) }),
    ]));
    await expect(reviewRunner()({ auth: { uid: 'auth-player' }, data: { roomId: 'speed-match-room' } }))
      .resolves.toMatchObject({
        ok: true,
        items: [{
          mode: 'speed_match',
          speedMatchPairs: [
            { english: 'bread', selectedRussian: 'хлеб', correctRussian: 'хлеб', correct: true },
            { english: 'water', selectedRussian: 'улица', correctRussian: 'вода', correct: false },
            { english: 'table', selectedRussian: null, correctRussian: 'стол', correct: false },
            { english: 'window', selectedRussian: 'окно', correctRussian: 'окно', correct: true },
            { english: 'street', selectedRussian: 'стол', correctRussian: 'улица', correct: false },
            { english: 'morning', selectedRussian: null, correctRussian: 'утро', correct: false },
          ],
        }],
      });
  });

  it('synthesizes missed cards from frozen secrets for a retained fully timed-out room without review rows', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(200_000);
    const roomRef = {
      get: jest.fn(async () => snapshot('retained-timeout-room', {
        state: 'closed',
        finalizedAtMs: 100_000,
        reviewRetentionUntilMs: 300_000,
        players: [{ id: 'stable-player', isBot: false }],
        rounds: [{
          roundNo: 1,
          taskIds: ['frozen-q1', 'frozen-q2'],
          results: {
            'stable-player': {
              correct: 0,
              total: 2,
              timedOut: true,
              submissionStatus: 'timed_out',
            },
          },
        }],
      })),
      collection: jest.fn(() => ({ doc: jest.fn((id: string) => ({ id })) })),
    };
    const frozenTasks: Record<string, Record<string, unknown>> = {
      'frozen-q1': {
        mode: 'guess_phrase',
        payload: {
          phrase: 'Frozen phrase one',
          options: ['one', 'two'],
          correctIndex: 0,
        },
        explanation: {
          ruleNote: 'Frozen rule one.',
          example: 'Frozen example one.',
          wrongOptionReasons: ['', 'Frozen reason one.'],
        },
      },
      'frozen-q2': {
        mode: 'fill_gap',
        payload: {
          phrase: 'Frozen phrase two',
          options: ['in', 'on'],
          correctIndex: 1,
        },
        explanation: {
          ruleNote: 'Frozen rule two.',
          example: 'Frozen example two.',
          wrongOptionReasons: ['Frozen reason two.', ''],
        },
      },
    };
    const db = {
      collection: jest.fn(() => ({ doc: jest.fn(() => roomRef) })),
      getAll: jest.fn(async (...refs: Array<{ id: string }>) => (
        refs.map((ref) => snapshot(ref.id, frozenTasks[ref.id]))
      )),
    };
    jest.spyOn(admin, 'firestore').mockReturnValue(db as unknown as FirebaseFirestore.Firestore);

    await expect(reviewRunner()({
      auth: { uid: 'auth-player' }, data: { roomId: 'retained-timeout-room' },
    })).resolves.toMatchObject({
      ok: true,
      items: [
        {
          roundNo: 1,
          taskId: 'frozen-q1',
          correct: false,
          timedOut: true,
          phrase: 'Frozen phrase one',
          correctIndex: 0,
          explanation: { ruleNote: 'Frozen rule one.', example: 'Frozen example one.' },
        },
        {
          roundNo: 1,
          taskId: 'frozen-q2',
          correct: false,
          timedOut: true,
          phrase: 'Frozen phrase two',
          correctIndex: 1,
          explanation: { ruleNote: 'Frozen rule two.', example: 'Frozen example two.' },
        },
      ],
    });
    expect(db.collection).toHaveBeenCalledTimes(1);
    expect(db.getAll).toHaveBeenCalledTimes(1);
  });

  it('rejects unfinished tournaments before loading task secrets', async () => {
    const roomRef = {
      get: jest.fn(async () => snapshot('live-room', { state: 'round2', players: [], rounds: [] })),
      collection: jest.fn(),
    };
    const db = {
      collection: jest.fn(() => ({ doc: jest.fn(() => roomRef) })),
      getAll: jest.fn(),
    };
    jest.spyOn(admin, 'firestore').mockReturnValue(db as unknown as FirebaseFirestore.Firestore);

    await expect(reviewRunner()({ auth: { uid: 'auth-player' }, data: { roomId: 'live-room' } }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'tournament_not_finished' });
    expect(db.getAll).not.toHaveBeenCalled();
    expect(roomRef.collection).not.toHaveBeenCalled();
  });

  it('rejects an expired review during rewards, before reading private evidence', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(200_000);
    const roomRef = {
      get: jest.fn(async () => snapshot('expired-rewards-room', {
        state: 'rewards',
        finalizedAtMs: 100_000,
        reviewRetentionUntilMs: 199_999,
        players: [{ id: 'stable-player', isBot: false }],
        rounds: [{
          roundNo: 4,
          results: { 'stable-player': { review: [{ taskId: 'q1', correct: false }] } },
        }],
      })),
      collection: jest.fn(),
    };
    const db = {
      collection: jest.fn(() => ({ doc: jest.fn(() => roomRef) })),
      getAll: jest.fn(),
    };
    jest.spyOn(admin, 'firestore').mockReturnValue(db as unknown as FirebaseFirestore.Firestore);

    await expect(reviewRunner()({ auth: { uid: 'auth-player' }, data: { roomId: 'expired-rewards-room' } }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'tournament_review_expired' });
    expect(db.getAll).not.toHaveBeenCalled();
    expect(roomRef.collection).not.toHaveBeenCalled();
  });
});
