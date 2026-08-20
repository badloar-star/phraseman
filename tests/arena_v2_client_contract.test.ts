import { ARENA_DUEL_BLUEPRINT, isValidArenaBlueprint, seededArenaBlueprint } from '../modules/arena/duel_blueprint';
import { ARENA_TASK_MODES, type ArenaMatch, type ArenaPublicTask } from '../modules/arena/contract';
import { adaptArenaTask, encodeArenaSelection } from '../modules/arena/task_adapter';
import { ARENA_RANKS, arenaRankForRating, isRankedOpponentEligible } from '../modules/arena/ranks';
import { arenaClockPhase } from '../modules/arena/schedule';
import { getOrCreateArenaSubmissionId, pruneArenaSubmissionIds } from '../modules/arena/idempotency';
import { arenaRankedElapsedMs, arenaRankedWaitPresentation } from '../modules/arena/matchmaking_state';
import { ARENA_RANKED_COPY_KEYS, arenaText } from '../modules/arena/copy';
import type { Lang } from '../constants/i18n';
import { arenaParseMatchPlan } from '../modules/arena/duel_plan';

function task(mode: ArenaPublicTask['mode'], payload: Record<string, unknown>): ArenaPublicTask {
  return { taskId: `task-${mode}`, mode, kind: mode === 'speed_match' ? 'match' : 'choice', isVoice: false, difficulty: 2, payload };
}

