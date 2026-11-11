import type { MistakePracticeStorage } from '../app/mistake_practice_store';
import {
  captureObjectiveAttempt,
  withGapTokenIndex,
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

  // зачем (владелец 11.11.2026): итоговый экзамен, пробный тест и Пик слали «пропущенное слово» без номера слова —
  // запись молча отбрасывалась. Номер берётся из вопроса с «___»; без такого вопроса запись по-прежнему не принимается.
  test('missing-token answer without a word index is captured when the prompt shows the gap', async () => {
    const memory = storage();
    const gap: ObjectiveMistakeAttempt = {
      ...base,
      attemptId: 'exam:1:4:2',
      content: {
        sourceKind: 'exam', sourceId: '7:She ___ at home.', canonicalTarget: 'She is at home.',
        sourceMeaning: 'Она дома.', sourcePrompt: 'Она дома.\nShe ___ at home.', lessonId: '7',
      },
      facet: { kind: 'missing_token', expected: 'is', given: 'are' },
    };
    expect(withGapTokenIndex(gap).facet.tokenIndex).toBe(1);
    await expect(captureObjectiveAttempt(gap, { storage: memory })).resolves.toMatchObject({ kind: 'captured', appended: true });
    const stored = JSON.parse([...memory.data.values()].find((value) => value.includes('She is at home.')) ?? '{}');
    expect(JSON.stringify(stored)).toContain('"tokenIndex":1');
  });

  test('missing-token answer stays unsupported, with a logged reason, when there is no gap to count from', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const noGap: ObjectiveMistakeAttempt = {
      ...base,
      attemptId: 'exam:1:5:2',
      content: { ...base.content, sourcePrompt: 'Choose the right word.' },
      facet: { kind: 'missing_token', expected: 'is' },
    };
    expect(withGapTokenIndex(noGap)).toBe(noGap);
    await expect(captureObjectiveAttempt(noGap, { storage: storage() })).resolves.toEqual({ kind: 'ignored', reason: 'unsupported' });
    expect(warn.mock.calls.some((call) => call[0] === '[MISTAKE-CAPTURE] ignored' && String(call[1]).includes('invalid_facet'))).toBe(true);
    warn.mockRestore();
  });

  test('an explicit word index from the caller is kept as is', () => {
    const explicit: ObjectiveMistakeAttempt = { ...base, content: { ...base.content, sourcePrompt: 'She ___ at home.' }, facet: { kind: 'missing_token', expected: 'is', tokenIndex: 0 } };
    expect(withGapTokenIndex(explicit)).toBe(explicit);
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
