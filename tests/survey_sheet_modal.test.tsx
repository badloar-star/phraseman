/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { AccessibilityInfo, InteractionManager, StyleSheet, Text } from 'react-native';
import { act, fireEvent, render, within } from '@testing-library/react-native';

jest.unmock('react-native');

let mockLang = 'ru';
let mockReduceMotion = false;
let mockThemeMode: 'sagePorcelain' | 'dark' = 'dark';
let mockDeferTimingCallbacks = false;
const mockTimingCallbacks: ((finished: boolean) => void)[] = [];
const mockUseSurveyFlowController = jest.fn();
const mockCancelAnimation = jest.fn();
const mockWithTiming = jest.fn((
  value: number,
  _config?: unknown,
  callback?: (finished: boolean) => void,
) => {
  if (callback) {
    if (mockDeferTimingCallbacks) mockTimingCallbacks.push(callback);
    else queueMicrotask(() => callback(true));
  }
  return value;
});
const mockWithSpring = jest.fn((value: number) => value);
const mockWithSequence = jest.fn((...values: number[]) => values.at(-1));
const mockRequestDismiss = jest.fn();
const mockSetAccessibilityFocus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {});
const mockRunAfterInteractions = jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation((callback: () => void) => {
  callback();
  return { cancel: jest.fn(), then: jest.fn(), done: jest.fn() } as any;
});
const mockFindNodeHandle = jest.spyOn(require('react-native'), 'findNodeHandle').mockReturnValue(73);
let mockCompleteDismiss: (() => void) | null = null;

jest.mock('react-native-reanimated', () => {
  const ReactActual = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');
  const AnimatedView = ReactActual.forwardRef((props: any, ref: React.Ref<unknown>) => (
    <NativeView ref={ref} {...props} />
  ));
  return {
    __esModule: true,
    default: { View: AnimatedView },
    cancelAnimation: (...args: unknown[]) => mockCancelAnimation(...args),
    Easing: { bezier: jest.fn(() => 'bezier'), cubic: jest.fn(), out: jest.fn(() => 'cubic-out') },
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useSharedValue: (value: number) => ReactActual.useRef({ value }).current,
    withSequence: (...values: number[]) => mockWithSequence(...values),
    withSpring: (value: number) => mockWithSpring(value),
    withDelay: (_delay: number, value: number) => value,
    withTiming: (value: number, config?: unknown, callback?: (finished: boolean) => void) => mockWithTiming(value, config, callback),
  };
});
jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn: (...args: unknown[]) => void, ...args: unknown[]) => fn(...args),
}));

jest.mock('../app/survey_flow_controller', () => ({
  useSurveyFlowController: function useSurveyFlowController(...args: unknown[]) {
    const ReactActual = require('react');
    const flowRef = ReactActual.useRef(null);
    if (!flowRef.current) flowRef.current = mockUseSurveyFlowController(...args);
    return flowRef.current;
  },
}));

const mockShellProps: Record<string, unknown> = {};
jest.mock('../components/modal_fx/HybridSheetShell', () => ({
  __esModule: true,
  default: function MockHybridSheetShell({ visible, children, testID, ...props }: any) {
    const ReactActual = require('react');
    const { Pressable: NativePressable, Text: NativeText, View: NativeView } = require('react-native');
    const dismissRequestedRef = ReactActual.useRef(false);
    const dismissCompletedRef = ReactActual.useRef(false);
    ReactActual.useEffect(() => {
      if (visible) {
        dismissRequestedRef.current = false;
        dismissCompletedRef.current = false;
      }
    }, [visible]);
    const requestDismiss = () => {
      if (dismissRequestedRef.current || dismissCompletedRef.current) return;
      dismissRequestedRef.current = true;
      props.onDismissRequested?.();
      mockRequestDismiss();
    };
    mockCompleteDismiss = () => {
      if (dismissCompletedRef.current) return;
      dismissCompletedRef.current = true;
      props.onClose();
    };
    Object.assign(mockShellProps, props);
    if (!visible) return null;
    const content = typeof children === 'function'
      ? children({ requestDismiss })
      : children;
    return (
      <NativeView testID={testID}>
        <NativePressable
          testID="survey-sheet-accessible-close"
          accessible
          accessibilityRole="button"
          accessibilityLabel={props.closeLabel}
          onPress={requestDismiss}
        >
          <NativeText>{props.closeLabel}</NativeText>
        </NativePressable>
        {content}
      </NativeView>
    );
  },
}));

jest.mock('../components/PressableHybrid', () => ({
  __esModule: true,
  default: ({ children, contentStyle, accessibilityRole = 'button', ...props }: any) => {
    const { Pressable: NativePressable, View: NativeView } = require('react-native');
    return (
      <NativePressable {...props} accessible accessibilityRole={accessibilityRole}>
        <NativeView style={contentStyle}>{children}</NativeView>
      </NativePressable>
    );
  },
}));

