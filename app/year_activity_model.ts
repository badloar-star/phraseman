// зачем (владелец 13.10, вопрос 17; макет results.html телефон 9/14, results-009): экран «Активность за год» — отдельный экран с большой сеткой дней.
// Модель сетки и итогов вынесена в чистую функцию без React Native: точечный тест, а экран только рисует. Данные — те же, что рисует полоска
// (Activity365Day из app/activity_365_analytics): окно — последние 365 дней, оканчивающиеся последним наблюдаемым днём, как у полоски.
// Файл лежит в app/: без default-экспорта, чтобы роутер не принял его за экран.
import { emptyActivity365Day, latestObservedActivity365Date, type Activity365Day } from './activity_365_analytics';

export const YEAR_ACTIVITY_DAYS = 365;
/** Макет `.heatmap`: 13 колонок, клетки квадратные, порядок «по строкам» (13 подряд идущих дней в ряд), 29 рядов (365 = 28 × 13 + 1: 28 полных рядов и одна клетка в последнем). */
export const YEAR_ACTIVITY_COLS = 13;

export type YearActivityModel = Readonly<{
  cells: readonly Activity365Day[];
  rows: number;
  year: number;
  firstDate: string;
  lastDate: string;
  phrasesLearned: number;
  minutes: number;
  activeDays: number;
}>;

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(dateKey: string, delta: number): string {
  const [year, month, day] = dateKey.split('-').map(Number) as [number, number, number];
  return toDateKey(new Date(Date.UTC(year, month - 1, day + delta)));
}

/** Последние 365 дней по `days` (отсутствующие — пустые), итоги окна и год последнего дня. `todayKey` — для тестов. */
export function buildYearActivityModel(days: readonly Activity365Day[], todayKey?: string): YearActivityModel {
  const lastDate = todayKey ?? latestObservedActivity365Date(days) ?? toDateKey(new Date());
  const firstDate = addUtcDays(lastDate, -(YEAR_ACTIVITY_DAYS - 1));
  const byDate = new Map(days.filter((day) => !day.future).map((day) => [day.date, day]));
  const cells: Activity365Day[] = [];
  let phrasesLearned = 0;
  let minutes = 0;
  let activeDays = 0;
  for (let index = 0; index < YEAR_ACTIVITY_DAYS; index += 1) {
    const dateKey = addUtcDays(firstDate, index);
    const day = byDate.get(dateKey) ?? emptyActivity365Day(dateKey);
    cells.push(day);
    phrasesLearned += Math.max(0, day.metrics.phrasesLearned);
    minutes += Math.max(0, day.minutes);
    if (day.active) activeDays += 1;
  }
  return {
    cells,
    rows: Math.ceil(cells.length / YEAR_ACTIVITY_COLS),
    year: Number(lastDate.slice(0, 4)),
    firstDate,
    lastDate,
    phrasesLearned,
    minutes,
    activeDays,
  };
}

const HOURS_MINUTES: Readonly<Record<string, readonly [string, string]>> = Object.freeze({
  ru: ['ч', 'мин'], uk: ['год', 'хв'], en: ['h', 'min'], es: ['h', 'min'], 'pt-BR': ['h', 'min'],
  vi: ['giờ', 'phút'], id: ['jam', 'mnt'], tr: ['sa', 'dk'], pl: ['godz.', 'min'],
});

/** «18 ч 42 мин» / «42 мин» / «0 мин» — по языку интерфейса (макет: «18 ч 42 мин»). */
export function formatPracticeTime(totalMinutes: number, lang: string): string {
  const [h, m] = HOURS_MINUTES[lang] ?? HOURS_MINUTES.en!;
  const total = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} ${m}`;
  return `${hours} ${h} ${minutes} ${m}`;
}
