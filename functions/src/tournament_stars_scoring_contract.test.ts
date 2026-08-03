// ════════════════════════════════════════════════════════════════════════════
// tournament_stars_scoring_contract.test.ts — страж новой шкалы звёзд.
//
// зачем 2026-08-03 (владелец: «правильный ответ должен давать 3 звезды,
// ошибочный 0 звёзд», «задания типа пары надо считать сколько юзер ответил
// правильно», «надо придумать за что начислять звёзды вместо скорости»):
// скоринг перестал зависеть от места в гонке и стал зависеть от правильности
// ответа и сложности задания. Это ДЕНЬГИ игрока — от суммы звёзд считаются
// места, доли призового банка и прогресс сезонного пропуска.
//
// Существующие контракты (rounds_and_ties, golden_economy) проверяют дележ мест
// и экономику, но НЕ проверяют саму формулу награды: они остались зелёными и
// после смены правил. Этот файл закрывает именно формулу.
//
// Главное свойство, которое здесь защищается: награда ДЕТЕРМИНИРОВАНА в момент
// ответа. Клиент рисует звёзды мгновенно (starsForDifficulty в
// app/tournament_round.tsx) и обязан совпасть с сервером — иначе игрок увидит,
// как число прыгает после ответа сети.
// ════════════════════════════════════════════════════════════════════════════
import {
  computePlacements,
  countCorrectMatchPairs,
  scoreAnswer,
  tournamentStarsForDifficulty,
  type TournamentPlayer,
  type TournamentTask,
} from './tournament_core';

/** Минимальный ScoreInput: поля времени в награде больше не участвуют. */
function answer(overrides: Partial<Parameters<typeof scoreAnswer>[0]> = {}) {
  return scoreAnswer({
    correct: true,
    elapsedMs: 0,
    maxMs: 10_000,
    streakBefore: 0,
    isVoice: false,
    ...overrides,
  });
}

function matchTask(correctIndexes: number[]): TournamentTask {
  return {
    taskId: 'task_match',
    mode: 'speed_match',
    difficulty: 1,
    payload: {
      items: correctIndexes.map((correctIndex) => ({ correctIndex })),
    },
  } as unknown as TournamentTask;
}

function player(id: string, score: number, answerTimeMs?: number): TournamentPlayer {
  return {
    id,
    name: id,
    avatar: '',
    color: '#000000',
    score,
    streak: 0,
    ...(answerTimeMs === undefined ? {} : { answerTimeMs }),
  } as TournamentPlayer;
}

describe('шкала звёзд: правильность и сложность вместо скорости', () => {
  test('верный ответ даёт 3/4/5 звёзд по сложности 1/2/3', () => {
    expect(tournamentStarsForDifficulty(1)).toBe(3);
    expect(tournamentStarsForDifficulty(2)).toBe(4);
    expect(tournamentStarsForDifficulty(3)).toBe(5);
    expect(answer({ difficulty: 1 })).toBe(3);
    expect(answer({ difficulty: 2 })).toBe(4);
    expect(answer({ difficulty: 3 })).toBe(5);
  });

  test('неверный ответ даёт 0 звёзд при любой сложности', () => {
    for (const difficulty of [1, 2, 3]) {
      expect(answer({ correct: false, difficulty })).toBe(0);
    }
  });

  test('битая или отсутствующая сложность не роняет награду в ноль', () => {
    // Старые комнаты и повреждённые документы обязаны доигрываться, а не
    // молча обнулять заработок игрока.
    expect(answer({ difficulty: undefined })).toBe(3);
    expect(answer({ difficulty: 0 })).toBe(3);
    expect(answer({ difficulty: 99 })).toBe(5);
    expect(answer({ difficulty: Number.NaN })).toBe(3);
  });

  test('МЕСТО В ГОНКЕ больше не влияет на награду', () => {
    // Ровно это делало мгновенный показ звёзд невозможным.
    const first = answer({ difficulty: 2, answerRank: 1 });
    const second = answer({ difficulty: 2, answerRank: 2 });
    const last = answer({ difficulty: 2, answerRank: 16 });
    const unknown = answer({ difficulty: 2 });
    expect(new Set([first, second, last, unknown]).size).toBe(1);
    expect(first).toBe(4);
  });

  test('время ответа не влияет на награду', () => {
    const instant = answer({ difficulty: 3, elapsedMs: 0 });
    const slow = answer({ difficulty: 3, elapsedMs: 9_999 });
    expect(instant).toBe(slow);
  });
});

