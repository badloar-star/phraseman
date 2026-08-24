import { ARENA_STAR_STORE_ENABLED, arenaHubOverflowChoices } from '../modules/arena/hub_nav';

describe('Arena hub overflow', () => {
  it('contains the approved secondary destinations in a stable order', () => {
    const rows = arenaHubOverflowChoices('m-42');
    expect(rows.map((row) => row.key)).toEqual([
      'ranks', 'tops', 'season', 'history', 'review',
      ...(ARENA_STAR_STORE_ENABLED ? ['wallet'] : []),
    ]);
    expect(rows.find((row) => row.key === 'season')?.route).toBe('/season_pass');
    expect(rows.find((row) => row.key === 'review')?.route).toEqual({
      pathname: '/arena_review',
      params: { matchId: 'm-42' },
    });
  });

  it('keeps latest review visible but disabled when no receipt is loaded', () => {
    const review = arenaHubOverflowChoices(null).find((row) => row.key === 'review');
    expect(review).toMatchObject({ disabled: true, route: null });
  });

  /**
   * Магазин закрыт до релиза: витрина, в которой нечего купить, в релиз не идёт.
   * Тест сторожит именно вход, а не наличие кода — экран покупок остаётся жив.
   */
  it('hides the star store entry while the catalogue is not ready', () => {
    const rows = arenaHubOverflowChoices('m-42');
    expect(rows.some((row) => row.key === 'wallet')).toBe(ARENA_STAR_STORE_ENABLED);
  });

  /**
   * Владелец (2026-08-23): в приложении существует ОДИН спин — общий каталог
   * подарков. Отдельного «забрать спин Арены» больше нет: спин за победу в
   * рейтинге выдаётся сам на экране результата матча, поэтому пункт меню и
   * счётчик `spinsAvailable` удалены целиком.
   */
  it('no longer exposes a separate Arena spin entry', () => {
    const keys = arenaHubOverflowChoices('m-42').map((row) => row.key as string);
    expect(keys).not.toContain('spin');
  });
});
