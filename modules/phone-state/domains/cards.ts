import type { HybridClock } from '../contracts';
import { canonicalJsonWithLimit } from '../canonical';
import type { PersonalOperation } from '../contracts';
import type { DomainReducer } from '../reducer_registry';

export type CardEntityKind = 'card' | 'deck';
export type CardOperation = Readonly<{
  kind: 'upsert' | 'delete' | 'membership';
  entityKind: CardEntityKind;
  entityId: string;
  clock: HybridClock;
  fields?: Readonly<Record<string, unknown>>;
  deckId?: string;
  member?: boolean;
}>;

type Cell = Readonly<{ value: unknown; clock: HybridClock }>;
type Entity = Readonly<{ fields: Readonly<Record<string, Cell>>; tombstone: HybridClock | null }>;
export type CardsProjection = Readonly<{
  visibleCards: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  visibleDecks: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  memberships: Readonly<Record<string, readonly string[]>>;
  tombstones: Readonly<Record<string, HybridClock>>;
}>;

const compare = (left: HybridClock, right: HybridClock): number => (
  left.counter - right.counter || left.deviceId.localeCompare(right.deviceId)
);

function validId(value: string): boolean {
  return /^[A-Za-z0-9_.:-]{1,160}$/.test(value);
}

export function replayCards(operations: readonly CardOperation[]): CardsProjection {
  const entities = new Map<string, Entity>();
  const memberships = new Map<string, Map<string, Cell>>();
  for (const operation of operations) {
    if (!validId(operation.entityId)) throw new Error('phone_state_card_id_invalid');
    canonicalJsonWithLimit(operation, 32 * 1024);
    const key = `${operation.entityKind}:${operation.entityId}`;
    const previous = entities.get(key) ?? { fields: {}, tombstone: null };
    if (operation.kind === 'delete') {
      const tombstone = !previous.tombstone || compare(operation.clock, previous.tombstone) > 0
        ? operation.clock
        : previous.tombstone;
      entities.set(key, { fields: previous.fields, tombstone });
      continue;
    }
    if (operation.kind === 'membership') {
      if (operation.entityKind !== 'card' || !operation.deckId || !validId(operation.deckId)) {
        throw new Error('phone_state_card_membership_invalid');
      }
      const deck = memberships.get(operation.deckId) ?? new Map<string, Cell>();
      const current = deck.get(operation.entityId);
      if (!current || compare(operation.clock, current.clock) > 0) {
        deck.set(operation.entityId, { value: operation.member === true, clock: operation.clock });
      }
      memberships.set(operation.deckId, deck);
      continue;
    }
    if (!operation.fields || Object.keys(operation.fields).length === 0) {
      throw new Error('phone_state_card_fields_invalid');
    }
    const fields: Record<string, Cell> = { ...previous.fields };
    for (const [field, value] of Object.entries(operation.fields)) {
      const current = fields[field];
      if (!current || compare(operation.clock, current.clock) > 0) {
        fields[field] = { value, clock: operation.clock };
      }
    }
    entities.set(key, { fields, tombstone: previous.tombstone });
  }
  const visible = (kind: CardEntityKind): Readonly<Record<string, Readonly<Record<string, unknown>>>> => (
    Object.freeze(Object.fromEntries([...entities.entries()]
      .filter(([key, entity]) => key.startsWith(`${kind}:`)
        && (!entity.tombstone || Object.values(entity.fields).some((cell) => compare(cell.clock, entity.tombstone!) > 0)))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entity]) => [key.slice(kind.length + 1), Object.freeze(Object.fromEntries(
        Object.entries(entity.fields)
          .filter(([, cell]) => !entity.tombstone || compare(cell.clock, entity.tombstone) > 0)
          .map(([field, cell]) => [field, cell.value]),
      ))])))
  );
  return Object.freeze({
    visibleCards: visible('card'),
    visibleDecks: visible('deck'),
    memberships: Object.freeze(Object.fromEntries([...memberships.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([deckId, cells]) => [deckId, Object.freeze([...cells.entries()]
        .filter(([, cell]) => cell.value === true)
        .map(([cardId]) => cardId).sort())]))),
    tombstones: Object.freeze(Object.fromEntries([...entities.entries()]
      .filter(([, entity]) => entity.tombstone !== null)
      .map(([key, entity]): [string, HybridClock] => [key, entity.tombstone!])
      .sort(([a], [b]) => a.localeCompare(b)))),
  });
}

