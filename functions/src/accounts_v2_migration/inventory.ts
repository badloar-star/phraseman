/*
 * Account V2, Пакет 5 — явная таблица инвентаря полей старого аккаунта.
 *
 * зачем: миграция не имеет права «додумывать». Каждое поле старого документа
 * users/{uid} (корень, progress.*, подколлекции) получает одну судьбу:
 *   carry  — переносится в домен Account V2 (урок / карточка / библиотека);
 *   keep_in_place — остаётся в действующем хранилище 2.0 (решение Fable за
 *            владельца «домены вне ядра V2»): монеты/руны, серия, экзамены,
 *            достижения/статистика, открытые уроки. Не переносится и НИКОГДА
 *            не удаляется чисткой легаси (allowlist, report.ts → isKeepInPlacePath);
 *   carry_pending_domain — нет домена И нет решения: блокирует чистку
 *            (сейчас только SRS карточек наборов сообщества);
 *   drop   — отбрасывается ТОЛЬКО по записанному решению владельца: D-номер
 *            (docs/phraseman-2.0/03_DECISIONS.md) или OD-номер решения в чате
 *            (docs/work/tasks/account-v2-status-2026-09-30.md, «Решения владельца по миграции»);
 *   derive — права Plus: не копируются, берутся из системы покупок (ссылка);
 *   info   — домена нет и переносить нечего (no_v2_domain, счётчики):
 *            информационно, не блокирует перенос;
 *   hold   — решения нет или поле неизвестно: перенос стоит, путь в отчёте.
 * Первое совпавшее правило побеждает (порядок в массивах важен). Нет
 * совпадения — hold/unknown_field. Никакого Firebase, только чистые функции.
 * Источник форм ключей: app/cloud_sync.ts (SYNC_KEYS, FRENCH_TARGET_SYNC_KEYS),
 * app/target_storage_keys.ts (`<domain>_v2::<target>::<id>`), firestore.rules
 * (поля users/{uid}), functions/src/account_delete.ts (подколлекции).
 */

export type Disposition = 'carry' | 'keep_in_place' | 'carry_pending_domain' | 'drop' | 'derive' | 'info' | 'hold';
export const DISPOSITIONS: readonly Disposition[] = Object.freeze([
  'carry', 'keep_in_place', 'carry_pending_domain', 'drop', 'derive', 'info', 'hold',
] as const);
export type InventoryScope = 'root' | 'progress' | 'subcollection';
export type MigrationDomain = 'lesson_progress' | 'flashcard' | 'library_membership';

type Matcher = Readonly<{ exact?: readonly string[]; pattern?: RegExp }>;

/**
 * Пометка «перенесено, но в легаси остаётся» (ремонт после ревью, P2).
 * зачем: 2.0 до подключения клиента Account V2 (Пакет 6) читает перенесённые поля
 * из СТАРОГО места — оценки уроков (lesson_lock_system, медали, экзамены,
 * legacy_free_lesson_access), карточки/наборы/память свайпов (cloud_sync restore,
 * target_storage_keys), права Plus (premium*, access_projection). Удалить их =
 * закрыть уроки/экзамены и потерять карточки и Plus на новом устройстве.
 * Безопасный вариант по умолчанию: ВСЕ carry — carried_and_kept, ВСЕ derive —
 * derived_and_kept; чистка удаляет только drop. Снять пометку можно только
 * после переключения чтения 2.0 на Account V2.
 */
export type LegacyRetention = 'carried_and_kept' | 'derived_and_kept' | 'dropped_but_read';

/**
 * Отброшенное (drop), которое ещё ЧИТАЕТ живой код (ремонт №2 после повторного ревью, P2).
 * зачем: drop = «не переносить в Account V2», а не «стереть». Эти правила чистка
 * не трогает; список держит сторож cleanup_readers_guard.test.ts (поиск по app/,
 * components/, hooks/, modules/, functions/src): нашёлся читатель без пометки — красный,
 * пометка без читателя — тоже красный.
 */
// Проверено сторожем 2026-09-30: читатели — app/cloud_sync.ts (SYNC_KEYS всех полей progress ниже),
// app/(tabs)/home.tsx, app/shards_system.ts, app/cache_reset.ts, app/target_storage_keys.ts,
// functions/src/auth_identity.ts, auth_merge.ts, account_delete.ts, app/auth_provider.ts,
// app/(tabs)/settings.tsx, app/community_packs/packAuthorNames.ts и др.
const DROPPED_BUT_READ: ReadonlySet<string> = new Set<string>([
  'p.official_packs', 'p.xp_level', 'p.league', 'p.arena', 'p.pearls', 'p.spins_gifts_boosts', 'p.cosmetics', 'p.streak_freeze',
  'r.pearls', 'r.spins_gifts', 'r.stars_balance', 'r.login_service',
  's.pearls', 's.level_spins', 's.arena',
]);

