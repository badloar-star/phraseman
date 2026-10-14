// зачем (координатор 14.10, уточнение владельца: «ТОЛЬКО ФОРМУЛИРОВКА!! АНИМАЦИЮ СНА, СЕРДЕЧКИ И ЭМОЦИИ ОСТАВИТЬ»): MomentCoin — общая
// монета моментов v3. Сторож держит: каждое настроение и эмоция образца есть и рисуются; движения валюты (появление, отскок, рост
// и сияние) есть; в исходнике нет текстов, где монета описана как живая; «уменьшить движение» = статичная монета без анимаций;
// бесконечные циклы не крутятся на неактивном экране; хаптик/звук — событием onCue.
import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, render } from '@testing-library/react-native';

// tests/__mocks__/react-native.js — общая заглушка для логических тестов; рендеру нужен настоящий модуль (как в friend_list_row).
jest.unmock('react-native');

const mockCalls = { timing: 0, repeat: 0 };
let mockReduced = false;
let mockRuntimeActive = true;

jest.mock('react-native-reanimated', () => {
  const { View, Text } = require('react-native');
  const bezier = () => (t: number) => t;
  return {
    __esModule: true,
    default: { View, Text },
    Easing: { bezier },
    cancelAnimation: () => undefined,
    interpolate: (_v: number, _i: number[], out: number[]) => out[0],
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useReducedMotion: () => mockReduced,
    useSharedValue: (value: unknown) => ({ value }),
    withDelay: (_ms: number, a: unknown) => a,
    withRepeat: (a: unknown) => { mockCalls.repeat += 1; return a; },
    withSequence: (...values: unknown[]) => values.at(-1),
    withTiming: (value: unknown) => { mockCalls.timing += 1; return value; },
  };
});
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('react-native-svg', () => ({ __esModule: true, default: () => null, Path: () => null, Circle: () => null }));
jest.mock('../components/spire/SpireRankCoin', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/spire/useSpirePalette', () => ({ useSpirePalette: () => ({ card: '#111', text: '#fff', textSecondary: '#aaa' }) }));
jest.mock('../components/spire/useSpireShadow', () => ({ useSpireShadow: () => ({ plate: {} }) }));
jest.mock('../hooks/use_runtime_active', () => ({ useRuntimeActive: () => mockRuntimeActive }));

import MomentCoin, { MOMENT_COIN_EMOTE_DEFAULT_COUNT, momentCoinTrack, type MomentCoinMood } from '../components/moments/MomentCoin';

const MOODS: MomentCoinMood[] = ['idle', 'sleep', 'peek', 'cheer', 'nod', 'jump', 'wow', 'shiver', 'spin', 'still', 'appear', 'bounce', 'rankUp'];
const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'components', 'moments', 'MomentCoin.tsx'), 'utf8');

beforeEach(() => {
  mockCalls.timing = 0;
  mockCalls.repeat = 0;
  mockReduced = false;
  mockRuntimeActive = true;
});

describe('MomentCoin: every mood of the mockup plus currency motions renders', () => {
  it.each(MOODS)('%s', async (mood) => {
    const view = await render(<MomentCoin rank={5} size={110} mood={mood} say="С возвращением" zz glints crown testID="coin" />);
    expect(view.getByTestId(`coin-face-${mood}`)).toBeTruthy();
    expect(view.getByLabelText('С возвращением')).toBeTruthy();
  });

  it('timings and curves match the mockup keyframes', () => {
    expect(momentCoinTrack('idle')).toMatchObject({ ms: 2800, loop: true });
    expect(momentCoinTrack('sleep')).toMatchObject({ ms: 3000, loop: true });
    expect(momentCoinTrack('peek')).toMatchObject({ ms: 900, loop: false });
    expect(momentCoinTrack('cheer')).toMatchObject({ ms: 1100, loop: false });
    expect(momentCoinTrack('nod')).toMatchObject({ ms: 1200, loop: false });
    expect(momentCoinTrack('jump')).toMatchObject({ ms: 900, loop: false });
    expect(momentCoinTrack('wow')).toMatchObject({ ms: 1100, loop: false });
    expect(momentCoinTrack('shiver')).toMatchObject({ ms: 600, loop: false });
    expect(momentCoinTrack('spin')).toMatchObject({ ms: 1200, loop: false });
    expect(momentCoinTrack('appear')).toMatchObject({ ms: 640, loop: false });
    expect(momentCoinTrack('bounce')).toMatchObject({ ms: 900, loop: false });
    expect(momentCoinTrack('rankUp')).toMatchObject({ ms: 1100, loop: false });
    expect(momentCoinTrack('cheer').frames.map((f) => f.at)).toEqual([0, 0.15, 0.45, 0.65, 0.85, 1]);
    expect(momentCoinTrack('peek').frames[0]).toEqual({ at: 0, ty: 40, rot: -20, op: 0 });
  });

  it('never describes the coin as a living being in text (owner 14.10: wording only)', () => {
    expect(SOURCE).not.toMatch(/задрема|проснул|разбуд|будит/i);
  });
});

