import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DIALOGS_COMPLETED_KEY,
  getCompletedDialogIds,
  isDialogCompleted,
  markDialogCompleted,
} from '../app/dialogs_progress';

// Эмитим событие — мокаем, чтобы тест не зависел от DeviceEventEmitter и проверял,
// что обновление списка инициируется ровно при реальной отметке (не идемпотентной).
const emitAppEvent = jest.fn();
jest.mock('../app/events', () => ({
  emitAppEvent: (...args: unknown[]) => emitAppEvent(...args),
}));

describe('dialogs_progress (local completed scenarios)', () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem(DIALOGS_COMPLETED_KEY);
    emitAppEvent.mockClear();
  });

  it('starts empty', async () => {
    expect((await getCompletedDialogIds()).size).toBe(0);
    expect(await isDialogCompleted('coffee')).toBe(false);
  });

  it('marks a scenario completed and persists it', async () => {
    await markDialogCompleted('coffee');
    expect(await isDialogCompleted('coffee')).toBe(true);
    expect((await getCompletedDialogIds()).has('coffee')).toBe(true);
    expect(emitAppEvent).toHaveBeenCalledWith('dialogs_progress_changed', undefined);
  });

  it('keeps multiple distinct scenarios', async () => {
    await markDialogCompleted('coffee');
    await markDialogCompleted('restaurant');
    const ids = await getCompletedDialogIds();
    expect(ids.has('coffee')).toBe(true);
    expect(ids.has('restaurant')).toBe(true);
    expect(ids.size).toBe(2);
  });

  it('is idempotent: re-marking does not duplicate or re-emit', async () => {
    await markDialogCompleted('coffee');
    emitAppEvent.mockClear();
    await markDialogCompleted('coffee');
    expect((await getCompletedDialogIds()).size).toBe(1);
    expect(emitAppEvent).not.toHaveBeenCalled();
  });

  it('ignores empty scenario id', async () => {
    await markDialogCompleted('');
    expect((await getCompletedDialogIds()).size).toBe(0);
    expect(emitAppEvent).not.toHaveBeenCalled();
    expect(await isDialogCompleted('')).toBe(false);
  });

  it('survives corrupted storage (non-array json) without throwing', async () => {
    await AsyncStorage.setItem(DIALOGS_COMPLETED_KEY, '{"oops":true}');
    expect((await getCompletedDialogIds()).size).toBe(0);
    await markDialogCompleted('coffee');
    expect(await isDialogCompleted('coffee')).toBe(true);
  });
});
