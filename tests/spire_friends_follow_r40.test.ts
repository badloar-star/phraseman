// зачем (Ревизор F02, координатор 15.10, R40): новый друг появляется в ряду Пика без ручного потягивания — ряд следит за набором друзей
// в снимке (его обновляет вкладка «Друзья»). Кэш профилей не обходится (без force); сбой не стирает ряд; чужой снимок игнорируется.
// Каждый случай — свой владелец (uid): подписка хука из прошлого случая не путается со снимком следующего.
import { act, renderHook } from '@testing-library/react-native';

const mockLoad = jest.fn();
jest.mock('../app/spire/spire_friends_client', () => ({ spireLoadFriendChips: (...a: unknown[]) => mockLoad(...a) }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/smooth_layout', () => ({ animateNextLayoutTransition: jest.fn() }));

import { patchAppSnapshot } from '../app/app_snapshot_store';
import { useSpireFriendsRefresh } from '../app/spire/use_spire_friends_refresh';

const gate = { kind: 'gate' } as never;
// хранилище снимка принимает только более свежую секцию — время в тесте растёт само
let stamp = 1_000;
const setFriendsSnapshot = (canonicalUid: string, uids: string[]) => patchAppSnapshot({
  friends: { source: 'memory', updatedAt: ++stamp, canonicalUid, friends: uids.map((uid) => ({ uid, createdAt: 1 })) as never, requests: [], profiles: {} },
} as never);
type HookProps = Readonly<{ uid: string; runtimeActive: boolean; setFriends: jest.Mock; ownerEpoch?: number }>;
const mount = async (uid: string, setFriends: jest.Mock = jest.fn(), runtimeActive = true) => renderHook(
  ({ uid: ownerUid, runtimeActive: active, setFriends: setter, ownerEpoch = 0 }: HookProps) => useSpireFriendsRefresh({
    gate,
    ids: { uid: ownerUid, stableId: `s-${ownerUid}` },
    lang: 'en' as never,
    friendsCount: 1,
    setFriends: setter,
    runtimeActive: active,
    ownerEpoch,
  }),
  { initialProps: { uid, runtimeActive, setFriends } },
);
// настоящее время: под фейковыми часами React откладывает эффекты второго и следующих хуков, и подписка не создаётся
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

describe('R40 · ряд друзей Пика обновляется по добавлению друга', () => {
  beforeEach(() => { mockLoad.mockReset(); mockLoad.mockResolvedValue(null); });
  // React 19: только асинхронный act — синхронный без ожидания ломал среду для следующих случаев (хук не монтировался)

  it('новый друг → ряд перечитан один раз, из кэша (без force)', async () => {
    const setFriends = jest.fn();
    mockLoad.mockResolvedValue([{ uid: 'a' }, { uid: 'b' }]);
    setFriendsSnapshot('u1', ['a']);
    await mount('u1', setFriends);
    await act(async () => { setFriendsSnapshot('u1', ['a', 'b']); setFriendsSnapshot('u1', ['b', 'a']); });
    expect(mockLoad).not.toHaveBeenCalled(); // серия склеивается в одно обновление после паузы
    await settle();
    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockLoad.mock.calls[0]![1]).toEqual({ myUid: 'u1', lang: 'en' });
    expect(mockLoad.mock.calls[0]![2]).toBeUndefined();
    expect(setFriends).toHaveBeenCalledWith([{ uid: 'a' }, { uid: 'b' }]);
  });

  it('тот же набор — без загрузки', async () => {
    setFriendsSnapshot('u2', ['a']);
    await mount('u2');
    await act(async () => { setFriendsSnapshot('u2', ['a']); });
    await settle();
    expect(mockLoad).not.toHaveBeenCalled();
    await act(async () => { setFriendsSnapshot('u2', ['a', 'd']); }); // контроль: тот же хук на НОВЫЙ набор реагирует
    await settle();
    expect(mockLoad).toHaveBeenCalledWith(gate, { myUid: 'u2', lang: 'en' });
  });

  it('снимок другого владельца не трогает ряд', async () => {
    setFriendsSnapshot('u3', ['a']);
    await mount('u3');
    await act(async () => { setFriendsSnapshot('someone-else', ['x', 'y']); });
    await settle();
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('сбой загрузки при непустом наборе не стирает ряд', async () => {
    const setFriends = jest.fn();
    mockLoad.mockResolvedValue([]);
    setFriendsSnapshot('u4', ['a']);
    await mount('u4', setFriends);
    await act(async () => { setFriendsSnapshot('u4', ['a', 'c']); });
    await settle();
    expect(mockLoad).toHaveBeenCalledWith(gate, { myUid: 'u4', lang: 'en' });
    expect(setFriends).not.toHaveBeenCalled();
  });

  it('hidden/background не подписан, а возврат foreground догоняет финальный набор ровно один раз без force', async () => {
    const setFriends = jest.fn();
    mockLoad.mockResolvedValue([{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }]);
    setFriendsSnapshot('u5', ['a']);
    const hook = await mount('u5', setFriends);
    await act(async () => { hook.rerender({ uid: 'u5', runtimeActive: false, setFriends }); });
    await act(async () => { setFriendsSnapshot('u5', ['a', 'b']); setFriendsSnapshot('u5', ['c', 'b', 'a']); });
    await settle();
    expect(mockLoad).not.toHaveBeenCalled();

    await act(async () => { hook.rerender({ uid: 'u5', runtimeActive: true, setFriends }); });
    await settle();
    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockLoad).toHaveBeenCalledWith(gate, { myUid: 'u5', lang: 'en' });
    expect(setFriends).toHaveBeenCalledWith([{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }]);
  });

  it('первый retained mount в hidden запоминает S0 и при первом показе догоняет S1', async () => {
    const setFriends = jest.fn();
    mockLoad.mockResolvedValue([{ uid: 'a' }, { uid: 'b' }]);
    setFriendsSnapshot('u5-first-hidden', ['a']);
    const hook = await mount('u5-first-hidden', setFriends, false);
    await act(async () => { setFriendsSnapshot('u5-first-hidden', ['a', 'b']); });
    await settle();
    expect(mockLoad).not.toHaveBeenCalled();
    await act(async () => { hook.rerender({ uid: 'u5-first-hidden', runtimeActive: true, setFriends }); });
    await settle();
    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockLoad).toHaveBeenCalledWith(gate, { myUid: 'u5-first-hidden', lang: 'en' });
  });

  it('тот же или переставленный набор в hidden не вызывает catch-up при возврате', async () => {
    const setFriends = jest.fn();
    setFriendsSnapshot('u5-same', ['a', 'b']);
    const hook = await mount('u5-same', setFriends);
    await act(async () => { hook.rerender({ uid: 'u5-same', runtimeActive: false, setFriends }); });
    await act(async () => { setFriendsSnapshot('u5-same', ['b', 'a']); });
    await act(async () => { hook.rerender({ uid: 'u5-same', runtimeActive: true, setFriends }); });
    await settle();
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('переход в hidden отменяет debounce, а возврат один раз догоняет изменение', async () => {
    const setFriends = jest.fn();
    mockLoad.mockResolvedValue([{ uid: 'a' }, { uid: 'b' }]);
    setFriendsSnapshot('u6', ['a']);
    const hook = await mount('u6', setFriends);
    await act(async () => { setFriendsSnapshot('u6', ['a', 'b']); hook.rerender({ uid: 'u6', runtimeActive: false, setFriends }); });
    await settle();
    expect(mockLoad).not.toHaveBeenCalled();
    await act(async () => { hook.rerender({ uid: 'u6', runtimeActive: true, setFriends }); });
    await settle();
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });

  it('unmount отменяет ожидающий debounce', async () => {
    setFriendsSnapshot('u7', ['a']);
    const hook = await mount('u7');
    await act(async () => { setFriendsSnapshot('u7', ['a', 'b']); hook.unmount(); });
    await settle();
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('A → B → A хранит baseline отдельно: B не получает A, A догоняется один раз', async () => {
    const setFriends = jest.fn();
    mockLoad.mockResolvedValue([{ uid: 'a' }, { uid: 'c' }]);
    setFriendsSnapshot('owner-A', ['a']);
    const hook = await mount('owner-A', setFriends);
    await act(async () => {
      setFriendsSnapshot('owner-B', ['b']);
      hook.rerender({ uid: 'owner-B', runtimeActive: true, setFriends });
    });
    await settle();
    expect(mockLoad).not.toHaveBeenCalled();

    await act(async () => {
      setFriendsSnapshot('owner-A', ['a', 'c']);
      hook.rerender({ uid: 'owner-A', runtimeActive: true, setFriends });
    });
    await settle();
    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockLoad).toHaveBeenCalledWith(gate, { myUid: 'owner-A', lang: 'en' });
  });

  it('поздний hidden-ответ не обновляет state; после возврата идёт свежий catch-up', async () => {
    const setFriends = jest.fn();
    const first = deferred<readonly { uid: string }[]>();
    mockLoad.mockReturnValueOnce(first.promise).mockResolvedValueOnce([{ uid: 'a' }, { uid: 'b' }]);
    setFriendsSnapshot('u8', ['a']);
    const hook = await mount('u8', setFriends);
    await act(async () => { setFriendsSnapshot('u8', ['a', 'b']); });
    await settle();
    expect(mockLoad).toHaveBeenCalledTimes(1);

    await act(async () => { hook.rerender({ uid: 'u8', runtimeActive: false, setFriends }); });
    await act(async () => {
      first.resolve([{ uid: 'stale' }]);
      await first.promise;
    });
    expect(setFriends).not.toHaveBeenCalled();
    await act(async () => { hook.rerender({ uid: 'u8', runtimeActive: true, setFriends }); });
    await settle();
    expect(mockLoad).toHaveBeenCalledTimes(2);
    expect(setFriends).toHaveBeenCalledTimes(1);
    expect(setFriends).toHaveBeenCalledWith([{ uid: 'a' }, { uid: 'b' }]);
  });

  it('поздний ответ A не попадает владельцу B', async () => {
    const setFriends = jest.fn();
    const loadA = deferred<readonly { uid: string }[]>();
    mockLoad.mockReturnValueOnce(loadA.promise);
    setFriendsSnapshot('u9-A', ['a']);
    const hook = await mount('u9-A', setFriends);
    await act(async () => { setFriendsSnapshot('u9-A', ['a', 'x']); });
    await settle();
    await act(async () => {
      setFriendsSnapshot('u9-B', ['b']);
      hook.rerender({ uid: 'u9-B', runtimeActive: true, setFriends });
      loadA.resolve([{ uid: 'private-A' }]);
      await loadA.promise;
    });
    expect(setFriends).not.toHaveBeenCalled();
  });

  it('ручное обновление остаётся force:true', async () => {
    const setFriends = jest.fn();
    mockLoad.mockResolvedValue([{ uid: 'a' }]);
    setFriendsSnapshot('u10', ['a']);
    const hook = await mount('u10', setFriends);
    await act(async () => { await hook.result.current(); });
    expect(mockLoad).toHaveBeenCalledWith(gate, { myUid: 'u10', lang: 'en' }, { force: true });
    expect(setFriends).toHaveBeenCalledWith([{ uid: 'a' }]);
  });

  it('поздний ответ ручного force-refresh не обновляет hidden state', async () => {
    const setFriends = jest.fn();
    const manual = deferred<readonly { uid: string }[]>();
    mockLoad.mockReturnValueOnce(manual.promise);
    setFriendsSnapshot('u11', ['a']);
    const hook = await mount('u11', setFriends);
    let refresh!: Promise<void>;
    await act(async () => { refresh = hook.result.current(); await Promise.resolve(); });
    await act(async () => { hook.rerender({ uid: 'u11', runtimeActive: false, setFriends }); });
    await act(async () => { manual.resolve([{ uid: 'stale' }]); await refresh; });
    expect(setFriends).not.toHaveBeenCalled();
  });

  it('manual A, затем A → B → A: старый ответ не публикуется в новый runtime A', async () => {
    const setFriends = jest.fn();
    const oldA = deferred<readonly { uid: string }[]>();
    mockLoad.mockReturnValueOnce(oldA.promise);
    setFriendsSnapshot('runtime-A', ['a']);
    const hook = await mount('runtime-A', setFriends);
    let refresh!: Promise<void>;
    await act(async () => { refresh = hook.result.current(); await Promise.resolve(); });
    await act(async () => {
      setFriendsSnapshot('runtime-B', ['b']);
      hook.rerender({ uid: 'runtime-B', runtimeActive: true, setFriends, ownerEpoch: 1 });
    });
    await act(async () => {
      setFriendsSnapshot('runtime-A', ['a']);
      hook.rerender({ uid: 'runtime-A', runtimeActive: true, setFriends, ownerEpoch: 2 });
    });
    await act(async () => { oldA.resolve([{ uid: 'stale-A-before-switch' }]); await refresh; });
    expect(setFriends).not.toHaveBeenCalled();
  });

  it('manual active → hidden → active: ответ прежней runtime-сессии не публикуется', async () => {
    const setFriends = jest.fn();
    const oldSession = deferred<readonly { uid: string }[]>();
    mockLoad.mockReturnValueOnce(oldSession.promise);
    setFriendsSnapshot('runtime-hidden-A', ['a']);
    const hook = await mount('runtime-hidden-A', setFriends);
    let refresh!: Promise<void>;
    await act(async () => { refresh = hook.result.current(); await Promise.resolve(); });
    await act(async () => { hook.rerender({ uid: 'runtime-hidden-A', runtimeActive: false, setFriends }); });
    await act(async () => { hook.rerender({ uid: 'runtime-hidden-A', runtimeActive: true, setFriends }); });
    await act(async () => { oldSession.resolve([{ uid: 'stale-before-hidden' }]); await refresh; });
    expect(setFriends).not.toHaveBeenCalled();
  });

  it('ABA снимает старый manual lock, а old finally не снимает новый token', async () => {
    const setFriends = jest.fn();
    const oldA = deferred<readonly { uid: string }[]>();
    const newA = deferred<readonly { uid: string }[]>();
    mockLoad.mockReturnValueOnce(oldA.promise).mockReturnValueOnce(newA.promise);
    setFriendsSnapshot('runtime-lock-A', ['a']);
    const hook = await mount('runtime-lock-A', setFriends);
    let oldRefresh!: Promise<void>;
    await act(async () => { oldRefresh = hook.result.current(); await Promise.resolve(); });
    await act(async () => {
      setFriendsSnapshot('runtime-lock-B', ['b']);
      hook.rerender({ uid: 'runtime-lock-B', runtimeActive: true, setFriends, ownerEpoch: 1 });
    });
    await act(async () => {
      setFriendsSnapshot('runtime-lock-A', ['a']);
      hook.rerender({ uid: 'runtime-lock-A', runtimeActive: true, setFriends, ownerEpoch: 2 });
    });
    let newRefresh!: Promise<void>;
    await act(async () => { newRefresh = hook.result.current(); await Promise.resolve(); });
    expect(mockLoad).toHaveBeenCalledTimes(2);

    await act(async () => { oldA.resolve([{ uid: 'stale-old-A' }]); await oldRefresh; });
    await act(async () => { await hook.result.current(); });
    expect(mockLoad).toHaveBeenCalledTimes(2); // новый token всё ещё держит lock

    await act(async () => { newA.resolve([{ uid: 'fresh-new-A' }]); await newRefresh; });
    expect(setFriends).toHaveBeenCalledTimes(1);
    expect(setFriends).toHaveBeenCalledWith([{ uid: 'fresh-new-A' }]);
  });

  it('старый manual S0 не перезаписывает более свежий automatic S1 того же владельца', async () => {
    const setFriends = jest.fn();
    const manual = deferred<readonly { uid: string }[]>();
    mockLoad.mockReturnValueOnce(manual.promise).mockResolvedValueOnce([{ uid: 'a' }, { uid: 'b' }]);
    setFriendsSnapshot('u12', ['a']);
    const hook = await mount('u12', setFriends);
    let refresh!: Promise<void>;
    await act(async () => { refresh = hook.result.current(); await Promise.resolve(); });
    await act(async () => { setFriendsSnapshot('u12', ['a', 'b']); });
    await settle();
    expect(mockLoad).toHaveBeenCalledTimes(2);
    expect(setFriends).toHaveBeenCalledTimes(1);
    expect(setFriends).toHaveBeenLastCalledWith([{ uid: 'a' }, { uid: 'b' }]);

    await act(async () => { manual.resolve([{ uid: 'stale-S0' }]); await refresh; });
    expect(setFriends).toHaveBeenCalledTimes(1);
    expect(setFriends).toHaveBeenLastCalledWith([{ uid: 'a' }, { uid: 'b' }]);
  });
});
