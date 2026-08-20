import {
  ARENA_COSMETIC_CATALOG,
  arenaApplyMasteryObservations,
  arenaCanonicalTaskSignature,
  arenaCatalogItem,
  arenaMasteryModeState,
  arenaPartnerSpotlightAward,
  arenaRivalSeriesAfterGame,
  arenaRunEligibility,
  arenaSpeedSkill,
  arenaTodayBand,
  arenaTodayDayKey,
  arenaTodayHardExpiresAt,
  arenaTodaySnapshotId,
  arenaTodayStars,
  arenaUtcWeekKey,
} from './arena_expansion_core';
import * as arenaExpansionRuntime from './arena_expansion_core';
import type { TournamentTask } from './tournament_core';

function task(overrides: Partial<TournamentTask> = {}): TournamentTask {
  return {
    taskId: 'task-a', mode: 'guess_phrase', difficulty: 2, isVoice: false,
    payload: { prompt: 'hello', options: ['a', 'b'], correctIndex: 0 },
    explanation: { ruleNote: 'rule', example: 'example' }, tags: ['tag'], verified: true,
    ...overrides,
  };
}

describe('Arena Expansion pure contracts', () => {
  it('builds an idempotent viewer-only review snapshot without identity fields', () => {
    const runtime = arenaExpansionRuntime as unknown as {
      arenaBuildViewerReviewSnapshot(input: {
        matchId: string; runKind: string; createdAtMs: number; tasks: readonly TournamentTask[];
        evidenceByTask: Readonly<Record<string, Record<string, unknown>>>; summary: Record<string, unknown>;
      }): Record<string, unknown> & { tasks: readonly Record<string, unknown>[] };
    };
    expect(typeof runtime.arenaBuildViewerReviewSnapshot).toBe('function');
    const input = {
      matchId: 'match-1', runKind: 'match', createdAtMs: 123,
      tasks: [task()],
      evidenceByTask: { '0': { correct: true, elapsedMs: 700, answerSnapshot: { selectedIndex: 0 } } },
      summary: { correct: 1, submittedAnswers: 1 },
    };
    const first = runtime.arenaBuildViewerReviewSnapshot(input);
    expect(runtime.arenaBuildViewerReviewSnapshot(input)).toEqual(first);
    expect(first.tasks).toHaveLength(1);
    expect(first.tasks[0]).toMatchObject({ taskIndex: 0, correct: true, elapsedMs: 700 });
    const serialized = JSON.stringify(first);
    expect(serialized).not.toMatch(/stableUid|authUid|opponent|participant/);
  });
  it('creates four stable Today bands and lets a 20-minute run cross midnight', () => {
    expect([0, 5, 6, 11, 12, 17, 18, 23].map(arenaTodayBand)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    const start = Date.UTC(2026, 7, 11, 23, 55);
    expect(arenaTodayDayKey(start)).toBe('2026-08-11');
    expect(arenaTodaySnapshotId('2026-08-11', 3)).toBe('2026-08-11_b3');
    expect(new Date(arenaTodayHardExpiresAt(start)).toISOString()).toBe('2026-08-12T00:15:00.000Z');
    expect(arenaTodayStars(10, 10)).toBe(30);
    expect(arenaTodayStars(10, 7)).toBe(14);
    expect(arenaTodayStars(7, 8)).toBe(19);
    expect(arenaTodayStars(7, 7)).toBe(14);
  });

  it('uses a canonical content signature independent of task id and user identity', () => {
    expect(arenaCanonicalTaskSignature(task({ taskId: 'a' })))
      .toBe(arenaCanonicalTaskSignature(task({ taskId: 'b' })));
    expect(arenaCanonicalTaskSignature(task({ payload: { prompt: 'different', correctIndex: 0 } })))
      .not.toBe(arenaCanonicalTaskSignature(task()));
    const withNestedEditorial = task({
      payload: { ...task().payload, items: [{ prompt: 'x', correctIndex: 0,
        explanation: { wrongOptionReasons: ['new editorial copy'] } }] },
    });
    const withoutNestedEditorial = task({
      payload: { ...task().payload, items: [{ prompt: 'x', correctIndex: 0 }] },
    });
    expect(arenaCanonicalTaskSignature(withNestedEditorial)).toBe(arenaCanonicalTaskSignature(withoutNestedEditorial));
  });

  it('implements the binding rolling-40 beta formula without timing in score', () => {
    const observations = Array.from({ length: 45 }, (_, index) => ({
      signature: `s${index}`, atMs: 1_000 - index, skill: index < 20 ? 1 : 0,
      difficulty: 2, elapsedMs: index % 2 ? 100 : 9_000,
    }));
    const state = arenaMasteryModeState(observations);
    expect(state.sampleCount).toBe(40);
    expect(state.confidence).toBe('confident');
    expect(state.score).toBe(63);
    const faster = arenaMasteryModeState(observations.map((entry) => ({ ...entry, elapsedMs: 1 })));
    expect(faster.score).toBe(state.score);
    expect(faster.medianMs).not.toBe(state.medianMs);
  });

  it('hides mastery before five samples and awards thresholds once, capped at 500 lifetime', () => {
    const additions = {
      guess_phrase: Array.from({ length: 40 }, (_, index) => ({
        signature: `g${index}`, atMs: 1_000 - index, skill: 1, difficulty: 3, elapsedMs: 1_000,
      })),
    };
    expect(arenaMasteryModeState(additions.guess_phrase.slice(0, 4)).score).toBeNull();
    const first = arenaApplyMasteryObservations({ additions, lifetimeThresholdStars: 0 });
    expect(first.mastery.guess_phrase?.claimedThresholds).toEqual([50, 65, 80, 90]);
    expect(first.walletAward).toBe(100);
    const replay = arenaApplyMasteryObservations({
      current: first.mastery, additions: {}, lifetimeThresholdStars: 100,
    });
    expect(replay.walletAward).toBe(0);
    expect(arenaApplyMasteryObservations({ additions, lifetimeThresholdStars: 490 }).walletAward).toBe(10);
  });

  it('deduplicates mastery signatures internally and keeps the newest observation', () => {
    const state = arenaMasteryModeState([
      { signature: 'same', atMs: 1, skill: 0, difficulty: 1, elapsedMs: 8_000 },
      { signature: 'same', atMs: 2, skill: 1, difficulty: 1, elapsedMs: 1_000 },
    ]);
    expect(state.sampleCount).toBe(1);
    expect(state.observations[0]).toMatchObject({ atMs: 2, skill: 1 });
  });

  it('scores speed mastery exactly and keeps all noncompetitive modes hard-zero', () => {
    expect(arenaSpeedSkill(4, 0)).toBe(1);
    expect(arenaSpeedSkill(3, 4)).toBe(0.5);
    expect(arenaRunEligibility('today', 'friend')).toMatchObject({ todayStars: true, mastery: true, spin: false });
    expect(arenaRunEligibility('ghost', 'quick')).toMatchObject({ baseStars: false, rating: false, mastery: false });
    expect(arenaRunEligibility('rival', 'ranked')).toMatchObject({ baseStars: false, rating: false, spin: false });
    // D-07: быстрый матч звёзд не начисляет, но право на редкую награду и на
    // зачёт дневных целей сохраняет.
    expect(arenaRunEligibility('match', 'quick'))
      .toMatchObject({ baseStars: false, rating: false, spin: true, mastery: true, partnerActivity: true });
    expect(arenaRunEligibility('match', 'ranked')).toMatchObject({ baseStars: true, rating: true, spin: true });
  });

  it('uses weekly spotlight thresholds three and five for at most 30 stars', () => {
    expect(arenaUtcWeekKey(Date.UTC(2026, 7, 16))).toBe('2026-08-10');
    expect(arenaPartnerSpotlightAward(2, [])).toEqual({ thresholds: [], walletStars: 0 });
    expect(arenaPartnerSpotlightAward(3, [])).toEqual({ thresholds: [3], walletStars: 10 });
    expect(arenaPartnerSpotlightAward(5, [])).toEqual({ thresholds: [3, 5], walletStars: 30 });
    expect(arenaPartnerSpotlightAward(5, [3])).toEqual({ thresholds: [5], walletStars: 20 });
    expect(arenaPartnerSpotlightAward(7, [3, 5])).toEqual({ thresholds: [], walletStars: 0 });
  });

  it('has a fixed non-random cosmetic catalog with meaningful prices', () => {
    expect(ARENA_COSMETIC_CATALOG).toHaveLength(13);
    expect(new Set(ARENA_COSMETIC_CATALOG.map((item) => item.itemId)).size).toBe(13);
    expect(Math.min(...ARENA_COSMETIC_CATALOG.map((item) => item.price))).toBe(250);
    expect(arenaCatalogItem('entry_legend_crown')).toMatchObject({ slot: 'entry', price: 1800 });
    expect(ARENA_COSMETIC_CATALOG.some((item) => /spin|boost|loot/i.test(item.itemId))).toBe(false);
  });

  it('finishes best-of-three at 2 wins or after game three', () => {
    expect(arenaRivalSeriesAfterGame({ winsA: 1, winsB: 0, draws: 0, winnerSeat: 'a' }))
      .toMatchObject({ winsA: 2, complete: true, gamesPlayed: 2 });
    expect(arenaRivalSeriesAfterGame({ winsA: 1, winsB: 1, draws: 0 }))
      .toMatchObject({ draws: 1, complete: true, gamesPlayed: 3 });
  });
});
