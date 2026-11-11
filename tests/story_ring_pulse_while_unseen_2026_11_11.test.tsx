// Слово владельца 11.11.2026: «КОГДА есть история пусть аватарка пульсирует всегда пока есть непросмотренная история!»
// Раньше кольцо «дышало» 4 раза (~7 с) и замирало. Тест на поведение: непросмотренное есть → запущен вечный цикл; непросмотренного нет → кольца и цикла нет;
// вне фокуса/в фоне и при «уменьшить движение» цикл стоит; возврат на экран запускает его снова.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

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
jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Circle: 'Circle', Defs: 'Defs', LinearGradient: 'LinearGradient', Stop: 'Stop' }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));
jest.mock('../app/scene_touch_trace', () => ({ sceneTouchTrace: () => () => undefined }));
jest.mock('../hooks/use_active_account_owner', () => ({ useActiveAccountOwner: () => 'owner-1' }));
jest.mock('../components/plus/PlusAvatarRing', () => {
  const R = jest.requireActual('react');
  return { PlusAvatarRing: (props: { children: React.ReactNode }) => R.createElement('View', { testID: 'plus-ring' }, props.children) };
});

const mockRepeat = jest.fn((animation: unknown, _count: number, _reverse: boolean) => animation);
const mockCancel = jest.fn();
const mockReducedMotion = jest.fn(() => false);
const mockRuntimeActive = jest.fn(() => true);
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  return {
    __esModule: true,
    default: { View: 'View' },
    Easing: { inOut: (fn: unknown) => fn, quad: () => 0, bezier: () => () => 0 },
    cancelAnimation: (value: unknown) => mockCancel(value),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => mockReducedMotion(),
    useSharedValue: (initial: number) => R.useRef({ value: initial }).current,
    withRepeat: (animation: unknown, count: number, reverse: boolean) => mockRepeat(animation, count, reverse),
    withDelay: (_delayMs: number, animation: unknown) => animation,
    withSequence: (...steps: unknown[]) => steps[steps.length - 1],
    withTiming: (to: number) => to,
  };
});
jest.mock('../hooks/use_runtime_active', () => ({ useRuntimeActive: () => mockRuntimeActive() }));

const mockStories = jest.fn();
jest.mock('../modules/story_events/use_story_events', () => ({ useStoryEvents: () => mockStories() }));
// «Волны» (владелец 11.11): правило двух дней проверяет tests/story_ignore_nudge_2026_11_11.test.ts; здесь — что кольцо делает по его ответу
const mockNudgeWaves = jest.fn(() => false);
const mockMarkViewed = jest.fn();
const mockNudgeSeenRing = jest.fn();
jest.mock('../modules/story_events/use_story_ignore_nudge', () => ({
  useStoryIgnoreNudge: (hasUnseen: boolean) => { mockNudgeSeenRing(hasUnseen); return { waves: mockNudgeWaves(), markViewed: mockMarkViewed }; },
}));

import StoryAvatarSlot from '../components/stories/StoryAvatarSlot';

const stories = (unseenCount: number) => ({ enabled: true, unseenCount, stories: [], playback: [], recent: [], markSeen: jest.fn() });
const slot = () => (
  <StoryAvatarSlot lang="ru" coinRank={3} coinSource={null} placeholderColor="#222" onOpenProfile={() => undefined} profileLabel="Мой профиль" plusSurface={null} />
);
const infiniteStarts = (): number => mockRepeat.mock.calls.filter((call) => call[1] === -1).length;

