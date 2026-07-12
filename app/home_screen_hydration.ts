/**
 * Последний снимок главного экрана в памяти процесса: при повторном открытии таба «Главная»
 * без этого React снова берёт нули из useState(0), а homeStatsLoadedOnce уже true — мелькает «уровень 1».
 */

import type { Lang } from '../constants/i18n';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../constants/avatars';
import { normalizeAvatarAuraId } from '../constants/avatar_auras';
import { getLevelFromXP } from '../constants/theme';
import type { PersonalPlanHomeSnapshot } from './personal_plan_state';
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
  userAvatarAura?: string | null;
  userFrame: string;
  lastLessonId: number | null;
  lastLessonProgress: number;
  lastLessonScore: string;
  homeLeagueRaceVisible?: boolean;
  homeLeagueCrownExpiresAt?: number;
  homeLeagueCrownCount?: number;
  homeLeagueChest?: {
    leagueName: string;
    progress: number;
    goal: number;
    myContribution: number;
    leaderName: string;
    leaderPoints: number;
  } | null;
  personalPlanSnapshot?: PersonalPlanHomeSnapshot | null;
};

let snapshotByTarget: Partial<Record<string, HomeScreenHydration>> = {};

export function rememberHomeScreenHydration(next: HomeScreenHydration, studyTarget?: StudyTargetLang): void {
  snapshotByTarget[storageStudyTarget(studyTarget)] = next;
}

export function patchHomeScreenHydration(
  patch: Partial<HomeScreenHydration>,
  studyTarget?: StudyTargetLang,
): void {
  const key = storageStudyTarget(studyTarget);
  const current = snapshotByTarget[key];
  if (!current) return;
  snapshotByTarget[key] = { ...current, ...patch };
}

export function peekHomeScreenHydration(studyTarget?: StudyTargetLang): HomeScreenHydration | null {
  return snapshotByTarget[storageStudyTarget(studyTarget)] ?? null;
}

export function resolveHomeProfileVisuals(params: {
  hydration?: Pick<HomeScreenHydration, 'totalXP' | 'userAvatar' | 'userAvatarAura' | 'userFrame'> | null;
  snapshot?: { totalXp?: number; avatar?: string; frame?: string; aura?: string } | null;
}): { avatar: string; frame: string; aura: string | null; level: number } {
  const totalXP = params.hydration?.totalXP ?? params.snapshot?.totalXp ?? 0;
  const level = getLevelFromXP(Math.max(0, Math.floor(Number(totalXP) || 0)));
  const levelAvatar = getBestAvatarForLevel(level);
  const hydrationAvatar = params.hydration?.userAvatar ?? '';
  const snapshotAvatar = params.snapshot?.avatar ?? '';
  const avatar = hydrationAvatar || (snapshotAvatar && !(snapshotAvatar === '1' && levelAvatar !== '1') ? snapshotAvatar : levelAvatar);
  const frame = (params.hydration?.userFrame ?? params.snapshot?.frame ?? '') || getBestFrameForLevel(level).id;
  const aura = normalizeAvatarAuraId(params.hydration?.userAvatarAura) ?? normalizeAvatarAuraId(params.snapshot?.aura) ?? null;
  return { avatar, frame, aura, level };
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
