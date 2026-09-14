import {
  hasMeaningfulLocalAccountData,
  isLocalAnonymousIdentityProvenCleanForCredentialHandoff,
  isMeaningfulStoredAccountValue,
} from '../app/local_account_data';
import {
  accountOwnedStorageKeysFrom,
  accountLocalDataKeysForToday,
  isAccountLocalJournalStorageKey,
} from '../app/cloud_sync';

describe('meaningful local account data', () => {
  const pendingShardGrantAccountKeys = [
    'pending_shard_grants_v2:stable-A',
    'pending_shard_grants_v1',
    'pending_shard_grants_quarantine_v1:stable-A',
    'pending_shard_grants_v1_quarantine_owner_v1',
    'pending_shard_grants_delete_cleanup_v1:stable-A',
    'pending_shard_grants_recovery_needed_v1:stable-A',
    'pending_shard_grants_correlated_event_v1:stable-A:purchase-1',
  ] as const;
  it('wipes generated nickname pending state during account transitions', () => {
    expect(accountLocalDataKeysForToday('2026-07-12')).toEqual(expect.arrayContaining([
      'generated_nickname_pending_v1',
      'generated_name_confirmed_v1',
    ]));
  });
  it('wipes account-scoped Today recommendation history', () => {
    expect(accountLocalDataKeysForToday('2026-07-12')).toContain('today_recommendation_history_v1');
  });
  it('rejects empty/default representations', () => {
    ['', '0', 'false', 'null', '[]', '{}'].forEach((value) => {
      expect(isMeaningfulStoredAccountValue(value)).toBe(false);
    });
  });

  it('does not treat name-only onboarding state as upload-authorizing account data', async () => {
    const storage = {
      multiGet: async (keys: readonly string[]) => keys.map((key) => [
        key,
        key === 'user_name' ? 'Alice' : key === 'onboarding_done' ? '1' : null,
      ] as [string, string | null]),
    };

    await expect(hasMeaningfulLocalAccountData(storage)).resolves.toBe(false);
  });

  it('does not treat language setup or one-shot migration markers as account progress', async () => {
    const metadata = new Set([
      'user_name',
      'onboarding_done',
      'study_languages_started_v1',
      'language_profile_v1::en',
      'language_profile_v1::fr',
      'xp_migration_v2',
      'week_points_migrated_v1',
      'xp_level_restore_250_to_400_v1',
    ]);
    const storage = {
      multiGet: async (keys: readonly string[]) => keys.map((key) => [
        key,
        metadata.has(key) ? '1' : null,
      ] as [string, string | null]),
    };

    await expect(hasMeaningfulLocalAccountData(storage)).resolves.toBe(false);
  });

  it('recognizes non-XP learning data from the authoritative sync inventory', async () => {
    const storage = {
      multiGet: async (keys: readonly string[]) => keys.map((key) => [
        key,
        key === 'custom_flashcards_v2' ? JSON.stringify([{ front: 'hello', back: 'привет' }]) : null,
      ] as [string, string | null]),
    };

    await expect(hasMeaningfulLocalAccountData(storage)).resolves.toBe(true);
  });

  it('fails closed when storage inspection fails', async () => {
    const storage = { multiGet: async () => { throw new Error('storage unavailable'); } };
    await expect(hasMeaningfulLocalAccountData(storage)).resolves.toBe(false);
  });

  it.each([
    'max_voice_finalize_outbox_v1:stable-A',
    'max_voice_feedback_outbox_v1:stable-A',
    'max_voice_review_receipt_v1:stable-A:session-1',
    'max_voice_review_receipts_v1:stable-A',
  ])('classifies %s as account-local journal data', (key) => {
    expect(isAccountLocalJournalStorageKey(key)).toBe(true);
  });

  it.each([
    ['shards_balance', '17'],
    ['shards_balance_meta_v1', JSON.stringify({ loaded: true, ownerStableId: 'stable-A' })],
    ['shards_store_purchased_total_v1', '4'],
  ])('treats %s as account-owned meaningful state in every inventory consumer', async (key, value) => {
    expect(accountOwnedStorageKeysFrom([key], '2026-07-12')).toContain(key);
    const storage = {
      getAllKeys: async () => [key],
      multiGet: async (keys: readonly string[]) => keys.map((candidate) => (
        [candidate, candidate === key ? value : null] as const
      )),
    };
    await expect(hasMeaningfulLocalAccountData(storage)).resolves.toBe(true);
    await expect(
      isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storage),
    ).resolves.toBe(false);
  });

  it.each(pendingShardGrantAccountKeys)(
    'treats paid/pending grant surface %s as meaningful and blocks clean credential handoff',
    async (key) => {
      expect(isAccountLocalJournalStorageKey(key)).toBe(true);
      expect(accountOwnedStorageKeysFrom([key], '2026-07-12')).toContain(key);
      const storage = {
        getAllKeys: async () => [key],
        multiGet: async (keys: readonly string[]) => keys.map((candidate) => (
          [candidate, candidate === key ? JSON.stringify({ ownerStableId: 'stable-A', pending: true }) : null] as const
        )),
      };
      await expect(hasMeaningfulLocalAccountData(storage)).resolves.toBe(true);
      await expect(
        isLocalAnonymousIdentityProvenCleanForCredentialHandoff(storage),
      ).resolves.toBe(false);
    },
  );

  it('proves a fresh anonymous identity clean only when values and journals are absent', async () => {
    const cleanStorage = {
      multiGet: async (keys: readonly string[]) => keys.map((key) => [key, null] as const),
      getAllKeys: async () => ['app_theme', 'app_lang'],
    };
    await expect(
      isLocalAnonymousIdentityProvenCleanForCredentialHandoff(cleanStorage),
    ).resolves.toBe(true);

    const maxOutboxStorage = {
      getAllKeys: async () => ['max_voice_finalize_outbox_v1:stable-A'],
      multiGet: async (keys: readonly string[]) => keys.map((key) => [
        key,
        key === 'max_voice_finalize_outbox_v1:stable-A'
          ? JSON.stringify([{ operationId: 'max-1' }])
          : null,
      ] as const),
    };
    await expect(
      isLocalAnonymousIdentityProvenCleanForCredentialHandoff(maxOutboxStorage),
    ).resolves.toBe(false);
  });

  it('does not infer a clean handoff identity from failed storage reads', async () => {
    const unreadable = {
      multiGet: async () => { throw new Error('storage unavailable'); },
      getAllKeys: async () => [],
    };
    await expect(
      isLocalAnonymousIdentityProvenCleanForCredentialHandoff(unreadable),
    ).resolves.toBe(false);
  });
});
