type DocData = Record<string, unknown>;

const mockDocs = new Map<string, DocData>();
const mockResolvePremiumAccess = jest.fn(async () => false);

function refFor(path: string): {
  path: string;
  collection(name: string): { doc(id: string): ReturnType<typeof refFor> };
} {
  return {
    path,
    collection: (name: string) => ({ doc: (id: string) => refFor(`${path}/${name}/${id}`) }),
  };
}

function snapshot(path: string) {
  return {
    exists: mockDocs.has(path),
    data: () => mockDocs.get(path),
  };
}

const mockDb = {
  collection: (name: string) => ({ doc: (id: string) => refFor(`${name}/${id}`) }),
  runTransaction: async <T>(work: (tx: {
    get(ref: { path: string }): Promise<ReturnType<typeof snapshot>>;
    set(ref: { path: string }, value: DocData, options?: { merge?: boolean }): void;
  }) => Promise<T>) => (
    work({
      get: async (ref) => snapshot(ref.path),
      set: (ref, value, options) => {
        const current = options?.merge ? (mockDocs.get(ref.path) ?? {}) : {};
        mockDocs.set(ref.path, { ...current, ...value });
      },
    })
  ),
};

class FakeHttpsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-admin', () => ({
  firestore: Object.assign(() => mockDb, {
    FieldValue: { serverTimestamp: () => ({ __op: 'serverTimestamp' }) },
  }),
}));

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optionsOrHandler: unknown, maybeHandler?: unknown) => (
    typeof optionsOrHandler === 'function' ? optionsOrHandler : maybeHandler
  ),
}));

jest.mock('./premium_status', () => ({
  resolvePremiumAccess: (...args: unknown[]) => mockResolvePremiumAccess(...(args as [])),
}));

// The callable must load after the hoisted Firebase boundary mocks above.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { observedVideoWatchDuration, verifiedVideoWatchProgress, videoWatchRunesClaim } = require('./video_watch_runes') as {
  observedVideoWatchDuration: (
    startedAtMs: number,
    claimedAtMs: number,
    carryMs: number,
  ) => { elapsedMs: number; completeMinutes: number; carryMs: number };
  verifiedVideoWatchProgress: (
    previousPositionMs: number | undefined,
    previousServerAtMs: number | undefined,
    positionMs: number,
    serverNowMs: number,
    maxCreditedPositionMs?: number,
  ) => number;
  videoWatchRunesClaim: (request: {
    auth?: { uid: string };
    data: { stableId: string; action: 'start' | 'progress' | 'claim'; sessionId: string; requestId?: string; positionMs?: number; progressSeq?: number };
  }) => Promise<DocData>;
};

const STABLE_UID = 'stable-user-1';
const AUTH_UID = 'auth-user-1';
const REQUEST_ID = 'vwm1a2b3c4d5e6';
const SESSION_ID = 'vws1a2b3c4d5e6';
const MONDAY_MS = Date.parse('2026-09-07T12:00:00.000Z');

function seedCommittedReceipt(): void {
  mockDocs.set(`users/${STABLE_UID}`, {
    firebaseAuthUid: AUTH_UID,
    stars: {
      balance: 999,
      earnedTotal: 400,
      grantedTotal: 699,
      spentTotal: 100,
      seq: 44,
    },
    videoWatchRunesDaily: { dayKey: '2026-09-07', granted: 37 },
  });
  mockDocs.set(`users/${STABLE_UID}/star_operations/video_watch:${REQUEST_ID}`, {
    opId: `video_watch:${REQUEST_ID}`,
    delta: 34,
    reason: 'video_watch',
    sourceKind: 'video_watch',
    sourceId: STABLE_UID,
    ruleVersion: 4,
    earnedAtMs: Date.parse('2026-09-06T23:59:59.000Z'),
    meta: { requestId: REQUEST_ID, sessionId: SESSION_ID, observedMinutes: 17 },
  });
}

function claim(sessionId: string = SESSION_ID, requestId: string = REQUEST_ID): Promise<DocData> {
  return videoWatchRunesClaim({
    auth: { uid: AUTH_UID },
    data: { stableId: STABLE_UID, action: 'claim', sessionId, requestId },
  });
}

