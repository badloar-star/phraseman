// зачем: владелец 2026-08-17, глядя на выгрузку первых 10 сессий: «есть некоторые
// фразы которые не подходят для приложения и их надо упускать — создай фильтры».
// Поводом стал перевод «Yes, I am — Да»: любой перевод краткого ответа либо врёт
// («Да»), либо звучит криво («Да, готов»). Решение владельца — такие фразы вообще
// не использовать, а не переводить лучше.
//
// До этого запреты жили в комментариях к файлам содержания и в разрозненных
// тестах на каждую сессию по отдельности. Комментарий ничего не проверяет, а
// тест-на-сессию не ловит новую сессию, которую забыли им покрыть. Здесь —
// единственная исполняемая точка правды: и генератор, и сторож зовут её.
//
// Фильтр отбраковывает ЧЕТЫРЕ класса (выбор владельца, все четыре):
//   1. непереводимые краткие ответы  — Yes, I am / No, it isn't
//   2. фразы без самостоятельного смысла — And you? / Me too
//   3. мёртвый учебниковый язык — How do you do / My name is Anna
//   4. фразы с чужими именами — I am Anna / His name is Tom
//
// Фильтр НЕ судит о грамматике урока (это дело карты сессий) и не проверяет
// переводы на восемь языков (это отдельный сторож). Только пригодность самой
// английской фразы как учебной единицы.

/** Почему фраза не годится. Код уходит в сообщение сторожа и в отчёт генератора. */
export type PhraseRejectionCode =
  | 'short_answer_untranslatable'
  | 'no_standalone_meaning'
  | 'textbook_dead_language'
  | 'proper_name';

export interface PhraseRejection {
  readonly code: PhraseRejectionCode;
  /** Человеческое объяснение автору содержания: что не так и что писать вместо. */
  readonly why: string;
}

export interface PhraseAdmissibilityInput {
  readonly english: string;
  /** Русский перевод. Нужен только для класса «краткий ответ»: см. ниже. */
  readonly russian?: string;
}

/**
 * Имена, которые в курсе разрешены всегда: это не «чужой человек», а сам ученик
 * или обобщённый собеседник. Пусто по решению владельца — имён в карточках нет
 * вообще. Оставлено списком, а не удалено, чтобы включение имени было осознанным
 * шагом с комментарием, а не тихой правкой регулярки.
 */
const ALLOWED_PROPER_NAMES: readonly string[] = Object.freeze([]);

/**
 * Географию имена собственные НЕ считаем: «I live in Madrid» — живая фраза,
 * город не мешает присвоить её себе, в отличие от «I am Anna». Запрет владельца
 * касался чужих ЛЮДЕЙ. Список закрытый: города и страны, встречающиеся в курсе.
 * Открывать его эвристикой нельзя — тогда любое имя с большой буквы пройдёт.
 */
