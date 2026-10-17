// зачем (владелец 14.10, ТЗ ETALON_MOMENTS_V3_TRANSFER m06; образец stepPass3/stepFail3): итог ступени — отдельный экран; числа только из итога ступени и config/spire_v1, тексты на 9 языках,
// «Дальше»/«Ещё раз» зовут прежний подъём, «К башне» закрывает; компонент ничего не пишет.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
}));
jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Circle: 'Circle', Defs: 'Defs', RadialGradient: 'RadialGradient', Stop: 'Stop', Rect: 'Rect' })); // Defs…Rect — свечение .glowspot в MomentFullScreen
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  const Text = (props: Record<string, unknown>) => R.createElement('Text', props, props.children);
  const chain = { delay: () => chain, duration: () => chain };
  return {
    __esModule: true,
    default: { View, Text, createAnimatedComponent: (C: unknown) => C },
    Easing: { bezier: () => () => 0 },
    FadeIn: chain,
    cancelAnimation: () => undefined,
    useAnimatedProps: (fn: () => unknown) => fn(),
    useSharedValue: (v: number) => ({ value: v }),
    useReducedMotion: () => true,
    withTiming: (v: unknown) => v,
  };
});
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(), hapticSuccess: jest.fn(), hapticMediumImpact: jest.fn() }));
jest.mock('../modules/sound_v2/sound_bank', () => ({ playEvent: jest.fn() }));
jest.mock('../modules/sound_v2/legacy_bridge', () => ({ playUnlessRecentlyPlayed: jest.fn() }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../components/moments/MomentCoin', () => ({ __esModule: true, default: (props: { say?: string }) => (props.say ? require('react').createElement('Text', null, props.say) : null) }));
jest.mock('../components/v2/V2Kit', () => {
  const R = jest.requireActual('react');
  return { V2Button: (props: { label: string; onPress: () => void; testID?: string }) => R.createElement('Pressable', { testID: props.testID, onPress: props.onPress }, R.createElement('Text', null, props.label)) };
});
jest.mock('../components/spire/useSpirePalette', () => ({
  useSpirePalette: () => ({ bg: '#0E1214', bgTop: '#16241F', control: '#2A3234', text: '#FFFFFF', textSecondary: '#B8C0C4', cta: '#7EF0C8', wrong: '#E5484D' }),
}));

import SpireStepResultMoment from '../components/spire/moments/SpireStepResultMoment';
import { STEP_MOMENT_LANGS, STEP_MOMENT_STRING_KEYS, stepMomentText } from '../components/spire/moments/step_moment_strings';
import type { SpireStepOutcome } from '../app/spire/use_spire_game';
import type { SpireCoinsConfig } from '../modules/spire/config_contract';
import { normalizeEol } from './helpers/read_source';

const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')).split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const COINS = { perStep: 10 } as unknown as SpireCoinsConfig;
const outcome = (patch: Partial<SpireStepOutcome>): SpireStepOutcome => ({
  kind: 'passed', report: {} as never, errors: 0, usedMs: 72_000, budgetMs: 120_000, floorBefore: 4, local: { floor: 4, stepInFloor: 7, stepsCleared: 20 } as never, failReason: null as never, ...patch,
});

describe('m06 · ступень пройдена', () => {
  it('«10 из 10», «Без ошибок · +10 монет», время и бюджет, «Чисто!», лесенка 7 из 8, «Дальше» зовёт подъём', async () => {
    const onAgain = jest.fn();
    await render(<SpireStepResultMoment lang="ru" outcome={outcome({})} coins={COINS} coinRank={5} onAgain={onAgain} onLater={jest.fn()} />);
    expect(screen.getByTestId('step-moment-title').props.children).toBe('10 из 10');
    expect(screen.getByText('Без ошибок · +10 монет')).toBeTruthy();
    expect(screen.getByTestId('step-moment-time').props.children).toBe('1:12');
    expect(screen.getByText('из 2:00')).toBeTruthy();
    expect(screen.getByText('Чисто!')).toBeTruthy();
    expect(screen.getByText(/7 из \d+ на этаже/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('step-moment-next'));
    expect(onAgain).toHaveBeenCalledTimes(1);
  });

  it('с ошибками: «9 из 10», «Ошибок: 1 · +10 монет», облачка «Чисто!» нет', async () => {
    await render(<SpireStepResultMoment lang="ru" outcome={outcome({ errors: 1 })} coins={COINS} coinRank={5} onAgain={jest.fn()} onLater={jest.fn()} />);
    expect(screen.getByTestId('step-moment-title').props.children).toBe('9 из 10');
    expect(screen.getByText('Ошибок: 1 · +10 монет')).toBeTruthy();
    expect(screen.queryByText('Чисто!')).toBeNull();
  });
});

describe('m06 · ступень не пройдена', () => {
  it('3 ошибки: заголовок образца, «Остаёшься на 4 этаже…», «Ещё раз — другой набор» зовёт подъём, «К башне» закрывает', async () => {
    const onAgain = jest.fn();
    const onLater = jest.fn();
    await render(<SpireStepResultMoment lang="ru" outcome={outcome({ kind: 'failed', failReason: 'hearts' as never, errors: 3 })} coins={COINS} coinRank={5} onAgain={onAgain} onLater={onLater} />);
    expect(screen.getByTestId('step-moment-title').props.children).toBe('3 ошибки — ступень не пройдена');
    expect(screen.getByText(/Остаёшься на 4 этаже/)).toBeTruthy();
    expect(screen.getByText('Ещё раз?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('step-moment-again'));
    expect(onAgain).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('step-moment-later'));
    expect(onLater).toHaveBeenCalledTimes(1);
  });

  it('время вышло — прежняя строка «Время вышло», а не «3 ошибки»', async () => {
    await render(<SpireStepResultMoment lang="ru" outcome={outcome({ kind: 'failed', failReason: 'timeout' as never })} coins={COINS} coinRank={5} onAgain={jest.fn()} onLater={jest.fn()} />);
    expect(screen.getByTestId('step-moment-title').props.children).toBe('Время вышло');
  });
});

describe('тексты и исходник', () => {
  it('каждая строка есть на 9 языках; подстановки работают', () => {
    for (const key of STEP_MOMENT_STRING_KEYS) for (const lang of STEP_MOMENT_LANGS) expect([key, lang, stepMomentText(lang, key, { ok: 9, all: 10, t: '2:00' }).length > 0]).toEqual([key, lang, true]);
    expect(stepMomentText('en', 'ofTasks', { ok: 9, all: 10 })).toBe('9 of 10');
  });

  it('момент ничего не пишет и не списывает; бесконечных анимаций и обводок нет', () => {
    const src = read('components/spire/moments/SpireStepResultMoment.tsx').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(/AsyncStorage|firestore|withRepeat|borderWidth|borderColor/.test(src)).toBe(false);
  });
});
