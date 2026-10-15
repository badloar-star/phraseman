// зачем (владелец 15.10, m16 «звонок → брифинг»: «сразу делаем и сразу включаем»): звонок перед брифингом — «{Имя} звонит», «Ответить» открывает брифинг с всплывающими
// заданиями, «Потом» уводит назад; тап срабатывает один раз; у закрытой по рангу сцены звонка нет; энергия по-прежнему только на «Начать диалог».
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => {
  const R = jest.requireActual('react');
  const host = (name: string) => (props: Record<string, unknown>) => R.createElement(name, props, props.children as React.ReactNode);
  return {
    View: host('View'),
    Text: host('Text'),
    Pressable: (props: Record<string, unknown>) => R.createElement('Pressable', props, typeof props.children === 'function' ? (props.children as (s: { pressed: boolean }) => React.ReactNode)({ pressed: false }) : props.children),
    StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
    Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
    NativeModules: {},
  };
});
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  return {
    __esModule: true,
    default: { View },
    Easing: { bezier: () => () => 0, out: () => () => 0, quad: 0 },
    cancelAnimation: () => undefined,
    runOnJS: (fn: () => void) => fn,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => true,
    useSharedValue: (v: number) => ({ value: v }),
    withDelay: (_d: number, v: unknown) => v,
    withRepeat: (v: unknown) => v,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    withTiming: (v: unknown) => v,
  };
});
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: (props: { children: React.ReactNode }) => props.children }));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../hooks/use-haptics', () => ({ hapticLightImpact: jest.fn(() => Promise.resolve()) }));
jest.mock('../modules/sound_v2/sound_v2_flag', () => ({ isSoundV2Enabled: () => false }));

import DialogueIncomingCall from '../components/dialogs/DialogueIncomingCall';

const glass = { bg: '#000', bgTop: '#111', text: '#fff', secondary: '#aaa', opaqueControl: '#222', cta: '#fff', ctaInk: '#000' } as never;

describe('m16 · входящий звонок', () => {
  it('«Входящий · диалог A1», «Mia звонит», сцена; «Ответить» — один раз', async () => {
    const onAnswer = jest.fn();
    const onLater = jest.fn();
    await render(<DialogueIncomingCall lang="ru" glass={glass} partnerName="Mia" cefr="A1" sceneTitle="Закажи кофе" onAnswer={onAnswer} onLater={onLater} />);
    expect(screen.getByText('Входящий · диалог A1')).toBeTruthy();
    expect(screen.getByText('Mia звонит')).toBeTruthy();
    expect(screen.getByText('Закажи кофе')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('dialogue-v2-incoming-answer'));
    await fireEvent.press(screen.getByTestId('dialogue-v2-incoming-answer'));
    await fireEvent.press(screen.getByTestId('dialogue-v2-incoming-later'));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onLater).not.toHaveBeenCalled();
  });
  it('без имени — «Собеседник звонит»; «Потом» зовёт onLater', async () => {
    const onLater = jest.fn();
    await render(<DialogueIncomingCall lang="ru" glass={glass} partnerName={null} cefr="A2" sceneTitle="В аптеке" onAnswer={jest.fn()} onLater={onLater} />);
    expect(screen.getByText('Собеседник звонит')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('dialogue-v2-incoming-later'));
    expect(onLater).toHaveBeenCalledTimes(1);
  });
});

describe('m16 · подключение к брифингу', () => {
  const route = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_briefing.tsx'), 'utf8');
  const briefing = fs.readFileSync(path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2BriefingScreen.tsx'), 'utf8');
  it('звонок только у открытой сцены, «Ответить» включает всплытие заданий, энергия не трогается звонком', () => {
    expect(route).toContain('const showCall = callOpen && model.unlocked;');
    expect(route).toContain('onAnswer={() => { setRevealRows(true); setCallOpen(false); }}');
    expect(route).toContain('revealRows={revealRows}');
    const callBlock = route.slice(route.indexOf('<DialogueIncomingCall'), route.indexOf('/>', route.indexOf('<DialogueIncomingCall')));
    expect(callBlock).not.toContain('confirmSpendOne');
    expect(briefing).toContain('<BriefingRevealRow key={objective.id} index={index} active={revealRows}>');
  });
});
