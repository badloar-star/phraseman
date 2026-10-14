// зачем (закон владельца 14.10: «Монета — это валюта, и всё»): MomentCoin — монета ранга в моментах v3, не персонаж.
// Сторож держит: у монеты только нейтральные движения (появление, отскок при начислении, рост и сияние при повышении ранга, блики);
// режимов персонажа нет; «уменьшить движение» = монета стоит; бесконечные блики не крутятся на неактивном экране; хаптик/звук — onCue.
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
  const { View } = require('react-native');
  const bezier = () => (t: number) => t;
  return {
    __esModule: true,
    default: { View },
    Easing: { bezier },
    cancelAnimation: () => undefined,
    interpolate: (_v: number, _i: number[], out: number[]) => out[out.length - 1],
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useReducedMotion: () => mockReduced,
    useSharedValue: (value: unknown) => ({ value }),
    withDelay: (_ms: number, a: unknown) => a,
    withRepeat: (a: unknown) => { mockCalls.repeat += 1; return a; },
    withSequence: (...values: unknown[]) => values.at(-1),
    withTiming: (value: unknown) => { mockCalls.timing += 1; return value; },
  };
});
jest.mock('../components/spire/SpireRankCoin', () => ({ __esModule: true, default: () => null }));
jest.mock('../hooks/use_runtime_active', () => ({ useRuntimeActive: () => mockRuntimeActive }));

import MomentCoin, { momentCoinTrack, type MomentCoinMotion } from '../components/moments/MomentCoin';

const MOTIONS: MomentCoinMotion[] = ['still', 'appear', 'bounce', 'rankUp'];
const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'components', 'moments', 'MomentCoin.tsx'), 'utf8');

beforeEach(() => {
  mockCalls.timing = 0;
  mockCalls.repeat = 0;
  mockReduced = false;
  mockRuntimeActive = true;
});

describe('MomentCoin: a currency, not a character', () => {
  it('has no character modes, emotions or speech', () => {
    for (const banned of ["'sleep'", "'peek'", "'cheer'", "'wake'", "'nod'", "'wow'", "'shiver'", 'zz', 'emote', 'heart', 'sweat', 'say?:', 'SayBubble', 'Crown', '♥', '💧']) {
      expect(SOURCE).not.toContain(banned);
    }
  });

  it.each(MOTIONS)('renders the %s motion', async (motion) => {
    const view = await render(<MomentCoin rank={5} size={110} motion={motion} glints testID="coin" />);
    expect(view.getByTestId(`coin-coin-${motion}`)).toBeTruthy();
  });

  it('timings and curves come from the mockup keyframes', () => {
    expect(momentCoinTrack('appear')).toMatchObject({ ms: 640 });
    expect(momentCoinTrack('appear').frames.map((f) => f.at)).toEqual([0, 0.7, 1]);
    expect(momentCoinTrack('bounce')).toMatchObject({ ms: 900 });
    expect(momentCoinTrack('rankUp')).toMatchObject({ ms: 1100 });
    // Конечный кадр любого движения — покой: после анимации монета стоит ровно.
    for (const m of ['appear', 'bounce', 'rankUp'] as const) {
      expect(momentCoinTrack(m).frames.at(-1)).toEqual({ at: 1 });
    }
  });
});

describe('MomentCoin: reduce motion = a still coin', () => {
  it('starts no animation at all', async () => {
    mockReduced = true;
    for (const motion of MOTIONS) await render(<MomentCoin rank={null} size={96} motion={motion} glints />);
    expect(mockCalls.timing).toBe(0);
    expect(mockCalls.repeat).toBe(0);
  });

  it('still reports the cue so the screen can play haptic/sound', async () => {
    mockReduced = true;
    const onCue = jest.fn();
    await render(<MomentCoin rank={3} size={96} motion="rankUp" onCue={onCue} />);
    expect(onCue).toHaveBeenCalledWith('coin.rankUp');
  });
});

describe('MomentCoin: glints only while the screen is live', () => {
  it('glints loop while active', async () => {
    await render(<MomentCoin rank={5} size={96} glints />);
    expect(mockCalls.repeat).toBeGreaterThan(0);
  });

  it('no infinite loop on an inactive screen', async () => {
    mockRuntimeActive = false;
    await render(<MomentCoin rank={5} size={96} glints />);
    expect(mockCalls.repeat).toBe(0);
  });
});

describe('MomentCoin: cues', () => {
  it('each motion fires coin.<motion>, still fires nothing; motionKey replays', async () => {
    const onCue = jest.fn();
    const view = await render(<MomentCoin rank={5} size={96} onCue={onCue} />);
    expect(onCue).not.toHaveBeenCalled();
    await act(async () => { view.rerender(<MomentCoin rank={5} size={96} motion="bounce" onCue={onCue} />); });
    await act(async () => { view.rerender(<MomentCoin rank={5} size={96} motion="bounce" motionKey={1} onCue={onCue} />); });
    expect(onCue.mock.calls.filter(([c]) => c === 'coin.bounce')).toHaveLength(2);
  });
});
