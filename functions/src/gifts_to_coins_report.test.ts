/**
 * D51/D53 (Q12, 2026-10-01): строка-итог миграции «Подарки → монеты».
 * Сервер принимает только таблицу medium.v2 (без жемчуга ×10, энергия 0) и
 * знает новый источник season_pass; всё остальное — invalid-argument.
 */
jest.mock('firebase-admin', () => ({ firestore: jest.fn() }));
jest.mock('./auth_identity', () => ({ resolveStableUidForAuth: jest.fn() }));

import { parseGiftsToCoinsReport } from './gifts_to_coins_report';

const valid = {
  ownerStableId: 'stable-A',
  migrationVersion: 'g2c.v1',
  tableVersion: 'medium.v2',
  run: 1,
  counts: { spin_credit: 3, spin_prize: 1, paid_spin: 1, level_gift: 2, daily_journey: 1, season_pass: 2, plus_days: 1 },
  expired: { spin_prize: 0, level_gift: 1, season_pass: 1 },
  cappedSpins: 0,
  totalCoins: 3280,
  corruptSources: ['season_pass'],
  clientDoneAtMs: 1_800_000_000_000,
};

describe('parseGiftsToCoinsReport', () => {
  it('принимает строку medium.v2 с источником season_pass', () => {
    const row = parseGiftsToCoinsReport(valid, 'stable-A');
    expect(row).toMatchObject({ stableUid: 'stable-A', tableVersion: 'medium.v2', totalCoins: 3280 });
    expect(row.counts.season_pass).toBe(2);
    expect(row.expired.season_pass).toBe(1);
  });

  it('отклоняет старую таблицу medium.v1 (жемчуг ×10, энергия 50)', () => {
    expect(() => parseGiftsToCoinsReport({ ...valid, tableVersion: 'medium.v1' }, 'stable-A'))
      .toThrow('gifts_to_coins_report_version_invalid');
  });

  it('отклоняет неизвестные счётчики, некруглую сумму и чужой источник порчи', () => {
    expect(() => parseGiftsToCoinsReport({ ...valid, counts: { ...valid.counts, pearls: 1 } }, 'stable-A'))
      .toThrow('gifts_to_coins_report_counts_invalid');
    expect(() => parseGiftsToCoinsReport({ ...valid, totalCoins: 3281 }, 'stable-A'))
      .toThrow('gifts_to_coins_report_total_invalid');
    expect(() => parseGiftsToCoinsReport({ ...valid, corruptSources: ['wallet'] }, 'stable-A'))
      .toThrow('gifts_to_coins_report_corrupt_sources_invalid');
  });
});
