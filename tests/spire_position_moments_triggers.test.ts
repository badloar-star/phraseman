// Триггеры окон m05 Пика (координатор 15.10; договор Дизайна position_moments_contract): «Позиция выросла», «Тебя обогнали»,
// «Последний шанс». 0 чтений сети, решения — из строк комнаты. Сработал — чини логику, а не сторожа.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

jest.mock('../components/EnergyContext', () => ({ useEnergy: () => ({ energy: 3, bonusEnergy: 0, isUnlimited: false, timeUntilNextMs: 0 }) }));

import type { SpireRoomRow } from '../modules/spire/room_rows';
import {
  spireDecideLastChance,
  spireDecideOvertake,
  spireDecideRise,
  spirePositionOf,
  spireWeekEndsAtMs,
} from '../app/spire/spire_position_moments_core';
import { __resetSpirePositionMomentsForTests, useSpirePositionMomentsWith } from '../app/spire/use_spire_position_moments';

const WEEK = '2026-W42';
/** 15 живых, отсортированы по монетам: k = 5 → зона up = места 1..5. Я — на месте myPlace с монетами myCoins. */
function room(myPlace: number, myCoins: number, mySteps = 10): SpireRoomRow[] {
  const others = Array.from({ length: 14 }, (_, i) => ({ uid: `p${i}`, name: `Игрок ${i}`, steps: 20 - i, reachedAtMs: 1, isMe: false, coinRank: i % 20, weekCoins: 1500 - i * 100 }));
  const me = { uid: 'me', name: 'Я', steps: mySteps, reachedAtMs: 1, isMe: true, coinRank: 3, weekCoins: myCoins };
  const rows = [...others];
  rows.splice(myPlace - 1, 0, me);
  return rows;
}

describe('ядро решений m05', () => {
  it('rise: своей ступенью пересёк линию повышения (stay → up) → окно с «было → стало»', () => {
    const before = room(7, 1000);
    const after = room(4, 1250, 11);
    const prev = spirePositionOf(before, 'coins', WEEK, 1)!;
    const next = spirePositionOf(after, 'coins', WEEK, 1)!;
    expect([prev.zone, next.zone]).toEqual(['stay', 'up']);
    const d = spireDecideRise(prev, next, after);
    expect(d.show).not.toBeNull();
    expect(d.show!.coinsGained).toBe(250);
    expect(d.show!.rows[d.show!.toIndex].isMe).toBe(true);
    expect(d.show!.fromIndex).toBeGreaterThan(d.show!.toIndex);
  });

  it('rise: уже был в зоне up / другая неделя / не рос сам — окна нет', () => {
    const up1 = spirePositionOf(room(3, 1300), 'coins', WEEK, 1)!;
    const up2 = spirePositionOf(room(2, 1450, 12), 'coins', WEEK, 1)!;
    expect(spireDecideRise(up1, up2, room(2, 1450, 12)).show).toBeNull();
    const prevOther = { ...spirePositionOf(room(7, 1000), 'coins', '2026-W41', 1)! };
    expect(spireDecideRise(prevOther, up2, room(2, 1450, 12)).show).toBeNull();
    const same = spirePositionOf(room(7, 1000), 'coins', WEEK, 1)!;
    expect(spireDecideRise(same, same, room(7, 1000)).show).toBeNull();
  });

  it('overtake: новая загрузка комнаты, место хуже, сам не откатился → соперник прямо надо мной', () => {
    const seen = spirePositionOf(room(4, 1200), 'coins', WEEK, 100)!;
    const nowRows = room(6, 1200);
    const next = spirePositionOf(nowRows, 'coins', WEEK, 200)!;
    const d = spireDecideOvertake(seen, next, nowRows);
    expect(d.show).toEqual({ key: `${WEEK}:overtake:200`, rivalName: nowRows[4].name, rivalCoinRank: nowRows[4].coinRank, gapCoins: Math.max(0, nowRows[4].weekCoins - 1200) });
  });

  it('overtake: та же загрузка / место не хуже / сам откатился — окна нет', () => {
    const seen = spirePositionOf(room(4, 1200), 'coins', WEEK, 100)!;
    expect(spireDecideOvertake(seen, spirePositionOf(room(6, 1200), 'coins', WEEK, 100)!, room(6, 1200)).show).toBeNull();
    expect(spireDecideOvertake(seen, spirePositionOf(room(3, 1300), 'coins', WEEK, 200)!, room(3, 1300)).show).toBeNull();
    expect(spireDecideOvertake(seen, spirePositionOf(room(6, 1100), 'coins', WEEK, 200)!, room(6, 1100)).show).toBeNull();
  });

  it('lastChance: местное воскресенье 18:05, ниже линии → окно с «не хватает до топ-5»; суббота / 17:59 / в зоне up — нет', () => {
    const sunday = new Date(2026, 9, 18, 18, 5).getTime(); // вс 18.10.2026, неделя 2026-W42
    const rows = room(8, 900);
    const me = spirePositionOf(rows, 'coins', WEEK, 1)!;
    const d = spireDecideLastChance(sunday, me, rows, 'coins', sunday + 60_000);
    expect(d.show).toMatchObject({ key: `${WEEK}:lastChance`, weekEndsAtMs: spireWeekEndsAtMs(sunday), energyReadyAtMs: sunday + 60_000 });
    expect(d.show!.gapCoins).toBe(1100 - 900); // последний в up (5-е место) = 1100
    expect(spireDecideLastChance(new Date(2026, 9, 17, 19, 0).getTime(), me, rows, 'coins', 0).show).toBeNull();
    expect(spireDecideLastChance(new Date(2026, 9, 18, 17, 59).getTime(), me, rows, 'coins', 0).show).toBeNull();
    const upRows = room(2, 1450);
    expect(spireDecideLastChance(sunday, spirePositionOf(upRows, 'coins', WEEK, 1)!, upRows, 'coins', 0).show).toBeNull();
  });

  it('lastChance: режим ступеней — без «не хватает монет» (gapCoins нет)', () => {
    const sunday = new Date(2026, 9, 18, 19, 0).getTime();
    const rows = room(14, 100, 1);
    const d = spireDecideLastChance(sunday, spirePositionOf(rows, 'steps', WEEK, 1)!, rows, 'steps', 0);
    expect(d.show).not.toBeNull();
    expect(d.show).not.toHaveProperty('gapCoins');
  });
});

