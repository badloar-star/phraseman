import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  materializeLearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioFileInputV1,
  type LearningV2CourseSessionAudioVoiceIdV1,
} from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import type { LearningV2CourseSessionLearnerChildV1 } from "../modules/learning-v2/runtime/course_session_client_children_v1";

type ProductionAudioEntry = Readonly<{
  transcript: string;
  voiceId: LearningV2CourseSessionAudioVoiceIdV1;
  contentHash: string;
  byteSize: number;
  assetModule: number;
}>;

const ENTRIES = Object.freeze<readonly ProductionAudioEntry[]>([
  { transcript: "I", voiceId: "ash", contentHash: "cec999d80fb5cf97f53173f53af738c2465038b9ff7426cdd822348d9f770f58", byteSize: 15360, assetModule: require("../assets/audio/learning-v2/session1-production-v1/i-ash.mp3") },
  { transcript: "I", voiceId: "onyx", contentHash: "4a287409737f24f6da1cbb44ad4cc162203315fe22796073839da67e7809a34a", byteSize: 24192, assetModule: require("../assets/audio/learning-v2/session1-production-v1/i-onyx.mp3") },
  { transcript: "I", voiceId: "nova", contentHash: "3fdf1508efdf90cacd3459f3ee12f9945e17bd2c3896f6fca3d40d0fbcef815f", byteSize: 10368, assetModule: require("../assets/audio/learning-v2/session1-production-v1/i-nova.mp3") },
  { transcript: "I", voiceId: "coral", contentHash: "028a9dbf2eac46b5e588ec8cbba5502ca1273de9404473c7e9fa3539e3a5d719", byteSize: 19968, assetModule: require("../assets/audio/learning-v2/session1-production-v1/i-coral.mp3") },
  { transcript: "am", voiceId: "ash", contentHash: "5b2767f64228969007cb7ae08a2e8717ca7d1a2bbf2a98c5bbbb43a8db4b0b07", byteSize: 28800, assetModule: require("../assets/audio/learning-v2/session1-production-v1/am-ash.mp3") },
  { transcript: "am", voiceId: "onyx", contentHash: "e66ef86cf52943c0305ff6e1d46753477ddd1e6eec20c0aecfd5ed1587c82007", byteSize: 21888, assetModule: require("../assets/audio/learning-v2/session1-production-v1/am-onyx.mp3") },
  { transcript: "am", voiceId: "nova", contentHash: "e340822377f96a95a27d7571f30a417a147da387d112f7d5f351ce4c7d77dd58", byteSize: 33792, assetModule: require("../assets/audio/learning-v2/session1-production-v1/am-nova.mp3") },
  { transcript: "am", voiceId: "coral", contentHash: "0259a36415626f0dccb662d60cd7df2dfffe667c26ecde9d2ec6fc1e88b005e7", byteSize: 25728, assetModule: require("../assets/audio/learning-v2/session1-production-v1/am-coral.mp3") },
  { transcript: "here", voiceId: "ash", contentHash: "758f2d086d9a7db4841b6b6d4c4ffd5f013d6b1a3abdd8c8a132444c42cf76ca", byteSize: 42624, assetModule: require("../assets/audio/learning-v2/session1-production-v1/here-ash.mp3") },
  { transcript: "here", voiceId: "onyx", contentHash: "466763eb8efaae21630ce58e33301e771417bd0ac7ff21702afc6321efa8942f", byteSize: 21888, assetModule: require("../assets/audio/learning-v2/session1-production-v1/here-onyx.mp3") },
  { transcript: "here", voiceId: "nova", contentHash: "b14fc6fc4012cc40fe11944f0d5bb0dd0523d45f02a8ceed6b0a8c3f11c0c7c7", byteSize: 22656, assetModule: require("../assets/audio/learning-v2/session1-production-v1/here-nova.mp3") },
  { transcript: "here", voiceId: "coral", contentHash: "d7087b0ae44e857f171d106905789b522ac0e902d7246f854fc344960d42c5d0", byteSize: 19968, assetModule: require("../assets/audio/learning-v2/session1-production-v1/here-coral.mp3") },
  { transcript: "ready", voiceId: "ash", contentHash: "bbc1b53e8c8439861c836005caf56a167c0b685ff7cd7a814b82c1391ff284ce", byteSize: 30720, assetModule: require("../assets/audio/learning-v2/session1-production-v1/ready-ash.mp3") },
  { transcript: "ready", voiceId: "onyx", contentHash: "eebf91c8d42215704eb4e79a01c27c6871a60b2a503a1cc2c39834290bf71230", byteSize: 19968, assetModule: require("../assets/audio/learning-v2/session1-production-v1/ready-onyx.mp3") },
  { transcript: "ready", voiceId: "nova", contentHash: "aa90c41484f00c63b538a5b9c2ac498ec64d31ce4e641c8b39703cebb4aa9742", byteSize: 12288, assetModule: require("../assets/audio/learning-v2/session1-production-v1/ready-nova.mp3") },
  { transcript: "ready", voiceId: "coral", contentHash: "0b97657c3721fa999647c96257c58859cfabdfa4e8bfcccee16c09086f518b8d", byteSize: 17664, assetModule: require("../assets/audio/learning-v2/session1-production-v1/ready-coral.mp3") },
  { transcript: "I am here", voiceId: "ash", contentHash: "880e4fe1d62d88f393096db89f638776825cf20761ddd38e16451a56842523d2", byteSize: 36864, assetModule: require("../assets/audio/learning-v2/session1-production-v1/i-am-here-ash.mp3") },
  { transcript: "I am here", voiceId: "onyx", contentHash: "a062b59a0c898e948745ea0ba2ffb3ca4f8abe62a20a75aa3810ad1666fb318b", byteSize: 28032, assetModule: require("../assets/audio/learning-v2/session1-production-v1/i-am-here-onyx.mp3") },
  { transcript: "I am here", voiceId: "nova", contentHash: "dff7f130ed1749ddfa66297b40494aa30264e052cae3d1e615d3684d162e66db", byteSize: 22656, assetModule: require("../assets/audio/learning-v2/session1-production-v1/i-am-here-nova.mp3") },
  { transcript: "I am here", voiceId: "coral", contentHash: "2c90036663b7d9efc1734cf1d58c94d3929ae0c90f12b1994b7a3b223dd74479", byteSize: 30720, assetModule: require("../assets/audio/learning-v2/session1-production-v1/i-am-here-coral.mp3") },
  { transcript: "I am ready", voiceId: "ash", contentHash: "899fe72ed967ea7169fc2b9103e4b7f3a3195a0dd1616fd2292ca1f025ad97c4", byteSize: 49920, assetModule: require("../assets/audio/learning-v2/session1-production-v1/i-am-ready-ash.mp3") },
  { transcript: "I am ready", voiceId: "onyx", contentHash: "09e9bfee7a3019118144c07607f323b9f45b4dec236785c324c69e8165d36c5d", byteSize: 17664, assetModule: require("../assets/audio/learning-v2/session1-production-v1/i-am-ready-onyx.mp3") },
  { transcript: "I am ready", voiceId: "nova", contentHash: "00cc59aca36b973a623d25c702c0ef3056617f6f41e67ccbe1d3b00a169ad58e", byteSize: 23424, assetModule: require("../assets/audio/learning-v2/session1-production-v1/i-am-ready-nova.mp3") },
  { transcript: "I am ready", voiceId: "coral", contentHash: "d913a6ddc7fdfccbe14b190450690e576603774a8bda6743349eca9dec303cb1", byteSize: 26496, assetModule: require("../assets/audio/learning-v2/session1-production-v1/i-am-ready-coral.mp3") },
]);

const SESSION_COORDINATE = hashCanonicalBody({
  schemaVersion: "learning-v2-session1-production-audio-coordinate.v1",
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
  if (!entry) throw new Error("learning_v2_session1_production_audio_missing");
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
    throw new Error("learning_v2_session1_audio_payload_missing");
  }
  return payload.referenceAudio.transcript;
}

export function buildLearningV2Session1BundledAudioChildV1(
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
          schemaVersion: "learning-v2-session1-task-voice-group.v1",
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

export function learningV2Session1BundledAudioModuleForObjectPathV1(
  objectPath: string,
): number | null {
  const match = objectPath.match(/\/([a-f0-9]{64})\.mp3$/u);
  if (!match) return null;
  return moduleByContentHash.get(match[1]!) ?? null;
}

export const LEARNING_V2_SESSION1_PRODUCTION_AUDIO_ENTRY_COUNT_V1 =
  ENTRIES.length;
