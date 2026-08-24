import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from "./account_generation";
import {
  listCustomCards,
  updateCustomCards,
} from "./flashcards/custom_cards_store";
import type { CardItem } from "./flashcards/types";
import type { LearningV2InterfaceLocale } from "../modules/learning-v2/content/generator_course_contract";
import type { LearningV2CourseSessionNewWordEncounterV1 } from "../modules/learning-v2/runtime/course_session_client_children_v1";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

export type LearningV2NewWordSaveOutcomeV1 =
  | "added"
  | "duplicate"
  | "stale"
  | "failed";

export type LearningV2NewWordRemoveOutcomeV1 =
  | "removed"
  | "absent"
  | "stale"
  | "failed";

function identity(encounter: LearningV2CourseSessionNewWordEncounterV1) {
  const sourceId = `learning-v2-word:${encounter.save.targetLanguage}:${encounter.lexicalItemId}`;
  return Object.freeze({
    id: `learning_v2_word_${hashCanonicalBody({
      targetLanguage: encounter.save.targetLanguage,
      lexicalItemId: encounter.lexicalItemId,
    })}`,
    sourceId,
  });
}

export async function isLearningV2NewWordEncounterSavedV1(
  encounter: LearningV2CourseSessionNewWordEncounterV1,
): Promise<boolean> {
  const ids = identity(encounter);
  try {
    const cards = await listCustomCards();
    return cards.some(
      (candidate) =>
        candidate.id === ids.id || candidate.sourceId === ids.sourceId,
    );
  } catch {
    return false;
  }
}

function materializeCard(
  encounter: LearningV2CourseSessionNewWordEncounterV1,
  interfaceLocale: LearningV2InterfaceLocale,
): CardItem {
  const ids = identity(encounter);
  const meanings = encounter.save.meaningByLocale;
  return Object.freeze({
    ...ids,
    addedAt: Date.now(),
    en: encounter.save.targetText,
    ru: meanings.ru,
    uk: meanings.uk,
    es: meanings.es,
    sourceLocales: {
      "pt-BR": meanings["pt-BR"],
      vi: meanings.vi,
      id: meanings.id,
      tr: meanings.tr,
      pl: meanings.pl,
    },
    transcription: encounter.transcription,
    description: encounter.playfulMeaningByLocale[interfaceLocale],
    categoryId: "custom" as const,
    isSystem: false,
    source: "learning-v2-new-word",
  });
}

export async function saveLearningV2NewWordEncounterToCardsV1(
  input: Readonly<{
    encounter: LearningV2CourseSessionNewWordEncounterV1;
    interfaceLocale: LearningV2InterfaceLocale;
  }>,
): Promise<LearningV2NewWordSaveOutcomeV1> {
  const generation = captureAccountGeneration();
  if (!isCurrentAccountGeneration(generation)) return "stale";
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(generation)) return "stale" as const;
    const card = materializeCard(input.encounter, input.interfaceLocale);
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

export async function removeLearningV2NewWordEncounterFromCardsV1(
  input: Readonly<{
    encounter: LearningV2CourseSessionNewWordEncounterV1;
  }>,
): Promise<LearningV2NewWordRemoveOutcomeV1> {
  const generation = captureAccountGeneration();
  if (!isCurrentAccountGeneration(generation)) return "stale";
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(generation)) return "stale" as const;
    const ids = identity(input.encounter);
    let removed = false;
    await updateCustomCards((cards) => {
      const next = cards.filter((candidate) => {
        const matches =
          candidate.id === ids.id || candidate.sourceId === ids.sourceId;
        if (matches) removed = true;
        return !matches;
      });
      return removed ? next : cards;
    });
    return removed ? ("removed" as const) : ("absent" as const);
  }).catch(() => "failed" as const);
}
