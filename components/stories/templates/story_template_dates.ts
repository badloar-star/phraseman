// ═══════════════════════════════════════════════════════════════════════════
// story_template_dates.ts — даты кадров историй на языке интерфейса: буква дня недели, «20 июля», «20–26 октября», «Октябрь».
//
// зачем (Переводчик 28.10: «месяц и даты — через Intl.DateTimeFormat(lang), не строкой»): одна точка форматирования с кэшем форматтеров
// (создание Intl.DateTimeFormat дорогое — кадр не создаёт его на каждый рендер). Сбой Intl на устройстве — лог [STORY-TPL] и запасная запись.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { DebugLogger } from '../../../app/debug-logger';

const LOG = '[STORY-TPL]';
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

function safeFormat(lang: Lang, opts: Intl.DateTimeFormatOptions, ms: number, fallback: string): string {
  const f = formatter(lang, opts);
  if (!f) return fallback;
  try {
    return f.format(new Date(ms));
  } catch (e: unknown) {
    DebugLogger.info(LOG, `format упал lang=${lang} ms=${ms}: ${String(e)} — запасная запись «${fallback}»`);
    return fallback;
  }
}

const capital = (s: string): string => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);

/** Буква дня недели (П, В, С… / M, T, W…) — подпись клетки календаря недели. */
export function weekdayLetter(lang: Lang, ms: number): string {
  return capital(safeFormat(lang, { weekday: 'narrow' }, ms, String(new Date(ms).getDate())));
}

/** «20 июля» / «July 20». */
export function dayMonth(lang: Lang, ms: number): string {
  const d = new Date(ms);
  return safeFormat(lang, { day: 'numeric', month: 'long' }, ms, `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`);
}

/** «Октябрь» — название месяца с заглавной (итог месяца). */
export function monthName(lang: Lang, ms: number): string {
  return capital(safeFormat(lang, { month: 'long' }, ms, String(new Date(ms).getMonth() + 1)));
}

/** «20–26 октября» (один месяц: число конца заменяется на «20–26» в разметке языка) или «28 сентября – 4 октября». */
export function weekRange(lang: Lang, startMs: number, endMs: number): string {
  const a = new Date(startMs);
  const b = new Date(endMs);
  if (a.getMonth() !== b.getMonth() || a.getFullYear() !== b.getFullYear()) return `${dayMonth(lang, startMs)} – ${dayMonth(lang, endMs)}`;
  const f = formatter(lang, { day: 'numeric', month: 'long' });
  try {
    if (f && typeof f.formatToParts === 'function') {
      return f.formatToParts(b).map((part) => (part.type === 'day' ? `${a.getDate()}–${b.getDate()}` : part.value)).join('');
    }
    DebugLogger.info(LOG, `formatToParts нет lang=${lang} — диапазон двумя датами`);
  } catch (e: unknown) {
    DebugLogger.info(LOG, `formatToParts упал lang=${lang}: ${String(e)} — диапазон двумя датами`);
  }
  return `${dayMonth(lang, startMs)} – ${dayMonth(lang, endMs)}`;
}

/** Полдень календарного дня `dayKey` (YYYY-MM-DD) по часам устройства; не дата — null. */
export function dayKeyToMs(dayKey: unknown): number | null {
  if (typeof dayKey !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m) return null;
  const ms = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export const DAY_MS = 86_400_000;
