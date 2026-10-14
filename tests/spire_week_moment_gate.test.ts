// D191 этап 2 (владелец 14.10): окно итога недели — 1 раз за неделю после закрытия (пн 00:01 UTC), только игравшим,
// за флагом moments_v3; при показе история в сторис ложится просмотренной (D192).
import {
  SPIRE_WEEK_MOMENT_GRACE_MS,
  __resetSpireWeekMomentGateForTests,
  decideSpireWeekMomentTiming,
  markSpireWeekMomentShown,
  resolveSpireWeekMoment,
  type SpireWeekMomentShow,
} from '../app/spire/spire_week_moment_gate';

let mockStore: Record<string, string> = {};
let mockFlagOn = true;
let mockResult: Record<string, unknown> | null = null;
const mockLoad = jest.fn(async () => mockResult);
const mockStoryShown = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: async (key: string, value: string) => { mockStore[key] = value; },
    getItem: async (key: string) => (key in mockStore ? mockStore[key] : null),
  },
}));
jest.mock('../app/remote_config_client', () => ({
  readRemoteConfigCacheRaw: async () => JSON.stringify({ bools: { moments_v3: mockFlagOn } }),
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: async () => 'stable-a' }));
jest.mock('../app/spire_config_client', () => ({ warmSpireConfigFromDisk: async () => 'disk', peekSpireConfig: () => ({ enabled: true }) }));
jest.mock('../app/spire/spire_live_gate', () => ({ spireOpenLiveGate: () => ({ open: true }) }));
jest.mock('../app/spire/spire_ui_lang_gate', () => ({ spireUiLangDecision: (l: string) => ({ allowed: l === 'ru' || l === 'uk', reason: 'test' }) }));
jest.mock('../components/spire/spire_home_week', () => ({ asSpireLang: (v: unknown) => (v === 'en' || v === 'es' ? v : null) }));
jest.mock('../modules/story_events/story_event_sources', () => ({ markSpireWeekStoryShown: (...args: unknown[]) => mockStoryShown(...args) }));
jest.mock('../app/spire/spire_week_result_client', () => {
  const { spireWeekStartMs } = jest.requireActual('../modules/spire/residents');
  const { spireCurrentWeekKey } = jest.requireActual('../components/spire/spire_tower_model');
  return {
    spirePreviousWeekKey: (nowMs: number) => spireCurrentWeekKey(spireWeekStartMs(nowMs) - 24 * 60 * 60 * 1000),
    spireLoadWeekResult: (...args: unknown[]) => mockLoad(...(args as [])),
  };
});

// Понедельник 12.10.2026 00:00 UTC — закрылась неделя 05–11.10.
const MONDAY_UTC = Date.UTC(2026, 9, 12, 0, 0, 0);
const INPUT = { uiLang: 'ru', studyTarget: 'en', tabEnabled: true } as const;

function weekResult(weekId: string): Record<string, unknown> {
  return { weekId, lang: 'en', steps: 40, roomRank: 3, roomTotal: 30, promoted: true, demoted: false, prevTier: 2, newTier: 3, placeCoins: 50, promotionCoins: 100, weekCoins: 420 };
}

