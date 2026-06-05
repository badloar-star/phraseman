import { getPlanById, type PersonalPlanId, type PlanMinutesChoice } from './personal_plan_catalog';

export type PersonalPlanSetupGoal = 'travel' | 'work' | 'move' | 'self';
export type PersonalPlanSetupLevel = 'a0' | 'a1' | 'a2' | 'b1';
export type PersonalPlanSetupFocus = 'guided' | 'speak' | 'dialog';

export type PersonalPlanSetupChoice = {
  id: string;
  title: string;
  subtitle: string;
  icon: 'airplane-outline' | 'briefcase-outline' | 'home-outline' | 'school-outline' | 'leaf-outline' | 'book-outline' | 'chatbubble-ellipses-outline' | 'mic-outline' | 'map-outline' | 'flash-outline' | 'ear-outline';
};

export const PERSONAL_PLAN_SETUP_GOALS: (PersonalPlanSetupChoice & { id: PersonalPlanSetupGoal })[] = [
  { id: 'travel', icon: 'airplane-outline', title: 'Для поездок', subtitle: 'Аэропорт, отель, кафе, вопросы на месте' },
  { id: 'work', icon: 'briefcase-outline', title: 'Для работы', subtitle: 'Созвоны, переписка, короткие объяснения' },
  { id: 'move', icon: 'home-outline', title: 'Для переезда', subtitle: 'Быт, документы, врачи, школа, жилье' },
  { id: 'self', icon: 'school-outline', title: 'Для себя', subtitle: 'Спокойно прокачивать понимание и речь' },
];

export const PERSONAL_PLAN_SETUP_LEVELS: (PersonalPlanSetupChoice & { id: PersonalPlanSetupLevel })[] = [
  { id: 'a0', icon: 'leaf-outline', title: 'A0: почти с нуля', subtitle: 'Нужны самые базовые фразы' },
  { id: 'a1', icon: 'book-outline', title: 'A1: знаю базовые слова', subtitle: 'Хочу быстрее собирать фразы' },
  { id: 'a2', icon: 'chatbubble-ellipses-outline', title: 'A2: понимаю, но не говорю', subtitle: 'Нужна практика ответов' },
  { id: 'b1', icon: 'mic-outline', title: 'B1: хочу увереннее', subtitle: 'Нужен ритм и более живые задания' },
];

export const PERSONAL_PLAN_SETUP_FOCUS: (PersonalPlanSetupChoice & { id: PersonalPlanSetupFocus })[] = [
  { id: 'guided', icon: 'map-outline', title: 'Вести меня по маршруту', subtitle: 'Каждый день понятно, что делать дальше' },
  { id: 'speak', icon: 'flash-outline', title: 'Быстрее отвечать', subtitle: 'Меньше зависать и быстрее начинать фразу' },
  { id: 'dialog', icon: 'ear-outline', title: 'Лучше слышать диалоги', subtitle: 'Переспрашивать, уточнять и продолжать разговор' },
];

export type PersonalPlanRecommendationInput = {
  goal: PersonalPlanSetupGoal;
  level: PersonalPlanSetupLevel;
  focus: PersonalPlanSetupFocus;
};

export function recommendPersonalPlan(input: PersonalPlanRecommendationInput): PersonalPlanId {
  if (input.goal === 'travel') return 'voyazh';
  if (input.goal === 'work') return 'mitap';
  if (input.goal === 'move') return 'gavan';
  if (input.focus === 'dialog') return 'echo';
  if (input.focus === 'speak' || input.level === 'b1' || input.level === 'a2') return 'impuls';
  return 'echo';
}

export function getPlanDefaultMinutes(planId: PersonalPlanId): PlanMinutesChoice {
  return getPlanById(planId).minutesDefault;
}