describe('MomentCoin: reduce motion = a still coin', () => {
  it('starts no animation at all', async () => {
    mockReduced = true;
    for (const mood of MOODS) {
      await render(<MomentCoin rank={null} size={96} mood={mood} say="Держимся." zz glints crown emote="heart" />);
    }
    expect(mockCalls.timing).toBe(0);
    expect(mockCalls.repeat).toBe(0);
  });

  it('still reports the cue so the screen can play haptic/sound', async () => {
    mockReduced = true;
    const onCue = jest.fn();
    await render(<MomentCoin rank={3} size={96} mood="cheer" emote="heart" onCue={onCue} />);
    expect(onCue).toHaveBeenCalledWith('coin.cheer');
    expect(onCue).toHaveBeenCalledWith('coin.emote.heart');
  });
});

describe('MomentCoin: infinite loops only while the screen is live', () => {
  it('idle and sleep loop while active', async () => {
    await render(<MomentCoin rank={5} size={96} mood="sleep" zz />);
    expect(mockCalls.repeat).toBeGreaterThan(0);
  });

  it('no infinite loop on an inactive screen', async () => {
    mockRuntimeActive = false;
    await render(<MomentCoin rank={5} size={96} mood="idle" glints zz />);
    await render(<MomentCoin rank={5} size={96} mood="sleep" zz />);
    expect(mockCalls.repeat).toBe(0);
  });
});

describe('MomentCoin: cues and emotes', () => {
  it('one-shot moods fire coin.<mood>, loops and still do not; moodKey replays', async () => {
    const onCue = jest.fn();
    const view = await render(<MomentCoin rank={5} size={96} mood="sleep" onCue={onCue} />);
    await act(async () => { view.rerender(<MomentCoin rank={5} size={96} mood="still" onCue={onCue} />); });
    expect(onCue).not.toHaveBeenCalled();
    await act(async () => { view.rerender(<MomentCoin rank={5} size={96} mood="peek" emote="bang" onCue={onCue} />); });
    expect(onCue).toHaveBeenCalledWith('coin.peek');
    expect(onCue).toHaveBeenCalledWith('coin.emote.bang');
    await act(async () => { view.rerender(<MomentCoin rank={5} size={96} mood="bounce" onCue={onCue} />); });
    await act(async () => { view.rerender(<MomentCoin rank={5} size={96} mood="bounce" moodKey={1} onCue={onCue} />); });
    expect(onCue.mock.calls.filter(([c]) => c === 'coin.bounce')).toHaveLength(2);
  });

  it('default emote counts follow the mockup', () => {
    expect(MOMENT_COIN_EMOTE_DEFAULT_COUNT).toEqual({ bang: 1, sweat: 2, heart: 4, star: 4, dots: 1 });
  });

  it('emote glyphs appear and leave on the mockup timer', async () => {
    jest.useFakeTimers();
    try {
      const view = await render(<MomentCoin rank={5} size={96} mood="cheer" emote="heart" emoteCount={5} />);
      expect(view.getAllByText('♥')).toHaveLength(5);
      await act(async () => { jest.advanceTimersByTime(1600 + 4 * 140 + 1); });
      expect(view.queryAllByText('♥')).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