jest.mock('../components/text-integrity/FlowText', () => ({
  FlowText: require('react').forwardRef(({ children, provenance: _provenance, ...props }: any, ref: React.Ref<unknown>) => {
    const { Text: NativeText } = require('react-native');
    return <NativeText ref={ref} {...props}>{children}</NativeText>;
  }),
}));
jest.mock('../components/TonalSurface', () => ({
  __esModule: true,
  default: ({ children, tone: _tone, radius: _radius, ...props }: any) => {
    const { View: NativeView } = require('react-native');
    return <NativeView {...props}>{children}</NativeView>;
  },
}));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => {
    const light = mockThemeMode === 'sagePorcelain';
    return {
      theme: {
      accent: '#9cff00', accentBg: 'rgba(156,255,0,0.14)', bgCard: '#111', bgSurface2: '#222',
      border: '#333', correctText: '#07110A', textPrimary: '#fff', textSecond: '#cfcfcf',
      textMuted: '#aaa', wrong: '#ff5c5c', wrongBg: 'rgba(255,92,92,0.14)',
      ...(light ? { bgCard: '#fff', bgSurface2: '#F0F4EF', textPrimary: '#162018', textSecond: '#38463B', textMuted: '#607065' } : {}),
    },
    f: { h2: 22, h3: 20, body: 16, label: 14, sub: 13, numMd: 18 },
    themeMode: mockThemeMode,
  };
  },
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: mockLang }) }));
jest.mock('../constants/i18n', () => ({
  triLang: (lang: string, copy: Record<string, string>) => copy[lang] ?? copy.ru,
}));
jest.mock('../constants/theme', () => ({ isLightThemeMode: (mode: string) => mode === 'sagePorcelain' }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => mockReduceMotion }));
jest.mock('@expo/vector-icons/Ionicons', () => ({
  __esModule: true,
  default: ({ name, ...props }: any) => {
    const { Text: NativeText } = require('react-native');
    return <NativeText {...props} testID={`ionicon-${name}`}>{name}</NativeText>;
  },
}));
jest.mock('expo-image', () => ({
  Image: (props: any) => {
    const { Image: NativeImage } = require('react-native');
    return <NativeImage {...props} />;
  },
}));
jest.mock('../app/oskolok', () => ({ oskolokImageForPackShards: () => ({ uri: 'survey-shard' }) }));
jest.mock('../app/shards_system', () => ({ SHARD_REWARDS: { survey_completed: 1 } }));

import SurveySheetModal from '../components/survey/SurveySheetModal';
import SurveyQuestionTransition from '../components/survey/SurveyQuestionTransition';

const ROOT = path.resolve(__dirname, '..');
function collectLiveRegionOwners(tree: any): any[] {
  if (!tree) return [];
  if (Array.isArray(tree)) return tree.flatMap(collectLiveRegionOwners);
  const current = tree.props?.accessibilityLiveRegion ? [tree] : [];
  return current.concat(collectLiveRegionOwners(tree.children));
}
const launch = {
  stableId: 'stable-1',
  dayKey: '2026-08-21',
  lang: 'ru' as const,
  survey: {
    surveyId: 'survey-1',
    title: 'Как тебе ежедневные задания и что поможет сделать их полезнее каждый день?',
    subtitle: '',
    rewardShards: 1,
    finalTitle: 'Спасибо!',
    finalSubtitle: 'Ответы сохранены.',
    questions: [
      { id: 'q1', type: 'single_choice' as const, text: 'Что помогает учиться?', options: [
        { id: 'a', label: 'Короткие задания' }, { id: 'b', label: 'Повторение' },
      ] },
      { id: 'q2', type: 'text' as const, text: 'Что стоит улучшить?', options: [] },
    ],
  },
};

function editingFlow(overrides: Record<string, unknown> = {}) {
  return {
    stepIndex: 0,
    direction: 'forward' as const,
    currentQuestion: launch.survey.questions[0],
    answers: { q1: { optionId: 'a' } },
    currentAnswered: true,
    isLastStep: false,
    submission: { phase: 'editing', attemptId: 0, expectedReward: 0, confirmedReward: 0, messageKey: null },
    submitting: false,
    pickOption: jest.fn(),
    setComment: jest.fn(),
    goNext: jest.fn(),
    goBack: jest.fn(() => 'moved'),
    retrySubmit: jest.fn(),
    deactivate: jest.fn(),
    ...overrides,
  };
}

