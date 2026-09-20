import AsyncStorage from '@react-native-async-storage/async-storage';

import { dialogueStateStorageKey } from '../app/dialogue_language_registry';
import {
  dialogOwnershipOutboxStorageKey,
  dialogOwnershipStorageKey,
  getOwnedDialogIds,
} from '../app/ai_dialog_ownership';
import {
  dialogHintDailyStorageKey,
  getDialogHintsLeftToday,
  markDialogHintUsed,
} from '../app/ai_dialog_hint_economy';

describe('dialogue target state isolation', () => {
  const stableId = 'uid-a';

  beforeEach(async () => {
    for (const target of ['en', 'es', 'fr', 'de']) {
      const owned = dialogOwnershipStorageKey(target, stableId);
      const outbox = dialogOwnershipOutboxStorageKey(target, stableId);
      const hints = dialogHintDailyStorageKey(target);
      if (owned) await AsyncStorage.removeItem(owned);
      if (outbox) await AsyncStorage.removeItem(outbox);
      if (hints) await AsyncStorage.removeItem(hints);
    }
  });

  test('builds migration-safe target keys and rejects an unknown target', () => {
    expect(dialogueStateStorageKey('en', 'legacy_key')).toBe('legacy_key');
    expect(dialogueStateStorageKey('es', 'legacy_key')).toBe('dialogue_v1::es::legacy_key');
    expect(dialogueStateStorageKey('fr', 'legacy_key')).toBe('dialogue_v1::fr::legacy_key');
    expect(dialogueStateStorageKey('de', 'legacy_key')).toBe('dialogue_v1::de::legacy_key');
    expect(dialogueStateStorageKey('it', 'legacy_key')).toBeNull();
  });

  test('ownership and outbox keys are isolated while English keeps legacy compatibility', async () => {
    const englishOwned = dialogOwnershipStorageKey('en', stableId)!;
    const spanishOwned = dialogOwnershipStorageKey('es', stableId)!;
    const spanishOutbox = dialogOwnershipOutboxStorageKey('es', stableId)!;

    expect(englishOwned).toBe(`ai_dialog_owned_ids_v1:${stableId}`);
    expect(spanishOwned).toBe(`dialogue_v1::es::ai_dialog_owned_ids_v1:${stableId}`);
    expect(spanishOutbox).toBe(`dialogue_v1::es::ai_dialog_owned_outbox_v1:${stableId}`);

    await AsyncStorage.setItem(spanishOwned, JSON.stringify(['cafe-es']));
    await AsyncStorage.setItem(spanishOutbox, JSON.stringify(['cafe-es']));

    expect(await getOwnedDialogIds('es', stableId)).toEqual(new Set(['cafe-es']));
    expect(await getOwnedDialogIds('fr', stableId)).toEqual(new Set());
    expect(await getOwnedDialogIds('en', stableId)).toEqual(new Set());
    expect(await AsyncStorage.getItem(dialogOwnershipOutboxStorageKey('fr', stableId)!)).toBeNull();
    expect(await AsyncStorage.getItem(`ai_dialog_owned_outbox_v1:${stableId}`)).toBeNull();
  });

  test('unknown ownership target has no storage key and cannot read English ownership', async () => {
    await AsyncStorage.setItem(dialogOwnershipStorageKey('en', stableId)!, JSON.stringify(['coffee']));

    expect(dialogOwnershipStorageKey('it', stableId)).toBeNull();
    expect(dialogOwnershipOutboxStorageKey('it', stableId)).toBeNull();
    expect(await getOwnedDialogIds('it', stableId)).toEqual(new Set());
  });

  test('daily hints used in one target do not reduce another target allowance', async () => {
    await markDialogHintUsed('es');

    expect(await getDialogHintsLeftToday('es')).toBe(2);
    expect(await getDialogHintsLeftToday('fr')).toBe(3);
    expect(await getDialogHintsLeftToday('de')).toBe(3);
    expect(await getDialogHintsLeftToday('en')).toBe(3);
  });

  test('unknown hint target fails closed and never touches the English hint key', async () => {
    await markDialogHintUsed('it');

    expect(dialogHintDailyStorageKey('it')).toBeNull();
    expect(await getDialogHintsLeftToday('it')).toBe(0);
    expect(await getDialogHintsLeftToday('en')).toBe(3);
  });
});
