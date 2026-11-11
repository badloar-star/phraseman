import { CommunityContestStage, CommunitySceneBackdrop } from '../components/packs/CommunityScene';
import { Stop } from 'react-native-svg';
import { packSocialLive } from '../app/community_packs/packSocialLive';
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import type { FlashcardMarketPack } from '../app/flashcards/marketplace';

const mockPush = jest.fn();
jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', ScrollView: 'ScrollView', Modal: 'Modal',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {} },
  AppState: { addEventListener: () => ({ remove: jest.fn() }) },
  Platform: { OS: 'android' },
  processColor: () => 0xFF000000,
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

it('passes distinct gradient stops and the theme opacity to the native SVG parser', async () => {
  await render(<CommunitySceneBackdrop />);
  const stops: React.ComponentProps<typeof Stop>[] = [];
  const visit = (node: ReturnType<typeof screen.toJSON>): void => {
    if (!node) return;
    if (node.type === 'Stop') stops.push(node.props);
    node.children?.forEach(child => { if (typeof child === 'object') visit(child); });
  };
  visit(screen.toJSON());
  const extractGradient = jest.requireActual('react-native-svg/lib/commonjs/lib/extract/extractGradient').default;
  const result = extractGradient({ id: 'scene', children: stops.map(props => React.createElement(Stop, props)) }, {});
  expect([result.gradient[0], result.gradient[2]]).toEqual([0, 0.7]);
  expect(result.gradient[1] >>> 24).toBe(230);
  expect(result.gradient[3] >>> 24).toBe(0);
});


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
  // зачем (слово владельца 05.11, «Наборы» rev8): пьедестала и «места набора» в герое конкурса нет — навигация с пьедестала снята; сцена проверяется в community_contest_hero_2026_11_05.test.ts
  it.todo('podium removed: see community_contest_hero_2026_11_05');
});
