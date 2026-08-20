import {
  ARENA_LIVE_LEGACY_SCHEMA_VERSION,
  ARENA_LIVE_SCHEMA_VERSION,
  arenaLivePublishPlan,
  arenaLiveWritePayload,
  arenaLiveWriteBudget,
  arenaMergeOpponentTicks,
  arenaParseLiveSeat,
  arenaClosedTicks,
  arenaPendingOpponentTicks,
  type ArenaLiveTick,
} from '../modules/arena/live_channel';
import type { ArenaOpponentTick } from '../modules/arena/match_machine';
import fs from 'node:fs';
import path from 'node:path';
import {
  arenaSearchingCount,
  arenaSearchingCountForms,
  arenaSlavicPlural,
  type ArenaCopyLocale,
} from '../modules/arena/searching_copy';

/**
 * Живой прогресс соперника.
 *
 * Здесь закреплены два свойства, которые дороже всего стоят при нарушении.
 *
 * Первое — БЮДЖЕТ ЗАПИСЕЙ. Владелец запретил «хартбиты каждую секунду» прямо,
 * и это не пожелание, а проверяемое правило: публикация отказывает на повторе,
 * поэтому за матч выходит ровно по записи на задание и ни одной больше.
 *
 * Второе — КЛИЕНТ НЕ ЗНАЕТ, кто перед ним. Ходы бота приходят вместе с планом,
 * ходы человека — из канала, и обрабатываются они одним и тем же кодом. Любое
 * ветвление «это бот?» немедленно утекло бы в поведение экрана.
 */

const tick = (taskIndex: number, correct = true, raceElapsedMs = 1_000): ArenaLiveTick =>
  ({ taskIndex, correct, raceElapsedMs });

describe('бюджет записей', () => {
  it('публикатор сериализует optional matchStars в том же write', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/arena_client.ts'), 'utf8');
    const liveModel = fs.readFileSync(path.join(process.cwd(), 'modules/arena/live_channel.ts'), 'utf8');
    expect(source).toContain('arenaLiveWritePayload({');
    expect(liveModel).toContain("...(Number.isInteger(tick.matchStars) ? { matchStars: tick.matchStars } : {})");
  });

  it('новый writer остаётся читаемым установленным v1-reader', () => {
    const payload = arenaLiveWritePayload({
      ticks: [{ taskIndex: 0, correct: true, raceElapsedMs: 900, matchStars: 3 }],
      finished: false,
      updatedAtMs: 123,
    });
    // Семантика уже установленного reader: v2 целиком отвергается, а
    // неизвестные ключи внутри v1-тика игнорируются.
    const installedV1Read = (raw: typeof payload) => raw.schemaVersion === 'arena-live.v1'
      ? raw.ticks.map((row: ArenaLiveTick) => ({
        taskIndex: row.taskIndex,
        correct: row.correct,
        raceElapsedMs: row.raceElapsedMs,
      }))
      : null;

    expect(payload.schemaVersion).toBe(ARENA_LIVE_LEGACY_SCHEMA_VERSION);
    expect(payload.ticks[0]).toEqual({ taskIndex: 0, correct: true, raceElapsedMs: 900, matchStars: 3 });
    expect(installedV1Read(payload)).toEqual([{ taskIndex: 0, correct: true, raceElapsedMs: 900 }]);
  });

  it('первое закрытое задание публикуется', () => {
    const plan = arenaLivePublishPlan({
      publishedTaskIndexes: [], closedTicks: [tick(0)], finished: false, finishPublished: false,
    });
    expect(plan).not.toBeNull();
    expect(plan!.ticks.length).toBe(1);
  });

  it('повтор того же задания НЕ пишется — это и есть запрет на хартбиты', () => {
    expect(arenaLivePublishPlan({
      publishedTaskIndexes: [0], closedTicks: [tick(0)], finished: false, finishPublished: false,
    })).toBeNull();
  });

  it('сто вызовов подряд без новых заданий не дают ни одной записи', () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      expect(arenaLivePublishPlan({
        publishedTaskIndexes: [0, 1, 2], closedTicks: [tick(0), tick(1), tick(2)],
        finished: false, finishPublished: false,
      })).toBeNull();
    }
  });

  it('пишутся только НОВЫЕ задания, а не весь список заново', () => {
    const plan = arenaLivePublishPlan({
      publishedTaskIndexes: [0, 1],
      closedTicks: [tick(0), tick(1), tick(2), tick(3)],
      finished: false,
      finishPublished: false,
    });
    expect(plan!.ticks.map((row) => row.taskIndex)).toEqual([2, 3]);
  });

  it('завершение матча публикуется один раз', () => {
    const first = arenaLivePublishPlan({
      publishedTaskIndexes: [0], closedTicks: [tick(0)], finished: true, finishPublished: false,
    });
    expect(first).not.toBeNull();
    expect(first!.finished).toBe(true);
    expect(arenaLivePublishPlan({
      publishedTaskIndexes: [0], closedTicks: [tick(0)], finished: true, finishPublished: true,
    })).toBeNull();
  });

  it('за матч на десять заданий бюджет — одиннадцать записей', () => {
    expect(arenaLiveWriteBudget(10)).toBe(11);
    expect(arenaLiveWriteBudget(5)).toBe(6);
  });

  it('полный матч укладывается в бюджет', () => {
    const published: number[] = [];
    const closed: ArenaLiveTick[] = [];
    let finishPublished = false;
    let writes = 0;
    for (let taskIndex = 0; taskIndex < 10; taskIndex += 1) {
      closed.push(tick(taskIndex));
      const finished = taskIndex === 9;
      // Экран дёргает публикацию щедро — на каждое изменение состояния.
      for (let spurious = 0; spurious < 20; spurious += 1) {
        const plan = arenaLivePublishPlan({
          publishedTaskIndexes: published, closedTicks: closed, finished, finishPublished,
        });
        if (!plan) continue;
        writes += 1;
        plan.ticks.forEach((row) => published.push(row.taskIndex));
        if (plan.finished) finishPublished = true;
      }
    }
    expect(writes).toBeLessThanOrEqual(arenaLiveWriteBudget(10));
    expect(writes).toBe(10);
  });
});

