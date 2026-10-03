import AsyncStorage from '@react-native-async-storage/async-storage';

import { dialogueStateStorageKey } from '../app/dialogue_language_registry';
import {
  dialogHintDailyStorageKey,
  getDialogHintsLeftToday,
  markDialogHintUsed,
} from '../app/ai_dialog_hint_economy';

describe('dialogue target state isolation', () => {
  const stableId = 'uid-a';

  beforeEach(async () => {
    for (const target of ['en', 'es', 'fr', 'de']) {
      const hints = dialogHintDailyStorageKey(target);
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

  // зачем (TG-8A2D25725DBA, 2026-10-03): два теста про ключи владения диалогами (ai_dialog_ownership) сняты вместе с удалённым модулем (D124/D138).

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
