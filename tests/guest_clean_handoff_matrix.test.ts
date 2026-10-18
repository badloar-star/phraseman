import { isLocalAnonymousIdentityProvenCleanForCredentialHandoff } from '../app/local_account_data';

// зачем (координатор 15.10, «переустановил → окно смены аккаунта»): матрица правила «чистый гость».
// Свежий гость (только значения по умолчанию и служебные следы) входит в существующий аккаунт без окна;
// гость с настоящим прогрессом — окно как прежде. При сомнении — «не чист».

type Rows = Readonly<Record<string, string>>;

function storageOf(rows: Rows) {
  return {
    getAllKeys: async () => Object.keys(rows),
    multiGet: async (keys: readonly string[]) => keys.map((key) => [key, rows[key] ?? null] as const),
  };
}

const FRESH_GUEST: Rows = {
  user_avatar: '1',
  user_frame: 'plain',
  streak_count: '1',
  unlocked_lessons: '[1]',
  legacy_free_lesson_cap_v1: '3',
  'lesson_progress_v2::fr::legacy_free_lesson_cap_v1': '3',
  legacy_free_lesson_migration_v1: '1',
  active_days_v1: JSON.stringify({ anchor: '2026-10-15', bits: '1' }),
  achievement_foundation_progress_v2: JSON.stringify({
    version: 2, maxEligibleShardBalance: 0, activeDates: ['2026-10-15'], comeback: null, paidAccess: { plus: false, pro: false },
  }),
  install_date: '1792068000000',
  energy_state: JSON.stringify({ energy: 5, updatedAt: 1792068000000 }),
  phraseman_foreground_usage_ms_v1: '61000',
  phraseman_foreground_daily_ms_v1: JSON.stringify({ '2026-10-15': 61000 }),
  stable_auth_link_cache_v1: JSON.stringify({ linked: false }),
  cloud_migration_v1: '1',
  friends_push_v1: 'true',
  // зачем (R15c, проверка Сверки r15b_1015): очередь отправки выбора аватара с одной операцией и выбор ауры — выбор гостя.
  'customization_selection_outbox_v1:stable-A:1': JSON.stringify(['op-12345678901234567890']),
  user_avatar_aura: 'aura_sun',
  // зачем (R15d, прогон Сверки ff21fefa4): метка «createdAt в облаке» после фоновой синхронизации и журнал сторис.
  cloud_created_at_synced_v1: '1',
  'story_events_v1:stable-A': JSON.stringify({ seen: ['s1'] }),
  // зачем: следы полного онбординга с выбором аватара (прогон Сверки r15_1015).
  'lesson_progress_v2::fr::legacy_free_lesson_migration_v1': 'migrated',
  cloud_last_sync_snapshot_v1: JSON.stringify({ user_avatar: '1', user_avatar_frame: 'plain', user_avatar_aura: '', streak_count: '1' }),
  'customization_selection_head_v1:stable-A:1': JSON.stringify({ schemaVersion: 'x', ownerStableId: 'stable-A', lineage: 1, operationId: 'op-1', revision: 1, auditFloorRevision: 0 }),
  'customization_selection_operation_v1:stable-A:1:op-1': JSON.stringify({ operationId: 'op-1', revision: 1, source: 'onbrd', selection: { avatarValue: '3', frameId: 'plain', storedAuraSelection: null, level: 1 } }),
  // зачем: четыре пустые заготовки из прогона Сверки guest_clean_relapse_1516 (свежий гость после онбординга).
  achievements_v1: JSON.stringify(Array.from({ length: 32 }, (_, i) => ({ id: `a${i}`, unlockedAt: null, notified: false, shardClaimed: true }))),
  'client_shard_phone_state_outbox_v1:stable-A:1': JSON.stringify({ schemaVersion: 'x', ownerStableId: 'stable-A', lineage: 1, operationIds: [], acknowledgedOperationIds: [] }),
  'level_spin_star_projection_v1:stable-A': JSON.stringify({ schemaVersion: 'x', ownerStableId: 'stable-A', operations: [], acknowledged: {}, serverBalance: 0, serverEarnedTotal: 0, serverSeq: 0 }),
  'v2:required-session-local-commit-index:v1:v2:progress:v1:abc:legacy-scan-complete': 'learning-v2-required-session-spool-index-legacy-scan-complete.v1:v2:progress:v1:abc',
  // зачем (координатор 15.10): ответы онбординга, ник, аватар и рамка, выбранные гостем, — не прогресс.
  user_profile: JSON.stringify({ name: 'Мария', learningGoal: 'work', minutesPerDay: 15, currentLevel: 'a2', targetLevel: 'b1', onboardingCompleted: true }),
};

