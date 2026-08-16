// Тест №12 спеки: сеттлмент min(факт, резерв) + возврат остатка, XP-формула
// с клампами и floor, fraud-лог при drift >30%, billing-запись со всеми полями.
type DocData = Record<string, any>;

// ── in-memory Firestore fake (хаус-паттерн explain_phrase.test.ts) ──────────
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

function fakeDb() {
  return {
    collection: (name: string) => ({
      doc: (id?: string) => refFor(`${name}/${id || `auto-${++autoId}`}`),
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

jest.mock('firebase-functions/params', () => ({
  defineSecret: () => ({ value: () => 'sk-test-key' }),
}));

jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => fakeDb());
  (firestore as any).FieldValue = { serverTimestamp: () => ({ __op: 'serverTimestamp' }) };
  return { apps: [{}], initializeApp: jest.fn(), firestore };
});

jest.mock('./auth_identity', () => ({
  resolveStableUidForAuth: async () => 'stable-1',
}));

jest.mock('./premium_status', () => ({
  resolvePremiumAccess: async () => true,
}));

jest.mock('./remote_gates', () => ({
  aiGloballyDisabled: async () => false,
}));

jest.mock('./max_voice_config', () => {
  const actual = jest.requireActual('./max_voice_config');
  return {
    ...actual,
    resolveMaxVoiceConfig: async () => currentConfig,
  };
});

import { clampMaxVoiceConfig, type MaxVoiceConfig } from './max_voice_config';
import { voiceQuotaDocId } from './max_voice_quota';
import { VOICE_EST_COST_USD_PER_MIN, utcDayKey } from './max_voice_mint';
import {
  AUDIO_TOKENS_PER_SEC,
  VOICE_PRICES,
  VOICE_PRICE_TABLE_DATE,
  VOICE_XP_FLOOR_MIN_AUDIO_TOKENS,
  computeVoiceXp,
  detectSpeechDrift,
  maxVoiceHeartbeat as heartbeatRaw,
  maxVoiceSessionEnd as endRaw,
  recordVoiceHeartbeatUsage,
} from './max_voice_session_end';

let currentConfig: MaxVoiceConfig = clampMaxVoiceConfig({ gate_ai_voice_call: true });

type CallableRequest = { auth?: { uid: string }; data: DocData };
const heartbeat = heartbeatRaw as unknown as (request: CallableRequest) => Promise<DocData>;
const sessionEnd = endRaw as unknown as (request: CallableRequest) => Promise<DocData>;

const NOW = 1_800_000_000_000;
const AUTH = 'auth-1';
const STABLE = 'stable-1';
const QUOTA_PATH = `voice_call_quotas/${voiceQuotaDocId(AUTH, STABLE)}`;
const BUDGET_PATH = 'voice_cost_daily/current';

function liveQuota(overrides: DocData = {}): void {
  docs.set(QUOTA_PATH, {
    authUid: AUTH,
    stableUid: STABLE,
    resetAtMs: NOW + 3_600_000,
    monthResetAtMs: NOW + 86_400_000,
    dailyUsedSec: 320,
    monthlyUsedSec: 320,
    activeSessionId: 's1',
    sessionStartedAtMs: NOW - 200_000, // серверный факт: 200с
    reservedSec: 320,
    expiresAtMs: NOW + 300_000,
    lastHeartbeatMs: NOW - 10_000,
    reconnectChain: { rootId: 'root-1', count: 1, gapSecTotal: 10 },
    usageTotals: { audioInputTokens: 2000, audioOutputTokens: 3000, cachedTokens: 500, textTokens: 100 },
    ...overrides,
  });
}

function billingDocs(): DocData[] {
  return Array.from(docs.entries())
    .filter(([p]) => p.startsWith('voice_call_billing/'))
    .map(([, d]) => d);
}

const END_DATA: DocData = {
  sessionId: 's1',
  elapsedSec: 200,
  clientSpeechSec: 90,
  repliesCount: 6,
  transcriptWordCount: 400,
  usage: { audioInputTokens: 2100, audioOutputTokens: 2900, cachedTokens: 600, textTokens: 100 },
  endReason: 'completed',
  scenarioId: 'coffee_shop',
  cefr: 'B1',
  channel: 'realtime',
  trialVariant: 'scenario',
};

let warnSpy: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
  docs.clear();
  autoId = 0;
  currentConfig = clampMaxVoiceConfig({ gate_ai_voice_call: true });
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('maxVoiceSessionEnd — settlement', () => {
  it('charges min(fact, reserve) by SERVER clock, refunds the tail, writes full billing', async () => {
    liveQuota();
    docs.set(BUDGET_PATH, { dayKey: utcDayKey(NOW), estUsd: 1 });

    const res = await sessionEnd({ auth: { uid: AUTH }, data: END_DATA });

    expect(res).toMatchObject({ ok: true, alreadySettled: false, chargedSec: 200, refundedSec: 120 });
    expect(docs.get(QUOTA_PATH)).toMatchObject({
      activeSessionId: null,
      reservedSec: 0,
      dailyUsedSec: 200,
      monthlyUsedSec: 200,
      lastEndReason: 'completed',
    });

    // Billing-запись со ВСЕМИ полями раздела 2.
    const bills = billingDocs();
    expect(bills).toHaveLength(1);
    expect(bills[0]).toMatchObject({
      uid: STABLE,
      authUid: AUTH,
      sessionId: 's1',
      callGroupId: 'root-1', // корень reconnect-чейна, не sessionId
      model: 'gpt-realtime-2.1-mini',
      seconds: 200,
      // max(аккумулятор heartbeat'ов, финальный отчёт) — по каждому счётчику.
      audioInputTokens: 2100,
      audioOutputTokens: 3000,
      cachedTokens: 600,
      textTokens: 100,
      priceTableDate: VOICE_PRICE_TABLE_DATE,
      scenarioId: 'coffee_shop',
      cefr: 'B1',
      channel: 'realtime',
      trialVariant: 'scenario',
      endReason: 'completed',
    });
    expect(bills[0].transcriptionCostUsd).toBeCloseTo((200 / 60) * VOICE_PRICES.transcriptionPerMin, 10);
    expect(bills[0].estCostUsd).toBeGreaterThan(bills[0].transcriptionCostUsd);
    expect(bills[0].xpAwarded).toBe(res.xpAwarded);

    // XP: speech = min(90, 200×0.8, 400/2) = 90 → (90/60)×10×1.2(B1) = 18.
    expect(res.xpAwarded).toBe(18);

    // Сторно бюджета: refund (120/60)×$0.05 = $0.1 → 1 − 0.1 = 0.9.
    expect(docs.get(BUDGET_PATH)!.estUsd).toBeCloseTo(1 - (120 / 60) * VOICE_EST_COST_USD_PER_MIN, 10);
  });

  it('bills from the ACTIVATION clock when the call was pre-minted and idled before hello', async () => {
    // Минт 260с назад, «алло» (первый heartbeat) 200с назад: разговор = 200с, не 260.
    liveQuota({ sessionStartedAtMs: NOW - 260_000, activatedAtMs: NOW - 200_000 });
    const res = await sessionEnd({ auth: { uid: AUTH }, data: END_DATA });
    expect(res.chargedSec).toBe(200);
    expect(res.refundedSec).toBe(120);
  });

  it('a never-activated session (abandoned premint) released with elapsed 0 is charged nothing', async () => {
    // Минт 60с назад, ни одного heartbeat: юзер ушёл с пре-экрана, клиент шлёт release.
    liveQuota({ sessionStartedAtMs: NOW - 60_000, activatedAtMs: 0, lastHeartbeatMs: NOW - 60_000 });
    const res = await sessionEnd({
      auth: { uid: AUTH },
      data: { ...END_DATA, elapsedSec: 0, clientSpeechSec: 0, repliesCount: 0, transcriptWordCount: 0, endReason: 'dropped',
        usage: { audioInputTokens: 0, audioOutputTokens: 0, cachedTokens: 0, textTokens: 0 } },
    });
    expect(res.chargedSec).toBe(0);
    expect(res.refundedSec).toBe(320); // весь резерв назад
    expect(docs.get(QUOTA_PATH)).toMatchObject({ activeSessionId: null, reservedSec: 0 });
  });

  it('a never-activated session from an old client is charged by its own seconds, capped by the wall', async () => {
    liveQuota({ sessionStartedAtMs: NOW - 25_000, activatedAtMs: 0, lastHeartbeatMs: NOW - 25_000 });
    const res = await sessionEnd({ auth: { uid: AUTH }, data: { ...END_DATA, elapsedSec: 20 } });
    expect(res.chargedSec).toBe(20);
    const res2 = await (async () => {
      liveQuota({ sessionStartedAtMs: NOW - 25_000, activatedAtMs: 0, lastHeartbeatMs: NOW - 25_000 });
      return sessionEnd({ auth: { uid: AUTH }, data: { ...END_DATA, elapsedSec: 999 } });
    })();
    expect(res2.chargedSec).toBe(25); // не больше стены
  });

  it('the client cannot inflate seconds: server wall clock wins', async () => {
    liveQuota();
    const res = await sessionEnd({ auth: { uid: AUTH }, data: { ...END_DATA, elapsedSec: 99_999 } });
    expect(res.chargedSec).toBe(200); // не 99999
  });

  it('logs analytics on client/server timer drift >30s', async () => {
    liveQuota();
    await sessionEnd({ auth: { uid: AUTH }, data: { ...END_DATA, elapsedSec: 100 } }); // сервер: 200
    expect(warnSpy.mock.calls.some((c) => String(c[0]).includes('timer drift'))).toBe(true);
  });

  it('fraud-logs (no ban) when clientSpeechSec drifts >30% above the server estimate', async () => {
    // 500 аудио-токенов ≈ 50с речи; клиент заявляет 150с.
    liveQuota({ usageTotals: { audioInputTokens: 500, audioOutputTokens: 0, cachedTokens: 0, textTokens: 0 } });
    const res = await sessionEnd({
      auth: { uid: AUTH },
      data: { ...END_DATA, clientSpeechSec: 150, usage: { audioInputTokens: 500 } },
    });
    expect(res.ok).toBe(true); // не бан — сессия сеттлится нормально
    expect(warnSpy.mock.calls.some((c) => String(c[0]).includes('fraud'))).toBe(true);
  });

  it('awards zero XP to a silent session even when the client claims a reply', async () => {
    // Молчаливый фарм: микрофон открыт, речи нет (audioInputTokens=0),
    // клиент шлёт repliesCount=1 и honest нули по речи/словам. Сессия 300с.
    liveQuota({
      sessionStartedAtMs: NOW - 300_000,
      usageTotals: { audioInputTokens: 0, audioOutputTokens: 0, cachedTokens: 0, textTokens: 0 },
    });
    const res = await sessionEnd({
      auth: { uid: AUTH },
      data: {
        ...END_DATA,
        elapsedSec: 300,
        clientSpeechSec: 0,
        transcriptWordCount: 0,
        repliesCount: 1,
        usage: { audioInputTokens: 0, audioOutputTokens: 0, cachedTokens: 0, textTokens: 0 },
      },
    });
    expect(res.chargedSec).toBe(300);
    expect(res.xpAwarded).toBe(0); // floor без серверного подтверждения речи не работает
  });

  it('is idempotent: a second end (race with watchdog) writes no second billing row', async () => {
    liveQuota();
    await sessionEnd({ auth: { uid: AUTH }, data: END_DATA });
    const res = await sessionEnd({ auth: { uid: AUTH }, data: END_DATA });
    expect(res).toMatchObject({ alreadySettled: true, chargedSec: 0, refundedSec: 0, xpAwarded: 0 });
    expect(billingDocs()).toHaveLength(1);
  });

  it('maps an unknown endReason to dropped (not a refusal, not completed)', async () => {
    liveQuota();
    const res = await sessionEnd({
      auth: { uid: AUTH },
      data: { ...END_DATA, endReason: 'hacked', channel: 'espionage', trialVariant: 'weird' },
    });
    // Запись состоялась, неизвестный reason честно лёг как 'dropped'.
    expect(res).toMatchObject({ ok: true, alreadySettled: false, chargedSec: 200 });
    expect(billingDocs()[0]).toMatchObject({ endReason: 'dropped', channel: 'realtime', trialVariant: null });
  });

  it("maps the client's legacy 'failed' reason to dropped as well", async () => {
    liveQuota();
    await sessionEnd({ auth: { uid: AUTH }, data: { ...END_DATA, endReason: 'failed' } });
    expect(billingDocs()[0]).toMatchObject({ endReason: 'dropped' });
  });

  it('applies the XP daily cap to the ACCUMULATED total across sessions', async () => {
    // Каждая сессия сама по себе даёт 18 XP (см. основной тест); кэп 20 в день.
    currentConfig = clampMaxVoiceConfig({ gate_ai_voice_call: true, xpDailyCap: 20 });

    liveQuota();
    const first = await sessionEnd({ auth: { uid: AUTH }, data: END_DATA });
    expect(first.xpAwarded).toBe(18);

    // Вторая сессия того же дня: доступен только остаток кэпа 20 − 18 = 2.
    // (liveQuota перезаписывает док — переносим дневной XP-аккумулятор.)
    const afterFirst = docs.get(QUOTA_PATH)!;
    liveQuota({
      activeSessionId: 's2',
      xpDayKey: afterFirst.xpDayKey,
      xpAwardedToday: afterFirst.xpAwardedToday,
    });
    const second = await sessionEnd({ auth: { uid: AUTH }, data: { ...END_DATA, sessionId: 's2' } });
    expect(second.xpAwarded).toBe(2);

    expect(docs.get(QUOTA_PATH)).toMatchObject({ xpDayKey: utcDayKey(NOW), xpAwardedToday: 20 });
    // Billing фиксирует фактически начисленное, не «сырое» значение.
    expect(billingDocs().map((b) => b.xpAwarded).sort()).toEqual([18, 2].sort());
  });

  it('rejects unauthenticated calls and empty sessionId', async () => {
    await expect(sessionEnd({ auth: undefined, data: END_DATA }))
      .rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(sessionEnd({ auth: { uid: AUTH }, data: { ...END_DATA, sessionId: '' } }))
      .rejects.toMatchObject({ code: 'invalid-argument', message: 'session_id_required' });
  });
});

describe('computeVoiceXp — formula, clamps, floor, daily cap', () => {
  const BASE = {
    clientSpeechSec: 120,
    sessionSec: 300,
    transcriptWordCount: 1000,
    replies: 5,
    // Серверное подтверждение речи (heartbeat-аккумулятор): ~2 мин по токенам.
    audioInputTokens: 1200,
    cefr: 'A2',
    xpRatePerSpeechMin: 10,
    xpDailyCap: 300,
  };

  it('pays for effective speech minutes at the CEFR rate', () => {
    // speech = min(180, 240, 500) = 180 → 3 мин × 10 × 1.0 = 30 (выше floor 25).
    expect(computeVoiceXp({ ...BASE, clientSpeechSec: 180 })).toBe(30);
    // Мало речи → работает floor: 5 XP × 5 полных минут сессии.
    expect(computeVoiceXp(BASE)).toBe(25);
  });

  it('clamps speech at 80% of the session (anti-AFK with an open mic)', () => {
    // speech = min(600, 240, 500) = 240 → 4×10 = 40.
    expect(computeVoiceXp({ ...BASE, clientSpeechSec: 600 })).toBe(40);
  });

  it('clamps by transcript words / 2 (silence produces no words, no XP)', () => {
    // speech = min(120, 240, 30/2=15) → 15с → 2.5xp → round 3; floor 5×5=25 при ≥1 реплике.
    expect(computeVoiceXp({ ...BASE, transcriptWordCount: 30 })).toBe(25);
  });

  it('floor: 5 XP per full session minute only with at least one reply', () => {
    expect(computeVoiceXp({ ...BASE, clientSpeechSec: 0, transcriptWordCount: 0 })).toBe(25); // 5×5 мин
    expect(computeVoiceXp({ ...BASE, clientSpeechSec: 0, transcriptWordCount: 0, replies: 0 })).toBe(0);
  });

  it('floor additionally requires SERVER-confirmed speech (audio-input tokens)', () => {
    // repliesCount — клиентское поле: молчание с repliesCount=1 floor не фармит.
    const silentFarm = { ...BASE, clientSpeechSec: 0, transcriptWordCount: 0, replies: 1 };
    expect(computeVoiceXp({ ...silentFarm, audioInputTokens: 0 })).toBe(0);
    expect(computeVoiceXp({ ...silentFarm, audioInputTokens: VOICE_XP_FLOOR_MIN_AUDIO_TOKENS - 1 })).toBe(0);
    // Порог: 30с реальной речи (~10 ток/с → 300 токенов) включает floor обратно.
    expect(computeVoiceXp({ ...silentFarm, audioInputTokens: VOICE_XP_FLOOR_MIN_AUDIO_TOKENS })).toBe(25);
    expect(VOICE_XP_FLOOR_MIN_AUDIO_TOKENS).toBe(30 * AUDIO_TOKENS_PER_SEC);
  });

  it('applies the daily cap on top', () => {
    expect(computeVoiceXp({ ...BASE, xpDailyCap: 12 })).toBe(12);
  });

  it('higher CEFR pays a higher rate', () => {
    expect(computeVoiceXp({ ...BASE, cefr: 'B2' })).toBe(Math.round(2 * 10 * 1.4));
  });

  it('drift detector: >30% above token-based estimate only', () => {
    expect(detectSpeechDrift(150, 500)).toBe(true); // est 50с
    expect(detectSpeechDrift(60, 500)).toBe(false); // в пределах 30%
    expect(detectSpeechDrift(100, 0)).toBe(false); // без токенов оценки нет
    expect(AUDIO_TOKENS_PER_SEC).toBe(10);
  });
});

describe('maxVoiceHeartbeat — liveness + usage accumulator in the quota doc', () => {
  it('stamps heartbeat and accumulates usage monotonically (max of totals)', async () => {
    liveQuota({ usageTotals: undefined, lastHeartbeatMs: NOW - 30_000 });

    const res = await heartbeat({
      auth: { uid: AUTH },
      data: { sessionId: 's1', elapsedSec: 30, usage: { audioInputTokens: 100, audioOutputTokens: 200 } },
    });
    expect(res).toEqual({ ok: true, alive: true });
    expect(docs.get(QUOTA_PATH)).toMatchObject({
      lastHeartbeatMs: NOW,
      lastHeartbeatElapsedSec: 30,
      usageTotals: { audioInputTokens: 100, audioOutputTokens: 200, cachedTokens: 0, textTokens: 0 },
    });

    // Повтор/out-of-order пакет с МЕНЬШИМИ суммами ничего не откатывает.
    await heartbeat({
      auth: { uid: AUTH },
      data: { sessionId: 's1', elapsedSec: 10, usage: { audioInputTokens: 50 } },
    });
    expect(docs.get(QUOTA_PATH)).toMatchObject({
      lastHeartbeatElapsedSec: 30,
      usageTotals: { audioInputTokens: 100, audioOutputTokens: 200 },
    });
  });

  // зачем: pre-mint на пре-экране — первый heartbeat («алло», elapsedSec 0)
  // ставит activatedAtMs; часы разговора идут от него, а не от минта.
  it('the first heartbeat stamps activatedAtMs (bounded by the mint time) and later ones keep it', async () => {
    liveQuota({ activatedAtMs: 0, sessionStartedAtMs: NOW - 120_000, lastHeartbeatMs: NOW - 120_000 });

    await heartbeat({ auth: { uid: AUTH }, data: { sessionId: 's1', elapsedSec: 0 } });
    expect(docs.get(QUOTA_PATH)!.activatedAtMs).toBe(NOW); // «алло» — сейчас, 120с раздумий не в счёт

    await heartbeat({ auth: { uid: AUTH }, data: { sessionId: 's1', elapsedSec: 30 } });
    expect(docs.get(QUOTA_PATH)!.activatedAtMs).toBe(NOW); // повторный не сдвигает
  });

  it('an old client whose first heartbeat arrives at 30s is dated back by its elapsed, never before the mint', async () => {
    liveQuota({ activatedAtMs: 0, sessionStartedAtMs: NOW - 40_000, lastHeartbeatMs: NOW - 40_000 });
    await heartbeat({ auth: { uid: AUTH }, data: { sessionId: 's1', elapsedSec: 30 } });
    expect(docs.get(QUOTA_PATH)!.activatedAtMs).toBe(NOW - 30_000);

    liveQuota({ activatedAtMs: 0, sessionStartedAtMs: NOW - 10_000, lastHeartbeatMs: NOW - 10_000 });
    await heartbeat({ auth: { uid: AUTH }, data: { sessionId: 's1', elapsedSec: 999 } });
    expect(docs.get(QUOTA_PATH)!.activatedAtMs).toBe(NOW - 10_000); // не раньше минта
  });

  it('does not resurrect foreign or settled sessions', async () => {
    liveQuota();
    const res = await heartbeat({ auth: { uid: AUTH }, data: { sessionId: 'ghost', elapsedSec: 10 } });
    expect(res).toEqual({ ok: true, alive: false });
    expect(docs.get(QUOTA_PATH)!.lastHeartbeatMs).toBe(NOW - 10_000); // не тронут
  });

  it('recordVoiceHeartbeatUsage is usable directly with an injected db/now', async () => {
    liveQuota();
    const admin = jest.requireMock('firebase-admin');
    const alive = await recordVoiceHeartbeatUsage(admin.firestore(), {
      authUid: AUTH,
      stableUid: STABLE,
      sessionId: 's1',
      elapsedSec: 45,
      usage: { audioInputTokens: 1, audioOutputTokens: 2, cachedTokens: 3, textTokens: 4 },
      nowMs: NOW + 5_000,
    });
    expect(alive).toBe(true);
    expect(docs.get(QUOTA_PATH)!.lastHeartbeatMs).toBe(NOW + 5_000);
  });
});
