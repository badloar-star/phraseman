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
  // useHomeSurveyEntry + SurveySheetModal) с Главной снята. Кэш анкет по-прежнему прогревается при старте приложения.
  it('keeps the survey cache primed at startup and shows the poll only as a Today row with a sheet', () => {
    const cache = read('app/survey_offer_cache.ts');
    const rootLayout = read('app/_layout.tsx');
    const home = read('app/(tabs)/home.tsx');

    expect(cache).toContain('primeSurveyOfferCacheFromStorage');
    expect(rootLayout).toMatch(/primeSurveyOfferCacheFromStorage\(\)\.catch\((\(\) => \{\}|noteSwallowedHandler\('[^']+'\))\)/);
    // Опрос — модель в Главной, строка «Сегодня» и шторка; без отдельной карточки на экране.
    expect(home).toContain('const homePollV2 = useHomePollV2({ lang, active: homeRuntimeActive });');
    expect(home).toContain('surveyRow={homePollV2.phase !== \'hidden\' ? {');
    expect(home).toContain('testID="home-poll-v2-sheet"');
    expect(home).toContain('<HomePollV2Card model={homePollV2} lang={lang} onFinished={closeHomePollV2} />');
    expect(home).not.toMatch(/<HomePollV2Card lang=\{lang\} active=/u);
    // Прежняя анкета-строка с Главной снята.
    expect(home).not.toContain('useHomeSurveyEntry(');
    expect(home).not.toContain('SurveySheetModal');
    expect(home).not.toContain("pathname: '/survey_screen'");
  });
});
