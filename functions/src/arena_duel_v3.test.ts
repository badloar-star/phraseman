/**
 * Дуэль v3: сервер отдаёт план, принимает отчёт, пересчитывает результат.
 *
 * Проверяется ровно то, ради чего пересчёт вообще существует: заявленному
 * клиентом результату здесь не верят. Клиент считает и показывает — сервер
 * подтверждает по запечатанному заданию.
 */
import {
  ARENA_PLAN_SCHEMA_VERSION,
  ARENA_REPORT_SCHEMA_VERSION,
  ARENA_DUEL_OPPONENT_WAIT_MS,
  arenaAssertReportShape,
  arenaDeclaredVsActualDelta,
  arenaDecisiveTaskIndex,
  arenaMatchBudgetMs,
  arenaMatchPlanRules,
  arenaNormalizeReport,
  arenaPlanHash,
  arenaPlanTask,
  arenaRecountFirstAttemptPairs,
  arenaScoreReport,
  arenaDuelReconcile,
  arenaDuelSettleProbeAtMs,
  arenaSettleDeadlineMs,
  arenaShouldSettle,
  type ArenaSubmittedOutcome,
} from './arena_duel_v3';
import { ARENA_ANSWER_MS, ARENA_SPEED_MATCH_PAIRS } from './arena_stars_v3';
import { validateTournamentTask, type TournamentTask } from './tournament_core';

const MATCH_ID = 'arena_match_smoke_1';

function choiceTask(taskId: string, mode: string, correctIndex: number): TournamentTask {
  return {
    taskId,
    mode,
    isVoice: false,
    difficulty: 2,
    payload: {
      phrase: 'give up',
      options: ['сдаться', 'подняться', 'раздать', 'выдать'],
      correctIndex,
    },
    explanation: {
      ruleNote: 'to stop trying',
      example: 'Do not give up. — Не сдавайся.',
      wrongOptionReasons: ['', 'подъём — это give in? нет', 'раздача — give out', 'выдача — give away'],
    },
    tags: ['phrasal'],
    verified: true,
  };
}

function translateTask(taskId: string): TournamentTask {
  return {
    taskId,
    mode: 'translate_build',
    isVoice: false,
    difficulty: 2,
    payload: {
      phrase: 'Я не сдамся',
      wordBank: ['i', 'will', 'not', 'give', 'up', 'down', 'never'],
      correctTokens: ['i', 'will', 'not', 'give', 'up'],
      correctTokenCount: 5,
    },
    tags: [],
    verified: true,
  };
}

/** Уже адаптированное под арену поле пар: 4 пары, correctIndex === pairIndex. */
function pairsTask(taskId: string): TournamentTask {
  const rightOptions = ['сдаться', 'выяснить', 'отложить', 'встретить'];
  return {
    taskId,
    mode: 'speed_match',
    isVoice: false,
    difficulty: 2,
    payload: {
      prompt: 'Соедини пары',
      rightOptions: rightOptions.slice(),
      items: ['give up', 'find out', 'put off', 'run into'].map((prompt, correctIndex) => ({
        prompt,
        options: rightOptions.slice(),
        correctIndex,
      })),
    },
    tags: [],
    verified: true,
  };
}

const TASKS: TournamentTask[] = [
  choiceTask('t0', 'guess_phrase', 0),
  choiceTask('t1', 'fill_gap', 3),
  translateTask('t2'),
  choiceTask('t3', 'find_oddity', 1),
  pairsTask('t4'),
];

describe('фикстуры проходят контракт заданий', () => {
  it('каждое задание валидно', () => {
    for (const task of TASKS) {
      expect(validateTournamentTask(task)).toEqual({ ok: true, kind: expect.any(String) });
    }
  });
});

describe('arenaPlanHash', () => {
  it('устойчив к повтору и зависит от матча', () => {
    expect(arenaPlanHash(MATCH_ID, TASKS)).toBe(arenaPlanHash(MATCH_ID, TASKS));
    expect(arenaPlanHash('other', TASKS)).not.toBe(arenaPlanHash(MATCH_ID, TASKS));
  });

  it('ловит перестановку заданий', () => {
    const swapped = [TASKS[1], TASKS[0], ...TASKS.slice(2)];
    expect(arenaPlanHash(MATCH_ID, swapped)).not.toBe(arenaPlanHash(MATCH_ID, TASKS));
  });

  it('ловит подмену одного задания', () => {
    const tampered = [...TASKS];
    tampered[3] = choiceTask('t3_other', 'find_oddity', 1);
    expect(arenaPlanHash(MATCH_ID, tampered)).not.toBe(arenaPlanHash(MATCH_ID, TASKS));
  });
});