describe('разбор чужой записи', () => {
  const good = {
    schemaVersion: ARENA_LIVE_SCHEMA_VERSION,
    ticks: [{ taskIndex: 1, correct: true, raceElapsedMs: 900 }],
    finished: false,
    updatedAtMs: 1_700_000_000_000,
  };

  it('нормальная запись разбирается', () => {
    const seat = arenaParseLiveSeat(good, 10);
    expect(seat).not.toBeNull();
    expect(seat!.ticks).toEqual([{ taskIndex: 1, correct: true, raceElapsedMs: 900 }]);
  });

  it('v1 и v2 сохраняют только валидный неубывающий накопленный счёт', () => {
    for (const schemaVersion of ['arena-live.v1', 'arena-live.v2'] as const) {
      const seat = arenaParseLiveSeat({
        schemaVersion,
        ticks: [
          { taskIndex: 0, correct: true, raceElapsedMs: 900, matchStars: 3 },
          { taskIndex: 1, correct: true, raceElapsedMs: 800, matchStars: 2 },
          { taskIndex: 2, correct: true, raceElapsedMs: 700, matchStars: 3.5 },
        ],
        finished: false,
        updatedAtMs: 1,
      }, 5);

      expect(seat?.ticks).toEqual([
        { taskIndex: 0, correct: true, raceElapsedMs: 900, matchStars: 3 },
        { taskIndex: 1, correct: true, raceElapsedMs: 800 },
        { taskIndex: 2, correct: true, raceElapsedMs: 700 },
      ]);
    }
  });

  it('не приводит null, boolean и string к числам или boolean', () => {
    const invalidTicks = [
      { taskIndex: null, correct: true, raceElapsedMs: 900 },
      { taskIndex: true, correct: true, raceElapsedMs: 900 },
      { taskIndex: '0', correct: true, raceElapsedMs: 900 },
      { taskIndex: 0, correct: null, raceElapsedMs: 900 },
      { taskIndex: 0, correct: 'true', raceElapsedMs: 900 },
      { taskIndex: 0, correct: true, raceElapsedMs: null },
      { taskIndex: 0, correct: true, raceElapsedMs: false },
      { taskIndex: 0, correct: true, raceElapsedMs: '900' },
    ];
    const seat = arenaParseLiveSeat({ ...good, ticks: invalidTicks }, 5);
    expect(seat?.ticks).toEqual([]);

    for (const matchStars of [null, true, '3']) {
      const scoreSeat = arenaParseLiveSeat({
        ...good,
        ticks: [{ taskIndex: 0, correct: true, raceElapsedMs: 900, matchStars }],
      }, 5);
      expect(scoreSeat?.ticks).toEqual([{ taskIndex: 0, correct: true, raceElapsedMs: 900 }]);
    }
    expect(arenaParseLiveSeat({ ...good, updatedAtMs: '1' }, 5)?.updatedAtMs).toBe(0);
  });

  it('legacy v1 остаётся читаемой во время миграции', () => {
    expect(arenaParseLiveSeat({
      schemaVersion: ARENA_LIVE_LEGACY_SCHEMA_VERSION,
      ticks: [{ taskIndex: 0, correct: true, raceElapsedMs: 900 }],
      finished: false,
      updatedAtMs: 1,
    }, 5)).not.toBeNull();
  });

  it('пусто и мусор дают null, а не падение', () => {
    expect(arenaParseLiveSeat(null, 10)).toBeNull();
    expect(arenaParseLiveSeat(undefined, 10)).toBeNull();
    expect(arenaParseLiveSeat('строка', 10)).toBeNull();
    expect(arenaParseLiveSeat([], 10)).toBeNull();
    expect(arenaParseLiveSeat({}, 10)).toBeNull();
  });

  it('чужая версия схемы отбрасывается целиком', () => {
    expect(arenaParseLiveSeat({ ...good, schemaVersion: 'arena-live.v0' }, 10)).toBeNull();
  });

  /**
   * Канал пишет ДРУГОЕ устройство. Падать из-за него нельзя: это индикатор, а
   * не начисление — начисление всё равно пересчитает сервер.
   */
  it('битые ходы отбрасываются молча, остальные остаются', () => {
    const seat = arenaParseLiveSeat({
      ...good,
      ticks: [
        { taskIndex: 0, correct: true, raceElapsedMs: 100 },
        { taskIndex: 99, correct: true, raceElapsedMs: 100 },
        { taskIndex: -1, correct: true, raceElapsedMs: 100 },
        { taskIndex: 2, correct: true, raceElapsedMs: -5 },
        { taskIndex: 'три', correct: true, raceElapsedMs: 100 },
        null,
        'мусор',
        { taskIndex: 3, correct: true, raceElapsedMs: 700 },
      ],
    }, 10);
    expect(seat!.ticks.map((row) => row.taskIndex)).toEqual([0, 3]);
  });

  it('дубль по заданию берётся один раз — первый', () => {
    const seat = arenaParseLiveSeat({
      ...good,
      ticks: [
        { taskIndex: 4, correct: true, raceElapsedMs: 500 },
        { taskIndex: 4, correct: false, raceElapsedMs: 9_000 },
      ],
    }, 10);
    expect(seat!.ticks.length).toBe(1);
    expect(seat!.ticks[0].raceElapsedMs).toBe(500);
  });

  it('ходы отдаются по порядку заданий', () => {
    const seat = arenaParseLiveSeat({
      ...good,
      ticks: [tick(5), tick(1), tick(3)],
    }, 10);
    expect(seat!.ticks.map((row) => row.taskIndex)).toEqual([1, 3, 5]);
  });

  it('отсутствующие ходы — пустой список, а не null', () => {
    const seat = arenaParseLiveSeat({ ...good, ticks: undefined }, 10);
    expect(seat).not.toBeNull();
    expect(seat!.ticks).toEqual([]);
  });

  it('признак «доиграл» читается строго', () => {
    expect(arenaParseLiveSeat({ ...good, finished: true }, 10)!.finished).toBe(true);
    expect(arenaParseLiveSeat({ ...good, finished: 'да' }, 10)!.finished).toBe(false);
  });
});

