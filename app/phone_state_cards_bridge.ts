import * as Crypto from 'expo-crypto';

import type { PhoneStateScope } from '../modules/phone-state/account_secret';
import type { PendingPersonalOperation } from '../modules/phone-state/contracts';
import {
  cardsProjectionFromReducerState,
  type CardsReducerState,
} from '../modules/phone-state/domains/cards';
import type { PhoneStateStore } from '../modules/phone-state/store';
import type { CardItem } from './flashcards/types';

type Runtime = Readonly<{
  scope: PhoneStateScope;
  deviceId: string;
  store: PhoneStateStore;
  enabled: () => boolean;
}>;

let runtime: Runtime | null = null;

export function configurePhoneStateCardsBridge(next: Runtime | null): void {
  runtime = next;
}

function pending(
  active: Runtime,
  kind: string,
  entityId: string | null,
  payload: Readonly<Record<string, unknown>>,
): PendingPersonalOperation {
  return Object.freeze({
    schemaVersion: 1,
    stableUid: active.scope.stableUid,
    accountGeneration: active.scope.accountGeneration,
    deviceId: active.deviceId,
    domain: 'cards',
    kind,
    entityId,
    payload,
    exactResult: Object.freeze({ entityId }),
    createdAtMs: Date.now(),
  });
}

async function reducerState(active: Runtime): Promise<CardsReducerState | null> {
  const projection = await active.store.readProjection('cards');
  return (projection?.state as CardsReducerState | undefined) ?? null;
}

export async function readPhoneStateCustomCards(legacy: readonly CardItem[]): Promise<CardItem[]> {
  const active = runtime;
  if (!active || !active.enabled()) return [...legacy];
  try {
    const state = await reducerState(active);
    if (!state?.legacyImported) return [...legacy];
    return Object.values(cardsProjectionFromReducerState(state).visibleCards) as unknown as CardItem[];
  } catch {
    return [...legacy];
  }
}

async function ensureOpeningImport(active: Runtime, legacy: readonly CardItem[]): Promise<void> {
  const state = await reducerState(active);
  if (state?.legacyImported) return;
  // One bounded operation per card: a large legacy library must never create
  // an oversized journal entry. Stable keys make crash-resume idempotent.
  for (const card of legacy) {
    await active.store.commit(
      pending(active, 'upsert_card', card.id, Object.freeze({ fields: Object.freeze({ ...card }) })),
      { idempotencyKey: `cards:opening-import:v1:${card.id}` },
    );
  }
  await active.store.commit(
    pending(active, 'opening_import', null, Object.freeze({ cards: Object.freeze([]) })),
    { idempotencyKey: 'cards:opening-import:v1:complete' },
  );
}

export async function commitPhoneStateCustomCards(
  previous: readonly CardItem[],
  next: readonly CardItem[],
): Promise<void> {
  const active = runtime;
  if (!active || !active.enabled()) return;
  await ensureOpeningImport(active, previous);
  const before = new Map(previous.map((card) => [card.id, card]));
  const after = new Map(next.map((card) => [card.id, card]));
  for (const card of next) {
    const current = before.get(card.id);
    if (current && JSON.stringify(current) === JSON.stringify(card)) continue;
    await active.store.commit(
      pending(active, 'upsert_card', card.id, Object.freeze({ fields: Object.freeze({ ...card }) })),
      { idempotencyKey: `cards:${Crypto.randomUUID()}` },
    );
  }
  for (const card of previous) {
    if (after.has(card.id)) continue;
    await active.store.commit(
      pending(active, 'delete_card', card.id, Object.freeze({})),
      { idempotencyKey: `cards:${Crypto.randomUUID()}` },
    );
  }
}

export default function __RouteShim() { return null; }
