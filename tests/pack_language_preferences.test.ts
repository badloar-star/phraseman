import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getStoredPackLanguage,
  PACK_LANGUAGE_PREFERENCE_KEY,
  setStoredPackLanguage,
} from '../app/flashcards/pack_language_preferences';

describe('pack language preferences', () => {
  beforeEach(async () => {
    await (AsyncStorage as typeof AsyncStorage & { __reset?: () => void }).clear();
  });

  it('stores and restores a valid language in a dedicated key', async () => {
    await setStoredPackLanguage('de');

    expect(await getStoredPackLanguage()).toBe('de');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(PACK_LANGUAGE_PREFERENCE_KEY, 'de');
  });

  it('normalizes missing and invalid preference to null for caller defaulting', async () => {
    // D130 (30.09): 'it' стал допустимым языком набора — пример недопустимого теперь 'pt'.
    await AsyncStorage.setItem(PACK_LANGUAGE_PREFERENCE_KEY, 'pt');

    expect(await getStoredPackLanguage()).toBeNull();
  });
});
