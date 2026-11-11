const mockResolveStableUid = jest.fn(async () => 'stable-owner');
const mockPrepare = jest.fn();
const mockCommit = jest.fn();
const mockNormalizeStars = jest.fn((raw: any) => raw);
const mockBuildSnapshot = jest.fn((stars: any) => (
  stars?.weekKey
    ? {
      schemaVersion: 'stars-week-snapshot.v1',
      seq: stars.seq,
      current: { weekKey: stars.weekKey, earned: stars.weekEarned },
      previous: stars.prevWeekKey
        ? { weekKey: stars.prevWeekKey, earned: stars.prevWeekEarned }
        : null,
    }
    : undefined
));

let mockLive = true;
let mockFromSteps = 0;
let mockToSteps = 1;
let mockUserStars: any;
let mockTxGetCount = 0;
let mockTransactionCount = 0;

const mockEvaluation = () => ({
  changed: mockToSteps !== mockFromSteps,
  record: { weekKey: '2026-W46', steps: mockToSteps, reachedAtMs: 1, totalMs: 10, goldDay: '', goldCount: 0 },
  results: mockToSteps === mockFromSteps
    ? [{ reportId: 'r1', verdict: 'duplicate' }]
    : [{ reportId: 'r1', verdict: 'accepted' }],
  acceptedPassed: mockToSteps > mockFromSteps ? 1 : 0,
  acceptedFailed: 0,
  goldenSteps: [],
  goldSkipped: [],
  goldAccepted: [],
});

const mockDb: any = {
  collection: jest.fn((name: string) => ({
    doc: jest.fn((id: string) => ({
      id,
      collectionName: name,
      get: jest.fn(async () => ({ exists: true, data: () => ({}) })),
    })),
  })),
  runTransaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) => {
    mockTransactionCount += 1;
    const tx = {
      get: jest.fn(async (ref: any) => {
        mockTxGetCount += 1;
        if (ref.collectionName === 'users') {
          return {
            exists: true,
            ref,
            data: () => ({
              stars: mockUserStars,
              progress: {
                spire_week_v1: JSON.stringify({ en: { weekKey: '2026-W46', steps: mockFromSteps } }),
              },
            }),
          };
        }
        return { exists: true, ref, data: () => ({}) };
      }),
      set: jest.fn(),
      update: jest.fn(),
    };
    return callback(tx);
  }),
};

const mockFirestore: any = jest.fn(() => mockDb);
mockFirestore.FieldValue = { serverTimestamp: jest.fn(() => 'server-time') };

jest.mock('firebase-admin', () => ({
  firestore: mockFirestore,
  storage: jest.fn(() => ({
    bucket: () => ({ file: () => ({ getMetadata: async () => [{ metadata: { packHash: 'pack-hash' } }] }) }),
  })),
}));

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, message: string) { super(message); }
  },
  onCall: (_options: unknown, handler: unknown) => handler,
}));

jest.mock('./auth_identity', () => ({ resolveStableUidForAuth: mockResolveStableUid }));
jest.mock('./callable_options', () => ({ HOT_CALLABLE_OPTIONS: {} }));
jest.mock('./arena_v2_core', () => ({ arenaSeasonWindow: () => ({ seasonId: 'season-1' }) }));
jest.mock('./progress_events', () => ({ getWeekKey: () => '2026-W46', isoDateUtc: () => '2026-11-10' }));
jest.mock('./spire_golden', () => ({ SPIRE_GOLD_RULE_VERSION: 1 }));
jest.mock('./spire_coins', () => ({
  spireStepCoinOps: () => ({ total: 30, truncatedSteps: 0, ops: [{ opId: 'spire-step-1' }] }),
}));
jest.mock('./spire_config_contract', () => ({
  SPIRE_CONFIG_COLLECTION: 'spire_config',
  SPIRE_CONFIG_DOC_ID: 'active',
  spireConfigStatus: () => ({
    exists: true,
    valid: true,
    liveForPlayers: mockLive,
    config: { enabled: mockLive, integrity: 'strict', coins: {} },
  }),
}));
jest.mock('./spire_groups', () => ({
  SPIRE_GROUPS_COLLECTION: 'spire_groups',
  clampSpireTier: (value: unknown) => value,
  resolveSpireTier: () => 1,
  savedSpireGroupId: () => null,
  spireCoinRankOrNull: () => null,
  spireIsPlusOf: () => false,
  spireMemberStepsUpdate: () => null,
  spirePlusTierOf: () => null,
}));
jest.mock('./spire_progress_contract', () => ({
  SPIRE_PROGRESS_FIELD: 'spire_week_v1',
  SPIRE_REPORT_MAX_BATCH: 100,
  spireEvaluateBatch: () => mockEvaluation(),
  spireIsLang: (value: unknown) => value === 'en',
  spireNormalizeReport: (value: unknown) => value,
  spireParseWeekProgress: () => ({ en: { weekKey: '2026-W46', steps: mockFromSteps } }),
  spireSerializeWeekProgress: (value: unknown) => JSON.stringify(value),
  spireWeekStartMsFromDate: () => 0,
}));
jest.mock('./stars_ledger', () => ({
  beginStarLedgerTransactionAttempt: jest.fn(),
  buildStarsWeekSnapshotV1: mockBuildSnapshot,
  commitStarOperations: mockCommit,
  normalizeStars: mockNormalizeStars,
  prepareStarOperations: mockPrepare,
  starsWeekEarned: (stars: any, key: string) => stars?.weekKey === key ? stars.weekEarned : 0,
}));

