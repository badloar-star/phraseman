/**
 * Контракт экономики турниров.
 *
 * зачем: здесь считаются ДЕНЬГИ игроков. Ошибка на единицу — это либо игра
 * печатает жемчужины из воздуха, либо у игроков пропадает то, что они внесли.
 * В проекте уже было три инцидента с пропажей валюты, поэтому каждая формула
 * проверяется на сохранение суммы, а не «на глаз».
 */

import {
  DEFAULT_TOURNAMENT_ECONOMY,
  normalizeTournamentEconomy,
  splitByShares,
  tournamentPayouts,
  tournamentPot,
  weeklyBankPayouts,
} from './tournament_economy';

describe('банк турнира', () => {
  it('полная комната по умолчанию: 16 участников × 3 = 48', () => {
    const pot = tournamentPot(8, 8);
    expect(pot.total).toBe(48);
    // 20% в недельный банк, остальное призёрам.
    expect(pot.toWeeklyBank).toBe(9);
    expect(pot.toPrizes).toBe(39);
    // Ничего не потеряно и не создано.
    expect(pot.toWeeklyBank + pot.toPrizes).toBe(pot.total);
  });

  it('боты держат банк достойным при слабой явке', () => {
    // Решение владельца: иначе при 8 живых приз выглядел бы бедно.
    const withBots = tournamentPot(8, 8);
    const withoutBots = tournamentPot(8, 0);
    expect(withBots.total).toBeGreaterThan(withoutBots.total);
  });

  it('отрицательные и дробные числа игроков не ломают банк', () => {
    expect(tournamentPot(-5, -5).total).toBe(0);
    expect(tournamentPot(2.9, 0).total).toBe(6);
  });
});

describe('дележ по долям', () => {
  it('сумма выплат ВСЕГДА равна исходной — ни потерь, ни печати', () => {
    // Главная защита: наивное округление по каждой доле даёт расхождение.
    for (let amount = 0; amount <= 200; amount += 1) {
      const parts = splitByShares(amount, [...DEFAULT_TOURNAMENT_ECONOMY.prizeShares]);
      expect(parts.reduce((sum, part) => sum + part, 0)).toBe(amount);
      expect(parts.every((part) => part >= 0)).toBe(true);
    }
  });

  it('остаток округления достаётся первому месту', () => {
    // 10 по 60/25/15 = 6 / 2.5 / 1.5 → 7 / 2 / 1 (остаток 1 победителю).
    expect(splitByShares(10, [0.6, 0.25, 0.15])).toEqual([7, 2, 1]);
  });

  it('ноль делится в нули, а не в отрицательные', () => {
    expect(splitByShares(0, [0.6, 0.25, 0.15])).toEqual([0, 0, 0]);
  });
});

describe('выплаты призёрам турнира', () => {
  it('полная комната: 25 / 9 / 5 при призовом фонде 39', () => {
    // 16 участников × 3 = 48; 20% (9) в недельный банк; 39 делятся 60/25/15
    // → 23/9/5, остаток округления (2) достаётся победителю.
    const pot = tournamentPot(8, 8);
    const { payouts, unclaimedToWeekly } = tournamentPayouts(pot, 3);
    expect(payouts.map((payout) => payout.gems)).toEqual([25, 9, 5]);
    expect(unclaimedToWeekly).toBe(0);
    // Победа окупает вход многократно — иначе играть незачем.
    expect(payouts[0].gems).toBeGreaterThan(DEFAULT_TOURNAMENT_ECONOMY.entryGems * 5);
    // Третье место окупает вход — иначе обидно.
    expect(payouts[2].gems).toBeGreaterThanOrEqual(DEFAULT_TOURNAMENT_ECONOMY.entryGems);
  });

  it('призёров меньше трёх — неразыгранное уходит в недельный банк, не пропадает', () => {
    const pot = tournamentPot(8, 8);
    const { payouts, unclaimedToWeekly } = tournamentPayouts(pot, 1);
    expect(payouts).toHaveLength(1);
    const claimed = payouts.reduce((sum, payout) => sum + payout.gems, 0);
    expect(claimed + unclaimedToWeekly).toBe(pot.toPrizes);
  });

  it('нет живых призёров — весь призовой фонд переходит в недельный банк', () => {
    const pot = tournamentPot(8, 8);
    const { payouts, unclaimedToWeekly } = tournamentPayouts(pot, 0);
    expect(payouts).toHaveLength(0);
    expect(unclaimedToWeekly).toBe(pot.toPrizes);
  });
});

