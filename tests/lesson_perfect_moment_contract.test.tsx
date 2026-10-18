// зачем (владелец 14.10, ТЗ ETALON_MOMENTS_V3_TRANSFER m09; образец perfect3): «Идеальный урок» — штамп ИДЕАЛ, «N из N», «Ни одной ошибки · +N монет» (число из итога урока, без множителей), «Дальше»; ничего не пишет.
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
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  const Text = (props: Record<string, unknown>) => R.createElement('Text', props, props.children);
  const chain = { delay: () => chain, duration: () => chain };
  return {
    __esModule: true,
    default: { View, Text },
    Easing: { inOut: () => () => 0, cubic: 0 },
    FadeIn: chain,
    cancelAnimation: () => undefined,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useSharedValue: (v: number) => ({ value: v }),
    useReducedMotion: () => true,
    withDelay: (_d: number, v: unknown) => v,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    withTiming: (v: unknown) => v,
  };
});
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(), hapticHeavyImpact: jest.fn() }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../components/moments/MomentCoin', () => ({ __esModule: true, default: 'MomentCoin' }));
jest.mock('../components/streak/moments/StreakConfetti', () => ({ __esModule: true, default: 'StreakConfetti' }));
jest.mock('../components/spire/useSpireShadow', () => ({ useSpireShadow: () => ({ plate: {}, nested: {} }) }));
jest.mock('../components/spire/moments/moments_effects', () => ({ __esModule: true, default: () => null, useMomentRumble: () => ({ style: {}, play: jest.fn() }) }));
jest.mock('../components/v2/V2Kit', () => {
  const R = jest.requireActual('react');
  return { V2Button: (props: { label: string; onPress: () => void; testID?: string }) => R.createElement('Pressable', { testID: props.testID, onPress: props.onPress }, R.createElement('Text', null, props.label)) };
});
jest.mock('../components/spire/useSpirePalette', () => ({
  useSpirePalette: () => ({ bg: '#0E1214', bgTop: '#16241F', control: '#2A3234', text: '#FFFFFF', textSecondary: '#B8C0C4', accentText: '#7EF0C8' }),
}));

import LessonPerfectMoment from '../components/lesson_moments/LessonPerfectMoment';
import { PERFECT_MOMENT_LANGS, PERFECT_MOMENT_STRING_KEYS, perfectMomentText } from '../components/lesson_moments/perfect_moment_strings';
import { normalizeEol } from './helpers/read_source';
import { glueNumbers } from '../components/moments/glue_numbers'; // зачем (18.10): тексты моментов склеивают число со словом неразрывным пробелом

const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')).split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('m09 · идеальный урок', () => {
  it('«20 из 20», «Ни одной ошибки · +150 монет», штамп ИДЕАЛ, «Дальше» зовёт колбэк', async () => {
    const onNext = jest.fn();
    await render(<LessonPerfectMoment lang="ru" coinRank={5} total={20} coinsEarned={150} onNext={onNext} />);
    expect(screen.getByTestId('lesson-perfect-title').props.children).toBe(glueNumbers('20 из 20'));
    expect(screen.getByTestId('lesson-perfect-sub').props.children).toBe(glueNumbers('Ни одной ошибки · +150 монет'));
    expect(screen.getByText('ИДЕАЛ')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('lesson-perfect-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('число монет — из итога (не захардкоженные ≈150): 90 → «+90 монет»', async () => {
    await render(<LessonPerfectMoment lang="ru" coinRank={null} total={12} coinsEarned={90} onNext={jest.fn()} />);
    expect(screen.getByTestId('lesson-perfect-title').props.children).toBe(glueNumbers('12 из 12'));
    expect(screen.getByTestId('lesson-perfect-sub').props.children).toBe(glueNumbers('Ни одной ошибки · +90 монет'));
  });
});

describe('тексты и исходник', () => {
  it('каждая строка есть на 9 языках; подстановки работают', () => {
    for (const key of PERFECT_MOMENT_STRING_KEYS) for (const lang of PERFECT_MOMENT_LANGS) expect([key, lang, perfectMomentText(lang, key, { n: 150 }).length > 0]).toEqual([key, lang, true]);
    expect(perfectMomentText('en', 'noMistakes', { n: 150 })).toBe(glueNumbers('No mistakes · +150 coins'));
  });

  it('момент ничего не пишет и не начисляет; бесконечных анимаций и обводок нет; монеты не захардкожены', () => {
    const src = read('components/lesson_moments/LessonPerfectMoment.tsx').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(/AsyncStorage|firestore|withRepeat|borderWidth|borderColor|\b150\b/.test(src)).toBe(false);
  });
});