export type InventoryRule = Readonly<{
  id: string;
  scope: InventoryScope;
  match: Matcher;
  disposition: Disposition;
  reason: string;
  decisions: readonly string[];
  domain?: MigrationDomain;
  /** Остаётся ли поле в старом users/{uid} после переноса (чистка его не удаляет). */
  retention?: LegacyRetention;
  note: string;
}>;

export type Classification = Readonly<{
  ruleId: string | null;
  disposition: Disposition;
  reason: string;
  decisions: readonly string[];
  domain?: MigrationDomain;
  retention?: LegacyRetention;
}>;

export type ProgressClassification = Classification & Readonly<{
  target: string;
  rawKey: string | null;
  lessonId?: number;
}>;

/**
 * Поля сохранённой (hooks/use-flashcards.ts → Flashcard) и своей
 * (app/flashcards/types.ts → CardItem) карточки. Другое поле — hold всей
 * карточки (план, Пакет 5: «останавливается на unknown card/SRS field»).
 */
export const SAVED_CARD_FIELDS = Object.freeze([
  'id', 'en', 'ru', 'uk', 'es', 'sourceLocales', 'description', 'transcription',
  'transcriptionEngineVersion', 'categoryId', 'isSystem', 'source', 'sourceId', 'sourceTitle',
  'studyTarget', 'origin', 'packLanguage', 'richSchemaVersion', 'exampleTarget', 'exampleSource',
  'note', 'sourceReferences', 'addedAt', 'literalRu', 'literalUk', 'literalEs', 'explanationRu',
  'explanationUk', 'explanationEs', 'exampleEn', 'exampleRu', 'exampleUk', 'exampleEs',
  'usageNoteRu', 'usageNoteUk', 'usageNoteEs', 'register', 'level', 'abbrevEn', 'expansionEn',
  // зачем (Account V2, 7E ремонт №1): время правки своей карточки / освежения после «Вернуть»
  // (клиент 7E). Без него перенос OD21 вставал бы в HOLD всего аккаунта (unknown_card_field).
  // Битое значение не держит аккаунт: поле снимается с карточки (dry_run.ts, informational).
  'updatedAt',
] as const);

/**
 * SRS-поля карточки (как ACCOUNTS_V2_SRS_FIELDS ядра). Решение владельца 9
 * (2026-09-30): старая память свайпов ПЕРЕНОСИТСЯ в поле `srs` карточки,
 * updatedAtMs — из старой записи (lastSeenAt); нет времени — HOLD записи.
 * Встроенные в старую карточку `srs`/`srsPolicy` переносятся, только если
 * уже несут updatedAtMs (иначе ядро отклонило бы всю операцию карточки).
 */
export const SRS_CARD_FIELDS = Object.freeze(['srs', 'srsPolicy'] as const);

const PLUS_NOTE = 'Права Plus проверяются в системе покупок (RevenueCat / access_projection), в Account V2 не копируются.';
// зачем (ремонт №1, P2): исполнитель прав Plus обязан знать, что эти права НЕ в
// access_projection, а в users/{uid}.progress — иначе вводный доступ и
// подарок лояльности пропадут при сверке только по подписке.
const PLUS_PROGRESS_NOTE = 'Вводный доступ (intro_*), подарок лояльности (loyalty_gift_*) и had_premium_ever лежат в users/{uid}.progress, '
  + 'а не в access_projection/RevenueCat: исполнитель прав Plus читает их оттуда. В Account V2 не копируются.';
const SRS_MEMORY_NOTE = 'Решение владельца 9: память свайпов → поле srs карточки (updatedAtMs = lastSeenAt); нет времени → HOLD записи.';

function rule(
  id: string, scope: InventoryScope, match: Matcher, disposition: Disposition, reason: string,
  decisions: readonly string[], note: string, domain?: MigrationDomain,
): InventoryRule {
  const retention: LegacyRetention | undefined = disposition === 'carry' ? 'carried_and_kept'
    : disposition === 'derive' ? 'derived_and_kept'
      : disposition === 'drop' && DROPPED_BUT_READ.has(id) ? 'dropped_but_read' : undefined;
  return Object.freeze({
    id, scope, match: Object.freeze(match), disposition, reason, decisions: Object.freeze([...decisions]), note, domain, retention,
  });
}

