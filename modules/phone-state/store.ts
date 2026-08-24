import { canonicalJson, operationFingerprint, utf8ByteLength } from './canonical';
import type {
  PendingPersonalOperation,
  PersonalOperation,
  ProjectionEnvelope,
} from './contracts';
import type { ReducerRegistry } from './reducer_registry';

export type PhoneStateCommitFailpoint =
  | 'after_sequence'
  | 'after_operation'
  | 'after_projection'
  | 'after_outbox';

export type CommitResult = Readonly<{
  operation: PersonalOperation;
  projection: ProjectionEnvelope;
  duplicate: boolean;
}>;

export interface PhoneStateStore {
  commit(
    operation: PendingPersonalOperation,
    options?: Readonly<{ idempotencyKey?: string }>,
  ): Promise<CommitResult>;
  readProjection(domain: string): Promise<ProjectionEnvelope | null>;
  replay(domain: string): Promise<ProjectionEnvelope>;
}

export type PhoneStateSqlValue = string | number | null;

export interface PhoneStateStoreTransaction {
  getFirstAsync<T>(sql: string, ...params: PhoneStateSqlValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: PhoneStateSqlValue[]): Promise<T[]>;
  runAsync(sql: string, ...params: PhoneStateSqlValue[]): Promise<unknown>;
}

export interface PhoneStateStoreDatabase extends PhoneStateStoreTransaction {
  withExclusiveTransactionAsync<T>(
    task: (transaction: PhoneStateStoreTransaction) => Promise<T>,
  ): Promise<T>;
}

export type CreatePhoneStateStoreOptions = Readonly<{
  database: PhoneStateStoreDatabase;
  registry: ReducerRegistry;
  failpoint?: PhoneStateCommitFailpoint;
}>;

type DeviceStateRow = Readonly<{
  device_id: string;
  next_sequence: number;
  hybrid_counter: number;
}>;

type OperationRow = Readonly<{
  canonical_operation: string;
  fingerprint: string;
}>;

type ProjectionRow = Readonly<{
  reducer_version: number;
  canonical_state: string;
  through_operation_count: number;
}>;

type OutboxRow = Readonly<{
  segment_id: string;
  first_sequence: number | null;
  last_sequence: number | null;
  operation_count: number;
  canonical_operation_ids: string;
}>;

type CommitTransactionResult =
  | Readonly<{ kind: 'committed'; result: CommitResult }>
  | Readonly<{ kind: 'quarantined'; reason: string }>;

const SELECT_OPERATION_BY_IDEMPOTENCY = `
/* phone-state:select-operation-by-idempotency */
SELECT canonical_operation, fingerprint
FROM operations
WHERE idempotency_key = ?
LIMIT 1
`;

const SELECT_DEVICE_STATE = `
/* phone-state:select-device-state */
SELECT device_id, next_sequence, hybrid_counter
FROM device_state
WHERE singleton = 1
LIMIT 1
`;

const UPDATE_DEVICE_STATE = `
/* phone-state:update-device-state */
UPDATE device_state
SET next_sequence = ?, hybrid_counter = ?
WHERE singleton = 1
`;

const INSERT_OPERATION = `
/* phone-state:insert-operation */
INSERT INTO operations (
  operation_id, idempotency_key, device_id, device_sequence, domain, kind,
  entity_id, canonical_operation, fingerprint, created_at_ms
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const SELECT_PROJECTION = `
/* phone-state:select-projection */
SELECT reducer_version, canonical_state, through_operation_count
FROM projections
WHERE domain = ?
LIMIT 1
`;

const UPSERT_PROJECTION = `
/* phone-state:upsert-projection */
INSERT INTO projections (
  domain, reducer_version, canonical_state, through_operation_count
) VALUES (?, ?, ?, ?)
ON CONFLICT(domain) DO UPDATE SET
  reducer_version = excluded.reducer_version,
  canonical_state = excluded.canonical_state,
  through_operation_count = excluded.through_operation_count
