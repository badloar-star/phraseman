import type { TodayDestinationId } from './types';

// зачем: таб «Уроки» убран (2026-08-02) — уроки теперь обычный push-маршрут,
// вариант kind:'tab' исчез вместе с последним потребителем.
export type TodayDestination =
  | { id: 'lessons'; kind: 'route'; pathname: '/lessons_list' }
  | { id: 'plan'; kind: 'route'; pathname: '/personal_plan' }
  | { id: 'practice'; kind: 'route'; pathname: '/trainer' }
  | { id: 'flashcards'; kind: 'route'; pathname: '/flashcards_swipe' }
  | { id: 'daily_tasks'; kind: 'route'; pathname: '/daily_tasks_screen' };

export const TODAY_DESTINATIONS: Readonly<Record<TodayDestinationId, TodayDestination>> = {
  lessons: { id: 'lessons', kind: 'route', pathname: '/lessons_list' },
  plan: { id: 'plan', kind: 'route', pathname: '/personal_plan' },
  practice: { id: 'practice', kind: 'route', pathname: '/trainer' },
  flashcards: { id: 'flashcards', kind: 'route', pathname: '/flashcards_swipe' },
  daily_tasks: { id: 'daily_tasks', kind: 'route', pathname: '/daily_tasks_screen' },
};
