// ЗАМОК ВЛАДЕЛЬЦА 28.10 20:05: «два кольца сразу не может быть! показывается только когда есть история непросмотренная — красное кольцо без фиолетового!»
// Одно кольцо вокруг монеты на Главной: непросмотренная история → ТОЛЬКО кольцо историй (кольца Plus нет); историй нет/всё просмотрено/флаг выключен →
// кольцо Plus по статусу; нет Plus — монета без кольца. Решает StoryAvatarSlot по тому же useStoryEvents (enabled && unseenCount > 0), сети нет.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  TouchableOpacity: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  InteractionManager: { runAfterInteractions: () => ({ cancel: () => undefined }) },
}));
jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));
jest.mock('../app/scene_touch_trace', () => ({ sceneTouchTrace: () => () => undefined }));
jest.mock('../components/stories/StoryRing', () => {
  const R = jest.requireActual('react');
  return { __esModule: true, default: (props: { children: React.ReactNode }) => R.createElement('View', { testID: 'story-ring' }, props.children) };
});
jest.mock('../components/plus/PlusAvatarRing', () => {
  const R = jest.requireActual('react');
  return { PlusAvatarRing: (props: { children: React.ReactNode }) => R.createElement('View', { testID: 'plus-ring' }, props.children) };
});

const mockStories = jest.fn();
jest.mock('../modules/story_events/use_story_events', () => ({ useStoryEvents: () => mockStories() }));

import StoryAvatarSlot from '../components/stories/StoryAvatarSlot';

const result = (enabled: boolean, unseenCount: number) => ({
  enabled, unseenCount, stories: [], playback: [], recent: [], markSeen: jest.fn(),
});

const slot = (plusSurface: string | null | undefined) => (
  <StoryAvatarSlot
    lang="ru"
    coinRank={3}
    coinSource={null}
    placeholderColor="#222"
    onOpenProfile={() => undefined}
    profileLabel="Мой профиль"
    plusSurface={plusSurface}
  />
);

describe('ЗАМОК ВЛАДЕЛЬЦА 28.10: на Главной вокруг монеты не бывает двух колец', () => {
  it('непросмотренная история + Plus → только кольцо историй, кольца Plus нет', async () => {
    mockStories.mockReturnValue(result(true, 2));
    await render(slot('#0C0D10'));
    expect(screen.queryByTestId('story-ring')).not.toBeNull();
    expect(screen.queryByTestId('plus-ring')).toBeNull();
  });

  it('историй нет → кольцо Plus по статусу, кольца историй нет', async () => {
    mockStories.mockReturnValue(result(true, 0));
    await render(slot('#0C0D10'));
    expect(screen.queryByTestId('plus-ring')).not.toBeNull();
    expect(screen.queryByTestId('story-ring')).toBeNull();
  });

  it('флаг историй выключен (даже при непросмотренных в памяти) → кольцо Plus', async () => {
    mockStories.mockReturnValue(result(false, 3));
    await render(slot('#0C0D10'));
    expect(screen.queryByTestId('plus-ring')).not.toBeNull();
    expect(screen.queryByTestId('story-ring')).toBeNull();
  });

  it('нет Plus: история → кольцо историй; без истории → монета без кольца', async () => {
    mockStories.mockReturnValue(result(true, 1));
    await render(slot(null));
    expect(screen.queryByTestId('story-ring')).not.toBeNull();
    expect(screen.queryByTestId('plus-ring')).toBeNull();
    mockStories.mockReturnValue(result(true, 0));
    await render(slot(undefined));
    expect(screen.queryByTestId('plus-ring')).toBeNull();
  });

  it('в коде: Plus рисует только слот, шапка Главной его не рисует; слот пишет [AVATAR-RING] с причиной', () => {
    const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
    const home = read('app/(tabs)/home.tsx');
    expect(home).not.toContain('avatarPlus=');
    expect(home).toContain('plusSurface={tone === ' + "'scene'" + ' && (isPremium || isVip || isPro)');
    const slotSrc = read('components/stories/StoryAvatarSlot.tsx');
    expect(slotSrc).toContain("const ringKind: 'story' | 'plus' | 'none' = ring ? 'story' : plusSurface !== null ? 'plus' : 'none';");
    expect(slotSrc).toContain('[AVATAR-RING]');
    expect(slotSrc).toContain('unseenCount=${unseenCount}');
  });
});
