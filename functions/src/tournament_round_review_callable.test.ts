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
        state: 'closed',
        players: [{ id: 'stable-player', isBot: false }],
        rounds: [{
          roundNo: 4,
          results: {
            'stable-player': { review: [{ taskId: 'q1', correct: false, given: 2 }] },
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
        state: 'closed',
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
});