`;

const INSERT_QUARANTINE = `
/* phone-state:insert-quarantine */
INSERT INTO quarantine (
  quarantine_id, source_kind, source_id, reason, canonical_payload,
  fingerprint, byte_length, created_at_ms
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

const SELECT_OPEN_OUTBOX = `
/* phone-state:select-open-outbox */
SELECT segment_id, first_sequence, last_sequence, operation_count,
       canonical_operation_ids
FROM outbox_segments
WHERE device_id = ? AND state = 'open'
LIMIT 1
`;

const INSERT_OPEN_OUTBOX = `
/* phone-state:insert-open-outbox */
INSERT INTO outbox_segments (
  segment_id, device_id, first_sequence, last_sequence, operation_count,
  canonical_operation_ids, canonical_segment, fingerprint, byte_length,
  state, created_at_ms, sealed_at_ms, acknowledged_at_ms
) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, 'open', ?, NULL, NULL)
`;

const UPDATE_OPEN_OUTBOX = `
/* phone-state:update-open-outbox */
UPDATE outbox_segments
SET last_sequence = ?, operation_count = ?, canonical_operation_ids = ?, byte_length = ?
WHERE segment_id = ? AND state = 'open'
`;

const SELECT_DOMAIN_OPERATIONS = `
/* phone-state:select-domain-operations */
SELECT canonical_operation
FROM operations
WHERE domain = ?
`;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isSafeIntegerAtLeast(value: unknown, minimum: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= minimum;
}

function validatePendingOperation(operation: PendingPersonalOperation): void {
  if (
    operation.schemaVersion !== 1
    || !isNonEmptyString(operation.stableUid)
    || !isSafeIntegerAtLeast(operation.accountGeneration, 0)
    || !isNonEmptyString(operation.deviceId)
    || !isNonEmptyString(operation.domain)
    || !isNonEmptyString(operation.kind)
    || (operation.entityId !== null && typeof operation.entityId !== 'string')
    || !isSafeIntegerAtLeast(operation.createdAtMs, 0)
  ) {
    throw new Error('phone_state_pending_operation_invalid');
  }
}

function namespaceIdempotencyKey(
  operation: PendingPersonalOperation,
  rawKey: string,
): string {
  if (!isNonEmptyString(rawKey)) {
    throw new Error('phone_state_idempotency_key_invalid');
  }
  return canonicalJson([
    operation.accountGeneration,
    operation.deviceId,
    rawKey,
  ]);
}

function parseJson(text: string, errorCode: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(errorCode);
  }
}

function parseStoredOperation(row: OperationRow): PersonalOperation {
  const parsed = parseJson(row.canonical_operation, 'phone_state_operation_corrupt');
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('phone_state_operation_corrupt');
  }
  return parsed as PersonalOperation;
}

function operationBody(operation: PersonalOperation): Omit<PersonalOperation, 'fingerprint'> {
  const { fingerprint: _fingerprint, ...body } = operation;
  return body;
}

function materializeBody(
  pending: PendingPersonalOperation,
  allocation: Readonly<{
    operationId: string;
    deviceSequence: number;
    hybridClock: PersonalOperation['hybridClock'];
  }>,
): Omit<PersonalOperation, 'fingerprint'> {
  return {
    ...pending,
    operationId: allocation.operationId,
    deviceSequence: allocation.deviceSequence,
    hybridClock: allocation.hybridClock,
  };
}

async function materializeOperation(
  body: Omit<PersonalOperation, 'fingerprint'>,
): Promise<Readonly<{ operation: PersonalOperation; canonical: string }>> {
  const fingerprint = await operationFingerprint(body);
  const operation: PersonalOperation = Object.freeze({ ...body, fingerprint });
  return { operation, canonical: canonicalJson(operation) };
}

function projectionFromRow(domain: string, row: ProjectionRow): ProjectionEnvelope {
  if (
    !isSafeIntegerAtLeast(row.reducer_version, 1)
    || !isSafeIntegerAtLeast(row.through_operation_count, 0)
  ) {
    throw new Error('phone_state_projection_corrupt');
  }
  return Object.freeze({
    schemaVersion: 1,
    domain,
    reducerVersion: row.reducer_version,
    state: parseJson(row.canonical_state, 'phone_state_projection_corrupt'),
    throughOperationCount: row.through_operation_count,
  });
}

