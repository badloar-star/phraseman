// Тест №13 спеки: дожим висящих резервов по ПОСЛЕДНЕМУ heartbeat (не полным
// резервом), briefing_abandoned для минтов без старта, декремент rate limit с floor.
type DocData = Record<string, any>;

// ── in-memory Firestore fake с поддержкой where-чейна watchdog-запроса ──────
const docs = new Map<string, DocData>();
let autoId = 0;

function deepMerge(target: DocData, source: DocData): DocData {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    if (value && typeof value === 'object' && !Array.isArray(value)
      && existing && typeof existing === 'object' && !Array.isArray(existing)) {
      result[key] = deepMerge(existing as DocData, value as DocData);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function refFor(pathKey: string) {
  return {
    path: pathKey,
    get: async () => ({ exists: docs.has(pathKey), data: () => docs.get(pathKey) }),
    set: async (data: DocData, opts?: { merge?: boolean }) => {
      docs.set(pathKey, opts?.merge ? deepMerge(docs.get(pathKey) ?? {}, data) : { ...data });
    },
  };
}

type Filter = { field: string; op: string; value: number };

function applyFilters(name: string, filters: Filter[], limitN: number) {
  const prefix = `${name}/`;
  const matched = Array.from(docs.entries())
    .filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/'))
    .filter(([, data]) => filters.every((f) => {
      const v = Number(data[f.field] ?? 0);
      if (f.op === '>') return v > f.value;
      if (f.op === '<=') return v <= f.value;
      throw new Error(`unsupported op ${f.op}`);
    }))
    .slice(0, limitN);
  return {
    docs: matched.map(([p, data]) => ({ id: p.slice(prefix.length), data: () => data })),
    empty: matched.length === 0,
  };
}

function queryFor(name: string, filters: Filter[]) {
  return {
    where: (field: string, op: string, value: number) => queryFor(name, [...filters, { field, op, value }]),
    limit: (n: number) => ({ get: async () => applyFilters(name, filters, n) }),
  };
}

function fakeDb() {
  return {
    collection: (name: string) => ({
      // Без id — авто-ID (billing-строки watchdog'а пишутся через .doc()).
      doc: (id?: string) => refFor(`${name}/${id || `auto-${++autoId}`}`),
      where: (field: string, op: string, value: number) => queryFor(name, [{ field, op, value }]),
    }),
    runTransaction: async <T>(fn: (tx: any) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const tx = {
        get: (ref: any) => ref.get(),
        set: (ref: any, data: DocData, opts?: { merge?: boolean }) => {
          writes.push(() => {
            docs.set(ref.path, opts?.merge ? deepMerge(docs.get(ref.path) ?? {}, data) : { ...data });
          });
        },
      };
      const result = await fn(tx);
      writes.forEach((w) => w());
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
  onCall: (optsOrHandler: unknown, maybeHandler?: unknown) =>
    typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));

jest.mock('firebase-functions/v2', () => ({
  scheduler: { onSchedule: (opts: unknown, handler: unknown) => Object.assign(handler as object, { __opts: opts }) },
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: () => ({ value: () => 'sk-test-key' }),
}));

jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => fakeDb());
  (firestore as any).FieldValue = { serverTimestamp: () => ({ __op: 'serverTimestamp' }) };
  return { apps: [{}], initializeApp: jest.fn(), firestore };
});

jest.mock('./auth_identity', () => ({ resolveStableUidForAuth: async () => 'stable-1' }));
jest.mock('./premium_status', () => ({ resolvePremiumAccess: async () => true }));
jest.mock('./remote_gates', () => ({ aiGloballyDisabled: async () => false }));

import { voiceQuotaDocId } from './max_voice_quota';
import { VOICE_EST_COST_USD_PER_MIN, utcDayKey, voiceMintRateDocId } from './max_voice_mint';
import { VOICE_PRICE_TABLE_DATE } from './max_voice_session_end';
import {
  VOICE_WATCHDOG_HEARTBEAT_GRACE_MS,
  MAX_VOICE_PROVIDER_HEALTH_SCHEDULE,
  maxVoiceProviderHealth,
  maxVoiceWatchdog,
  runMaxVoiceWatchdogOnce,
} from './max_voice_watchdog';

const maxVoiceMintModule = jest.requireActual<typeof import('./max_voice_mint')>('./max_voice_mint');

const NOW = 1_800_000_000_000;
const AUTH = 'auth-1';
const STABLE = 'stable-1';
const QUOTA_PATH = `voice_call_quotas/${voiceQuotaDocId(AUTH, STABLE)}`;
const RATE_PATH = `voice_mint_rate_limits/${voiceMintRateDocId(AUTH, STABLE)}`;
const BUDGET_PATH = 'voice_cost_daily/current';

function billingDocs(): DocData[] {
  return Array.from(docs.entries())
    .filter(([p]) => p.startsWith('voice_call_billing/'))
    .map(([, d]) => d);
}

