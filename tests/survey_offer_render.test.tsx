/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, within } from '@testing-library/react-native';

jest.unmock('react-native');
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, ...props }: { name: string }) => {
    const { Text: MockText } = require('react-native');
    return <MockText {...props} testID={`ionicon-${name}`}>{name}</MockText>;
  },
}));
jest.mock('@expo/vector-icons/Ionicons', () => ({
  __esModule: true,
  default: ({ name, ...props }: { name: string }) => {
    const { Text: MockText } = require('react-native');
    return <MockText {...props} testID={`ionicon-${name}`}>{name}</MockText>;
  },
}));
jest.mock('expo-image', () => ({
  Image: (props: any) => {
    const { Image: MockImage } = require('react-native');
    return <MockImage {...props} />;
  },
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View: MockView } = require('react-native');
    return <MockView {...props}>{children}</MockView>;
  },
}));
jest.mock('expo-router', () => ({ usePathname: () => '/daily-tasks' }));
jest.mock('../components/TapScale', () => {
  const { Pressable: MockPressable } = require('react-native');
  return function MockTapScale({ children, ...props }: any) {
    return <MockPressable {...props}>{children}</MockPressable>;
  };
});
jest.mock('../components/PressableHybrid', () => ({
  __esModule: true,
  default: ({ children, contentStyle, accessibilityRole = 'button', ...props }: any) => {
    const { Pressable: MockPressable, View: MockView } = require('react-native');
    return (
      <MockView testID="pressable-hybrid-proxy">
        <MockPressable {...props} accessibilityRole={accessibilityRole}>
          <MockView style={contentStyle}>{children}</MockView>
        </MockPressable>
      </MockView>
    );
  },
}));
const mockRewardWithTiming = jest.fn((value: number, _config?: unknown) => value);
let mockRewardThemeMode: 'sagePorcelain' | 'dark' = 'dark';
jest.mock('react-native-reanimated', () => {
  const ReactActual = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View: ReactActual.forwardRef((props: any, ref: React.Ref<unknown>) => <NativeView ref={ref} {...props} />) },
    cancelAnimation: jest.fn(),
    Easing: { bezier: jest.fn(), cubic: jest.fn(), out: jest.fn() },
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useSharedValue: (value: number) => ReactActual.useRef({ value }).current,
    withSequence: (...values: number[]) => values.at(-1),
    withSpring: (value: number) => value,
    withTiming: (value: number, config?: unknown) => mockRewardWithTiming(value, config),
    withDelay: (_delay: number, value: number) => value,
  };
});
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      bgCard: '#111',
      bgSurface: '#181818',
      cardGradient: ['#222', '#050505'],
      accent: '#9cff00',
      accentBg: 'rgba(156,255,0,0.14)',
      borderHighlight: 'rgba(156,255,0,0.35)',
      correctText: '#07110A',
      textPrimary: mockRewardThemeMode === 'sagePorcelain' ? '#162018' : '#fff',
      textOnCard: '#f7fff1',
      textMuted: '#ddd',
      glow: 'rgba(156,255,0,0.22)',
      wrong: '#ff5c5c',
      wrongBg: 'rgba(255,92,92,0.14)',
    },
    f: { h2: 22, body: 16, label: 14 },
    themeMode: mockRewardThemeMode,
    isFlat: false,
  }),
}));
jest.mock('../constants/theme', () => ({
  screenTextOnGradient: () => ({ primary: '#fff', muted: '#ddd', second: '#fff', ghost: '#222' }),
  isLightThemeMode: (mode: string) => mode === 'sagePorcelain',
}));
jest.mock('../constants/i18n', () => ({
  triLang: (lang: string, copy: Record<string, string>) => copy[lang] ?? copy.ru,
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'pl' }) }));
jest.mock('../components/text-integrity/use_text_integrity_probe', () => ({
  useTextIntegrityProbe: () => ({ ref: { current: null }, onTextLayout: jest.fn() }),
}));
let mockReduceMotionEnabled = true;
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => mockReduceMotionEnabled }));
const mockOskolokImageForPackShards: jest.Mock = jest.fn(() => ({ uri: 'survey-shard' }));
jest.mock('../app/oskolok', () => ({
  oskolokImageForPackShards: (...args: unknown[]) => mockOskolokImageForPackShards(...args),
}));
jest.mock('../app/shards_system', () => ({
  SHARD_REWARDS: { survey_completed: 1 },
}));

