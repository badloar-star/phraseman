import {
  hasMeaningfulLocalAccountData,
  isMeaningfulStoredAccountValue,
} from '../app/local_account_data';
import { accountLocalDataKeysForToday } from '../app/cloud_sync';

describe('meaningful local account data', () => {
  it('wipes generated nickname pending state during account transitions', () => {
    expect(accountLocalDataKeysForToday('2026-07-12')).toEqual(expect.arrayContaining([
      'generated_nickname_pending_v1',
      'generated_name_confirmed_v1',
    ]));
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
});