describe('arenaPlanTask', () => {
  it('отдаёт отпечатки соседним полем, а не внутри payload', () => {
    const planned = arenaPlanTask(MATCH_ID, TASKS[0], 0)!;
    expect(planned).not.toBeNull();
    expect(planned.answerFingerprints.length).toBe(1);
    expect(JSON.stringify(planned.payload)).not.toContain(planned.answerFingerprints[0]);
  });

  it('не вывозит правильный ответ в открытом виде', () => {
    const planned = arenaPlanTask(MATCH_ID, TASKS[2], 2)!;
    expect(Object.keys(planned.payload).sort()).toEqual(['correctTokenCount', 'phrase', 'wordBank']);
    expect(planned.payload).not.toHaveProperty('correctTokens');
  });

  it('вырезает разбор — во время матча он не показывается', () => {
    const planned = arenaPlanTask(MATCH_ID, TASKS[0], 0)!;
    expect(planned.payload).not.toHaveProperty('explanation');
    expect(planned.payload).not.toHaveProperty('wrongOptionReasons');
    expect(JSON.stringify(planned)).not.toContain('give in');
  });

  it('у поля пар отпечаток на каждую пару', () => {
    const planned = arenaPlanTask(MATCH_ID, TASKS[4], 4)!;
    expect(planned.answerFingerprints.length).toBe(ARENA_SPEED_MATCH_PAIRS);
    expect(new Set(planned.answerFingerprints).size).toBe(ARENA_SPEED_MATCH_PAIRS);
    expect(planned.payload.items).toEqual(
      (TASKS[4].payload.items as { prompt: string }[]).map((item) => ({
        prompt: item.prompt,
        options: expect.any(Array),
      })),
    );
    expect(JSON.stringify(planned.payload)).not.toContain('correctIndex');
  });

  it('проставляет окно ответа по режиму', () => {
    expect(arenaPlanTask(MATCH_ID, TASKS[2], 2)!.answerMs).toBe(ARENA_ANSWER_MS.translate_build);
    expect(arenaPlanTask(MATCH_ID, TASKS[4], 4)!.answerMs).toBe(ARENA_ANSWER_MS.speed_match);
  });

  it('отказывает заданию не аренового режима вместо NaN в окне ответа', () => {
    const legacy = choiceTask('legacy', 'quiz', 0);
    expect(arenaPlanTask(MATCH_ID, legacy, 0)).toBeNull();
  });

  it('отказывает непроверенному заданию', () => {
    expect(arenaPlanTask(MATCH_ID, { ...TASKS[0], verified: false }, 0)).toBeNull();
  });
});

describe('arenaRecountFirstAttemptPairs', () => {
  const task = TASKS[4];

  it('4 из 4 с первой попытки', () => {
    const attempts = { '0': [0], '1': [1], '2': [2], '3': [3] };
    expect(arenaRecountFirstAttemptPairs(MATCH_ID, task, attempts))
      .toEqual({ firstAttemptPairs: 4, resolvedPairs: 4 });
  });

  it('пара, угаданная со второй попытки, решается, но не платит', () => {
    const attempts = { '0': [2, 0], '1': [1], '2': [2], '3': [3] };
    expect(arenaRecountFirstAttemptPairs(MATCH_ID, task, attempts))
      .toEqual({ firstAttemptPairs: 3, resolvedPairs: 4 });
  });

  it('нерешённая пара не считается вовсе', () => {
    const attempts = { '0': [0], '1': [0, 2], '2': [2], '3': [3] };
    expect(arenaRecountFirstAttemptPairs(MATCH_ID, task, attempts))
      .toEqual({ firstAttemptPairs: 3, resolvedPairs: 3 });
  });

  it('перебор всех вариантов не превращается в звёзды с первой попытки', () => {
    const brute = { '0': [0, 1, 2, 3], '1': [0, 1, 2, 3], '2': [0, 1, 2, 3], '3': [0, 1, 2, 3] };
    const result = arenaRecountFirstAttemptPairs(MATCH_ID, task, brute);
    expect(result.resolvedPairs).toBe(4);
    expect(result.firstAttemptPairs).toBe(1); // только пара 0, где верный индекс стоит первым
  });

  it('журнал длиннее потолка обрезается', () => {
    const flood = { '0': Array.from({ length: 400 }, () => 1).concat([0]) };
    expect(arenaRecountFirstAttemptPairs(MATCH_ID, task, flood))
      .toEqual({ firstAttemptPairs: 0, resolvedPairs: 0 });
  });

  it('пустой журнал даёт нули, а не бросает', () => {
    expect(arenaRecountFirstAttemptPairs(MATCH_ID, task, undefined))
      .toEqual({ firstAttemptPairs: 0, resolvedPairs: 0 });
    expect(arenaRecountFirstAttemptPairs(MATCH_ID, task, {}))
      .toEqual({ firstAttemptPairs: 0, resolvedPairs: 0 });
  });

  it('мусор в журнале не роняет пересчёт', () => {
    const junk = { '0': ['0' as unknown as number], '1': [null as unknown as number], '9': [1] };
    const result = arenaRecountFirstAttemptPairs(MATCH_ID, task, junk);
    expect(result.resolvedPairs).toBe(1); // '0' → Number('0') === 0, это верно
    expect(result.firstAttemptPairs).toBe(1);
  });
});

