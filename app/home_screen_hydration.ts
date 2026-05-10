/**
 * Последний снимок главного экрана в памяти процесса: при повторном открытии таба «Главная»
 * без этого React снова берёт нули из useState(0), а homeStatsLoadedOnce уже true — мелькает «уровень 1».
 */

import type { Lang } from '../constants/i18n';
import { lessonNamesForLang } from '../constants/lessons';

export type HomeScreenHydration = {
  userName: string;
  totalXP: number;
  streak: number;
  displayStreak: number;
  weekDone: boolean[];
  weekPoints: number;
  shardsBalance: number;
  lessonsCompleted: number;
  freezeActive: boolean;
  premiumFreezeUsed: boolean;
  totalXPMulti: number;
  userAvatar: string;
  userFrame: string;
  lastLessonId: number | null;
  lastLessonProgress: number;
  lastLessonScore: string;
};

let snapshot: HomeScreenHydration | null = null;

export function rememberHomeScreenHydration(next: HomeScreenHydration): void {
  snapshot = next;
}

export function peekHomeScreenHydration(): HomeScreenHydration | null {
  return snapshot;
}

export function buildLastLessonFromHydration(lang: Lang): { id: number; name: string; progress: number; score: string } | null {
  const mem = snapshot;
  if (!mem?.lastLessonId || mem.lastLessonId < 1 || mem.lastLessonId > 32) return null;
  const names = lessonNamesForLang(lang);
  const id = mem.lastLessonId;
  const name = names[id - 1];
  if (!name) return null;
  return { id, name, progress: mem.lastLessonProgress, score: mem.lastLessonScore };
}

/* expo-router: не регистрировать утилиту как экран */
export default function __HomeScreenHydrationRouteShim() {
  return null;
}
