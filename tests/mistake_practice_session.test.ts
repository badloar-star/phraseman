import type { MistakeProjectionItem } from '../modules/mistake-practice/projection';
import {
  buildMistakePracticeSession,
  mistakePracticeLengthOptions,
} from '../modules/mistake-practice/session';

function item(index: number, facet: MistakeProjectionItem['facet'] = 'word_order'): MistakeProjectionItem {
  return {
    mistakeId: `mistake-${index}`,
    cycleId: 'cycle-1',
    studyTarget: 'en',
    status: 'active',
    firstCapturedAtMs: index,
    lastEventAtMs: index,
    dueAtMs: 0,
    correctedAtMs: null,
    captureCount: 1,
    hintCount: 0,
    qualifyingDays: [],
    qualifyingModes: [],
    hasIndependentProduction: false,
    lessonId: '1',
    facet,
    canonicalTarget: `I am ready ${index}.`,
    sourceMeaning: `Я готов ${index}.`,
    tokens: ['I', 'am', 'ready'],
    distractors: ['are'],
  };
}

describe('mistake practice session', () => {
  test('enables 5/10/15 only when available and caps All at 30', () => {
    expect(mistakePracticeLengthOptions(4).every((option) => !option.enabled)).toBe(true);
    expect(mistakePracticeLengthOptions(8)).toEqual([
      { id: '5', count: 5, enabled: true },
      { id: '10', count: 10, enabled: false },
      { id: '15', count: 15, enabled: false },
      { id: 'all', count: 8, enabled: true },
    ]);
    expect(mistakePracticeLengthOptions(48).at(-1)).toEqual({
      id: 'all',
      count: 30,
      enabled: true,
    });
  });

  test('refuses to start below five compatible due mistakes', () => {
    expect(() => buildMistakePracticeSession({
      items: [item(1), item(2), item(3), item(4)],
      requestedLength: 'all',
      nowMs: 100,
    })).toThrow('mistake_practice_minimum_five_required');
  });

  test('builds a focused one-phrase session without weakening the generic five-item minimum', () => {
    const session = buildMistakePracticeSession({
      items: [item(1), item(2)],
      requestedLength: '5',
      nowMs: 100,
      focusMistakeId: 'mistake-2',
    });

    expect(session.initialCount).toBe(1);
    expect(session.queue).toHaveLength(1);
    expect(session.queue[0]?.mistakeId).toBe('mistake-2');
  });

  test('builds a mixed session with adaptive lesson and Arena mechanics', () => {
    const session = buildMistakePracticeSession({
      items: Array.from({ length: 10 }, (_, index) => item(index)),
      requestedLength: '10',
      nowMs: 100,
    });

    expect(session.initialCount).toBe(10);
    expect(session.queue).toHaveLength(10);
    expect(new Set(session.queue.map((entry) => entry.exercise.mode)).size).toBeGreaterThan(1);
    expect(session.cursor).toBe(0);
  });

  test('always mixes pronunciation and written errors in one adaptive queue', () => {
    const items = [
      ...Array.from({ length: 5 }, (_, index) => item(index, 'pronunciation')),
      item(10, 'word_order'),
    ];
    const session = buildMistakePracticeSession({
      items,
      requestedLength: 'all',
      nowMs: 100,
    });
    expect(session.queue).toHaveLength(6);
    expect(session.queue.some((entry) => entry.facet === 'pronunciation')).toBe(true);
    expect(session.queue.some((entry) => entry.facet === 'word_order')).toBe(true);
    expect(session).not.toHaveProperty('voiceOnly');
  });
});
