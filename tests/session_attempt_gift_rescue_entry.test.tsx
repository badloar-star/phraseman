import React from 'react';
import { act, render, type RenderResult } from '@testing-library/react-native';
import SessionAttemptGiftRescueOverlay from '../components/session_attempts/SessionAttemptGiftRescueOverlay';

jest.mock('react-native', () => {
  const animation = () => ({ start: (done?: (result: { finished: boolean }) => void) => done?.({ finished: true }), stop: jest.fn() });
  return {
    View: 'View', Text: 'Text', Pressable: 'Pressable',
    StyleSheet: { create: (value: unknown) => value, absoluteFillObject: {}, flatten: (value: unknown) => Array.isArray(value) ? Object.assign({}, ...value.filter(Boolean)) : value },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    Easing: { out: (value: unknown) => value, in: (value: unknown) => value, inOut: (value: unknown) => value, back: () => 0, quad: 0, cubic: 0 },
    Animated: { View: 'Animated.View', Value: class { setValue() {} }, timing: animation, parallel: animation, sequence: animation, delay: animation },
  };
});
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../components/LevelSpinRewardArt', () => 'RewardArt');
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ theme: {} }) }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => true }));

describe('gift rescue is an event, never an entry or layout animation', () => {
  let renderer: RenderResult;
  const initial = { x: 0, y: 0, width: 0, height: 0 };
  const measured = { x: 264, y: 58, width: 90, height: 44 };
  const tree = (sequence: number, anchorFrame = measured) => (
    <SessionAttemptGiftRescueOverlay sequence={sequence} anchorFrame={anchorFrame} locale="ru" errorCode={null} />
  );
  const visible = () => renderer.queryAllByTestId('session-attempt-gift-rescue').length;
  beforeEach(() => jest.useFakeTimers());
  afterEach(async () => { await renderer?.unmount(); jest.useRealTimers(); });

  test('mount and HUD measurement do not invent a rescue', async () => {
    renderer = await render(tree(0, initial));
    expect(visible()).toBe(0);
    await renderer.rerender(tree(0, measured));
    expect(visible()).toBe(0);
    await renderer.rerender(tree(0, { ...measured, y: 74 }));
    expect(visible()).toBe(0);
  });

  test('one real event shows once; later layout cannot replay it', async () => {
    renderer = await render(tree(0));
    await renderer.rerender(tree(1));
    expect(visible()).toBe(1);
    await act(() => jest.advanceTimersByTime(10000));
    expect(visible()).toBe(0);
    await renderer.rerender(tree(1, { ...measured, x: 220 }));
    expect(visible()).toBe(0);
    await renderer.rerender(tree(2));
    expect(visible()).toBe(1);
  });

  test('mounting with a historical event and resetting the sequence stay quiet', async () => {
    renderer = await render(tree(3, initial));
    await renderer.rerender(tree(3));
    expect(visible()).toBe(0);
    await renderer.rerender(tree(0));
    expect(visible()).toBe(0);
  });
});
