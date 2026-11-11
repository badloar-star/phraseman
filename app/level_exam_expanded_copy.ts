/**
 * Экзамен уровня: подписи заданий двенадцати новых механик на языке ученика.
 * зачем: само задание — на изучаемом языке (фраза урока или авторский диалог), а «что сделать» —
 * постоянная подпись вида задания. Обращение на «вы», как в остальных текстах экзамена и Пика.
 * Языки — те же, на которых есть перевод фраз курса.
 */
import type { ExpandedFormat } from '../modules/expanded-formats/types';

/** Какие две группы у задания «разложи по группам» (авторский банк называет вид, подписи — здесь). */
export type AuthoredGroupKind = 'when_where' | 'one_many';

export type LevelExamExpandedCopy = Readonly<{
  /** Подпись над заданием: что сделать. */
  instruction: Readonly<Record<ExpandedFormat, string>>;
  /** Главная строка там, где у задания нет своей фразы. */
  prompt: Readonly<{ multi_select: string; dialogue_order: string; reply_pairs: string }>;
  groups: Readonly<Record<AuthoredGroupKind, Readonly<{ prompt: string; labels: readonly [string, string] }>>>;
}>;

type Row = readonly [ru: string, uk: string, en: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string];
const LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

const INSTRUCTION: Readonly<Record<ExpandedFormat, Row>> = {
  context_choice: ['Выберите ответ', 'Оберіть відповідь', 'Choose the reply', 'Elija la respuesta', 'Escolha a resposta', 'Chọn câu trả lời', 'Pilih jawaban', 'Cevabı seçin', 'Wybierz odpowiedź'],
  dialogue_order: ['Восстановите диалог', 'Відновіть діалог', 'Restore the dialogue', 'Ordene el diálogo', 'Ordene o diálogo', 'Sắp xếp lại đoạn hội thoại', 'Susun kembali dialog', 'Diyaloğu sıralayın', 'Ułóż dialog'],
  word_repair: ['Исправьте ошибку', 'Виправте помилку', 'Fix the mistake', 'Corrija el error', 'Corrija o erro', 'Sửa lỗi sai', 'Perbaiki kesalahan', 'Hatayı düzeltin', 'Popraw błąd'],
  multi_select: ['Выберите два ответа', 'Оберіть дві відповіді', 'Choose two answers', 'Elija dos respuestas', 'Escolha duas respostas', 'Chọn hai đáp án', 'Pilih dua jawaban', 'İki cevap seçin', 'Wybierz dwie odpowiedzi'],
  linked_gaps: ['Заполните два пропуска', 'Заповніть два пропуски', 'Fill both gaps', 'Complete los dos huecos', 'Preencha as duas lacunas', 'Điền hai chỗ trống', 'Isi dua rumpang', 'İki boşluğu doldurun', 'Uzupełnij dwie luki'],
  typed_word: ['Введите одно слово', 'Введіть одне слово', 'Type one word', 'Escriba una palabra', 'Digite uma palavra', 'Nhập một từ', 'Ketik satu kata', 'Tek kelime yazın', 'Wpisz jedno słowo'],
  classify_function: ['Распределите по группам', 'Розподіліть за групами', 'Sort into groups', 'Clasifique en grupos', 'Separe em grupos', 'Phân loại theo nhóm', 'Kelompokkan', 'Gruplara ayırın', 'Podziel na grupy'],
  reply_pairs: ['Соедините вопрос и ответ', 'З’єднайте запитання й відповідь', 'Match question and reply', 'Una pregunta y respuesta', 'Ligue pergunta e resposta', 'Nối câu hỏi với câu trả lời', 'Pasangkan pertanyaan dan jawaban', 'Soru ile cevabı eşleştirin', 'Połącz pytanie i odpowiedź'],
  sentence_build_noise: ['Соберите предложение', 'Складіть речення', 'Build the sentence', 'Forme la oración', 'Monte a frase', 'Ghép thành câu', 'Susun kalimat', 'Cümleyi kurun', 'Ułóż zdanie'],
  remove_intruder: ['Уберите одно лишнее слово', 'Приберіть одне зайве слово', 'Remove one extra word', 'Quite una palabra de más', 'Remova uma palavra a mais', 'Bỏ một từ thừa', 'Hapus satu kata berlebih', 'Fazla olan bir kelimeyi çıkarın', 'Usuń jedno zbędne słowo'],
  sentence_transform: ['Переведите предложение', 'Перекладіть речення', 'Translate the sentence', 'Traduzca la oración', 'Traduza a frase', 'Dịch câu này', 'Terjemahkan kalimat', 'Cümleyi çevirin', 'Przetłumacz zdanie'],
  evidence_choice: ['Найдите ответ в тексте', 'Знайдіть відповідь у тексті', 'Find the answer in the text', 'Encuentre la respuesta en el texto', 'Encontre a resposta no texto', 'Tìm câu trả lời trong đoạn văn', 'Temukan jawaban dalam teks', 'Cevabı metinde bulun', 'Znajdź odpowiedź w tekście'],
};

