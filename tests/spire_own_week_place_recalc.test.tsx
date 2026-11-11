/**
 * U33/U34 — сквозная проверка «подтверждённый заработок → свой счёт → место в таблице».
 *
 * зачем: владелец просил проверить четыре случая — открытый экран, запоздалое подтверждение, границу недели и смену
 * аккаунта. Соседние тесты проверяют хранилище и сборку строк по отдельности; здесь та же цепочка, что на экране Пика
 * (use_spire_game: useOwnAuthoritativeWeekCoins → spireBuildRoomRows → spireMyPlace), без сети и без документа комнаты.
 */
import { act, renderHook } from '@testing-library/react-native';

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';
import {
  __resetOwnAuthoritativeWeekScoreForTests,
  applyOwnWeekScoreFromAck,
  applyOwnWeekScoreWireSnapshot,
  useOwnAuthoritativeWeekCoins,
} from '../app/spire/spire_own_week_score';
import { spireBuildRoomRows, spireMyPlace, type SpireRoomSnapshot } from '../modules/spire/room_rows';

const WEEK = '2026-W46';
const NEXT_WEEK = '2026-W47';
const tuning = { names: ['Bot'], avatars: ['bot'], auras: ['none'] } as never;

/** Комната недели: я с устаревшими 100 монетами на 3-м месте из трёх. */
const makeRoom = (weekId: string, myWeekCoins = 100): SpireRoomSnapshot => ({
  schema: 'spire-room-cache.v1', uid: 'me', lang: 'en', weekId, groupId: 'g1',
  tier: 1, cohortDay: 1, weekStartMs: 1,
  members: [
    { uid: 'leader', name: 'Leader', steps: 9, reachedAtMs: 5, totalMs: 50, weekCoins: 150 },
    { uid: 'middle', name: 'Middle', steps: 8, reachedAtMs: 10, totalMs: 80, weekCoins: 120 },
    { uid: 'me', name: 'Me', steps: 5, reachedAtMs: 20, totalMs: 100, weekCoins: myWeekCoins },
  ],
  roster: [], fetchedAtMs: 1,
});

const wire = (seq: number, weekKey: string, earned: number, previous: { weekKey: string; earned: number } | null = null) => ({
  schemaVersion: 'stars-week-snapshot.v1', seq, current: { weekKey, earned }, previous,
});

/** То же, что считает экран Пика: свой счёт из хранилища → строки → моё место. */
function useMyStanding(stableId: string, room: SpireRoomSnapshot): { coins: number; place: number | null } {
  const myAuthoritativeWeekCoins = useOwnAuthoritativeWeekCoins(stableId, room.weekId);
  const rows = spireBuildRoomRows({
    room, myUid: 'me', mySteps: 5, myReachedAtMs: 20, nowMs: 1, tuning, rankBy: 'coins', myAuthoritativeWeekCoins,
  });
  return { coins: rows.find((row) => row.isMe)?.weekCoins ?? -1, place: spireMyPlace(rows) };
}

