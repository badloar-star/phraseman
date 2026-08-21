import type { MistakePracticeStorage } from '../app/mistake_practice_store';
import {
  captureObjectiveAttempt,
  type ObjectiveMistakeAttempt,
} from '../app/mistake_practice_capture';

function storage(): MistakePracticeStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
  };
}

const base: ObjectiveMistakeAttempt = {
  accountScope: 'account-a',
  attemptId: 'lesson-attempt-1:answer-3',
  studyTarget: 'en',
  verdict: 'wrong',
  objective: true,
  content: {
    sourceKind: 'lesson_phrase',
    sourceId: 'lesson-1:phrase-3',
    canonicalTarget: 'I am ready.',
    sourceMeaning: 'Я готов.',
    lessonId: '1',
  },
  facet: { kind: 'word_order' },
};

describe('mistake capture adapter', () => {
  test('captures an objective wrong answer immediately and idempotently', async () => {
    const memory = storage();
    const first = await captureObjectiveAttempt(base, { storage: memory });
    const replay = await captureObjectiveAttempt(base, { storage: memory });

    expect(first).toMatchObject({ kind: 'captured', appended: true });
    expect(replay).toMatchObject({
      kind: 'captured',
      appended: false,
      mistakeId: first.kind === 'captured' ? first.mistakeId : '',
    });
  });

  test.each([
    ['correct', { ...base, verdict: 'correct' as const }, 'correct'],
    ['technical', { ...base, verdict: 'technical' as const }, 'technical'],
    ['cancelled', { ...base, verdict: 'cancelled' as const }, 'cancelled'],
    ['uncertain voice', { ...base, verdict: 'uncertain' as const }, 'technical'],
    ['subjective', { ...base, objective: false }, 'subjective'],
  ])('ignores %s outcomes', async (_label, attempt, reason) => {
    const memory = storage();
    await expect(
      captureObjectiveAttempt(attempt, { storage: memory }),
    ).resolves.toEqual({ kind: 'ignored', reason });
    expect(memory.data.size).toBe(0);
  });

  test('revives a corrected or hidden identity with a new deterministic cycle', async () => {
    const memory = storage();
    const first = await captureObjectiveAttempt(base, { storage: memory });
    expect(first.kind).toBe('captured');
    if (first.kind !== 'captured') return;

    const second = await captureObjectiveAttempt(
      { ...base, attemptId: 'lesson-attempt-2:answer-1' },
      { storage: memory, forceNewCycle: true },
    );
    expect(second).toMatchObject({ kind: 'captured', appended: true });
    if (second.kind !== 'captured') return;
    expect(second.cycleId).not.toBe(first.cycleId);
  });

  test('returns unsupported instead of inventing identity for incomplete content', async () => {
    await expect(
      captureObjectiveAttempt(
        { ...base, content: { ...base.content, sourceId: '' } },
        { storage: storage() },
      ),
    ).resolves.toEqual({ kind: 'ignored', reason: 'unsupported' });
  });
});