describe('arenaNormalizeReport — правда берётся из задания, а не из отчёта', () => {
  it('заявленный correct на неверном ответе становится wrong', () => {
    const submitted: ArenaSubmittedOutcome[] = [
      { taskIndex: 0, status: 'correct', raceElapsedMs: 900, answer: { selectedIndex: 2 } },
    ];
    const outcomes = arenaNormalizeReport(MATCH_ID, TASKS, submitted);
    expect(outcomes[0].status).toBe('wrong');
  });

  it('заявленный wrong на верном ответе становится correct', () => {
    const submitted: ArenaSubmittedOutcome[] = [
      { taskIndex: 0, status: 'wrong', raceElapsedMs: 900, answer: { selectedIndex: 0 } },
    ];
    expect(arenaNormalizeReport(MATCH_ID, TASKS, submitted)[0].status).toBe('correct');
  });

  it('сборка перевода проверяется по токенам', () => {
    const ok: ArenaSubmittedOutcome[] = [
      { taskIndex: 2, status: 'wrong', raceElapsedMs: 5000, answer: { tokens: ['i', 'will', 'not', 'give', 'up'] } },
    ];
    expect(arenaNormalizeReport(MATCH_ID, TASKS, ok)[2].status).toBe('correct');
    const bad: ArenaSubmittedOutcome[] = [
      { taskIndex: 2, status: 'correct', raceElapsedMs: 5000, answer: { tokens: ['i', 'give', 'up'] } },
    ];
    expect(arenaNormalizeReport(MATCH_ID, TASKS, bad)[2].status).toBe('wrong');
  });

  it('порядок чипов в сборке перевода значим', () => {
    const swapped: ArenaSubmittedOutcome[] = [
      { taskIndex: 2, status: 'correct', raceElapsedMs: 5000, answer: { tokens: ['will', 'i', 'not', 'give', 'up'] } },
    ];
    expect(arenaNormalizeReport(MATCH_ID, TASKS, swapped)[2].status).toBe('wrong');
  });

  /**
   * Регистр значим — и так и задумано: игрок не печатает, он нажимает чипы из
   * `wordBank`, поэтому строка приходит буква в букву. Приведение к нижнему
   * регистру здесь развело бы серверную проверку с клиентским отпечатком
   * (`arenaCanonicalAnswerValue` регистр не трогает): игрок увидел бы «верно»,
   * а начисления не было бы. Тест держит это свойство на месте.
   */
  it('регистр токенов значим — клиент и сервер обязаны сходиться', () => {
    const capitalized: ArenaSubmittedOutcome[] = [
      { taskIndex: 2, status: 'correct', raceElapsedMs: 5000, answer: { tokens: ['I', 'will', 'not', 'give', 'up'] } },
    ];
    expect(arenaNormalizeReport(MATCH_ID, TASKS, capitalized)[2].status).toBe('wrong');
  });

  it('ответ не того вида — неверно, а не падение', () => {
    const junk: ArenaSubmittedOutcome[] = [
      { taskIndex: 2, status: 'correct', raceElapsedMs: 5000, answer: 'i will not give up' },
      { taskIndex: 0, status: 'correct', raceElapsedMs: 900, answer: null },
      { taskIndex: 1, status: 'correct', raceElapsedMs: 900, answer: { selectedIndex: '3' } },
    ];
    const outcomes = arenaNormalizeReport(MATCH_ID, TASKS, junk);
    expect(outcomes[2].status).toBe('wrong');
    expect(outcomes[0].status).toBe('wrong');
    expect(outcomes[1].status).toBe('wrong');
  });

  it('пропущенное задание становится просрочкой в полное окно', () => {
    const outcomes = arenaNormalizeReport(MATCH_ID, TASKS, []);
    expect(outcomes.length).toBe(TASKS.length);
    expect(outcomes.every((row) => row.status === 'timeout')).toBe(true);
    expect(outcomes[2].raceElapsedMs).toBe(ARENA_ANSWER_MS.translate_build);
  });

  it('просрочка стоит полного окна, каким бы временем её ни объявили', () => {
    const submitted: ArenaSubmittedOutcome[] = [
      { taskIndex: 1, status: 'timeout', raceElapsedMs: 1 },
    ];
    expect(arenaNormalizeReport(MATCH_ID, TASKS, submitted)[1].raceElapsedMs)
      .toBe(ARENA_ANSWER_MS.fill_gap);
  });

  it('технический сбой сохраняется как сбой, а не как неверный ответ', () => {
    const submitted: ArenaSubmittedOutcome[] = [
      { taskIndex: 1, status: 'broken', raceElapsedMs: 400 },
    ];
    expect(arenaNormalizeReport(MATCH_ID, TASKS, submitted)[1].status).toBe('broken');
  });

  it('отрицательное и запредельное время обрезаются в окно', () => {
    const submitted: ArenaSubmittedOutcome[] = [
      { taskIndex: 0, status: 'correct', raceElapsedMs: -50_000, answer: { selectedIndex: 0 } },
      { taskIndex: 1, status: 'correct', raceElapsedMs: 9_999_999, answer: { selectedIndex: 3 } },
    ];
    const outcomes = arenaNormalizeReport(MATCH_ID, TASKS, submitted);
    expect(outcomes[0].raceElapsedMs).toBeGreaterThanOrEqual(0);
    expect(outcomes[1].raceElapsedMs).toBe(ARENA_ANSWER_MS.fill_gap);
  });

  it('дубль по одному заданию не перебивает первый', () => {
    const submitted: ArenaSubmittedOutcome[] = [
      { taskIndex: 0, status: 'correct', raceElapsedMs: 900, answer: { selectedIndex: 0 } },
      { taskIndex: 0, status: 'correct', raceElapsedMs: 1, answer: { selectedIndex: 0 } },
    ];
    expect(arenaNormalizeReport(MATCH_ID, TASKS, submitted)[0].raceElapsedMs).toBe(900);
  });

  it('чужие и битые индексы игнорируются', () => {
    const submitted = [
      { taskIndex: 99, status: 'correct', raceElapsedMs: 10, answer: { selectedIndex: 0 } },
      { taskIndex: -1, status: 'correct', raceElapsedMs: 10, answer: { selectedIndex: 0 } },
      { taskIndex: NaN, status: 'correct', raceElapsedMs: 10, answer: { selectedIndex: 0 } },
    ] as unknown as ArenaSubmittedOutcome[];
    const outcomes = arenaNormalizeReport(MATCH_ID, TASKS, submitted);
    expect(outcomes.length).toBe(TASKS.length);
    expect(outcomes.every((row) => row.status === 'timeout')).toBe(true);
  });

  it('поле пар считается по журналу, а не по заявленному статусу', () => {
    const submitted: ArenaSubmittedOutcome[] = [
      {
        taskIndex: 4,
        status: 'correct',
        raceElapsedMs: 4_000,
        pairAttempts: { '0': [0], '1': [3, 1], '2': [2], '3': [3] },
      },
    ];
    const row = arenaNormalizeReport(MATCH_ID, TASKS, submitted)[4];
    expect(row.firstAttemptPairs).toBe(3);
    expect(row.resolvedPairs).toBe(4);
    expect(row.status).toBe('correct');
  });

  it('поле пар без журнала — просрочка, даже если объявлено верным', () => {
    const submitted: ArenaSubmittedOutcome[] = [
      { taskIndex: 4, status: 'correct', raceElapsedMs: 100 },
    ];
    const row = arenaNormalizeReport(MATCH_ID, TASKS, submitted)[4];
    expect(row.status).toBe('timeout');
    expect(row.firstAttemptPairs).toBe(0);
  });
});

