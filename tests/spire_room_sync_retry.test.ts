/**
 * [SPIRE-ROOM] Владелец 25.10 (iPhone 2.0.2): «зашёл в Пик, а там комната недели ещё не загрузилась, пришлось перезаходить в
 * раздел!!! Такой ошибки не должно быть». Сторож: первый вход без кэша и со сбоем сети → комната загружается сама, без перезахода;
 * показанная комната не стирается пустым ответом; при комнате лишних запросов нет; возврат в приложение без комнаты — повтор.
 */
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));
jest.mock('../app/smooth_layout', () => ({ animateNextLayoutTransition: jest.fn() }));
jest.mock('../app/TabContext', () => ({ useTabNav: () => ({ runtimeOwnerId: 'spire' }) }));
jest.mock('../app/spire/spire_pack_client', () => ({ spireEnsureWeekPack: jest.fn(async () => ({ status: 'ok', source: 'memory' })) }));
jest.mock('../app/spire/spire_load_trace', () => ({ spireLoadMark: jest.fn() }));
const mockSync = jest.fn();
jest.mock('../app/spire/spire_room_client', () => ({ spireSyncRoom: (...a: unknown[]) => mockSync(...a) }));

import { SPIRE_ROOM_RETRY_MS, spireMergeRoomLoad, useSpireRoomSync } from '../app/spire/use_spire_room_sync';
import type { SpireRoomLoad } from '../app/spire/spire_room_client';

const ROOM = { groupId: 'g1', tier: 0, weekId: '2026-W43', members: [{ uid: 'a' }], roster: [] } as unknown as NonNullable<SpireRoomLoad['room']>;
const gate = { kind: 'home' } as never;
const ids = { uid: 'u', stableId: 's' };

function harness() {
  let state: SpireRoomLoad | null = null;
  const setRoomLoad = jest.fn((next: SpireRoomLoad | null | ((cur: SpireRoomLoad | null) => SpireRoomLoad | null)) => {
    state = typeof next === 'function' ? next(state) : next;
  });
  return { get: () => state, setRoomLoad };
}

beforeEach(() => { jest.useFakeTimers(); mockSync.mockReset(); });
afterEach(() => { jest.useRealTimers(); });

describe('[SPIRE-ROOM] комната не остаётся пустой до перезахода', () => {
  it('первый вход без кэша: сбой сети → автоповтор через 2 с → комната на экране, без перезахода', async () => {
    mockSync
      .mockResolvedValueOnce({ status: 'offline', room: null, reason: 'offline' })
      .mockResolvedValueOnce({ status: 'network', room: ROOM, reason: 'ok' });
    const h = harness();
    await renderHook(() => useSpireRoomSync({ gate, ids, lang: 'en', setRoomLoad: h.setRoomLoad }));
    await act(async () => { await Promise.resolve(); });
    expect(mockSync).toHaveBeenCalledTimes(1);
    expect(h.get()?.room).toBeNull();
    await act(async () => { jest.advanceTimersByTime(SPIRE_ROOM_RETRY_MS[0]); await Promise.resolve(); await Promise.resolve(); });
    expect(mockSync).toHaveBeenCalledTimes(2);
    expect(h.get()?.room?.groupId).toBe('g1');
  });

  it('тайм-аут и исключение тоже ведут к повтору; после комнаты повторов нет (💸)', async () => {
    mockSync
      .mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'unavailable' }))
      .mockResolvedValueOnce({ status: 'offline', room: null, reason: 'timeout' })
      .mockResolvedValueOnce({ status: 'network', room: ROOM, reason: 'ok' });
    const h = harness();
    await renderHook(() => useSpireRoomSync({ gate, ids, lang: 'en', setRoomLoad: h.setRoomLoad }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    await act(async () => { jest.advanceTimersByTime(SPIRE_ROOM_RETRY_MS[0]); await Promise.resolve(); await Promise.resolve(); });
    await act(async () => { jest.advanceTimersByTime(SPIRE_ROOM_RETRY_MS[1]); await Promise.resolve(); await Promise.resolve(); });
    expect(mockSync).toHaveBeenCalledTimes(3);
    expect(h.get()?.room?.groupId).toBe('g1');
    await act(async () => { jest.advanceTimersByTime(120_000); await Promise.resolve(); });
    expect(mockSync).toHaveBeenCalledTimes(3);
  });

  it('возврат в приложение без комнаты — повтор сразу', async () => {
    mockSync.mockResolvedValue({ status: 'offline', room: null, reason: 'offline' });
    let listener: ((s: string) => void) | null = null;
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, fn: (s: string) => void) => { listener = fn; return { remove: () => undefined }; }) as never);
    const h = harness();
    await renderHook(() => useSpireRoomSync({ gate, ids, lang: 'en', setRoomLoad: h.setRoomLoad }));
    await act(async () => { await Promise.resolve(); });
    const before = mockSync.mock.calls.length;
    mockSync.mockResolvedValueOnce({ status: 'network', room: ROOM, reason: 'ok' });
    await act(async () => { (listener as unknown as (s: string) => void)('active'); await Promise.resolve(); await Promise.resolve(); });
    expect(mockSync.mock.calls.length).toBe(before + 1);
    expect(h.get()?.room?.groupId).toBe('g1');
    spy.mockRestore();
  });

  it('пустой ответ не стирает уже показанную комнату (кэш первого кадра)', () => {
    const cur: SpireRoomLoad = { status: 'cache', room: ROOM, reason: 'cache_fresh' };
    expect(spireMergeRoomLoad(cur, { status: 'offline', room: null, reason: 'timeout' }).room).toBe(ROOM);
    expect(spireMergeRoomLoad(null, { status: 'offline', room: null, reason: 'timeout' }).room).toBeNull();
  });
});
