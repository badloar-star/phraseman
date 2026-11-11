/**
 * Двенадцать новых механик заданий (Пик и экзамены) — общие типы.
 *
 * зачем (владелец 11.11.2026): механики придуманы и одобрены на макете Кодекса
 * (`peak-all-languages.html`), но в приложении их не было. Этот модуль — единственное
 * место, где описано, что такое задание каждого вида и каким бывает ответ на него.
 * Чистый модуль: ни React, ни Firebase, ни Пика, ни экзамена — оба берут типы отсюда.
 *
 * Имена форматов и полей совпадают с авторским контрактом Кодекса
 * `peak-expanded-author-v1` (contract.mjs), чтобы его пул читался без перекладывания.
 */

export const EXPANDED_FORMATS = [
  'context_choice',
  'dialogue_order',
  'word_repair',
  'multi_select',
  'linked_gaps',
  'typed_word',
  'classify_function',
  'reply_pairs',
  'sentence_build_noise',
  'remove_intruder',
  'sentence_transform',
  'evidence_choice',
] as const;

export type ExpandedFormat = (typeof EXPANDED_FORMATS)[number];

export function isExpandedFormat(value: unknown): value is ExpandedFormat {
  return typeof value === 'string' && (EXPANDED_FORMATS as readonly string[]).includes(value);
}

/** Один ответ из списка: «ответ в диалоге». */
export type ContextChoiceExercise = Readonly<{
  format: 'context_choice';
  options: readonly string[];
  key: number;
}>;

/** Один ответ из списка, каждый вариант — дословная цитата из текста `passage`. */
export type EvidenceChoiceExercise = Readonly<{
  format: 'evidence_choice';
  passage: string;
  options: readonly string[];
  key: number;
}>;

/** Расставить реплики: `key` — индексы банка в верном порядке. */
export type DialogueOrderExercise = Readonly<{
  format: 'dialogue_order';
  bank: readonly string[];
  key: readonly number[];
}>;

/** Найти ошибочное слово и выбрать замену. */
export type WordRepairExercise = Readonly<{
  format: 'word_repair';
  words: readonly string[];
  replacements: readonly string[];
  key: Readonly<{ word: number; replacement: number }>;
}>;

/** Выбрать ровно `key.length` ответов; порядок не важен. */
export type MultiSelectExercise = Readonly<{
  format: 'multi_select';
  options: readonly string[];
  key: readonly number[];
}>;

/** Несколько зависящих друг от друга пропусков; у каждого свой список вариантов. */
export type LinkedGapsExercise = Readonly<{
  format: 'linked_gaps';
  slots: readonly (readonly string[])[];
  key: readonly number[];
}>;

/** Ввод с клавиатуры: одно слово. */
export type TypedWordExercise = Readonly<{
  format: 'typed_word';
  acceptedAnswers: readonly string[];
}>;

/** Ввод с клавиатуры: предложение в заданной форме. */
export type SentenceTransformExercise = Readonly<{
  format: 'sentence_transform';
  acceptedAnswers: readonly string[];
}>;

/** Каждой реплике — группа: `key[i]` — индекс группы для `items[i]`. */
export type ClassifyFunctionExercise = Readonly<{
  format: 'classify_function';
  items: readonly string[];
  groups: readonly string[];
  key: readonly number[];
}>;

/** Пары вопрос–ответ: `key[i]` — индекс ответа для вопроса `i`. */
export type ReplyPairsExercise = Readonly<{
  format: 'reply_pairs';
  questions: readonly string[];
  replies: readonly string[];
  key: readonly number[];
}>;

/** Сборка фразы из банка с лишними словами: нужно `need` плиток в порядке `key`. */
export type SentenceBuildNoiseExercise = Readonly<{
  format: 'sentence_build_noise';
  bank: readonly string[];
  need: number;
  key: readonly number[];
}>;

/** Убрать одно лишнее слово. */
export type RemoveIntruderExercise = Readonly<{
  format: 'remove_intruder';
  words: readonly string[];
  key: number;
}>;

export type ExpandedExercise =
  | ContextChoiceExercise
  | EvidenceChoiceExercise
  | DialogueOrderExercise
  | WordRepairExercise
  | MultiSelectExercise
  | LinkedGapsExercise
  | TypedWordExercise
  | SentenceTransformExercise
  | ClassifyFunctionExercise
  | ReplyPairsExercise
  | SentenceBuildNoiseExercise
  | RemoveIntruderExercise;

/**
 * Ответ ученика. Пока ответ набирается, незаполненные места — `null`
 * (не выбранная группа, пустой пропуск), поэтому один тип служит и черновиком.
 */
export type ExpandedResponse =
  | Readonly<{ format: 'context_choice' | 'evidence_choice'; picked: number | null }>
  | Readonly<{ format: 'dialogue_order' | 'sentence_build_noise'; order: readonly number[] }>
  | Readonly<{ format: 'word_repair'; wordIndex: number | null; replacementIndex: number | null }>
  | Readonly<{ format: 'multi_select'; picked: readonly number[] }>
  | Readonly<{ format: 'linked_gaps'; picked: readonly (number | null)[] }>
  | Readonly<{ format: 'typed_word' | 'sentence_transform'; text: string }>
  | Readonly<{ format: 'classify_function'; assignments: readonly (number | null)[] }>
  | Readonly<{ format: 'reply_pairs'; pairs: readonly (number | null)[] }>
  | Readonly<{ format: 'remove_intruder'; removed: number | null }>;

/** Пояснения к ответу на одном языке интерфейса. Все поля, кроме `correct`, необязательны. */
export type ExpandedFeedback = Readonly<{
  /** Почему верный ответ верен. */
  correct: string;
  /** По одному пояснению на вариант (выбор, два ответа, подтверждение). */
  choiceReasons?: readonly string[];
  /** По одному на реплику/плитку банка. */
  sequenceReasons?: readonly string[];
  bankReasons?: readonly string[];
  /** По одному на слово фразы и на замену. */
  wordReasons?: readonly string[];
  replacementReasons?: readonly string[];
  /** [пропуск][вариант]. */
  gapReasons?: readonly (readonly string[])[];
  /** По одному на реплику (группы) или вопрос (пары). */
  itemReasons?: readonly string[];
  /** Ввод текста: разбор типичных ошибок и общее пояснение для прочих. */
  commonErrors?: readonly Readonly<{ answer: string; reason: string }>[];
  otherwise?: string;
}>;

/** Задание, готовое к показу: тексты уже на языке интерфейса. */
export type ExpandedTask = Readonly<{
  id: string;
  /** Изучаемый язык — по нему приводится регистр текстового ответа. */
  studyTarget: string;
  /** Что сделать: «Выберите ответ». */
  instruction: string;
  /** Главная строка задания: фраза, вопрос, тема. */
  prompt: string;
  /** Условие под фразой; может быть пустым. */
  context: string;
  exercise: ExpandedExercise;
  feedback?: ExpandedFeedback;
}>;
