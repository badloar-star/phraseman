import { hashCanonicalBody } from "../policies/decision_registry";
import { LEARNING_V2_COURSE_LESSON_COUNT_V1 } from "./course_topology_v1";

/**
 * Курс-план: 32 урока, описанных КОММУНИКАТИВНЫМИ результатами.
 *
 * зачем: старый курс (`constants/lessons.ts`) назван грамматическими темами —
 * «Present Simple: Отрицание», «Герундий», «Passive Voice». Reference v3
 * прямо называет такое слабой целью (CEFR-Q1: «изучить Present Simple» —
 * пример того, как НЕ надо) и требует наблюдаемого действия: понять, спросить,
 * ответить, описать, договориться.
 *
 * Это же — первое конкретное отличие от Duolingo: там путь тоже нарезан по
 * грамматическим юнитам, и ученик «проходит» их, не умея ничего сказать.
 * Здесь грамматика — средство внутри урока, а заголовок урока отвечает на
 * вопрос «что я теперь смогу сделать».
 *
 * Модуль описывает СТРУКТУРУ и ЦЕЛИ. Сами фразы и задания живут отдельно и
 * проходят собственные гейты качества.
 */
export const LEARNING_V2_COURSE_PLAN_SCHEMA_V1 =
  "learning-v2-course-plan.v1" as const;

/** CEFR-полосы, в которых движется курс: от полного нуля к уверенному A2+/B1. */
export type LearningV2CefrBandV1 = "pre-A1" | "A1" | "A1+" | "A2" | "A2+" | "B1";

export type LearningV2LessonPlanV1 = Readonly<{
  lessonOrdinal: number;
  /**
   * Что ученик СМОЖЕТ ДЕЛАТЬ. Формулировка от первого лица и в действии —
   * её же видит владелец в модалке сессии.
   */
  canDo: string;
  /** Ситуация, в которой это действие реально нужно. */
  situation: string;
  /**
   * Компоненты цели — то, что должно быть введено, отработано, извлечено и
   * проверено. Именно они попадают в coverage matrix (S2).
   */
  objectiveComponents: readonly string[];
  /** Языковые средства. Грамматика здесь — инструмент, а не заголовок. */
  languageMeans: readonly string[];
  /** Уроки, без которых этот не имеет смысла (LESSON-Q5: нет скрытых требований). */
  prerequisiteLessons: readonly number[];
  cefrBand: LearningV2CefrBandV1;
}>;

/**
 * Порядок задан не «по сложности грамматики», а по тому, что человек может
 * применить в жизни раньше всего. Первые уроки дают говорить о себе и
 * спрашивать о собеседнике — это то, с чего начинается любой разговор.
 */
