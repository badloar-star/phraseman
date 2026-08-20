import type { TournamentTask } from './tournament_core';
import {
  ARENA_V2_ACCEPT_MS,
  ARENA_V2_COUNTDOWN_MS,
  ARENA_V2_MODE_ORDER,
  ARENA_V2_REVEAL_MS,
  adaptTournamentTaskForArena,
  arenaAcceptanceOpen,
  arenaDailyMultiplier,
  arenaRareSpin,
  arenaRanksCompatible,
  arenaObservedElapsedMs,
  arenaRpDelta,
  arenaSeasonStars,
  arenaSeasonWindow,
  arenaTaskStars,
  buildArenaBotBlueprint,
  resolveArenaOutcome,
  scoreArenaSpeedProgress,
  selectArenaTasks,
  toArenaPublicTask,
  validateArenaPrivateEnvelope,
  arenaTaskCount,
  arenaQuickBotDelayMs,
  ARENA_DAILY_REWARD_MATCHES,
} from './arena_v2_core';
import { ARENA_STAR_POLICY } from './arena_stars_v3';

function explanation(options: readonly string[], correctIndex: number) {
  return {
    ruleNote: 'A complete reviewed rule note.',
    example: 'A complete example. — Полный пример.',
    wrongOptionReasons: options.map((_, index) => index === correctIndex ? '' : 'A distinct reviewed trap reason.'),
  };
}

function task(taskId: string, mode: string, difficulty: number): TournamentTask {
  if (mode === 'translate_build') {
    return {
      taskId, mode, difficulty, isVoice: false, verified: true, tags: [],
      payload: {
        phrase: 'Я готов', wordBank: ['late', 'I', 'am', 'ready'], correctTokenCount: 3,
        correctTokens: ['I', 'am', 'ready'], correctAnswer: 'I am ready',
      },
      explanation: { ruleNote: 'Word order is reviewed.', example: 'I am ready. — Я готов.', wrongOptionReasons: [] },
    };
  }
  if (mode === 'speed_match') {
    const rightOptions = ['one', 'two', 'three', 'four', 'five', 'six'];
    return {
      taskId, mode, difficulty, isVoice: false, verified: true, tags: [],
      payload: {
        prompt: 'Match words', rightOptions,
        items: rightOptions.map((_, index) => ({
          prompt: `word${index}`, options: rightOptions.slice(), correctIndex: index,
          explanation: explanation(rightOptions, index),
        })),
      },
      explanation: { ruleNote: 'Pairs are reviewed.', example: 'one — один', wrongOptionReasons: [] },
    };
  }
  const options = ['yes', 'no', 'maybe', 'later'];
  return {
    taskId, mode, difficulty, isVoice: false, verified: true, tags: [],
    payload: { phrase: `phrase ${taskId}`, options, correctIndex: 0 },
    explanation: explanation(options, 0),
  };
}

function pool(): TournamentTask[] {
  return ARENA_V2_MODE_ORDER.slice(0, 5).flatMap((mode) => [1, 2, 3].flatMap((difficulty) => (
    mode === 'find_oddity' && difficulty === 3 ? [] : [0, 1, 2].map((index) => (
      task(`${mode}_${difficulty}_${index}`, mode, difficulty)
    ))
  )));
}