describe('arenaScoreReport', () => {
  const perfect: ArenaSubmittedOutcome[] = [
    { taskIndex: 0, status: 'correct', raceElapsedMs: 800, answer: { selectedIndex: 0 } },
    { taskIndex: 1, status: 'correct', raceElapsedMs: 800, answer: { selectedIndex: 3 } },
    { taskIndex: 2, status: 'correct', raceElapsedMs: 3000, answer: { tokens: ['i', 'will', 'not', 'give', 'up'] } },
    { taskIndex: 3, status: 'correct', raceElapsedMs: 800, answer: { selectedIndex: 1 } },
    { taskIndex: 4, status: 'correct', raceElapsedMs: 5000, pairAttempts: { '0': [0], '1': [1], '2': [2], '3': [3] } },
  ];

  it('идеальный прогон против неизвестного соперника', () => {
    const own = arenaNormalizeReport(MATCH_ID, TASKS, perfect);
    const score = arenaScoreReport(TASKS, own, TASKS.map(() => null));
    expect(score.correctCount).toBe(5);
    expect(score.perTask.length).toBe(5);
    expect(score.matchStars).toBeGreaterThan(0);
  });

  it('матч не может выдать больше потолка режима', () => {
    const own = arenaNormalizeReport(MATCH_ID, TASKS, perfect);
    const score = arenaScoreReport(TASKS, own, TASKS.map(() => null));
    expect(score.matchStars).toBeLessThanOrEqual(arenaMatchPlanRules('ranked', TASKS.length).matchStarCeiling);
  });

  it('тот же отчёт даёт тот же счёт', () => {
    const a = arenaScoreReport(TASKS, arenaNormalizeReport(MATCH_ID, TASKS, perfect), TASKS.map(() => null));
    const b = arenaScoreReport(TASKS, arenaNormalizeReport(MATCH_ID, TASKS, perfect), TASKS.map(() => null));
    expect(a).toEqual(b);
  });

  it('соперник, ответивший раньше, забирает бонус за скорость', () => {
    const own = arenaNormalizeReport(MATCH_ID, TASKS, perfect);
    const fastRival = arenaNormalizeReport(MATCH_ID, TASKS, perfect.map((row) => (
      row.taskIndex === 0 ? { ...row, raceElapsedMs: 100 } : row
    )));
    const alone = arenaScoreReport(TASKS, own, TASKS.map(() => null));
    const raced = arenaScoreReport(TASKS, own, fastRival);
    expect(raced.perTask[0].stars).toBeLessThan(alone.perTask[0].stars);
  });

  it('пустой отчёт даёт ноль звёзд, а не отрицательное', () => {
    const score = arenaScoreReport(TASKS, arenaNormalizeReport(MATCH_ID, TASKS, []), TASKS.map(() => null));
    expect(score.matchStars).toBe(0);
    expect(score.correctCount).toBe(0);
  });
});