describe('useSpirePositionMomentsWith: показ один раз', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    __resetSpirePositionMomentsForTests();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  const base = { enabled: true, uid: 'me', lang: 'en', weekId: WEEK, rankBy: 'coins' as const, energyReadyAtMs: 0 };

  it('rise: решение появляется после ступени, consume — больше не отдаётся', async () => {
    const { result, rerender } = await renderHook((p: { rows: SpireRoomRow[]; at: number }) => useSpirePositionMomentsWith({ ...base, rows: p.rows, roomFetchedAtMs: p.at, nowMs: new Date(2026, 9, 14, 12).getTime() }), { initialProps: { rows: room(7, 1000), at: 1 } });
    expect(result.current.rise).toBeNull();
    await act(async () => { rerender({ rows: room(4, 1250, 11), at: 1 }); });
    const key = result.current.rise?.key;
    expect(key).toBeTruthy();
    await act(async () => { result.current.consume('rise', key!); });
    expect(result.current.rise).toBeNull();
  });

  it('lastChance: раз в неделю — после consume пометка на устройстве, повторный монтаж окна не отдаёт', async () => {
    const sunday = new Date(2026, 9, 18, 18, 30).getTime();
    const props = { ...base, rows: room(8, 900), roomFetchedAtMs: 1, nowMs: sunday };
    const first = await renderHook(() => useSpirePositionMomentsWith(props));
    await act(async () => { await Promise.resolve(); });
    expect(first.result.current.lastChance?.key).toBe(`${WEEK}:lastChance`);
    await act(async () => { first.result.current.consume('lastChance', `${WEEK}:lastChance`); });
    expect(first.result.current.lastChance).toBeNull();
    first.unmount();
    const second = await renderHook(() => useSpirePositionMomentsWith(props));
    await act(async () => { await Promise.resolve(); });
    expect(second.result.current.lastChance).toBeNull();
  });
});
