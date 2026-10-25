// ═══════════════════════════════════════════════════════════════════════════
// streak_moments_strings.ts — тексты рубежей серии дней и колец «Сегодня» на 9 языках (ru, uk, en, es, pt-BR, vi, id, tr, pl).
//
// зачем (владелец 14.10: «перенести точно по макетам»): тексты — ровно из streak-milestones.html и блока «Сегодня» engagement-moments-v3-all.html. Число дней —
// сокращением «дн.» (ru/uk/pl): так не нужны падежи для каждого числа. Переводы кроме RU — предложение, носителем не проверены (как tier_names и тексты моментов Пика).
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import type { StreakMilestone } from './streak_milestones';
import { glueNumbers } from '../../moments/glue_numbers';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  overline: ['Серия · {n} {dn}', 'Серія · {n} {dn}', 'Streak · {n} {dn}', 'Racha · {n} {dn}', 'Sequência · {n} {dn}', 'Chuỗi · {n} {dn}', 'Rangkaian · {n} {dn}', 'Seri · {n} {dn}', 'Seria · {n} {dn}'],
  achievementRow: ['Ачивка «{n} {dn}»', 'Ачівка «{n} {dn}»', 'Achievement “{n} {dn}”', 'Logro «{n} {dn}»', 'Conquista “{n} {dn}”', 'Thành tựu “{n} {dn}”', 'Pencapaian “{n} {dn}”', 'Başarım “{n} {dn}”', 'Osiągnięcie „{n} {dn}”'],
  // зачем (Переводчик 25.10, голос PhraseMan «тепло», раздел 4 copy-sweep; владелец утвердил на макете «было → стало»): подписи рубежей — живые
  tomorrow: ['Завтра — уже {n} {dn}!', 'Завтра — вже {n} {dn}!', 'Tomorrow: {n} {dn}!', '¡Mañana ya son {n} {dn}!', 'Amanhã já são {n} {dn}!', 'Mai là tròn {n} {dn}!', 'Besok sudah {n} {dn}!', 'Yarın {n} {dn} oluyor!', 'Jutro już {n} {dn}!'],
  toWeek: ['Ещё {left} {dl} — и неделя твоя!', 'Ще {left} {dl} — і тиждень твій!', '{left} more {dl} and the week is yours!', '¡{left} {dl} más y la semana es tuya!', 'Mais {left} {dl} e a semana é sua!', 'Thêm {left} {dl} là trọn tuần!', '{left} {dl} lagi, seminggu penuh!', '{left} {dl} daha, hafta senin!', 'Jeszcze {left} {dl} i tydzień jest twój!'],
  toMonth: ['Ещё {left} {dl} — и целый месяц!', 'Ще {left} {dl} — і цілий місяць!', '{left} more {dl} to a whole month!', '¡{left} {dl} más y un mes entero!', 'Mais {left} {dl} e um mês inteiro!', 'Thêm {left} {dl} là tròn tháng!', '{left} {dl} lagi, sebulan penuh!', '{left} {dl} daha, koca bir ay!', 'Jeszcze {left} {dl} i cały miesiąc!'],
  toHundred: ['Ещё {left} {dl} — и сотня!', 'Ще {left} {dl} — і сотня!', '{left} more {dl} to 100!', '¡{left} {dl} más y llegas a 100!', 'Mais {left} {dl} e chega a 100!', 'Thêm {left} {dl} là cán mốc 100!', '{left} {dl} lagi, tembus 100!', '{left} {dl} daha, 100 geliyor!', 'Jeszcze {left} {dl} i setka!'],
  toYear: ['Ещё {left} {dl} — и целый год!', 'Ще {left} {dl} — і цілий рік!', '{left} more {dl} to a full year!', '¡{left} {dl} más y un año entero!', 'Mais {left} {dl} e um ano inteiro!', 'Thêm {left} {dl} là tròn năm!', '{left} {dl} lagi, setahun penuh!', '{left} {dl} daha, koca bir yıl!', 'Jeszcze {left} {dl} i cały rok!'],
  toFiveHundred: ['Ещё {left} {dl} — и пятьсот!', 'Ще {left} {dl} — і п’ятсот!', '{left} more {dl} to 500!', '¡{left} {dl} más y llegas a 500!', 'Mais {left} {dl} e chega a 500!', 'Thêm {left} {dl} là cán mốc 500!', '{left} {dl} lagi, tembus 500!', '{left} {dl} daha, 500 geliyor!', 'Jeszcze {left} {dl} i pięćset!'],
  toTwoYears: ['Ещё {left} {dl} — и два года подряд!', 'Ще {left} {dl} — і два роки поспіль!', '{left} more {dl} to two years straight!', '¡{left} {dl} más y dos años seguidos!', 'Mais {left} {dl} e dois anos seguidos!', 'Thêm {left} {dl} là hai năm liền!', '{left} {dl} lagi, dua tahun beruntun!', '{left} {dl} daha, iki yıl üst üste!', 'Jeszcze {left} {dl} i dwa lata z rzędu!'],
  toThousand: ['Ещё {left} {dl} — и тысяча!', 'Ще {left} {dl} — і тисяча!', '{left} more {dl} to 1,000!', '¡{left} {dl} más y llegas a 1000!', 'Mais {left} {dl} e chega a 1000!', 'Thêm {left} {dl} là cán mốc 1000!', '{left} {dl} lagi, tembus 1000!', '{left} {dl} daha, 1000 geliyor!', 'Jeszcze {left} {dl} i tysiąc!'],
  legendSub: ['Высший ранг монеты — твой', 'Найвищий ранг монети — твій', 'The top coin rank is yours', 'El rango más alto de la moneda es tuyo', 'O rank mais alto da moeda é seu', 'Hạng đồng xu cao nhất là của bạn', 'Peringkat koin tertinggi jadi milikmu', 'En yüksek jeton rütbesi senin', 'Najwyższa ranga monety jest twoja'],
  halfWay: ['Полпути к Легенде — 1000 дней', 'Пів шляху до Легенди — 1000 днів', 'Halfway to Legend — 1000 days', 'A medio camino de la Leyenda — 1000 días', 'Metade do caminho até a Lenda — 1000 dias', 'Nửa đường đến Huyền thoại — 1000 ngày', 'Separuh jalan menuju Legenda — 1000 hari', 'Efsaneye yarı yol — 1000 gün', 'W połowie drogi do Legendy — 1000 dni'],
  ribbonNext: ['до {next} — {left} дн.', 'до {next} — {left} дн.', 'to {next} — {left} d', 'hasta {next} — {left} d', 'até {next} — {left} d', 'đến {next} — {left} ngày', 'ke {next} — {left} hr', '{next} için — {left} gün', 'do {next} — {left} d.'],
  untilLegend: ['Ещё {left} {dl} — и ты Легенда!', 'Ще {left} {dl} — і ти Легенда!', '{left} more {dl} and you’re a Legend!', '¡{left} {dl} más y eres Leyenda!', 'Mais {left} {dl} e você vira Lenda!', 'Thêm {left} {dl} là thành Huyền thoại!', '{left} {dl} lagi, kamu jadi Legenda!', '{left} {dl} daha, Efsane oluyorsun!', 'Jeszcze {left} {dl} i jesteś Legendą!'],
  yearAct1: ['Год. Каждый день', 'Рік. Щодня', 'A year. Every day', 'Un año. Cada día', 'Um ano. Todos os dias', 'Một năm. Mỗi ngày', 'Setahun. Setiap hari', 'Bir yıl. Her gün', 'Rok. Każdego dnia'],
  ribbon: ['Рубежи', 'Рубежі', 'Milestones', 'Hitos', 'Marcos', 'Cột mốc', 'Tonggak', 'Kilometre taşları', 'Kamienie milowe'],
  next: ['Дальше', 'Далі', 'Next', 'Siguiente', 'Continuar', 'Tiếp', 'Lanjut', 'Devam', 'Dalej'],
  share: ['Поделиться', 'Поділитися', 'Share', 'Compartir', 'Compartilhar', 'Chia sẻ', 'Bagikan', 'Paylaş', 'Udostępnij'],
  skip: ['Пропустить', 'Пропустити', 'Skip', 'Omitir', 'Pular', 'Bỏ qua', 'Lewati', 'Geç', 'Pomiń'],
  flameA11y: ['Серия {n} {dn}', 'Серія {n} {dn}', 'Streak {n} {dn}', 'Racha de {n} {dn}', 'Sequência de {n} {dn}', 'Chuỗi {n} {dn}', 'Rangkaian {n} {dn}', '{n} {dn}lük seri', 'Seria {n} {dn}'],
  // ── блок «Сегодня» ──
  today: ['Сегодня', 'Сьогодні', 'Today', 'Hoy', 'Hoje', 'Hôm nay', 'Hari ini', 'Bugün', 'Dzisiaj'],
  dayDone: ['День выполнен', 'День виконано', 'Day complete', 'Día completado', 'Dia concluído', 'Đã xong hôm nay', 'Hari selesai', 'Gün tamamlandı', 'Dzień ukończony'],
  ringLesson: ['Пройти урок', 'Пройти урок', 'Finish a lesson', 'Completar una lección', 'Concluir uma lição', 'Hoàn thành một bài học', 'Selesaikan satu pelajaran', 'Bir ders bitir', 'Ukończ lekcję'],
  ringSpire: ['Пройти ступени Пика', 'Пройти сходинки Піку', 'Climb the Peak steps', 'Subir los escalones del Pico', 'Subir os degraus do Pico', 'Leo các bậc của Đỉnh', 'Naiki anak tangga Puncak', 'Zirvenin basamaklarını çık', 'Pokonaj stopnie Szczytu'],
  ringCards: ['Повторить карточки', 'Повторити картки', 'Review cards', 'Repasar tarjetas', 'Revisar cartões', 'Ôn lại thẻ', 'Ulangi kartu', 'Kartları tekrarla', 'Powtórz karty'],
  ringCardsSub: ['Не менее 10 слов', 'Не менше 10 слів', 'At least 10 words', 'Al menos 10 palabras', 'Pelo menos 10 palavras', 'Ít nhất 10 từ', 'Minimal 10 kata', 'En az 10 kelime', 'Co najmniej 10 słów'],
} as const satisfies Readonly<Record<string, Nine>>;

