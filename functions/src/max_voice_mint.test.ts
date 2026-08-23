// Тест №11 спеки: порядок гейтов минта, rate limit без reconnect-минтов,
// ветвление пробника, бюджетная лестница, полный session-конфиг сервера.
import fs from 'fs';
import path from 'path';

type DocData = Record<string, any>;

// ── in-memory Firestore fake (хаус-паттерн explain_phrase.test.ts) ──────────
const docs = new Map<string, DocData>();

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
      doc: (id: string) => refFor(`${name}/${id}`),
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

const mockResolveStableUid = jest.fn(async () => 'stable-1');
jest.mock('./auth_identity', () => ({
  resolveStableUidForAuth: (...args: unknown[]) => mockResolveStableUid(...(args as [])),
}));

const mockResolvePremium = jest.fn(async () => false);
jest.mock('./premium_status', () => ({
  resolvePremiumAccess: (...args: unknown[]) => mockResolvePremium(...(args as [])),
}));

const mockAiDisabled = jest.fn(async () => false);
jest.mock('./remote_gates', () => ({
  aiGloballyDisabled: (...args: unknown[]) => mockAiDisabled(...(args as [])),
}));

jest.mock('./max_voice_config', () => {
  const actual = jest.requireActual('./max_voice_config');
  return { ...actual, resolveMaxVoiceConfig: jest.fn(async () => currentConfig) };
});

import { clampMaxVoiceConfig, type MaxVoiceConfig } from './max_voice_config';
import { voiceQuotaDocId } from './max_voice_quota';
import { __resetTutorCharterCacheForTests, voiceTutorMemoryDocId } from './max_voice_tutor_memory';
import {
  TRIAL_PERSONA_NAME,
  TRIAL_SCENARIO_BLOCK,
  VOICE_EST_COST_USD_PER_MIN,
  maxVoiceMint as mintRaw,
  maxVoicePreflight as preflightRaw,
  utcDayKey,
  voiceMintRateDocId,
  voiceSafetyIdentifier,
} from './max_voice_mint';

let currentConfig: MaxVoiceConfig = clampMaxVoiceConfig({ gate_ai_voice_call: true });

type CallableRequest = { auth?: { uid: string; token?: DocData }; data: DocData };
const mint = mintRaw as unknown as (request: CallableRequest) => Promise<DocData>;
const preflight = preflightRaw as unknown as (request: CallableRequest) => Promise<DocData>;

const NOW = 1_800_000_000_000;
const AUTH = 'auth-1';
const STABLE = 'stable-1';
const QUOTA_PATH = `voice_call_quotas/${voiceQuotaDocId(AUTH, STABLE)}`;
const RATE_PATH = `voice_mint_rate_limits/${voiceMintRateDocId(AUTH, STABLE)}`;
const BUDGET_PATH = 'voice_cost_daily/current';
const DAY_MS = 24 * 60 * 60 * 1000;

const fetchMock = jest.fn();

function setConfig(patch: DocData = {}) {
  currentConfig = clampMaxVoiceConfig({ gate_ai_voice_call: true, ...patch });
}

function okProvider() {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ value: 'ek_test_123', expires_at: 1_800_000_060 }),
  });
}

async function callMint(data: DocData = {}, auth: string | null = AUTH) {
  return mint({ auth: auth ? { uid: auth } : undefined, data });
}

async function callAdminMint(data: DocData = {}) {
  return mint({ auth: { uid: AUTH, token: { admin: true } }, data });
}

function liveSession(overrides: DocData = {}) {
  docs.set(QUOTA_PATH, {
    authUid: AUTH,
    stableUid: STABLE,
    activeSessionId: 's1',
    sessionStartedAtMs: NOW - 100_000,
    lastHeartbeatMs: NOW - 10_000,
    reservedSec: 320,
    expiresAtMs: NOW + 300_000,
    dailyUsedSec: 320,
    monthlyUsedSec: 320,
    resetAtMs: NOW + 3_600_000,
    monthResetAtMs: NOW + DAY_MS,
    reconnectChain: { rootId: 's1', count: 0, gapSecTotal: 0 },
    ...overrides,
  });
}

