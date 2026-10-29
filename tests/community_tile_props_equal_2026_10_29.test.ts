// зачем (координатор 29.10, шаг B оптимизации плиток): memo плитки не должен терять обновления, которые меняют её вид, и не должен срабатывать зря из-за новых замыканий родителя.
import React from 'react';

import { communityTilePropsEqual, type CommunityTileComparable } from '../components/packs/community_tile_props_equal';

const Heart = (_props: Record<string, unknown>): null => null;
const pack = { id: 'p1' };
const t = { text: '#fff' };

function tile(over: Partial<CommunityTileComparable> = {}): CommunityTileComparable {
  return {
    pack, lang: 'ru', likes: 3, onLongPress: () => undefined,
    heart: React.createElement(Heart, { pack, lang: 'ru', t, owned: false, variant: 'sceneTileHeart' }),
    ...over,
  };
}

describe('communityTilePropsEqual', () => {
  it('новые замыкания и новый элемент сердечка с теми же пропами — плитка не перерисовывается', () => {
    expect(communityTilePropsEqual(tile(), tile({ onLongPress: () => undefined }))).toBe(true);
  });

  it('набор, язык, число сердечек и автор-фикстура меняют вид — плитка перерисовывается', () => {
    expect(communityTilePropsEqual(tile(), tile({ pack: { id: 'p1' } }))).toBe(false);
    expect(communityTilePropsEqual(tile(), tile({ lang: 'uk' }))).toBe(false);
    expect(communityTilePropsEqual(tile(), tile({ likes: 4 }))).toBe(false);
    expect(communityTilePropsEqual(tile(), tile({ authorOverride: { name: 'A', coinRank: 1, isPremium: false } }))).toBe(false);
    expect(communityTilePropsEqual(tile(), tile({ referencePlace: 2 }))).toBe(false);
  });

  it('набор стал своим или чужим (пропал/появился долгий тап) — плитка перерисовывается', () => {
    expect(communityTilePropsEqual(tile(), tile({ onLongPress: undefined }))).toBe(false);
  });

  it('пропы сердечка изменились (owned, язык, тема) — перерисовывается, чтобы сердечко не осталось со старыми пропами', () => {
    const heart = (props: Record<string, unknown>) => React.createElement(Heart, { pack, lang: 'ru', t, owned: false, variant: 'sceneTileHeart', ...props });
    expect(communityTilePropsEqual(tile(), tile({ heart: heart({ owned: true }) }))).toBe(false);
    expect(communityTilePropsEqual(tile(), tile({ heart: heart({ t: { text: '#000' } }) }))).toBe(false);
    expect(communityTilePropsEqual(tile(), tile({ heart: heart({ extra: 1 }) }))).toBe(false);
    expect(communityTilePropsEqual(tile(), tile({ heart: undefined }))).toBe(false);
  });
});
