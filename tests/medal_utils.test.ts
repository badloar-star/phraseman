import {
  checkGemAchievements,
  getCorrectNeededForNextTier,
  getEarnedDots,
  loadMedalInfo,
  getMedalTier,
  saveMedalProgress,
} from '../app/medal_utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COURSE_LEVEL_RANGES } from '../app/course_levels';

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

  it('counts each strong repeated lesson pass for replay reward dots', async () => {
    const perfect = new Array(50).fill('correct');

    for (let i = 0; i < 4; i++) {
      await saveMedalProgress(11, 5, perfect);
    }

    await expect(AsyncStorage.getItem('lesson11_pass_count')).resolves.toBe('4');
    await expect(loadMedalInfo(11)).resolves.toMatchObject({ bestScore: 5, passCount: 4 });
    expect(getEarnedDots('gold', 4)).toEqual([
      'bronze',
      'silver',
      'gold',
      'ruby',
      'emerald',
      'diamond',
    ]);
  });

  it.each(Array.from({ length: 32 }, (_, i) => i + 1))(
    'does not count lesson %i replay runs with corrected mistakes as perfect passes',
    async (lessonId) => {
    const perfect = new Array(50).fill('correct');
    await saveMedalProgress(lessonId, 5, perfect);

    const almostPerfect = [
      ...new Array(47).fill('replay_correct'),
      ...new Array(3).fill('wrong'),
    ];
    const result = await saveMedalProgress(lessonId, 4.7, almostPerfect);

    expect(result).toMatchObject({
      newTier: 'gold',
      prevTier: 'gold',
      isNewBest: false,
      prevPassCount: 1,
      newPassCount: 1,
      passCountIncreased: false,
    });
    await expect(AsyncStorage.getItem(`lesson${lessonId}_best_score`)).resolves.toBe('5');
    await expect(AsyncStorage.getItem(`lesson${lessonId}_pass_count`)).resolves.toBe('1');
    await expect(loadMedalInfo(lessonId)).resolves.toMatchObject({ bestScore: 5, passCount: 1 });
  });

  it.each(Array.from({ length: 32 }, (_, i) => i + 1))(
    'repairs legacy lesson %i gold state with missing pass_count before counting a replay',
    async (lessonId) => {
    await AsyncStorage.setItem(`lesson${lessonId}_best_score`, '5');
    await expect(loadMedalInfo(lessonId)).resolves.toMatchObject({ bestScore: 5, passCount: 1 });

    const replay = new Array(50).fill('correct');
    const result = await saveMedalProgress(lessonId, 5, replay);

    expect(result.prevPassCount).toBe(1);
    expect(result.newPassCount).toBe(2);
    await expect(AsyncStorage.getItem(`lesson${lessonId}_pass_count`)).resolves.toBe('2');
  });

  it('counts legacy best scores as first passes when checking CEFR gem eligibility', async () => {
    for (const [level, [from, to]] of Object.entries(COURSE_LEVEL_RANGES)) {
      const setup: [string, string][] = [];
      for (let id = from; id <= to; id++) {
        setup.push([`lesson${id}_best_score`, '5']);
        if (id !== from) setup.push([`lesson${id}_pass_count`, '2']);
      }
      await AsyncStorage.multiSet(setup);

      const replay = new Array(50).fill('correct');
      await saveMedalProgress(from, 5, replay);

      await expect(checkGemAchievements(from)).resolves.toContainEqual({ level, gem: 'ruby' });
      (AsyncStorage as any).__reset?.();
    }
  });

  it('does not count a non-perfect future lesson even when it has fewer than 50 items', async () => {
    const progress = [
      ...new Array(44).fill('correct'),
      ...new Array(5).fill('wrong'),
    ];

    const result = await saveMedalProgress(31, 4.5, progress);

    expect(result.passCountIncreased).toBe(false);
    await expect(AsyncStorage.getItem('lesson31_pass_count')).resolves.toBeNull();
  });
});
