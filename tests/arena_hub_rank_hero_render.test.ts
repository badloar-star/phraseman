import React from 'react';
import { render } from '@testing-library/react-native';
import { ArenaHubSummary } from '../components/arena/ArenaHubSummary';
import type { ArenaHubModel } from '../modules/arena/hub_view';
import { arenaRankShieldAsset } from '../components/arena/arena_rank_shield_assets';

const h = React.createElement;

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
  },
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: 'AnimatedView' },
  Easing: { ease: 'ease', inOut: (value: unknown) => value },
  cancelAnimation: jest.fn(),
  useSharedValue: (value: number) => ({ value }),
  useAnimatedStyle: (factory: () => unknown) => factory(),
  withRepeat: (value: number) => value,
  withSequence: (...values: number[]) => values.at(-1) ?? 0,
  withTiming: (value: number) => value,
}));
jest.mock('@expo/vector-icons/Ionicons', () => (props: Record<string, unknown>) => h('Ionicons', props));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../components/ui/v2_theme', () => ({
  useTournamentPalette: () => ({ muted: '#78758f', text: '#fff' }),
}));
jest.mock('../components/ui/v2_ui', () => ({
  V2Card: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../modules/arena/copy', () => ({
  arenaText: (_lang: string, key: string) => ({
    tierGold: 'Золото',
    rankStars: 'Звёзды ранга',
    rankNext: 'До следующего ранга',
    rankTop: 'Высший ранг',
  }[key] ?? key),
}));
jest.mock('../components/arena/arena_rank_shield_assets', () => ({
  arenaRankShieldAsset: jest.fn(() => ({ testUri: 'gold-ii.webp' })),
}));
jest.mock('../components/arena/ArenaStarGlyph', () => ({
  ArenaStarGlyph: (props: Record<string, unknown>) => h('ArenaStarGlyph', props),
}));

const model = (rank: ArenaHubModel['rank']): ArenaHubModel => ({
  rank,
  stats: null,
  goals: null,
  lastMatch: null,
  streak: null,
  friends: [],
  searchingNow: null,
});

describe('ArenaHubSummary rank hero runtime rendering', () => {
  beforeEach(() => jest.clearAllMocks());

  it('selects the exact shield and renders two filled stars plus progress', async () => {
    const screen = await render(h(ArenaHubSummary, {
      model: model({
        starsInRank: 2,
        starsPerRank: 3,
        tierIndex: 2,
        tierKey: 'gold',
        division: 2,
        progress: 2 / 3,
        winsToNextRank: 1,
        top: false,
      }),
      active: true,
      reduceMotion: true,
    }));

    expect(arenaRankShieldAsset).toHaveBeenCalledWith('gold', 2);
    expect(screen.getByText('Золото II')).toBeTruthy();
    expect(screen.getByText('До следующего ранга: 1 ★')).toBeTruthy();
    expect(screen.getByLabelText('Золото II. Звёзды ранга: 2/3. До следующего ранга: 1 ★')).toBeTruthy();
    if (!screen.root) throw new Error('Arena rank hero did not render a root');
    const images = screen.root.queryAll((node) => node.type === 'Image');
    expect(images).toHaveLength(1);
    expect(images[0]?.props.source).toEqual({ testUri: 'gold-ii.webp' });

    const stars = screen.root.queryAll((node) => node.type === 'ArenaStarGlyph');
    expect(stars).toHaveLength(3);
    expect(stars.map((star) => star.props.lit)).toEqual([true, true, false]);
    expect(stars.every((star) => star.props.size === 38)).toBe(true);
  });

  it('keeps a neutral shield and three empty stars while rank data is unknown', async () => {
    const screen = await render(h(ArenaHubSummary, {
      model: model(null),
      active: false,
      reduceMotion: false,
    }));

    if (!screen.root) throw new Error('Arena rank fallback did not render a root');
    const icons = screen.root.queryAll((node) => node.type === 'Ionicons');
    expect(icons).toHaveLength(1);
    expect(icons[0]?.props.name).toBe('shield-outline');
    expect(screen.root.queryAll((node) => node.type === 'ArenaStarGlyph').map((star) => star.props.lit)).toEqual([
      false, false, false,
    ]);
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(arenaRankShieldAsset).not.toHaveBeenCalled();
  });
});
