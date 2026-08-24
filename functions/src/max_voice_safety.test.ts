// Privacy-safe MAX safety detection: pure parts without network or persistence.

import {
  MAX_VOICE_SAFETY_RATE_LIMIT,
  parseMaxVoiceSafetyReportData,
  reportMaxVoiceSafetySignal,
  reviewVoiceSafety,
  collectLocalVoiceVerdicts,
  dedupeVerdicts,
  sanitizeClientSafetyFlags,
} from './max_voice_safety';
import * as aiSafety from './ai_safety';
import { voiceQuotaDocId } from './max_voice_quota';

type DocData = Record<string, any>;

const docs = new Map<string, DocData>();

function deepMerge(target: DocData, source: DocData): DocData {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const current = target[key];
    result[key] = value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)
      && current && typeof current === 'object' && !Array.isArray(current) && !(current instanceof Date)
      ? deepMerge(current, value)
      : value;
  }
  return result;
}

function refFor(path: string) {
  return {
    path,
    get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }),
    set: async (data: DocData, options?: { merge?: boolean }) => {
      docs.set(path, options?.merge ? deepMerge(docs.get(path) ?? {}, data) : { ...data });
    },
  };
}

function fakeDb() {
  return {
    collection: (name: string) => ({ doc: (id: string) => refFor(`${name}/${id}`) }),
    runTransaction: async <T>(fn: (tx: any) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const tx = {
        get: (ref: ReturnType<typeof refFor>) => ref.get(),
        set: (ref: ReturnType<typeof refFor>, data: DocData, options?: { merge?: boolean }) => {
          writes.push(() => docs.set(ref.path, options?.merge ? deepMerge(docs.get(ref.path) ?? {}, data) : { ...data }));
        },
        update: (ref: ReturnType<typeof refFor>, data: DocData) => {
          writes.push(() => docs.set(ref.path, { ...(docs.get(ref.path) ?? {}), ...data }));
        },
      };
      const result = await fn(tx);
      writes.forEach((write) => write());
      return result;
    },
  };
}

/**
 * Firestore transactions are serializable. This harness holds a transaction
 * mutex through read + commit, so Promise.all exercises the same contention
 * guarantee instead of letting two callbacks commit stale Map snapshots.
 */
function serializableFakeDb() {
  let tail: Promise<void> = Promise.resolve();
  return {
    collection: (name: string) => ({ doc: (id: string) => refFor(`${name}/${id}`) }),
    runTransaction: <T>(fn: (tx: any) => Promise<T>): Promise<T> => {
      const run = tail.then(async () => {
        const writes: Array<() => void> = [];
        const tx = {
          get: (ref: ReturnType<typeof refFor>) => ref.get(),
          set: (ref: ReturnType<typeof refFor>, data: DocData, options?: { merge?: boolean }) => {
            writes.push(() => docs.set(ref.path, options?.merge ? deepMerge(docs.get(ref.path) ?? {}, data) : { ...data }));
          },
          update: (ref: ReturnType<typeof refFor>, data: DocData) => {
            writes.push(() => docs.set(ref.path, { ...(docs.get(ref.path) ?? {}), ...data }));
          },
        };
        const result = await fn(tx);
        writes.forEach((write) => write());
        return result;
      });
      tail = run.then(() => undefined, () => undefined);
      return run;
    },
  };
}

const NOW = 1_800_000_000_000;
const AUTH_UID = 'auth-owner';
const STABLE_UID = 'stable-owner';
const SESSION_ID = 'vs_12345678-1234-4234-9234-123456789abc';
const QUOTA_PATH = `voice_call_quotas/${voiceQuotaDocId(STABLE_UID)}`;

function liveQuota(overrides: DocData = {}): void {
  docs.set(QUOTA_PATH, {
    authUid: AUTH_UID,
    stableUid: STABLE_UID,
    activeSessionId: SESSION_ID,
    activatedAtMs: NOW - 20_000,
    reservedSec: 600,
    expiresAtMs: NOW + 600_000,
    lastHeartbeatMs: NOW - 10_000,
    ...overrides,
  });
}

describe('sanitizeClientSafetyFlags', () => {
  it('принимает только известные категории, дедупит, режет заметку и количество', () => {
    const flags = sanitizeClientSafetyFlags([
      { kind: 'harassment', note: 'x'.repeat(500) },
      { kind: 'harassment', note: 'dup' },
      { kind: 'teleport' },
      { kind: 'self_harm' },
      'junk',
      ...Array.from({ length: 20 }, () => ({ kind: 'other' })),
    ]);
    expect(flags.map((f) => f.kind)).toEqual(['harassment', 'self_harm', 'other']);
    expect(flags[0].note!.length).toBe(200);
    expect(sanitizeClientSafetyFlags('nope')).toEqual([]);
  });
});

