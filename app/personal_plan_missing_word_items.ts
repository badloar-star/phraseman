import type { LessonTeachingNote } from './lesson_data_types';
import { getPersonalPlanPhraseLesson } from './personal_plan_phrase_lessons';
import { stableShuffleAwayFromFirst } from './personal_plan_option_ordering';

export type PersonalPlanMissingWordItem = {
  id: string;
  promptRu: string;
  promptUk: string;
  promptEs?: string;
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
  | 'missing_word_option_reuses_phrase_token'
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

function tokenizeAnswer(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
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
  const withTeachingNote = nonInitialSafeWords.find((word) =>
    word.teachingNote
    && compactUnique(word.distractors ?? []).filter((item) => !UNSAFE_MISSING_WORDS.has(item.toLowerCase())).length >= 2,
  );
  return withTeachingNote ?? withDistractors ?? nonInitialSafeWords[0] ?? words?.[0];
}

function blankTargetToken(fullAnswer: string, correctAnswer: string): string {
  const escaped = correctAnswer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return fullAnswer.replace(new RegExp(`\\b${escaped}\\b`, 'i'), '___');
}

function fallbackExplanation(correctAnswer: string): LessonTeachingNote {
  return {
    id: `missing_word_${correctAnswer.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    titleRu: 'Почему так',
    titleEs: 'Por qué es así',
    correctRu: `${correctAnswer} здесь держит смысл фразы. В этом упражнении важно выбрать слово, которое естественно подходит к остальной части предложения.`,
    correctEs: `${correctAnswer} sostiene el sentido de la frase aquí. En este ejercicio importa elegir la palabra que encaja de forma natural con el resto de la oración.`,
    wrongRu: 'Посмотри на всю фразу целиком: нужное слово должно звучать естественно рядом с остальными словами. Мы не угадываем твой выбранный вариант, а спокойно возвращаем к правильной фразе.',
    wrongEs: 'Mira la frase completa: la palabra correcta debe sonar natural junto a las demás. No adivinamos tu opción; volvemos con calma a la frase correcta.',
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
    const answerTokens = new Set(tokenizeAnswer(item.fullAnswer));

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
    const copiedPhraseToken = options.find((option) => {
      const normalizedOption = normalizeOption(option);
      if (normalizedOption === normalizedCorrect) return false;
      const optionTokens = tokenizeAnswer(option);
      return optionTokens.length === 1 && answerTokens.has(optionTokens[0]);
    });
    if (copiedPhraseToken) {
      issues.push({
        code: 'missing_word_option_reuses_phrase_token',
        itemId: item.id,
        detail: `Distractor "${copiedPhraseToken}" is already visible in the phrase, so the answer can be found by elimination.`,
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

      const options = stableShuffleAwayFromFirst(
        compactUnique([correctAnswer, ...(targetWord?.distractors ?? [])])
          .filter((option) => !UNSAFE_MISSING_WORDS.has(option.toLowerCase()))
          .slice(0, 8),
        `${lesson.id}:${phrase.id}:missing-word`,
        (option) => normalizeOption(option) === normalizeOption(correctAnswer),
      );

      return {
        id: String(phrase.id),
        promptRu: phrase.russian,
        promptUk: phrase.ukrainian,
        ...(phrase.spanish ? { promptEs: phrase.spanish } : {}),
        displayEnglish: blankTargetToken(phrase.english, correctAnswer),
        correctAnswer,
        options,
        fullAnswer: phrase.english,
        grammarTags: targetWord?.category ? [targetWord.category] : [],
        vocabularyTags: phrase.words.slice(1).map((word) => word.category).filter(Boolean) as string[],
        explanation,
      };
    })
    .filter((item) => validatePersonalPlanMissingWordItemQuality([item]).length === 0);
}