export type StreakMomentStringKey = keyof typeof S;
export const STREAK_MOMENT_STRING_KEYS = Object.keys(S) as readonly StreakMomentStringKey[];

/** Заголовки рубежей: слова на каждом языке; 3/150/250 — шаблон «{n} дн. подряд» (ниже). */
const DAYS_IN_A_ROW: Nine = ['{n} {dn} подряд', '{n} {dn} поспіль', '{n} {dn} in a row', '{n} {dn} seguidos', '{n} {dn} seguidos', '{n} {dn} liên tiếp', '{n} {dn} berturut-turut', '{n} {dn} üst üste', '{n} {dn} z rzędu'];
const TITLES: Readonly<Record<StreakMilestone, Nine>> = {
  1: ['Серия началась', 'Серію розпочато', 'Streak started', 'La racha empezó', 'A sequência começou', 'Chuỗi ngày đã bắt đầu', 'Rangkaian dimulai', 'Seri başladı', 'Seria się zaczęła'],
  3: DAYS_IN_A_ROW,
  7: ['Первая неделя', 'Перший тиждень', 'First week', 'Primera semana', 'Primeira semana', 'Tuần đầu tiên', 'Minggu pertama', 'İlk hafta', 'Pierwszy tydzień'],
  14: ['Две недели', 'Два тижні', 'Two weeks', 'Dos semanas', 'Duas semanas', 'Hai tuần', 'Dua minggu', 'İki hafta', 'Dwa tygodnie'],
  30: ['Месяц подряд', 'Місяць поспіль', 'A month in a row', 'Un mes seguido', 'Um mês seguido', 'Một tháng liên tiếp', 'Sebulan penuh', 'Üst üste bir ay', 'Miesiąc z rzędu'],
  50: ['Полсотни', 'Пів сотні', 'Fifty', 'Cincuenta', 'Cinquenta', 'Năm mươi', 'Lima puluh', 'Elli', 'Pięćdziesiąt'],
  100: ['Сто дней', 'Сто днів', 'One hundred days', 'Cien días', 'Cem dias', 'Một trăm ngày', 'Seratus hari', 'Yüz gün', 'Sto dni'],
  150: DAYS_IN_A_ROW,
  200: ['Двести', 'Двісті', 'Two hundred', 'Doscientos', 'Duzentos', 'Hai trăm', 'Dua ratus', 'İki yüz', 'Dwieście'],
  250: DAYS_IN_A_ROW,
  300: ['Триста', 'Триста', 'Three hundred', 'Trescientos', 'Trezentos', 'Ba trăm', 'Tiga ratus', 'Üç yüz', 'Trzysta'],
  365: ['Год подряд', 'Рік поспіль', 'A year in a row', 'Un año seguido', 'Um ano seguido', 'Một năm liên tiếp', 'Setahun berturut-turut', 'Üst üste bir yıl', 'Rok z rzędu'],
  400: ['Четыреста', 'Чотириста', 'Four hundred', 'Cuatrocientos', 'Quatrocentos', 'Bốn trăm', 'Empat ratus', 'Dört yüz', 'Czterysta'],
  500: ['Полтысячи', 'Пів тисячі', 'Five hundred', 'Quinientos', 'Quinhentos', 'Năm trăm', 'Lima ratus', 'Beş yüz', 'Pół tysiąca'],
  600: ['Шестьсот', 'Шістсот', 'Six hundred', 'Seiscientos', 'Seiscentos', 'Sáu trăm', 'Enam ratus', 'Altı yüz', 'Sześćset'],
  730: ['Два года', 'Два роки', 'Two years', 'Dos años', 'Dois anos', 'Hai năm', 'Dua tahun', 'İki yıl', 'Dwa lata'],
  800: ['Восемьсот', 'Вісімсот', 'Eight hundred', 'Ochocientos', 'Oitocentos', 'Tám trăm', 'Delapan ratus', 'Sekiz yüz', 'Osiemset'],
  900: ['Девятьсот', 'Дев’ятсот', 'Nine hundred', 'Novecientos', 'Novecentos', 'Chín trăm', 'Sembilan ratus', 'Dokuz yüz', 'Dziewięćset'],
  1000: ['Легенда', 'Легенда', 'Legend', 'Leyenda', 'Lenda', 'Huyền thoại', 'Legenda', 'Efsane', 'Legenda'],
};