// ─── progress.* (сырой ключ без области цели) ──────────────────────────────
const PROGRESS_RULES: readonly InventoryRule[] = [
  // зачем (координатор 22.10, решение 3): прогресс курса Learning V2 — число непрерывного начала и маски «пройдено/открыто»
  // (владелец 21.10 №8/№10). Курс уже живёт в хранилище 2.0 — переносить нечего; без правила оба ключа давали
  // hold unknown_field и перенос OD21 встал бы у каждого ученика курса.
  rule('p.learning_v2_course', 'progress', { exact: ['learning_v2_course_progress_sync_v1', 'learning_v2_course_masks_sync_v1'] },
    'keep_in_place', 'kept_in_v2_store', ['OD20'], 'Прогресс курса Learning V2 (число и маски) — остаётся на месте, перенос не блокирует.'),
  // carry — домены Account V2
  rule('p.lesson_best', 'progress', { pattern: /^lesson(\d{1,4})_best_score$/ }, 'carry', 'lesson_best_result', [],
    'Лучший результат урока (0–5). passed = score ≥ 2 — СТАРЫЙ порог открытия (40%): D121 «уже открытые уроки не закрываются». '
    + 'TEMP: шкала score 0–5 и формат entityId — решение этой сессии.', 'lesson_progress'),
  rule('p.saved_cards', 'progress', { exact: ['flashcards_v1'] }, 'carry', 'saved_cards', [],
    'Сохранённые карточки: документ главнее страниц (как restore в cloud_sync.ts).', 'flashcard'),
  rule('p.saved_cards_alias', 'progress', { exact: ['flashcards'] }, 'carry', 'saved_cards_legacy_alias', [],
    'Старый псевдоним: заполняет только пустой flashcards_v1 (EN).', 'flashcard'),
  rule('p.custom_cards', 'progress', { exact: ['custom_flashcards_v2'] }, 'carry', 'custom_cards', [],
    'Свои карточки пользователя.', 'flashcard'),
  rule('p.srs_memory', 'progress', { exact: ['flashcards_swipe_memory_v1'] }, 'carry', 'srs_memory', [], SRS_MEMORY_NOTE, 'flashcard'),
  rule('p.community_packs', 'progress', { exact: ['community_owned_pack_ids_v1'] }, 'carry', 'community_library', ['D68'],
    'Наборы сообщества остаются (D68 удаляет только официальные). Членство, не доказательство покупки.', 'library_membership'),
  // drop — решения владельца
  rule('p.official_packs', 'progress', { exact: ['flashcards_owned_packs_v1', 'flashcards_market_dev_owned_v1', 'flashcards_market_dev_active_pack_v1'] },
    'drop', 'official_packs_removed', ['D68'], 'Официальные наборы удалены вместе с разделом жемчуга, прежнее владение не восстанавливает.'),
  rule('p.xp_level', 'progress', { exact: ['user_total_xp', 'user_prev_xp', 'user_level', 'weekly_xp', 'weekly_xp_period_start', 'gift_xp_multiplier'] },
    'drop', 'xp_level_removed', ['D02', 'D90'], 'XP, уровень и недельный XP удалены; данные чистятся после релиза.'),
  rule('p.league', 'progress', { exact: ['week_points', 'week_points_v2'], pattern: /^(league|club)_(?!gift_free_boost)/ },
    'drop', 'league_removed', ['D90'], 'Лигу заменил Шпиль; данные лиг чистятся (D90).'),
  rule('p.arena', 'progress', { pattern: /^arena_/ }, 'drop', 'arena_removed', ['D10', 'D83', 'D90'], 'Арена, её сезоны и звёзды удалены.'),
  rule('p.pearls', 'progress', {
    exact: ['shards_one_time_events', 'shards_lifetime_earned_v1', 'shards_lifetime_spent_v1', 'achievement_shards_spent_total'],
    // guard-ok: таблица классификации для отчёта dry-run, баланс не пишется и не понижается.
    pattern: /^(lesson\d{1,4}_(words|irregular)_shards_granted|shards_topic_[A-Za-z0-9]+_granted)$/,
  }, 'drop', 'pearls_removed', ['D70', 'D84', 'D103'], 'Жемчуг (shards) удалён с остатками, без компенсации.'),
  // зачем (D51/D53, Q12 2026-10-01): компенсация неиспользованных подарков/спинов
  // считается ТОЛЬКО на телефоне из локальных ключей (app/gifts_to_coins_*), эти
  // серверные поля она не читает. Порядок: релиз 2.0 → миграция на телефоне
  // (WAL done + строка gifts_to_coins_migrations/{uid}) → лишь потом чистка D90.
  // Монеты лежат в stars/star_operations (r.runes_balance keep_in_place) и
  // этим drop не затрагиваются. DROPPED_BUT_READ держит поля от чистки report.ts.
  rule('p.spins_gifts_boosts', 'progress', {
    exact: ['level_reward_spin_balance', 'club_gift_free_boost_v1', 'chain_shield', 'login_bonus_v1'],
  }, 'drop', 'gifts_spins_boosts_removed', ['D09', 'D90'], 'Подарки, спины уровня, бусты, бонусы входа удалены.'),
  rule('p.cosmetics', 'progress', {
    exact: ['user_avatar_aura', 'custom_avatar_owned_v1', 'custom_avatar_gift_owned_v1', 'avatar_aura_owned_v1', 'avatar_aura_gift_owned_v1'],
  }, 'drop', 'cosmetics_removed', ['D102', 'D108'], 'Ауры и образы удалены целиком, включая купленные.'),
  // зачем (решение владельца 7): заморозка серии только у Plus (бесплатно), КУПЛЕННЫЕ
  // заморозки не переносятся. D101 удалял заморозку, D107 оставил её Plus — решение 7 сводит их.
  rule('p.streak_freeze', 'progress', { exact: ['streak_freeze'] }, 'drop', 'streak_freeze_plus_only', ['D101', 'D107'],
    'Решение владельца 7 (2026-09-30): заморозка серии только для Plus; купленные заморозки не переносятся.'),
  // derive — права Plus
  rule('p.plus_progress', 'progress', {
    exact: ['had_premium_ever', 'intro_access_until_ms', 'intro_access_granted_at_ms', 'loyalty_gift_until_ms', 'loyalty_gift_granted_at_ms',
      'intro_full_access_started_at_v1', 'intro_full_access_ends_at_v1'],
  }, 'derive', 'plus_entitlement_reference', [], PLUS_PROGRESS_NOTE),
  rule('p.plus', 'progress', {
    exact: ['premium_plan', 'premium_expiry', 'admin_premium_override', 'premium_admin_grant_at',
      'referral_vip_last_source', 'promo_vip_last_code', 'achievement_access_plus_paid_v1', 'achievement_access_pro_paid_v1'],
    pattern: /^(premium_rc_|vip_)/,
  }, 'derive', 'plus_entitlement_reference', [], PLUS_NOTE),
  // keep_in_place — решение 8 + решение Fable за владельца: остаются в хранилищах 2.0, не удаляются
  rule('p.lesson_access', 'progress', { exact: ['unlocked_lessons'] }, 'keep_in_place', 'kept_in_v2_store', ['D121', 'OD8'],
    'D121: уже открытые уроки не закрываются. Список остаётся в действующем хранилище 2.0 (решение Fable), чисткой не удаляется.'),
  rule('p.streak_days', 'progress', {
    exact: ['streak_count', 'last_active_date', 'streak_last_date', 'active_days_v1', 'premium_free_freeze_used'],
  }, 'keep_in_place', 'kept_in_v2_store', ['OD8'], 'Решение владельца 8: серия и активные дни остаются в хранилище 2.0.'),
  rule('p.exams', 'progress', { pattern: /^(level_exam_|lingman_|diagnostic_last)/ }, 'keep_in_place', 'kept_in_v2_store', ['OD8'],
    'Решение владельца 8: экзамены, сертификаты, диагностика остаются в хранилище 2.0.'),
  rule('p.achievements_stats', 'progress', {
    exact: ['achievements_state', 'daily_stats', 'user_stats_v1', 'stats_daily_breakdown_v1', 'helpful_error_reports_confirmed_v1'],
    pattern: /^(achievement_|phraseman_foreground_)/,
  }, 'keep_in_place', 'kept_in_v2_store', ['OD8'], 'Решение владельца 8: достижения и статистика остаются в хранилище 2.0.'),
  // hold — поле известно, решения по переносу нет (блокирует)
  rule('p.lesson_extras', 'progress', {
    pattern: /^lesson\d{1,4}_(pass_count|progress|listening_progress|words|theory_sections_seen.*|cellIndex|last_completed_at_v1|bonus_granted|preposition_progress.*|perfect_passes.*|pass_live)$/,
  }, 'hold', 'no_v2_field', [], 'В домене урока Account V2 только {passed, score}.'),
  // info — домена нет (no_v2_domain): информационно, не блокирует перенос (ремонт №1, P2)
  rule('p.lesson_access_markers', 'progress', {
    exact: ['legacy_free_lesson_cap_v1', 'legacy_free_lesson_migration_v1', 'last_opened_lesson'],
    pattern: /^lesson_unlock_repair_v\d+$/,
  }, 'info', 'no_v2_domain', ['D36', 'D122'], 'Технические маркеры доступа к урокам; сам список открытых — p.lesson_access.'),
  rule('p.srs_session_draft', 'progress', { exact: ['flashcards_swipe_session_draft_v1'] }, 'info', 'no_v2_domain', [],
    'Черновик текущей сессии свайпов (порядок карточек) — не память SRS.'),
  rule('p.referral_roulette', 'progress', { pattern: /^referral_spin/ }, 'info', 'no_v2_domain', ['D80', 'D99'],
    'Реферальная рулетка остаётся; домена в Account V2 нет.'),
  rule('p.themes', 'progress', { exact: ['owned_theme_modes_v1', 'grandfathered_theme_modes_v1'] }, 'info', 'no_v2_domain', ['D119'],
    'Темы бесплатны (D119), но решения удалить список нет.'),
  rule('p.pearl_survey', 'progress', { exact: ['shard_survey_last_at_ms'] }, 'hold', 'no_owner_decision', [], 'Метка опроса; решения нет.'),
  rule('p.collectibles', 'progress', { exact: ['collectibles_owned_v1', 'collectibles_state_v1', 'profile_card_level'] }, 'hold', 'no_owner_decision', [],
    'Коллекции и визитка; решения по переносу нет.'),
  rule('p.flashcards_misc', 'progress', {
    exact: ['community_owned_pack_titles_v1', 'flashcards_progress_v1'],
    pattern: /^flashcards_(pack_trial_gift|achievement_|delete_hint|swipe_hint)/,
  }, 'info', 'no_v2_domain', [], 'Заголовки наборов, курсор, подсказки.'),
  rule('p.profile_settings', 'progress', {
    exact: ['user_name', 'user_avatar', 'user_frame', 'onboarding_done', 'lang', 'app_lang', 'user_settings',
      'study_languages_started_v1', 'device_platform', 'app_version', 'friends_push_v1', 'friends_week_v1', 'friends_phrase_v1', 'energy_state'],
    pattern: /^(language_profile_v1::|irregular_verbs|personal_practice|resolved_personal_trainings|pos_mastery)/,
  }, 'info', 'no_v2_domain', [], 'Профиль, настройки, энергия, практика.'),
  rule('p.spire', 'progress', { exact: ['spire_week_v1'] }, 'info', 'no_v2_domain', [], 'Недельный прогресс Шпиля — серверный.'),
];

