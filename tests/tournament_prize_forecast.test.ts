// ═══════════════════════════════════════════════════════════════════════════
// Контракт прогноза призов в лобби.
//
// зачем (владелец 2026-08-03): цифра под местом — ОБЕЩАНИЕ выплаты. Главное
// требование: показанное число никогда не должно быть БОЛЬШЕ того, что сервер
// реально заплатит, иначе игрок в конце турнира почувствует себя обманутым.
// Эти тесты сверяют клиентский прогноз с серверной формулой напрямую.
// ═══════════════════════════════════════════════════════════════════════════

import {
  tournamentPrizeForecast,
  tournamentPrizePoolForecast,
} from '../app/tournament_prize_forecast';
import {
  DEFAULT_TOURNAMENT_ECONOMY,
  splitByShares,
  tournamentPot,
} from '../functions/src/tournament_economy';

describe('прогноз призов в лобби', () => {
  it('пустой банк не обещает наград', () => {
    expect(tournamentPrizePoolForecast(0)).toBe(0);
    expect(tournamentPrizeForecast(0)).toEqual([0, 0, 0]);
  });

  it('мусорные входные значения не ломают показ', () => {
    for (const value of [-100, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(tournamentPrizePoolForecast(value)).toBe(0);
      expect(tournamentPrizeForecast(value)).toEqual([0, 0, 0]);
    }
  });

  it('призовой фонд совпадает с серверным toPrizes при взносе 5', () => {
    const economy = { ...DEFAULT_TOURNAMENT_ECONOMY, entryGems: 5, botEntryGems: 5 };
    // Полная комната: 16 участников по 5 жемчужин.
    const pot = tournamentPot(1, 15, economy);
    expect(pot.total).toBe(80);
    expect(tournamentPrizePoolForecast(pot.total)).toBe(pot.toPrizes);
  });

  it('призовой фонд совпадает с серверным при ЛЮБОМ размере комнаты', () => {
    const economy = { ...DEFAULT_TOURNAMENT_ECONOMY, entryGems: 5, botEntryGems: 5 };
    for (let participants = 0; participants <= 16; participants += 1) {
      const pot = tournamentPot(participants, 0, economy);
      expect(tournamentPrizePoolForecast(pot.total)).toBe(pot.toPrizes);
    }
  });

  /**
   * Ключевой контракт владельца: обещали не больше, чем заплатим.
   * Сервер отдаёт остаток от округления ПЕРВОМУ месту, поэтому прогноз для
   * первого места может оказаться меньше факта — это допустимо (приятный
   * сюрприз), а вот больше — нет.
   */
  it('ни одно место не обещает больше, чем реально заплатит сервер', () => {
    for (let potTotal = 0; potTotal <= 400; potTotal += 1) {
      const forecast = tournamentPrizeForecast(potTotal);
      const prizePool = tournamentPrizePoolForecast(potTotal);
      const actual = splitByShares(prizePool, [...DEFAULT_TOURNAMENT_ECONOMY.prizeShares]);
      for (let place = 0; place < 3; place += 1) {
        expect(forecast[place]).toBeLessThanOrEqual(actual[place]);
      }
    }
  });

  it('сумма показанных мест не превышает призовой фонд', () => {
    for (let potTotal = 0; potTotal <= 400; potTotal += 1) {
      const forecast = tournamentPrizeForecast(potTotal);
      const sum = forecast[0] + forecast[1] + forecast[2];
      expect(sum).toBeLessThanOrEqual(tournamentPrizePoolForecast(potTotal));
    }
  });

  it('места идут по убыванию — первое всегда не меньше второго и третьего', () => {
    for (const potTotal of [10, 25, 80, 160, 400]) {
      const [first, second, third] = tournamentPrizeForecast(potTotal);
      expect(first).toBeGreaterThanOrEqual(second);
      expect(second).toBeGreaterThanOrEqual(third);
    }
  });

  it('полная комната при взносе 5 показывает 38 / 16 / 9', () => {
    // Банк 80 → в недельный банк 16 → призёрам 64 → 38.4 / 16 / 9.6 вниз.
    expect(tournamentPrizeForecast(80)).toEqual([38, 16, 9]);
  });

  it('банк растёт — прогноз каждого места не убывает', () => {
    let previous = tournamentPrizeForecast(0);
    for (let potTotal = 1; potTotal <= 200; potTotal += 1) {
      const current = tournamentPrizeForecast(potTotal);
      for (let place = 0; place < 3; place += 1) {
        expect(current[place]).toBeGreaterThanOrEqual(previous[place]);
      }
      previous = current;
    }
  });
});