const ALLOWED_PLACE_NAMES: readonly string[] = Object.freeze([
  'Madrid',
  'London',
  'Berlin',
  'Paris',
  'Rome',
  'Lisbon',
  'Warsaw',
  'Istanbul',
  'Jakarta',
  'Hanoi',
  'Kyiv',
  'English',
  'Spanish',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);

/**
 * Краткий ответ = Yes/No + подлежащее + форма to be (возможно с отрицанием).
 * Именно эта форма непереводима: русский краткий ответ не повторяет глагол.
 */
// Стяжение (I'm, it's) пишется БЕЗ пробела перед формой — поэтому две ветки:
// «I am» через пробел и «I'm» слитно. Одной веткой не покрыть, проверено тестом.
const SHORT_ANSWER_RE =
  /^(yes|no)\s*,?\s+(i|you|he|she|it|we|they)\s*(?:\s(?:am|is|are)|['’](?:m|s|re))(\s+not|n['’]?t)?\s*[.!?]?$/i;

/**
 * Фразы, у которых вне диалога нет смысла. Список закрытый и короткий:
 * распознавать «несамостоятельность» эвристикой нельзя — «I am here» тоже
 * короткое, но полноценное. Растёт по мере находок, каждая строка осознанна.
 */
const NO_STANDALONE_MEANING: readonly string[] = Object.freeze([
  'and you',
  'me too',
  'you too',
  'it is',
  'i am',
  'i do',
  'so am i',
  'neither am i',
  'same here',
  'and how about you',
]);

/**
 * Мёртвые учебниковые формулы. Первые три — прямые запреты владельца из
 * episode_01_source_v1.ts, остальные того же класса: в живой речи не звучат.
 */
const TEXTBOOK_DEAD: readonly { readonly pattern: RegExp; readonly instead: string }[] =
  Object.freeze([
    {
      pattern: /^how\s+do\s+you\s+do\b/i,
      instead: 'Nice to meet you',
    },
    {
      pattern: /^my\s+name\s+is\b/i,
      instead: "I'm … (короткая живая форма)",
    },
    {
      pattern: /^i\s+am\s+from\s+\w/i,
      instead: 'I live in … (место, а не учебниковая страна)',
    },
    {
      pattern: /^what\s+is\s+your\s+(nationality|occupation)\b/i,
      instead: 'Where are you from? / What is your job?',
    },
    {
      pattern: /^i\s+am\s+fine,?\s+thank\s+you,?\s+and\s+you\b/i,
      instead: "I'm good, thanks",
    },
  ]);

/**
 * Имя собственное: слово с заглавной буквы не в начале фразы и не в списке
 * разрешённых. Начало фразы пропускаем — там заглавная по правилу письма.
 * Притяжательную форму (Anna's) ловим тем же проходом.
 */
function findProperName(english: string): string | null {
  const words = english.split(/\s+/);
  for (let i = 0; i < words.length; i += 1) {
    const bare = words[i].replace(/[^A-Za-z’']/g, '');
    const stem = bare.replace(/[’']s$/i, '');
    if (stem.length < 2) continue;
    // I и I'm — местоимение, а не имя.
    if (/^i$/i.test(stem)) continue;
    if (!/^[A-Z][a-z]+$/.test(stem)) continue;
    // Первое слово фразы: заглавная объясняется позицией, не именем.
    if (i === 0) continue;
    const lower = stem.toLowerCase();
    if (ALLOWED_PROPER_NAMES.some((n) => n.toLowerCase() === lower)) continue;
    if (ALLOWED_PLACE_NAMES.some((n) => n.toLowerCase() === lower)) continue;
    return stem;
  }
  return null;
}

function normalise(english: string): string {
  return english
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[.!?,]+$/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Главная проверка. Возвращает список причин отказа; пустой список = фраза годна.
 * Возвращаем ВСЕ причины, а не первую: автору полезно увидеть сразу всё, что
 * не так, а не чинить по одной ошибке за прогон.
 */
export function checkPhraseAdmissibility(
  input: PhraseAdmissibilityInput,
): readonly PhraseRejection[] {
  const english = input.english.trim();
  if (!english) return Object.freeze([]);
  const rejections: PhraseRejection[] = [];
  const flat = normalise(english);

  if (SHORT_ANSWER_RE.test(english)) {
    rejections.push({
      code: 'short_answer_untranslatable',
      why:
        `«${english}» — краткий ответ. Русский краткий ответ не повторяет глагол, ` +
        'поэтому перевод либо врёт («Да»), либо звучит криво («Да, готов»). ' +
        'Учить краткому ответу нужно внутри диалога, а не отдельной карточкой.',
    });
  }

  if (NO_STANDALONE_MEANING.includes(flat)) {
    rejections.push({
      code: 'no_standalone_meaning',
      why:
        `«${english}» вне диалога ничего не значит — в карточке выглядит обрубком. ` +
        'Нужна фраза, понятная сама по себе.',
    });
  }

  for (const entry of TEXTBOOK_DEAD) {
    if (entry.pattern.test(english)) {
      rejections.push({
        code: 'textbook_dead_language',
        why: `«${english}» — мёртвая учебниковая формула. Вместо неё: ${entry.instead}.`,
      });
      break;
    }
  }

  const name = findProperName(english);
  if (name !== null) {
    rejections.push({
      code: 'proper_name',
      why:
        `«${english}» содержит чужое имя (${name}). Имя постороннего человека мешает ` +
        'ученику присвоить фразу себе. Заменить на роль (my sister) или убрать.',
    });
  }

  return Object.freeze(rejections);
}

/** Короткая форма для мест, где нужен только факт годности. */
export function isPhraseAdmissible(input: PhraseAdmissibilityInput): boolean {
  return checkPhraseAdmissibility(input).length === 0;
}
