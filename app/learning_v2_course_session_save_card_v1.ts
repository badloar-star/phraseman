import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from "./account_generation";
import {
  FREE_CUSTOM_CARD_LIMIT,
  PLUS_CUSTOM_CARD_LIMIT,
  updateCustomCards,
} from "./flashcards/custom_cards_store";
import { storageStudyTarget } from "./target_storage_keys";
import { getVerifiedPremiumAccessStatus } from "./premium_guard";
import type { CardItem } from "./flashcards/types";
import type {
  LearningV2CourseSessionLocalizedTextV1,
  LearningV2CourseSessionSavablePhraseV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import type { LearningV2InterfaceLocale } from "../modules/learning-v2/content/generator_course_contract";
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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
    const hasPremiumAccess = await getVerifiedPremiumAccessStatus().catch(noteSwallowedAs('learning_v2_course_session_save_card_v1:promise_2', false));
    const cardLimit = hasPremiumAccess ? PLUS_CUSTOM_CARD_LIMIT : FREE_CUSTOM_CARD_LIMIT;
    // зачем: карточка из урока обязана лечь в хранилище языка ЭТОГО курса —
    // иначе французский урок пишет в английскую библиотеку (2026-09-05).
    const cardStudyTarget = storageStudyTarget(
      input.save.targetLanguage === 'fr' ? 'fr' : undefined,
    );
    await updateCustomCards((cards) => {
      if (
        cards.some(
          (candidate) =>
            candidate.id === card.id || candidate.sourceId === card.sourceId,
        )
      )
        return cards;
      if (cards.length >= cardLimit) return cards;
      added = true;
      return [...cards, card];
    }, cardStudyTarget);
    return added ? ("added" as const) : ("duplicate" as const);
  }).catch(noteSwallowedAs('learning_v2_course_session_save_card_v1:promise_1', "failed" as const));
}
