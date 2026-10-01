import { createHash } from 'crypto';

/*
 * PM-237: локальный backup-manifest для dry-run. Это не загрузчик Firestore и
 * не production backup. Он фиксирует именно набор операций и refs, чтобы
 * восстановление нельзя было объявить успешным только потому, что «файл есть».
 *
 * СТАТУС (принято Account V2 2026-10-01, TG-4D4949E78A5B): модель/контракт, к рантайму НЕ
 * подключён (migrate_mine/pull_mine его не используют). `restoreMigrationBackup` возвращает
 * только проверенный набор refs (batch/operation/entity) — данные НИКУДА не пишет. Реальная
 * защита данных при откате сейчас другая: старое облако users/{uid} не удаляется (OD20, 30 дней,
 * чистка только по команде владельца; legacyCleanupPaths → []), а перенос идемпотентен
 * (повтор = duplicate). Бэкап/восстановление Firestore — эмулятор/прод, не выполнялись.
 */

export const ACCOUNT_V2_MIGRATION_BACKUP_SCHEMA = 'accounts-v2-migration-backup.v1' as const;

type BackupOperation = Readonly<{
  ownerUid: string;
  operation: Readonly<{
    operationId: string;
    entityType: string;
    entityId: string;
    [key: string]: unknown;
  }>;
}>;
type BackupBatch = Readonly<{ batchId: string; operations: readonly BackupOperation[] }>;

export type MigrationBackup = Readonly<{
  schema: typeof ACCOUNT_V2_MIGRATION_BACKUP_SCHEMA;
  uidHash: string;
  createdAtMs: number;
  operationsJson: string;
  operationsSha256: string;
  refs: Readonly<{ entityIds: readonly string[]; operationIds: readonly string[] }>;
}>;

export type MigrationBackupVerification = Readonly<{ valid: boolean; reasons: readonly string[] }>;
export type RestoredMigrationRefs = Readonly<{
  batchIds: readonly string[];
  operationIds: readonly string[];
  entityIds: readonly string[];
}>;

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stable(item)]));
  }
  return value;
}

function canonical(value: unknown): string {
  return JSON.stringify(stable(value));
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function expectedRefs(batches: readonly BackupBatch[]): RestoredMigrationRefs {
  const batchIds = batches.map((batch) => batch.batchId);
  const operationIds = batches.flatMap((batch) => batch.operations.map(({ operation }) => operation.operationId));
  const entityIds = batches.flatMap((batch) => batch.operations.map(({ operation }) => operation.entityId));
  return {
    batchIds,
    operationIds: [...new Set(operationIds)].sort(),
    entityIds: [...new Set(entityIds)].sort(),
  };
}

function normalizeBatches(batches: readonly BackupBatch[]): BackupBatch[] {
  return [...batches]
    .sort((left, right) => left.batchId.localeCompare(right.batchId))
    .map((batch) => ({
      batchId: batch.batchId,
      operations: [...batch.operations].sort((left, right) => left.operation.operationId.localeCompare(right.operation.operationId)),
    }));
}

export function createMigrationBackup(uidHash: string, batches: readonly BackupBatch[], createdAtMs: number): MigrationBackup {
  const normalized = normalizeBatches(batches);
  const operationsJson = canonical(normalized);
  const refs = expectedRefs(normalized);
  return {
    schema: ACCOUNT_V2_MIGRATION_BACKUP_SCHEMA,
    uidHash,
    createdAtMs,
    operationsJson,
    operationsSha256: sha256(operationsJson),
    refs: { entityIds: refs.entityIds, operationIds: refs.operationIds },
  };
}

export function verifyMigrationBackup(backup: MigrationBackup): MigrationBackupVerification {
  const reasons: string[] = [];
  if (backup.schema !== ACCOUNT_V2_MIGRATION_BACKUP_SCHEMA) reasons.push('schema_unsupported');
  if (typeof backup.uidHash !== 'string' || backup.uidHash.length === 0) reasons.push('uid_hash_invalid');
  if (!Number.isSafeInteger(backup.createdAtMs) || backup.createdAtMs < 0) reasons.push('created_at_invalid');
  let parsed: BackupBatch[] | null = null;
  try {
    const value: unknown = JSON.parse(backup.operationsJson);
    if (!Array.isArray(value)) reasons.push('operations_not_array');
    else parsed = value as BackupBatch[];
  } catch {
    reasons.push('operations_json_invalid');
  }
  if (sha256(backup.operationsJson) !== backup.operationsSha256) reasons.push('operations_hash_mismatch');
  if (parsed !== null) {
    const refs = expectedRefs(parsed);
    if (JSON.stringify(refs.entityIds) !== JSON.stringify(backup.refs.entityIds)) reasons.push('entity_refs_mismatch');
    if (JSON.stringify(refs.operationIds) !== JSON.stringify(backup.refs.operationIds)) reasons.push('operation_refs_mismatch');
    const rawOperationIds = parsed.flatMap((batch) => batch.operations.map(({ operation }) => operation.operationId));
    if (new Set(rawOperationIds).size !== rawOperationIds.length) reasons.push('duplicate_operation_id');
  }
  return { valid: reasons.length === 0, reasons };
}

export function restoreMigrationBackup(backup: MigrationBackup): RestoredMigrationRefs {
  const verification = verifyMigrationBackup(backup);
  if (!verification.valid) throw new Error(`accounts_v2_backup_invalid:${verification.reasons.join(',')}`);
  const batches = JSON.parse(backup.operationsJson) as BackupBatch[];
  return expectedRefs(batches);
}