export const cardOperations = Object.freeze({
  upsertCard: (entityId: string, clock: HybridClock, fields: Readonly<Record<string, unknown>>): CardOperation => (
    Object.freeze({ kind: 'upsert', entityKind: 'card', entityId, clock, fields })
  ),
  deleteCard: (entityId: string, clock: HybridClock): CardOperation => (
    Object.freeze({ kind: 'delete', entityKind: 'card', entityId, clock })
  ),
  upsertDeck: (entityId: string, clock: HybridClock, fields: Readonly<Record<string, unknown>>): CardOperation => (
    Object.freeze({ kind: 'upsert', entityKind: 'deck', entityId, clock, fields })
  ),
  deleteDeck: (entityId: string, clock: HybridClock): CardOperation => (
    Object.freeze({ kind: 'delete', entityKind: 'deck', entityId, clock })
  ),
  setDeckMembership: (cardId: string, deckId: string, member: boolean, clock: HybridClock): CardOperation => (
    Object.freeze({ kind: 'membership', entityKind: 'card', entityId: cardId, deckId, member, clock })
  ),
});

export type CardsReducerState = Readonly<{
  entities: Readonly<Record<string, Entity>>;
  memberships: Readonly<Record<string, Readonly<Record<string, Cell>>>>;
  legacyImported: boolean;
}>;

function applyEntityOperation(
  state: CardsReducerState,
  entityKind: CardEntityKind,
  entityId: string,
  clock: HybridClock,
  fields: Readonly<Record<string, unknown>> | null,
  deleted: boolean,
): CardsReducerState {
  if (!validId(entityId)) throw new Error('phone_state_card_id_invalid');
  const key = `${entityKind}:${entityId}`;
  const previous = state.entities[key] ?? { fields: Object.freeze({}), tombstone: null };
  if (deleted) {
    const tombstone = !previous.tombstone || compare(clock, previous.tombstone) > 0
      ? Object.freeze({ ...clock })
      : previous.tombstone;
    return Object.freeze({
      ...state,
      entities: Object.freeze({ ...state.entities, [key]: Object.freeze({ ...previous, tombstone }) }),
    });
  }
  if (!fields || Object.keys(fields).length === 0) throw new Error('phone_state_card_fields_invalid');
  canonicalJsonWithLimit(fields, 32 * 1024);
  const nextFields: Record<string, Cell> = { ...previous.fields };
  for (const [field, value] of Object.entries(fields)) {
    const current = nextFields[field];
    if (!current || compare(clock, current.clock) > 0) {
      nextFields[field] = Object.freeze({ value, clock: Object.freeze({ ...clock }) });
    }
  }
  return Object.freeze({
    ...state,
    entities: Object.freeze({
      ...state.entities,
      [key]: Object.freeze({ fields: Object.freeze(nextFields), tombstone: previous.tombstone }),
    }),
  });
}