describe('arenaDecisiveTaskIndex', () => {
  it('без соперника решающего задания нет', () => {
    const own = arenaScoreReport(TASKS, arenaNormalizeReport(MATCH_ID, TASKS, []), TASKS.map(() => null));
    expect(arenaDecisiveTaskIndex(own, null)).toBeNull();
  });

  it('при полном равенстве решающего задания нет', () => {
    const outcomes = arenaNormalizeReport(MATCH_ID, TASKS, []);
    const score = arenaScoreReport(TASKS, outcomes, TASKS.map(() => null));
    expect(arenaDecisiveTaskIndex(score, score)).toBeNull();
  });

  it('при равной разнице выбирается более позднее задание', () => {
    const winner: ArenaSubmittedOutcome[] = [
      { taskIndex: 0, status: 'correct', raceElapsedMs: 800, answer: { selectedIndex: 0 } },
      { taskIndex: 3, status: 'correct', raceElapsedMs: 800, answer: { selectedIndex: 1 } },
    ];
    const own = arenaScoreReport(TASKS, arenaNormalizeReport(MATCH_ID, TASKS, winner), TASKS.map(() => null));
    const rival = arenaScoreReport(TASKS, arenaNormalizeReport(MATCH_ID, TASKS, []), TASKS.map(() => null));
    expect(arenaDecisiveTaskIndex(own, rival)).toBe(3);
  });
});

