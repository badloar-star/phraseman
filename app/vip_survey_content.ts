import type { Lang } from '../constants/i18n';

export const VIP_SURVEY_ID = 'vip_feedback_v2';
export const VIP_SURVEY_REWARD_DAYS = 30;

export type VipSurveyOption = {
  id: string;
  text: Record<Lang, string>;
};

export type VipSurveyQuestion = {
  id: string;
  title: Record<Lang, string>;
  options: VipSurveyOption[];
  textOnly?: boolean;
};

export type VipSurveyAnswer = {
  optionId?: string;
  comment?: string;
};

export type VipSurveyAnswers = Record<string, VipSurveyAnswer>;

function loc(ru: string, uk: string, es: string): Record<Lang, string> {
  return {
    ru,
    uk,
    es,
    'pt-BR': es,
    vi: es,
    id: es,
    tr: es,
    pl: es,
  };
}

export const VIP_SURVEY_QUESTIONS: VipSurveyQuestion[] = [
  {
    id: 'most_useful',
    title: loc(
      'Что в приложении помогает учиться лучше всего?',
      'Що в застосунку допомагає вчитися найкраще?',
      'What in the app helps you learn best?',
    ),
    options: [
      { id: 'lessons', text: loc('Уроки', 'Уроки', 'Lessons') },
      { id: 'quizzes', text: loc('Вызовы', 'Виклики', 'Quizzes') },
      { id: 'flashcards', text: loc('Карточки', 'Картки', 'Flashcards') },
      { id: 'nothing_yet', text: loc('Пока ничего', 'Поки нічого', 'Nothing yet') },
    ],
  },
  {
    id: 'linger_screen',
    title: loc(
      'Где хочется задержаться подольше?',
      'Де хочеться затриматися довше?',
      'Where do you want to spend more time?',
    ),
    options: [
      { id: 'lessons', text: loc('Уроки', 'Уроки', 'Lessons') },
      { id: 'quizzes', text: loc('Вызовы', 'Виклики', 'Quizzes') },
      { id: 'flashcards', text: loc('Карточки', 'Картки', 'Flashcards') },
      { id: 'mistake_practice', text: loc('Отработка ошибок', 'Відпрацювання помилок', 'Mistake practice') },
    ],
  },
  {
    id: 'less_interesting',
    title: loc(
      'Когда становится менее интересно?',
      'Коли стає менш цікаво?',
      'When does learning become less interesting?',
    ),
    options: [
      { id: 'too_easy', text: loc('Слишком легко', 'Занадто легко', 'Too easy') },
      { id: 'too_hard', text: loc('Слишком сложно', 'Занадто складно', 'Too hard') },
      { id: 'unclear_mistakes', text: loc('Непонятны ошибки', 'Незрозумілі помилки', 'Mistakes are unclear') },
      { id: 'too_much_text', text: loc('Много текста', 'Багато тексту', 'Too much text') },
      { id: 'no_progress', text: loc('Не вижу прогресс', 'Не бачу прогрес', 'I do not see progress') },
      { id: 'never', text: loc('Не бывает', 'Не буває', 'It does not happen') },
    ],
  },
  {
    id: 'first_time_confusing',
    title: loc(
      'Что непонятно с первого раза?',
      'Що незрозуміло з першого разу?',
      'What is unclear at first?',
    ),
    options: [
      { id: 'what_next', text: loc('Что делать дальше', 'Що робити далі', 'What to do next') },
      { id: 'lessons', text: loc('Уроки', 'Уроки', 'Lessons') },
      { id: 'quizzes', text: loc('Вызовы', 'Виклики', 'Quizzes') },
      { id: 'flashcards', text: loc('Карточки', 'Картки', 'Flashcards') },
      { id: 'mistakes', text: loc('Ошибки', 'Помилки', 'Mistakes') },
      { id: 'all_clear', text: loc('Всё понятно', 'Усе зрозуміло', 'Everything is clear') },
    ],
  },
  {
    id: 'expected_missing',
    title: loc(
      'Что вы ожидали увидеть в приложении, но не нашли?',
      'Що ви очікували побачити в застосунку, але не знайшли?',
      'What did you expect to see in the app but did not find?',
    ),
    options: [
      { id: 'more_explanations', text: loc('Больше объяснений', 'Більше пояснень', 'More explanations') },
      { id: 'more_examples', text: loc('Больше примеров', 'Більше прикладів', 'More examples') },
      { id: 'more_topics', text: loc('Больше тем', 'Більше тем', 'More topics') },
      { id: 'more_practice', text: loc('Больше практики', 'Більше практики', 'More practice') },
      { id: 'more_stats', text: loc('Больше статистики', 'Більше статистики', 'More stats') },
      { id: 'learning_plan', text: loc('План обучения', 'План навчання', 'Learning plan') },
      { id: 'found_all', text: loc('Всё нашёл(ла)', 'Усе знайшов(ла)', 'I found everything') },
    ],
  },
  {
    id: 'overloaded_screen',
    title: loc(
      'Какой экран перегружен?',
      'Який екран перевантажений?',
      'Which screen feels overloaded?',
    ),
    options: [
      { id: 'home', text: loc('Главная', 'Головна', 'Home') },
      { id: 'lessons', text: loc('Уроки', 'Уроки', 'Lessons') },
      { id: 'quizzes', text: loc('Вызовы', 'Виклики', 'Quizzes') },
      { id: 'flashcards', text: loc('Карточки', 'Картки', 'Flashcards') },
      { id: 'leagues', text: loc('Лиги', 'Ліги', 'Leagues') },
      { id: 'profile', text: loc('Профиль', 'Профіль', 'Profile') },
      { id: 'none', text: loc('Нет такого', 'Немає такого', 'None') },
    ],
  },
  {
    id: 'one_thing_week',
    title: loc(
      'Что бы вы улучшили прямо на этой неделе?',
      'Що б ви покращили прямо цього тижня?',
      'What would you improve this week?',
    ),
    options: [],
    textOnly: true,
  },
  {
    id: 'feature_request',
    title: loc(
      'Какую функцию добавить?',
      'Яку функцію додати?',
      'What feature should we add?',
    ),
    options: [],
    textOnly: true,
  },
  {
    id: 'friend_recommendation',
    title: loc(
      'Если бы вы рекомендовали приложение другу, что бы вы ему рассказали о приложении?',
      'Якби ви рекомендували застосунок другу, що б ви йому розповіли про застосунок?',
      'If you recommended the app to a friend, what would you tell them about it?',
    ),
    options: [],
    textOnly: true,
  },
];

