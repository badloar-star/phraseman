import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('home startup stability', () => {
  // зачем (координатор §46, 2026-10-01): ряда Лиги на Главной больше нет (в 2.0
  // лигу заменила Башня, ряд жил в Главной V1, удалённой 01.10) — гидрировать его
  // на первом кадре нечего. Сторожим, что Главная не тянет кэш лиги обратно.
  it('does not hydrate a League row on the first Home frame', () => {
    const home = read('app/(tabs)/home.tsx');

    expect(home).not.toContain('getCachedLeagueStateSync()');
    expect(home).not.toContain('peekMyLeagueWeekRunes()');
  });

  it('always creates the league row for the first Home frame', () => {
    const home = read('app/(tabs)/home.tsx');

    expect(home).not.toContain('buildHomeLeagueChest');
  });

  // зачем (22.10, владелец: «опрос СНОВА отдельно на Главной — какого»; восстановлена работа 19.10): отдельного блока опроса
  // на Главной нет — опрос дня (Poll V2) живёт строкой «Сегодня» и открывается шторкой; прежняя анкета-строка (Q90,
  // useHomeSurveyEntry + SurveySheetModal) снималась, но владелец 22.10 вернул анкеты: строка «Сегодня» одна — анкета первой, иначе
  // Poll V2. Кэш анкет по-прежнему прогревается при старте приложения.
  it('keeps the survey cache primed at startup and shows the poll only as a Today row with a sheet', () => {
    const cache = read('app/survey_offer_cache.ts');
    const rootLayout = read('app/_layout.tsx');
    const home = read('app/(tabs)/home.tsx');

    expect(cache).toContain('primeSurveyOfferCacheFromStorage');
    expect(rootLayout).toMatch(/primeSurveyOfferCacheFromStorage\(\)\.catch\((\(\) => \{\}|noteSwallowedHandler\('[^']+'\))\)/);
    // Опрос — модель в Главной, строка «Сегодня» и шторка; без отдельной карточки на экране.
    expect(home).toContain('const homePollV2 = useHomePollV2({ lang, active: homeRuntimeActive });');
    // зачем (владелец 22.10, «вернуть анкеты»): одна строка «Сегодня» — анкета-кампания первой, иначе Poll V2
    expect(home).toContain("const homeTodayRowSource: 'survey' | 'poll_v2' | 'none' = homeSurvey.row ? 'survey' : homePollV2.phase !== 'hidden' ? 'poll_v2' : 'none';");
    // зачем (владелец 22.10 кнопкой): без «Сцены» — строка на Главной; с новой Главной опрос живёт на экране «Сегодня»
    expect(home).toContain("homeTodayRowSource === 'poll_v2' && !HOME_SCENE_V2_ENABLED ? {");
    expect(home).toContain('testID="home-poll-v2-sheet"');
    expect(home).toContain('<HomePollV2Card model={homePollV2} lang={lang} onFinished={closeHomePollV2} />');
    expect(home).not.toMatch(/<HomePollV2Card lang=\{lang\} active=/u);
    // Анкета-кампания вернулась (владелец 22.10) — через хук и ленивую шторку, без обхода через отдельный экран.
    expect(home).toContain('const homeSurvey = useHomeSurveyEntry(lang, homeRuntimeActive);');
    expect(home).toContain('const SurveySheetModal = lazy(loadSurveySheetModal);');
    expect(home).not.toContain("pathname: '/survey_screen'");
  });
});
