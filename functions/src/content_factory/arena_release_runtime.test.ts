import { arenaQuestionsFromCourseSurfaceEntries } from './arena_release_runtime';

describe('canonical arena release runtime', () => {
  it('maps reviewed arena payloads to immutable release-bound questions', () => {
    const rows = arenaQuestionsFromCourseSurfaceEntries(
      { studyTarget: 'de', learnerSourceLocale: 'ru', courseReleaseId: 'de-ru-r1' },
      [{ lessonId: 1, payload: { lessonId: 1, surface: 'arena', items: [{ id: 'a/1', prompt: 'Как сказать?', answer: 'Ich bin bereit', options: ['Ich bin bereit', 'Du bist bereit', 'Er ist bereit', 'Wir sind bereit'] }] } }],
    );
    expect(rows).toEqual([
      expect.objectContaining({ level: 'A1', question: 'Как сказать?', correct: 'Ich bin bereit', releaseId: 'de-ru-r1', studyTarget: 'de', learnerSourceLocale: 'ru' }),
    ]);
    expect(rows[0].id).toMatch(/^cr_[a-f0-9]{40}$/);
  });

  it('rejects arena questions without exactly four unique target-language options', () => {
    const identity = { studyTarget: 'de', learnerSourceLocale: 'ru', courseReleaseId: 'de-ru-r1' };
    expect(() => arenaQuestionsFromCourseSurfaceEntries(identity, [{ lessonId: 1, payload: { lessonId: 1, surface: 'arena', items: [{ id: 'a1', prompt: 'Q', answer: 'A', options: ['A', 'B'] }] } }])).toThrow('arena_release_payload_invalid');
  });

  it('preserves strict Arena fields while serializing to the real string-answer runtime contract', () => {
    const item = { id: 'a2', level: 'A2', type: 'choose', task: 'Выберите ответ.', question: 'Как сказать «Мне нужна помощь»?', options: ['I need help.', 'I helps.', 'Me need help.', 'I need helping.'], correctIndex: 0, correct: 'I need help.', rule: 'После I используется need.', skillTag: 'requests', difficulty: 'easy', expectedAnswerTimeMs: 5000, sourceReferences: ['lesson:9:p1'] };
    const [row] = arenaQuestionsFromCourseSurfaceEntries({ studyTarget: 'en', learnerSourceLocale: 'ru', courseReleaseId: 'en-ru-r1' }, [{ lessonId: 9, payload: { lessonId: 9, surface: 'arena', items: [item] } }]);
    expect(row).toMatchObject({ level: 'A2', type: 'choose', task: item.task, question: item.question, options: item.options, correctIndex: 0, correct: item.correct, rule: item.rule, expectedAnswerTimeMs: 5000, sourceReferences: item.sourceReferences });
    expect(row.rand).toBeGreaterThanOrEqual(0);
    expect(row.rand).toBeLessThan(1);
    expect(JSON.parse(JSON.stringify(row))).toMatchObject({ correct: 'I need help.', correctIndex: 0, studyTarget: 'en', learnerSourceLocale: 'ru' });
  });

  it('rejects a structured question whose index and string answer disagree', () => {
    const item = { id: 'bad', level: 'A2', type: 'choose', task: 'Task', question: 'Question?', options: ['A', 'B', 'C', 'D'], correctIndex: 1, correct: 'A', rule: 'Rule', expectedAnswerTimeMs: 5000, sourceReferences: [] };
    expect(() => arenaQuestionsFromCourseSurfaceEntries({ studyTarget: 'en', learnerSourceLocale: 'ru', courseReleaseId: 'en-ru-r1' }, [{ lessonId: 9, payload: { lessonId: 9, surface: 'arena', items: [item] } }])).toThrow('arena_release_payload_invalid');
  });

  it('resolves by stored unit provenance and never consults the current convergence mode', () => {
    const identity = { studyTarget: 'en', learnerSourceLocale: 'ru', courseReleaseId: 'en-ru-r1' };
    const legacyPayload = { lessonId: 1, surface: 'arena', items: [{ id: 'legacy', prompt: 'Q?', answer: 'A', options: ['A', 'B', 'C', 'D'] }] };
    expect(arenaQuestionsFromCourseSurfaceEntries(identity, [{ lessonId: 1, engineResolved: 'legacy', payload: legacyPayload }])).toHaveLength(1);
    expect(() => arenaQuestionsFromCourseSurfaceEntries(identity, [{ lessonId: 1, engineResolved: 'stage', payload: legacyPayload }])).toThrow('arena_release_engine_payload_mismatch');
  });

  it.each([[8, 'A1'], [9, 'A2'], [16, 'A2'], [17, 'B1'], [24, 'B1'], [25, 'B2']] as const)('keeps lesson %i on runtime level %s', (lessonId, level) => {
    const options = ['A', 'B', 'C', 'D'];
    const [row] = arenaQuestionsFromCourseSurfaceEntries({ studyTarget: 'en', learnerSourceLocale: 'ru', courseReleaseId: `en-ru-r${lessonId}` }, [{ lessonId, payload: { lessonId, surface: 'arena', items: [{ id: `a${lessonId}`, prompt: 'Q?', answer: 'A', options }] } }]);
    expect(row.level).toBe(level);
  });
});
