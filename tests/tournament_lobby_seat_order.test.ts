import { orderVisibleLobbyPlayers } from '../app/tournament_lobby_seats';

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
