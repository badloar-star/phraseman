import { CommunityContestStage } from '../components/packs/CommunityScene';
import { packSocialLive } from '../app/community_packs/packSocialLive';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import type { FlashcardMarketPack } from '../app/flashcards/marketplace';

const mockPush = jest.fn();
jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', ScrollView: 'ScrollView', Modal: 'Modal',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {} },
  AppState: { addEventListener: () => ({ remove: jest.fn() }) },
  Platform: { OS: 'android' },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Defs: 'Defs', RadialGradient: 'RadialGradient', Rect: 'Rect', Stop: 'Stop' }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'View' }));
jest.mock('../components/KitTouchable', () => ({ KitTouchable: 'Pressable' }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ liquidGlassThemeId: 'grad_midnight', liquidGlassAppearance: 'light' }) }));
jest.mock('../app/coin_rank_table_v1', () => ({ coinRankRowForDisplay: () => ({ source: 1 }) }));
jest.mock('../app/community_packs/packAuthorNames', () => ({ useCommunityAuthor: () => ({ name: 'Author', coinRank: 0 }) }));
jest.mock('../app/flashcards/marketplace', () => ({ packTitleForInterface: (pack: { titleRu: string }) => pack.titleRu }));
jest.mock('../app/community_packs/functionsClient', () => ({ callCommunityMonthGetRanking: jest.fn() }));
jest.mock('../app/account_generation', () => ({ captureAccountGeneration: () => 1, isCurrentAccountGeneration: () => true }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { warn: jest.fn() } }));


const packs = ['bronze', 'gold', 'silver'].map((id, index) => ({
  id, codeName: id, titleRu: id, titleUk: id, titleEs: id,
  descriptionRu: '', descriptionUk: '', descriptionEs: '', category: 'daily',
  cardCount: 10, priceShards: 0, salesCount: 0, likesCount: 1000 - index,
  authorStableId: 'author-' + id, authorName: id, isOfficial: false,
  isCommunityUgc: true, listingStatus: 'published', updatedAt: '2026-10-01',
} as FlashcardMarketPack));
const entries = ['gold', 'silver', 'bronze'].map((id, index) => ({
  id, authorId: 'author-' + id, title: id, hearts: 30 - index * 10,
  publishedAtMs: Date.UTC(2026, 9, 1), status: 'published',
}));

describe('monthly podium navigation', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 10, 15));
    mockPush.mockClear();
    packSocialLive.reset();
    packSocialLive.setContestEntries('2026-11', entries);
  });
  afterEach(async () => { await cleanup(); jest.restoreAllMocks(); });

  it('opens the exact pack at each place, independent of catalogue order and lifetime likes', async () => {
    const onOpen = jest.fn();
    await render(<CommunityContestStage packs={packs} lang="ru" authorId={null} onOpen={onOpen} />);
    for (const [index, id] of ['gold', 'silver', 'bronze'].entries()) {
      await fireEvent.press(screen.getByTestId(`community-podium-${index + 1}`));
      expect(onOpen).toHaveBeenLastCalledWith(packs.find(pack => pack.id === id));
    }
    expect(onOpen).toHaveBeenCalledTimes(3);
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText('♥ 30')).toBeTruthy();
    expect(screen.queryByText('♥ 1000')).toBeNull();
  });

  it('opens the server-ranked ID even when that pack is absent from the loaded catalogue', async () => {
    const onOpen = jest.fn();
    await render(<CommunityContestStage packs={[]} lang="ru" authorId={null} onOpen={onOpen} />);
    await fireEvent.press(screen.getByTestId('community-podium-2'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/flashcards_collection', params: { pack: 'silver', preview: '1', scene: 'community', from: 'community' } });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('does not expose active podium buttons before the first contest', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 26));
    await render(<CommunityContestStage packs={packs} lang="ru" authorId={null} onOpen={jest.fn()} />);
    for (const place of [1, 2, 3]) expect(screen.queryByTestId(`community-podium-${place}`)).toBeNull();
    expect(screen.getByText('До начала конкурса')).toBeTruthy();
  });

  it('can render a future reference month only with explicitly supplied fixture authors', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 26));
    const authors = Object.fromEntries(packs.map(pack => [pack.id, { name: pack.id, coinRank: 0, isPremium: false }]));
    const fixturePacks = packs.map(pack => ({ ...pack, firstPublishedAtMs: Date.UTC(2026, 9, 1) }));
    await render(<CommunityContestStage packs={fixturePacks} authors={authors} referenceNowMs={Date.UTC(2026, 10, 15)} lang="ru" authorId={null} onOpen={jest.fn()} />);
    expect(screen.getByText('До конца конкурса')).toBeTruthy();
    expect(screen.getByTestId('community-podium-1')).toBeTruthy();
  });

  it('ignores the reference date on the real catalogue path', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 26));
    await render(<CommunityContestStage packs={packs} referenceNowMs={Date.UTC(2026, 10, 15)} lang="ru" authorId={null} onOpen={jest.fn()} />);
    expect(screen.getByText('До начала конкурса')).toBeTruthy();
    expect(screen.queryByTestId('community-podium-1')).toBeNull();
  });
});
