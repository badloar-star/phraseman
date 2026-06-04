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

const MINUTES_BY_SLOT: Record<PlanMinutesChoice, number> = {
  5: 1,
  10: 2,
  15: 3,
  20: 4,
};

export function normalizePlanMinutes(value: number | string | null | undefined): PlanMinutesChoice {
  const raw = typeof value === 'string' ? parseInt(value, 10) : value;
  if (raw === 5 || raw === 10 || raw === 15) return raw;
  return 20;
}

export function tasksForMinutes(day: PlanDay, minutes: PlanMinutesChoice): PlanDailyTask[] {
  const max = MINUTES_BY_SLOT[minutes];
  return day.tasks.filter((task) => task.requiredFor.includes(minutes)).slice(0, max);
}

function taskId(planId: PersonalPlanId, day: number, suffix: string): string {
  return `${planId}_d${String(day).padStart(3, '0')}_${suffix}`;
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
    status: 'scaffold',
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
        isReviewDay ? 'active_recall' : 'linked_lesson_slice',
        'main',
        isReviewDay ? 'Вернуть фразы недели' : `Фразы по теме: ${topic}`,
        isReviewDay
          ? 'Коротко проверим, какие фразы уже вспоминаются легко, а какие стоит подержать рядом ещё пару дней.'
          : `${lessonPhrases} фраз из урока: берём только то, что помогает с темой дня.`,
        isReviewDay ? 5 : 6,
        [5, 10, 15, 20],
        isReviewDay
          ? { type: 'recall', phraseIds: [`${planId}_week_${weekIndex}`] }
          : { type: 'lesson', lessonId: ((dayIndex - 1) % 32) + 1, requiredPhrases: lessonPhrases },
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
        'active_recall',
        'practice',
        'Повтор фраз дня',
        'Коротко вернём фразы, которые уже встречались. Если появятся личные ошибки, сюда встанет точечная тренировка.',
        4,
        [15, 20],
        { type: 'recall', phraseIds: [`${planId}_day_${Math.max(1, dayIndex - 1)}`] },
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

function generateDays(planId: PersonalPlanId, horizonWeeks: number, topics: string[], firstDays?: PlanDay | PlanDay[]): PlanDay[] {
  const total = horizonWeeks * 7;
  const days: PlanDay[] = firstDays ? (Array.isArray(firstDays) ? [...firstDays] : [firstDays]) : [];
  for (let day = days.length + 1; day <= total; day += 1) {
    const topic = topics[(day - 2 + topics.length) % topics.length];
    days.push(makeGeneratedDay(planId, day, topic));
  }
  return days;
}

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
      [15, 20],
      {
        type: 'plan_exercise',
        exerciseType: 'plan_missing_word',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: [
          'gavan_d1_phrase_1',
          'gavan_d1_phrase_2',
          'gavan_d1_phrase_3',
        ],
        requiredCorrect: 3,
      },
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
    days: generateDays('voyazh', 12, voyazhTopics),
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
    days: generateDays('mitap', 16, mitapTopics),
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
    days: generateDays('gavan', 18, gavanTopics, gavanDay1),
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
    days: generateDays('impuls', 20, impulsTopics),
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
    days: generateDays('echo', 12, echoTopics),
  },
];

export function getPlanById(id: PersonalPlanId): PersonalPlanDefinition {
  return PERSONAL_PLAN_CATALOG.find((plan) => plan.id === id) ?? PERSONAL_PLAN_CATALOG[2];
}
