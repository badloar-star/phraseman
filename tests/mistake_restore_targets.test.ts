// зачем (координатор 11.10): восстановление ошибок при старте — первый раз на устройстве все языки (ошибки со старого
// телефона не теряются), затем только активный язык + языки с локальным журналом; сбой чтения → все языки.
import {
  markMistakeFullRestoreDone,
  mistakeRestoreFullDoneKey,
  resolveMistakeRestoreTargets,
  selectMistakeRestoreTargets,
} from '../app/mistake_restore_targets';
import { mistakePracticeEventsKey } from '../app/target_storage_keys';

const ALL = ['en', 'es', 'fr', 'de', 'it'] as const;

function fakeStorage(initial: Record<string, string>) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    multiGet: jest.fn(async (keys: readonly string[]) => keys.map((k) => [k, data.get(k) ?? null] as [string, string | null])),
    setItem: jest.fn(async (k: string, v: string) => { data.set(k, v); }),
  };
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('selectMistakeRestoreTargets', () => {
  test('без метки — все языки один раз', () => {
    expect(selectMistakeRestoreTargets({ all: ALL, active: 'en', withLocalEvents: [], fullRestoreDone: false }))
      .toEqual({ targets: [...ALL], reason: 'full_first_restore' });
  });
  test('с меткой — активный + языки с журналом, в порядке общего списка', () => {
    expect(selectMistakeRestoreTargets({ all: ALL, active: 'en', withLocalEvents: ['fr'], fullRestoreDone: true }))
      .toEqual({ targets: ['en', 'fr'], reason: 'active_and_local' });
  });
});

describe('resolveMistakeRestoreTargets', () => {
  test('новое устройство: все языки, затем метка по uid → дальше только en', async () => {
    const storage = fakeStorage({ study_target_v1: 'en' });
    expect((await resolveMistakeRestoreTargets('uid-1', ALL, storage)).targets).toEqual([...ALL]);
    await markMistakeFullRestoreDone('uid-1', storage);
    expect(storage.data.get(mistakeRestoreFullDoneKey('uid-1'))).toBe('1');
    expect(await resolveMistakeRestoreTargets('uid-1', ALL, storage)).toEqual({ targets: ['en'], reason: 'active_and_local' });
  });

  test('метка другого uid не действует; журнал fr на устройстве → fr тоже', async () => {
    const storage = fakeStorage({
      study_target_v1: 'en',
      [mistakeRestoreFullDoneKey('uid-1')]: '1',
      [mistakePracticeEventsKey('uid-2', 'fr')]: '{}',
    });
    expect((await resolveMistakeRestoreTargets('uid-2', ALL, storage)).reason).toBe('full_first_restore');
    storage.data.set(mistakeRestoreFullDoneKey('uid-2'), '1');
    expect((await resolveMistakeRestoreTargets('uid-2', ALL, storage)).targets).toEqual(['en', 'fr']);
  });

  test('сбой чтения → безопасная сторона: все языки', async () => {
    const storage = fakeStorage({});
    storage.multiGet.mockRejectedValueOnce(new Error('disk'));
    expect(await resolveMistakeRestoreTargets('uid-3', ALL, storage)).toEqual({ targets: [...ALL], reason: 'full_first_restore' });
  });
});
