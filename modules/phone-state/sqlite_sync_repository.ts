import { canonicalJson, canonicalStringFingerprint, utf8ByteLength } from './canonical';
import type { PersonalOperation, ProjectionEnvelope } from './contracts';
import type { PersonalExternalEvent } from './firestore_repository';
import type { ReducerRegistry } from './reducer_registry';
import { assembleSegments, personalSyncSegmentId, type PersonalSyncSegment } from './segments';
import type { PhoneStateStoreDatabase, PhoneStateStoreTransaction } from './store';
import type { PhoneStateRetryState, PhoneStateRetryStore } from './sync_coordinator';
import type { PhoneStateSyncLocalRepository } from './sync_engine';

type OutboxRow = Readonly<{
  segment_id: string;
  canonical_operation_ids: string;
  canonical_segment: string | null;
  state: string;
}>;

function parse<T>(raw: string, code: string): T {
  try { return JSON.parse(raw) as T; } catch { throw new Error(code); }
}

async function quarantine(
  tx: PhoneStateStoreTransaction,
  sourceKind: string,
  sourceId: string,
  reason: string,
  canonicalPayload: string,
): Promise<void> {
  const fingerprint = await canonicalStringFingerprint(canonicalPayload);
  await tx.runAsync(
    `INSERT OR IGNORE INTO quarantine
      (quarantine_id, source_kind, source_id, reason, canonical_payload, fingerprint, byte_length, created_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    `${sourceKind}:${sourceId}`,
    sourceKind,
    sourceId,
    reason,
    canonicalPayload,
    fingerprint,
    utf8ByteLength(canonicalPayload),
    Date.now(),
  );
}

async function readProjection(
  tx: PhoneStateStoreTransaction,
  domain: string,
): Promise<ProjectionEnvelope | undefined> {
  const row = await tx.getFirstAsync<{
    reducer_version: number;
    canonical_state: string;
    through_operation_count: number;
  }>(
    'SELECT reducer_version, canonical_state, through_operation_count FROM projections WHERE domain = ? LIMIT 1;',
    domain,
  );
  return row ? {
    schemaVersion: 1,
    domain,
    reducerVersion: row.reducer_version,
    state: parse(row.canonical_state, 'phone_state_projection_corrupt'),
    throughOperationCount: row.through_operation_count,
  } : undefined;
}

async function writeProjection(
  tx: PhoneStateStoreTransaction,
  projection: ProjectionEnvelope,
): Promise<void> {
  await tx.runAsync(
    `INSERT INTO projections (domain, reducer_version, canonical_state, through_operation_count)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(domain) DO UPDATE SET reducer_version=excluded.reducer_version,
       canonical_state=excluded.canonical_state,
       through_operation_count=excluded.through_operation_count;`,
    projection.domain,
    projection.reducerVersion,
    canonicalJson(projection.state),
    projection.throughOperationCount,
  );
}

async function sealOpenOutbox(database: PhoneStateStoreDatabase): Promise<void> {
  const open = await database.getFirstAsync<OutboxRow>(
    "SELECT segment_id, canonical_operation_ids, canonical_segment, state FROM outbox_segments WHERE state='open' ORDER BY created_at_ms ASC LIMIT 1;",
  );
  if (!open) return;
  const operationIds = parse<unknown[]>(open.canonical_operation_ids, 'phone_state_outbox_corrupt');
  if (!Array.isArray(operationIds) || operationIds.some((id) => typeof id !== 'string')) {
    throw new Error('phone_state_outbox_corrupt');
  }
  const operations: PersonalOperation[] = [];
  for (const id of operationIds as string[]) {
    const row = await database.getFirstAsync<{ canonical_operation: string }>(
      'SELECT canonical_operation FROM operations WHERE operation_id = ? LIMIT 1;',
      id,
    );
    if (!row) throw new Error('phone_state_outbox_corrupt');
    operations.push(parse(row.canonical_operation, 'phone_state_operation_corrupt'));
  }
  const segments = await assembleSegments(operations, { reason: 'background' });
  await database.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync("DELETE FROM outbox_segments WHERE segment_id = ? AND state='open';", open.segment_id);
    for (const segment of segments) {
      await tx.runAsync(
        `INSERT OR IGNORE INTO outbox_segments
          (segment_id, device_id, first_sequence, last_sequence, operation_count,
           canonical_operation_ids, canonical_segment, fingerprint, byte_length,
           state, created_at_ms, sealed_at_ms, acknowledged_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sealed', ?, ?, NULL);`,
        personalSyncSegmentId(segment),
        segment.deviceId,
        segment.firstSequence,
        segment.lastSequence,
        segment.operationCount,
        canonicalJson(
          operations
            .filter((operation) => operation.deviceSequence >= segment.firstSequence
              && operation.deviceSequence <= segment.lastSequence)
            .map((operation) => operation.operationId),
        ),
        canonicalJson(segment),
        segment.fingerprint,
        segment.byteSize,
        segment.createdAtMs,
        Date.now(),
      );
    }
  });
}

