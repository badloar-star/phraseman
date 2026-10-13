// зачем (владелец 13.10, «аватары игроков = монеты рангов»): ранг монеты живого игрока едет в документ комнаты той же записью,
// что ступени (0 новых чтений); отдельная запись — только когда ранг сменился без новых ступеней; мусор от клиента не пишется.
import { spireCoinRankOrNull, spireMemberStepsUpdate } from './spire_groups';

const NEXT = { steps: 5, reachedAtMs: 1000, totalMs: 2000 };

describe('spireCoinRankOrNull', () => {
  it('берёт только целое 0…19', () => {
    expect(spireCoinRankOrNull(0)).toBe(0);
    expect(spireCoinRankOrNull(19)).toBe(19);
    for (const bad of [-1, 20, 3.5, '4', null, undefined, NaN]) expect(spireCoinRankOrNull(bad)).toBeNull();
  });
});

describe('spireMemberStepsUpdate + ранг монеты', () => {
  it('новые ступени — ранг едет той же записью', () => {
    const patch = spireMemberStepsUpdate('u1', { steps: 3 }, NEXT, 9, 7);
    expect(patch).toMatchObject({ 'members.u1.steps': 5, 'members.u1.coinRank': 7, updatedAt: 9 });
  });

  it('ступеней нет, ранг тот же — записи нет', () => {
    expect(spireMemberStepsUpdate('u1', { steps: 5, coinRank: 7 }, NEXT, 9, 7)).toBeNull();
  });

  it('ступеней нет, ранг сменился — одна запись только ранга', () => {
    expect(spireMemberStepsUpdate('u1', { steps: 5, coinRank: 6 }, NEXT, 9, 7)).toEqual({ 'members.u1.coinRank': 7, updatedAt: 9 });
  });

  it('ранга от клиента нет (старая сборка) — как раньше, ранг не трогаем', () => {
    expect(spireMemberStepsUpdate('u1', { steps: 5 }, NEXT, 9)).toBeNull();
    const patch = spireMemberStepsUpdate('u1', { steps: 3 }, NEXT, 9, null);
    expect(patch).not.toHaveProperty('members.u1.coinRank');
    expect(patch).toMatchObject({ 'members.u1.steps': 5 });
  });
});