export const LEARNING_V2_COURSE_PLAN_V1: readonly LearningV2LessonPlanV1[] =
  Object.freeze([
    {
      lessonOrdinal: 1,
      canDo: "Представиться и сказать, кто я и откуда",
      situation: "Первая встреча: знакомство в поездке, на работе, в чате",
      objectiveComponents: ["представиться", "назвать страну и город", "спросить имя собеседника"],
      languageMeans: ["I am / I'm", "my name is", "I'm from", "What's your name?"],
      prerequisiteLessons: [],
      cefrBand: "pre-A1",
    },
    {
      lessonOrdinal: 2,
      canDo: "Спросить о человеке и коротко ответить на такой же вопрос",
      situation: "Разговор продолжается: собеседник спрашивает в ответ",
      objectiveComponents: ["задать вопрос с are you", "ответить да/нет", "переспросить вежливо"],
      languageMeans: ["Are you…?", "Yes, I am / No, I'm not", "And you?", "Sorry?"],
      prerequisiteLessons: [1],
      cefrBand: "pre-A1",
    },
    {
      lessonOrdinal: 3,
      canDo: "Рассказать о своей работе и о том, чем занимаюсь каждый день",
      situation: "Small talk: чем вы занимаетесь",
      objectiveComponents: ["назвать профессию", "описать регулярное действие", "указать время дня"],
      languageMeans: ["I work / I live", "every day", "in the morning", "a / an"],
      prerequisiteLessons: [1, 2],
      cefrBand: "A1",
    },
    {
      lessonOrdinal: 4,
      canDo: "Сказать, чего я не делаю и что мне не подходит",
      situation: "Отказ и уточнение: «нет, я этим не занимаюсь»",
      objectiveComponents: ["отрицать действие", "вежливо отказаться", "предложить альтернативу"],
      languageMeans: ["I don't", "he doesn't", "not really", "but I can"],
      prerequisiteLessons: [3],
      cefrBand: "A1",
    },
    {
      lessonOrdinal: 5,
      canDo: "Спросить человека о его привычках и работе",
      situation: "Поддержать разговор: задать встречный вопрос",
      objectiveComponents: ["построить вопрос с do/does", "уточнить частоту", "отреагировать на ответ"],
      languageMeans: ["Do you…?", "Does he…?", "How often…?", "Really?"],
      prerequisiteLessons: [3, 4],
      cefrBand: "A1",
    },
    {
      lessonOrdinal: 6,
      canDo: "Узнать нужную информацию: где, когда, сколько, почему",
      situation: "Вокзал, отель, магазин: получить конкретный ответ",
      objectiveComponents: ["спросить место", "спросить время", "спросить цену", "спросить причину"],
      languageMeans: ["Where / When / How much / Why", "Excuse me", "Could you tell me…?"],
      prerequisiteLessons: [5],
      cefrBand: "A1",
    },
    {
      lessonOrdinal: 7,
      canDo: "Сказать, что у меня есть и чего не хватает",
      situation: "Заселение, аптека, магазин: объяснить свою ситуацию",
      objectiveComponents: ["сообщить о наличии", "сообщить о нехватке", "попросить недостающее"],
      languageMeans: ["I have / I don't have", "Do you have…?", "I need"],
      prerequisiteLessons: [5],
      cefrBand: "A1",
    },
    {
      lessonOrdinal: 8,
      canDo: "Договориться о встрече и назвать время",
      situation: "Планы: «во сколько встречаемся»",
      objectiveComponents: ["назвать время", "назвать день", "предложить время", "согласиться"],
      languageMeans: ["at / on / in", "half past", "Let's meet", "That works"],
      prerequisiteLessons: [6],
      cefrBand: "A1",
    },
    {
      lessonOrdinal: 9,
      canDo: "Описать место: что там есть и чего нет",
      situation: "Отель, квартира, район: объяснить, что вокруг",
      objectiveComponents: ["перечислить объекты", "сказать об отсутствии", "спросить о наличии"],
      languageMeans: ["There is / There are", "There isn't", "Is there…?"],
      prerequisiteLessons: [7],
      cefrBand: "A1",
    },
    {
      lessonOrdinal: 10,
      canDo: "Попросить о помощи и предложить помощь",
      situation: "Нужна помощь или её просят у меня",
      objectiveComponents: ["попросить вежливо", "предложить помощь", "сказать о возможности"],
      languageMeans: ["Can you…?", "Could you…?", "I can help", "May I…?"],
      prerequisiteLessons: [7],
      cefrBand: "A1+",
    },
    {
      lessonOrdinal: 11,
      canDo: "Рассказать, что я делал вчера и на выходных",
      situation: "«Как прошли выходные?» — обычный вопрос коллеги",
      objectiveComponents: ["назвать прошедшее действие", "указать когда", "выстроить порядок событий"],
      languageMeans: ["-ed формы", "yesterday / last week", "then / after that"],
      prerequisiteLessons: [3, 8],
      cefrBand: "A1+",
    },
    {
      lessonOrdinal: 12,
      canDo: "Рассказать историю с самыми частыми глаголами прошлого",
      situation: "Поделиться случаем: что произошло",
      objectiveComponents: ["использовать частые неправильные глаголы", "связать события", "удержать интерес"],
      languageMeans: ["went / saw / had / said / took", "and then", "suddenly"],
      prerequisiteLessons: [11],
      cefrBand: "A1+",
    },
    {
      lessonOrdinal: 13,
      canDo: "Сказать о планах и о том, что решил прямо сейчас",
      situation: "Договорённости на будущее, спонтанные решения",
      objectiveComponents: ["сообщить план", "принять решение вслух", "предложить встречу"],
      languageMeans: ["I will", "I'm going to", "Shall we…?"],
      prerequisiteLessons: [8],
      cefrBand: "A2",
    },
    {
      lessonOrdinal: 14,
      canDo: "Сравнить варианты и объяснить свой выбор",
      situation: "Покупка, выбор отеля, обсуждение вариантов",
      objectiveComponents: ["сравнить два объекта", "назвать лучший", "обосновать выбор"],
      languageMeans: ["cheaper / better", "the best", "because", "than"],
      prerequisiteLessons: [9],
      cefrBand: "A2",
    },
    {
      lessonOrdinal: 15,
      canDo: "Сказать, чьё это, и разобраться с принадлежностью",
      situation: "Багаж, места, вещи: «это моё / это его»",
      objectiveComponents: ["указать принадлежность", "спросить чьё", "уточнить"],
      languageMeans: ["my / his / their", "mine / yours", "Whose…?", "'s"],
      prerequisiteLessons: [7],
      cefrBand: "A2",
    },
    {
      lessonOrdinal: 16,
      canDo: "Понять и использовать частые фразовые глаголы в быту",
      situation: "Живая речь, где обычный глагол меняет смысл с предлогом",
      objectiveComponents: ["узнать значение в контексте", "применить в своей фразе", "не путать похожие"],
      languageMeans: ["get up / turn on / look for / find out"],
      prerequisiteLessons: [12],
      cefrBand: "A2",
    },
    {
      lessonOrdinal: 17,
      canDo: "Сказать, что происходит прямо сейчас",
      situation: "Звонок, переписка: «я сейчас еду»",
      objectiveComponents: ["описать текущее действие", "отличить от привычного", "спросить о текущем"],
      languageMeans: ["I'm doing", "right now", "at the moment", "What are you doing?"],
      prerequisiteLessons: [3],
      cefrBand: "A2",
    },
    {
      lessonOrdinal: 18,
      canDo: "Объяснить дорогу и дать понятную инструкцию",
      situation: "Показать путь, объяснить как пользоваться",
      objectiveComponents: ["дать указание", "запретить", "смягчить просьбу"],
      languageMeans: ["Go / Turn / Take", "Don't", "Please", "First… then…"],
      prerequisiteLessons: [10],
      cefrBand: "A2",
    },
    {
      lessonOrdinal: 19,
      canDo: "Сказать, где именно находится вещь или место",
      situation: "«Где мой чемодан?» — точный ответ",
      objectiveComponents: ["указать положение", "уточнить расстояние", "переспросить"],
      languageMeans: ["in / on / under / next to", "opposite", "near"],
      prerequisiteLessons: [9, 18],
      cefrBand: "A2",
    },
    {
      lessonOrdinal: 20,
      canDo: "Говорить о предметах так, чтобы звучать естественно",
      situation: "Речь без артиклей звучит как телеграмма",
      objectiveComponents: ["ввести новое", "сослаться на известное", "говорить об общем"],
      languageMeans: ["a / an", "the", "нулевой артикль"],
      prerequisiteLessons: [9],
      cefrBand: "A2",
    },
    {
      lessonOrdinal: 21,
      canDo: "Говорить о количестве, когда точное число неважно",
      situation: "«Есть кто-нибудь?», «ничего не осталось»",
      objectiveComponents: ["сказать о наличии кого-то", "сказать об отсутствии", "спросить"],
      languageMeans: ["some / any", "someone / anything", "nothing", "a few / a lot of"],
      prerequisiteLessons: [9],
      cefrBand: "A2",
    },
    {
      lessonOrdinal: 22,
      canDo: "Сказать, что я люблю делать и что умею",
      situation: "Разговор об увлечениях и опыте",
      objectiveComponents: ["назвать занятие", "выразить отношение", "спросить о вкусах"],
      languageMeans: ["like doing", "good at", "enjoy", "I'd like to"],
      prerequisiteLessons: [5],
      cefrBand: "A2+",
    },
    {
      lessonOrdinal: 23,
      canDo: "Сказать, что было сделано, не называя исполнителя",
      situation: "Объявления, инструкции, новости",
      objectiveComponents: ["сообщить о действии над объектом", "понять объявление", "уточнить кем"],
      languageMeans: ["is made", "was built", "by"],
      prerequisiteLessons: [12],
      cefrBand: "A2+",
    },
    {
      lessonOrdinal: 24,
      canDo: "Рассказать об опыте: что я уже делал в жизни",
      situation: "«Ты когда-нибудь был в…?»",
      objectiveComponents: ["сообщить об опыте", "сказать о недавнем", "спросить об опыте"],
      languageMeans: ["I have been", "already / yet", "Have you ever…?"],
      prerequisiteLessons: [12],
      cefrBand: "A2+",
    },
    {
      lessonOrdinal: 25,
      canDo: "Описать, что происходило в момент события",
      situation: "Рассказ о происшествии: фон и само событие",
      objectiveComponents: ["описать фон", "вставить событие", "связать по времени"],
      languageMeans: ["was doing", "when / while"],
      prerequisiteLessons: [12, 17],
      cefrBand: "A2+",
    },
    {
      lessonOrdinal: 26,
      canDo: "Обсудить условия: что будет, если",
      situation: "Планы с оговоркой, переговоры",
      objectiveComponents: ["поставить условие", "назвать следствие", "выразить нереальное"],
      languageMeans: ["If… will", "If… would", "unless"],
      prerequisiteLessons: [13],
      cefrBand: "B1",
    },
    {
      lessonOrdinal: 27,
      canDo: "Передать чужие слова",
      situation: "Пересказать, что сказал другой человек",
      objectiveComponents: ["передать утверждение", "передать вопрос", "передать просьбу"],
      languageMeans: ["He said that", "She asked if", "told me to"],
      prerequisiteLessons: [12],
      cefrBand: "B1",
    },
    {
      lessonOrdinal: 28,
      canDo: "Сказать, что человек делает что-то сам или для себя",
      situation: "Уточнение самостоятельности действия",
      objectiveComponents: ["указать на себя", "подчеркнуть самостоятельность", "взаимное действие"],
      languageMeans: ["myself / yourself", "by myself", "each other"],
      prerequisiteLessons: [15],
      cefrBand: "B1",
    },
    {
      lessonOrdinal: 29,
      canDo: "Рассказать, как было раньше и что изменилось",
      situation: "Воспоминания, сравнение прошлого и настоящего",
      objectiveComponents: ["описать прошлую привычку", "показать изменение", "сравнить с сегодня"],
      languageMeans: ["used to", "not anymore", "now I"],
      prerequisiteLessons: [11],
      cefrBand: "B1",
    },
    {
      lessonOrdinal: 30,
      canDo: "Объяснить, о каком именно человеке или предмете речь",
      situation: "Уточнение в разговоре: «тот, который…»",
      objectiveComponents: ["уточнить объект", "добавить деталь", "избежать повтора"],
      languageMeans: ["who / which / that", "where"],
      prerequisiteLessons: [20],
      cefrBand: "B1",
    },
    {
      lessonOrdinal: 31,
      canDo: "Сказать, чего я хочу от другого человека",
      situation: "Просьбы, ожидания, делегирование",
      objectiveComponents: ["выразить желание", "попросить действие", "смягчить требование"],
      languageMeans: ["I want you to", "I'd like you to", "ask someone to"],
      prerequisiteLessons: [22],
      cefrBand: "B1",
    },
    {
      lessonOrdinal: 32,
      canDo: "Свободно поддержать разговор на знакомые темы",
      situation: "Итог: реальный разговор без опоры на шпаргалку",
      objectiveComponents: ["начать разговор", "развить тему", "переспросить", "завершить вежливо"],
      languageMeans: ["всё изученное в связке"],
      prerequisiteLessons: [24, 26, 30],
      cefrBand: "B1",
    },
  ] as const);

