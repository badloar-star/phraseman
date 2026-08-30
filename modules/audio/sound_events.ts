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
  | 'social'
  | 'arena'
  | 'cards'
  | 'commerce'
  | 'dialog'
  | 'economy'
  | 'max'
  | 'profile'
  // зачем: сердечки (система попыток session_attempts) — отдельное семейство,
  // как и планировалось при одобрении звуков 2026-08-28.
  | 'hearts'
  // зачем: нажатия — отдельное семейство, чтобы их можно было приглушать
  // независимо от наград и обучения (звучат чаще всего остального).
  | 'ui';

export type SoundEventDefinition = Readonly<{
  source: number | null;
  volume: number;
  priority: number;
  cooldownMs: number;
  durationMs: number;
  family: SoundFamily;
  platform: 'all' | 'ios';
  deferAfterVoice: boolean;
  /** This short cue remains audible when spoken playback has the audio session. */
  mixWithVoice: boolean;
  /** This cue has its own native player and never preempts another SFX. */
  allowConcurrent: boolean;
}>;

const event = (
  source: number | null,
  volume: number,
  priority: number,
  cooldownMs: number,
  durationMs: number,
  family: SoundFamily,
  options: Partial<Pick<SoundEventDefinition, 'platform' | 'deferAfterVoice' | 'mixWithVoice' | 'allowConcurrent'>> = {},
): SoundEventDefinition => Object.freeze({
  source,
  volume,
  priority,
  cooldownMs,
  durationMs,
  family,
  platform: options.platform ?? 'all',
  deferAfterVoice: options.deferAfterVoice ?? false,
  mixWithVoice: options.mixWithVoice ?? false,
  allowConcurrent: options.allowConcurrent ?? false,
});

