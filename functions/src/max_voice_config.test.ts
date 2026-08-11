import {
  HARD_MAX_SESSION_SEC,
  MAX_VOICE_CONFIG_CACHE_TTL_MS,
  MAX_VOICE_CONFIG_DEFAULTS,
  MAX_VOICE_CONFIG_DOC,
  __resetMaxVoiceConfigCacheForTests,
  clampMaxVoiceConfig,
  resolveMaxVoiceConfig,
} from './max_voice_config';

// Стаб Firestore: считаем чтения, чтобы проверить работу кэша.
function makeDbStub(data: Record<string, unknown> | undefined, failReads = false) {
  const state = { reads: 0, path: '' };
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          state.reads += 1;
          state.path = `${name}/${id}`;
          if (failReads) throw new Error('injected_firestore_failure');
          return { exists: data !== undefined, data: () => data };
        },
      }),
    }),
  };
  return { db: db as any, state };
}

afterEach(() => {
  jest.restoreAllMocks();
  __resetMaxVoiceConfigCacheForTests();
});

describe('clampMaxVoiceConfig', () => {
  it('returns full defaults for missing/garbage input', () => {
    expect(clampMaxVoiceConfig(undefined)).toEqual(MAX_VOICE_CONFIG_DEFAULTS);
    expect(clampMaxVoiceConfig(null)).toEqual(MAX_VOICE_CONFIG_DEFAULTS);
    expect(clampMaxVoiceConfig('nonsense')).toEqual(MAX_VOICE_CONFIG_DEFAULTS);
    expect(clampMaxVoiceConfig({})).toEqual(MAX_VOICE_CONFIG_DEFAULTS);
  });

  it('hard-clamps a fat-fingered session cap (48000 → 600) so a typo cannot burn budget', () => {
    const cfg = clampMaxVoiceConfig({ sessionCapSec: { scenario: 48000, companion: -5, trial: 'junk' } });
    expect(cfg.sessionCapSec.scenario).toBe(HARD_MAX_SESSION_SEC);
    expect(cfg.sessionCapSec.companion).toBe(60); // нижняя граница
    expect(cfg.sessionCapSec.trial).toBe(MAX_VOICE_CONFIG_DEFAULTS.sessionCapSec.trial);
  });

  it('whitelists model and transcription model', () => {
    expect(clampMaxVoiceConfig({ model: 'gpt-realtime' }).model).toBe('gpt-realtime');
    expect(clampMaxVoiceConfig({ model: 'gpt-5-realtime-turbo' }).model).toBe('gpt-realtime-mini');
    expect(clampMaxVoiceConfig({ transcriptionModel: 'made-up' }).transcriptionModel)
      .toBe('gpt-4o-mini-transcribe');
    expect(clampMaxVoiceConfig({ transcriptionModel: 'whisper-1' }).transcriptionModel).toBe('whisper-1');
  });

  it('clamps every numeric field into its safe corridor', () => {
    const cfg = clampMaxVoiceConfig({
      graceTailSec: 9999,
      dailyVoiceSecMax: 10_000_000,
      monthlyVoiceSecMax: -1,
      trialCallSec: 10_000,
      trialRefreshDays: 0,
      trialSrsThreshold: -3,
      truncationRetentionRatio: 42,
      reinjectEveryTurns: 500,
      hintMaxPerSession: 999,
      idleTimeoutMs: 1,
      wrapUpLeadSec: 100_000,
      mintPerHourMax: 0,
      reconnectFreeGapSecTotal: 100_000,
      heartbeatSec: 1,
      globalDailyBudgetUsd: -5,
      budgetSoftPct: 7,
      maxFallbackRepliesDaily: -10,
      xpRatePerSpeechMin: 100_000,
      xpDailyCap: -1,
    });
    expect(cfg.graceTailSec).toBe(120);
    expect(cfg.dailyVoiceSecMax).toBe(14_400);
    expect(cfg.monthlyVoiceSecMax).toBe(60);
    expect(cfg.trialCallSec).toBe(HARD_MAX_SESSION_SEC);
    expect(cfg.trialRefreshDays).toBe(1);
    expect(cfg.trialSrsThreshold).toBe(0);
    expect(cfg.truncationRetentionRatio).toBe(1);
    expect(cfg.reinjectEveryTurns).toBe(50);
    expect(cfg.hintMaxPerSession).toBe(20);
    expect(cfg.idleTimeoutMs).toBe(10_000);
    expect(cfg.wrapUpLeadSec).toBe(300);
    expect(cfg.mintPerHourMax).toBe(1);
    expect(cfg.reconnectFreeGapSecTotal).toBe(600);
    expect(cfg.heartbeatSec).toBe(5);
    expect(cfg.globalDailyBudgetUsd).toBe(0);
    expect(cfg.budgetSoftPct).toBe(1);
    expect(cfg.maxFallbackRepliesDaily).toBe(0);
    expect(cfg.xpRatePerSpeechMin).toBe(100);
    expect(cfg.xpDailyCap).toBe(0);
  });

  it('clamps per-CEFR maps and keeps valid entries', () => {
    const cfg = clampMaxVoiceConfig({
      maxResponseOutputTokens: { A1: 1_000_000, B1: 250, injected: 'junk' },
      vadEagerness: { A1: 'high', B2: 'nonsense' },
      hintDelaySec: { A1: 0, B2: 500 },
    });
    expect(cfg.maxResponseOutputTokens.A1).toBe(2000);
    expect(cfg.maxResponseOutputTokens.A2).toBe(MAX_VOICE_CONFIG_DEFAULTS.maxResponseOutputTokens.A2);
    expect(cfg.maxResponseOutputTokens.B1).toBe(250);
    expect(cfg.maxResponseOutputTokens.injected).toBe(400);
    expect(cfg.vadEagerness.A1).toBe('high');
    expect(cfg.vadEagerness.B2).toBe('auto');
    expect(cfg.hintDelaySec.A1).toBe(3);
    expect(cfg.hintDelaySec.B2).toBe(60);
  });

  it('normalizes enums and booleans (kill switch defaults to OFF)', () => {
    expect(clampMaxVoiceConfig({}).gate_ai_voice_call).toBe(false);
    expect(clampMaxVoiceConfig({ gate_ai_voice_call: 'true' }).gate_ai_voice_call).toBe(true);
    expect(clampMaxVoiceConfig({ gate_ai_voice_call: 'garbage' }).gate_ai_voice_call).toBe(false);
    expect(clampMaxVoiceConfig({ trialMode: 'companion' }).trialMode).toBe('companion');
    expect(clampMaxVoiceConfig({ trialMode: 'yolo' }).trialMode).toBe('auto');
    expect(clampMaxVoiceConfig({ pruneMode: 'manual' }).pruneMode).toBe('manual');
    expect(clampMaxVoiceConfig({ pruneMode: 'x' }).pruneMode).toBe('retention');
    expect(clampMaxVoiceConfig({ degradeMode: 'force_fallback' }).degradeMode).toBe('force_fallback');
    expect(clampMaxVoiceConfig({ degradeMode: 'x' }).degradeMode).toBe('auto');
    expect(clampMaxVoiceConfig({ voice: '  ' }).voice).toBe('marin');
    expect(clampMaxVoiceConfig({ voice: 'cedar' }).voice).toBe('cedar');
  });
});

