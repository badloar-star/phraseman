// F17 (владелец 11.11): окна позиции Пика после смены аккаунта A → B. Окна и «прежнее место» аккаунта A не должны
// дожить до B: иначе место A сравнивается с местом B и B видит ложное «Позиция выросла». Сработал — чини логику, а не сторожа.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

jest.mock('../components/EnergyContext', () => ({ useEnergy: () => ({ energy: 3, bonusEnergy: 0, isUnlimited: false, timeUntilNextMs: 0 }) }));

import type { SpireRoomRow } from '../modules/spire/room_rows';
import { spirePositionOf } from '../app/spire/spire_position_moments_core';
import { __resetSpirePositionMomentsForTests, useSpirePositionMomentsWith } from '../app/spire/use_spire_position_moments';

const WEEK = '2026-W46';
const NOON = new Date(2026, 10, 11, 12).getTime(); // среда — «последний шанс» молчит

/** 15 живых по монетам: зона повышения — места 1..5. Я — на месте myPlace. */
function room(myPlace: number, myCoins: number, mySteps = 10): SpireRoomRow[] {
  const others = Array.from({ length: 14 }, (_, i) => ({ uid: `p${i}`, name: `Игрок ${i}`, steps: 20 - i, reachedAtMs: 1, isMe: false, coinRank: i % 20, weekCoins: 1500 - i * 100 }));
  const me = { uid: 'me', name: 'Я', steps: mySteps, reachedAtMs: 1, isMe: true, coinRank: 3, weekCoins: myCoins };
  const rows = [...others];
  rows.splice(myPlace - 1, 0, me);
  return rows;
}

type P = { uid: string | null; rows: SpireRoomRow[] | null; at: number | null };
const mount = (initial: P) => renderHook(
  (p: P) => useSpirePositionMomentsWith({ enabled: p.rows !== null, uid: p.uid, lang: p.uid ? 'en' : null, weekId: p.rows ? WEEK : null, roomFetchedAtMs: p.at, rows: p.rows, rankBy: 'coins', energyReadyAtMs: 0, nowMs: NOON }),
  { initialProps: initial },
);
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

describe('F17: окна позиции Пика при смене аккаунта', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    __resetSpirePositionMomentsForTests();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('A вне зоны повышения → выход → B в зоне повышения: ложного «Позиция выросла» нет', async () => {
    const { result, rerender } = await mount({ uid: 'a', rows: room(7, 1000), at: 1 });
    await flush();
    await act(async () => { rerender({ uid: null, rows: null, at: null }); });
    await act(async () => { rerender({ uid: 'b', rows: room(4, 1250, 11), at: 2 }); });
    await flush();
    expect(result.current.rise).toBeNull();
  });

  it('A → B без промежуточного выхода (одним кадром): ложного повышения тоже нет', async () => {
    const { result, rerender } = await mount({ uid: 'a', rows: room(7, 1000), at: 1 });
    await flush();
    await act(async () => { rerender({ uid: 'b', rows: room(4, 1250, 11), at: 2 }); });
    await flush();
    expect(result.current.rise).toBeNull();
  });

  it('открытое окно «Позиция выросла» аккаунта A убирается при выходе и не возвращается у B', async () => {
    const { result, rerender } = await mount({ uid: 'a', rows: room(7, 1000), at: 1 });
    await act(async () => { rerender({ uid: 'a', rows: room(4, 1250, 11), at: 1 }); });
    expect(result.current.rise).not.toBeNull();
    await act(async () => { rerender({ uid: null, rows: null, at: null }); });
    expect(result.current.rise).toBeNull();
    await act(async () => { rerender({ uid: 'b', rows: room(4, 1250, 11), at: 2 }); });
    await flush();
    expect(result.current.rise).toBeNull();
  });

  it('настоящее повышение B после смены аккаунта по-прежнему показывается', async () => {
    const { result, rerender } = await mount({ uid: 'a', rows: room(3, 1300), at: 1 });
    await flush();
    await act(async () => { rerender({ uid: 'b', rows: room(7, 1000), at: 2 }); });
    await flush();
    expect(result.current.rise).toBeNull();
    await act(async () => { rerender({ uid: 'b', rows: room(4, 1250, 11), at: 2 }); });
    expect(result.current.rise).not.toBeNull();
  });

  it('«Тебя обогнали» у A в этой сессии не глушит то же окно у B', async () => {
    const seen = (uid: string) => AsyncStorage.setItem(`spire_position_seen_v1:${uid}:en`, JSON.stringify(spirePositionOf(room(4, 1200), 'coins', WEEK, 100)));
    await seen('a');
    await seen('b');
    const { result, rerender } = await mount({ uid: 'a', rows: room(6, 1200), at: 200 });
    await flush();
    const key = result.current.overtake?.key;
    expect(key).toBeTruthy();
    await act(async () => { result.current.consume('overtake', key!); });
    expect(result.current.overtake).toBeNull();
    await act(async () => { rerender({ uid: 'b', rows: room(6, 1200), at: 300 }); });
    await flush();
    expect(result.current.overtake).not.toBeNull();
  });
});
