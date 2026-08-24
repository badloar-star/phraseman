import type { HybridClock } from '../contracts';
import type { DomainReducer } from '../reducer_registry';
import type { RegisterCell } from './register';
import { validRegisterCell } from './register';
import {
  appendOperationId,
  compareHybridClock,
  isHybridClock,
  isRecord,
  sortedRecord,
  validSortedUniqueStrings,
} from './helpers';

export type EntityProjection = Readonly<{
  visible: boolean;
  fields: Readonly<Record<string, RegisterCell>>;
  tombstone: HybridClock | null;
}>;

export type EntityState = Readonly<{
  entities: Readonly<Record<string, EntityProjection>>;
  appliedOperationIds: readonly string[];
}>;

function fieldsAfterTombstone(
  fields: Readonly<Record<string, RegisterCell>>,
  tombstone: HybridClock | null,
): Record<string, RegisterCell> {
  return sortedRecord(Object.entries(fields).filter(([, cell]) => (
    tombstone === null || compareHybridClock(cell.clock, tombstone) > 0
  )));
}

function validEntity(value: unknown): value is EntityProjection {
  return isRecord(value)
    && typeof value.visible === 'boolean'
    && isRecord(value.fields)
    && Object.entries(value.fields).every(([field, cell]) => (
      field.length > 0 && validRegisterCell(cell)
    ))
    && (value.tombstone === null || isHybridClock(value.tombstone))
    && value.visible === (Object.keys(value.fields).length > 0);
}

export function createEntityReducer(domain: string): DomainReducer<EntityState> {
  if (domain.length === 0) {
    throw new Error('entity_domain_invalid');
  }
  return Object.freeze({
    domain,
    version: 1,
    initial: (): EntityState => ({ entities: {}, appliedOperationIds: [] }),
    apply: (state, operation): EntityState => {
      const dedupe = appendOperationId(state.appliedOperationIds, operation.operationId);
      if (dedupe.duplicate) {
        return state;
      }
      if (typeof operation.entityId !== 'string' || operation.entityId.length === 0) {
        throw new Error('entity_id_invalid');
      }

      const previous = state.entities[operation.entityId] ?? {
        visible: false,
        fields: {},
        tombstone: null,
      };
      let tombstone = previous.tombstone;
      let fields: Record<string, RegisterCell> = { ...previous.fields };

      if (operation.kind === 'delete') {
        if (!tombstone || compareHybridClock(operation.hybridClock, tombstone) > 0) {
          tombstone = operation.hybridClock;
        }
      } else if (operation.kind === 'upsert') {
        if (!isRecord(operation.payload) || !isRecord(operation.payload.fields)) {
          throw new Error('entity_payload_invalid');
        }
        for (const [field, value] of Object.entries(operation.payload.fields)) {
          if (field.length === 0) {
            throw new Error('entity_field_invalid');
          }
          const current = fields[field];
          if (!current || compareHybridClock(operation.hybridClock, current.clock) > 0) {
            fields[field] = { value, clock: operation.hybridClock };
          }
        }
      } else {
        throw new Error('entity_kind_invalid');
      }

      fields = fieldsAfterTombstone(fields, tombstone);
      const entities = sortedRecord([
        ...Object.entries(state.entities).filter(([entityId]) => entityId !== operation.entityId),
        [operation.entityId, {
          visible: Object.keys(fields).length > 0,
          fields,
          tombstone,
        }],
      ]);
      return { entities, appliedOperationIds: dedupe.appliedOperationIds };
    },
    validate: (state: unknown): state is EntityState => (
      isRecord(state)
      && isRecord(state.entities)
      && Object.entries(state.entities).every(([entityId, entity]) => (
        entityId.length > 0 && validEntity(entity)
      ))
      && validSortedUniqueStrings(state.appliedOperationIds)
    ),
  });
}
