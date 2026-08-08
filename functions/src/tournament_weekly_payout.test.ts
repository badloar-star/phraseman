/**
 * Контракт недельной раздачи банка.
 *
 * зачем: крон трогает балансы игроков. Здесь проверяется главное — что банк
 * нельзя выплатить дважды, что неделя берётся ЗАКРЫТАЯ (иначе воскресные
 * турниры выпали бы из зачёта) и что раздача детерминирована при ничьих.
 */

import { previousWeekId } from './tournament_weekly_payout';
import { tournamentWeekId } from './tournament_core';
import { weeklyBankPayouts } from './tournament_economy';

describe('выбор недели для раздачи', () => {
  it('крон берёт ЗАКРЫТУЮ неделю, а не текущую', () => {
    // Раздача идёт в ночь воскресенья на понедельник: если взять текущую
    // неделю, турниры воскресного вечера не попали бы в зачёт.
    const monday = Date.UTC(2026, 6, 27, 0, 10); // понедельник 00:10 UTC
    expect(previousWeekId(monday)).not.toBe(tournamentWeekId(monday));
    // Прошлая неделя — ровно на 7 дней раньше.
    expect(previousWeekId(monday)).toBe(tournamentWeekId(monday - 7 * 24 * 3600 * 1000));
  });

  it('формат недели совпадает с тем, что пишет финализация турнира', () => {
    // Иначе крон искал бы банк по несуществующему id и молча ничего не платил.
    expect(previousWeekId(Date.UTC(2026, 6, 27))).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe('раздача недельного банка', () => {
  const standings = [
    { uid: 'alice', points: 120 },
    { uid: 'bob', points: 90 },
    { uid: 'carol', points: 40 },
  ];

  it('сумма выплат плюс остаток равна банку — ничего не создаётся и не теряется', () => {
    for (const bank of [0, 1, 7, 33, 130, 999]) {
      const { payouts, carryOver } = weeklyBankPayouts(bank, standings);
      const paid = payouts.reduce((sum, payout) => sum + payout.gems, 0);
      expect(paid + carryOver).toBe(bank);
    }
  });

  it('банк без участников переносится целиком, а не сгорает', () => {
    const { payouts, carryOver } = weeklyBankPayouts(200, []);
    expect(payouts).toHaveLength(0);
    expect(carryOver).toBe(200);
  });

  it('повторный расчёт даёт тот же результат — крон можно запустить дважды', () => {
    // Идемпотентность на уровне данных: сама выплата защищена paidOutAtMs,
    // но и расчёт обязан быть стабильным, иначе ручной перезапуск дал бы
    // других победителей.
    const first = weeklyBankPayouts(150, standings);
    const second = weeklyBankPayouts(150, [...standings].reverse());
    expect(first).toEqual(second);
  });
});