describe('Arena V2 client contract', () => {
  const planWithTicks = (opponentTicks: readonly unknown[]) => arenaParseMatchPlan({
    schemaVersion: 'arena-match-plan.v2',
    rulesVersion: 'arena-stars.v3',
    matchId: 'm-wire',
    mode: 'quick',
    viewerSeat: 'a',
    taskCount: 1,
    countdownMs: 3_200,
    readingMs: 1_500,
    revealMs: 1_200,
    rules: {
      starsCorrect: 2, starsCorrectFirst: 3, starsPerPair: 1, comboThreshold: 3,
      comboBonus: 1, timeQuantumMs: 100, starPolicy: 'none', awardsRankPoints: false,
      matchStarCeiling: 4,
    },
    tasks: [{
      taskId: 'pairs-0', taskIndex: 0, mode: 'speed_match', kind: 'match', difficulty: 2,
      answerMs: 18_000, payload: { prompt: 'Match', items: [], rightOptions: [] },
      answerFingerprints: ['fp'],
    }],
    opponent: { seat: 'b', name: 'Rival', rank: 0 },
    opponentTicks,
    liveChannelPath: 'arenaLive/m-wire',
    planHash: 'hash',
    issuedAtMs: 1,
  });

  test('keeps only valid optional firstAttemptPairs without rejecting the plan', () => {
    expect(planWithTicks([{ taskIndex: 0, correct: true, raceElapsedMs: 900, firstAttemptPairs: 4 }])
      ?.opponentTicks[0].firstAttemptPairs).toBe(4);
    for (const invalid of [5, -1, 1.5]) {
      const parsed = planWithTicks([{ taskIndex: 0, correct: true, raceElapsedMs: 900, firstAttemptPairs: invalid }]);
      expect(parsed).not.toBeNull();
      expect(parsed?.opponentTicks[0]).not.toHaveProperty('firstAttemptPairs');
    }
  });

  test('keeps the canonical five modes followed by the same five modes', () => {
    expect(ARENA_DUEL_BLUEPRINT).toEqual([...ARENA_TASK_MODES, ...ARENA_TASK_MODES]);
    expect(seededArenaBlueprint(1)).toEqual(ARENA_DUEL_BLUEPRINT);
    expect(seededArenaBlueprint(999)).toEqual(ARENA_DUEL_BLUEPRINT);
    expect(isValidArenaBlueprint(ARENA_DUEL_BLUEPRINT)).toBe(true);
  });

  test.each([
    ['guess_phrase', { phrase: 'Pick it', options: ['a', 'b', 'c'] }],
    ['fill_gap', { phrase: 'I ___ home', options: ['go', 'went', 'gone'] }],
    ['find_oddity', { phrase: 'Find the odd one', options: ['blue', 'red', 'slowly'] }],
  ] as const)('adapts %s choice payload without an answer key', (mode, payload) => {
    expect(adaptArenaTask(task(mode, payload))).toEqual({ type: 'choices', mode, prompt: payload.phrase, options: payload.options });
  });

  test('adapts the exact translate_build public wordBank fixture', () => {
    const view = adaptArenaTask(task('translate_build', {
      phrase: 'Я дома',
      wordBank: ['I', 'am', 'home'],
      correctTokenCount: 3,
    }));
    expect(view).toEqual({ type: 'builder', mode: 'translate_build', prompt: 'Я дома', tokens: ['I', 'am', 'home'] });
    expect(encodeArenaSelection(view, [0, 1, 2])).toEqual({ tokens: ['I', 'am', 'home'] });
  });

  test('adapts the exact speed_match items/rightOptions fixture', () => {
    const view = adaptArenaTask(task('speed_match', {
      prompt: 'Match',
      items: [{ prompt: 'go', options: ['идти', 'есть'] }, { prompt: 'eat', options: ['спать', 'есть'] }],
      rightOptions: ['идти', 'есть'],
    }));
    expect(view).toEqual({ type: 'matching', mode: 'speed_match', prompt: 'Match', left: ['go', 'eat'], right: ['идти', 'есть'] });
  });

  test('rejects every public answer leak', () => {
    expect(() => adaptArenaTask(task('guess_phrase', { phrase: 'x', options: ['a', 'b'], answerFingerprints: ['x'] }))).toThrow('arena_public_task_contains_answer_metadata');
    expect(() => adaptArenaTask(task('guess_phrase', { phrase: 'x', options: ['a', 'b'], correctAnswer: 'a' }))).toThrow('arena_public_task_contains_answer_metadata');
  });

  test('builds 8 tiers by 3 divisions and matches by adjacent zero-based index', () => {
    expect(ARENA_RANKS).toHaveLength(24);
    expect(ARENA_RANKS[0]).toMatchObject({ index: 0, tierIndex: 0, division: 1 });
    expect(ARENA_RANKS[3]).toMatchObject({ index: 3, tierIndex: 1, division: 1 });
    expect(ARENA_RANKS[23]).toMatchObject({ index: 23, tierIndex: 7, division: 3 });
    expect(arenaRankForRating(350).index).toBe(3);
    expect(isRankedOpponentEligible(7, 8)).toBe(true);
    expect(isRankedOpponentEligible(7, 9)).toBe(false);
  });

  test('derives countdown and task phase only from the server absolute deadline', () => {
    const match = {
      matchId: 'm1', mode: 'ranked', opponentKind: 'human', players: [], acceptedBy: [], state: 'countdown', version: 1,
      currentTaskIndex: 0, submittedBy: [], scores: {}, stateStartedAtMs: 1_000,
      stateDeadlineAtMs: 4_000, terminal: false,
    } satisfies ArenaMatch;
    expect(arenaClockPhase(match, 2_500)).toEqual({ kind: 'countdown', startsAtMs: 4_000, remainingMs: 1_500 });
    expect(arenaClockPhase({ ...match, state: 'task_active', stateDeadlineAtMs: 9_000 }, 6_500)).toEqual({ kind: 'question', taskIndex: 0, remainingMs: 2_500 });
  });

  test('reuses a submission id for retry and prunes old task scopes', () => {
    const cache = new Map<string, string>();
    let nonce = 0;
    const create = () => `id-${++nonce}`;
    expect(getOrCreateArenaSubmissionId(cache, 'm1', 2, 'answer', create)).toBe('id-1');
    expect(getOrCreateArenaSubmissionId(cache, 'm1', 2, 'answer', create)).toBe('id-1');
    getOrCreateArenaSubmissionId(cache, 'm1', 1, 'answer', create);
    pruneArenaSubmissionIds(cache, 'm1', 2);
    expect([...cache.keys()]).toEqual(['m1:2:answer']);
  });

  // Пороги 30/90 отменены владельцем 2026-08-16: на полуминуте предложение
  // уйти в быстрый матч читалось как «здесь никого нет» и уводило людей из
  // рейтинга, пока очередь только набирается. Стало 60/150.
  test('shows the ranked quick offer at 60s and calm choice state at 150s', () => {
    expect(arenaRankedWaitPresentation(30_000)).toBe('searching');
    expect(arenaRankedWaitPresentation(59_999)).toBe('searching');
    expect(arenaRankedWaitPresentation(60_000)).toBe('quick_offer');
    expect(arenaRankedWaitPresentation(149_999)).toBe('quick_offer');
    expect(arenaRankedWaitPresentation(150_000)).toBe('calm');
    expect(arenaRankedElapsedMs(100_000, 80_000, 10_000, 95_000)).toBe(5_000);
  });

  test('has ranked wait copy in all eight interface locales', () => {
    const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const satisfies readonly Lang[];
    for (const locale of locales) {
      for (const key of ARENA_RANKED_COPY_KEYS) expect(arenaText(locale, key).trim()).not.toBe('');
    }
  });
});
