/**
 * «Итог недели друга» (идея 6) — тексты на 9 языках.
 *
 * зачем (координатор 22.10): черновик Переводчика docs/work/tasks/friends-6-8-9-copy-draft.md (2504f949e), порядок колонок как
 * в pair_copy.ts. Имена не склоняем (подстановка {name} только там, где падеж не нужен), род друга неизвестен — безличные формы.
 * Даты и дни недели — через Intl, а не таблицей. Отклонения от макета помечены ⚑ — их сверит «Сверка».
 */
import { triLang, type Lang } from '../../constants/i18n';

type L9 = Readonly<{ ru: string; uk: string; en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>;
const L = (ru: string, uk: string, en: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string): L9 =>
  ({ ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
const pick = (lang: Lang, copy: L9): string => triLang(lang, copy);

function slavic(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

const WEEK_COPY = {
  railTitle: L('Итоги недели', 'Підсумки тижня', 'Weekly recaps', 'Resúmenes de la semana', 'Resumos da semana', 'Tổng kết tuần', 'Rekap mingguan', 'Haftanın özetleri', 'Podsumowania tygodnia'),
  railWhen: L('пн · 9:00', 'пн · 9:00', 'Mon · 9:00', 'lun · 9:00', 'seg · 9:00', 'T2 · 9:00', 'Sen · 9:00', 'Pzt · 9:00', 'pon. · 9:00'),
  // ⚑ макет «Марк отдыхал на этой неделе» — с родом; безличная форма Переводчика
  rested: L('Без занятий на этой неделе. Позовёшь?', 'Без занять цього тижня. Покличеш?', 'No lessons this week. Give a nudge?', 'Sin estudiar esta semana. ¿Le avisas?', 'Sem estudar nesta semana. Quer chamar?', 'Tuần này chưa học. Rủ không?', 'Minggu ini belum belajar. Mau ajak?', 'Bu hafta çalışmadı. Çağırır mısın?', 'W tym tygodniu bez nauki. Zawołasz?'),
  factPeakFloor: L('этаж Пика', 'поверх Піку', 'Peak floor', 'piso del Pico', 'andar do Pico', 'tầng Đỉnh', 'lantai Puncak', 'Zirve katı', 'piętro Szczytu'),
  bestDay: L('Лучший день', 'Найкращий день', 'Best day', 'Mejor día', 'Melhor dia', 'Ngày tốt nhất', 'Hari terbaik', 'En iyi gün', 'Najlepszy dzień'),
  challengeDuel: L('Вызвать на дуэль', 'Викликати на дуель', 'Challenge to a duel', 'Retar a un duelo', 'Desafiar para um duelo', 'Thách đấu', 'Tantang duel', 'Düelloya davet et', 'Wyzwij na pojedynek'),
  highFiveToast: L('Пятюня отправлена', 'П’ятюню відправлено', 'High five sent', 'Choque enviado', 'Toque enviado', 'Đã đập tay', 'Tos terkirim', 'Çak gönderildi', 'Piątka wysłana'),
  myWeek: L('Моя неделя', 'Мій тиждень', 'My week', 'Mi semana', 'Minha semana', 'Tuần của tôi', 'Mingguku', 'Haftam', 'Mój tydzień'),
  myWeekSub: L('Так её видят друзья в понедельник', 'Так його бачать друзі в понеділок', 'How friends see it on Monday', 'Así la ven tus amigos el lunes', 'É assim que seus amigos a veem na segunda', 'Bạn bè thấy thế này vào thứ Hai', 'Begini teman melihatnya hari Senin', 'Arkadaşların pazartesi böyle görür', 'Tak widzą go znajomi w poniedziałek'),
  showMyWeek: L('Показывать друзьям мою неделю', 'Показувати друзям мій тиждень', 'Show my week to friends', 'Mostrar mi semana a mis amigos', 'Mostrar minha semana aos amigos', 'Cho bạn bè xem tuần của tôi', 'Tampilkan mingguku ke teman', 'Haftamı arkadaşlarıma göster', 'Pokazuj znajomym mój tydzień'),
  emptyTitle: L('Итоги недели — в понедельник', 'Підсумки тижня — у понеділок', 'Weekly recaps arrive on Monday', 'Los resúmenes llegan el lunes', 'Os resumos chegam na segunda', 'Tổng kết tuần có vào thứ Hai', 'Rekap mingguan muncul hari Senin', 'Haftanın özetleri pazartesi gelir', 'Podsumowania tygodnia — w poniedziałek'),
  emptySub: L('Первый итог — после 7 дней дружбы', 'Перший підсумок — після 7 днів дружби', 'The first one comes after 7 days as friends', 'El primero llega tras 7 días de amistad', 'O primeiro chega após 7 dias de amizade', 'Bản đầu tiên có sau 7 ngày kết bạn', 'Rekap pertama setelah 7 hari berteman', 'İlki 7 günlük arkadaşlıktan sonra', 'Pierwsze — po 7 dniach znajomości'),
  // ⚑ «Первая неделя без пропусков» макета утверждает историю, которой запись не знает — без «Первая» (переводы — из черновика без первого слова)
  noGaps: L('Неделя без пропусков', 'Тиждень без пропусків', 'A week with no missed days', 'Semana sin faltar', 'Semana sem faltas', 'Tuần không bỏ ngày nào', 'Minggu tanpa bolos', 'Boşluksuz hafta', 'Tydzień bez przerw'),
} as const;

export type FriendWeekCopyKey = keyof typeof WEEK_COPY;

export function weekCopy(lang: Lang, key: FriendWeekCopyKey): string {
  return pick(lang, WEEK_COPY[key]);
}

/** «Неделя · {name}» — имя не склоняем (⚑ макет «Неделя Ирины»). */
export function weekDetailTitle(lang: Lang, name: string): string {
  return pick(lang, L('Неделя · {name}', 'Тиждень · {name}', '{name}’s week', 'Semana de {name}', 'Semana de {name}', 'Tuần của {name}', 'Minggu {name}', '{name} · hafta', 'Tydzień · {name}')).replace('{name}', name);
}

/** Подпись под числом серии: «48 дней серии». */
export function factStreakDays(lang: Lang, n: number): string {
  return pick(lang, L(
    slavic(n, 'день серии', 'дня серии', 'дней серии'),
    slavic(n, 'день серії', 'дні серії', 'днів серії'),
    n === 1 ? 'streak day' : 'streak days',
    n === 1 ? 'día de racha' : 'días de racha',
    n === 1 ? 'dia de sequência' : 'dias de sequência',
    'ngày chuỗi',
    'hari beruntun',
    'seri günü',
    slavic(n, 'dzień serii', 'dni serii', 'dni serii'),
  ));
}

/** Подпись под числом занятий: «9 занятий». */
export function factLessons(lang: Lang, n: number): string {
  return pick(lang, L(
    slavic(n, 'занятие', 'занятия', 'занятий'),
    slavic(n, 'заняття', 'заняття', 'занять'),
    n === 1 ? 'lesson' : 'lessons',
    n === 1 ? 'lección' : 'lecciones',
    n === 1 ? 'lição' : 'lições',
    'buổi học',
    'sesi',
    'ders',
    slavic(n, 'zajęcie', 'zajęcia', 'zajęć'),
  ));
}

/** Строка «лучшее за неделю»: «+2 этажа Пика за неделю» (⚑ безличная вместо «Поднялась на 2 этажа»). */
export function lineFloorsUp(lang: Lang, n: number): string {
  return pick(lang, L(
    `+${n} ${slavic(n, 'этаж', 'этажа', 'этажей')} Пика за неделю`,
    `+${n} ${slavic(n, 'поверх', 'поверхи', 'поверхів')} Піку за тиждень`,
    `+${n} Peak ${n === 1 ? 'floor' : 'floors'} this week`,
    `+${n} ${n === 1 ? 'piso' : 'pisos'} del Pico esta semana`,
    `+${n} ${n === 1 ? 'andar' : 'andares'} do Pico na semana`,
    `+${n} tầng Đỉnh trong tuần`,
    `+${n} lantai Puncak minggu ini`,
    `Bu hafta +${n} Zirve katı`,
    `+${n} ${slavic(n, 'piętro', 'piętra', 'pięter')} Szczytu w tym tygodniu`,
  ));
}

/** «Пятница · 3 занятия» (⚑ «и диалог» макета — диалогов запись недели не считает). */
export function bestDayValue(lang: Lang, dayName: string, n: number): string {
  return `${dayName} · ${n} ${factLessons(lang, n)}`;
}

const DATE_LOCALE: Record<Lang, string> = {
  ru: 'ru-RU', uk: 'uk-UA', en: 'en-US', es: 'es-ES', 'pt-BR': 'pt-BR', vi: 'vi-VN', id: 'id-ID', tr: 'tr-TR', pl: 'pl-PL',
};
const DAY_MS = 86_400_000;

function utcNoon(dayKey: string): Date {
  return new Date(`${dayKey}T12:00:00Z`);
}

/** «13–19 октября», «October 13–19», через месяц — «27 октября – 2 ноября». Сбой Intl — даты как есть. */
export function weekRangeLabel(lang: Lang, week: string): string {
  const start = utcNoon(week);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  try {
    const locale = DATE_LOCALE[lang] ?? 'ru-RU';
    const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' });
    if (start.getUTCMonth() !== end.getUTCMonth()) return `${dayMonth.format(start)} – ${dayMonth.format(end)}`;
    // английский — «месяц день», остальные девять — «день месяц»: первое число добавляем к той стороне, где стоит день
    if (lang === 'en') return `${dayMonth.format(start)}–${end.getUTCDate()}`;
    return `${start.getUTCDate()}–${dayMonth.format(end)}`;
  } catch (error) {
    console.warn(`[FRIEND-WEEK] Intl не отформатировал неделю ${week} (${lang}): ${error instanceof Error ? error.message : String(error)}`); // guard-ok
    return `${week} – ${end.toISOString().slice(0, 10)}`;
  }
}

/** Полное имя дня недели с заглавной: dow 0 — понедельник. */
export function weekdayName(lang: Lang, week: string, dow: number): string {
  const date = new Date(utcNoon(week).getTime() + dow * DAY_MS);
  try {
    const name = new Intl.DateTimeFormat(DATE_LOCALE[lang] ?? 'ru-RU', { weekday: 'long', timeZone: 'UTC' }).format(date);
    return name.charAt(0).toLocaleUpperCase(DATE_LOCALE[lang]) + name.slice(1);
  } catch (error) {
    console.warn(`[FRIEND-WEEK] Intl не назвал день ${dow} (${lang}): ${error instanceof Error ? error.message : String(error)}`); // guard-ok
    return String(dow + 1);
  }
}

/** Тексты тоста «Пятюня отправлена» — 9 языков в форме, которую экран раскладывает в action_toast (как pairQueuedToast). */
export function highFiveToastTexts(): Readonly<{ ru: string; uk: string; en: string; es: string; ptBr: string; vi: string; id: string; tr: string; pl: string }> {
  const t = WEEK_COPY.highFiveToast;
  return { ru: t.ru, uk: t.uk, en: t.en, es: t.es, ptBr: t['pt-BR'], vi: t.vi, id: t.id, tr: t.tr, pl: t.pl };
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
