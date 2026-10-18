// youtube_title_display.ts — как показывать заголовки роликов и отсчёт до премьеры (только вид, данные каталога не меняются).
//
// зачем (координатор 18.10, кадр modals_1018/walk/03_light_video): заголовки из YouTube приходят с пустыми разделителями
// «АНГЛИЙСКИЙ | | Учим…», а отсчёт премьеры читался как «Од 7ч 52мин» (ноль дней + слитые единицы). Здесь — чистка
// заголовка и человеческий отсчёт «Через 7 ч 52 мин» на 9 языках; ведущие нулевые единицы не печатаются.
import { triLang, type Lang } from '../constants/i18n';

const NBSP = ' ';

/** «A | | B», «A || B», «A |  | B» → «A | B»; повторные пробелы схлопываются, края обрезаются. */
export function cleanYoutubeTitle(raw: string): string {
  return raw
    .replace(/\s*\|(?:\s*\|)+\s*/g, ' | ')
    .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

type Units = Readonly<{ d: string; h: string; m: string; s: string }>;

function unitsFor(lang: Lang): Units {
  return triLang(lang, {
    ru: { d: 'д', h: 'ч', m: 'мин', s: 'с' },
    uk: { d: 'дн', h: 'год', m: 'хв', s: 'с' },
    en: { d: 'd', h: 'h', m: 'min', s: 's' },
    es: { d: 'd', h: 'h', m: 'min', s: 's' },
    'pt-BR': { d: 'd', h: 'h', m: 'min', s: 's' },
    vi: { d: 'ngày', h: 'giờ', m: 'phút', s: 'giây' },
    id: { d: 'hr', h: 'jam', m: 'mnt', s: 'dtk' },
    tr: { d: 'g', h: 'sa', m: 'dk', s: 'sn' },
    pl: { d: 'd', h: 'godz.', m: 'min', s: 's' },
  });
}

/** «Через 7 ч 52 мин» / «In 7 h 52 min» / «7 sa 52 dk sonra»; без дней, если их 0; секунды — только если переданы. */
export function premiereCountdownText(lang: Lang, days: number, hours: number, minutes: number, seconds: number | null | undefined): string {
  const u = unitsFor(lang);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}${NBSP}${u.d}`);
  if (days > 0 || hours > 0) parts.push(`${hours}${NBSP}${u.h}`);
  parts.push(`${minutes}${NBSP}${u.m}`);
  if (seconds != null) parts.push(`${seconds}${NBSP}${u.s}`);
  const t = parts.join(' ');
  return triLang(lang, {
    ru: `Через ${t}`, uk: `Через ${t}`, en: `In ${t}`, es: `En ${t}`, 'pt-BR': `Em ${t}`,
    vi: `Còn ${t}`, id: `Dalam ${t}`, tr: `${t} sonra`, pl: `Za ${t}`,
  });
}
