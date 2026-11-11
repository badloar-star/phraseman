import { addLocalDays } from '../../../app/local_date';

export function homeWeekDays(todayKey: string, countedDays: ReadonlySet<string>, todayCounted: boolean) {
  const weekday = new Date(`${todayKey}T12:00:00Z`).getUTCDay();
  const monday = addLocalDays(todayKey, -((weekday + 6) % 7));

  return Array.from({ length: 7 }, (_, index) => {
    const date = addLocalDays(monday, index);
    return { date, isToday: date === todayKey, counted: date <= todayKey && (countedDays.has(date) || (date === todayKey && todayCounted)) };
  });
}
