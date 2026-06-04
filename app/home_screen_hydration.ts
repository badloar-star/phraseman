/**
 * Последний снимок главного экрана в памяти процесса: при повторном открытии таба «Главная»
 * без этого React снова берёт нули из useState(0), а homeStatsLoadedOnce уже true — мелькает «уровень 1».
 */

import type { Lang } from '../constants/i18n';
import type { StudyTargetLang } from './study_target_lang_dev';
import { lessonNamesForStudyTarget } from './lesson_titles_for_study_target';
import { storageStudyTarget } from './target_storage_keys';
import type { StreakWeekDayMarkerKind } from './streak_week_markers';

export type HomeScreenHydration = {
  userName: string;
  totalXP: number;
  streak: number;
  displayStreak: number;
  weekDone: boolean[];
  weekMarkers?: Array<StreakWeekDayMarkerKind | null>;
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
  homeLeagueRaceVisible?: boolean;
  homeLeagueCrownExpiresAt?: number;
  homeLeagueChest?: {
    leagueName: string;
    progress: number;
    goal: number;
    myContribution: number;
    leaderName: string;
    leaderPoints: number;
  } | null;
};

let snapshotByTarget: Partial<Record<string, HomeScreenHydration>> = {};

export function rememberHomeScreenHydration(next: HomeScreenHydration, studyTarget?: StudyTargetLang): void {
  snapshotByTarget[storageStudyTarget(studyTarget)] = next;
}

export function peekHomeScreenHydration(studyTarget?: StudyTargetLang): HomeScreenHydration | null {
  return snapshotByTarget[storageStudyTarget(studyTarget)] ?? null;
}

export function buildLastLessonFromHydration(
  lang: Lang,
  studyTarget?: StudyTargetLang,
): { id: number; name: string; progress: number; score: string } | null {
  const mem = peekHomeScreenHydration(studyTarget);
  if (!mem?.lastLessonId || mem.lastLessonId < 1 || mem.lastLessonId > 32) return null;
  const names = lessonNamesForStudyTarget(lang, studyTarget ?? 'en');
  const id = mem.lastLessonId;
  const name = names[id - 1];
  if (!name) return null;
  return { id, name, progress: mem.lastLessonProgress, score: mem.lastLessonScore };
}

/* expo-router: не регистрировать утилиту как экран */
export default function __HomeScreenHydrationRouteShim() {
  return null;
}
