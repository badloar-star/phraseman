// moments_sound.ts — заглушки звуковых событий «моментов вовлечения» Пика (эталон engagement-moments-v3-all.html: колонка snd/s в тайм-листе).
// зачем (координатор 14.10): звук — имя события, файлов нет; настоящие файлы придут из лаборатории звуков, тогда заглушка заменится вызовом soundDirector.
// Соответствие тайм-листу: tick=fc_tick, flip=fc_flip, correct=fc_correct, done=fc_session_complete, learn=fc_swipe_learn(gain .6), know=fc_swipe_know.
export const MOMENT_SOUND_EVENTS = {
  promoTick: 'moment.promo.tick',
  promoFlip: 'moment.promo.flip',
  promoCorrect: 'moment.promo.correct',
  promoMarker: 'moment.promo.marker',
  promoDone: 'moment.promo.done',
  stayFlip: 'moment.stay.flip',
  stayTick: 'moment.stay.tick',
  downFog: 'moment.down.fog',
  downWake: 'moment.down.wake',
} as const;

export type MomentSoundEvent = (typeof MOMENT_SOUND_EVENTS)[keyof typeof MOMENT_SOUND_EVENTS];

/** Заглушка: пишет имя события в журнал, звука нет. */
export function playMomentSound(event: MomentSoundEvent): void {
  if (__DEV__) console.log(`[MOMENT-SOUND] ${event} (заглушка: файла звука пока нет)`); // guard-ok: единичный лог события
}
