// Раунд 2 удобств, Настройки п.2 (одобрено владельцем 05.11): «Только главное» — остаются напоминание и «серия под угрозой», остальное выключается одним тапом.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/settings_notifications.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('Уведомления: «Только главное»', () => {
  it('выключает все категории, кроме серии, и серию включает; расписание напоминания не трогает', () => {
    expect(src).toContain("const onlyMainCategories: NotifCategory[] = ['phrase_of_day', 'energy', 'weekly_recap', 'monthly_recap', 'spire', 'friends', 'offers', 'gifts'];");
    expect(src).toContain('const categories = { ...cur.categories, streak: true };');
    expect(src).toContain('for (const cat of onlyMainCategories) categories[cat] = false;');
    const handler = src.slice(src.indexOf('const applyOnlyMain'), src.indexOf('const toggleDaily'));
    expect(handler).not.toContain('schedule');
  });
  it('запись идёт общим persistPrefs (откат и тост ошибки — там), без Firestore', () => {
    const handler = src.slice(src.indexOf('const applyOnlyMain'), src.indexOf('const toggleDaily'));
    expect(handler).toContain('void persistPrefs({ ...cur, categories }, true);');
    expect(handler).not.toMatch(/firestore/i);
  });
  it('кнопка видна, только когда мастер включён и включено что-то не из «главного»', () => {
    expect(src).toContain('{master && onlyMainCategories.some((cat) => prefs.categories[cat]) ? (');
    expect(src).toContain('testID="notif-only-main"');
  });
  it('подпись на 9 языках', () => {
    expect(src).toContain("ru:'Только главное'");
    expect(src).toContain("pl:'Tylko najważniejsze'");
  });
});