const PROMPT_MULTI: Row = ['Два предложения без ошибок', 'Два речення без помилок', 'Two sentences without mistakes', 'Dos oraciones sin errores', 'Duas frases sem erros', 'Hai câu không có lỗi', 'Dua kalimat tanpa kesalahan', 'Hatasız iki cümle', 'Dwa zdania bez błędów'];
const PROMPT_DIALOGUE: Row = ['Диалог', 'Діалог', 'Dialogue', 'Diálogo', 'Diálogo', 'Hội thoại', 'Dialog', 'Diyalog', 'Dialog'];
const PROMPT_PAIRS: Row = ['Короткий разговор', 'Коротка розмова', 'Short conversation', 'Conversación breve', 'Conversa curta', 'Cuộc trò chuyện ngắn', 'Percakapan singkat', 'Kısa konuşma', 'Krótka rozmowa'];

const GROUPS: Readonly<Record<AuthoredGroupKind, Readonly<{ prompt: Row; first: Row; second: Row }>>> = {
  when_where: {
    prompt: ['Когда или где?', 'Коли чи де?', 'When or where?', '¿Cuándo o dónde?', 'Quando ou onde?', 'Khi nào hay ở đâu?', 'Kapan atau di mana?', 'Ne zaman mı, nerede mi?', 'Kiedy czy gdzie?'],
    first: ['Когда', 'Коли', 'When', 'Cuándo', 'Quando', 'Khi nào', 'Kapan', 'Ne zaman', 'Kiedy'],
    second: ['Где', 'Де', 'Where', 'Dónde', 'Onde', 'Ở đâu', 'Di mana', 'Nerede', 'Gdzie'],
  },
  one_many: {
    prompt: ['Один или несколько?', 'Один чи кілька?', 'One or several?', '¿Uno o varios?', 'Um ou vários?', 'Một hay nhiều?', 'Satu atau beberapa?', 'Bir mi, birkaç mı?', 'Jeden czy kilka?'],
    first: ['Один', 'Один', 'One', 'Uno', 'Um', 'Một', 'Satu', 'Bir', 'Jeden'],
    second: ['Несколько', 'Кілька', 'Several', 'Varios', 'Vários', 'Nhiều', 'Beberapa', 'Birkaç', 'Kilka'],
  },
};

function build(index: number): LevelExamExpandedCopy {
  const pick = (row: Row): string => row[index];
  const instruction = Object.fromEntries(
    (Object.keys(INSTRUCTION) as ExpandedFormat[]).map((format) => [format, pick(INSTRUCTION[format])]),
  ) as Record<ExpandedFormat, string>;
  const groups = Object.fromEntries(
    (Object.keys(GROUPS) as AuthoredGroupKind[]).map((kind) => [kind, {
      prompt: pick(GROUPS[kind].prompt),
      labels: [pick(GROUPS[kind].first), pick(GROUPS[kind].second)] as const,
    }]),
  ) as LevelExamExpandedCopy['groups'];
  return {
    instruction,
    prompt: { multi_select: pick(PROMPT_MULTI), dialogue_order: pick(PROMPT_DIALOGUE), reply_pairs: pick(PROMPT_PAIRS) },
    groups,
  };
}

const BY_LOCALE: Readonly<Record<string, LevelExamExpandedCopy>> = Object.fromEntries(
  LOCALES.map((locale, index) => [locale, build(index)]),
);
const ENGLISH = build(LOCALES.indexOf('en'));

/** Подписи на языке ученика; незнакомый язык получает английские. */
export function levelExamExpandedCopy(sourceLocale: string): LevelExamExpandedCopy {
  return BY_LOCALE[sourceLocale] ?? ENGLISH;
}

// зачем: файл лежит в app/ — expo-router ждёт экспорт по умолчанию у каждого файла (как у level_exam_gap_rules)
export default function __RouteShim() { return null; }
