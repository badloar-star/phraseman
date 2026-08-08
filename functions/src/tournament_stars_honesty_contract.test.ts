/**
 * Честность начисления звёзд в турнире.
 *
 * зачем (владелец 2026-08-04, дословно: «я ответил неправильно собрал слова,
 * а оно мне засчитало 9 звёзд», «то не начисляет вообще звёзды за правильный
 * ответ, то начисляет за неправильно собранные фразы»): награда считалась не
 * по тому, ЧТО игрок прислал, а по серверному журналу тапов — а журнал по
 * построению хранит только ПРАВИЛЬНЫЕ индексы. Сверка журнала с самим собой
 * всегда давала «верно», поэтому неверно собранное поле оценивалось как
 * идеальное.
 *
 * Эти тесты фиксируют инвариант: звезда начисляется ТОЛЬКО за пару, которую
 * игрок реально сопоставил верно, и полный бонус — только за реально полное
 * поле.
 */
import {
  applySpeedMatchAttempt,
  countCorrectMatchPairs,
  scoreAnswer,
  tournamentStarsForDifficulty,
  type SpeedMatchAttemptProgress,
  type TournamentTask,
} from './tournament_core';

const SIX = 6;

/** Поле из шести пар: правильный ответ пары i — вариант i. */
const matchTask = (difficulty = 1): TournamentTask => ({
  taskId: 'task-pairs',
  mode: 'speed_match',
  kind: 'match',
  difficulty,
  verified: true,
  tags: [],
  payload: {
    prompt: 'Соедини пары',
    items: Array.from({ length: SIX }, (_, index) => ({
      prompt: `word-${index}`,
      options: Array.from({ length: SIX }, (_, option) => `translation-${option}`),
      correctIndex: index,
    })),
  },
} as unknown as TournamentTask);

