import { classifyGuestCleanKey, describeGuestValueShape } from '../app/guest_clean_classifier';

// зачем (координатор 15.10): разметка ключей свежего гостя для [GUEST-CLEAN]. Правило безопасности —
// при сомнении progress: лишнее окно смены аккаунта лучше молча потерянного прогресса.
describe('guest clean classifier', () => {
  it('marks values a fresh install writes by itself as default', () => {
    expect(classifyGuestCleanKey('user_avatar', '1')).toBe('default');
    expect(classifyGuestCleanKey('user_frame', 'plain')).toBe('default');
    expect(classifyGuestCleanKey('streak_count', '1')).toBe('default');
    expect(classifyGuestCleanKey('unlocked_lessons', '[1]')).toBe('default');
    expect(classifyGuestCleanKey('legacy_free_lesson_cap_v1', '3')).toBe('default');
  });

  it('treats a changed default as progress (streak from 2 days, more lessons)', () => {
    expect(classifyGuestCleanKey('streak_count', '2')).toBe('progress');
    expect(classifyGuestCleanKey('streak_count', '5')).toBe('progress');
    expect(classifyGuestCleanKey('unlocked_lessons', '[1,2]')).toBe('progress');
  });

  // зачем (координатор 15.10): ник, аватар, рамка и ответы онбординга, выбранные гостем, — не прогресс.
  it('treats guest choices (profile, avatar, frame) as default', () => {
    expect(classifyGuestCleanKey('user_avatar', '7')).toBe('default');
    expect(classifyGuestCleanKey('user_frame', 'gold')).toBe('default');
    expect(classifyGuestCleanKey('user_frame', null)).toBe('default');
    expect(classifyGuestCleanKey('user_profile', JSON.stringify({ name: 'Мария', learningGoal: 'work', currentLevel: 'a2' }))).toBe('default');
  });

  it('marks install traces as service', () => {
    for (const key of ['install_date', 'energy_state', 'phraseman_foreground_usage_ms_v1',
      'phraseman_foreground_daily_ms_v1', 'stable_auth_link_cache_v1', 'cloud_migration_v1']) {
      expect(classifyGuestCleanKey(key, 'x')).toBe('service');
    }
  });

  it('describes value shape without printing values', () => {
    const shape = describeGuestValueShape(JSON.stringify({ version: 2, maxEligibleShardBalance: 40, activeDates: ['2026-10-15'], comeback: null, name: 'Мария' }));
    expect(shape).toBe('{version:num+,maxEligibleShardBalance:num+,activeDates:arr1[str10],comeback:null,name:str5}');
    expect(shape).not.toContain('Мария');
    expect(shape).not.toContain('40');
    expect(describeGuestValueShape(JSON.stringify({ abc123def456ghi789jk: 1, 'a@b.c': 2, maxEligibleShardBalance: 0 }))).toBe('{<id>:num+,<id>:num+,maxEligibleShardBalance:num0}');
    expect(describeGuestValueShape('plain')).toBe('str5(not_json)');
    expect(describeGuestValueShape(null)).toBe('empty');
  });

  it('reads value-aware defaults of a fresh install', () => {
    expect(classifyGuestCleanKey('active_days_v1', '{"anchor":"2026-10-15","bits":"1"}')).toBe('default');
    expect(classifyGuestCleanKey('active_days_v1', '{"anchor":"2026-10-15","bits":"1011"}')).toBe('progress');
    const freshFoundation = { version: 2, maxEligibleShardBalance: 0, activeDates: ['2026-10-15'], comeback: null, paidAccess: { plus: false, pro: false } };
    expect(classifyGuestCleanKey('achievement_foundation_progress_v2', JSON.stringify(freshFoundation))).toBe('default');
    expect(classifyGuestCleanKey('achievement_foundation_progress_v2', JSON.stringify({ ...freshFoundation, maxEligibleShardBalance: 120 }))).toBe('progress');
    expect(classifyGuestCleanKey('achievement_foundation_progress_v2', JSON.stringify({ ...freshFoundation, paidAccess: { plus: true, pro: false } }))).toBe('progress');
    expect(classifyGuestCleanKey('lesson_progress_v2::fr::legacy_free_lesson_cap_v1', '3')).toBe('default');
    expect(classifyGuestCleanKey('lesson_progress_v2::fr::legacy_free_lesson_cap_v1', '5')).toBe('progress');
    expect(classifyGuestCleanKey('legacy_free_lesson_migration_v1', '1')).toBe('service');
    expect(classifyGuestCleanKey('friends_push_v1', 'true')).toBe('service');
  });

  // зачем: формы взяты из прогона Сверки guest_clean_relapse_1516 (свежий гость после онбординга, 13 ключей).
  it('reads empty scaffolds of a fresh guest as default/service', () => {
    const achievements = JSON.stringify(Array.from({ length: 32 }, (_, i) => ({ id: `a${i}`, unlockedAt: null, notified: false, shardClaimed: true })));
    expect(classifyGuestCleanKey('achievements_v1', achievements)).toBe('default');
    const earned = JSON.stringify([{ id: 'a1', unlockedAt: 1792068000000, notified: true, shardClaimed: true }]);
    expect(classifyGuestCleanKey('achievements_v1', earned)).toBe('progress');
    const emptyOutbox = JSON.stringify({ schemaVersion: 'x', ownerStableId: 's', lineage: 1, operationIds: [], acknowledgedOperationIds: [] });
    expect(classifyGuestCleanKey('client_shard_phone_state_outbox_v1:s:1', emptyOutbox)).toBe('default');
    const busyOutbox = JSON.stringify({ schemaVersion: 'x', ownerStableId: 's', lineage: 1, operationIds: ['op1'], acknowledgedOperationIds: [] });
    expect(classifyGuestCleanKey('client_shard_phone_state_outbox_v1:s:1', busyOutbox)).toBe('progress');
    const emptySpin = JSON.stringify({ schemaVersion: 'x', ownerStableId: 's', operations: [], acknowledged: {}, serverBalance: 0, serverEarnedTotal: 0, serverSeq: 0 });
    expect(classifyGuestCleanKey('level_spin_star_projection_v1:s', emptySpin)).toBe('default');
    const earnedSpin = JSON.stringify({ schemaVersion: 'x', ownerStableId: 's', operations: [], acknowledged: {}, serverBalance: 2, serverEarnedTotal: 2, serverSeq: 1 });
    expect(classifyGuestCleanKey('level_spin_star_projection_v1:s', earnedSpin)).toBe('progress');
    const phoneOnlyCoins = JSON.stringify({ schemaVersion: 'x', ownerStableId: 's', operations: [], acknowledged: {}, serverBalance: 0, serverEarnedTotal: 0, serverSeq: 3, unconfirmedLocalLift: 300 });
    expect(classifyGuestCleanKey('level_spin_star_projection_v1:s', phoneOnlyCoins)).toBe('progress');
    // зачем (ревью Opus): изолированно — номер сервера 0, решают только монеты «только на телефоне».
    const phoneOnlySeq0 = JSON.stringify({ schemaVersion: 'x', ownerStableId: 's', operations: [], acknowledged: {}, serverBalance: 0, serverEarnedTotal: 0, serverSeq: 0, unconfirmedLocalLift: 300 });
    expect(classifyGuestCleanKey('level_spin_star_projection_v1:s', phoneOnlySeq0)).toBe('progress');
    const acked = JSON.stringify({ schemaVersion: 'x', ownerStableId: 's', operations: [], acknowledged: { op1: true }, serverBalance: 0, serverEarnedTotal: 0, serverSeq: 0 });
    expect(classifyGuestCleanKey('level_spin_star_projection_v1:s', acked)).toBe('progress');
    const compacted = JSON.stringify({ schemaVersion: 'x', ownerStableId: 's', operations: [], acknowledged: {}, serverBalance: 0, serverEarnedTotal: 0, serverSeq: 0, compactedSpendTotal: 5 });
    expect(classifyGuestCleanKey('level_spin_star_projection_v1:s', compacted)).toBe('progress');
    expect(classifyGuestCleanKey('achievements_v1', JSON.stringify([{ id: 'a1', notified: false }]))).toBe('progress');
    expect(classifyGuestCleanKey('v2:required-session-local-commit-index:v1:v2:progress:v1:abc:legacy-scan-complete',
      'learning-v2-required-session-spool-index-legacy-scan-complete.v1:v2:progress:v1:abc')).toBe('service');
    expect(classifyGuestCleanKey('v2:required-session-local-commit-index:v1:v2:progress:v1:abc:legacy-scan-complete', 'other')).toBe('progress');
    expect(classifyGuestCleanKey('v2:required-session-local-commit:v2:v2:progress:v1:abc:m1', '{"done":true}')).toBe('progress');
  });

  // зачем: формы из прогона Сверки r15_1015 (полный онбординг гостя с выбором аватара, язык fr).
  it('reads full-onboarding traces (migration marker, sync snapshot, avatar selection) as not progress', () => {
    expect(classifyGuestCleanKey('lesson_progress_v2::fr::legacy_free_lesson_migration_v1', 'migrated')).toBe('service');
    expect(classifyGuestCleanKey('cloud_last_sync_snapshot_v1', JSON.stringify({ user_avatar: '1', user_avatar_frame: 'plain', streak_count: '1' }))).toBe('service');
    expect(classifyGuestCleanKey('customization_selection_head_v1:stable-A:1', JSON.stringify({ revision: 1 }))).toBe('default');
    expect(classifyGuestCleanKey('customization_selection_operation_v1:stable-A:1:op', JSON.stringify({ selection: { avatarValue: '3', frameId: 'plain' } }))).toBe('default');
    // Владение покупками — прогресс; очередь выбора с R15c — выбор гостя (прогон Сверки r15b_1015).
    expect(classifyGuestCleanKey('custom_avatar_owned_v1', JSON.stringify(['a7']))).toBe('progress');
    expect(classifyGuestCleanKey('customization_selection_outbox_v1:stable-A:1', JSON.stringify([{ op: 1 }]))).toBe('default');
  });

  // зачем (R15c, координатор 15.10): белый список по форме ключа; выбор гостя (аура, очередь выбора) — не прогресс; деньги — прогресс.
  it('R15c: shape-based allowlist, aura choice, money stays progress', () => {
    expect(classifyGuestCleanKey('customization_selection_outbox_v1:stable-A:1', JSON.stringify(['op-12345678901234567890']))).toBe('default');
    expect(classifyGuestCleanKey('customization_selection_quarantine_v1:stable-A:1', JSON.stringify(['op-1']))).toBe('default');
    expect(classifyGuestCleanKey('user_avatar_aura', 'aura_sun')).toBe('default');
    expect(classifyGuestCleanKey('avatar_aura_owned_v1', JSON.stringify({ aura_sun: true }))).toBe('progress');
    expect(classifyGuestCleanKey('feature_x_migration_v3', '1')).toBe('service');
    expect(classifyGuestCleanKey('feature_x_migration', 'done')).toBe('service');
    expect(classifyGuestCleanKey('feature_x_migration_v3', JSON.stringify({ moved: [1, 2, 3] }))).toBe('progress');
    expect(classifyGuestCleanKey('feature_x_migration_v3', 'x'.repeat(41))).toBe('progress');
    expect(classifyGuestCleanKey('cloud_last_sync_snapshot_v2', JSON.stringify({ user_avatar: '1' }))).toBe('service');
    // Промокод/Plus у гостя — дни Plus: прогресс, окно остаётся.
    expect(classifyGuestCleanKey('premium_plan', 'yearly')).toBe('progress');
    expect(classifyGuestCleanKey('premium_expiry', '1792068000000')).toBe('progress');
  });

  // зачем (R15d): прогон Сверки ff21fefa4 (cloud_created_at_synced_v1), точные ключи журнала выбора, флаги миграции, сторис.
  it('R15d: cloud sync marks, exact selection journal, flag-only migration markers, story events', () => {
    expect(classifyGuestCleanKey('cloud_created_at_synced_v1', '1')).toBe('service');
    expect(classifyGuestCleanKey('cloud_profile_synced_v2', '1')).toBe('service');
    expect(classifyGuestCleanKey('cloud_profile_synced_v2', JSON.stringify({ coins: 5 }))).toBe('progress');
    expect(classifyGuestCleanKey('customization_selection_head_v1:stable-A:1', '{}')).toBe('default');
    expect(classifyGuestCleanKey('customization_selection_purchase_v1:stable-A:1', JSON.stringify(['op-1']))).toBe('progress');
    expect(classifyGuestCleanKey('xp_migration_v2', '1500')).toBe('progress');
    expect(classifyGuestCleanKey('xp_migration_v2', 'migrated')).toBe('service');
    expect(classifyGuestCleanKey('feature_migration_v1', '1792068000000')).toBe('service');
    expect(classifyGuestCleanKey('story_events_v1:stable-A', JSON.stringify({ seen: ['s1'] }))).toBe('service');
  });

  it('treats every unknown key and broken value as progress', () => {
    expect(classifyGuestCleanKey('lesson_progress_v2::fr::lesson_1', '{"done":true}')).toBe('progress');
    expect(classifyGuestCleanKey('client_shard_phone_state_outbox_v1:abc', '[{"e":1}]')).toBe('progress');
    expect(classifyGuestCleanKey('active_days_v1', '{"anchor":"2026-10-15"}')).toBe('progress');
    expect(classifyGuestCleanKey('active_days_v1', '{broken')).toBe('progress');
    expect(classifyGuestCleanKey('achievement_foundation_progress_v2', '{broken')).toBe('progress');
  });
});
