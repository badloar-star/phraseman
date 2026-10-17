// зачем (владелец 17.10: «пары все на экране»; координатор): задание «пары» в Пике — поле всех пар двумя колонками.
// Верная пара гаснет сразу, неверная мигает и сбрасывается, двойной тап не считается, отчёт раннеру — в прежнем формате
// (выбранный вариант по каждому пункту; ошибочный пункт — неверный вариант, строгость прежняя).
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('react-native', () => {
  const R = jest.requireActual('react');
  const AnimatedView = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  class Value { constructor(public v: number) {} }
  return {
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style },
    Animated: { View: AnimatedView, Value, timing: () => ({ start: () => undefined }) },
    Easing: { out: (f: unknown) => f, quad: (t: number) => t },
  };
});
jest.mock('../components/v2/V2Pressable', () => {
  const R = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ children, onPress, disabled, testID }: Record<string, unknown>) =>
      R.createElement('Pressable', { onPress: disabled ? undefined : onPress, testID, accessibilityState: { disabled } }, children),
  };
});
jest.mock('../components/learning-v2/LearningV2Glass', () => ({ lv2Alpha: (c: string, a: number) => `${c}/${a}` }));
jest.mock('../components/spire/useSpirePalette', () => ({
  useSpirePalette: () => ({ card: 'card', accent: 'accent', correct: 'correct', wrong: 'wrong', text: 'text' }),
}));
jest.mock('../components/spire/useSpireShadow', () => ({ useSpireShadow: () => ({ nested: {}, plate: {} }) }));

import SpirePairsBoard, { spirePairsRightOrder, spirePairsWrongIndex } from '../components/spire/SpirePairsBoard';

const ITEMS = [
  { prompt: 'cat', options: ['кот', 'дом', 'вода'] },
  { prompt: 'house', options: ['вода', 'дом', 'кот'] },
  { prompt: 'water', options: ['дом', 'кот', 'вода'] },
];
const ANSWERS = [0, 1, 2];

async function setup() {
  const onItems = jest.fn();
  await render(<SpirePairsBoard taskId="t-1" items={ITEMS} answers={ANSWERS} disabled={false} onItems={onItems} />);
  return onItems;
}
const tap = async (id: string) => { await fireEvent.press(screen.getByTestId(id)); };

describe('Spire pairs board', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

  it('shows every pair at once: all left words and all right translations', async () => {
    await setup();
    for (let i = 0; i < ITEMS.length; i += 1) {
      expect(screen.getByTestId(`spire-pair-left-${i}`)).toBeTruthy();
      expect(screen.getByTestId(`spire-pair-right-${i}`)).toBeTruthy();
    }
  });

  it('all correct pairs (either tap order) → one report with the correct options', async () => {
    const onItems = await setup();
    await tap('spire-pair-left-0'); await tap('spire-pair-right-0');
    await tap('spire-pair-right-1'); await tap('spire-pair-left-1');
    await tap('spire-pair-left-2'); await tap('spire-pair-right-2');
    expect(onItems).toHaveBeenCalledTimes(1);
    expect(onItems).toHaveBeenCalledWith([0, 1, 2]);
    // поле уже сдано: повторные тапы не шлют второй отчёт
    await tap('spire-pair-left-0'); await tap('spire-pair-right-1');
    expect(onItems).toHaveBeenCalledTimes(1);
  });

  it('a wrong pair flashes, locks taps until reset, and the item reports the wrong option it was given', async () => {
    const onItems = await setup();
    await tap('spire-pair-left-0'); await tap('spire-pair-right-1'); // «cat» ↔ «дом» — неверно
    await tap('spire-pair-left-2'); await tap('spire-pair-right-2'); // во время мигания — не считается
    await act(async () => { jest.advanceTimersByTime(450); });
    await tap('spire-pair-left-0'); await tap('spire-pair-right-0');
    await tap('spire-pair-left-1'); await tap('spire-pair-right-1');
    await tap('spire-pair-left-2'); await tap('spire-pair-right-2');
    expect(onItems).toHaveBeenCalledTimes(1);
    expect(onItems).toHaveBeenCalledWith([1, 1, 2]); // «дом» у «cat» — вариант 1
  });

  it('does nothing while disabled', async () => {
    const onItems = jest.fn();
    await render(<SpirePairsBoard taskId="t-1" items={ITEMS} answers={ANSWERS} disabled onItems={onItems} />);
    for (let i = 0; i < 3; i += 1) { await tap(`spire-pair-left-${i}`); await tap(`spire-pair-right-${i}`); }
    expect(onItems).not.toHaveBeenCalled();
  });

  it('right column order is stable per task and never mirrors the left column', async () => {
    expect(spirePairsRightOrder('t-1', 6)).toEqual(spirePairsRightOrder('t-1', 6));
    expect([...spirePairsRightOrder('t-1', 6)].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    for (const id of ['a', 'b', 'c', 'match-9', 'x']) expect(spirePairsRightOrder(id, 6)).not.toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('wrong index falls back to the first wrong option when the tapped text is not among the item options', async () => {
    expect(spirePairsWrongIndex(ITEMS[0], 0, 'дом')).toBe(1);
    expect(spirePairsWrongIndex(ITEMS[0], 0, 'солнце')).toBe(1);
  });
});

describe('Spire pairs board wiring', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
  it('match tasks render the board with locally revealed answers; timeattack keeps the list', async () => {
    const view = read('components/spire/SpireTaskView.tsx');
    expect(view).toMatch(/task\.kind === 'match'\s*\?\s*<MatchTask/);
    expect(view).toContain('<SpirePairsBoard taskId={props.task.taskId}');
    expect(view).toContain("console.warn('[SPIRE-PAIRS] fallback: list'");
    const screenSrc = read('components/spire/SpireStepScreen.tsx');
    expect(screenSrc).toContain('spireRevealItemIndexes(pick.plan.saltId, task.taskId, counts, planTask.answerFingerprints)');
    expect(screenSrc).toContain('pairAnswers={pairAnswers}');
    expect(read('components/spire/SpirePairsBoard.tsx')).not.toMatch(/borderWidth|borderColor|adjustsFontSizeToFit|numberOfLines/);
  });
});
