// ═══════════════════════════════════════════════════════════════════════════
// announcement_v2_dates.ts — даты кадров объявлений на языке интерфейса: лист календаря («10 · ноября · вторник») и месяц панели «Редакция» («Окт»).
//
// зачем (Переводчик 28.10: «месяц и даты — через Intl.DateTimeFormat(lang), не строкой»): тот же подход, что у личных кадров
// (story_template_dates): кэш форматтеров, сбой Intl — лог [STORY-ANN2] и запасная запись числами.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { DebugLogger } from '../../../app/debug-logger';

const LOG = '[STORY-ANN2]';
const cache = new Map<string, Intl.DateTimeFormat | null>();

function formatter(lang: Lang, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat | null {
  const key = `${lang}|${JSON.stringify(opts)}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let made: Intl.DateTimeFormat | null = null;
  try {
    made = new Intl.DateTimeFormat(lang, opts);
  } catch (e: unknown) {
    DebugLogger.info(LOG, `Intl.DateTimeFormat недоступен lang=${lang} opts=${key}: ${String(e)} — запасная запись`);
  }
  cache.set(key, made); // guard-ok: кэш форматтеров в памяти, не запись данных
  return made;
}

const capital = (s: string): string => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);

export type CalendarLeaf = Readonly<{ day: string; month: string; weekday: string }>;

/** Лист календаря: число, месяц в родительном падеже (как в «10 ноября») и день недели — всё на языке интерфейса. */
export function calendarLeaf(lang: Lang, ms: number): CalendarLeaf {
  const date = new Date(ms);
  const fallback: CalendarLeaf = { day: String(date.getDate()), month: String(date.getMonth() + 1).padStart(2, '0'), weekday: '' };
  const dm = formatter(lang, { day: 'numeric', month: 'long' });
  const wd = formatter(lang, { weekday: 'long' });
  try {
    const parts = dm && typeof dm.formatToParts === 'function' ? dm.formatToParts(date) : null;
    const month = parts ? parts.filter((p) => p.type === 'month').map((p) => p.value).join('') : '';
    const weekday = wd ? wd.format(date) : '';
    if (!month) { DebugLogger.info(LOG, `calendarLeaf: месяц не разобран lang=${lang} ms=${ms} — запасная запись`); return { ...fallback, weekday }; }
    return { day: String(date.getDate()), month, weekday };
  } catch (e: unknown) {
    DebugLogger.info(LOG, `calendarLeaf упал lang=${lang} ms=${ms}: ${String(e)} — запасная запись`);
    return fallback;
  }
}

/** «Окт» / «Oct» — короткий месяц без точки, с заглавной (панель «Редакция»). */
export function shortMonth(lang: Lang, ms: number): string {
  const f = formatter(lang, { month: 'short' });
  const date = new Date(ms);
  try {
    const raw = f ? f.format(date) : String(date.getMonth() + 1);
    return capital(raw.replace(/\.$/, ''));
  } catch (e: unknown) {
    DebugLogger.info(LOG, `shortMonth упал lang=${lang} ms=${ms}: ${String(e)} — запасная запись`);
    return String(date.getMonth() + 1);
  }
}