export function createPhoneStateSqliteSyncRepository(options: Readonly<{
  database: PhoneStateStoreDatabase;
  registry: ReducerRegistry;
}>): PhoneStateSyncLocalRepository & Readonly<{ sealOpen(): Promise<void> }> {
  const { database, registry } = options;
  const cursor = async (kind: 'device_operations' | 'external_events', sourceId: string): Promise<number> => {
    const row = await database.getFirstAsync<{ last_sequence: number }>(
      'SELECT last_sequence FROM remote_cursors WHERE cursor_kind = ? AND source_id = ? LIMIT 1;',
      kind,
      sourceId,
    );
    return row?.last_sequence ?? 0;
  };
  const advance = (
    tx: PhoneStateStoreTransaction,
    kind: 'device_operations' | 'external_events',
    sourceId: string,
    sequence: number,
  ): Promise<unknown> => tx.runAsync(
    `INSERT INTO remote_cursors (cursor_id, cursor_kind, source_id, last_sequence, updated_at_ms)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(cursor_kind, source_id) DO UPDATE SET
       last_sequence=excluded.last_sequence, updated_at_ms=excluded.updated_at_ms;`,
    `${kind}:${sourceId}`,
    kind,
    sourceId,
    sequence,
    Date.now(),
  );

  const applyOperations = async (
    tx: PhoneStateStoreTransaction,
    operations: readonly PersonalOperation[],
  ): Promise<Readonly<{ downloaded: number; quarantined: number }>> => {
    let downloaded = 0;
    let quarantinedCount = 0;
    for (const operation of operations) {
      const existing = await tx.getFirstAsync<{ fingerprint: string }>(
        'SELECT fingerprint FROM operations WHERE operation_id = ? LIMIT 1;',
        operation.operationId,
      );
      if (existing) {
        if (existing.fingerprint !== operation.fingerprint) {
          await quarantine(tx, 'remote_operation', operation.operationId, 'operation_id_conflict', canonicalJson(operation));
          quarantinedCount += 1;
        }
        continue;
      }
      const current = await readProjection(tx, operation.domain);
      const reduced = registry.reduce(current, operation);
      if (reduced.kind === 'quarantine') {
        await quarantine(tx, 'remote_operation', operation.operationId, reduced.reason, canonicalJson(operation));
        quarantinedCount += 1;
        continue;
      }
      await tx.runAsync(
        `INSERT INTO operations
          (operation_id, idempotency_key, device_id, device_sequence, domain, kind,
           entity_id, canonical_operation, fingerprint, created_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        operation.operationId,
        `remote:${operation.operationId}`,
        operation.deviceId,
        operation.deviceSequence,
        operation.domain,
        operation.kind,
        operation.entityId,
        canonicalJson(operation),
        operation.fingerprint,
        operation.createdAtMs,
      );
      await writeProjection(tx, reduced.projection);
      downloaded += 1;
    }
    return Object.freeze({ downloaded, quarantined: quarantinedCount });
  };

  const repository: PhoneStateSyncLocalRepository & Readonly<{ sealOpen(): Promise<void> }> = {
    sealOpen: () => sealOpenOutbox(database),
    isDeviceManifestAcknowledged: async (deviceId) => (
      await cursor('device_operations', `manifest:${deviceId}`)
    ) === 1,
    markDeviceManifestAcknowledged: async (deviceId) => {
      await database.withExclusiveTransactionAsync((tx) => advance(tx, 'device_operations', `manifest:${deviceId}`, 1));
    },
    oldestPendingSegment: async () => {
      await sealOpenOutbox(database);
      const row = await database.getFirstAsync<{ canonical_segment: string }>(
        "SELECT canonical_segment FROM outbox_segments WHERE state='sealed' ORDER BY first_sequence ASC LIMIT 1;",
      );
      return row ? parse<PersonalSyncSegment>(row.canonical_segment, 'phone_state_outbox_corrupt') : null;
    },
    markSegmentAcknowledged: async (segmentId) => {
      await database.runAsync(
        "UPDATE outbox_segments SET state='acknowledged', acknowledged_at_ms=? WHERE segment_id=? AND state='sealed';",
        Date.now(),
        segmentId,
      );
    },
    remoteCursor: (deviceId) => cursor('device_operations', deviceId),
    externalCursor: () => cursor('external_events', 'server'),
    applyRemoteSegmentAndAdvanceCursor: async (deviceId, operations, nextCursor) => (
      database.withExclusiveTransactionAsync(async (tx) => {
        const result = await applyOperations(tx, operations);
        await advance(tx, 'device_operations', deviceId, nextCursor);
        return result;
      })
    ),
    applyExternalEventsAndAdvanceCursor: async (events: readonly PersonalExternalEvent[], nextCursor) => (
      database.withExclusiveTransactionAsync(async (tx) => {
        let downloaded = 0;
        let quarantinedCount = 0;
        for (const event of events) {
          const inserted = await tx.getFirstAsync<{ external_event_id: string }>(
            'SELECT external_event_id FROM external_events WHERE external_event_id = ? LIMIT 1;',
            event.eventId,
          );
          if (inserted) continue;
          await tx.runAsync(
            `INSERT INTO external_events
              (external_event_id, idempotency_key, server_sequence, domain, kind,
               entity_id, canonical_event, fingerprint, created_at_ms)
             VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?);`,
            event.eventId,
            `external:${event.eventId}`,
            event.serverSequence,
            event.domain,
            event.kind,
            canonicalJson(event),
            event.fingerprint,
            event.createdAtMs,
          );
          // Preserve the immutable receipt even before a domain-specific
          // external projection adapter exists. Advancing the cursor is safe
          // because replay remains possible from external_events; never apply
          // an entitlement through a generic, forgeable personal reducer.
          await quarantine(
            tx,
            'external_event',
            event.eventId,
            'external_projection_adapter_unavailable',
            canonicalJson(event),
          );
          quarantinedCount += 1;
        }
        await advance(tx, 'external_events', 'server', nextCursor);
        return Object.freeze({ downloaded, quarantined: quarantinedCount });
      })
    ),
    quarantineRemoteReceipt: async (sourceKind, sourceId, reason, canonicalPayload) => {
      await database.withExclusiveTransactionAsync((tx) => quarantine(
        tx,
        sourceKind,
        sourceId,
        reason,
        canonicalPayload,
      ));
    },
  };
  return Object.freeze(repository);
}

const RETRY_KEY = 'personal_sync';

export function createPhoneStateSqliteRetryStore(
  database: PhoneStateStoreDatabase,
): PhoneStateRetryStore {
  return Object.freeze({
    read: async () => {
      const row = await database.getFirstAsync<{
        attempts: number;
        next_retry_at_ms: number;
        lease_owner: string | null;
        lease_expires_at_ms: number | null;
        last_error_class: string | null;
      }>('SELECT attempts, next_retry_at_ms, lease_owner, lease_expires_at_ms, last_error_class FROM sync_retry WHERE retry_key = ? LIMIT 1;', RETRY_KEY);
      return row ? Object.freeze({
        attempts: row.attempts,
        nextRetryAt: row.next_retry_at_ms,
        leaseOwner: row.lease_owner,
        leaseExpiresAt: row.lease_expires_at_ms,
        lastErrorClass: row.last_error_class,
      }) : null;
    },
    write: async (state: PhoneStateRetryState) => {
      await database.runAsync(
        `INSERT INTO sync_retry
          (retry_key, attempts, next_retry_at_ms, lease_owner, lease_expires_at_ms, last_error_class, updated_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(retry_key) DO UPDATE SET attempts=excluded.attempts,
           next_retry_at_ms=excluded.next_retry_at_ms, lease_owner=excluded.lease_owner,
           lease_expires_at_ms=excluded.lease_expires_at_ms,
           last_error_class=excluded.last_error_class, updated_at_ms=excluded.updated_at_ms;`,
        RETRY_KEY,
        state.attempts,
        state.nextRetryAt,
        state.leaseOwner,
        state.leaseExpiresAt,
        state.lastErrorClass,
        Date.now(),
      );
    },
    clear: async () => { await database.runAsync('DELETE FROM sync_retry WHERE retry_key = ?;', RETRY_KEY); },
  });
}