describe('звёзды за пары считаются по ответу игрока, а не по журналу сервера', () => {
  it('промах по паре НЕ записывает её как собранную', () => {
    const task = matchTask();
    // Игрок тапнул по паре 0 неверный вариант 3.
    const { correct, progress } = applySpeedMatchAttempt(task, undefined, 0, 3);
    expect(correct).toBe(false);
    // Журнал не должен содержать правильный индекс — игрок его не выбирал.
    expect(progress.matchedIndexes[0]).not.toBe(0);
    expect(countCorrectMatchPairs(task, { selectedIndexes: progress.matchedIndexes })).toBe(0);
  });

  it('неверно собранное поле НЕ даёт звёзд за непопавшие пары', () => {
    const task = matchTask();
    let progress: SpeedMatchAttemptProgress | undefined;
    // Три пары верно, три — мимо.
    for (const pairIndex of [0, 1, 2]) {
      progress = applySpeedMatchAttempt(task, progress, pairIndex, pairIndex).progress;
    }
    for (const pairIndex of [3, 4, 5]) {
      progress = applySpeedMatchAttempt(task, progress, pairIndex, (pairIndex + 1) % SIX).progress;
    }
    const matchedPairs = countCorrectMatchPairs(task, { selectedIndexes: progress!.matchedIndexes });
    expect(matchedPairs).toBe(3);
    // Три верные пары = 3⭐. Бонуса за полное поле нет — поле не собрано.
    expect(scoreAnswer({
      correct: false,
      elapsedMs: 0,
      maxMs: 10_000,
      streakBefore: 0,
      isVoice: false,
      difficulty: 1,
      matchedPairs,
      totalPairs: SIX,
    })).toBe(3);
  });

  it('полностью НЕверное поле даёт ноль, а не полную награду', () => {
    const task = matchTask(3);
    let progress: SpeedMatchAttemptProgress | undefined;
    for (let pairIndex = 0; pairIndex < SIX; pairIndex += 1) {
      progress = applySpeedMatchAttempt(task, progress, pairIndex, (pairIndex + 1) % SIX).progress;
    }
    const matchedPairs = countCorrectMatchPairs(task, { selectedIndexes: progress!.matchedIndexes });
    expect(matchedPairs).toBe(0);
    expect(scoreAnswer({
      correct: false,
      elapsedMs: 0,
      maxMs: 10_000,
      streakBefore: 0,
      isVoice: false,
      difficulty: 3,
      matchedPairs,
      totalPairs: SIX,
    })).toBe(0);
  });

  it('реально собранное поле даёт полную награду со сложностью', () => {
    const task = matchTask(3);
    let progress: SpeedMatchAttemptProgress | undefined;
    for (let pairIndex = 0; pairIndex < SIX; pairIndex += 1) {
      // По дороге промахиваемся — штрафа за это быть не должно.
      progress = applySpeedMatchAttempt(task, progress, pairIndex, (pairIndex + 2) % SIX).progress;
      progress = applySpeedMatchAttempt(task, progress, pairIndex, pairIndex).progress;
    }
    const matchedPairs = countCorrectMatchPairs(task, { selectedIndexes: progress!.matchedIndexes });
    expect(matchedPairs).toBe(SIX);
    const full = tournamentStarsForDifficulty(3);
    // 6 пар + надбавка за сложность (full - база 3) = 6 + 2 = 8.
    expect(scoreAnswer({
      correct: true,
      elapsedMs: 0,
      maxMs: 10_000,
      streakBefore: 0,
      isVoice: false,
      difficulty: 3,
      matchedPairs,
      totalPairs: SIX,
    })).toBe(SIX + (full - 3));
  });

  /**
   * зачем (владелец 2026-08-04: «у меня 25 и 3 отдельно, а в таблице только
   * 25»): награда за пары считалась ДВАЖДЫ из РАЗНЫХ источников —
   * submitTaskAnswer брал сырой клиентский `selectedIndexes`, а финализация
   * раунда — серверный журнал тапов. Клиент рисовал первое число, таблица
   * хранила второе, и они расходились.
   *
   * Журнал авторитетен: он собран из проверенных сервером тапов и его нельзя
   * подделать. Клиентский массив — это лишь то, что прислало приложение.
   */
  it('клиентский ответ НЕ может выдать пару за верную в обход журнала', () => {
    const task = matchTask();
    // Игрок реально собрал одну пару, но приложение прислало «все шесть верны».
    const progress = applySpeedMatchAttempt(task, undefined, 0, 0).progress;
    const claimedByClient = Array.from({ length: SIX }, (_, index) => index);

    const fromJournal = countCorrectMatchPairs(task, { selectedIndexes: progress.matchedIndexes });
    const fromClient = countCorrectMatchPairs(task, { selectedIndexes: claimedByClient });

    expect(fromJournal).toBe(1);
    // Сырой клиентский ответ насчитал бы шесть — поэтому начисление обязано
    // идти от журнала, а не от него.
    expect(fromClient).toBe(SIX);
  });

  // Владелец 2026-08-04: каждый уникальный промах уменьшает итог задания на
  // одну звезду, а повторный тап по тому же неверному варианту идемпотентен.
  it('каждый уникальный промах уменьшает итог на одну звезду', () => {
    const base = {
      correct: true,
      elapsedMs: 0,
      maxMs: 10_000,
      streakBefore: 0,
      isVoice: false,
      difficulty: 1,
      matchedPairs: SIX,
      totalPairs: SIX,
    };
    expect(scoreAnswer({ ...base, penaltyStars: 5 }))
      .toBe(scoreAnswer({ ...base, penaltyStars: 0 }) - 5);
  });

  it('повторный тап по уже собранной паре не добавляет вторую звезду', () => {
    const task = matchTask();
    let progress = applySpeedMatchAttempt(task, undefined, 0, 0).progress;
    progress = applySpeedMatchAttempt(task, progress, 0, 0).progress;
    expect(countCorrectMatchPairs(task, { selectedIndexes: progress.matchedIndexes })).toBe(1);
  });
});
