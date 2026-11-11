// ═══════════════════════════════════════════════════════════════════════════
// week_recap_story.ts — событие истории «Твоя неделя»: минуты по дням, уроки, минуты и серия — из локальной активности, монеты — из итога недели Пика.
//
// зачем (владелец 11.11: «заводи события недели и диалога», о монетах — «Монеты Пика»): шаблон кадра «Твоя неделя» был, а события никто не
// создавал. Общего учёта монет по дням в приложении нет, поэтому историю получает участник Пика: момент записи — когда пришёл итог его
// прошлой недели (там и факт «неделя закрыта», и монеты). Неделя та же, что у Пика: понедельник–воскресенье по UTC.
// Firebase-экономия: ни одного чтения Firestore — активность лежит на телефоне (AsyncStorage), итог недели уже прочитан загрузчиком Пика.
// Журнал: [STORY-WEEK] — вход, каждое решение и причина отказа.
// ═══════════════════════════════════════════════════════════════════════════
import { isCurrentAccountGeneration, type AccountGenerationToken } from '../../app/account_generation';
import { DebugLogger } from '../../app/debug-logger';
import { spireWeekStartMs } from '../spire/residents';
import { recordStoryEvent, type StoryRecordResult } from './story_events_store';

const LOG = '[STORY-WEEK]';
const DAY_MS = 86_400_000;

/** День активности — то, что нужно истории из Activity365Day (локальная аналитика). */
export type WeekRecapDay = Readonly<{ date: string; minutes: number; metrics: Readonly<{ lessons: number }> }>;

export type WeekRecapPayload = Readonly<{ startDayKey: string; dailyMinutes: string; lessons: number; coins: number; minutes: number; streak: number }>;

const pad2 = (n: number): string => String(n).padStart(2, '0');
const utcDayKey = (ms: number): string => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`; };
const whole = (n: unknown): number => { const v = Math.trunc(Number(n)); return Number.isFinite(v) && v > 0 ? v : 0; };

/** Понедельник ПРОШЛОЙ недели Пика (UTC) ключом дня — та неделя, итог которой только что пришёл. */
export function weekRecapStartDayKey(nowMs: number): string {
  return utcDayKey(spireWeekStartMs(nowMs) - 7 * DAY_MS);
}

/** Семь ключей дней недели, начиная с понедельника. */
export function weekRecapDayKeys(startDayKey: string): string[] {
  const [y, m, d] = startDayKey.split('-').map((part) => Number(part));
  const startMs = Date.UTC(y ?? NaN, (m ?? NaN) - 1, d ?? NaN);
  return Number.isFinite(startMs) ? Array.from({ length: 7 }, (_, i) => utcDayKey(startMs + i * DAY_MS)) : [];
}

/**
 * Данные события из активности недели; null — недели нет (битый ключ) или она пустая: ни минут, ни уроков — рассказывать не о чем.
 * Формат `dailyMinutes` — «42,70,55,…», его читает кадр «Твоя неделя» (story_template_from_event → numList).
 */
export function weekRecapPayload(input: Readonly<{ startDayKey: string; days: readonly WeekRecapDay[]; coins: number; streak: number }>): WeekRecapPayload | null {
  const keys = weekRecapDayKeys(input.startDayKey);
  if (keys.length !== 7) return null;
  const byDate = new Map(input.days.map((day) => [day.date, day]));
  const perDay = keys.map((key) => whole(byDate.get(key)?.minutes)); // guard-ok: byDate — словарь в памяти (Map), не Firestore
  const lessons = keys.reduce((sum, key) => sum + whole(byDate.get(key)?.metrics.lessons), 0); // guard-ok: тот же словарь в памяти
  const minutes = perDay.reduce((sum, value) => sum + value, 0);
  if (minutes === 0 && lessons === 0) return null;
  return { startDayKey: input.startDayKey, dailyMinutes: perDay.join(','), lessons, coins: whole(input.coins), minutes, streak: whole(input.streak) };
}

/** Какие недели уже пробовали собрать в этом запуске: итог Пика приходит из трёх мест при каждом входе — активность читаем один раз. */
const attempted = new Set<string>();

export function __resetWeekRecapStoryForTests(): void {
  attempted.clear();
}

/**
 * Итог недели Пика пришёл → история «Твоя неделя». Ничего не бросает; вызывающий не ждёт (`void recordWeekRecapStory(...)`).
 * `loadDays` подменяется в тесте; в приложении активность грузится лениво — модуль аналитики не попадает в запуск.
 */
export async function recordWeekRecapStory(
  fact: Readonly<{ weekCoins?: number }>,
  accountToken: AccountGenerationToken,
  nowMs: number = Date.now(),
  loadDays: () => Promise<Readonly<{ days: readonly WeekRecapDay[]; currentStreak: number }>> = async () => (await import('../../app/activity_365_analytics')).loadActivity365Analytics(),
): Promise<StoryRecordResult | undefined> {
  const startDayKey = weekRecapStartDayKey(nowMs);
  const attemptKey = `${accountToken.stableId ?? 'нет-аккаунта'}:${startDayKey}`;
  if (attempted.has(attemptKey)) return undefined; // тихо: тот же итог недели приходит при каждом входе, решение уже принято и записано в журнал
  attempted.add(attemptKey); // guard-ok: отметка в памяти процесса (Set), не данные человека; сама запись ниже ждётся и ловится
  try {
    DebugLogger.info(LOG, `вход: неделя с ${startDayKey} монетыПика=${String(fact.weekCoins ?? 'нет')}`);
    const analytics = await loadDays();
    if (!isCurrentAccountGeneration(accountToken)) {
      DebugLogger.info(LOG, `не пишем: аккаунт сменился, пока читалась активность (неделя с ${startDayKey})`);
      return { recorded: false, reason: 'account_changed' };
    }
    const payload = weekRecapPayload({ startDayKey, days: analytics.days, coins: fact.weekCoins ?? 0, streak: analytics.currentStreak });
    if (!payload) {
      DebugLogger.info(LOG, `не пишем: неделя с ${startDayKey} пустая — ни минут, ни уроков (дней в аналитике ${analytics.days.length})`);
      return undefined;
    }
    DebugLogger.info(LOG, `пишем: неделя с ${startDayKey} минутыПоДням=${payload.dailyMinutes} уроков=${payload.lessons} монет=${payload.coins} минут=${payload.minutes} серия=${payload.streak}`);
    return await recordStoryEvent('week_recap', payload, nowMs, { accountToken });
  } catch (error: unknown) {
    // сбой чтения активности не должен мешать итогу недели Пика; попытку снимаем — следующий вход попробует снова
    attempted.delete(attemptKey);
    DebugLogger.warn(LOG, `сбой: неделя с ${startDayKey} не записана — ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}
