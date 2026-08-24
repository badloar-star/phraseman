/* eslint-disable import/first */
import React from 'react';
import { act, render } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (options: Record<string, unknown>) => options.ios ?? options.default },
  StyleSheet: {
    flatten: (style: unknown) => Array.isArray(style)
      ? Object.assign({}, ...style.filter(Boolean))
      : style,
  },
  Text: 'Text',
  View: 'View',
}));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      accent: '#b9f34a',
      accentBg: '#26331b',
      bgSurface: '#151923',
      correctText: '#07110a',
      textMuted: '#9aa5b8',
      textPrimary: '#f6f8fc',
    },
    f: { label: 12, body: 14 },
  }),
}));

import MaxLessonMissionPlaque from '../components/max/MaxLessonMissionPlaque';
import { MAX_PRESTART_MISSION_HYBRID } from '../constants/motionHybrid';

const missionPlaque = (reduceMotion: boolean) => React.createElement(
  MaxLessonMissionPlaque,
  { mission: 'Hello MAX', lang: 'ru', reduceMotion },
);

describe('MaxLessonMissionPlaque', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('types a mission once and reserves the full final text footprint', async () => {
    const screen = await render(missionPlaque(false));
    expect(screen.getByTestId('max-lesson-mission-visible-text').props.children[0]).toBe('');
    expect(screen.getByTestId('max-lesson-mission-layout-text').props.children).toBe('Hello MAX');

    await act(async () => {
      jest.advanceTimersByTime(MAX_PRESTART_MISSION_HYBRID.characterMs * 5);
    });
    expect(screen.getByTestId('max-lesson-mission-visible-text').props.children[0]).toBe('Hello');

    await act(async () => jest.runAllTimers());
    expect(screen.getByTestId('max-lesson-mission-visible-text').props.children[0]).toBe('Hello MAX');
  });

  it('renders the full mission immediately under Reduce Motion without timers', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const screen = await render(missionPlaque(true));
    expect(screen.getByTestId('max-lesson-mission-visible-text').props.children[0]).toBe('Hello MAX');
    expect(setTimeoutSpy.mock.calls.some(
      ([, delay]) => delay === MAX_PRESTART_MISSION_HYBRID.characterMs,
    )).toBe(false);
  });

  it('cleans the pending character timer on unmount', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const screen = await render(missionPlaque(false));
    const missionTimerIndex = setTimeoutSpy.mock.calls.findIndex(
      ([, delay]) => delay === MAX_PRESTART_MISSION_HYBRID.characterMs,
    );
    expect(missionTimerIndex).toBeGreaterThanOrEqual(0);
    const missionTimer = setTimeoutSpy.mock.results[missionTimerIndex]?.value;
    await act(async () => screen.unmount());
    expect(clearTimeoutSpy).toHaveBeenCalledWith(missionTimer);
  });

  it('exposes one stable full-sentence accessibility label', async () => {
    const screen = await render(missionPlaque(false));
    expect(screen.getByLabelText('Сегодня с MAX. Hello MAX')).toBeTruthy();
    expect(screen.getByTestId('max-lesson-mission-visible-text').props.accessible).toBe(false);
  });
});
