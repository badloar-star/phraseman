/* Generated. Лёгкий срез learning_v2_factory_lesson_audio_index_v1.generated.ts:
 * только список озвученных занятий, без хэшей (те весят 503 КБ и нужны
 * лишь при запуске занятия). Позволяет проверить «есть ли озвучка» без
 * разбора полумегабайта при открытии раздела. */
export const LEARNING_V2_PUBLISHED_AUDIO_SESSIONS_V1: Readonly<Record<number, readonly number[]>> = Object.freeze({
  1: Object.freeze([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56]),
  2: Object.freeze([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56]),
  3: Object.freeze([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43]),
});

/** Опубликована ли озвучка занятия (без загрузки тяжёлого индекса). */
export function learningV2HasPublishedAudioV1(lessonOrdinal: number, sessionOrdinal: number): boolean {
  const ordinals = LEARNING_V2_PUBLISHED_AUDIO_SESSIONS_V1[lessonOrdinal];
  return ordinals ? ordinals.includes(sessionOrdinal) : false;
}