// ─── корень users/{uid} ────────────────────────────────────────────────────
const ROOT_RULES: readonly InventoryRule[] = [
  rule('r.plus', 'root', { exact: ['premium', 'premiumExpiry'] }, 'derive', 'plus_entitlement_reference', [], PLUS_NOTE),
  rule('r.pearls', 'root', { exact: ['shards', 'shards_updated_at_ms', 'shards_updated_op', 'shards_updated_reason', 'shards_admin_override_at'] },
    'drop', 'pearls_removed', ['D70', 'D84', 'D103'], 'Проекция баланса жемчуга.'),
  rule('r.spins_gifts', 'root', { exact: ['levelSpinServerState', 'levelSpinMergePending', 'chain_shield', 'gift_xp_multiplier', 'club_gift_free_boost_v1'] },
    'drop', 'gifts_spins_boosts_removed', ['D09', 'D90'], 'Спины уровня, щит, бусты.'),
  // зачем (решения владельца 6 и 10, D03): руны → монеты по курсу 1:1. Домена монет в
  // ядре Account V2 нет (ACCOUNTS_V2_ENTITY_TYPES: урок/карточка/библиотека) — сумма
  // идёт в отчёт (runesToCoins), поле ждёт домен; операций начисления не строим.
  rule('r.runes_balance', 'root', { exact: ['stars'] }, 'keep_in_place', 'coins_ledger_authoritative', ['D03', 'OD10'],
    'Кошелёк рун (users/{uid}.stars.balance, stars_ledger) остаётся серверным леджером монет: руны → монеты 1:1 = переименование.'),
  rule('r.stars_balance', 'root', { exact: ['v2_access_stars', 'v2_access_stars_updated_at_ms'] }, 'drop', 'stars_not_transferred', ['OD10'],
    'Решение владельца 10 (2026-09-30): звёзды (v2_access_stars и метки) не переносятся.'),
  rule('r.currency_counters', 'root', {
    exact: ['practice_runes_daily', 'videoWatchRunesDaily', 'videoWatchRuneSessionV1', 'videoWatchRuneCarryMsV1',
      'coins_migration_v1', 'coins_migration_v1_record',
      // зачем: Q13 — счётчики лимитов серверного кошелька монет (не баланс).
      'coinWalletLimitsV1',
      // зачем: Q-COIN (b) — метка разовой сверки монет (не баланс).
      'coinReconcileV1',
      // зачем: D195 (ddde39503) — метка разовой конвертации старых бонусов в монеты (не баланс; повтор ловит журнал по opId).
      'legacyBonusConvertedV1'],
  }, 'info', 'currency_counter_not_balance', ['D03'], 'Дневные счётчики и метки кошельков — не баланс; баланс рун идёт через runesToCoins.'),
  // зачем (решение владельца 11): вход в V2 новый — служебные поля входа не переносятся и
  // не блокируют. Опасные ЗНАЧЕНИЯ (identityHidden:true, anon_merge_claim, чужой
  // canonicalStableId/duplicateOfStableId) ловит HOLD всего аккаунта ДО этой таблицы.
  rule('r.login_service', 'root', {
    exact: ['firebaseAuthUid', 'linkedAuth', 'identityHidden', 'canonicalStableId', 'duplicateOfStableId', 'anon_merge_claim',
      'identityCanonicalizedAt', 'identityMergedAt', 'identityCleanupAt', 'identityCleanupReason'],
  }, 'drop', 'login_service_field', ['OD11'], 'Решение владельца 11 (2026-09-30): служебные поля входа не переносятся, вход в V2 новый.'),
  // Эти поля создаются самим legacy-клиентом/контуром Account Generation как
  // служебные метки времени и защиты от устаревших операций. Они не являются
  // пользовательским прогрессом и не должны останавливать перенос аккаунта.
  // До OD20 они явно остаются в легаси-документе: это не просто
  // «информационное» поле, а часть retention-контракта, поэтому отчёт должен
  // учитывать их в keptInPlace и cleanup allowlist.
  rule('r.runtime_metadata', 'root', {
    exact: ['accountGeneration', 'updatedAt', 'created_at', 'last_active_at'],
  }, 'keep_in_place', 'runtime_metadata_retained', ['OD20'], 'Служебные метаданные документа пользователя; сохраняются до OD20.'),
  // Эти поля пишутся серверными контурами уведомлений, модерации и account-id.
  // Они не являются доменами переноса Account V2; сохраняем их в действующем
  // документе пользователя до OD20, чтобы не потерять ограничения, push-настройки
  // и служебную связь stable-id/account-id при переходе.
  rule('r.service_metadata', 'root', {
    exact: [
      'accessBlocked', 'accountId', 'accountIdAssignedAt', 'accountIdAssignedReason',
      'banned', 'bannedAt', 'duplicateCleanupJobId', 'duplicateCleanupQueuedAt',
      'duplicateCleanupQueuedBy', 'duplicateCleanupStatus', 'ideaSubmissionBlocked',
      'ideaSubmissionBlockedAtMs', 'ideaSubmissionBlockedBy', 'ideaSubmissionRestrictionReason',
      'lastLessonReminderAt', 'lastPremiumExpiryReminderAt', 'lastPremiumExpiryReminderForMs',
      'lastReEngagePushAt', 'lastTournamentPushAt', 'pushPrefs', 'pushTokenLang',
      'pushTokenPlatform', 'pushTokenTimezone', 'pushTokenUpdatedAt', 'spireWeekResultPushWeekId',
      'spireZoneWarningPushWeekId', 'tournament_best_place', 'tournament_free_entry_week_id',
      'tournament_free_week', 'tournament_hot_streak', 'tournament_hot_streak_tier',
      'tournament_last_slot_key', 'tournament_last_slot_room_id', 'tournament_title',
      'tournament_titles_won', 'user_avatar', 'user_avatar_frame', 'expoPushToken',
      // зачем: вопрос 27 (f3e4462fe) — ревизия почты: сервер поднимает её при каждой записи в user_messages,
      // телефон по ней решает, читать ли входящие. Служебный счётчик, не данные человека.
      'inboxRev',
    ],
  }, 'keep_in_place', 'service_metadata_retained', ['OD20'], 'Служебные поля уведомлений, модерации, турниров и account-id; сохраняются до OD20.'),
  // зачем: вопрос 27 (5755b2f94) — телефон кладёт flashcardPagesRev_<язык> (мс записи страниц) в патч корня, чтобы
  // второй телефон не перечитывал страницы карточек на каждом старте. Ревизия кэша, не сами карточки: остаётся
  // на месте рядом со страницами (s.flashcard_pages переносятся и тоже сохраняются).
  rule('r.flashcard_pages_rev', 'root', { pattern: /^flashcardPagesRev_/ }, 'keep_in_place', 'kept_in_v2_store', ['OD20'],
    'Ревизия страниц карточек по языку (вопрос 27); остаётся на месте, перенос не блокирует.'),
  rule('r.achievements_root', 'root', { exact: ['achievements_state'] }, 'keep_in_place', 'kept_in_v2_store', ['OD8'],
    'Состояние достижений остаётся в действующем хранилище 2.0 и не удаляется чисткой.'),
  // зачем (8A, решение координатора по E2E 2026-10-01): «hold» стоял без причины («решения нет»), а
  // поле пишется после каждого слияния аккаунтов → перенос OD21 вставал бы у многих. Практика ошибок —
  // не домен V2, флаг остаётся на месте и перенос уроков/карточек/наборов не блокирует.
  rule('r.mistake_merge', 'root', { exact: ['mistakePracticeMergePending'] }, 'keep_in_place', 'kept_in_v2_store', ['OD20'],
    'Флаг слияния практики ошибок (не домен V2) — остаётся на месте, перенос не блокирует.'),
  rule('r.progress_markers', 'root', {
    exact: ['progressServerState', 'progressServerAuthoritative', 'progressServerCutoverAt', 'progressMigratedAt',
      // зачем (8I): отметка суточного лимита дозаливки progressReseedMissing — тот же класс маркеров.
      'progressReseedAt'],
  // зачем (8A, решение координатора по E2E 2026-10-01): progressServerState пишется при КАЖДОМ
  // завершении урока (progress_events.ts) → «hold» остановил бы перенос почти у всех. Это маркеры
  // режима, данные уроков лежат в самом progress и читаются переносом как есть.
  }, 'keep_in_place', 'kept_in_v2_store', ['OD20'], 'Технические маркеры прогресса — остаются на месте, перенос не блокируют.'),
];

