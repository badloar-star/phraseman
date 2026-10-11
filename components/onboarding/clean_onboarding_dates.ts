/**
 * Даты и склонение «дней» для онбординга на 9 языках интерфейса — без Intl (на устройстве он не всегда есть).
 *
 * зачем (координатор 12.10): раньше макет телефона, пуш «Отмени до …» и кнопка «Попробовать N дней бесплатно» показывали русские
 * месяцы и слова на любом языке. Теперь язык берётся из интерфейса. Вывод для русского не изменился.
 */
import type { Lang } from '../../constants/i18n';

type Table<T> = Readonly<Record<'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', T>>;

export const ONBOARDING_LANG_KEYS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
export type OnboardingLangKey = (typeof ONBOARDING_LANG_KEYS)[number];

/** Любой неизвестный язык показываем по-английски (как и остальной онбординг). */
export function onboardingLangKey(lang: Lang | string): OnboardingLangKey {
  return (ONBOARDING_LANG_KEYS as readonly string[]).includes(lang) ? (lang as OnboardingLangKey) : 'en';
}

// Воскресенье первым — как Date.getDay().
const WEEKDAYS_SHORT: Table<readonly string[]> = {
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  uk: ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  'pt-BR': ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
  vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  id: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  tr: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  pl: ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'],
};

const MONTHS_SHORT: Table<readonly string[]> = {
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  uk: ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  'pt-BR': ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  vi: ['thg 1', 'thg 2', 'thg 3', 'thg 4', 'thg 5', 'thg 6', 'thg 7', 'thg 8', 'thg 9', 'thg 10', 'thg 11', 'thg 12'],
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  tr: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  pl: ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'],
};

/** Полные названия месяцев в форме, которая стоит после числа («20 августа»). */
const MONTHS_LONG: Table<readonly string[]> = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  uk: ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  'pt-BR': ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  vi: ['tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6', 'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'],
  id: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  pl: ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'],
};

/** «Вс, 17 авг» — дата на локскрине макета телефона. */
export function formatOnboardingLockDate(d: Date, lang: Lang | string): string {
  const k = onboardingLangKey(lang);
  const weekday = WEEKDAYS_SHORT[k][d.getDay()];
  const month = MONTHS_SHORT[k][d.getMonth()];
  const day = d.getDate();
  return k === 'en' ? `${weekday}, ${month} ${day}` : `${weekday}, ${day} ${month}`;
}

/** «20 августа 2026» — дата в теле пуша «Отмени до …». */
export function formatOnboardingDateLong(d: Date, lang: Lang | string): string {
  const k = onboardingLangKey(lang);
  const day = d.getDate();
  const month = MONTHS_LONG[k][d.getMonth()];
  const year = d.getFullYear();
  if (k === 'en') return `${month} ${day}, ${year}`;
  if (k === 'es' || k === 'pt-BR') return `${day} de ${month} de ${year}`;
  if (k === 'vi') return `${day} ${month}, ${year}`;
  return `${day} ${month} ${year}`;
}

/** Слово «день» в нужной форме после числа: «1 день», «3 дня», «7 дней», «3 дні», «5 днів», «1 day» … */
export function onboardingDaysWord(n: number, lang: Lang | string): string {
  const k = onboardingLangKey(lang);
  const one = n % 10 === 1 && n % 100 !== 11;
  const few = [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100);
  switch (k) {
    case 'ru': return one ? 'день' : few ? 'дня' : 'дней';
    case 'uk': return one ? 'день' : few ? 'дні' : 'днів';
    case 'en': return n === 1 ? 'day' : 'days';
    case 'es': return n === 1 ? 'día' : 'días';
    case 'pt-BR': return n === 1 ? 'dia' : 'dias';
    case 'vi': return 'ngày';
    case 'id': return 'hari';
    case 'tr': return 'gün';
    case 'pl': return n === 1 ? 'dzień' : 'dni';
  }
}
