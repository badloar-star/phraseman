import type { QuizPhrase } from './quiz_data';
import type { Lang } from '../constants/i18n';
import { getPersonalPlanPhraseLesson } from './personal_plan_phrase_lessons';
import { stableShuffleAwayFromFirst } from './personal_plan_option_ordering';

export type PersonalPlanQuizInputMode = 'choice' | 'typing';

export type PersonalPlanQuizTaskCopy = {
  title: string;
  body: string;
};

export type PersonalPlanQuizSource =
  | { type: 'lesson_phrase'; id: string }
  | { type: 'plan_phrase'; lessonId: string; phraseId: string };

export type PersonalPlanQuizCoverage = Record<string, PersonalPlanQuizSource[]>;

function fillName(text: string, userName: string): string {
  return text.replace(/\{\{name\}\}/g, userName);
}

type QuizSourceLocaleCopy = NonNullable<QuizPhrase['sourceLocales']>[keyof NonNullable<QuizPhrase['sourceLocales']>];

function fillSourceLocaleCopy(copy: QuizSourceLocaleCopy | undefined, userName: string): QuizSourceLocaleCopy | undefined {
  if (!copy) return undefined;
  return {
    prompt: fillName(copy.prompt, userName),
    explanations: copy.explanations.map((text) => fillName(text, userName)),
  };
}

function q(
  id: string,
  ru: string,
  uk: string,
  choices: string[],
  correct: number,
  explanations: string[],
  es?: string,
): QuizPhrase {
  const answer = choices[correct] ?? choices[0] ?? '';
  return {
    questionId: id,
    ru,
    uk,
    es: es ?? ru,
    sourceLocales: {
      'pt-BR': { prompt: es ?? ru, explanations },
      vi: { prompt: es ?? ru, explanations },
      id: { prompt: es ?? ru, explanations },
      tr: { prompt: es ?? ru, explanations },
      pl: { prompt: es ?? ru, explanations },
    },
    choices,
    correct,
    answer,
    explanations,
    explanationsUK: explanations,
    explanationsES: explanations,
    lessonNum: 1,
    level: 'A1',
    skillTag: 'personal_plan_day_quiz',
    quizItemType: 'personal_plan',
  };
}

const planQuizChoiceCopy: PersonalPlanQuizTaskCopy = {
  title: 'Проверка дня',
  body:
    'Выбери фразу, которая лучше всего передает смысл. Варианты похожи, но правильный только один.',
};

const planQuizTypingCopy: PersonalPlanQuizTaskCopy = {
  title: 'Собери ответ',
  body:
    'Вспомни короткую фразу дня и введи ее без подсказок. Проверяем спокойный ответ, а не скорость ради скорости.',
};

const planQuizChoiceCopyUk: PersonalPlanQuizTaskCopy = {
  title: 'Перевірка дня',
  body: 'Обери фразу, яка найкраще передає зміст. Варіанти схожі, але правильний лише один.',
};

const planQuizTypingCopyUk: PersonalPlanQuizTaskCopy = {
  title: 'Збери відповідь',
  body: 'Згадай коротку фразу дня та введи її без підказок.',
};

const planQuizChoiceCopyEs: PersonalPlanQuizTaskCopy = {
  title: 'Prueba del día',
  body: 'Elige la frase que mejor exprese el significado. Las opciones son similares, pero solo una es correcta.',
};

const planQuizTypingCopyEs: PersonalPlanQuizTaskCopy = {
  title: 'Construye la respuesta',
  body: 'Recuerda la frase corta del día e introdúcela sin pistas.',
};

function buildPlanQuizCopyByLocale(
  ru: Record<PersonalPlanQuizInputMode, PersonalPlanQuizTaskCopy>,
  uk: Record<PersonalPlanQuizInputMode, PersonalPlanQuizTaskCopy>,
  es: Record<PersonalPlanQuizInputMode, PersonalPlanQuizTaskCopy>,
): Record<Lang, Record<PersonalPlanQuizInputMode, PersonalPlanQuizTaskCopy>> {
  return {
    ru,
    uk,
    es,
    'pt-BR': ru,
    vi: ru,
    id: ru,
    tr: ru,
    pl: ru,
  };
}

