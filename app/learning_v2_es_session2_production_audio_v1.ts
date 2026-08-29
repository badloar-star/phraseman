import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  materializeLearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioFileInputV1,
  type LearningV2CourseSessionAudioVoiceIdV1,
} from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import type { LearningV2CourseSessionLearnerChildV1 } from "../modules/learning-v2/runtime/course_session_client_children_v1";

// зачем этот файл (владелец, 2026-08-27): испанская сессия 2 переписана под
// mode-native (es_episode_01_session_02_mode_native_v1.ts) и теперь несёт
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

// Сгенерировано scripts/generate_es_session02_production_audio.mjs через
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
  { transcript: "no", voiceId: "ash", contentHash: "4b1b77e9fe3cb658e71f7a381b69e4321b9789132ce913f355990ea5bb515ad5", byteSize: 16128, assetModule: require("../assets/audio/learning-v2/es-session2-production-v1/no-ash.mp3") },
  { transcript: "no", voiceId: "onyx", contentHash: "23cb4ad47deba4590d3a99ed703c9936839f348faeb10d46ba90c15b9a58e956", byteSize: 16128, assetModule: require("../assets/audio/learning-v2/es-session2-production-v1/no-onyx.mp3") },
  { transcript: "no", voiceId: "nova", contentHash: "6faf8b47f57bb7a2a35b282aac5614612c964c287e07f103f55bfb64064113ab", byteSize: 21888, assetModule: require("../assets/audio/learning-v2/es-session2-production-v1/no-nova.mp3") },
  { transcript: "no", voiceId: "coral", contentHash: "643c793dc7fba32c51f537eb007068f8cdeae7ea130fcf222d651ddacedbceb9", byteSize: 29568, assetModule: require("../assets/audio/learning-v2/es-session2-production-v1/no-coral.mp3") },
  { transcript: "No es fácil", voiceId: "ash", contentHash: "6f0328e5901103e10979ae4d14026ba5373372c97c951c78881ccaa3644d8ca3", byteSize: 38400, assetModule: require("../assets/audio/learning-v2/es-session2-production-v1/no-es-facil-ash.mp3") },
  { transcript: "No es fácil", voiceId: "onyx", contentHash: "cde0ca2f9aef2ced622e8e78bcae0e144d5100887b0b7dc69e46b23218020ebd", byteSize: 52992, assetModule: require("../assets/audio/learning-v2/es-session2-production-v1/no-es-facil-onyx.mp3") },
  { transcript: "No es fácil", voiceId: "nova", contentHash: "783061c35e0158761923349ee8edc3b76d9fad6fb00049361d160e586dd1792b", byteSize: 42624, assetModule: require("../assets/audio/learning-v2/es-session2-production-v1/no-es-facil-nova.mp3") },
  { transcript: "No es fácil", voiceId: "coral", contentHash: "6e2806466848a60ba1b0e932795bfd78b47fa3dea1149d2bbcffe7b3ade37feb", byteSize: 52992, assetModule: require("../assets/audio/learning-v2/es-session2-production-v1/no-es-facil-coral.mp3") },
  { transcript: "No es verdad", voiceId: "ash", contentHash: "51b7df282a76cf5094c0bc383a823358675afd32ae9e5c8e927d9eeca2078361", byteSize: 40320, assetModule: require("../assets/audio/learning-v2/es-session2-production-v1/no-es-verdad-ash.mp3") },
  { transcript: "No es verdad", voiceId: "onyx", contentHash: "8e845f77071be952d28a97dae6467c9cb30151c1a8ee367a6db5706b59275251", byteSize: 40320, assetModule: require("../assets/audio/learning-v2/es-session2-production-v1/no-es-verdad-onyx.mp3") },
  { transcript: "No es verdad", voiceId: "nova", contentHash: "8e30081b4a9ab3ebca30a5023c482965666fab4ebd776fa5a2d5aac90338af61", byteSize: 42624, assetModule: require("../assets/audio/learning-v2/es-session2-production-v1/no-es-verdad-nova.mp3") },
  { transcript: "No es verdad", voiceId: "coral", contentHash: "8c70914f7c51bb8730069fa29097e0adbd2f69d49f029d2bdf4b0849547328ec", byteSize: 39168, assetModule: require("../assets/audio/learning-v2/es-session2-production-v1/no-es-verdad-coral.mp3") },
]);

const SESSION_COORDINATE = hashCanonicalBody({
  schemaVersion: "learning-v2-es-session2-production-audio-coordinate.v1",
  lessonOrdinal: 1,
  sessionOrdinal: 2,
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
  if (!entry) throw new Error("learning_v2_es_session2_production_audio_missing");
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
    throw new Error("learning_v2_es_session2_audio_payload_missing");
  }
  return payload.referenceAudio.transcript;
}

export function buildLearningV2EsSession2BundledAudioChildV1(
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
          schemaVersion: "learning-v2-es-session2-task-voice-group.v1",
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

export function learningV2EsSession2BundledAudioModuleForObjectPathV1(
  objectPath: string,
): number | null {
  const match = objectPath.match(/\/([a-f0-9]{64})\.mp3$/u);
  if (!match) return null;
  return moduleByContentHash.get(match[1]!) ?? null;
}

export const LEARNING_V2_ES_SESSION2_PRODUCTION_AUDIO_ENTRY_COUNT_V1 =
  ENTRIES.length;
