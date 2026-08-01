import { validateQuestionBatchArtifact, validateQuestionReplacementArtifact, validateTopicArtifact } from './quiz_challenge_artifacts';

describe('quiz and challenge studio artifacts', () => {
  const topic = (stage: 'quiz_topic' | 'challenge_topic') => ({ stage, result: { topicId: 'travel-basics', title: 'Travel basics', learningPromise: 'Choose natural phrases for common travel situations.', skillTags: ['travel', 'requests'], inclusions: ['transport', 'directions'], exclusions: ['rare aviation terms'], difficultyDistribution: { easy: 3, medium: 4, hard: 3 } } });

  it.each(['quiz_topic', 'challenge_topic'] as const)('accepts an editable %s proposal', (stage) => {
    expect(validateTopicArtifact(topic(stage), { kind: stage, cefr: 'A2' })).toEqual([]);
  });

  const item = (index: number) => ({ id: `q-${index}`, prompt: `Как сказать вариант ${index}?`, choices: [`Correct ${index}`, `Wrong A ${index}`, `Wrong B ${index}`, `Wrong C ${index}`], correctIndex: 0, optionExplanations: [`Correct because ${index}.`, `Wrong form A ${index}.`, `Wrong meaning B ${index}.`, `Wrong grammar C ${index}.`], skillTag: index % 2 ? 'travel' : 'requests', difficulty: (index <= 3 ? 'easy' : index <= 7 ? 'medium' : 'hard') as 'easy' | 'medium' | 'hard', sourcePhraseIds: [] });

  it.each(['quiz_questions', 'challenge_questions'] as const)('accepts exactly ten fully explained %s', (stage) => {
    const grounding = { topic: topic(stage === 'quiz_questions' ? 'quiz_topic' : 'challenge_topic').result };
    expect(validateQuestionBatchArtifact({ stage, items: Array.from({ length: 10 }, (_, index) => item(index + 1)) }, { kind: stage, count: 10, grounding })).toEqual([]);
  });

  it('rejects duplicate choices, bad correct index, missing per-option explanations and repeated templates', () => {
    const items = Array.from({ length: 10 }, (_, index) => item(index + 1));
    items[1] = { ...items[0], id: 'q-2', choices: ['Same', 'Same', 'Other', 'Last'], correctIndex: 4, optionExplanations: ['Only one'], skillTag: 'outside-topic' } as typeof items[number];
    items[2] = { ...items[0], id: 'q-3' };
    const grounding = { topic: topic('quiz_topic').result };
    expect(validateQuestionBatchArtifact({ stage: 'quiz_questions', items }, { kind: 'quiz_questions', count: 10, grounding })).toEqual(expect.arrayContaining(['question_choices_unique', 'question_correct_index_invalid', 'question_option_explanations_expected_4', 'question_semantic_duplicate', 'question_skill_tag_unapproved']));
  });

  // зачем: регрессия по репорту «Нет здесь правильного ответа» (14.07.2026) — вопрос
  // «Как по-английски "открывалка для банок"?» с вариантами tongs/jar/corkscrew/masher.
  // Правильный ответ «jar opener» был усечён до дистрактора «jar», и uniqueness-проверка
  // это пропускала, т.к. считает "jar" и "jar opener" разными строками.
  it('rejects a distractor that is a truncated fragment of the correct answer', () => {
    const items = Array.from({ length: 10 }, (_, index) => item(index + 1));
    items[0] = {
      ...items[0],
      prompt: 'Как по-английски «открывалка для банок»?',
      choices: ['jar opener', 'jar', 'corkscrew', 'masher'],
      correctIndex: 0,
    } as typeof items[number];
    const grounding = { topic: topic('quiz_topic').result };
    expect(validateQuestionBatchArtifact({ stage: 'quiz_questions', items }, { kind: 'quiz_questions', count: 10, grounding }))
      .toContain('question_choice_truncation_conflict');
  });

  it('rejects a truncation conflict in a single-question replacement too', () => {
    const original = item(1);
    const replacement = { ...item(11), id: 'q-1', choices: ['can opener', 'opener', 'corkscrew', 'masher'], correctIndex: 0 };
    const grounding = { replacementForQuestionId: 'q-1', originalQuestion: original, topic: topic('quiz_topic').result, previousQuestionKeys: [] };
    expect(validateQuestionReplacementArtifact({ stage: 'quiz_question_replacement', result: { replacementForQuestionId: 'q-1', item: replacement } }, { kind: 'quiz_question_replacement', grounding }))
      .toContain('question_replacement_choice_truncation_conflict');
  });

  it('does not flag legitimate distractors that merely share a word or look similar', () => {
    const items = Array.from({ length: 10 }, (_, index) => item(index + 1));
    // «cat»/«cats» — похожи посимвольно, но НЕ пословное вложение; такие проходят.
    // «bottle opener» vs «jar opener» — общее слово, но ни одно не является куском другого.
    items[0] = { ...items[0], choices: ['jar opener', 'bottle opener', 'cats', 'cat'], correctIndex: 0 } as typeof items[number];
    const grounding = { topic: topic('quiz_topic').result };
    expect(validateQuestionBatchArtifact({ stage: 'quiz_questions', items }, { kind: 'quiz_questions', count: 10, grounding }))
      .not.toContain('question_choice_truncation_conflict');
  });

  it('accepts one independently grounded replacement and rejects a semantic clone', () => {
    const original = item(1); const replacement = { ...item(11), id: 'q-1' };
    const grounding = { replacementForQuestionId: 'q-1', originalQuestion: original, topic: topic('quiz_topic').result, previousQuestionKeys: [] };
    expect(validateQuestionReplacementArtifact({ stage: 'quiz_question_replacement', result: { replacementForQuestionId: 'q-1', item: replacement } }, { kind: 'quiz_question_replacement', grounding })).toEqual([]);
    expect(validateQuestionReplacementArtifact({ stage: 'quiz_question_replacement', result: { replacementForQuestionId: 'q-1', item: { ...original, id: 'clone' } } }, { kind: 'quiz_question_replacement', grounding })).toContain('question_replacement_duplicate');
  });
});
