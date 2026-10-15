import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getStoredPackLanguage,
  setStoredPackLanguage,
  subscribePackLanguage,
} from '../app/flashcards/pack_language_preferences';
import {
  __resetSectionLanguageForTests,
  getSectionLanguageOverride,
  resetSectionLanguage,
  sectionOfPathname,
  setSectionLanguageOverride,
  trackSectionPathname,
} from '../app/section_language';

// зачем (владелец 15.10): язык, выбранный пилюлей раздела, локален для раздела и не пишется ни в глобальный язык, ни на диск.
describe('язык раздела: локальный выбор', () => {
  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    resetSectionLanguage('cards', 'test');
    __resetSectionLanguageForTests();
    await (AsyncStorage as typeof AsyncStorage & { __reset?: () => void }).clear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('наборы: выбор живёт в памяти, на диск и в глобальный язык не пишется', async () => {
    await setStoredPackLanguage('de');
    expect(await getStoredPackLanguage()).toBe('de');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('study_target')).toBeNull();
  });

  it('старый ключ на диске не читается: без локального выбора — язык из Настроек', async () => {
    await AsyncStorage.setItem('fc_pack_language_v1', 'fr');
    expect(await getStoredPackLanguage()).toBeNull();
  });

  it('«Видео» выбрал es → глобальный язык прежний → ушёл на Главную → вернулся → снова из Настроек', () => {
    trackSectionPathname('/video');
    setSectionLanguageOverride('video', 'es');
    expect(getSectionLanguageOverride('video')).toBe('es');
    trackSectionPathname('/video'); // тот же раздел — выбор живёт
    expect(getSectionLanguageOverride('video')).toBe('es');
    trackSectionPathname('/home'); // ушёл
    expect(getSectionLanguageOverride('video')).toBeNull();
    trackSectionPathname('/video'); // вернулся
    expect(getSectionLanguageOverride('video')).toBeNull();
  });

  it('«Карточки»: переход внутри раздела не сбрасывает, выход — сбрасывает и сообщает подписчикам язык из Настроек', async () => {
    const seen: string[] = [];
    const off = subscribePackLanguage((language) => seen.push(language));
    trackSectionPathname('/flashcards');
    await setStoredPackLanguage('it');
    trackSectionPathname('/flashcards_packs');
    expect(await getStoredPackLanguage()).toBe('it');
    trackSectionPathname('/home');
    expect(await getStoredPackLanguage()).toBeNull();
    expect(seen[0]).toBe('it');
    expect(seen).toHaveLength(2); // выбор + сброс
    off();
  });

  it('разделы по пути экрана', () => {
    expect(sectionOfPathname('/video')).toBe('video');
    expect(sectionOfPathname('/lingman_video_watch')).toBe('video');
    expect(sectionOfPathname('/flashcards_training_setup')).toBe('cards');
    expect(sectionOfPathname('/community_pack_create')).toBe('cards');
    expect(sectionOfPathname('/home')).toBeNull();
  });

  it('журнал [SECTION-LANG] на выбор и сброс', () => {
    const log = console.log as jest.Mock;
    setSectionLanguageOverride('video', 'es');
    resetSectionLanguage('video', 'test');
    const lines = log.mock.calls.map((call) => String(call[0])).filter((line) => line.startsWith('[SECTION-LANG]'));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('"event":"select"');
    expect(lines[1]).toContain('"event":"reset"');
  });
});
