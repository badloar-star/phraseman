// F17, аудит похожих мест (владелец 11.11): память Пика, пережившая смену аккаунта A → B.
//   • хост окон позиции: ключи окон не содержат uid — «закрыто у A» не должно глушить то же окно у B, а открытое окно A не показывается B;
//   • бейдж «N место» плитки «Пик» на Главной: место A сбрасывается при смене владельца, поздний пересчёт A не публикуется.
// Сработал — чини логику, а не сторожа.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import React from 'react';
import { render, renderHook, fireEvent, act } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', Pressable: 'Pressable', Modal: 'Modal',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
}));
jest.mock('../hooks/use-guarded-nav', () => ({ useGuardedNav: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock('../components/OverlayArbiter', () => ({ useOverlayVisible: (_key: string, want: boolean) => want }));
jest.mock('../components/modal_fx/SheetSwipeClose', () => ({ SheetSwipeRoot: (props: { children: React.ReactNode }) => props.children }));
jest.mock('../components/spire/moments/SpirePositionRiseMoment', () => ({
  __esModule: true,
  default: (p: { onLater: () => void }) => require('react').createElement('Pressable', { testID: 'rise-later', onPress: p.onLater }),
}));
jest.mock('../components/spire/moments/SpireOvertakeToast', () => ({ __esModule: true, default: () => require('react').createElement('View', { testID: 'toast' }) }));
jest.mock('../components/spire/moments/SpireLastChanceSheet', () => ({
  __esModule: true,
  default: (p: { onClose: () => void }) => require('react').createElement('Pressable', { testID: 'last-close', onPress: p.onClose }),
}));
const mockOwnerResets: Record<string, () => void> = {};
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: (name: string, reset: () => void) => { mockOwnerResets[name] = reset; } }));
let mockRows: readonly { isMe: boolean; steps: number }[] = [];
let mockWeekGate: Promise<unknown> = Promise.resolve();
jest.mock('../app/spire_config_client', () => ({ peekSpireConfig: () => ({ enabled: true, residents: {} }), warmSpireConfigFromDisk: async () => undefined }));
jest.mock('../components/spire/spire_home_week', () => ({ readCurrentLocalWeek: async () => { await mockWeekGate; return null; } }));
jest.mock('../modules/spire/room_rows', () => ({ spireBuildRoomRows: () => mockRows }));
jest.mock('../app/spire/spire_rank_by_resolve', () => ({ spireResolveRankBy: () => ({ rankBy: 'steps' }) }));

import SpirePositionMomentsHost from '../components/spire/moments/SpirePositionMomentsHost';
import { NO_POSITION_MOMENTS, type SpirePositionMoments } from '../components/spire/moments/position_moments_contract';
import { __resetSpireHomePlace, refreshSpireHomePlace, useSpireHomePlace } from '../app/spire/spire_home_place';

const LAST = { key: '2026-W46:lastChance', weekEndsAtMs: 2_000_000_000_000, energyReadyAtMs: 1_900_000_000_000, gapCoins: 60 };
const RISE = { key: '2026-W46:rise:4:11', rows: [{ uid: 'me', name: 'Ты', coinRank: 5, coins: 440, isMe: true }], fromIndex: 5, toIndex: 4, coinsGained: 10 };
const make = (over: Partial<SpirePositionMoments>): SpirePositionMoments => ({ ...NO_POSITION_MOMENTS, consume: jest.fn(), ...over }) as SpirePositionMoments;
const host = (positions: SpirePositionMoments) => <SpirePositionMomentsHost lang="ru" coinRank={5} busy={false} blocked={false} onClimb={jest.fn()} positions={positions} />;

describe('F17 · хост окон позиции при смене аккаунта', () => {
  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => jest.restoreAllMocks());

  it('«Последний шанс» закрыт у A — у B на той же неделе (тот же ключ) окно показывается', async () => {
    const view = await render(host(make({ owner: 'a:en', lastChance: LAST })));
    await act(async () => { fireEvent.press(view.getByTestId('last-close')); });
    expect(view.queryByTestId('last-close')).toBeNull();
    await act(async () => { view.rerender(host(make({ owner: null }))); });
    const forB = make({ owner: 'b:en', lastChance: LAST });
    await act(async () => { view.rerender(host(forB)); });
    expect(view.queryByTestId('last-close')).not.toBeNull();
    expect(forB.consume).toHaveBeenCalledWith('lastChance', LAST.key);
  });

  it('тому же владельцу закрытое окно повторно не показывается', async () => {
    const view = await render(host(make({ owner: 'a:en', lastChance: LAST })));
    await act(async () => { fireEvent.press(view.getByTestId('last-close')); });
    await act(async () => { view.rerender(host(make({ owner: 'a:en', lastChance: LAST }))); });
    expect(view.queryByTestId('last-close')).toBeNull();
  });

  it('открытое «Позиция выросла» аккаунта A исчезает в том же кадре, где владелец сменился', async () => {
    const view = await render(host(make({ owner: 'a:en', rise: RISE })));
    expect(view.queryByTestId('rise-later')).not.toBeNull();
    await act(async () => { view.rerender(host(make({ owner: 'b:en' }))); });
    expect(view.queryByTestId('rise-later')).toBeNull();
  });
});

describe('F17 · бейдж места Пика на Главной при смене аккаунта', () => {
  const ROOM = { weekId: '2026-W46' } as never;
  const THIRD = [{ isMe: false, steps: 9 }, { isMe: false, steps: 8 }, { isMe: true, steps: 5 }];
  beforeEach(() => {
    __resetSpireHomePlace();
    mockRows = THIRD;
    mockWeekGate = Promise.resolve();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('место A сбрасывается при смене владельца', async () => {
    await refreshSpireHomePlace('a', 'en' as never, ROOM);
    const hook = await renderHook(() => useSpireHomePlace('en'));
    expect(hook.result.current).toBe(3);
    await act(async () => { mockOwnerResets.spire_home_place!(); });
    expect(hook.result.current).toBeNull();
  });

  it('пересчёт A, не успевший до смены владельца, место не публикует', async () => {
    let open: () => void = () => {};
    mockWeekGate = new Promise<void>((resolve) => { open = resolve; });
    const pending = refreshSpireHomePlace('a', 'en' as never, ROOM);
    await act(async () => { await Promise.resolve(); });
    mockOwnerResets.spire_home_place!();
    open();
    await pending;
    const hook = await renderHook(() => useSpireHomePlace('en'));
    expect(hook.result.current).toBeNull();
  });
});
