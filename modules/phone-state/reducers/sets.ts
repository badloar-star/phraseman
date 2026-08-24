import type { DomainReducer } from '../reducer_registry';
import {
  appendOperationId,
  isRecord,
  sortedUniqueStrings,
  validSortedUniqueStrings,
} from './helpers';

export type SetMaxState = Readonly<{
  ids: readonly string[];
  maximum: number | null;
  appliedOperationIds: readonly string[];
}>;

export function createSetMaxReducer(domain: string): DomainReducer<SetMaxState> {
  if (domain.length === 0) {
    throw new Error('set_max_domain_invalid');
  }
  return Object.freeze({
    domain,
    version: 1,
    initial: (): SetMaxState => ({ ids: [], maximum: null, appliedOperationIds: [] }),
    apply: (state, operation): SetMaxState => {
      const dedupe = appendOperationId(state.appliedOperationIds, operation.operationId);
      if (dedupe.duplicate) {
        return state;
      }
      if (!isRecord(operation.payload)) {
        throw new Error('set_max_payload_invalid');
      }
      const ids = operation.payload.ids;
      const observation = operation.payload.observation;
      if (
        !Array.isArray(ids)
        || ids.some((id) => typeof id !== 'string' || id.length === 0)
        || (observation !== null && typeof observation !== 'number')
        || (typeof observation === 'number' && !Number.isFinite(observation))
      ) {
        throw new Error('set_max_payload_invalid');
      }
      return {
        ids: sortedUniqueStrings([...state.ids, ...ids]),
        maximum: observation === null
          ? state.maximum
          : state.maximum === null ? observation : Math.max(state.maximum, observation),
        appliedOperationIds: dedupe.appliedOperationIds,
      };
    },
    validate: (state: unknown): state is SetMaxState => (
      isRecord(state)
      && validSortedUniqueStrings(state.ids)
      && (
        state.maximum === null
        || (typeof state.maximum === 'number' && Number.isFinite(state.maximum))
      )
      && validSortedUniqueStrings(state.appliedOperationIds)
    ),
  });
}