export const SOUND_EVENTS = Object.freeze({
  // зачем: тёплое приветствие сразу после онбординга (handleOnboardingDone в
  // app/_layout.tsx). "Один раз за жизнь аккаунта" НЕ через cooldown — арбитр
  // живёт только в памяти процесса и обнулится при перезапуске приложения;
  // однократность гарантирует вызывающий код через AsyncStorage-флаг, как
  // introShownRaw/onboarding_done. Cooldown здесь — обычная защита от
  // случайного даблтапа/гонки, не суррогат персистентности.
  'pm.app.welcome': event(require('../../assets/audio/sfx/v1/app/pm_app_welcome_v1.m4a'), 0.40, 65, 8000, 2300, 'app'),

  // зачем 2026-08-30: файл заменён на выбор раунда 5 (маримба, вариант B);
  // durationMs — честная длина нового файла с естественным хвостом. Звук
  // allowConcurrent: хвосты соседних верных ответов накладываются как удары
  // настоящей маримбы, слот арбитра не держится.
  'pm.learn.correct': event(require('../../assets/audio/sfx/v1/learning/pm_learn_correct_v1.m4a'), 0.42, 70, 160, 2000, 'learning', { mixWithVoice: true, allowConcurrent: true }),
  'pm.learn.needs_work': event(require('../../assets/audio/sfx/v1/learning/pm_learn_needs_work_v1.m4a'), 0.28, 68, 220, 320, 'learning'),
  // pm.learn.hint_reveal УДАЛЁН НАВСЕГДА (владелец 2026-08-30, раунд 5:
  // «ни один — не надо их вообще»). Подсказка раскрывается без звука, haptic
  // остаётся. Не возвращать и не перегенерировать.
  // зачем 2026-08-03 (владелец: «тики звучат непонятно как — то в середине
  // раунда, то в конце»): кулдаун 1200 мс был ДЛИННЕЕ секундного шага отсчёта
  // и глотал каждый второй тик — 5-3-1 вместо 5-4-3-2-1 в турнире, «3…1» без
  // «2» в арене. 700 мс: секундная каденция проходит целиком, а дребезг
  // повторных запросов внутри одной секунды по-прежнему схлопывается.
  'pm.learn.timer_warning': event(require('../../assets/audio/sfx/v1/learning/pm_learn_timer_warning_v1.m4a'), 0.34, 62, 700, 240, 'learning'),
  'pm.learn.timer_expired': event(require('../../assets/audio/sfx/v1/learning/pm_learn_timer_expired_v1.m4a'), 0.32, 66, 700, 420, 'learning'),
  // зачем: собранный «вдох» на старте теста/экзамена — до первого вопроса,
  // приоритет ниже обычных learning-сигналов (это атмосфера, не вердикт).
  // Однократность на попытку держит вызывающий код (mount-once), cooldown —
  // только защита от гонки/двойного mount, не суррогат персистентности.
  'pm.exam.begin': event(require('../../assets/audio/sfx/v1/learning/pm_exam_begin_v1.m4a'), 0.20, 30, 4000, 1000, 'learning'),
  // зачем: тихая атмосферная подложка под уже существующий header-fade интро
  // урока (app/lesson_intro_screens.tsx). Однократность на lessonId держит
  // dedupeKey в вызове; cooldown — только защита от двойного mount подряд.
  // зачем 2026-08-30: файл заменён на выбор раунда 5 (арфа, вариант B).
  'pm.lesson.begin': event(require('../../assets/audio/sfx/v1/learning/pm_lesson_begin_v1.m4a'), 0.18, 20, 4000, 2960, 'learning'),

  'pm.voice.record_ready': event(require('../../assets/audio/sfx/v1/voice/pm_voice_record_ready_v1.m4a'), 0.40, 95, 450, 220, 'voice', { platform: 'ios' }),
  'pm.voice.turn_ready': event(require('../../assets/audio/sfx/v1/voice/pm_voice_turn_ready_v1.m4a'), 0.34, 82, 700, 300, 'voice'),
  'pm.voice.no_speech': event(require('../../assets/audio/sfx/v1/voice/pm_voice_no_speech_v1.m4a'), 0.27, 78, 800, 380, 'voice'),

  'pm.complete.micro': event(require('../../assets/audio/sfx/v1/completion/pm_complete_micro_v1.m4a'), 0.46, 74, 1800, 780, 'completion'),
  'pm.complete.session': event(require('../../assets/audio/sfx/v1/completion/pm_complete_session_v1.m4a'), 0.52, 80, 3000, 1100, 'completion'),
  // зачем 2026-08-30: файл заменён на выбор раунда 5 (маримба+арфа, вариант B).
  'pm.complete.perfect': event(require('../../assets/audio/sfx/v1/completion/pm_complete_perfect_v1.m4a'), 0.58, 86, 5000, 3000, 'completion'),
  'pm.complete.exam_pass': event(require('../../assets/audio/sfx/v1/completion/pm_complete_exam_pass_v1.m4a'), 0.60, 90, 6000, 1650, 'completion'),
  'pm.complete.exam_retry': event(require('../../assets/audio/sfx/v1/completion/pm_complete_exam_retry_v1.m4a'), 0.34, 72, 2500, 920, 'completion'),
  'pm.complete.star_1': event(require('../../assets/audio/sfx/v1/completion/pm_complete_star_1_v1.m4a'), 0.38, 74, 180, 340, 'completion'),
  'pm.complete.star_2': event(require('../../assets/audio/sfx/v1/completion/pm_complete_star_2_v1.m4a'), 0.40, 75, 180, 380, 'completion'),
  'pm.complete.star_3': event(require('../../assets/audio/sfx/v1/completion/pm_complete_star_3_v1.m4a'), 0.44, 78, 220, 480, 'completion'),
  'pm.complete.star_3_perfect': event(require('../../assets/audio/sfx/v1/completion/pm_complete_star_3_perfect_v1.m4a'), 0.46, 80, 500, 800, 'completion'),
  'pm.complete.xp_counter_start': event(require('../../assets/audio/sfx/v1/completion/pm_complete_xp_counter_start_v1.m4a'), 0.30, 62, 900, 450, 'completion'),
  'pm.complete.xp_counter_tick': event(require('../../assets/audio/sfx/v1/completion/pm_complete_xp_counter_tick_v1.m4a'), 0.20, 48, 140, 1000, 'completion'),
  'pm.complete.xp_counter_complete': event(require('../../assets/audio/sfx/v1/completion/pm_complete_xp_counter_complete_v1.m4a'), 0.42, 82, 900, 900, 'completion'),
  'pm.complete.active_reward_reveal': event(require('../../assets/audio/sfx/v1/completion/pm_complete_active_reward_reveal_v1.m4a'), 0.38, 76, 1200, 1100, 'completion'),
  'pm.complete.active_gift_unlock': event(require('../../assets/audio/sfx/v1/completion/pm_complete_active_gift_unlock_v1.m4a'), 0.42, 80, 1200, 1300, 'completion'),
  'pm.complete.multiplier_reveal': event(require('../../assets/audio/sfx/v1/completion/pm_complete_multiplier_reveal_v1.m4a'), 0.40, 78, 1200, 1500, 'completion'),
  'pm.complete.multiplier_upgrade': event(require('../../assets/audio/sfx/v1/completion/pm_complete_multiplier_upgrade_v1.m4a'), 0.44, 82, 1200, 1500, 'completion'),
  'pm.complete.rewards_finale': event(require('../../assets/audio/sfx/v1/completion/pm_complete_rewards_finale_v1.m4a'), 0.46, 84, 1500, 1800, 'completion'),

  'pm.system.success': event(require('../../assets/audio/sfx/v1/system/pm_system_success_v1.m4a'), 0.34, 58, 1600, 520, 'system', { deferAfterVoice: true }),
  'pm.system.info': event(require('../../assets/audio/sfx/v1/system/pm_system_info_v1.m4a'), 0.28, 44, 1800, 420, 'system', { deferAfterVoice: true }),
  'pm.system.warning': event(require('../../assets/audio/sfx/v1/system/pm_system_warning_v1.m4a'), 0.34, 72, 2200, 560, 'system'),
  'pm.system.error_recoverable': event(require('../../assets/audio/sfx/v1/system/pm_system_error_recoverable_v1.m4a'), 0.30, 76, 1800, 480, 'system'),
  'pm.system.destructive_done': event(require('../../assets/audio/sfx/v1/system/pm_system_destructive_done_v1.m4a'), 0.34, 84, 2500, 580, 'system'),

  'pm.energy.empty': event(require('../../assets/audio/sfx/v1/energy/pm_energy_empty_v1.m4a'), 0.32, 73, 5000, 620, 'energy'),
  'pm.energy.refilled': event(require('../../assets/audio/sfx/v1/energy/pm_energy_refilled_v1.m4a'), 0.42, 70, 3000, 720, 'energy'),
  'pm.streak.saved': event(require('../../assets/audio/sfx/v1/streak/pm_streak_saved_v1.m4a'), 0.54, 84, 5000, 1080, 'streak'),

  'pm.reward.small': event(require('../../assets/audio/sfx/v1/reward/pm_reward_small_v1.m4a'), 0.42, 64, 1800, 720, 'reward', { deferAfterVoice: true }),
  'pm.reward.collectible': event(require('../../assets/audio/sfx/v1/reward/pm_reward_collectible_v1.m4a'), 0.54, 82, 4500, 1180, 'reward'),
  'pm.reward.achievement': event(require('../../assets/audio/sfx/v1/reward/pm_reward_achievement_v1.m4a'), 0.55, 84, 4500, 1120, 'reward'),
  'pm.reward.level_up': event(require('../../assets/audio/sfx/v1/reward/pm_reward_level_up_v1.m4a'), 0.58, 88, 5500, 1350, 'reward'),
  'pm.reward.chest_open': event(require('../../assets/audio/sfx/v1/reward/pm_reward_chest_open_v1.m4a'), 0.58, 86, 4500, 1420, 'reward'),
  'pm.reward.premium_open': event(require('../../assets/audio/sfx/v1/reward/pm_reward_premium_open_v1.m4a'), 0.60, 94, 8000, 1450, 'reward'),
  'pm.reward.premium_finale': event(require('../../assets/audio/sfx/v1/reward/pm_reward_premium_finale_v1.m4a'), 0.62, 95, 8000, 1650, 'reward'),
  'pm.reward.vip_open': event(require('../../assets/audio/sfx/v1/reward/pm_reward_vip_open_v1.m4a'), 0.62, 96, 10000, 1550, 'reward'),
  'pm.reward.vip_finale': event(null, 0.64, 97, 10000, 1850, 'reward'),

  // ─── Празднование покупки v6 «Золотая палата» (владелец 2026-08-24) ───
  // зачем: у каждой сцены СВОЙ звук — иначе одиннадцать разных механик звучат
  // одинаково и превращаются в шум. Тайминги атак (карты ударов) описаны в
  // docs/design/CELEBRATION_SOUND_PROMPTS.md и продублированы в sound_motion.ts.
  // Все 16 звуков сгенерированы и подключены (2026-08-25, включая фоновую
  // подложку background_bed). Громкости идут волнами (сцены 1, 4 и 8
  // заметнее) — правило усталости уха.
  'pm.celebration.open_rift': event(require('../../assets/audio/sfx/v1/celebration/cel_open_rift_v1.m4a'), 0.62, 96, 6000, 1450, 'reward'),
  'pm.celebration.energy_break': event(require('../../assets/audio/sfx/v1/celebration/cel_energy_break_v1.m4a'), 0.50, 90, 2000, 1210, 'reward'),
  'pm.celebration.locks_off': event(require('../../assets/audio/sfx/v1/celebration/cel_locks_off_v1.m4a'), 0.44, 90, 2000, 780, 'reward'),
  'pm.celebration.cards_stack': event(require('../../assets/audio/sfx/v1/celebration/cel_cards_stack_v1.m4a'), 0.44, 90, 2000, 1100, 'reward'),
  'pm.celebration.dialog_spark': event(require('../../assets/audio/sfx/v1/celebration/cel_dialog_spark_v1.m4a'), 0.50, 90, 2000, 900, 'reward'),
  'pm.celebration.voice_score': event(require('../../assets/audio/sfx/v1/celebration/cel_voice_score_v1.m4a'), 0.46, 90, 2000, 1170, 'reward'),
  'pm.celebration.coach_heal': event(require('../../assets/audio/sfx/v1/celebration/cel_coach_heal_v1.m4a'), 0.42, 90, 2000, 1180, 'reward'),
  'pm.celebration.error_fix': event(require('../../assets/audio/sfx/v1/celebration/cel_error_fix_v1.m4a'), 0.44, 90, 2000, 1180, 'reward'),
  'pm.celebration.plan_route': event(require('../../assets/audio/sfx/v1/celebration/cel_plan_route_v1.m4a'), 0.50, 90, 2000, 1060, 'reward'),
  'pm.celebration.stats_rise': event(require('../../assets/audio/sfx/v1/celebration/cel_stats_rise_v1.m4a'), 0.44, 90, 2000, 1040, 'reward'),
  'pm.celebration.streak_shield': event(require('../../assets/audio/sfx/v1/celebration/cel_streak_shield_v1.m4a'), 0.52, 90, 2000, 1000, 'reward'),
  'pm.celebration.aura_bloom': event(require('../../assets/audio/sfx/v1/celebration/cel_aura_bloom_v1.m4a'), 0.48, 90, 2000, 1030, 'reward'),
  'pm.celebration.max_awaken': event(require('../../assets/audio/sfx/v1/celebration/cel_max_awaken_v1.m4a'), 0.60, 92, 4000, 2200, 'reward'),
  'pm.celebration.finale_chord': event(require('../../assets/audio/sfx/v1/celebration/cel_finale_chord_v1.m4a'), 0.64, 96, 6000, 1600, 'reward'),
  'pm.celebration.promo_stamp': event(require('../../assets/audio/sfx/v1/celebration/cel_promo_stamp_v1.m4a'), 0.56, 94, 4000, 850, 'reward'),
  // зачем (владелец 2026-08-25): «на фон надо мелодию какую-то» — точечные
  // удары сцен звучат разрозненно без общей тёплой подложки под всем
  // прогоном. Один файл на ~12 с (длиннее самого долгого прогона — MAX 11.3с)
  // со встроенным fade-in/fade-out, ОДИН на все тиры (не дублировать под
  // Plus/Pro/MAX — своя мелодия на тир была бы избыточна, а MAX уже имеет
  // отдельный акцент в cel_max_awaken). Громкость 0.13 — сильно тише точечных
  // ударов (0.42-0.64), не спорит с ними. Не проигрывается системой событий
  // sound_director (та рассчитана на короткие дискретные сигналы с cooldown) —
  // запускается/останавливается напрямую в PremiumCelebrationModal через
  // expo-audio, см. celebrationBackgroundPlayer.ts.
  'pm.celebration.background_bed': event(require('../../assets/audio/sfx/v1/celebration/cel_background_bed_v1.m4a'), 0.13, 10, 0, 12000, 'reward'),
  // зачем: лёгкое предвкушение на входе в экран распаковки, ДО первого флипа —
  // не путать с финальным pack_complete (тот громче и играет один раз в конце).
  // Однократность на mount экрана держит вызывающий код; cooldown — защита от
  // двойного mount, не суррогат персистентности.
  'pm.reward.pack_reveal_start': event(require('../../assets/audio/sfx/v1/reward/pm_reward_pack_reveal_start_v1.m4a'), 0.20, 25, 4000, 1000, 'reward'),
  // зачем: финальный аккорд, когда перевёрнута последняя карточка пака —
  // конфетти уже есть визуально, звука к нему не было.
  'pm.reward.pack_complete': event(require('../../assets/audio/sfx/v1/reward/pm_reward_pack_complete_v1.m4a'), 0.50, 80, 3000, 1000, 'reward'),

  // Level Spin is a short, authored sequence. Each cue has a separate asset so
  // visual phase changes can trigger it exactly instead of relying on timers.
  'pm.spin.button_press': event(require('../../assets/audio/sfx/v1/spin/pm_spin_button_press_v1.m4a'), 0.32, 42, 0, 1000, 'reward'),
  'pm.spin.reel_start': event(require('../../assets/audio/sfx/v1/spin/pm_spin_reel_start_v1.m4a'), 0.44, 70, 0, 1000, 'reward'),
  'pm.spin.reel_loop': event(require('../../assets/audio/sfx/v1/spin/pm_spin_reel_loop_v1.m4a'), 0.28, 74, 0, 2000, 'reward'),
  'pm.spin.reel_stop_rollback': event(require('../../assets/audio/sfx/v1/spin/pm_spin_reel_stop_rollback_v1.m4a'), 0.52, 90, 0, 1200, 'reward'),
  'pm.spin.reward_lock': event(require('../../assets/audio/sfx/v1/spin/pm_spin_reward_lock_v1.m4a'), 0.48, 92, 0, 2000, 'reward'),
  'pm.spin.reward_win': event(require('../../assets/audio/sfx/v1/spin/pm_spin_reward_win_v1.m4a'), 0.54, 94, 0, 2000, 'reward'),
  'pm.spin.reward_rare': event(require('../../assets/audio/sfx/v1/spin/pm_spin_reward_rare_v1.m4a'), 0.58, 95, 0, 2000, 'reward'),
  'pm.spin.reward_premium': event(require('../../assets/audio/sfx/v1/spin/pm_spin_reward_premium_v1.m4a'), 0.62, 96, 0, 2000, 'reward'),

  'pm.league.promoted': event(require('../../assets/audio/sfx/v1/league/pm_league_promoted_v1.m4a'), 0.64, 94, 8000, 1620, 'league'),
  'pm.league.demoted': event(require('../../assets/audio/sfx/v1/league/pm_league_demoted_v1.m4a'), 0.36, 80, 6000, 980, 'league'),
  'pm.social.gift_received': event(require('../../assets/audio/sfx/v1/social/pm_social_gift_received_v1.m4a'), 0.48, 72, 3000, 880, 'social', { deferAfterVoice: true }),
  'pm.social.friend_request': event(require('../../assets/audio/sfx/v1/social/pm_social_friend_request_v1.m4a'), 0.36, 60, 2500, 540, 'social', { deferAfterVoice: true }),
  'pm.social.quest_complete': event(require('../../assets/audio/sfx/v1/social/pm_social_quest_complete_v1.m4a'), 0.52, 80, 4500, 1020, 'social', { deferAfterVoice: true }),
  // зачем: лёгкий сигнал «теперь вы друзья» на стороне того, кто принял
  // заявку — не путать с friend_request (входящая заявка).
  'pm.social.friend_added': event(require('../../assets/audio/sfx/v1/social/pm_social_friend_added_v1.m4a'), 0.30, 55, 2000, 1000, 'social', { deferAfterVoice: true }),
  /**
   * Звуки Арены.
   *
   * 2026-08-30, раунд 5 (живые инструменты): владелец выбрал ШЕСТЬ звуков —
   * они подключены ниже. Остальные события помечены «ОТВЕРГНУТО» — владелец
   * отметил «ни один» со словами «не надо их вообще»: эти места остаются
   * немыми НАВСЕГДА, файлы к ним не генерировать и не подключать. `star_land`
   * владелец не отметил вовсе — оставлен немым до отдельного решения.
   * Источник null директор пропускает молча, вызовы на экранах живут и ничего
   * не ломают.
   *
   * Числа зеркалятся с `modules/arena/sound_catalog.ts`, тест
   * `arena_sound_catalog` падает при первом же расхождении.
   */
  'pm.arena.search_start': event(require('../../assets/audio/sfx/v1/arena/ar_search_start_v1.m4a'), 0.35, 55, 600, 2000, 'arena'),
  // зачем: единственный луп Арены — файл 3с бесшовный, повторный запрос идёт
  // интервалом из arena_matchmaking (см. там), cooldown 1800 гасит дребезг.
  'pm.arena.search_loop': event(require('../../assets/audio/sfx/v1/arena/ar_search_loop_v1.m4a'), 0.12, 20, 1800, 3000, 'arena'),
  'pm.arena.opponent_found': event(null, 0.6, 78, 1500, 700, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.countdown_tick': event(require('../../assets/audio/sfx/v1/arena/ar_countdown_tick_v1.m4a'), 0.34, 62, 700, 200, 'arena'),
  'pm.arena.countdown_go': event(require('../../assets/audio/sfx/v1/arena/ar_countdown_go_v1.m4a'), 0.55, 74, 1200, 1390, 'arena'),
  'pm.arena.task_in': event(null, 0.24, 40, 500, 260, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.option_tap': event(null, 0.2, 30, 60, 120, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.answer_correct': event(null, 0.42, 70, 160, 380, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.answer_first': event(null, 0.48, 72, 160, 460, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.answer_wrong': event(null, 0.28, 68, 220, 320, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.opponent_answered': event(null, 0.22, 45, 400, 200, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.timer_tick': event(null, 0.3, 60, 700, 140, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.timeout': event(null, 0.34, 66, 500, 420, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.combo_start': event(null, 0.38, 64, 600, 420, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.combo_up': event(null, 0.4, 65, 300, 380, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.combo_break': event(null, 0.26, 58, 600, 340, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.pair_match': event(null, 0.34, 66, 80, 180, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.pair_miss': event(null, 0.24, 62, 120, 200, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.pair_clear': event(null, 0.46, 74, 800, 520, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.result_win': event(require('../../assets/audio/sfx/v1/arena/ar_result_win_v1.m4a'), 0.55, 90, 2000, 1400, 'arena'),
  'pm.arena.result_loss': event(require('../../assets/audio/sfx/v1/arena/ar_result_loss_v1.m4a'), 0.38, 90, 2000, 1200, 'arena'),
  'pm.arena.result_draw': event(require('../../assets/audio/sfx/v1/arena/ar_result_draw_v1.m4a'), 0.42, 90, 2000, 2480, 'arena'),
  'pm.arena.star_fly': event(null, 0.26, 50, 70, 240, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.star_land': event(null, 0.34, 56, 90, 260, 'arena'), // не отмечен владельцем в раунде 5
  'pm.arena.goal_complete': event(null, 0.44, 76, 1500, 700, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.reward_unlock': event(null, 0.5, 84, 1500, 900, 'arena'), // ОТВЕРГНУТО 2026-08-30
  'pm.arena.rank_up': event(require('../../assets/audio/sfx/v1/arena/ar_rank_up_v1.m4a'), 0.55, 88, 2000, 3000, 'arena'),
  'pm.arena.rank_down': event(require('../../assets/audio/sfx/v1/arena/ar_rank_down_v1.m4a'), 0.34, 82, 2000, 2480, 'arena'),

  // Карточки. Файлы сгенерированы владельцем через Firefly
  // по промптам docs/sound/SOUND_PROMPTS_FULL.md (редакция 3).
  'pm.cards.editor_delete': event(require('../../assets/audio/sfx/v1/cards/pm_cards_editor_delete_v1.m4a'), 0.30, 58, 800, 600, 'cards'),
  'pm.cards.editor_save': event(require('../../assets/audio/sfx/v1/cards/pm_cards_editor_save_v1.m4a'), 0.34, 60, 800, 800, 'cards'),
  'pm.cards.flip': event(require('../../assets/audio/sfx/v1/cards/pm_cards_flip_v1.m4a'), 0.26, 34, 90, 280, 'cards'),
  'pm.cards.pack_created': event(require('../../assets/audio/sfx/v1/cards/pm_cards_pack_created_v1.m4a'), 0.44, 78, 3000, 1200, 'cards'),
  'pm.cards.pack_open': event(require('../../assets/audio/sfx/v1/cards/pm_cards_pack_open_v1.m4a'), 0.28, 56, 800, 700, 'cards'),
  'pm.cards.swipe_know': event(require('../../assets/audio/sfx/v1/cards/pm_cards_swipe_know_v1.m4a'), 0.30, 46, 120, 320, 'cards'),
  'pm.cards.swipe_learn': event(require('../../assets/audio/sfx/v1/cards/pm_cards_swipe_learn_v1.m4a'), 0.26, 42, 120, 340, 'cards'),

  // Покупки, подписка и пейволы. Файлы сгенерированы владельцем через Firefly
  // по промптам docs/sound/SOUND_PROMPTS_FULL.md (редакция 3).
  'pm.billing.issue': event(require('../../assets/audio/sfx/v1/commerce/pm_billing_issue_v1.m4a'), 0.32, 74, 800, 900, 'commerce'),
  'pm.paywall.plan_select': event(require('../../assets/audio/sfx/v1/commerce/pm_paywall_plan_select_v1.m4a'), 0.26, 44, 160, 400, 'commerce'),
  'pm.paywall.trial_highlight': event(require('../../assets/audio/sfx/v1/commerce/pm_paywall_trial_highlight_v1.m4a'), 0.30, 52, 800, 700, 'commerce'),
  'pm.premium.modal_open': event(require('../../assets/audio/sfx/v1/commerce/pm_premium_modal_open_v1.m4a'), 0.28, 50, 800, 1000, 'commerce'),
  'pm.promo.code_applied': event(require('../../assets/audio/sfx/v1/commerce/pm_promo_code_applied_v1.m4a'), 0.44, 82, 3000, 1100, 'commerce'),
  'pm.promo.code_rejected': event(require('../../assets/audio/sfx/v1/commerce/pm_promo_code_rejected_v1.m4a'), 0.28, 70, 800, 600, 'commerce'),
  'pm.purchase.failed': event(require('../../assets/audio/sfx/v1/commerce/pm_purchase_failed_v1.m4a'), 0.30, 76, 800, 700, 'commerce'),
  'pm.purchase.restored': event(require('../../assets/audio/sfx/v1/commerce/pm_purchase_restored_v1.m4a'), 0.38, 74, 800, 1000, 'commerce'),
  'pm.purchase.start': event(require('../../assets/audio/sfx/v1/commerce/pm_purchase_start_v1.m4a'), 0.32, 66, 800, 600, 'commerce'),
  'pm.subscription.manage_open': event(require('../../assets/audio/sfx/v1/commerce/pm_subscription_manage_open_v1.m4a'), 0.22, 36, 800, 800, 'commerce', { deferAfterVoice: true }),

  // Диалоги с ИИ. Файлы сгенерированы владельцем через Firefly
  // по промптам docs/sound/SOUND_PROMPTS_FULL.md (редакция 3).
  'pm.dialog.reply_in': event(require('../../assets/audio/sfx/v1/dialog/pm_dialog_reply_in_v1.m4a'), 0.20, 38, 250, 350, 'dialog', { deferAfterVoice: true }),
  'pm.dialog.reply_sent': event(require('../../assets/audio/sfx/v1/dialog/pm_dialog_reply_sent_v1.m4a'), 0.22, 34, 200, 300, 'dialog', { deferAfterVoice: true }),
  'pm.dialog.retry': event(require('../../assets/audio/sfx/v1/dialog/pm_dialog_retry_v1.m4a'), 0.32, 66, 800, 900, 'dialog', { deferAfterVoice: true }),
  'pm.dialog.victory': event(require('../../assets/audio/sfx/v1/dialog/pm_dialog_victory_v1.m4a'), 0.54, 88, 5000, 1800, 'dialog'),

  // Магазин и валюты. Файлы сгенерированы владельцем через Firefly
  // по промптам docs/sound/SOUND_PROMPTS_FULL.md (редакция 3).
  'pm.shards.earned': event(require('../../assets/audio/sfx/v1/economy/pm_shards_earned_v1.m4a'), 0.44, 70, 1200, 900, 'economy'),
  'pm.shop.open': event(require('../../assets/audio/sfx/v1/economy/pm_shop_open_v1.m4a'), 0.26, 40, 800, 1000, 'economy', { deferAfterVoice: true }),

  // MAX — голосовой звонок. Файлы сгенерированы владельцем через Firefly
  // по промптам docs/sound/SOUND_PROMPTS_FULL.md (редакция 3).
  'pm.max.call_connect': event(require('../../assets/audio/sfx/v1/max/pm_max_call_connect_v1.m4a'), 0.34, 72, 800, 800, 'max'),
  'pm.max.call_end': event(require('../../assets/audio/sfx/v1/max/pm_max_call_end_v1.m4a'), 0.32, 68, 800, 1100, 'max'),
  'pm.max.consent_granted': event(require('../../assets/audio/sfx/v1/max/pm_max_consent_granted_v1.m4a'), 0.30, 56, 800, 800, 'max', { deferAfterVoice: true }),
  'pm.max.prestart_ready': event(require('../../assets/audio/sfx/v1/max/pm_max_prestart_ready_v1.m4a'), 0.26, 48, 800, 900, 'max', { deferAfterVoice: true }),
  'pm.max.review_open': event(require('../../assets/audio/sfx/v1/max/pm_max_review_open_v1.m4a'), 0.30, 52, 800, 1200, 'max', { deferAfterVoice: true }),

  // Профиль и достижения. Файлы сгенерированы владельцем через Firefly
  // по промптам docs/sound/SOUND_PROMPTS_FULL.md (редакция 3).
  'pm.achievements.open': event(require('../../assets/audio/sfx/v1/profile/pm_achievements_open_v1.m4a'), 0.28, 46, 800, 1100, 'profile', { deferAfterVoice: true }),

  // ─── Новые звуки, одобренные владельцем 2026-08-28 ───
  // зачем: полёт рун, нажатия, сердечки, трата энергии, покупка и примерка
  // образа раньше проходили молча. Файлы отобраны владельцем на слух из трёх
  // вариантов каждый; у всех сделан мягкий уход в тишину, чтобы не было
  // обрубка на конце (прямое требование владельца).

  // Полёт руны к счётчику: старт — тихий (0.22), приземление слышнее (0.34).
  // Кулдаун 0 у полёта: руны стартуют пачкой по 1-3 штуки с шагом 90 мс,
  // любой кулдаун проглотил бы вторую и третью.
  'pm.reward.rune_flight_start': event(require('../../assets/audio/sfx/v1/reward/pm_rune_flight_start_v1.m4a'), 0.22, 40, 0, 500, 'reward', { mixWithVoice: true, allowConcurrent: true }),
  'pm.reward.rune_flight_land': event(require('../../assets/audio/sfx/v1/reward/pm_rune_flight_land_v1.m4a'), 0.34, 52, 0, 300, 'reward', { mixWithVoice: true, allowConcurrent: true }),
  // Тик перекрутки счётчика НЕ объявлен: в приложении цифра баланса меняется
  // мгновенно, без анимации счёта (проверено 2026-08-28 — в PracticeRuneCounter
  // и RuneBalanceChip анимируется только пульс, не число). Ставить тик некуда.
  // Файл лежит в assets/audio/sfx/v1/reward/pm_rune_count_tick_v1.m4a на случай,
  // если перекрутку добавят:
  //   'pm.reward.rune_count_tick': event(require('../../assets/audio/sfx/v1/reward/pm_rune_count_tick_v1.m4a'), 0.16, 30, 0, 200, 'reward'),
  'pm.reward.rune_count_done': event(require('../../assets/audio/sfx/v1/reward/pm_rune_count_done_v1.m4a'), 0.40, 60, 800, 800, 'reward'),

  // Нажатия. Громкость намеренно низкая: звучат чаще всего остального.
  'pm.ui.tap_soft': event(require('../../assets/audio/sfx/v1/ui/pm_tap_soft_v1.m4a'), 0.12, 12, 40, 200, 'ui'),
  'pm.ui.tap_primary': event(require('../../assets/audio/sfx/v1/ui/pm_tap_primary_v1.m4a'), 0.14, 16, 40, 250, 'ui'),
  // зачем 2026-08-30: вежливый отказ на тап по заблокированному (выбор
  // раунда 5, маримба A, 146мс). Низкая ясная нота вместо глухого стука —
  // урок двух отвергнутых раундов.
  'pm.ui.tap_blocked': event(require('../../assets/audio/sfx/v1/ui/pm_tap_blocked_v1.m4a'), 0.16, 30, 300, 150, 'ui'),

  // зачем 2026-08-30: шаг онбординга пройден (выбор раунда 5, калимба B).
  // Частый в первые минуты жизни аккаунта, поэтому тихий и с большим
  // приоритетом ниже learning-сигналов.
  'pm.onboarding.step': event(require('../../assets/audio/sfx/v1/app/pm_onboarding_step_v1.m4a'), 0.22, 28, 150, 2000, 'app'),

  'pm.energy.spend': event(require('../../assets/audio/sfx/v1/energy/pm_energy_spend_v1.m4a'), 0.26, 44, 300, 300, 'energy'),

  // зачем: механика сердечек СУЩЕСТВУЕТ — это система попыток session_attempts
  // (SESSION_ATTEMPTS_MAX=3, HUD на 10 экранах: flashcards_*, learning-v2,
  // lesson1, lesson_words, mistake_practice…). Вывод 2026-08-28 «механики нет»
  // был ошибкой поиска: искали heartsLeft/loseHeart/livesLeft, а имена другие.
  // Файлы одобрены владельцем на слух (choices_final: оба «a»), вызовы живут в
  // components/session_attempts/SessionAttemptsHud.tsx — одна точка покрывает
  // все экраны (потеря = remaining упал, восстановление = вырос).
  'pm.hearts.lost': event(require('../../assets/audio/sfx/v1/hearts/pm_heart_lost_v1.m4a'), 0.30, 64, 400, 500, 'hearts'),
  'pm.hearts.restored': event(require('../../assets/audio/sfx/v1/hearts/pm_hearts_restored_v1.m4a'), 0.48, 78, 2000, 1200, 'hearts'),

  // Успешная покупка: до этого был только звук отказа и старта, самого
  // подтверждения покупки не звучало.
  'pm.purchase.success': event(require('../../assets/audio/sfx/v1/commerce/pm_purchase_success_v1.m4a'), 0.50, 84, 1500, 600, 'commerce'),
  'pm.customization.applied': event(require('../../assets/audio/sfx/v1/commerce/pm_customization_applied_v1.m4a'), 0.38, 62, 800, 550, 'commerce'),

});

export type SoundEventId = keyof typeof SOUND_EVENTS;
