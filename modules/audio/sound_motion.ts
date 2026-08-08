// ════════════════════════════════════════════════════════════════════════════
// sound_motion.ts — тайминги анимаций, измеренные ИЗ САМИХ звуковых файлов.
//
// зачем: владелец попросил, чтобы анимации соответствовали звуковым волнам.
// Раньше тайминги в компонентах назначались на глаз (тряска сундука 34/34/30/24
// мс, крышка 360 мс) и со звуком не совпадали. Здесь — единственный источник
// правды: числа получены разбором PCM каждого WAV (огибающая по 64 окнам).
//
// Ключевой факт: у всех файлов длинный хвост тишины. Контейнер 1000–1650 мс,
// а реальное звучание 47–1008 мс. Поэтому анимации ОБЯЗАНЫ идти по `audibleMs`,
// а не по `durationMs` из каталога событий — иначе движение переживает звук.
//
// Данные пересчитываются скриптом `scripts/measure_sfx_envelopes.mjs`.
// Заменили WAV — перегенерируйте, иначе вспышки разъедутся со звуком.
// ════════════════════════════════════════════════════════════════════════════
import type { SoundEventId } from './sound_events';

export type SoundMotionProfile = Readonly<{
  /** Реальная длительность ЗВУЧАНИЯ без хвоста тишины. Основа длительности анимации. */
  audibleMs: number;
  /** Момент главного пика — когда анимация должна быть на максимуме. */
  attackMs: number;
  /** Моменты ударов в звуке. На них вешаются вспышки/искры. */
  hits: readonly number[];
  /** Форма огибающей: perc — один удар, double/triple — счётные, multi — серия, swell — нарастание. */
  shape: 'perc' | 'double' | 'triple' | 'multi' | 'swell' | 'sustain';
  /** Яркость тембра 0..1. >0.55 — звонкий (золото), ниже — глухой (зелень). */
  bright: number;
}>;

