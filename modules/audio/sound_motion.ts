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
  'pm.app.welcome': { audibleMs: 1509, attackMs: 683, hits: [575, 683, 827], shape: 'triple', bright: 0.2204 },
  'pm.learn.correct': { audibleMs: 156, attackMs: 0, hits: [78], shape: 'perc', bright: 0.28 },
  'pm.learn.needs_work': { audibleMs: 438, attackMs: 188, hits: [16, 188, 359], shape: 'triple', bright: 0.03 },
  // pm.learn.hint_reveal удалён вместе со звуком (владелец 2026-08-30).
  'pm.learn.timer_warning': { audibleMs: 63, attackMs: 47, hits: [16], shape: 'perc', bright: 0.73 },
  'pm.learn.timer_expired': { audibleMs: 563, attackMs: 47, hits: [47, 109, 266, 328], shape: 'multi', bright: 0.40 },
  'pm.exam.begin': { audibleMs: 578, attackMs: 16, hits: [16, 109, 188, 250, 297, 359], shape: 'multi', bright: 0.0592 },
  'pm.lesson.begin': { audibleMs: 1509, attackMs: 180, hits: [180, 288, 431, 575, 683, 755, 898, 1006], shape: 'multi', bright: 0.432 },
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
  'pm.complete.star_3_perfect': { audibleMs: 516, attackMs: 78, hits: [47, 172, 281, 422], shape: 'multi', bright: 0.9082 },
  'pm.complete.xp_counter_start': { audibleMs: 375, attackMs: 94, hits: [94, 156, 234, 328], shape: 'multi', bright: 0.4134 },
  'pm.complete.xp_counter_tick': { audibleMs: 953, attackMs: 453, hits: [47, 109, 156, 234, 297, 344, 422, 484, 531, 609, 672, 719, 797, 859], shape: 'multi', bright: 0.9798 },
  'pm.complete.xp_counter_complete': { audibleMs: 297, attackMs: 0, hits: [234], shape: 'perc', bright: 0.7916 },
  'pm.complete.active_reward_reveal': { audibleMs: 234, attackMs: 125, hits: [125], shape: 'sustain', bright: 0.0441 },
  'pm.complete.active_gift_unlock': { audibleMs: 391, attackMs: 94, hits: [31, 94, 172, 234, 281], shape: 'multi', bright: 0.1206 },
  'pm.complete.multiplier_reveal': { audibleMs: 594, attackMs: 344, hits: [47, 125, 188, 234, 297, 344, 406, 484], shape: 'multi', bright: 0.9423 },
  'pm.complete.multiplier_upgrade': { audibleMs: 453, attackMs: 78, hits: [78, 125, 203, 281], shape: 'multi', bright: 0.2031 },
  'pm.complete.rewards_finale': { audibleMs: 359, attackMs: 31, hits: [31, 141], shape: 'double', bright: 0.1976 },
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
  // ─── Празднование v6: карты ударов из docs/design/CELEBRATION_SOUND_PROMPTS.md ───
  // зачем: визуальные события сцен стоят ровно на этих миллисекундах
  // (components/premium_celebration/CelebrationSceneViews.tsx). Правишь тут —
  // правь и там, и в документе: иначе звук уедет от картинки.
  'pm.celebration.open_rift': { audibleMs: 1450, attackMs: 0, hits: [0, 150, 158, 260, 900, 990, 1010], shape: 'multi', bright: 0.62 },
  'pm.celebration.energy_break': { audibleMs: 1210, attackMs: 600, hits: [110, 580, 600, 790, 810], shape: 'multi', bright: 0.7 },
  'pm.celebration.locks_off': { audibleMs: 780, attackMs: 70, hits: [70, 116, 162, 208, 254, 300, 550], shape: 'multi', bright: 0.82 },
  'pm.celebration.cards_stack': { audibleMs: 1100, attackMs: 90, hits: [90, 178, 266, 354, 442, 700], shape: 'multi', bright: 0.44 },
  'pm.celebration.dialog_spark': { audibleMs: 900, attackMs: 120, hits: [120, 300, 520], shape: 'triple', bright: 0.6 },
  'pm.celebration.voice_score': { audibleMs: 1170, attackMs: 690, hits: [70, 510, 690, 720], shape: 'multi', bright: 0.55 },
  'pm.celebration.coach_heal': { audibleMs: 1180, attackMs: 160, hits: [160, 350, 540], shape: 'triple', bright: 0.3 },
  'pm.celebration.error_fix': { audibleMs: 1180, attackMs: 560, hits: [320, 560, 800], shape: 'triple', bright: 0.5 },
  'pm.celebration.plan_route': { audibleMs: 1060, attackMs: 100, hits: [100, 160, 230, 290, 360, 420, 490, 550, 620], shape: 'multi', bright: 0.72 },
  'pm.celebration.stats_rise': { audibleMs: 1040, attackMs: 640, hits: [80, 132, 184, 236, 288, 340, 392, 444, 496, 640], shape: 'multi', bright: 0.66 },
  'pm.celebration.streak_shield': { audibleMs: 1000, attackMs: 400, hits: [110, 400], shape: 'double', bright: 0.2 },
  'pm.celebration.aura_bloom': { audibleMs: 1030, attackMs: 220, hits: [220, 420, 478, 536, 594, 652], shape: 'multi', bright: 0.85 },
  'pm.celebration.max_awaken': { audibleMs: 2200, attackMs: 80, hits: [80, 420, 460, 480, 700, 1020], shape: 'swell', bright: 0.18 },
  'pm.celebration.finale_chord': { audibleMs: 1600, attackMs: 200, hits: [0, 200, 440], shape: 'swell', bright: 0.4 },
  'pm.celebration.promo_stamp': { audibleMs: 850, attackMs: 410, hits: [60, 410, 830], shape: 'double', bright: 0.5 },
  'pm.reward.pack_reveal_start': { audibleMs: 328, attackMs: 234, hits: [234], shape: 'sustain', bright: 0.9432 },
  'pm.reward.pack_complete': { audibleMs: 891, attackMs: 875, hits: [875], shape: 'swell', bright: 0.6416 },
  'pm.league.promoted': { audibleMs: 1008, attackMs: 281, hits: [94, 141, 281, 328, 375, 469, 727], shape: 'multi', bright: 0.07 },
  'pm.league.demoted': { audibleMs: 656, attackMs: 422, hits: [23, 94, 422, 492], shape: 'multi', bright: 0.06 },
  'pm.social.gift_received': { audibleMs: 656, attackMs: 281, hits: [281, 352], shape: 'double', bright: 0.78 },
  'pm.social.friend_request': { audibleMs: 1008, attackMs: 94, hits: [47, 94, 398, 445], shape: 'multi', bright: 0.13 },
  'pm.social.quest_complete': { audibleMs: 234, attackMs: 164, hits: [23, 164], shape: 'double', bright: 0.95 },
  'pm.social.friend_added': { audibleMs: 234, attackMs: 16, hits: [16], shape: 'perc', bright: 0.0803 },
  'pm.spin.button_press': { audibleMs: 63, attackMs: 0, hits: [31], shape: 'perc', bright: 0.8839 },
  'pm.spin.reel_start': { audibleMs: 563, attackMs: 359, hits: [172, 266, 328, 453], shape: 'multi', bright: 0.0271 },
  'pm.spin.reel_loop': { audibleMs: 2000, attackMs: 1938, hits: [31, 94, 188, 250, 344, 406, 469, 563, 625, 688, 781, 844, 938, 1000, 1063, 1125, 1188, 1281, 1375, 1438, 1531, 1594, 1656, 1781, 1875, 1938], shape: 'multi', bright: 0.9493 },
  'pm.spin.reel_stop_rollback': { audibleMs: 1088, attackMs: 431, hits: [206, 263, 338, 431, 488, 619, 825], shape: 'multi', bright: 0.0138 },
  'pm.spin.reward_lock': { audibleMs: 188, attackMs: 63, hits: [63], shape: 'perc', bright: 0.1511 },
  'pm.spin.reward_win': { audibleMs: 625, attackMs: 94, hits: [94], shape: 'perc', bright: 0.0369 },
  'pm.spin.reward_rare': { audibleMs: 656, attackMs: 63, hits: [63, 188, 313], shape: 'triple', bright: 0.0122 },
  'pm.spin.reward_premium': { audibleMs: 1000, attackMs: 344, hits: [219, 344, 438], shape: 'triple', bright: 0.0733 },
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
