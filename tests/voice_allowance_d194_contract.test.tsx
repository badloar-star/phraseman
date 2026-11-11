// зачем (решение владельца D194, 15.10; макет лимита голоса): остаток дневных голосовых попыток на микрофоне голосовых заданий курса V2.
// Сторож: бейдж (цифра / замок при 0), SpeakHoldButton без allowance не меняется (Карточки), вшивка в плеер — гейт до записи, списание в момент старта записи, бейдж только при kind === 'limited'.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown) => s, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
}));
// зачем: замок при 0 — Ionicons; заглушка-хост, чтобы тест видел testID иконки
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  return {
    __esModule: true,
    default: { View },
    Easing: { bezier: () => 'ease' },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withSequence: (...a: unknown[]) => a[a.length - 1],
    withTiming: (v: number) => v,
  };
});

// eslint-disable-next-line import/first
import VoiceAllowanceBadge from '../components/VoiceAllowanceBadge';

const colors = { fill: '#000', ink: '#fff', ring: '#111', plusFill: '#fff', plusInk: '#000', spentFill: '#333', spentInk: '#999' };
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('VoiceAllowanceBadge', () => {
  it('остаток > 0 — цифра цветом ink на fill', async () => {
    await render(<VoiceAllowanceBadge remaining={3} colors={colors} />);
    expect(screen.getByTestId('voice-allowance-badge-text', { hidden: true }).props.children).toBe('3');
  });
  // зачем (владелец 11.11): слово «PLUS» не помещалось и читалось как «PL» — при 0 рисуем замок, букв нет
  it('остаток 0 — иконка замка вместо букв', async () => {
    await render(<VoiceAllowanceBadge remaining={0} colors={colors} />);
    expect(screen.getByTestId('voice-allowance-badge-lock', { hidden: true })).toBeTruthy();
    expect(screen.queryByTestId('voice-allowance-badge-text', { hidden: true })).toBeNull();
    expect(screen.queryByText('PLUS', { hidden: true })).toBeNull();
  });
});

describe('SpeakHoldButton: allowance необязателен, Карточки как были', () => {
  const src = read('app/flashcards/SpeakHoldButton.tsx');
  it('allowance необязателен: без него запись стартует как раньше; прежних гейта и значка PLUS в кнопке больше нет (D196: один общий счётчик)', () => {
    expect(src).toContain('allowance?: SpeakHoldAllowance;');
    expect(src).not.toContain('{!allowance && !speakingAllowed && !speechNa ? (');
    expect(src).not.toContain('hooks/useSpeakingAttemptGate');
    expect(src).toContain('backgroundColor: disabled ? t.bgSurface : spent && allowance ? allowance.colors.spentFill : accent,');
  });
  it('при остатке 0 тап зовёт onSpentPress и не стартует запись (лог [VOICE-LIMIT])', () => {
    const fn = src.slice(src.indexOf('const onPressIn = useCallback('), src.indexOf('const onPressOut = useCallback('));
    expect(fn.indexOf('allowance.onSpentPress();')).toBeGreaterThan(0);
    expect(fn.indexOf('allowance.onSpentPress();')).toBeLessThan(fn.indexOf('onHoldStart();'));
    expect(fn).toContain('[VOICE-LIMIT] SpeakHoldButton: press while spent -> paywall');
  });
});
