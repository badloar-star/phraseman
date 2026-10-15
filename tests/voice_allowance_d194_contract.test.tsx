// зачем (решение владельца D194, 15.10; макет docs/design/v2-app/learning-v2-voice-limit.html): остаток дневных голосовых попыток на микрофоне голосовых заданий курса V2.
// Сторож: бейдж (цифра / PLUS), SpeakHoldButton без allowance не меняется (Карточки), вшивка в плеер — гейт до записи, списание в момент старта записи, бейдж только при kind === 'limited'.
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
  it('остаток 0 — «PLUS»', async () => {
    await render(<VoiceAllowanceBadge remaining={0} colors={colors} />);
    expect(screen.getByTestId('voice-allowance-badge-text', { hidden: true }).props.children).toBe('PLUS');
  });
});

describe('SpeakHoldButton: allowance необязателен, Карточки как были', () => {
  const src = read('app/flashcards/SpeakHoldButton.tsx');
  it('без allowance условия прежние; PlusBadge скрыт только при allowance', () => {
    expect(src).toContain('allowance?: SpeakHoldAllowance;');
    expect(src).toContain('{!allowance && !speakingAllowed && !speechNa ? (');
    expect(src).toContain('backgroundColor: disabled ? t.bgSurface : spent && allowance ? allowance.colors.spentFill : accent,');
  });
  it('при остатке 0 тап зовёт onSpentPress и не стартует запись (лог [VOICE-LIMIT])', () => {
    const fn = src.slice(src.indexOf('const onPressIn = useCallback('), src.indexOf('const onPressOut = useCallback('));
    expect(fn.indexOf('allowance.onSpentPress();')).toBeGreaterThan(0);
    expect(fn.indexOf('allowance.onSpentPress();')).toBeLessThan(fn.indexOf('onHoldStart();'));
    expect(fn).toContain('[VOICE-LIMIT] SpeakHoldButton: press while spent -> paywall');
  });
});

describe('плеер курса V2: гейт до записи, списание на старте записи, бейдж при limited', () => {
  const src = read('app/learning_v2_direct_session_player_v1.tsx');
  it('хук Ядра и контекст пейвола', () => {
    expect(src).toContain('const voiceAllowance = useVoiceDailyAllowance();');
    expect(src).toContain('context: VOICE_LIMIT_PAYWALL_CONTEXT, source: "learning_v2_course_voice"');
  });
  it('гейт стоит в startVoiceHold после проверок доступности и до запуска записи', () => {
    const fn = src.slice(src.indexOf('const startVoiceHold = useCallback('), src.indexOf('const stopVoiceCapture = useCallback('));
    expect(fn.indexOf('voiceDailyAllowanceGate("course_v2"')).toBeGreaterThan(fn.indexOf('voiceControlDisabled'));
    expect(fn.indexOf('openVoicePlus();')).toBeLessThan(fn.indexOf('setVoiceHoldActive(true);'));
  });
  it('списание — в первый listening попытки, не на тап', () => {
    expect(src).toContain('nextStatus === "listening" && voiceLastStatusRef.current !== "listening"');
    expect(src).toContain('recordVoiceDailyAttempt("course_v2", `${practice.interactionId}:${voicePanelEpoch}:${voiceAttemptSeqRef.current}`');
  });
  it('бейдж только при kind === limited; подпись при исчерпании', () => {
    expect(src).toContain('voiceAllowance.kind === "limited" && voiceAllowance.remaining !== null');
    expect(src).toContain('Голос на сегодня закончился');
  });
});
