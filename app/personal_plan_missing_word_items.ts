import type { LessonTeachingNote } from './lesson_data_types';
import { getPersonalPlanPhraseLesson } from './personal_plan_phrase_lessons';

export type PersonalPlanMissingWordItem = {
  id: string;
  promptRu: string;
  promptUk: string;
  displayEnglish: string;
  correctAnswer: string;
  options: string[];
  fullAnswer: string;
  grammarTags: string[];
  vocabularyTags: string[];
  explanation: LessonTeachingNote;
};

export type PersonalPlanMissingWordQualityCode =
  | 'missing_word_option_count'
  | 'missing_word_correct_option_count'
  | 'unsafe_missing_word_slot'
  | 'unsafe_missing_word_option';

export type PersonalPlanMissingWordQualityIssue = {
  code: PersonalPlanMissingWordQualityCode;
  itemId: string;
  detail: string;
};

export type GetPersonalPlanMissingWordItemsInput = {
  lessonId: string;
  contentUnitIds: string[];
};

function compactUnique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

const UNSAFE_MISSING_WORD_CATEGORIES = new Set([
  'to-be',
  'pronoun',
  'auxiliary',
  'name',
  'user-name',
  'contact-name',
  'person-name',
]);

const UNSAFE_MISSING_WORDS = new Set([
  'i',
  'you',
  'he',
  'she',
  'we',
  'they',
  'it',
  'am',
  'are',
  'is',
  "i'm",
  "you're",
  "he's",
  "she's",
  "we're",
  "they're",
  "it's",
]);

function isUnsafeMissingWord(word: { text?: string; correct?: string; category?: string } | undefined): boolean {
  const value = (word?.correct || word?.text || '').trim().toLowerCase();
  const category = (word?.category || '').trim().toLowerCase();
  return !value || UNSAFE_MISSING_WORDS.has(value) || UNSAFE_MISSING_WORD_CATEGORIES.has(category);
}

function normalizeOption(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isUnsafeMissingWordValue(value: string): boolean {
  return UNSAFE_MISSING_WORDS.has(normalizeOption(value));
}

function chooseMissingWordTarget(
  words: Array<{ text?: string; correct?: string; category?: string; distractors?: string[]; teachingNote?: LessonTeachingNote }> | undefined,
) {
  const safeWords = (words ?? []).filter((word) => !isUnsafeMissingWord(word));
  const nonInitialSafeWords = safeWords.length > 1 ? safeWords.slice(1) : safeWords;
  const withDistractors = nonInitialSafeWords.find((word) =>
    compactUnique(word.distractors ?? []).filter((item) => !UNSAFE_MISSING_WORDS.has(item.toLowerCase())).length >= 2,
  );
  return withDistractors ?? nonInitialSafeWords[0] ?? words?.[0];
}

function blankTargetToken(fullAnswer: string, correctAnswer: string): string {
  const escaped = correctAnswer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return fullAnswer.replace(new RegExp(`\\b${escaped}\\b`, 'i'), '___');
}

function fallbackExplanation(correctAnswer: string): LessonTeachingNote {
  return {
    id: `missing_word_${correctAnswer.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    titleRu: 'Почему так',
    correctRu: `${correctAnswer} здесь держит смысл фразы. В этом упражнении важно выбрать слово, которое естественно подходит к остальной части предложения.`,
    wrongRu: 'Посмотри на всю фразу целиком: нужное слово должно звучать естественно рядом с остальными словами. Мы не угадываем твой выбранный вариант, а спокойно возвращаем к правильной фразе.',
  };
}

export function validatePersonalPlanMissingWordItemQuality(
  items: PersonalPlanMissingWordItem[],
): PersonalPlanMissingWordQualityIssue[] {
  const issues: PersonalPlanMissingWordQualityIssue[] = [];

  for (const item of items) {
    const options = compactUnique(item.options);
    const normalizedCorrect = normalizeOption(item.correctAnswer);
    const correctOptionCount = options.filter((option) => normalizeOption(option) === normalizedCorrect).length;

    if (options.length < 3) {
      issues.push({
        code: 'missing_word_option_count',
        itemId: item.id,
        detail: 'Missing-word exercises need at least three clear options.',
      });
    }
    if (correctOptionCount !== 1) {
      issues.push({
        code: 'missing_word_correct_option_count',
        itemId: item.id,
        detail: 'Exactly one option must equal the correct answer.',
      });
    }
    if (/^___\b/.test(item.displayEnglish.trim()) || isUnsafeMissingWordValue(item.correctAnswer)) {
      issues.push({
        code: 'unsafe_missing_word_slot',
        itemId: item.id,
        detail: 'The blank cannot test a pronoun, to-be chunk, name, or sentence-opening slot without context.',
      });
    }

    const unsafeOption = options.find((option) => isUnsafeMissingWordValue(option));
    if (unsafeOption) {
      issues.push({
        code: 'unsafe_missing_word_option',
        itemId: item.id,
        detail: `Unsafe option "${unsafeOption}" would make the exercise ambiguous or identity-based.`,
      });
    }
  }

  return issues;
}

export function getPersonalPlanMissingWordItems(
  input: GetPersonalPlanMissingWordItemsInput,
): PersonalPlanMissingWordItem[] {
  const lesson = getPersonalPlanPhraseLesson(input.lessonId);
  if (!lesson) return [];

  const requestedIds = new Set(input.contentUnitIds);
  return lesson.phrases
    .filter((phrase) => requestedIds.has(String(phrase.id)))
    .map((phrase) => {
      const targetWord = chooseMissingWordTarget(phrase.words);
      const correctAnswer = targetWord?.correct || targetWord?.text || phrase.english.split(/\s+/)[0] || '';
      const explanation = targetWord?.teachingNote ?? fallbackExplanation(correctAnswer);

      return {
        id: String(phrase.id),
        promptRu: phrase.russian,
        promptUk: phrase.ukrainian,
        displayEnglish: blankTargetToken(phrase.english, correctAnswer),
        correctAnswer,
        options: compactUnique([correctAnswer, ...(targetWord?.distractors ?? [])])
          .filter((option) => !UNSAFE_MISSING_WORDS.has(option.toLowerCase()))
          .slice(0, 5),
        fullAnswer: phrase.english,
        grammarTags: targetWord?.category ? [targetWord.category] : [],
        vocabularyTags: phrase.words.slice(1).map((word) => word.category).filter(Boolean) as string[],
        explanation,
      };
    })
    .filter((item) => validatePersonalPlanMissingWordItemQuality([item]).length === 0);
}