function fill(template: string, vars?: Readonly<Record<string, string | number>>): string {
  // зачем (координатор 18.10, длинные языки): число не отрывается от слова при переносе — неразрывный пробел на подстановке, текст не меняется
  return glueNumbers(vars ? template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : template);
}

function pick(row: Nine, lang: Lang): string {
  return row[LANG_INDEX[lang] ?? 2];
}

// зачем (координатор 15.10, сторож переводов): формы слова «день» — языковой объект на все 9 языков, а не русские литералы в switch.
// Формы: [одна, несколько, много]; у языков с двумя формами третья равна второй, с одной — все три одинаковы.
const DAY_FORMS: Readonly<Record<string, readonly [string, string, string]>> = {
  ru: ['день', 'дня', 'дней'],
  uk: ['день', 'дні', 'днів'],
  en: ['day', 'days', 'days'],
  es: ['día', 'días', 'días'],
  'pt-BR': ['dia', 'dias', 'dias'],
  vi: ['ngày', 'ngày', 'ngày'],
  id: ['hari', 'hari', 'hari'],
  tr: ['gün', 'gün', 'gün'],
  pl: ['dzień', 'dni', 'dni'],
};

/** Слово «день» в правильной форме для числа n (ru/uk — три формы, en/es/pt-BR/pl — две, vi/id/tr — одна). Чистая функция: проверяет сторож. */
export function streakDayWord(lang: Lang, n: number): string {
  const a = Math.abs(Math.trunc(n));
  const m10 = a % 10;
  const m100 = a % 100;
  const forms = DAY_FORMS[lang] ?? DAY_FORMS.en!;
  if (lang === 'ru' || lang === 'uk') return m10 === 1 && m100 !== 11 ? forms[0] : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? forms[1] : forms[2];
  return a === 1 ? forms[0] : forms[1];
}

