import {
  importLegacyOpeningCheckpoint,
  type LegacyOpeningCommit,
  type LegacyOpeningRepository,
} from '../modules/phone-state/opening_checkpoint';
import type { LegacyPortableSnapshot } from '../modules/phone-state/legacy_reader';

const stableUid = 'legacy-import-user';
const accountGeneration = 3;

function memoryRepository(): LegacyOpeningRepository & { commits: LegacyOpeningCommit[] } {
  let receipt: LegacyOpeningCommit['receipt'] | null = null;
  const commits: LegacyOpeningCommit[] = [];
  return {
    commits,
    runAtomically: async (task) => task({
      readOpeningReceipt: async () => receipt,
      commitOpening: async (commit) => {
        receipt = commit.receipt;
        commits.push(commit);
      },
    }),
  };
}

function snapshot(input: Readonly<{
  local?: Readonly<Record<string, string>>;
  lastSynced?: Readonly<Record<string, string>>;
  cloud?: Readonly<Record<string, unknown>>;
  journals?: LegacyPortableSnapshot['journals'];
}>): LegacyPortableSnapshot {
  const local = input.local ?? {};
  const lastSynced = input.lastSynced ?? {};
  const cloud = input.cloud ?? {};
  const keys = new Set([...Object.keys(local), ...Object.keys(lastSynced), ...Object.keys(cloud)]);
  return {
    schemaVersion: 'legacy-portable-snapshot.v1',
    stableUid,
    accountGeneration,
    values: Object.fromEntries([...keys].map((key) => [key, {
      local: local[key] ?? null,
      lastSynced: lastSynced[key] ?? null,
      cloud: Object.prototype.hasOwnProperty.call(cloud, key) ? cloud[key] : null,
    }])),
    journals: input.journals ?? [],
    capturedAtMs: 100,
  };
}

test('snapshot counters use max and sets use union without double count', async () => {
  const repository = memoryRepository();
  const result = await importLegacyOpeningCheckpoint({
    snapshot: snapshot({
      local: { user_total_xp: '120', unlocked_lessons: '[1,2]' },
      lastSynced: { user_total_xp: '100', unlocked_lessons: '[1]' },
      cloud: { user_total_xp: '110', unlocked_lessons: '[1,3]' },
    }),
    repository,
  });
  expect(result.projections.xp.total).toBe(120);
  expect(result.projections.lessons.unlocked).toEqual([1, 2, 3]);
});

test('repeat import returns the same receipt and preserves journal operation IDs', async () => {
  const repository = memoryRepository();
  const legacySnapshot = snapshot({
    local: { shards_balance: '80' },
    journals: [{
      key: 'client_shard_operation_v1:owner:legacy-op-1',
      domain: 'economy',
      reducer: 'composite_economy',
      raw: '{"operationId":"legacy-op-1","delta":5}',
      value: { operationId: 'legacy-op-1', delta: 5 },
    }, {
      key: 'v2:outbox:v2:owner',
      domain: 'learning_v2',
      reducer: 'field_register',
      raw: '{"id":"l2-completion-1","lessonId":"lesson-1"}',
      value: { id: 'l2-completion-1', lessonId: 'lesson-1' },
    }],
  });

  const first = await importLegacyOpeningCheckpoint({ snapshot: legacySnapshot, repository });
  const second = await importLegacyOpeningCheckpoint({ snapshot: legacySnapshot, repository });
  expect(second.receipt).toEqual(first.receipt);
  expect(second.insertedOperations).toBe(0);
  expect(first.receipt.importedOperationIds).toEqual(expect.arrayContaining([
    'legacy-op-1',
    'l2-completion-1',
  ]));
  expect(repository.commits).toHaveLength(1);
});

test('a locally changed register dominates its cloud opening value', async () => {
  const result = await importLegacyOpeningCheckpoint({
    snapshot: snapshot({
      local: { user_name: 'New local name' },
      lastSynced: { user_name: 'Old name' },
      cloud: { user_name: 'Cloud name' },
    }),
    repository: memoryRepository(),
  });
  expect(result.projections.preferences.fields.user_name).toBe('New local name');
});
