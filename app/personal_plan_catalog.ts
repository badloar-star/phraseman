import { lessonGateForDay } from './plan_lesson_gate';
import { requiredMinutesForKind, tailOrderForPlanDay } from './personal_plan_mode_profiles';

export type PersonalPlanId = 'voyazh' | 'mitap' | 'gavan' | 'impuls' | 'echo';
const PERSONAL_PLAN_IDS: PersonalPlanId[] = ['voyazh', 'mitap', 'gavan', 'impuls', 'echo'];
export type PlanMinutesChoice = 5 | 10 | 15 | 20;
export type PlanTaskKind =
  | 'linked_lesson_slice'
  | 'plan_phrase_lesson'
  | 'plan_phrase_recall'
  | 'plan_missing_word'
  | 'plan_choose_natural_phrase'
  | 'plan_listen_choose'
  | 'plan_listen_build'
  | 'plan_pronunciation_repeat'
  | 'plan_quiz'
  | 'personal_practice_seeded'
  | 'trainer_weak_spot'
  | 'flashcards_plan_review'
  | 'active_recall';

export type PlanTaskDestination =
  | { type: 'lesson'; lessonId: number | null; requiredPhrases: number; requiredPhraseIds?: string[] }
  | { type: 'plan_phrase_lesson'; lessonId: string; requiredPhrases: number; afterLessonId: number }
  | {
      type: 'plan_phrase_recall';
      lessonId: string;
      requiredPhrases: number;
      afterLessonId: number;
      recallScope?: 'same_day' | 'previous_day';
      sourceDayIndex?: number;
    }
  | {
      type: 'plan_exercise';
      exerciseType: 'plan_missing_word' | 'plan_choose_natural_phrase' | 'plan_listen_choose' | 'plan_listen_build' | 'plan_pronunciation_repeat';
      lessonId: string;
      contentUnitIds: string[];
      requiredCorrect: number;
    }
  | { type: 'quiz'; quizId: string; questionCount: 10; level: 'easy' | 'medium' | 'hard'; thematicCategoryId?: string }
  | {
      type: 'practice';
      trainingId: string;
      requiredPhrases?: number;
      requiredWords?: number;
    }
  | { type: 'trainer'; mode: 'weak' | 'smart_mix' | 'hard'; requiredItems?: number; planScoped?: boolean }
  | { type: 'flashcards'; deckId: string; requiredCards?: number }
  | { type: 'recall'; phraseIds: string[] };

export type PlanDailyTask = {
  id: string;
  kind: PlanTaskKind;
  title: string;
  subtitle: string;
  minutes: number;
  requiredFor: PlanMinutesChoice[];
  destination: PlanTaskDestination;
};

export type PlanDay = {
  id: string;
  dayIndex: number;
  weekIndex: number;
  status?: 'certified' | 'authored_needs_review' | 'scaffold';
  source?: PlanDaySourceBinding;
  title: string;
  focus: string;
  phraseGoal: string;
  theory: string;
  lifeOutcome?: string;
  curriculum?: {
    lessonPrerequisites: number[];
    allowedGrammarTags: string[];
    blockedGrammarTags?: string[];
  };
  recallSchedule?: Array<{
    fromDayIndex: number;
    phraseLessonId: string;
    phraseIds: string[];
  }>;
  tasks: PlanDailyTask[];
};

export type PlanDaySourceBinding = {
  status: 'accepted_candidate_runtime_bound' | 'scaffold_generated';
  candidateId?: string;
  generatedPacketId?: string;
  generationHarnessStatus?: 'valid_non_live_dry_run';
  sourceRuntimeWriteAllowed: boolean;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  audioReadiness: 'not_live_registered';
  pronunciationReadiness: 'needs_real_scorer_recording_evidence';
};

export type PersonalPlanDefinition = {
  id: PersonalPlanId;
  name: string;
  goal: string;
  horizonWeeks: number;
  recommendedLevel: string;
  minutesDefault: PlanMinutesChoice;
  accent: string;
  shortFocus: string;
  days: PlanDay[];
};

export function normalizePlanMinutes(value: number | string | null | undefined): PlanMinutesChoice {
  const raw = typeof value === 'string' ? parseInt(value, 10) : value;
  if (raw === 5 || raw === 10 || raw === 15) return raw;
  return 20;
}

export function allTasksForDay(day: PlanDay): PlanDailyTask[] {
  return day.tasks.filter((task) => task.kind !== 'linked_lesson_slice' && task.destination.type !== 'lesson');
}

function initialVisibleTaskCount(day: PlanDay, minutes: PlanMinutesChoice): number {
  const dayRole = day.dayIndex % 7 === 0 ? 'check' : day.dayIndex % 3 === 0 ? 'light' : 'normal';
  if (minutes === 5) return dayRole === 'check' ? 4 : dayRole === 'light' ? 2 : 3;
  if (minutes === 10) return dayRole === 'check' ? 5 : dayRole === 'light' ? 3 : 4;
  if (minutes === 15) return dayRole === 'light' ? 4 : 5;
  return dayRole === 'light' ? 5 : 6;
}

export function tasksForMinutes(day: PlanDay, minutes: PlanMinutesChoice): PlanDailyTask[] {
  const tasks = allTasksForDay(day);
  return tasks.slice(0, Math.min(tasks.length, initialVisibleTaskCount(day, minutes)));
}

export type PlanAddMoreTaskOptions = {
  planTrainerWeakSpotAvailable?: boolean;
};

function planIdFromDay(day: PlanDay): PersonalPlanId | null {
  const maybePlanId = day.id.split('_d')[0] as PersonalPlanId;
  return PERSONAL_PLAN_IDS.includes(maybePlanId) ? maybePlanId : null;
}

function buildPlanMistakesAddMoreTask(day: PlanDay): PlanDailyTask | null {
  const planId = planIdFromDay(day);
  if (!planId) return null;
  return buildTask(
    planId,
    day.dayIndex,
    'trainer_weak_spot',
    'plan_mistakes',
    'Разобрать ошибки маршрута',
    'Только те ошибки, которые попали в "Моя практика" из этого маршрута.',
    5,
    [5, 10, 15, 20],
    { type: 'trainer', mode: 'weak', requiredItems: 1, planScoped: true },
  );
}

function addMoreTasksAfterVisibleSlice(
  day: PlanDay,
  minutes: PlanMinutesChoice,
  options: PlanAddMoreTaskOptions = {},
): PlanDailyTask[] {
  const tasks = allTasksForDay(day);
  const firstAddMoreIndex = Math.min(tasks.length, initialVisibleTaskCount(day, minutes));
  const queue = tasks.slice(firstAddMoreIndex);
  if (!options.planTrainerWeakSpotAvailable || queue.some((task) => task.kind === 'trainer_weak_spot')) {
    return queue;
  }

  const mistakesTask = buildPlanMistakesAddMoreTask(day);
  if (!mistakesTask) return queue;

  const recallIndex = queue.findIndex((task) => task.kind === 'plan_phrase_recall');
  const insertIndex = recallIndex >= 0 ? recallIndex + 1 : 0;
  return [
    ...queue.slice(0, insertIndex),
    mistakesTask,
    ...queue.slice(insertIndex),
  ];
}

export function visibleTasksForMinutes(
  day: PlanDay,
  minutes: PlanMinutesChoice,
  additionalVisibleTasks = 0,
  options: PlanAddMoreTaskOptions = {},
): PlanDailyTask[] {
  const baseTasks = tasksForMinutes(day, minutes);
  const extraCount = Math.max(0, Math.floor(additionalVisibleTasks));
  if (extraCount <= 0) return baseTasks;
  return [
    ...baseTasks,
    ...addMoreTasksAfterVisibleSlice(day, minutes, options).slice(0, extraCount),
  ];
}

export function nextTaskAfterVisibleSlice(
  day: PlanDay,
  minutes: PlanMinutesChoice,
  additionalVisibleTasks: number,
  options: PlanAddMoreTaskOptions = {},
): PlanDailyTask | null {
  const index = Math.max(0, Math.floor(additionalVisibleTasks));
  return addMoreTasksAfterVisibleSlice(day, minutes, options)[index] ?? null;
}

function taskId(planId: PersonalPlanId, day: number, suffix: string): string {
  return `${planId}_d${String(day).padStart(3, '0')}_${suffix}`;
}

function acceptedCandidateId(planId: PersonalPlanId, dayIndex: number): string {
  return `${planId}_d${String(dayIndex).padStart(3, '0')}_chat_draft_candidate`;
}

