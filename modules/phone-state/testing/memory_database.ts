import type {
  PhoneStateSqlValue,
  PhoneStateStoreDatabase,
  PhoneStateStoreTransaction,
} from '../store';

type InternalOperation = Readonly<{
  operationId: string;
  idempotencyKey: string;
  deviceId: string;
  deviceSequence: number;
  domain: string;
  kind: string;
  entityId: string | null;
  canonicalOperation: string;
  fingerprint: string;
  createdAtMs: number;
}>;

type InternalProjection = Readonly<{
  domain: string;
  reducerVersion: number;
  canonicalState: string;
  throughOperationCount: number;
}>;

type InternalOutbox = Readonly<{
  segmentId: string;
  deviceId: string;
  firstSequence: number;
  lastSequence: number;
  operationCount: number;
  canonicalOperationIds: string;
  byteLength: number;
  createdAtMs: number;
}>;

type InternalQuarantine = Readonly<{
  quarantineId: string;
  sourceKind: string;
  sourceId: string;
  reason: string;
  canonicalPayload: string;
  fingerprint: string;
  byteLength: number;
  createdAtMs: number;
}>;

type MemoryState = {
  deviceId: string;
  nextSequence: number;
  hybridCounter: number;
  operations: InternalOperation[];
  projections: InternalProjection[];
  outbox: InternalOutbox[];
  quarantine: InternalQuarantine[];
};

export type MemoryPhoneStateSnapshot = Readonly<{
  operations: readonly Readonly<{
    operationId: string;
    idempotencyKey: string;
    deviceSequence: number;
    domain: string;
  }>[];
  projections: readonly Readonly<{
    domain: string;
    reducerVersion: number;
    state: unknown;
    throughOperationCount: number;
  }>[];
  outbox: readonly Readonly<{
    segmentId: string;
    operationIds: readonly string[];
    operationCount: number;
  }>[];
  quarantine: readonly Readonly<{
    quarantineId: string;
    reason: string;
  }>[];
}>;

export type MemoryPhoneStateDatabase = PhoneStateStoreDatabase & Readonly<{
  snapshot: () => MemoryPhoneStateSnapshot;
  deviceState: () => Readonly<{
    deviceId: string;
    nextSequence: number;
    hybridCounter: number;
  }>;
}>;

export type CreateMemoryPhoneStateDatabaseOptions = Readonly<{
  deviceId: string;
}>;

function cloneState(state: MemoryState): MemoryState {
  return {
    deviceId: state.deviceId,
    nextSequence: state.nextSequence,
    hybridCounter: state.hybridCounter,
    operations: state.operations.map((row) => ({ ...row })),
    projections: state.projections.map((row) => ({ ...row })),
    outbox: state.outbox.map((row) => ({ ...row })),
    quarantine: state.quarantine.map((row) => ({ ...row })),
  };
}

function tag(sql: string, value: string): boolean {
  return sql.includes(`phone-state:${value}`);
}

function stringParam(value: PhoneStateSqlValue | undefined): string {
  if (typeof value !== 'string') {
    throw new Error('memory_database_string_param_invalid');
  }
  return value;
}

function numberParam(value: PhoneStateSqlValue | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('memory_database_number_param_invalid');
  }
  return value;
}

function nullableStringParam(value: PhoneStateSqlValue | undefined): string | null {
  if (value === null || typeof value === 'string') {
    return value;
  }
  throw new Error('memory_database_nullable_string_param_invalid');
}

function parseJson(text: string): unknown {
  return JSON.parse(text) as unknown;
}

