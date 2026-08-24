import type { DomainReducer } from '../reducer_registry';
import {
  appendOperationId,
  isRecord,
  isSafeInteger,
  validSortedUniqueStrings,
} from './helpers';

export type CounterState = Readonly<{
  value: number;
  appliedOperationIds: readonly string[];
}>;

export function createCounterReducer(domain: string): DomainReducer<CounterState> {
  if (domain.length === 0) {
    throw new Error('counter_domain_invalid');
  }
  return Object.freeze({
    domain,
    version: 1,
    initial: (): CounterState => ({ value: 0, appliedOperationIds: [] }),
    apply: (state, operation): CounterState => {
      const dedupe = appendOperationId(state.appliedOperationIds, operation.operationId);
      if (dedupe.duplicate) {
        return state;
      }
      if (!isRecord(operation.payload) || !isSafeInteger(operation.payload.delta)) {
        throw new Error('counter_delta_invalid');
      }
      const value = state.value + operation.payload.delta;
      if (!Number.isSafeInteger(value)) {
        throw new Error('counter_overflow');
      }
      return { value, appliedOperationIds: dedupe.appliedOperationIds };
    },
    validate: (state: unknown): state is CounterState => (
      isRecord(state)
      && isSafeInteger(state.value)
      && validSortedUniqueStrings(state.appliedOperationIds)
    ),
  });
}