describe('пары: сколько верных — столько звёзд', () => {
  const task = matchTask([0, 1, 2, 3, 4, 5]);

  test('каждая верная пара приносит минимум одну звезду', () => {
    for (let matched = 1; matched <= 6; matched += 1) {
      const stars = answer({ difficulty: 1, matchedPairs: matched, totalPairs: 6 });
      expect(stars).toBeGreaterThanOrEqual(1);
    }
  });

  test('каждая верная пара стоит ровно звезду', () => {
    // Правило владельца дословно: «1 правильно — 1 звезда».
    for (let matched = 1; matched <= 5; matched += 1) {
      expect(answer({ difficulty: 1, matchedPairs: matched, totalPairs: 6 })).toBe(matched);
    }
  });

  test('полное поле даёт звезду за пару плюс надбавку за сложность', () => {
    expect(answer({ difficulty: 1, matchedPairs: 6, totalPairs: 6 })).toBe(6);
    expect(answer({ difficulty: 2, matchedPairs: 6, totalPairs: 6 })).toBe(7);
    expect(answer({ difficulty: 3, matchedPairs: 6, totalPairs: 6 })).toBe(8);
  });

  test('доиграть поле до конца ВСЕГДА выгоднее, чем бросить', () => {
    // Класс бага, пойманный этим файлом: при делении награды на пары пять пар
    // могли стоить больше шести, и доигрывать было невыгодно.
    for (const difficulty of [1, 2, 3]) {
      const almost = answer({ difficulty, matchedPairs: 5, totalPairs: 6 });
      const complete = answer({ difficulty, matchedPairs: 6, totalPairs: 6 });
      expect(complete).toBeGreaterThan(almost);
    }
  });

  test('ни одной верной пары — ноль звёзд', () => {
    expect(answer({ difficulty: 3, matchedPairs: 0, totalPairs: 6 })).toBe(0);
  });

  test('частичный сбор больше не обнуляет задание целиком', () => {
    // Это и было требованием владельца: раньше «всё или ничего».
    expect(answer({ correct: false, difficulty: 1, matchedPairs: 4, totalPairs: 6 }))
      .toBeGreaterThan(0);
  });

  test('награда за пары не убывает при росте числа верных пар', () => {
    let previous = -1;
    for (let matched = 0; matched <= 6; matched += 1) {
      const stars = answer({ difficulty: 2, matchedPairs: matched, totalPairs: 6 });
      expect(stars).toBeGreaterThanOrEqual(previous);
      previous = stars;
    }
  });

  /**
   * зачем 2026-08-03: тест требовал вычитать штраф за ошибочные тапы из награды
   * за пары, но владелец это правило ОТМЕНИЛ («убрать штраф», см. комментарий у
   * scoreAnswer в tournament_core.ts): в поле пар действует «сколько правильно —
   * столько звёзд», а неверный тап и так не добавляет пару. Тест остался от
   * прежней шкалы и падал на верном коде — сторож обязан охранять текущее
   * правило, а не отменённое.
   *
   * Штраф продолжает жить для ОБЫЧНЫХ заданий (ветка без totalPairs) — это и
   * закреплено ниже, чтобы отмена штрафа в парах не расползлась на всё
   * остальное незаметно.
   */
  test('в поле пар штраф за ошибочные тапы НЕ вычитается (правило «сколько верных пар — столько звёзд»)', () => {
    const clean = answer({ difficulty: 1, matchedPairs: 6, totalPairs: 6 });
    const punished = answer({ difficulty: 1, matchedPairs: 6, totalPairs: 6, penaltyStars: 2 });
    expect(punished).toBe(clean);
    // Частично собранное поле тоже не наказывается за промахи по дороге.
    expect(answer({ difficulty: 1, matchedPairs: 4, totalPairs: 6, penaltyStars: 99 }))
      .toBe(answer({ difficulty: 1, matchedPairs: 4, totalPairs: 6 }));
  });

  test('в обычном задании штраф вычитается, но не уводит ниже нуля', () => {
    const clean = answer({ correct: true, difficulty: 1 });
    expect(answer({ correct: true, difficulty: 1, penaltyStars: 2 })).toBe(clean - 2);
    expect(answer({ correct: true, difficulty: 1, penaltyStars: 99 })).toBe(0);
  });

  test('поле пар не может дать больше звёзд, чем в нём пар плюс надбавка', () => {
    // Страховка от накрутки: журнал с числом пар больше реального размера поля
    // не должен превращаться в бесконечные звёзды.
    expect(answer({ difficulty: 3, matchedPairs: 999, totalPairs: 6 })).toBe(8);
  });

  test('countCorrectMatchPairs считает совпадения, а не длину ответа', () => {
    expect(countCorrectMatchPairs(task, { selectedIndexes: [0, 1, 2, 3, 4, 5] })).toBe(6);
    expect(countCorrectMatchPairs(task, { selectedIndexes: [0, 1, 9, 9, 9, 9] })).toBe(2);
    expect(countCorrectMatchPairs(task, { selectedIndexes: [] })).toBe(0);
    // Незаполненные слоты журнала приходят как -1 и не должны считаться верными.
    expect(countCorrectMatchPairs(task, { selectedIndexes: [-1, -1, -1, -1, -1, -1] })).toBe(0);
  });

  test('мусорный ответ не приносит звёзд', () => {
    expect(countCorrectMatchPairs(task, null)).toBe(0);
    expect(countCorrectMatchPairs(task, 'ok')).toBe(0);
    expect(countCorrectMatchPairs(task, { selectedIndexes: 'all' })).toBe(0);
  });
});

