// ═══════════════════════════════════════════════════════════════════════════
// announcement_v2_strings.ts — фиксированные подписи 36 кадров объявлений (макет stories-announcements-v1.html) и подписи кнопок по действию.
//
// зачем: тексты объявления пишет владелец в админке (метка, заголовок, блоки), а короткие подписи внутри шаблонов («дня осталось», «VS»,
// «Твой код», «исправлено», «Как сделать», «Было / Стало», кнопки) — часть кадра и живут здесь на 9 языках интерфейса в формате
// story_template_strings (ru, uk, en, es, pt-BR, vi, id, tr, pl). Переводы на 9 языков —
// Переводчик 29.10 (кнопки и «Твой код» — те же, что у Моментов в story_template_strings, чтобы одна кнопка не переводилась дважды).
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { pluralWord } from '../../../constants/plural';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  // ── кнопки действия (строго как в макете: plus / invite / theme) ──
  ctaOpenPlus: ['Открыть Plus', 'Відкрити Plus', 'Open Plus', 'Abrir Plus', 'Abrir Plus', 'Mở Plus', 'Buka Plus', 'Plus’ı aç', 'Otwórz Plus'],
  ctaShareInvite: ['Поделиться ссылкой', 'Поділитися посиланням', 'Share link', 'Compartir enlace', 'Compartilhar link', 'Chia sẻ liên kết', 'Bagikan tautan', 'Bağlantıyı paylaş', 'Udostępnij link'],
  ctaUseTheme: ['Включить тему', 'Увімкнути тему', 'Turn on theme', 'Activar tema', 'Ativar tema', 'Bật chủ đề', 'Aktifkan tema', 'Temayı aç', 'Włącz motyw'],
  // ── подписи внутри кадров ──
  /** 7 · обратный отсчёт: «{n} {n_w}» под цифрой — слово к числу дней (формы ниже). */
  // зачем: pl «do końca» — у «zostało» форма меняется с числом, «3 dni do końca» верно при любом числе.
  countdownLeft: ['осталось', 'залишилось', 'left', 'restantes', 'restantes', 'còn lại', 'lagi', 'kaldı', 'do końca'],
  /** 11 · только сегодня: центр печати. */
  hours24: ['24 ч', '24 год', '24 h', '24 h', '24 h', '24 giờ', '24 jam', '24 sa', '24 h'],
  /** 14 · карточки: подпись под словом на лицевой стороне. */
  cardsTapToFlip: ['нажмите, чтобы перевернуть', 'натисніть, щоб перевернути', 'tap to flip', 'toca para girar', 'toque para virar', 'chạm để lật', 'ketuk untuk membalik', 'çevirmek için dokun', 'dotknij, aby odwrócić'],
  /** 16 · дуэли. */
  vs: ['VS', 'VS', 'VS', 'VS', 'VS', 'VS', 'VS', 'VS', 'VS'],
  /** 18 · ошибки: подписи «Было» / «Стало» на карточке. */
  was: ['Было', 'Було', 'Was', 'Antes', 'Antes', 'Trước', 'Sebelum', 'Önce', 'Było'],
  became: ['Стало', 'Стало', 'Now', 'Ahora', 'Agora', 'Sau', 'Sesudah', 'Sonra', 'Jest'],
  /** 22 · Plus: слово в кольце. */
  plus: ['Plus', 'Plus', 'Plus', 'Plus', 'Plus', 'Plus', 'Plus', 'Plus', 'Plus'],
  /** 25 · пригласи друзей: подпись карточки кода. */
  yourCode: ['Твой код', 'Твій код', 'Your code', 'Tu código', 'Seu código', 'Mã của bạn', 'Kodemu', 'Kodun', 'Twój kod'],
  /** 35 · мы прочитали: подпись записки. */
  fixed: ['исправлено', 'виправлено', 'fixed', 'corregido', 'corrigido', 'đã sửa', 'sudah diperbaiki', 'düzeltildi', 'naprawione'],
  /** 36 · совет: заголовок карточки. */
  howTo: ['Как сделать', 'Як зробити', 'How to', 'Cómo hacerlo', 'Como fazer', 'Cách làm', 'Caranya', 'Nasıl yapılır', 'Jak to zrobić'],
  /** 10 · скоро: слово на занавесе, если метка пустая. зачем (координатор через Переводчика 29.10): vi «Sắp ra mắt» — 320 px при коробке 300
   *  (72/800), «Sắp có» ≈ 200 с тем же смыслом; pt-BR «Em breve» 281/300 — впритык, проверить на кадре. */
  soon: ['Скоро', 'Скоро', 'Soon', 'Pronto', 'Em breve', 'Sắp có', 'Segera', 'Yakında', 'Wkrótce'],
  /** 11 · только сегодня: надпись по кругу, если метка пустая. */
  todayOnly: ['Только сегодня', 'Тільки сьогодні', 'Today only', 'Solo hoy', 'Só hoje', 'Chỉ hôm nay', 'Hanya hari ini', 'Sadece bugün', 'Tylko dziś'],
  /** 13 · диалоги: перевод трёх подсказок примера под плитками (блоки = английские фразы примера макета). */
  dialogsHint1: ['Повторите?', 'Повторіть?', 'Could you repeat?', '¿Puedes repetir?', 'Pode repetir?', 'Bạn nói lại được không?', 'Bisa diulang?', 'Tekrar eder misiniz?', 'Możesz powtórzyć?'],
  dialogsHint2: ['Я имею в виду…', 'Я маю на увазі…', 'I mean…', 'Quiero decir…', 'Quero dizer…', 'Ý tôi là…', 'Maksudku…', 'Yani…', 'To znaczy…'],
  dialogsHint3: ['Да ладно!', 'Та ну!', 'No way!', '¡No me digas!', 'Não acredito!', 'Không thể nào!', 'Masa sih!', 'Yok artık!', 'Niemożliwe!'],
  /** 14 · карточки: оборот верхней карточки — значение слова quit из примера макета. */
  cardsSampleMeaning: ['уйти с работы', 'піти з роботи', 'to leave a job', 'dejar el trabajo', 'sair do emprego', 'nghỉ việc', 'berhenti kerja', 'işi bırakmak', 'rzucić pracę'],
  /** 20 · экзамен: чип «сдать от {n}» (Переводчик 29.10); число подставляет annExamPassFrom. */
  examPassFrom: ['сдать от {n}', 'скласти від {n}', '{n} to pass', 'aprobar con {n}', 'passar com {n}', 'đạt từ {n}', 'lulus minimal {n}', 'geçmek için {n}', 'zaliczenie od {n}'],
} as const satisfies Readonly<Record<string, Nine>>;

