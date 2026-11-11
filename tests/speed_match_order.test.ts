import fs from 'node:fs';
import path from 'node:path';
import { createLevelExamRng } from '../app/level_exam_rng';
import { shuffleSpeedMatchPairs, speedMatchOrderSeed } from '../components/level-exam/speedMatchOrder';

const pairs = Object.freeze([
  Object.freeze({ scoreUnitId: 'a' }), Object.freeze({ scoreUnitId: 'b' }),
  Object.freeze({ scoreUnitId: 'c' }), Object.freeze({ scoreUnitId: 'd' }),
  Object.freeze({ scoreUnitId: 'e' }), Object.freeze({ scoreUnitId: 'f' }),
]);
const ids = (values: readonly { scoreUnitId: string }[]) => values.map((value) => value.scoreUnitId);

describe('level-exam speed-match order', () => {
  it('feeds the right column from a seeded order instead of the fixed source rotation', () => {
    const source = fs.readFileSync(path.join(__dirname, '../components/level-exam/SpeedMatchQuestion.tsx'), 'utf8');
    expect(source).toContain('shuffleSpeedMatchPairs');
    expect(source).not.toContain('task.pairs.slice(1)');
  });
});

describe('seeded right-column order', () => {
  it('uses the injected RNG rather than the historical fixed rotation', () => {
    const ordered = shuffleSpeedMatchPairs(pairs, () => 0.999);
    expect(ids(ordered)).toEqual(['f', 'b', 'c', 'd', 'e', 'a']);
    expect(ids(ordered)).not.toEqual(['b', 'c', 'd', 'e', 'f', 'a']);
  });

  it('preserves the score-unit bijection without mutating authored frozen pairs', () => {
    const before = ids(pairs);
    const ordered = shuffleSpeedMatchPairs(pairs, () => 0.42);
    expect(ids(ordered).sort()).toEqual([...before].sort());
    expect(ids(pairs)).toEqual(before);
    expect(ordered).not.toBe(pairs);
  });

  it('is stable during one attempt and has a distinct fixed retry vector', () => {
    const taskId = 'A1:speed_match';
    const firstSeed = speedMatchOrderSeed('attempt-a', taskId, pairs);
    const retrySeed = speedMatchOrderSeed('attempt-b', taskId, pairs);
    const first = shuffleSpeedMatchPairs(pairs, createLevelExamRng(firstSeed));
    const rerender = shuffleSpeedMatchPairs(pairs, createLevelExamRng(firstSeed));
    const retry = shuffleSpeedMatchPairs(pairs, createLevelExamRng(retrySeed));
    expect(ids(rerender)).toEqual(ids(first));
    expect(ids(retry)).not.toEqual(ids(first));
  });
});