describe('resolveMaxVoiceConfig cache', () => {
  it('reads the admin doc once and serves from cache within the TTL', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    const { db, state } = makeDbStub({ gate_ai_voice_call: true, dailyVoiceSecMax: 1200 });

    const first = await resolveMaxVoiceConfig(db);
    const second = await resolveMaxVoiceConfig(db);

    expect(state.reads).toBe(1);
    expect(state.path).toBe(`admin_runtime_config/${MAX_VOICE_CONFIG_DOC}`);
    expect(first.gate_ai_voice_call).toBe(true);
    expect(first.dailyVoiceSecMax).toBe(1200);
    expect(second).toEqual(first);
  });

  it('re-reads after the TTL so a kill switch flips within 60s', async () => {
    expect(MAX_VOICE_CONFIG_CACHE_TTL_MS).toBeLessThanOrEqual(60_000);
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    const { db, state } = makeDbStub({ gate_ai_voice_call: true });

    await resolveMaxVoiceConfig(db);
    nowSpy.mockReturnValue(1_800_000_000_000 + MAX_VOICE_CONFIG_CACHE_TTL_MS);
    await resolveMaxVoiceConfig(db);

    expect(state.reads).toBe(2);
  });

  it('__resetMaxVoiceConfigCacheForTests drops the cache immediately', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    const { db, state } = makeDbStub({});

    await resolveMaxVoiceConfig(db);
    __resetMaxVoiceConfigCacheForTests();
    await resolveMaxVoiceConfig(db);

    expect(state.reads).toBe(2);
  });

  it('falls back to defaults on read failure and does NOT cache the failure', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const broken = makeDbStub(undefined, true);

    const cfg = await resolveMaxVoiceConfig(broken.db);
    expect(cfg).toEqual(MAX_VOICE_CONFIG_DEFAULTS);

    // Следующий вызов пробует Firestore снова (сбой не замораживается на TTL).
    const healthy = makeDbStub({ gate_ai_voice_call: true });
    const cfg2 = await resolveMaxVoiceConfig(healthy.db);
    expect(healthy.state.reads).toBe(1);
    expect(cfg2.gate_ai_voice_call).toBe(true);
  });
});