describe('недельный банк', () => {
  const standings = [
    { uid: 'alice', points: 120 },
    { uid: 'bob', points: 90 },
    { uid: 'carol', points: 40 },
    { uid: 'dave', points: 10 },
  ];

  it('делится между тройкой лучших ПО ОЧКАМ, сумма сходится', () => {
    const { payouts, carryOver } = weeklyBankPayouts(200, standings);
    expect(payouts.map((payout) => payout.uid)).toEqual(['alice', 'bob', 'carol']);
    expect(payouts.map((payout) => payout.place)).toEqual([1, 2, 3]);
    const claimed = payouts.reduce((sum, payout) => sum + payout.gems, 0);
    expect(claimed + carryOver).toBe(200);
    expect(carryOver).toBe(0);
  });

  it('игроки без очков не получают ничего', () => {
    const { payouts } = weeklyBankPayouts(100, [
      { uid: 'alice', points: 10 },
      { uid: 'ghost', points: 0 },
    ]);
    expect(payouts.map((payout) => payout.uid)).toEqual(['alice']);
  });

  it('ничья решается детерминированно — повторный запуск не меняет победителей', () => {
    // Крон может сработать дважды; результат обязан совпасть.
    const tied = [
      { uid: 'zoe', points: 50 },
      { uid: 'adam', points: 50 },
      { uid: 'mike', points: 50 },
    ];
    const first = weeklyBankPayouts(100, tied);
    const second = weeklyBankPayouts(100, [...tied].reverse());
    expect(first.payouts).toEqual(second.payouts);
    expect(first.payouts[0].uid).toBe('adam');
  });

  it('некому раздать — банк переносится, а не сгорает', () => {
    const { payouts, carryOver } = weeklyBankPayouts(150, []);
    expect(payouts).toHaveLength(0);
    expect(carryOver).toBe(150);
  });

  it('меньше трёх участников — остаток переносится на следующую неделю', () => {
    const { payouts, carryOver } = weeklyBankPayouts(100, [{ uid: 'solo', points: 5 }]);
    expect(payouts).toHaveLength(1);
    expect(payouts[0].gems + carryOver).toBe(100);
  });
});

describe('настройки экономики из админки', () => {
  it('мусор и пустота откатываются к умолчанию, турнир не падает', () => {
    expect(normalizeTournamentEconomy(null)).toEqual(DEFAULT_TOURNAMENT_ECONOMY);
    expect(normalizeTournamentEconomy('строка')).toEqual(DEFAULT_TOURNAMENT_ECONOMY);
    expect(normalizeTournamentEconomy({ entryGems: 'бесплатно' }).entryGems)
      .toBe(DEFAULT_TOURNAMENT_ECONOMY.entryGems);
  });

  it('доли, не дающие в сумме единицу, отклоняются целиком', () => {
    // Иначе часть призового фонда молча «протекала» бы мимо игроков.
    expect(normalizeTournamentEconomy({ prizeShares: [0.5, 0.3, 0.1] }).prizeShares)
      .toEqual(DEFAULT_TOURNAMENT_ECONOMY.prizeShares);
    expect(normalizeTournamentEconomy({ prizeShares: [0.7, 0.2, 0.1] }).prizeShares)
      .toEqual([0.7, 0.2, 0.1]);
  });

  it('опечатка в цене входа не разоряет игроков', () => {
    expect(normalizeTournamentEconomy({ entryGems: 100000 }).entryGems)
      .toBe(DEFAULT_TOURNAMENT_ECONOMY.entryGems);
    // зачем 2026-07-27: владелец убрал требование на жемчужины — ноль это
    // законная настройка «бесплатный вход», а не опечатка, поэтому он больше
    // не откатывается на умолчание. Отрицательное значение — по-прежнему мусор.
    expect(normalizeTournamentEconomy({ entryGems: 0 }).entryGems).toBe(0);
    expect(normalizeTournamentEconomy({ entryGems: -5 }).entryGems)
      .toBe(DEFAULT_TOURNAMENT_ECONOMY.entryGems);
    expect(normalizeTournamentEconomy({ entryGems: 10 }).entryGems).toBe(10);
  });

  it('доля недельного банка ограничена половиной', () => {
    expect(normalizeTournamentEconomy({ weeklyBankRate: 0.9 }).weeklyBankRate)
      .toBe(DEFAULT_TOURNAMENT_ECONOMY.weeklyBankRate);
    expect(normalizeTournamentEconomy({ weeklyBankRate: 0.3 }).weeklyBankRate).toBe(0.3);
    // Ноль допустим: весь банк уходит в дневные призы.
    expect(normalizeTournamentEconomy({ weeklyBankRate: 0 }).weeklyBankRate).toBe(0);
  });

  it('взнос бота можно обнулить — игра перестаёт печатать жемчужины', () => {
    const config = normalizeTournamentEconomy({ botEntryGems: 0 });
    expect(config.botEntryGems).toBe(0);
    expect(tournamentPot(8, 8, config).total).toBe(24);
  });
});
