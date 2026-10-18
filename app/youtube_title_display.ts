// youtube_title_display.ts — как показывать заголовки роликов и отсчёт до премьеры (только вид, данные каталога не меняются).
//
// зачем (координатор 18.10, кадр modals_1018/walk/03_light_video): заголовки из YouTube приходят с пустыми разделителями
// «АНГЛИЙСКИЙ | | Учим…», а отсчёт премьеры читался как «Од 7ч 52мин» (ноль дней + слитые единицы). Здесь — чистка
// заголовка и человеческий отсчёт «Через 7 ч 52 мин» на 9 языках; ведущие нулевые единицы не печатаются.
import { triLang, type Lang } from '../constants/i18n';
import { pluralWord, type PluralForms } from '../constants/plural';

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

type SpokenUnit = Readonly<{ d: PluralForms; h: PluralForms; m: PluralForms }>;

const two = (one: string, many: string): PluralForms => ({ one, few: many, many });

// Полные слова для читалки (Ревизор c3c420861 🟡, координатор 18.10): «7 ч 52 мин» читалка произносила как буквы — нужен человеческий текст.
function spokenUnitsFor(lang: Lang): SpokenUnit {
  return triLang(lang, {
    // зачем (Переводчик 18.10): после «через» / «za» — винительный падеж: «через 1 минуту / 21 минуту», «через годину», «za godzinę»
    ru: { d: { one: 'день', few: 'дня', many: 'дней' }, h: { one: 'час', few: 'часа', many: 'часов' }, m: { one: 'минуту', few: 'минуты', many: 'минут' } },
    uk: { d: { one: 'день', few: 'дні', many: 'днів' }, h: { one: 'годину', few: 'години', many: 'годин' }, m: { one: 'хвилину', few: 'хвилини', many: 'хвилин' } },
    en: { d: two('day', 'days'), h: two('hour', 'hours'), m: two('minute', 'minutes') },
    es: { d: two('día', 'días'), h: two('hora', 'horas'), m: two('minuto', 'minutos') },
    'pt-BR': { d: two('dia', 'dias'), h: two('hora', 'horas'), m: two('minuto', 'minutos') },
    vi: { d: two('ngày', 'ngày'), h: two('giờ', 'giờ'), m: two('phút', 'phút') },
    id: { d: two('hari', 'hari'), h: two('jam', 'jam'), m: two('menit', 'menit') },
    tr: { d: two('gün', 'gün'), h: two('saat', 'saat'), m: two('dakika', 'dakika') },
    pl: { d: { one: 'dzień', few: 'dni', many: 'dni' }, h: { one: 'godzinę', few: 'godziny', many: 'godzin' }, m: { one: 'minutę', few: 'minuty', many: 'minut' } },
  });
}

/**
 * Отсчёт для читалки целыми словами: «Через 7 часов 52 минуты» / «In 7 hours 52 minutes» / «7 saat 52 dakika sonra».
 * Нулевые часы при днях пропускаются, секунд нет; минуты печатаются, когда они есть или других частей нет.
 */
export function premiereCountdownSpoken(lang: Lang, days: number, hours: number, minutes: number): string {
  const u = spokenUnitsFor(lang);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${pluralWord(lang, days, u.d)}`);
  if (hours > 0) parts.push(`${hours} ${pluralWord(lang, hours, u.h)}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} ${pluralWord(lang, minutes, u.m)}`);
  const t = parts.join(' ');
  return triLang(lang, {
    ru: `Через ${t}`, uk: `Через ${t}`, en: `In ${t}`, es: `En ${t}`, 'pt-BR': `Em ${t}`,
    vi: `Còn ${t}`, id: `Dalam ${t}`, tr: `${t} sonra`, pl: `Za ${t}`,
  });
}

/* expo-router: app/ files are treated as routes and need a default export (замечание Ревизора по ef7879a33). */
export default function __YoutubeTitleDisplayRouteShim() {
  return null;
}