const PLAN_QUIZZES: Record<string, QuizPhrase[]> = {
  gavan_day1_short_replies_quiz: [
    q('gavan_d1_q1', 'Я здесь.', 'Я тут.', ["I'm here.", "I'm okay.", "It's here.", "You're here."], 0, [
      "Да: I'm here. Так коротко говорят, что ты уже на месте.",
      "I'm okay - про состояние: со мной все нормально.",
      "It's here - обычно про вещь или место, не про человека.",
      "You're here - про собеседника: ты здесь.",
    ]),
    q('gavan_d1_q2', 'Со мной все нормально.', 'Зі мною все нормально.', ["I'm okay.", "It's okay.", "You're okay.", "I'm here."], 0, [
      "Да: I'm okay. Это спокойное 'со мной все нормально'.",
      "It's okay - про ситуацию: все нормально.",
      "You're okay - про другого человека.",
      "I'm here - про место: я здесь.",
    ]),
    q('gavan_d1_q3', 'Все нормально.', 'Все нормально.', ["It's okay.", "I'm okay.", "It's not clear.", "You're right."], 0, [
      "Да: It's okay. Так коротко говорят, что ситуация нормальная.",
      "I'm okay - про человека: со мной все нормально.",
      "It's not clear - наоборот: пока непонятно.",
      "You're right - согласие с человеком, а не оценка ситуации.",
    ]),
    q('gavan_d1_q4', 'Пока непонятно.', 'Поки незрозуміло.', ["It's not clear.", "It's okay.", "I'm okay.", "You're right."], 0, [
      "Да: It's not clear. Вежливо и просто: пока неясно.",
      "It's okay - значит, что все нормально.",
      "I'm okay - про состояние человека.",
      "You're right - значит 'вы правы'.",
    ]),
    q('gavan_d1_q5', 'Вы правы.', 'Ви маєте рацію.', ["You're right.", "I'm right.", "It's right.", "We're right."], 0, [
      "Да: You're right. Это короткое согласие с собеседником.",
      "I'm right - 'я прав', уже про себя.",
      "It's right - чаще про ответ или вещь.",
      "We're right - 'мы правы', другая роль.",
    ]),
    q('gavan_d1_q6', 'Скажи, что ты уже на месте.', 'Скажи, що ти вже на місці.', ["I'm here.", "I'm okay.", "It's okay.", "It's not clear."], 0, [
      "Да: I'm here. Коротко и понятно: ты уже на месте.",
      "I'm okay - про состояние, а не про место.",
      "It's okay - про ситуацию, а не про твое присутствие.",
      "It's not clear - про непонимание.",
    ]),
    q('gavan_d1_q7', 'Скажи, что ситуация нормальная.', 'Скажи, що ситуація нормальна.', ["It's okay.", "I'm okay.", "You're right.", "I'm here."], 0, [
      "Да: It's okay. Это про ситуацию: все нормально.",
      "I'm okay - про тебя, не про ситуацию.",
      "You're right - согласие с человеком.",
      "I'm here - про место.",
    ]),
    q('gavan_d1_q8', 'Скажи, что мысль пока неясна.', 'Скажи, що думка поки неясна.', ["It's not clear.", "You're right.", "It's okay.", "I'm okay."], 0, [
      "Да: It's not clear. Так можно спокойно сказать, что пока непонятно.",
      "You're right - согласие, не просьба о ясности.",
      "It's okay - значит, что все нормально.",
      "I'm okay - про состояние человека.",
    ]),
    q('gavan_d1_q9', 'Согласись коротко.', 'Погодься коротко.', ["You're right.", "It's not clear.", "I'm here.", "I'm okay."], 0, [
      "Да: You're right. Это короткое и нормальное согласие.",
      "It's not clear - значит, что непонятно.",
      "I'm here - значит, что ты на месте.",
      "I'm okay - значит, что с тобой все нормально.",
    ]),
    q('gavan_d1_q10', 'Ответь спокойно, что с тобой все нормально.', 'Відповідай спокійно, що з тобою все нормально.', ["I'm okay.", "It's okay.", "You're right.", "It's not clear."], 0, [
      "Да: I'm okay. Это ровно про твое состояние.",
      "It's okay - про ситуацию, не про тебя.",
      "You're right - согласие с собеседником.",
      "It's not clear - значит, что пока непонятно.",
    ]),
  ],
};

