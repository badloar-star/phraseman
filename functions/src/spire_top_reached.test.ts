// Сторож (владелец 04.11): дошедший до высшей ступени башни (135 ступеней) переходит выше независимо от монет,
// СВЕРХ топ-5 по монетам (D190: k не меняется). Сработал — чини логику, а не сторожа.
import { computeSpireRoomResults } from './spire_finalize_core';
import { SPIRE_TOP_STEPS, spireReachedTop } from '../../shared/spire_top_steps';

const WEEK_START = Date.UTC(2026, 10, 2); // понедельник 2026-11-02 (W45)
const COINS = { weekPlace1: 300, weekPlace2: 200, weekPlace3: 150, promotionBonus: 100 };
const TUNING = { targetZoneMarginSteps: 1, maxStepsPerHour: 6 };

function member(steps: number) {
  return { steps, reachedAtMs: steps > 0 ? WEEK_START + steps * 60_000 : 0, totalMs: steps * 90_000, name: 'x' };
}

/** 20 живых: p01..p19 играли (монеты 1000..), top — вершинник с нулём монет. */
function room(tier: number, rankBy: 'coins' | 'steps', topSteps = SPIRE_TOP_STEPS) {
  const members: Record<string, unknown> = {};
  const weekCoinsByUid: Record<string, number> = {};
  for (let i = 1; i <= 19; i += 1) {
    const uid = `p${String(i).padStart(2, '0')}`;
    members[uid] = member(10 + i);
    weekCoinsByUid[uid] = 2000 - i * 50; // p01 — больше всех
  }
  members.top = member(topSteps);
  weekCoinsByUid.top = 0;
  return computeSpireRoomResults({
    groupId: `2026-W45_en_t${tier}_d0_1_room`, tier, weekStartMs: WEEK_START, cohortDay: 0,
    members, coins: COINS, tuning: TUNING, rankBy, weekCoinsByUid, weekCoinsCap: 20_000,
  });
}

describe('Пик: вершина башни = повышение независимо от монет (владелец 04.11)', () => {
  it('константа 135 и предикат', () => {
    expect(SPIRE_TOP_STEPS).toBe(135);
    expect(spireReachedTop(135)).toBe(true);
    expect(spireReachedTop(134)).toBe(false);
    expect(spireReachedTop(undefined)).toBe(false);
    expect(spireReachedTop('x')).toBe(false);
  });

  it('режим монет: вершинник с 0 монет повышается; топ-5 по монетам — тоже, k не меняется (всего 6)', () => {
    const out = room(5, 'coins');
    expect(out.results.top.topReached).toBe(true);
    expect(out.results.top.promoted).toBe(true);
    expect(out.results.top.demoted).toBe(false);
    expect(out.results.top.newTier).toBe(6);
    const promotedOthers = Object.entries(out.results).filter(([uid, r]) => uid !== 'top' && r.promoted).map(([uid]) => uid);
    expect(promotedOthers.sort()).toEqual(['p01', 'p02', 'p03', 'p04', 'p05']); // пятёрка не вытеснена
    expect(out.zoneSize).toBe(5);
  });

  it('режим монет: без вершинника повышаются те же пятеро (регресса D190 нет)', () => {
    const out = room(5, 'coins', 40);
    expect(out.results.top.topReached).toBe(false);
    expect(Object.values(out.results).filter((r) => r.promoted).length).toBe(5);
  });

  it('режим ступеней: вершинник и так в топе, повышен один раз, без дублей', () => {
    const out = room(5, 'steps');
    expect(out.results.top.topReached).toBe(true);
    expect(out.results.top.promoted).toBe(true);
    expect(out.results.top.newTier).toBe(6);
  });

  it('высшая лига (tier 11): вершинник не растёт выше и не понижается', () => {
    const out = room(11, 'coins');
    expect(out.results.top.topReached).toBe(true);
    expect(out.results.top.promoted).toBe(false);
    expect(out.results.top.demoted).toBe(false);
    expect(out.results.top.newTier).toBe(11);
  });

  it('вершинник в самой нижней лиге с нулём монет: повышается, не спускается', () => {
    const out = room(0, 'coins');
    expect(out.results.top.promoted).toBe(true);
    expect(out.results.top.newTier).toBe(1);
  });
});
