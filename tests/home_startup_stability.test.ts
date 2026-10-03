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

  it('keeps the independent survey cache primed and exposes a standalone Home offer', () => {
    const cache = read('app/survey_offer_cache.ts');
    const rootLayout = read('app/_layout.tsx');
    const home = read('app/(tabs)/home.tsx');

    expect(cache).toContain('primeSurveyOfferCacheFromStorage');
    // зачем: PM-229 — немой обработчик теперь пишет причину в журнал; значение по умолчанию прежнее
    expect(rootLayout).toMatch(/primeSurveyOfferCacheFromStorage\(\)\.catch\((\(\) => \{\}|noteSwallowedHandler\('[^']+'\))\)/);
    // Q90 (01.10): опрос — строка в «Сегодня», загрузка вынесена в хук с кэшем 6 ч.
    const hook = read('hooks/use_home_survey_entry.ts');
    const entry = read('app/home_survey_entry.ts');
    expect(home).toContain('const homeSurvey = useHomeSurveyEntry(lang, homeRuntimeActive);');
    expect(hook).toContain("import { loadHomeSurvey, markHomeSurveyCompleted, peekHomeSurvey } from '../app/home_survey_entry';");
    expect(entry).toContain('fetchActiveSurveyWithRetry');
    expect(home).toContain("import SurveySheetModal from '../../components/survey/SurveySheetModal';");
    expect(home).not.toContain("pathname: '/survey_screen'");
  });
});