function lastFetchBody(): DocData {
  const [, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return JSON.parse(init.body);
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
  docs.clear();
  setConfig();
  mockResolvePremium.mockReset().mockResolvedValue(false as never);
  mockAiDisabled.mockReset().mockResolvedValue(false as never);
  mockResolveStableUid.mockClear();
  fetchMock.mockReset();
  okProvider();
  (global as any).fetch = fetchMock;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('gate order (App Check → kill switch → subscription → quota → mint)', () => {
  it('enforces App Check via the OPENAI group option (source contract)', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'max_voice_mint.ts'), 'utf8');
    expect(source).toContain('enforceAppCheck: ENFORCE_APP_CHECK_OPENAI');
  });

  it('warmupPing exits before any gate (even with AI globally disabled)', async () => {
    mockAiDisabled.mockResolvedValue(true as never);
    await expect(callMint({ warmupPing: true })).resolves.toMatchObject({ ok: true, warmup: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated callers', async () => {
    await expect(callMint({}, null)).rejects.toMatchObject({ code: 'unauthenticated', message: 'auth_required' });
  });

  // зачем: владелец 2026-08-16 снял DEV-гейт звонка навсегда («должно работать
  // всегда без исключений, единственный гейт — пейвол»). Прежние три теста
  // сторожили ОТМЕНЁННОЕ правило (dev_admin_required + аллоулист devTestUids) —
  // они заменены на сторожа обратного контракта: линия открыта без админ-прав.
  it('opens the line for an ordinary account with no admin claim and no allowlist', async () => {
    setConfig({ devTestUids: [] });
    docs.set(QUOTA_PATH, { trialUsedAtMs: NOW - DAY_MS }); // пробник уже израсходован

    await expect(callMint()).resolves.toMatchObject({ ok: true, value: 'ek_test_123' });
  });

  it('never answers dev_admin_required again (the DEV gate is gone for good)', async () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'max_voice_mint.ts'), 'utf8');
    expect(source).not.toContain('dev_admin_required');
  });

  it('keeps the admin kill switch working when the owner turns it off explicitly', async () => {
    setConfig({ gate_ai_voice_call: false });
    await expect(callMint()).rejects.toMatchObject({ message: 'voice_disabled' });
  });

  it('fires gates strictly in order: kill switches → quota → mint', async () => {
    // Всё закрыто сразу — побеждает самый ранний гейт.
    mockAiDisabled.mockResolvedValue(true as never);
    setConfig({ gate_ai_voice_call: false });
    docs.set(QUOTA_PATH, { trialUsedAtMs: NOW - DAY_MS }); // пробник тоже недоступен
    await expect(callMint()).rejects.toMatchObject({ message: 'ai_globally_disabled' });

    mockAiDisabled.mockResolvedValue(false as never);
    await expect(callMint()).rejects.toMatchObject({ code: 'failed-precondition', message: 'voice_disabled' });

    // Ступени «подписка» между рубильником и квотой больше нет (гейт снят
    // владельцем 2026-08-16): следующий по порядку гейт — дневная квота.
    setConfig();
    docs.set(QUOTA_PATH, { // день полностью выбран (потолок поднят до 14400с)
      trialUsedAtMs: NOW - DAY_MS,
      resetAtMs: NOW + 3_600_000,
      monthResetAtMs: NOW + DAY_MS,
      dailyUsedSec: 14_400,
    });
    await expect(callMint()).rejects.toMatchObject({ code: 'resource-exhausted', message: 'voice_quota_exhausted' });
    expect(fetchMock).not.toHaveBeenCalled(); // до минта ни разу не дошли

    docs.set(QUOTA_PATH, { trialUsedAtMs: NOW - DAY_MS });
    await expect(callMint()).resolves.toMatchObject({ ok: true, value: 'ek_test_123' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // зачем: до релиза подписка звонок не гейтит (решение владельца 2026-08-16).
  // Ни отсутствие премиума, ни снятый voiceForPremiumBeta не закрывают линию —
  // voice_max_required вернётся только вместе с пейволом перед релизом.
  it('gives MAX access without premium and with the beta flag off', async () => {
    mockResolvePremium.mockResolvedValue(false as never);
    setConfig({ voiceForPremiumBeta: false });
    docs.set(QUOTA_PATH, { trialUsedAtMs: NOW - DAY_MS });
    await expect(callMint()).resolves.toMatchObject({ ok: true, value: 'ek_test_123' });
  });
});

// зачем: лимит минут снят (владелец 2026-08-16), но потолок СТАРТОВ в час
// сохранён как предохранитель от цикла-бага: экран в бесконечном ретрае не
// должен молотить платный минт всю ночь. Дефолт поднят 8 → 60.
describe('rate limit — 60 fresh mints/hour, reconnects excluded', () => {
  beforeEach(() => {
    mockResolvePremium.mockResolvedValue(true as never);
  });

  it('rejects the 61st fresh mint inside the hour window', async () => {
    docs.set(RATE_PATH, { windowStartMs: NOW - 60_000, count: 60 });
    await expect(callMint()).rejects.toMatchObject({ code: 'resource-exhausted', message: 'voice_mint_rate_limited' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('counts a fresh mint into the window', async () => {
    await callMint();
    expect(docs.get(RATE_PATH)).toMatchObject({ count: 1, windowStartMs: NOW });
  });

  it('a reconnect mint bypasses the rate limit and transfers the remainder', async () => {
    docs.set(RATE_PATH, { windowStartMs: NOW - 60_000, count: 60 }); // лимит выбран
    liveSession();

    const res = await callMint({ reconnectOf: 's1', heartbeatElapsedSec: 80, reconnectSummary: 'we ordered a latte' });

    // consumed = max(80, 100) − бесплатный gap 10 = 90 → остаток 230.
    expect(res).toMatchObject({ ok: true, maxSeconds: 230 - 20 });
    expect(res.limits.reservedSec).toBe(230);
    expect(docs.get(RATE_PATH)!.count).toBe(60); // reconnect лимит не тронул
    expect(docs.get(QUOTA_PATH)).toMatchObject({ reservedSec: 230, reconnectChain: { rootId: 's1', count: 1 } });
    // Summary долетело в хвост инструкций.
    expect(lastFetchBody().session.instructions).toContain('we ordered a latte');
  });

  it('validates reconnectOf against the live session owner', async () => {
    liveSession();
    await expect(callMint({ reconnectOf: 'ghost' }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'voice_session_mismatch' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// зачем: владелец 2026-08-16 снял гейт подписки до релиза, поэтому ветка
// «пробник» (access: 'trial') сейчас НЕДОСТИЖИМА — все получают полный доступ.
// Тесты здесь сторожат новое поведение: израсходованный
// пробник больше никого не закрывает, а звонок идёт по обычному сценарному капу.
describe('trial branch is bypassed until the paywall ships', () => {
  it('gives a practiced learner a full call instead of a trial variant', async () => {
    const res = await callMint({ cefr: 'B1' });
    expect(res.trialVariant).toBeNull();
    expect(res.ok).toBe(true);
  });

  it('does not stamp trialUsedAtMs and does not use the trial cap', async () => {
    const res = await callMint({ cefr: 'A1' });
    expect(res.trialVariant).toBeNull();
    // Сценарный кап 300 + 20 хвоста, а не пробниковые 180 + 20.
    expect(res.limits.reservedSec).toBe(320);
    expect(docs.get(QUOTA_PATH)!.trialUsedAtMs).toBeUndefined();
  });

  it('a recently used trial no longer refuses access', async () => {
    docs.set(QUOTA_PATH, { trialUsedAtMs: NOW - DAY_MS });
    await expect(callMint({})).resolves.toMatchObject({ ok: true, trialVariant: null });
  });
});

describe('budget ladder', () => {
  beforeEach(() => {
    setConfig({ globalDailyBudgetUsd: 25, budgetSoftPct: 0.8 });
  });

  it('≥100%: refuses new sessions entirely (client degrades to half-duplex)', async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    docs.set(BUDGET_PATH, { dayKey: utcDayKey(NOW), estUsd: 25 });
    await expect(callMint()).rejects.toMatchObject({ code: 'resource-exhausted', message: 'voice_budget_exhausted' });
  });

  // Пробников больше нет (все — 'max'), поэтому ступень voice_trial_paused
  // никого не режет; soft-кап сессии на 300с продолжает работать для всех.
  // Один минт на тест: успешный звонок оставляет живой резерв, и второй подряд
  // упёрся бы в voice_session_active — это защита от двух параллельных звонков.
  it('80–100%: no trials to cut, sessions get capped at 300s', async () => {
    docs.set(BUDGET_PATH, { dayKey: utcDayKey(NOW), estUsd: 20 });

    const res = await callMint({ format: 'companion' }); // кап формата 480 → soft-кап 300
    expect(res.limits.reservedSec).toBe(320); // 300 + 20 хвоста
    expect(res.maxSeconds).toBe(300);
  });

  it("yesterday's counter does not throttle today", async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    docs.set(BUDGET_PATH, { dayKey: utcDayKey(NOW - DAY_MS), estUsd: 999 });
    await expect(callMint()).resolves.toMatchObject({ ok: true });
  });

  it('a successful mint reserves the session cost estimate in the daily counter', async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    await callMint(); // scenario: резерв 320с
    const budget = docs.get(BUDGET_PATH)!;
    expect(budget.dayKey).toBe(utcDayKey(NOW));
    expect(budget.estUsd).toBeCloseTo((320 / 60) * VOICE_EST_COST_USD_PER_MIN, 10);
  });
});

describe('reconnect vs gates & budget — live sessions are never dropped', () => {
  it('trial user with a spent trial can still reconnect a live trial call', async () => {
    // Free-юзер: первый пробный минт уже проштамповал trialUsedAtMs=NOW.
    liveSession({ trialUsedAtMs: NOW });

    const res = await callMint({ reconnectOf: 's1', heartbeatElapsedSec: 80 });

    expect(res).toMatchObject({ ok: true, value: 'ek_test_123' });
    expect(docs.get(QUOTA_PATH)).toMatchObject({ reconnectChain: { rootId: 's1', count: 1 } });
    // Штамп пробника НЕ перезаписан реконнектом.
    expect(docs.get(QUOTA_PATH)!.trialUsedAtMs).toBe(NOW);
  });

  it('a fake reconnectOf does not become a free trial bypass', async () => {
    liveSession({ trialUsedAtMs: NOW });
    await expect(callMint({ reconnectOf: 'ghost' }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'voice_session_mismatch' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('exhausted budget tier still lets a live session reconnect', async () => {
    setConfig({ globalDailyBudgetUsd: 25, budgetSoftPct: 0.8 });
    mockResolvePremium.mockResolvedValue(true as never);
    docs.set(BUDGET_PATH, { dayKey: utcDayKey(NOW), estUsd: 25 }); // ≥100%
    liveSession();

    await expect(callMint({ reconnectOf: 's1', heartbeatElapsedSec: 80 }))
      .resolves.toMatchObject({ ok: true });
  });

  it('soft tier still lets a live TRIAL call reconnect', async () => {
    setConfig({ globalDailyBudgetUsd: 25, budgetSoftPct: 0.8 });
    docs.set(BUDGET_PATH, { dayKey: utcDayKey(NOW), estUsd: 20 }); // 80–100%
    liveSession({ trialUsedAtMs: NOW });

    await expect(callMint({ reconnectOf: 's1', heartbeatElapsedSec: 80 }))
      .resolves.toMatchObject({ ok: true });
  });

  it('a reconnect mint does not move the daily budget counter', async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    docs.set(BUDGET_PATH, { dayKey: utcDayKey(NOW), estUsd: 1.5 });
    liveSession();

    await callMint({ reconnectOf: 's1', heartbeatElapsedSec: 80 });

    // Перенесённые секунды уже забюджетированы исходным минтом.
    expect(docs.get(BUDGET_PATH)!.estUsd).toBe(1.5);
  });

  it('a failed reconnect mint refunds the transferred remainder to the budget', async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    docs.set(BUDGET_PATH, { dayKey: utcDayKey(NOW), estUsd: 1.5 });
    liveSession();
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });

    await expect(callMint({ reconnectOf: 's1', heartbeatElapsedSec: 80 }))
      .rejects.toMatchObject({ message: 'voice_provider_failed' });

    // Остаток 230с был забюджетирован исходным минтом; сессия закрыта, settle
    // не наступит — сторно по released.refundedSec, не по estUsd (=0).
    expect(docs.get(BUDGET_PATH)!.estUsd).toBeCloseTo(1.5 - (230 / 60) * VOICE_EST_COST_USD_PER_MIN, 10);
  });

  it('a fresh mint over a stale silent session refunds its tail to the budget', async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    docs.set(BUDGET_PATH, { dayKey: utcDayKey(NOW), estUsd: 1 });
    // Мёртвая сессия: прожито 100с из 320 по heartbeat → хвост 220с.
    liveSession({
      activeSessionId: 'dead',
      expiresAtMs: NOW - 1_000,
      sessionStartedAtMs: NOW - 600_000,
      lastHeartbeatMs: NOW - 500_000,
    });

    await callMint();

    // 1 − сторно хвоста (220с) + резерв новой сессии (320с).
    const expected = 1
      - (220 / 60) * VOICE_EST_COST_USD_PER_MIN
      + (320 / 60) * VOICE_EST_COST_USD_PER_MIN;
    expect(docs.get(BUDGET_PATH)!.estUsd).toBeCloseTo(expected, 10);
  });
});

describe('mint response contract — both key spellings + limits', () => {
  it('returns camelCase and snake_case duplicates of expiresAt/sessionId/maxSeconds', async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    const res = await callMint({ cefr: 'B1' });

    expect(res.expires_at).toBe(res.expiresAt);
    expect(res.session_id).toBe(res.sessionId);
    expect(res.max_seconds).toBe(res.maxSeconds);
    expect(res).toMatchObject({ ok: true, expiresAt: 1_800_000_060, maxSeconds: 300 });
    expect(typeof res.session_id).toBe('string');
  });

  it('limits carry the per-session cap, per-CEFR hint delay and the daily max', async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    const res = await callMint({ cefr: 'B1' });

    expect(res.limits).toMatchObject({
      dayRemainingSec: 14_080, // дневной потолок 14400 − резерв 320
      sessionCapSec: 300, // число секунд ЭТОЙ сессии, не карта форматов
      dailyVoiceSecMax: 14_400,
      heartbeatSec: 30,
      wrapUpLeadSec: 75,
      graceTailSec: 20,
      hintDelaySec: 9, // число для B1, не карта уровней
      hintMaxPerSession: 4,
      reconnectChainMax: { auto: 2, manual: 1 },
    });
  });
});

describe('server-pinned session config (section 4)', () => {
  it('retries one transient OpenAI mint failure without double-reserving quota', async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'temporary' })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: 'ek_retry_ok', expires_at: 1_800_000_060 }),
      });

    await expect(callMint({ format: 'scenario' })).resolves.toMatchObject({ value: 'ek_retry_ok' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(docs.get(QUOTA_PATH)).toMatchObject({ activeSessionId: expect.any(String) });
    expect(docs.get(RATE_PATH)).toMatchObject({ count: 1 });
  });

  it('falls back to the official minimal profile when an advanced field is rejected', async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({
          error: {
            code: 'unknown_parameter',
            param: 'session.audio.input.turn_detection.future_field',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: 'ek_compat_ok', expires_at: 1_800_000_060 }),
      });

    await expect(callMint({ cefr: 'A2' })).resolves.toMatchObject({ value: 'ek_compat_ok' });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const primary = JSON.parse(fetchMock.mock.calls[0][1].body);
    const compatibility = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(primary.session.audio.input.turn_detection.type).toBe('semantic_vad');
    expect(primary.session.output_modalities).toEqual(['audio']);
    expect(primary.session.max_output_tokens).toBe(600); // A2: ~30с речи (аудио-токены ≈20/с)
    expect(primary.session.audio.input.noise_reduction).toEqual({ type: 'far_field' });
    expect(compatibility).toMatchObject({
      expires_after: { anchor: 'created_at', seconds: 120 },
      session: {
        type: 'realtime',
        model: 'gpt-realtime-2.1-mini',
        audio: { output: { voice: 'marin' } },
      },
    });
    expect(compatibility.session.audio.input).toBeUndefined();
    expect(compatibility.session.output_modalities).toEqual(['audio']);
    expect(compatibility.session.max_output_tokens).toBeUndefined();
    expect(compatibility.session.truncation).toBeUndefined();
    // Один пользовательский mint: ни резерв, ни rate slot не дублируются.
    expect(docs.get(RATE_PATH)).toMatchObject({ count: 1 });
  });

  it('sends the full realtime session config; the client controls none of it', async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    const res = await callMint({
      cefr: 'A1',
      format: 'scenario',
      personaName: 'Mia',
      personaRole: 'a friendly barista',
      scenarioBlock: 'SCENARIO: COFFEE SHOP practice',
      // Попытки клиента переопределить серверные параметры игнорируются:
      model: 'gpt-4o',
      voice: 'onyx',
      maxSeconds: 99_999,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/realtime/client_secrets');
    expect(init.headers.Authorization).toBe('Bearer sk-test-key');
    expect(init.headers['OpenAI-Safety-Identifier']).toBe(voiceSafetyIdentifier(STABLE));
    expect(init.headers['OpenAI-Safety-Identifier']).toMatch(/^[0-9a-f]{16}$/);

    const body = lastFetchBody();
    expect(body.expires_after).toEqual({ anchor: 'created_at', seconds: 120 });
    expect(body.session).toMatchObject({
      type: 'realtime',
      model: 'gpt-realtime-2.1-mini',
      output_modalities: ['audio'],
      // GA-имя поля (client_secrets, session type 'realtime') — max_output_tokens;
      // max_response_output_tokens было в deprecated-бете.
      // зачем: max_output_tokens считает аудио-токены (~20/с) — 120 обрезало реплику
      // на 6-й секунде; 500 = ~25с речи, краткость держит промпт, не кап.
      max_output_tokens: 500, // A1
      truncation: { type: 'retention_ratio', retention_ratio: 0.8 },
    });
    expect(body.session.max_response_output_tokens).toBeUndefined();
    expect(body.session.audio.input.transcription).toEqual({ model: 'gpt-4o-mini-transcribe' });
    // Фильтр громкой связи ДО VAD: остаток эха не должен рвать ответ ИИ.
    expect(body.session.audio.input.noise_reduction).toEqual({ type: 'far_field' });
    expect(body.session.audio.input.turn_detection).toEqual({
      type: 'semantic_vad',
      eagerness: 'medium', // A1: паузы допустимы, но завершённая фраза не ждёт до 8 секунд
      // Клиент сам создаёт ответ после speech_stopped, когда предыдущая реплика
      // действительно закончила и генерацию, и воспроизведение.
      create_response: false,
      // Голос/эхо во время ответа не обрывают незаконченную фразу MAX.
      // Реальный пользователь всё ещё распознаётся, а новый ответ создаётся
      // после завершения текущего хода.
      interrupt_response: false,
    });
    // OpenAI поддерживает idle_timeout_ms только в server_vad. Это поле в
    // semantic_vad превращает весь client_secrets request в HTTP 400.
    expect(body.session.audio.input.turn_detection.idle_timeout_ms).toBeUndefined();
    expect(body.session.audio.output).toEqual({ voice: 'marin' });

    // Контракт ответа клиенту.
    expect(res).toMatchObject({
      ok: true,
      value: 'ek_test_123',
      expiresAt: 1_800_000_060,
      maxSeconds: 300, // резерв 320 − хвост 20
      trialVariant: null,
    });
    expect(typeof res.sessionId).toBe('string');
    expect(res.sessionId.length).toBeGreaterThan(8);
    expect(res.wrapUpText).toContain('[WRAP_UP]');
    expect(res.limits).toMatchObject({ reservedSec: 320, wrapUpLeadSec: 75, graceTailSec: 20, heartbeatSec: 30 });
    expect(docs.get(QUOTA_PATH)).toMatchObject({ activeSessionId: res.sessionId, reservedSec: 320 });
  });

  it('releases the reservation, the budget estimate and the rate slot when OpenAI fails', async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });

    await expect(callMint()).rejects.toMatchObject({ code: 'unavailable', message: 'voice_provider_failed' });

    expect(docs.get(QUOTA_PATH)).toMatchObject({
      activeSessionId: null,
      reservedSec: 0,
      dailyUsedSec: 0, // полный возврат
      lastReleaseReason: 'mint_failed',
    });
    expect(docs.get(BUDGET_PATH)!.estUsd).toBe(0); // сторно оценки
    // F9: сбой провайдера возвращает rate-слот (декремент до floor 0) —
    // пользователь не платит попыткой за чужую аварию.
    expect(docs.get(RATE_PATH)!.count).toBe(0);
  });
});

