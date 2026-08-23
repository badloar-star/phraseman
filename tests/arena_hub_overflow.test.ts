import { ARENA_STAR_STORE_ENABLED, arenaHubOverflowChoices } from '../modules/arena/hub_nav';

describe('Arena hub overflow', () => {
  it('contains the approved secondary destinations in a stable order', () => {
    const rows = arenaHubOverflowChoices('m-42', 1);
    expect(rows.map((row) => row.key)).toEqual([
      'ranks', 'tops', 'season', 'history', 'review',
      ...(ARENA_STAR_STORE_ENABLED ? ['wallet'] : []),
      'spin',
    ]);
    expect(rows.find((row) => row.key === 'season')?.route).toBe('/season_pass');
    expect(rows.find((row) => row.key === 'review')?.route).toEqual({
      pathname: '/arena_review',
      params: { matchId: 'm-42' },
    });
  });

  it('keeps latest review visible but disabled when no receipt is loaded', () => {
    const review = arenaHubOverflowChoices(null, 0).find((row) => row.key === 'review');
    expect(review).toMatchObject({ disabled: true, route: null });
  });

  /**
   * Магазин закрыт до релиза: витрина, в которой нечего купить, в релиз не идёт.
   * Тест сторожит именно вход, а не наличие кода — экран покупок остаётся жив.
   */
  it('hides the star store entry while the catalogue is not ready', () => {
    const rows = arenaHubOverflowChoices('m-42', 1);
    expect(rows.some((row) => row.key === 'wallet')).toBe(ARENA_STAR_STORE_ENABLED);
  });

  it('only exposes Spin when a spin is actually available', () => {
    expect(arenaHubOverflowChoices('m-42', 0).some((row) => row.key === 'spin')).toBe(false);
    expect(arenaHubOverflowChoices('m-42', 2).find((row) => row.key === 'spin')).toMatchObject({
      disabled: false,
      route: '/arena_star_wallet',
    });
  });
});
