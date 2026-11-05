import { chooseFloorRecord, recordAnswerCorrect, recordChallengeSet, stepRecordKey, stepRecordChallengeSet } from '../shared/spire_floor_records';
import { arenaAnswerFingerprint } from '../modules/arena/answer_check';

describe('floor records: owner rules 2026-10-28', () => {
  test('exactly 135 floor+step addresses are valid; no coercion or above-cloud remapping', () => {
    const keys = new Set<string>();
    for (let floor = 1; floor <= 15; floor++) {
      const count = floor <= 5 ? floor + 4 : 10;
      for (let step = 1; step <= count; step++) keys.add(stepRecordKey(floor, step)!);
      expect(stepRecordKey(floor, count + 1)).toBeNull();
    }
    expect(keys.size).toBe(135);
    for (const [floor, step] of [[0, 1], [16, 1], [1, 0], [1, 1.1], ['1', 1], [1, '1'], [NaN, 1]]) {
      expect(stepRecordKey(floor, step)).toBeNull();
    }
    expect(stepRecordKey(1, 1)).toBe('1:1');
    expect(stepRecordKey(15, 10)).toBe('15:10');
  });
  test('step challenge selects that exact step and never falls back to step one', () => {
    const one = { id: 1 }, two = { id: 2 };
    const pack = { floors: [{ floor: 1, steps: [{ step: 1, sets: [one] }, { step: 2, sets: [two] }] }] };
    expect(stepRecordChallengeSet(pack, 1, 2)).toBe(two);
    expect(stepRecordChallengeSet(pack, 1, 3)).toBeNull();
    expect(stepRecordChallengeSet(pack, 16, 1)).toBeNull();
  });
  const old = { uid: 'first', durationMs: 12000, completedAtMs: 1 };
  test('only a strictly faster result replaces the holder', () => {
    expect(chooseFloorRecord(old, { ...old, uid: 'second', durationMs: 12000 })).toBe(old);
    expect(chooseFloorRecord(old, { ...old, uid: 'second', durationMs: 12001 })).toBe(old);
    expect(chooseFloorRecord(old, { ...old, uid: 'second', durationMs: 11999 }).uid).toBe('second');
  });
  test('empty record accepts the first valid result', () => {
    expect(chooseFloorRecord(null, old)).toBe(old);
  });
  test('challenge is independent of player and attempt', () => {
    const set = { tasks: [], answerFingerprints: [] };
    const pack = { floors: [{ floor: 1, steps: [{ step: 1, sets: [set] }] }], aboveCloudsCyclesFloors: [1] };
    expect(recordChallengeSet(pack, 1)).toBe(set);
    expect(recordChallengeSet(pack, 16)).toBe(set);
    expect(recordChallengeSet(pack, 2)).toBeNull();
  });
  test('server answer verification matches the existing client fingerprints', () => {
    const fingerprint = arenaAnswerFingerprint('salt', 'task', ['hello', 'world']);
    expect(recordAnswerCorrect('salt', { taskId: 'task', kind: 'translate' }, [fingerprint], { tokens: ['hello', 'world'] })).toBe(true);
    expect(recordAnswerCorrect('salt', { taskId: 'task', kind: 'translate' }, [fingerprint], { tokens: ['world', 'hello'] })).toBe(false);
    expect(recordAnswerCorrect('salt', { taskId: 'task', kind: 'choice' }, ['x'], null)).toBe(false);
  });
});
