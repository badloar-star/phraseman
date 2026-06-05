export type PersonalPlanId = 'voyazh' | 'mitap' | 'gavan' | 'impuls' | 'echo';
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
  | { type: 'plan_phrase_recall'; lessonId: string; requiredPhrases: number; afterLessonId: number }
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

export function nextTaskAfterVisibleSlice(
  day: PlanDay,
  minutes: PlanMinutesChoice,
  additionalVisibleTasks: number,
): PlanDailyTask | null {
  const tasks = allTasksForDay(day);
  const index = Math.max(0, initialVisibleTaskCount(day, minutes) + Math.floor(additionalVisibleTasks));
  return tasks[index] ?? null;
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

  return {
    id: `${planId}_d${String(dayIndex).padStart(3, '0')}`,
    dayIndex,
    weekIndex,
    status: dayIndex <= 28 ? 'authored_needs_review' : 'scaffold',
    source: sourceBindingForDay(planId, dayIndex),
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
        [5, 10, 15, 20],
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
        [5, 10, 15, 20],
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
        [5, 10, 15, 20],
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
        [5, 10, 15, 20],
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
        [5, 10, 15, 20],
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
        'Повтор фраз дня',
        'Коротко вернём фразы, которые уже встречались. Если появятся личные ошибки, сюда встанет точечная тренировка.',
        4,
        [15, 20],
        { type: 'plan_phrase_recall', lessonId: `${planId}_d${String(dayIndex).padStart(3, '0')}_content_unit`, requiredPhrases: 4, afterLessonId: 1 },
      ),
      buildTask(
        planId,
        dayIndex,
        'plan_quiz',
        'extra',
        'Квиз дня',
        'Проверь фразы дня и часть старых фраз.',
        4,
        [20],
        { type: 'quiz', quizId: `${planId}_day_${dayIndex}_quiz`, questionCount: 10, level: quizLevel },
      ),
    ],
  };
}

const DAILY_TASK_TAIL_ORDER: PlanTaskKind[][] = [
  [
    'plan_missing_word',
    'plan_choose_natural_phrase',
    'plan_listen_choose',
    'plan_listen_build',
    'plan_pronunciation_repeat',
    'plan_phrase_recall',
    'plan_quiz',
  ],
  [
    'plan_choose_natural_phrase',
    'plan_missing_word',
    'plan_phrase_recall',
    'plan_listen_choose',
    'plan_listen_build',
    'plan_pronunciation_repeat',
    'plan_quiz',
  ],
  [
    'plan_listen_choose',
    'plan_missing_word',
    'plan_listen_build',
    'plan_choose_natural_phrase',
    'plan_pronunciation_repeat',
    'plan_phrase_recall',
    'plan_quiz',
  ],
  [
    'plan_missing_word',
    'plan_pronunciation_repeat',
    'plan_choose_natural_phrase',
    'plan_listen_build',
    'plan_phrase_recall',
    'plan_listen_choose',
    'plan_quiz',
  ],
  [
    'plan_choose_natural_phrase',
    'plan_listen_build',
    'plan_missing_word',
    'plan_listen_choose',
    'plan_quiz',
    'plan_pronunciation_repeat',
    'plan_phrase_recall',
  ],
  [
    'plan_listen_build',
    'plan_phrase_recall',
    'plan_choose_natural_phrase',
    'plan_missing_word',
    'plan_listen_choose',
    'plan_pronunciation_repeat',
    'plan_quiz',
  ],
  [
    'plan_phrase_recall',
    'plan_quiz',
    'plan_missing_word',
    'plan_choose_natural_phrase',
    'plan_listen_choose',
    'plan_listen_build',
    'plan_pronunciation_repeat',
  ],
];

function orderPlanNativeTasksForDay(tasks: PlanDailyTask[], dayIndex: number): PlanDailyTask[] {
  const introTask = tasks.find((task) => task.kind === 'plan_phrase_lesson');
  if (!introTask) return tasks;

  const tailOrder = DAILY_TASK_TAIL_ORDER[(Math.max(1, dayIndex) - 1) % DAILY_TASK_TAIL_ORDER.length];
  const tailRank = new Map(tailOrder.map((kind, index) => [kind, index]));
  const tail = tasks
    .filter((task) => task !== introTask)
    .sort((a, b) => (tailRank.get(a.kind) ?? 99) - (tailRank.get(b.kind) ?? 99));

  return [introTask, ...tail];
}

function withoutLessonTasks(day: PlanDay): PlanDay {
  return {
    ...day,
    tasks: orderPlanNativeTasksForDay(
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
    bindAcceptedCandidateSource(planId, withoutLessonTasks(day))
  ) : [];
  for (let day = days.length + 1; day <= total; day += 1) {
    const topic = topics[(day - 2 + topics.length) % topics.length];
    days.push(withoutLessonTasks(makeGeneratedDay(planId, day, topic)));
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

export const PERSONAL_PLAN_CATALOG: PersonalPlanDefinition[] = [
  {
    id: 'voyazh',
    name: 'Вояж',
    goal: 'Уверенно объясняться в поездке.',
    horizonWeeks: 12,
    recommendedLevel: 'A2',
    minutesDefault: 15,
    accent: '#76B5FF',
    shortFocus: 'аэропорт, отель, кафе, транспорт, помощь',
    days: generateDays('voyazh', 12, voyazhTopics, [voyazhDay1, voyazhDay2, voyazhDay3]),
  },
  {
    id: 'mitap',
    name: 'Митап',
    goal: 'Понимать созвоны и отвечать коротко.',
    horizonWeeks: 16,
    recommendedLevel: 'A2 → B1',
    minutesDefault: 20,
    accent: '#A78BFA',
    shortFocus: 'standup, deadlines, blockers, emails',
    days: generateDays('mitap', 16, mitapTopics, [mitapDay1, mitapDay2]),
  },
  {
    id: 'gavan',
    name: 'Гавань',
    goal: 'Решать бытовые вопросы при переезде.',
    horizonWeeks: 18,
    recommendedLevel: 'A1 → A2',
    minutesDefault: 15,
    accent: '#62D889',
    shortFocus: 'документы, жильё, врач, банк, городские сервисы',
    days: generateDays('gavan', 18, gavanTopics, [gavanDay1Generated, gavanDay2Generated]),
  },
  {
    id: 'impuls',
    name: 'Импульс',
    goal: 'Говорить свободнее без ступора.',
    horizonWeeks: 20,
    recommendedLevel: 'A2 → B1',
    minutesDefault: 20,
    accent: '#FF9270',
    shortFocus: 'быстрые ответы, связки, recovery, speaking drills',
    days: generateDays('impuls', 20, impulsTopics, [impulsDay1Generated, impulsDay2Generated]),
  },
  {
    id: 'echo',
    name: 'Эхо',
    goal: 'Лучше понимать речь и отвечать сразу.',
    horizonWeeks: 12,
    recommendedLevel: 'A2',
    minutesDefault: 10,
    accent: '#5EEAD4',
    shortFocus: 'listening, short replies, reductions, reaction',
    days: generateDays('echo', 12, echoTopics, [echoDay1Generated, echoDay2Generated]),
  },
];

export function getPlanById(id: PersonalPlanId): PersonalPlanDefinition {
  return PERSONAL_PLAN_CATALOG.find((plan) => plan.id === id) ?? PERSONAL_PLAN_CATALOG[2];
}
