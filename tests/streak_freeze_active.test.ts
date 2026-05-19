import AsyncStorage from '@react-native-async-storage/async-storage';
import { readStreakFreezeActive } from '../hooks/use-streak-freeze-active';
import { isRepairEligible } from '../app/streak_repair';

describe('streak freeze active state', () => {
  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-19T12:00:00.000Z'));
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('only treats a freeze from today as visually active', async () => {
    await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: '2026-05-19' }));

    await expect(readStreakFreezeActive()).resolves.toBe(true);
  });

  it('treats an old active freeze record as inactive', async () => {
    await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: '2026-05-18' }));

    await expect(readStreakFreezeActive()).resolves.toBe(false);
  });

  it('does not let an old freeze record block repair eligibility', async () => {
    await AsyncStorage.multiSet([
      ['last_active_date', '2026-05-17'],
      ['streak_count', '37'],
      ['streak_freeze', JSON.stringify({ active: true, date: '2026-05-18' })],
    ]);

    await expect(isRepairEligible()).resolves.toBe(true);
  });
});
