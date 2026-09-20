import { validateArenaTargetTask } from './arena_target_quality';

const choiceTask = (studyTarget: 'en' | 'es' | 'fr' | 'de') => ({
  taskId: `${studyTarget}_guess_001`,
  studyTarget,
  mode: 'guess_phrase',
  difficulty: 1,
  payload: {
    phrase: studyTarget === 'es' ? 'Я сегодня дома.' : 'Я дома.',
    options: studyTarget === 'es'
      ? ['Hoy estoy en casa.', 'Hoy está en casa.', 'Hoy soy en casa.', 'Hoy estoy casa.']
      : ['I am home.', 'I is home.', 'I home.', 'Me am home.'],
    correctIndex: 0,
  },
  explanation: {
    ruleNote: 'The subject and finite verb must agree.',
    example: 'I am home. — Я дома.',
    wrongOptionReasons: ['', 'agreement', 'copula', 'preposition'],
  },
});

describe('Arena target task gate', () => {
  it('rejects a task when requested and persisted targets differ', () => {
    expect(validateArenaTargetTask(choiceTask('en'), 'es')).toEqual({
      ok: false,
      reason: 'arena_task_target_mismatch',
    });
  });

  it('rejects missing target identity and duplicate normalized choices', () => {
    expect(validateArenaTargetTask({ ...choiceTask('en'), studyTarget: undefined }, 'en')).toEqual({
      ok: false,
      reason: 'arena_task_target_missing',
    });
    const duplicate = choiceTask('es');
    expect(validateArenaTargetTask({
      ...duplicate,
      payload: { ...duplicate.payload, options: ['Sí.', ' sí. ', 'No.', 'Quizá.'] },
    }, 'es')).toEqual({ ok: false, reason: 'arena_task_options_duplicate' });
  });

  it('requires one reason per distractor and an empty correct-answer reason', () => {
    const task = choiceTask('de');
    expect(validateArenaTargetTask({
      ...task,
      explanation: { ...task.explanation, wrongOptionReasons: ['', '', 'case', 'word_order'] },
    }, 'de')).toEqual({ ok: false, reason: 'arena_task_distractor_reason_missing' });
  });

  it('accepts a target-consistent task with deterministic distractor evidence', () => {
    expect(validateArenaTargetTask(choiceTask('es'), 'es')).toEqual({ ok: true });
  });
});
