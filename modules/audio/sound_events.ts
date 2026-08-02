export type SoundFamily =
  | 'learning'
  | 'voice'
  | 'completion'
  | 'system'
  | 'energy'
  | 'streak'
  | 'reward'
  | 'arena'
  | 'league'
  | 'social';

export type SoundEventDefinition = Readonly<{
  source: number | null;
  volume: number;
  priority: number;
  cooldownMs: number;
  durationMs: number;
  family: SoundFamily;
  platform: 'all' | 'ios';
  deferAfterVoice: boolean;
}>;

const event = (
  source: number | null,
  volume: number,
  priority: number,
  cooldownMs: number,
  durationMs: number,
  family: SoundFamily,
  options: Partial<Pick<SoundEventDefinition, 'platform' | 'deferAfterVoice'>> = {},
): SoundEventDefinition => Object.freeze({
  source,
  volume,
  priority,
  cooldownMs,
  durationMs,
  family,
  platform: options.platform ?? 'all',
  deferAfterVoice: options.deferAfterVoice ?? false,
});

export const SOUND_EVENTS = Object.freeze({
  'pm.learn.correct': event(require('../../assets/audio/sfx/v1/learning/pm_learn_correct_v1.wav'), 0.42, 70, 160, 380, 'learning'),
  'pm.learn.needs_work': event(require('../../assets/audio/sfx/v1/learning/pm_learn_needs_work_v1.wav'), 0.28, 68, 220, 320, 'learning'),
  'pm.learn.hint_reveal': event(require('../../assets/audio/sfx/v1/learning/pm_learn_hint_reveal_v1.wav'), 0.30, 38, 500, 340, 'learning'),
  'pm.learn.timer_warning': event(require('../../assets/audio/sfx/v1/learning/pm_learn_timer_warning_v1.wav'), 0.34, 62, 1200, 240, 'learning'),
  'pm.learn.timer_expired': event(require('../../assets/audio/sfx/v1/learning/pm_learn_timer_expired_v1.wav'), 0.32, 66, 700, 420, 'learning'),
  'pm.learn.combo_5': event(require('../../assets/audio/sfx/v1/learning/pm_learn_combo_5_v1.wav'), 0.46, 76, 2200, 660, 'learning'),
  'pm.learn.combo_10': event(require('../../assets/audio/sfx/v1/learning/pm_learn_combo_10_v1.wav'), 0.52, 82, 4500, 880, 'learning'),

  'pm.voice.record_ready': event(require('../../assets/audio/sfx/v1/voice/pm_voice_record_ready_v1.wav'), 0.40, 95, 450, 220, 'voice', { platform: 'ios' }),
  'pm.voice.turn_ready': event(require('../../assets/audio/sfx/v1/voice/pm_voice_turn_ready_v1.wav'), 0.34, 82, 700, 300, 'voice'),
  'pm.voice.no_speech': event(require('../../assets/audio/sfx/v1/voice/pm_voice_no_speech_v1.wav'), 0.27, 78, 800, 380, 'voice'),

  'pm.complete.micro': event(require('../../assets/audio/sfx/v1/completion/pm_complete_micro_v1.wav'), 0.46, 74, 1800, 780, 'completion'),
  'pm.complete.session': event(require('../../assets/audio/sfx/v1/completion/pm_complete_session_v1.wav'), 0.52, 80, 3000, 1100, 'completion'),
  'pm.complete.perfect': event(require('../../assets/audio/sfx/v1/completion/pm_complete_perfect_v1.wav'), 0.58, 86, 5000, 1350, 'completion'),
  'pm.complete.exam_pass': event(require('../../assets/audio/sfx/v1/completion/pm_complete_exam_pass_v1.wav'), 0.60, 90, 6000, 1650, 'completion'),
  'pm.complete.exam_retry': event(require('../../assets/audio/sfx/v1/completion/pm_complete_exam_retry_v1.wav'), 0.34, 72, 2500, 920, 'completion'),
  'pm.complete.star_1': event(require('../../assets/audio/sfx/v1/completion/pm_complete_star_1_v1.wav'), 0.38, 74, 180, 340, 'completion'),
  'pm.complete.star_2': event(require('../../assets/audio/sfx/v1/completion/pm_complete_star_2_v1.wav'), 0.40, 75, 180, 380, 'completion'),
  'pm.complete.star_3': event(require('../../assets/audio/sfx/v1/completion/pm_complete_star_3_v1.wav'), 0.44, 78, 220, 480, 'completion'),

  'pm.system.success': event(require('../../assets/audio/sfx/v1/system/pm_system_success_v1.wav'), 0.34, 58, 1600, 520, 'system', { deferAfterVoice: true }),
  'pm.system.info': event(require('../../assets/audio/sfx/v1/system/pm_system_info_v1.wav'), 0.28, 44, 1800, 420, 'system', { deferAfterVoice: true }),
  'pm.system.warning': event(require('../../assets/audio/sfx/v1/system/pm_system_warning_v1.wav'), 0.34, 72, 2200, 560, 'system'),
  'pm.system.error_recoverable': event(require('../../assets/audio/sfx/v1/system/pm_system_error_recoverable_v1.wav'), 0.30, 76, 1800, 480, 'system'),
  'pm.system.destructive_done': event(require('../../assets/audio/sfx/v1/system/pm_system_destructive_done_v1.wav'), 0.34, 84, 2500, 580, 'system'),

  'pm.energy.empty': event(require('../../assets/audio/sfx/v1/energy/pm_energy_empty_v1.wav'), 0.32, 73, 5000, 620, 'energy'),
  'pm.energy.refilled': event(require('../../assets/audio/sfx/v1/energy/pm_energy_refilled_v1.wav'), 0.42, 70, 3000, 720, 'energy'),
  'pm.streak.saved': event(require('../../assets/audio/sfx/v1/streak/pm_streak_saved_v1.wav'), 0.54, 84, 5000, 1080, 'streak'),

  'pm.reward.small': event(require('../../assets/audio/sfx/v1/reward/pm_reward_small_v1.wav'), 0.42, 64, 1800, 720, 'reward', { deferAfterVoice: true }),
  'pm.reward.collectible': event(require('../../assets/audio/sfx/v1/reward/pm_reward_collectible_v1.wav'), 0.54, 82, 4500, 1180, 'reward'),
  'pm.reward.achievement': event(require('../../assets/audio/sfx/v1/reward/pm_reward_achievement_v1.wav'), 0.55, 84, 4500, 1120, 'reward'),
  'pm.reward.level_up': event(require('../../assets/audio/sfx/v1/reward/pm_reward_level_up_v1.wav'), 0.58, 88, 5500, 1350, 'reward'),
  'pm.reward.chest_open': event(require('../../assets/audio/sfx/v1/reward/pm_reward_chest_open_v1.wav'), 0.58, 86, 4500, 1420, 'reward'),
  'pm.reward.premium_open': event(require('../../assets/audio/sfx/v1/reward/pm_reward_premium_open_v1.wav'), 0.60, 94, 8000, 1450, 'reward'),
  'pm.reward.premium_finale': event(require('../../assets/audio/sfx/v1/reward/pm_reward_premium_finale_v1.wav'), 0.62, 95, 8000, 1650, 'reward'),
  'pm.reward.vip_open': event(require('../../assets/audio/sfx/v1/reward/pm_reward_vip_open_v1.wav'), 0.62, 96, 10000, 1550, 'reward'),
  'pm.reward.vip_finale': event(null, 0.64, 97, 10000, 1850, 'reward'),

  'pm.arena.match_found': event(null, 0.55, 92, 5000, 920, 'arena'),
  'pm.arena.countdown_3': event(null, 0.38, 78, 400, 220, 'arena'),
  'pm.arena.countdown_2': event(null, 0.39, 79, 400, 220, 'arena'),
  'pm.arena.countdown_1': event(null, 0.42, 80, 400, 240, 'arena'),
  'pm.arena.round_start': event(null, 0.50, 88, 1200, 460, 'arena'),
  'pm.arena.victory': event(null, 0.62, 90, 5500, 1380, 'arena'),
  'pm.arena.defeat': event(null, 0.34, 76, 3500, 880, 'arena'),
  'pm.arena.draw': event(null, 0.36, 72, 3000, 760, 'arena'),

  'pm.league.promoted': event(require('../../assets/audio/sfx/v1/league/pm_league_promoted_v1.wav'), 0.64, 94, 8000, 1620, 'league'),
  'pm.league.demoted': event(require('../../assets/audio/sfx/v1/league/pm_league_demoted_v1.wav'), 0.36, 80, 6000, 980, 'league'),
  'pm.social.gift_received': event(require('../../assets/audio/sfx/v1/social/pm_social_gift_received_v1.wav'), 0.48, 72, 3000, 880, 'social', { deferAfterVoice: true }),
  'pm.social.friend_request': event(require('../../assets/audio/sfx/v1/social/pm_social_friend_request_v1.wav'), 0.36, 60, 2500, 540, 'social', { deferAfterVoice: true }),
  'pm.social.quest_complete': event(require('../../assets/audio/sfx/v1/social/pm_social_quest_complete_v1.wav'), 0.52, 80, 4500, 1020, 'social', { deferAfterVoice: true }),
});

export type SoundEventId = keyof typeof SOUND_EVENTS;

