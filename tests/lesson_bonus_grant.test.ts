import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/app_health', () => ({ logAppWarning: jest.fn() }));

import { grantLessonFirstCompleteBonus, retryPendingLessonBonusGrants } from '../app/lesson_bonus_grant';
import { lessonBonusGrantedKey } from '../app/target_storage_keys';
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';

const PENDING_KEY = 'lesson_bonus_pending_v1';

beforeEach(() => {
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  beginAccountGeneration('lesson-test-account');
});

// зачем: D70 — жемчуг за первое прохождение удалён; модуль только отмечает первое прохождение.
describe('first lesson-completion marker', () => {
  it('marks the lesson on first completion', async () => {
    const result = await grantLessonFirstCompleteBonus({ lessonId: 3, studyTarget: 'fr', lang: 'ru' });

    expect(result).toEqual({ status: 'granted' });
    expect(await AsyncStorage.getItem(lessonBonusGrantedKey(3, 'fr'))).toBe('1');
  });

  it('reports already_granted after completion', async () => {
    await grantLessonFirstCompleteBonus({ lessonId: 3, studyTarget: 'fr', lang: 'ru' });
    const result = await grantLessonFirstCompleteBonus({ lessonId: 3, studyTarget: 'fr', lang: 'ru' });

    expect(result).toEqual({ status: 'already_granted' });
  });

  it('deduplicates concurrent calls for one lesson', async () => {
    const [first, second] = await Promise.all([
      grantLessonFirstCompleteBonus({ lessonId: 9, studyTarget: 'fr', lang: 'ru' }),
      grantLessonFirstCompleteBonus({ lessonId: 9, studyTarget: 'fr', lang: 'ru' }),
    ]);

    expect([first.status, second.status]).toEqual(['granted', 'granted']);
  });

  it('retries a failed mark and clears the pending marker', async () => {
    // Первая запись в этом сценарии — отметка урока; роняем именно её.
    (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(async () => {
      throw new Error('storage unavailable');
    });
    expect(await grantLessonFirstCompleteBonus({ lessonId: 11, studyTarget: 'fr', lang: 'ru' }))
      .toEqual({ status: 'failed' });
    expect(await AsyncStorage.getItem(PENDING_KEY)).not.toBeNull();

    expect(await retryPendingLessonBonusGrants()).toBe(1);
    expect(await AsyncStorage.getItem(lessonBonusGrantedKey(11, 'fr'))).toBe('1');
    expect(await AsyncStorage.getItem(PENDING_KEY)).toBeNull();
  });
});
