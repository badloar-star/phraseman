import AsyncStorage from '@react-native-async-storage/async-storage';

const mockCallable: jest.Mock = jest.fn();
const mockHttpsCallable: jest.Mock = jest.fn(() => mockCallable);
const mockEnsureAnonUser: jest.Mock = jest.fn(async () => 'stable-user');
const mockEnsureStableAuthLinkForStableId: jest.Mock = jest.fn(async () => true);

jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({ region: 'us-central1' })),
  httpsCallable: (functions: unknown, name: string) => mockHttpsCallable(functions, name),
}));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: () => mockEnsureAnonUser(),
  ensureStableAuthLinkForStableId: (stableId: string) => mockEnsureStableAuthLinkForStableId(stableId),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));

import {
  buildLocalStatsInsights,
  generateStatsInsights,
  generateVerifiedStatsInsights,
  getStatsInsightsState,
  getVerifiedStatsInsightsSelectionState,
  getVerifiedStatsInsightsState,
  type StatsInsightsBriefing,
  type VerifiedStatsInsightsNotes,
} from '../app/stats_insights_client';
import type { StatsInsightAnalysis, StatsInsightBlockKey } from '../app/stats_insights_analysis';
import { statsInsightsStorageKey } from '../app/target_storage_keys';

const BLOCKS: StatsInsightBlockKey[] = ['week', 'longTerm', 'comparison', 'lifetime'];

const resetStorage = () => {
  (AsyncStorage as unknown as { __reset?: () => void }).__reset?.();
};

function briefing(overrides: Partial<StatsInsightsBriefing> = {}): StatsInsightsBriefing {
  return {
    lang: 'ru', studyTarget: 'en',
    balance: { score: 44, isWarmup: false, active7: 4, avgMinutes: 21 },
    rhythm: { active7: 4, xp7: 320, minutes7: 84, bestDay: 'среда' },
    year: { activeDays: 40, currentStreak: 5, longestStreak: 9, bestMonth: 'май', goalPct: 12 },
    percentiles: { totalXp: 72, week: 51, daily7: null },
    lifetime: { words: 120, phrases: 18, quizzes: 7, arenaWins: 2, daysActive: 12 },
    weakCategories: [], ...overrides,
  };
}

function analysis(fingerprint = 'fp-1'): StatsInsightAnalysis {
  const blocks = Object.fromEntries(BLOCKS.map((block) => [block, {
    id: `${block}-id`, block, priority: 1, facts: [block],
    allowedClaim: `${block} claim`, allowedAction: null,
    fallback: { ru: `fallback-${block}`, uk: `uk-${block}` },
  }])) as StatsInsightAnalysis['blocks'];
  return { fingerprint, blocks, generatedFromCompleteSnapshot: true };
}

function serverNotes(prefix = 'server'): VerifiedStatsInsightsNotes {
  return Object.fromEntries(BLOCKS.map((block) => [block, `${prefix}-${block}`])) as VerifiedStatsInsightsNotes;
}

function serverIds(a: StatsInsightAnalysis): Record<StatsInsightBlockKey, string> {
  return Object.fromEntries(BLOCKS.map((block) => [block, a.blocks[block].id])) as Record<StatsInsightBlockKey, string>;
}

async function seedVerifiedCache(
  a: StatsInsightAnalysis,
  options: { lang?: 'ru' | 'uk'; studyTarget?: 'en' | 'fr'; nextAllowedAtMs?: number } = {},
): Promise<void> {
  const lang = options.lang ?? 'ru';
  const studyTarget = options.studyTarget ?? 'en';
  await AsyncStorage.setItem(`${statsInsightsStorageKey(studyTarget)}:v2`, JSON.stringify({
    schemaVersion: 2,
    fingerprint: a.fingerprint,
    observationIds: serverIds(a),
    notes: serverNotes(),
    generatedAtMs: 10,
    nextAllowedAtMs: options.nextAllowedAtMs ?? 100,
    lang,
    studyTarget,
  }));
}

