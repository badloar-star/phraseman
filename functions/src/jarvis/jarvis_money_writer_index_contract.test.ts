import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const guard = fs.readFileSync(path.join(__dirname, 'jarvis_data_contract_guard.test.ts'), 'utf8');
const indexes = JSON.parse(fs.readFileSync(path.join(root, 'firestore.indexes.json'), 'utf8')) as {
  indexes: Array<{ collectionGroup: string; queryScope: string; fields: Array<{ fieldPath: string; order: string }> }>;
};

function hasIndex(collectionGroup: string, fields: Array<[string, string]>): boolean {
  return indexes.indexes.some((index) => index.collectionGroup === collectionGroup
    && index.queryScope === 'COLLECTION'
    && JSON.stringify(index.fields.map((field) => [field.fieldPath, field.order])) === JSON.stringify(fields));
}

describe('Jarvis money real-writer and index contract', () => {
  test('guard points at the three real repo-root writers and validates contextual writes, not comments/includes', () => {
    expect(guard).toContain("writer: 'app/economy/client_shard_operation_sync.ts'");
    expect(guard).toContain("writer: 'functions/src/revenuecat_shards.ts'");
    expect(guard).toContain("writer: 'app/paywall_funnel.ts'");
    expect(guard).toContain('writerPattern:');
    expect(guard).toContain('path.join(root, writer)');
    expect(guard).toContain('writerPattern.test(writerSource)');
    expect(guard).not.toContain("writtenIn: 'admin_user_profile.ts'");
    expect(guard).not.toContain("writtenIn: 'admin_analytics.ts'");
  });

  test('Firestore has exact composites for the fail-closed money queries', () => {
    expect(hasIndex('revenuecat_premium_events', [
      ['environment', 'ASCENDING'],
      ['eventTimestampMs', 'DESCENDING'],
    ])).toBe(true);
    expect(hasIndex('paywall_funnel', [
      ['step', 'ASCENDING'],
      ['dev', 'ASCENDING'],
      ['ts', 'DESCENDING'],
    ])).toBe(true);
  });
});