import SurveyTaskCard from '../components/SurveyTaskCard';
import SurveyRewardPanel from '../components/survey/SurveyRewardPanel';
import { SURVEY_HYBRID } from '../constants/motionHybrid';

beforeEach(() => {
  mockReduceMotionEnabled = true;
  mockRewardThemeMode = 'dark';
  mockRewardWithTiming.mockClear();
});

const ROOT = path.resolve(__dirname, '..');
const activeChallenge = {
  surveyId: 'survey-pl',
  title: 'Bardzo długa ankieta o codziennych sposobach uczenia się języków obcych',
  description: 'Odpowiedz na pytania i pomóż ulepszyć aplikację bez skracania tego opisu.',
  questionCount: 12,
  rewardShards: 3,
  phase: 'active' as const,
  survey: { surveyId: 'survey-pl', title: 'Ankieta', subtitle: '', rewardShards: 3, questions: [] },
};

test('active standalone survey card renders the compact C2 task row and opens the challenge', async () => {
  const onOpen = jest.fn();
  mockOskolokImageForPackShards.mockClear();
  const view = await render(<SurveyTaskCard challenge={activeChallenge} onOpen={onOpen} />);

  expect(view.getByTestId('pressable-hybrid-proxy')).toBeTruthy();
  expect(view.getByTestId('survey-offer-card').props.variant).toBe('card');
  expect(view.getByTestId('survey-offer-title').props.children).toBe(activeChallenge.title);
  expect(view.getByTestId('survey-offer-title').props.numberOfLines).toBe(2);
  expect(StyleSheet.flatten(view.getByTestId('survey-offer-title').props.style)).toMatchObject({
    lineHeight: 22,
    minHeight: 44,
  });
  expect(view.getByTestId('survey-offer-card').props.accessibilityLabel)
    .toBe(`${activeChallenge.title}. +1 perła`);
  expect(view.queryByTestId('survey-offer-description')).toBeNull();
  expect(view.queryByTestId('survey-offer-accent')).toBeNull();
  expect(view.queryByTestId('survey-offer-art')).toBeNull();
  expect(StyleSheet.flatten(view.getByTestId('survey-offer-icon-well').props.style)).toMatchObject({
    width: SURVEY_HYBRID.taskIconSize,
    height: SURVEY_HYBRID.taskIconSize,
  });
  expect(view.getByTestId('survey-offer-theme-art', { includeHiddenElements: true }).props).toMatchObject({
    accessible: false,
  });
  expect(StyleSheet.flatten(view.getByTestId('survey-offer-theme-art').props.style)).toMatchObject({
    width: SURVEY_HYBRID.taskIconSize,
    height: SURVEY_HYBRID.taskIconSize,
  });
  expect(view.getByTestId('survey-offer-reward-label').props.children).toBe('+1');
  expect(view.getByTestId('survey-offer-reward-art').props).toMatchObject({
    source: { uri: 'survey-shard' },
    accessible: false,
  });
  expect(mockOskolokImageForPackShards).toHaveBeenCalledWith(1, 'dark');
  expect(view.queryByTestId('ionicon-chatbubble-ellipses-outline')).toBeNull();
  expect(view.queryByRole('progressbar')).toBeNull();
  expect(view.getByRole('button', { name: `${activeChallenge.title}. +1 perła` }))
    .toBe(view.getByTestId('survey-offer-card'));

  fireEvent.press(view.getByTestId('survey-offer-card'));
  expect(onOpen).toHaveBeenCalledWith(activeChallenge);
});