describe('collectLocalVoiceVerdicts + dedupe', () => {
  const history = [
    { role: 'assistant' as const, content: 'Hi! How are you today?' },
    { role: 'user' as const, content: 'I want to kill myself' },
    { role: 'user' as const, content: 'ok whatever' },
  ];

  it('флаг учителя (инструмент) + словарь по репликам ученика; реплики учителя не судятся', () => {
    const items = collectLocalVoiceVerdicts(history, [{ kind: 'harassment', note: 'insulted the tutor' }]);
    expect(items.map((i) => [i.verdict.category, i.source])).toEqual([
      ['harassment', 'tutor_tool'],
      ['suicide', 'keywords'],
    ]);
    expect(items[0]).not.toHaveProperty('userText');
    expect(items[1]).not.toHaveProperty('userText');
  });

  it('дедуп по категории — первый источник побеждает', () => {
    const items = collectLocalVoiceVerdicts(history, [{ kind: 'suicide' }]);
    const unique = dedupeVerdicts(items);
    expect(unique).toHaveLength(1);
    expect(unique[0].source).toBe('tutor_tool');
  });
});

describe('MAX voice safety report payload', () => {
  test('accepts only the minimal stable-id payload', () => {
    expect(parseMaxVoiceSafetyReportData({
      sessionId: SESSION_ID,
      reportId: 'call_safety_01',
      kind: 'harassment',
    })).toEqual({
      sessionId: SESSION_ID,
      reportId: 'call_safety_01',
      kind: 'harassment',
    });

    expect(() => parseMaxVoiceSafetyReportData({
      sessionId: SESSION_ID,
      reportId: 'call_safety_01',
      kind: 'harassment',
      note: 'private learner text',
    })).toThrow('safety_payload_fields_invalid');
    expect(() => parseMaxVoiceSafetyReportData({
      sessionId: SESSION_ID,
      kind: 'harassment',
    })).toThrow('safety_report_id_required');

    expect(() => parseMaxVoiceSafetyReportData({
      sessionId: SESSION_ID,
      reportId: 'call_safety_01',
      kind: 'harassment',
      mode: 'voice_call',
    })).toThrow('safety_payload_fields_invalid');

    expect(parseMaxVoiceSafetyReportData({
      sessionId: SESSION_ID,
      reportId: 'c1',
      kind: 'harassment',
    }).reportId).toBe('c1');
    expect(parseMaxVoiceSafetyReportData({
      sessionId: SESSION_ID,
      reportId: 'provider.call/abc:1',
      kind: 'harassment',
    }).reportId).toBe('provider.call/abc:1');
  });
});

