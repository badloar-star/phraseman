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

describe('язык раздела: вкладки и маршруты (🔴 R70, Ревизор a9486a249)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const section = require('../app/section_language') as typeof import('../app/section_language');
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    section.resetSectionLanguage('video', 'test');
    section.resetSectionLanguage('cards', 'test');
    section.__resetSectionLanguageForTests();
  });
  afterEach(() => jest.restoreAllMocks());

  it('«Видео es → вкладка Главная → вкладка Видео» = язык из Настроек, хотя pathname не менялся', () => {
    const inTabs = (activeTabIdx: number) => ({ pathname: '/video', routeIsTab: true, activeTabIdx });
    section.trackCurrentSection(inTabs(2));
    section.setSectionLanguageOverride('video', 'es');
    section.trackCurrentSection(inTabs(0)); // тап по Главной: путь тот же, активна вкладка 0
    expect(section.getSectionLanguageOverride('video')).toBeNull();
    section.trackCurrentSection(inTabs(2));
    expect(section.getSectionLanguageOverride('video')).toBeNull();
  });

  it('экраны поверх таббара внутри раздела не сбрасывают: ролик, плейлист, открытие набора', () => {
    section.trackCurrentSection({ pathname: '/video', routeIsTab: true, activeTabIdx: 2 });
    section.setSectionLanguageOverride('video', 'es');
    section.trackCurrentSection({ pathname: '/lingman_video_watch', routeIsTab: false, activeTabIdx: 2 });
    section.trackCurrentSection({ pathname: '/lingman_playlist', routeIsTab: false, activeTabIdx: 2 });
    expect(section.getSectionLanguageOverride('video')).toBe('es');
    expect(section.sectionOfPathname('/pack_opening')).toBe('cards');
  });

  it('внутри разделов эффективный язык — локальный выбор, иначе из Настроек', () => {
    expect(section.effectiveStudyTargetNow('en')).toBe('en');
    section.setSectionLanguageOverride('video', 'es');
    expect(section.effectiveStudyTargetNow('en')).toBe('es');
  });

  it('набор из ролика, ролик на es: «добавить» и «уже добавлен» читают язык раздела', () => {
    const { readFileSync } = require('fs') as typeof import('fs');
    for (const file of ['app/community_packs/CommunityPackSocialBar.tsx', 'app/community_packs/useOwnedPack.ts', 'app/lingman_video_watch.tsx', 'app/flashcards_video_packs.tsx']) {
      expect(readFileSync(file, 'utf8')).toContain('useEffectiveStudyTarget(globalStudyTarget)');
    }
  });
});
