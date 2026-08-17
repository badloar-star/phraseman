// ═══════════════════════════════════════════════════════════════════════════
// league_zero_points_demotion.test.ts — клиентское зеркало серверной регрессии
// functions/src/league_finalize_zero_points.test.ts.
//
// зачем (владелец, 2026-08-17): скриншот «27 место из 29 — Остаёшься в лиге».
// В комнате играли трое, остальные 26 имели ровно 0 очков. Competition ranking
// считает «строго больше/строго меньше», поэтому для игрока с нулём строго
// меньше нет никого (bottomRank=1), а строго больше — только трое играющих
// (rank=4), то есть он попадал в зону ПОВЫШЕНИЯ и ветка `&& !promoted` гасила
// понижение. Понижение не наступало НИКОГДА.
//
// Клиент и сервер обязаны совпадать: иначе бейдж модалки разойдётся с
// авторитетным итогом крона.
// ═══════════════════════════════════════════════════════════════════════════

jest.mock('../app/firestore_leagues', () => ({
  getOrCreateLeagueGroup: jest.fn(async () => null),
  updateMyGroupPoints: jest.fn(async () => undefined),
}));

jest.mock('../app/hall_of_fame_utils', () => ({
  loadWeekLeaderboard: jest.fn(async () => []),
  getLastWeekFinalPoints: jest.fn(async () => null),
}));

import {
  calculateResult,
  getWeekId,
  type GroupMember,
  type LeagueState,
} from '../app/league_engine';

/** Комната со скриншота: трое играющих, хвост из нулей, я — один из нулей. */
const screenshotGroup = (): GroupMember[] => {
  const group: GroupMember[] = [
    { uid: 'top1', name: 'первый_снег', points: 12_565, isMe: false },
    { uid: 'top2', name: 'Зорька', points: 12_297, isMe: false },
    { uid: 'top3', name: 'сонное_царство', points: 11_281, isMe: false },
    { uid: 'me', name: 'Я', points: 0, isMe: true },
  ];
  for (let i = 0; i < 25; i++) {
    group.push({ uid: `zero_${i}`, name: `zero_${i}`, points: 0, isMe: false });
  }
  return group;
};

const stateWith = (group: GroupMember[], leagueId: number): LeagueState => ({
  leagueId,
  weekId: getWeekId(),
  group,
});

describe('понижение при массовых нулях (репорт владельца 2026-08-17)', () => {
  it('ноль очков в комнате с играющими = понижение, а не «остаёшься»', () => {
    const result = calculateResult(stateWith(screenshotGroup(), 2), 0);

    expect(result.demoted).toBe(true);
    expect(result.promoted).toBe(false);
    expect(result.newLeagueId).toBe(1);
  });

  it('ноль очков никогда не даёт повышения, даже если играющих меньше зоны', () => {
    const result = calculateResult(stateWith(screenshotGroup(), 2), 0);

    expect(result.promoted).toBe(false);
  });

  it('в самой нижней лиге ноль очков не уводит ниже нуля', () => {
    const result = calculateResult(stateWith(screenshotGroup(), 0), 0);

    expect(result.demoted).toBe(false);
    expect(result.newLeagueId).toBe(0);
  });

  it('комната, где не играл НИКТО, никого не понижает', () => {
    const group: GroupMember[] = [{ uid: 'me', name: 'Я', points: 0, isMe: true }];
    for (let i = 0; i < 9; i++) {
      group.push({ uid: `z${i}`, name: `z${i}`, points: 0, isMe: false });
    }

    const result = calculateResult(stateWith(group, 3), 0);

    expect(result.demoted).toBe(false);
    expect(result.promoted).toBe(false);
    expect(result.newLeagueId).toBe(3);
  });

  it('играющий в топе по-прежнему повышается', () => {
    const group = screenshotGroup().map((m) =>
      m.isMe ? { ...m, points: 20_000 } : m,
    );

    const result = calculateResult(stateWith(group, 2), 20_000);

    expect(result.promoted).toBe(true);
    expect(result.demoted).toBe(false);
    expect(result.newLeagueId).toBe(3);
  });

  it('играющий в самом низу среди играющих понижается как раньше', () => {
    const group: GroupMember[] = [
      { uid: 'a', name: 'a', points: 900, isMe: false },
      { uid: 'b', name: 'b', points: 600, isMe: false },
      { uid: 'c', name: 'c', points: 300, isMe: false },
      { uid: 'me', name: 'Я', points: 10, isMe: true },
    ];

    const result = calculateResult(stateWith(group, 2), 10);

    expect(result.demoted).toBe(true);
    expect(result.newLeagueId).toBe(1);
  });
});
