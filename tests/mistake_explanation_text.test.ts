import { cleanMistakeExplanation } from '../app/mistake_explanation_text';

describe('cleanMistakeExplanation (сверка 15–18)', () => {
  test('убирает абзац-дубль правильного ответа и ставит «ёлочки» для ru', () => {
    const text = 'Слово "children" значит «дети», а нужно «внуки».\nGrandchildren';
    expect(cleanMistakeExplanation(text, { lang: 'ru', answers: ['Grandchildren', 'Children'] }))
      .toBe('Слово «children» значит «дети», а нужно «внуки».');
  });
  test('единственный абзац не удаляется, даже если совпал с ответом', () => {
    expect(cleanMistakeExplanation('Grandchildren', { lang: 'ru', answers: ['Grandchildren'] })).toBe('Grandchildren');
  });
  test('для языков без «ёлочек» кавычки не трогаем', () => {
    expect(cleanMistakeExplanation('Use "children" here.', { lang: 'en', answers: [] })).toBe('Use "children" here.');
  });
});
