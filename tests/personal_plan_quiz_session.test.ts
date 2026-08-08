import { completePersonalPlanQuiz, createPersonalPlanQuizCompletionGate, validatePersonalPlanQuizRoute } from '../app/personal_plan_quiz_session';
test('rejects forged instance ids', () => expect(validatePersonalPlanQuizRoute({ routePlanId: 'gavan', routeInstanceId: 'bad', activePlanId: 'gavan', activeInstanceId: 'good' })).toBe(false));
test('completion persistence failure prevents XP/navigation and retry works', async () => { let failed = true; const calls: string[] = []; const input = () => ({ markCompleted: async () => { if (failed) { failed = false; throw Error('fail'); } }, award: async () => { calls.push('award'); }, clearProgress: async () => { calls.push('clear'); }, resolveNext: async () => null, navigateNext: () => calls.push('next'), navigateHome: () => calls.push('home') }); expect(await completePersonalPlanQuiz(input())).toBe(false); expect(calls).toEqual([]); expect(await completePersonalPlanQuiz(input())).toBe(true); expect(calls).toEqual(['award', 'clear', 'home']); });
test('screen-used completion gate serializes double Continue and releases after persistence failure', async () => {
  let fail = true;
  const calls: string[] = [];
  const gate = createPersonalPlanQuizCompletionGate();
  const input = () => ({
    markCompleted: async () => { calls.push('mark'); if (fail) { fail = false; throw Error('write failed'); } },
    award: async () => { calls.push('award'); }, clearProgress: async () => { calls.push('clear'); },
    resolveNext: async () => { calls.push('resolve'); return null; }, navigateNext: () => calls.push('next'), navigateHome: () => calls.push('home'),
  });
  await Promise.all([gate.complete(input()), gate.complete(input())]);
  expect(calls).toEqual(['mark']);
  await Promise.all([gate.complete(input()), gate.complete(input())]);
  expect(calls).toEqual(['mark', 'mark', 'award', 'clear', 'resolve', 'home']);
});
