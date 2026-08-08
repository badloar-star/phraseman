import { lobbyPotGemsAtTime, orderVisibleLobbyPlayers } from '../app/tournament_lobby_seats';

/** 15 ботов по 5 жемчужин — ровно та комната, на которой владелец увидел 75. */
function botArrivalEvents(count: number, entryGems: number, startAtMs: number) {
  return Array.from({ length: count }, (_, index) => ({
    atMs: startAtMs + index * 1000,
    potDeltaGems: entryGems,
    potGemsAfter: (index + 1) * entryGems,
  }));
}

describe('tournament lobby seat order', () => {
  test('appends arrivals chronologically without moving players already visible', () => {
    const reservations = [
      { id: 'late-array-first', joinAtMs: 300 },
      { id: 'first-arrival', joinAtMs: 100 },
      { id: 'second-arrival', joinAtMs: 200 },
    ];

    expect(orderVisibleLobbyPlayers(reservations, 150).map(({ id }) => id))
      .toEqual(['first-arrival']);
    expect(orderVisibleLobbyPlayers(reservations, 250).map(({ id }) => id))
      .toEqual(['first-arrival', 'second-arrival']);
    expect(orderVisibleLobbyPlayers(reservations, 350).map(({ id }) => id))
      .toEqual(['first-arrival', 'second-arrival', 'late-array-first']);
  });

  test('preserves server order when players share the same arrival time', () => {
    const players = [
      { id: 'b', joinAtMs: 100 },
      { id: 'a', joinAtMs: 100 },
    ];
    expect(orderVisibleLobbyPlayers(players, 100).map(({ id }) => id)).toEqual(['b', 'a']);
  });

  test('preserves server order for legacy players without arrival timestamps', () => {
    const players = [{ id: 'existing-b' }, { id: 'existing-a' }, { id: 'newcomer' }];
    expect(orderVisibleLobbyPlayers(players, 100).map(({ id }) => id))
      .toEqual(['existing-b', 'existing-a', 'newcomer']);
  });
});

describe('tournament lobby bank follows arrivals', () => {
  // Регрессия 2026-08-04: комната создаётся с потом на всех 15 ботов сразу,
  // и счётчик показывал 75 при пустой сетке.
  test('empty lobby shows an empty bank, not the final pot', () => {
    const events = botArrivalEvents(15, 5, 1000);
    expect(lobbyPotGemsAtTime(75, events, 999)).toBe(0);
  });

  test('bank grows by one entry fee per arrival', () => {
    const events = botArrivalEvents(15, 5, 1000);
    expect(lobbyPotGemsAtTime(75, events, 1000)).toBe(5);
    expect(lobbyPotGemsAtTime(75, events, 2000)).toBe(10);
    expect(lobbyPotGemsAtTime(75, events, 3000)).toBe(15);
  });

  test('bank reaches the authoritative pot once everyone arrived', () => {
    const events = botArrivalEvents(15, 5, 1000);
    expect(lobbyPotGemsAtTime(75, events, 15_000)).toBe(75);
    // Часы устройства убежали вперёд — банк не может перерасти серверный.
    expect(lobbyPotGemsAtTime(75, events, 10 ** 12)).toBe(75);
  });

  test('a live player entry fee counts from the first frame', () => {
    // Игрок уже заплатил 5: боты ещё не подошли, но его взнос в банке виден.
    const events = botArrivalEvents(15, 5, 1000);
    expect(lobbyPotGemsAtTime(80, events, 999)).toBe(5);
    expect(lobbyPotGemsAtTime(80, events, 1000)).toBe(10);
  });

  test('rooms without lobby events keep the server pot as is', () => {
    expect(lobbyPotGemsAtTime(40, [], 12_345)).toBe(40);
  });

  test('free test-mode rooms with zero deltas stay at zero', () => {
    const events = botArrivalEvents(15, 0, 1000);
    expect(lobbyPotGemsAtTime(0, events, 10_000)).toBe(0);
  });

  test('broken numbers never reach the screen', () => {
    const events = botArrivalEvents(2, 5, 1000);
    expect(lobbyPotGemsAtTime(Number.NaN, events, 5000)).toBe(0);
    expect(lobbyPotGemsAtTime(Number.POSITIVE_INFINITY, events, 5000)).toBe(0);
    expect(lobbyPotGemsAtTime(-10, events, 5000)).toBe(0);
  });
});
