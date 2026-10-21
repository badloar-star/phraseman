// зачем (владелец 21.10, эталон docs/design/v2-app/peak-phrase-builder.html, вариант A): «Собери перевод» в Пике —
// ячейки по числу слов, слова переставляются, проверка только по кнопке «Проверить» (автоотправки нет),
// после ошибки неверные ячейки подсвечены, кнопки «Проверить» уже нет.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style },
}));
jest.mock('../components/v2/V2Pressable', () => {
  const R = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ children, onPress, disabled, testID, style, accessibilityLabel }: Record<string, unknown>) =>
      R.createElement('Pressable', { onPress: disabled ? undefined : onPress, testID, style, accessibilityLabel, accessibilityState: { disabled } }, children),
  };
});
jest.mock('../components/learning-v2/LearningV2Glass', () => ({ lv2Alpha: (c: string, a: number) => `${c}/${a}` }));
jest.mock('../components/spire/useSpirePalette', () => ({
  useSpirePalette: () => ({
    card: 'card', cardRaised: 'raised', control: 'control', cta: 'cta', ctaText: 'ctaText', correct: 'correct', wrong: 'wrong',
    text: 'text', textSecondary: 'sec', textMuted: 'muted', divider: 'divider',
  }),
}));
jest.mock('../components/spire/useSpireShadow', () => ({ useSpireShadow: () => ({ nested: {}, plate: {}, action: () => ({}) }) }));
jest.mock('../hooks/use-audio', () => ({ useAudio: () => ({ speak: jest.fn(), stop: jest.fn() }) }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../modules/spire/listen_audio', () => ({ resolveSpireListenAudio: jest.fn() }));
jest.mock('../components/spire/SpirePairsBoard', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/spire/spire_oddity_prompt', () => ({ localizeSpireOddityPrompt: (s: string) => s }));

import SpireTaskView from '../components/spire/SpireTaskView';

const BANK = ['am', 'sure', 'I', 'not', 'is'];
const TASK = { taskId: 't-1', kind: 'translate', mode: 'translate_build', payload: { phrase: 'Я не уверен.', wordBank: BANK, correctTokenCount: 4 } };

type Fb = Readonly<{ taskIndex: number; ok: boolean; picked: null; itemIndex: null; correctIndex: null; correctText: string | null; mistakeSaved: null }>;

function tree(over: { disabled?: boolean; feedback?: Fb | null; onTokens?: jest.Mock } = {}) {
  return (
    <SpireTaskView
      lang="ru"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      task={TASK as any}
      feedback={over.feedback ?? null}
      disabled={over.disabled ?? false}
      onChoice={jest.fn()}
      onTokens={over.onTokens ?? jest.fn()}
      onItems={jest.fn()}
    />
  );
}
const tap = async (id: string) => { await fireEvent.press(screen.getByTestId(id)); };
const flat = (style: unknown): Record<string, unknown> => ([style] as unknown[]).flat(4).filter(Boolean).reduce<Record<string, unknown>>((a, b) => ({ ...a, ...(b as object) }), {});

describe('Spire build task: cells and the «Проверить» button', () => {
  beforeEach(() => { jest.spyOn(console, 'warn').mockImplementation(() => undefined); jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('shows one numbered cell per word of the answer and a disabled «Проверить»', async () => {
    await render(tree());
    for (let i = 0; i < 4; i += 1) expect(screen.getByTestId(`spire-cell-${i}`)).toBeTruthy();
    expect(screen.queryByTestId('spire-cell-4')).toBeNull();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByTestId('spire-build-check').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText('0 из 4 слов')).toBeTruthy();
  });

  it('does NOT auto-submit when the last cell is filled; submits the cell order only on «Проверить»', async () => {
    const onTokens = jest.fn();
    await render(tree({ onTokens }));
    await tap('spire-word-2'); // I
    await tap('spire-word-0'); // am
    await tap('spire-word-3'); // not
    expect(screen.getByTestId('spire-build-check').props.accessibilityState.disabled).toBe(true);
    await tap('spire-word-1'); // sure
    expect(onTokens).not.toHaveBeenCalled();
    expect(screen.getByTestId('spire-build-check').props.accessibilityState.disabled).toBe(false);
    expect(screen.getByText('Можно переставить: тап по слову вернёт его')).toBeTruthy();
    await tap('spire-build-check');
    expect(onTokens).toHaveBeenCalledTimes(1);
    expect(onTokens).toHaveBeenCalledWith(['I', 'am', 'not', 'sure']);
  });

  it('tapping a word in a cell returns it to the bank; the next word goes into that hole (reorder)', async () => {
    const onTokens = jest.fn();
    await render(tree({ onTokens }));
    await tap('spire-word-2'); // I → 1
    await tap('spire-word-4'); // is → 2 (ошибочно)
    await tap('spire-word-3'); // not → 3
    await tap('spire-word-1'); // sure → 4
    await fireEvent.press(within(screen.getByTestId('spire-cell-1')).getByLabelText('is')); // вернули «is» в банк
    expect(screen.getByTestId('spire-build-check').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('spire-word-4').props.accessibilityState.disabled).toBe(false);
    await tap('spire-word-0'); // am → в дырку номер 2
    await tap('spire-build-check');
    expect(onTokens).toHaveBeenCalledWith(['I', 'am', 'not', 'sure']);
  });

  it('a word already placed cannot be placed twice', async () => {
    await render(tree());
    await tap('spire-word-2');
    await tap('spire-word-2');
    expect(screen.getByText('1 из 4 слов')).toBeTruthy();
  });

  it('does nothing while disabled', async () => {
    const onTokens = jest.fn();
    await render(tree({ disabled: true, onTokens }));
    await tap('spire-word-2');
    expect(screen.getByText('0 из 4 слов')).toBeTruthy();
    await tap('spire-build-check');
    expect(onTokens).not.toHaveBeenCalled();
  });

  it('after a wrong answer the wrong cell is tinted red, right ones green, and «Проверить» is gone', async () => {
    const view = await render(tree());
    await tap('spire-word-2'); await tap('spire-word-4'); await tap('spire-word-3'); await tap('spire-word-1'); // I is not sure
    const feedback: Fb = { taskIndex: 0, ok: false, picked: null, itemIndex: null, correctIndex: null, correctText: 'I am not sure', mistakeSaved: null };
    await view.rerender(tree({ disabled: true, feedback }));
    const fill = (cell: number, label: string) => flat(within(screen.getByTestId(`spire-cell-${cell}`)).getByLabelText(label).props.style).backgroundColor;
    expect(fill(0, 'I')).toBe('correct/0.18');
    expect(fill(1, 'is')).toBe('wrong/0.18');
    expect(fill(2, 'not')).toBe('correct/0.18');
    expect(screen.queryByTestId('spire-build-check')).toBeNull();
    expect(screen.queryByTestId('spire-build-count')).toBeNull();
  });
});

describe('Spire build task wiring', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
  it('no auto-submit on the last word, no bordered containers, text is never shrunk', () => {
    const view = read('components/spire/SpireTaskView.tsx');
    expect(view).not.toMatch(/next\.length === need/);
    expect(view).not.toMatch(/borderWidth|borderColor|adjustsFontSizeToFit/);
    expect(view).toContain("'[SPIRE] build: place ignored");
    expect(view).toContain("'[SPIRE] build: check ignored");
  });
  it('every language has the three new strings with the same placeholders', () => {
    const src = read('components/spire/spire_game_strings.ts');
    for (const key of ['check', 'buildCount', 'buildReorder']) expect(src).toMatch(new RegExp(`\\n  ${key}: \\[`));
  });
});