describe('SurveySheetModal', () => {
  beforeEach(() => {
    mockLang = 'ru';
    mockReduceMotion = false;
    mockThemeMode = 'dark';
    mockDeferTimingCallbacks = false;
    mockTimingCallbacks.length = 0;
    mockCancelAnimation.mockClear();
    mockWithTiming.mockClear();
    mockWithSpring.mockClear();
    mockWithSequence.mockClear();
    mockRequestDismiss.mockClear();
    mockSetAccessibilityFocus.mockClear();
    mockRunAfterInteractions.mockClear();
    mockFindNodeHandle.mockClear();
    mockUseSurveyFlowController.mockClear();
    mockCompleteDismiss = null;
    Object.keys(mockShellProps).forEach((key) => delete mockShellProps[key]);
    mockUseSurveyFlowController.mockReturnValue(editingFlow());
  });

  test('uses token-sized directional shifts and removes displacement under Reduce Motion', async () => {
    const screen = await render(
      <SurveyQuestionTransition transitionKey="q1" direction="forward"><Text>One</Text></SurveyQuestionTransition>,
    );
    expect(screen.getByTestId('survey-question-transition').props.testOnly_startX).toBe(8);

    await screen.rerender(
      <SurveyQuestionTransition transitionKey="q2" direction="backward"><Text>Two</Text></SurveyQuestionTransition>,
    );
    expect(screen.getByTestId('survey-question-transition').props.testOnly_startX).toBe(-8);

    mockReduceMotion = true;
    await screen.rerender(
      <SurveyQuestionTransition transitionKey="q3" direction="forward"><Text>Three</Text></SurveyQuestionTransition>,
    );
    expect(screen.getByTestId('survey-question-transition').props.testOnly_startX).toBe(0);
    expect(mockWithTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: 110 }), expect.any(Function));
  });

  // Full React Native sheet + layout harness coverage is not a latency assertion;
  // the mandatory combined gate repeatedly exceeded 5s under Windows host load.
  test('renders one high hybrid shell with the exact survey title, progress, and scrollable flat question body', async () => {
    mockLang = 'pl';
    const screen = await render(<SurveySheetModal visible launch={{ ...launch, lang: 'pl' }} onClose={jest.fn()} />);

    expect(screen.getAllByTestId('survey-sheet-shell')).toHaveLength(1);
    expect(mockShellProps.glowColor).toBe('#9cff00');
    expect(mockShellProps.backdropAccessible).toBe(false);
    expect(screen.getByRole('header', { name: launch.survey.title })).toBeTruthy();
    expect(screen.getByTestId('survey-sheet-close').props.accessibilityLabel).toBe('Zamknij ankietę');
    expect(screen.getByTestId('survey-sheet-title').props.numberOfLines).toBeUndefined();
    expect(screen.getByTestId('survey-sheet-progress-copy')).toHaveTextContent('Pytanie 1 z 2');
    expect(screen.getByTestId('survey-sheet-progress-copy').props.accessibilityValue).toEqual({ min: 1, max: 2, now: 1 });
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    expect(screen.getByTestId('survey-sheet-progress').props.accessible).toBe(false);
    const editingScroll = within(screen.getByTestId('survey-sheet-scroll'));
    expect(editingScroll.getByTestId('survey-sheet-title')).toBeTruthy();
    expect(editingScroll.getByTestId('survey-sheet-progress-copy')).toBeTruthy();
    expect(editingScroll.getByTestId('survey-sheet-progress')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('survey-sheet-scroll-content').props.style).flexGrow).toBe(1);
    expect(editingScroll.getByRole('header', { name: 'Что помогает учиться?' })).toBeTruthy();
    expect(screen.queryByTestId('survey-question-card')).toBeNull();
    await fireEvent(screen.getByTestId('survey-sheet-progress'), 'layout', {
      nativeEvent: { layout: { width: 100, height: 6, x: 0, y: 0 } },
    });
    expect(screen.getAllByTestId('survey-sheet-progress-segment')).toHaveLength(2);
    expect(screen.getAllByTestId('survey-sheet-progress-segment')[0].props.accessible).toBe(false);
    await fireEvent(screen.getByTestId('survey-sheet-progress'), 'layout', {
      nativeEvent: { layout: { width: 9, height: 6, x: 0, y: 0 } },
    });
    expect(screen.queryByTestId('survey-sheet-progress-segment')).toBeNull();
    expect(screen.getByTestId('survey-sheet-progress-fill').props.accessible).toBe(false);
  }, 15_000);

  test('keeps a long question and option copy inside the shrinkable scroll region', async () => {
    const longQuestion = {
      id: 'long-q',
      type: 'single_choice' as const,
      text: 'Какой очень подробный сценарий ежедневного обучения помогает тебе сохранять темп даже в особенно загруженные дни?',
      options: [{ id: 'long-a', label: 'Короткое задание с подробным объяснением, примерами и возможностью вернуться к нему позже' }],
    };
    const longLaunch = { ...launch, survey: { ...launch.survey, questions: [longQuestion] } };
    mockUseSurveyFlowController.mockReturnValue(editingFlow({
      currentQuestion: longQuestion,
      answers: { 'long-q': { optionId: 'long-a' } },
      isLastStep: true,
    }));
    const screen = await render(<SurveySheetModal visible launch={longLaunch} onClose={jest.fn()} />);
    const scroll = within(screen.getByTestId('survey-sheet-scroll'));

    expect(scroll.getByRole('header', { name: longQuestion.text })).toBeTruthy();
    expect(scroll.getByRole('radio', { name: longQuestion.options[0].label })).toBeTruthy();
  });

  test('crossfades old and new questions concurrently within one LUM content duration', async () => {
    const screen = await render(
      <SurveyQuestionTransition transitionKey="q1" direction="forward"><Text>Question one</Text></SurveyQuestionTransition>,
    );
    mockWithTiming.mockClear();
    mockDeferTimingCallbacks = true;

    await screen.rerender(
      <SurveyQuestionTransition transitionKey="q2" direction="forward"><Text>Question two</Text></SurveyQuestionTransition>,
    );

    expect(screen.getByText('Question one', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Question two')).toBeTruthy();
    expect(mockWithTiming).toHaveBeenCalledTimes(1);
    expect(mockWithTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: 260 }), expect.any(Function));

    await act(async () => { mockTimingCallbacks.splice(0).forEach((callback) => callback(true)); });
    expect(screen.queryByText('Question one')).toBeNull();
    expect(screen.getByText('Question two')).toBeTruthy();
  });

  test('coalesces rapid keys to the latest crossfade without publishing a stale frame', async () => {
    const screen = await render(
      <SurveyQuestionTransition transitionKey="q1" direction="forward"><Text>Question one</Text></SurveyQuestionTransition>,
    );
    mockDeferTimingCallbacks = true;
    await screen.rerender(
      <SurveyQuestionTransition transitionKey="q2" direction="forward"><Text>Question two</Text></SurveyQuestionTransition>,
    );
    await screen.rerender(
      <SurveyQuestionTransition transitionKey="q3" direction="forward"><Text>Question three</Text></SurveyQuestionTransition>,
    );

    expect(screen.queryByText('Question one', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText('Question two', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Question three')).toBeTruthy();
    await act(async () => { mockTimingCallbacks.splice(0).forEach((callback) => callback(true)); });
    expect(screen.queryByText('Question two', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText('Question three')).toBeTruthy();
  });

  test('exposes 44px radio options, selected state, and gated next action', async () => {
    const flow = editingFlow({ currentAnswered: false, answers: {} });
    mockUseSurveyFlowController.mockReturnValue(flow);
    const screen = await render(<SurveySheetModal visible launch={launch} onClose={jest.fn()} />);
    const firstOption = screen.getByRole('radio', { name: 'Короткие задания' });

    expect(StyleSheet.flatten(firstOption.props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(firstOption.props.accessibilityState).toEqual(expect.objectContaining({ selected: false, disabled: false }));
    expect(firstOption.props.variant).toBe('card');
    await fireEvent.press(firstOption);
    expect(flow.pickOption).toHaveBeenCalledWith('q1', 'a');
    expect(screen.getByTestId('survey-sheet-cta').props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));

    const readyFlow = editingFlow();
    mockUseSurveyFlowController.mockReturnValue(readyFlow);
    await screen.unmount();
    const readyScreen = await render(<SurveySheetModal visible launch={launch} onClose={jest.fn()} />);
    expect(readyScreen.getByRole('radio', { name: 'Короткие задания' }).props.accessibilityState.selected).toBe(true);
    expect(StyleSheet.flatten(readyScreen.getByRole('radio', { name: 'Короткие задания' }).props.style).backgroundColor).toBe('#222');
    expect(StyleSheet.flatten(readyScreen.getByTestId('survey-option-a-tone').props.style).backgroundColor).toBe('rgba(139, 92, 246, 0.16)');
    expect(readyScreen.getByTestId('ionicon-radio-button-on', { includeHiddenElements: true }).props.color).toBe('#B98CFF');
    await fireEvent.press(readyScreen.getByRole('button', { name: 'Дальше' }));
    expect(readyFlow.goNext).toHaveBeenCalledTimes(1);
    expect(readyScreen.getByTestId('survey-sheet-cta-label').props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ color: '#07110A' }),
    ]));
  });

  test('keeps the selected purple tone and radio readable on a light theme', async () => {
    mockThemeMode = 'sagePorcelain';
    const screen = await render(<SurveySheetModal visible launch={launch} onClose={jest.fn()} />);
    const selected = screen.getByRole('radio', { name: 'Короткие задания' });

    expect(StyleSheet.flatten(selected.props.style).backgroundColor).toBe('#F0F4EF');
    expect(StyleSheet.flatten(screen.getByTestId('survey-option-a-tone').props.style).backgroundColor).toBe('rgba(139, 92, 246, 0.16)');
    expect(screen.getByTestId('survey-option-a-label').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#162018' })]));
    expect(screen.getByTestId('ionicon-radio-button-on', { includeHiddenElements: true }).props.color).toBe('#6D28D9');
  });

  test('routes first-step back to close and switches the final CTA to submit', async () => {
    const onClose = jest.fn();
    const firstFlow = editingFlow({ goBack: jest.fn(() => 'close') });
    mockUseSurveyFlowController.mockReturnValue(firstFlow);
    const screen = await render(<SurveySheetModal visible launch={launch} onClose={onClose} />);
    expect(screen.getByTestId('survey-sheet-back').props.accessibilityRole).toBe('button');
    await fireEvent.press(screen.getByTestId('survey-sheet-back'));
    expect(firstFlow.goBack).toHaveBeenCalledTimes(1);
    expect(mockRequestDismiss).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    const finalFlow = editingFlow({
      stepIndex: 1,
      currentQuestion: launch.survey.questions[1],
      answers: { q2: { comment: 'Добавить больше примеров и длинное пояснение.' } },
      isLastStep: true,
      setComment: jest.fn(),
    });
    mockUseSurveyFlowController.mockReturnValue(finalFlow);
    await screen.unmount();
    const finalScreen = await render(<SurveySheetModal visible launch={launch} onClose={onClose} />);
    const finalScroll = within(finalScreen.getByTestId('survey-sheet-scroll'));
    expect(finalScroll.getByDisplayValue('Добавить больше примеров и длинное пояснение.')).toBeTruthy();
    await fireEvent.changeText(finalScreen.getByTestId('survey-question-comment'), 'Новый полный ответ');
    expect(finalFlow.setComment).toHaveBeenCalledWith('q2', 'Новый полный ответ');
    await fireEvent.press(finalScreen.getByRole('button', { name: 'Отправить' }));
    expect(finalFlow.goNext).toHaveBeenCalledTimes(1);
  });

  test('keeps the answered question visible and suppresses +1 while submission is pending', async () => {
    mockUseSurveyFlowController.mockReturnValue(editingFlow({
      submission: { phase: 'optimistic-reward', attemptId: 1, expectedReward: 1, confirmedReward: 0, messageKey: null },
      submitting: true,
      isLastStep: true,
    }));
    const screen = await render(<SurveySheetModal visible launch={launch} onClose={jest.fn()} />);

    expect(screen.getByTestId('survey-question-title')).toHaveTextContent('Что помогает учиться?');
    expect(screen.queryByTestId('survey-reward-panel')).toBeNull();
    expect(screen.queryByTestId('survey-reward-amount')).toBeNull();
    expect(screen.getByTestId('survey-sheet-cta').props.accessibilityLabel).toBe('Отправляю…');
    expect(screen.getByTestId('survey-sheet-cta').props.accessibilityState).toEqual(expect.objectContaining({
      disabled: true,
      busy: true,
    }));
    expect(screen.getByTestId('survey-sheet-cta').props.busy).toBe(true);
    expect(screen.getByTestId('survey-sheet-cta-label')).toHaveTextContent('Отправляю…');
    const liveOwners = collectLiveRegionOwners(screen.toJSON());
    expect(liveOwners).toHaveLength(1);
    expect(liveOwners[0].props.testID).toBe('survey-sheet-cta');
    expect(liveOwners[0].props.accessibilityLiveRegion).toBe('polite');
  });

  test('deactivates at the first dismiss request while pending and coalesces duplicate close paths', async () => {
    const flow = editingFlow({
      submission: { phase: 'optimistic-reward', attemptId: 1, expectedReward: 1, confirmedReward: 0, messageKey: null },
      submitting: true,
      isLastStep: true,
    });
    mockUseSurveyFlowController.mockReturnValue(flow);
    const onClose = jest.fn();
    const screen = await render(<SurveySheetModal visible launch={launch} onClose={onClose} />);

    await fireEvent.press(screen.getByTestId('survey-sheet-accessible-close'));
    await fireEvent.press(screen.getByTestId('survey-sheet-accessible-close'));

    expect(flow.deactivate).toHaveBeenCalledTimes(1);
    expect(mockRequestDismiss).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByTestId('survey-reward-amount')).toBeNull();

    await act(async () => {
      mockCompleteDismiss?.();
      mockCompleteDismiss?.();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('remounts a fresh flow after hide and lets the reopened sheet answer and close again', async () => {
    const firstFlow = editingFlow();
    const reopenedFlow = editingFlow({ answers: {}, currentAnswered: false });
    mockUseSurveyFlowController
      .mockReturnValueOnce(firstFlow)
      .mockReturnValueOnce(reopenedFlow);
    const screen = await render(<SurveySheetModal visible launch={launch} onClose={jest.fn()} />);

    expect(screen.getByRole('radio', { name: 'Короткие задания' }).props.accessibilityState.selected).toBe(true);
    await screen.rerender(<SurveySheetModal visible={false} launch={launch} onClose={jest.fn()} />);
    expect(firstFlow.deactivate).toHaveBeenCalledTimes(1);

    await screen.rerender(<SurveySheetModal visible launch={launch} onClose={jest.fn()} />);
    expect(mockUseSurveyFlowController).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('radio', { name: 'Короткие задания' }).props.accessibilityState.selected).toBe(false);
    await fireEvent.press(screen.getByRole('radio', { name: 'Короткие задания' }));
    expect(reopenedFlow.pickOption).toHaveBeenCalledWith('q1', 'a');
    await fireEvent.press(screen.getByTestId('survey-sheet-close'));
    expect(reopenedFlow.deactivate).toHaveBeenCalledTimes(1);
    expect(mockRequestDismiss).toHaveBeenCalledTimes(1);
  });

  test('keeps explicit localized 48px back and close targets inside the modal subtree', async () => {
    const flow = editingFlow({
      stepIndex: 1,
      currentQuestion: launch.survey.questions[1],
      answers: { q2: { comment: 'Готово' } },
      isLastStep: true,
    });
    mockUseSurveyFlowController.mockReturnValue(flow);
    const screen = await render(<SurveySheetModal visible launch={launch} onClose={jest.fn()} />);
    const back = screen.getByTestId('survey-sheet-back');
    const close = screen.getByTestId('survey-sheet-close');

    expect(StyleSheet.flatten(back.props.style).minHeight).toBeGreaterThanOrEqual(48);
    expect(StyleSheet.flatten(back.props.style).minWidth).toBeGreaterThanOrEqual(48);
    expect(close.props.accessibilityLabel).toBe('Закрыть опрос');
    expect(StyleSheet.flatten(close.props.style).minHeight).toBeGreaterThanOrEqual(48);
    expect(StyleSheet.flatten(close.props.style).minWidth).toBeGreaterThanOrEqual(48);
    expect(screen.getByTestId('ionicon-close', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
    await fireEvent.press(close);
    expect(flow.deactivate).toHaveBeenCalledTimes(1);
    expect(mockRequestDismiss).toHaveBeenCalledTimes(1);
  });

  test('moves accessibility focus to the sheet title on entry and to the next question after navigation', async () => {
    const flow = editingFlow();
    mockUseSurveyFlowController.mockReturnValue(flow);
    const screen = await render(<SurveySheetModal visible launch={launch} onClose={jest.fn()} />);

    expect(mockSetAccessibilityFocus).toHaveBeenCalledWith(73);
    mockSetAccessibilityFocus.mockClear();
    Object.assign(flow, {
      stepIndex: 1,
      currentQuestion: launch.survey.questions[1],
      answers: { q1: { optionId: 'a' }, q2: { comment: '' } },
      currentAnswered: false,
      isLastStep: true,
    });
    await screen.rerender(<SurveySheetModal visible launch={launch} onClose={jest.fn()} />);

    expect(mockSetAccessibilityFocus).toHaveBeenCalledWith(73);
  });

  test('delegates haptics to the controller or shell so one action cannot vibrate twice', async () => {
    const screen = await render(<SurveySheetModal visible launch={launch} onClose={jest.fn()} />);

    expect(screen.getByTestId('survey-sheet-back').props.withHaptic).toBe(false);
    expect(screen.getByTestId('survey-sheet-close').props.withHaptic).toBe(false);
    expect(screen.getByRole('radio', { name: 'Короткие задания' }).props.withHaptic).toBe(false);
    expect(screen.getByTestId('survey-sheet-cta').props.withHaptic).toBe(false);
  });

  test.each([
    ['reconciled', null, 'survey-reward-shard-asset'],
    ['retryable-error', 'network', 'survey-retry'],
    ['retryable-error', 'account_changed', 'survey-back'],
  ] as const)('keeps %s/%s feedback inside the same shell', async (phase, messageKey, expectedTestID) => {
    mockUseSurveyFlowController.mockReturnValue(editingFlow({
      submission: {
        phase,
        attemptId: 1,
        expectedReward: phase === 'optimistic-reward' ? 1 : 0,
        confirmedReward: phase === 'reconciled' ? 1 : 0,
        messageKey,
      },
    }));
    const screen = await render(<SurveySheetModal visible launch={launch} onClose={jest.fn()} />);
    expect(screen.getAllByTestId('survey-sheet-shell')).toHaveLength(1);
    expect(screen.getByTestId('survey-reward-panel')).toBeTruthy();
    const feedbackScroll = within(screen.getByTestId('survey-feedback-scroll'));
    expect(feedbackScroll.getByTestId(expectedTestID)).toBeTruthy();
    expect(screen.getByTestId('survey-sheet-close').props.accessibilityLabel).toBe('Закрыть опрос');
    expect(screen.queryByTestId('survey-sheet-scroll')).toBeNull();
    const liveOwners = collectLiveRegionOwners(screen.toJSON());
    expect(liveOwners).toHaveLength(1);
    expect(screen.getByTestId('survey-feedback-scroll').props.accessibilityLiveRegion).toBeUndefined();
    if (phase === 'retryable-error') {
      expect(screen.getByTestId('survey-reward-error').props.accessibilityLiveRegion).toBe('assertive');
      expect(liveOwners[0].props.testID).toBe('survey-reward-error');
      expect(screen.queryByTestId('survey-reward-amount')).toBeNull();
      expect(screen.queryByTestId('survey-reward-shard-asset')).toBeNull();
    } else {
      expect(screen.getByTestId('survey-reward-panel').props.accessibilityLiveRegion).toBe('polite');
      expect(liveOwners[0].props.testID).toBe('survey-reward-panel');
      expect(screen.getByTestId('ionicon-checkmark-circle', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
      expect(screen.getByTestId('survey-reward-shard-asset').props.accessible).toBe(false);
    }
    if (messageKey === 'account_changed') {
      expect(screen.getByTestId('survey-retry').props.accessibilityState.disabled).toBe(true);
      await fireEvent.press(screen.getByTestId('survey-back'));
      expect(mockRequestDismiss).toHaveBeenCalledTimes(1);
    }
  });

  test('coalesces reward Done and controller auto-return through one shell dismissal animation', async () => {
    mockUseSurveyFlowController.mockImplementation(({ onReconciled }: any) => editingFlow({
      submission: { phase: 'reconciled', attemptId: 1, expectedReward: 1, confirmedReward: 1, messageKey: null },
      testOnlyOnReconciled: onReconciled,
    }));
    const onClose = jest.fn();
    const screen = await render(<SurveySheetModal visible launch={launch} onClose={onClose} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Готово' }));
    expect(mockRequestDismiss).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    const controllerInput = mockUseSurveyFlowController.mock.calls.at(-1)?.[0] as { onReconciled: () => void };
    await act(() => controllerInput.onReconciled());
    expect(mockRequestDismiss).toHaveBeenCalledTimes(1);
  });

  test('keeps a stable high inner frame across long editing and reward content', async () => {
    const editing = await render(<SurveySheetModal visible launch={launch} onClose={jest.fn()} />);
    expect(mockShellProps.sheetHeight).toBe('86%');
    expect(StyleSheet.flatten(editing.getByTestId('survey-sheet-content').props.style)).toEqual(expect.objectContaining({ flex: 1, minHeight: 0 }));
    expect(editing.getByTestId('survey-sheet-scroll')).toBeTruthy();
    expect(StyleSheet.flatten(editing.getByTestId('survey-sheet-scroll').props.style).minHeight).toBe(0);
    expect(within(editing.getByTestId('survey-sheet-scroll')).queryByTestId('survey-sheet-cta')).toBeNull();
    await editing.unmount();

    mockUseSurveyFlowController.mockReturnValue(editingFlow({
      submission: { phase: 'reconciled', attemptId: 1, expectedReward: 1, confirmedReward: 1, messageKey: null },
    }));
    const reward = await render(<SurveySheetModal visible launch={launch} onClose={jest.fn()} />);
    expect(StyleSheet.flatten(reward.getByTestId('survey-sheet-content').props.style)).toEqual(expect.objectContaining({ flex: 1, minHeight: 0 }));
    expect(StyleSheet.flatten(reward.getByTestId('survey-feedback-scroll').props.style)).toEqual(expect.objectContaining({ flex: 1, minHeight: 0 }));

    const shellSource = fs.readFileSync(path.join(ROOT, 'components/modal_fx/HybridSheetShell.tsx'), 'utf8');
    expect(shellSource).toContain("maxHeight: '86%'");
    expect(shellSource).toContain('sheetHeight?: DimensionValue');
    expect(shellSource).toContain('height: sheetHeight');
    expect(shellSource).toContain('paddingBottom: 20 + Math.max(bottomInset, keyboardBottomInset)');
    expect(shellSource).not.toMatch(/(?:withTiming|withSpring)\([^)]*(?:height|width)/);
    expect(shellSource).toContain('onDismissRequested?: () => void;');
    const shellDismiss = shellSource.slice(
      shellSource.indexOf('const dismissSheet = useCallback'),
      shellSource.indexOf('const panGesture = useMemo'),
    );
    expect(shellDismiss.indexOf('if (dismissRequestedRef.current || dismissCompletedRef.current) return;'))
      .toBeLessThan(shellDismiss.indexOf('onDismissRequested?.();'));
    expect(shellDismiss.indexOf('onDismissRequested?.();')).toBeLessThan(shellDismiss.indexOf('hapticTap();'));
    const sheetSource = fs.readFileSync(path.join(ROOT, 'components/survey/SurveySheetModal.tsx'), 'utf8');
    expect(sheetSource).not.toContain('useWindowDimensions');
    expect(sheetSource).not.toContain('keyboardBottomInset');
    expect(sheetSource).toContain('sheetHeight="86%"');
  });

  test('keeps 300-character editing and feedback copy reachable in one scroll per branch', async () => {
    const longTitle = 'О'.repeat(300);
    const longSubtitle = 'Подробности сохранения ответа. '.repeat(12);
    const longLaunch = {
      ...launch,
      survey: { ...launch.survey, title: longTitle, finalSubtitle: longSubtitle },
    };
    const editing = await render(<SurveySheetModal visible launch={longLaunch} onClose={jest.fn()} />);
    const editingScroll = within(editing.getByTestId('survey-sheet-scroll'));
    expect(editingScroll.getByRole('header', { name: longTitle })).toBeTruthy();
    expect(editing.queryByTestId('survey-feedback-scroll')).toBeNull();
    expect(editing.getAllByTestId(/survey-(?:sheet|feedback)-scroll$/)).toHaveLength(1);
    await editing.unmount();

    mockUseSurveyFlowController.mockReturnValue(editingFlow({
      submission: { phase: 'reconciled', attemptId: 1, expectedReward: 1, confirmedReward: 1, messageKey: null },
    }));
    const completed = await render(<SurveySheetModal visible launch={longLaunch} onClose={jest.fn()} />);
    const completedScroll = within(completed.getByTestId('survey-feedback-scroll'));
    expect(completedScroll.getByRole('header', { name: longTitle })).toBeTruthy();
    expect(completedScroll.getByText(longSubtitle)).toBeTruthy();
    expect(completedScroll.getByRole('button', { name: 'Готово' })).toBeTruthy();
    expect(completedScroll.queryByTestId('survey-sheet-close')).toBeNull();
    expect(completed.getByTestId('survey-sheet-close')).toBeTruthy();
    expect(completed.queryByTestId('survey-sheet-scroll')).toBeNull();
    await completed.unmount();

    mockUseSurveyFlowController.mockReturnValue(editingFlow({
      submission: { phase: 'retryable-error', attemptId: 1, expectedReward: 0, confirmedReward: 0, messageKey: 'network' },
    }));
    const failed = await render(<SurveySheetModal visible launch={longLaunch} onClose={jest.fn()} />);
    const failedScroll = within(failed.getByTestId('survey-feedback-scroll'));
    expect(failedScroll.getByRole('header', { name: longTitle })).toBeTruthy();
    expect(failedScroll.getByRole('alert')).toBeTruthy();
    expect(failedScroll.getByRole('button', { name: 'Повторить' })).toBeTruthy();
    expect(failedScroll.queryByTestId('survey-sheet-close')).toBeNull();
    expect(failed.getByTestId('survey-sheet-close')).toBeTruthy();
  });

  test('keeps progress and reward motion lightweight and token-driven', () => {
    const transition = fs.readFileSync(path.join(ROOT, 'components/survey/SurveyQuestionTransition.tsx'), 'utf8');
    const impact = fs.readFileSync(path.join(ROOT, 'components/survey/useSurveyRewardImpact.ts'), 'utf8');
    const sheet = fs.readFileSync(path.join(ROOT, 'components/survey/SurveySheetModal.tsx'), 'utf8');
    const combined = `${transition}\n${impact}\n${sheet}`;

    expect(transition).toContain('SURVEY_HYBRID.questionShiftPx');
    expect(transition.match(/progress\.value = withTiming/g)).toHaveLength(1);
    expect(impact).toContain('SURVEY_HYBRID.rewardLiftPx');
    expect(impact).toContain('SURVEY_HYBRID.rewardStartScale');
    expect(impact).toContain('CHK.fallMs');
    expect(impact).not.toContain('1 / SURVEY_HYBRID.rewardStartScale');
    expect(sheet).toContain('requestDismiss');
    expect(sheet).not.toContain('requestDismissRef.current');
    expect(sheet).toContain('onDismissRequested={deactivateActiveFlow}');
    expect(sheet).toContain('registerDeactivate={registerDeactivate}');
    expect(sheet).toContain('shellRequestDismiss={requestDismiss}');
    expect(sheet).toContain("phase === 'reconciled'");
    expect(sheet).not.toContain("phase !== 'editing'");
    expect(sheet).toContain("variant=\"card\"");
    expect(combined).not.toMatch(/withRepeat|setInterval|SoundDirector|\brings?\b|\bdust\b/i);
    expect(sheet).not.toMatch(/Animated\.(?:timing|spring)[\s\S]{0,120}(?:width|height)/);
    expect(sheet).toContain('transform: [{ scaleX:');
  });
});

test('RNTL config discovers the survey sheet suite exactly once', () => {
  const config = fs.readFileSync(path.join(ROOT, 'jest.rntl.config.cjs'), 'utf8');
  expect(config.match(/survey_sheet_modal\.test\.tsx/g)).toHaveLength(1);
});
