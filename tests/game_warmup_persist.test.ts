/**
 * Прогресс разминки переживает перезапуск приложения (проверка на телефоне 12.11: после перезапуска «0/3»).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { __warmupTestHooks, markWarmupGamePlayed, parseStoredWarmupResults, peekWarmup, refreshWarmup } from '../modules/games/warmup_state';

const NOW = new Date(2026, 10, 12, 10, 0, 0).getTime();
const DAY = '2026-11-12';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('parseStoredWarmupResults', () => {
  it('берёт только сегодняшний день и тот же язык', () => {
    const raw = JSON.stringify({ v: 1, day: DAY, target: 'de', results: { flow: '3/6', nope: 'x' } });
    expect(parseStoredWarmupResults(raw, DAY, 'de')).toEqual({ flow: '3/6' });
    expect(parseStoredWarmupResults(raw, '2026-11-11', 'de')).toBeNull();
    expect(parseStoredWarmupResults(raw, DAY, 'en')).toBeNull();
  });

  it('битая или пустая запись не роняет разминку', () => {
    expect(parseStoredWarmupResults(null, DAY, 'de')).toBeNull();
    expect(parseStoredWarmupResults('{oops', DAY, 'de')).toBeNull();
    expect(parseStoredWarmupResults('42', DAY, 'de')).toBeNull();
  });
});

describe('сохранение и подтяжка', () => {
  it('сыгранная игра записывается и после «перезапуска» подтягивается', async () => {
    __warmupTestHooks.reset(() => NOW, async () => 'owner-1');
    const first = peekWarmup();
    const game = first.games[0];
    expect(game).toBeDefined();
    markWarmupGamePlayed(game.id, '4/6');
    await new Promise((r) => setTimeout(r, 0));
    const stored = await AsyncStorage.getItem('warmup_v1:owner-1');
    expect(stored).toContain('"4/6"');

    // «перезапуск»: память процесса пустая, диск остался
    __warmupTestHooks.reset(() => NOW, async () => 'owner-1');
    expect(peekWarmup().results[game.id]).toBeUndefined();
    const after = await refreshWarmup();
    expect(after.results[game.id]).toBe('4/6');
  });

  it('без владельца ничего не пишется и не читается', async () => {
    __warmupTestHooks.reset(() => NOW, async () => null);
    const game = peekWarmup().games[0];
    markWarmupGamePlayed(game.id, '1/6');
    await new Promise((r) => setTimeout(r, 0));
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
    expect((await refreshWarmup()).results[game.id]).toBe('1/6');
  });

  it('другой владелец не видит чужой прогресс', async () => {
    __warmupTestHooks.reset(() => NOW, async () => 'owner-1');
    const game = peekWarmup().games[0];
    markWarmupGamePlayed(game.id, '2/6');
    await new Promise((r) => setTimeout(r, 0));
    __warmupTestHooks.reset(() => NOW, async () => 'owner-2');
    expect((await refreshWarmup()).results[game.id]).toBeUndefined();
  });
});