describe('videoWatchRunesClaim immutable replay behavior', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(MONDAY_MS);
    mockDocs.clear();
    mockResolvePremiumAccess.mockClear().mockResolvedValue(false);
    seedCommittedReceipt();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('replays a committed Sunday receipt on Monday after Premium expired', async () => {
    await expect(claim()).resolves.toEqual(expect.objectContaining({
      ok: true,
      granted: 0,
      reason: 'already_applied',
      grantedToday: 37,
      dailyCap: 600,
      stars: 999,
      starsEarnedTotal: 400,
      starsSeq: 44,
    }));
    expect(mockResolvePremiumAccess).not.toHaveBeenCalled();
  });

  it('rejects changed minutes under the committed request id before entitlement lookup', async () => {
    await expect(claim('vws9z8y7x6w5v4')).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'op_conflict',
    });
    expect(mockResolvePremiumAccess).not.toHaveBeenCalled();
  });
});

describe('videoWatchRunesClaim server-observed session', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(MONDAY_MS);
    mockDocs.clear();
    mockResolvePremiumAccess.mockClear().mockResolvedValue(true);
    mockDocs.set(`users/${STABLE_UID}`, {
      firebaseAuthUid: AUTH_UID,
      stars: { balance: 10, earnedTotal: 0, grantedTotal: 10, spentTotal: 0, seq: 1 },
      videoWatchRunesDaily: { dayKey: '2026-09-07', granted: 0 },
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('rejects an unsafe stable id before touching Firestore or checking entitlement', async () => {
    await expect(videoWatchRunesClaim({
      auth: { uid: AUTH_UID },
      data: { stableId: '../../users/other', action: 'start', sessionId: SESSION_ID },
    })).rejects.toMatchObject({
      code: 'invalid-argument',
      message: 'invalid_stable_id',
    });
    expect(mockResolvePremiumAccess).not.toHaveBeenCalled();
  });

  it('starts from server time and never accepts client minutes', async () => {
    await expect(videoWatchRunesClaim({
      auth: { uid: AUTH_UID },
      data: { stableId: STABLE_UID, action: 'start', sessionId: SESSION_ID },
    })).resolves.toEqual(expect.objectContaining({ reason: 'session_started', carryMs: 0 }));
    expect(mockDocs.get(`users/${STABLE_UID}`)?.videoWatchRuneSessionV1)
      .toEqual({ sessionId: SESSION_ID, status: 'active', startedAt: MONDAY_MS, verifiedMs: 0, progressSeq: 0 });
  });

  it('does not turn idle wall-clock time into runes', async () => {
    await videoWatchRunesClaim({
      auth: { uid: AUTH_UID },
      data: { stableId: STABLE_UID, action: 'start', sessionId: SESSION_ID },
    });
    jest.spyOn(Date, 'now').mockReturnValue(MONDAY_MS + 2 * 60_000);
    await expect(claim()).resolves.toEqual(expect.objectContaining({
      granted: 0,
      reason: 'no_complete_minute',
    }));
  });

  it('persists a zero-award receipt and replays it without a later grant', async () => {
    mockDocs.set(`users/${STABLE_UID}`, {
      ...mockDocs.get(`users/${STABLE_UID}`),
      videoWatchRuneSessionV1: {
        sessionId: SESSION_ID,
        status: 'active',
        startedAt: MONDAY_MS - 20_000,
      },
    });
    await expect(claim()).resolves.toEqual(expect.objectContaining({
      granted: 0,
      reason: 'no_complete_minute',
    }));
    mockResolvePremiumAccess.mockClear().mockResolvedValue(false);
    jest.spyOn(Date, 'now').mockReturnValue(MONDAY_MS + 24 * 60 * 60 * 1000);
    await expect(claim()).resolves.toEqual(expect.objectContaining({
      granted: 0,
      reason: 'no_complete_minute',
    }));
    expect(mockResolvePremiumAccess).not.toHaveBeenCalled();
  });
});

describe('observedVideoWatchDuration', () => {
  it('accepts monotonic progress only within server elapsed time', () => {
    expect(verifiedVideoWatchProgress(10_000, 1_000, 11_200, 2_000)).toBe(1_000);
    expect(verifiedVideoWatchProgress(10_000, 1_000, 10_000, 2_000)).toBe(0);
    expect(verifiedVideoWatchProgress(80_000, 1_000, 10_000, 2_000)).toBe(0);
    expect(verifiedVideoWatchProgress(10_000, 1_000, 80_000, 2_000)).toBe(0);
    expect(verifiedVideoWatchProgress(10_000, 1_000, 11_000, 2_000, 81_000)).toBe(0);
  });
  it('derives full minutes from server timestamps and carries the remainder', () => {
    expect(observedVideoWatchDuration(1_000, 51_000, 20_000)).toEqual({
      elapsedMs: 50_000,
      completeMinutes: 1,
      carryMs: 10_000,
    });
  });

  it('caps one server session at 180 minutes', () => {
    expect(observedVideoWatchDuration(0, 24 * 60 * 60 * 1000, 0).completeMinutes).toBe(180);
  });
});