describe('maxVoicePreflight — same gates, no mint, no reservation', () => {
  it('supports warmupPing before auth', async () => {
    await expect(preflight({ auth: undefined, data: { warmupPing: true } }))
      .resolves.toMatchObject({ ok: true, warmup: true });
  });

  it('reports access and remaining quota without touching tokens or reserves', async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    const res = await preflight({ auth: { uid: AUTH }, data: {} });

    expect(res).toMatchObject({ ok: true, allowed: true, access: 'max', trialVariant: null });
    expect(res.limits).toMatchObject({ dayRemainingSec: 14_400, monthRemainingSec: 172_800, dailyVoiceSecMax: 14_400 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(docs.get(QUOTA_PATH)).toBeUndefined(); // резервов не создаёт
  });

  it('rejects when the day quota is exhausted', async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    // Потолок дня поднят до 14400с — «почти выбран» теперь это 14370, а не 870.
    docs.set(QUOTA_PATH, { resetAtMs: NOW + 3_600_000, monthResetAtMs: NOW + DAY_MS, dailyUsedSec: 14_370 });
    await expect(preflight({ auth: { uid: AUTH }, data: {} }))
      .rejects.toMatchObject({ code: 'resource-exhausted', message: 'voice_quota_exhausted' });
  });

  it('honours the kill switch', async () => {
    setConfig({ gate_ai_voice_call: false });
    await expect(preflight({ auth: { uid: AUTH }, data: {} }))
      .rejects.toMatchObject({ message: 'voice_disabled' });
  });

  // зачем: DEV-гейт снят навсегда (владелец 2026-08-16) — preflight обязан
  // пускать обычный аккаунт без админ-claim и без записи в devTestUids.
  it('lets an ordinary account preflight without an admin claim or allowlist', async () => {
    setConfig({ devTestUids: [] });
    docs.set(QUOTA_PATH, { trialUsedAtMs: NOW - DAY_MS });

    await expect(preflight({ auth: { uid: AUTH }, data: {} }))
      .resolves.toMatchObject({ ok: true, allowed: true, access: 'max' });
  });

  it('returns a read-only tutor preview without minting or reserving a call', async () => {
    docs.set(`voice_tutor_memory/${voiceTutorMemoryDocId(AUTH, STABLE)}`, { callCount: 3, goalMastery: {} });
    const res = await preflight({
      auth: { uid: AUTH },
      data: { format: 'tutor', cefr: 'A1', interfaceLang: 'ru', studyTarget: 'en' },
    });

    expect(res.tutorPreview).toMatchObject({
      lessonOrdinal: 4,
      lessonType: 'new_material',
      displayTitle: 'Первый контакт',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(docs.get(QUOTA_PATH)).toBeUndefined();
  });
});

// ── Учитель (формат 'tutor', вариант A — владелец 2026-08-16) ────────────────

describe("format 'tutor' — личный учитель", () => {
  it('минт учителя: свой голос, инструменты, память и устав в instructions, tutor-блок в ответе', async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    okProvider();
    docs.set(`voice_tutor_memory/${voiceTutorMemoryDocId(AUTH, STABLE)}`, {
      facts: ['name is Olga', 'lives in Kyiv'],
      recurringErrors: ['says I go yesterday'],
      homework: ['I would like a coffee'],
      nextTopic: 'weekend plans',
      callCount: 3,
      lastCallAtMs: NOW - 86_400_000,
    });
    docs.set('admin_config/product_charter', {
      sections: [{ key: 'learning', body: 'Уроки, тренажёр карточек, диалоги, звонки.' }],
      revision: 1,
    });

    const res = await callMint({
      format: 'tutor',
      cefr: 'A1',
      interfaceLang: 'uk',
      sceneCatalog: 'hotel_checkin: a hotel reception (you are the receptionist)\ncoffee: a coffee shop (you are the barista)',
      learnerSnapshot: 'name: Olga; streak: 5 days; trainer due: 7',
    });

    const body = lastFetchBody();
    expect(body.session.audio.output).toEqual({ voice: 'cedar' }); // tutorVoice, не голос сцен
    expect(body.session.tools.map((t: DocData) => t.name)).toEqual([
      'start_scene', 'end_scene', 'mark_phrase_result', 'assign_homework', 'set_next_topic', 'show_tutor_board', 'set_live_topic', 'mark_goal_progress', 'set_language_preference', 'remember_learner', 'flag_safety', 'end_call',
    ]);
    expect(body.session.tool_choice).toBe('auto');
    const instr: string = body.session.instructions;
    expect(instr).toContain('You are Max, the learner\'s personal English TEACHER');
    expect(instr).toContain('native language Ukrainian');
    expect(instr).toContain('level A1');
    expect(instr).toContain('WHAT THE APP OFFERS');
    expect(instr).toContain('тренажёр карточек'); // выжимка устава из админки
    expect(instr).toContain('hotel_checkin'); // каталог сцен от клиента
    expect(instr).toContain('streak: 5 days'); // снимок ученика
    expect(instr).toContain('name is Olga'); // память
    expect(instr).toContain('I would like a coffee'); // домашка на проверку
    expect(instr).toContain('weekend plans');
    expect(instr).toContain('TIME NOTE');
    // Кап учителя (600) + хвост 20 → резерв 620.
    expect(res.limits.reservedSec).toBe(620);
    expect(res.tutor).toMatchObject({
      name: 'Max',
      lessonsSoFar: 3,
      homework: ['I would like a coffee'],
      nextTopic: 'weekend plans',
    });
    expect(String(res.tutor.greetingInstructions)).toContain('LANGUAGE POLICY');
    expect(String(res.tutor.greetingInstructions)).toContain('10 minutes');
    expect(String(res.tutor.greetingInstructions)).toContain('FOCUSED LESSON');
    // Карта целей: A1 → первая цель a1_greet; агрегат ученику не показываем.
    expect(instr).toContain('CURRENT SPEAKING GOAL');
    expect(instr).toContain('a1_greet');
    expect(res.tutor.plan.goal).toMatchObject({ id: 'a1_greet', level: 'A1', mastery: 0, sceneIds: ['first_meeting'] });
    expect(res.tutor.plan).not.toHaveProperty('goalsDone');
    expect(res.tutor.plan).not.toHaveProperty('goalsTotal');
    expect(res.tutor.plan.lessonType).toBe('new_material'); // callCount 3 → 3 % 3 = 0
    expect(res.tutor.preview).toMatchObject({ lessonOrdinal: 4, displayTitle: 'Перший контакт' });
  });

  it('первый урок без памяти и без устава: MAX остаётся английским учителем для устаревшего studyTarget=fr', async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    okProvider();
    __resetTutorCharterCacheForTests(); // выжимка устава кэшируется на инстанс 1ч
    const res = await callMint({ format: 'tutor', cefr: 'B1', interfaceLang: 'ru', studyTarget: 'fr' });
    const instr: string = lastFetchBody().session.instructions;
    expect(instr).toContain('personal English TEACHER');
    expect(instr).not.toContain('personal French TEACHER');
    expect(instr).toContain('FIRST lesson');
    expect(instr).toContain('Trainer (flashcards)'); // TUTOR_APP_DIGEST_FALLBACK
    expect(instr).toContain('native language Russian');
    expect(res.tutor.lessonsSoFar).toBe(0);
  });

  it('совместимый профиль поднимает учителя без инструментов (аварийный путь), сцены/компаньон tutor-блока не получают', async () => {
    mockResolvePremium.mockResolvedValue(true as never);
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'bad tools' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ value: 'ek_compat', expires_at: 1 }) });
    await callMint({ format: 'tutor' });
    const compat = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(compat.session.tools).toBeUndefined();
    expect(compat.session.audio.output).toEqual({ voice: 'cedar' });

    fetchMock.mockReset();
    okProvider();
    docs.delete(QUOTA_PATH);
    const scenario = await callMint({ format: 'scenario', scenarioBlock: 'SCENARIO x' });
    expect(scenario.tutor).toBeUndefined();
    expect(lastFetchBody().session.tools).toBeUndefined();
  });
});
