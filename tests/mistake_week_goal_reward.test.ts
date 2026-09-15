import {
  MISTAKE_WEEK_GOAL_XP,
  __resetMistakeWeekGoalRewardForTests,
  grantMistakeWeekGoalReward,
  mistakeWeekGoalSessionKey,
} from '../app/mistake_week_goal_reward';
import { MISTAKE_WEEK_CHEST_RUNES } from '../modules/mistake-practice/rewards_model';

jest.mock('../app/xp_manager', () => ({ registerXP: jest.fn() }));
jest.mock('../app/energy_system', () => ({ resetEnergyToMax: jest.fn() }));
jest.mock('../app/practice_rune_settlement', () => ({ settlePracticeRuneEarningsToServer: jest.fn() }));

type SettledEarnings = { activity: string; sessionKey: string; pendingRunes: number };
type SettleMock = jest.Mock<Promise<{ locallyCommitted: boolean; settled: boolean }>, [SettledEarnings, number]>;

const okXp = jest.fn(async () => ({ finalDelta: MISTAKE_WEEK_GOAL_XP }));
const okSettle = jest.fn(async () => ({ locallyCommitted: true, settled: true }));
const okEnergy = jest.fn(async () => undefined);

// зачем (владелец 2026-09-14): «как сундук друзей» — включая его урок про
// потерянные награды. Руны идут штатным механизмом, а не своей выдачей.
describe('mistake week goal reward', () => {
  beforeEach(() => { __resetMistakeWeekGoalRewardForTests(); jest.clearAllMocks(); });

  test('grants the approved chest through the standard rune settlement', async () => {
    const settle: SettleMock = jest.fn(async (_earnings: SettledEarnings, _ordinal: number) => ({ locallyCommitted: true, settled: true }));
    const result = await grantMistakeWeekGoalReward(
      { weekKey: '2026-09-07' },
      { settleRunes: settle as never, awardXp: okXp as never, refillEnergy: okEnergy },
    );
    expect(result).toMatchObject({ granted: true, runes: MISTAKE_WEEK_CHEST_RUNES, energyRefilled: true });
    expect(result.xp).toBe(MISTAKE_WEEK_GOAL_XP);
    const earnings = settle.mock.calls[0]![0];
    expect(earnings.activity).toBe('mistake_practice');
    expect(earnings.sessionKey).toBe(mistakeWeekGoalSessionKey('2026-09-07'));
    expect(earnings.pendingRunes).toBe(MISTAKE_WEEK_CHEST_RUNES);
    expect(okEnergy).toHaveBeenCalledTimes(1);
  });

  test('the week key is what makes a repeat grant a replay, not a local flag', async () => {
    const settle: SettleMock = jest.fn(async (_earnings: SettledEarnings, _ordinal: number) => ({ locallyCommitted: true, settled: true }));
    await grantMistakeWeekGoalReward({ weekKey: '2026-09-07' }, { settleRunes: settle as never, awardXp: okXp as never, refillEnergy: okEnergy });
    await grantMistakeWeekGoalReward({ weekKey: '2026-09-07' }, { settleRunes: settle as never, awardXp: okXp as never, refillEnergy: okEnergy });
    const first = settle.mock.calls[0]![0];
    const second = settle.mock.calls[1]![0];
    // Один и тот же sessionKey → один и тот же operationId → серверная расписка
    // отбивает повтор, даже если приложение переустановили.
    expect(second.sessionKey).toBe(first.sessionKey);
  });

  test('a failed settlement never reports runes it did not grant', async () => {
    const result = await grantMistakeWeekGoalReward(
      { weekKey: '2026-09-14' },
      {
        settleRunes: (async () => ({ locallyCommitted: false, settled: false })) as never,
        awardXp: (async () => ({ finalDelta: 0 })) as never,
        refillEnergy: okEnergy,
      },
    );
    expect(result.runes).toBe(0);
    expect(result.granted).toBe(false);
  });

  test('a thrown error is reported, not swallowed as success', async () => {
    const result = await grantMistakeWeekGoalReward(
      { weekKey: '2026-09-21' },
      { settleRunes: (async () => { throw new Error('network'); }) as never, awardXp: okXp as never, refillEnergy: okEnergy },
    );
    expect(result).toMatchObject({ granted: false, reason: 'failed', runes: 0 });
  });

  test('an empty week key is refused instead of granting a nameless chest', async () => {
    const result = await grantMistakeWeekGoalReward({ weekKey: '   ' }, { settleRunes: okSettle as never });
    expect(result.reason).toBe('failed');
    expect(okSettle).not.toHaveBeenCalled();
  });
});