export function cardsProjectionFromReducerState(state: CardsReducerState): CardsProjection {
  const visible = (kind: CardEntityKind): Readonly<Record<string, Readonly<Record<string, unknown>>>> => (
    Object.freeze(Object.fromEntries(Object.entries(state.entities)
      .filter(([key, entity]) => key.startsWith(`${kind}:`)
        && (!entity.tombstone || Object.values(entity.fields).some((cell) => compare(cell.clock, entity.tombstone!) > 0)))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entity]) => [key.slice(kind.length + 1), Object.freeze(Object.fromEntries(
        Object.entries(entity.fields)
          .filter(([, cell]) => !entity.tombstone || compare(cell.clock, entity.tombstone) > 0)
          .map(([field, cell]) => [field, cell.value]),
      ))])))
  );
  return Object.freeze({
    visibleCards: visible('card'),
    visibleDecks: visible('deck'),
    memberships: Object.freeze(Object.fromEntries(Object.entries(state.memberships)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([deckId, cells]) => [deckId, Object.freeze(Object.entries(cells)
        .filter(([, cell]) => cell.value === true)
        .map(([cardId]) => cardId)
        .sort())]))),
    tombstones: Object.freeze(Object.fromEntries(Object.entries(state.entities)
      .filter(([, entity]) => entity.tombstone !== null)
      .map(([key, entity]): [string, HybridClock] => [key, entity.tombstone!])
      .sort(([left], [right]) => left.localeCompare(right)))),
  });
}

export function createCardsReducer(): DomainReducer<CardsReducerState> {
  return Object.freeze({
    domain: 'cards',
    version: 1,
    initial: () => Object.freeze({
      entities: Object.freeze({}),
      memberships: Object.freeze({}),
      legacyImported: false,
    }),
    apply: (state, operation: PersonalOperation) => {
      const payload = operation.payload as Record<string, unknown> | null;
      if (operation.kind === 'opening_import') {
        if (state.legacyImported) return state;
        const cards = payload?.cards;
        if (!Array.isArray(cards)) throw new Error('phone_state_card_import_invalid');
        let next = state;
        for (const candidate of cards) {
          if (!candidate || typeof candidate !== 'object' || typeof (candidate as { id?: unknown }).id !== 'string') {
            throw new Error('phone_state_card_import_invalid');
          }
          const card = candidate as Record<string, unknown> & { id: string };
          next = applyEntityOperation(next, 'card', card.id, operation.hybridClock, card, false);
        }
        return Object.freeze({ ...next, legacyImported: true });
      }
      if (operation.kind === 'upsert_card' || operation.kind === 'upsert_deck') {
        if (!operation.entityId || !payload?.fields || typeof payload.fields !== 'object' || Array.isArray(payload.fields)) {
          throw new Error('phone_state_card_fields_invalid');
        }
        return applyEntityOperation(
          state,
          operation.kind === 'upsert_card' ? 'card' : 'deck',
          operation.entityId,
          operation.hybridClock,
          payload.fields as Readonly<Record<string, unknown>>,
          false,
        );
      }
      if (operation.kind === 'delete_card' || operation.kind === 'delete_deck') {
        if (!operation.entityId) throw new Error('phone_state_card_id_invalid');
        return applyEntityOperation(
          state,
          operation.kind === 'delete_card' ? 'card' : 'deck',
          operation.entityId,
          operation.hybridClock,
          null,
          true,
        );
      }
      if (operation.kind === 'set_deck_membership') {
        const deckId = payload?.deckId;
        if (!operation.entityId || typeof deckId !== 'string' || !validId(deckId)) {
          throw new Error('phone_state_card_membership_invalid');
        }
        const deck = state.memberships[deckId] ?? Object.freeze({});
        const current = deck[operation.entityId];
        if (current && compare(operation.hybridClock, current.clock) <= 0) return state;
        return Object.freeze({
          ...state,
          memberships: Object.freeze({
            ...state.memberships,
            [deckId]: Object.freeze({
              ...deck,
              [operation.entityId]: Object.freeze({
                value: payload?.member === true,
                clock: Object.freeze({ ...operation.hybridClock }),
              }),
            }),
          }),
        });
      }
      throw new Error('phone_state_card_operation_invalid');
    },
    validate: (value: unknown): value is CardsReducerState => {
      if (!value || typeof value !== 'object') return false;
      const state = value as Partial<CardsReducerState>;
      return !!state.entities
        && typeof state.entities === 'object'
        && !!state.memberships
        && typeof state.memberships === 'object'
        && typeof state.legacyImported === 'boolean';
    },
  });
}
