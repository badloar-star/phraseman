import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react-native';
import { CommunityRootTabs } from '../components/packs/CommunityRootTabs';
import { CommunityPackScene } from '../components/packs/CommunityPackScene';
import { tabPillTopOffset } from '../components/v2/tab_bar_geometry';

let mockTarget = 'en';
jest.mock('react-native', () => ({ View: 'View', Text: 'Text', Pressable: 'Pressable', FlatList: 'FlatList', StyleSheet: { flatten: (style: unknown) => style, create: (style: unknown) => style } }));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ liquidGlassThemeId: 'grad_midnight', liquidGlassAppearance: 'light' }) }));
jest.mock('../components/v2/ScreenBackButton', () => ({ __esModule: true, default: 'Back', SCREEN_BACK_ZONE: 60, useScreenBackContentTop: () => 84 }));
jest.mock('../components/KitTouchable', () => ({ KitTouchable: 'Pressable' }));
jest.mock('../components/packs/CommunityScene', () => ({ CommunitySceneBackdrop: 'View', CommunitySceneFan: 'View' }));
jest.mock('../app/coin_rank_table_v1', () => ({ coinRankRowForDisplay: () => ({ source: 1 }) }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }));
jest.mock('../components/StudyTargetContext', () => ({ useStudyTarget: () => ({ studyTarget: mockTarget }) }));
jest.mock('../app/learning_language_surface_readiness', () => ({ isLearnTabVisibleForTarget: (target: string) => target === 'en' }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => true }));
jest.mock('../constants/i18n', () => ({ triLang: (lang: string, copy: Record<string, string>) => copy[lang] ?? copy.en }));
jest.mock('../components/v2/V2TabBar', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireMock('react-native');
  return { __esModule: true, default: ({ items, activeIndex, onSelect }: {
    items: { key: string; label: string }[]; activeIndex: number; onSelect: (index: number) => void;
  }) => React.createElement(View, {}, ...items.map((item, index) => React.createElement(Pressable, {
    key: item.key, accessible: true, accessibilityRole: 'button', accessibilityLabel: item.label,
    accessibilityState: { selected: index === activeIndex }, onPress: () => onSelect(index),
  }, React.createElement(Text, {}, item.label)))) };
});
afterEach(async () => { await cleanup(); mockTarget = 'en'; });

it('navigates each visible item to its real root tab', async () => {
  const navigate = jest.fn();
  await render(<CommunityRootTabs lang="en" bottomInset={16} onSelectRoute={navigate} />);
  for (const [label, route] of [['Home', 'home'], ['Learn', 'lessons'], ['Videos', 'video'], ['Community', 'community'], ['Settings', 'settings']]) {
    await fireEvent.press(screen.getByRole('button', { name: label }));
    expect(navigate).toHaveBeenLastCalledWith(`/(tabs)/${route}`);
  }
  expect(screen.getByRole('button', { name: 'Community', selected: true })).toBeTruthy();
});

it('keeps route identity and active selection when the learning tab is hidden', async () => {
  mockTarget = 'fr';
  const navigate = jest.fn();
  await render(<CommunityRootTabs lang="ru" bottomInset={0} onSelectRoute={navigate} />);
  expect(screen.queryByRole('button', { name: 'Обучение' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Сообщество' }));
  expect(navigate).toHaveBeenCalledWith('/(tabs)/community');
  expect(screen.getByRole('button', { name: 'Сообщество', selected: true })).toBeTruthy();
});

it('exposes working root navigation on a pack and reserves scrolling space above it', async () => {
  const navigate = jest.fn();
  await render(<CommunityPackScene title="Pack" subtitle="English" author="Author" coinRank={0} count={1}
    lang="en" cards={[{ id: '1', front: 'Word', back: 'Translation' }]} actions={null}
    onSpeak={jest.fn()} onMore={jest.fn()} onSelectRoute={navigate} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Home' }));
  expect(navigate).toHaveBeenCalledWith('/(tabs)/home');
  expect(screen.getByTestId('community-pack-scene').props.contentContainerStyle.paddingBottom).toBeGreaterThan(tabPillTopOffset(16));
});
