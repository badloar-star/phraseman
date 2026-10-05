import type { Lang } from '../../constants/i18n';
import { pluralWord } from '../../constants/plural';

// зачем (Сверка video-009, макет video.html «2 дня назад», «месяц назад»): дата ролика — относительная, по языку
// интерфейса. Intl.RelativeTimeFormat в Hermes нет, поэтому свои формы на 9 языков.
type Unit = 'day' | 'week' | 'month' | 'year';
type Forms = Readonly<{ today: string; yesterday: string; one: Record<Unit, string>; many: (n: number, unit: Unit) => string }>;

const RU_UNITS: Record<Unit, { one: string; few: string; many: string }> = {
  day: { one: 'день', few: 'дня', many: 'дней' },
  week: { one: 'неделю', few: 'недели', many: 'недель' },
  month: { one: 'месяц', few: 'месяца', many: 'месяцев' },
  year: { one: 'год', few: 'года', many: 'лет' },
};
const UK_UNITS: Record<Unit, { one: string; few: string; many: string }> = {
  day: { one: 'день', few: 'дні', many: 'днів' },
  week: { one: 'тиждень', few: 'тижні', many: 'тижнів' },
  month: { one: 'місяць', few: 'місяці', many: 'місяців' },
  year: { one: 'рік', few: 'роки', many: 'років' },
};
const PL_UNITS: Record<Unit, { one: string; few: string; many: string }> = {
  day: { one: 'dzień', few: 'dni', many: 'dni' },
  week: { one: 'tydzień', few: 'tygodnie', many: 'tygodni' },
  month: { one: 'miesiąc', few: 'miesiące', many: 'miesięcy' },
  year: { one: 'rok', few: 'lata', many: 'lat' },
};
const simple = (words: Record<Unit, [string, string]>, wrap: (text: string) => string) => (n: number, unit: Unit) =>
  wrap(`${n} ${n === 1 ? words[unit][0] : words[unit][1]}`);

const FORMS: Record<string, Forms> = {
  ru: {
    today: 'сегодня', yesterday: 'вчера',
    one: { day: 'день назад', week: 'неделю назад', month: 'месяц назад', year: 'год назад' },
    many: (n, unit) => `${n} ${pluralWord('ru' as Lang, n, RU_UNITS[unit])} назад`,
  },
  uk: {
    today: 'сьогодні', yesterday: 'вчора',
    one: { day: 'день тому', week: 'тиждень тому', month: 'місяць тому', year: 'рік тому' },
    many: (n, unit) => `${n} ${pluralWord('uk' as Lang, n, UK_UNITS[unit])} тому`,
  },
  pl: {
    today: 'dzisiaj', yesterday: 'wczoraj',
    one: { day: 'dzień temu', week: 'tydzień temu', month: 'miesiąc temu', year: 'rok temu' },
    many: (n, unit) => `${n} ${pluralWord('pl' as Lang, n, PL_UNITS[unit])} temu`,
  },
  en: {
    today: 'today', yesterday: 'yesterday',
    one: { day: '1 day ago', week: '1 week ago', month: '1 month ago', year: '1 year ago' },
    many: simple({ day: ['day', 'days'], week: ['week', 'weeks'], month: ['month', 'months'], year: ['year', 'years'] }, (t) => `${t} ago`),
  },
  es: {
    today: 'hoy', yesterday: 'ayer',
    one: { day: 'hace 1 día', week: 'hace 1 semana', month: 'hace 1 mes', year: 'hace 1 año' },
    many: simple({ day: ['día', 'días'], week: ['semana', 'semanas'], month: ['mes', 'meses'], year: ['año', 'años'] }, (t) => `hace ${t}`),
  },
  'pt-BR': {
    today: 'hoje', yesterday: 'ontem',
    one: { day: 'há 1 dia', week: 'há 1 semana', month: 'há 1 mês', year: 'há 1 ano' },
    many: simple({ day: ['dia', 'dias'], week: ['semana', 'semanas'], month: ['mês', 'meses'], year: ['ano', 'anos'] }, (t) => `há ${t}`),
  },
  vi: {
    today: 'hôm nay', yesterday: 'hôm qua',
    one: { day: '1 ngày trước', week: '1 tuần trước', month: '1 tháng trước', year: '1 năm trước' },
    many: simple({ day: ['ngày', 'ngày'], week: ['tuần', 'tuần'], month: ['tháng', 'tháng'], year: ['năm', 'năm'] }, (t) => `${t} trước`),
  },
  id: {
    today: 'hari ini', yesterday: 'kemarin',
    one: { day: '1 hari lalu', week: '1 minggu lalu', month: '1 bulan lalu', year: '1 tahun lalu' },
    many: simple({ day: ['hari', 'hari'], week: ['minggu', 'minggu'], month: ['bulan', 'bulan'], year: ['tahun', 'tahun'] }, (t) => `${t} lalu`),
  },
  tr: {
    today: 'bugün', yesterday: 'dün',
    one: { day: '1 gün önce', week: '1 hafta önce', month: '1 ay önce', year: '1 yıl önce' },
    many: simple({ day: ['gün', 'gün'], week: ['hafta', 'hafta'], month: ['ay', 'ay'], year: ['yıl', 'yıl'] }, (t) => `${t} önce`),
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** «2 дня назад» по дате публикации; пустая строка для пустой/битой даты. Будущая дата — «сегодня». */
export function formatRelativeVideoDate(iso: string | undefined, lang: Lang | string, nowMs: number = Date.now()): string {
  if (!iso) return '';
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return '';
  const forms = FORMS[lang as string] ?? FORMS.en;
  const days = Math.floor(Math.max(0, nowMs - at) / DAY_MS);
  if (days < 1) return forms.today;
  if (days === 1) return forms.yesterday;
  const [n, unit]: [number, Unit] = days < 7 ? [days, 'day']
    : days < 30 ? [Math.floor(days / 7), 'week']
      : days < 365 ? [Math.floor(days / 30), 'month']
        : [Math.floor(days / 365), 'year'];
  return n === 1 ? forms.one[unit] : forms.many(n, unit);
}
