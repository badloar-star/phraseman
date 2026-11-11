import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import MistakeBreakdownView from '../components/MistakeBreakdownView';
import type { MistakeBreakdown } from '../app/mistake_breakdown_model';

jest.unmock('react-native');

jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      wrong: '#ff0000',
      correct: '#00ff00',
      wrongBg: '#330000',
      correctBg: '#003300',
      accentText: '#0000ff',
      textPrimary: '#111111',
    },
    liquidGlassThemeId: 'graphite',
  }),
}));

jest.mock('../constants/i18n', () => ({
  triLang: (lang: string, copy: Record<string, string>) => copy[lang] ?? copy.ru,
}));

jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));

const base: MistakeBreakdown = {
  verdict: 'one',
  wrong: 'some',
  right: 'any',
  rule: 'Когда чего-то нет — "any"',
  why: 'Почти! "some" говорят, когда что-то есть.',
  youSaid: '',
  pair: ['I have some money', "I don't have any money"],
  also: [],
  simple: 'Нет денег — "any".',
};

const sentences = { userAnswer: "I don't have some money", targetAnswer: "I don't have any money." };

function flat(node: { props: { style?: unknown } }) {
  return StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;
}

describe('MistakeBreakdownView', () => {
  it('shows the slip as one struck word next to the right one, not a struck sentence', async () => {
    const view = await render(<MistakeBreakdownView lang={'ru' as never} breakdown={base} {...sentences} />);

    // Те же слова повторяются в пояснении — ищем именно во фразе.
    const sentence = within(view.getByTestId('mistake-breakdown-sentence'));
    const wrong = sentence.getByText('some', { exact: true });
    const right = sentence.getByText('any', { exact: true });
    expect(flat(wrong)).toMatchObject({ color: '#ff0000', textDecorationLine: 'line-through' });
    expect(flat(right)).toMatchObject({ color: '#00ff00' });
    expect(flat(right).textDecorationLine).toBeUndefined();
    expect(flat(view.getByTestId('mistake-breakdown-sentence')).textDecorationLine).toBeUndefined();
    // Правило и пояснение — отдельными блоками; кавычки вокруг слов курса не печатаются.
    expect(view.getByTestId('mistake-breakdown-rule')).toHaveTextContent('Когда чего-то нет — any');
    expect(view.getByTestId('mistake-breakdown-why')).toHaveTextContent('Почти! some говорят, когда что-то есть.');
    expect(view.getByTestId('mistake-breakdown-pair')).toHaveTextContent("I have some moneyI don't have any money");
    expect(view.queryByTestId('mistake-breakdown-you-said')).toBeNull();
    expect(view.queryByTestId('mistake-breakdown-also')).toBeNull();
  });

  it('never strikes the answer when the AI says there is no mistake', async () => {
    const view = await render(
      <MistakeBreakdownView
        lang={'ru' as never}
        breakdown={{ ...base, verdict: 'no_mistake', wrong: '', right: '', rule: 'Всё верно', why: 'У тебя всё правильно.', pair: [] }}
        userAnswer="I do not like it"
        targetAnswer="I don't like it"
      />,
    );

    expect(view.getByTestId('mistake-breakdown-correct')).toHaveTextContent('I do not like it');
    expect(view.queryByTestId('mistake-breakdown-sentence')).toBeNull();
    expect(flat(view.getByTestId('mistake-breakdown-rule'))).toMatchObject({ color: '#00ff00' });
    expect(JSON.stringify(view.toJSON())).not.toContain('line-through');
  });

  it('falls back to two plain sentences when the server could not point at a word', async () => {
    const view = await render(
      <MistakeBreakdownView lang={'ru' as never} breakdown={{ ...base, wrong: '', right: '' }} {...sentences} />,
    );

    expect(view.getByTestId('mistake-breakdown-plain')).toHaveTextContent(
      "I don't have some moneyI don't have any money.",
    );
    expect(JSON.stringify(view.toJSON())).not.toContain('line-through');
  });

  it('lists the other differences when present', async () => {
    const view = await render(
      <MistakeBreakdownView
        lang={'ru' as never}
        breakdown={{ ...base, verdict: 'several', also: [{ wrong: 'dont', right: "don't" }] }}
        {...sentences}
      />,
    );

    expect(view.getByTestId('mistake-breakdown-also')).toHaveTextContent("Ещё: dont → don't");
  });

  // Владелец 11.11: «разбор не должен показывать ошибки… юзеры поверят и будут думать что там правильно».
  it('never translates the wrong sentence and never lists it among the examples', async () => {
    const view = await render(
      <MistakeBreakdownView
        lang={'ru' as never}
        breakdown={{
          ...base,
          wrong: 'earns',
          right: 'early',
          rule: '"early" — это про время',
          why: '"earns" значит зарабатывает. А тебе нужно "early".',
          youSaid: 'Мы зарабатываем.',
          pair: ['We are earns', 'We are early'],
        }}
        userAnswer="We are earns"
        targetAnswer="We are early"
      />,
    );

    expect(view.queryByTestId('mistake-breakdown-you-said')).toBeNull();
    expect(view.queryByTestId('mistake-breakdown-pair')).toBeNull();
    expect(JSON.stringify(view.toJSON())).not.toContain('Мы зарабатываем');
    // Сама фраза остаётся: неверное слово зачёркнуто, рядом верное.
    const sentence = within(view.getByTestId('mistake-breakdown-sentence'));
    expect(flat(sentence.getByText('earns', { exact: true }))).toMatchObject({ textDecorationLine: 'line-through' });
  });
});

describe('mistake breakdown card wiring (source contract)', () => {
  const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

  it('the card draws fields when it has them and keeps the text rows otherwise', async () => {
    const card = read('components/AiMistakeCard.tsx');
    expect(card).toContain('isReadyExplanation && breakdown && !fallback ? (');
    expect(card).toContain('<MistakeBreakdownView');
    expect(card).toContain('LearningSemanticGroup');
  });

  it('the hook exposes fields only for the text they arrived with, and the lesson passes them on', async () => {
    const hook = read('app/use_mistake_explain.ts');
    expect(hook).toContain('breakdownForText.text === aiMistakeText');
    expect(hook).toContain('!aiMistakeFallback && breakdownForText !== null');
    expect(read('app/lesson1.tsx')).toContain('breakdown={mistakeExplain.aiMistakeBreakdown}');
  });

  it('follows the owner design bans: no outlined containers, no font shrinking', async () => {
    const view = read('components/MistakeBreakdownView.tsx');
    expect(view).not.toContain('borderWidth');
    expect(view).not.toContain('borderColor');
    expect(view).not.toContain('adjustsFontSizeToFit');
  });
});
