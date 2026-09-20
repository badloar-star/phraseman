import { Directory, File, Paths } from "expo-file-system";

import type { LearningV2CourseSessionAudioFileV1 } from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import { LEARNING_V2_VOICE_AUDIO_CACHE_DIRECTORY_V1 } from "../modules/learning-v2/runtime/voice_audio_offline_cache_v1";

const LEARNING_V2_LEGACY_LESSON1_REMOTE_AUDIO = Object.freeze({
  "legacy-lesson1_phrase_1": Object.freeze({ voiceId: "ash", objectPath: "learning-v2/voice-audio/72a9cc37126ee713f066dd12511e35e65e3738dc5dfb641588f3631bfa089d35/119b4edd38cf2755de55ff283fd45b3d9cb6bc7a8c219ce8aefd44c80a6a8ade/26ce52efe54cd25e0fced23603f47f7d6fb2949faeeab76ae97775cba1051d22/ec377ca04f86ac520a375f4253eba796a5003eb7851d656a60e1f0a31ce83931.mp3", contentHash: "ec377ca04f86ac520a375f4253eba796a5003eb7851d656a60e1f0a31ce83931", objectGeneration: "1", byteSize: 9056, contentType: "audio/mpeg", fileFingerprint: "721651c99dfd7c855e9d6864e14438db33c61e73d15e33d9100d680fd7f0a3d9" }),
  "legacy-lesson1_phrase_10": Object.freeze({ voiceId: "ash", objectPath: "learning-v2/voice-audio/72a9cc37126ee713f066dd12511e35e65e3738dc5dfb641588f3631bfa089d35/6a1e7117c661515d98fbf610decb9e448fefe5907f4431910047061a615b2eb6/26ce52efe54cd25e0fced23603f47f7d6fb2949faeeab76ae97775cba1051d22/0747bc515e4d4eeb7a7d9a51ba3ec0a86e0fbf6a5d9a775c664b2af089997e31.mp3", contentHash: "0747bc515e4d4eeb7a7d9a51ba3ec0a86e0fbf6a5d9a775c664b2af089997e31", objectGeneration: "1", byteSize: 11250, contentType: "audio/mpeg", fileFingerprint: "de8c324a498cc0b8eeba8415091a5eda7c1e9a18cba6ce366a04a489b912240e" }),
  "legacy-lesson1_phrase_11": Object.freeze({ voiceId: "ash", objectPath: "learning-v2/voice-audio/72a9cc37126ee713f066dd12511e35e65e3738dc5dfb641588f3631bfa089d35/776b3588a441d3b81d60bd3ca8127f9825e4bf5f100a544014ad39a837eff608/26ce52efe54cd25e0fced23603f47f7d6fb2949faeeab76ae97775cba1051d22/a716ca57dac8626275a1444c4d8c267b74ae12f8e5596a97668ff12dde701504.mp3", contentHash: "a716ca57dac8626275a1444c4d8c267b74ae12f8e5596a97668ff12dde701504", objectGeneration: "1", byteSize: 9056, contentType: "audio/mpeg", fileFingerprint: "cf6551664f8ecd7fbaf5daefa2f50762d25ed57348a7986f8dd6c124f59cd9a7" }),
  "legacy-lesson1_phrase_12": Object.freeze({ voiceId: "ash", objectPath: "learning-v2/voice-audio/72a9cc37126ee713f066dd12511e35e65e3738dc5dfb641588f3631bfa089d35/68c0612bdada55099417ff511281b704572657288fb091faa62392651ba0b0ed/26ce52efe54cd25e0fced23603f47f7d6fb2949faeeab76ae97775cba1051d22/e635b61775ddffce5cc068aff052983b3930f39538a3d41158f477a259343bff.mp3", contentHash: "e635b61775ddffce5cc068aff052983b3930f39538a3d41158f477a259343bff", objectGeneration: "1", byteSize: 10310, contentType: "audio/mpeg", fileFingerprint: "ee0b62b3dabd8a79be0cbd0735e59154be506c7dae34da830613d52a6441038b" }),
} as const satisfies Readonly<Record<string, LearningV2CourseSessionAudioFileV1>>);

const LEARNING_V2_LESSON1_AUDIO_FAMILIES = new Set([
  "listen_choose", "sound_contrast", "listen_build_dictation", "scripted_repeat_compare",
]);

export const learningV2Lesson1FamilyUsesAudio = (family: string): boolean =>
  LEARNING_V2_LESSON1_AUDIO_FAMILIES.has(family);

export const learningV2Lesson1RemoteAudioFilesV1 = (): readonly LearningV2CourseSessionAudioFileV1[] =>
  Object.freeze(Object.values(LEARNING_V2_LEGACY_LESSON1_REMOTE_AUDIO));

export const learningV2Lesson1AudioSource = (contentItemId: string): string | null => {
  const entry = LEARNING_V2_LEGACY_LESSON1_REMOTE_AUDIO[
    contentItemId as keyof typeof LEARNING_V2_LEGACY_LESSON1_REMOTE_AUDIO
  ];
  if (!entry) return null;
  return new File(
    new Directory(Paths.document, LEARNING_V2_VOICE_AUDIO_CACHE_DIRECTORY_V1),
    `${entry.contentHash}.mp3`,
  ).uri;
};
