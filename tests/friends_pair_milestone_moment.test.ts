/**
 * usePairMilestoneMoment — окно вехи «Серия вдвоём — 30 дней» на вкладке «Друзья» (идея 1, макет friends-full.html).
 * Сторож: веху решаем один раз на снимок и по очереди; пока открыто окно вкладки или общее окно приложения — ждём, но не теряем
 * (отметка «праздновали» уже стоит); слот общей очереди просим под своим ключом и отпускаем на «Отлично»; открытое окно не прячется.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { FriendsTogetherSnapshot } from '../app/friends_together/together_store';

const mockTake = jest.fn();
jest.mock('../app/friends_together/pair_milestones', () => ({
  takePairMilestone: (...args: unknown[]) => mockTake(...args),
}));
jest.mock('../app/friends_together/together_store', () => ({ readMyActiveDays: () => Promise.resolve(null) }));
const mockUser: { current: string | null } = { current: 'me-1' };
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: () => Promise.resolve(mockUser.current) }));
// Общая очередь окон: слот свободен (grant) или занят другим окном приложения; запоминаем, что просили.
const mockOverlay: { grant: boolean; asks: Array<[string, boolean]> } = { grant: true, asks: [] };
jest.mock('../components/OverlayArbiter', () => ({
  useOverlayVisible: (key: string, wants: boolean) => {
    mockOverlay.asks.push([key, wants]);
    return wants && mockOverlay.grant;
  },
}));

import { usePairMilestoneMoment } from '../hooks/use_pair_milestone_moment';

const lit = { state: 'both_today' as const, streak: 30, best: 30, lostStreak: 0, week: [] };
const snapshot = (tag: number, state: typeof lit.state | 'friend_pending' = 'both_today'): FriendsTogetherSnapshot => ({
  updatedAtMs: tag,
  myDayKey: '2026-10-22',
  pairs: { ira: { friendUid: 'ira', days: 30, level: 3, todayCommon: true, name: 'Ирина', coinRank: 4, isPlus: false, pair: { ...lit, state } } },
});

type Props = { active: boolean; snapshot: FriendsTogetherSnapshot | null; blocked: boolean };
const mount = (initialProps: Props) => renderHook((p: Props) => usePairMilestoneMoment(p), { initialProps });
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
const SLOW = { timeout: 3000 }; // зачем: между «ждёт» и «просит слот» — зазор закрытия нативного окна (360 мс)
const lastAsk = () => mockOverlay.asks[mockOverlay.asks.length - 1];

beforeEach(() => {
  mockTake.mockReset();
  mockTake.mockImplementation(async (candidates: readonly unknown[]) => ({ candidate: candidates[0], milestone: 30 }));
  mockUser.current = 'me-1';
  mockOverlay.grant = true;
  mockOverlay.asks = [];
});

it('огонь у обоих на вехе — окно открывается через общую очередь; отметку ставит takePairMilestone на свой uid', async () => {
  const { result } = await mount({ active: true, snapshot: snapshot(1), blocked: false });
  await waitFor(() => expect(result.current.moment?.phase).toBe('open'), SLOW);
  expect(result.current.visible).toBe(true);
  expect(result.current.moment).toMatchObject({ milestone: 30, candidate: { friendUid: 'ira', name: 'Ирина', coinRank: 4, isPlus: false } });
  expect(mockTake).toHaveBeenCalledTimes(1);
  expect(mockTake.mock.calls[0][1]).toBe('me-1');
  expect(lastAsk()).toEqual(['friendPairMilestone', true]);
});

it('открыто окно вкладки — веха ждёт и не теряется, слот не просит; окно закрылось — открывается', async () => {
  const snap = snapshot(1);
  const { result, rerender } = await mount({ active: true, snapshot: snap, blocked: true });
  await waitFor(() => expect(result.current.moment?.phase).toBe('waiting'));
  expect(lastAsk()).toEqual(['friendPairMilestone', false]);
  await act(async () => { rerender({ active: true, snapshot: snap, blocked: false }); });
  await waitFor(() => expect(result.current.moment?.phase).toBe('open'), SLOW);
  expect(mockTake).toHaveBeenCalledTimes(1);
});

it('общее окно приложения держит слот — веха ждёт в очереди невидимой; слот свободен — открывается', async () => {
  mockOverlay.grant = false;
  const snap = snapshot(1);
  const { result, rerender } = await mount({ active: true, snapshot: snap, blocked: false });
  await waitFor(() => expect(result.current.moment?.phase).toBe('ready'), SLOW);
  expect(result.current.visible).toBe(false);
  mockOverlay.grant = true;
  await act(async () => { rerender({ active: true, snapshot: snap, blocked: false }); });
  await waitFor(() => expect(result.current.moment?.phase).toBe('open'));
  expect(result.current.visible).toBe(true);
});

it('пока веха в очереди, открылось окно вкладки — веха снова ждёт и отпускает слот', async () => {
  mockOverlay.grant = false;
  const snap = snapshot(1);
  const { result, rerender } = await mount({ active: true, snapshot: snap, blocked: false });
  await waitFor(() => expect(result.current.moment?.phase).toBe('ready'), SLOW);
  await act(async () => { rerender({ active: true, snapshot: snap, blocked: true }); });
  expect(result.current.moment?.phase).toBe('waiting');
  expect(lastAsk()).toEqual(['friendPairMilestone', false]);
});

it('вкладка не на экране — веху не решаем; вернулась — решаем', async () => {
  const snap = snapshot(1);
  const { result, rerender } = await mount({ active: false, snapshot: snap, blocked: false });
  await flush();
  expect(mockTake).not.toHaveBeenCalled();
  expect(result.current.moment).toBeNull();
  await act(async () => { rerender({ active: true, snapshot: snap, blocked: false }); });
  await waitFor(() => expect(result.current.moment?.phase).toBe('open'), SLOW);
});

it('открытое окно не прячется, если поверх пришло окно вкладки', async () => {
  const snap = snapshot(1);
  const { result, rerender } = await mount({ active: true, snapshot: snap, blocked: false });
  await waitFor(() => expect(result.current.moment?.phase).toBe('open'), SLOW);
  await act(async () => { rerender({ active: true, snapshot: snap, blocked: true }); });
  expect(result.current.moment?.phase).toBe('open');
  expect(result.current.visible).toBe(true);
});

it('«Отлично» → окно уходит (слот отпущен, снова не открывается) → веха снята; новый снимок проверяется заново', async () => {
  const snap = snapshot(1);
  const { result, rerender } = await mount({ active: true, snapshot: snap, blocked: false });
  await waitFor(() => expect(result.current.moment?.phase).toBe('open'), SLOW);
  await act(async () => { result.current.close(); });
  expect(result.current.moment?.phase).toBe('closing');
  expect(result.current.visible).toBe(false);
  expect(lastAsk()).toEqual(['friendPairMilestone', false]);
  await act(async () => { result.current.dismissed(); });
  expect(result.current.moment).toBeNull();
  mockTake.mockResolvedValueOnce(null);
  await act(async () => { rerender({ active: true, snapshot: snapshot(2), blocked: false }); });
  await waitFor(() => expect(mockTake).toHaveBeenCalledTimes(2));
  expect(result.current.moment).toBeNull();
});

it('тот же снимок — одна проверка; пока веха взята, новый снимок вторую не берёт', async () => {
  const snap = snapshot(1);
  const { result, rerender } = await mount({ active: true, snapshot: snap, blocked: false });
  await waitFor(() => expect(result.current.moment?.phase).toBe('open'), SLOW);
  await act(async () => { rerender({ active: true, snapshot: snap, blocked: false }); });
  await act(async () => { rerender({ active: true, snapshot: snapshot(2), blocked: false }); });
  await flush();
  expect(mockTake).toHaveBeenCalledTimes(1);
});

it('два снимка подряд (диск, затем сеть) — проверки по очереди, вторая не берёт вторую веху', async () => {
  let release: () => void = () => undefined;
  mockTake.mockImplementationOnce((candidates: readonly unknown[]) => new Promise((resolve) => {
    release = () => resolve({ candidate: candidates[0], milestone: 30 });
  }));
  const { result, rerender } = await mount({ active: true, snapshot: snapshot(1), blocked: false });
  await waitFor(() => expect(mockTake).toHaveBeenCalledTimes(1));
  await act(async () => { rerender({ active: true, snapshot: snapshot(2), blocked: false }); });
  await flush();
  expect(mockTake).toHaveBeenCalledTimes(1); // вторая ждёт первую
  await act(async () => { release(); });
  await waitFor(() => expect(result.current.moment?.phase).toBe('open'), SLOW);
  await flush();
  expect(mockTake).toHaveBeenCalledTimes(1); // веха взята — вторая проверка пропущена
});

it('огонь у обоих ни у кого не горит — хранилище вех не читаем', async () => {
  const { result } = await mount({ active: true, snapshot: snapshot(1, 'friend_pending'), blocked: false });
  await flush();
  expect(mockTake).not.toHaveBeenCalled();
  expect(result.current.moment).toBeNull();
});

it('нет своего uid — веху не решаем (отметки у каждого аккаунта свои)', async () => {
  mockUser.current = null;
  const { result } = await mount({ active: true, snapshot: snapshot(1), blocked: false });
  await flush();
  expect(mockTake).not.toHaveBeenCalled();
  expect(result.current.moment).toBeNull();
});

it('сбой проверки — окна нет, следующая проверка работает', async () => {
  mockTake.mockRejectedValueOnce(new Error('disk'));
  const { result, rerender } = await mount({ active: true, snapshot: snapshot(1), blocked: false });
  await flush();
  expect(result.current.moment).toBeNull();
  await act(async () => { rerender({ active: true, snapshot: snapshot(2), blocked: false }); });
  await waitFor(() => expect(result.current.moment?.phase).toBe('open'), SLOW);
});
