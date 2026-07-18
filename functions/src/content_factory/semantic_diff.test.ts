import { semanticDiff } from './semantic_diff';

describe('stage-aware semantic diff', () => {
  test.each([
    ['challenge_topic', { title: 'Travel', idea: 'Stations' }, { title: 'Travel safely', idea: 'Stations' }, 'title'],
    ['lesson_theory', { rules: [{ id: 'r1', rule: 'Use a.' }] }, { rules: [{ id: 'r1', rule: 'Use an before vowels.' }] }, 'rules.r1.rule'],
    ['lesson_phrases', { items: [{ id: 'p1', targetText: 'Hello', translation: 'Привет' }] }, { items: [{ id: 'p1', targetText: 'Hi', translation: 'Привет' }] }, 'items.p1.targetText'],
    ['challenge_questions', { items: [{ id: 'q1', options: ['A', 'B'], correctIndex: 0 }] }, { items: [{ id: 'q1', options: ['A', 'C'], correctIndex: 1 }] }, 'items.q1.correctIndex'],
    ['flashcard_items', { items: [{ id: 'c1', front: 'A', back: 'Б' }] }, { items: [{ id: 'c1', front: 'A!', back: 'Б' }] }, 'items.c1.front'],
    ['challenge_questions', { items: [{ id: 'a1', question: 'Q', options: ['A', 'B'], correctIndex: 0 }] }, { items: [{ id: 'a1', question: 'Q2', options: ['A', 'B'], correctIndex: 0 }] }, 'items.a1.question'],
  ] as const)('reports semantic paths for %s', (kind, before, after, expectedPath) => {
    expect(semanticDiff(kind, before, after).details).toEqual(expect.arrayContaining([expect.objectContaining({ path: expectedPath, type: 'changed' })]));
  });

  test('reports added, removed and moved stable IDs', () => {
    const before = { items: [{ id: 'a', value: 1 }, { id: 'b', value: 2 }] };
    const after = { items: [{ id: 'b', value: 2 }, { id: 'c', value: 3 }] };
    const diff = semanticDiff('flashcard_items', before, after);
    expect(diff.summary).toMatchObject({ added: 1, removed: 1, moved: 1 });
  });

  test('bounds details and retains complete summary counts', () => {
    const before = { items: Array.from({ length: 20 }, (_, index) => ({ id: `i${index}`, value: index })) };
    const after = { items: Array.from({ length: 20 }, (_, index) => ({ id: `i${index}`, value: index + 1 })) };
    const diff = semanticDiff('lesson_vocabulary', before, after, 5);
    expect(diff.details).toHaveLength(5);
    expect(diff.isPartial).toBe(true);
    expect(diff.summary.changed).toBe(20);
  });
});
