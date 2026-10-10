import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';

// Файл намеренно `.test.ts`: корневой Jest запускает только исполняемые TS-guards.
// зачем (10.10): интро перерисовано в стекле 2.0 (ExamHeader/ExamHero/ExamKvCard/PracticeCta, PM-086 — без цены
// энергии на кнопке). Сторож переписан под новые части, поведение то же: ∞ для Plus, защита от двойного
// нажатия, снятие защиты, если старт не ушёл с экрана, и запрет старта без энергии.

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
jest.mock('../app/swallow_log', () => ({ noteSwallowedAs: (_tag: string, fallback: unknown) => () => fallback }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../components/ScreenGradient', () => ({ children }: any) => mockReact.createElement('ScreenGradient', null, children));
jest.mock('../components/BouncyScrollView', () => ({ children }: any) => mockReact.createElement('ScrollView', null, children));
jest.mock('../components/energy/AnimatedEnergyNumber', () => ({
  AnimatedEnergyNumber: ({ value }: any) => mockReact.createElement('Text', null, String(value)),
}));
jest.mock('../components/level-exam/ExamGlassParts', () => ({
  ExamHeader: ({ title, right }: any) => mockReact.createElement('View', null, mockReact.createElement('Text', null, title), right),
  ExamHero: ({ title, message }: any) => mockReact.createElement('View', null,
    mockReact.createElement('Text', null, title), mockReact.createElement('Text', null, message)),
  ExamKvCard: ({ children }: any) => mockReact.createElement('View', null, children),
  ExamVerdict: ({ text }: any) => mockReact.createElement('Text', null, text),
  ExamFooter: ({ children }: any) => mockReact.createElement('View', null, children),
}));
jest.mock('../components/practice/PracticeStates', () => ({
  PracticeCta: ({ testID, label, accessibilityLabel, disabled, onPress }: any) => mockReact.createElement(
    'Pressable',
    {
      testID,
      accessibilityLabel: accessibilityLabel ?? label,
      accessibilityState: { disabled: !!disabled },
      onPress: disabled ? undefined : onPress,
    },
    mockReact.createElement('Text', null, label),
  ),
}));
jest.mock('../constants/liquidGlassThemePalette', () => ({
  liquidGlassTokens: () => ({ text: 'text', secondary: 'secondary', opaqueControl: 'control' }),
}));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: { correct: 'correct', wrong: 'wrong' },
    liquidGlassThemeId: 'graphite',
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
  energyCost: 20,
  availableEnergy: 100,
  bestScore: null,
  starting: false,
  onBack: jest.fn(),
  onStart: jest.fn(),
};

const startButton = (view: any) => view.getByTestId('level-exam-start');

it('shows infinity for Plus and keeps the exam start available', async () => {
  const view = await render(React.createElement(LevelExamIntro, {
    ...baseProps,
    availableEnergy: 0,
    unlimitedEnergy: true,
  }));

  expect(view.getByText('∞')).toBeTruthy();
  expect(startButton(view).props.accessibilityState).toEqual({ disabled: false });
});

it('guards the start action against a double tap', async () => {
  const onStart = jest.fn(() => new Promise<void>(() => {}));
  const view = await render(React.createElement(LevelExamIntro, { ...baseProps, onStart }));

  await act(async () => {
    fireEvent.press(startButton(view));
    await Promise.resolve();
  });
  await act(async () => {
    fireEvent.press(startButton(view));
    await Promise.resolve();
  });
  expect(onStart).toHaveBeenCalledTimes(1);
});

it('releases the launch guard when start resolves without leaving the intro', async () => {
  const onStart = jest.fn(async () => undefined);
  const view = await render(React.createElement(LevelExamIntro, { ...baseProps, onStart }));

  for (let i = 0; i < 2; i += 1) {
    await act(async () => {
      fireEvent.press(startButton(view));
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  expect(onStart).toHaveBeenCalledTimes(2);
});

it('keeps the start action disabled when energy is insufficient', async () => {
  const onStart = jest.fn();
  const view = await render(React.createElement(LevelExamIntro, {
    ...baseProps,
    availableEnergy: 19,
    onStart,
  }));

  expect(startButton(view).props.accessibilityState).toEqual({ disabled: true });
  await act(async () => {
    fireEvent.press(startButton(view));
    await Promise.resolve();
  });
  expect(onStart).not.toHaveBeenCalled();
});

it('uses glass theme tokens and no raw colors or decorative outlines', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'components/level-exam/LevelExamIntro.tsx'),
    'utf8',
  );

  expect(source).toContain('useTheme()');
  expect(source).toContain('liquidGlassTokens(');
  expect(source).toContain('<ScreenGradient');
  expect(source).toContain('<PracticeCta');
  expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  expect(source).not.toMatch(/rgba?\(/i);
  expect(source).not.toMatch(/borderWidth\s*:/);
});
