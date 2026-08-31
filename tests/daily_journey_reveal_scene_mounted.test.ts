import React from 'react';
import { act, render } from '@testing-library/react-native';

import DailyJourneyRevealScene, {
  type DailyJourneyRevealSceneHandle,
} from '../components/daily_journey/DailyJourneyRevealScene';

type Animation = {
  kind: 'timing' | 'parallel' | 'sequence' | 'delay';
  stopped: boolean;
  callback?: (result: { finished: boolean }) => void;
};

jest.mock('react-native', () => {
  const registry = ((globalThis as typeof globalThis & { __dailyJourneyAnimations?: Animation[] }).__dailyJourneyAnimations ??= []);
  class Value {
    setValue = jest.fn();
    interpolate = jest.fn(() => this);
    stopAnimation = jest.fn();
  }
  const makeAnimation = (kind: Animation['kind']) => {
    const animation: Animation & { start: (callback?: Animation['callback']) => void; stop: () => void } = {
      kind, stopped: false,
      start: (callback) => { animation.callback = callback; },
      stop: () => { animation.stopped = true; },
    };
    registry.push(animation);
    return animation;
  };
  return {
  AccessibilityInfo: { announceForAccessibility: jest.fn() },
  Platform: { OS: 'ios' },
  Animated: {
    Value,
    timing: jest.fn(() => makeAnimation('timing')),
    parallel: jest.fn(() => makeAnimation('parallel')),
    sequence: jest.fn(() => makeAnimation('sequence')),
    delay: jest.fn(() => makeAnimation('delay')),
    multiply: jest.fn(() => new Value()),
    View: 'View', Text: 'Text',
  },
  Easing: {
    out: (value: unknown) => value, in: (value: unknown) => value, inOut: (value: unknown) => value,
    poly: () => 'poly', quad: 'quad', cubic: 'cubic', exp: 'exp', back: () => 'back', bezier: () => 'bezier', linear: 'linear',
  },
  View: 'View', Text: 'Text', Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, absoluteFillObject: {} },
  useWindowDimensions: () => ({ width: 375, height: 812 }),
}; });
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('react-native-svg', () => ({
  __esModule: true, default: 'Svg', Circle: 'Circle', Defs: 'Defs', RadialGradient: 'RadialGradient', Stop: 'Stop',
}));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: { accent: '#8EEA63', gold: '#FFD700', bg: '#101014', bgSurface: '#17171D', bgSurface2: '#1C1C24', bgCard: '#22222A', text: '#FFFFFF', muted: '#999999' },
    themeMode: 'indigo', f: { caption: 12, title: 24, body: 16, small: 12 },
  }),
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'en' }) }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => true }));
jest.mock('../hooks/use-haptics', () => ({
  hapticLightImpact: jest.fn(), hapticSuccess: jest.fn(), hapticTap: jest.fn(),
}));
jest.mock('../modules/audio/sound_director', () => ({
  soundDirector: { request: jest.fn(), stopActiveEvent: jest.fn() },
}));
jest.mock('../constants/streakIconAssets', () => ({ getStreakFreezeIconVariant: () => ({ source: 1 }) }));

describe('DailyJourneyRevealScene reduced-motion mounted lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (globalThis as typeof globalThis & { __dailyJourneyAnimations: Animation[] }).__dailyJourneyAnimations.splice(0);
    jest.clearAllMocks();
  });

  afterEach(() => jest.useRealTimers());

  test('natural preflight owns one reduced exit composite and teardown cancels its queued delivery', async () => {
    const onDelivered = jest.fn();
    const ref = React.createRef<DailyJourneyRevealSceneHandle>();
    const scene = await render(React.createElement(DailyJourneyRevealScene, {
      ref, visible: true, day: 1, run: 1, onDelivered,
    }));

    const animations = (globalThis as typeof globalThis & { __dailyJourneyAnimations: Animation[] }).__dailyJourneyAnimations;
    const fadeIn = animations.find((animation) => animation.kind === 'timing');
    expect(fadeIn?.callback).toBeDefined();
    await act(async () => { fadeIn?.callback?.({ finished: true }); });
    await act(async () => { jest.advanceTimersByTime(1100); });

    const exits = animations.filter((animation) => animation.kind === 'parallel');
    expect(exits).toHaveLength(1);
    expect(exits[0]?.callback).toBeDefined();

    await scene.unmount();
    expect(exits[0]?.stopped).toBe(true);
    act(() => exits[0]?.callback?.({ finished: true }));
    expect(onDelivered).not.toHaveBeenCalled();
    expect(jest.requireMock('../modules/audio/sound_director').soundDirector.request).toHaveBeenCalledTimes(1);
    expect(jest.requireMock('../hooks/use-haptics').hapticSuccess).not.toHaveBeenCalled();
  });
});