async function readProjectionFrom(
  database: PhoneStateStoreTransaction,
  domain: string,
): Promise<ProjectionEnvelope | null> {
  const row = await database.getFirstAsync<ProjectionRow>(SELECT_PROJECTION, domain);
  return row ? projectionFromRow(domain, row) : null;
}

function parseOperationIds(row: OutboxRow): string[] {
  const parsed = parseJson(row.canonical_operation_ids, 'phone_state_outbox_corrupt');
  if (
    !Array.isArray(parsed)
    || parsed.some((operationId) => !isNonEmptyString(operationId))
    || parsed.length !== row.operation_count
  ) {
    throw new Error('phone_state_outbox_corrupt');
  }
  return [...parsed];
}

function triggerFailpoint(
  configured: PhoneStateCommitFailpoint | undefined,
  current: PhoneStateCommitFailpoint,
): void {
  if (configured === current) {
    throw new Error(`failpoint:${current}`);
  }
}

function compareOperations(left: PersonalOperation, right: PersonalOperation): number {
  return (
    left.hybridClock.counter - right.hybridClock.counter
    || left.deviceId.localeCompare(right.deviceId)
    || left.deviceSequence - right.deviceSequence
    || left.operationId.localeCompare(right.operationId)
  );
}

export function createPhoneStateStore(
  options: CreatePhoneStateStoreOptions,
): PhoneStateStore {
  const { database, registry, failpoint } = options;

  const readProjection = (domain: string): Promise<ProjectionEnvelope | null> => {
    if (!isNonEmptyString(domain)) {
      return Promise.reject(new Error('phone_state_domain_invalid'));
    }
    return readProjectionFrom(database, domain);
  };

  const replay = async (domain: string): Promise<ProjectionEnvelope> => {
    if (!isNonEmptyString(domain)) {
      throw new Error('phone_state_domain_invalid');
    }
    const rows = await database.getAllAsync<{ canonical_operation: string }>(
      SELECT_DOMAIN_OPERATIONS,
      domain,
    );
    const operations = rows.map((row) => parseStoredOperation({
      canonical_operation: row.canonical_operation,
      fingerprint: '',
    })).sort(compareOperations);
    const result = registry.replay(domain, operations);
    if (result.kind === 'quarantine') {
      throw new Error(`phone_state_replay_${result.reason}`);
    }
    return result.projection;
  };

  const commit = async (
    pending: PendingPersonalOperation,
    commitOptions?: Readonly<{ idempotencyKey?: string }>,
  ): Promise<CommitResult> => {
    validatePendingOperation(pending);
    const explicitIdempotencyKey = commitOptions?.idempotencyKey === undefined
      ? null
      : namespaceIdempotencyKey(pending, commitOptions.idempotencyKey);

    const transactionResult = await database.withExclusiveTransactionAsync<CommitTransactionResult>(
      async (transaction) => {
        if (explicitIdempotencyKey !== null) {
          const existingRow = await transaction.getFirstAsync<OperationRow>(
            SELECT_OPERATION_BY_IDEMPOTENCY,
            explicitIdempotencyKey,
          );
          if (existingRow) {
            const existing = parseStoredOperation(existingRow);
            const candidateBody = materializeBody(pending, {
              operationId: existing.operationId,
              deviceSequence: existing.deviceSequence,
              hybridClock: existing.hybridClock,
            });
            const candidateFingerprint = await operationFingerprint(candidateBody);
            if (
              candidateFingerprint !== existingRow.fingerprint
              || candidateFingerprint !== existing.fingerprint
            ) {
              throw new Error('phone_state_operation_id_reused');
            }
            const projection = await readProjectionFrom(transaction, pending.domain);
            if (!projection) {
              throw new Error('phone_state_projection_missing');
            }
            return {
              kind: 'committed',
              result: Object.freeze({ operation: existing, projection, duplicate: true }),
            };
          }
        }

        const deviceState = await transaction.getFirstAsync<DeviceStateRow>(SELECT_DEVICE_STATE);
        if (
          !deviceState
          || deviceState.device_id !== pending.deviceId
          || !isSafeIntegerAtLeast(deviceState.next_sequence, 1)
          || !isSafeIntegerAtLeast(deviceState.hybrid_counter, 0)
          || !Number.isSafeInteger(deviceState.next_sequence + 1)
          || !Number.isSafeInteger(deviceState.hybrid_counter + 1)
        ) {
          throw new Error('phone_state_device_state_invalid');
        }

        const deviceSequence = deviceState.next_sequence;
        const hybridCounter = deviceState.hybrid_counter + 1;
        const operationId = `${pending.deviceId}:${deviceSequence}`;
        const idempotencyKey = explicitIdempotencyKey ?? namespaceIdempotencyKey(
          pending,
          operationId,
        );
        const materialized = await materializeOperation(materializeBody(pending, {
          operationId,
          deviceSequence,
          hybridClock: { counter: hybridCounter, deviceId: pending.deviceId },
        }));

        await transaction.runAsync(
          UPDATE_DEVICE_STATE,
          deviceSequence + 1,
          hybridCounter,
        );
        triggerFailpoint(failpoint, 'after_sequence');

        await transaction.runAsync(
          INSERT_OPERATION,
          materialized.operation.operationId,
          idempotencyKey,
          materialized.operation.deviceId,
          materialized.operation.deviceSequence,
          materialized.operation.domain,
          materialized.operation.kind,
          materialized.operation.entityId,
          materialized.canonical,
          materialized.operation.fingerprint,
          materialized.operation.createdAtMs,
        );
        triggerFailpoint(failpoint, 'after_operation');

        const currentProjection = await readProjectionFrom(transaction, pending.domain);
        const reduced = registry.reduce(currentProjection ?? undefined, materialized.operation);
        let projection: ProjectionEnvelope | null = null;
        let quarantineReason: 'unknown_domain' | 'invalid_operation' | null = null;
        if (reduced.kind === 'applied') {
          projection = reduced.projection;
          await transaction.runAsync(
            UPSERT_PROJECTION,
            projection.domain,
            projection.reducerVersion,
            canonicalJson(projection.state),
            projection.throughOperationCount,
          );
        } else {
          quarantineReason = reduced.reason;
          await transaction.runAsync(
            INSERT_QUARANTINE,
            `operation:${materialized.operation.operationId}`,
            'local_operation',
            materialized.operation.operationId,
            reduced.reason,
            materialized.canonical,
            materialized.operation.fingerprint,
            utf8ByteLength(materialized.canonical),
            materialized.operation.createdAtMs,
          );
        }
        triggerFailpoint(failpoint, 'after_projection');

        const openOutbox = await transaction.getFirstAsync<OutboxRow>(
          SELECT_OPEN_OUTBOX,
          pending.deviceId,
        );
        if (openOutbox) {
          const operationIds = parseOperationIds(openOutbox);
          operationIds.push(materialized.operation.operationId);
          const canonicalOperationIds = canonicalJson(operationIds);
          await transaction.runAsync(
            UPDATE_OPEN_OUTBOX,
            deviceSequence,
            operationIds.length,
            canonicalOperationIds,
            utf8ByteLength(canonicalOperationIds),
            openOutbox.segment_id,
          );
        } else {
          const operationIds = canonicalJson([materialized.operation.operationId]);
          await transaction.runAsync(
            INSERT_OPEN_OUTBOX,
            `${pending.deviceId}:open:${deviceSequence}`,
            pending.deviceId,
            deviceSequence,
            deviceSequence,
            1,
            operationIds,
            utf8ByteLength(operationIds),
            materialized.operation.createdAtMs,
          );
        }
        triggerFailpoint(failpoint, 'after_outbox');

        if (!projection) {
          return {
            kind: 'quarantined',
            reason: quarantineReason ?? 'invalid_operation',
          };
        }
        return {
          kind: 'committed',
          result: Object.freeze({
            operation: materialized.operation,
            projection,
            duplicate: false,
          }),
        };
      },
    );

    if (transactionResult.kind === 'quarantined') {
      throw new Error(`phone_state_operation_quarantined:${transactionResult.reason}`);
    }
    return transactionResult.result;
  };

  return Object.freeze({ commit, readProjection, replay });
}
