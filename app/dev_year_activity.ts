/**
 * Dev-подмена экрана «Активность за год» (results-009) — только __DEV__, только память.
 *
 * зачем (координатор 13.10): у тестового аккаунта статистики за год нет — сетка пустая, и Сверке не с чем сравнить образец
 * results.html#9. Подмена отдаёт 365 дней по узору образца (extension.css .heatmap: n-я клетка кратна 17 → ярко, 7 → средне,
 * 4 → слабо, остальные пусто) и итоги образца — «Фраз выучено 184», «Время практики 18 ч 42 мин». Ничего не пишет: ни
 * AsyncStorage, ни статистику, ни облако. Файл в app/ без default-экспорта — роутер его не примет за экран.
 */
import { emptyActivity365Day, type Activity365Day, type Activity365Level } from './activity_365_analytics';
import { addUtcDays, YEAR_ACTIVITY_DAYS } from './year_activity_model';

const LOG = '[DEV-YEAR-ACTIVITY]';
export const DEV_YEAR_ACTIVITY_PHRASES = 184;
export const DEV_YEAR_ACTIVITY_MINUTES = 18 * 60 + 42;

let enabled = false;

const isDev = (): boolean => typeof __DEV__ !== 'undefined' && __DEV__;

export function setDevYearActivityDemo(next: boolean): boolean {
  if (!isDev()) {
    console.warn(`${LOG} отказ: не __DEV__`); // guard-ok: ранний выход
    return false;
  }
  enabled = next;
  console.log(`${LOG} ${next ? 'demo включён' : 'снят'}`);
  return true;
}

/** Уровень клетки по её номеру n (1…365) — как в CSS образца: более поздние правила перекрывают ранние. */
export function devYearActivityLevel(n: number): Activity365Level {
  if (n % 17 === 0) return 4;
  if (n % 7 === 0) return 2;
  if (n % 4 === 0) return 1;
  return 0;
}

/** 365 дней, оканчивающиеся `lastDateKey`; итоги ровно 184 фразы и 1122 минуты (остаток — на последний активный день). */
export function buildDevYearActivityDays(lastDateKey: string): Activity365Day[] {
  const firstDate = addUtcDays(lastDateKey, -(YEAR_ACTIVITY_DAYS - 1));
  const levels = Array.from({ length: YEAR_ACTIVITY_DAYS }, (_, index) => devYearActivityLevel(index + 1));
  const weightTotal = levels.reduce<number>((sum, level) => sum + level, 0);
  const lastActive = levels.reduce((last, level, index) => (level > 0 ? index : last), -1);
  let phrasesLeft = DEV_YEAR_ACTIVITY_PHRASES;
  let minutesLeft = DEV_YEAR_ACTIVITY_MINUTES;
  return levels.map((level, index) => {
    const date = addUtcDays(firstDate, index);
    if (level === 0) return emptyActivity365Day(date);
    const phrases = index === lastActive ? phrasesLeft : Math.floor((DEV_YEAR_ACTIVITY_PHRASES * level) / weightTotal);
    const minutes = index === lastActive ? minutesLeft : Math.floor((DEV_YEAR_ACTIVITY_MINUTES * level) / weightTotal);
    phrasesLeft -= phrases;
    minutesLeft -= minutes;
    const base = emptyActivity365Day(date);
    return { ...base, level, minutes, active: true, metrics: { ...base.metrics, lessons: 1, phrasesLearned: phrases } };
  });
}

/** Дни подмены для экрана или null (подмена выключена / не dev). */
export function peekDevYearActivityDays(): Activity365Day[] | null {
  if (!enabled || !isDev()) return null;
  const today = new Date().toISOString().slice(0, 10);
  console.log(`${LOG} экран берёт demo-дни: последний=${today}`);
  return buildDevYearActivityDays(today);
}
