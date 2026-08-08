// ════════════════════════════════════════════════════════════════════════════
// season_pass_stars_balance.test.ts — страж калибровки сезонной дорожки.
//
// зачем 2026-08-03 (владелец: «сезон очки капали не за опыт а за звёзды и
// просчитать систему чтобы было сложно но реализуемо»): шкала уровней — это
// БАЛАНС, а не константа «как получилось». Без стража любой будущий рефактор
// (или подгонка чисел «на глаз») тихо превратит сезон либо в недостижимый, либо
// в проходимый за неделю, и заметят это только игроки.
//
// Тест фиксирует не сами числа, а СВОЙСТВА, из которых они выведены:
// достижимость за квартал при заявленном темпе и невозможность закрыть сезон
// мимоходом.
// ════════════════════════════════════════════════════════════════════════════
import {
  computeSeasonPassProgress,
  SEASON_PASS_LEVELS,
  SEASON_PASS_TOTAL_STARS,
  seasonPassLevelCostStars,
  seasonPassStarsToUnlockLevel,
} from '../app/season_pass_model';

/**
 * Реальный результат крепкого игрока за турнир.
 *
 * Потолок — 64⭐ (16 заданий, сложности 1/1-2/2/3, два поля пар). Идеальных
 * турниров не бывает: ошибки, пропуски по таймеру, неполные поля пар. 45⭐ —
 * консервативная рабочая оценка, на ней и построена калибровка.
 */
const REALISTIC_STARS_PER_TOURNAMENT = 45;
const SEASON_DAYS = 90;

describe('калибровка сезонной дорожки в звёздах', () => {
  test('полное прохождение стоит ровно столько, сколько заявлено', () => {
    expect(SEASON_PASS_TOTAL_STARS).toBe(3600);
    // Сумма по уровням обязана сходиться с константой: расхождение означало бы,
    // что витрина обещает одно, а дорожка требует другое.
    let sum = 0;
    for (let level = 1; level <= SEASON_PASS_LEVELS; level += 1) {
      sum += seasonPassLevelCostStars(level);
    }
    expect(sum).toBe(SEASON_PASS_TOTAL_STARS);
  });

  test('сезон закрывается за квартал при одном турнире в день — «реализуемо»', () => {
    const daysNeeded = SEASON_PASS_TOTAL_STARS / REALISTIC_STARS_PER_TOURNAMENT;
    // Влезает в квартал…
    expect(daysNeeded).toBeLessThanOrEqual(SEASON_DAYS);
    // …и оставляет запас на пропущенные дни, но не превращается в прогулку.
    expect(SEASON_DAYS - daysNeeded).toBeGreaterThanOrEqual(7);
    expect(SEASON_DAYS - daysNeeded).toBeLessThanOrEqual(25);
  });

  test('сезон нельзя закрыть мимоходом — «сложно»', () => {
    // Игрок, заходящий раз в три дня, за квартал сезон НЕ закрывает.
    const casualStars = Math.floor(SEASON_DAYS / 3) * REALISTIC_STARS_PER_TOURNAMENT;
    expect(computeSeasonPassProgress('2026-Q3', casualStars).level).toBeLessThan(SEASON_PASS_LEVELS);
  });

  test('первые уровни дешевле поздних — быстрая вкатка', () => {
    expect(seasonPassLevelCostStars(1)).toBeLessThan(seasonPassLevelCostStars(SEASON_PASS_LEVELS));
    // Первые десять уровней укладываются примерно в неделю игры.
    let earlyBlock = 0;
    for (let level = 1; level <= 10; level += 1) earlyBlock += seasonPassLevelCostStars(level);
    expect(earlyBlock / REALISTIC_STARS_PER_TOURNAMENT).toBeLessThanOrEqual(10);
  });

  test('один идеальный турнир не перепрыгивает через несколько уровней сразу', () => {
    // Иначе награды сыпались бы пачкой и обесценивали дорожку.
    const perfectTournament = 64;
    expect(computeSeasonPassProgress('2026-Q3', perfectTournament).level).toBeLessThanOrEqual(2);
  });

  test('прогресс внутри уровня считается от звёзд, а не от опыта', () => {
    const progress = computeSeasonPassProgress('2026-Q3', seasonPassLevelCostStars(1) + 10);
    expect(progress.level).toBe(1);
    expect(progress.intoLevelStars).toBe(10);
    expect(progress.levelCostStars).toBe(seasonPassLevelCostStars(2));
    expect(progress.totalStars).toBe(seasonPassLevelCostStars(1) + 10);
  });

  test('дорожка не уходит выше последнего уровня даже при огромном счёте', () => {
    const progress = computeSeasonPassProgress('2026-Q3', SEASON_PASS_TOTAL_STARS * 10);
    expect(progress.level).toBe(SEASON_PASS_LEVELS);
    expect(progress.intoLevelStars).toBe(0);
    expect(progress.levelCostStars).toBe(0);
  });
});

/**
 * зачем 2026-08-03 (владелец: «возле каждого подарка показывай сколько звёзд
 * надо набрать чтобы он открылся»): порог у карточки — обещание игроку. Если он
 * разойдётся с реальной шкалой открытия уровней, экран будет показывать «350⭐»
 * там, где подарок открывается на 415⭐ — прямая ложь в интерфейсе. Поэтому
 * порог проверяется не на равенство хардкоду, а на СОГЛАСОВАННОСТЬ с
 * computeSeasonPassProgress: ровно на пороге уровень обязан открыться, на
 * звезду меньше — нет.
 */
describe('порог звёзд у карточки подарка', () => {
  test('ровно на пороге уровень открыт, на звезду меньше — ещё нет', () => {
    for (let level = 1; level <= SEASON_PASS_LEVELS; level += 1) {
      const threshold = seasonPassStarsToUnlockLevel(level);
      expect(computeSeasonPassProgress('2026-Q3', threshold).level).toBeGreaterThanOrEqual(level);
      expect(computeSeasonPassProgress('2026-Q3', threshold - 1).level).toBeLessThan(level);
    }
  });

  test('порог растёт вместе с уровнем и не даёт «бесплатных» ступеней', () => {
    for (let level = 2; level <= SEASON_PASS_LEVELS; level += 1) {
      expect(seasonPassStarsToUnlockLevel(level)).toBeGreaterThan(seasonPassStarsToUnlockLevel(level - 1));
    }
  });

  test('последний уровень стоит ровно полную цену сезона', () => {
    expect(seasonPassStarsToUnlockLevel(SEASON_PASS_LEVELS)).toBe(SEASON_PASS_TOTAL_STARS);
    // Нулевой/отрицательный уровень не должен давать мусорное число на экране.
    expect(seasonPassStarsToUnlockLevel(0)).toBe(0);
    expect(seasonPassStarsToUnlockLevel(-5)).toBe(0);
  });
});
