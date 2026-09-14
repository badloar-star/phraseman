import { mistakePracticeTokenOrder } from '../app/mistake_practice_token_order';

describe('mistake practice builder display order', () => {
  test('keeps every original index, including repeated words and distractors', () => {
    const tokens = Object.freeze(['I', 'think', 'that', 'that', 'works', 'are']);
    const order = mistakePracticeTokenOrder(tokens, 'saved-exercise:one');
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(order.map(index => tokens[index])).not.toEqual(tokens);
    expect(order.filter(index => tokens[index] === 'that')).toHaveLength(2);
    expect(tokens).toEqual(['I', 'think', 'that', 'that', 'works', 'are']);
  });

  test('keeps the same bank after a render or restoring an exercise', () => {
    const tokens = ['I', 'am', 'ready'];
    expect(mistakePracticeTokenOrder(tokens, 'existing-id'))
      .toEqual(mistakePracticeTokenOrder([...tokens], 'existing-id'));
  });

  test('never reveals the original visible order when different tokens exist', () => {
    for (const tokens of [['I', 'am'], ['that', 'that', 'is'], ['a', 'b', 'c', 'd']]) {
      for (let seed = 0; seed < 60; seed += 1) {
        const order = mistakePracticeTokenOrder(tokens, String(seed));
        expect(order.map(index => tokens[index])).not.toEqual(tokens);
      }
    }
  });

  test('does not leave the answer tokens in a solved run at the front of the bank', () => {
    const tokens = ['Do', 'not', 'forget', 'your', 'key', 'Does', "don't", 'shall', 'would', 'will'];
    const order = mistakePracticeTokenOrder(tokens, 'screenshot-regression', 5);
    expect(order.slice(0, 5)).not.toEqual([0, 1, 2, 3, 4]);
    expect([...order].sort((a, b) => a - b)).toEqual(tokens.map((_, index) => index));
  });

  test('supports empty, single, and indistinguishable token banks', () => {
    expect(mistakePracticeTokenOrder([], 'empty')).toEqual([]);
    expect(mistakePracticeTokenOrder(['Hello'], 'one')).toEqual([0]);
    expect([...mistakePracticeTokenOrder(['ha', 'ha'], 'twins')].sort()).toEqual([0, 1]);
  });

  test('selection still reconstructs the answer using original indices', () => {
    const tokens = ['I', 'think', 'that', 'that', 'works'];
    const displayOrder = mistakePracticeTokenOrder(tokens, 'duplicates');
    const clicks = [0, 1, 2, 3, 4].map(index => displayOrder.indexOf(index));
    expect(clicks.map(position => tokens[displayOrder[position]]).join(' '))
      .toBe('I think that that works');
  });
});