test('completed survey shows a claimed check and cannot be pressed', async () => {
  const onOpen = jest.fn();
  const view = await render(<SurveyTaskCard challenge={{ ...activeChallenge, phase: 'completed', survey: null }} onOpen={onOpen} />);
  const card = view.getByTestId('survey-offer-card');

  expect(view.queryByTestId('pressable-hybrid-proxy')).toBeNull();
  expect(card.type).toBe('View');
  expect(card.props.variant).toBeUndefined();
  expect(card.props.onPress).toBeUndefined();
  expect(card.props.accessibilityLabel).toBe(`${activeChallenge.title}. Ankieta ukończona`);
  expect(card.props.accessibilityState).toEqual({ disabled: true });
  expect(view.getByTestId('ionicon-checkmark-circle', { includeHiddenElements: true }).props).toEqual(expect.objectContaining({
    accessible: false,
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no',
  }));
  expect(view.queryByTestId('survey-offer-reward-label')).toBeNull();
  expect(view.queryByTestId('survey-offer-reward-art')).toBeNull();
  expect(view.getByTestId('ionicon-checkmark-circle', { includeHiddenElements: true }).props.color).toBe('#9cff00');
  expect(view.queryByRole('button')).toBeNull();
  fireEvent.press(card);
  expect(onOpen).not.toHaveBeenCalled();
});

test('retryable survey offer stays a disabled non-pressable row without an active reward marker', async () => {
  const onOpen = jest.fn();
  const view = await render(
    <SurveyTaskCard challenge={{ ...activeChallenge, phase: 'retryable-error' }} onOpen={onOpen} />,
  );
  const card = view.getByTestId('survey-offer-card');

  expect(view.queryByTestId('pressable-hybrid-proxy')).toBeNull();
  expect(card.type).toBe('View');
  expect(card.props.variant).toBeUndefined();
  expect(card.props.onPress).toBeUndefined();
  expect(card.props.accessibilityLabel).toBe(activeChallenge.title);
  expect(card.props.accessibilityState).toEqual({ disabled: true });
  expect(view.queryByTestId('survey-offer-reward-label')).toBeNull();
  expect(view.queryByTestId('survey-offer-reward-art')).toBeNull();
  expect(view.queryByTestId('ionicon-checkmark-circle')).toBeNull();
  expect(view.queryByRole('button')).toBeNull();
  fireEvent.press(card);
  expect(onOpen).not.toHaveBeenCalled();
});

test(
  'reconciled survey reward uses the branded shard asset and complete accessible copy',
  async () => {
    const onDone = jest.fn();
    const view = await render(
      <SurveyRewardPanel
        phase="reconciled"
        reward={1}
        title="Dziękujemy za odpowiedzi"
        subtitle="Twoje pełne odpowiedzi zostały zapisane i pomagają rozwijać Phraseman."
        error="Nie udało się wysłać odpowiedzi."
        onDone={onDone}
        onRetry={jest.fn()}
      />,
    );

    expect(view.getByTestId('survey-reward-shard-asset').props.source).toBeTruthy();
    expect(view.getByTestId('survey-reward-shard-asset', { includeHiddenElements: true }).props).toMatchObject({
      accessible: false,
      importantForAccessibility: 'no',
    });
    expect(mockOskolokImageForPackShards).toHaveBeenCalledWith(1, 'dark');
    expect(view.getByTestId('survey-reward-title').props.children).toBe('Dziękujemy za odpowiedzi');
    expect(view.getByTestId('survey-reward-amount').props.children).toBe('+1 perła');
    expect(view.getByTestId('survey-reward-amount').props.accessibilityLabel).toBe('+1 perła');
    expect(view.getByText('Twoje pełne odpowiedzi zostały zapisane i pomagają rozwijać Phraseman.')).toBeTruthy();
    expect(view.getByTestId('survey-reward-subtitle').props.numberOfLines).toBeUndefined();
    expect(StyleSheet.flatten(view.getByTestId('survey-reward-motion').props.style)).toMatchObject({
      opacity: 0,
      transform: [{ translateY: 0 }, { scale: 1 }],
    });
    expect(mockRewardWithTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: 110 }));
    expect(view.getByTestId('ionicon-checkmark-circle', { includeHiddenElements: true })).toBeTruthy();
    expect(view.queryByText('💎')).toBeNull();
    expect(view.queryByTestId('survey-retry')).toBeNull();
    const hero = within(view.getByTestId('survey-reward-motion'));
    expect(hero.getByTestId('survey-reward-shard-asset')).toBeTruthy();
    expect(hero.getByTestId('survey-reward-amount')).toBeTruthy();
    expect(hero.queryByTestId('survey-reward-title')).toBeNull();
    expect(hero.queryByTestId('survey-done')).toBeNull();

    expect(view.getByTestId('survey-done').props.withHaptic).toBe(false);
    fireEvent.press(view.getByRole('button', { name: 'Gotowe' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  },
);

test('optimistic to reconciled starts the reward impact once and does not replay it', async () => {
  mockReduceMotionEnabled = false;
  mockRewardWithTiming.mockClear();
  const props = {
    reward: 1,
    title: 'Dziękujemy',
    subtitle: 'Odpowiedzi zostały zapisane.',
    error: 'Błąd',
    onDone: jest.fn(),
    onRetry: jest.fn(),
  };

  const view = await render(<SurveyRewardPanel phase="optimistic-reward" {...props} />);
  const initialTimingCalls = mockRewardWithTiming.mock.calls.length;
  await act(async () => {
    view.rerender(<SurveyRewardPanel phase="reconciled" {...props} />);
  });
  const reconciledTimingCalls = mockRewardWithTiming.mock.calls.length;
  expect(reconciledTimingCalls).toBeGreaterThan(initialTimingCalls);
  await act(async () => {
    view.rerender(<SurveyRewardPanel phase="reconciled" {...props} />);
  });
  expect(mockRewardWithTiming).toHaveBeenCalledTimes(reconciledTimingCalls);
  expect(mockRewardWithTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: 260 }));

  mockReduceMotionEnabled = true;
});

