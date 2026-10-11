// зачем (координатор 11.10, Карточки 2.0, герой «Продолжить»): позиция по набору живёт только на устройстве,
// первый кадр — из памяти, пройденный набор снимается сам, смена аккаунта сбрасывает память.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
const mockGenerationListeners: Array<() => void> = [];
jest.mock('../app/account_generation', () => ({
  subscribeAccountGeneration: (listener: () => void) => { mockGenerationListeners.push(listener); return { remove: jest.fn() }; },
}));

/* eslint-disable import/first */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  latestPackContinue,
  loadPackContinuePositions,
  packContinueStorageKeyForTests,
  peekPackContinuePositions,
  recordPackContinuePosition,
} from '../app/flashcards/pack_continue_position';

describe('pack_continue_position', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await AsyncStorage.clear();
    for (const listener of mockGenerationListeners) listener();
  });
  afterEach(() => jest.useRealTimers());

  test('до чтения диска peek = null, после — пусто; запись видна сразу, на диск — после паузы', async () => {
    expect(peekPackContinuePositions('en')).toBeNull();
    await loadPackContinuePositions('en');
    expect(peekPackContinuePositions('en')).toEqual({});
    recordPackContinuePosition('en', { packId: 'p1', index: 12, total: 40, mode: 'blitz', nowMs: 100 });
    expect(peekPackContinuePositions('en')?.p1).toEqual({ packId: 'p1', index: 12, total: 40, mode: 'blitz', updatedAtMs: 100 });
    expect(await AsyncStorage.getItem(packContinueStorageKeyForTests('en'))).toBeNull();
    jest.advanceTimersByTime(700);
    await Promise.resolve();
    expect(JSON.parse(String(await AsyncStorage.getItem(packContinueStorageKeyForTests('en')))).p1.index).toBe(12);
  });

  test('«Продолжить» — последний по времени; пройденный набор снимается', async () => {
    await loadPackContinuePositions('en');
    recordPackContinuePosition('en', { packId: 'a', index: 3, total: 10, nowMs: 1 });
    recordPackContinuePosition('en', { packId: 'b', index: 5, total: 10, nowMs: 2 });
    expect(latestPackContinue(peekPackContinuePositions('en') ?? {})?.packId).toBe('b');
    recordPackContinuePosition('en', { packId: 'b', index: 10, total: 10, nowMs: 3 });
    expect(peekPackContinuePositions('en')?.b).toBeUndefined();
    expect(latestPackContinue(peekPackContinuePositions('en') ?? {})?.packId).toBe('a');
  });

  test('языки не смешиваются; мусор с диска отбрасывается', async () => {
    await AsyncStorage.setItem(packContinueStorageKeyForTests('es'), JSON.stringify({
      ok: { packId: 'ok', index: 2, total: 5, updatedAtMs: 1 },
      done: { packId: 'done', index: 5, total: 5, updatedAtMs: 1 },
      junk: 'x',
    }));
    const es = await loadPackContinuePositions('es');
    expect(Object.keys(es)).toEqual(['ok']);
    await loadPackContinuePositions('en');
    expect(peekPackContinuePositions('en')).toEqual({});
  });

  test('смена аккаунта сбрасывает память — чужое «Продолжить» не показывается', async () => {
    await loadPackContinuePositions('en');
    recordPackContinuePosition('en', { packId: 'p1', index: 1, total: 4, nowMs: 1 });
    for (const listener of mockGenerationListeners) listener();
    expect(peekPackContinuePositions('en')).toBeNull();
  });
});