const PLAN_QUIZ_COVERAGE: Record<string, PersonalPlanQuizCoverage> = {
  gavan_day1_short_replies_quiz: {
    gavan_d1_q1: [{ type: 'plan_phrase', lessonId: 'gavan_day1_short_replies', phraseId: 'gavan_d1_phrase_1' }],
    gavan_d1_q2: [{ type: 'plan_phrase', lessonId: 'gavan_day1_short_replies', phraseId: 'gavan_d1_phrase_2' }],
    gavan_d1_q3: [{ type: 'plan_phrase', lessonId: 'gavan_day1_short_replies', phraseId: 'gavan_d1_phrase_3' }],
    gavan_d1_q4: [{ type: 'plan_phrase', lessonId: 'gavan_day1_short_replies', phraseId: 'gavan_d1_phrase_4' }],
    gavan_d1_q5: [{ type: 'plan_phrase', lessonId: 'gavan_day1_short_replies', phraseId: 'gavan_d1_phrase_5' }],
    gavan_d1_q6: [{ type: 'plan_phrase', lessonId: 'gavan_day1_short_replies', phraseId: 'gavan_d1_phrase_1' }],
    gavan_d1_q7: [{ type: 'plan_phrase', lessonId: 'gavan_day1_short_replies', phraseId: 'gavan_d1_phrase_3' }],
    gavan_d1_q8: [{ type: 'plan_phrase', lessonId: 'gavan_day1_short_replies', phraseId: 'gavan_d1_phrase_4' }],
    gavan_d1_q9: [{ type: 'plan_phrase', lessonId: 'gavan_day1_short_replies', phraseId: 'gavan_d1_phrase_5' }],
    gavan_d1_q10: [{ type: 'plan_phrase', lessonId: 'gavan_day1_short_replies', phraseId: 'gavan_d1_phrase_2' }],
  },
};

const PLAN_QUIZ_TASK_COPY: Record<string, Record<Lang, Record<PersonalPlanQuizInputMode, PersonalPlanQuizTaskCopy>>> = {
  gavan_day1_short_replies_quiz: buildPlanQuizCopyByLocale(
    { choice: planQuizChoiceCopy, typing: planQuizTypingCopy },
    { choice: planQuizChoiceCopyUk, typing: planQuizTypingCopyUk },
    { choice: planQuizChoiceCopyEs, typing: planQuizTypingCopyEs },
  ),
};

const GENERATED_PLAN_QUIZ_RE = /^(voyazh|mitap|gavan|impuls|echo)_day_(\d+)_quiz$/;

function generatedQuizLessonId(quizId: string): string | null {
  const match = GENERATED_PLAN_QUIZ_RE.exec(quizId);
  if (!match) return null;
  return `${match[1]}_d${String(Number(match[2])).padStart(3, '0')}_content_unit`;
}

function generatedQuizChoices(allAnswers: string[], correctAnswer: string, seed: string): string[] {
  const distractors = allAnswers.filter((answer) => answer !== correctAnswer);
  return stableShuffleAwayFromFirst(
    [correctAnswer, ...distractors].slice(0, 4),
    seed,
    (option) => option === correctAnswer,
  );
}

function generatedQuizExplanation(choice: string, correctAnswer: string, promptRu: string, choiceIndex: number): string {
  const correctOpeners = ['Бинго.', 'Да, попали в смысл.', 'Точно.', 'Вот это живой вариант.'];
  const wrongOpeners = ['Ой, ловушка.', 'Похоже, но мимо.', 'Хитрый момент.', 'Не ведемся на знакомые слова.'];

  if (choice === correctAnswer) {
    const opener = correctOpeners[choiceIndex % correctOpeners.length];
    return `${opener} ${choice} закрывает смысл «${promptRu}»: коротко, спокойно и без лишней тяжести.`;
  }

  const opener = wrongOpeners[choiceIndex % wrongOpeners.length];
  return `${opener} ${choice} может быть полезной фразой, но здесь уводит в другую ситуацию. В этом вопросе держим весь русский смысл целиком: «${promptRu}».`;
}

