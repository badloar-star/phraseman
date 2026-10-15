// зачем (Ревизор f3ad957df / d2fe02fe4, координатор 15.10): модальные и временные маршруты не сбрасывают язык раздела; позиция ролика переживает размонтирование экрана (TTL 30 мин, без диска).
import {
  __resetSectionLanguageForTests,
  getSectionLanguageOverride,
  isNeutralRoute,
  NEUTRAL_ROUTE_PREFIXES,
  resetSectionLanguage,
  setSectionLanguageOverride,
  trackCurrentSection,
  trackPushedRoute,
} from '../app/section_language';
import { __resetYoutubeResumeForTests, peekYoutubeResume, publishYoutubePosition } from '../app/youtube_player_seek_bus';


describe('нейтральные маршруты не меняют язык раздела', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    resetSectionLanguage('cards', 'test');
    resetSectionLanguage('video', 'test');
    __resetSectionLanguageForTests();
  });
  afterEach(() => jest.restoreAllMocks());

  it('список нейтральных маршрутов в одном месте и распознаётся', () => {
    expect(NEUTRAL_ROUTE_PREFIXES).toContain('/premium_modal');
    expect(isNeutralRoute('/premium_modal')).toBe(true);
    expect(isNeutralRoute('/settings_language')).toBe(true);
    expect(isNeutralRoute('/flashcards_packs')).toBe(false);
  });

  it('Карточки es → пейвол → закрыть → es (корень и таббар)', () => {
    trackPushedRoute('/flashcards');
    setSectionLanguageOverride('cards', 'es');
    trackPushedRoute('/premium_modal');
    trackCurrentSection({ pathname: '/premium_modal', routeIsTab: false, activeTabRoute: '/(tabs)/home' });
    trackPushedRoute('/flashcards');
    expect(getSectionLanguageOverride('cards')).toBe('es');
  });

  it('Карточки es → ролик → Назад → es', () => {
    trackPushedRoute('/flashcards_my_packs');
    setSectionLanguageOverride('cards', 'es');
    trackPushedRoute('/lingman_video_watch');
    trackPushedRoute('/flashcards_my_packs');
    expect(getSectionLanguageOverride('cards')).toBe('es');
  });

  it('уход из раздела по-прежнему сбрасывает', () => {
    trackPushedRoute('/flashcards');
    setSectionLanguageOverride('cards', 'es');
    trackPushedRoute('/home');
    expect(getSectionLanguageOverride('cards')).toBeNull();
  });

  it('журнал neutral_route', () => {
    const log = console.log as jest.Mock;
    trackPushedRoute('/premium_modal');
    expect(log.mock.calls.some((call) => String(call[0]).includes('"event":"neutral_route"'))).toBe(true);
  });
});

describe('позиция ролика: модульная карта с TTL', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    __resetYoutubeResumeForTests();
  });
  afterEach(() => jest.restoreAllMocks());

  it('позиция запоминается при публикации и отдаётся при входе', () => {
    publishYoutubePosition('vidAAAAAAAA', 83.4);
    expect(peekYoutubeResume('vidAAAAAAAA', 'test')).toBe(83);
  });

  it('нет позиции или начало ролика → null', () => {
    expect(peekYoutubeResume('unknown', 'test')).toBeNull();
    publishYoutubePosition('vidBBBBBBBB', 0.4);
    expect(peekYoutubeResume('vidBBBBBBBB', 'test')).toBeNull();
  });

  it('позиция старше 30 минут протухает', () => {
    publishYoutubePosition('vidCCCCCCCC', 50);
    expect(peekYoutubeResume('vidCCCCCCCC', 'test', Date.now() + 31 * 60 * 1000)).toBeNull();
    expect(peekYoutubeResume('vidCCCCCCCC', 'test')).toBeNull();
  });

  it('журнал [VIDEO-RESUME] с videoId, sec, ageMs, source', () => {
    publishYoutubePosition('vidDDDDDDDD', 12);
    peekYoutubeResume('vidDDDDDDDD', 'watch_enter');
    const lines = (console.log as jest.Mock).mock.calls.map((call) => String(call[0]));
    expect(lines.some((line) => line.startsWith('[VIDEO-RESUME]') && line.includes('"source":"watch_enter"') && line.includes('"sec":12'))).toBe(true);
  });
});
