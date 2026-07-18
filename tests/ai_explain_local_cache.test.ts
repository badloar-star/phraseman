import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  readExplainLocalCache,
  writeExplainLocalCache,
} from '../app/explain_local_cache';

describe('AI explain local cache', () => {
  beforeEach(() => {
    (AsyncStorage as unknown as { __reset?: () => void }).__reset?.();
  });

  it('returns a saved explanation for the identical request without any network dependency', async () => {
    const request = { kind: 'phrase' as const, key: 'phrase:hello:ru:en' };
    await writeExplainLocalCache(request, { text: 'Привет — это приветствие.', status: 'ok' });

    await expect(readExplainLocalCache(request)).resolves.toEqual({
      text: 'Привет — это приветствие.',
      status: 'ok',
    });
  });

  it('does not return an entry from an old cache version', async () => {
    const request = { kind: 'mistake' as const, key: 'mistake:lesson-1' };
    await AsyncStorage.setItem(
      'ai_explain_local_cache_v1:mistake:mistake:lesson-1',
      JSON.stringify({ version: 0, text: 'old', status: 'ok' }),
    );

    await expect(readExplainLocalCache(request)).resolves.toBeNull();
  });
});
