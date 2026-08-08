import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveExamProgress } from '../app/medal_utils';
import { levelExamKey } from '../app/target_storage_keys';

describe('level exam progress idempotency', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
  });

  it('does not increment perfect-pass count twice for one finish token', async () => {
    await saveExamProgress('A1', 100, 'en', 'finish-token-a');
    await saveExamProgress('A1', 100, 'en', 'finish-token-a');

    await expect(AsyncStorage.getItem(levelExamKey('A1', 'pass_count', 'en'))).resolves.toBe('1');
  });
});
