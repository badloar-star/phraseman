import type { MistakeProjectionItem } from '../modules/mistake-practice/projection';
import {
  buildWordStrengthMap,
  strengthDotCount,
  strengthFor,
  strengthFromMistake,
  strengthKey,
  strongerOf,
} from '../app/flashcards/word_strength';

function item(overrides: Partial<MistakeProjectionItem> = {}): MistakeProjectionItem {
  return {
    mistakeId: 'mistake:v1:test', cycleId: 'mistake-cycle:v1:test', studyTarget: 'en',
    status: 'active', firstCapturedAtMs: 1, lastEventAtMs: 1, dueAtMs: 1,
    correctedAtMs: null, captureCount: 1, hintCount: 0, qualifyingDays: [],
    qualifyingModes: [], hasIndependentProduction: false, lessonId: null, facet: 'form',
    canonicalTarget: 'give up', sourceMeaning: null, tokens: [], distractors: [], audioRef: null,
    ...overrides,
  };
}

describe('word strength from the new mistake projection', () => {
  test('active mistake starts weak, progress becomes medium, corrected becomes strong', () => {
    expect(strengthFromMistake(item())).toBe('weak');
    expect(strengthFromMistake(item({ qualifyingDays: ['2026-08-20'] }))).toBe('medium');
    expect(strengthFromMistake(item({ status: 'corrected' }))).toBe('strong');
  });

  test('builds normalized map and keeps the strongest cycle', () => {
    const map = buildWordStrengthMap([
      item({ canonicalTarget: 'Give - up' }),
      item({ canonicalTarget: 'give up', status: 'corrected' }),
      item({ mistakeId: 'two', canonicalTarget: 'put off', qualifyingDays: ['2026-08-20'] }),
    ]);
    expect(strengthFor('give up', map)).toBe('strong');
    expect(strengthFor('Put Off', map)).toBe('medium');
    expect(strengthFor('unknown', map)).toBeNull();
  });

  test('utility contracts remain stable', () => {
    expect(strengthDotCount('weak')).toBe(1);
    expect(strengthDotCount('medium')).toBe(2);
    expect(strengthDotCount('strong')).toBe(3);
    expect(strongerOf('weak', 'strong')).toBe('strong');
    expect(strengthKey('Somebody - planted a - tree')).toBe('somebody planted a tree');
  });
});
