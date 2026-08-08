import { PERSONAL_PLAN_CATALOG, allTasksForDay } from '../app/personal_plan_catalog';
import { getPersonalPlanChooseNaturalPhraseItems } from '../app/personal_plan_choose_natural_phrase_items';
import { getPersonalPlanListenBuildItems } from '../app/personal_plan_listen_build_items';
import { getPersonalPlanListenChooseItems } from '../app/personal_plan_listen_choose_items';
import { getPersonalPlanMissingWordItems } from '../app/personal_plan_missing_word_items';
import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';
import { getPersonalPlanPhraseRecallItems } from '../app/personal_plan_phrase_recall_items';
import { getPersonalPlanPronunciationRepeatItems } from '../app/personal_plan_pronunciation_repeat_items';
import { getPersonalPlanQuiz, validatePersonalPlanQuiz } from '../app/personal_plan_quizzes';

describe('personal plan full catalog task materials', () => {
  it('provides launchable material for every task in every plan day', async () => {
    const gaps: string[] = [];
    let daysChecked = 0;
    let tasksChecked = 0;

    for (const plan of PERSONAL_PLAN_CATALOG) {
      for (const day of plan.days) {
        daysChecked += 1;

        for (const task of allTasksForDay(day)) {
          tasksChecked += 1;
          const prefix = `${plan.id} day ${day.dayIndex} task ${task.kind}`;

          if (task.destination.type === 'plan_phrase_lesson') {
            const lesson = getPersonalPlanPhraseLesson(task.destination.lessonId);
            if (!lesson || lesson.phrases.length < task.destination.requiredPhrases) {
              gaps.push(`${prefix}: missing phrase lesson material`);
            }
          }

          if (task.destination.type === 'plan_phrase_recall') {
            const lesson = getPersonalPlanPhraseLesson(task.destination.lessonId);
            const contentUnitIds = lesson?.phrases.slice(0, task.destination.requiredPhrases).map((phrase) => String(phrase.id)) ?? [];
            const items = await getPersonalPlanPhraseRecallItems({
              planInstanceId: `${plan.id}_catalog_materials_instance`,
              lessonId: task.destination.lessonId,
              contentUnitIds,
            });
            if (items.length < task.destination.requiredPhrases) {
              gaps.push(`${prefix}: missing phrase recall material`);
            }
          }

          if (task.destination.type === 'plan_exercise') {
            const input = {
              lessonId: task.destination.lessonId,
              contentUnitIds: task.destination.contentUnitIds,
            };
            const items = task.destination.exerciseType === 'plan_missing_word'
              ? getPersonalPlanMissingWordItems(input)
              : task.destination.exerciseType === 'plan_choose_natural_phrase'
                ? getPersonalPlanChooseNaturalPhraseItems(input)
                : task.destination.exerciseType === 'plan_listen_choose'
                  ? getPersonalPlanListenChooseItems(input)
                  : task.destination.exerciseType === 'plan_listen_build'
                    ? getPersonalPlanListenBuildItems(input)
                    : getPersonalPlanPronunciationRepeatItems(input);

            if (items.length < task.destination.requiredCorrect) {
              gaps.push(`${prefix}: missing ${task.destination.exerciseType} material`);
            }
          }

          if (task.destination.type === 'quiz') {
            const quiz = getPersonalPlanQuiz(task.destination.quizId);
            if (!quiz || validatePersonalPlanQuiz(quiz).length > 0) gaps.push(`${prefix}: missing plan quiz material`);
          }
        }
      }
    }

    expect({ daysChecked, tasksChecked, gaps }).toEqual({
      daysChecked: 546,
      tasksChecked: 4368,
      gaps: [],
    });
  });
});
