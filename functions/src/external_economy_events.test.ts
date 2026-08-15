import {
  EXTERNAL_ECONOMY_EVENT_SCHEMA,
  appendExternalEconomyEvent,
  externalEconomyEventDocumentId,
} from './external_economy_events';

describe('external economy event append contract', () => {
  it('derives a stable identity from source + event id and separates attempts', () => {
    expect(externalEconomyEventDocumentId('tournament_entry', 'room:v1'))
      .toBe(externalEconomyEventDocumentId('tournament_entry', 'room:v1'));
    expect(externalEconomyEventDocumentId('tournament_entry', 'room:v1'))
      .not.toBe(externalEconomyEventDocumentId('tournament_entry', 'room:v3'));
    expect(externalEconomyEventDocumentId('tournament_entry', 'room:v1'))
      .not.toBe(externalEconomyEventDocumentId('tournament_lobby_leave', 'room:v1'));
  });

  it('creates one immutable owner-scoped event through the supplied transaction', () => {
    const create = jest.fn();
    const eventRef = { path: 'users/stable-a/external_economy_events/hash' };
    const doc = jest.fn(() => eventRef);
    const collection = jest.fn(() => ({ doc }));
    const userRef = { id: 'stable-a', collection } as unknown as FirebaseFirestore.DocumentReference;
    const transaction = { create } as unknown as FirebaseFirestore.Transaction;

    expect(appendExternalEconomyEvent(transaction, userRef, {
      source: 'tournament_entry', eventId: 'room:v1', ownerStableId: 'stable-a',
      delta: -5, reason: 'tournament_entry', kind: 'competition_tournament_entry',
      subjectId: 'room', createdAtMs: 123,
    })).toBe(eventRef);
    expect(create).toHaveBeenCalledWith(eventRef, expect.objectContaining({
      schemaVersion: EXTERNAL_ECONOMY_EVENT_SCHEMA,
      source: 'tournament_entry', eventId: 'room:v1', ownerStableId: 'stable-a',
      delta: -5, createdAtMs: 123,
    }));
  });

  it('rejects a mismatched owner before creating anything', () => {
    const create = jest.fn();
    const userRef = { id: 'stable-b', collection: jest.fn() } as unknown as FirebaseFirestore.DocumentReference;
    expect(() => appendExternalEconomyEvent({ create } as unknown as FirebaseFirestore.Transaction, userRef, {
      source: 'arena_v2_spin', eventId: 'request-1', ownerStableId: 'stable-a',
      delta: 1, reason: 'arena_v2_spin_reward', kind: 'competition_arena_spin_reward',
      subjectId: 'credit-1', createdAtMs: 123,
    })).toThrow('external_event_owner_mismatch');
    expect(create).not.toHaveBeenCalled();
  });
});
