// streak_moments_sound.ts — заглушки звуковых событий рубежей серии и колец «Сегодня» (эталон: колонка snd/s тайм-листа streak-milestones.html).
// зачем (координатор 14.10): звук — имя события, файлов нет; настоящие придут из лаборатории звуков, тогда заглушка заменится вызовом soundDirector.
// Соответствие тайм-листу: riser=fc_riser, star=fc_star, tick=fc_tick, done=fc_session_complete, purchase=ob_purchase_success, msg=message_received, correct=fc_correct.
export const STREAK_SOUND_EVENTS = {
  toast: 'moment.streak.toast',
  burst: 'moment.streak.burst',
  riser: 'moment.streak.riser',
  morph: 'moment.streak.morph',
  tick: 'moment.streak.tick',
  celebrate: 'moment.streak.celebrate',
  firework: 'moment.streak.firework',
  ringTick: 'moment.today.ring_tick',
  ringClose: 'moment.today.ring_close',
  dayDone: 'moment.today.day_done',
} as const;

export type StreakSoundEvent = (typeof STREAK_SOUND_EVENTS)[keyof typeof STREAK_SOUND_EVENTS];

/** Заглушка: пишет имя события в журнал, звука нет. */
export function playStreakSound(event: StreakSoundEvent): void {
  if (__DEV__) console.log(`[STREAK-MOMENT-SOUND] ${event} (заглушка: файла звука пока нет)`); // guard-ok: единичный лог события
}