function hangingReserve(overrides: DocData = {}): DocData {
  return {
    authUid: AUTH,
    stableUid: STABLE,
    resetAtMs: NOW + 3_600_000,
    monthResetAtMs: NOW + 86_400_000,
    dailyUsedSec: 320,
    monthlyUsedSec: 320,
    activeSessionId: 's1',
    sessionStartedAtMs: NOW - 600_000,
    reservedSec: 320,
    expiresAtMs: NOW - 1_000, // резерв протух
    lastHeartbeatMs: NOW - 460_000, // прожито 140с, потом тишина
    reconnectChain: { rootId: 's1', count: 0, gapSecTotal: 0 },
    ...overrides,
  };
}

function db() {
  return jest.requireMock('firebase-admin').firestore();
}

beforeEach(() => {
  docs.clear();
  autoId = 0;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('runMaxVoiceWatchdogOnce', () => {
  it('settles a hung reserve by the LAST heartbeat, not the full reserve', async () => {
    docs.set(QUOTA_PATH, hangingReserve());

    const stats = await runMaxVoiceWatchdogOnce(db(), NOW);

    expect(stats).toMatchObject({ scanned: 1, settled: 1, released: 0, skippedAlive: 0, errors: 0 });
    expect(docs.get(QUOTA_PATH)).toMatchObject({
      activeSessionId: null,
      reservedSec: 0,
      dailyUsedSec: 140, // списано по heartbeat (140с), хвост 180с возвращён
      monthlyUsedSec: 140,
      lastEndReason: 'watchdog',
    });
  });

  it('settle refunds the unused budget estimate and writes a watchdog billing row', async () => {
    docs.set(QUOTA_PATH, hangingReserve({
      usageTotals: { audioInputTokens: 1500, audioOutputTokens: 2500, cachedTokens: 400, textTokens: 50 },
      reconnectChain: { rootId: 'root-1', count: 1, gapSecTotal: 5 },
    }));
    docs.set(BUDGET_PATH, { dayKey: utcDayKey(NOW), estUsd: 1 });

    const stats = await runMaxVoiceWatchdogOnce(db(), NOW);
    expect(stats.settled).toBe(1);

    // Сторно бюджета: хвост 320−140=180с → (180/60)×$0.05 = $0.15.
    expect(docs.get(BUDGET_PATH)!.estUsd)
      .toBeCloseTo(1 - (180 / 60) * VOICE_EST_COST_USD_PER_MIN, 10);

    // Billing-строка watchdog-сеттла: usage из heartbeat-аккумулятора дока квоты,
    // seconds = chargedSec, callGroupId = корень чейна.
    const bills = billingDocs();
    expect(bills).toHaveLength(1);
    expect(bills[0]).toMatchObject({
      uid: STABLE,
      authUid: AUTH,
      sessionId: 's1',
      callGroupId: 'root-1',
      seconds: 140,
      audioInputTokens: 1500,
      audioOutputTokens: 2500,
      cachedTokens: 400,
      textTokens: 50,
      endReason: 'watchdog',
      channel: 'realtime',
      priceTableDate: VOICE_PRICE_TABLE_DATE,
      xpAwarded: 0,
    });
    expect(bills[0].estCostUsd).toBeGreaterThan(0);
  });

  it('a late client end after the watchdog settle neither double-refunds nor double-bills', async () => {
    docs.set(QUOTA_PATH, hangingReserve());
    docs.set(BUDGET_PATH, { dayKey: utcDayKey(NOW), estUsd: 1 });

    await runMaxVoiceWatchdogOnce(db(), NOW);
    const budgetAfter = docs.get(BUDGET_PATH)!.estUsd;
    const billsAfter = billingDocs().length;

    // Повторный проход (аналог гонки с опоздавшим end): резерв уже закрыт.
    const stats = await runMaxVoiceWatchdogOnce(db(), NOW);
    expect(stats).toMatchObject({ settled: 0, released: 0 });
    expect(docs.get(BUDGET_PATH)!.estUsd).toBe(budgetAfter);
    expect(billingDocs()).toHaveLength(billsAfter);
  });

  it('leaves a session with a fresh heartbeat alone even after expiresAtMs', async () => {
    docs.set(QUOTA_PATH, hangingReserve({ lastHeartbeatMs: NOW - 30_000 }));
    const before = JSON.stringify(docs.get(QUOTA_PATH));

    const stats = await runMaxVoiceWatchdogOnce(db(), NOW);

    expect(stats).toMatchObject({ scanned: 1, settled: 0, released: 0, skippedAlive: 1 });
    expect(JSON.stringify(docs.get(QUOTA_PATH))).toBe(before);
    expect(VOICE_WATCHDOG_HEARTBEAT_GRACE_MS).toBe(120_000);
  });

  it('releases a mint that never started (briefing_abandoned) and decrements the rate slot', async () => {
    // Ни одного heartbeat после старта: lastHeartbeatMs == sessionStartedAtMs.
    docs.set(QUOTA_PATH, hangingReserve({ lastHeartbeatMs: NOW - 600_000 }));
    docs.set(RATE_PATH, { windowStartMs: NOW - 300_000, count: 5 });
    docs.set(BUDGET_PATH, { dayKey: utcDayKey(NOW), estUsd: 1 });

    const stats = await runMaxVoiceWatchdogOnce(db(), NOW);

    expect(stats).toMatchObject({ scanned: 1, settled: 0, released: 1 });
    expect(docs.get(QUOTA_PATH)).toMatchObject({
      activeSessionId: null,
      reservedSec: 0,
      dailyUsedSec: 0, // полный возврат
      monthlyUsedSec: 0,
      lastReleaseReason: 'briefing_abandoned',
    });
    expect(docs.get(RATE_PATH)!.count).toBe(4); // минт не считается
    // Сторно ВСЕЙ оценки минта: (320/60)×$0.05 — звонок так и не начался.
    expect(docs.get(BUDGET_PATH)!.estUsd)
      .toBeCloseTo(1 - (320 / 60) * VOICE_EST_COST_USD_PER_MIN, 10);
    // Release не порождает billing-строку: расхода токенов не было.
    expect(billingDocs()).toHaveLength(0);
  });

  it('rate decrement floors at 1 counted mint (no infinite free mint loop)', async () => {
    docs.set(QUOTA_PATH, hangingReserve({ lastHeartbeatMs: NOW - 600_000 }));
    docs.set(RATE_PATH, { windowStartMs: NOW - 300_000, count: 1 });

    await runMaxVoiceWatchdogOnce(db(), NOW);

    expect(docs.get(RATE_PATH)!.count).toBe(1); // floor
  });

  it('ignores live and already-settled reserves entirely', async () => {
    docs.set(QUOTA_PATH, hangingReserve({ expiresAtMs: NOW + 100_000 })); // ещё не протух
    docs.set('voice_call_quotas/vq_other', hangingReserve({ reservedSec: 0, expiresAtMs: 0 })); // закрыт

    const stats = await runMaxVoiceWatchdogOnce(db(), NOW);

    expect(stats).toMatchObject({ scanned: 0, settled: 0, released: 0 });
  });

  it('one bad doc does not stop the sweep', async () => {
    docs.set('voice_call_quotas/vq_broken', hangingReserve({ authUid: '', stableUid: '' })); // нечего дожимать
    docs.set(QUOTA_PATH, hangingReserve());

    const stats = await runMaxVoiceWatchdogOnce(db(), NOW);

    expect(stats.settled).toBe(1); // здоровый док обработан
  });
});

describe('scheduled wrapper', () => {
  it('runs every 10 minutes in UTC', () => {
    expect((maxVoiceWatchdog as any).__opts).toMatchObject({ schedule: 'every 10 minutes', timeZone: 'UTC' });
  });

  it('probes the provider every 10 minutes with one instance and the OpenAI secret', () => {
    expect(MAX_VOICE_PROVIDER_HEALTH_SCHEDULE).toBe('every 10 minutes');
    expect((maxVoiceProviderHealth as any).__opts).toMatchObject({
      schedule: 'every 10 minutes',
      timeZone: 'UTC',
      maxInstances: 1,
      timeoutSeconds: 30,
      secrets: [expect.any(Object)],
    });
  });

  it('keeps a successful full-profile probe out of the critical error stream', async () => {
    const probe = jest.spyOn(maxVoiceMintModule, 'runMaxVoiceProviderProbe')
      .mockResolvedValue({ profile: 'full', expiresAt: Math.floor(NOW / 1000) + 60 });

    await (maxVoiceProviderHealth as any)({});

    expect(probe).toHaveBeenCalledWith('sk-test-key', expect.objectContaining({
      model: 'gpt-realtime-2.1-mini',
      voice: 'marin',
    }));
    expect(Array.from(docs.keys()).filter((pathKey) => pathKey.startsWith('app_errors/'))).toEqual([]);
  });

  it('records a critical error when only the compatibility profile survives', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    jest.spyOn(maxVoiceMintModule, 'runMaxVoiceProviderProbe')
      .mockResolvedValue({ profile: 'compatibility', expiresAt: Math.floor(NOW / 1000) + 60 });

    await (maxVoiceProviderHealth as any)({});

    expect(docs.get(`app_errors/max_voice_provider_health_${Math.floor(NOW / 3_600_000)}`))
      .toMatchObject({
        severity: 'critical',
        feature: 'max_voice',
        context: 'max_voice_provider_health',
        status: 'new',
      });
  });

  it('records and rethrows a hard provider failure so Scheduler marks the run failed', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    jest.spyOn(maxVoiceMintModule, 'runMaxVoiceProviderProbe')
      .mockRejectedValue(new Error('provider_down'));

    await expect((maxVoiceProviderHealth as any)({})).rejects.toThrow('provider_down');
    expect(docs.get(`app_errors/max_voice_provider_health_${Math.floor(NOW / 3_600_000)}`))
      .toMatchObject({
        severity: 'critical',
        errorName: 'MaxVoiceProviderHealthError',
        message: 'provider_down',
      });
  });
});
