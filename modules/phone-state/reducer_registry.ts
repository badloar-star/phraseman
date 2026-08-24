import type { PersonalOperation, ProjectionEnvelope } from './contracts';

export type DomainReducer<State> = Readonly<{
  domain: string;
  version: number;
  initial: () => State;
  apply: (state: State, operation: PersonalOperation) => State;
  validate: (state: unknown) => state is State;
}>;

export type ReduceResult =
  | Readonly<{ kind: 'applied'; projection: ProjectionEnvelope }>
  | Readonly<{ kind: 'quarantine'; reason: 'unknown_domain' | 'invalid_operation' }>;

export type ReducerRegistry = Readonly<{
  reduce: (
    projection: ProjectionEnvelope | undefined,
    operation: PersonalOperation,
  ) => ReduceResult;
  replay: (domain: string, operations: readonly PersonalOperation[]) => ReduceResult;
}>;

type RegisteredReducer = Readonly<{
  domain: string;
  version: number;
  initial: () => unknown;
  apply: (state: unknown, operation: PersonalOperation) => unknown;
  validate: (state: unknown) => boolean;
}>;

type ReducerTuple<Reducers extends readonly unknown[]> = {
  readonly [Index in keyof Reducers]: Reducers[Index] extends DomainReducer<infer State>
    ? DomainReducer<State>
    : never;
};

const INVALID_OPERATION = Object.freeze({
  kind: 'quarantine' as const,
  reason: 'invalid_operation' as const,
});

const UNKNOWN_DOMAIN = Object.freeze({
  kind: 'quarantine' as const,
  reason: 'unknown_domain' as const,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isSafeIntegerAtLeast(value: unknown, minimum: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= minimum;
}

function operationDomain(operation: unknown): string | null {
  if (!isRecord(operation) || !isNonEmptyString(operation.domain)) {
    return null;
  }
  return operation.domain;
}

function isPersonalOperation(value: unknown): value is PersonalOperation {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    return false;
  }

  if (
    !isNonEmptyString(value.operationId)
    || !isNonEmptyString(value.stableUid)
    || !isSafeIntegerAtLeast(value.accountGeneration, 0)
    || !isNonEmptyString(value.deviceId)
    || !isSafeIntegerAtLeast(value.deviceSequence, 1)
    || !isNonEmptyString(value.domain)
    || !isNonEmptyString(value.kind)
    || (value.entityId !== null && typeof value.entityId !== 'string')
    || !isSafeIntegerAtLeast(value.createdAtMs, 0)
    || typeof value.fingerprint !== 'string'
    || !/^[a-f0-9]{64}$/.test(value.fingerprint)
  ) {
    return false;
  }

  if (!isRecord(value.hybridClock)) {
    return false;
  }

  return (
    isSafeIntegerAtLeast(value.hybridClock.counter, 0)
    && value.hybridClock.deviceId === value.deviceId
  );
}

function normalizeReducer(candidate: unknown): RegisteredReducer {
  if (!isRecord(candidate)) {
    throw new Error('invalid_reducer');
  }

  const { domain, version, initial, apply, validate } = candidate;
  if (
    !isNonEmptyString(domain)
    || !isSafeIntegerAtLeast(version, 1)
    || typeof initial !== 'function'
    || typeof apply !== 'function'
    || typeof validate !== 'function'
  ) {
    throw new Error('invalid_reducer');
  }

  return Object.freeze({
    domain,
    version,
    initial: initial as () => unknown,
    apply: apply as (state: unknown, operation: PersonalOperation) => unknown,
    validate: validate as (state: unknown) => boolean,
  });
}

function validProjection(
  projection: ProjectionEnvelope,
  reducer: RegisteredReducer,
): boolean {
  if (
    projection.schemaVersion !== 1
    || projection.domain !== reducer.domain
    || projection.reducerVersion !== reducer.version
    || !isSafeIntegerAtLeast(projection.throughOperationCount, 0)
  ) {
    return false;
  }

  try {
    return reducer.validate(projection.state);
  } catch {
    return false;
  }
}

function initialProjection(reducer: RegisteredReducer): ProjectionEnvelope | null {
  try {
    const state = reducer.initial();
    if (!reducer.validate(state)) {
      return null;
    }
    return Object.freeze({
      schemaVersion: 1 as const,
      domain: reducer.domain,
      reducerVersion: reducer.version,
      state,
      throughOperationCount: 0,
    });
  } catch {
    return null;
  }
}

export function createReducerRegistry<const Reducers extends readonly unknown[]>(
  reducerDefinitions: Reducers & ReducerTuple<Reducers>,
): ReducerRegistry {
  const reducers = new Map<string, RegisteredReducer>();
  for (const definition of reducerDefinitions as readonly unknown[]) {
    const reducer = normalizeReducer(definition);
    if (reducers.has(reducer.domain)) {
      throw new Error(`duplicate_reducer_domain:${reducer.domain}`);
    }
    reducers.set(reducer.domain, reducer);
  }

  const reduce = (
    projection: ProjectionEnvelope | undefined,
    operation: PersonalOperation,
  ): ReduceResult => {
    const domain = operationDomain(operation);
    if (domain === null) {
      return INVALID_OPERATION;
    }

    const reducer = reducers.get(domain);
    if (!reducer) {
      return UNKNOWN_DOMAIN;
    }
    if (!isPersonalOperation(operation)) {
      return INVALID_OPERATION;
    }

    const currentProjection = projection ?? initialProjection(reducer);
    if (currentProjection === null || !validProjection(currentProjection, reducer)) {
      return INVALID_OPERATION;
    }
    if (!isSafeIntegerAtLeast(currentProjection.throughOperationCount + 1, 1)) {
      return INVALID_OPERATION;
    }

    try {
      const state = reducer.apply(currentProjection.state, operation);
      if (!reducer.validate(state)) {
        return INVALID_OPERATION;
      }
      const nextProjection: ProjectionEnvelope = Object.freeze({
        schemaVersion: 1,
        domain: reducer.domain,
        reducerVersion: reducer.version,
        state,
        throughOperationCount: currentProjection.throughOperationCount + 1,
      });
      return Object.freeze({ kind: 'applied', projection: nextProjection });
    } catch {
      return INVALID_OPERATION;
    }
  };

  const replay = (
    domain: string,
    operations: readonly PersonalOperation[],
  ): ReduceResult => {
    const reducer = reducers.get(domain);
    if (!reducer) {
      return UNKNOWN_DOMAIN;
    }

    let projection = initialProjection(reducer);
    if (projection === null) {
      return INVALID_OPERATION;
    }

    for (const operation of operations) {
      if (operationDomain(operation) !== domain) {
        return INVALID_OPERATION;
      }
      const result = reduce(projection, operation);
      if (result.kind === 'quarantine') {
        return result;
      }
      projection = result.projection;
    }

    return Object.freeze({ kind: 'applied', projection });
  };

  return Object.freeze({ reduce, replay });
}
