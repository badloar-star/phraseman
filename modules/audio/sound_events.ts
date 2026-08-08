export type SoundFamily =
  | 'app'
  | 'learning'
  | 'voice'
  | 'completion'
  | 'system'
  | 'energy'
  | 'streak'
  | 'reward'
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
  // зачем: тёплое приветствие сразу после онбординга (handleOnboardingDone в
  // app/_layout.tsx). "Один раз за жизнь аккаунта" НЕ через cooldown — арбитр
  // живёт только в памяти процесса и обнулится при перезапуске приложения;
  // однократность гарантирует вызывающий код через AsyncStorage-флаг, как
  // introShownRaw/onboarding_done. Cooldown здесь — обычная защита от
  // случайного даблтапа/гонки, не суррогат персистентности.
  'pm.app.welcome': event(require('../../assets/audio/sfx/v1/app/pm_app_welcome_v1.wav'), 0.40, 65, 8000, 2300, 'app'),

  'pm.learn.correct': event(require('../../assets/audio/sfx/v1/learning/pm_learn_correct_v1.wav'), 0.42, 70, 160, 380, 'learning'),
  'pm.learn.needs_work': event(require('../../assets/audio/sfx/v1/learning/pm_learn_needs_work_v1.wav'), 0.28, 68, 220, 320, 'learning'),
  'pm.learn.hint_reveal': event(require('../../assets/audio/sfx/v1/learning/pm_learn_hint_reveal_v1.wav'), 0.30, 38, 500, 340, 'learning'),
  // зачем: тихий stinger на пересечение порога серии (3/5/10) — заменяет
  // обычный correct в этот момент, ComboRing уже различает уровни визуально.
  'pm.learn.combo_up': event(require('../../assets/audio/sfx/v1/learning/pm_learn_combo_up_v1.wav'), 0.44, 76, 2000, 1000, 'learning'),
  // зачем 2026-08-03 (владелец: «тики звучат непонятно как — то в середине
  // раунда, то в конце»): кулдаун 1200 мс был ДЛИННЕЕ секундного шага отсчёта
  // и глотал каждый второй тик — 5-3-1 вместо 5-4-3-2-1 в турнире, «3…1» без
  // «2» в арене. 700 мс: секундная каденция проходит целиком, а дребезг
  // повторных запросов внутри одной секунды по-прежнему схлопывается.
  'pm.learn.timer_warning': event(require('../../assets/audio/sfx/v1/learning/pm_learn_timer_warning_v1.wav'), 0.34, 62, 700, 240, 'learning'),
  'pm.learn.timer_expired': event(require('../../assets/audio/sfx/v1/learning/pm_learn_timer_expired_v1.wav'), 0.32, 66, 700, 420, 'learning'),
  // зачем: собранный «вдох» на старте теста/экзамена — до первого вопроса,
  // приоритет ниже обычных learning-сигналов (это атмосфера, не вердикт).
  // Однократность на попытку держит вызывающий код (mount-once), cooldown —
  // только защита от гонки/двойного mount, не суррогат персистентности.
  'pm.exam.begin': event(require('../../assets/audio/sfx/v1/learning/pm_exam_begin_v1.wav'), 0.20, 30, 4000, 1000, 'learning'),
  // зачем: тихая атмосферная подложка под уже существующий header-fade интро
  // урока (app/lesson_intro_screens.tsx). Однократность на lessonId держит
  // dedupeKey в вызове; cooldown — только защита от двойного mount подряд.
  'pm.lesson.begin': event(require('../../assets/audio/sfx/v1/learning/pm_lesson_begin_v1.wav'), 0.18, 20, 4000, 2300, 'learning'),

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
  'pm.complete.star_3_perfect': event(require('../../assets/audio/sfx/v1/completion/pm_complete_star_3_perfect_v1.wav'), 0.46, 80, 500, 800, 'completion'),
  'pm.complete.xp_counter_start': event(require('../../assets/audio/sfx/v1/completion/pm_complete_xp_counter_start_v1.wav'), 0.30, 62, 900, 450, 'completion'),
  'pm.complete.xp_counter_tick': event(require('../../assets/audio/sfx/v1/completion/pm_complete_xp_counter_tick_v1.wav'), 0.20, 48, 140, 1000, 'completion'),
  'pm.complete.xp_counter_complete': event(require('../../assets/audio/sfx/v1/completion/pm_complete_xp_counter_complete_v1.wav'), 0.42, 82, 900, 900, 'completion'),
  'pm.complete.active_reward_reveal': event(require('../../assets/audio/sfx/v1/completion/pm_complete_active_reward_reveal_v1.wav'), 0.38, 76, 1200, 1100, 'completion'),
  'pm.complete.active_gift_unlock': event(require('../../assets/audio/sfx/v1/completion/pm_complete_active_gift_unlock_v1.wav'), 0.42, 80, 1200, 1300, 'completion'),
  'pm.complete.multiplier_reveal': event(require('../../assets/audio/sfx/v1/completion/pm_complete_multiplier_reveal_v1.wav'), 0.40, 78, 1200, 1500, 'completion'),
  'pm.complete.multiplier_upgrade': event(require('../../assets/audio/sfx/v1/completion/pm_complete_multiplier_upgrade_v1.wav'), 0.44, 82, 1200, 1500, 'completion'),
  'pm.complete.rewards_finale': event(require('../../assets/audio/sfx/v1/completion/pm_complete_rewards_finale_v1.wav'), 0.46, 84, 1500, 1800, 'completion'),

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
  // зачем: лёгкое предвкушение на входе в экран распаковки, ДО первого флипа —
  // не путать с финальным pack_complete (тот громче и играет один раз в конце).
  // Однократность на mount экрана держит вызывающий код; cooldown — защита от
  // двойного mount, не суррогат персистентности.
  'pm.reward.pack_reveal_start': event(require('../../assets/audio/sfx/v1/reward/pm_reward_pack_reveal_start_v1.wav'), 0.20, 25, 4000, 1000, 'reward'),
  // зачем: финальный аккорд, когда перевёрнута последняя карточка пака —
  // конфетти уже есть визуально, звука к нему не было.
  'pm.reward.pack_complete': event(require('../../assets/audio/sfx/v1/reward/pm_reward_pack_complete_v1.wav'), 0.50, 80, 3000, 1000, 'reward'),

  // Level Spin is a short, authored sequence. Each cue has a separate asset so
  // visual phase changes can trigger it exactly instead of relying on timers.
  'pm.spin.button_press': event(require('../../assets/audio/sfx/v1/spin/pm_spin_button_press_v1.wav'), 0.32, 42, 0, 1000, 'reward'),
  'pm.spin.reel_start': event(require('../../assets/audio/sfx/v1/spin/pm_spin_reel_start_v1.wav'), 0.44, 70, 0, 1000, 'reward'),
  'pm.spin.reel_loop': event(require('../../assets/audio/sfx/v1/spin/pm_spin_reel_loop_v1.wav'), 0.28, 74, 0, 2000, 'reward'),
  'pm.spin.reel_stop_rollback': event(require('../../assets/audio/sfx/v1/spin/pm_spin_reel_stop_rollback_v1.wav'), 0.52, 90, 0, 1200, 'reward'),
  'pm.spin.reward_lock': event(require('../../assets/audio/sfx/v1/spin/pm_spin_reward_lock_v1.wav'), 0.48, 92, 0, 2000, 'reward'),
  'pm.spin.reward_win': event(require('../../assets/audio/sfx/v1/spin/pm_spin_reward_win_v1.wav'), 0.54, 94, 0, 2000, 'reward'),
  'pm.spin.reward_rare': event(require('../../assets/audio/sfx/v1/spin/pm_spin_reward_rare_v1.wav'), 0.58, 95, 0, 2000, 'reward'),
  'pm.spin.reward_premium': event(require('../../assets/audio/sfx/v1/spin/pm_spin_reward_premium_v1.wav'), 0.62, 96, 0, 2000, 'reward'),

  'pm.league.promoted': event(require('../../assets/audio/sfx/v1/league/pm_league_promoted_v1.wav'), 0.64, 94, 8000, 1620, 'league'),
  'pm.league.demoted': event(require('../../assets/audio/sfx/v1/league/pm_league_demoted_v1.wav'), 0.36, 80, 6000, 980, 'league'),
  'pm.social.gift_received': event(require('../../assets/audio/sfx/v1/social/pm_social_gift_received_v1.wav'), 0.48, 72, 3000, 880, 'social', { deferAfterVoice: true }),
  'pm.social.friend_request': event(require('../../assets/audio/sfx/v1/social/pm_social_friend_request_v1.wav'), 0.36, 60, 2500, 540, 'social', { deferAfterVoice: true }),
  'pm.social.quest_complete': event(require('../../assets/audio/sfx/v1/social/pm_social_quest_complete_v1.wav'), 0.52, 80, 4500, 1020, 'social', { deferAfterVoice: true }),
  // зачем: лёгкий сигнал «теперь вы друзья» на стороне того, кто принял
  // заявку — не путать с friend_request (входящая заявка).
  'pm.social.friend_added': event(require('../../assets/audio/sfx/v1/social/pm_social_friend_added_v1.wav'), 0.30, 55, 2000, 1000, 'social', { deferAfterVoice: true }),
});

export type SoundEventId = keyof typeof SOUND_EVENTS;

