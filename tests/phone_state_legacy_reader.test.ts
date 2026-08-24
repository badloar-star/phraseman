import type { PhoneStateScope } from '../modules/phone-state/account_secret';
import {
  readLegacyPortableSnapshot,
  type LegacyReaderSources,
} from '../modules/phone-state/legacy_reader';

const scope: PhoneStateScope = { stableUid: 'legacy-user-1', accountGeneration: 7 };

function sourcesWithMixedKeys(): LegacyReaderSources {
  return {
    isScopeCurrent: () => true,
    multiGet: async (keys) => keys.map((key) => [
      key,
      key === 'user_total_xp' ? '420' : key === 'tester_no_premium' ? 'true' : null,
    ] as const),
    readLastSynced: async () => ({ user_total_xp: '400', tester_no_premium: 'true' }),
    readCloudProgress: async () => ({ user_total_xp: 410, tester_no_premium: true }),
    readJournalPrefix: async () => [],
    now: () => 123,
  };
}

test('reader returns only portable rows for the active account', async () => {
  const snapshot = await readLegacyPortableSnapshot(scope, sourcesWithMixedKeys());
  expect(snapshot.values).toHaveProperty('user_total_xp');
  expect(snapshot.values).not.toHaveProperty('tester_no_premium');
  expect(snapshot.stableUid).toBe(scope.stableUid);
  expect(snapshot.capturedAtMs).toBe(123);
});

test('account generation change aborts without returning mixed data', async () => {
  let current = true;
  const sources: LegacyReaderSources = {
    ...sourcesWithMixedKeys(),
    isScopeCurrent: () => current,
    multiGet: async () => {
      current = false;
      return [];
    },
  };
  await expect(readLegacyPortableSnapshot(scope, sources))
    .rejects.toThrow('phone_state_generation_stale');
});

test('oversized portable value aborts the bounded snapshot', async () => {
  const sources: LegacyReaderSources = {
    ...sourcesWithMixedKeys(),
    multiGet: async (keys) => keys.map((key) => [
      key,
      key === 'user_total_xp' ? 'x'.repeat(1024 * 1024 + 1) : null,
    ] as const),
  };
  await expect(readLegacyPortableSnapshot(scope, sources))
    .rejects.toThrow('phone_state_legacy_snapshot_oversized');
});

test('malformed journal values are quarantined and omitted', async () => {
  const quarantined: string[] = [];
  const sources: LegacyReaderSources = {
    ...sourcesWithMixedKeys(),
    readJournalPrefix: async (prefix) => prefix === 'client_shard_operation_v1:'
      ? [{ key: `${prefix}owner:op`, raw: '{broken' }]
      : [],
    quarantine: async (entry) => { quarantined.push(entry.key); },
  };
  const snapshot = await readLegacyPortableSnapshot(scope, sources);
  expect(snapshot.journals).toEqual([]);
  expect(quarantined).toContain('client_shard_operation_v1:owner:op');
});