function sourceBindingForDay(planId: PersonalPlanId, dayIndex: number): PlanDaySourceBinding {
  if (dayIndex <= 28) {
    return {
      status: 'accepted_candidate_runtime_bound',
      candidateId: acceptedCandidateId(planId, dayIndex),
      ...(planId === 'voyazh' && dayIndex === 1
        ? {
          generatedPacketId: 'voyazh_d001_generator_packet',
          generationHarnessStatus: 'valid_non_live_dry_run' as const,
        }
        : planId === 'voyazh' && dayIndex === 2
          ? {
            generatedPacketId: 'voyazh_d002_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'voyazh' && dayIndex === 3
          ? {
            generatedPacketId: 'voyazh_d003_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'voyazh' && dayIndex === 4
          ? {
            generatedPacketId: 'voyazh_d004_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'voyazh' && dayIndex === 5
          ? {
            generatedPacketId: 'voyazh_d005_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'voyazh' && dayIndex === 6
          ? {
            generatedPacketId: 'voyazh_d006_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'voyazh' && dayIndex === 7
          ? {
            generatedPacketId: 'voyazh_d007_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'voyazh' && dayIndex === 8
          ? {
            generatedPacketId: 'voyazh_d008_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'voyazh' && dayIndex === 9
          ? {
            generatedPacketId: 'voyazh_d009_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'voyazh' && dayIndex === 10
          ? {
            generatedPacketId: 'voyazh_d010_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'voyazh' && dayIndex === 11
          ? {
            generatedPacketId: 'voyazh_d011_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'mitap' && dayIndex === 1
          ? {
            generatedPacketId: 'mitap_d001_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'mitap' && dayIndex === 2
          ? {
            generatedPacketId: 'mitap_d002_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'mitap' && dayIndex === 3
          ? {
            generatedPacketId: 'mitap_d003_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'mitap' && dayIndex === 4
          ? {
            generatedPacketId: 'mitap_d004_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'mitap' && dayIndex === 5
          ? {
            generatedPacketId: 'mitap_d005_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'mitap' && dayIndex === 6
          ? {
            generatedPacketId: 'mitap_d006_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'mitap' && dayIndex === 7
          ? {
            generatedPacketId: 'mitap_d007_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'mitap' && dayIndex === 8
          ? {
            generatedPacketId: 'mitap_d008_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'mitap' && dayIndex === 9
          ? {
            generatedPacketId: 'mitap_d009_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'mitap' && dayIndex === 10
          ? {
            generatedPacketId: 'mitap_d010_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'mitap' && dayIndex === 11
          ? {
            generatedPacketId: 'mitap_d011_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'gavan' && dayIndex === 1
          ? {
            generatedPacketId: 'gavan_d001_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'gavan' && dayIndex === 2
          ? {
            generatedPacketId: 'gavan_d002_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'gavan' && dayIndex === 3
          ? {
            generatedPacketId: 'gavan_d003_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'gavan' && dayIndex === 4
          ? {
            generatedPacketId: 'gavan_d004_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'gavan' && dayIndex === 5
          ? {
            generatedPacketId: 'gavan_d005_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'gavan' && dayIndex === 6
          ? {
            generatedPacketId: 'gavan_d006_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'gavan' && dayIndex === 7
          ? {
            generatedPacketId: 'gavan_d007_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'gavan' && dayIndex === 8
          ? {
            generatedPacketId: 'gavan_d008_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'gavan' && dayIndex === 9
          ? {
            generatedPacketId: 'gavan_d009_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'gavan' && dayIndex === 10
          ? {
            generatedPacketId: 'gavan_d010_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'gavan' && dayIndex === 11
          ? {
            generatedPacketId: 'gavan_d011_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'impuls' && dayIndex === 1
          ? {
            generatedPacketId: 'impuls_d001_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'impuls' && dayIndex === 2
          ? {
            generatedPacketId: 'impuls_d002_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'impuls' && dayIndex === 3
          ? {
            generatedPacketId: 'impuls_d003_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'impuls' && dayIndex === 4
          ? {
            generatedPacketId: 'impuls_d004_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'impuls' && dayIndex === 5
          ? {
            generatedPacketId: 'impuls_d005_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'impuls' && dayIndex === 6
          ? {
            generatedPacketId: 'impuls_d006_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'impuls' && dayIndex === 7
          ? {
            generatedPacketId: 'impuls_d007_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'impuls' && dayIndex === 8
          ? {
            generatedPacketId: 'impuls_d008_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'impuls' && dayIndex === 9
          ? {
            generatedPacketId: 'impuls_d009_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'impuls' && dayIndex === 10
          ? {
            generatedPacketId: 'impuls_d010_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'impuls' && dayIndex === 11
          ? {
            generatedPacketId: 'impuls_d011_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'echo' && dayIndex === 1
          ? {
            generatedPacketId: 'echo_d001_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'echo' && dayIndex === 2
          ? {
            generatedPacketId: 'echo_d002_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'echo' && dayIndex === 3
          ? {
            generatedPacketId: 'echo_d003_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'echo' && dayIndex === 4
          ? {
            generatedPacketId: 'echo_d004_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'echo' && dayIndex === 5
          ? {
            generatedPacketId: 'echo_d005_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'echo' && dayIndex === 6
          ? {
            generatedPacketId: 'echo_d006_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'echo' && dayIndex === 7
          ? {
            generatedPacketId: 'echo_d007_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'echo' && dayIndex === 8
          ? {
            generatedPacketId: 'echo_d008_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'echo' && dayIndex === 9
          ? {
            generatedPacketId: 'echo_d009_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'echo' && dayIndex === 10
          ? {
            generatedPacketId: 'echo_d010_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : planId === 'echo' && dayIndex === 11
          ? {
            generatedPacketId: 'echo_d011_generator_packet',
            generationHarnessStatus: 'valid_non_live_dry_run' as const,
          }
        : {}),
      sourceRuntimeWriteAllowed: true,
      liveRegistrationAllowed: false,
      generatedContentCreationAllowed: false,
      productionReady: false,
      audioReadiness: 'not_live_registered',
      pronunciationReadiness: 'needs_real_scorer_recording_evidence',
    };
  }

  return {
    status: 'scaffold_generated',
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    audioReadiness: 'not_live_registered',
    pronunciationReadiness: 'needs_real_scorer_recording_evidence',
  };
}

function buildTask(
  planId: PersonalPlanId,
  dayIndex: number,
  kind: PlanTaskKind,
  suffix: string,
  title: string,
  subtitle: string,
  minutes: number,
  requiredFor: PlanMinutesChoice[],
  destination: PlanTaskDestination,
): PlanDailyTask {
  return {
    id: taskId(planId, dayIndex, suffix),
    kind,
    title,
    subtitle,
    minutes,
    requiredFor,
    destination,
  };
}

const gavanTopics = [
  'Полный адрес',
  'Postcode и номер квартиры',
  'Заполнить простую форму',
  'Спросить, какие документы нужны',
  'Сказать, что документа нет',
  'Назначить встречу',
  'Перенести время',
  'Написать арендодателю',
  'Осмотр квартиры',
  'Цена, депозит и bills',
  'Проблема дома: вода, свет, интернет',
  'Позвонить в клинику',
  'Описать простой симптом',
  'Аптека и рецепт',
  'Открыть банковский счёт',
  'Карта не работает',
  'Транспортная карта',
  'Почта и доставка',
  'Школа или детский сад',
  'Городские сервисы',
  'Вежливая жалоба',
  'Попросить помощь',
  'Срочная бытовая просьба',
  'Смешанная миссия: офис и документы',
  'Смешанная миссия: жильё',
  'Смешанная миссия: врач',
  'Повтор слабых мест',
];

const voyazhTopics = [
  'Паспортный контроль',
  'Багаж и регистрация',
  'Найти выход и посадку',
  'Такси или транспорт',
  'Заселиться в отель',
  'Проблема с номером',
  'Заказать в кафе',
  'Попросить счёт',
  'Спросить дорогу',
  'Купить билет',
  'Потерянная вещь',
  'Срочная просьба о помощи',
];

const mitapTopics = [
  'Представиться на созвоне',
  'Короткий standup update',
  'Сказать про blocker',
  'Уточнить задачу',
  'Спросить про deadline',
  'Согласиться и подтвердить',
  'Вежливо не согласиться',
  'Написать короткий email',
  'Follow-up после meeting',
  'Попросить пример',
  'Объяснить задержку',
  'Суммировать next steps',
];

const impulsTopics = [
  'Ответить без паузы',
  'Сказать мнение',
  'Добавить because',
  'Исправиться после ошибки',
  'Выиграть время',
  'Соединить две мысли',
  'Ответить за 30 секунд',
  'Спросить встречный вопрос',
  'Уточнить и продолжить',
  'Коротко рассказать историю',
];

const echoTopics = [
  'Поймать ключевое слово',
  'Ответить коротко',
  'Переспросить',
  'Понять время и место',
  'Узнать просьбу',
  'Отреагировать сразу',
  'Common reductions',
  'Listen and choose',
  'Repeat and answer',
  'Мини-диалог на слух',
];

function makeGeneratedDay(planId: PersonalPlanId, dayIndex: number, topic: string): PlanDay {
  const weekIndex = Math.ceil(dayIndex / 7);
  const isReviewDay = dayIndex % 7 === 0;
  const isMissionDay = dayIndex % 6 === 0;
  const lessonPhrases = dayIndex < 15 ? 6 : dayIndex < 56 ? 8 : 10;
  const quizLevel = dayIndex < 28 ? 'easy' : dayIndex < 84 ? 'medium' : 'hard';
  const recallSourceDayIndex = Math.max(1, dayIndex - 1);
  const recallScope = dayIndex > 1 ? 'previous_day' : 'same_day';
  const recallLessonId = `${planId}_d${String(recallSourceDayIndex).padStart(3, '0')}_content_unit`;
  // Grammar gate: which app lesson this generated day may rely on. Drives the
  // "finish lesson N first" recommendation so generated days are adaptive too.
  const lessonGate = lessonGateForDay(dayIndex);

  return {
    id: `${planId}_d${String(dayIndex).padStart(3, '0')}`,
    dayIndex,
    weekIndex,
    status: dayIndex <= 28 ? 'authored_needs_review' : 'scaffold',
    source: sourceBindingForDay(planId, dayIndex),
    curriculum: {
      lessonPrerequisites: [lessonGate],
      allowedGrammarTags: [],
    },
    title: isReviewDay ? `Повтор недели: ${topic}` : topic,
    focus: isReviewDay
      ? 'Вернуть фразы недели по памяти и спокойно закрыть слабые места.'
      : `Отработать ситуацию "${topic}" через фразы, урок и короткую практику.`,
    phraseGoal: isReviewDay
      ? 'Повторить 8-12 фраз из последних дней.'
      : `Выучить и применить ${lessonPhrases}-${lessonPhrases + 2} фраз по теме дня.`,
    theory: isReviewDay
      ? 'Короткий разбор ошибок недели и повтор спасательных конструкций.'
      : 'Одна прикладная конструкция дня: просьба, уточнение, объяснение или короткий ответ.',
    tasks: [
      buildTask(
        planId,
        dayIndex,
        'linked_lesson_slice',
        'main',
        isReviewDay ? 'Вернуть фразы недели' : `Фразы по теме: ${topic}`,
        isReviewDay
          ? 'Коротко проверим, какие фразы уже вспоминаются легко, а какие стоит подержать рядом ещё пару дней.'
          : `${lessonPhrases} фраз из урока: берём только то, что помогает с темой дня.`,
        isReviewDay ? 5 : 6,
        [5, 10, 15, 20],
        { type: 'lesson', lessonId: ((dayIndex - 1) % 32) + 1, requiredPhrases: lessonPhrases },
      ),
      buildTask(
        planId,
        dayIndex,
        'plan_phrase_lesson',
        'route_phrases',
        isMissionDay ? `Живая практика: ${topic}` : `Фразы на сегодня: ${topic}`,
        'Соберём несколько фраз под тему дня на уже знакомой конструкции.',
        5,
        [10, 15, 20],
        { type: 'plan_phrase_lesson', lessonId: `${planId}_d${String(dayIndex).padStart(3, '0')}_content_unit`, requiredPhrases: 5, afterLessonId: 1 },
      ),
      buildTask(
        planId,
        dayIndex,
        'plan_missing_word',
        'missing_word',
        'Вставить нужное слово',
        'Короткая проверка фраз дня: одно точное слово внутри живой фразы.',
        3,
        requiredMinutesForKind(planId, 'plan_missing_word'),
        {
          type: 'plan_exercise',
          exerciseType: 'plan_missing_word',
          lessonId: `${planId}_d${String(dayIndex).padStart(3, '0')}_content_unit`,
          contentUnitIds: [1, 2, 3, 4, 5].map((index) => `${planId}_d${String(dayIndex).padStart(3, '0')}_content_unit_phrase_${index}`),
          requiredCorrect: 3,
        },
      ),
      buildTask(
        planId,
        dayIndex,
        'plan_choose_natural_phrase',
        'choose_natural',
        'Выбрать естественную фразу',
        'Выбери фразу, которая лучше всего подходит к ситуации дня.',
        3,
        requiredMinutesForKind(planId, 'plan_choose_natural_phrase'),
        {
          type: 'plan_exercise',
          exerciseType: 'plan_choose_natural_phrase',
          lessonId: `${planId}_d${String(dayIndex).padStart(3, '0')}_content_unit`,
          contentUnitIds: [1, 2, 3, 4, 5].map((index) => `${planId}_d${String(dayIndex).padStart(3, '0')}_content_unit_phrase_${index}`),
          requiredCorrect: 4,
        },
      ),
      buildTask(
        planId,
        dayIndex,
        'plan_listen_choose',
        'listen_choose',
        'Услышать и выбрать',
        'Послушай фразу дня и выбери правильный смысл.',
        4,
        requiredMinutesForKind(planId, 'plan_listen_choose'),
        {
          type: 'plan_exercise',
          exerciseType: 'plan_listen_choose',
          lessonId: `${planId}_d${String(dayIndex).padStart(3, '0')}_content_unit`,
          contentUnitIds: [1, 2, 3, 4, 5].map((index) => `${planId}_d${String(dayIndex).padStart(3, '0')}_content_unit_phrase_${index}`),
          requiredCorrect: 4,
        },
      ),
      buildTask(
        planId,
        dayIndex,
        'plan_listen_build',
        'listen_build',
        'Собрать услышанную фразу',
        'Послушай и собери фразу из слов.',
        4,
        requiredMinutesForKind(planId, 'plan_listen_build'),
        {
          type: 'plan_exercise',
          exerciseType: 'plan_listen_build',
          lessonId: `${planId}_d${String(dayIndex).padStart(3, '0')}_content_unit`,
          contentUnitIds: [1, 2, 3, 4, 5].map((index) => `${planId}_d${String(dayIndex).padStart(3, '0')}_content_unit_phrase_${index}`),
          requiredCorrect: 4,
        },
      ),
      buildTask(
        planId,
        dayIndex,
        'plan_pronunciation_repeat',
        'pronunciation_repeat',
        'Повторить вслух',
        'Повтори фразы дня и послушай себя.',
        4,
        requiredMinutesForKind(planId, 'plan_pronunciation_repeat'),
        {
          type: 'plan_exercise',
          exerciseType: 'plan_pronunciation_repeat',
          lessonId: `${planId}_d${String(dayIndex).padStart(3, '0')}_content_unit`,
          contentUnitIds: [1, 2, 3, 4].map((index) => `${planId}_d${String(dayIndex).padStart(3, '0')}_content_unit_phrase_${index}`),
          requiredCorrect: 4,
        },
      ),
      buildTask(
        planId,
        dayIndex,
        'plan_phrase_recall',
        'phrase_recall',
        dayIndex > 1 ? 'Recall фраз прошлого дня' : 'Recall фраз дня',
        dayIndex > 1
          ? 'Вернем фразы вчерашнего плана, чтобы они вспоминались без подсказки.'
          : 'Коротко вернем фразы, которые уже встретились сегодня.',
        4,
        requiredMinutesForKind(planId, 'plan_phrase_recall'),
        {
          type: 'plan_phrase_recall',
          lessonId: recallLessonId,
          requiredPhrases: 4,
          afterLessonId: 1,
          recallScope,
          sourceDayIndex: recallSourceDayIndex,
        },
      ),
      buildTask(
        planId,
        dayIndex,
        'plan_quiz',
        'extra',
        'Вызов дня',
        'Проверь фразы дня и часть старых фраз.',
        4,
        requiredMinutesForKind(planId, 'plan_quiz'),
        { type: 'quiz', quizId: `${planId}_day_${dayIndex}_quiz`, questionCount: 10, level: quizLevel },
      ),
    ],
  };
}

// Tail order now comes from the per-plan mode emphasis profile (Ф3): each plan
// leads with its signature modes and rotates between its own variants.
// See app/personal_plan_mode_profiles.ts.
function orderPlanNativeTasksForDay(planId: PersonalPlanId, tasks: PlanDailyTask[], dayIndex: number): PlanDailyTask[] {
  const introTask = tasks.find((task) => task.kind === 'plan_phrase_lesson');
  if (!introTask) return tasks;

  const tailOrder = tailOrderForPlanDay(planId, dayIndex);
  const tailRank = new Map(tailOrder.map((kind, index) => [kind, index]));
  const tail = tasks
    .filter((task) => task !== introTask)
    .sort((a, b) => (tailRank.get(a.kind) ?? 99) - (tailRank.get(b.kind) ?? 99));

  return [introTask, ...tail];
}

function withoutLessonTasks(planId: PersonalPlanId, day: PlanDay): PlanDay {
  return {
    ...day,
    tasks: orderPlanNativeTasksForDay(
      planId,
      day.tasks.filter((task) => task.kind !== 'linked_lesson_slice' && task.destination.type !== 'lesson'),
      day.dayIndex,
    ),
  };
}

function bindAcceptedCandidateSource(planId: PersonalPlanId, day: PlanDay): PlanDay {
  if (day.dayIndex > 28) return day;
  return {
    ...day,
    source: sourceBindingForDay(planId, day.dayIndex),
  };
}

function generateDays(planId: PersonalPlanId, horizonWeeks: number, topics: string[], firstDays?: PlanDay | PlanDay[]): PlanDay[] {
  const total = horizonWeeks * 7;
  const days: PlanDay[] = firstDays ? (Array.isArray(firstDays) ? [...firstDays] : [firstDays]).map((day) =>
    bindAcceptedCandidateSource(planId, withoutLessonTasks(planId, day))
  ) : [];
  for (let day = days.length + 1; day <= total; day += 1) {
    const topic = topics[(day - 2 + topics.length) % topics.length];
    days.push(withoutLessonTasks(planId, makeGeneratedDay(planId, day, topic)));
  }
  return days;
}

const voyazhDay1: PlanDay = {
  ...makeGeneratedDay('voyazh', 1, 'Аэропорт: попросить помощь'),
  status: 'certified',
  title: 'Аэропорт: попросить помощь',
  focus: 'Научиться спокойно попросить помощь в аэропорту, если потерялась сумка, непонятно куда идти или нужна информационная стойка.',
  phraseGoal: 'Шесть коротких фраз для первой минуты в аэропорту: помощь, потерянная сумка, информационная стойка, сотрудники аэропорта и ожидание на месте.',
  theory: 'День держится на простых конструкциях I need, Can you, I lost, Please call, I can. Сначала готовая фраза целиком, потом отдельные слова.',
  lifeOutcome: 'После дня можно подойти к сотруднику аэропорта, попросить помощь, сказать про сумку, найти информационную стойку и спокойно подождать на месте.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['request', 'need', 'can', 'lost-item', 'airport-help'],
    blockedGrammarTags: ['complex-conditionals', 'past-perfect', 'document-formality', 'complaint-escalation'],
  },
};

const voyazhDay2: PlanDay = {
  ...makeGeneratedDay('voyazh', 2, 'Паспортный контроль'),
  status: 'certified',
  title: 'Паспортный контроль',
  focus: 'Научиться спокойно ответить на базовые вопросы на паспортном контроле: паспорт, цель поездки, обратный билет, срок и бронь отеля.',
  phraseGoal: 'Шесть коротких фраз для паспортного контроля: passport, vacation, return ticket, one week, hotel booking, go now.',
  theory: 'День держится на простых конструкциях Here is, I am here for, I have, I will stay, This is, Can I. Сначала основная фраза, потом выбор и сборка.',
  lifeOutcome: 'После дня можно показать паспорт, сказать что ты в отпуске, подтвердить обратный билет, срок поездки, бронь отеля и спросить, можно ли идти.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['passport-control', 'travel-purpose', 'return-ticket', 'hotel-booking', 'can-i'],
    blockedGrammarTags: ['visa-law', 'customs-declaration', 'immigration-appeal', 'complex-conditionals'],
  },
};

const voyazhDay3: PlanDay = {
  ...makeGeneratedDay('voyazh', 3, 'Багаж и регистрация'),
  status: 'certified',
  title: 'Багаж и регистрация',
  focus: 'Научиться пройти регистрацию с багажом: сдать сумку, показать boarding pass, сказать про вес, fragile item, receipt и gate.',
  phraseGoal: 'Шесть фраз для регистрации багажа: check bag, boarding pass, not heavy, fragile item, baggage receipt, gate.',
  theory: 'День держится на простых travel-фразах I need to, Here is, The bag is, There is, Can I get, Which gate. Сначала действие у стойки, потом детали багажа.',
  lifeOutcome: 'После дня можно сдать сумку на стойке регистрации, показать посадочный талон, сказать что сумка не тяжелая, предупредить про хрупкую вещь, попросить квитанцию и уточнить gate.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['baggage-check', 'boarding-pass', 'fragile-item', 'receipt', 'gate'],
    blockedGrammarTags: ['lost-luggage-claim', 'customs-dispute', 'refund-claim', 'complex-complaint'],
  },
};

const voyazhDay4: PlanDay = {
  ...makeGeneratedDay('voyazh', 4, 'Такси до отеля'),
  status: 'certified',
  title: 'Такси до отеля',
  focus: 'Научиться спокойно добраться из аэропорта до отеля: попросить такси, уточнить цену, попросить включить счетчик, назвать маршрут и оплатить картой.',
  phraseGoal: 'Шесть коротких фраз для поездки до отеля: taxi to hotel, ride price, meter, route, hotel near station, pay by card.',
  theory: 'День держится на travel-фразах I need, How much, Please use, Can you take, The hotel is, I can pay. Сначала маршрут целиком, потом цена, счетчик и оплата.',
  lifeOutcome: 'После дня можно сесть в такси или трансфер, сказать куда ехать, спросить стоимость, попросить счетчик, подтвердить маршрут и оплатить картой.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['taxi-request', 'price-question', 'meter', 'route', 'hotel-location', 'card-payment'],
    blockedGrammarTags: ['traffic-dispute', 'refund-claim', 'complex-directions', 'legal-complaint'],
  },
};

const voyazhDay5: PlanDay = {
  ...makeGeneratedDay('voyazh', 5, 'Заселиться в отель'),
  status: 'certified',
  title: 'Заселиться в отель',
  focus: 'Научиться спокойно заселиться в отель: сказать про бронирование, показать паспорт, попросить ключ, уточнить завтрак, этаж и доступ к Wi-Fi.',
  phraseGoal: 'Шесть коротких hotel check-in фраз: hotel reservation, passport, room key, breakfast included, second floor, wifi access.',
  theory: 'День держится на travel-конструкциях I have, Here is, Can I get, Is, The room is, I need. Сначала основной сценарий заселения, потом выбор естественной фразы, сборка, missing word, слух и quiz.',
  lifeOutcome: 'После дня можно подойти к стойке отеля, подтвердить бронирование, показать паспорт, получить ключ, уточнить завтрак, этаж номера и Wi-Fi.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['hotel-check-in', 'reservation', 'passport', 'room-key', 'breakfast', 'wifi'],
    blockedGrammarTags: ['booking-dispute', 'refund-claim', 'room-complaint', 'legal-complaint'],
  },
};

const voyazhDay6: PlanDay = {
  ...makeGeneratedDay('voyazh', 6, 'Исправить проблему в поездке'),
  status: 'certified',
  title: 'Исправить проблему в поездке',
  focus: 'Научиться спокойно исправлять небольшую проблему в поездке: поменять номер, сказать что ключ не работает, уточнить бронирование, сумку и попросить помочь исправить ситуацию.',
  phraseGoal: 'Шесть коротких repair-фраз для поездки: change room, key does not work, small problem, check booking, wrong bag, help me fix this.',
  theory: 'День держится на travel-repair фразах I need to, The key does not, There is, Can you check, I think, Please help. Сначала фраза целиком, потом сборка на слух, recall, выбор, missing word и listening.',
  lifeOutcome: 'После дня можно не зависнуть, если в отеле, такси или аэропорту что-то пошло не так: назвать проблему коротко, попросить проверку и спокойно попросить помочь исправить.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['travel-repair', 'room-change', 'key-problem', 'booking-check', 'wrong-bag', 'help-fix'],
    blockedGrammarTags: ['formal-complaint', 'refund-claim', 'legal-complaint', 'aggressive-dispute'],
  },
};

const voyazhDay7: PlanDay = {
  ...makeGeneratedDay('voyazh', 7, 'Повтор недели: поездка без ступора'),
  status: 'certified',
  title: 'Повтор недели: поездка без ступора',
  focus: 'Повторить ключевые фразы первой недели поездки: помощь, бронирование, детали, проблема с номером, ожидание и просьба помочь исправить ситуацию.',
  phraseGoal: 'Шесть коротких review-фраз для конца недели: help with trip, booking, check details, room problem, wait here, help me fix this.',
  theory: 'День закрывает неделю через короткие travel-repair конструкции I need, Here is, Can you check, The room has, I can, Please help.',
  lifeOutcome: 'После дня можно собрать основные фразы недели в один спокойный сценарий: попросить помощь, показать бронирование, уточнить детали и исправить проблему.',
  curriculum: {
    lessonPrerequisites: [1, 5, 6],
    allowedGrammarTags: ['week-check', 'travel-review', 'booking', 'details-check', 'room-problem', 'help-fix'],
    blockedGrammarTags: ['formal-complaint', 'refund-claim', 'legal-complaint', 'aggressive-dispute'],
  },
};

const voyazhDay8: PlanDay = {
  ...makeGeneratedDay('voyazh', 8, 'Неделя 2: транспорт без подсказок'),
  status: 'certified',
  title: 'Неделя 2: транспорт без подсказок',
  focus: 'Начать вторую неделю с более самостоятельного travel-сценария: выбрать автобус, купить билет, оплатить картой, понять ожидание, выйти здесь и проверить остановку.',
  phraseGoal: 'Шесть коротких transport-фраз: which bus, ticket to station, pay by card, how long wait, get off here, right stop.',
  theory: 'День начинает Week 2 autonomy: меньше прямой опоры на rescue-фразы, больше самостоятельных вопросов Which, Can I, How long, Is this и действий I need, I will.',
  lifeOutcome: 'После дня можно на месте спросить про автобус или остановку, купить билет, оплатить картой и не пропустить нужный выход.',
  curriculum: {
    lessonPrerequisites: [1, 4, 7],
    allowedGrammarTags: ['week-2-autonomy', 'transport', 'bus-route', 'ticket', 'card-payment', 'wait-time', 'right-stop'],
    blockedGrammarTags: ['route-dispute', 'refund-claim', 'complex-directions', 'legal-complaint'],
  },
};

const voyazhDay9: PlanDay = {
  ...makeGeneratedDay('voyazh', 9, 'Расписание и платформа'),
  status: 'certified',
  title: 'Расписание и платформа',
  focus: 'Научиться спокойно уточнить расписание транспорта: время отправления, следующий автобус, правильную платформу, расписание и ожидание десять минут.',
  phraseGoal: 'Шесть коротких transport-schedule фраз: what time leave, next bus, right platform, show schedule, help with time, wait ten minutes.',
  theory: 'День продолжает Week 2 autonomy через двухшаговый сценарий: сначала найти время и платформу, потом подтвердить следующий автобус и ожидание. Держим вопросы What time, Is this, Can you и действия I need, Please show, I can wait.',
  lifeOutcome: 'После дня можно у расписания или на станции спросить, во сколько отправляется транспорт, найти следующий автобус, проверить платформу и спокойно решить, можно ли подождать.',
  curriculum: {
    lessonPrerequisites: [1, 4, 8],
    allowedGrammarTags: ['week-2-two-turn-dialogue', 'transport-schedule', 'departure-time', 'next-bus', 'right-platform', 'wait-time'],
    blockedGrammarTags: ['route-dispute', 'refund-claim', 'complex-transfer', 'legal-complaint'],
  },
};

const voyazhDay10: PlanDay = {
  ...makeGeneratedDay('voyazh', 10, 'Вариант транспорта дешевле'),
  status: 'certified',
  title: 'Вариант транспорта дешевле',
  focus: 'Научиться переносить уже знакомый transport-сценарий в соседний контекст: поезд, трамвай, такси, более дешевый вариант, расстояние до станции и пеший маршрут.',
  phraseGoal: 'Шесть коротких controlled-variation фраз: train instead, take the tram, taxi expensive, cheaper option, how far station, walk from here.',
  theory: 'День продолжает Week 2 через controlled variation: меняется транспорт и цена, но сохраняется тот же навык коротко спросить, выбрать вариант и принять решение. Держим Is there, Can I, The taxi is, I need, How far, I can walk.',
  lifeOutcome: 'После дня можно не застрять, если автобус неудобен или такси дорогое: спросить про поезд или трамвай, попросить вариант дешевле, уточнить расстояние и решить, можно ли дойти пешком.',
  curriculum: {
    lessonPrerequisites: [1, 4, 8, 9],
    allowedGrammarTags: ['week-2-controlled-variation', 'transport-choice', 'train', 'tram', 'taxi-price', 'cheaper-option', 'walking-route'],
    blockedGrammarTags: ['route-dispute', 'refund-claim', 'complex-transfer', 'legal-complaint'],
  },
};

const voyazhDay11: PlanDay = {
  ...makeGeneratedDay('voyazh', 11, 'Построить маршрут с подсказкой'),
  status: 'certified',
  title: 'Построить маршрут с подсказкой',
  focus: 'Перейти к prompted production в travel-сценарии: попросить лучший маршрут, назвать дедлайн по времени, спросить самый простой способ, согласиться на пересадку и уточнить, где выйти.',
  phraseGoal: 'Шесть коротких route-planning фраз: suggest best route, get there by six, easiest way, change at next station, where to get off, ask again if lost.',
  theory: 'День продолжает Week 2 через prompted production: ученик уже не только выбирает готовый транспорт, а собирает запрос маршрута и rescue-фразу, если потеряется. Держим Can you suggest, I need to get, What is, I can change, Please tell me, I will ask again.',
  lifeOutcome: 'После дня можно подойти к человеку или стойке информации и самому сформулировать маршрут: куда надо попасть, к какому времени, какой путь проще, где пересесть и где выйти.',
  curriculum: {
    lessonPrerequisites: [1, 4, 8, 9, 10],
    allowedGrammarTags: ['week-2-prompted-production', 'route-planning', 'best-route', 'arrival-time', 'easiest-way', 'change-station', 'get-off'],
    blockedGrammarTags: ['route-dispute', 'refund-claim', 'complex-transfer', 'legal-complaint'],
  },
};

const mitapDay1: PlanDay = {
  ...makeGeneratedDay('mitap', 1, 'Созвон: зафиксировать next steps'),
  status: 'certified',
  title: 'Созвон: зафиксировать next steps',
  focus: 'Научиться коротко закрывать рабочий созвон: подтвердить next steps, владельца задачи, срок и follow-up после звонка.',
  phraseGoal: 'Шесть коротких фраз для конца созвона: next steps, owner, deadline, follow-up, summary.',
  theory: 'День держится на простых рабочих конструкциях The next steps are, I will, We need, The deadline is, Let us. Сначала фиксируем смысл, потом тренируем варианты.',
  lifeOutcome: 'После дня можно завершить короткий созвон: сказать, что next steps понятны, назвать владельца, срок, follow-up и короткое резюме.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['work-call', 'next-steps', 'deadline', 'ownership', 'follow-up'],
    blockedGrammarTags: ['legal-commitment', 'performance-review', 'negotiation-escalation', 'long-presentation'],
  },
};

const mitapDay2: PlanDay = {
  ...makeGeneratedDay('mitap', 2, 'Короткий standup update'),
  status: 'certified',
  title: 'Короткий standup update',
  focus: 'Научиться дать короткий standup update: что готово, над чем работаешь, есть ли blocker и когда будет результат.',
  phraseGoal: 'Шесть фраз для короткого рабочего апдейта: short update, task done, next part, small blocker, ten more minutes, result today.',
  theory: 'День держится на простых рабочих фразах My update is, The task is, I am working, I have, I need, I will. Сначала смысл, потом порядок слов.',
  lifeOutcome: 'После дня можно дать короткий апдейт на созвоне: сказать, что первая задача готова, работаешь над следующей частью, есть небольшой blocker и результат будет сегодня.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['standup-update', 'task-status', 'blocker', 'time-request', 'result-sharing'],
    blockedGrammarTags: ['performance-review', 'legal-commitment', 'salary-talk', 'long-presentation'],
  },
};

const mitapDay3: PlanDay = {
  ...makeGeneratedDay('mitap', 3, 'Созвон: подтвердить следующие шаги'),
  status: 'certified',
  title: 'Созвон: подтвердить следующие шаги',
  focus: 'Научиться спокойно закрывать созвон после обсуждения: подтвердить следующие шаги, отправить их письменно, назвать владельца, срок и короткое резюме.',
  phraseGoal: 'Шесть коротких фраз для follow-up после созвона: next steps, send, owner, deadline, confirm, short summary.',
  theory: 'День держится на рабочих конструкциях The next steps are, I will send, We need, The deadline is, I will confirm, Let us keep. Сначала основной смысл, потом слух, пропуск слова, сборка и recall.',
  lifeOutcome: 'После дня можно завершить рабочий созвон без путаницы: сказать, что следующие шаги понятны, отправить их, назначить ответственного, подтвердить срок и оставить краткое резюме.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['work-call', 'next-steps', 'ownership', 'deadline', 'confirmation', 'summary'],
    blockedGrammarTags: ['legal-commitment', 'performance-review', 'salary-talk', 'long-presentation'],
  },
};

const mitapDay4: PlanDay = {
  ...makeGeneratedDay('mitap', 4, 'Уточнить статус задачи'),
  status: 'certified',
  title: 'Уточнить статус задачи',
  focus: 'Научиться спокойно уточнять статус рабочей задачи: проверить, все ли по плану, попросить короткий апдейт, назвать главный блокер и предложить помощь со следующим шагом.',
  phraseGoal: 'Шесть коротких фраз для follow-up по задаче: check status, on track, quick update, main blocker, next step, close today.',
  theory: 'День держится на рабочих конструкциях Can I check, Is this still, I need, What is, I can help, Let us close. Сначала основной смысл, потом пропуск слова, произношение, выбор естественной фразы, сборка на слух и recall.',
  lifeOutcome: 'После дня можно без давления спросить коллегу о статусе задачи: уточнить прогресс, понять блокер, предложить помощь и договориться закрыть задачу сегодня.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['work-call', 'task-status', 'follow-up', 'blocker', 'next-step', 'deadline'],
    blockedGrammarTags: ['performance-review', 'legal-commitment', 'salary-talk', 'long-presentation'],
  },
};

const mitapDay5: PlanDay = {
  ...makeGeneratedDay('mitap', 5, 'Спросить про deadline'),
  status: 'certified',
  title: 'Спросить про deadline',
  focus: 'Научиться спокойно уточнять срок рабочей задачи: подтвердить deadline, спросить due date, проверить пятницу, назвать финальную дату и договориться о переносе.',
  phraseGoal: 'Шесть коротких deadline-фраз: confirm the deadline, when due, Friday okay, final date, move the deadline, send by Friday.',
  theory: 'День держится на рабочих вопросах Can we confirm, When is this due, Is Friday okay, I need, Can we move, I will send. Сначала смысл, потом естественный выбор, сборка, missing word, слух и quiz.',
  lifeOutcome: 'После дня можно на созвоне или в чате уточнить срок задачи, понять финальную дату, попросить перенос и пообещать отправить результат к пятнице.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['deadline', 'due-date', 'date-confirmation', 'deadline-move', 'send-by-date'],
    blockedGrammarTags: ['legal-commitment', 'performance-review', 'salary-talk', 'contract-negotiation'],
  },
};

const mitapDay6: PlanDay = {
  ...makeGeneratedDay('mitap', 6, 'Исправить рабочую ошибку'),
  status: 'certified',
  title: 'Исправить рабочую ошибку',
  focus: 'Научиться спокойно исправлять рабочую ошибку: назвать проблему, указать не тот файл, исправить число, отправить обновленную версию и попросить использовать последнюю версию.',
  phraseGoal: 'Шесть коротких repair-фраз для рабочей ситуации: small mistake, wrong file, fix the number, updated version, latest version, correct it now.',
  theory: 'День держится на спокойных repair-конструкциях There is, This is, I need to, Can I, Please use, I will. Сначала смысл, потом recall, естественный выбор, missing word, слух и quiz.',
  lifeOutcome: 'После дня можно без паники исправить ошибку в рабочем чате или на созвоне: признать небольшую ошибку, заменить файл или число, отправить обновленную версию и попросить команду брать последнюю.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['work-repair', 'mistake-correction', 'file-version', 'updated-version', 'polite-request'],
    blockedGrammarTags: ['blame-assignment', 'performance-review', 'legal-commitment', 'contract-negotiation'],
  },
};

const mitapDay7: PlanDay = {
  ...makeGeneratedDay('mitap', 7, 'Повтор недели: созвон без ступора'),
  status: 'certified',
  title: 'Повтор недели: созвон без ступора',
  focus: 'Повторить ключевые фразы первой рабочей недели: следующие шаги, короткий апдейт, deadline, blocker, небольшая ошибка и просьба использовать последнюю версию.',
  phraseGoal: 'Шесть коротких review-фраз для созвона и чата: next steps clear, quick update, confirm deadline, small blocker, small mistake, latest version.',
  theory: 'День закрывает неделю через рабочие конструкции The next steps are, I need, Can we confirm, I have, There is, Please use.',
  lifeOutcome: 'После дня можно спокойно закрыть рабочий созвон или чат: подтвердить шаги и срок, дать апдейт, назвать блокер, исправить ошибку и указать актуальную версию.',
  curriculum: {
    lessonPrerequisites: [1, 4, 5, 6],
    allowedGrammarTags: ['week-check', 'work-call-review', 'next-steps', 'quick-update', 'deadline', 'blocker', 'version-control'],
    blockedGrammarTags: ['performance-review', 'legal-commitment', 'salary-talk', 'contract-negotiation'],
  },
};

const mitapDay8: PlanDay = {
  ...makeGeneratedDay('mitap', 8, 'Неделя 2: рабочая автономия без лишних подсказок'),
  status: 'certified',
  title: 'Неделя 2: рабочая автономия без лишних подсказок',
  focus: 'Начать вторую неделю Mitap с самостоятельных рабочих фраз: взять следующее действие, попросить контекст, расставить приоритеты, отправить короткое резюме и подтвердить ответственного.',
  phraseGoal: 'Шесть коротких autonomy-фраз для созвона и рабочего чата: next action, more context, prioritize today, short summary, main owner, follow up after the call.',
  theory: 'День держится на спокойных рабочих конструкциях Can I, I need, What should I, I can, Please confirm, I will. Подсказок меньше: ученик выбирает смысл целиком и собирает фразу без прямой опоры на перевод.',
  lifeOutcome: 'После дня можно на созвоне самостоятельно взять задачу, попросить недостающий контекст, уточнить приоритет, назначить owner и закрыть разговор коротким follow-up.',
  curriculum: {
    lessonPrerequisites: [1, 4, 5, 7],
    allowedGrammarTags: ['week-2-autonomy', 'next-action', 'context-request', 'priority-setting', 'summary', 'ownership', 'follow-up'],
    blockedGrammarTags: ['performance-review', 'legal-commitment', 'salary-talk', 'contract-negotiation'],
  },
};

const mitapDay9: PlanDay = {
  ...makeGeneratedDay('mitap', 9, 'Уточнить объем задачи'),
  status: 'certified',
  title: 'Уточнить объем задачи',
  focus: 'Научиться спокойно уточнять scope перед стартом: что входит в задачу, какой нужен пример, где текущий бриф и какой первый шаг подтвердить.',
  phraseGoal: 'Шесть коротких task-scope фраз: clarify scope, included in task, one example, current brief, start after that, confirm first step.',
  theory: 'День продолжает Week 2 через двухходовой рабочий сценарий: сначала уточнить границы задачи, потом запросить пример или бриф и подтвердить первый шаг. Держим Can we, What is, I need, Please send, I can, Let us.',
  lifeOutcome: 'После дня можно не начинать задачу вслепую: уточнить объем, спросить что входит, попросить пример или бриф и договориться о первом шаге.',
  curriculum: {
    lessonPrerequisites: [1, 4, 8],
    allowedGrammarTags: ['week-2-two-turn-dialogue', 'task-scope', 'scope-clarification', 'example-request', 'brief-request', 'first-step'],
    blockedGrammarTags: ['performance-review', 'legal-commitment', 'salary-talk', 'contract-negotiation'],
  },
};

const mitapDay10: PlanDay = {
  ...makeGeneratedDay('mitap', 10, 'Приоритет и владелец задачи'),
  status: 'certified',
  title: 'Приоритет и владелец задачи',
  focus: 'Научиться переносить уточнение scope в соседний рабочий контекст: что в приоритете, кто владелец части, какой срок, есть ли блокер и нужен ли свежий апдейт.',
  phraseGoal: 'Шесть коротких controlled-variation фраз: prioritize first, owns this part, confirm deadline, small blocker, latest update, adjust plan.',
  theory: 'День продолжает Week 2 через controlled variation: меняется рабочий фокус с объема задачи на приоритет, owner, deadline и blocker, но сохраняется тот же спокойный паттерн уточнения. Держим What should I, Who owns, Can we confirm, I see, Please send, I can adjust.',
  lifeOutcome: 'После дня можно в созвоне или чате уточнить, с чего начать, кто отвечает за часть задачи, какой срок держим, где блокер и как скорректировать план.',
  curriculum: {
    lessonPrerequisites: [1, 4, 8, 9],
    allowedGrammarTags: ['week-2-controlled-variation', 'work-priority', 'ownership', 'deadline', 'blocker', 'latest-update', 'plan-adjustment'],
    blockedGrammarTags: ['performance-review', 'legal-commitment', 'salary-talk', 'contract-negotiation'],
  },
};

const mitapDay11: PlanDay = {
  ...makeGeneratedDay('mitap', 11, 'Собрать короткий рабочий апдейт'),
  status: 'certified',
  title: 'Собрать короткий рабочий апдейт',
  focus: 'Перейти к prompted production в рабочем сценарии: предложить следующий шаг, запросить контекст, уточнить expected outcome, набросать короткий апдейт и попросить feedback.',
  phraseGoal: 'Шесть коротких work-update фраз: propose next step, need more context, expected outcome, draft short update, tell me if this works, revise after feedback.',
  theory: 'День продолжает Week 2 через prompted production: ученик уже сам собирает короткий рабочий ответ, а rescue-фразы помогают не зависнуть, если не хватает контекста или нужен фидбэк. Держим Can I propose, I need, What is, I can draft, Please tell me, I will revise.',
  lifeOutcome: 'После дня можно в чате или на созвоне самому предложить следующий шаг, запросить недостающий контекст, уточнить ожидаемый результат и пообещать доработку после фидбэка.',
  curriculum: {
    lessonPrerequisites: [1, 4, 8, 9, 10],
    allowedGrammarTags: ['week-2-prompted-production', 'work-update', 'next-step', 'context-request', 'expected-outcome', 'feedback', 'revision'],
    blockedGrammarTags: ['performance-review', 'legal-commitment', 'salary-talk', 'contract-negotiation'],
  },
};

const gavanDay1: PlanDay = {
  id: 'gavan_d001',
  dayIndex: 1,
  weekIndex: 1,
  status: 'certified',
  title: 'Короткие ответы',
  focus: 'Научиться отвечать спокойно и коротко, когда нужно подтвердить, не спорить и не зависнуть.',
  phraseGoal: 'Пять коротких фраз, которые подходят для реального разговора без личных данных.',
  theory: 'Берем простые фразы из урока 1: I am, You are, It is. Этого хватает, чтобы сказать, где ты, что все нормально и что мысль понятна.',
  lifeOutcome: 'После дня можно коротко подтвердить, что ты здесь, что все нормально, что человек прав или что что-то непонятно.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['to-be-statement', 'location'],
    blockedGrammarTags: ['to-be-question', 'do-question', 'wh-question', 'have-has', 'address', 'contact', 'booking-name'],
  },
  tasks: [
    buildTask(
      'gavan',
      1,
      'linked_lesson_slice',
      'main',
      'Основа: I am / You are / It is',
      '5 фраз из урока 1. Берем только то, что нужно для коротких спокойных ответов.',
      5,
      [5, 10, 15, 20],
      {
        type: 'lesson',
        lessonId: 1,
        requiredPhrases: 5,
        requiredPhraseIds: [
          'lesson1_phrase_1',
          'lesson1_phrase_7',
          'lesson1_phrase_8',
          'lesson1_phrase_9',
          'lesson1_phrase_10',
        ],
      },
    ),
    buildTask(
      'gavan',
      1,
      'plan_phrase_lesson',
      'route_phrases',
      'Ответить без лишних слов',
      '5 живых фраз: спокойно подтвердить, что ты здесь, что все нормально или что нужна ясность.',
      5,
      [10, 15, 20],
      { type: 'plan_phrase_lesson', lessonId: 'gavan_day1_short_replies', requiredPhrases: 5, afterLessonId: 1 },
    ),
    buildTask(
      'gavan',
      1,
      'plan_missing_word',
      'missing_word',
      'Вставить нужное слово',
      'Короткая проверка: одно слово, одна фраза, сразу понятно, почему так.',
      3,
      [10, 15, 20],
      {
        type: 'plan_exercise',
        exerciseType: 'plan_missing_word',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: [
          'gavan_d1_phrase_1',
          'gavan_d1_phrase_2',
          'gavan_d1_phrase_3',
          'gavan_d1_phrase_4',
          'gavan_d1_phrase_5',
        ],
        requiredCorrect: 3,
      },
    ),
    buildTask(
      'gavan',
      1,
      'plan_choose_natural_phrase',
      'choose_natural',
      'Выбрать естественный ответ',
      'Сравни похожие короткие ответы и выбери тот, который звучит спокойно и по делу.',
      3,
      [15, 20],
      {
        type: 'plan_exercise',
        exerciseType: 'plan_choose_natural_phrase',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: [
          'gavan_d1_phrase_1',
          'gavan_d1_phrase_2',
          'gavan_d1_phrase_3',
          'gavan_d1_phrase_4',
          'gavan_d1_phrase_5',
        ],
        requiredCorrect: 4,
      },
    ),
    buildTask(
      'gavan',
      1,
      'plan_listen_choose',
      'listen_choose',
      'Услышать и выбрать',
      'Короткое аудио по фразам дня: услышал смысл, выбрал правильный спокойный ответ.',
      4,
      [15, 20],
      {
        type: 'plan_exercise',
        exerciseType: 'plan_listen_choose',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: [
          'gavan_d1_phrase_1',
          'gavan_d1_phrase_2',
          'gavan_d1_phrase_3',
          'gavan_d1_phrase_4',
          'gavan_d1_phrase_5',
        ],
        requiredCorrect: 4,
      },
    ),
    buildTask(
      'gavan',
      1,
      'plan_listen_build',
      'listen_build',
      'Собрать услышанную фразу',
      'Послушай фразу и собери ее из слов без лишней грамматики и без личных данных.',
      4,
      [15, 20],
      {
        type: 'plan_exercise',
        exerciseType: 'plan_listen_build',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: [
          'gavan_d1_phrase_1',
          'gavan_d1_phrase_2',
          'gavan_d1_phrase_3',
          'gavan_d1_phrase_4',
          'gavan_d1_phrase_5',
        ],
        requiredCorrect: 4,
      },
    ),
    buildTask(
      'gavan',
      1,
      'plan_pronunciation_repeat',
      'pronunciation_repeat',
      'Повторить вслух',
      'Повтори короткие ответы по эталону. Это practice mode, не финальная оценка произношения.',
      4,
      [15, 20],
      {
        type: 'plan_exercise',
        exerciseType: 'plan_pronunciation_repeat',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: [
          'gavan_d1_phrase_1',
          'gavan_d1_phrase_2',
          'gavan_d1_phrase_3',
          'gavan_d1_phrase_4',
        ],
        requiredCorrect: 4,
      },
    ),
    buildTask(
      'gavan',
      1,
      'plan_phrase_recall',
      'phrase_recall',
      'Повторить фразы без подсказки',
      'Верни короткие ответы дня по памяти, без лишних слов и без личных данных.',
      4,
      [15, 20],
      { type: 'plan_phrase_recall', lessonId: 'gavan_day1_short_replies', requiredPhrases: 4, afterLessonId: 1 },
    ),
    buildTask(
      'gavan',
      1,
      'plan_quiz',
      'quiz',
      'Проверь короткие ответы',
      '10 быстрых выборов по фразам дня. Без вопросов To Be: только то, что уже разобрали.',
      4,
      [20],
      { type: 'quiz', quizId: 'gavan_day1_short_replies_quiz', questionCount: 10, level: 'easy' },
    ),
  ],
};

const gavanDay1Generated: PlanDay = {
  ...makeGeneratedDay('gavan', 1, 'Короткие ответы'),
  status: 'certified',
  title: 'Короткие ответы',
  focus: 'Научиться отвечать спокойно и коротко, когда нужно подтвердить, не спорить и не зависнуть.',
  phraseGoal: 'Шесть коротких фраз для обычного разговора: где ты, все нормально, непонятно, вы правы, я готов.',
  theory: 'День держится на простых конструкциях I am, You are, It is. Сначала говорим готовую фразу целиком, потом тренируем точные слова внутри нее.',
  lifeOutcome: 'После дня можно коротко подтвердить, что ты здесь, что все нормально, что человек прав, что ты готов или что что-то пока непонятно.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['to-be-statement', 'short-answer', 'location', 'clarity'],
    blockedGrammarTags: ['to-be-question', 'do-question', 'wh-question', 'have-has', 'address', 'contact', 'booking-name'],
  },
};

const gavanDay2Generated: PlanDay = {
  ...makeGeneratedDay('gavan', 2, 'Postcode и номер квартиры'),
  status: 'certified',
  title: 'Postcode и номер квартиры',
  focus: 'Научиться спокойно назвать полный адрес, postcode, номер квартиры и попросить уточнить название улицы по буквам.',
  phraseGoal: 'Шесть фраз для адреса: full address, postcode correct, flat number, spell street name, address on form, proof of address.',
  theory: 'День держится на простых фразах This is, The postcode is, My flat number is, Can you spell, The address is, I can send. Сначала адрес целиком, потом точные слова.',
  lifeOutcome: 'После дня можно назвать полный адрес, подтвердить postcode, номер квартиры, попросить spelling улицы и сказать, что можешь отправить proof of address.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['address', 'postcode', 'flat-number', 'spelling-request', 'proof-of-address'],
    blockedGrammarTags: ['contract-law', 'rental-dispute', 'bank-kyc-details', 'sensitive-id-number'],
  },
};

const gavanDay3Generated: PlanDay = {
  ...makeGeneratedDay('gavan', 3, 'Форма и документ'),
  status: 'certified',
  title: 'Форма и документ',
  focus: 'Научиться спокойно попросить нужную форму, проверить документ, сказать что страница непонятна, заполнить форму и уточнить, нужна ли копия.',
  phraseGoal: 'Шесть коротких фраз для бытового документа: form, document, page not clear, fill it in, copy, bring tomorrow.',
  theory: 'День держится на простых фразах I need, Can you check, This page is, I can fill, Do I need, I will bring. Сначала общий смысл документа, потом точные слова и сборка фразы.',
  lifeOutcome: 'После дня можно в офисе, банке или сервисе попросить форму, проверить документ, сказать что страница непонятна, заполнить форму сегодня, уточнить про копию и принести документ завтра.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['form-request', 'document-check', 'clarity', 'fill-in', 'copy-request', 'bring-document'],
    blockedGrammarTags: ['legal-dispute', 'tax-advice', 'medical-diagnosis', 'sensitive-id-number'],
  },
};

const gavanDay4Generated: PlanDay = {
  ...makeGeneratedDay('gavan', 4, 'Какие документы нужны'),
  status: 'certified',
  title: 'Какие документы нужны',
  focus: 'Научиться спокойно уточнять список документов: что принести, нужен ли оригинал, достаточно ли копии, можно ли отправить онлайн и где найти список.',
  phraseGoal: 'Шесть коротких фраз для офиса или сервиса: which documents, original document, copy enough, send online, find the list, bring tomorrow.',
  theory: 'День держится на бытовых вопросах Which, Do I need, Is, Can I, Where can I и спокойном ответе I can bring. Сначала фраза целиком, потом точное слово, произношение, выбор, сборка и recall.',
  lifeOutcome: 'После дня можно в офисе, банке, клинике или сервисе уточнить, какие документы нужны, нужна ли оригинальная версия, хватит ли копии и можно ли отправить документ онлайн.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['documents-needed', 'original-document', 'copy-request', 'online-send', 'list-request', 'bring-document'],
    blockedGrammarTags: ['legal-advice', 'tax-advice', 'medical-diagnosis', 'sensitive-id-number'],
  },
};

const gavanDay5Generated: PlanDay = {
  ...makeGeneratedDay('gavan', 5, 'Сказать, что документа нет'),
  status: 'certified',
  title: 'Сказать, что документа нет',
  focus: 'Научиться спокойно сказать, что нужного документа нет: предложить принести позже, показать цифровую копию, попросить больше времени и уточнить, что можно сделать сейчас.',
  phraseGoal: 'Шесть коротких office-life фраз: no document, bring later, digital copy, more time, do now, send tomorrow.',
  theory: 'День держится на практичных конструкциях I do not have, Can I bring, I have, I need, What can I do, I will send. Сначала смысл ситуации, потом выбор, сборка, missing word, слух и quiz.',
  lifeOutcome: 'После дня можно в офисе, банке или сервисе не растеряться, если документа нет: объяснить ситуацию, предложить копию, попросить время и договориться отправить документ завтра.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['missing-document', 'bring-later', 'digital-copy', 'more-time', 'next-step', 'send-tomorrow'],
    blockedGrammarTags: ['legal-advice', 'tax-advice', 'medical-diagnosis', 'sensitive-id-number'],
  },
};

const gavanDay6Generated: PlanDay = {
  ...makeGeneratedDay('gavan', 6, 'Исправить данные в форме'),
  status: 'certified',
  title: 'Исправить данные в форме',
  focus: 'Научиться спокойно исправлять ошибку в форме или документе: назвать ошибку, неверный адрес, обновить данные, исправить страницу, проверить новую копию и принести правильный документ.',
  phraseGoal: 'Шесть коротких repair-фраз для офиса или сервиса: mistake on form, wrong address, update details, correct page, new copy, right document.',
  theory: 'День держится на практичных repair-конструкциях There is, The address is, I need to, Can I, Please check, I will bring. Сначала фраза целиком, потом сборка на слух, recall, выбор, missing word и listening.',
  lifeOutcome: 'После дня можно в офисе, банке или сервисе не зависнуть, если в форме ошибка: указать проблему, исправить данные, попросить проверить новую копию и договориться принести правильный документ.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['form-repair', 'wrong-address', 'update-details', 'correct-page', 'new-copy', 'right-document'],
    blockedGrammarTags: ['legal-advice', 'tax-advice', 'medical-diagnosis', 'sensitive-id-number'],
  },
};

const gavanDay7Generated: PlanDay = {
  ...makeGeneratedDay('gavan', 7, 'Повтор недели: документы без ступора'),
  status: 'certified',
  title: 'Повтор недели: документы без ступора',
  focus: 'Повторить ключевые фразы первой недели для документов и офисных сервисов: полный адрес, нужная форма, проверка документа, список документов, цифровая копия и новая копия.',
  phraseGoal: 'Шесть коротких review-фраз для бытовых документов: full address, this form, check document, which documents, digital copy, new copy.',
  theory: 'День закрывает неделю через практичные document-service конструкции This is, I need, Can you check, Which documents, I have, Please check.',
  lifeOutcome: 'После дня можно спокойно пройти базовый разговор в офисе или сервисе: назвать адрес, попросить форму, проверить документ, уточнить список и показать цифровую или новую копию.',
  curriculum: {
    lessonPrerequisites: [1, 2, 3, 4, 5, 6],
    allowedGrammarTags: ['week-check', 'document-review', 'address', 'form-request', 'document-check', 'digital-copy', 'new-copy'],
    blockedGrammarTags: ['legal-advice', 'tax-advice', 'medical-diagnosis', 'sensitive-id-number'],
  },
};

const gavanDay8Generated: PlanDay = {
  ...makeGeneratedDay('gavan', 8, 'Неделя 2: документы без лишних подсказок'),
  status: 'certified',
  title: 'Неделя 2: документы без лишних подсказок',
  focus: 'Начать вторую неделю Gavan с самостоятельных document-service фраз: отправить форму онлайн, загрузить копию, спросить место подписи, принести оригинал, получить reference number и сохранить receipt.',
  phraseGoal: 'Шесть коротких autonomy-фраз для офиса или сервиса: submit form online, upload copy, where to sign, bring original tomorrow, reference number, keep receipt.',
  theory: 'День держится на практичных конструкциях Can I, I need to, Where should I, I can, Please tell me, I will. Подсказок меньше: ученик выбирает полный смысл и собирает фразу без прямой опоры на перевод.',
  lifeOutcome: 'После дня можно самостоятельно пройти следующий шаг с документами: отправить форму, загрузить копию, уточнить подпись, пообещать оригинал, записать номер обращения и сохранить чек.',
  curriculum: {
    lessonPrerequisites: [1, 3, 4, 5, 7],
    allowedGrammarTags: ['week-2-autonomy', 'document-service', 'online-form', 'upload-copy', 'signature', 'original-document', 'reference-number', 'receipt'],
    blockedGrammarTags: ['legal-advice', 'tax-advice', 'medical-diagnosis', 'sensitive-id-number'],
  },
};

const gavanDay9Generated: PlanDay = {
  ...makeGeneratedDay('gavan', 9, 'Запись и следующий шаг'),
  status: 'certified',
  title: 'Запись и следующий шаг',
  focus: 'Научиться спокойно уточнять следующий шаг в офисе или сервисе: нужна ли запись, можно ли записаться сегодня, какую дату подтвердить, какой документ принести и что записать для себя.',
  phraseGoal: 'Шесть коротких next-step фраз для бытового сервиса: next step, appointment, book today, confirm date, bring document, write it down.',
  theory: 'День продолжает Week 2 через двухходовой документный сценарий: сначала уточнить следующий шаг и запись, потом подтвердить дату, документ и письменную подсказку. Держим вопросы What is, Do I need, Can I и действия Please confirm, I will bring, Can you write.',
  lifeOutcome: 'После дня можно в офисе, банке, клинике или городском сервисе спокойно понять, что делать дальше: спросить про запись, выбрать дату, подтвердить документ и попросить записать важную деталь.',
  curriculum: {
    lessonPrerequisites: [1, 4, 8],
    allowedGrammarTags: ['week-2-two-turn-dialogue', 'document-service', 'next-step', 'appointment', 'booking', 'date-confirmation', 'write-down'],
    blockedGrammarTags: ['legal-advice', 'tax-advice', 'medical-diagnosis', 'sensitive-id-number'],
  },
};

const gavanDay10Generated: PlanDay = {
  ...makeGeneratedDay('gavan', 10, 'Детали сервиса и следующий визит'),
  status: 'certified',
  title: 'Детали сервиса и следующий визит',
  focus: 'Научиться переносить сценарий записи и документов в соседний бытовой сервис: подтверждение адреса, оплата сбора, копия, стойка обслуживания, новая запись и следующий визит.',
  phraseGoal: 'Шесть коротких controlled-variation фраз для сервиса: proof of address, pay fee here, make a copy, service desk, another appointment, come back next week.',
  theory: 'День продолжает Week 2 через controlled variation: меняется деталь сервиса, но сохраняется тот же паттерн коротко спросить, подтвердить документ, оплату, место и следующий шаг. Держим Do I need, Can I pay, Please make, Where is, I need, I will come back.',
  lifeOutcome: 'После дня можно в офисе или городском сервисе уточнить подтверждение адреса, оплатить сбор, попросить копию, найти стойку обслуживания и договориться о следующей записи.',
  curriculum: {
    lessonPrerequisites: [1, 4, 8, 9],
    allowedGrammarTags: ['week-2-controlled-variation', 'document-service', 'proof-of-address', 'fee-payment', 'copy-request', 'service-desk', 'appointment'],
    blockedGrammarTags: ['legal-advice', 'tax-advice', 'medical-diagnosis', 'sensitive-id-number'],
  },
};

const gavanDay11Generated: PlanDay = {
  ...makeGeneratedDay('gavan', 11, 'Подать заявку и не потеряться'),
  status: 'certified',
  title: 'Подать заявку и не потеряться',
  focus: 'Перейти к prompted production в бытовом сервисе: попросить объяснить заявку, отправить документ, уточнить недостающую информацию, принести форму и записать reference number.',
  phraseGoal: 'Шесть коротких service-request фраз: explain how to apply, send document today, missing information, bring form tomorrow, confirm next step, write down reference number.',
  theory: 'День продолжает Week 2 через prompted production: ученик уже сам собирает запрос в сервисе, а rescue-фразы помогают, если не хватает информации или надо зафиксировать следующий шаг. Держим Can you explain, I need to send, What information, I can bring, Please confirm, I will write down.',
  lifeOutcome: 'После дня можно в офисе или городском сервисе самому спросить, как подать заявку, какой документ отправить, чего не хватает и какой номер обращения записать.',
  curriculum: {
    lessonPrerequisites: [1, 4, 8, 9, 10],
    allowedGrammarTags: ['week-2-prompted-production', 'document-service', 'application', 'missing-information', 'form', 'next-step', 'reference-number'],
    blockedGrammarTags: ['legal-advice', 'tax-advice', 'medical-diagnosis', 'sensitive-id-number'],
  },
};

const impulsDay1Generated: PlanDay = {
  ...makeGeneratedDay('impuls', 1, 'Короткая история'),
  status: 'certified',
  title: 'Короткая история',
  focus: 'Научиться рассказать короткую историю без ступора: начало, что случилось, что сделал дальше, чем закончилось.',
  phraseGoal: 'Шесть фраз для мини-истории: can tell, first, then, after that, story ends, why I was late.',
  theory: 'День держится на простых связках First, Then, After that и коротких предложениях. Сначала собираем историю целиком, потом тренируем отдельные слова и порядок.',
  lifeOutcome: 'После дня можно коротко объяснить, что произошло: сначала пропустил автобус, потом позвонил другу, нашел другой путь и поэтому опоздал.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['story-sequence', 'first-then-after-that', 'short-speaking', 'reason'],
    blockedGrammarTags: ['long-monologue', 'complex-past-narrative', 'reported-speech', 'abstract-argument'],
  },
};

const impulsDay2Generated: PlanDay = {
  ...makeGeneratedDay('impuls', 2, 'Сказать мнение'),
  status: 'certified',
  title: 'Сказать мнение',
  focus: 'Научиться быстро сказать свое мнение: полезно, идея нравится, пока не согласен, причина понятна и можно объяснить коротко.',
  phraseGoal: 'Шесть фраз для мнения без паузы: think useful, opinion simple, like idea, not agree yet, reason clear, explain briefly.',
  theory: 'День держится на коротких opinion-фразах I think, My opinion is, I like, I do not agree, The reason is, I can explain. Сначала позиция, потом причина.',
  lifeOutcome: 'После дня можно быстро сказать мнение, согласиться или не согласиться мягко, назвать причину и пообещать короткое объяснение.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['opinion', 'agreement', 'reason', 'brief-explanation', 'speaking-recovery'],
    blockedGrammarTags: ['debate', 'formal-argument', 'sensitive-opinion', 'politics'],
  },
};

const impulsDay3Generated: PlanDay = {
  ...makeGeneratedDay('impuls', 3, 'Добавить because'),
  status: 'certified',
  title: 'Добавить because',
  focus: 'Научиться быстро добавлять причину к короткому ответу: потому что это экономит время, нужна практика, идея полезная, можно сделать сейчас или ответ простой.',
  phraseGoal: 'Шесть коротких because-фраз для ответа без ступора: saves time, need practice, useful idea, do it now, simple answer, clear reason.',
  theory: 'День держится на одной сильной связке Because. Сначала говорим причину целиком, потом тренируем слух, пропуск слова, сборку и recall, чтобы причина появлялась автоматически.',
  lifeOutcome: 'После дня можно не просто сказать мнение, а сразу дать короткую причину: почему идея полезная, почему это экономит время, почему можно сделать сейчас и почему ответ простой.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['because', 'reason', 'short-speaking', 'opinion-support', 'speaking-recovery'],
    blockedGrammarTags: ['formal-argument', 'debate', 'politics', 'sensitive-opinion'],
  },
};

const impulsDay4Generated: PlanDay = {
  ...makeGeneratedDay('impuls', 4, 'Исправиться после ошибки'),
  status: 'certified',
  title: 'Исправиться после ошибки',
  focus: 'Научиться не зависать после ошибки: спокойно сказать фразу еще раз, признать маленькую ошибку, заменить слово, выбрать другой вариант и исправить предложение.',
  phraseGoal: 'Шесть коротких repair-фраз: say it again, small mistake, right word different, other option, fix the sentence, sounds better.',
  theory: 'День держится на быстрых recovery-конструкциях Let me, I made, The right word is, I mean, Now it sounds. Сначала фраза целиком, потом точное слово, произношение, выбор, сборка и recall.',
  lifeOutcome: 'После дня можно продолжить разговор после ошибки без ступора: сказать заново, уточнить правильное слово, выбрать другой вариант и спокойно поправить предложение.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['speaking-recovery', 'self-correction', 'repair-phrase', 'option-correction', 'sentence-fix'],
    blockedGrammarTags: ['formal-apology', 'debate', 'legal-correction', 'sensitive-disclosure'],
  },
};

const impulsDay5Generated: PlanDay = {
  ...makeGeneratedDay('impuls', 5, 'Взять короткую паузу'),
  status: 'certified',
  title: 'Взять короткую паузу',
  focus: 'Научиться не зависать, когда нужен момент на мысль: спокойно попросить секунду, минутку, короткую паузу и обещать ответ после нее.',
  phraseGoal: 'Шесть коротких buy-time фраз: one second, think for a moment, short pause, answer in a minute, answer after the pause, give me a moment.',
  theory: 'День держится на спокойных паузах в речи. Сначала говорим основную фразу целиком, потом тренируем выбор, сборку на слух, пропуск слова, квиз, произношение и recall.',
  lifeOutcome: 'После дня можно не молчать в ступоре, а взять короткую паузу по-английски и сразу показать собеседнику, что ответ будет через момент.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['buy-time', 'short-pause', 'speaking-recovery', 'answer-delay', 'conversation-control'],
    blockedGrammarTags: ['formal-apology', 'debate', 'long-explanation', 'sensitive-disclosure'],
  },
};

const impulsDay6Generated: PlanDay = {
  ...makeGeneratedDay('impuls', 6, 'Соединить две мысли'),
  status: 'certified',
  title: 'Соединить две мысли',
  focus: 'Научиться быстро соединять две короткие мысли после паузы: назвать две идеи, первую и вторую часть, связать их сейчас и дать понятный ответ.',
  phraseGoal: 'Шесть коротких speaking-фраз для связки ответа: two ideas, first idea, second idea, connect them, answer clear, both parts.',
  theory: 'День держится на простых связках I have, The first, The second, I can, So, Let me. Сначала коротко собираем мысль целиком, потом тренируем порядок и точность слов.',
  lifeOutcome: 'После дня можно не застрять на одной фразе, а связать две мысли в короткий ответ: назвать первую идею, вторую идею, соединить их и спокойно закончить ответ.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['two-ideas', 'first-second', 'connect-ideas', 'clear-answer', 'speaking-flow'],
    blockedGrammarTags: ['long-monologue', 'formal-argument', 'debate', 'sensitive-opinion'],
  },
};

const impulsDay7Generated: PlanDay = {
  ...makeGeneratedDay('impuls', 7, 'Повтор недели: говорить без ступора'),
  status: 'certified',
  title: 'Повтор недели: говорить без ступора',
  focus: 'Повторить ключевые фразы первой недели для свободного ответа: короткая история, простое мнение, причина через because, самокоррекция, короткая пауза и две идеи.',
  phraseGoal: 'Шесть коротких review-фраз для speaking flow: short story, simple opinion, because saves time, say it again, one second, two ideas.',
  theory: 'День закрывает неделю через speaking-recovery конструкции I can, My opinion is, Because, Let me, Give me, I have.',
  lifeOutcome: 'После дня можно не зависать в устном ответе: начать короткую историю, дать мнение, добавить причину, исправиться, взять секунду и связать две идеи.',
  curriculum: {
    lessonPrerequisites: [1, 2, 3, 4, 5, 6],
    allowedGrammarTags: ['week-check', 'speaking-review', 'short-story', 'opinion', 'because', 'self-correction', 'buy-time', 'two-ideas'],
    blockedGrammarTags: ['long-monologue', 'formal-argument', 'debate', 'sensitive-opinion'],
  },
};

const impulsDay8Generated: PlanDay = {
  ...makeGeneratedDay('impuls', 8, 'Неделя 2: ответ в две части без лишних подсказок'),
  status: 'certified',
  title: 'Неделя 2: ответ в две части без лишних подсказок',
  focus: 'Начать вторую неделю Impuls с самостоятельного speaking-flow: ответить в двух частях, назвать первый и второй пункт, добавить пример, связать идеи и закрыть коротким ответом.',
  phraseGoal: 'Шесть коротких autonomy-фраз для устного ответа: answer in two parts, first point, second point, one example, connect ideas, short answer.',
  theory: 'День держится на связках Can I, The first, The second, I need, Let me, That is. Подсказок меньше: ученик сам выбирает смысл, порядок и короткое завершение ответа.',
  lifeOutcome: 'После дня можно не застревать в устном ответе: попросить формат из двух частей, назвать первый и второй пункт, привести пример, соединить идеи и закончить без длинной паузы.',
  curriculum: {
    lessonPrerequisites: [1, 2, 3, 6, 7],
    allowedGrammarTags: ['week-2-autonomy', 'two-part-answer', 'first-second', 'example', 'connect-ideas', 'short-answer', 'speaking-flow'],
    blockedGrammarTags: ['long-monologue', 'formal-argument', 'debate', 'sensitive-opinion'],
  },
};

const impulsDay9Generated: PlanDay = {
  ...makeGeneratedDay('impuls', 9, 'Главная мысль и короткий ответ'),
  status: 'certified',
  title: 'Главная мысль и короткий ответ',
  focus: 'Научиться отвечать без ступора в два хода: взять секунду, назвать главную мысль, добавить одну причину или пример и закончить коротким выводом.',
  phraseGoal: 'Шесть коротких main-point фраз для speaking flow: second to answer, main point, one reason, for example, answer is yes, finish with this.',
  theory: 'День продолжает Week 2 через двухходовой speaking-сценарий: сначала удержать паузу и главную мысль, потом добавить причину или пример и завершить ответ. Держим Give me, My main point, I can add, For example, So, Let me finish.',
  lifeOutcome: 'После дня можно не зависнуть при устном вопросе: взять секунду, сказать главную мысль, добавить одну причину или пример и спокойно закончить коротким ответом.',
  curriculum: {
    lessonPrerequisites: [1, 3, 5, 8],
    allowedGrammarTags: ['week-2-two-turn-dialogue', 'speaking-flow', 'main-point', 'reason', 'example', 'short-answer', 'finish-answer'],
    blockedGrammarTags: ['long-monologue', 'formal-argument', 'debate', 'sensitive-opinion'],
  },
};

const echoDay8Generated: PlanDay = {
  ...makeGeneratedDay('echo', 8, 'Неделя 2: слушать ключевое без лишних подсказок'),
  status: 'certified',
  title: 'Неделя 2: слушать ключевое без лишних подсказок',
  focus: 'Начать вторую неделю Echo с самостоятельного listening-repair: попросить повторить полезную часть, зафиксировать первое слово, назвать пропущенную деталь, попросить медленнее и подтвердить время.',
  phraseGoal: 'Шесть коротких autonomy-фраз для слуха и реакции: useful part, first word, last detail, say slower, understand the time, answer is clear.',
  theory: 'День держится на listening-конструкциях Can you repeat, I heard, I missed, Please say, Now I understand, That answer is. Подсказок меньше: ученик сам выбирает полный смысл и восстанавливает услышанную деталь.',
  lifeOutcome: 'После дня можно спокойнее чинить живую речь на слух: попросить повторить нужную часть, отметить услышанное слово, назвать пропущенную деталь, попросить медленнее и подтвердить, что ответ понятен.',
  curriculum: {
    lessonPrerequisites: [1, 3, 4, 5, 6, 7],
    allowedGrammarTags: ['week-2-autonomy', 'listening-repair', 'repeat-useful-part', 'heard-first-word', 'missed-detail', 'slower', 'time-understanding'],
    blockedGrammarTags: ['long-dictation', 'accent-theory', 'phonetics-analysis', 'complex-summary'],
  },
};

const echoDay9Generated: PlanDay = {
  ...makeGeneratedDay('echo', 9, 'Ключевая деталь на слух'),
  status: 'certified',
  title: 'Ключевая деталь на слух',
  focus: 'Научиться спокойно чинить понимание в два хода: попросить повторить ключевую часть, поймать дату, число или адрес и подтвердить, что деталь теперь понятна.',
  phraseGoal: 'Шесть коротких key-detail listening фраз: repeat key part, heard date, missed final number, say address again, confirm it, detail clear now.',
  theory: 'День продолжает Week 2 через двухходовой listening-сценарий: сначала запросить повтор ключевой части, потом подтвердить услышанную дату, число или адрес. Держим Can you repeat, I heard, I missed, Please say, Now I can, That detail.',
  lifeOutcome: 'После дня можно не теряться в живой речи: попросить повторить ключевую часть, восстановить дату, число или адрес и спокойно подтвердить, что деталь понятна.',
  curriculum: {
    lessonPrerequisites: [1, 3, 4, 8],
    allowedGrammarTags: ['week-2-two-turn-dialogue', 'listening-repair', 'key-detail', 'date-confirmation', 'final-number', 'address-repeat', 'confirm-detail'],
    blockedGrammarTags: ['long-dictation', 'accent-theory', 'phonetics-analysis', 'complex-summary'],
  },
};

const echoDay10Generated: PlanDay = {
  ...makeGeneratedDay('echo', 10, 'Инструкция и точная деталь на слух'),
  status: 'certified',
  title: 'Инструкция и точная деталь на слух',
  focus: 'Научиться переносить listening-repair в соседнюю бытовую инструкцию: уточнить вход, окно, этаж, номер очереди, имя и подтвердить, что инструкция понятна.',
  phraseGoal: 'Шесть коротких instruction-detail фраз для слуха и реакции: which entrance, window number three, second floor, queue number, understand the name, instruction clear now.',
  theory: 'День продолжает Week 2 через controlled variation: вместо даты, числа и адреса ученик чинит понимание инструкции. Держим Which entrance, I heard, Did you say, Please repeat, Now I understand, That instruction.',
  lifeOutcome: 'После дня можно спокойнее реагировать на инструкции в офисе, клинике или сервисе: переспросить вход, окно, этаж, номер очереди или имя и подтвердить, что теперь всё понятно.',
  curriculum: {
    lessonPrerequisites: [1, 3, 4, 8, 9],
    allowedGrammarTags: ['week-2-controlled-variation', 'listening-repair', 'instruction-detail', 'entrance', 'window-number', 'floor', 'queue-number'],
    blockedGrammarTags: ['long-dictation', 'accent-theory', 'phonetics-analysis', 'complex-summary'],
  },
};

const echoDay11Generated: PlanDay = {
  ...makeGeneratedDay('echo', 11, 'Проверить, что понял правильно'),
  status: 'certified',
  title: 'Проверить, что понял правильно',
  focus: 'Перейти к prompted production в listening-repair: проверить, что понял инструкцию, попросить одну деталь, уточнить первый шаг и повторить услышанное обратно.',
  phraseGoal: 'Шесть коротких understanding-check фраз: check what understood, heard main instruction, one more detail, do first, correct me, repeat it back slowly.',
  theory: 'День продолжает Week 2 через prompted production: ученик уже сам собирает проверку понимания, а rescue-фразы помогают не притворяться, что всё ясно. Держим Can I check, I heard, I need, What should I, Please correct me, I will repeat.',
  lifeOutcome: 'После дня можно в живом разговоре безопасно проверить инструкцию: сказать, что понял, попросить недостающую деталь, уточнить первый шаг и повторить всё обратно.',
  curriculum: {
    lessonPrerequisites: [1, 3, 4, 8, 9, 10],
    allowedGrammarTags: ['week-2-prompted-production', 'listening-repair', 'understanding-check', 'main-instruction', 'detail-request', 'first-step', 'repeat-back'],
    blockedGrammarTags: ['long-dictation', 'accent-theory', 'phonetics-analysis', 'complex-summary'],
  },
};

const impulsDay10Generated: PlanDay = {
  ...makeGeneratedDay('impuls', 10, 'Мягкая альтернатива в коротком ответе'),
  status: 'certified',
  title: 'Мягкая альтернатива в коротком ответе',
  focus: 'Научиться переносить главный ответ в соседнюю speaking-ситуацию: признать чужую мысль, выбрать другой вариант, дать практичную причину, назвать проблему времени, предпочесть вторую идею и закрыть коротко.',
  phraseGoal: 'Шесть коротких alternative-answer фраз для speaking flow: see your point, choose different option, practical reason, main issue is time, prefer second idea, short answer.',
  theory: 'День продолжает Week 2 через controlled variation: вместо прямого yes-answer ученик мягко дает альтернативу, сохраняя тот же скелет короткого ответа. Держим I see, I would choose, My reason, For me, So I prefer, That is.',
  lifeOutcome: 'После дня можно не зависнуть, когда нужно не согласиться полностью: сначала признать мысль собеседника, затем спокойно выбрать другой вариант, дать одну причину и закончить без длинного монолога.',
  curriculum: {
    lessonPrerequisites: [1, 3, 5, 8, 9],
    allowedGrammarTags: ['week-2-controlled-variation', 'speaking-flow', 'alternative-answer', 'soft-disagreement', 'reason', 'main-issue', 'short-answer'],
    blockedGrammarTags: ['long-monologue', 'formal-argument', 'debate', 'sensitive-opinion'],
  },
};

const impulsDay11Generated: PlanDay = {
  ...makeGeneratedDay('impuls', 11, 'Самостоятельный короткий ответ'),
  status: 'certified',
  title: 'Самостоятельный короткий ответ',
  focus: 'Перейти к prompted production в speaking-flow: начать короткий ответ, взять момент на мысли, назвать первую причину, дать быстрый пример, уточнить продолжать ли и укоротить ответ.',
  phraseGoal: 'Шесть коротких short-answer фраз: start with short answer, moment to organize thoughts, first reason, quick example, should continue, make answer shorter.',
  theory: 'День продолжает Week 2 через prompted production: ученик уже сам собирает устный ответ, а rescue-фразы помогают не зависнуть, если нужна пауза, пример или более короткая версия. Держим Can I start, I need a moment, The first reason, I can give, Please tell me, I will make.',
  lifeOutcome: 'После дня можно на вопрос ответить коротко и управляемо: начать с короткой версии, взять паузу, дать одну причину и пример, а затем уточнить, нужно ли продолжать.',
  curriculum: {
    lessonPrerequisites: [1, 3, 5, 8, 9, 10],
    allowedGrammarTags: ['week-2-prompted-production', 'speaking-flow', 'short-answer', 'organize-thoughts', 'first-reason', 'quick-example', 'continue-check'],
    blockedGrammarTags: ['long-monologue', 'formal-argument', 'debate', 'sensitive-opinion'],
  },
};

const echoDay1Generated: PlanDay = {
  ...makeGeneratedDay('echo', 1, 'Повторить и уточнить услышанное'),
  status: 'certified',
  title: 'Повторить и уточнить услышанное',
  focus: 'Научиться спокойно попросить повторить, поймать последнее слово, время или место и сразу ответить после уточнения.',
  phraseGoal: 'Шесть фраз для первого listening-дня: repeat that, last word, heard the time, missed the place, say today, can answer.',
  theory: 'День держится на коротких listening-repair фразах: Can you repeat, Please repeat, I heard, I missed, Did you say. Сначала ловим общий смысл, потом тренируем точные слова.',
  lifeOutcome: 'После дня можно попросить повторить фразу или последнее слово, сказать что услышал время, пропустил место, уточнить today и ответить после повторения.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['listening-repair', 'repeat-request', 'heard-missed', 'short-reaction'],
    blockedGrammarTags: ['long-dictation', 'accent-theory', 'phonetics-analysis', 'complex-follow-up-question'],
  },
};

const echoDay2Generated: PlanDay = {
  ...makeGeneratedDay('echo', 2, 'Ответить коротко'),
  status: 'certified',
  title: 'Ответить коротко',
  focus: 'Научиться быстро дать короткий ответ после услышанной фразы: понимаю, пока нет, могу ответить, повторите еще раз.',
  phraseGoal: 'Шесть коротких response-фраз: understand, not yet, answer now, say again, short answer, one more second.',
  theory: 'День держится на коротких реакциях Yes, No, I can, Please say, The answer is, I need. Сначала ловим смысл, потом отвечаем без длинной паузы.',
  lifeOutcome: 'После дня можно ответить коротко после услышанной фразы: подтвердить понимание, сказать что пока нет, попросить повторить и взять секунду.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['short-response', 'listening-reaction', 'repeat-request', 'one-more-second'],
    blockedGrammarTags: ['long-dialogue', 'complex-negation', 'formal-apology', 'accent-analysis'],
  },
};

const echoDay3Generated: PlanDay = {
  ...makeGeneratedDay('echo', 3, 'Переспросить'),
  status: 'certified',
  title: 'Переспросить',
  focus: 'Научиться спокойно переспросить на слух: попросить повторить, сказать медленнее, уточнить tomorrow, отметить первую часть и последнее слово.',
  phraseGoal: 'Шесть коротких listening-repair фраз: say again, more slowly, tomorrow, first part, last word, understand the message.',
  theory: 'День держится на коротких слуховых реакциях Can you say, Please say, Did you say, I heard, I missed, Now I understand. Сначала смысл, потом точные слова на слух.',
  lifeOutcome: 'После дня можно не теряться, если фразу услышал не полностью: попросить повторить, замедлить речь, уточнить завтра, сказать что услышал первую часть или пропустил последнее слово.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['listening-repair', 'repeat-request', 'slowly', 'time-confirmation', 'heard-missed'],
    blockedGrammarTags: ['long-dictation', 'accent-theory', 'phonetics-analysis', 'complex-follow-up-question'],
  },
};

const echoDay4Generated: PlanDay = {
  ...makeGeneratedDay('echo', 4, 'Понять время и место'),
  status: 'certified',
  title: 'Понять время и место',
  focus: 'Научиться уточнять услышанное время и место: переспросить пять часов, подтвердить встречу здесь, поймать название улицы, адрес и ориентир рядом со станцией.',
  phraseGoal: 'Шесть коротких listening-фраз: five oclock, meeting here, street name, repeat address, place near station, be there tomorrow.',
  theory: 'День держится на слуховых реакциях Did you say, Is, I heard, Can you repeat, The place is, I will be. Сначала ловим смысл, потом тренируем точное слово, произношение, выбор, сборку и recall.',
  lifeOutcome: 'После дня можно спокойнее понять время и место встречи на слух: уточнить час, место, улицу, адрес и подтвердить, что ты будешь там завтра.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['time-confirmation', 'place-confirmation', 'street-name', 'address-repeat', 'meeting-place'],
    blockedGrammarTags: ['long-dictation', 'accent-theory', 'phonetics-analysis', 'complex-directions'],
  },
};

const echoDay5Generated: PlanDay = {
  ...makeGeneratedDay('echo', 5, 'Понять главное сообщение'),
  status: 'certified',
  title: 'Понять главное сообщение',
  focus: 'Научиться ловить главный смысл услышанного: понять основное сообщение, ключевую мысль, срочность на сегодня, план и короткую версию.',
  phraseGoal: 'Шесть коротких listening-фраз: main message, key point, need today, confirm plan, short version, reply after listen.',
  theory: 'День держится на listening-first реакции: The main message, I understand, You need, I can confirm, Please send, I will reply. Сначала ловим общий смысл, потом тренируем выбор, сборку на слух, missing word, quiz и recall.',
  lifeOutcome: 'После дня можно после услышанной фразы коротко подтвердить, что главное понятно: уловить основной смысл, срочность, план и попросить короткую версию, если нужно.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['main-message', 'key-point', 'listening-reaction', 'plan-confirmation', 'short-version'],
    blockedGrammarTags: ['long-dictation', 'accent-theory', 'phonetics-analysis', 'complex-summary'],
  },
};

const echoDay6Generated: PlanDay = {
  ...makeGeneratedDay('echo', 6, 'Восстановить пропущенную деталь'),
  status: 'certified',
  title: 'Восстановить пропущенную деталь',
  focus: 'Научиться спокойно чинить понимание на слух: сказать, что пропущена одна деталь, попросить короткую версию, поймать главную мысль, переслушать и ответить после уточнения.',
  phraseGoal: 'Шесть коротких listening-repair фраз: missed detail, short version, main point, hear again, message clear, reply now.',
  theory: 'День держится на listening-repair конструкциях I missed, Can you say, The main point, I need to hear, Now, I can reply. Сначала восстанавливаем общий смысл, потом тренируем точные слова.',
  lifeOutcome: 'После дня можно не теряться, если в речи выпала деталь: попросить короткую версию, услышать повтор, зафиксировать главную мысль и ответить уже после уточнения.',
  curriculum: {
    lessonPrerequisites: [1],
    allowedGrammarTags: ['listening-repair', 'missed-detail', 'short-version', 'main-point', 'hear-again', 'reply-now'],
    blockedGrammarTags: ['long-dictation', 'accent-theory', 'phonetics-analysis', 'complex-summary'],
  },
};

const echoDay7Generated: PlanDay = {
  ...makeGeneratedDay('echo', 7, 'Повтор недели: слышать без ступора'),
  status: 'certified',
  title: 'Повтор недели: слышать без ступора',
  focus: 'Повторить ключевые фразы первой недели для listening-repair: попросить повторить, ответить сразу, переспросить, уточнить время, понять главное сообщение и назвать пропущенную деталь.',
  phraseGoal: 'Шесть коротких review-фраз для слуха и реакции: repeat that, answer now, say that again, five oclock, main message clear, missed one detail.',
  theory: 'День закрывает неделю через listening-repair конструкции Can you, I can, Did you say, The main message is, I missed.',
  lifeOutcome: 'После дня можно спокойнее реагировать на живую речь: попросить повторить, уточнить время, поймать главное сообщение, восстановить деталь и ответить без длинной паузы.',
  curriculum: {
    lessonPrerequisites: [1, 2, 3, 4, 5, 6],
    allowedGrammarTags: ['week-check', 'listening-review', 'repeat-request', 'short-response', 'time-confirmation', 'main-message', 'missed-detail'],
    blockedGrammarTags: ['long-dictation', 'accent-theory', 'phonetics-analysis', 'complex-summary'],
  },
};

export const PERSONAL_PLAN_CATALOG: PersonalPlanDefinition[] = [
  {
    id: 'voyazh',
    name: 'Атлас',
    goal: 'Спокойно объясняться в любой поездке.',
    horizonWeeks: 12,
    recommendedLevel: 'A2',
    minutesDefault: 15,
    accent: '#76B5FF',
    shortFocus: 'аэропорт, отель, кафе, дорога, помощь',
    days: generateDays('voyazh', 12, voyazhTopics, [voyazhDay1, voyazhDay2, voyazhDay3, voyazhDay4, voyazhDay5, voyazhDay6, voyazhDay7, voyazhDay8, voyazhDay9, voyazhDay10, voyazhDay11]),
  },
  {
    id: 'mitap',
    name: 'Фокус',
    goal: 'Держать ум в тонусе через язык.',
    horizonWeeks: 16,
    recommendedLevel: 'A2 → B1',
    minutesDefault: 20,
    accent: '#A78BFA',
    shortFocus: 'понемногу обо всём: слова, слух, речь',
    days: generateDays('mitap', 16, mitapTopics, [mitapDay1, mitapDay2, mitapDay3, mitapDay4, mitapDay5, mitapDay6, mitapDay7, mitapDay8, mitapDay9, mitapDay10, mitapDay11]),
  },
  {
    id: 'gavan',
    name: 'Запас',
    goal: 'Собрать запас слов на каждый день.',
    horizonWeeks: 18,
    recommendedLevel: 'A1 → A2',
    minutesDefault: 15,
    accent: '#62D889',
    shortFocus: 'нужные слова: дом, город, дела, покупки',
    days: generateDays('gavan', 18, gavanTopics, [gavanDay1Generated, gavanDay2Generated, gavanDay3Generated, gavanDay4Generated, gavanDay5Generated, gavanDay6Generated, gavanDay7Generated, gavanDay8Generated, gavanDay9Generated, gavanDay10Generated, gavanDay11Generated]),
  },
  {
    id: 'impuls',
    name: 'Реплика',
    goal: 'Отвечать в разговоре без ступора.',
    horizonWeeks: 20,
    recommendedLevel: 'A2 → B1',
    minutesDefault: 20,
    accent: '#FF9270',
    shortFocus: 'живое общение: быстрые ответы вслух',
    days: generateDays('impuls', 20, impulsTopics, [impulsDay1Generated, impulsDay2Generated, impulsDay3Generated, impulsDay4Generated, impulsDay5Generated, impulsDay6Generated, impulsDay7Generated, impulsDay8Generated, impulsDay9Generated, impulsDay10Generated, impulsDay11Generated]),
  },
  {
    id: 'echo',
    name: 'Эфир',
    goal: 'Понимать живую речь без субтитров.',
    horizonWeeks: 12,
    recommendedLevel: 'A2',
    minutesDefault: 10,
    accent: '#5EEAD4',
    shortFocus: 'кино и сериалы: речь на слух, ответы',
    days: generateDays('echo', 12, echoTopics, [echoDay1Generated, echoDay2Generated, echoDay3Generated, echoDay4Generated, echoDay5Generated, echoDay6Generated, echoDay7Generated, echoDay8Generated, echoDay9Generated, echoDay10Generated, echoDay11Generated]),
  },
];

export function getPlanById(id: PersonalPlanId): PersonalPlanDefinition {
  return PERSONAL_PLAN_CATALOG.find((plan) => plan.id === id) ?? PERSONAL_PLAN_CATALOG[2];
}
