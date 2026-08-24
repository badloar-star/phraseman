jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000001' }));

import {
  commitPhoneStateCustomCards,
  configurePhoneStateCardsBridge,
} from '../app/phone_state_cards_bridge';
import type { CardItem } from '../app/flashcards/types';
import type { PendingPersonalOperation } from '../modules/phone-state/contracts';
import type { PhoneStateStore } from '../modules/phone-state/store';

const card = (id: string): CardItem => ({
  id,
  en: id,
  ru: id,
  uk: id,
  categoryId: 'custom',
  isSystem: false,
});

afterEach(() => configurePhoneStateCardsBridge(null));

test('opening import is split into bounded idempotent card operations plus a marker', async () => {
  const commit = jest.fn(async (
    _operation: PendingPersonalOperation,
    _options: Readonly<{ idempotencyKey: string }>,
  ) => ({ duplicate: false }));
  const store = {
    readProjection: jest.fn(async () => undefined),
    commit,
  } as unknown as PhoneStateStore;
  configurePhoneStateCardsBridge({
    scope: { stableUid: 'stable-1', accountGeneration: 1 },
    deviceId: 'device-1',
    store,
    enabled: () => true,
  });

  await commitPhoneStateCustomCards([card('a'), card('b')], [card('a'), card('b')]);

  expect(commit).toHaveBeenCalledTimes(3);
  expect(commit.mock.calls.map(([operation]) => operation.kind)).toEqual([
    'upsert_card',
    'upsert_card',
    'opening_import',
  ]);
  expect(commit.mock.calls[2][0].payload).toEqual({ cards: [] });
  expect(commit.mock.calls.map(([, options]) => options.idempotencyKey)).toEqual([
    'cards:opening-import:v1:a',
    'cards:opening-import:v1:b',
    'cards:opening-import:v1:complete',
  ]);
});
