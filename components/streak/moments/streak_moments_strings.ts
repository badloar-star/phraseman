// ═══════════════════════════════════════════════════════════════════════════
// streak_moments_strings.ts — тексты рубежей серии дней и колец «Сегодня» на 9 языках (ru, uk, en, es, pt-BR, vi, id, tr, pl).
//
// зачем (владелец 14.10: «перенести точно по макетам»): тексты — ровно из streak-milestones.html и блока «Сегодня» engagement-moments-v3-all.html. Число дней —
// сокращением «дн.» (ru/uk/pl): так не нужны падежи для каждого числа. Переводы кроме RU — предложение, носителем не проверены (как tier_names и тексты моментов Пика).
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import type { StreakMilestone } from './streak_milestones';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  overline: ['Серия · {n} {dn}', 'Серія · {n} {dn}', 'Streak · {n} {dn}', 'Racha · {n} {dn}', 'Sequência · {n} {dn}', 'Chuỗi · {n} {dn}', 'Rangkaian · {n} {dn}', 'Seri · {n} {dn}', 'Seria · {n} {dn}'],
  stageNewYear: ['Новая стадия огня — до года', 'Нова стадія вогню — до року', 'New flame stage — up to a year', 'Nueva fase de la llama — hasta un año', 'Nova fase da chama — até um ano', 'Giai đoạn lửa mới — đến một năm', 'Tahap api baru — hingga setahun', 'Yeni alev aşaması — bir yıla kadar', 'Nowy etap ognia — do roku'],
  achievementRow: ['Ачивка «{n} {dn}»', 'Ачівка «{n} {dn}»', 'Achievement “{n} {dn}”', 'Logro «{n} {dn}»', 'Conquista “{n} {dn}”', 'Thành tựu “{n} {dn}”', 'Pencapaian “{n} {dn}”', 'Başarım “{n} {dn}”', 'Osiągnięcie „{n} {dn}”'],
  tomorrow: ['Завтра — {n} {dn}', 'Завтра — {n} {dn}', 'Tomorrow — {n} {dn}', 'Mañana — {n} {dn}', 'Amanhã — {n} {dn}', 'Ngày mai — {n} {dn}', 'Besok — {n} {dn}', 'Yarın — {n} {dn}', 'Jutro — {n} {dn}'],
  toWeek: ['До недели — {left} {dl}', 'До тижня — {left} {dl}', 'To a week — {left} {dl}', 'Hasta una semana — {left} {dl}', 'Até uma semana — {left} {dl}', 'Đến một tuần — {left} {dl}', 'Menuju seminggu — {left} {dl}', 'Bir haftaya — {left} {dl}', 'Do tygodnia — {left} {dl}'],
  toMonth: ['До месяца — {left} {dl}', 'До місяця — {left} {dl}', 'To a month — {left} {dl}', 'Hasta un mes — {left} {dl}', 'Até um mês — {left} {dl}', 'Đến một tháng — {left} {dl}', 'Menuju sebulan — {left} {dl}', 'Bir aya — {left} {dl}', 'Do miesiąca — {left} {dl}'],
  toHundred: ['До сотни — {left} {dl}', 'До сотні — {left} {dl}', 'To a hundred — {left} {dl}', 'Hasta cien — {left} {dl}', 'Até cem — {left} {dl}', 'Đến một trăm — {left} {dl}', 'Menuju seratus — {left} {dl}', 'Yüze — {left} {dl}', 'Do stu — {left} {dl}'],
  toYear: ['До года — {left} {dl}', 'До року — {left} {dl}', 'To a year — {left} {dl}', 'Hasta un año — {left} {dl}', 'Até um ano — {left} {dl}', 'Đến một năm — {left} {dl}', 'Menuju setahun — {left} {dl}', 'Bir yıla — {left} {dl}', 'Do roku — {left} {dl}'],
  toFiveHundred: ['До пятисот — {left} {dl}', 'До п’ятисот — {left} {dl}', 'To five hundred — {left} {dl}', 'Hasta quinientos — {left} {dl}', 'Até quinhentos — {left} {dl}', 'Đến năm trăm — {left} {dl}', 'Menuju lima ratus — {left} {dl}', 'Beş yüze — {left} {dl}', 'Do pięciuset — {left} {dl}'],
  toTwoYears: ['До двух лет — {left} {dl}', 'До двох років — {left} {dl}', 'To two years — {left} {dl}', 'Hasta dos años — {left} {dl}', 'Até dois anos — {left} {dl}', 'Đến hai năm — {left} {dl}', 'Menuju dua tahun — {left} {dl}', 'İki yıla — {left} {dl}', 'Do dwóch lat — {left} {dl}'],
  toThousand: ['До тысячи — {left} {dl}', 'До тисячі — {left} {dl}', 'To a thousand — {left} {dl}', 'Hasta mil — {left} {dl}', 'Até mil — {left} {dl}', 'Đến một nghìn — {left} {dl}', 'Menuju seribu — {left} {dl}', 'Bine — {left} {dl}', 'Do tysiąca — {left} {dl}'],
  stageNew: ['Новая стадия огня — до {next} {dx}', 'Нова стадія вогню — до {next} {dx}', 'New flame stage — up to {next} {dx}', 'Nueva fase de la llama — hasta {next} {dx}', 'Nova fase da chama — até {next} {dx}', 'Giai đoạn lửa mới — đến {next} {dx}', 'Tahap api baru — hingga {next} {dx}', 'Yeni alev aşaması — {next} {dx}e kadar', 'Nowy etap ognia — do {next} {dx}'],
  finalStage: ['Финальная стадия огня', 'Фінальна стадія вогню', 'Final flame stage', 'Fase final de la llama', 'Fase final da chama', 'Giai đoạn lửa cuối cùng', 'Tahap api terakhir', 'Son alev aşaması', 'Ostatni etap ognia'],
  legendSub: ['Высший ранг монеты — твой', 'Найвищий ранг монети — твій', 'The top coin rank is yours', 'El rango más alto de la moneda es tuyo', 'O rank mais alto da moeda é seu', 'Hạng đồng xu cao nhất là của bạn', 'Peringkat koin tertinggi jadi milikmu', 'En yüksek jeton rütbesi senin', 'Najwyższa ranga monety jest twoja'],
  halfWay: ['Полпути к Легенде — 1000 дней', 'Пів шляху до Легенди — 1000 днів', 'Halfway to Legend — 1000 days', 'A mitad de camino a la Leyenda — 1000 días', 'Meio caminho para a Lenda — 1000 dias', 'Nửa đường đến Huyền thoại — 1000 ngày', 'Separuh jalan menuju Legenda — 1000 hari', 'Efsaneye yarı yol — 1000 gün', 'W połowie drogi do Legendy — 1000 dni'],
  ribbonNext: ['до {next} — {left} дн.', 'до {next} — {left} дн.', 'to {next} — {left} d', 'hasta {next} — {left} d', 'até {next} — {left} d', 'đến {next} — {left} ngày', 'ke {next} — {left} hr', '{next} için — {left} gün', 'do {next} — {left} dni'],
  untilLegend: ['До Легенды — {left} {dl}', 'До Легенди — {left} {dl}', 'To Legend — {left} {dl}', 'Hasta la Leyenda — {left} {dl}', 'Até a Lenda — {left} {dl}', 'Đến Huyền thoại — {left} {dl}', 'Menuju Legenda — {left} {dl}', 'Efsaneye — {left} {dl}', 'Do Legendy — {left} {dl}'],
  yearAct1: ['Год. Каждый день', 'Рік. Щодня', 'A year. Every day', 'Un año. Cada día', 'Um ano. Todos os dias', 'Một năm. Mỗi ngày', 'Setahun. Setiap hari', 'Bir yıl. Her gün', 'Rok. Każdego dnia'],
  ribbon: ['Рубежи', 'Рубежі', 'Milestones', 'Hitos', 'Marcos', 'Cột mốc', 'Tonggak', 'Kilometre taşları', 'Kamienie milowe'],
  next: ['Дальше', 'Далі', 'Next', 'Siguiente', 'Próximo', 'Tiếp', 'Lanjut', 'Devam', 'Dalej'],
  share: ['Поделиться', 'Поділитися', 'Share', 'Compartir', 'Compartilhar', 'Chia sẻ', 'Bagikan', 'Paylaş', 'Udostępnij'],
  skip: ['Пропустить', 'Пропустити', 'Skip', 'Omitir', 'Pular', 'Bỏ qua', 'Lewati', 'Geç', 'Pomiń'],
  flameA11y: ['Серия {n} {dn}', 'Серія {n} {dn}', 'Streak {n} {dn}', 'Racha de {n} {dn}', 'Sequência de {n} {dn}', 'Chuỗi {n} {dn}', 'Rangkaian {n} {dn}', '{n} {dn} seri', 'Seria {n} {dn}'],
  // ── блок «Сегодня» ──
  today: ['Сегодня', 'Сьогодні', 'Today', 'Hoy', 'Hoje', 'Hôm nay', 'Hari ini', 'Bugün', 'Dzisiaj'],
  dayDone: ['День выполнен', 'День виконано', 'Day complete', 'Día completado', 'Dia concluído', 'Hoàn thành ngày', 'Hari selesai', 'Gün tamamlandı', 'Dzień ukończony'],
  ringLesson: ['Пройти урок', 'Пройти урок', 'Finish a lesson', 'Completar una lección', 'Concluir uma lição', 'Hoàn thành một bài học', 'Selesaikan satu pelajaran', 'Bir ders bitir', 'Ukończ lekcję'],
  ringSpire: ['Пройти ступени Пика', 'Пройти сходинки Піку', 'Climb the Peak steps', 'Subir los escalones del Pico', 'Subir os degraus do Pico', 'Leo các bậc của Đỉnh', 'Naiki anak tangga Puncak', 'Zirvenin basamaklarını çık', 'Pokonaj stopnie Szczytu'],
  ringCards: ['Повторить карточки', 'Повторити картки', 'Review cards', 'Repasar tarjetas', 'Revisar cartões', 'Ôn lại thẻ', 'Ulangi kartu', 'Kartları tekrarla', 'Powtórz fiszki'],
  ringCardsSub: ['Не менее 10 слов', 'Не менше 10 слів', 'At least 10 words', 'Al menos 10 palabras', 'Pelo menos 10 palavras', 'Ít nhất 10 từ', 'Minimal 10 kata', 'En az 10 kelime', 'Co najmniej 10 słów'],
} as const satisfies Readonly<Record<string, Nine>>;