describe('слияние двух источников', () => {
  const planTicks: readonly ArenaOpponentTick[] = [
    { taskIndex: 0, correct: true, raceElapsedMs: 800 },
    { taskIndex: 1, correct: false, raceElapsedMs: 8_000 },
  ];

  it('живые ходы добавляются к выданным планом', () => {
    const merged = arenaMergeOpponentTicks(planTicks, [tick(2, true, 400)]);
    expect(merged.map((row) => row.taskIndex)).toEqual([0, 1, 2]);
  });

  it('при совпадении побеждает план — он выдан сервером', () => {
    const merged = arenaMergeOpponentTicks(planTicks, [tick(0, false, 9_999)]);
    expect(merged[0]).toEqual({ taskIndex: 0, correct: true, raceElapsedMs: 800 });
  });

  /**
   * У бота план приходит заполненным, у человека — пустым, и оба случая идут
   * через один и тот же код. Если бы здесь появилась развилка, экран начал бы
   * вести себя по-разному, и игрок догадался бы.
   */
  it('живой соперник и бот обрабатываются одинаковым кодом', () => {
    const bot = arenaMergeOpponentTicks(planTicks, []);
    const human = arenaMergeOpponentTicks([], [tick(0, true, 800), tick(1, false, 8_000)]);
    expect(bot.map((row) => row.taskIndex)).toEqual(human.map((row) => row.taskIndex));
    expect(bot[0].correct).toBe(human[0].correct);
  });

  it('оба источника пусты — пустой список', () => {
    expect(arenaMergeOpponentTicks([], [])).toEqual([]);
  });

  it('результат всегда по порядку заданий', () => {
    const merged = arenaMergeOpponentTicks(
      [{ taskIndex: 7, correct: true, raceElapsedMs: 1 }],
      [tick(9), tick(2), tick(5)],
    );
    expect(merged.map((row) => row.taskIndex)).toEqual([2, 5, 7, 9]);
  });
});

