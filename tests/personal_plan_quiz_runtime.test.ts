import { createPersonalPlanQuizRun } from '../app/personal_plan_quiz_runtime';
import { appendPlanQuizAnswerAttempt } from '../app/personal_plan_quiz_mistake_adapter';
import { getPlanById } from '../app/personal_plan_catalog';
import { planExerciseBlockForTask } from '../app/personal_plan_engine_contracts';
import { loadPersonalPlanQuizProgress, savePersonalPlanQuizProgress } from '../app/personal_plan_quiz_session';
import { readPlanTaskProgress, savePlanTaskProgress } from '../app/personal_plan_task_progress';
import { listPersonalPlanAttemptEvents } from '../app/personal_plan_attempt_events';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import { __resetAccountGenerationForTests, ensureAccountGeneration } from '../app/account_generation';
const quiz: any = { id: 'q', questions: Array.from({ length: 10 }, (_, i) => ({ id: String(i), prompt: 'p', sourcePhraseId: String(i), skill: 's', choices: [{ id: 'wrong', text: 'wrong', isCorrect: false, explanation: 'wrong feedback' }, { id: 'right', text: 'right', isCorrect: true, explanation: 'right feedback' }] })) };
test('wrong answers retain visible feedback and cannot complete', () => { const run = createPersonalPlanQuizRun(quiz); expect(run.answer('wrong')).toEqual(expect.objectContaining({ correct: false, explanation: 'wrong feedback', questionIndex: 0 })); for (let i = 0; i < 9; i++) run.answer('wrong'); expect(run.isComplete()).toBe(false); });
test('correct answer stays on the answered prompt until feedback Continue advances it', () => {
  const run = createPersonalPlanQuizRun(quiz);
  const answer = run.answer('right');
  expect(answer).toEqual(expect.objectContaining({ correct: true, questionIndex: 0 }));
  expect(run.currentQuestion().id).toBe('0');
  expect(run.isComplete()).toBe(false);
  expect(run.continueAfterFeedback()).toEqual({ complete: false, questionIndex: 1 });
  expect(run.currentQuestion().id).toBe('1');
  expect(run.attemptSequence()).toBe(1);
});
test('ten confirmed correct answers complete', () => { const run = createPersonalPlanQuizRun(quiz); for (let i = 0; i < 10; i++) { run.answer('right'); run.continueAfterFeedback(); } expect(run.isComplete()).toBe(true); });
test('screen-used quiz answer journal appends canonical wrong recovery metadata', async () => {
  const plan = getPlanById('gavan');
  const day = plan.days[0];
  const task = day.tasks.find((item) => item.destination.type === 'quiz');
  if (!task || task.destination.type !== 'quiz') throw new Error('missing plan quiz task');
  const block = planExerciseBlockForTask(plan, day, task);
  const question = require('../app/personal_plan_quizzes').getPersonalPlanQuiz(task.destination.quizId)!.questions[0];
  const appended: any[] = [];
  const result = await appendPlanQuizAnswerAttempt({
    block, planInstanceId: 'instance-1', question,
    choiceId: question.choices.find((choice: any) => !choice.isCorrect)!.id,
    attemptId: 'attempt-1', append: async (event: any) => { appended.push(event); return event; },
  });
  expect(result?.event).toEqual(expect.objectContaining({ result: 'wrong', contentUnitId: question.sourcePhraseId, progressEligible: false }));
  expect(result?.recoveryCandidates.map((candidate: { target: string }) => candidate.target)).toEqual(expect.arrayContaining(['recall', 'trainer', 'mistake_analytics']));
  expect(appended).toHaveLength(1);
});
test('persisted attempt sequence keeps wrong-answer journal ids unique after reload', async () => {
  const plan = getPlanById('gavan');
  const day = plan.days[0];
  const task = day.tasks.find((item) => item.destination.type === 'quiz');
  if (!task || task.destination.type !== 'quiz') throw new Error('missing plan quiz task');
  const quiz = require('../app/personal_plan_quizzes').getPersonalPlanQuiz(task.destination.quizId)!;
  const block = planExerciseBlockForTask(plan, day, task);
  let stored: any = null;
  const storage = { read: async () => stored, save: async (_instance: string, _task: string, value: any) => { stored = { ...value, updatedAt: '' }; } };
  const appended: any[] = [];
  const wrongId = quiz.questions[0].choices.find((choice: any) => !choice.isCorrect)!.id;
  const firstRun = createPersonalPlanQuizRun(quiz);
  const first = firstRun.answer(wrongId)!;
  await savePersonalPlanQuizProgress(storage, 'instance-1', task.id, 0, [], first.attemptNumber);
  await appendPlanQuizAnswerAttempt({ block, planInstanceId: 'instance-1', question: quiz.questions[0], choiceId: wrongId, attemptId: `instance-1:${task.id}:0:${first.attemptNumber}`, append: async (event: any) => { appended.push(event); return event; } });
  const progress = await loadPersonalPlanQuizProgress(storage, 'instance-1', task.id);
  const restoredRun = createPersonalPlanQuizRun(quiz, progress!.index, progress!.attemptSequence);
  const second = restoredRun.answer(wrongId)!;
  await appendPlanQuizAnswerAttempt({ block, planInstanceId: 'instance-1', question: quiz.questions[0], choiceId: wrongId, attemptId: `instance-1:${task.id}:0:${second.attemptNumber}`, append: async (event: any) => { appended.push(event); return event; } });
  expect(second.attemptNumber).toBeGreaterThan(first.attemptNumber);
  expect(new Set(appended.map((event) => event.id)).size).toBe(2);
  expect(appended.every((event) => event.result === 'wrong' && event.mistakeTags.includes('plan_quiz_wrong_answer'))).toBe(true);
});
test('screen retains loaded attempt sequence when constructing the quiz run', () => {
  const source = fs.readFileSync(require.resolve('../app/personal_plan_quiz.tsx'), 'utf8');
  expect(source).toContain('setAttemptSequence(progress?.attemptSequence ?? 0)');
  expect(source).toContain('createPersonalPlanQuizRun(quiz, index, attemptSequence)');
});
test('AsyncStorage-backed screen-used path preserves two wrong recovery events across reload', async () => {
  __resetAccountGenerationForTests(); ensureAccountGeneration('quiz-screen-test');
  (AsyncStorage as any).__reset?.();
  const plan = getPlanById('gavan'); const day = plan.days[0]; const task = day.tasks.find((item) => item.destination.type === 'quiz');
  if (!task || task.destination.type !== 'quiz') throw new Error('missing plan quiz task');
  const quiz = require('../app/personal_plan_quizzes').getPersonalPlanQuiz(task.destination.quizId)!;
  const block = planExerciseBlockForTask(plan, day, task); const instanceId = 'quiz-screen-reload'; const wrongId = quiz.questions[0].choices.find((choice: any) => !choice.isCorrect)!.id;
  const storage = { read: readPlanTaskProgress, save: savePlanTaskProgress };
  const firstRun = createPersonalPlanQuizRun(quiz); const first = firstRun.answer(wrongId)!;
  await savePersonalPlanQuizProgress(storage, instanceId, task.id, 0, [], first.attemptNumber);
  await appendPlanQuizAnswerAttempt({ block, planInstanceId: instanceId, question: quiz.questions[0], choiceId: wrongId, attemptId: `${instanceId}:${task.id}:0:${first.attemptNumber}` });
  const progress = await loadPersonalPlanQuizProgress(storage, instanceId, task.id);
  const reloadedRun = createPersonalPlanQuizRun(quiz, progress!.index, progress!.attemptSequence);
  const second = reloadedRun.answer(wrongId)!;
  await savePersonalPlanQuizProgress(storage, instanceId, task.id, 0, [], second.attemptNumber);
  await appendPlanQuizAnswerAttempt({ block, planInstanceId: instanceId, question: quiz.questions[0], choiceId: wrongId, attemptId: `${instanceId}:${task.id}:0:${second.attemptNumber}` });
  const events = await listPersonalPlanAttemptEvents(instanceId);
  expect(events.map((event) => event.id)).toEqual([`${instanceId}:${task.id}:0:1`, `${instanceId}:${task.id}:0:2`]);
  expect(events.every((event) => event.mistakeTags.includes('plan_quiz_wrong_answer'))).toBe(true);
});
