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

import type { SoundV2EventId } from '../../../modules/sound_v2/catalog';
import { tryPlayV2Event } from '../../../modules/sound_v2/legacy_bridge';

// зачем (координатор 14.10, п.4): имена событий моментов Пика подключены к звукам V2 по тайм-листу ETALON_MOMENTS_V3_TRANSFER.md (m01: tap, sheet_open, correct, league_up; m02: league_stay, tap; m03: league_down, new_week);
// флаг sound_v2 выключен — прежняя заглушка с журналом.
export const MOMENT_SOUND_TO_V2: Readonly<Record<string, SoundV2EventId | null>> = {
  'moment.promo.tick': 'tap',
  'moment.promo.flip': 'sheet_open',
  'moment.promo.correct': 'correct',
  'moment.promo.marker': null,
  'moment.promo.done': 'league_up',
  'moment.stay.flip': 'league_stay',
  'moment.stay.tick': 'tap',
  'moment.down.fog': 'league_down',
  'moment.down.wake': 'new_week',
};

export type MomentSoundEvent = (typeof MOMENT_SOUND_EVENTS)[keyof typeof MOMENT_SOUND_EVENTS];

/** Заглушка: пишет имя события в журнал, звука нет. */
export function playMomentSound(event: MomentSoundEvent): void {
  const v2 = MOMENT_SOUND_TO_V2[event];
  if (v2 && tryPlayV2Event(v2, event)) return;
  if (__DEV__) console.log(`[MOMENT-SOUND] ${event} (заглушка: файла звука пока нет)`); // guard-ok: единичный лог события
}
