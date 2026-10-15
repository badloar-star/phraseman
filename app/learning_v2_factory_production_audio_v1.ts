import { lazyContent } from "./content_lazy";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  materializeLearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioFileV1,
  type LearningV2CourseSessionAudioFileInputV1,
  type LearningV2CourseSessionAudioVoiceIdV1,
} from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import type { LearningV2CourseSessionLearnerChildV1 } from "../modules/learning-v2/runtime/course_session_client_children_v1";

const VOICES = Object.freeze(["ash", "onyx", "nova", "coral"] as const);
const FACTORY_AUDIO_PACK_COORDINATE_V1 = hashCanonicalBody({
  schemaVersion: "learning-v2-factory-production-audio-pack.v1",
});
type FactoryProductionAudioEntriesModuleV1 = typeof import("./learning_v2_factory_production_audio_entries_v1.generated");
type FactoryProductionAudioEntryV1 = FactoryProductionAudioEntriesModuleV1["FACTORY_PRODUCTION_AUDIO_ENTRIES_V1"][number];
// зачем (PM-216, [CONTENT-LAZY]): 568 КБ записей озвучки и две карты по ним раньше строились при ИМПОРТЕ модуля,
// а импортируют его экраны, которые expo-router поднимает при старте (sync-режим). Теперь — при первом обращении
// к озвучке занятия; данные и результат те же, потребители не менялись.
const factoryAudioTables = lazyContent("learning_v2_factory_production_audio", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FACTORY_PRODUCTION_AUDIO_ENTRIES_V1 } = require("./learning_v2_factory_production_audio_entries_v1.generated") as FactoryProductionAudioEntriesModuleV1;
  return {
    entryByCoordinate: new Map<string, FactoryProductionAudioEntryV1>(
      FACTORY_PRODUCTION_AUDIO_ENTRIES_V1.map((entry) => [`${entry.transcript}\u0000${entry.voiceId}`, entry] as const),
    ),
    entryByContentHash: new Map<string, FactoryProductionAudioEntryV1>(
      FACTORY_PRODUCTION_AUDIO_ENTRIES_V1.map((entry) => [entry.contentHash, entry] as const),
    ),
  };
});

function fileInput(
  _courseSessionId: string,
  transcript: string,
  voiceId: LearningV2CourseSessionAudioVoiceIdV1,
): LearningV2CourseSessionAudioFileInputV1 {
  const entry = factoryAudioTables().entryByCoordinate.get(`${transcript}\u0000${voiceId}`);
  if (!entry) {
    // зачем (инцидент 04.10): какой именно текст/голос не нашёлся в таблице озвучки — без этого отказ сессии не диагностируется.
    console.warn(`[V2-BUNDLED] audio_entry_missing voice=${voiceId} transcript=${JSON.stringify(transcript.slice(0, 120))}`);
    throw new Error("learning_v2_factory_production_audio_missing");
  }
  return Object.freeze({
    voiceId,
    objectPath: [
      "learning-v2/voice-audio",
      FACTORY_AUDIO_PACK_COORDINATE_V1,
      hashCanonicalBody({ transcript }),
      hashCanonicalBody({ voiceId }),
      `${entry.contentHash}.mp3`,
    ].join("/"),
    contentHash: entry.contentHash,
    objectGeneration: "1",
    byteSize: entry.byteSize,
    contentType: "audio/mpeg" as const,
  });
}

export function learningV2FactoryRemoteAudioFilesForContentHashesV1(
  contentHashes: readonly string[],
): readonly LearningV2CourseSessionAudioFileV1[] {
  return Object.freeze(contentHashes.map((contentHash) => {
    const entry = factoryAudioTables().entryByContentHash.get(contentHash);
    if (!entry) throw new Error("learning_v2_factory_production_audio_missing");
    const input = fileInput("factory-pack", entry.transcript, entry.voiceId);
    return Object.freeze({
      ...input,
      fileFingerprint: hashCanonicalBody(input),
    });
  }));
}

type FactoryVoicePlanV1 = Readonly<{
  voices: readonly LearningV2CourseSessionAudioVoiceIdV1[];
  source: "all_four_voices" | "assigned_recorded_voice";
}>;

/**
 * Каким голосом (голосами) звучит задание по его репликам.
 *
 * зачем (владелец 15.10, EN-сессия, «один голос на задание»): Codex озвучивает каждое задание ОДНИМ случайным голосом
 * и не делает четыре версии. Есть все 4 голоса у всех реплик → как раньше (голос крутится по заданиям). Иначе
 * назначенный голос = тот, что записан у ВСЕХ реплик задания (первый в порядке ash/onyx/nova/coral, если таких
 * несколько). Запасного голоса нет: общей записи нет → null, задание считается неозвученным.
 */
function factoryVoicePlanV1(transcripts: readonly string[]): FactoryVoicePlanV1 | null {
  const has = (transcript: string, voiceId: LearningV2CourseSessionAudioVoiceIdV1) =>
    factoryAudioTables().entryByCoordinate.has(`${transcript}\u0000${voiceId}`);
  if (transcripts.every((transcript) => VOICES.every((voiceId) => has(transcript, voiceId))))
    return Object.freeze({ voices: VOICES, source: "all_four_voices" as const });
  const assigned = VOICES.find((voiceId) => transcripts.every((transcript) => has(transcript, voiceId)));
  return assigned
    ? Object.freeze({ voices: Object.freeze([assigned]), source: "assigned_recorded_voice" as const })
    : null;
}

function voiceFiles(courseSessionId: string, transcript: string, plan: FactoryVoicePlanV1) {
  return Object.freeze(plan.voices.map((voiceId) => fileInput(courseSessionId, transcript, voiceId)));
}