export function pickVipSurveyText(row: Record<Lang, string>, lang: Lang): string {
  return row[lang] || row.ru;
}

export function getVipSurveyQuestion(questionId: string): VipSurveyQuestion | null {
  return VIP_SURVEY_QUESTIONS.find((question) => question.id === questionId) ?? null;
}

export function getVipSurveyOptionLabel(questionId: string, optionId: string, lang: Lang): string {
  const question = getVipSurveyQuestion(questionId);
  const option = question?.options.find((row) => row.id === optionId);
  return option ? pickVipSurveyText(option.text, lang) : optionId;
}

export function normalizeVipSurveyAnswers(value: unknown): VipSurveyAnswers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const out: VipSurveyAnswers = {};
  for (const question of VIP_SURVEY_QUESTIONS) {
    const row = raw[question.id];
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const data = row as Record<string, unknown>;
    const comment = String(data.comment ?? '').trim().slice(0, 500);
    if (question.textOnly) {
      if (!comment) continue;
      out[question.id] = { optionId: 'comment', comment };
      continue;
    }
    const optionId = String(data.optionId ?? '').trim();
    if (!question.options.some((option) => option.id === optionId)) continue;
    out[question.id] = comment ? { optionId, comment } : { optionId };
  }
  return out;
}

export function isVipSurveyComplete(answers: VipSurveyAnswers): boolean {
  return VIP_SURVEY_QUESTIONS.every((question) => {
    if (question.textOnly) return Boolean(answers[question.id]?.comment?.trim());
    const optionId = answers[question.id]?.optionId;
    return question.options.some((option) => option.id === optionId);
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
