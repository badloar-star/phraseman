import fs from 'fs';
import path from 'path';
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';

import LevelExamIntro from '../components/level-exam/LevelExamIntro';

const mockReact = React;
jest.mock('../constants/i18n', () => ({
  triLang: (lang: string, values: Record<string, unknown>) => values[lang] ?? values.ru,
}));
jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView',
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
  },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../components/ScreenGradient', () => ({ children }: any) => mockReact.createElement('ScreenGradient', null, children));
jest.mock('../components/BouncyScrollView', () => ({ children }: any) => mockReact.createElement('ScrollView', null, children));
jest.mock('../components/TonalSurface', () => ({ children, ...props }: any) => mockReact.createElement('View', props, children));
jest.mock('../components/EnergyIcon', () => 'EnergyIcon');
jest.mock('../components/TapScale', () => ({ children, onPress, disabled, ...props }: any) => (
  mockReact.createElement('Pressable', { ...props, onPress, disabled }, children)
));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      bgCard: 'card', bgSurface: 'surface', bgSurface2: 'surface2', textPrimary: 'primary',
      textSecond: 'secondary', textMuted: 'muted', accent: 'accent', accentBg: 'accentBg',
      correct: 'correct', correctBg: 'correctBg', correctText: 'correctText', gold: 'gold',
      goldBg: 'goldBg', textOnGold: 'onGold',
    },
    f: { h1: 24, h2: 20, h3: 18, body: 16, bodyLg: 18, caption: 13, label: 12 },
    ds: { spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }, radius: { md: 12, lg: 16, xl: 20 }, fontFamily: 'Inter', buttonHeight: 52 },
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(async () => cleanup());

const baseProps = {
  lang: 'ru' as const,
  level: 'A2' as const,
  firstLesson: 13,
  lastLesson: 24,
  durationMinutes: 13,
  energyCost: 5,
  availableEnergy: 10,
  bestScore: null,
  starting: false,
  onBack: jest.fn(),
  onStart: jest.fn(),
};

it('hides every energy surface for Plus and keeps the exam start available', async () => {
  const view = await render(React.createElement(LevelExamIntro, {
    ...baseProps,
    availableEnergy: 0,
    unlimitedEnergy: true,
  }));

  expect(view.queryByText('Не хватает энергии для начала')).toBeNull();
  expect(view.queryByText('5')).toBeNull();
  expect(view.getByLabelText('Начать проверку').props.accessibilityState).toEqual({ disabled: false });
});

it('shows useful preparation details and guards the start action', async () => {
  const onStart = jest.fn(() => new Promise<void>(() => {}));
  const view = await render(React.createElement(LevelExamIntro, { ...baseProps, onStart }));

  expect(view.getByText('Финальная проверка A2')).toBeTruthy();
  expect(view.getByText('21 правильный ответ из 30')).toBeTruthy();
  expect(view.getByText('13 минут')).toBeTruthy();
  expect(view.queryByText('Что будет внутри')).toBeNull();
  expect(view.queryByText('За первое успешное прохождение — 1 спин')).toBeNull();

  const start = view.getByLabelText('Начать проверку −5 ⚡');
  await fireEvent.press(start);
  await fireEvent.press(start);
  expect(onStart).toHaveBeenCalledTimes(1);
});

it('keeps the start action disabled when energy is insufficient', async () => {
  const onStart = jest.fn();
  const view = await render(React.createElement(LevelExamIntro, {
    ...baseProps,
    availableEnergy: 4,
    onStart,
  }));

  expect(view.getByText('Не хватает энергии для начала')).toBeTruthy();
  expect(view.getByLabelText('Начать проверку −5 ⚡').props.accessibilityState).toEqual({ disabled: true });
  await fireEvent.press(view.getByLabelText('Начать проверку −5 ⚡'));
  expect(onStart).not.toHaveBeenCalled();
});

it('keeps the CTA label and arrow in one horizontal row', async () => {
  const view = await render(React.createElement(LevelExamIntro, baseProps));

  expect(view.getByTestId('level-exam-start-content').props.style).toMatchObject({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  });
});

it('uses theme tokens and tonal hierarchy without decorative outlines', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'components/level-exam/LevelExamIntro.tsx'),
    'utf8',
  );

  expect(source).toContain('useTheme()');
  expect(source).toContain('<ScreenGradient');
  expect(source).toContain('<TonalSurface');
  expect(source).toContain('<TapScale');
  expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  expect(source).not.toMatch(/rgba?\(/i);
  expect(source).not.toMatch(/borderWidth\s*:/);
});
