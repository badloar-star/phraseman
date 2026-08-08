export {};

class FakeHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optsOrHandler: unknown, maybeHandler?: unknown) =>
    typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));

const countGet = jest.fn(async () => ({ data: () => ({ count: 9_954 }) }));
const fakeDb = {
  collection: jest.fn(() => ({
    count: () => ({ get: countGet }),
    where: () => ({ count: () => ({ get: countGet }) }),
  })),
};
jest.mock('firebase-admin', () => ({ firestore: () => fakeDb }));

const readRecentHistoryMock = jest.fn(async (_input: unknown) => [] as unknown[]);
const readPeakTierMock = jest.fn(async (_input: unknown) => null as string | null);
jest.mock('./business_tier_history_store', () => ({
  BUSINESS_TIER_HISTORY_COLLECTION: 'business_tier_history',
  MAX_HISTORY_POINTS_PER_READ: 3_650,
  readRecentHistory: (input: unknown) => readRecentHistoryMock(input),
  readPeakTier: (input: unknown) => readPeakTierMock(input),
}));

const runBackfillStepMock = jest.fn(async (_deps: unknown) => ({
  pagesProcessed: 1, usersScanned: 500, pointsWritten: 3,
  done: false, lastCompletedDayKey: '2026-08-01', cumulativeUsers: 500,
}));
jest.mock('./business_tier_backfill_runner', () => ({
  runBackfillStep: (deps: unknown) => runBackfillStepMock(deps),
}));

function request(role: string | null, data: unknown = {}) {
  return { auth: role ? { uid: 'u1', token: { admin: true, adminRole: role } } : null, data };
}

describe('jarvisGetBusinessTier — read gate mirrors the Jarvis combined view', () => {
  beforeEach(() => {
    readRecentHistoryMock.mockClear();
    runBackfillStepMock.mockClear();
  });

  test('rejects unauthenticated callers', async () => {
    const { jarvisGetBusinessTier } = require('./business_tier_callables');
    await expect(jarvisGetBusinessTier(request(null))).rejects.toThrow('Admin only');
  });

  test('rejects a role without the three read permissions', async () => {
    const { jarvisGetBusinessTier } = require('./business_tier_callables');
    await expect(jarvisGetBusinessTier(request('content_editor'))).rejects.toThrow();
  });

  test('allows analyst — it holds money.read + users.read + diagnostics.read', async () => {
    const { jarvisGetBusinessTier } = require('./business_tier_callables');
    await expect(jarvisGetBusinessTier(request('analyst'))).resolves.toMatchObject({ ok: true });
  });

  test('returns the snapshot plus downsampled history for the chart', async () => {
    const { jarvisGetBusinessTier } = require('./business_tier_callables');
    const result = await jarvisGetBusinessTier(request('owner'));
    expect(result).toMatchObject({ ok: true });
    expect(result).toHaveProperty('snapshot');
    expect(result).toHaveProperty('history');
    expect(result.history).toHaveProperty('daily');
    expect(result.history).toHaveProperty('weekly');
  });

  test('reads history with a bounded limit — never an unbounded collection scan', async () => {
    const { jarvisGetBusinessTier } = require('./business_tier_callables');
    await jarvisGetBusinessTier(request('owner'));
    const passed = readRecentHistoryMock.mock.calls[0][0] as { limit: number };
    expect(passed.limit).toBeGreaterThan(0);
    expect(passed.limit).toBeLessThanOrEqual(3_650);
  });
});

describe('jarvisRunBusinessTierBackfill — stricter gate than reading', () => {
  beforeEach(() => {
    runBackfillStepMock.mockClear();
  });

  test('rejects analyst even though it can READ the panel — backfill costs real money', async () => {
    const { jarvisRunBusinessTierBackfill } = require('./business_tier_callables');
    await expect(jarvisRunBusinessTierBackfill(request('analyst'))).rejects.toThrow();
    expect(runBackfillStepMock).not.toHaveBeenCalled();
  });

  test('allows owner and reports honest progress', async () => {
    const { jarvisRunBusinessTierBackfill } = require('./business_tier_callables');
    const result = await jarvisRunBusinessTierBackfill(request('owner'));
    expect(result).toMatchObject({
      ok: true, pagesProcessed: 1, usersScanned: 500, pointsWritten: 3, done: false,
    });
  });

  test('allows admin as well', async () => {
    const { jarvisRunBusinessTierBackfill } = require('./business_tier_callables');
    await expect(jarvisRunBusinessTierBackfill(request('admin'))).resolves.toMatchObject({ ok: true });
  });

  test('rejects unauthenticated callers before touching the runner', async () => {
    const { jarvisRunBusinessTierBackfill } = require('./business_tier_callables');
    await expect(jarvisRunBusinessTierBackfill(request(null))).rejects.toThrow('Admin only');
    expect(runBackfillStepMock).not.toHaveBeenCalled();
  });
});
