import {
  bpForMatch,
  buildBattlePassLadder,
  computeBattlePassProgress,
  computeClaimables,
  countClaimable,
  BATTLE_PASS_LEVELS,
  BP_PER_LEVEL,
} from '../app/arena_battle_pass';

describe('bpForMatch', () => {
  it('победа даёт больше очков, чем участие', () => {
    expect(bpForMatch(true)).toBeGreaterThan(bpForMatch(false));
    expect(bpForMatch(false)).toBeGreaterThan(0);
  });
});

describe('buildBattlePassLadder', () => {
  const ladder = buildBattlePassLadder();
  it('ровно BATTLE_PASS_LEVELS уровней', () => {
    expect(ladder).toHaveLength(BATTLE_PASS_LEVELS);
  });
  it('требования к BP растут монотонно', () => {
    for (let i = 1; i < ladder.length; i += 1) {
      expect(ladder[i].bpRequired).toBeGreaterThan(ladder[i - 1].bpRequired);
    }
  });
  it('у каждого уровня есть бесплатная награда', () => {
    expect(ladder.every((t) => !!t.free)).toBe(true);
  });
  it('на 10-м уровне премиум-награда — звание', () => {
    expect(ladder[9].premium?.kind).toBe('title');
  });
});

describe('computeBattlePassProgress', () => {
  it('0 очков → уровень 0', () => {
    const p = computeBattlePassProgress(0);
    expect(p.level).toBe(0);
    expect(p.ratio).toBe(0);
  });
  it('ровно один уровень', () => {
    const p = computeBattlePassProgress(BP_PER_LEVEL);
    expect(p.level).toBe(1);
    expect(p.bpInLevel).toBe(0);
  });
  it('половина уровня → ratio 0.5', () => {
    const p = computeBattlePassProgress(BP_PER_LEVEL + BP_PER_LEVEL / 2);
    expect(p.level).toBe(1);
    expect(p.ratio).toBeCloseTo(0.5, 5);
  });
  it('кап на максимуме', () => {
    const p = computeBattlePassProgress(BP_PER_LEVEL * 9999);
    expect(p.level).toBe(BATTLE_PASS_LEVELS);
    expect(p.maxed).toBe(true);
    expect(p.bpToNext).toBe(0);
  });
});

describe('computeClaimables', () => {
  const ladder = buildBattlePassLadder();

  it('бесплатные награды достигнутых уровней забираемы, премиум залочен без подписки', () => {
    const states = computeClaimables(ladder, BP_PER_LEVEL * 3, new Set(), new Set(), false);
    // уровни 1..3 достигнуты
    expect(states[0].free.claimable).toBe(true);
    expect(states[2].free.claimable).toBe(true);
    expect(states[3].free.claimable).toBe(false); // уровень 4 не достигнут
    // премиум залочен
    expect(states[0].premium?.locked).toBe(true);
    expect(states[0].premium?.claimable).toBe(false);
  });

  it('с подпиской премиум-награды достигнутых уровней забираемы', () => {
    const states = computeClaimables(ladder, BP_PER_LEVEL * 3, new Set(), new Set(), true);
    expect(states[0].premium?.claimable).toBe(true);
    expect(states[0].premium?.locked).toBe(false);
  });

  it('забранные награды больше не claimable', () => {
    const states = computeClaimables(ladder, BP_PER_LEVEL * 3, new Set([1]), new Set([1]), true);
    expect(states[0].free.claimed).toBe(true);
    expect(states[0].free.claimable).toBe(false);
    expect(states[0].premium?.claimed).toBe(true);
  });

  it('countClaimable считает доступные награды', () => {
    const free = computeClaimables(ladder, BP_PER_LEVEL * 2, new Set(), new Set(), false);
    // 2 уровня × только бесплатные (премиум залочен)
    expect(countClaimable(free)).toBe(2);
    const withPrem = computeClaimables(ladder, BP_PER_LEVEL * 2, new Set(), new Set(), true);
    // 2 бесплатных + 2 премиум
    expect(countClaimable(withPrem)).toBe(4);
  });
});