export const SOUND_MOTION: Readonly<Partial<Record<SoundEventId, SoundMotionProfile>>> = Object.freeze({
  'pm.learn.correct': { audibleMs: 156, attackMs: 0, hits: [78], shape: 'perc', bright: 0.28 },
  'pm.learn.needs_work': { audibleMs: 438, attackMs: 188, hits: [16, 188, 359], shape: 'triple', bright: 0.03 },
  'pm.learn.hint_reveal': { audibleMs: 47, attackMs: 0, hits: [], shape: 'perc', bright: 0.91 },
  'pm.learn.timer_warning': { audibleMs: 63, attackMs: 47, hits: [16], shape: 'perc', bright: 0.73 },
  'pm.learn.timer_expired': { audibleMs: 563, attackMs: 47, hits: [47, 109, 266, 328], shape: 'multi', bright: 0.40 },
  'pm.voice.record_ready': { audibleMs: 125, attackMs: 109, hits: [109], shape: 'perc', bright: 0.89 },
  'pm.voice.turn_ready': { audibleMs: 219, attackMs: 0, hits: [203], shape: 'perc', bright: 0.71 },
  'pm.voice.no_speech': { audibleMs: 109, attackMs: 0, hits: [], shape: 'perc', bright: 0.41 },
  'pm.complete.micro': { audibleMs: 531, attackMs: 0, hits: [78, 125, 203, 281, 328], shape: 'multi', bright: 0.96 },
  'pm.complete.session': { audibleMs: 469, attackMs: 16, hits: [16, 172, 266], shape: 'triple', bright: 0.19 },
  'pm.complete.perfect': { audibleMs: 641, attackMs: 203, hits: [31, 94, 156, 203, 250, 359, 438], shape: 'multi', bright: 0.71 },
  'pm.complete.exam_pass': { audibleMs: 773, attackMs: 361, hits: [103, 180, 232, 284, 361], shape: 'multi', bright: 0.53 },
  'pm.complete.exam_retry': { audibleMs: 484, attackMs: 16, hits: [16, 78, 125, 172], shape: 'multi', bright: 0.06 },
  'pm.complete.star_1': { audibleMs: 141, attackMs: 0, hits: [], shape: 'perc', bright: 0.94 },
  'pm.complete.star_2': { audibleMs: 156, attackMs: 0, hits: [], shape: 'perc', bright: 0.92 },
  'pm.complete.star_3': { audibleMs: 500, attackMs: 16, hits: [16, 250], shape: 'double', bright: 0.63 },
  'pm.system.success': { audibleMs: 281, attackMs: 188, hits: [109, 188], shape: 'double', bright: 0.95 },
  'pm.system.info': { audibleMs: 766, attackMs: 234, hits: [47, 141, 234, 547], shape: 'multi', bright: 0.13 },
  'pm.system.warning': { audibleMs: 469, attackMs: 141, hits: [16, 141], shape: 'double', bright: 0.20 },
  'pm.system.error_recoverable': { audibleMs: 344, attackMs: 109, hits: [109], shape: 'perc', bright: 0.17 },
  'pm.system.destructive_done': { audibleMs: 328, attackMs: 47, hits: [47, 94, 156, 219], shape: 'multi', bright: 0.00 },
  'pm.energy.empty': { audibleMs: 734, attackMs: 31, hits: [31, 156, 234, 281, 359, 406, 453, 500], shape: 'multi', bright: 0.44 },
  'pm.energy.refilled': { audibleMs: 531, attackMs: 281, hits: [94, 156, 219, 281, 344, 391], shape: 'multi', bright: 0.05 },
  'pm.streak.saved': { audibleMs: 297, attackMs: 78, hits: [78, 156], shape: 'double', bright: 0.97 },
  'pm.reward.small': { audibleMs: 422, attackMs: 156, hits: [63, 156], shape: 'double', bright: 0.96 },
  'pm.reward.collectible': { audibleMs: 328, attackMs: 31, hits: [31, 78, 297], shape: 'triple', bright: 0.96 },
  'pm.reward.achievement': { audibleMs: 406, attackMs: 141, hits: [109, 250], shape: 'double', bright: 0.96 },
  'pm.reward.level_up': { audibleMs: 900, attackMs: 350, hits: [25, 200, 350, 500, 600], shape: 'multi', bright: 0.13 },
  'pm.reward.chest_open': { audibleMs: 398, attackMs: 141, hits: [141, 188, 328], shape: 'triple', bright: 0.02 },
  'pm.reward.premium_open': { audibleMs: 867, attackMs: 234, hits: [164, 234, 305, 375, 445, 516], shape: 'multi', bright: 0.01 },
  'pm.reward.premium_finale': { audibleMs: 398, attackMs: 23, hits: [23, 94], shape: 'double', bright: 0.01 },
  'pm.reward.vip_open': { audibleMs: 609, attackMs: 141, hits: [47, 141, 211, 281, 375], shape: 'multi', bright: 0.01 },
  'pm.league.promoted': { audibleMs: 1008, attackMs: 281, hits: [94, 141, 281, 328, 375, 469, 727], shape: 'multi', bright: 0.07 },
  'pm.league.demoted': { audibleMs: 656, attackMs: 422, hits: [23, 94, 422, 492], shape: 'multi', bright: 0.06 },
  'pm.social.gift_received': { audibleMs: 656, attackMs: 281, hits: [281, 352], shape: 'double', bright: 0.78 },
  'pm.social.friend_request': { audibleMs: 1008, attackMs: 94, hits: [47, 94, 398, 445], shape: 'multi', bright: 0.13 },
  'pm.social.quest_complete': { audibleMs: 234, attackMs: 164, hits: [23, 164], shape: 'double', bright: 0.95 },
});

/** Профиль движения события. `null`, если у события нет звукового файла (арена, vip_finale). */
export function motionOf(id: SoundEventId): SoundMotionProfile | null {
  return SOUND_MOTION[id] ?? null;
}

/**
 * Длительность анимации для события.
 * Берёт реальное звучание и добавляет небольшой «выдох», чтобы движение
 * не обрывалось ровно в тишину — но остаётся привязанным к звуку.
 */
export function motionDurationMs(id: SoundEventId, fallbackMs = 320): number {
  const m = SOUND_MOTION[id];
  return m ? m.audibleMs : fallbackMs;
}

/** Цвет акцента по тембру: звонкие звуки — золото, глухие — зелёный акцент темы. */
export function motionIsBright(id: SoundEventId): boolean {
  const m = SOUND_MOTION[id];
  return m ? m.bright > 0.55 : false;
}
