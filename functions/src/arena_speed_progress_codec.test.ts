import fs from 'fs';
import path from 'path';
import {
  decodeArenaSpeedProgress,
  encodeArenaSpeedProgress,
} from './arena_v2_core';
import { arenaSanitizeAnswerSnapshot } from './arena_expansion_core';

function hasDirectNestedArray(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(Array.isArray) || value.some((entry) => hasDirectNestedArray(entry));
  }
  if (!value || typeof value !== 'object') return false;
  return Object.values(value as Record<string, unknown>).some((entry) => hasDirectNestedArray(entry));
}

describe('Arena Firestore speed progress codec', () => {
  const logical = {
    matchedIndexes: [-1, -1, 2, 3],
    triedIndexes: [[2, 2, 1], [], [0], [1, 0]],
    wrongAttempts: 4,
  };

  test('round-trips logical progress without any directly nested arrays', () => {
    const stored = encodeArenaSpeedProgress(logical);
    expect(stored).toEqual({
      schemaVersion: 'arena-speed-progress.firestore.v1',
      matchedIndexes: [-1, -1, 2, 3],
      triedIndexesByPair: { '0': [2, 1], '1': [], '2': [0], '3': [1, 0] },
      wrongAttempts: 4,
    });
    expect(hasDirectNestedArray(stored)).toBe(false);
    expect(decodeArenaSpeedProgress(stored)).toEqual({
      matchedIndexes: [-1, -1, 2, 3],
      triedIndexes: [[2, 1], [], [0], [1, 0]],
      wrongAttempts: 4,
    });
  });

  test('decodes legacy in-memory progress and sanitizer always emits the safe codec', () => {
    expect(decodeArenaSpeedProgress(logical)).toEqual({
      matchedIndexes: [-1, -1, 2, 3],
      triedIndexes: [[2, 1], [], [0], [1, 0]],
      wrongAttempts: 4,
    });
    const sanitized = arenaSanitizeAnswerSnapshot(logical);
    expect(sanitized).toEqual(encodeArenaSpeedProgress(logical));
    expect(hasDirectNestedArray(sanitized)).toBe(false);
  });

  test('all Arena persistence paths use encode and all gameplay reads use decode', () => {
    const root = path.resolve(__dirname, '../..');
    const base = fs.readFileSync(path.join(root, 'functions/src/arena_v2.ts'), 'utf8');
    const expansion = fs.readFileSync(path.join(root, 'functions/src/arena_expansion.ts'), 'utf8');

    for (const source of [base, expansion]) {
      expect(source).toContain('decodeArenaSpeedProgress');
      expect(source).toContain('encodeArenaSpeedProgress');
      expect(source).not.toMatch(/speedProgress[^\n]*= applied\.progress/);
      expect(source).not.toContain('answerSnapshot: applied.progress');
    }
    expect(base).toMatch(/answerSnapshot:\s*storedProgress/);
    expect(expansion).toMatch(/answerSnapshot:\s*storedProgress/);
  });
});
