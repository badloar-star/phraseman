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
  overline: ['Серия · {n} дн.', 'Серія · {n} дн.', 'Streak · {n} days', 'Racha · {n} días', 'Sequência · {n} dias', 'Chuỗi · {n} ngày', 'Rangkaian · {n} hari', 'Seri · {n} gün', 'Seria · {n} dni'],
  toNext: ['До {next} — {left} дн.', 'До {next} — {left} дн.', 'To {next} — {left} days', 'Hasta {next} — {left} días', 'Até {next} — {left} dias', 'Đến {next} — {left} ngày', 'Ke {next} — {left} hari', '{next} için — {left} gün', 'Do {next} — {left} dni'],
  stageNew: ['Новая стадия огня — до {next} дн.', 'Нова стадія вогню — до {next} дн.', 'New flame stage — up to {next} days', 'Nueva fase de la llama — hasta {next} días', 'Nova fase da chama — até {next} dias', 'Giai đoạn lửa mới — đến {next} ngày', 'Tahap api baru — hingga {next} hari', 'Yeni alev aşaması — {next} güne kadar', 'Nowy etap ognia — do {next} dni'],
  finalStage: ['Финальная стадия огня', 'Фінальна стадія вогню', 'Final flame stage', 'Fase final de la llama', 'Fase final da chama', 'Giai đoạn lửa cuối cùng', 'Tahap api terakhir', 'Son alev aşaması', 'Ostatni etap ognia'],
  legendSub: ['Высший ранг монеты — твой', 'Найвищий ранг монети — твій', 'The top coin rank is yours', 'El rango más alto de la moneda es tuyo', 'O rank mais alto da moeda é seu', 'Hạng đồng xu cao nhất là của bạn', 'Peringkat koin tertinggi jadi milikmu', 'En yüksek jeton rütbesi senin', 'Najwyższa ranga monety jest twoja'],
  halfWay: ['Полпути к Легенде — 1000 дн.', 'Пів шляху до Легенди — 1000 дн.', 'Halfway to Legend — 1000 days', 'A mitad de camino a la Leyenda — 1000 días', 'Meio caminho para a Lenda — 1000 dias', 'Nửa đường đến Huyền thoại — 1000 ngày', 'Separuh jalan menuju Legenda — 1000 hari', 'Efsaneye yarı yol — 1000 gün', 'W połowie drogi do Legendy — 1000 dni'],
  untilLegend: ['До Легенды — {left} дн.', 'До Легенди — {left} дн.', 'To Legend — {left} days', 'Hasta la Leyenda — {left} días', 'Até a Lenda — {left} dias', 'Đến Huyền thoại — {left} ngày', 'Menuju Legenda — {left} hari', 'Efsaneye — {left} gün', 'Do Legendy — {left} dni'],
  yearAct1: ['Год. Каждый день', 'Рік. Щодня', 'A year. Every day', 'Un año. Cada día', 'Um ano. Todos os dias', 'Một năm. Mỗi ngày', 'Setahun. Setiap hari', 'Bir yıl. Her gün', 'Rok. Każdego dnia'],
  ribbon: ['Рубежи', 'Рубежі', 'Milestones', 'Hitos', 'Marcos', 'Cột mốc', 'Tonggak', 'Kilometre taşları', 'Kamienie milowe'],
  next: ['Дальше', 'Далі', 'Next', 'Siguiente', 'Próximo', 'Tiếp', 'Lanjut', 'Devam', 'Dalej'],
  share: ['Поделиться', 'Поділитися', 'Share', 'Compartir', 'Compartilhar', 'Chia sẻ', 'Bagikan', 'Paylaş', 'Udostępnij'],
  skip: ['Пропустить', 'Пропустити', 'Skip', 'Omitir', 'Pular', 'Bỏ qua', 'Lewati', 'Geç', 'Pomiń'],
  flameA11y: ['Серия {n} дн.', 'Серія {n} дн.', 'Streak {n} days', 'Racha de {n} días', 'Sequência de {n} dias', 'Chuỗi {n} ngày', 'Rangkaian {n} hari', '{n} günlük seri', 'Seria {n} dni'],
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
const DAYS_IN_A_ROW: Nine = ['{n} дн. подряд', '{n} дн. поспіль', '{n} days in a row', '{n} días seguidos', '{n} dias seguidos', '{n} ngày liên tiếp', '{n} hari berturut-turut', '{n} gün üst üste', '{n} dni z rzędu'];
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

export function streakMomentText(lang: Lang, key: StreakMomentStringKey, vars?: Readonly<Record<string, string | number>>): string {
  return fill(pick(S[key], lang), vars);
}

export function streakMilestoneTitle(lang: Lang, milestone: StreakMilestone): string {
  return fill(pick(TITLES[milestone], lang), { n: milestone });
}

/** Все языки, на которых обязаны быть тексты (сторож сверяет). */
export const STREAK_MOMENT_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
export const STREAK_MILESTONE_TITLES_FOR_GUARD = TITLES;
