/**
 * зачем: PM-193 — сторож из комментария в modules/mistake-practice/contracts.ts.
 * Ошибка на es/de/fr/it обязана записаться и прочитаться под СВОИМ языком,
 * без подмены на 'en' (22.09: испанские ошибки уходили в английский журнал,
 * а валидатор объявлял журнал es/de испорченным целиком).
 */
import {
  MISTAKE_STUDY_TARGETS,
  normalizeMistakeStudyTarget,
  type MistakeStudyTarget,
} from '../modules/mistake-practice/contracts';
import { LEARNING_LANGUAGE_TARGETS } from '../app/learning_language_contour';
import { captureObjectiveAttempt, type ObjectiveMistakeAttempt } from '../app/mistake_practice_capture';
import { loadMistakeEventJournal, type MistakePracticeStorage } from '../app/mistake_practice_store';
import { __resetAccountGenerationForTests } from '../app/account_generation';

function createStorage(): MistakePracticeStorage & { getAllKeys(): Promise<readonly string[]> } {
  const data = new Map<string, string>();
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
    getAllKeys: async () => [...data.keys()],
  };
}

const attemptFor = (studyTarget: MistakeStudyTarget): ObjectiveMistakeAttempt => ({
  accountScope: 'account-a',
  attemptId: `attempt-${studyTarget}-1`,
  studyTarget,
  verdict: 'wrong',
  objective: true,
  content: {
    sourceKind: 'lesson_phrase',
    sourceId: `lesson-1:phrase-${studyTarget}`,
    canonicalTarget: `target phrase ${studyTarget}`,
    sourceMeaning: 'значение',
    lessonId: '1',
  },
  facet: { kind: 'word_order' },
});

describe('PM-193: журнал ошибок не подменяет язык', () => {
  afterEach(() => __resetAccountGenerationForTests());

  test('список языков журнала совпадает со списком языков обучения', () => {
    console.log('[PM-193] journal targets:', MISTAKE_STUDY_TARGETS.join(','), '| learning:', LEARNING_LANGUAGE_TARGETS.join(','));
    expect([...MISTAKE_STUDY_TARGETS].sort()).toEqual([...LEARNING_LANGUAGE_TARGETS].sort());
  });

  test.each(['es', 'de', 'fr', 'it'] as const)('%s: ошибка пишется и читается под своим языком', async (target) => {
    const storage = createStorage();
    const result = await captureObjectiveAttempt(attemptFor(target), { storage });
    expect(result).toMatchObject({ kind: 'captured', appended: true });

    const own = await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget: target, storage });
    expect(own.events).toHaveLength(1);
    expect(own.events.every((event) => event.studyTarget === target)).toBe(true);
    expect(own.studyTarget).toBe(target);

    for (const other of MISTAKE_STUDY_TARGETS.filter((t) => t !== target)) {
      const foreign = await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget: other, storage });
      expect(foreign.events).toHaveLength(0);
    }
  });

  test('нормализация сохраняет известный язык и только неизвестный даёт en', () => {
    for (const target of MISTAKE_STUDY_TARGETS) {
      expect(normalizeMistakeStudyTarget(target)).toBe(target);
    }
    expect(normalizeMistakeStudyTarget('xx')).toBe('en');
    expect(normalizeMistakeStudyTarget(undefined)).toBe('en');
  });
});
