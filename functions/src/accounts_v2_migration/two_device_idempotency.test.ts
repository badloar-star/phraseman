import {
  applyBatch,
  type AccountsV2EntityRecord,
  type AccountsV2OpRecord,
  type AccountsV2TxPort,
} from '../accounts_v2_apply_core';
import { evaluateMigrationCutover } from './compatibility';
import { MIGRATION_EXPORT_FORMAT, runMigrationDryRun, type MigrationDryRunResult } from './dry_run';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const UID = 'stable-user-two-device';
const NOW = 1_790_000_000_000;

function snapshot(): Json {
  return {
    format: MIGRATION_EXPORT_FORMAT, uid: UID,
    user: {
      stars: { balance: 900 },
      premium: true,
      progress: {
        lesson1_best_score: '5',
        flashcards_v1: JSON.stringify([{ id: 'c1', en: 'one', ru: 'один', uk: 'один' }]),
        community_owned_pack_ids_v1: JSON.stringify(['pack-a']),
      },
    },
    subcollections: {},
  };
}

class MemoryPort implements AccountsV2TxPort {
  readonly ops = new Map<string, AccountsV2OpRecord>();
  readonly entities = new Map<string, AccountsV2EntityRecord>();
  getOp(_uid: string, id: string): AccountsV2OpRecord | null { return this.ops.get(id) ?? null; }
  getEntity(_uid: string, id: string): AccountsV2EntityRecord | null { return this.entities.get(id) ?? null; }
  putEntity(_uid: string, id: string, record: AccountsV2EntityRecord): void { this.entities.set(id, record); }
  putReceipt(_uid: string, id: string, record: AccountsV2OpRecord): void { this.ops.set(id, record); }
}

function apply(port: MemoryPort, result: MigrationDryRunResult, nowMs: number = NOW): string[] {
  return result.batches.flatMap((batch) => applyBatch(port, UID, batch, nowMs).map((receipt) => receipt.outcome));
}

describe('accounts_v2_migration — PM-236 two-device/idempotency contract', () => {
  it('two devices applying the same migration do not duplicate balance or rights', () => {
    const deviceA = runMigrationDryRun(snapshot());
    const deviceB = runMigrationDryRun(snapshot());
    const port = new MemoryPort();

    expect(apply(port, deviceA)).toEqual(['applied', 'applied', 'applied']);
    expect(apply(port, deviceB, NOW + 1)).toEqual(['duplicate', 'duplicate', 'duplicate']);
    expect(port.entities.size).toBe(3);
    expect(port.ops.size).toBe(3);
    expect(deviceA.report.runesToCoins).toEqual({ rate: 1, runes: 900, coins: 900 });
    expect(deviceA.batches.flatMap((batch) => batch.operations).map(({ operation }) => JSON.stringify(operation)))
      .not.toEqual(expect.arrayContaining([expect.stringContaining('900')]));
  });

  it('interruption after the first batch resumes with duplicate prefix and applies only the remainder', () => {
    const result = runMigrationDryRun(snapshot());
    const uninterrupted = new MemoryPort();
    apply(uninterrupted, result);

    const resumed = new MemoryPort();
    const firstBatch = result.batches[0];
    expect(firstBatch).toBeDefined();
    expect(applyBatch(resumed, UID, firstBatch, NOW).every((receipt) => receipt.outcome === 'applied')).toBe(true);
    const secondRun = apply(resumed, runMigrationDryRun(snapshot()), NOW + 2);
    expect(secondRun.filter((outcome) => outcome === 'applied').length).toBe(result.batches.flatMap((batch) => batch.operations).length - firstBatch.operations.length);
    expect(secondRun.filter((outcome) => outcome === 'duplicate').length).toBe(firstBatch.operations.length);
    expect([...resumed.entities.keys()]).toEqual([...uninterrupted.entities.keys()]);
  });

  // зачем (принято Account V2 2026-10-01): всё ниже — чистое ядро applyBatch на in-memory порту,
  // не Firestore и не устройство. Последняя проверка — МОДЕЛЬ compatibility.ts: в рантайме
  // старые версии приложения сервер не блокирует (см. шапку compatibility.ts и предусловие 7B).
  it('offline queue replay is safe and a legacy client cannot write after cutover', () => {
    const result = runMigrationDryRun(snapshot());
    const port = new MemoryPort();
    // Offline means no server call: the same deterministic batch is retained for reconnect.
    expect(result.batches).toHaveLength(1);
    expect(apply(port, result)).toEqual(['applied', 'applied', 'applied']);
    expect(apply(port, result, NOW + 3)).toEqual(['duplicate', 'duplicate', 'duplicate']);

    const legacyWrite = evaluateMigrationCutover({
      schemaVersion: 1, phase: 'v2_cutover', legacySyncDisabled: true, hydration: 'verified',
      migrationStatus: 'ready', applyAllowed: true, pendingDomainCount: 0,
      backupVerified: true, rollbackWindowOpen: true, purgeCompleted: false,
    }, { protocolVersion: 1, operation: 'write' });
    expect(legacyWrite.clientAllowed).toBe(false);
    expect(legacyWrite.reasons).toContain('legacy_write_blocked_after_cutover');
  });
});