export function createMemoryPhoneStateDatabase(
  options: CreateMemoryPhoneStateDatabaseOptions,
): MemoryPhoneStateDatabase {
  if (typeof options.deviceId !== 'string' || options.deviceId.length === 0) {
    throw new Error('memory_database_device_id_invalid');
  }

  let state: MemoryState = {
    deviceId: options.deviceId,
    nextSequence: 1,
    hybridCounter: 0,
    operations: [],
    projections: [],
    outbox: [],
    quarantine: [],
  };

  const getFirstAsync = async <T>(
    sql: string,
    ...params: PhoneStateSqlValue[]
  ): Promise<T | null> => {
    if (tag(sql, 'select-operation-by-idempotency')) {
      const key = stringParam(params[0]);
      const row = state.operations.find((operation) => operation.idempotencyKey === key);
      return row ? {
        canonical_operation: row.canonicalOperation,
        fingerprint: row.fingerprint,
      } as T : null;
    }
    if (tag(sql, 'select-device-state')) {
      return {
        device_id: state.deviceId,
        next_sequence: state.nextSequence,
        hybrid_counter: state.hybridCounter,
      } as T;
    }
    if (tag(sql, 'select-projection')) {
      const domain = stringParam(params[0]);
      const row = state.projections.find((projection) => projection.domain === domain);
      return row ? {
        reducer_version: row.reducerVersion,
        canonical_state: row.canonicalState,
        through_operation_count: row.throughOperationCount,
      } as T : null;
    }
    if (tag(sql, 'select-open-outbox')) {
      const deviceId = stringParam(params[0]);
      const row = state.outbox.find((segment) => segment.deviceId === deviceId);
      return row ? {
        segment_id: row.segmentId,
        first_sequence: row.firstSequence,
        last_sequence: row.lastSequence,
        operation_count: row.operationCount,
        canonical_operation_ids: row.canonicalOperationIds,
      } as T : null;
    }
    throw new Error('memory_database_query_unsupported');
  };

  const getAllAsync = async <T>(
    sql: string,
    ...params: PhoneStateSqlValue[]
  ): Promise<T[]> => {
    if (tag(sql, 'select-domain-operations')) {
      const domain = stringParam(params[0]);
      return state.operations
        .filter((operation) => operation.domain === domain)
        .map((operation) => ({ canonical_operation: operation.canonicalOperation } as T));
    }
    throw new Error('memory_database_query_unsupported');
  };

  const runAsync = async (
    sql: string,
    ...params: PhoneStateSqlValue[]
  ): Promise<unknown> => {
    if (tag(sql, 'update-device-state')) {
      state.nextSequence = numberParam(params[0]);
      state.hybridCounter = numberParam(params[1]);
      return { changes: 1 };
    }
    if (tag(sql, 'insert-operation')) {
      const row: InternalOperation = {
        operationId: stringParam(params[0]),
        idempotencyKey: stringParam(params[1]),
        deviceId: stringParam(params[2]),
        deviceSequence: numberParam(params[3]),
        domain: stringParam(params[4]),
        kind: stringParam(params[5]),
        entityId: nullableStringParam(params[6]),
        canonicalOperation: stringParam(params[7]),
        fingerprint: stringParam(params[8]),
        createdAtMs: numberParam(params[9]),
      };
      if (
        state.operations.some((operation) => (
          operation.operationId === row.operationId
          || operation.idempotencyKey === row.idempotencyKey
          || (
            operation.deviceId === row.deviceId
            && operation.deviceSequence === row.deviceSequence
          )
        ))
      ) {
        throw new Error('memory_database_operation_unique');
      }
      state.operations.push(row);
      return { changes: 1 };
    }
    if (tag(sql, 'upsert-projection')) {
      const row: InternalProjection = {
        domain: stringParam(params[0]),
        reducerVersion: numberParam(params[1]),
        canonicalState: stringParam(params[2]),
        throughOperationCount: numberParam(params[3]),
      };
      const index = state.projections.findIndex((projection) => projection.domain === row.domain);
      if (index >= 0) {
        state.projections[index] = row;
      } else {
        state.projections.push(row);
      }
      return { changes: 1 };
    }
    if (tag(sql, 'insert-quarantine')) {
      const row: InternalQuarantine = {
        quarantineId: stringParam(params[0]),
        sourceKind: stringParam(params[1]),
        sourceId: stringParam(params[2]),
        reason: stringParam(params[3]),
        canonicalPayload: stringParam(params[4]),
        fingerprint: stringParam(params[5]),
        byteLength: numberParam(params[6]),
        createdAtMs: numberParam(params[7]),
      };
      if (state.quarantine.some((item) => item.quarantineId === row.quarantineId)) {
        throw new Error('memory_database_quarantine_unique');
      }
      state.quarantine.push(row);
      return { changes: 1 };
    }
    if (tag(sql, 'insert-open-outbox')) {
      const row: InternalOutbox = {
        segmentId: stringParam(params[0]),
        deviceId: stringParam(params[1]),
        firstSequence: numberParam(params[2]),
        lastSequence: numberParam(params[3]),
        operationCount: numberParam(params[4]),
        canonicalOperationIds: stringParam(params[5]),
        byteLength: numberParam(params[6]),
        createdAtMs: numberParam(params[7]),
      };
      if (state.outbox.some((segment) => segment.deviceId === row.deviceId)) {
        throw new Error('memory_database_open_outbox_unique');
      }
      state.outbox.push(row);
      return { changes: 1 };
    }
    if (tag(sql, 'update-open-outbox')) {
      const segmentId = stringParam(params[4]);
      const index = state.outbox.findIndex((segment) => segment.segmentId === segmentId);
      if (index < 0) {
        throw new Error('memory_database_outbox_missing');
      }
      state.outbox[index] = {
        ...state.outbox[index],
        lastSequence: numberParam(params[0]),
        operationCount: numberParam(params[1]),
        canonicalOperationIds: stringParam(params[2]),
        byteLength: numberParam(params[3]),
      };
      return { changes: 1 };
    }
    throw new Error('memory_database_statement_unsupported');
  };

  const transaction: PhoneStateStoreTransaction = {
    getFirstAsync,
    getAllAsync,
    runAsync,
  };

  const database: MemoryPhoneStateDatabase = {
    getFirstAsync,
    getAllAsync,
    runAsync,
    withExclusiveTransactionAsync: async <T>(
      task: (activeTransaction: PhoneStateStoreTransaction) => Promise<T>,
    ): Promise<T> => {
      const before = cloneState(state);
      try {
        return await task(transaction);
      } catch (error) {
        state = before;
        throw error;
      }
    },
    snapshot: (): MemoryPhoneStateSnapshot => ({
      operations: state.operations.map((operation) => ({
        operationId: operation.operationId,
        idempotencyKey: operation.idempotencyKey,
        deviceSequence: operation.deviceSequence,
        domain: operation.domain,
      })),
      projections: state.projections.map((projection) => ({
        domain: projection.domain,
        reducerVersion: projection.reducerVersion,
        state: parseJson(projection.canonicalState),
        throughOperationCount: projection.throughOperationCount,
      })),
      outbox: state.outbox.map((segment) => ({
        segmentId: segment.segmentId,
        operationIds: parseJson(segment.canonicalOperationIds) as string[],
        operationCount: segment.operationCount,
      })),
      quarantine: state.quarantine.map((item) => ({
        quarantineId: item.quarantineId,
        reason: item.reason,
      })),
    }),
    deviceState: () => ({
      deviceId: state.deviceId,
      nextSequence: state.nextSequence,
      hybridCounter: state.hybridCounter,
    }),
  };

  return Object.freeze(database);
}
