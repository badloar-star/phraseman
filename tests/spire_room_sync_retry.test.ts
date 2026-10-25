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

beforeEach(() => {
  jest.useFakeTimers(); mockSync.mockReset();
  // зачем: spyOn поверх мока RN возвращает тот же jest.fn — mockRestore в тесте AppState снимал реализацию, и размонтирование
  // следующих тестов падало на sub.remove(); подписка-заглушка ставится заново перед каждым тестом
  jest.spyOn(AppState, 'addEventListener').mockImplementation((() => ({ remove: () => undefined })) as never);
});
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
    expect(spy).toHaveBeenCalled();
  });

  it('пустой ответ не стирает уже показанную комнату (кэш первого кадра)', () => {
    const cur: SpireRoomLoad = { status: 'cache', room: ROOM, reason: 'cache_fresh' };
    expect(spireMergeRoomLoad(cur, { status: 'offline', room: null, reason: 'timeout' }).room).toBe(ROOM);
    expect(spireMergeRoomLoad(null, { status: 'offline', room: null, reason: 'timeout' }).room).toBeNull();
  });

  // Замок R39/F02 «B не видит Пик A» (Ревизор 25.10 по 7dd91767f)
  it('смена аккаунта при запросе в полёте: поздний ответ A не попадает в комнату B, повтор A не запускается', async () => {
    let resolveA: (v: SpireRoomLoad) => void = () => undefined;
    mockSync
      .mockImplementationOnce(() => new Promise<SpireRoomLoad>((r) => { resolveA = r; }))
      .mockResolvedValueOnce({ status: 'offline', room: null, reason: 'timeout' });
    const h = harness();
    const view = await renderHook(({ who }: { who: { uid: string; stableId: string } }) => useSpireRoomSync({ gate, ids: who, lang: 'en', setRoomLoad: h.setRoomLoad }), { initialProps: { who: { uid: 'A', stableId: 'sA' } } });
    await act(async () => { view.rerender({ who: { uid: 'B', stableId: 'sB' } }); await Promise.resolve(); await Promise.resolve(); });
    expect(mockSync).toHaveBeenCalledTimes(2);
    expect(mockSync.mock.calls[1][1]).toMatchObject({ uid: 'B' });
    const roomA = { ...ROOM, uid: 'A', lang: 'en', groupId: 'gA' } as typeof ROOM;
    await act(async () => { resolveA({ status: 'network', room: roomA, reason: 'ok' }); await Promise.resolve(); await Promise.resolve(); });
    expect(h.get()?.room ?? null).toBeNull();
    // повтор планирует только B (попытка 1 → 2 с); от A таймеров нет
    mockSync.mockResolvedValueOnce({ status: 'network', room: { ...ROOM, uid: 'B', lang: 'en', groupId: 'gB' }, reason: 'ok' });
    await act(async () => { jest.advanceTimersByTime(SPIRE_ROOM_RETRY_MS[0]); await Promise.resolve(); await Promise.resolve(); });
    expect(mockSync).toHaveBeenCalledTimes(3);
    expect(mockSync.mock.calls[2][1]).toMatchObject({ uid: 'B' });
    expect(h.get()?.room?.groupId).toBe('gB');
  });

  it('слияние держит только комнату того же владельца и языка', () => {
    const roomA = { ...ROOM, uid: 'A', lang: 'en' } as typeof ROOM;
    const cur: SpireRoomLoad = { status: 'network', room: roomA, reason: 'ok' };
    const empty: SpireRoomLoad = { status: 'offline', room: null, reason: 'timeout' };
    expect(spireMergeRoomLoad(cur, empty, { uid: 'A', lang: 'en' }).room).toBe(roomA);
    expect(spireMergeRoomLoad(cur, empty, { uid: 'B', lang: 'en' }).room).toBeNull();
    expect(spireMergeRoomLoad(cur, empty, { uid: 'A', lang: 'es' }).room).toBeNull();
  });

  it('вход в комнату после тайм-аута — один join на uid|язык|неделю (повтор присоединяется)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const src = (require('fs') as typeof import('fs')).readFileSync(require('path').resolve(__dirname, '..', 'app/spire/spire_room_client.ts'), 'utf8');
    expect(src).toContain('const joinInFlight = new Map<string, Promise<RoomIdentity>>();');
    expect(src).toContain('identity = await joinRoomOnce(gate, { uid: input.uid, stableId: input.stableId, lang: input.lang, weekId });');
    expect(src).toMatch(/joinRoom\(gate, input\)\.finally\(\(\) => \{ joinInFlight\.delete\(key\); \}\)/);
    expect(src).toMatch(/inFlight\.clear\(\);\s*joinInFlight\.clear\(\);/);
  });
});