// ─── подколлекции users/{uid}/* ────────────────────────────────────────────
const SUBCOLLECTION_RULES: readonly InventoryRule[] = [
  rule('s.flashcard_pages', 'subcollection', { exact: ['flashcard_pages'] }, 'carry', 'saved_cards_pages', [],
    'Страницы сохранённых карточек; неполный набор — hold.', 'flashcard'),
  rule('s.plus', 'subcollection', { exact: ['access_projection'] }, 'derive', 'plus_entitlement_reference', [], PLUS_NOTE),
  rule('s.pearls', 'subcollection', { exact: ['shard_log'] }, 'drop', 'pearls_removed', ['D70', 'D84', 'D103'], 'Журнал жемчуга.'),
  rule('s.level_spins', 'subcollection', { exact: ['level_spin_credits', 'level_spin_results'] }, 'drop', 'gifts_spins_boosts_removed',
    ['D09', 'D90'], 'Спины уровня.'),
  rule('s.arena', 'subcollection', { pattern: /^arena_v2_/ }, 'drop', 'arena_removed', ['D10', 'D83', 'D90'], 'Подколлекции Арены.'),
  rule('s.referral', 'subcollection', { exact: ['referral_spin_credit_ledger'] }, 'info', 'no_v2_domain', ['D80', 'D99'], 'Рулетка остаётся.'),
  rule('s.stars', 'subcollection', { exact: ['star_operations'] }, 'info', 'currency_counter_not_balance', ['D03'],
    'Журнал рун (stars_ledger): итог уже в балансе users/{uid}.stars (runesToCoins).'),
  rule('s.dialogues', 'subcollection', { exact: ['dialogue_v2_memory', 'dialogue_v2_freeform_memory', 'dialogue_v2_bot_voice_claims'] },
    'info', 'no_v2_domain', [], 'Память диалогов.'),
  // зачем (OD26, владелец 2026-10-01): журналы телефона НЕ блокируют перенос — остаются на месте
  // (keep_in_place, не переносятся и не удаляются), уроки/карточки/наборы переносятся как обычно.
  rule('s.personal_sync', 'subcollection', { exact: ['personal_sync_segments'] }, 'keep_in_place', 'kept_in_v2_store', ['OD26'],
    'Решение владельца OD26: журналы телефона остаются в хранилище 2.0, перенос не блокируют.'),
  // зачем (Q37, PM-111): избранное видео — личные данные ученика, не журнал и не домен переноса 2.0;
  // остаётся на месте (рекомендация ядра), удаляется вместе с аккаунтом рекурсивно.
  rule('s.video_favorites', 'subcollection', { exact: ['video_favorites'] }, 'keep_in_place', 'kept_in_v2_store', [],
    'PM-111: личное избранное видео остаётся в хранилище 2.0, перенос не блокирует.'),
  // зачем (PM-164): окно тишины «Привета» пишет только сервер (rules: read/write false) — служебная
  // запись как friend_activity_like_daily_limits: переносить нечего, на перенос не влияет.
  rule('s.friend_hello_cooldowns', 'subcollection', { exact: ['friend_hello_cooldowns'] }, 'info', 'no_v2_domain', [],
    'Служебное окно тишины «Привета», только сервер.'),
  // зачем (Q55, PM-018-A2): суточный счётчик публикаций наборов сообщества — служебная запись сервера
  // (rules: read/write false), как friend_hello_cooldowns; переносить нечего, на перенос не влияет.
  rule('s.pack_publish_limits', 'subcollection', { exact: ['pack_publish_limits'] }, 'info', 'no_v2_domain', [],
    'Служебный суточный счётчик публикаций наборов, только сервер.'),
  // зачем (Q41, PM-162-A2): список заблокированных — личные данные человека, переезд не должен их терять
  // (иначе заблокированный снова сможет слать «Привет»/заявки). Пишет только сервер; остаётся на месте
  // как video_favorites, удаляется вместе с аккаунтом рекурсивно (и чужие записи — в account_delete).
  rule('s.blocked', 'subcollection', { exact: ['blocked'] }, 'keep_in_place', 'kept_in_v2_store', [],
    'PM-162: список заблокированных остаётся в хранилище 2.0, перенос не блокирует.'),
  rule('s.social', 'subcollection', {
    exact: ['notifications', 'idea_inbox', 'friends', 'friend_requests', 'friend_requests_sent', 'idea_likes_sent',
      'activity_like_stats', 'activity_likes_received', 'friend_activity_like_daily_limits', 'friend_activity_likes_sent', 'community_seller_inbox'],
  }, 'info', 'no_v2_domain', [], 'Социальное и уведомления.'),
];