describe('Arena V2 pure product contract', () => {
  it('locks owner-approved timing and the ten-slot difficulty plan', () => {
    expect(ARENA_V2_ACCEPT_MS).toBe(12_000);
    expect(ARENA_V2_COUNTDOWN_MS).toBe(3_200);
    expect(ARENA_V2_REVEAL_MS).toBe(1_200);
    const selected = selectArenaTasks(pool(), 'match-seed', 19)!;
    expect(selected).toHaveLength(10);
    expect(selected.map((entry) => entry.mode)).toEqual(ARENA_V2_MODE_ORDER);
    expect(selected.map((entry) => entry.difficulty)).toEqual([2, 2, 2, 3, 3, 3, 3, 2, 3, 3]);
    expect(new Set(selected.map((entry) => entry.taskId)).size).toBe(10);
  });

  it('fails acceptance closed at the exact deadline and clamps observed speed to answer time', () => {
    expect(arenaAcceptanceOpen(999, 1_000)).toBe(true);
    expect(arenaAcceptanceOpen(1_000, 1_000)).toBe(false);
    expect(arenaAcceptanceOpen(1_001, 1_000)).toBe(false);
    expect(arenaObservedElapsedMs(900, 1_000, 'guess_phrase')).toBe(0);
    expect(arenaObservedElapsedMs(50_000, 1_000, 'guess_phrase')).toBe(8_000);
  });

  it('projects four deterministic, seed-diverse speed pairs and remaps answer indexes', () => {
    const source = task('speed_source', 'speed_match', 2);
    const first = adaptTournamentTaskForArena(source, 'seed-a')!;
    const replay = adaptTournamentTaskForArena(source, 'seed-a')!;
    expect(first).toEqual(replay);
    expect((first.payload.items as unknown[])).toHaveLength(4);
    expect((first.payload.rightOptions as unknown[])).toHaveLength(4);
    const projections = new Set(Array.from({ length: 32 }, (_, index) => {
      const projected = adaptTournamentTaskForArena(source, `seed-${index}`)!;
      const items = projected.payload.items as any[];
      const rightOptions = projected.payload.rightOptions as string[];
      items.forEach((item, rowIndex) => {
        const sourceIndex = Number(String(item.prompt).replace('word', ''));
        expect(item.correctIndex).not.toBe(rowIndex);
        expect(rightOptions[item.correctIndex]).toBe((source.payload.rightOptions as string[])[sourceIndex]);
        expect(item.options).toEqual(rightOptions);
      });
      return JSON.stringify(items.map((item) => item.prompt));
    }));
    expect(projections.size).toBeGreaterThan(1);
  });

  it('never publishes fingerprints, explanations, or answer keys', () => {
    const safe = toArenaPublicTask(task('choice_public', 'guess_phrase', 1))! as any;
    expect(safe.answerFingerprints).toBeUndefined();
    expect(safe.explanation).toBeUndefined();
    expect(safe.payload.correctIndex).toBeUndefined();
  });

  it('enforces the embedded private envelope quota and 384 KiB budget', () => {
    const tasks = selectArenaTasks(pool(), 'budget', 0)!;
    expect(validateArenaPrivateEnvelope({ matchId: 'm', tasks })).toMatchObject({ ok: true });
    expect(validateArenaPrivateEnvelope({ matchId: 'm', tasks: tasks.slice(0, 9) }))
      .toMatchObject({ ok: false, reason: 'task_count_invalid' });
  });

  it('scores speed attempts with unique -5 penalties and ignores invalid duplicates', () => {
    expect(scoreArenaSpeedProgress({
      matchedIndexes: [0, 1, 2, 3, 3, 8], triedIndexes: [[], [], [], []], wrongAttempts: 1,
    })).toBe(95);
    expect(scoreArenaSpeedProgress({
      matchedIndexes: [0], triedIndexes: [[], [], [], []], wrongAttempts: 8,
    })).toBe(0);
  });

  it('uses points, solved fields, then a strict two-second elapsed threshold', () => {
    expect(resolveArenaOutcome(
      { score: 700, fullySolved: 7, elapsedMs: 10_000 },
      { score: 700, fullySolved: 6, elapsedMs: 1_000 },
    ).left).toBe('win');
    expect(resolveArenaOutcome(
      { score: 700, fullySolved: 7, elapsedMs: 10_000 },
      { score: 700, fullySolved: 7, elapsedMs: 11_999 },
    ).left).toBe('draw');
    expect(resolveArenaOutcome(
      { score: 700, fullySolved: 7, elapsedMs: 10_000 },
      { score: 700, fullySolved: 7, elapsedMs: 12_000 },
    ).left).toBe('win');
  });

  it('uses only opponent division difference for ranked RP', () => {
    expect(arenaRpDelta(10, 9, 'win')).toBe(16);
    expect(arenaRpDelta(10, 10, 'loss')).toBe(-20);
    expect(arenaRpDelta(10, 11, 'draw')).toBe(4);
    expect(() => arenaRpDelta(10, 12, 'win')).toThrow('arena_ranked_division_difference_invalid');
  });

  it('never widens Ranked beyond one division while Quick allows three', () => {
    expect(arenaRanksCompatible('ranked', 10, 11)).toBe(true);
    expect(arenaRanksCompatible('ranked', 10, 12)).toBe(false);
    expect(arenaRanksCompatible('quick', 10, 13)).toBe(true);
    expect(arenaRanksCompatible('quick', 10, 14)).toBe(false);
  });

  it('uses a deterministic 63-day season so the 3,600-star track is reachable', () => {
    const first = arenaSeasonWindow(Date.UTC(2026, 7, 1));
    expect(first.seasonId).toBe('arena-2026-08-01');
    expect(first.endsAtMs - first.startsAtMs).toBe(63 * 24 * 60 * 60 * 1_000);
    expect(arenaSeasonWindow(first.endsAtMs - 1).seasonId).toBe(first.seasonId);
    expect(arenaSeasonWindow(first.endsAtMs).seasonId).not.toBe(first.seasonId);
  });

  it('keeps stars independent of outcome and applies 4 full, 2 half, then zero with cap 160', () => {
    expect(arenaTaskStars({ task: { mode: 'guess_phrase', difficulty: 3 }, correct: true })).toBe(5);
    expect(arenaTaskStars({
      task: { mode: 'speed_match', difficulty: 2 }, correct: true,
      speedProgress: { matchedIndexes: [0, 1, 2, 3], triedIndexes: [[], [], [], []], wrongAttempts: 1 },
    })).toBe(4);
    expect([0, 1, 2, 3, 4, 5, 6].map(arenaDailyMultiplier)).toEqual([1, 1, 1, 1, 0.5, 0.5, 0]);
    expect(arenaSeasonStars({ mode: 'ranked', rawStars: 30, eligibleMatchIndex: 4, dailyStarsBefore: 150 })).toBe(10);
    expect(arenaSeasonStars({ mode: 'friend', rawStars: 30, eligibleMatchIndex: 0, dailyStarsBefore: 0 })).toBe(0);
  });

  it('banks stars only for modes the star engine calls banked (D-07: quick pays experience, not stars)', () => {
    // Гейт один и тот же на клиенте и на сервере. Если здесь появится второй
    // список режимов, план матча пообещает игроку ноль, а сервер запишет
    // звёзды — ровно то расхождение, из-за которого этот тест и написан.
    expect(arenaSeasonStars({ mode: 'quick', rawStars: 19, eligibleMatchIndex: 0, dailyStarsBefore: 0 })).toBe(0);
    expect(arenaSeasonStars({ mode: 'series', rawStars: 19, eligibleMatchIndex: 0, dailyStarsBefore: 0 })).toBe(0);
    expect(arenaSeasonStars({ mode: 'ranked', rawStars: 40, eligibleMatchIndex: 0, dailyStarsBefore: 0 })).toBe(40);
    for (const mode of ['quick', 'ranked', 'friend', 'series'] as const) {
      const banked = ARENA_STAR_POLICY[mode] === 'banked';
      expect(arenaSeasonStars({ mode, rawStars: 10, eligibleMatchIndex: 0, dailyStarsBefore: 0 }) > 0).toBe(banked);
    }
    // Право на редкую награду быстрый матч сохраняет: окно в шесть матчей за
    // сутки считается отдельным счётчиком, а не начислением звёзд.
    expect(ARENA_DAILY_REWARD_MATCHES).toBe(6);
  });

  it('enforces spin eligibility, odds boundaries, day cap, and pity 80', () => {
    // Владелец (2026-08-12): шанс против бота выровнен с человеческим (50 bps),
    // иначе бота вычисляли бы по статистике дропов.
    expect(arenaRareSpin({ mode: 'quick', opponentKind: 'bot', rewardEligible: true,
      submittedAnswers: 8, dropsToday: 0, rollBps: 49, pityBefore: 0 }).awarded).toBe(true);
    expect(arenaRareSpin({ mode: 'quick', opponentKind: 'bot', rewardEligible: true,
      submittedAnswers: 8, dropsToday: 0, rollBps: 50, pityBefore: 0 }).awarded).toBe(false);
    expect(arenaRareSpin({ mode: 'ranked', opponentKind: 'human', rewardEligible: true,
      submittedAnswers: 7, dropsToday: 0, rollBps: 0, pityBefore: 79 })).toEqual({ awarded: false, pityAfter: 79 });
    expect(arenaRareSpin({ mode: 'ranked', opponentKind: 'human', rewardEligible: true,
      submittedAnswers: 8, dropsToday: 0, rollBps: 9_999, pityBefore: 79 })).toEqual({ awarded: true, pityAfter: 0 });
    expect(arenaRareSpin({ mode: 'ranked', opponentKind: 'human', rewardEligible: true,
      submittedAnswers: 10, dropsToday: 1, rollBps: 0, pityBefore: 12 })).toEqual({ awarded: false, pityAfter: 12 });
  });

  it('shortens the quick match to five balanced tasks and keeps ranked at ten', () => {
    expect(arenaTaskCount('quick')).toBe(5);
    expect(arenaTaskCount('ranked')).toBe(10);
    expect(arenaTaskCount('friend')).toBe(10);
    expect(arenaTaskCount()).toBe(10);
    const quick = selectArenaTasks(pool(), 'quick-seed', 19, 'quick')!;
    expect(quick).toHaveLength(5);
    expect(new Set(quick.map((entry) => entry.mode)).size).toBe(5);
  });

  // Владелец 2026-08-16 сузил окно с 8–55 до 8–15 секунд: на пустой Арене
  // полминуты ожидания читались как зависший экран, а живой соперник за это
  // время всё равно почти не появлялся.
  it('assigns the bot entry moment inside eight to fifteen seconds, biased to the start', () => {
    expect(arenaQuickBotDelayMs(0)).toBe(8_000);
    expect(arenaQuickBotDelayMs(1)).toBe(15_000);
    const median = arenaQuickBotDelayMs(0.5);
    expect(median).toBeGreaterThan(9_000);
    expect(median).toBeLessThan(13_000);
    expect(arenaQuickBotDelayMs(Number.NaN)).toBe(median);
  });

  it('builds a deterministic immutable bot plan from division and seed only', () => {
    const tasks = selectArenaTasks(pool(), 'bot-tasks', 12)!;
    const first = buildArenaBotBlueprint('bot-seed', 12, tasks);
    expect(first).toEqual(buildArenaBotBlueprint('bot-seed', 12, tasks));
    expect(first).not.toEqual(buildArenaBotBlueprint('different-seed', 12, tasks));
    expect(first).toHaveLength(10);
    expect(first.every((entry) => entry.elapsedMs >= 1_500)).toBe(true);
  });
});
