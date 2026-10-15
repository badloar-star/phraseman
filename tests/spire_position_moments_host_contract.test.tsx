// зачем (координатор 15.10, m05 Пика): хост рисует готовые решения Ядра — показ 1 раз по key (consume в момент показа), одно окно за раз (rise → overtake → lastChance), ожидание пока открыт итог ступени,
// «Играть» СНАЧАЛА закрывает окно, потом зовёт onClimb, «Plus» ведёт только в общий пейвол (premium_modal), двойной тап не срабатывает дважды.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  Modal: 'Modal',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
}));
const mockPush = jest.fn();
jest.mock('../hooks/use-guarded-nav', () => ({ useGuardedNav: () => ({ push: mockPush, replace: jest.fn() }) }));
jest.mock('../components/modal_fx/SheetSwipeClose', () => ({ SheetSwipeRoot: (props: { children: React.ReactNode }) => props.children }));
jest.mock('../components/spire/moments/SpirePositionRiseMoment', () => ({
  __esModule: true,
  default: (p: { onPlay: () => void; onLater: () => void }) => require('react').createElement('View', null,
    require('react').createElement('Pressable', { testID: 'rise-play', onPress: p.onPlay }),
    require('react').createElement('Pressable', { testID: 'rise-later', onPress: p.onLater })),
}));
jest.mock('../components/spire/moments/SpireOvertakeToast', () => ({
  __esModule: true,
  default: (p: { onPlay: () => void; onDismiss: () => void }) => require('react').createElement('View', null,
    require('react').createElement('Pressable', { testID: 'toast-play', onPress: p.onPlay }),
    require('react').createElement('Pressable', { testID: 'toast-gone', onPress: p.onDismiss })),
}));
jest.mock('../components/spire/moments/SpireLastChanceSheet', () => ({
  __esModule: true,
  default: (p: { onPlus: () => void; onClose: () => void }) => require('react').createElement('View', null,
    require('react').createElement('Pressable', { testID: 'last-plus', onPress: p.onPlus }),
    require('react').createElement('Pressable', { testID: 'last-close', onPress: p.onClose })),
}));

import SpirePositionMomentsHost from '../components/spire/moments/SpirePositionMomentsHost';
import { NO_POSITION_MOMENTS, type SpirePositionMoments } from '../components/spire/moments/position_moments_contract';

const ROWS = [{ uid: 'me', name: 'Ты', coinRank: 5, coins: 440, isMe: true }];
const RISE = { key: 'w1:rise:1', rows: ROWS, fromIndex: 5, toIndex: 4, coinsGained: 10 };
const OVER = { key: 'w1:over:1', rivalName: 'Ира', rivalCoinRank: 7, gapCoins: 30 };
const LAST = { key: 'w1:last', weekEndsAtMs: 2_000_000_000_000, energyReadyAtMs: 1_900_000_000_000, gapCoins: 60 };

function make(over: Partial<SpirePositionMoments> = {}): SpirePositionMoments & { consume: jest.Mock } {
  return { ...NO_POSITION_MOMENTS, consume: jest.fn(), ...over } as SpirePositionMoments & { consume: jest.Mock };
}
const hostProps = { lang: 'ru', coinRank: 5, busy: false } as const;

beforeEach(() => { mockPush.mockClear(); });

describe('m05 · хост позиционных окон', () => {
  it('решений нет — ничего не рисуется и consume не зовётся', async () => {
    const positions = make();
    const r = await render(<SpirePositionMomentsHost {...hostProps} positions={positions} blocked={false} onClimb={jest.fn()} />);
    expect(r.toJSON()).toBeNull();
    expect(positions.consume).not.toHaveBeenCalled();
  });

  it('показ 1 раз: окно появляется, consume зовётся ровно один раз с kind и key; после закрытия тот же key не возвращается, даже если Ядро его ещё отдаёт', async () => {
    const positions = make({ rise: RISE });
    const onClimb = jest.fn();
    const r = await render(<SpirePositionMomentsHost {...hostProps} positions={positions} blocked={false} onClimb={onClimb} />);
    expect(r.getByTestId('rise-play')).toBeTruthy();
    expect(positions.consume).toHaveBeenCalledTimes(1);
    expect(positions.consume).toHaveBeenCalledWith('rise', 'w1:rise:1');
    await fireEvent.press(r.getByTestId('rise-later'));
    expect(r.queryByTestId('rise-later')).toBeNull();
    await r.rerender(<SpirePositionMomentsHost {...hostProps} positions={{ ...positions }} blocked={false} onClimb={onClimb} />);
    expect(r.queryByTestId('rise-later')).toBeNull();
    expect(positions.consume).toHaveBeenCalledTimes(1);
    expect(onClimb).not.toHaveBeenCalled();
  });

  it('«Играть ещё» СНАЧАЛА закрывает окно, потом зовёт onClimb; повторный тап не зовёт его второй раз', async () => {
    const order: string[] = [];
    const positions = make({ rise: RISE });
    const onClimb = jest.fn(() => { order.push('climb'); });
    const r = await render(<SpirePositionMomentsHost {...hostProps} positions={positions} blocked={false} onClimb={onClimb} />);
    const play = r.getByTestId('rise-play');
    await fireEvent.press(play);
    expect(r.queryByTestId('rise-play')).toBeNull();
    order.unshift('closed');
    await fireEvent.press(play);
    expect(onClimb).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['closed', 'climb']);
  });

  it('одно окно за раз и по приоритету: rise → overtake → lastChance; следующее появляется после закрытия предыдущего', async () => {
    const positions = make({ rise: RISE, overtake: OVER, lastChance: LAST });
    const r = await render(<SpirePositionMomentsHost {...hostProps} positions={positions} blocked={false} onClimb={jest.fn()} />);
    expect(r.queryByTestId('toast-play')).toBeNull();
    await fireEvent.press(r.getByTestId('rise-later'));
    expect(r.getByTestId('toast-play')).toBeTruthy();
    expect(r.queryByTestId('last-plus')).toBeNull();
    await fireEvent.press(r.getByTestId('toast-gone'));
    expect(r.getByTestId('last-plus')).toBeTruthy();
    expect(positions.consume.mock.calls.map((c) => c[0])).toEqual(['rise', 'overtake', 'lastChance']);
  });

  it('пока открыт итог ступени (blocked) окна ждут; когда итог закрыт — показываются', async () => {
    const positions = make({ overtake: OVER });
    const r = await render(<SpirePositionMomentsHost {...hostProps} positions={positions} blocked onClimb={jest.fn()} />);
    expect(r.queryByTestId('toast-play')).toBeNull();
    expect(positions.consume).not.toHaveBeenCalled();
    await act(async () => { r.rerender(<SpirePositionMomentsHost {...hostProps} positions={positions} blocked={false} onClimb={jest.fn()} />); });
    expect(r.getByTestId('toast-play')).toBeTruthy();
  });

  it('«Plus» в последнем шансе: шторка закрывается и открывается ОБЩИЙ пейвол (premium_modal), своей покупки нет', async () => {
    const positions = make({ lastChance: LAST });
    const r = await render(<SpirePositionMomentsHost {...hostProps} positions={positions} blocked={false} onClimb={jest.fn()} />);
    await fireEvent.press(r.getByTestId('last-plus'));
    expect(r.queryByTestId('last-plus')).toBeNull();
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0]?.[0]).toMatchObject({ pathname: '/premium_modal', params: { context: 'no_energy', source: 'spire_last_chance' } });
  });
});
