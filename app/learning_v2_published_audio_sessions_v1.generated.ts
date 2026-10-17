/* Generated. Лёгкий срез learning_v2_factory_lesson_audio_index_v1.generated.ts:
 * только список озвученных занятий, без хэшей (те весят 504 КБ и нужны
 * лишь при запуске занятия). Позволяет проверить «есть ли озвучка» без
 * разбора полумегабайта при открытии раздела.
 *
 * зачем: аудит 20.09 замерил — открытие раздела держало JS-тред 2612 мс,
 * а сам вопрос «есть ли у занятия озвучка» — это список номеров на 1 КБ.
 * Источник истины прежний; расхождение ловит сторож карты Learning V2. */
export const LEARNING_V2_PUBLISHED_AUDIO_SESSIONS_V1: Readonly<Record<number, readonly number[]>> = Object.freeze({
  1: Object.freeze([1,3,4,5]),
});

/** Опубликована ли озвучка занятия (без загрузки тяжёлого индекса). */
export function learningV2HasPublishedAudioV1(lessonOrdinal: number, sessionOrdinal: number): boolean {
  const ordinals = LEARNING_V2_PUBLISHED_AUDIO_SESSIONS_V1[lessonOrdinal];
  return ordinals ? ordinals.includes(sessionOrdinal) : false;
}
