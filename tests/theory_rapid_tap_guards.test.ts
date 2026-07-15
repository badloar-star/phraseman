import React from 'react';
import { StyleSheet } from 'react-native';
import { act, cleanup, render } from '@testing-library/react-native';
import ThreeTileChoice from '../components/theory/ThreeTileChoice';
import WordBankBuilder from '../components/theory/WordBankBuilder';

jest.mock('react-native', () => ({
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    flatten: (style: unknown) => Array.isArray(style)
      ? Object.assign({}, ...style.filter(Boolean))
      : style,
  },
  Text: 'Text',
  View: 'View',
}));

jest.mock('../components/TapScale', () => {
  const RuntimeReact = jest.requireActual<typeof import('react')>('react');
  const MockTapScale = (props: Record<string, unknown> & { children?: React.ReactNode }) =>
    RuntimeReact.createElement('TapScale', props, props.children);
  return { __esModule: true, default: MockTapScale, MockTapScale };
});

jest.mock('../hooks/use-haptics', () => ({
  hapticError: jest.fn(),
  hapticSuccess: jest.fn(),
  hapticTap: jest.fn(),
}));

const findTap = (
  view: Awaited<ReturnType<typeof render>>,
  label: string,
) => view.root!.queryAll((node) => node.type === 'TapScale')
  .find((node) => node.props.accessibilityLabel === label)!;

afterEach(async () => {
  await cleanup();
  jest.clearAllMocks();
});

test('a solved three-tile choice ignores another press from the same render frame', async () => {
  const onSolved = jest.fn();
  const view = await render(React.createElement(ThreeTileChoice, {
    data: { kind: 'choice', before: 'She ', after: ' ready.', options: ['is', 'are'], answer: 'is' },
    lang: 'ru',
    accent: '#B8FF00',
    theme: { textPrimary: '#fff', textMuted: '#aaa', correct: '#76FF03', wrong: '#ff5252' },
    onSolved,
  }));

  const correct = findTap(view, 'is');
  const wrong = findTap(view, 'are');
  await act(() => {
    correct.props.onPress();
    wrong.props.onPress();
  });

  expect(onSolved).toHaveBeenCalledTimes(1);
  const correctAfter = findTap(view, 'is');
  expect(StyleSheet.flatten(correctAfter.props.style).backgroundColor).toBe('#76FF03');
});

test('two word-bank choices in one frame occupy two consecutive slots', async () => {
  const onProgressChange = jest.fn();
  const view = await render(React.createElement(WordBankBuilder, {
    data: { kind: 'word_bank', prompt: { ru: 'Я здесь' }, answer: ['I', 'am'], distractors: ['are'] },
    lang: 'ru',
    accent: '#B8FF00',
    theme: { textPrimary: '#fff', textMuted: '#aaa', correct: '#76FF03', wrong: '#ff5252', bgCard: '#111' },
    onProgressChange,
  }));

  const first = findTap(view, 'I');
  const second = findTap(view, 'am');
  await act(() => {
    first.props.onPress();
    second.props.onPress();
  });

  const lastProgress = onProgressChange.mock.calls.at(-1)?.[0];
  expect(lastProgress.slots.slice(0, 2).map((slot: { word: string } | null) => slot?.word ?? null)).toEqual(['I', 'am']);
});

test('the same word-bank tile cannot be consumed twice before React rerenders', async () => {
  const onProgressChange = jest.fn();
  const view = await render(React.createElement(WordBankBuilder, {
    data: { kind: 'word_bank', prompt: { ru: 'Я здесь' }, answer: ['I', 'am'], distractors: [] },
    lang: 'ru',
    accent: '#B8FF00',
    theme: { textPrimary: '#fff', textMuted: '#aaa', correct: '#76FF03', wrong: '#ff5252', bgCard: '#111' },
    onProgressChange,
  }));

  const first = findTap(view, 'I');
  await act(() => {
    first.props.onPress();
    first.props.onPress();
  });

  expect(onProgressChange).toHaveBeenCalledTimes(1);
});
