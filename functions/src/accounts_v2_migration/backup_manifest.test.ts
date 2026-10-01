import {
  ACCOUNT_V2_MIGRATION_BACKUP_SCHEMA,
  createMigrationBackup,
  restoreMigrationBackup,
  verifyMigrationBackup,
} from './backup_manifest';

const batches = [
  { batchId: 'batch-1', operations: [{ ownerUid: 'masked', operation: { operationId: 'op-1', entityType: 'lesson_progress', entityId: 'en:lesson:1', payload: { passed: true } } }] },
  { batchId: 'batch-2', operations: [{ ownerUid: 'masked', operation: { operationId: 'op-2', entityType: 'library_membership', entityId: 'en:community_packs', payload: { itemIds: ['pack-a'] } } }] },
] as const;

describe('accounts_v2_migration — PM-237 backup/restore manifest', () => {
  it('creates a versioned backup with a content hash and refs', () => {
    const backup = createMigrationBackup('uid-hash', batches, 1_790_000_000_000);
    expect(backup.schema).toBe(ACCOUNT_V2_MIGRATION_BACKUP_SCHEMA);
    expect(backup.operationsSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(backup.refs).toEqual({ entityIds: ['en:community_packs', 'en:lesson:1'], operationIds: ['op-1', 'op-2'] });
    expect(verifyMigrationBackup(backup)).toEqual({ valid: true, reasons: [] });
  });

  it('restores the exact operation set and refs, not merely the presence of a file', () => {
    const backup = createMigrationBackup('uid-hash', batches, 1_790_000_000_000);
    const restored = restoreMigrationBackup(backup);
    expect(restored).toEqual({
      batchIds: ['batch-1', 'batch-2'],
      operationIds: ['op-1', 'op-2'],
      entityIds: ['en:community_packs', 'en:lesson:1'],
    });
  });

  it.each([
    ['payload tamper', (backup: ReturnType<typeof createMigrationBackup>) => ({ ...backup, operationsJson: backup.operationsJson.replace('pack-a', 'pack-b') })],
    ['refs tamper', (backup: ReturnType<typeof createMigrationBackup>) => ({ ...backup, refs: { ...backup.refs, entityIds: ['other'] } })],
    ['schema tamper', (backup: ReturnType<typeof createMigrationBackup>) => ({ ...backup, schema: 'unknown' as typeof backup.schema })],
  ])('rejects %s during restore verification', (_name, mutate) => {
    const backup = createMigrationBackup('uid-hash', batches, 1_790_000_000_000);
    const tampered = mutate(backup);
    expect(verifyMigrationBackup(tampered).valid).toBe(false);
    expect(() => restoreMigrationBackup(tampered)).toThrow('accounts_v2_backup_invalid');
  });
});
