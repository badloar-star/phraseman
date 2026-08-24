import type { HybridClock } from '../contracts';
import type { DomainReducer } from '../reducer_registry';
import {
  appendOperationId,
  compareHybridClock,
  isHybridClock,
  isRecord,
  sortedRecord,
  validSortedUniqueStrings,
} from './helpers';

export type RegisterCell = Readonly<{
  value: unknown;
  clock: HybridClock;
}>;

export type RegisterState = Readonly<{
  fields: Readonly<Record<string, RegisterCell>>;
  appliedOperationIds: readonly string[];
}>;

export function validRegisterCell(value: unknown): value is RegisterCell {
  return isRecord(value) && 'value' in value && isHybridClock(value.clock);
}

export function createRegisterReducer(domain: string): DomainReducer<RegisterState> {
  if (domain.length === 0) {
    throw new Error('register_domain_invalid');
  }
  return Object.freeze({
    domain,
    version: 1,
    initial: (): RegisterState => ({ fields: {}, appliedOperationIds: [] }),
    apply: (state, operation): RegisterState => {
      const dedupe = appendOperationId(state.appliedOperationIds, operation.operationId);
      if (dedupe.duplicate) {
        return state;
      }
      if (!isRecord(operation.payload) || !isRecord(operation.payload.fields)) {
        throw new Error('register_payload_invalid');
      }
      const fields: Record<string, RegisterCell> = { ...state.fields };
      for (const [field, value] of Object.entries(operation.payload.fields)) {
        if (field.length === 0) {
          throw new Error('register_field_invalid');
        }
        const current = fields[field];
        if (!current || compareHybridClock(operation.hybridClock, current.clock) > 0) {
          fields[field] = { value, clock: operation.hybridClock };
        }
      }
      return {
        fields: sortedRecord(Object.entries(fields)),
        appliedOperationIds: dedupe.appliedOperationIds,
      };
    },
    validate: (state: unknown): state is RegisterState => (
      isRecord(state)
      && isRecord(state.fields)
      && Object.entries(state.fields).every(([field, cell]) => (
        field.length > 0 && validRegisterCell(cell)
      ))
      && validSortedUniqueStrings(state.appliedOperationIds)
    ),
  });
}
