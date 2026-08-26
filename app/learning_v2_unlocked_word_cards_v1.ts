import type {
  CardItem,
  FlashcardSourceLocaleMap,
} from "./flashcards/types";
import type { LearningV2UnlockedLessonWordV1 } from "./learning_v2_unlocked_lesson_words_v1";

export function projectLearningV2UnlockedWordsToCardsV1(args: {
  unlocked: readonly LearningV2UnlockedLessonWordV1[];
}): readonly CardItem[] {
  return [...args.unlocked]
    .sort(
      (left, right) =>
        left.encounter.orderWithinSession - right.encounter.orderWithinSession,
    )
    .map(({ encounter }) => {
      const meaning = encounter.save.meaningByLocale;
      const sourceLocales: FlashcardSourceLocaleMap = {
        "pt-BR": meaning["pt-BR"],
        vi: meaning.vi,
        id: meaning.id,
        tr: meaning.tr,
        pl: meaning.pl,
      };
      return {
        id: `learning-v2:${encounter.save.targetLanguage}:${encounter.lexicalItemId}`,
        en: encounter.save.targetText,
        ru: meaning.ru,
        uk: meaning.uk,
        es: meaning.es,
        sourceLocales,
        transcription: encounter.transcription,
        categoryId: "saved",
        isSystem: false,
        source: "learning_v2_word_encounter",
        sourceId: encounter.lexicalItemId,
      } satisfies CardItem;
    });
}