describe('что ещё не скормлено машине', () => {
  const merged: readonly ArenaOpponentTick[] = [
    { taskIndex: 0, correct: true, raceElapsedMs: 100 },
    { taskIndex: 1, correct: true, raceElapsedMs: 200 },
    { taskIndex: 2, correct: true, raceElapsedMs: 300 },
  ];

  it('отдаёт только новое', () => {
    expect(arenaPendingOpponentTicks(merged, [0, 1]).map((row) => row.taskIndex)).toEqual([2]);
  });

  it('всё доставлено — пусто, лишней перерисовки не будет', () => {
    expect(arenaPendingOpponentTicks(merged, [0, 1, 2])).toEqual([]);
  });

  it('ничего не доставлено — всё', () => {
    expect(arenaPendingOpponentTicks(merged, []).length).toBe(3);
  });
});

describe('счётчик ищущих на экране', () => {
  /**
   * Русское, украинское и польское числительное управляет окончанием, поэтому
   * строка собирается правилом, а не склейкой. Тест держит именно те формы,
   * которые ломаются чаще всего: 1, 2 и 11.
   */
  it('русские окончания, включая исключение 11–14', () => {
    expect(arenaSearchingCountForms(1).ru).toContain('1 игрок');
    expect(arenaSearchingCountForms(2).ru).toContain('2 игрока');
    expect(arenaSearchingCountForms(5).ru).toContain('5 игроков');
    expect(arenaSearchingCountForms(11).ru).toContain('11 игроков');
    expect(arenaSearchingCountForms(14).ru).toContain('14 игроков');
    expect(arenaSearchingCountForms(21).ru).toContain('21 игрок');
    expect(arenaSearchingCountForms(22).ru).toContain('22 игрока');
    expect(arenaSearchingCountForms(111).ru).toContain('111 игроков');
  });

  it('правило склонения само по себе', () => {
    expect(arenaSlavicPlural(1, 'a', 'b', 'c')).toBe('a');
    expect(arenaSlavicPlural(3, 'a', 'b', 'c')).toBe('b');
    expect(arenaSlavicPlural(7, 'a', 'b', 'c')).toBe('c');
    // 11–14 берут форму множества, хотя оканчиваются на 1–4.
    for (const value of [11, 12, 13, 14]) {
      expect(arenaSlavicPlural(value, 'a', 'b', 'c')).toBe('c');
    }
  });

  it('ноль и мусор не считаются игроками', () => {
    for (const value of [0, -3, NaN, Number.POSITIVE_INFINITY, 'нет', null, undefined]) {
      expect(arenaSearchingCount(value)).toBe(0);
    }
    expect(arenaSearchingCount(4)).toBe(4);
    expect(arenaSearchingCount('4')).toBe(4);
    expect(arenaSearchingCount(4.9)).toBe(4);
  });

  it('во всех локалях непусто и содержит число', () => {
    const locales: readonly ArenaCopyLocale[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
    const forms = arenaSearchingCountForms(3);
    for (const locale of locales) {
      expect(forms[locale].length).toBeGreaterThan(0);
      expect(forms[locale]).toContain('3');
    }
  });

  it('единственное число нигде не выглядит как множественное', () => {
    const forms = arenaSearchingCountForms(1);
    expect(forms.ru).toContain('1 игрок');
    expect(forms.ru).not.toContain('игроков');
    expect(forms.es).toContain('1 jugador');
    expect(forms.es).not.toContain('jugadores');
    expect(forms.tr).not.toContain('oyuncular');
  });
});

describe('что публикуется из состояния матча', () => {
  const base = {
    schemaVersion: 'arena-local-match.v2',
    matchId: 'm1', seat: 'a', mode: 'ranked', taskCount: 5, planHash: 'h',
    phase: 'reveal', taskIndex: 1,
    phaseStartedAtMonoMs: 0, phaseStartedAtWallMs: 0, phaseBudgetMs: 0, monoEpochId: 'e',
    pairAttempts: {}, pairFirstAttemptCorrect: {}, pairAttemptsByTask: {},
    awards: [], matchStars: 0, comboRun: 0, longestCombo: 0, correctCount: 0,
    firstCount: 0, tieBreakElapsedMs: 0,
    opponentByTask: {}, opponentFinished: false, awardResolveAtMonoMs: null,
    clockSuspect: false, lastEventAtMonoMs: 0, lastEventAtWallMs: 0,
    startedAtWallMs: 0, finishedAtWallMs: null, abandoned: false,
  } as unknown as Parameters<typeof arenaClosedTicks>[0];

  const withOutcomes = (outcomes: unknown[], awardStars: readonly number[] = []) =>
    ({
      ...base,
      outcomes,
      awards: awardStars.map((stars) => ({ stars })),
    } as unknown as Parameters<typeof arenaClosedTicks>[0]);

  it('обычное задание: «верно» берётся из статуса', () => {
    const ticks = arenaClosedTicks(withOutcomes([
      { taskIndex: 0, mode: 'guess_phrase', status: 'correct', raceElapsedMs: 900, firstAttemptPairs: 0, resolvedPairs: 0, answer: null },
      { taskIndex: 1, mode: 'fill_gap', status: 'wrong', raceElapsedMs: 8_000, firstAttemptPairs: 0, resolvedPairs: 0, answer: null },
    ], [3, 2]));
    expect(ticks).toEqual([
      { taskIndex: 0, correct: true, raceElapsedMs: 900, matchStars: 3 },
      { taskIndex: 1, correct: false, raceElapsedMs: 8_000, matchStars: 5 },
    ]);
  });

  /**
   * Доска пар считается как в движке звёзд: «верно» — это «хоть одна пара
   * угадана с первой попытки». Иначе индикатор соперника говорил бы одно, а
   * счёт показывал другое.
   */
  it('доска пар: «верно» — это пары с ПЕРВОЙ попытки', () => {
    const ticks = arenaClosedTicks(withOutcomes([
      { taskIndex: 0, mode: 'speed_match', status: 'correct', raceElapsedMs: 5_000, firstAttemptPairs: 0, resolvedPairs: 4, answer: null },
      { taskIndex: 1, mode: 'speed_match', status: 'correct', raceElapsedMs: 5_000, firstAttemptPairs: 1, resolvedPairs: 4, answer: null },
    ]));
    expect(ticks[0].correct).toBe(false);
    expect(ticks[1].correct).toBe(true);
  });

  it('просрочка и сбой — не «верно»', () => {
    const ticks = arenaClosedTicks(withOutcomes([
      { taskIndex: 0, mode: 'guess_phrase', status: 'timeout', raceElapsedMs: 8_000, firstAttemptPairs: 0, resolvedPairs: 0, answer: null },
      { taskIndex: 1, mode: 'fill_gap', status: 'broken', raceElapsedMs: 400, firstAttemptPairs: 0, resolvedPairs: 0, answer: null },
    ]));
    expect(ticks.every((row) => !row.correct)).toBe(true);
  });

  it('ответ игрока в канал НЕ попадает', () => {
    const ticks = arenaClosedTicks(withOutcomes([
      { taskIndex: 0, mode: 'translate_build', status: 'correct', raceElapsedMs: 3_000, firstAttemptPairs: 0, resolvedPairs: 0, answer: { tokens: ['i', 'give', 'up'] } },
    ]));
    expect(JSON.stringify(ticks)).not.toContain('tokens');
    expect(ticks[0]).not.toHaveProperty('answer');
  });

  it('отрицательное время обрезается', () => {
    const ticks = arenaClosedTicks(withOutcomes([
      { taskIndex: 0, mode: 'guess_phrase', status: 'correct', raceElapsedMs: -50, firstAttemptPairs: 0, resolvedPairs: 0, answer: null },
    ]));
    expect(ticks[0].raceElapsedMs).toBe(0);
  });

  it('ни одного закрытого задания — публиковать нечего', () => {
    expect(arenaClosedTicks(withOutcomes([]))).toEqual([]);
    expect(arenaLivePublishPlan({
      publishedTaskIndexes: [], closedTicks: [], finished: false, finishPublished: false,
    })).toBeNull();
  });
});
