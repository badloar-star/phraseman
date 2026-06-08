import type { LessonIntroScreen, LessonPhrase, LessonTeachingNote } from './lesson_data_types';
import { normalizeWordCategory } from './pos_taxonomy';
import type {
  LocalizedText,
  PhraseExplanation,
  PlanContentDay,
  PlanContentPhrase,
  PlanIntroScreen,
  PlanVocabularyWord,
} from './plan_content_schema';

/**
 * Maps the rich PlanContentDay (what the new generator + agents produce) down to the
 * runtime shapes the existing exercise item builders consume (LessonPhrase, etc.).
 *
 * The full friendly-coach explanation (rule + why + commonMistake) collapses into the
 * runtime LessonTeachingNote: rule+why become the "correct" side, the common mistake
 * becomes the "wrong" side. Localized uk/es are carried when present.
 *
 * Pure module — no runtime deps.
 */

function joinLocalized(parts: Array<LocalizedText | undefined>, lang: 'ru' | 'uk' | 'es'): string {
  return parts
    .map((part) => (part ? (part[lang] ?? part.ru) : ''))
    .map((text) => text.trim())
    .filter(Boolean)
    .join(' ');
}

/** Collapse a full PhraseExplanation into the runtime teaching note shape. */
export function explanationToTeachingNote(
  id: string,
  explanation: PhraseExplanation,
): LessonTeachingNote {
  const correctRu = joinLocalized([explanation.rule, explanation.why], 'ru');
  const correctUk = joinLocalized([explanation.rule, explanation.why], 'uk');
  const correctEs = joinLocalized([explanation.rule, explanation.why], 'es');
  return {
    id,
    titleRu: explanation.title.ru,
    ...(explanation.title.uk ? { titleUk: explanation.title.uk } : {}),
    ...(explanation.title.es ? { titleEs: explanation.title.es } : {}),
    correctRu,
    ...(correctUk && correctUk !== correctRu ? { correctUk } : {}),
    ...(correctEs && correctEs !== correctRu ? { correctEs } : {}),
    wrongRu: explanation.commonMistake.ru,
    ...(explanation.commonMistake.uk ? { wrongUk: explanation.commonMistake.uk } : {}),
    ...(explanation.commonMistake.es ? { wrongEs: explanation.commonMistake.es } : {}),
  };
}

function wordsForPhrase(phrase: PlanContentPhrase): LessonPhrase['words'] {
  const teachingNote = explanationToTeachingNote(`${phrase.id}_note`, phrase.explanation);

  // Use the agent-authored words: exact POS + curated distractors (no guessing).
  return phrase.words.map((word, index) => ({
    text: word.text,
    correct: word.text,
    distractors: word.distractors,
    category: word.partOfSpeech,
    // Attach the explanation to the first word — shown as the exercise opens.
    ...(index === 0 ? { teachingNote } : {}),
  }));
}

/** One content phrase -> one runtime LessonPhrase. */
export function contentPhraseToLessonPhrase(phrase: PlanContentPhrase): LessonPhrase {
  return {
    id: phrase.id,
    english: phrase.english,
    russian: phrase.meaning.ru,
    ukrainian: phrase.meaning.uk ?? phrase.meaning.ru,
    ...(phrase.meaning.es ? { spanish: phrase.meaning.es } : {}),
    words: wordsForPhrase(phrase),
  };
}

/** All runtime phrases for a generated day. */
export function contentDayToLessonPhrases(day: PlanContentDay): LessonPhrase[] {
  return day.phrases.map(contentPhraseToLessonPhrase);
}

/** Runtime-friendly vocabulary card (POS normalized to a real WordCategory). */
export type RuntimeVocabularyCard = {
  word: string;
  partOfSpeech: string;
  translationRu: string;
  translationUk: string;
  translationEs?: string;
  example: string;
};

/** Map a day-specific intro screen to the runtime LessonIntroScreen shape. */
export function contentIntroToLessonIntroScreen(screen: PlanIntroScreen): LessonIntroScreen {
  return {
    kind: screen.kind,
    titleRU: screen.title.ru,
    ...(screen.title.uk ? { titleUK: screen.title.uk } : {}),
    ...(screen.title.es ? { titleES: screen.title.es } : {}),
    textRU: screen.body.ru,
    ...(screen.body.uk ? { textUK: screen.body.uk } : {}),
    ...(screen.body.es ? { textES: screen.body.es } : {}),
    ...(screen.examples && screen.examples.length > 0
      ? {
          examples: screen.examples.map((example) => ({
            en: example.en,
            trRU: example.gloss.ru,
            trUK: example.gloss.uk ?? example.gloss.ru,
            ...(example.gloss.es ? { trES: example.gloss.es } : {}),
          })),
        }
      : {}),
  };
}

/** All runtime intro screens for a generated day's theory. */
export function contentDayToLessonIntroScreens(day: PlanContentDay): LessonIntroScreen[] {
  return day.intro.map(contentIntroToLessonIntroScreen);
}

export function contentVocabularyToRuntimeCards(day: PlanContentDay): RuntimeVocabularyCard[] {
  return day.vocabulary.map((vocab: PlanVocabularyWord) => {
    const resolved = normalizeWordCategory(vocab.partOfSpeech, vocab.word);
    return {
      word: vocab.word,
      partOfSpeech: resolved.category,
      translationRu: vocab.translation.ru,
      translationUk: vocab.translation.uk ?? vocab.translation.ru,
      ...(vocab.translation.es ? { translationEs: vocab.translation.es } : {}),
      example: vocab.example,
    };
  });
}
