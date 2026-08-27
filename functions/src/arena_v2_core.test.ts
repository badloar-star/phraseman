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
  arenaStarDeltaForOutcome,
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
  ARENA_V2_ANSWER_MS,
  ARENA_V2_QUICK_BOT_MAX_MS,
  ARENA_V2_QUICK_BOT_MIN_MS,
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
    expect(ARENA_V2_ANSWER_MS.translate_build).toBe(25_000);
    expect(ARENA_V2_ANSWER_MS.speed_match).toBe(30_000);
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

  // Регрессия: быстрый матч владелец сделал на восемь заданий, а 8 не делится
  // на пять типов нацело. Пока квота считалась как expectedTasks / модов, она
  // требовала 1.6 задания на тип и отклоняла КАЖДЫЙ быстрый конверт —
  // матч с ботом не создавался вовсе. Квота обязана идти от порядка слотов.
  it('accepts the eight-task quick envelope with its uneven mode quota', () => {
    const quick = selectArenaTasks(pool(), 'quick-envelope', 0, 'quick')!;
    expect(quick).toHaveLength(8);
    expect(validateArenaPrivateEnvelope({ matchId: 'm', tasks: quick }, 'quick'))
      .toMatchObject({ ok: true });
    // Полный порядок повторяет каждый тип дважды, восьмёрка обрывает его на
    // третьем повторе: три типа по два задания, два оставшихся — по одному.
    const counts = new Map<string, number>();
    for (const entry of quick) counts.set(entry.mode, (counts.get(entry.mode) ?? 0) + 1);
    expect([...counts.values()].sort()).toEqual([1, 1, 2, 2, 2]);
    // Десятка не должна пролезть под видом быстрого матча, и наоборот.
    const ranked = selectArenaTasks(pool(), 'quick-envelope', 0)!;
    expect(validateArenaPrivateEnvelope({ matchId: 'm', tasks: ranked }, 'quick'))
      .toMatchObject({ ok: false, reason: 'task_count_invalid' });
    expect(validateArenaPrivateEnvelope({ matchId: 'm', tasks: quick }))
      .toMatchObject({ ok: false, reason: 'task_count_invalid' });
  });

  // Ослабление квоты до «лишь бы восемь штук» открыло бы дверь конверту из
  // восьми одинаковых заданий. Проверка обязана сверять состав, а не только длину.
  it('still rejects a quick envelope whose mode mix is wrong', () => {
    const quick = selectArenaTasks(pool(), 'quick-mix', 0, 'quick')!;
    const skewed = [...quick.slice(0, 7), { ...quick[0], taskId: 'dup-slot-8' }];
    expect(skewed).toHaveLength(8);
    expect(validateArenaPrivateEnvelope({ matchId: 'm', tasks: skewed }, 'quick'))
      .toMatchObject({ ok: false, reason: 'mode_quota_invalid' });
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

  // Владелец (2026-08-23): звёздная лестница — дельта не зависит от соперника.
  it('awards exactly one star for a win and takes one for a loss', () => {
    expect(arenaStarDeltaForOutcome('win')).toBe(1);
    expect(arenaStarDeltaForOutcome('loss')).toBe(-1);
    expect(arenaStarDeltaForOutcome('draw')).toBe(0);
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
    expect(arenaRareSpin({ mode: 'quick', opponentKind: 'bot', outcome: 'win', rewardEligible: true,
      submittedAnswers: 8, dropsToday: 0, rollBps: 49, pityBefore: 0 }).awarded).toBe(true);
    expect(arenaRareSpin({ mode: 'quick', opponentKind: 'bot', outcome: 'win', rewardEligible: true,
      submittedAnswers: 8, dropsToday: 0, rollBps: 50, pityBefore: 0 }).awarded).toBe(false);
    // Минимум ответов и дневной кап держат ranked-победу так же, как раньше.
    expect(arenaRareSpin({ mode: 'ranked', opponentKind: 'human', outcome: 'win', rewardEligible: true,
      submittedAnswers: 7, dropsToday: 0, rollBps: 0, pityBefore: 79 })).toEqual({ awarded: false, pityAfter: 79 });
    expect(arenaRareSpin({ mode: 'ranked', opponentKind: 'human', outcome: 'win', rewardEligible: true,
      submittedAnswers: 10, dropsToday: 1, rollBps: 0, pityBefore: 12 })).toEqual({ awarded: false, pityAfter: 12 });
  });

  /**
   * Владелец (2026-08-23): спин за ranked-победу над реальным игроком —
   * ГАРАНТИЯ, а не шанс. Раньше `ranked_human` шёл через тот же rollBps (100
   * bps = 1%) с догоняющим pity на 80-м матче: игрок мог выиграть сотню
   * рейтинговых матчей и не увидеть ни одного спина.
   */
  it('always awards the ranked spin for a human win, regardless of roll', () => {
    // Худший возможный ролл и пустой pity — награда всё равно обязана выпасть.
    expect(arenaRareSpin({ mode: 'ranked', opponentKind: 'human', outcome: 'win', rewardEligible: true,
      submittedAnswers: 8, dropsToday: 0, rollBps: 9_999, pityBefore: 0 })).toEqual({ awarded: true, pityAfter: 0 });
    // Гарантия не зависит и от HMAC-ключа: rollBps = -1 (ключ не настроен).
    expect(arenaRareSpin({ mode: 'ranked', opponentKind: 'human', outcome: 'win', rewardEligible: true,
      submittedAnswers: 10, dropsToday: 0, rollBps: -1, pityBefore: 0 }).awarded).toBe(true);
  });

  /**
   * Гарантия добавлена ПОВЕРХ прежней шкалы, а не вместо неё. Ranked без
   * победы (поражение, ничья, матч против бота) сохраняет тот же шанс
   * 100 bps и догоняющий pity, что был до правки 2026-08-23: у владельца не
   * было задачи отобрать награду у проигравших, только гарантировать её
   * победителю.
   */
  it('keeps the old ranked odds for every outcome that is not a human win', () => {
    // Ролл внутри порога — награда по шансу, как раньше.
    expect(arenaRareSpin({ mode: 'ranked', opponentKind: 'human', outcome: 'loss', rewardEligible: true,
      submittedAnswers: 10, dropsToday: 0, rollBps: 99, pityBefore: 0 }).awarded).toBe(true);
    // Ролл вне порога — награды нет, но pity растёт и однажды догонит.
    expect(arenaRareSpin({ mode: 'ranked', opponentKind: 'human', outcome: 'draw', rewardEligible: true,
      submittedAnswers: 10, dropsToday: 0, rollBps: 100, pityBefore: 5 })).toEqual({ awarded: false, pityAfter: 6 });
    // Догоняющая гарантия на 80-м матче осталась ровно там же.
    expect(arenaRareSpin({ mode: 'ranked', opponentKind: 'human', outcome: 'loss', rewardEligible: true,
      submittedAnswers: 10, dropsToday: 0, rollBps: 9_999, pityBefore: 79 })).toEqual({ awarded: true, pityAfter: 0 });
    // Победа над ботом в рейтинге гарантии не даёт — только шанс.
    expect(arenaRareSpin({ mode: 'ranked', opponentKind: 'bot', outcome: 'win', rewardEligible: true,
      submittedAnswers: 10, dropsToday: 0, rollBps: 9_999, pityBefore: 0 }).awarded).toBe(false);
  });

  it('runs the quick match for eight balanced tasks and keeps ranked at ten', () => {
    expect(arenaTaskCount('quick')).toBe(8);
    expect(arenaTaskCount('ranked')).toBe(10);
    expect(arenaTaskCount('friend')).toBe(10);
    expect(arenaTaskCount()).toBe(10);
    const quick = selectArenaTasks(pool(), 'quick-seed', 19, 'quick')!;
    expect(quick).toHaveLength(8);
    expect(new Set(quick.map((entry) => entry.mode)).size).toBe(5);
  });

  // Владелец 2026-08-27: соперник обязан находиться ВСЕГДА в первые 20 секунд,
  // момент внутри окна случайный. Прежнее окно 3–45 секунд давало ожидание
  // почти минуту. Следующий бот после сорванного назначения имеет отдельное
  // клиентское окно и этой серверной формулой не управляется.
  it('assigns the first bot inside three to twenty seconds, biased to the start', () => {
    expect(ARENA_V2_QUICK_BOT_MIN_MS).toBe(3_000);
    expect(ARENA_V2_QUICK_BOT_MAX_MS).toBe(20_000);
    expect(arenaQuickBotDelayMs(0)).toBe(3_000);
    expect(arenaQuickBotDelayMs(1)).toBe(20_000);
    // Потолок обещания: даже самый неудачный жребий укладывается в 20 секунд.
    for (const unit of [0, 0.25, 0.5, 0.75, 0.99, 1]) {
      expect(arenaQuickBotDelayMs(unit)).toBeLessThanOrEqual(20_000);
    }
    const median = arenaQuickBotDelayMs(0.5);
    expect(median).toBeGreaterThan(6_000);
    expect(median).toBeLessThan(12_000);
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
