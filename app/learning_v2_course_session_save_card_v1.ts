import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from "./account_generation";
import { updateCustomCards } from "./flashcards/custom_cards_store";
import type { CardItem } from "./flashcards/types";
import type {
  LearningV2CourseSessionLocalizedTextV1,
  LearningV2CourseSessionSavablePhraseV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import type { LearningV2InterfaceLocale } from "../modules/learning-v2/content/generator_course_contract";

export type LearningV2CourseSessionSaveCardOutcomeV1 =
  | "added"
  | "duplicate"
  | "stale"
  | "failed";

function cardBack(
  meanings: LearningV2CourseSessionLocalizedTextV1,
  locale: LearningV2InterfaceLocale,
) {
  const sourceLocales: NonNullable<CardItem["sourceLocales"]> = {
    "pt-BR": meanings["pt-BR"],
    vi: meanings.vi,
    id: meanings.id,
    tr: meanings.tr,
    pl: meanings.pl,
  };
  return Object.freeze({
    ru: meanings.ru,
    uk: meanings.uk,
    es: meanings.es,
    sourceLocales,
    activeMeaning: meanings[locale],
  });
}

export async function saveLearningV2CourseSessionPhraseToCardsV1(
  input: Readonly<{
    save: LearningV2CourseSessionSavablePhraseV1;
    interfaceLocale: LearningV2InterfaceLocale;
  }>,
): Promise<LearningV2CourseSessionSaveCardOutcomeV1> {
  const generation = captureAccountGeneration();
  if (!isCurrentAccountGeneration(generation)) return "stale";
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(generation)) return "stale" as const;
    const back = cardBack(input.save.meaningByLocale, input.interfaceLocale);
    const card: CardItem = Object.freeze({
      id: `learning_v2_${input.save.savablePhraseRef}`,
      addedAt: Date.now(),
      en: input.save.targetText,
      ru: back.ru,
      uk: back.uk,
      es: back.es,
      sourceLocales: back.sourceLocales,
      description: back.activeMeaning,
      categoryId: "custom" as const,
      isSystem: false,
      source: "learning-v2-direct",
      sourceId: `learning-v2:${input.save.targetLanguage}:${input.save.savablePhraseRef}`,
    });
    let added = false;
    await updateCustomCards((cards) => {
      if (
        cards.some(
          (candidate) =>
            candidate.id === card.id || candidate.sourceId === card.sourceId,
        )
      )
        return cards;
      added = true;
      return [...cards, card];
    });
    return added ? ("added" as const) : ("duplicate" as const);
  }).catch(() => "failed" as const);
}
