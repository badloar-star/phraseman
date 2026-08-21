import fs from 'node:fs';
import path from 'node:path';
import {
  mistakePracticeEventsKey,
  mistakePracticePreferencesKey,
  mistakePracticeProjectionKey,
  mistakePracticeSessionKey,
} from '../app/target_storage_keys';

const ROOT = path.resolve(__dirname, '..');

describe('mistake practice account lifecycle boundary', () => {
  test('all new storage families are always target scoped', () => {
    for (const factory of [
      mistakePracticeEventsKey,
      mistakePracticeProjectionKey,
      mistakePracticeSessionKey,
      mistakePracticePreferencesKey,
    ]) {
      expect(factory('account-a', 'en')).toContain('mistake_practice_v2::en');
      expect(factory('account-a', 'fr')).toContain('mistake_practice_v2::fr');
      expect(factory('account-a', 'en')).not.toBe(factory('account-a', 'fr'));
      expect(factory('account-a', 'en')).not.toBe(factory('account-b', 'en'));
    }
  });

  test('cloud sync and account wipe inventory include both target journals', () => {
    const source = fs.readFileSync(
      path.join(ROOT, 'app', 'cloud_sync.ts'),
      'utf8',
    );

    expect(source).toContain('uploadMistakePracticeEvents({ accountScope: uid, studyTarget: target })');
    expect(source).toContain('restoreMistakePracticeEvents({ accountScope: uid, studyTarget: target })');
    expect(source).toContain('flushPendingMistakeCorrectionRewards({ accountScope: uid, studyTarget: target })');
    expect(source).toContain("'mistake_practice_v2::'");
  });
});
