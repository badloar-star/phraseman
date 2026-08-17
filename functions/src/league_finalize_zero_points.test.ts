// ═══════════════════════════════════════════════════════════════════════════
// league_finalize_zero_points.test.ts — регрессия «понижение не происходит вообще».
//
// зачем (владелец, 2026-08-17): на скриншоте комната 29 человек, владелец на
// 27 месте — и модалка пишет «Остаёшься в лиге». Причина: competition ranking
// считает «строго больше / строго меньше», а хвост комнаты — сплошные нули
// (неактивные + жители без прироста). Для игрока с 0 очков строго меньше него
// нет НИКОГО → bottomRank = 1, а строго больше — только 3 играющих → rank = 4,
// то есть он попадал в зону ПОВЫШЕНИЯ и demoted гасился веткой `&& !promoted`.
//
// Правило владельца (2026-08-17): понижаются нижние 15% И ВСЕ с нулём очков;
// повышение требует хотя бы одного набранного очка.
// ═══════════════════════════════════════════════════════════════════════════

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(),
}));

jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: jest.fn((_options, handler) => handler),
}));

import { computeGroupResults } from './league_finalize_cron';

const rankMode = { enabled: false, threshold: 1000 };

/** Комната со скриншота: трое играющих и хвост из нулей. */
function screenshotRoom(): Record<string, { uid: string; points: number }> {
  const members: Record<string, { uid: string; points: number }> = {
    top1: { uid: 'top1', points: 12_565 },
    top2: { uid: 'top2', points: 12_297 },
    top3: { uid: 'top3', points: 11_281 },
  };
  for (let i = 0; i < 26; i++) {
    members[`zero_${i}`] = { uid: `zero_${i}`, points: 0 };
  }
  return members;
}

describe('понижение при массовых нулях (репорт владельца 2026-08-17)', () => {
  it('игрок с нулём очков понижается, а не «остаётся в лиге»', () => {
    const results = computeGroupResults(screenshotRoom(), 2, rankMode);

    expect(results.zero_0).toMatchObject({ promoted: false, demoted: true });
    expect(results.zero_0.newLeagueId).toBe(1);
  });

  it('ноль очков НИКОГДА не даёт повышения, даже если играющих меньше зоны', () => {
    const results = computeGroupResults(screenshotRoom(), 2, rankMode);

    for (let i = 0; i < 26; i++) {
      expect(results[`zero_${i}`].promoted).toBe(false);
    }
  });

  it('играющие в топе по-прежнему повышаются', () => {
    const results = computeGroupResults(screenshotRoom(), 2, rankMode);

    expect(results.top1).toMatchObject({ rank: 1, promoted: true, demoted: false });
    expect(results.top2).toMatchObject({ rank: 2, promoted: true, demoted: false });
  });

  it('играющий вне зоны вылета не понижается, даже когда вокруг нули', () => {
    const results = computeGroupResults(screenshotRoom(), 2, rankMode);

    expect(results.top3).toMatchObject({ promoted: true, demoted: false });
  });

  it('в самой нижней лиге ноль очков не уводит ниже нуля', () => {
    const results = computeGroupResults(screenshotRoom(), 0, rankMode);

    expect(results.zero_0).toMatchObject({ demoted: false, newLeagueId: 0 });
  });

  it('комната, где НИКТО не играл, никого не понижает — это не соревнование', () => {
    const members: Record<string, { uid: string; points: number }> = {};
    for (let i = 0; i < 10; i++) members[`z${i}`] = { uid: `z${i}`, points: 0 };

    const results = computeGroupResults(members, 3, rankMode);

    for (let i = 0; i < 10; i++) {
      expect(results[`z${i}`]).toMatchObject({ promoted: false, demoted: false });
    }
  });

  it('нижние 15% с ненулевыми очками понижаются как раньше', () => {
    const results = computeGroupResults({
      a: { uid: 'a', points: 100 },
      b: { uid: 'b', points: 50 },
      c: { uid: 'c', points: 10 },
      d: { uid: 'd', points: 5 },
    }, 2, rankMode);

    expect(results.d).toMatchObject({ promoted: false, demoted: true });
  });

  it('жители с нулём очков не получают итогов вовсе', () => {
    const members = {
      ...screenshotRoom(),
      res_00: { uid: 'res_00', points: 0 },
    };

    const results = computeGroupResults(members, 2, rankMode);

    expect(results.res_00).toBeUndefined();
  });
});