export type AnnouncementV2StringKey = keyof typeof S;
export const ANNOUNCEMENT_V2_STRING_KEYS = Object.keys(S) as readonly AnnouncementV2StringKey[];

/** Слово «день» к числу (7 · обратный отсчёт): формы one / few / many на 9 языках (где «few» нет — повтор «many»; vi, id, tr слово не меняют). */
const DAY_FORMS: readonly (readonly [string, string, string])[] = [
  ['день', 'дня', 'дней'], ['день', 'дні', 'днів'], ['day', 'days', 'days'], ['día', 'días', 'días'], ['dia', 'dias', 'dias'],
  ['ngày', 'ngày', 'ngày'], ['hari', 'hari', 'hari'], ['gün', 'gün', 'gün'], ['dzień', 'dni', 'dni'],
];

/** Слово «вопрос» к числу (20 · экзамен, чип «12 вопросов»; формы Переводчика 29.10). */
const QUESTION_FORMS: readonly (readonly [string, string, string])[] = [
  ['вопрос', 'вопроса', 'вопросов'], ['питання', 'питання', 'питань'], ['question', 'questions', 'questions'], ['pregunta', 'preguntas', 'preguntas'],
  ['pergunta', 'perguntas', 'perguntas'], ['câu hỏi', 'câu hỏi', 'câu hỏi'], ['soal', 'soal', 'soal'], ['soru', 'soru', 'soru'], ['pytanie', 'pytania', 'pytań'],
];

/**
 * Глагол «осталось» согласованный с числом там, где это нужно (Переводчик 29.10: в ru/uk при 1 и 21 дне выходило «1 день осталось»).
 * зачем: countdownLeft Переводчика остаётся значением по умолчанию (форма few/many); для one в ru/uk — своя форма.
 */
const LEFT_ONE: Readonly<Partial<Record<Lang, string>>> = { ru: 'остался', uk: 'залишився' };

export function annText(lang: Lang, key: AnnouncementV2StringKey): string {
  const row = S[key];
  return row[LANG_INDEX[lang] ?? 2] ?? row[2];
}

function leftWord(lang: Lang, days: number): string {
  const base = annText(lang, 'countdownLeft');
  const one = LEFT_ONE[lang];
  return one ? pluralWord(lang, days, { one, few: base, many: base }) : base;
}

/** «дня осталось» — слово к числу без самого числа (цифра стоит отдельно крупно); «день остался» при 1 / 21 в ru, uk. */
export function annDaysLeftWord(lang: Lang, days: number): string {
  const forms = DAY_FORMS[LANG_INDEX[lang] ?? 2] ?? DAY_FORMS[2]!;
  return `${pluralWord(lang, days, { one: forms[0], few: forms[1], many: forms[2] })} ${leftWord(lang, days)}`;
}

/** «3 дня осталось» — число дней до конца срока. */
export function annDaysLeft(lang: Lang, days: number): string {
  const forms = DAY_FORMS[LANG_INDEX[lang] ?? 2] ?? DAY_FORMS[2]!;
  const word = pluralWord(lang, days, { one: forms[0], few: forms[1], many: forms[2] });
  return `${days} ${word} ${leftWord(lang, days)}`;
}

/** «12 вопросов» — число вопросов экзамена (чип кадра 20). */
export function annExamQuestions(lang: Lang, n: number): string {
  const forms = QUESTION_FORMS[LANG_INDEX[lang] ?? 2] ?? QUESTION_FORMS[2]!;
  return `${n} ${pluralWord(lang, n, { one: forms[0], few: forms[1], many: forms[2] })}`;
}

/** «сдать от 10» — проходной балл экзамена (чип кадра 20). */
export function annExamPassFrom(lang: Lang, n: number): string {
  return annText(lang, 'examPassFrom').replace('{n}', String(n));
}
