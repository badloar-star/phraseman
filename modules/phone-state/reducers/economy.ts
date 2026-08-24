import type { DomainReducer } from '../reducer_registry';
import {
  appendOperationId,
  isRecord,
  isSafeInteger,
  sortedUniqueStrings,
  validSortedUniqueStrings,
} from './helpers';

export type EconomyState = Readonly<{
  balance: number;
  grants: readonly string[];
  appliedOperationIds: readonly string[];
}>;

export function canSpend(state: EconomyState, amount: number): boolean {
  return Number.isSafeInteger(amount) && amount > 0 && state.balance >= amount;
}

export const economyReducer: DomainReducer<EconomyState> = Object.freeze({
  domain: 'economy',
  version: 1,
  initial: (): EconomyState => ({ balance: 0, grants: [], appliedOperationIds: [] }),
  apply: (state, operation): EconomyState => {
    const dedupe = appendOperationId(state.appliedOperationIds, operation.operationId);
    if (dedupe.duplicate) {
      return state;
    }
    if (
      operation.kind !== 'composite'
      || !isRecord(operation.payload)
      || !isSafeInteger(operation.payload.delta)
      || !Array.isArray(operation.payload.grants)
      || operation.payload.grants.some((grant) => (
        typeof grant !== 'string' || grant.length === 0
      ))
      || (operation.payload.delta < 0 && operation.payload.grants.length === 0)
    ) {
      throw new Error('economy_composite_invalid');
    }
    const balance = state.balance + operation.payload.delta;
    if (!Number.isSafeInteger(balance)) {
      throw new Error('economy_balance_overflow');
    }
    return {
      balance,
      grants: sortedUniqueStrings([...state.grants, ...operation.payload.grants]),
      appliedOperationIds: dedupe.appliedOperationIds,
    };
  },
  validate: (state: unknown): state is EconomyState => (
    isRecord(state)
    && isSafeInteger(state.balance)
    && validSortedUniqueStrings(state.grants)
    && validSortedUniqueStrings(state.appliedOperationIds)
  ),
});
