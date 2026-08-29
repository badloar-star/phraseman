import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  materializeLearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioFileInputV1,
  type LearningV2CourseSessionAudioVoiceIdV1,
} from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import type { LearningV2CourseSessionLearnerChildV1 } from "../modules/learning-v2/runtime/course_session_client_children_v1";

// зачем этот файл (владелец, 2026-08-27): испанская сессия 1 переписана под
// mode-native (es_episode_01_session_01_mode_native_v1.ts) и теперь несёт
// listen_choose/listen_build_dictation/scripted_repeat_compare interactions
// с реальными audioTargetIds. Схема course_session_audio_child_v1.ts жёстко
// требует настоящий mp3-файл на каждый audio-зависимый interaction — пустой
// плейсхолдер архитектурно запрещён (exactInteraction бросает fail() при
// fullPhraseFiles === null && selectables.length === 0). Копирует форму
// learning_v2_session1_production_audio_v1.ts (английский эталон) байт в
// байт, только с испанскими транскриптами и своими хэшами.
type ProductionAudioEntry = Readonly<{
  transcript: string;
  voiceId: LearningV2CourseSessionAudioVoiceIdV1;
  contentHash: string;
  byteSize: number;
  assetModule: number;
}>;

// Сгенерировано scripts/generate_es_session01_production_audio.mjs через
// OpenAI TTS (gpt-4o-mini-tts, не tts-1-hd), 4 голоса (ash/onyx/nova/coral),
// 6 испанских транскриптов (4 слова сессии 1 + 2 её ключевые фразы).
// зачем перегенерировано 2026-08-27 (владелец: «звучит совсем не то, что
// написано», «быстрым темпом»): первая генерация (tts-1-hd) не давала модели
// НИКАКОГО сигнала языка — короткие слова без диакритики (es/soy/verdad)
// звучали как английские/неоднозначные, и темп шёл по умолчанию (1.0, без
// явного замедления). Вторая генерация — та же модель эндпоинта, но
// gpt-4o-mini-tts с явными instructions (испанский акцент + подчёркнуто
// медленный темп), сам текст (input) не менялся ни на символ. Хэши и размеры
// у КАЖДОГО файла поменялись — старые значения принадлежат удалённой
// генерации, использовать нельзя.
const ENTRIES = Object.freeze<readonly ProductionAudioEntry[]>([
  { transcript: "es", voiceId: "ash", contentHash: "a3a465ea9b6cd423a52795842c62d7d7ba680935acb19183b4fb108e1e653f5c", byteSize: 22656, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/es-ash.mp3") },
  { transcript: "es", voiceId: "onyx", contentHash: "6a1759c5cdef5bacae82f79a2bcb4a415040c2a69b0b4eab3bc723bf0710f66c", byteSize: 33024, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/es-onyx.mp3") },
  { transcript: "es", voiceId: "nova", contentHash: "7680194b503017702636ea51b023cdd3d57a3177f953212376df8ac6e77ea904", byteSize: 24192, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/es-nova.mp3") },
  { transcript: "es", voiceId: "coral", contentHash: "3b4f39bb9a735f6794efeae8316912d95457de9be6697dfd8030299643f67941", byteSize: 21888, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/es-coral.mp3") },
  { transcript: "soy", voiceId: "ash", contentHash: "02420296275011a81169d3930ad6d22808460bcf4a101b9348c145195854ef47", byteSize: 21888, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/soy-ash.mp3") },
  { transcript: "soy", voiceId: "onyx", contentHash: "27e3552cd70f7b3c29e7d1a648831db4dbd2bf3c41a65e47fc1f5cf1ac14f0cb", byteSize: 21120, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/soy-onyx.mp3") },
  { transcript: "soy", voiceId: "nova", contentHash: "9b17ff7879febe128843611aebf740a554cc23b4a9b6acbe57c2ba1ef4e3b773", byteSize: 19968, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/soy-nova.mp3") },
  { transcript: "soy", voiceId: "coral", contentHash: "439d56404fe35e5702fddb098b5cd5efa0421b871759d96232440207a4655767", byteSize: 35328, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/soy-coral.mp3") },
  { transcript: "fácil", voiceId: "ash", contentHash: "f2bfdd85db481aca3f5fd007028af91e14d40aa040145ae0fefe3a2214c7036a", byteSize: 26496, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/facil-ash.mp3") },
  { transcript: "fácil", voiceId: "onyx", contentHash: "cb5d10102b67421843f520f004d08b4cff2591ee55c8a122c9735d7eaf287029", byteSize: 41856, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/facil-onyx.mp3") },
  { transcript: "fácil", voiceId: "nova", contentHash: "bb176a01b190ab9c73487ab6386a1cdd12dfdd0e29254ac453a59d6f452009a7", byteSize: 24960, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/facil-nova.mp3") },
  { transcript: "fácil", voiceId: "coral", contentHash: "5027def8bb3eb85245a332cebd93d74ea7b4ff96fba1072a045d974d4c349530", byteSize: 34560, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/facil-coral.mp3") },
  { transcript: "verdad", voiceId: "ash", contentHash: "e6c6d92c1422330b2f7cd748b8e17b4a6e4686f7861a622b6a3aea8b76133957", byteSize: 19968, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/verdad-ash.mp3") },
  { transcript: "verdad", voiceId: "onyx", contentHash: "46c5b1fa876e22e581630cedb036bd33870e56e33cb5550f1650c3259c9542d9", byteSize: 26496, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/verdad-onyx.mp3") },
  { transcript: "verdad", voiceId: "nova", contentHash: "d6f1689ef240fe847fb30f9b30ffc69287c313c6012540a3505816ce6c555bd4", byteSize: 17664, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/verdad-nova.mp3") },
  { transcript: "verdad", voiceId: "coral", contentHash: "364b2bd605eab15239908a7319d668a2b2d2a0bf3d466198bb1c12fc90de6194", byteSize: 23424, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/verdad-coral.mp3") },
  { transcript: "Es fácil", voiceId: "ash", contentHash: "a5b23a8a8f155c67b57e7feba78adee35c6117033c19c4a25306f242e9042960", byteSize: 41088, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/es-facil-ash.mp3") },
  { transcript: "Es fácil", voiceId: "onyx", contentHash: "d279de574f99b2018c509afaf3f99885de59e3d1116b98d67e16df3f57209402", byteSize: 52224, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/es-facil-onyx.mp3") },
  { transcript: "Es fácil", voiceId: "nova", contentHash: "86bdee97b712849748c8a8df44e2036dd46df969cd5cce387025d3e3de88d896", byteSize: 32256, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/es-facil-nova.mp3") },
  { transcript: "Es fácil", voiceId: "coral", contentHash: "0d91c1adc123af75d5314b2e41b0c5edea1297d70d7c8233ca94c80c42031d1f", byteSize: 51456, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/es-facil-coral.mp3") },
  { transcript: "Es verdad", voiceId: "ash", contentHash: "2a6f8098a025ad88a6c2264a2a46d40dbbaa4eef7c4a88064ddf8bcdb057ac4e", byteSize: 39168, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/es-verdad-ash.mp3") },
  { transcript: "Es verdad", voiceId: "onyx", contentHash: "91bc66802a4a60895ad0f1f57965effb4abbaf50a4aef3caab55dd70b1b92754", byteSize: 28800, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/es-verdad-onyx.mp3") },
  { transcript: "Es verdad", voiceId: "nova", contentHash: "32bd4f425db655222fe19d1452848b4dcaf61585dfea94544e46b6eaad775a1e", byteSize: 21888, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/es-verdad-nova.mp3") },
  { transcript: "Es verdad", voiceId: "coral", contentHash: "9747cb0387742f8d92b83cf7d944c528a4eb5a8a06497f26bb02598d77dfa81c", byteSize: 48768, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/es-verdad-coral.mp3") },
]);

const SESSION_COORDINATE = hashCanonicalBody({
  schemaVersion: "learning-v2-es-session1-production-audio-coordinate.v1",
  lessonOrdinal: 1,
  sessionOrdinal: 1,
});
const entryByCoordinate = new Map(
  ENTRIES.map((entry) => [`${entry.transcript}\u0000${entry.voiceId}`, entry]),
);
const moduleByContentHash = new Map(
  ENTRIES.map((entry) => [entry.contentHash, entry.assetModule]),
);

function productionEntry(
  transcript: string,
  voiceId: LearningV2CourseSessionAudioVoiceIdV1,
): ProductionAudioEntry {
  const entry = entryByCoordinate.get(`${transcript}\u0000${voiceId}`);
  if (!entry) throw new Error("learning_v2_es_session1_production_audio_missing");
  return entry;
}

function fileInput(
  transcript: string,
  voiceId: LearningV2CourseSessionAudioVoiceIdV1,
): LearningV2CourseSessionAudioFileInputV1 {
  const entry = productionEntry(transcript, voiceId);
  return Object.freeze({
    voiceId,
    objectPath: [
      "learning-v2/voice-audio",
      SESSION_COORDINATE,
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

function transcriptForInteraction(
  interaction: LearningV2CourseSessionLearnerChildV1["interactions"][number],
): string {
  const payload = interaction.modePayload;
  if (
    payload?.family !== "listen_choose" &&
    payload?.family !== "listen_build_dictation" &&
    payload?.family !== "scripted_repeat_compare"
  ) {
    throw new Error("learning_v2_es_session1_audio_payload_missing");
  }
  return payload.referenceAudio.transcript;
}

export function buildLearningV2EsSession1BundledAudioChildV1(
  learner: LearningV2CourseSessionLearnerChildV1,
): LearningV2CourseSessionAudioChildV1 {
  const audioInteractions = learner.interactions.filter(
    (interaction) => interaction.audioTargetIds.length > 0,
  );
  return materializeLearningV2CourseSessionAudioChildV1({
    learner,
    interactions: audioInteractions.map((interaction) => {
      const transcript = transcriptForInteraction(interaction);
      return Object.freeze({
        interactionId: interaction.interactionId,
        taskVoiceGroupFingerprint: hashCanonicalBody({
          schemaVersion: "learning-v2-es-session1-task-voice-group.v1",
          courseSessionId: learner.courseSessionId,
          interactionId: interaction.interactionId,
          transcript,
        }),
        fullPhraseFiles: Object.freeze([
          fileInput(transcript, "ash"),
          fileInput(transcript, "onyx"),
          fileInput(transcript, "nova"),
          fileInput(transcript, "coral"),
        ]),
        selectables: Object.freeze([]),
      });
    }),
  });
}

export function learningV2EsSession1BundledAudioModuleForObjectPathV1(
  objectPath: string,
): number | null {
  const match = objectPath.match(/\/([a-f0-9]{64})\.mp3$/u);
  if (!match) return null;
  return moduleByContentHash.get(match[1]!) ?? null;
}

export const LEARNING_V2_ES_SESSION1_PRODUCTION_AUDIO_ENTRY_COUNT_V1 =
  ENTRIES.length;