export type StreakMomentStringKey = keyof typeof S;
export const STREAK_MOMENT_STRING_KEYS = Object.keys(S) as readonly StreakMomentStringKey[];

/** Заголовки рубежей: слова на каждом языке; 3/150/250 — шаблон «{n} дн. подряд» (ниже). */
const DAYS_IN_A_ROW: Nine = ['{n} {dn} подряд', '{n} {dn} поспіль', '{n} {dn} in a row', '{n} {dn} seguidos', '{n} {dn} seguidos', '{n} {dn} liên tiếp', '{n} {dn} berturut-turut', '{n} {dn} üst üste', '{n} {dn} z rzędu'];
const TITLES: Readonly<Record<StreakMilestone, Nine>> = {
  1: ['Серия началась', 'Серію розпочато', 'Streak started', 'La racha empezó', 'A sequência começou', 'Chuỗi ngày bắt đầu', 'Rangkaian dimulai', 'Seri başladı', 'Seria się zaczęła'],
  3: DAYS_IN_A_ROW,
  7: ['Первая неделя', 'Перший тиждень', 'First week', 'Primera semana', 'Primeira semana', 'Tuần đầu tiên', 'Minggu pertama', 'İlk hafta', 'Pierwszy tydzień'],
  14: ['Две недели', 'Два тижні', 'Two weeks', 'Dos semanas', 'Duas semanas', 'Hai tuần', 'Dua minggu', 'İki hafta', 'Dwa tygodnie'],
  30: ['Месяц подряд', 'Місяць поспіль', 'A month in a row', 'Un mes seguido', 'Um mês seguido', 'Một tháng liên tiếp', 'Sebulan berturut-turut', 'Üst üste bir ay', 'Miesiąc z rzędu'],
  50: ['Полсотни', 'Пів сотні', 'Fifty', 'Cincuenta', 'Cinquenta', 'Năm mươi', 'Lima puluh', 'Elli', 'Pięćdziesiąt'],
  100: ['Сто дней', 'Сто днів', 'One hundred days', 'Cien días', 'Cem dias', 'Một trăm ngày', 'Seratus hari', 'Yüz gün', 'Sto dni'],
  150: DAYS_IN_A_ROW,
  200: ['Двести', 'Двісті', 'Two hundred', 'Doscientos', 'Duzentos', 'Hai trăm', 'Dua ratus', 'İki yüz', 'Dwieście'],
  250: DAYS_IN_A_ROW,
  300: ['Триста', 'Триста', 'Three hundred', 'Trescientos', 'Trezentos', 'Ba trăm', 'Tiga ratus', 'Üç yüz', 'Trzysta'],
  365: ['Год подряд', 'Рік поспіль', 'A year in a row', 'Un año seguido', 'Um ano seguido', 'Một năm liên tiếp', 'Setahun berturut-turut', 'Üst üste bir yıl', 'Rok z rzędu'],
  400: ['Четыреста', 'Чотириста', 'Four hundred', 'Cuatrocientos', 'Quatrocentos', 'Bốn trăm', 'Empat ratus', 'Dört yüz', 'Czterysta'],
  500: ['Полтысячи', 'Пів тисячі', 'Half a thousand', 'Medio millar', 'Meio milhar', 'Nửa nghìn', 'Setengah ribu', 'Yarım bin', 'Pół tysiąca'],
  600: ['Шестьсот', 'Шістсот', 'Six hundred', 'Seiscientos', 'Seiscentos', 'Sáu trăm', 'Enam ratus', 'Altı yüz', 'Sześćset'],
  730: ['Два года', 'Два роки', 'Two years', 'Dos años', 'Dois anos', 'Hai năm', 'Dua tahun', 'İki yıl', 'Dwa lata'],
  800: ['Восемьсот', 'Вісімсот', 'Eight hundred', 'Ochocientos', 'Oitocentos', 'Tám trăm', 'Delapan ratus', 'Sekiz yüz', 'Osiemset'],
  900: ['Девятьсот', 'Дев’ятсот', 'Nine hundred', 'Novecientos', 'Novecentos', 'Chín trăm', 'Sembilan ratus', 'Dokuz yüz', 'Dziewięćset'],
  1000: ['Легенда', 'Легенда', 'Legend', 'Leyenda', 'Lenda', 'Huyền thoại', 'Legenda', 'Efsane', 'Legenda'],
};