describe('guest clean handoff matrix', () => {
  it('fresh guest with only defaults and service traces is clean', async () => {
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf(FRESH_GUEST))).resolves.toBe(true);
  });

  it('guest with a longer streak is not clean', async () => {
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf({ ...FRESH_GUEST, streak_count: '3' }))).resolves.toBe(false);
  });

  it('guest with more unlocked lessons is not clean', async () => {
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf({ ...FRESH_GUEST, unlocked_lessons: '[1,2]' }))).resolves.toBe(false);
  });

  it('guest with coins earned is not clean', async () => {
    const rows = {
      ...FRESH_GUEST,
      achievement_foundation_progress_v2: JSON.stringify({
        version: 2, maxEligibleShardBalance: 150, activeDates: ['2026-10-15'], comeback: null, paidAccess: { plus: false, pro: false },
      }),
    };
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf(rows))).resolves.toBe(false);
  });

  it('guest with several active days is not clean', async () => {
    const rows = { ...FRESH_GUEST, active_days_v1: JSON.stringify({ anchor: '2026-10-15', bits: '111' }) };
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf(rows))).resolves.toBe(false);
  });

  it('guest with a non-empty coin outbox is not clean', async () => {
    const rows = { ...FRESH_GUEST, 'client_shard_phone_state_outbox_v1:stable-A:1': JSON.stringify({ schemaVersion: 'x', ownerStableId: 'stable-A', lineage: 1, operationIds: ['op-1'], acknowledgedOperationIds: [] }) };
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf(rows))).resolves.toBe(false);
  });

  // зачем (эмулятор 18.10, сценарий №1): курсор повтора завершений Learning V2 пишется на старте даже у свежего гостя.
  it('fresh guest with a Learning V2 completion retry cursor is still clean', async () => {
    const rows = {
      ...FRESH_GUEST,
      'v2:required-session-completion-scheduler:v1:abc': JSON.stringify({
        schemaVersion: 'learning-v2-required-session-completion-retry-cursor.v1', accountScopeHash: 'a'.repeat(64),
        revision: 1, failureOrdinal: 0, nextAttemptAtMs: 1792068000000, reason: 'attempt_reserved', cursorFingerprint: 'b'.repeat(64),
      }),
    };
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf(rows))).resolves.toBe(true);
  });

  // зачем (эмулятор 18.10 10:39): гость лишь открыл первый урок — пустой achievements_state и last_opened_lesson=1 не прогресс.
  it('fresh guest who only opened lesson 1 is still clean; an earned achievement or another lesson is not', async () => {
    const unearned = JSON.stringify(Array.from({ length: 32 }, (_, i) => ({ id: `a${i}`, unlockedAt: null, notified: false, shardClaimed: true })));
    const clean = { ...FRESH_GUEST, achievements_state: unearned, last_opened_lesson: '1' };
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf(clean))).resolves.toBe(true);
    const earned = JSON.stringify([{ id: 'a0', unlockedAt: 1792068000000, notified: true, shardClaimed: true }]);
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf({ ...clean, achievements_state: earned }))).resolves.toBe(false);
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf({ ...clean, last_opened_lesson: '4' }))).resolves.toBe(false);
  });

  // зачем (эмулятор 18.10 11:10): счётчики поведения только с посещениями разделов — не учёба.
  it('user_stats_v1 with visits only is clean; a started lesson, an answer or a purchase is not', async () => {
    const stats = (over: Record<string, unknown>) => JSON.stringify({
      lessonsStarted: 0, lessonsAbandoned: 0, answersTotal: 0, answersCorrect: 0, energyHits: 0,
      featuresOpened: { flashcards: 3 }, shardsShopOpens: 2, shardPackClicks: { starter: 1 }, shardPackPurchases: {},
      cardPackClicks: {}, cardPackPurchases: {}, ...over,
    });
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf({ ...FRESH_GUEST, user_stats_v1: stats({}) }))).resolves.toBe(true);
    for (const over of [{ lessonsStarted: 1 }, { answersTotal: 2 }, { shardPackPurchases: { starter: 1 } }, { cardPackPurchases: { idioms: 1 } }]) {
      await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf({ ...FRESH_GUEST, user_stats_v1: stats(over) }))).resolves.toBe(false);
    }
  });

  it('retry cursor prefix in the classifier equals the cursor module export', () => {
    const { LEARNING_V2_COMPLETION_RETRY_CURSOR_KEY_PREFIX } = require('../app/guest_clean_classifier');
    const { LEARNING_V2_COMPLETION_RETRY_CURSOR_PREFIX } = require('../app/learning_v2_completion_retry_cursor');
    expect(LEARNING_V2_COMPLETION_RETRY_CURSOR_KEY_PREFIX).toBe(LEARNING_V2_COMPLETION_RETRY_CURSOR_PREFIX);
  });

  it('guest with a chosen avatar and frame is still clean', async () => {
    const rows = { ...FRESH_GUEST, user_avatar: '7', user_frame: 'gold' };
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf(rows))).resolves.toBe(true);
  });

  it('guest with one completed lesson is not clean', async () => {
    const rows = { ...FRESH_GUEST, lesson1_best_score: '85' };
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf(rows))).resolves.toBe(false);
  });

  // зачем (ревью Opus 15.10): монеты, которых нет на сервере (unconfirmedLocalLift), — прогресс; иначе стёрлись бы без копии.
  it('guest with spin coins only on the phone is not clean', async () => {
    const rows = { ...FRESH_GUEST, 'level_spin_star_projection_v1:stable-A': JSON.stringify({ schemaVersion: 'x', ownerStableId: 'stable-A', operations: [], acknowledged: {}, serverBalance: 0, serverEarnedTotal: 0, serverSeq: 3, unconfirmedLocalLift: 300 }) };
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf(rows))).resolves.toBe(false);
  });

  it('guest with a malformed spin projection is not clean', async () => {
    const rows = { ...FRESH_GUEST, 'level_spin_star_projection_v1:stable-A': JSON.stringify({ stars: 3 }) };
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf(rows))).resolves.toBe(false);
  });

  // Ключ из настоящего префикса аккаунта (операция монет), которого классификатор не знает, — прогресс.
  it('guest who owns a bought avatar is not clean', async () => {
    const rows = { ...FRESH_GUEST, custom_avatar_owned_v1: JSON.stringify(['a7']) };
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf(rows))).resolves.toBe(false);
  });

  // зачем (координатор 15.10): погашенный промокод/купленный Plus — дни Plus гостя; окно остаётся, дни не теряются.
  it('guest who redeemed a promo code (Plus days) is not clean', async () => {
    const rows = { ...FRESH_GUEST, premium_plan: 'promo', premium_expiry: String(Date.UTC(2026, 10, 15)) };
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf(rows))).resolves.toBe(false);
  });

  it('guest who owns a bought aura is not clean', async () => {
    const rows = { ...FRESH_GUEST, avatar_aura_owned_v1: JSON.stringify({ aura_sun: true }) };
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf(rows))).resolves.toBe(false);
  });

  it('guest with any unknown account key is not clean', async () => {
    const rows = { ...FRESH_GUEST, 'client_shard_operation_v1:stable-A:op-1': JSON.stringify({ kind: 'earn', amount: 10 }) };
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf(rows))).resolves.toBe(false);
  });
});
