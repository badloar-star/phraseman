// Every current Lesson 1 listening/repeat card resolves to one of these four
// bundled files. Static require() is deliberate: Metro packages the audio and
// the active session never falls through to remote TTS or a URL.
export const LEARNING_V2_LESSON1_AUDIO = Object.freeze({
  'legacy-lesson1_phrase_1': require('../assets/audio/learning-v2/lesson1/i-am-here.m4a'),
  'legacy-lesson1_phrase_10': require('../assets/audio/learning-v2/lesson1/we-are-safe.m4a'),
  'legacy-lesson1_phrase_11': require('../assets/audio/learning-v2/lesson1/he-is-sick.m4a'),
  'legacy-lesson1_phrase_12': require('../assets/audio/learning-v2/lesson1/it-is-cheap.m4a'),
} as const satisfies Readonly<Record<string, number>>);

const LEARNING_V2_LESSON1_AUDIO_FAMILIES = new Set([
  'listen_choose',
  'sound_contrast',
  'listen_build_dictation',
  'scripted_repeat_compare',
]);

export const learningV2Lesson1FamilyUsesAudio = (family: string): boolean =>
  LEARNING_V2_LESSON1_AUDIO_FAMILIES.has(family);

export const learningV2Lesson1AudioSource = (contentItemId: string): number | null => {
  if (!Object.prototype.hasOwnProperty.call(LEARNING_V2_LESSON1_AUDIO, contentItemId)) return null;
  const source = LEARNING_V2_LESSON1_AUDIO[contentItemId as keyof typeof LEARNING_V2_LESSON1_AUDIO];
  return typeof source === 'number' ? source : null;
};