export const MIGRATION_INVENTORY: readonly InventoryRule[] = Object.freeze([...PROGRESS_RULES, ...ROOT_RULES, ...SUBCOLLECTION_RULES]);

function matches(matcher: Matcher, key: string): boolean {
  if (matcher.exact !== undefined && matcher.exact.includes(key)) return true;
  return matcher.pattern !== undefined && matcher.pattern.test(key);
}

const UNKNOWN: Classification = Object.freeze({ ruleId: null, disposition: 'hold', reason: 'unknown_field', decisions: Object.freeze([]) });

function classifyWith(rules: readonly InventoryRule[], key: string): Classification {
  const found = rules.find((item) => matches(item.match, key));
  if (found === undefined) return UNKNOWN;
  return {
    ruleId: found.id, disposition: found.disposition, reason: found.reason, decisions: found.decisions,
    domain: found.domain, retention: found.retention,
  };
}

const SCOPED_KEY = /^([a-z_]+)_v2::([a-z]{2})::(.+)$/;
const LESSON_BEST_KEY = /^lesson(\d{1,4})_best_score$/;

export type ParsedProgressKey = Readonly<{ target: string; rawKey: string | null; lessonId?: number }>;

function withLesson(target: string, rawKey: string): ParsedProgressKey {
  const lesson = LESSON_BEST_KEY.exec(rawKey);
  return lesson === null ? { target, rawKey } : { target, rawKey, lessonId: Number(lesson[1]) };
}

