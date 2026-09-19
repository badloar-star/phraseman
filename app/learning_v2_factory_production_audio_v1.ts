import { FACTORY_PRODUCTION_AUDIO_ENTRIES_V1 } from "./learning_v2_factory_production_audio_entries_v1.generated";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  materializeLearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioFileInputV1,
  type LearningV2CourseSessionAudioVoiceIdV1,
} from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import type { LearningV2CourseSessionLearnerChildV1 } from "../modules/learning-v2/runtime/course_session_client_children_v1";

const VOICES = Object.freeze(["ash", "onyx", "nova", "coral"] as const);
const entryByCoordinate = new Map(
  FACTORY_PRODUCTION_AUDIO_ENTRIES_V1.map((entry) => [`${entry.transcript}\u0000${entry.voiceId}`, entry]),
);
const moduleByContentHash = new Map<string, number>(
  FACTORY_PRODUCTION_AUDIO_ENTRIES_V1.map((entry) => [entry.contentHash, entry.assetModule]),
);

function fileInput(
  courseSessionId: string,
  transcript: string,
  voiceId: LearningV2CourseSessionAudioVoiceIdV1,
): LearningV2CourseSessionAudioFileInputV1 {
  const entry = entryByCoordinate.get(`${transcript}\u0000${voiceId}`);
  if (!entry) throw new Error("learning_v2_factory_production_audio_missing");
  return Object.freeze({
    voiceId,
    objectPath: [
      "learning-v2/voice-audio",
      hashCanonicalBody({ courseSessionId }),
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

function fourFiles(courseSessionId: string, transcript: string) {
  return Object.freeze(VOICES.map((voiceId) => fileInput(courseSessionId, transcript, voiceId)));
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
        const selectables = interaction.responseOptions.map((option, index) => {
          const reference = references.find((candidate) => candidate.transcript === option.text) ?? references[index];
          if (!reference) throw new Error("learning_v2_factory_sound_contrast_audio_missing");
          return Object.freeze({
            selectableId: option.responseId,
            audioTargetId: reference.audioTargetId,
            wordId: `${interaction.interactionId}:sound:${index + 1}`,
            wordOrdinal: index + 1,
            visibleText: option.text,
            files: fourFiles(learner.courseSessionId, reference.transcript),
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
        fullPhraseFiles: fourFiles(learner.courseSessionId, transcript),
        selectables: Object.freeze([]),
      });
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "learning_v2_factory_production_audio_missing") return null;
    throw error;
  }
}

export function learningV2FactoryBundledAudioModuleForObjectPathV1(objectPath: string): number | null {
  const match = objectPath.match(/\/([a-f0-9]{64})\.mp3$/u);
  return match ? (moduleByContentHash.get(match[1]!) ?? null) : null;
}
