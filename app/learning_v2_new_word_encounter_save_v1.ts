import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from "./account_generation";
import { storageStudyTarget } from "./target_storage_keys";
import {
  listCustomCards,
  FREE_CUSTOM_CARD_LIMIT,
  PLUS_CUSTOM_CARD_LIMIT,
  updateCustomCards,
} from "./flashcards/custom_cards_store";
import { getVerifiedPremiumAccessStatus } from "./premium_guard";
import type { CardItem } from "./flashcards/types";
import { peekLearningV2DevWordSaveFailV1 } from "../modules/learning-v2/progress/dev_progress_override_v1";
import type { LearningV2InterfaceLocale } from "../modules/learning-v2/content/generator_course_contract";
import type { LearningV2CourseSessionWordEncounterPresentationV1 } from "../modules/learning-v2/runtime/course_session_word_encounter_presentation_v1";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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

// зачем: слово из урока пишется в библиотеку языка ЭТОГО курса, а не в общую
// английскую — иначе французский курс засоряет английские карточки (2026-09-05).
function encounterStudyTarget(encounter: LearningV2CourseSessionWordEncounterPresentationV1) {
  return storageStudyTarget(
    encounter.save.targetLanguage === 'fr' ? 'fr' : undefined,
  );
}

function identity(encounter: LearningV2CourseSessionWordEncounterPresentationV1) {
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
  encounter: LearningV2CourseSessionWordEncounterPresentationV1,
): Promise<boolean> {
  const ids = identity(encounter);
  try {
    const cards = await listCustomCards(encounterStudyTarget(encounter));
    return cards.some(
      (candidate) =>
        candidate.id === ids.id || candidate.sourceId === ids.sourceId,
    );
  } catch {
    return false;
  }
}

function materializeCard(
  encounter: LearningV2CourseSessionWordEncounterPresentationV1,
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
    transcription: encounter.transcription ?? undefined, // зачем: в источнике null, а CardItem.transcription — string|undefined
    description: encounter.playfulMeaningByLocale[interfaceLocale],
    categoryId: "custom" as const,
    isSystem: false,
    source: "learning-v2-new-word",
  });
}

export async function saveLearningV2NewWordEncounterToCardsV1(
  input: Readonly<{
    encounter: LearningV2CourseSessionWordEncounterPresentationV1;
    interfaceLocale: LearningV2InterfaceLocale;
  }>,
): Promise<LearningV2NewWordSaveOutcomeV1> {
  // зачем (Макеты 15.10, learning-v2-062): dev lv2save=fail — кадр «Не сохранилось» без поломки хранилища; в стор-сборке выключено
  if (peekLearningV2DevWordSaveFailV1()) {
    console.log("[DEV-STATE] lv2save: сохранение слова подменено отказом"); // guard-ok: dev-ветка
    return "failed";
  }
  const generation = captureAccountGeneration();
  if (!isCurrentAccountGeneration(generation)) return "stale";
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(generation)) return "stale" as const;
    const card = materializeCard(input.encounter, input.interfaceLocale);
    let added = false;
    const hasPremiumAccess = await getVerifiedPremiumAccessStatus().catch(noteSwallowedAs('learning_v2_new_word_encounter_save_v1:promise_2', false));
    const cardLimit = hasPremiumAccess ? PLUS_CUSTOM_CARD_LIMIT : FREE_CUSTOM_CARD_LIMIT;
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
    }, encounterStudyTarget(input.encounter));
    return added ? ("added" as const) : ("duplicate" as const);
  }).catch(noteSwallowedAs('learning_v2_new_word_encounter_save_v1:promise_1', "failed" as const));
}

export async function removeLearningV2NewWordEncounterFromCardsV1(
  input: Readonly<{
    encounter: LearningV2CourseSessionWordEncounterPresentationV1;
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
    }, encounterStudyTarget(input.encounter));
    return removed ? ("removed" as const) : ("absent" as const);
  }).catch(noteSwallowedAs('learning_v2_new_word_encounter_save_v1:promise_3', "failed" as const));
}
