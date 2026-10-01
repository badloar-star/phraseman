/* eslint-disable import/first */
const mockCallableRun = jest.fn();
const mockHttpsCallable = jest.fn((_functions: unknown, _name: string) => mockCallableRun);

jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({ name: 'app' })) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({ region: 'us-central1' })),
  httpsCallable: (functions: unknown, name: string) => mockHttpsCallable(functions, name),
}));

import {
  DIALOGUE_V2_WARM_INTERVAL_MS,
  createDialogueV2Warmup,
  type DialogueV2WarmupDependencies,
} from '../app/dialogue_v2_warmup';
import {
  markDialogueV2StartTap,
  registerDialogueV2Prestart,
  resetDialogueV2PrestartForTests,
  takeDialogueV2Prestart,
} from '../app/dialogue_v2_session_prestart';
import { prestartDialogueV2TextSession, startDialogueV2TextSession } from '../app/dialogue_v2_turn_client';

/**
 * Владелец 01.10: диалоги «ДОЛЖНЫ» прогреваться. (1) warm-вызов двух функций не чаще
 * раза в 10 минут на устройство; (2) фоновый старт сессии при открытии брифинга,
 * экран сессии забирает его без второго сетевого круга; (3) замер «тап → готовность».
 */
function warmDeps(overrides: Partial<DialogueV2WarmupDependencies> = {}) {
  let now = 1_000_000;
  let stored: number | null = null;
  const deps = {
    nowMs: jest.fn(() => now),
    readLastWarmAtMs: jest.fn(async () => stored),
    writeLastWarmAtMs: jest.fn(async (value: number) => { stored = value; }),
    callWarm: jest.fn(async () => ({ data: { ok: true, warm: true } })),
    ...overrides,
  };
  return { deps, advance: (ms: number) => { now += ms; }, setStored: (value: number | null) => { stored = value; } };
}

const SESSION = (expiresAtMs: number) => ({ ok: true as const, sessionId: `d2s_${'a'.repeat(32)}`, expiresAtMs });
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Dialogue V2 warm-up (client)', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { log.mockRestore(); warn.mockRestore(); });

  it('warms both functions, then throttles for 10 minutes', async () => {
    const { deps, advance } = warmDeps();
    const warmup = createDialogueV2Warmup(deps);
    await expect(warmup.warm('hub')).resolves.toBe('sent');
    expect((deps.callWarm as jest.Mock).mock.calls.map((call: unknown[]) => call[0])).toEqual(['dialogueV2SessionStart', 'dialogueV2TextTurn']);
    expect(deps.writeLastWarmAtMs).toHaveBeenCalledWith(1_000_000);
    advance(DIALOGUE_V2_WARM_INTERVAL_MS - 1);
    await expect(warmup.warm('home_tile')).resolves.toBe('throttled');
    advance(1);
    await expect(warmup.warm('home_tile')).resolves.toBe('sent');
    expect(deps.callWarm).toHaveBeenCalledTimes(4);
  });

  it('respects the stored mark after an app restart and never doubles concurrent warm-ups', async () => {
    const restarted = warmDeps();
    restarted.setStored(1_000_000 - 60_000);
    await expect(createDialogueV2Warmup(restarted.deps).warm('hub')).resolves.toBe('throttled');
    expect(restarted.deps.callWarm).not.toHaveBeenCalled();

    const fresh = warmDeps();
    const warmup = createDialogueV2Warmup(fresh.deps);
    const [first, second] = await Promise.all([warmup.warm('hub'), warmup.warm('home_tile')]);
    expect([first, second].sort()).toEqual(['in_flight', 'sent']);
    expect(fresh.deps.callWarm).toHaveBeenCalledTimes(2);
  });

  it('a failing warm call never throws and is logged', async () => {
    const { deps } = warmDeps({ callWarm: jest.fn(async () => { throw Object.assign(new Error('x'), { code: 'functions/unavailable' }); }) });
    await expect(createDialogueV2Warmup(deps).warm('hub')).resolves.toBe('failed');
    expect(log.mock.calls.some((call) => String(call[1]).includes('partial_failure'))).toBe(true);
  });
});