export type LearningV2CoursePlanReportV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_PLAN_SCHEMA_V1;
  lessonCount: number;
  lessons: readonly LearningV2LessonPlanV1[];
  planFingerprint: string;
}>;

function fail(): never {
  throw new Error("learning_v2_course_plan_invalid");
}

/** Слова-маркеры темы вместо действия — CEFR-Q1 считает такую цель слабой. */
const WEAK_OUTCOME_PATTERNS: readonly RegExp[] = Object.freeze([
  /^изучить/iu,
  /^выучить/iu,
  /^тема[: ]/iu,
  /^познакомиться с (?:темой|грамматикой)/iu,
  /present simple|past simple|герундий|passive voice|present perfect/iu,
]);

export function buildLearningV2CoursePlanV1(): LearningV2CoursePlanReportV1 {
  const lessons = LEARNING_V2_COURSE_PLAN_V1;
  if (lessons.length !== LEARNING_V2_COURSE_LESSON_COUNT_V1) fail();

  const seen = new Set<number>();
  for (const lesson of lessons) {
    if (
      !Number.isSafeInteger(lesson.lessonOrdinal) ||
      lesson.lessonOrdinal < 1 ||
      lesson.lessonOrdinal > LEARNING_V2_COURSE_LESSON_COUNT_V1 ||
      seen.has(lesson.lessonOrdinal) ||
      lesson.canDo.length === 0 ||
      lesson.situation.length === 0 ||
      lesson.objectiveComponents.length === 0 ||
      lesson.languageMeans.length === 0
    )
      fail();
    seen.add(lesson.lessonOrdinal);

    // CEFR-Q1: заголовок урока обязан описывать действие, а не тему.
    if (WEAK_OUTCOME_PATTERNS.some((pattern) => pattern.test(lesson.canDo))) {
      fail();
    }

    // LESSON-Q5: нет скрытых требований — предпосылка идёт строго раньше.
    if (
      lesson.prerequisiteLessons.some(
        (prerequisite) => prerequisite >= lesson.lessonOrdinal,
      )
    )
      fail();
  }

  const body = {
    schemaVersion: LEARNING_V2_COURSE_PLAN_SCHEMA_V1,
    lessonCount: lessons.length,
    lessons,
  };
  return Object.freeze({
    ...body,
    planFingerprint: hashCanonicalBody(body),
  });
}
