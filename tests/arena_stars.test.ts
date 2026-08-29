import {
  ARENA_ANSWER_MS,
  arenaAwardStars,
  arenaBankedStars,
  arenaMatchStarCeiling,
  arenaMatchXp,
  arenaResolveDuel,
  arenaScoreRun,
  type ArenaTaskMode,
  type ArenaTaskOutcome,
} from '../modules/arena/stars';

/**
 * Правила начисления звёзд Арены. Владелец утвердил их 2026-08-12, спецификация —
 * docs/arena/STAGE2_SPEC.md. Эти тесты фиксируют ровно те решения, из-за которых
 * буквальная формулировка ломала игру: перебор в парах, блок бонуса чужой
 * ошибкой, быстрый неверный тык вместо медленного верного ответа.
 */

const MODES_10: readonly ArenaTaskMode[] = [
  'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
  'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
];
const MODES_5 = MODES_10.slice(0, 5);
const MODES_8 = MODES_10.slice(0, 8);

it('даёт длинным immersive-заданиям новые полные окна ответа', () => {
  expect(ARENA_ANSWER_MS.translate_build).toBe(25_000);
  expect(ARENA_ANSWER_MS.speed_match).toBe(30_000);
});

type AwardInput = Parameters<typeof arenaAwardStars>[0];
const award = (over: Partial<AwardInput> = {}) => arenaAwardStars({
  mode: 'guess_phrase',
  status: 'correct',
  raceElapsedMs: 3_000,
  firstAttemptPairs: 0,
  opponentRaceElapsedMs: null,
  opponentCorrect: false,
  comboRunBefore: 0,
  ...over,
});

const pairs = (firstAttemptPairs: number, comboRunBefore = 0) => arenaAwardStars({
  mode: 'speed_match',
  status: 'correct',
  raceElapsedMs: 9_000,
  firstAttemptPairs,
  opponentRaceElapsedMs: 100,
  opponentCorrect: true,
  comboRunBefore,
});

const run = (modes: readonly ArenaTaskMode[], make: (mode: ArenaTaskMode, index: number) => ArenaTaskOutcome) =>
  arenaScoreRun({ modes, own: modes.map(make), opponent: modes.map(() => null) });

const perfect = (mode: ArenaTaskMode, taskIndex: number): ArenaTaskOutcome => ({
  taskIndex, mode, status: 'correct', raceElapsedMs: 1_000,
  firstAttemptPairs: mode === 'speed_match' ? 4 : 0, resolvedPairs: 4, answer: null,
});

describe('звёзды за задание', () => {
  it('даёт три звезды, когда соперник не ответил верно', () => {
    expect(award().stars).toBe(3);
    expect(award().headline.key).toBe('starFirst');
  });

  it('даёт две звезды и называет отставание, когда соперник был быстрее', () => {
    const second = award({ opponentRaceElapsedMs: 1_200, opponentCorrect: true });
    expect(second.stars).toBe(2);
    expect(second.headline.key).toBe('starSecond');
    expect(second.headline.behindSeconds).toBe(1.8);
  });

  it('считает равное ведро в 100 мс ничьей по скорости — оба первые', () => {
    expect(award({ raceElapsedMs: 3_049, opponentRaceElapsedMs: 3_000, opponentCorrect: true }).stars).toBe(3);
    expect(award({ raceElapsedMs: 3_100, opponentRaceElapsedMs: 3_000, opponentCorrect: true }).stars).toBe(2);
  });

  it('не позволяет ошибкой соперника отобрать бонус за скорость', () => {
    // Иначе появляется приём: мгновенно ткнуть любой вариант ради блока.
    expect(award({ opponentRaceElapsedMs: 500, opponentCorrect: false }).stars).toBe(3);
  });

  it('платит комбо начиная с третьего верного подряд', () => {
    expect(award({ comboRunBefore: 1 }).stars).toBe(3);
    expect(award({ comboRunBefore: 2 }).stars).toBe(4);
    expect(award({ comboRunBefore: 3 }).stars).toBe(4);
  });

  it('обнуляет серию на ошибке и просрочке', () => {
    expect(award({ status: 'wrong', comboRunBefore: 5 }).comboRunAfter).toBe(0);
    expect(award({ status: 'timeout', comboRunBefore: 5 }).comboRunAfter).toBe(0);
    expect(award({ status: 'wrong', comboRunBefore: 5 }).stars).toBe(0);
  });

  it('сохраняет серию при техническом сбое, но не платит за него', () => {
    const broken = award({ status: 'broken', comboRunBefore: 5 });
    expect(broken.comboRunAfter).toBe(5);
    expect(broken.stars).toBe(0);
  });
});

