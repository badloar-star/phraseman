// зачем (Ревизор 2d06352db 🟡): сброс языка раздела при пустом снимке языка из Настроек не молчит — причина snapshot_null в журнале, язык уточняется из хранилища.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setStoredPackLanguage, subscribePackLanguage } from '../app/flashcards/pack_language_preferences';
import { __resetSectionLanguageForTests, resetSectionLanguage } from '../app/section_language';

jest.mock('../app/app_snapshot_bootstrap', () => ({ peekStudyTargetRaw: () => null }));

describe('сброс при пустом снимке языка', () => {
  afterEach(() => {
    resetSectionLanguage('cards', 'cleanup');
    __resetSectionLanguageForTests();
    jest.restoreAllMocks();
  });

  it('пишет snapshot_null и уточняет язык из хранилища', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await AsyncStorage.setItem('study_target_v1', 'es');
    const seen: string[] = [];
    const off = subscribePackLanguage((language) => seen.push(language));
    await setStoredPackLanguage('de');
    resetSectionLanguage('cards', 'test');
    await new Promise((resolve) => setTimeout(resolve, 0));
    const lines = log.mock.calls.map((call) => String(call[0]));
    expect(lines.some((line) => line.includes('snapshot_null'))).toBe(true);
    expect(seen[seen.length - 1]).toBe('es');
    off();
  });
});