describe('бюджет и дедлайн закрытия', () => {
  it('бюджет складывается из окон и пауз', () => {
    const budget = arenaMatchBudgetMs(TASKS.map((task) => ({ mode: task.mode as never })));
    const answers = TASKS.reduce((sum, task) => sum + ARENA_ANSWER_MS[task.mode as never], 0);
    expect(budget).toBeGreaterThan(answers);
    expect(Number.isFinite(budget)).toBe(true);
  });

  it('дедлайн строго позже старта и растёт с числом заданий', () => {
    const five = TASKS.map((task) => ({ mode: task.mode as never }));
    const ten = [...five, ...five];
    expect(arenaSettleDeadlineMs(1_000, five)).toBeGreaterThan(1_000);
    expect(arenaSettleDeadlineMs(1_000, ten)).toBeGreaterThan(arenaSettleDeadlineMs(1_000, five));
  });
});

describe('arenaShouldSettle', () => {
  const tasks = TASKS.map((task) => ({ mode: task.mode as never }));
  const startedAtMs = 1_000_000;
  const base = {
    startedAtMs,
    tasks,
    participants: 2,
    firstReportAtMs: null as number | null,
    opponentPresent: true,
  };

  it('оба сдали — закрываем немедленно', () => {
    expect(arenaShouldSettle({ ...base, nowMs: startedAtMs + 1, reportsIn: 2 })).toBe(true);
  });

  it('никто не сдал, время есть — ждём', () => {
    expect(arenaShouldSettle({ ...base, nowMs: startedAtMs + 1, reportsIn: 0 })).toBe(false);
  });

  it('один сдал, соперник на связи — ждём до дедлайна', () => {
    expect(arenaShouldSettle({
      ...base, nowMs: startedAtMs + 5_000, reportsIn: 1, firstReportAtMs: startedAtMs + 4_000,
    })).toBe(false);
  });

  it('дедлайн вышел — закрываем тем, что есть', () => {
    expect(arenaShouldSettle({
      ...base, nowMs: arenaSettleDeadlineMs(startedAtMs, tasks), reportsIn: 0,
    })).toBe(true);
  });

  it('соперник пропал — ждём ровно окно ожидания, не дольше', () => {
    const firstReportAtMs = startedAtMs + 4_000;
    const gone = { ...base, reportsIn: 1, firstReportAtMs, opponentPresent: false };
    expect(arenaShouldSettle({ ...gone, nowMs: firstReportAtMs + ARENA_DUEL_OPPONENT_WAIT_MS - 1 })).toBe(false);
    expect(arenaShouldSettle({ ...gone, nowMs: firstReportAtMs + ARENA_DUEL_OPPONENT_WAIT_MS })).toBe(true);
  });

  it('соперник пропал, но никто не сдал — дедлайн остаётся единственным основанием', () => {
    expect(arenaShouldSettle({
      ...base, nowMs: startedAtMs + 5_000, reportsIn: 0, opponentPresent: false,
    })).toBe(false);
  });

  it('одиночный матч закрывается одним отчётом', () => {
    expect(arenaShouldSettle({
      ...base, participants: 1, reportsIn: 1, nowMs: startedAtMs + 10,
    })).toBe(true);
  });
});

