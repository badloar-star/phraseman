import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

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
  return ({ children, ...props }: any) => <MockPressable {...props}>{children}</MockPressable>;
});
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      bgCard: '#111',
      bgSurface: '#181818',
      cardGradient: ['#222', '#050505'],
      accent: '#9cff00',
      correctText: '#07110A',
      textPrimary: '#fff',
      textMuted: '#ddd',
      wrong: '#ff5c5c',
      wrongBg: 'rgba(255,92,92,0.14)',
    },
    f: { h2: 22, body: 16, label: 14 },
    themeMode: 'dark',
    isFlat: false,
  }),
}));
jest.mock('../constants/theme', () => ({
  screenTextOnGradient: () => ({ primary: '#fff', muted: '#ddd', second: '#fff', ghost: '#222' }),
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

import SurveyTaskCard from '../components/SurveyTaskCard';
import SurveyRewardPanel from '../components/survey/SurveyRewardPanel';

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

test('active standalone survey card keeps complete Polish copy and active press', async () => {
  const onOpen = jest.fn();
  const view = await render(<SurveyTaskCard challenge={activeChallenge} onOpen={onOpen} />);

  expect(StyleSheet.flatten(view.getByTestId('survey-offer-card').props.style)).toMatchObject({
    borderRadius: 22,
    backgroundColor: '#211B31',
  });
  expect(view.getByTestId('survey-offer-art')).toBeTruthy();
  expect(view.getByTestId('survey-offer-title').props.children).toBe(activeChallenge.title);
  expect(view.getByTestId('survey-offer-description').props.children).toBe(activeChallenge.description);
  expect(view.getByTestId('survey-offer-title').props.numberOfLines).toBeUndefined();
  expect(view.getByTestId('survey-offer-description').props.ellipsizeMode).toBeUndefined();
  expect(view.queryByTestId('ionicon-chatbubble-ellipses-outline')).toBeNull();
  expect(`${view.getByTestId('survey-offer-title').props.children}${view.getByTestId('survey-offer-description').props.children}`)
    .not.toMatch(/[\p{Extended_Pictographic}\uFE0F]/u);
  expect(view.queryByRole('progressbar')).toBeNull();
  expect(view.getByRole('button', { name: `${activeChallenge.title}. ${activeChallenge.description}` }))
    .toBe(view.getByTestId('survey-offer-card'));

  fireEvent.press(view.getByTestId('survey-offer-card'));
  expect(onOpen).toHaveBeenCalledWith(activeChallenge);
});

test('completed survey shows a claimed check and cannot be pressed', async () => {
  const onOpen = jest.fn();
  const view = await render(<SurveyTaskCard challenge={{ ...activeChallenge, phase: 'completed', survey: null }} onOpen={onOpen} />);
  expect(view.getByTestId('ionicon-checkmark-circle')).toBeTruthy();
  expect(view.queryByRole('button')).toBeNull();
  expect(view.getByTestId('survey-offer-card').props.accessibilityState).toEqual({ disabled: true });
  fireEvent.press(view.getByTestId('survey-offer-card'));
  expect(onOpen).not.toHaveBeenCalled();
});

test.each(['optimistic-reward', 'reconciled'] as const)(
  '%s survey reward uses the branded shard asset and complete accessible copy',
  async (phase) => {
    const onDone = jest.fn();
    const view = await render(
      <SurveyRewardPanel
        phase={phase}
        reward={3}
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
    expect(mockOskolokImageForPackShards).toHaveBeenCalledWith(3, 'dark');
    expect(view.getByTestId('survey-reward-title').props.children).toBe('Dziękujemy za odpowiedzi');
    expect(view.getByText('Twoje pełne odpowiedzi zostały zapisane i pomagają rozwijać Phraseman.')).toBeTruthy();
    expect(view.getByTestId('survey-reward-subtitle').props.numberOfLines).toBeUndefined();
    expect(StyleSheet.flatten(view.getByTestId('survey-reward-motion').props.style)).toMatchObject({
      opacity: 1,
      transform: [{ scale: 1 }],
    });
    expect(view.getByTestId('ionicon-checkmark-circle', { includeHiddenElements: true })).toBeTruthy();
    expect(view.queryByText('💎')).toBeNull();
    expect(view.queryByTestId('survey-retry')).toBeNull();

    fireEvent.press(view.getByRole('button', { name: 'Gotowe' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  },
);

test('optimistic to reconciled rerender does not replay the entrance animation', async () => {
  mockReduceMotionEnabled = false;
  const animation = { start: jest.fn(), stop: jest.fn() };
  const timing = jest.spyOn(Animated, 'timing').mockReturnValue(animation as unknown as ReturnType<typeof Animated.timing>);
  const props = {
    reward: 3,
    title: 'Dziękujemy',
    subtitle: 'Odpowiedzi zostały zapisane.',
    error: 'Błąd',
    onDone: jest.fn(),
    onRetry: jest.fn(),
  };

  const view = await render(<SurveyRewardPanel phase="optimistic-reward" {...props} />);
  expect(timing).toHaveBeenCalledTimes(1);
  await act(async () => {
    view.rerender(<SurveyRewardPanel phase="reconciled" {...props} />);
  });
  expect(timing).toHaveBeenCalledTimes(1);

  timing.mockRestore();
  mockReduceMotionEnabled = true;
});

test.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY])(
  'invalid reward %p omits shard art and never resolves an asset',
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
    expect(mockOskolokImageForPackShards).not.toHaveBeenCalled();
  },
);

test('retryable survey error stays in-screen, preserves accessible copy, and exposes a 44px retry action', async () => {
  const onRetry = jest.fn();
  const view = await render(
    <SurveyRewardPanel
      phase="retryable-error"
      reward={0}
      title="Odpowiedzi są nadal bezpieczne"
      subtitle="Nie musisz wypełniać ankiety ponownie."
      error="Nie udało się wysłać odpowiedzi. Sprawdź połączenie i spróbuj ponownie."
      onDone={jest.fn()}
      onRetry={onRetry}
    />,
  );

  expect(view.getByTestId('ionicon-alert-circle', { includeHiddenElements: true })).toBeTruthy();
  expect(view.getByRole('alert').props.children).toBe('Nie udało się wysłać odpowiedzi. Sprawdź połączenie i spróbuj ponownie.');
  expect(view.getByText('Nie musisz wypełniać ankiety ponownie.')).toBeTruthy();
  expect(view.queryByTestId('survey-reward-shard-asset')).toBeNull();
  expect(StyleSheet.flatten(view.getByTestId('survey-retry').props.style).minHeight).toBeGreaterThanOrEqual(44);

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
