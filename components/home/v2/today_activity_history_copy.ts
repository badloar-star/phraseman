// ═══════════════════════════════════════════════════════════════════════════
// today_activity_history_copy.ts — тексты ленты истории дней «Сегодня» на 9 языках интерфейса.
//
// зачем (22.10 владелец — восстановить работу 19.10; координатор): лента писала даты и «из 3» только по-русски. Здесь — короткие названия месяцев,
// формат даты и подписи для озвучки. Переводы кроме RU — предложение, носителем не проверены (передать 10 · ПЕРЕВОДЧИК).
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../../constants/i18n';
import { pluralWord, type PluralForms } from '../../../constants/plural';

type Nine = Readonly<Record<'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>>;
const tri = (lang: Lang, w: Nine): string => triLang(lang, w);

const MONTHS: Readonly<Record<'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'id' | 'tr' | 'pl', readonly string[]>> = {
  ru: ['янв.', 'фев.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сен.', 'окт.', 'ноя.', 'дек.'],
  uk: ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'],
  'pt-BR': ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'],
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  tr: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  pl: ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'],
};

/** «21 окт.» / «21 Oct» / «21 thg 10» из ключа дня YYYY-MM-DD; не разобрался — ключ как есть. */
export function todayHistoryDateLabel(lang: Lang, dayKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m) return dayKey;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return dayKey;
  if (lang === 'vi') return `${day} thg ${month}`;
  const names = MONTHS[lang as keyof typeof MONTHS] ?? MONTHS.en;
  return `${day} ${names[month - 1]}`;
}

/** «2 из 3» под кольцами дня. */
export function todayHistoryCount(lang: Lang, done: number, total = 3): string {
  return tri(lang, { ru: `${done} из ${total}`, uk: `${done} з ${total}`, en: `${done} of ${total}`, es: `${done} de ${total}`, 'pt-BR': `${done} de ${total}`, vi: `${done}/${total}`, id: `${done} dari ${total}`, tr: `${done} / ${total}`, pl: `${done} z ${total}` });
}

/** Озвучка дня ленты: «21 окт.: завершено 2 из 3». */
export function todayHistoryDayA11y(lang: Lang, dayKey: string, done: number, total = 3): string {
  const done3 = todayHistoryCount(lang, done, total);
  return tri(lang, {
    ru: `${todayHistoryDateLabel(lang, dayKey)}: завершено ${done3}`, uk: `${todayHistoryDateLabel(lang, dayKey)}: завершено ${done3}`,
    en: `${todayHistoryDateLabel(lang, dayKey)}: ${done3} completed`, es: `${todayHistoryDateLabel(lang, dayKey)}: ${done3} completados`,
    'pt-BR': `${todayHistoryDateLabel(lang, dayKey)}: ${done3} concluídos`, vi: `${todayHistoryDateLabel(lang, dayKey)}: hoàn thành ${done3}`,
    id: `${todayHistoryDateLabel(lang, dayKey)}: selesai ${done3}`, tr: `${todayHistoryDateLabel(lang, dayKey)}: ${done3} tamamlandı`, pl: `${todayHistoryDateLabel(lang, dayKey)}: ukończono ${done3}`,
  });
}

/** Озвучка всей ленты. */
export function todayHistoryRailA11y(lang: Lang): string {
  return tri(lang, { ru: 'История активности за дни', uk: 'Історія активності за дні', en: 'Activity history by day', es: 'Historial de actividad por día', 'pt-BR': 'Histórico de atividade por dia', vi: 'Lịch sử hoạt động theo ngày', id: 'Riwayat aktivitas per hari', tr: 'Günlere göre etkinlik geçmişi', pl: 'Historia aktywności według dni' });
}

/** Заголовок карточки ленты («История» эталона today-scene-concepts.html). */
export function todayHistoryTitle(lang: Lang): string {
  return tri(lang, { ru: 'История', uk: 'Історія', en: 'History', es: 'Historial', 'pt-BR': 'Histórico', vi: 'Lịch sử', id: 'Riwayat', tr: 'Geçmiş', pl: 'Historia' });
}

const FULL_DAYS: Readonly<Record<'ru' | 'uk' | 'pl' | 'other', PluralForms>> = {
  ru: { one: 'полный день', few: 'полных дня', many: 'полных дней' },
  uk: { one: 'повний день', few: 'повні дні', many: 'повних днів' },
  pl: { one: 'pełny dzień', few: 'pełne dni', many: 'pełnych dni' },
  other: { one: '', few: '', many: '' },
};

/** Счётчик справа в заголовке: «1 полный день», «3 полных дня», «0 полных дней»; на остальных языках без склонения по трём формам. */
export function todayHistoryFullDays(lang: Lang, n: number): string {
  const count = Math.max(0, Math.trunc(n));
  if (lang === 'ru' || lang === 'uk' || lang === 'pl') return `${count} ${pluralWord(lang, count, FULL_DAYS[lang])}`;
  const one = count === 1;
  return tri(lang, {
    ru: '', uk: '', pl: '',
    en: `${count} full ${one ? 'day' : 'days'}`,
    es: `${count} ${one ? 'día completo' : 'días completos'}`,
    'pt-BR': `${count} ${one ? 'dia completo' : 'dias completos'}`,
    vi: `${count} ngày đầy đủ`,
    id: `${count} hari penuh`,
    tr: `${count} tam gün`,
  });
}