function fill(template: string, vars?: Readonly<Record<string, string | number>>): string {
  return vars ? template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : template;
}

function pick(row: Nine, lang: Lang): string {
  return row[LANG_INDEX[lang] ?? 2];
}

/** Слово «день» в правильной форме для числа n (ru/uk/pl — три формы, en/es/pt — две, vi/id/tr — одна). Чистая функция: проверяет сторож. */
export function streakDayWord(lang: Lang, n: number): string {
  const a = Math.abs(Math.trunc(n));
  const m10 = a % 10;
  const m100 = a % 100;
  const slavic = (one: string, few: string, many: string): string => (m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many);
  switch (lang) {
    case 'ru': return slavic('день', 'дня', 'дней');
    case 'uk': return slavic('день', 'дні', 'днів');
    case 'pl': return a === 1 ? 'dzień' : 'dni';
    case 'es': return a === 1 ? 'día' : 'días';
    case 'pt-BR': return a === 1 ? 'dia' : 'dias';
    case 'vi': return 'ngày';
    case 'id': return 'hari';
    case 'tr': return 'gün';
    default: return a === 1 ? 'day' : 'days';
  }
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
  1: { key: 'tomorrow', target: 2 }, 3: { key: 'toWeek', target: 7 }, 7: null, 14: { key: 'toMonth', target: 30 }, 30: null, 50: { key: 'toHundred', target: 100 },
  100: null, 150: { key: 'toYear', target: 365 }, 200: { key: 'toYear', target: 365 }, 250: { key: 'toYear', target: 365 }, 300: { key: 'toYear', target: 365 },
  365: { key: 'toTwoYears', target: 730 }, 400: { key: 'toFiveHundred', target: 500 }, 500: null, 600: { key: 'toTwoYears', target: 730 }, 730: { key: 'untilLegend', target: 1000 },
  800: { key: 'toThousand', target: 1000 }, 900: { key: 'toThousand', target: 1000 }, 1000: null,
};

/** Подпись под заголовком рубежа: «До недели — 4 дня», «Новая стадия огня — до 30 дней» (7/30/100), «Полпути к Легенде» (500), «Высший ранг монеты — твой» (1000). */
export function streakMilestoneSubline(lang: Lang, milestone: StreakMilestone): string {
  if (milestone === 7) return streakMomentText(lang, 'stageNew', { next: 30 });
  if (milestone === 30) return streakMomentText(lang, 'stageNew', { next: 100 });
  if (milestone === 100) return streakMomentText(lang, 'stageNewYear');
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
