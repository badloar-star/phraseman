import type { HybridClock } from '../contracts';
import { portableOwnerForKey } from '../domain_ownership';
import type { DomainReducer } from '../reducer_registry';

export type PreferenceOperation = Readonly<{
  field: string;
  value: unknown;
  clock: HybridClock;
}>;

export type PreferenceRegister = Readonly<{ value: unknown; clock: HybridClock }>;

export function comparePreferenceClock(left: HybridClock, right: HybridClock): number {
  return left.counter - right.counter || left.deviceId.localeCompare(right.deviceId);
}

export function resolveRegister(
  left: PreferenceOperation | PreferenceRegister,
  right: PreferenceOperation | PreferenceRegister,
): PreferenceRegister {
  const winner = comparePreferenceClock(left.clock, right.clock) >= 0 ? left : right;
  return Object.freeze({ value: winner.value, clock: Object.freeze({ ...winner.clock }) });
}

export function mergePreferenceOperations(
  operations: readonly PreferenceOperation[],
): Readonly<Record<string, unknown>> {
  const registers: Record<string, PreferenceRegister> = {};
  for (const operation of operations) {
    if (portableOwnerForKey(operation.field) !== 'preferences') {
      throw new Error('phone_state_preference_field_invalid');
    }
    const current = registers[operation.field];
    registers[operation.field] = current ? resolveRegister(current, operation) : Object.freeze({
      value: operation.value,
      clock: Object.freeze({ ...operation.clock }),
    });
  }
  return Object.freeze(Object.fromEntries(
    Object.entries(registers).sort(([left], [right]) => left.localeCompare(right))
      .map(([field, register]) => [field, register.value]),
  ));
}

export interface PersonalPreferencesJournal {
  commit(input: Readonly<{ field: string; value: unknown; idempotencyKey: string }>): Promise<void>;
  read(): Promise<Readonly<Record<string, unknown>>>;
}

export interface PersonalPreferencesApi {
  setField(field: string, value: unknown, idempotencyKey: string): Promise<void>;
  readFields(fields: readonly string[]): Promise<Readonly<Record<string, unknown>>>;
}

export function createPersonalPreferencesApi(journal: PersonalPreferencesJournal): PersonalPreferencesApi {
  const api: PersonalPreferencesApi = {
    setField: async (field: string, value: unknown, idempotencyKey: string) => {
      if (portableOwnerForKey(field) !== 'preferences' || !idempotencyKey.trim()) {
        throw new Error('phone_state_preference_field_invalid');
      }
      await journal.commit({ field, value, idempotencyKey });
    },
    readFields: async (fields: readonly string[]) => {
      if (fields.some((field) => portableOwnerForKey(field) !== 'preferences')) {
        throw new Error('phone_state_preference_field_invalid');
      }
      const all = await journal.read();
      return Object.freeze(Object.fromEntries(
        [...new Set(fields)].sort().filter((field) => Object.prototype.hasOwnProperty.call(all, field))
          .map((field) => [field, all[field]]),
      ));
    },
  };
  return Object.freeze(api);
}

export type PreferenceReducerState = Readonly<{
  registers: Readonly<Record<string, PreferenceRegister>>;
  appliedOperationIds: readonly string[];
}>;

export function createPreferencesReducer(): DomainReducer<PreferenceReducerState> {
  return Object.freeze({
    domain: 'preferences',
    version: 1,
    initial: () => Object.freeze({ registers: Object.freeze({}), appliedOperationIds: Object.freeze([]) }),
    apply: (state, operation) => {
      if (state.appliedOperationIds.includes(operation.operationId)) return state;
      const payload = operation.payload as { field?: unknown; value?: unknown };
      if (typeof payload?.field !== 'string' || portableOwnerForKey(payload.field) !== 'preferences') {
        throw new Error('phone_state_preference_field_invalid');
      }
      const current = state.registers[payload.field];
      const candidate: PreferenceRegister = { value: payload.value, clock: operation.hybridClock };
      const winner = current ? resolveRegister(current, candidate) : candidate;
      return Object.freeze({
        registers: Object.freeze({ ...state.registers, [payload.field]: winner }),
        appliedOperationIds: Object.freeze([...state.appliedOperationIds, operation.operationId].sort()),
      });
    },
    validate: (value: unknown): value is PreferenceReducerState => {
      if (value === null || typeof value !== 'object') return false;
      const state = value as Partial<PreferenceReducerState>;
      return state.registers !== null
        && typeof state.registers === 'object'
        && Array.isArray(state.appliedOperationIds)
        && state.appliedOperationIds.every((id) => typeof id === 'string');
    },
  });
}