describe('D191 week moment gate', () => {
  beforeEach(() => {
    mockStore = {};
    mockFlagOn = true;
    mockLoad.mockClear();
    mockStoryShown.mockClear();
    __resetSpireWeekMomentGateForTests();
  });

  it('does not offer the window while the week is not closed yet (first minute of Monday UTC)', () => {
    expect(decideSpireWeekMomentTiming(MONDAY_UTC + 30_000, null)).toMatchObject({ ok: false, reason: 'week_not_closed' });
    expect(decideSpireWeekMomentTiming(MONDAY_UTC + SPIRE_WEEK_MOMENT_GRACE_MS, null)).toMatchObject({ ok: true });
  });

  it('ignores the device time zone: local Monday while UTC is still Sunday shows nothing new', () => {
    // Киев (UTC+3), понедельник 02:30 по местному = воскресенье 23:30 UTC: неделя ещё не закрыта, прошлый итог уже показан.
    const sundayUtc = MONDAY_UTC - 30 * 60_000;
    const lastShown = decideSpireWeekMomentTiming(MONDAY_UTC - 6 * 24 * 3600_000, null);
    expect(lastShown.ok).toBe(true);
    expect(decideSpireWeekMomentTiming(sundayUtc, lastShown.weekId)).toMatchObject({ ok: false, reason: 'already_shown' });
    const monday = decideSpireWeekMomentTiming(MONDAY_UTC + 2 * 60_000, lastShown.weekId);
    expect(monday.ok).toBe(true);
    expect(monday.weekId).not.toBe(lastShown.weekId);
  });

  it('shows once for a player, then the second open of the app skips it', async () => {
    const nowMs = MONDAY_UTC + 5 * 60_000;
    const weekId = decideSpireWeekMomentTiming(nowMs, null).weekId;
    mockResult = weekResult(weekId);
    const first = await resolveSpireWeekMoment({ ...INPUT, nowMs });
    expect(first).toMatchObject({ show: true, outcome: 'promoted', weekId });
    await markSpireWeekMomentShown(first as SpireWeekMomentShow);
    expect(mockStoryShown).toHaveBeenCalledWith(mockResult);
    const second = await resolveSpireWeekMoment({ ...INPUT, nowMs: nowMs + 60_000 });
    expect(second).toEqual({ show: false, reason: 'already_shown' });
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });

  it('two opens racing in one process decide once', async () => {
    const nowMs = MONDAY_UTC + 5 * 60_000;
    mockResult = weekResult(decideSpireWeekMomentTiming(nowMs, null).weekId);
    const [a, b] = await Promise.all([resolveSpireWeekMoment({ ...INPUT, nowMs }), resolveSpireWeekMoment({ ...INPUT, nowMs })]);
    expect([a.show, b.show].filter(Boolean)).toHaveLength(1);
    expect([a, b].some((d) => !d.show && d.reason === 'in_progress')).toBe(true);
  });

  it('a decision that never reached the screen is not lost: no mark until shown', async () => {
    const nowMs = MONDAY_UTC + 5 * 60_000;
    mockResult = weekResult(decideSpireWeekMomentTiming(nowMs, null).weekId);
    await resolveSpireWeekMoment({ ...INPUT, nowMs });
    expect(Object.keys(mockStore)).toEqual([]);
    await expect(resolveSpireWeekMoment({ ...INPUT, nowMs })).resolves.toMatchObject({ show: true });
  });

  it('does not show to someone who did not play last week (no result)', async () => {
    mockResult = null;
    await expect(resolveSpireWeekMoment({ ...INPUT, nowMs: MONDAY_UTC + 5 * 60_000 })).resolves.toEqual({ show: false, reason: 'no_result' });
  });

  it('stays silent with the moments_v3 flag off and spends no read', async () => {
    mockFlagOn = false;
    await expect(resolveSpireWeekMoment({ ...INPUT, nowMs: MONDAY_UTC + 5 * 60_000 })).resolves.toEqual({ show: false, reason: 'flag_off' });
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('skips languages and interfaces without the Spire', async () => {
    await expect(resolveSpireWeekMoment({ ...INPUT, uiLang: 'es', nowMs: MONDAY_UTC + 5 * 60_000 })).resolves.toEqual({ show: false, reason: 'ui_lang' });
    await expect(resolveSpireWeekMoment({ ...INPUT, studyTarget: 'it', nowMs: MONDAY_UTC + 5 * 60_000 })).resolves.toEqual({ show: false, reason: 'study_lang' });
    await expect(resolveSpireWeekMoment({ ...INPUT, tabEnabled: false, nowMs: MONDAY_UTC + 5 * 60_000 })).resolves.toEqual({ show: false, reason: 'tab_off' });
    expect(mockLoad).not.toHaveBeenCalled();
  });
});
