// зачем (владелец 13.10, вопрос 17; макет results.html телефон 9/14): модель экрана «Активность за год» и связность маршрута.
import fs from 'node:fs';
import path from 'node:path';

import type { Activity365Day } from '../app/activity_365_analytics';
import { buildYearActivityModel, formatPracticeTime, YEAR_ACTIVITY_COLS, YEAR_ACTIVITY_DAYS } from '../app/year_activity_model';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

function day(date: string, minutes: number, phrases: number): Activity365Day {
  return { date, level: minutes > 30 ? 4 : minutes > 0 ? 2 : 0, minutes, active: minutes > 0, future: false, metrics: { lessons: 0, review: 0, wordsLearned: 0, phrasesLearned: phrases, flashcardsSaved: 0 } } as Activity365Day;
}

describe('модель «Активность за год»', () => {
  it('365 клеток, 13 колонок, 29 рядов (28 полных + 1), окно оканчивается последним днём; год — год последнего дня', () => {
    const m = buildYearActivityModel([], '2026-10-13');
    expect(YEAR_ACTIVITY_COLS).toBe(13);
    expect(m.cells).toHaveLength(YEAR_ACTIVITY_DAYS);
    expect(m.rows).toBe(29); // 28 полных рядов по 13 и одна клетка в последнем (как в макете: 365 клеток в сетке из 13 колонок)
    expect(m.cells[m.cells.length - 1]!.date).toBe('2026-10-13');
    expect(m.firstDate).toBe('2025-10-14');
    expect(m.year).toBe(2026);
    expect(m.phrasesLearned).toBe(0);
    expect(m.minutes).toBe(0);
  });

  it('итоги — сумма по окну; дни вне окна и будущие не считаются; пустые дни добавляются', () => {
    const days = [day('2026-10-13', 42, 3), day('2026-10-12', 60, 10), day('2024-01-01', 500, 99)];
    const m = buildYearActivityModel(days, '2026-10-13');
    expect(m.phrasesLearned).toBe(13);
    expect(m.minutes).toBe(102);
    expect(m.activeDays).toBe(2);
    expect(m.cells.filter((c) => c.active)).toHaveLength(2);
  });

  it('без todayKey окно оканчивается последним наблюдаемым днём (как у полоски)', () => {
    const m = buildYearActivityModel([day('2026-05-05', 10, 1)]);
    expect(m.lastDate).toBe('2026-05-05');
    expect(m.year).toBe(2026);
  });

  it('время практики по языку интерфейса: «18 ч 42 мин», «42 мин», uk/en', () => {
    expect(formatPracticeTime(18 * 60 + 42, 'ru')).toBe('18 ч 42 мин');
    expect(formatPracticeTime(42, 'ru')).toBe('42 мин');
    expect(formatPracticeTime(0, 'ru')).toBe('0 мин');
    expect(formatPracticeTime(125, 'uk')).toBe('2 год 5 хв');
    expect(formatPracticeTime(125, 'en')).toBe('2 h 5 min');
    expect(formatPracticeTime(125, 'xx')).toBe('2 h 5 min');
  });
});

describe('маршрут «Активность за год»', () => {
  it('полоска открывает экран, а не окно месяца; экран зарегистрирован; логи [YEAR-ACTIVITY]', () => {
    const strip = read('components/ActivityHeatmap365.tsx');
    expect(strip).toContain("router.push('/year_activity' as never)");
    expect(strip).toContain('[YEAR-ACTIVITY]');
    expect(strip).toContain('export function MonthExplorerModal');
    expect(read('app/_layout.tsx')).toContain('<Stack.Screen name="year_activity" />');
    expect(read('app/product_analytics_screen_registry.ts')).toContain("'year_activity'");
    const screen = read('app/year_activity.tsx');
    expect(screen).toContain('peekActivity365Analytics');
    expect(screen).toContain('loadActivity365Analytics');
    expect(screen).toContain('?? NO_DAYS'); // зачем (ревью 13.10): стабильная ссылка на пустой список
    expect(screen).not.toContain('?? []');
    expect(screen).toContain('[YEAR-ACTIVITY]');
    expect(screen).not.toMatch(/borderWidth|ActivityIndicator|adjustsFontSizeToFit/);
  });
});
