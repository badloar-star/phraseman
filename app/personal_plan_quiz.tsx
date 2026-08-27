import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getPlanById, type PersonalPlanId } from './personal_plan_catalog';
import { getPersonalPlanQuiz } from './personal_plan_quizzes';
import { createPersonalPlanQuizRun } from './personal_plan_quiz_runtime';
import { validatePersonalPlanQuizRoute, loadPersonalPlanQuizProgress, savePersonalPlanQuizProgress, createPersonalPlanQuizCompletionGate } from './personal_plan_quiz_session';
import { readPersonalPlanState } from './personal_plan_state';
import { readPlanTaskProgress, savePlanTaskProgress, clearPlanTaskProgress } from './personal_plan_task_progress';
import { markPersonalPlanTaskCompleted } from './personal_plan_progress';
import { awardPlanTaskCompletion } from './personal_plan_xp';
import { resolveNextPlanTask } from './personal_plan_next_task';
import { openPersonalPlanTask, personalPlanTaskStartsPaidExercise } from './personal_plan_navigation';
import { planExerciseBlockForTask } from './personal_plan_engine_contracts';
import { appendPlanQuizAnswerAttempt } from './personal_plan_quiz_mistake_adapter';
import { useLang } from '../components/LangContext';
import { withPersonalPlanSunsetGuard } from '../components/personal_plan_sunset_guard';
import EnergyCostBadge from '../components/EnergyCostBadge';
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? '' : value ?? '';
function PersonalPlanQuizScreen() {
  const params = useLocalSearchParams(); const router = useRouter(); const { lang } = useLang();
  const planId = first(params.planId) as PersonalPlanId; const taskId = first(params.planTaskId); const instanceId = first(params.planInstanceId); const quizId = first(params.planQuizId); const dayIndex = Number(first(params.planDayIndex));
  const [active, setActive] = useState<{ planId: string; instanceId: string } | null>(null); const [index, setIndex] = useState<number | null>(null); const [attemptSequence, setAttemptSequence] = useState<number | null>(null); const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | null>(null); const [nextTaskStartsPaid, setNextTaskStartsPaid] = useState(false); const run = useRef<ReturnType<typeof createPersonalPlanQuizRun> | null>(null); const completionGate = useRef(createPersonalPlanQuizCompletionGate());
  useEffect(() => { void readPersonalPlanState().then(async (state) => { if (!state) return; setActive({ planId: state.planId, instanceId: state.planInstanceId }); const progress = await loadPersonalPlanQuizProgress({ read: readPlanTaskProgress, save: savePlanTaskProgress }, state.planInstanceId, taskId); setIndex(progress?.index ?? 0); setAttemptSequence(progress?.attemptSequence ?? 0); }); }, [taskId]);
  useEffect(() => { let cancelled = false; void resolveNextPlanTask({ completedTaskId: taskId }).then((next) => { if (!cancelled) setNextTaskStartsPaid(Boolean(next && personalPlanTaskStartsPaidExercise(next.task))); }).catch(() => { if (!cancelled) setNextTaskStartsPaid(false); }); return () => { cancelled = true; }; }, [taskId]);
  if (!active || index === null || attemptSequence === null || !validatePersonalPlanQuizRoute({ routePlanId: planId, routeInstanceId: instanceId, activePlanId: active.planId, activeInstanceId: active.instanceId })) return <View><Text>Quiz is unavailable for this plan task.</Text></View>;
  const plan = getPlanById(planId); const day = plan.days.find((item) => item.dayIndex === dayIndex); const task = day?.tasks.find((item) => item.id === taskId && item.destination.type === 'quiz' && item.destination.quizId === quizId); const quiz = task && getPersonalPlanQuiz(quizId);
  if (!day || !task || !quiz) return <View><Text>Quiz is unavailable for this plan task.</Text></View>;
  if (!run.current) run.current = createPersonalPlanQuizRun(quiz, index, attemptSequence); const question = run.current.currentQuestion(); const block = planExerciseBlockForTask(plan, day, task);
  const choose = (choiceId: string) => { if (feedback) return; const result = run.current?.answer(choiceId); if (!result) return; setAttemptSequence(result.attemptNumber); void savePersonalPlanQuizProgress({ read: readPlanTaskProgress, save: savePlanTaskProgress }, instanceId, taskId, index, quiz.questions.slice(0, index).map((item) => item.id), result.attemptNumber).catch(() => undefined); void appendPlanQuizAnswerAttempt({ block, planInstanceId: instanceId, question, choiceId, attemptId: `${instanceId}:${taskId}:${question.id}:${result.attemptNumber}` }).catch(() => undefined); setFeedback({ text: result.explanation, correct: result.correct }); };
  const continueQuiz = async () => { if (!feedback) return; if (!feedback.correct) { setFeedback(null); return; } const advanced = run.current?.continueAfterFeedback(); if (!advanced) return; if (!advanced.complete) { await savePersonalPlanQuizProgress({ read: readPlanTaskProgress, save: savePlanTaskProgress }, instanceId, taskId, advanced.questionIndex, quiz.questions.slice(0, advanced.questionIndex).map((item) => item.id), run.current?.attemptSequence() ?? 0); setIndex(advanced.questionIndex); setFeedback(null); return; } const ok = await completionGate.current.complete({ markCompleted: () => markPersonalPlanTaskCompleted({ taskId, planId, planInstanceId: instanceId, dayIndex }), award: () => awardPlanTaskCompletion({ lang, planInstanceId: instanceId, planTaskId: taskId, practicedPhraseIds: quiz.questions.map((item) => item.sourcePhraseId!).filter(Boolean) }), clearProgress: () => clearPlanTaskProgress(instanceId, taskId), resolveNext: () => resolveNextPlanTask({ completedTaskId: taskId }), navigateNext: (next) => { const item = next as Awaited<ReturnType<typeof resolveNextPlanTask>>; if (item) openPersonalPlanTask(router, item.plan, item.day, item.task, item.planInstanceId, 'replace'); }, navigateHome: () => router.replace('/personal_plan' as any) }); if (ok) setFeedback(null); };
  return <View><Text>{`${index + 1} / 10`}</Text><Text>{question.prompt}</Text>{question.choices.map((choice) => <TouchableOpacity key={choice.id} disabled={Boolean(feedback)} onPress={() => choose(choice.id)}><Text>{choice.text}</Text></TouchableOpacity>)}{feedback ? <><Text>{feedback.text}</Text><TouchableOpacity onPress={() => void continueQuiz()}><Text>{feedback.correct ? 'Continue' : 'Try again'}</Text>{feedback.correct && index >= quiz.questions.length - 1 && nextTaskStartsPaid ? <EnergyCostBadge testID="personal-plan-quiz-next-energy-cost" /> : null}</TouchableOpacity></> : null}</View>;
}

export default withPersonalPlanSunsetGuard(PersonalPlanQuizScreen);