describe('скорость работает тай-брейком, а не наградой', () => {
  test('при равных звёздах выше тот, кто отвечал быстрее', () => {
    const { standings } = computePlacements([
      player('slow', 40, 90_000),
      player('fast', 40, 30_000),
    ]);
    expect(standings[0].id).toBe('fast');
  });

  test('тай-брейк НЕ перебивает разницу в звёздах', () => {
    // Медленный, но точный игрок обязан стоять выше быстрого и неточного.
    const { standings } = computePlacements([
      player('fast_weak', 30, 10_000),
      player('slow_strong', 45, 90_000),
    ]);
    expect(standings[0].id).toBe('slow_strong');
  });

  test('полностью равные игроки делят одно место', () => {
    const { realPlacements } = computePlacements([
      player('a', 40, 50_000),
      player('b', 40, 50_000),
      player('c', 30, 50_000),
    ]);
    const places = new Map(realPlacements.map(({ player: p, place }) => [p.id, place]));
    expect(places.get('a')).toBe(places.get('b'));
    expect(places.get('c')).toBe(3);
  });

  test('комнаты без answerTimeMs (сыграны до правки) не ломают расстановку', () => {
    const { standings, realPlacements } = computePlacements([
      player('legacy_a', 40),
      player('legacy_b', 40),
    ]);
    expect(standings).toHaveLength(2);
    // Обе строки без времени считаются равными и делят место — как раньше.
    expect(realPlacements[0].place).toBe(realPlacements[1].place);
  });

  test('сдавшийся игрок всегда ниже игравших, каким бы быстрым он ни был', () => {
    const forfeited = { ...player('quitter', 60, 1_000), forfeitedAtMs: 123 } as TournamentPlayer;
    const { standings } = computePlacements([forfeited, player('honest', 10, 90_000)]);
    expect(standings[0].id).toBe('honest');
  });
});