describe('arenaDuelReconcile — вместо пошаговой машины v2', () => {
  const tasks = TASKS.map((task) => ({ mode: task.mode as never }));
  const startedAtMs = 1_000_000;
  const deadline = arenaSettleDeadlineMs(startedAtMs, tasks);
  const base = {
    startedAtMs,
    tasks,
    participants: 2,
    reportsIn: 0,
    firstReportAtMs: null as number | null,
    opponentPresent: true,
  };

  it('пока матч идёт — ждём и ничего не трогаем', () => {
    expect(arenaDuelReconcile({ ...base, nowMs: startedAtMs + 5_000 })).toBe('wait');
  });

  it('ни одного отчёта после дедлайна — отмена, а не чья-то победа', () => {
    expect(arenaDuelReconcile({ ...base, nowMs: deadline })).toBe('abort');
  });

  it('оба сдали — закрываем', () => {
    expect(arenaDuelReconcile({
      ...base, nowMs: startedAtMs + 5_000, reportsIn: 2, firstReportAtMs: startedAtMs + 4_000,
    })).toBe('settle');
  });

  it('один сдал, соперник на связи — ждём', () => {
    expect(arenaDuelReconcile({
      ...base, nowMs: startedAtMs + 5_000, reportsIn: 1, firstReportAtMs: startedAtMs + 4_000,
    })).toBe('wait');
  });

  it('один сдал, соперник пропал — закрываем по окну ожидания', () => {
    const firstReportAtMs = startedAtMs + 4_000;
    expect(arenaDuelReconcile({
      ...base,
      nowMs: firstReportAtMs + ARENA_DUEL_OPPONENT_WAIT_MS,
      reportsIn: 1,
      firstReportAtMs,
      opponentPresent: false,
    })).toBe('settle');
  });

  it('один сдал, дедлайн вышел — закрываем даже при живом сопернике', () => {
    expect(arenaDuelReconcile({
      ...base, nowMs: deadline, reportsIn: 1, firstReportAtMs: startedAtMs + 4_000,
    })).toBe('settle');
  });

  it('отчёт есть — отмены не бывает никогда', () => {
    for (const nowMs of [startedAtMs, deadline, deadline + 10 * 60_000]) {
      expect(arenaDuelReconcile({
        ...base, nowMs, reportsIn: 1, firstReportAtMs: startedAtMs + 1,
      })).not.toBe('abort');
    }
  });
});

describe('arenaDuelSettleProbeAtMs', () => {
  it('спрашивать имеет смысл ровно через окно ожидания', () => {
    expect(arenaDuelSettleProbeAtMs(5_000)).toBe(5_000 + ARENA_DUEL_OPPONENT_WAIT_MS);
  });

  it('момент опроса строго позже самого отчёта', () => {
    expect(arenaDuelSettleProbeAtMs(5_000)).toBeGreaterThan(5_000);
  });
});

describe('arenaAssertReportShape', () => {
  const good = {
    schemaVersion: ARENA_REPORT_SCHEMA_VERSION,
    rulesVersion: 'arena-stars.v3',
    matchId: MATCH_ID,
    seat: 'a',
    planHash: 'abc',
    taskCount: 5,
    startedAtWallMs: 1,
    finishedAtWallMs: 2,
    tasks: [],
    shownMatchStars: 0,
    abandoned: false,
    clockSuspect: false,
  };

  it('пропускает правильный отчёт', () => {
    expect(arenaAssertReportShape(good, 5).matchId).toBe(MATCH_ID);
  });

  it('отклоняет чужую версию схемы', () => {
    expect(() => arenaAssertReportShape({ ...good, schemaVersion: 'v1' }, 5)).toThrow();
  });

  it('отклоняет пустоту, чужое место и лишние задания', () => {
    expect(() => arenaAssertReportShape(undefined, 5)).toThrow();
    expect(() => arenaAssertReportShape(null, 5)).toThrow();
    expect(() => arenaAssertReportShape({ ...good, seat: 'c' }, 5)).toThrow();
    expect(() => arenaAssertReportShape({ ...good, matchId: '' }, 5)).toThrow();
    expect(() => arenaAssertReportShape({ ...good, tasks: new Array(20).fill({}) }, 5)).toThrow();
  });
});

describe('arenaDeclaredVsActualDelta', () => {
  it('совпало — ноль', () => {
    expect(arenaDeclaredVsActualDelta(12, 12)).toBe(0);
  });

  it('показали меньше, чем начислили', () => {
    expect(arenaDeclaredVsActualDelta(10, 12)).toBe(2);
  });

  it('показали больше, чем начислили', () => {
    expect(arenaDeclaredVsActualDelta(14, 12)).toBe(-2);
  });

  it('мусор вместо числа не создаёт расхождения', () => {
    expect(arenaDeclaredVsActualDelta(undefined, 12)).toBe(0);
    expect(arenaDeclaredVsActualDelta('нет', 12)).toBe(0);
    expect(arenaDeclaredVsActualDelta(NaN, 12)).toBe(0);
  });
});

describe('версии схем зафиксированы', () => {
  it('план и отчёт названы явно', () => {
    expect(ARENA_PLAN_SCHEMA_VERSION).toBe('arena-match-plan.v2');
    expect(ARENA_REPORT_SCHEMA_VERSION).toBe('arena-match-report.v2');
  });
});
