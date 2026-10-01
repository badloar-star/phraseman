import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DIALOGS_COMPLETED_KEY,
  dialogsCompletedStorageKey,
  getCompletedDialogIds,
  isDialogCompleted,
  markDialogCompleted,
} from '../app/dialogs_progress';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  invalidateAccountGeneration,
} from '../app/account_generation';

// Эмитим событие — мокаем, чтобы тест не зависел от DeviceEventEmitter и проверял,
// что обновление списка инициируется ровно при реальной отметке (не идемпотентной).
const emitAppEvent = jest.fn();
jest.mock('../app/events', () => ({
  emitAppEvent: (...args: unknown[]) => emitAppEvent(...args),
}));

describe('dialogs_progress (local completed scenarios)', () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem(DIALOGS_COMPLETED_KEY);
    await AsyncStorage.removeItem(dialogsCompletedStorageKey('es')!);
    await AsyncStorage.removeItem(dialogsCompletedStorageKey('fr')!);
    await AsyncStorage.removeItem(dialogsCompletedStorageKey('de')!);
    emitAppEvent.mockClear();
    __resetAccountGenerationForTests();
    beginAccountGeneration('user-a');
  });

  it('starts empty', async () => {
    expect((await getCompletedDialogIds('en')).size).toBe(0);
    expect(await isDialogCompleted('en', 'coffee')).toBe(false);
  });

  it('marks a scenario completed and persists it', async () => {
    await markDialogCompleted('en', 'coffee');
    expect(await isDialogCompleted('en', 'coffee')).toBe(true);
    expect((await getCompletedDialogIds('en')).has('coffee')).toBe(true);
    expect(emitAppEvent).toHaveBeenCalledWith('dialogs_progress_changed', undefined);
  });

  it('keeps multiple distinct scenarios', async () => {
    await markDialogCompleted('en', 'coffee');
    await markDialogCompleted('en', 'restaurant');
    const ids = await getCompletedDialogIds('en');
    expect(ids.has('coffee')).toBe(true);
    expect(ids.has('restaurant')).toBe(true);
    expect(ids.size).toBe(2);
  });

  it('is idempotent: re-marking does not duplicate or re-emit', async () => {
    await markDialogCompleted('en', 'coffee');
    emitAppEvent.mockClear();
    await markDialogCompleted('en', 'coffee');
    expect((await getCompletedDialogIds('en')).size).toBe(1);
    expect(emitAppEvent).not.toHaveBeenCalled();
  });

  it('ignores empty scenario id', async () => {
    await markDialogCompleted('en', '');
    expect((await getCompletedDialogIds('en')).size).toBe(0);
    expect(emitAppEvent).not.toHaveBeenCalled();
    expect(await isDialogCompleted('en', '')).toBe(false);
  });

  it('survives corrupted storage (non-array json) without throwing', async () => {
    await AsyncStorage.setItem(DIALOGS_COMPLETED_KEY, '{"oops":true}');
    expect((await getCompletedDialogIds('en')).size).toBe(0);
    await markDialogCompleted('en', 'coffee');
    expect(await isDialogCompleted('en', 'coffee')).toBe(true);
  });

  it('isolates completed scenarios by target while English reads the legacy key', async () => {
    await AsyncStorage.setItem(DIALOGS_COMPLETED_KEY, JSON.stringify(['legacy-en']));
    await markDialogCompleted('es', 'cafe-es');

    expect(await getCompletedDialogIds('en')).toEqual(new Set(['legacy-en']));
    expect(await getCompletedDialogIds('es')).toEqual(new Set(['cafe-es']));
    expect(await getCompletedDialogIds('fr')).toEqual(new Set());
    expect(await getCompletedDialogIds('de')).toEqual(new Set());
    expect(await AsyncStorage.getItem(DIALOGS_COMPLETED_KEY)).toBe(JSON.stringify(['legacy-en']));
  });

  it('fails closed for an unknown target without touching the English key', async () => {
    await AsyncStorage.setItem(DIALOGS_COMPLETED_KEY, JSON.stringify(['legacy-en']));
    await markDialogCompleted('it', 'coffee');

    expect(await getCompletedDialogIds('it')).toEqual(new Set());
    expect(await isDialogCompleted('it', 'legacy-en')).toBe(false);
    expect(await AsyncStorage.getItem(DIALOGS_COMPLETED_KEY)).toBe(JSON.stringify(['legacy-en']));
  });

  // PM-200/PM-213: поздняя отметка не пишет в чужой аккаунт.
  it('skips the write when the account is not active', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    invalidateAccountGeneration();
    await markDialogCompleted('en', 'coffee');
    beginAccountGeneration('user-a');
    expect(await isDialogCompleted('en', 'coffee')).toBe(false);
    expect(emitAppEvent).not.toHaveBeenCalled();
    expect(warn.mock.calls.some((c) => String(c[0]).includes('[DIALOG-PROGRESS]'))).toBe(true);
    warn.mockRestore();
  });

  it('skips the write when the account changes between read and write', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const realGetItem = AsyncStorage.getItem.bind(AsyncStorage);
    const spy = jest.spyOn(AsyncStorage, 'getItem').mockImplementationOnce(async (key: string) => {
      const value = await realGetItem(key);
      beginAccountGeneration('user-b');
      return value;
    });
    await markDialogCompleted('en', 'coffee');
    spy.mockRestore();
    expect(await isDialogCompleted('en', 'coffee')).toBe(false);
    expect(emitAppEvent).not.toHaveBeenCalled();
    expect(warn.mock.calls.some((c) => String(c[0]).includes('account changed'))).toBe(true);
    warn.mockRestore();
  });
});
