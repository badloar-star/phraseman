import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  APP_CONTENT_SCHEMA_VERSION,
  applyContentDeliveryMigration,
} from '../app/content_delivery_migration';
import {
  lessonIntroShownKey,
  lessonCycleEndIntroShownKey,
  lessonSessionKey,
} from '../app/target_storage_keys';

describe('content delivery migration', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
  });

  it('clears only transient lesson session and intro keys', async () => {
    await AsyncStorage.multiSet([
      [lessonSessionKey(1, 'cellIndex', 'en'), '12'],
      [lessonSessionKey(1, 'phraseOrder', 'en'), '[1,0,2]'],
      [lessonSessionKey(1, 'errorReplayQueue', 'en'), '[1]'],
      [lessonCycleEndIntroShownKey('en'), '1'],
      [lessonCycleEndIntroShownKey('fr'), '1'],
      [lessonIntroShownKey(1, 'en'), '1'],
      [lessonSessionKey(2, 'phraseOrder', 'fr'), '[2,1,0]'],
      [lessonIntroShownKey(2, 'fr'), '1'],
      ['lesson1_progress', '["correct"]'],
      ['lesson1_best_score', '4.5'],
      ['lesson1_words', '["ready"]'],
      ['unlocked_lessons', '[1,2,3]'],
      ['user_total_xp', '1234'],
      ['shards_balance', '99'],
      ['vip_active', 'true'],
    ]);

    await expect(applyContentDeliveryMigration()).resolves.toBe(true);

    await expect(AsyncStorage.getItem(lessonSessionKey(1, 'cellIndex', 'en'))).resolves.toBeNull();
    await expect(AsyncStorage.getItem(lessonSessionKey(1, 'phraseOrder', 'en'))).resolves.toBeNull();
    await expect(AsyncStorage.getItem(lessonSessionKey(1, 'errorReplayQueue', 'en'))).resolves.toBeNull();
    await expect(AsyncStorage.getItem(lessonCycleEndIntroShownKey('en'))).resolves.toBeNull();
    await expect(AsyncStorage.getItem(lessonCycleEndIntroShownKey('fr'))).resolves.toBeNull();
    await expect(AsyncStorage.getItem(lessonIntroShownKey(1, 'en'))).resolves.toBeNull();
    await expect(AsyncStorage.getItem(lessonSessionKey(2, 'phraseOrder', 'fr'))).resolves.toBeNull();
    await expect(AsyncStorage.getItem(lessonIntroShownKey(2, 'fr'))).resolves.toBeNull();

    await expect(AsyncStorage.getItem('lesson1_progress')).resolves.toBe('["correct"]');
    await expect(AsyncStorage.getItem('lesson1_best_score')).resolves.toBe('4.5');
    await expect(AsyncStorage.getItem('lesson1_words')).resolves.toBe('["ready"]');
    await expect(AsyncStorage.getItem('unlocked_lessons')).resolves.toBe('[1,2,3]');
    await expect(AsyncStorage.getItem('user_total_xp')).resolves.toBe('1234');
    await expect(AsyncStorage.getItem('shards_balance')).resolves.toBe('99');
    await expect(AsyncStorage.getItem('vip_active')).resolves.toBe('true');
    await expect(AsyncStorage.getItem('app_content_schema_version')).resolves.toBe(APP_CONTENT_SCHEMA_VERSION);
  });

  it('is idempotent once the schema marker is current', async () => {
    await AsyncStorage.multiSet([
      ['app_content_schema_version', APP_CONTENT_SCHEMA_VERSION],
      [lessonSessionKey(1, 'phraseOrder', 'en'), '[1,0,2]'],
    ]);

    await expect(applyContentDeliveryMigration()).resolves.toBe(false);
    await expect(AsyncStorage.getItem(lessonSessionKey(1, 'phraseOrder', 'en'))).resolves.toBe('[1,0,2]');
  });
});
