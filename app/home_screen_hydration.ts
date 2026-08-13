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
import type { AppSnapshotSource } from './app_snapshot_store';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';

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
  // зачем: dueCount раньше стартовал с useState(0) и «прыгал» на
  // реальное число вторым проходом (после belowFoldReady) при каждом повторном
  // открытии таба — тот же класс бага, что и остальные поля тут. Кладём последнее
  // известное значение в снапшот, чтобы первый рендер второго прохода уже показывал
  // правду, а не 0.
  dueCount?: number;
};

type OwnedHomeScreenHydration = Readonly<{
  snapshot: HomeScreenHydration;
  owner: AccountGenerationToken;
}>;

let snapshotByTarget: Partial<Record<string, OwnedHomeScreenHydration>> = {};

function ownerIsCurrent(owner: AccountGenerationToken): boolean {
  const current = captureAccountGeneration();
  if (current.phase === 'transitioning') return false;
  if (owner.phase === 'uninitialized') {
    return current.phase === 'uninitialized'
      && current.generation === owner.generation
      && current.stableId === owner.stableId;
  }
  return owner.phase === 'active' && isCurrentAccountGeneration(owner, owner.stableId);
}

export function rememberHomeScreenHydration(
  next: HomeScreenHydration,
  studyTarget?: StudyTargetLang,
  owner: AccountGenerationToken = captureAccountGeneration(),
): void {
  if (!ownerIsCurrent(owner)) return;
  snapshotByTarget[storageStudyTarget(studyTarget)] = {
    snapshot: next,
    owner,
  };
}

export function patchHomeScreenHydration(
  patch: Partial<HomeScreenHydration>,
  studyTarget?: StudyTargetLang,
): void {
  const key = storageStudyTarget(studyTarget);
  const current = snapshotByTarget[key];
  if (!current || !ownerIsCurrent(current.owner)) return;
  snapshotByTarget[key] = {
    snapshot: { ...current.snapshot, ...patch },
    owner: captureAccountGeneration(),
  };
}

export function peekHomeScreenHydration(studyTarget?: StudyTargetLang): HomeScreenHydration | null {
  const current = snapshotByTarget[storageStudyTarget(studyTarget)];
  return current && ownerIsCurrent(current.owner) ? current.snapshot : null;
}

export function __resetHomeScreenHydrationForTests(): void {
  snapshotByTarget = {};
}

/**
 * A completed local Home load normally wins over later warm-cache updates.
 * The server-authoritative projection is the exception: it must replace a
 * stale or zero local SQLite value when persistence is unavailable.
 */
export function shouldApplyHomeSnapshotToStats(
  homeStatsAlreadyLoaded: boolean,
  profileSource?: AppSnapshotSource,
  progressSource?: AppSnapshotSource,
): boolean {
  return !homeStatsAlreadyLoaded
    || profileSource === 'live'
    || profileSource === 'local'
    || progressSource === 'live'
    || progressSource === 'local';
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