function requireFactoryVoicePlanV1(transcripts: readonly string[]): FactoryVoicePlanV1 {
  const plan = factoryVoicePlanV1(transcripts);
  if (!plan) {
    // Немой отказ запрещён: какие реплики не имеют общей записи.
    console.warn(`[V2-AUDIO-VOICE] no_common_recorded_voice transcripts=${JSON.stringify(transcripts.map((t) => t.slice(0, 80)))}`);
    throw new Error("learning_v2_factory_production_audio_missing");
  }
  return plan;
}

export function learningV2FactoryRemoteAudioFileForTranscriptVoiceV1(
  transcript: string,
  voiceId: LearningV2CourseSessionAudioVoiceIdV1,
): LearningV2CourseSessionAudioFileV1 | null {
  const normalized = transcript.normalize("NFKC").trim();
  if (!normalized || !VOICES.includes(voiceId)) return null;
  try {
    const input = fileInput("factory-pack", normalized, voiceId);
    return Object.freeze({ ...input, fileFingerprint: hashCanonicalBody(input) });
  } catch (error) {
    if (error instanceof Error && error.message === "learning_v2_factory_production_audio_missing") return null;
    throw error;
  }
}

export function learningV2FactoryMissingAudioInteractionIdsV1(
  learner: LearningV2CourseSessionLearnerChildV1,
): readonly string[] {
  const missing: string[] = [];
  for (const interaction of learner.interactions) {
    if (interaction.audioTargetIds.length === 0) continue;
    const payload = interaction.modePayload;
    const references = payload?.family === "sound_contrast"
      ? [payload.audioA, payload.audioB].filter(
          (candidate): candidate is NonNullable<typeof candidate> => candidate !== null,
        )
      : payload && "referenceAudio" in payload && payload.referenceAudio
        ? [payload.referenceAudio]
        : [];
    if (
      (payload?.family === "sound_contrast" && references.length !== 2) ||
      (payload?.family !== "sound_contrast" && references.length !== 1)
    ) {
      throw new Error("learning_v2_factory_reference_audio_missing");
    }
    // Озвучено = у всех реплик задания есть общая запись (4 голоса или один назначенный).
    const complete = factoryVoicePlanV1(references.map((reference) => reference.transcript)) !== null;
    if (!complete) missing.push(interaction.interactionId);
  }
  return Object.freeze(missing);
}

export function buildLearningV2FactoryBundledAudioChildV1(
  learner: LearningV2CourseSessionLearnerChildV1,
): ReturnType<typeof materializeLearningV2CourseSessionAudioChildV1> | null {
  const audioInteractions = learner.interactions.filter((interaction) => interaction.audioTargetIds.length > 0);
  try {
    return materializeLearningV2CourseSessionAudioChildV1({
      learner,
      interactions: audioInteractions.map((interaction) => {
      const payload = interaction.modePayload;
      if (payload?.family === "sound_contrast") {
        const references = [payload.audioA, payload.audioB].filter(
          (candidate): candidate is NonNullable<typeof candidate> => candidate !== null,
        );
        if (references.length !== 2) throw new Error("learning_v2_factory_sound_contrast_audio_missing");
        // Обе реплики сравнения звучат одним голосом задания.
        const plan = requireFactoryVoicePlanV1(references.map((reference) => reference.transcript));
        const selectables = references.map((reference, index) => {
          const option = interaction.responseOptions.find(
            (candidate) => candidate.text === reference.transcript,
          ) ?? interaction.responseOptions[index];
          if (!option) throw new Error("learning_v2_factory_sound_contrast_audio_missing");
          return Object.freeze({
            selectableId: option.responseId,
            audioTargetId: reference.audioTargetId,
            wordId: hashCanonicalBody({
              schemaVersion: "learning-v2-factory-sound-word.v1",
              courseSessionId: learner.courseSessionId,
              interactionId: interaction.interactionId,
              audioTargetId: reference.audioTargetId,
              ordinal: index + 1,
            }),
            wordOrdinal: index + 1,
            visibleText: option.text,
            files: voiceFiles(learner.courseSessionId, reference.transcript, plan),
          });
        });
        return Object.freeze({
          interactionId: interaction.interactionId,
          taskVoiceGroupFingerprint: hashCanonicalBody({
            schemaVersion: "learning-v2-factory-task-voice-group.v1",
            courseSessionId: learner.courseSessionId,
            interactionId: interaction.interactionId,
            transcripts: references.map((reference) => reference.transcript),
          }),
          fullPhraseFiles: null,
          selectables: Object.freeze(selectables),
        });
      }
      const reference = payload && "referenceAudio" in payload ? payload.referenceAudio : null;
      if (!reference) throw new Error("learning_v2_factory_reference_audio_missing");
      const transcript = reference.transcript;
      return Object.freeze({
        interactionId: interaction.interactionId,
        taskVoiceGroupFingerprint: hashCanonicalBody({
          schemaVersion: "learning-v2-factory-task-voice-group.v1",
          courseSessionId: learner.courseSessionId,
          interactionId: interaction.interactionId,
          transcript,
        }),
        fullPhraseFiles: voiceFiles(learner.courseSessionId, transcript, requireFactoryVoicePlanV1([transcript])),
        selectables: Object.freeze([]),
      });
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "learning_v2_factory_production_audio_missing") {
      // зачем (инцидент 04.10): отказ из-за отсутствия записи в таблице озвучки был немым — теперь [V2-BUNDLED] пишет, что именно не нашли.
      console.warn(`[V2-BUNDLED] audio_child_null reason=${error.message} audioInteractions=${audioInteractions.length}`);
      return null;
    }
    throw error;
  }
}
