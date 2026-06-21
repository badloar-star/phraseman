import { getPlanById, type PersonalPlanId, type PlanMinutesChoice } from './personal_plan_catalog';

/**
 * Канонический выбор плана по теме (Ф5 перестройки планов).
 *
 * 5 тем = 5 планов, один к одному. Тема полностью определяет план; уровень и
 * минуты настраивают темп, но не меняют сам план. И онбординг, и экран
 * настройки плана используют ЭТОТ резолвер — другой логики выбора нет.
 */

export type PersonalPlanSetupGoal = 'series' | 'everyday' | 'travel' | 'words' | 'mind';
export type PersonalPlanSetupLevel = 'a0' | 'a1' | 'a2' | 'b1';

export type PersonalPlanSetupChoice = {
  id: string;
  title: string;
  subtitle: string;
  icon: 'airplane-outline' | 'briefcase-outline' | 'home-outline' | 'school-outline' | 'leaf-outline' | 'book-outline' | 'chatbubble-ellipses-outline' | 'mic-outline' | 'map-outline' | 'flash-outline' | 'ear-outline';
};

export const PERSONAL_PLAN_SETUP_GOALS: (PersonalPlanSetupChoice & { id: PersonalPlanSetupGoal })[] = [
  { id: 'series', icon: 'ear-outline', title: 'Понимать кино и сериалы', subtitle: 'Живая речь на слух — без субтитров' },
  { id: 'everyday', icon: 'chatbubble-ellipses-outline', title: 'Говорить в обычной жизни', subtitle: 'Отвечать в разговоре без ступора' },
  { id: 'travel', icon: 'airplane-outline', title: 'Путешествовать', subtitle: 'Аэропорт, отель, кафе и дорога' },
  { id: 'words', icon: 'book-outline', title: 'Знать нужные слова', subtitle: 'Запас на каждый день — и сразу в речь' },
  { id: 'mind', icon: 'school-outline', title: 'Заниматься для себя', subtitle: 'Спокойный темп и польза для ума' },
];

export const PERSONAL_PLAN_SETUP_LEVELS: (PersonalPlanSetupChoice & { id: PersonalPlanSetupLevel })[] = [
  { id: 'a0', icon: 'leaf-outline', title: 'A0: почти с нуля', subtitle: 'Нужны самые базовые фразы' },
  { id: 'a1', icon: 'book-outline', title: 'A1: знаю базовые слова', subtitle: 'Хочу быстрее собирать фразы' },
  { id: 'a2', icon: 'chatbubble-ellipses-outline', title: 'A2: понимаю, но не говорю', subtitle: 'Нужна практика ответов' },
  { id: 'b1', icon: 'mic-outline', title: 'B1: хочу увереннее', subtitle: 'Нужен ритм и более живые задания' },
];

/** Тема → план. Единственное место, где выбирается план. */
export function resolvePersonalPlanForGoal(goal: PersonalPlanSetupGoal): PersonalPlanId {
  switch (goal) {
    case 'series': return 'echo';
    case 'everyday': return 'impuls';
    case 'travel': return 'voyazh';
    case 'words': return 'gavan';
    case 'mind': return 'mitap';
  }
}

export type PersonalPlanRecommendationInput = {
  goal: PersonalPlanSetupGoal;
  level: PersonalPlanSetupLevel;
};

export function recommendPersonalPlan(input: PersonalPlanRecommendationInput): PersonalPlanId {
  // Уровень пока не меняет план — тема решает. Поле в подписи оставлено,
  // чтобы настройка темпа могла учесть его без смены вызовов.
  return resolvePersonalPlanForGoal(input.goal);
}

export function getPlanDefaultMinutes(planId: PersonalPlanId): PlanMinutesChoice {
  return getPlanById(planId).minutesDefault;
}

/**
 * «Что логично пройти после этого плана» — одна умная рекомендация для финального
 * экрана «маршрут пройден». Порядок выстроен по нарастанию: от выживания в поездке
 * к словарному запасу, затем к живому разговору, восприятию речи на слух и, наконец,
 * к спокойной поддерживающей практике. Берём СЛЕДУЮЩИЙ план в этой цепочке после
 * пройденного; дойдя до конца — заворачиваем на начало. Так каждый раз предлагается
 * один осмысленный следующий шаг, а не «выбери сам из пяти».
 */
const PLAN_PROGRESSION_ORDER: readonly PersonalPlanId[] = ['voyazh', 'gavan', 'impuls', 'echo', 'mitap'];

export function recommendNextPlanAfter(completedPlanId: PersonalPlanId): PersonalPlanId {
  const index = PLAN_PROGRESSION_ORDER.indexOf(completedPlanId);
  if (index === -1) return PLAN_PROGRESSION_ORDER[0];
  return PLAN_PROGRESSION_ORDER[(index + 1) % PLAN_PROGRESSION_ORDER.length];
}