describe('U33/U34: подтверждённый заработок сразу меняет свой счёт и место', () => {
  beforeEach(() => {
    __resetAccountGenerationForTests();
    __resetOwnAuthoritativeWeekScoreForTests();
    jest.restoreAllMocks();
  });

  test('открытый экран: подтверждение сервера пересчитывает счёт и место без перезагрузки комнаты', async () => {
    const token = beginAccountGeneration('account-a');
    const room = makeRoom(WEEK);
    const { result } = await renderHook(() => useMyStanding('account-a', room));
    expect(result.current).toEqual({ coins: 100, place: 3 });

    await act(async () => { applyOwnWeekScoreWireSnapshot(token, wire(10, WEEK, 130)); });
    expect(result.current).toEqual({ coins: 130, place: 2 });

    await act(async () => { applyOwnWeekScoreWireSnapshot(token, wire(11, WEEK, 160)); });
    expect(result.current).toEqual({ coins: 160, place: 1 });
  });

  test('запоздалое подтверждение: старый ответ не откатывает ни счёт, ни место', async () => {
    const token = beginAccountGeneration('account-a');
    const room = makeRoom(WEEK);
    const { result } = await renderHook(() => useMyStanding('account-a', room));

    await act(async () => { applyOwnWeekScoreWireSnapshot(token, wire(11, WEEK, 160)); });
    expect(result.current).toEqual({ coins: 160, place: 1 });

    let lateOutcome = '';
    await act(async () => { lateOutcome = applyOwnWeekScoreWireSnapshot(token, wire(10, WEEK, 130)); });
    expect(lateOutcome).toBe('older');
    expect(result.current).toEqual({ coins: 160, place: 1 });
  });

  test('запоздалое подтверждение: свежая комната выше старого подтверждения — счёт не падает', async () => {
    const token = beginAccountGeneration('account-a');
    const room = makeRoom(WEEK, 170);
    const { result } = await renderHook(() => useMyStanding('account-a', room));
    await act(async () => { applyOwnWeekScoreWireSnapshot(token, wire(10, WEEK, 130)); });
    expect(result.current).toEqual({ coins: 170, place: 1 });
  });

  test('граница недели: счёт прошлой недели не попадает в таблицу новой, а новый — не в таблицу прошлой', async () => {
    const token = beginAccountGeneration('account-a');
    // сервер уже перенёс неделю: текущая W47 = 5 монет, прошлая W46 = 160
    const rolled = wire(12, NEXT_WEEK, 5, { weekKey: WEEK, earned: 160 });

    const oldRoom = await renderHook(() => useMyStanding('account-a', makeRoom(WEEK)));
    const newRoom = await renderHook(() => useMyStanding('account-a', makeRoom(NEXT_WEEK, 0)));
    await act(async () => { applyOwnWeekScoreWireSnapshot(token, rolled); });

    // экран, ещё держащий комнату прошлой недели, видит её итоговый счёт — не 5 монет новой
    expect(oldRoom.result.current).toEqual({ coins: 160, place: 1 });
    // комната новой недели — только 5 монет новой недели, 160 прошлой сюда не протекают
    expect(newRoom.result.current).toEqual({ coins: 5, place: 3 });
  });

  test('граница недели: подтверждение ещё по прошлой неделе не трогает комнату новой', async () => {
    const token = beginAccountGeneration('account-a');
    const { result } = await renderHook(() => useMyStanding('account-a', makeRoom(NEXT_WEEK, 0)));
    await act(async () => { applyOwnWeekScoreWireSnapshot(token, wire(9, WEEK, 160)); });
    expect(result.current).toEqual({ coins: 0, place: 3 });
  });

  test('смена аккаунта: счёт прошлого владельца сразу исчезает и поздний ответ его не возвращает', async () => {
    const tokenA = beginAccountGeneration('account-a');
    const room = makeRoom(WEEK);
    const screenA = await renderHook(() => useMyStanding('account-a', room));
    await act(async () => { applyOwnWeekScoreWireSnapshot(tokenA, wire(10, WEEK, 160)); });
    expect(screenA.result.current).toEqual({ coins: 160, place: 1 });

    await act(async () => { beginAccountGeneration('account-b'); });
    // экран, не успевший размонтироваться, больше не показывает подтверждённый счёт A
    expect(screenA.result.current).toEqual({ coins: 100, place: 3 });

    const screenB = await renderHook(() => useMyStanding('account-b', room));
    expect(screenB.result.current).toEqual({ coins: 100, place: 3 });

    // ответ на запрос, отправленный ещё от имени A, приходит уже при владельце B
    let lateOutcome = '';
    await act(async () => { lateOutcome = applyOwnWeekScoreWireSnapshot(tokenA, wire(11, WEEK, 999)); });
    expect(lateOutcome).toBe('stale');
    expect(screenB.result.current).toEqual({ coins: 100, place: 3 });

    // собственное подтверждение B работает как обычно
    await act(async () => { applyOwnWeekScoreWireSnapshot(captureAccountGeneration(), wire(3, WEEK, 125)); });
    expect(screenB.result.current).toEqual({ coins: 125, place: 2 });
  });

  test('заработок вне Пика (урок, практика): снимок из ответа кошелька двигает счёт и место так же, как отчёт об этаже', async () => {
    const token = beginAccountGeneration('account-a');
    const { result } = await renderHook(() => useMyStanding('account-a', makeRoom(WEEK)));

    let outcome = '';
    await act(async () => { outcome = applyOwnWeekScoreFromAck(token, wire(20, WEEK, 133), 'coin_wallet_ack'); });
    expect(outcome).toBe('applied');
    expect(result.current).toEqual({ coins: 133, place: 2 });

    // старый сервер поля не шлёт — счёт остаётся прежним, ничего не падает
    await act(async () => { outcome = applyOwnWeekScoreFromAck(token, undefined, 'practice_rune_ack'); });
    expect(outcome).toBe('absent');
    expect(result.current).toEqual({ coins: 133, place: 2 });
  });

  test('заработок вне Пика: мусорный, опоздавший и чужой снимок отбрасываются с причиной и не бросают', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const tokenA = beginAccountGeneration('account-a');
    const { result } = await renderHook(() => useMyStanding('account-a', makeRoom(WEEK)));
    await act(async () => { applyOwnWeekScoreFromAck(tokenA, wire(20, WEEK, 160), 'coin_wallet_ack'); });

    expect(applyOwnWeekScoreFromAck(tokenA, { balance: 9000, earnedTotal: 9000 }, 'coin_wallet_ack')).toBe('invalid');
    expect(applyOwnWeekScoreFromAck(tokenA, wire(19, WEEK, 130), 'practice_rune_ack')).toBe('older');
    expect(result.current).toEqual({ coins: 160, place: 1 });
    expect(warn.mock.calls.map((call) => String(call[0]))).toEqual([
      '[SPIRE-WEEK-SCORE] coin_wallet_ack outcome=invalid',
      '[SPIRE-WEEK-SCORE] practice_rune_ack outcome=older',
    ]);

    await act(async () => { beginAccountGeneration('account-b'); });
    expect(applyOwnWeekScoreFromAck(tokenA, wire(21, WEEK, 999), 'coin_wallet_ack')).toBe('stale');
  });

  test('возврат прежнего владельца: старый счёт из памяти не воскресает до нового подтверждения', async () => {
    const tokenA = beginAccountGeneration('account-a');
    applyOwnWeekScoreWireSnapshot(tokenA, wire(10, WEEK, 160));
    beginAccountGeneration('account-b');
    beginAccountGeneration('account-a');
    const { result } = await renderHook(() => useMyStanding('account-a', makeRoom(WEEK)));
    expect(result.current).toEqual({ coins: 100, place: 3 });
  });
});
