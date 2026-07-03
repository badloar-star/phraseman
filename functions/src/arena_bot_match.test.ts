type DocData = Record<string, unknown>;

type FakeRef = {
  path: string;
  get: () => Promise<{ exists: boolean; data: () => DocData | undefined }>;
  collection: (name: string) => {
    doc: (id: string) => FakeRef;
  };
};

const docs = new Map<string, DocData>();

function snapFor(path: string) {
  const data = docs.get(path);
  return { exists: data !== undefined, data: () => data };
}

function makeRef(path: string): FakeRef {
  return {
    path,
    get: async () => snapFor(path),
    collection: (name: string) => ({
      doc: (id: string) => makeRef(`${path}/${name}/${id}`),
    }),
  };
}

function mergeFirestore(existing: DocData, patch: DocData): DocData {
  const next: DocData = { ...existing };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing[key] &&
      typeof existing[key] === 'object' &&
      !Array.isArray(existing[key])
    ) {
      next[key] = mergeFirestore(existing[key] as DocData, value as DocData);
    } else {
      next[key] = value;
    }
  }
  return next;
}

function buildDb() {
  return {
    collection: (name: string) => ({
      doc: (id: string) => makeRef(`${name}/${id}`),
    }),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<{ exists: boolean; data: () => DocData | undefined }>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const tx = {
        get: async (ref: FakeRef) => snapFor(ref.path),
        set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => {
          writes.push(() => {
            const existing = docs.get(ref.path) ?? {};
            docs.set(ref.path, opts?.merge ? mergeFirestore(existing, data) : mergeFirestore({}, data));
          });
        },
      };
      const result = await fn(tx);
      writes.forEach(write => write());
      return result;
    },
  };
}

class FakeHttpsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (_opts: unknown, handler: unknown) => handler,
}));

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => buildDb()),
}));

async function recordBotMatch(overrides: Record<string, unknown> = {}) {
  const { arenaBotMatchRecord } = require('./arena_bot_match');
  return arenaBotMatchRecord({
    auth: { uid: 'auth-1' },
    data: {
      sessionId: 'bot_session_1',
      won: true,
      isLast: false,
      isDraw: false,
      myScore: 480,
      oppScore: 250,
      oppName: 'Bot',
      myName: 'Tester',
      ...overrides,
    },
  });
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-05-14T10:00:00.000Z'));
  jest.resetModules();
  docs.clear();
  docs.set('arena_profiles/auth-1', {
    userId: 'auth-1',
    rank: { tier: 'bronze', level: 'I', stars: 0 },
    xp: 10,
    stats: { matchesPlayed: 0, matchesWon: 0, totalScore: 0, winStreak: 0, bestWinStreak: 0 },
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('arenaBotMatchRecord', () => {
  it('records a bot match once and replays duplicate session delivery without second XP/stat increment', async () => {
    const first = await recordBotMatch();

    expect(first).toMatchObject({
      xpDelta: 50,
      oldStars: 0,
      newStars: 1,
    });
    expect(first.idempotentReplay).toBeUndefined();
    expect(docs.get('arena_profiles/auth-1')).toMatchObject({
      xp: 60,
      rank: { tier: 'bronze', level: 'I', stars: 1 },
      stats: { matchesPlayed: 1, matchesWon: 1, totalScore: 480, winStreak: 1, bestWinStreak: 1 },
    });
    const storedProfile = docs.get('arena_profiles/auth-1') ?? {};
    expect(Object.prototype.hasOwnProperty.call(storedProfile, 'rank.tier')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(storedProfile, 'stats.matchesPlayed')).toBe(false);
    expect(docs.get('arena_profiles/auth-1/match_history/bot_session_1')).toMatchObject({
      sessionId: 'bot_session_1',
      xpGained: 50,
      isBot: true,
      rankBefore: { tier: 'bronze', level: 'I', stars: 0 },
      rankAfter: { tier: 'bronze', level: 'I', stars: 1 },
    });

    const second = await recordBotMatch();

    expect(second).toMatchObject({
      idempotentReplay: true,
      xpDelta: 50,
      oldStars: 0,
      newStars: 1,
    });
    expect(docs.get('arena_profiles/auth-1')).toMatchObject({
      xp: 60,
      rank: { tier: 'bronze', level: 'I', stars: 1 },
      stats: { matchesPlayed: 1, matchesWon: 1, totalScore: 480, winStreak: 1, bestWinStreak: 1 },
    });
  });

  it('still records a different session as a new match', async () => {
    await recordBotMatch();
    const secondSession = await recordBotMatch({ sessionId: 'bot_session_2', myScore: 510 });

    expect(secondSession).toMatchObject({
      xpDelta: 50,
    });
    expect(secondSession.idempotentReplay).toBeUndefined();
    expect(docs.get('arena_profiles/auth-1')).toMatchObject({
      xp: 110,
      rank: { tier: 'bronze', level: 'I', stars: 2 },
      stats: { matchesPlayed: 2, matchesWon: 2, totalScore: 990, winStreak: 2, bestWinStreak: 2 },
    });
    expect(docs.get('arena_profiles/auth-1/match_history/bot_session_2')).toMatchObject({
      sessionId: 'bot_session_2',
      xpGained: 50,
    });
  });

  it('repairs legacy dotted rank/stat fields by reading the fresher match count', async () => {
    docs.set('arena_profiles/auth-1', {
      userId: 'auth-1',
      rank: { tier: 'legend', level: 'II', stars: 2 },
      xp: 3980,
      stats: { matchesPlayed: 78, matchesWon: 60, totalScore: 9000, winStreak: 2, bestWinStreak: 8 },
      'rank.tier': 'legend',
      'rank.level': 'III',
      'rank.stars': 0,
      'stats.matchesPlayed': 79,
      'stats.matchesWon': 61,
      'stats.totalScore': 10245,
      'stats.winStreak': 3,
      'stats.bestWinStreak': 8,
    });

    const result = await recordBotMatch({ sessionId: 'bot_session_legacy', myScore: 1145 });

    expect(result).toMatchObject({
      oldTier: 'legend',
      oldLevel: 'III',
      oldStars: 0,
      newTier: 'legend',
      newLevel: 'III',
      newStars: 0,
    });
    expect(docs.get('arena_profiles/auth-1')).toMatchObject({
      xp: 4030,
      rank: { tier: 'legend', level: 'III', stars: 0 },
      stats: { matchesPlayed: 80, matchesWon: 62, totalScore: 11390, winStreak: 4, bestWinStreak: 8 },
    });
  });
});

export {};