describe('MAX voice safety server guard', () => {
  beforeEach(() => {
    docs.clear();
    jest.restoreAllMocks();
  });

  function args(overrides: Partial<Parameters<typeof reportMaxVoiceSafetySignal>[1]> = {}) {
    return {
      authUid: AUTH_UID,
      stableUid: STABLE_UID,
      sessionId: SESSION_ID,
      reportId: 'call_safety_01',
      kind: 'harassment' as const,
      mode: 'voice_tutor' as const,
      nowMs: NOW,
      ...overrides,
    };
  }

  test.each([
    ['missing', undefined],
    ['foreign', { activeSessionId: 'vs_foreign' }],
    ['not activated', { activatedAtMs: 0 }],
    ['closed', { reservedSec: 0 }],
    ['expired', { expiresAtMs: NOW - 1 }],
    ['stale', { lastHeartbeatMs: NOW - 90_000 }],
  ])('rejects a %s session before sending', async (_label, quota) => {
    if (quota) liveQuota(quota);
    const send = jest.fn().mockResolvedValue(true);

    await expect(reportMaxVoiceSafetySignal(fakeDb() as any, args(), send))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    expect(send).not.toHaveBeenCalled();
  });

  test('sends once, replays the same report, and rejects a payload mismatch', async () => {
    liveQuota();
    const send = jest.fn().mockResolvedValue(true);

    await expect(reportMaxVoiceSafetySignal(fakeDb() as any, args(), send))
      .resolves.toEqual({ ok: true, replayed: false });
    await expect(reportMaxVoiceSafetySignal(fakeDb() as any, args(), send))
      .resolves.toEqual({ ok: true, replayed: true });
    await expect(reportMaxVoiceSafetySignal(fakeDb() as any, args({ kind: 'violence' }), send))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'safety_report_id_conflict' });
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('deduplicates the same category across a different report id', async () => {
    liveQuota();
    const send = jest.fn().mockResolvedValue(true);

    await reportMaxVoiceSafetySignal(fakeDb() as any, args(), send);
    await expect(reportMaxVoiceSafetySignal(fakeDb() as any, args({ reportId: 'finalize_harassment' }), send))
      .resolves.toEqual({ ok: true, replayed: true });
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('deduplicates the same session and category across internal modes', async () => {
    liveQuota();
    const send = jest.fn().mockResolvedValue(true);

    await reportMaxVoiceSafetySignal(fakeDb() as any, args({ mode: 'voice_tutor' }), send);
    await expect(reportMaxVoiceSafetySignal(
      fakeDb() as any,
      args({ reportId: 'legacy_voice_call_mode', mode: 'voice_call' }),
      send,
    )).resolves.toEqual({ ok: true, replayed: true });
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('serializes concurrent duplicate claims before invoking the sender', async () => {
    liveQuota();
    const db = serializableFakeDb();
    const send = jest.fn().mockResolvedValue(true);

    const results = await Promise.allSettled([
      reportMaxVoiceSafetySignal(db as any, args(), send),
      reportMaxVoiceSafetySignal(db as any, args(), send),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toEqual([
      { status: 'fulfilled', value: { ok: true, replayed: false } },
    ]);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      status: 'rejected',
      reason: { code: 'unavailable', message: 'safety_signal_delivery_pending' },
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('rate-limits unique signals in a live session', async () => {
    liveQuota();
    const send = jest.fn().mockResolvedValue(true);
    const kinds = ['self_harm', 'suicide', 'abuse', 'harassment', 'sexual', 'violence', 'hate'] as const;

    for (let i = 0; i < MAX_VOICE_SAFETY_RATE_LIMIT; i += 1) {
      await reportMaxVoiceSafetySignal(fakeDb() as any, args({ reportId: `call_${i}`, kind: kinds[i] }), send);
    }
    await expect(reportMaxVoiceSafetySignal(
      fakeDb() as any,
      args({ reportId: 'call_over_limit', kind: kinds[MAX_VOICE_SAFETY_RATE_LIMIT] }),
      send,
    )).rejects.toMatchObject({ code: 'resource-exhausted', message: 'safety_report_rate_limited' });
    expect(send).toHaveBeenCalledTimes(MAX_VOICE_SAFETY_RATE_LIMIT);
  });

  test('keeps bounded opaque guard state inside the account-scoped quota document', async () => {
    liveQuota();
    await reportMaxVoiceSafetySignal(fakeDb() as any, args(), jest.fn().mockResolvedValue(true));

    expect([...docs.keys()].filter((path) => path.startsWith('max_voice_safety_guards/'))).toEqual([]);
    const guard = docs.get(QUOTA_PATH)?.safetyGuard;
    expect(guard).toBeDefined();
    expect(Object.keys(guard.reportDigests)).toHaveLength(1);
    expect(Object.keys(guard.payloadDigests)).toHaveLength(1);
    expect(JSON.stringify(guard)).not.toMatch(/auth-owner|stable-owner|vs_12345678|harassment|voice_tutor|private/i);
    expect(guard.expiresAt).toBeInstanceOf(Date);
  });

  test('starts a fresh bounded guard when the account opens another session', async () => {
    liveQuota();
    const send = jest.fn().mockResolvedValue(true);
    await reportMaxVoiceSafetySignal(fakeDb() as any, args(), send);
    const nextSessionId = 'vs_87654321-4321-4321-8321-cba987654321';
    liveQuota({ activeSessionId: nextSessionId });
    await reportMaxVoiceSafetySignal(fakeDb() as any, args({
      sessionId: nextSessionId,
      reportId: 'c1',
      kind: 'violence',
    }), send);

    const guard = docs.get(QUOTA_PATH)?.safetyGuard;
    expect(Object.keys(guard.reportDigests)).toHaveLength(1);
    expect(Object.keys(guard.payloadDigests)).toHaveLength(1);
    expect(send).toHaveBeenCalledTimes(2);
  });

  test('does not claim a false delivery and permits a retry of the same report', async () => {
    liveQuota();
    const send = jest.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(reportMaxVoiceSafetySignal(fakeDb() as any, args(), send))
      .rejects.toMatchObject({ code: 'unavailable', message: 'safety_signal_delivery_failed' });
    await expect(reportMaxVoiceSafetySignal(fakeDb() as any, args(), send))
      .resolves.toEqual({ ok: true, replayed: false });
    await expect(reportMaxVoiceSafetySignal(fakeDb() as any, args(), send))
      .resolves.toEqual({ ok: true, replayed: true });
    expect(send).toHaveBeenCalledTimes(2);
  });

  test('does not claim an uncertain thrown delivery or resend it', async () => {
    liveQuota();
    const send = jest.fn()
      .mockRejectedValueOnce(new Error('accepted upstream, process lost response'))
      .mockResolvedValueOnce(true);

    await expect(reportMaxVoiceSafetySignal(fakeDb() as any, args(), send))
      .rejects.toMatchObject({ code: 'unavailable', message: 'safety_signal_delivery_uncertain' });
    await expect(reportMaxVoiceSafetySignal(fakeDb() as any, args(), send))
      .rejects.toMatchObject({ code: 'unavailable', message: 'safety_signal_delivery_uncertain' });
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('normalizes an older pre-delivery claim to honest uncertain state', async () => {
    liveQuota();
    const initialSend = jest.fn().mockResolvedValue(true);
    await reportMaxVoiceSafetySignal(fakeDb() as any, args(), initialSend);
    const quota = docs.get(QUOTA_PATH)!;
    quota.safetyGuard.schemaVersion = 2;
    const send = jest.fn().mockResolvedValue(true);

    await expect(reportMaxVoiceSafetySignal(fakeDb() as any, args(), send))
      .rejects.toMatchObject({ code: 'unavailable', message: 'safety_signal_delivery_uncertain' });
    expect(send).not.toHaveBeenCalled();
    const normalized = docs.get(QUOTA_PATH)?.safetyGuard;
    expect(normalized.schemaVersion).toBe(3);
    expect(Object.keys(normalized.uncertainDigests)).toHaveLength(1);
  });

  test('legacy review caller cannot signal an old settled session', async () => {
    liveQuota({
      activeSessionId: null,
      reservedSec: 0,
      expiresAtMs: 0,
      lastSettledSessionId: SESSION_ID,
    });
    const signal = jest.spyOn(aiSafety, 'recordMaxVoiceSafetySignal').mockResolvedValue(true);
    jest.spyOn(aiSafety, 'moderateUserText').mockResolvedValue({ flagged: false, category: null, matched: null });
    const reviewArgs = {
      apiKey: 'unused',
      authUid: AUTH_UID,
      stableUid: STABLE_UID,
      mode: 'voice_tutor',
      history: [],
      clientFlags: [{ kind: 'harassment' }],
      sessionId: SESSION_ID,
      db: fakeDb() as any,
      nowMs: NOW,
    };

    await reviewVoiceSafety(reviewArgs);
    await reviewVoiceSafety(reviewArgs);
    expect(signal).not.toHaveBeenCalled();
  });

  test('trusted settled allowance still rejects a stale settlement clock', async () => {
    liveQuota({
      activeSessionId: null,
      reservedSec: 0,
      expiresAtMs: 0,
      lastSettledSessionId: SESSION_ID,
      lastSettledAtMs: NOW - (24 * 60 * 60 * 1000),
      updatedAtMs: NOW - 1_000,
    });
    const send = jest.fn().mockResolvedValue(true);

    await expect(reportMaxVoiceSafetySignal(
      fakeDb() as any,
      args({ allowSettled: true }),
      send,
    )).rejects.toMatchObject({ code: 'failed-precondition', message: 'safety_session_not_active' });
    expect(send).not.toHaveBeenCalled();
  });

  test('a fresh new mint cannot revive the previous stale settled session', async () => {
    liveQuota({
      activeSessionId: 'vs_87654321-4321-4321-8321-cba987654321',
      lastSettledSessionId: SESSION_ID,
      lastSettledAtMs: NOW - (24 * 60 * 60 * 1000),
      updatedAtMs: NOW - 100,
    });
    const send = jest.fn().mockResolvedValue(true);

    await expect(reportMaxVoiceSafetySignal(
      fakeDb() as any,
      args({ allowSettled: true }),
      send,
    )).rejects.toMatchObject({ code: 'failed-precondition', message: 'safety_session_not_active' });
    expect(send).not.toHaveBeenCalled();
  });

  test('trusted final review can signal a settled session once across retries', async () => {
    liveQuota({
      activeSessionId: null,
      reservedSec: 0,
      expiresAtMs: 0,
      lastSettledSessionId: SESSION_ID,
      lastSettledAtMs: NOW - 1_000,
      updatedAtMs: NOW - 1_000,
    });
    const signal = jest.spyOn(aiSafety, 'recordMaxVoiceSafetySignal').mockResolvedValue(true);
    jest.spyOn(aiSafety, 'moderateUserText').mockResolvedValue({ flagged: false, category: null, matched: null });
    const reviewArgs = {
      apiKey: 'unused',
      authUid: AUTH_UID,
      stableUid: STABLE_UID,
      mode: 'voice_tutor',
      history: [],
      clientFlags: [{ kind: 'harassment' }],
      sessionId: SESSION_ID,
      db: fakeDb() as any,
      nowMs: NOW,
      allowSettled: true,
    };

    await reviewVoiceSafety(reviewArgs);
    await reviewVoiceSafety(reviewArgs);
    expect(signal).toHaveBeenCalledTimes(1);
  });
});
