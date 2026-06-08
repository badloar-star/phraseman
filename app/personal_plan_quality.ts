import type {
  PersonalPlanDefinition,
  PlanDailyTask,
  PlanDay,
  PlanMinutesChoice,
  PlanTaskDestination,
} from './personal_plan_catalog';
import type { LessonPhrase } from './lesson_data_types';
import { getLessonData } from './lesson_data_all';
import { tasksForMinutes } from './personal_plan_catalog';
import { PERSONAL_PLAN_PHRASE_LESSONS } from './personal_plan_phrase_lessons';
import {
  getPersonalPlanQuizCoverage,
  getPersonalPlanQuizPhrases,
  type PersonalPlanQuizSource,
} from './personal_plan_quizzes';
import {
  getPersonalPlanMissingWordItems,
  validatePersonalPlanMissingWordItemQuality,
} from './personal_plan_missing_word_items';

export const PERSONAL_PLAN_GENERATION_STANDARDS_VERSION = '2026-05-31.after-answer-recall-v1';

export type PersonalPlanDayQualityCode =
  | 'missing_day_copy'
  | 'missing_tasks'
  | 'invalid_task_order'
  | 'bad_copy'
  | 'missing_phrase_lesson'
  | 'empty_phrase_lesson'
  | 'missing_teaching_notes'
  | 'missing_quiz'
  | 'quiz_question_count'
  | 'quiz_explanations_count'
  | 'missing_quiz_coverage'
  | 'uncovered_quiz_item'
  | 'forbidden_question_grammar'
  | 'blocked_grammar_tag'
  | 'missing_word_option_count'
  | 'missing_word_correct_option_count'
  | 'missing_word_option_reuses_phrase_token'
  | 'unsafe_missing_word_slot'
  | 'unsafe_missing_word_option'
  | 'scaffold_day'
  | 'missing_required_phrase_ids'
  | 'missing_life_outcome'
  | 'missing_curriculum';

export type PersonalPlanDayQualityIssue = {
  code: PersonalPlanDayQualityCode;
  planId: string;
  dayIndex: number;
  taskId?: string;
  detail: string;
};

export type PersonalPlanDayPassport = {
  standardVersion: string;
  planId: string;
  dayIndex: number;
  dayId: string;
  title: string;
  ready: boolean;
  issueCount: number;
  taskKinds: string[];
  curriculum: {
    lessonPrerequisites: number[];
    allowedGrammarTags: string[];
    blockedGrammarTags: string[];
    phraseGrammarTags: string[];
  };
  coverage: {
    lessonPhraseIds: string[];
    planPhraseLessonIds: string[];
    recallPhraseLessonIds: string[];
    quizIds: string[];
    quizQuestionSources: Array<{
      quizId: string;
      questionId: string;
      sourceIds: string[];
      covered: boolean;
    }>;
  };
  load: {
    byMinutes: Record<PlanMinutesChoice, {
      taskCount: number;
      estimatedMinutes: number;
      withinBudget: boolean;
    }>;
  };
  issues: PersonalPlanDayQualityIssue[];
};

const BAD_COPY_PATTERNS = [
  /обычн/i,
  /примен/i,
  /маршрут/i,
  /сцен/i,
  /конструкц/i,
  /чернов/i,
  /собираем/i,
  /канцеляр/i,
  /задание дня/i,
  /active recall/i,
  /актив рекол/i,
  /destination/i,
  /source/i,
  /dev/i,
  /планов(ый|ого|ому|ым)\s+сч[её]тчик/i,
  /нужное количество/i,
];

const KEY_VOCAB_NOTE_CATEGORIES = new Set([
  'route-place',
  'route-task',
  'place',
  'adjective',
  'verb',
]);

function addIssue(
  issues: PersonalPlanDayQualityIssue[],
  plan: PersonalPlanDefinition,
  day: PlanDay,
  code: PersonalPlanDayQualityCode,
  detail: string,
  task?: PlanDailyTask,
): void {
  issues.push({
    code,
    planId: plan.id,
    dayIndex: day.dayIndex,
    taskId: task?.id,
    detail,
  });
}

function userCopyForDay(day: PlanDay): string {
  return JSON.stringify({
    title: day.title,
    focus: day.focus,
    phraseGoal: day.phraseGoal,
    theory: day.theory,
    tasks: day.tasks.map((task) => ({
      title: task.title,
      subtitle: task.subtitle,
    })),
  });
}