describe('задание с парами', () => {
  it('платит по звезде за пару, угаданную с первой попытки', () => {
    expect(pairs(4).stars).toBe(4);
    expect(pairs(2).stars).toBe(2);
    expect(pairs(0).stars).toBe(0);
  });

  it('наращивает серию только на полной доске и удерживает её на трёх из четырёх', () => {
    expect(pairs(4, 2).comboRunAfter).toBe(3);
    expect(pairs(4, 2).stars).toBe(5);
    expect(pairs(3, 2).comboRunAfter).toBe(2);
    expect(pairs(2, 5).comboRunAfter).toBe(0);
  });

  it('не даёт бонуса за скорость в парах', () => {
    expect(pairs(4).firstBonus).toBe(0);
  });
});

describe('время для исхода', () => {
  it('засчитывает неверный ответ как полное окно', () => {
    // Иначе быстрый неверный тык бьёт медленный верный ответ при равенстве звёзд.
    expect(award({ raceElapsedMs: 2_500 }).tieBreakElapsedMs).toBe(2_500);
    expect(award({ status: 'wrong', raceElapsedMs: 400 }).tieBreakElapsedMs).toBe(ARENA_ANSWER_MS.guess_phrase);
  });
});

describe('прогон матча', () => {
  it('упирает идеальный матч ровно в потолок режима', () => {
    expect(arenaMatchStarCeiling(10)).toBe(40);
    expect(arenaMatchStarCeiling(5)).toBe(19);
    expect(arenaMatchStarCeiling(8)).toBe(31);
    const ranked = run(MODES_10, perfect);
    expect(ranked.matchStars).toBe(40);
    expect(ranked.rawMatchStars).toBe(40);
    expect(ranked.longestCombo).toBe(10);
    expect(run(MODES_5, perfect).matchStars).toBe(19);
    expect(run(MODES_8, perfect).matchStars).toBe(31);
  });

  it('сводит вничью матч, где оба не ответили ни разу', () => {
    const dead = run(MODES_10, (mode, taskIndex) => ({
      taskIndex, mode, status: 'timeout', raceElapsedMs: ARENA_ANSWER_MS[mode],
      firstAttemptPairs: 0, resolvedPairs: 0, answer: null,
    }));
    expect(dead.matchStars).toBe(0);
    expect(dead.tieBreakElapsedMs).toBe(MODES_10.reduce((sum, mode) => sum + ARENA_ANSWER_MS[mode], 0));
    expect(arenaResolveDuel(dead, dead).reason).toBe('draw');
  });
});

describe('исход дуэли', () => {
  it('решает звёздами, потом временем, потом ничьей', () => {
    expect(arenaResolveDuel(
      { matchStars: 24, tieBreakElapsedMs: 90_000 },
      { matchStars: 22, tieBreakElapsedMs: 10_000 },
    ).left).toBe('win');
    expect(arenaResolveDuel(
      { matchStars: 24, tieBreakElapsedMs: 50_000 },
      { matchStars: 24, tieBreakElapsedMs: 60_000 },
    ).reason).toBe('time');
    expect(arenaResolveDuel(
      { matchStars: 24, tieBreakElapsedMs: 50_000 },
      { matchStars: 24, tieBreakElapsedMs: 50_099 },
    ).reason).toBe('draw');
  });
});

describe('зачисление в кошелёк', () => {
  const banked = (over: Partial<Parameters<typeof arenaBankedStars>[0]> = {}) => arenaBankedStars({
    mode: 'ranked', matchStars: 40, taskCount: 10, eligibleMatchIndex: 0, dailyStarsBefore: 0, ...over,
  });

  // Владелец 2026-08-29: руны вернулись в быстрый матч (решение D-07 «quick —
  // только опыт» отменено). Товарищеский матч по-прежнему не начисляет.
  it('зачисляет рейтинговый и быстрый матч, но не товарищеский', () => {
    expect(banked()).toBe(40);
    expect(banked({ mode: 'quick', matchStars: 19, taskCount: 5 })).toBe(19);
    expect(banked({ mode: 'friend' })).toBe(0);
  });

  it('применяет дневное затухание и потолок в 160', () => {
    expect(banked({ eligibleMatchIndex: 4 })).toBe(20);
    expect(banked({ eligibleMatchIndex: 6 })).toBe(0);
    expect(banked({ dailyStarsBefore: 150 })).toBe(10);
    const fourFull = [0, 1, 2, 3].reduce(
      (sum, index) => sum + banked({ eligibleMatchIndex: index, dailyStarsBefore: sum }),
      0,
    );
    expect(fourFull).toBe(160);
  });
});

describe('опыт за матч', () => {
  it('платит и проигравшему, но только за доигранный матч', () => {
    expect(arenaMatchXp({ mode: 'quick', matchStars: 19, outcome: 'win', completed: true })).toBe(125);
    expect(arenaMatchXp({ mode: 'quick', matchStars: 10, outcome: 'loss', completed: true })).toBe(60);
    expect(arenaMatchXp({ mode: 'quick', matchStars: 19, outcome: 'win', completed: false })).toBe(0);
  });
});