/** Подставляет {n}/{left}/{next} и слова «день» ({dn}/{dl}/{dx}) в правильной форме. */
function withDayWords(lang: Lang, vars?: Readonly<Record<string, string | number>>): Readonly<Record<string, string | number>> | undefined {
  if (!vars) return vars;
  const out: Record<string, string | number> = { ...vars };
  if (typeof vars.n === 'number') out.dn = streakDayWord(lang, vars.n);
  if (typeof vars.left === 'number') out.dl = streakDayWord(lang, vars.left);
  if (typeof vars.next === 'number') out.dx = streakDayWord(lang, vars.next);
  return out;
}

export function streakMomentText(lang: Lang, key: StreakMomentStringKey, vars?: Readonly<Record<string, string | number>>): string {
  return fill(pick(S[key], lang), withDayWords(lang, vars));
}

export function streakMilestoneTitle(lang: Lang, milestone: StreakMilestone): string {
  return fill(pick(TITLES[milestone], lang), withDayWords(lang, { n: milestone }));
}

/** Куда ведёт подпись «до …» после рубежа (образец streak-milestones.html): число дней до цели и ключ фразы. */
const SUBLINE: Readonly<Record<StreakMilestone, Readonly<{ key: StreakMomentStringKey; target: number }> | null>> = {
  // зачем (ЗАМОК ВЛАДЕЛЬЦА 25.10: «что за дурацкий текст!!!! стадия пламени»): 7, 30 и 100 — та же схема «До … — N дней», без «стадии огня»
  1: { key: 'tomorrow', target: 2 }, 3: { key: 'toWeek', target: 7 }, 7: { key: 'toMonth', target: 30 }, 14: { key: 'toMonth', target: 30 }, 30: { key: 'toHundred', target: 100 }, 50: { key: 'toHundred', target: 100 },
  100: { key: 'toYear', target: 365 }, 150: { key: 'toYear', target: 365 }, 200: { key: 'toYear', target: 365 }, 250: { key: 'toYear', target: 365 }, 300: { key: 'toYear', target: 365 },
  365: { key: 'toTwoYears', target: 730 }, 400: { key: 'toFiveHundred', target: 500 }, 500: null, 600: { key: 'toTwoYears', target: 730 }, 730: { key: 'untilLegend', target: 1000 },
  800: { key: 'toThousand', target: 1000 }, 900: { key: 'toThousand', target: 1000 }, 1000: null,
};

/** Подпись под заголовком рубежа: «До недели — 4 дня», «До месяца — 23 дня» (7), «Полпути к Легенде» (500), «Высший ранг монеты — твой» (1000). */
export function streakMilestoneSubline(lang: Lang, milestone: StreakMilestone): string {
  if (milestone === 500) return streakMomentText(lang, 'halfWay');
  if (milestone === 1000) return streakMomentText(lang, 'legendSub');
  const sub = SUBLINE[milestone]!;
  return sub.key === 'tomorrow'
    ? streakMomentText(lang, 'tomorrow', { n: sub.target })
    : streakMomentText(lang, sub.key, { left: sub.target - milestone });
}

/** Все языки, на которых обязаны быть тексты (сторож сверяет). */
export const STREAK_MOMENT_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
export const STREAK_MILESTONE_TITLES_FOR_GUARD = TITLES;
