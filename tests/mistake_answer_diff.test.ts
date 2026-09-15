import { buildMistakeAnswerDiff } from '../app/mistake_answer_diff';

// зачем (владелец 2026-09-14, макет промаха А): панель вердикта показывает
// ОБА ответа рядом и подсвечивает расхождение. Здесь сторожим сам разбор.
describe('mistake answer diff', () => {
  test('missing word shows a gap exactly where it was dropped', () => {
    const diff = buildMistakeAnswerDiff({ userAnswer: 'Where you work?', correctAnswer: 'Where do you work?' });
    expect(diff.kind).toBe('missing');
    expect(diff.missingWords).toEqual(['do']);
    expect(diff.mine.map((segment) => segment.tone)).toEqual(['plain', 'gap', 'plain', 'plain']);
    expect(diff.mine.map((segment) => segment.text)).toEqual(['Where', '', 'you', 'work?']);
    expect(diff.correct.find((segment) => segment.text === 'do')?.tone).toBe('right');
  });

  test('wrong word is marked on both sides', () => {
    const diff = buildMistakeAnswerDiff({ userAnswer: 'She likes coffee?', correctAnswer: 'Does she like coffee?' });
    expect(diff.kind).toBe('swap');
    expect(diff.wrongWords.length).toBeGreaterThan(0);
    expect(diff.mine.some((segment) => segment.tone === 'wrong')).toBe(true);
    expect(diff.correct.some((segment) => segment.tone === 'right')).toBe(true);
  });

  test('same words in another order is an order mistake, not a word mistake', () => {
    const diff = buildMistakeAnswerDiff({ userAnswer: 'You are how old', correctAnswer: 'How old are you' });
    expect(diff.kind).toBe('order');
  });

  test('an empty answer is a full miss, never an empty row', () => {
    const diff = buildMistakeAnswerDiff({ userAnswer: '   ', correctAnswer: 'I have been here for a week' });
    expect(diff.mine).toHaveLength(1);
    expect(diff.mine[0]?.tone).toBe('gap');
    expect(diff.correct.length).toBe(7);
  });

  test('an equivalent contraction is not a mistake at all', () => {
    const diff = buildMistakeAnswerDiff({ userAnswer: "I don't know", correctAnswer: 'I do not know' });
    expect(diff.kind).toBe('none');
    expect(diff.missingWords).toEqual([]);
    expect(diff.wrongWords).toEqual([]);
  });
});