describe('stats insights client copy', () => {
  beforeEach(() => {
    resetStorage();
    jest.clearAllMocks();
  });

  it('preserves the legacy local API while the screen still uses it', async () => {
    const notes = buildLocalStatsInsights(briefing());
    expect(notes.balance).toContain('4 активных');
    expect(notes.balance).not.toMatch(/баланс|балл/i);
    expect((await generateStatsInsights({ briefing: briefing(), isPremium: true, nowMs: 10 })).kind).toBe('cached');
    expect((await getStatsInsightsState('en', 10, 'ru')).kind).toBe('cached');
  });

  it('calls the verified Premium callable with the exact ru/en envelope and links anonymous auth', async () => {
    const a = analysis();
    mockCallable.mockResolvedValue({ data: { ok: true, notes: serverNotes(), observationIds: serverIds(a), nextAllowedAtMs: 999, model: 'gpt-test' } });

    const state = await generateVerifiedStatsInsights({ analysis: a, isPremium: true, lang: 'ru', studyTarget: 'en', nowMs: 10 });

    expect(state.kind).toBe('cached');
    expect(mockEnsureAnonUser).toHaveBeenCalledTimes(1);
    expect(mockEnsureStableAuthLinkForStableId).toHaveBeenCalledWith('stable-user');
    expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'statsInsightsGenerate');
    expect(mockCallable).toHaveBeenCalledWith({ analysis: a, lang: 'ru', studyTarget: 'en' });
  });

  it('sends another supported locale and target in the exact verified envelope', async () => {
    const a = analysis();
    mockCallable.mockResolvedValue({ data: { ok: true, notes: serverNotes(), observationIds: serverIds(a), nextAllowedAtMs: 999, model: 'gpt-test' } });

    expect((await generateVerifiedStatsInsights({ analysis: a, isPremium: true, lang: 'uk', studyTarget: 'fr', nowMs: 10 })).kind).toBe('cached');
    expect(mockCallable).toHaveBeenCalledWith({ analysis: a, lang: 'uk', studyTarget: 'fr' });
  });

  it('caches an exact successful response and replays it without a second call', async () => {
    const a = analysis();
    mockCallable.mockResolvedValue({ data: { ok: true, notes: serverNotes(), observationIds: serverIds(a), nextAllowedAtMs: 999, model: 'gpt-test' } });
    await generateVerifiedStatsInsights({ analysis: a, isPremium: true, lang: 'ru', studyTarget: 'en', nowMs: 10 });

    const cached = await getVerifiedStatsInsightsState({ analysis: a, lang: 'ru', studyTarget: 'en', nowMs: 20 });
    const replay = await generateVerifiedStatsInsights({ analysis: a, isPremium: true, lang: 'ru', studyTarget: 'en', nowMs: 20 });

    expect(cached.kind).toBe('cached');
    expect(replay.kind).toBe('cached');
    expect(mockCallable).toHaveBeenCalledTimes(1);
  });

  it('reads exact observation ids as preserve before the v2 selection boundary without network or auth', async () => {
    const a = analysis();
    await seedVerifiedCache(a, { nextAllowedAtMs: 100 });

    await expect(getVerifiedStatsInsightsSelectionState({ lang: 'ru', studyTarget: 'en', nowMs: 99 })).resolves.toEqual({
      kind: 'preserve',
      observationIds: serverIds(a),
      nextAllowedAtMs: 100,
    });
    expect(mockCallable).not.toHaveBeenCalled();
    expect(mockHttpsCallable).not.toHaveBeenCalled();
    expect(mockEnsureAnonUser).not.toHaveBeenCalled();
    expect(mockEnsureStableAuthLinkForStableId).not.toHaveBeenCalled();
  });

  it('rotates the stored observation ids exactly at the v2 selection boundary', async () => {
    const a = analysis();
    await seedVerifiedCache(a, { nextAllowedAtMs: 100 });

    await expect(getVerifiedStatsInsightsSelectionState({ lang: 'ru', studyTarget: 'en', nowMs: 100 })).resolves.toEqual({
      kind: 'rotate',
      observationIds: serverIds(a),
      nextAllowedAtMs: 100,
    });
  });

  it('does not expose v2 selection metadata for another language or target', async () => {
    await seedVerifiedCache(analysis());

    await expect(getVerifiedStatsInsightsSelectionState({ lang: 'uk', studyTarget: 'en', nowMs: 50 })).resolves.toEqual({ kind: 'none' });
    await expect(getVerifiedStatsInsightsSelectionState({ lang: 'ru', studyTarget: 'fr', nowMs: 50 })).resolves.toEqual({ kind: 'none' });
  });

  it('does not expose legacy or corrupt cache as v2 selection metadata', async () => {
    await AsyncStorage.setItem(statsInsightsStorageKey('en'), JSON.stringify({ notes: { rhythm: 'legacy' }, generatedAtMs: 1, nextAllowedAtMs: 100, lang: 'ru' }));
    await expect(getVerifiedStatsInsightsSelectionState({ lang: 'ru', studyTarget: 'en', nowMs: 50 })).resolves.toEqual({ kind: 'none' });

    await AsyncStorage.setItem(`${statsInsightsStorageKey('en')}:v2`, JSON.stringify({ schemaVersion: 2, observationIds: { week: 'only-one' } }));
    await expect(getVerifiedStatsInsightsSelectionState({ lang: 'ru', studyTarget: 'en', nowMs: 50 })).resolves.toEqual({ kind: 'none' });
  });

  it('never calls the server for free users', async () => {
    expect((await generateVerifiedStatsInsights({ analysis: analysis(), isPremium: false, lang: 'ru', studyTarget: 'en' })).kind).toBe('none');
    expect(mockCallable).not.toHaveBeenCalled();
  });

  it.each([
    [{ code: 'functions/unavailable', message: 'stats_insights_provider_failed' }, 'provider_failed'],
    [new Error('Network request failed while offline'), 'offline'],
  ])(
    'returns current deterministic fallback for realistic callable errors without writing a v2 success cache',
    async (callableError, expectedCode) => {
      mockCallable.mockRejectedValue(callableError);
      const a = analysis();
      const state = await generateVerifiedStatsInsights({ analysis: a, isPremium: true, lang: 'ru', studyTarget: 'en', nowMs: 10 });
      expect(state).toMatchObject({ kind: 'fallback', code: expectedCode, notes: serverNotes('fallback') });
      expect(await getVerifiedStatsInsightsState({ analysis: a, lang: 'ru', studyTarget: 'en' })).toEqual({ kind: 'none' });
    },
  );

  it('rejects a response whose observation ids do not exactly match the requested analysis', async () => {
    const a = analysis();
    mockCallable.mockResolvedValue({ data: { ok: true, notes: serverNotes(), observationIds: { ...serverIds(a), week: 'unknown' }, nextAllowedAtMs: 999, model: 'gpt-test' } });
    expect(await generateVerifiedStatsInsights({ analysis: a, isPremium: true, lang: 'ru', studyTarget: 'en', nowMs: 10 }))
      .toMatchObject({ kind: 'fallback', code: 'provider_failed', notes: serverNotes('fallback') });
  });

  it('does not let a legacy v1 cache block v2 generation', async () => {
    await AsyncStorage.setItem(statsInsightsStorageKey('en'), JSON.stringify({ notes: { rhythm: 'legacy' }, generatedAtMs: 1, nextAllowedAtMs: 999, lang: 'ru' }));
    const a = analysis();
    mockCallable.mockResolvedValue({ data: { ok: true, notes: serverNotes(), observationIds: serverIds(a), nextAllowedAtMs: 999, model: 'gpt-test' } });
    expect((await generateVerifiedStatsInsights({ analysis: a, isPremium: true, lang: 'ru', studyTarget: 'en', nowMs: 10 })).kind).toBe('cached');
    expect(mockCallable).toHaveBeenCalledTimes(1);
  });

  it('keeps verified v2 cache isolated from legacy writes and legacy parsing', async () => {
    const a = analysis();
    mockCallable.mockResolvedValue({ data: { ok: true, notes: serverNotes(), observationIds: serverIds(a), nextAllowedAtMs: 999, model: 'gpt-test' } });
    await generateVerifiedStatsInsights({ analysis: a, isPremium: true, lang: 'ru', studyTarget: 'en', nowMs: 10 });

    expect((await getStatsInsightsState('en', 10, 'ru')).kind).toBe('none');
    await generateStatsInsights({ briefing: briefing(), isPremium: true, nowMs: 20 });

    const replay = await generateVerifiedStatsInsights({ analysis: a, isPremium: true, lang: 'ru', studyTarget: 'en', nowMs: 30 });
    expect(replay).toMatchObject({ kind: 'cached', notes: serverNotes() });
    expect(mockCallable).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent identical verified generation calls', async () => {
    const a = analysis();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    mockCallable.mockImplementation(async () => {
      await pending;
      return { data: { ok: true, notes: serverNotes(), observationIds: serverIds(a), nextAllowedAtMs: 999, model: 'gpt-test' } };
    });

    const first = generateVerifiedStatsInsights({ analysis: a, isPremium: true, force: true, lang: 'ru', studyTarget: 'es', nowMs: 10 });
    const second = generateVerifiedStatsInsights({ analysis: a, isPremium: true, force: true, lang: 'ru', nowMs: 10 });
    await Promise.resolve();
    release();

    const [firstState, secondState] = await Promise.all([first, second]);
    expect(mockCallable).toHaveBeenCalledTimes(1);
    expect(mockCallable).toHaveBeenCalledWith({ analysis: a, lang: 'ru', studyTarget: 'en' });
    expect(secondState).toEqual(firstState);
  });

  it('does not deduplicate analyses with a colliding fingerprint but different observation ids', async () => {
    const firstAnalysis = analysis('collision');
    const secondAnalysis = analysis('collision');
    for (const block of BLOCKS) {
      secondAnalysis.blocks[block] = { ...secondAnalysis.blocks[block], id: `${block}-second-id` };
    }
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    mockCallable.mockImplementation(async ({ analysis: requested }: { analysis: StatsInsightAnalysis }) => {
      await pending;
      const prefix = requested.blocks.week.id === firstAnalysis.blocks.week.id ? 'first' : 'second';
      return { data: { ok: true, notes: serverNotes(prefix), observationIds: serverIds(requested), nextAllowedAtMs: 999, model: 'gpt-test' } };
    });

    const first = generateVerifiedStatsInsights({ analysis: firstAnalysis, isPremium: true, force: true, lang: 'ru', studyTarget: 'en', nowMs: 10 });
    const second = generateVerifiedStatsInsights({ analysis: secondAnalysis, isPremium: true, force: true, lang: 'ru', studyTarget: 'en', nowMs: 10 });
    await Promise.resolve();
    release();

    const [firstState, secondState] = await Promise.all([first, second]);
    expect(mockCallable).toHaveBeenCalledTimes(2);
    expect(firstState).toMatchObject({ kind: 'cached', notes: serverNotes('first'), observationIds: serverIds(firstAnalysis) });
    expect(secondState).toMatchObject({ kind: 'cached', notes: serverNotes('second'), observationIds: serverIds(secondAnalysis) });
  });

  it('does not reuse a v2 cache for another language or target', async () => {
    const a = analysis();
    mockCallable.mockResolvedValue({ data: { ok: true, notes: serverNotes(), observationIds: serverIds(a), nextAllowedAtMs: 999, model: 'gpt-test' } });
    await generateVerifiedStatsInsights({ analysis: a, isPremium: true, lang: 'ru', studyTarget: 'en', nowMs: 10 });
    expect((await getVerifiedStatsInsightsState({ analysis: a, lang: 'uk', studyTarget: 'en' })).kind).toBe('none');
    expect((await getVerifiedStatsInsightsState({ analysis: a, lang: 'ru', studyTarget: 'fr' })).kind).toBe('none');
  });

  it('replays the same fingerprint in a closed window but returns current fallback for a changed fingerprint', async () => {
    const oldAnalysis = analysis('old');
    mockCallable.mockResolvedValue({ data: { ok: true, notes: serverNotes('old'), observationIds: serverIds(oldAnalysis), nextAllowedAtMs: 999, model: 'gpt-test' } });
    await generateVerifiedStatsInsights({ analysis: oldAnalysis, isPremium: true, lang: 'ru', studyTarget: 'en', nowMs: 10 });
    const same = await generateVerifiedStatsInsights({ analysis: oldAnalysis, isPremium: true, lang: 'ru', studyTarget: 'en', nowMs: 20 });
    const current = await generateVerifiedStatsInsights({ analysis: analysis('new'), isPremium: true, lang: 'ru', studyTarget: 'en', nowMs: 20 });
    expect(same).toMatchObject({ kind: 'cached', notes: serverNotes('old') });
    expect(current).toMatchObject({ kind: 'fallback', code: 'not_ready', notes: serverNotes('fallback') });
    expect(mockCallable).toHaveBeenCalledTimes(1);
  });

  it('handles not_ready without making stale notes current and only syncs a compatible cache window', async () => {
    const a = analysis();
    mockCallable.mockResolvedValueOnce({ data: { ok: true, notes: serverNotes(), observationIds: serverIds(a), nextAllowedAtMs: 5, model: 'gpt-test' } });
    await generateVerifiedStatsInsights({ analysis: a, isPremium: true, lang: 'ru', studyTarget: 'en', nowMs: 1 });
    mockCallable.mockRejectedValueOnce({ code: 'functions/failed-precondition', details: { code: 'not_ready', nextAllowedAtMs: 777 } });
    const compatible = await generateVerifiedStatsInsights({ analysis: a, isPremium: true, force: true, lang: 'ru', studyTarget: 'en', nowMs: 10 });
    expect(compatible).toMatchObject({ kind: 'cached', nextAllowedAtMs: 777, notes: serverNotes() });

    mockCallable.mockRejectedValueOnce({ code: 'functions/failed-precondition', details: { code: 'not_ready', nextAllowedAtMs: 888 } });
    const changed = await generateVerifiedStatsInsights({ analysis: analysis('new'), isPremium: true, force: true, lang: 'ru', studyTarget: 'en', nowMs: 10 });
    expect(changed).toMatchObject({ kind: 'fallback', code: 'not_ready', notes: serverNotes('fallback') });
  });
});