import { spireReportSteps } from './spire_progress';

const handler = spireReportSteps as unknown as (request: any) => Promise<any>;
const call = () => handler({
  auth: { uid: 'auth-owner' },
  data: { lang: 'en', stableId: 'stable-owner', reports: [{ reportId: 'r1', weekKey: '2026-W46', tier: 1 }] },
});

describe('spireReportSteps authoritative week snapshot', () => {
  let clock = Date.parse('2026-11-10T12:00:00.000Z');

  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    clock += 6 * 60_000;
    jest.setSystemTime(clock);
    jest.clearAllMocks();
    mockLive = true;
    mockFromSteps = 0;
    mockToSteps = 1;
    mockTxGetCount = 0;
    mockTransactionCount = 0;
    mockUserStars = {
      weekKey: '2026-W46', weekEarned: 100,
      prevWeekKey: '2026-W45', prevWeekEarned: 80,
      seq: 11,
    };
    mockPrepare.mockResolvedValue({
      after: { ...mockUserStars, weekEarned: 130, seq: 12 },
      outcomes: [{ status: 'applied', appliedDelta: 30, opId: 'spire-step-1' }],
      result: { balance: 500, seq: 12 },
    });
  });

  test('new earn returns the transaction after-state without another read', async () => {
    const response = await call();
    expect(response.starsWeek).toEqual({
      schemaVersion: 'stars-week-snapshot.v1',
      seq: 12,
      current: { weekKey: '2026-W46', earned: 130 },
      previous: { weekKey: '2026-W45', earned: 80 },
    });
    expect(mockTxGetCount).toBe(2);
  });

  test('duplicate and no-new-coin success return the already-read full state', async () => {
    mockFromSteps = 4;
    mockToSteps = 4;
    const response = await call();
    expect(response.starsWeek).toEqual({
      schemaVersion: 'stars-week-snapshot.v1',
      seq: 11,
      current: { weekKey: '2026-W46', earned: 100 },
      previous: { weekKey: '2026-W45', earned: 80 },
    });
    expect(mockPrepare).not.toHaveBeenCalled();
    expect(mockTxGetCount).toBe(2);
  });

  test('ledger preparation failure reports unchanged server state without invented delta', async () => {
    mockPrepare.mockRejectedValueOnce(new Error('ledger_unavailable'));
    const response = await call();
    expect(response.coinsGranted).toBe(0);
    expect(response.starsWeek).toEqual({
      schemaVersion: 'stars-week-snapshot.v1',
      seq: 11,
      current: { weekKey: '2026-W46', earned: 100 },
      previous: { weekKey: '2026-W45', earned: 80 },
    });
    expect(mockTxGetCount).toBe(2);
  });

  test('ok false contains no applicable week snapshot and skips the transaction', async () => {
    mockLive = false;
    const response = await call();
    expect(response).toMatchObject({ ok: false, reason: 'spire_not_live' });
    expect(response).not.toHaveProperty('starsWeek');
    expect(mockTransactionCount).toBe(0);
  });
});
