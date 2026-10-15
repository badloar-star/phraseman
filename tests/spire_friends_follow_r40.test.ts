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
const mount = async (uid: string, setFriends: jest.Mock = jest.fn()) => {
  const ids = { uid, stableId: `s-${uid}` };
  return renderHook(() => useSpireFriendsRefresh({ gate, ids, lang: 'en' as never, friendsCount: 1, setFriends }));
};
// настоящее время: под фейковыми часами React откладывает эффекты второго и следующих хуков, и подписка не создаётся
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });

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
});
