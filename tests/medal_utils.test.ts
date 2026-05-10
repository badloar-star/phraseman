import {
  getCorrectNeededForNextTier,
  getMedalTier,
  saveMedalProgress,
} from '../app/medal_utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('lesson medal thresholds', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
  });

  it('keeps silver locked until 4.5 stars', () => {
    expect(getMedalTier(2.4)).toBe('none');
    expect(getMedalTier(2.5)).toBe('bronze');
    expect(getMedalTier(3.5)).toBe('bronze');
    expect(getMedalTier(4.4)).toBe('bronze');
    expect(getMedalTier(4.5)).toBe('silver');
    expect(getMedalTier(5.0)).toBe('gold');
  });

  it('shows bronze users how many answers remain until 45/50 silver', () => {
    expect(getCorrectNeededForNextTier(3.5)).toBe(10);
    expect(getCorrectNeededForNextTier(4.4)).toBe(1);
    expect(getCorrectNeededForNextTier(4.5)).toBe(5);
  });

  it('saves 35/50 as bronze score without counting it as a 45/50 pass', async () => {
    const progress = [
      ...new Array(35).fill('correct'),
      ...new Array(15).fill('wrong'),
    ];

    const result = await saveMedalProgress(1, 3.5, progress);

    expect(result.newTier).toBe('bronze');
    expect(await AsyncStorage.getItem('lesson1_best_score')).toBe('3.5');
    expect(await AsyncStorage.getItem('lesson1_pass_count')).toBeNull();
  });
});
