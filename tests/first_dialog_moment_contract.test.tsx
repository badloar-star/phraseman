// зачем (владелец 14.10, ТЗ ETALON_MOMENTS_V3_TRANSFER m17; образец first3; координатор: язык берём из изучаемого): «Первый разговор по-английски/по-испански — есть!», «Получилось!», цифры из props, «Следующий сценарий»; ничего не пишет.
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
  return { __esModule: true, default: { View, Text }, FadeIn: chain, useReducedMotion: () => true };
});
jest.mock('../hooks/use-haptics', () => ({ hapticLightImpact: jest.fn(), hapticSuccess: jest.fn() }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../components/moments/MomentCoin', () => ({ __esModule: true, default: (props: { say?: string }) => (props.say ? require('react').createElement('Text', null, props.say) : null) }));
jest.mock('../components/streak/moments/StreakConfetti', () => ({ __esModule: true, default: 'StreakConfetti' }));
jest.mock('../components/v2/V2Kit', () => {
  const R = jest.requireActual('react');
  return { V2Button: (props: { label: string; onPress: () => void; testID?: string }) => R.createElement('Pressable', { testID: props.testID, onPress: props.onPress }, R.createElement('Text', null, props.label)) };
});
jest.mock('../components/spire/useSpirePalette', () => ({
  useSpirePalette: () => ({ bg: '#0E1214', bgTop: '#16241F', text: '#FFFFFF', textSecondary: '#B8C0C4', accentText: '#7EF0C8' }),
}));

import FirstDialogMoment from '../components/dialog_moments/FirstDialogMoment';
import { FIRST_DIALOG_LANGS, FIRST_DIALOG_STRING_KEYS, firstDialogText } from '../components/dialog_moments/first_dialog_strings';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('m17 · первый диалог', () => {
  it('русский интерфейс, изучается английский: «Первый разговор по-английски — есть!», «Получилось!», «Реплик: 6 · заданий 5 из 5», «Следующий сценарий» зовёт колбэк', async () => {
    const onNext = jest.fn();
    await render(<FirstDialogMoment lang="ru" studyTarget="en" coinRank={5} turns={6} goalsDone={5} goalsTotal={5} onNext={onNext} />);
    expect(screen.getByTestId('first-dialog-title').props.children).toBe('Первый разговор по-английски — есть!');
    expect(screen.getByText('Получилось!')).toBeTruthy();
    expect(screen.getByTestId('first-dialog-stats').props.children).toBe('Реплик: 6 · заданий 5 из 5');
    expect(screen.getByText('ПЕРВЫЙ ДИАЛОГ')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('first-dialog-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('двойной тап «Следующий сценарий» срабатывает один раз (синхронная защита, не ждём busy родителя)', async () => {
    const onNext = jest.fn();
    await render(<FirstDialogMoment lang="ru" studyTarget="en" coinRank={5} turns={6} goalsDone={5} goalsTotal={5} onNext={onNext} />);
    await fireEvent.press(screen.getByTestId('first-dialog-next'));
    await fireEvent.press(screen.getByTestId('first-dialog-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('изучается испанский: язык в заголовке — «по-испански», а не зашитый «английски»', async () => {
    await render(<FirstDialogMoment lang="ru" studyTarget="es" coinRank={null} turns={4} goalsDone={4} goalsTotal={4} onNext={jest.fn()} />);
    expect(screen.getByTestId('first-dialog-title').props.children).toBe('Первый разговор по-испански — есть!');
  });

  it('английский интерфейс, изучается французский: «Your first conversation in French — done!»', async () => {
    await render(<FirstDialogMoment lang="en" studyTarget="fr" coinRank={5} turns={3} goalsDone={3} goalsTotal={3} onNext={jest.fn()} />);
    expect(screen.getByTestId('first-dialog-title').props.children).toBe('Your first conversation in French — done!');
  });
});

describe('тексты и исходник', () => {
  it('каждая строка есть на 9 языках; подстановки работают', () => {
    for (const key of FIRST_DIALOG_STRING_KEYS) for (const lang of FIRST_DIALOG_LANGS) expect([key, lang, firstDialogText(lang, key, { adv: 'X', turns: 1, done: 1, all: 1 }).length > 0]).toEqual([key, lang, true]);
  });

  it('момент ничего не пишет; язык не зашит; шеринга фразы человека нет; обводок нет', () => {
    const src = read('components/dialog_moments/FirstDialogMoment.tsx').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(/AsyncStorage|firestore|withRepeat|borderWidth|borderColor|Share|английск/i.test(src)).toBe(false);
  });
});