test.each([-2, Number.NaN, Number.POSITIVE_INFINITY])(
  'noncanonical reward prop %p cannot create a visible survey reward',
  async (reward) => {
    mockOskolokImageForPackShards.mockClear();
    const view = await render(
      <SurveyRewardPanel
        phase="reconciled"
        reward={reward}
        title="Dziękujemy"
        subtitle="Odpowiedzi zostały zapisane."
        error="Błąd"
        onDone={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(view.queryByTestId('survey-reward-shard-asset')).toBeNull();
    expect(view.queryByTestId('survey-reward-amount')).toBeNull();
    expect(mockOskolokImageForPackShards).not.toHaveBeenCalled();
  },
);

test('optimistic survey panel never claims a shard before reconciliation', async () => {
  const view = await render(
    <SurveyRewardPanel phase="optimistic-reward" reward={1} title="Zapisywanie" subtitle="Czekaj" error="Błąd" onDone={jest.fn()} onRetry={jest.fn()} />,
  );
  expect(view.queryByTestId('survey-reward-amount')).toBeNull();
  expect(view.queryByTestId('survey-reward-shard-asset')).toBeNull();
});

test('confirmed zero reward shows already-completed check without claiming +1', async () => {
  const view = await render(
    <SurveyRewardPanel phase="reconciled" reward={0} title="Ankieta już wypełniona" subtitle="" error="Błąd" onDone={jest.fn()} onRetry={jest.fn()} />,
  );
  expect(view.getByRole('header', { name: 'Ankieta już wypełniona' })).toBeTruthy();
  expect(view.getByTestId('survey-completion-check', { includeHiddenElements: true })).toBeTruthy();
  expect(view.queryByTestId('survey-reward-amount')).toBeNull();
  expect(view.queryByTestId('survey-reward-shard-asset')).toBeNull();
  expect(StyleSheet.flatten(view.getByTestId('survey-reward-supporting-motion').props.style).opacity).toBe(0);
  expect(mockRewardWithTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: 110 }));
});

