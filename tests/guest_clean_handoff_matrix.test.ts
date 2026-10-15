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
  it('guest with any unknown account key is not clean', async () => {
    const rows = { ...FRESH_GUEST, 'client_shard_operation_v1:stable-A:op-1': JSON.stringify({ kind: 'earn', amount: 10 }) };
    await expect(isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storageOf(rows))).resolves.toBe(false);
  });
});
