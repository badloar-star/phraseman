import { createLevelExamRng, shuffled } from '../app/level_exam_rng';

describe('level exam seeded randomization', () => {
  test('the same seed reproduces the same samples', () => {
    const first = createLevelExamRng('attempt-a');
    const second = createLevelExamRng('attempt-a');

    expect(Array.from({ length: 12 }, () => first())).toEqual(
      Array.from({ length: 12 }, () => second()),
    );
  });

  test('different seeds produce a different sample stream', () => {
    const first = createLevelExamRng('attempt-a');
    const second = createLevelExamRng('attempt-b');

    expect(Array.from({ length: 12 }, () => first())).not.toEqual(
      Array.from({ length: 12 }, () => second()),
    );
  });

  test('shuffle is reproducible and preserves the input multiset', () => {
    const values = ['a', 'b', 'c', 'd', 'e', 'f'];
    const first = shuffled(values, createLevelExamRng('shuffle-seed'));
    const second = shuffled(values, createLevelExamRng('shuffle-seed'));

    expect(first).toEqual(second);
    expect(first).not.toEqual(values);
    expect([...first].sort()).toEqual([...values].sort());
    expect(values).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
});
