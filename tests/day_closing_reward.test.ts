/* eslint-disable import/first */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/xp_manager', () => ({
  registerXP: jest.fn(async () => ({ finalDelta: 10, multiplier: 1, isBonus: false })),
}));

jest.mock('../app/compass/compass_flags', () => ({
  compassEconomyOn: jest.fn(() => true),
}));

import { awardDayClosingOnce } from '../app/compass/day_closing_reward';
import { registerXP as registerXPMock } from '../app/xp_manager';
import type { DayClosingRitual } from '../app/compass/day_closing_ritual';

const registerXP = registerXPMock as jest.MockedFunction<typeof registerXPMock>;

function makeRitual(dateKey = '2026-07-02'): DayClosingRitual {
  return {
    dateKey,
    isPremium: true,
    xpToday: 10,
    streak: 1,
    phrasesLearned: 1,
    flashcardsSaved: 0,
    quizzesCompleted: 0,
    dailyTasksClaimed: 0,
    planTasksCompleted: 0,
    highlights: [{ kind: 'xp', value: '10' }],
    repeatKind: 'one_phrase',
    focus: { kind: 'one_phrase' },
  };
}

describe('awardDayClosingOnce', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    registerXP.mockClear();
    registerXP.mockResolvedValue({ finalDelta: 10, multiplier: 1, isBonus: false });
  });

  it('writes the one-shot guard only after XP is awarded', async () => {
    await AsyncStorage.setItem('user_name', 'Navigator #1234');

    await expect(
      awardDayClosingOnce({ studyTarget: 'en', ritual: makeRitual(), lang: 'ru' }),
    ).resolves.toEqual({ xp: 10, streak: 1, awarded: true });

    expect(registerXP).toHaveBeenCalledWith(
      10,
      'daily_task_reward',
      'Navigator #1234',
      'ru',
      undefined,
      expect.objectContaining({ eventId: 'compass:day_close:en:2026-07-02' }),
    );
    await expect(
      AsyncStorage.getItem('compass_day_closing_awarded_v1_en_2026-07-02'),
    ).resolves.toBe('1');
  });

  it('does not burn the guard when XP registration fails', async () => {
    registerXP.mockRejectedValueOnce(new Error('network'));

    await expect(
      awardDayClosingOnce({ studyTarget: 'en', ritual: makeRitual(), lang: 'ru' }),
    ).rejects.toThrow('network');

    await expect(
      AsyncStorage.getItem('compass_day_closing_awarded_v1_en_2026-07-02'),
    ).resolves.toBeNull();

    await expect(
      awardDayClosingOnce({ studyTarget: 'en', ritual: makeRitual(), lang: 'ru' }),
    ).resolves.toMatchObject({ awarded: true });
    expect(registerXP).toHaveBeenCalledTimes(2);
  });
});
