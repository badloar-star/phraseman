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

  it('does not load surveys or polls on Home or during startup', () => {
    expect(read('app/_layout.tsx')).not.toMatch(/primeSurveyOfferCacheFromStorage|survey_screen/);
    expect(read('app/(tabs)/home.tsx')).not.toMatch(/useHomeSurveyEntry|useHomePollV2|SurveySheetModal|HomePollV2Card/);
});
});