function buildGeneratedQuiz(quizId: string): QuizPhrase[] | null {
  const lessonId = generatedQuizLessonId(quizId);
  if (!lessonId) return null;
  const lesson = getPersonalPlanPhraseLesson(lessonId);
  if (!lesson || lesson.phrases.length < 4) return null;

  const allAnswers = lesson.phrases.map((phrase) => phrase.english);
  return Array.from({ length: 10 }, (_, index) => {
    const phrase = lesson.phrases[index % lesson.phrases.length];
    const choices = generatedQuizChoices(allAnswers, phrase.english, `${quizId}:q${index + 1}`);
    const correct = choices.findIndex((choice) => choice === phrase.english);
    return q(
      `${quizId}_q${index + 1}`,
      phrase.russian,
      phrase.ukrainian,
      choices,
      correct >= 0 ? correct : 0,
      choices.map((choice, choiceIndex) =>
        generatedQuizExplanation(choice, phrase.english, phrase.russian, choiceIndex),
      ),
    );
  });
}

function buildGeneratedQuizCoverage(quizId: string): PersonalPlanQuizCoverage | null {
  const lessonId = generatedQuizLessonId(quizId);
  if (!lessonId) return null;
  const lesson = getPersonalPlanPhraseLesson(lessonId);
  if (!lesson) return null;

  return Object.fromEntries(Array.from({ length: 10 }, (_, index) => {
    const phrase = lesson.phrases[index % lesson.phrases.length];
    return [
      `${quizId}_q${index + 1}`,
      [{ type: 'plan_phrase' as const, lessonId: lesson.id, phraseId: String(phrase.id) }],
    ];
  }));
}

export function getPersonalPlanQuizTaskCopy(
  quizId: string | string[] | undefined,
  lang: Lang,
  inputMode: PersonalPlanQuizInputMode,
): PersonalPlanQuizTaskCopy | null {
  const id = Array.isArray(quizId) ? quizId[0] : quizId;
  if (!id) return null;
  if (id === 'gavan_day1_identity' || id === 'gavan_day2_address') return null;
  const copy = PLAN_QUIZ_TASK_COPY[id];
  if (!copy) return generatedQuizLessonId(id) ? planQuizChoiceCopy : null;
  return copy[lang]?.[inputMode] ?? copy.ru[inputMode];
}

export function getPersonalPlanQuizCoverage(quizId: string | string[] | undefined): PersonalPlanQuizCoverage | null {
  const id = Array.isArray(quizId) ? quizId[0] : quizId;
  if (!id) return null;
  if (id === 'gavan_day1_identity' || id === 'gavan_day2_address') return null;
  return PLAN_QUIZ_COVERAGE[id] ?? buildGeneratedQuizCoverage(id);
}

export function getPersonalPlanQuizPhrases(quizId: string | string[] | undefined, userName: string): QuizPhrase[] | null {
  const id = Array.isArray(quizId) ? quizId[0] : quizId;
  if (!id) return null;
  if (id === 'gavan_day1_identity' || id === 'gavan_day2_address') return null;
  const safeName = userName.trim().replace(/\s+/g, ' ') || 'Phraseman';
  const quiz = PLAN_QUIZZES[id] ?? buildGeneratedQuiz(id);
  if (!quiz) return null;
  return quiz.map((item) => ({
    ...item,
    ru: fillName(item.ru, safeName),
    uk: fillName(item.uk, safeName),
    es: fillName(item.es, safeName),
    sourceLocales: {
      es: fillSourceLocaleCopy(item.sourceLocales?.es, safeName),
      'pt-BR': fillSourceLocaleCopy(item.sourceLocales?.['pt-BR'], safeName),
      vi: fillSourceLocaleCopy(item.sourceLocales?.vi, safeName),
      id: fillSourceLocaleCopy(item.sourceLocales?.id, safeName),
      tr: fillSourceLocaleCopy(item.sourceLocales?.tr, safeName),
      pl: fillSourceLocaleCopy(item.sourceLocales?.pl, safeName),
    },
    choices: item.choices.map((choice) => fillName(choice, safeName)),
    answer: fillName(item.answer, safeName),
    explanations: item.explanations.map((text) => fillName(text, safeName)),
    explanationsUK: item.explanationsUK.map((text) => fillName(text, safeName)),
    explanationsES: item.explanationsES.map((text) => fillName(text, safeName)),
  }));
}