/**
 * ЕДИНСТВЕННЫЙ разбор ключа progress (ремонт №1, P3): область цели
 * (app/target_storage_keys.ts → targetKey): `<domain>_v2::<target>::<encodeURIComponent(id)>`,
 * EN — без области; номер урока лучшего результата. `lesson_progress_v2::fr::7` —
 * это `lesson7_progress` (lessonProgressKey кладёт в id номер урока).
 * Битое кодирование → rawKey null.
 */
export function parseProgressKey(key: string): ParsedProgressKey {
  const scoped = SCOPED_KEY.exec(key);
  if (scoped === null) return withLesson('en', key);
  const [, domain, target, encoded] = scoped;
  let id: string;
  try {
    id = decodeURIComponent(encoded);
  } catch (error) {
    // зачем: битый ключ не должен ронять прогон — он уходит в hold malformed_key.
    console.warn('[ACCOUNTS-V2-MIGRATION] parseProgressKey: undecodable scoped key', error instanceof Error ? error.name : typeof error);
    return { target, rawKey: null };
  }
  if (domain === 'lesson_progress' && /^\d{1,4}$/.test(id)) return { target, rawKey: `lesson${id}_progress` };
  return withLesson(target, id);
}

export function classifyProgressKey(key: string): ProgressClassification {
  const parsed = parseProgressKey(key);
  const { target, rawKey } = parsed;
  if (rawKey === null) {
    return { ruleId: null, disposition: 'hold', reason: 'malformed_key', decisions: [], target, rawKey };
  }
  const base = classifyWith(PROGRESS_RULES, rawKey);
  if (base.ruleId === 'p.lesson_best' && parsed.lessonId !== undefined) return { ...base, target, rawKey, lessonId: parsed.lessonId };
  return { ...base, target, rawKey };
}

export function classifyRootField(key: string): Classification {
  return classifyWith(ROOT_RULES, key);
}

export function classifySubcollection(name: string): Classification {
  return classifyWith(SUBCOLLECTION_RULES, name);
}

export function inventorySummary(): Readonly<Record<Disposition, number>> {
  const counts = Object.fromEntries(DISPOSITIONS.map((item) => [item, 0])) as Record<Disposition, number>;
  for (const item of MIGRATION_INVENTORY) counts[item.disposition] += 1;
  return counts;
}