describe('владелец 11.11: аватар пульсирует всё время, пока есть непросмотренная история', () => {
  beforeEach(() => {
    mockRepeat.mockClear();
    mockCancel.mockClear();
    mockReducedMotion.mockReturnValue(false);
    mockRuntimeActive.mockReturnValue(true);
    mockNudgeWaves.mockReturnValue(false);
    mockNudgeSeenRing.mockClear();
  });

  it('два дня игнора → от кольца идут две волны, пульсация остаётся; правилу передан признак «кольцо есть»', async () => {
    mockStories.mockReturnValue(stories(1));
    mockNudgeWaves.mockReturnValue(true);
    await render(slot());
    expect(screen.queryAllByTestId('story-ring-wave')).toHaveLength(2);
    expect(infiniteStarts()).toBe(3); // пульс кольца + два круга
    expect(mockNudgeSeenRing).toHaveBeenLastCalledWith(true);
  });

  it('игнора нет → волн нет, только пульсация', async () => {
    mockStories.mockReturnValue(stories(1));
    await render(slot());
    expect(screen.queryAllByTestId('story-ring-wave')).toHaveLength(0);
    expect(infiniteStarts()).toBe(1);
  });

  it('волны вне фокуса экрана или в фоне стоят', async () => {
    mockStories.mockReturnValue(stories(1));
    mockNudgeWaves.mockReturnValue(true);
    mockRuntimeActive.mockReturnValue(false);
    await render(slot());
    expect(screen.queryAllByTestId('story-ring-wave')).toHaveLength(2);
    expect(mockRepeat).not.toHaveBeenCalled();
  });

  it('при «уменьшить движение» волн нет совсем', async () => {
    mockStories.mockReturnValue(stories(1));
    mockNudgeWaves.mockReturnValue(true);
    mockReducedMotion.mockReturnValue(true);
    await render(slot());
    expect(screen.queryAllByTestId('story-ring-wave')).toHaveLength(0);
    expect(mockRepeat).not.toHaveBeenCalled();
  });

  it('непросмотренного нет → правилу передано «кольца нет», волн и кольца нет', async () => {
    mockStories.mockReturnValue(stories(0));
    mockNudgeWaves.mockReturnValue(true);
    await render(slot());
    expect(mockNudgeSeenRing).toHaveBeenLastCalledWith(false);
    expect(screen.queryByTestId('story-ring')).toBeNull();
    expect(screen.queryAllByTestId('story-ring-wave')).toHaveLength(0);
  });

  it('есть непросмотренная история → кольцо на месте и цикл вечный, а не на несколько повторов', async () => {
    mockStories.mockReturnValue(stories(1));
    await render(slot());
    expect(screen.queryByTestId('story-ring')).not.toBeNull();
    expect(mockRepeat).toHaveBeenCalledTimes(1);
    expect(mockRepeat.mock.calls[0][1]).toBe(-1);
  });

  it('непросмотренных нет → кольца нет и пульсация не запускается', async () => {
    mockStories.mockReturnValue(stories(0));
    await render(slot());
    expect(screen.queryByTestId('story-ring')).toBeNull();
    expect(mockRepeat).not.toHaveBeenCalled();
  });

  it('последнюю историю просмотрели → кольцо убрано, цикл остановлен', async () => {
    mockStories.mockReturnValue(stories(2));
    const view = await render(slot());
    expect(infiniteStarts()).toBe(1);
    mockStories.mockReturnValue(stories(0));
    await view.rerender(<StoryAvatarSlot lang="ru" coinRank={4} coinSource={null} placeholderColor="#222" onOpenProfile={() => undefined} profileLabel="Мой профиль" plusSurface={null} />);
    expect(screen.queryByTestId('story-ring')).toBeNull();
    expect(mockCancel).toHaveBeenCalled();
    expect(infiniteStarts()).toBe(1);
  });

  it('экран не в фокусе или приложение в фоне → цикл стоит; вернулись → пульсирует снова', async () => {
    mockStories.mockReturnValue(stories(1));
    mockRuntimeActive.mockReturnValue(false);
    const view = await render(slot());
    expect(screen.queryByTestId('story-ring')).not.toBeNull();
    expect(mockRepeat).not.toHaveBeenCalled();
    mockRuntimeActive.mockReturnValue(true);
    await view.rerender(<StoryAvatarSlot lang="ru" coinRank={4} coinSource={null} placeholderColor="#222" onOpenProfile={() => undefined} profileLabel="Мой профиль" plusSurface={null} />);
    expect(infiniteStarts()).toBe(1);
  });

  it('«уменьшить движение» → кольцо показано, но стоит', async () => {
    mockStories.mockReturnValue(stories(1));
    mockReducedMotion.mockReturnValue(true);
    await render(slot());
    expect(screen.queryByTestId('story-ring')).not.toBeNull();
    expect(mockRepeat).not.toHaveBeenCalled();
  });
});
