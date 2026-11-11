/**
 * Reviewer packet. Copy unchanged to
 * C:\appsprojects\phraseman\tests\spire_room_sync_hidden_owner.test.ts.
 * It closes only Peak room-sync ownership; Home, friends refresh and durable
 * flush remain outside scope.
 */
import { act, renderHook } from '@testing-library/react-native';
import { AppState, InteractionManager } from 'react-native';

let mockRuntimeOwnerId = 'spire';
const mockSync = jest.fn();
const mockEnsureWeekPack = jest.fn(async (..._args: unknown[]) => ({ status: 'ok', source: 'memory' }));

jest.mock('react-native', () => ({
  AppState: { addEventListener: jest.fn(), currentState: 'active' },
  InteractionManager: {
    runAfterInteractions: jest.fn((callback: () => void) => {
      callback();
      return { cancel: jest.fn() };
    }),
  },
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));
jest.mock('../app/smooth_layout', () => ({ animateNextLayoutTransition: jest.fn() }));
jest.mock('../app/TabContext', () => ({ useTabNav: () => ({ runtimeOwnerId: mockRuntimeOwnerId }) }));
jest.mock('../app/spire/spire_pack_client', () => ({
  spireEnsureWeekPack: (...args: unknown[]) => mockEnsureWeekPack(...args),
}));
jest.mock('../app/spire/spire_load_trace', () => ({ spireLoadMark: jest.fn() }));
jest.mock('../app/spire/spire_room_client', () => ({
  spireSyncRoom: (...args: unknown[]) => mockSync(...args),
}));

import { SPIRE_ROOM_RETRY_MS, useSpireRoomSync } from '../app/spire/use_spire_room_sync';
import type { SpireRoomLoad } from '../app/spire/spire_room_client';

const gateA = { kind: 'home', generation: 'A' } as never;
const gateB = { kind: 'home', generation: 'B' } as never;
const idsA = { uid: 'A', stableId: 'sA' };
const idsB = { uid: 'B', stableId: 'sB' };
const ROOM_A = {
  groupId: 'gA', tier: 0, weekId: '2026-W43', uid: 'A', lang: 'en',
  members: [{ uid: 'A' }], roster: [],
} as unknown as NonNullable<SpireRoomLoad['room']>;

type HookProps = Readonly<{
  revision: number;
  gate: typeof gateA;
  ids: typeof idsA;
  lang: 'en' | 'es';
}>;

function stateHarness() {
  let state: SpireRoomLoad | null = null;
  const setRoomLoad = jest.fn((next: SpireRoomLoad | null | ((current: SpireRoomLoad | null) => SpireRoomLoad | null)) => {
    state = typeof next === 'function' ? next(state) : next;
  });
  return { get: () => state, setRoomLoad };
}

async function settle(): Promise<void> {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

let appStateEntries: Array<{ active: boolean; callback: (state: string) => void; remove: jest.Mock }> = [];

function emitAppState(state: string): void {
  for (const entry of appStateEntries) if (entry.active) entry.callback(state);
}

beforeEach(() => {
  jest.useFakeTimers();
  mockRuntimeOwnerId = 'spire';
  mockSync.mockReset();
  mockEnsureWeekPack.mockClear();
  (InteractionManager.runAfterInteractions as jest.Mock).mockClear();
  appStateEntries = [];
  (AppState.addEventListener as jest.Mock).mockReset().mockImplementation((_event: string, callback: (state: string) => void) => {
    const entry = { active: true, callback, remove: jest.fn() };
    entry.remove.mockImplementation(() => { entry.active = false; });
    appStateEntries.push(entry);
    return { remove: entry.remove };
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function renderRoomSync(initial: HookProps = { revision: 0, gate: gateA, ids: idsA, lang: 'en' }) {
  const state = stateHarness();
  const view = await renderHook(({ revision, gate, ids, lang }: HookProps) => {
    void revision;
    useSpireRoomSync({ gate, ids, lang, setRoomLoad: state.setRoomLoad });
  }, { initialProps: initial });
  return { state, view };
}

it('does not run a scheduled room retry after retained Peak receives the real hidden owner community', async () => {
  mockSync.mockResolvedValue({ status: 'offline', room: null, reason: 'offline' });
  const { view } = await renderRoomSync();
  await settle();
  expect(mockSync).toHaveBeenCalledTimes(1);
  mockRuntimeOwnerId = 'community';
  await act(async () => { view.rerender({ revision: 1, gate: gateA, ids: idsA, lang: 'en' }); });
  await act(async () => { jest.advanceTimersByTime(SPIRE_ROOM_RETRY_MS[0]); await Promise.resolve(); await Promise.resolve(); });
  expect(mockSync).toHaveBeenCalledTimes(1);
});

it('does not retry room sync on foreground while retained Peak has hidden owner community', async () => {
  mockSync.mockResolvedValue({ status: 'offline', room: null, reason: 'offline' });
  const { view } = await renderRoomSync();
  await settle();
  expect(mockSync).toHaveBeenCalledTimes(1);
  mockRuntimeOwnerId = 'community';
  await act(async () => { view.rerender({ revision: 1, gate: gateA, ids: idsA, lang: 'en' }); });
  await act(async () => { emitAppState('active'); await Promise.resolve(); await Promise.resolve(); });
  expect(mockSync).toHaveBeenCalledTimes(1);
});

it('first mounts hidden and starts exactly one request on first activation', async () => {
  mockRuntimeOwnerId = 'community';
  mockSync.mockResolvedValue({ status: 'offline', room: null, reason: 'offline' });
  const { view } = await renderRoomSync();
  await settle();
  expect(mockSync).toHaveBeenCalledTimes(0);
  mockRuntimeOwnerId = 'spire';
  await act(async () => { view.rerender({ revision: 1, gate: gateA, ids: idsA, lang: 'en' }); await Promise.resolve(); await Promise.resolve(); });
  expect(mockSync).toHaveBeenCalledTimes(1);
});

it('returns to Peak with one immediate request and no stale-timer duplicate', async () => {
  mockSync.mockResolvedValue({ status: 'offline', room: null, reason: 'offline' });
  const { view } = await renderRoomSync();
  await settle();
  expect(mockSync).toHaveBeenCalledTimes(1);
  mockRuntimeOwnerId = 'community';
  await act(async () => { view.rerender({ revision: 1, gate: gateA, ids: idsA, lang: 'en' }); });
  mockRuntimeOwnerId = 'spire';
  await act(async () => { view.rerender({ revision: 2, gate: gateA, ids: idsA, lang: 'en' }); await Promise.resolve(); await Promise.resolve(); });
  expect(mockSync).toHaveBeenCalledTimes(2);
  await act(async () => { jest.advanceTimersByTime(SPIRE_ROOM_RETRY_MS[0]); await Promise.resolve(); await Promise.resolve(); });
  expect(mockSync).toHaveBeenCalledTimes(3);
});

it('keeps a successful in-flight room result received while hidden and does not request again on return', async () => {
  let resolveRoom: (value: SpireRoomLoad) => void = () => undefined;
  mockSync.mockImplementationOnce(() => new Promise<SpireRoomLoad>((resolve) => { resolveRoom = resolve; }));
  const { state, view } = await renderRoomSync();
  await settle();
  expect(mockSync).toHaveBeenCalledTimes(1);
  mockRuntimeOwnerId = 'community';
  await act(async () => { view.rerender({ revision: 1, gate: gateA, ids: idsA, lang: 'en' }); });
  await act(async () => { resolveRoom({ status: 'network', room: ROOM_A, reason: 'ok' }); await Promise.resolve(); await Promise.resolve(); });
  expect(state.get()?.room?.groupId).toBe('gA');
  expect(mockEnsureWeekPack).toHaveBeenCalledTimes(1);
  mockRuntimeOwnerId = 'spire';
  await act(async () => { view.rerender({ revision: 2, gate: gateA, ids: idsA, lang: 'en' }); await Promise.resolve(); });
  expect(mockSync).toHaveBeenCalledTimes(1);
});

it('does not schedule from an empty in-flight result received hidden and requests once on return', async () => {
  let resolveEmpty: (value: SpireRoomLoad) => void = () => undefined;
  mockSync.mockImplementationOnce(() => new Promise<SpireRoomLoad>((resolve) => { resolveEmpty = resolve; }))
    .mockResolvedValue({ status: 'offline', room: null, reason: 'offline' });
  const { view } = await renderRoomSync();
  await settle();
  mockRuntimeOwnerId = 'community';
  await act(async () => { view.rerender({ revision: 1, gate: gateA, ids: idsA, lang: 'en' }); });
  await act(async () => { resolveEmpty({ status: 'offline', room: null, reason: 'offline' }); await Promise.resolve(); await Promise.resolve(); });
  await act(async () => { jest.advanceTimersByTime(SPIRE_ROOM_RETRY_MS[0]); await Promise.resolve(); });
  expect(mockSync).toHaveBeenCalledTimes(1);
  mockRuntimeOwnerId = 'spire';
  await act(async () => { view.rerender({ revision: 2, gate: gateA, ids: idsA, lang: 'en' }); await Promise.resolve(); await Promise.resolve(); });
  expect(mockSync).toHaveBeenCalledTimes(2);
});

it('does not schedule from an in-flight rejection received hidden and requests once on return', async () => {
  let rejectRoom: (error: Error) => void = () => undefined;
  mockSync.mockImplementationOnce(() => new Promise<SpireRoomLoad>((_resolve, reject) => { rejectRoom = reject; }))
    .mockResolvedValue({ status: 'offline', room: null, reason: 'offline' });
  const { view } = await renderRoomSync();
  await settle();
  mockRuntimeOwnerId = 'community';
  await act(async () => { view.rerender({ revision: 1, gate: gateA, ids: idsA, lang: 'en' }); });
  await act(async () => { rejectRoom(new Error('offline')); await Promise.resolve(); await Promise.resolve(); });
  await act(async () => { jest.advanceTimersByTime(SPIRE_ROOM_RETRY_MS[0]); await Promise.resolve(); });
  expect(mockSync).toHaveBeenCalledTimes(1);
  mockRuntimeOwnerId = 'spire';
  await act(async () => { view.rerender({ revision: 2, gate: gateA, ids: idsA, lang: 'en' }); await Promise.resolve(); await Promise.resolve(); });
  expect(mockSync).toHaveBeenCalledTimes(2);
});

it('same-commit owner return plus gate ids and language change starts exactly one B request and fences late A', async () => {
  let resolveA: (value: SpireRoomLoad) => void = () => undefined;
  mockSync.mockImplementationOnce(() => new Promise<SpireRoomLoad>((resolve) => { resolveA = resolve; }))
    .mockResolvedValue({ status: 'offline', room: null, reason: 'offline' });
  const { state, view } = await renderRoomSync();
  await settle();
  expect(mockSync).toHaveBeenCalledTimes(1);
  mockRuntimeOwnerId = 'community';
  await act(async () => { view.rerender({ revision: 1, gate: gateA, ids: idsA, lang: 'en' }); });
  expect(mockSync).toHaveBeenCalledTimes(1);
  mockRuntimeOwnerId = 'spire';
  await act(async () => { view.rerender({ revision: 2, gate: gateB, ids: idsB, lang: 'es' }); await Promise.resolve(); await Promise.resolve(); });
  expect(mockSync).toHaveBeenCalledTimes(2);
  expect(mockSync.mock.calls[1][1]).toMatchObject({ uid: 'B', stableId: 'sB', lang: 'es' });
  await act(async () => { resolveA({ status: 'network', room: ROOM_A, reason: 'ok' }); await Promise.resolve(); await Promise.resolve(); });
  expect(state.get()?.room ?? null).toBeNull();
});

it('treats a paused in-flight result received hidden as settled and does not retry on return', async () => {
  let resolvePaused: (value: SpireRoomLoad) => void = () => undefined;
  mockSync.mockImplementationOnce(() => new Promise<SpireRoomLoad>((resolve) => { resolvePaused = resolve; }))
    .mockResolvedValue({ status: 'offline', room: null, reason: 'offline' });
  const { view } = await renderRoomSync();
  await settle();
  expect(mockSync).toHaveBeenCalledTimes(1);
  mockRuntimeOwnerId = 'community';
  await act(async () => { view.rerender({ revision: 1, gate: gateA, ids: idsA, lang: 'en' }); });
  await act(async () => { resolvePaused({ status: 'paused', room: null, reason: 'paused' }); await Promise.resolve(); await Promise.resolve(); });
  await act(async () => { jest.advanceTimersByTime(120_000); await Promise.resolve(); });
  expect(mockSync).toHaveBeenCalledTimes(1);
  mockRuntimeOwnerId = 'spire';
  await act(async () => { view.rerender({ revision: 2, gate: gateA, ids: idsA, lang: 'en' }); await Promise.resolve(); await Promise.resolve(); });
  expect(mockSync).toHaveBeenCalledTimes(1);
});

it('changes A to B while hidden without a B request and later owner-only return starts exactly one B request', async () => {
  let resolveA: (value: SpireRoomLoad) => void = () => undefined;
  mockSync.mockImplementationOnce(() => new Promise<SpireRoomLoad>((resolve) => { resolveA = resolve; }))
    .mockResolvedValue({ status: 'offline', room: null, reason: 'offline' });
  const { state, view } = await renderRoomSync();
  await settle();
  expect(mockSync).toHaveBeenCalledTimes(1);
  mockRuntimeOwnerId = 'community';
  await act(async () => { view.rerender({ revision: 1, gate: gateA, ids: idsA, lang: 'en' }); });
  await act(async () => { view.rerender({ revision: 2, gate: gateB, ids: idsB, lang: 'es' }); await Promise.resolve(); });
  expect(mockSync).toHaveBeenCalledTimes(1);
  await act(async () => { resolveA({ status: 'network', room: ROOM_A, reason: 'ok' }); await Promise.resolve(); await Promise.resolve(); });
  expect(state.get()?.room ?? null).toBeNull();
  mockRuntimeOwnerId = 'spire';
  await act(async () => { view.rerender({ revision: 3, gate: gateB, ids: idsB, lang: 'es' }); await Promise.resolve(); await Promise.resolve(); });
  expect(mockSync).toHaveBeenCalledTimes(2);
  expect(mockSync.mock.calls[1][1]).toMatchObject({ uid: 'B', stableId: 'sB', lang: 'es' });
});

it('keeps one AppState subscription across owner transitions and removes it on unmount', async () => {
  mockSync.mockResolvedValue({ status: 'offline', room: null, reason: 'offline' });
  const { view } = await renderRoomSync();
  await settle();
  expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
  mockRuntimeOwnerId = 'community';
  await act(async () => { view.rerender({ revision: 1, gate: gateA, ids: idsA, lang: 'en' }); });
  mockRuntimeOwnerId = 'spire';
  await act(async () => { view.rerender({ revision: 2, gate: gateA, ids: idsA, lang: 'en' }); });
  expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
  await view.unmount();
  expect(appStateEntries).toHaveLength(1);
  expect(appStateEntries[0].remove).toHaveBeenCalledTimes(1);
});