test('reward amount uses theme primary text for deterministic light-theme contrast', async () => {
  mockRewardThemeMode = 'sagePorcelain';
  const view = await render(
    <SurveyRewardPanel phase="reconciled" reward={1} title="Dziękujemy" subtitle="Zapisano" error="Błąd" onDone={jest.fn()} onRetry={jest.fn()} />,
  );
  expect(view.getByTestId('survey-reward-amount').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#162018' })]));
});

test('granted reward remains announced when the final subtitle is empty', async () => {
  const view = await render(
    <SurveyRewardPanel phase="reconciled" reward={1} title="Dziękujemy" subtitle="" error="Błąd" onDone={jest.fn()} onRetry={jest.fn()} />,
  );
  expect(view.getByTestId('survey-reward-amount')).toHaveTextContent('+1 perła');
  expect(view.getByTestId('survey-reward-amount').props.accessibilityLabel).toBe('+1 perła');
});

test('retryable survey error stays in-screen, preserves accessible copy, and exposes a 48px retry action', async () => {
  const onRetry = jest.fn();
  const longError = 'Nie udało się wysłać odpowiedzi. Sprawdź połączenie i spróbuj ponownie. '.repeat(5);
  const view = await render(
    <SurveyRewardPanel
      phase="retryable-error"
      reward={0}
      title="Odpowiedzi są nadal bezpieczne"
      subtitle="Nie musisz wypełniać ankiety ponownie."
      error={longError}
      onDone={jest.fn()}
      onRetry={onRetry}
    />,
  );

  expect(view.getByTestId('ionicon-alert-circle', { includeHiddenElements: true })).toBeTruthy();
  expect(view.getByRole('alert').props.children).toBe(longError);
  expect(view.getByText('Nie musisz wypełniać ankiety ponownie.')).toBeTruthy();
  expect(view.queryByTestId('survey-reward-shard-asset')).toBeNull();
  expect(view.queryByTestId('survey-reward-amount')).toBeNull();
  expect(StyleSheet.flatten(view.getByTestId('survey-retry').props.style).minHeight).toBeGreaterThanOrEqual(48);
  expect(view.getByTestId('survey-retry').props.withHaptic).toBe(false);

  fireEvent.press(view.getByRole('button', { name: 'Spróbuj ponownie' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('account-changed recovery disables retry but keeps an accessible back action', async () => {
  const onBack = jest.fn();
  const view = await render(
    <SurveyRewardPanel
      phase="retryable-error" reward={0} title="Account changed" subtitle="Open the survey again."
      error="This survey belongs to the previous account." onDone={jest.fn()} onRetry={jest.fn()}
      retryDisabled onBack={onBack}
    />,
  );
  expect(view.getByTestId('survey-retry').props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  await fireEvent.press(view.getByTestId('survey-back'));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('RNTL config discovers exactly this new survey card suite', () => {
  const config = fs.readFileSync(path.join(ROOT, 'jest.rntl.config.cjs'), 'utf8');
  expect(config.match(/survey_offer_render\.test\.tsx/g)).toHaveLength(1);
  expect(config).not.toContain('survey_completion_marker_card_render.test.tsx');
});

test('survey task reward marker reads the canonical completed-survey reward', () => {
  const source = fs.readFileSync(path.join(ROOT, 'components', 'SurveyTaskCard.tsx'), 'utf8');
  expect(source).toContain('SHARD_REWARDS.survey_completed');
  expect(source).not.toMatch(/\bconst\s+\w*(?:reward|shard)\w*\s*=\s*1\b/i);
});

test('survey task leading mark uses the current theme supporting art', () => {
  const source = fs.readFileSync(path.join(ROOT, 'components', 'SurveyTaskCard.tsx'), 'utf8');
  expect(source).toContain('getHomeSupportingArt(themeMode).survey');
  expect(source).toContain('SURVEY_HYBRID.taskIconSize');
  expect(source).toContain('testID="survey-offer-theme-art"');
  expect(source).not.toContain('name="clipboard-outline"');
});

test('survey reward actions use the shared hybrid press primitive without local press opacity or timing literals', () => {
  const source = fs.readFileSync(path.join(ROOT, 'components', 'survey', 'SurveyRewardPanel.tsx'), 'utf8');
  expect(source).toContain("from '../PressableHybrid'");
  expect(source).toContain('duration: reduceMotion ? LUM.heroFadeMs : LUM.contentMs');
  expect(source).not.toContain('CascadeItem');
  expect(source).not.toContain('duration: 220');
  expect(source).not.toMatch(/pressed\s*\?\s*0\./);
});
