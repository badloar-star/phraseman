import type { HybridClock } from '../contracts';
import { portableOwnerForKey } from '../domain_ownership';
import { legacyInventory } from '../legacy_inventory';
import type { DomainReducer } from '../reducer_registry';

export type ProgressRegister = Readonly<{
  value: string | null;
  clock: HybridClock;
}>;

export type ProgressRegistersState = Readonly<{
  registers: Readonly<Record<string, ProgressRegister>>;
  appliedOperationIds: readonly string[];
}>;

function isProgressFieldRegister(field: string): boolean {
  const row = legacyInventory.rows.find((candidate) => candidate.key === field);
  return portableOwnerForKey(field) === 'progress'
    && row?.scope === 'portable'
    && row.reducer === 'field_register';
}

function compareClock(left: HybridClock, right: HybridClock): number {
  return left.counter - right.counter || left.deviceId.localeCompare(right.deviceId);
}

function validValue(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.length <= 48 * 1024);
}

export function createProgressRegistersReducer(): DomainReducer<ProgressRegistersState> {
  return Object.freeze({
    domain: 'progress_registers',
    version: 1,
    initial: () => Object.freeze({
      registers: Object.freeze({}),
      appliedOperationIds: Object.freeze([]),
    }),
    apply: (state, operation) => {
      if (state.appliedOperationIds.includes(operation.operationId)) return state;
      const payload = operation.payload as { field?: unknown; value?: unknown };
      if (
        operation.kind !== 'set_field'
        || typeof payload?.field !== 'string'
        || !isProgressFieldRegister(payload.field)
        || !validValue(payload.value)
      ) {
        throw new Error('phone_state_progress_register_field_invalid');
      }
      const candidate: ProgressRegister = Object.freeze({
        value: payload.value,
        clock: Object.freeze({ ...operation.hybridClock }),
      });
      const current = state.registers[payload.field];
      const winner = current && compareClock(current.clock, candidate.clock) >= 0
        ? current
        : candidate;
      return Object.freeze({
        registers: Object.freeze({ ...state.registers, [payload.field]: winner }),
        appliedOperationIds: Object.freeze([...state.appliedOperationIds, operation.operationId].sort()),
      });
    },
    validate: (value: unknown): value is ProgressRegistersState => {
      if (value === null || typeof value !== 'object') return false;
      const state = value as Partial<ProgressRegistersState>;
      if (
        state.registers === null
        || typeof state.registers !== 'object'
        || !Array.isArray(state.appliedOperationIds)
        || !state.appliedOperationIds.every((id) => typeof id === 'string')
      ) return false;
      return Object.entries(state.registers).every(([field, register]) => (
        isProgressFieldRegister(field)
        && register !== null
        && typeof register === 'object'
        && validValue((register as ProgressRegister).value)
        && Number.isSafeInteger((register as ProgressRegister).clock?.counter)
        && (register as ProgressRegister).clock.counter >= 0
        && typeof (register as ProgressRegister).clock.deviceId === 'string'
      ));
    },
  });
}