describe('Dialogue V2 session prestart', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    resetDialogueV2PrestartForTests();
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { log.mockRestore(); warn.mockRestore(); });

  const selection = { studyTarget: 'en', scenarioId: 'social_01' } as const;

  it('dedups a repeated prestart and hands it out exactly once', async () => {
    const start = jest.fn(async () => SESSION(Date.now() + 24 * 3_600_000));
    expect(registerDialogueV2Prestart(selection, start, Date.now())).toBe(true);
    expect(registerDialogueV2Prestart(selection, start, Date.now())).toBe(false);
    expect(start).toHaveBeenCalledTimes(1);
    await delay(0);
    const taken = takeDialogueV2Prestart(selection, Date.now());
    expect(taken?.state).toBe('ready');
    await expect(taken!.promise).resolves.toEqual(SESSION(expect.any(Number) as unknown as number));
    expect(takeDialogueV2Prestart(selection, Date.now())).toBeNull();
  });

  it('discards a failed or nearly expired prestart', async () => {
    registerDialogueV2Prestart(selection, async () => { throw new Error('offline'); }, Date.now());
    await delay(0);
    expect(takeDialogueV2Prestart(selection, Date.now())).toBeNull();
    registerDialogueV2Prestart(selection, async () => SESSION(Date.now() + 60_000), Date.now());
    await delay(0);
    expect(takeDialogueV2Prestart(selection, Date.now())).toBeNull();
  });

  it('the session screen reuses the briefing prestart: one network start, ready almost instantly', async () => {
    mockCallableRun.mockImplementation(async () => {
      await delay(150); // холодный старт функции (мок)
      return { data: SESSION(Date.now() + 24 * 3_600_000) };
    });
    prestartDialogueV2TextSession({ studyTarget: 'en', scenarioId: 'social_01' });
    await delay(200); // человек читает брифинг
    markDialogueV2StartTap(selection, Date.now());
    const before = Date.now();
    const session = await startDialogueV2TextSession({ studyTarget: 'en', scenarioId: 'social_01' });
    const waitedMs = Date.now() - before;
    expect(session?.sessionId).toBe(`d2s_${'a'.repeat(32)}`);
    expect(mockCallableRun).toHaveBeenCalledTimes(1);
    expect(waitedMs).toBeLessThan(50);
    const timing = log.mock.calls.find((call) => call[0] === '[DIALOGUE-V2] start timing');
    expect(JSON.parse(String(timing?.[1]))).toEqual(expect.objectContaining({ source: 'prestart_ready', ready: true, sinceTapMs: expect.any(Number) }));
  });

  it('without a prestart the screen pays the network start (before), and logs it', async () => {
    mockCallableRun.mockImplementation(async () => {
      await delay(150);
      return { data: SESSION(Date.now() + 24 * 3_600_000) };
    });
    const before = Date.now();
    await startDialogueV2TextSession({ studyTarget: 'en', scenarioId: 'social_02' });
    expect(Date.now() - before).toBeGreaterThanOrEqual(140);
    const timing = log.mock.calls.find((call) => call[0] === '[DIALOGUE-V2] start timing');
    expect(JSON.parse(String(timing?.[1]))).toEqual(expect.objectContaining({ source: 'network', ready: true }));
  });

  it('a failed prestart falls back to a fresh network start', async () => {
    mockCallableRun.mockRejectedValueOnce(Object.assign(new Error('cold'), { code: 'functions/unavailable' }));
    prestartDialogueV2TextSession({ studyTarget: 'en', scenarioId: 'social_03' });
    await delay(0);
    mockCallableRun.mockResolvedValueOnce({ data: SESSION(Date.now() + 24 * 3_600_000) });
    const session = await startDialogueV2TextSession({ studyTarget: 'en', scenarioId: 'social_03' });
    expect(session).not.toBeNull();
    expect(mockCallableRun).toHaveBeenCalledTimes(2);
  });
});