function hasLessonTwoBeforeQuiz(day: PlanDay): boolean {
  return day.tasks.some((task) => task.destination.type === 'lesson' && task.destination.lessonId === 2);
}

function phraseText(phrase: LessonPhrase): string {
  return [
    phrase.english,
    ...(phrase.alternatives ?? []),
    ...(phrase.words ?? []).map((word) => word.correct || word.text),
  ].join(' ');
}

function inferPhraseGrammarTags(phrase: LessonPhrase): string[] {
  const text = phraseText(phrase);
  const lower = text.toLowerCase();
  const tags = new Set<string>();
  const hasNameSlot = lower.includes('{{name}}') || (phrase.words ?? []).some((word) => word.category === 'name');
  const hasToBe = /\b(am|are|is)\b/i.test(text) || /\b(i'm|you're|we're|they're|he's|she's|it's)\b/i.test(lower);

  if (/[?]/.test(text) || /^(am|are|is)\b/i.test(text.trim())) tags.add('to-be-question');
  if (/^(do|does|did)\b/i.test(text.trim())) tags.add('do-question');
  if (/^(what|where|who|when|why|how)\b/i.test(text.trim())) tags.add('wh-question');
  if (/\b(have|has)\b/i.test(text)) tags.add('have-has');
  if (hasToBe && !tags.has('to-be-question')) tags.add('to-be-statement');
  if (hasNameSlot) tags.add('identity');
  if (/\bfor\b/i.test(text)) tags.add('purpose');
  if (/\bunder\b/i.test(text) && hasNameSlot) tags.add('booking-name');
  if (/\b(address|postcode|street|apartment|flat)\b/i.test(text)) tags.add('address');
  if (/\b(phone|number|email|mail|dot)\b/i.test(text)) tags.add('contact');
  if (/\b(here|outside|inside|in)\b/i.test(text)) tags.add('location');

  return [...tags];
}

function phrasesForDay(day: PlanDay): LessonPhrase[] {
  const phrases: LessonPhrase[] = [];

  for (const task of day.tasks) {
    if (task.destination.type === 'lesson' && typeof task.destination.lessonId === 'number') {
      const required = new Set(task.destination.requiredPhraseIds ?? []);
      const lessonPhrases = getLessonData(task.destination.lessonId);
      phrases.push(...lessonPhrases.filter((phrase) => required.size === 0 || required.has(String(phrase.id))));
    }
    if (task.destination.type === 'plan_phrase_lesson' || task.destination.type === 'plan_phrase_recall') {
      const lesson = PERSONAL_PLAN_PHRASE_LESSONS[task.destination.lessonId];
      phrases.push(...(lesson?.phrases.slice(0, task.destination.requiredPhrases) ?? []));
    }
  }

  return phrases;
}

function phraseGrammarTagsForDay(day: PlanDay): string[] {
  const tags = new Set<string>();
  for (const phrase of phrasesForDay(day)) {
    for (const tag of inferPhraseGrammarTags(phrase)) tags.add(tag);
  }
  return [...tags];
}

function sourceId(source: PersonalPlanQuizSource): string {
  if (source.type === 'lesson_phrase') return `lesson_phrase:${source.id}`;
  return `plan_phrase:${source.lessonId}:${source.phraseId}`;
}

function collectAvailableCoverageSources(day: PlanDay): Set<string> {
  const available = new Set<string>();

  for (const task of day.tasks) {
    if (task.destination.type === 'lesson') {
      for (const id of task.destination.requiredPhraseIds ?? []) {
        available.add(`lesson_phrase:${id}`);
      }
    }
    if (task.destination.type === 'plan_phrase_lesson' || task.destination.type === 'plan_phrase_recall') {
      const lesson = PERSONAL_PLAN_PHRASE_LESSONS[task.destination.lessonId];
      for (const phrase of lesson?.phrases.slice(0, task.destination.requiredPhrases) ?? []) {
        available.add(`plan_phrase:${task.destination.lessonId}:${String(phrase.id)}`);
      }
    }
  }

  return available;
}

function buildQuizQuestionSources(day: PlanDay): PersonalPlanDayPassport['coverage']['quizQuestionSources'] {
  const available = collectAvailableCoverageSources(day);
  const result: PersonalPlanDayPassport['coverage']['quizQuestionSources'] = [];

  for (const task of day.tasks) {
    if (task.destination.type !== 'quiz') continue;
    const quiz = getPersonalPlanQuizPhrases(task.destination.quizId, 'Alex') ?? [];
    const coverage = getPersonalPlanQuizCoverage(task.destination.quizId);
    for (const item of quiz) {
      const questionId = item.questionId ?? '';
      const sources: PersonalPlanQuizSource[] = coverage?.[questionId] ?? [];
      const sourceIds = sources.map(sourceId);
      result.push({
        quizId: task.destination.quizId,
        questionId,
        sourceIds,
        covered: sourceIds.some((id: string) => available.has(id)),
      });
    }
  }

  return result;
}

function validateTaskOrder(
  issues: PersonalPlanDayQualityIssue[],
  plan: PersonalPlanDefinition,
  day: PlanDay,
): void {
  if (!Array.isArray(day.tasks) || day.tasks.length === 0) return;

  const firstTask = day.tasks[0];
  const isWeeklyReviewDay = day.dayIndex % 7 === 0;
  if (!isWeeklyReviewDay && firstTask.kind !== 'plan_phrase_lesson') {
    addIssue(
      issues,
      plan,
      day,
      'invalid_task_order',
      'Every content day must start with a personal plan phrase task.',
      firstTask,
    );
  }

  const planPhraseIndex = day.tasks.findIndex((task) => task.kind === 'plan_phrase_lesson');
  const lessonTask = day.tasks.find((task) => task.destination.type === 'lesson' || task.kind === 'linked_lesson_slice');
  if (lessonTask) {
    addIssue(
      issues,
      plan,
      day,
      'invalid_task_order',
      'Personal plan days must not open normal lesson tasks.',
      lessonTask,
    );
  }
}

function validatePhraseDestination(
  issues: PersonalPlanDayQualityIssue[],
  plan: PersonalPlanDefinition,
  day: PlanDay,
  task: PlanDailyTask,
  destination: Extract<PlanTaskDestination, { type: 'plan_phrase_lesson' | 'plan_phrase_recall' }>,
): void {
  const lesson = PERSONAL_PLAN_PHRASE_LESSONS[destination.lessonId];
  if (!lesson) {
    addIssue(issues, plan, day, 'missing_phrase_lesson', `Missing phrase lesson "${destination.lessonId}"`, task);
    return;
  }
  if (!Array.isArray(lesson.phrases) || lesson.phrases.length < destination.requiredPhrases) {
    addIssue(issues, plan, day, 'empty_phrase_lesson', `Phrase lesson "${destination.lessonId}" has too few phrases`, task);
  }

  const phrasesNeedingNotes = lesson.phrases.slice(0, destination.requiredPhrases);
  const phraseWithoutNote = phrasesNeedingNotes.find((phrase) => {
    const words = phrase.words ?? [];
    return !words.some((word) => word.category !== 'name' && word.teachingNote);
  });
  if (phraseWithoutNote) {
    addIssue(
      issues,
      plan,
      day,
      'missing_teaching_notes',
      `Phrase lesson "${destination.lessonId}" has a phrase without teachingNote: ${String(phraseWithoutNote.id)}`,
      task,
    );
  }

  const wordWithoutVocabNote = phrasesNeedingNotes.flatMap((phrase) => phrase.words ?? []).find((word) => {
    if (!word.category || !KEY_VOCAB_NOTE_CATEGORIES.has(word.category)) return false;
    return !word.teachingNote;
  });
  if (wordWithoutVocabNote) {
    addIssue(
      issues,
      plan,
      day,
      'missing_teaching_notes',
      `Key route vocabulary "${wordWithoutVocabNote.correct || wordWithoutVocabNote.text}" must have teachingNote`,
      task,
    );
  }
}

function validateQuizDestination(
  issues: PersonalPlanDayQualityIssue[],
  plan: PersonalPlanDefinition,
  day: PlanDay,
  task: PlanDailyTask,
  destination: Extract<PlanTaskDestination, { type: 'quiz' }>,
): void {
  const quiz = getPersonalPlanQuizPhrases(destination.quizId, 'Alex');
  if (!quiz) {
    addIssue(issues, plan, day, 'missing_quiz', `Missing quiz "${destination.quizId}"`, task);
    return;
  }
  if (destination.questionCount !== 10 || quiz.length !== 10) {
    addIssue(issues, plan, day, 'quiz_question_count', `Quiz "${destination.quizId}" must contain 10 questions`, task);
  }
  const quizItemWithoutPerChoiceExplanation = quiz.find((item) => {
    const choiceCount = item.choices.length;
    return item.explanations.length !== choiceCount || item.explanationsUK.length !== choiceCount;
  });
  if (quizItemWithoutPerChoiceExplanation) {
    addIssue(
      issues,
      plan,
      day,
      'quiz_explanations_count',
      `Quiz "${destination.quizId}" must explain every answer choice: ${String(quizItemWithoutPerChoiceExplanation.questionId)}`,
      task,
    );
  }
  if (!hasLessonTwoBeforeQuiz(day)) {
    const hasQuestionGrammar = quiz.some((item) => {
      const texts = [item.ru, item.uk, ...item.choices];
      return texts.some((text) => text.includes('?') || /^(Are|Is|Am)\b/i.test(text));
    });
    if (hasQuestionGrammar) {
      addIssue(issues, plan, day, 'forbidden_question_grammar', `Quiz "${destination.quizId}" uses questions before lesson 2`, task);
    }
  }

  const coverage = getPersonalPlanQuizCoverage(destination.quizId);
  if (!coverage) {
    addIssue(issues, plan, day, 'missing_quiz_coverage', `Quiz "${destination.quizId}" must declare source phrases`, task);
    return;
  }

  const available = collectAvailableCoverageSources(day);
  const uncoveredItem = quiz.find((item) => {
    const questionId = item.questionId ?? '';
    const sources: PersonalPlanQuizSource[] = coverage[questionId] ?? [];
    return sources.length === 0 || !sources.some((source: PersonalPlanQuizSource) => available.has(sourceId(source)));
  });
  if (uncoveredItem) {
    addIssue(
      issues,
      plan,
      day,
      'uncovered_quiz_item',
      `Quiz "${destination.quizId}" asks "${String(uncoveredItem.questionId)}" before its source phrase is in the day`,
      task,
    );
  }
}

function validatePlanExerciseDestination(
  issues: PersonalPlanDayQualityIssue[],
  plan: PersonalPlanDefinition,
  day: PlanDay,
  task: PlanDailyTask,
  destination: Extract<PlanTaskDestination, { type: 'plan_exercise' }>,
): void {
  if (destination.exerciseType !== 'plan_missing_word') return;

  const items = getPersonalPlanMissingWordItems({
    lessonId: destination.lessonId,
    contentUnitIds: destination.contentUnitIds,
  });
  const itemIssues = validatePersonalPlanMissingWordItemQuality(items);

  if (items.length < destination.requiredCorrect) {
    addIssue(
      issues,
      plan,
      day,
      'missing_word_option_count',
      `Missing-word exercise "${task.id}" has fewer items than required correct answers`,
      task,
    );
  }

  for (const itemIssue of itemIssues) {
    addIssue(
      issues,
      plan,
      day,
      itemIssue.code,
      `${itemIssue.itemId}: ${itemIssue.detail}`,
      task,
    );
  }
}

export function validatePersonalPlanDay(
  plan: PersonalPlanDefinition,
  day: PlanDay,
): PersonalPlanDayQualityIssue[] {
  const issues: PersonalPlanDayQualityIssue[] = [];

  if (!day.title.trim() || !day.focus.trim() || !day.phraseGoal.trim()) {
    addIssue(issues, plan, day, 'missing_day_copy', 'Day title, focus, and phrase goal are required');
  }
  if (day.status === 'scaffold') {
    addIssue(issues, plan, day, 'scaffold_day', 'Scaffold days are not certified content yet');
  }
  if (!day.lifeOutcome?.trim()) {
    addIssue(issues, plan, day, 'missing_life_outcome', 'Day must declare one real-world outcome');
  }
  if (!day.curriculum?.lessonPrerequisites?.length || !day.curriculum.allowedGrammarTags?.length) {
    addIssue(issues, plan, day, 'missing_curriculum', 'Day must declare curriculum prerequisites and allowed grammar tags');
  }
  const blockedGrammarTags = new Set(day.curriculum?.blockedGrammarTags ?? []);
  const blockedPhraseTag = phraseGrammarTagsForDay(day).find((tag) => blockedGrammarTags.has(tag));
  if (blockedPhraseTag) {
    addIssue(issues, plan, day, 'blocked_grammar_tag', `Day uses blocked grammar tag "${blockedPhraseTag}"`);
  }
  if (!Array.isArray(day.tasks) || day.tasks.length === 0) {
    addIssue(issues, plan, day, 'missing_tasks', 'Day must contain tasks');
  }

  validateTaskOrder(issues, plan, day);

  const copy = userCopyForDay(day);
  if (BAD_COPY_PATTERNS.some((pattern) => pattern.test(copy))) {
    addIssue(issues, plan, day, 'bad_copy', 'Day copy contains banned wording');
  }

  const hasQuiz = day.tasks.some((task) => task.destination.type === 'quiz');
  if (!hasQuiz) {
    addIssue(issues, plan, day, 'missing_quiz', 'Every generated day must include a dedicated daily quiz task');
  }

  for (const task of day.tasks) {
    if (task.destination.type === 'lesson' && (!task.destination.requiredPhraseIds || task.destination.requiredPhraseIds.length === 0)) {
      addIssue(issues, plan, day, 'missing_required_phrase_ids', 'Plan lesson task must declare exact lesson phrase ids', task);
    }
    if (task.destination.type === 'plan_phrase_lesson' || task.destination.type === 'plan_phrase_recall') {
      validatePhraseDestination(issues, plan, day, task, task.destination);
    }
    if (task.destination.type === 'quiz') {
      validateQuizDestination(issues, plan, day, task, task.destination);
    }
    if (task.destination.type === 'plan_exercise') {
      validatePlanExerciseDestination(issues, plan, day, task, task.destination);
    }
  }

  return issues;
}

function buildCoverage(day: PlanDay): PersonalPlanDayPassport['coverage'] {
  const lessonPhraseIds = new Set<string>();
  const planPhraseLessonIds = new Set<string>();
  const recallPhraseLessonIds = new Set<string>();
  const quizIds = new Set<string>();

  for (const task of day.tasks) {
    if (task.destination.type === 'lesson') {
      for (const id of task.destination.requiredPhraseIds ?? []) lessonPhraseIds.add(id);
    }
    if (task.destination.type === 'plan_phrase_lesson') {
      planPhraseLessonIds.add(task.destination.lessonId);
    }
    if (task.destination.type === 'plan_phrase_recall') {
      recallPhraseLessonIds.add(task.destination.lessonId);
    }
    if (task.destination.type === 'quiz') {
      quizIds.add(task.destination.quizId);
    }
  }

  return {
    lessonPhraseIds: [...lessonPhraseIds],
    planPhraseLessonIds: [...planPhraseLessonIds],
    recallPhraseLessonIds: [...recallPhraseLessonIds],
    quizIds: [...quizIds],
    quizQuestionSources: buildQuizQuestionSources(day),
  };
}

function buildLoad(day: PlanDay): PersonalPlanDayPassport['load'] {
  const minutesChoices: PlanMinutesChoice[] = [5, 10, 15, 20];
  const byMinutes = minutesChoices.reduce((acc, minutes) => {
    const tasks = tasksForMinutes(day, minutes);
    const estimatedMinutes = tasks.reduce((sum, task) => sum + task.minutes, 0);
    acc[minutes] = {
      taskCount: tasks.length,
      estimatedMinutes,
      withinBudget: estimatedMinutes <= minutes,
    };
    return acc;
  }, {} as PersonalPlanDayPassport['load']['byMinutes']);

  return { byMinutes };
}

export function buildPersonalPlanDayPassport(
  plan: PersonalPlanDefinition,
  day: PlanDay,
): PersonalPlanDayPassport {
  const issues = validatePersonalPlanDay(plan, day);
  return {
    standardVersion: PERSONAL_PLAN_GENERATION_STANDARDS_VERSION,
    planId: plan.id,
    dayIndex: day.dayIndex,
    dayId: day.id,
    title: day.title,
    ready: issues.length === 0,
    issueCount: issues.length,
    taskKinds: day.tasks.map((task) => task.kind),
    curriculum: {
      lessonPrerequisites: day.curriculum?.lessonPrerequisites ?? [],
      allowedGrammarTags: day.curriculum?.allowedGrammarTags ?? [],
      blockedGrammarTags: day.curriculum?.blockedGrammarTags ?? [],
      phraseGrammarTags: phraseGrammarTagsForDay(day),
    },
    coverage: buildCoverage(day),
    load: buildLoad(day),
    issues,
  };
}
