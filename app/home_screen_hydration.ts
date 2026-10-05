/**
 * Последний снимок главного экрана в памяти процесса: при повторном открытии таба «Главная»
 * без этого React снова берёт нули из useState(0), а homeStatsLoadedOnce уже true.
 */

import type { Lang } from '../constants/i18n';
import type { StudyTargetLang } from './study_target_lang_dev';
import { lessonNamesForStudyTarget } from './lesson_titles_for_study_target';
import { storageStudyTarget } from './target_storage_keys';
import type { StreakWeekDayMarkerKind } from './streak_week_markers';
import { getAppSnapshot, type AppSnapshotSource } from './app_snapshot_store';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';

export type HomeScreenHydration = {
  userName: string;
  streak: number;
  displayStreak: number;
  weekDone: boolean[];
  weekMarkers?: Array<StreakWeekDayMarkerKind | null>;
  weekPoints: number;
  lessonsCompleted: number;
  userAvatar: string;
  userAvatarAura?: string | null;
  userFrame: string;
  lastLessonId: number | null;
  lastLessonProgress: number;
  lastLessonScore: string;
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
  hydration?: Pick<HomeScreenHydration, 'userAvatar' | 'userAvatarAura' | 'userFrame'> | null;
  snapshot?: { avatar?: string; frame?: string; aura?: string } | null;
}): { avatar: string; frame: string; aura: string | null } {
  const hydrationAvatar = params.hydration?.userAvatar ?? '';
  const snapshotAvatar = params.snapshot?.avatar ?? '';
  const avatar = hydrationAvatar || snapshotAvatar || '1';
  const frame = (params.hydration?.userFrame ?? params.snapshot?.frame ?? '');
  // зачем: D108 — ауры удалены: Главная всегда получает «без ауры».
  const aura = null;
  return { avatar, frame, aura };
}

export function buildLastLessonFromHydration(
  lang: Lang,
  studyTarget?: StudyTargetLang,
): { id: number; name: string; progress: number; score: string } | null {
  const mem = peekHomeScreenHydration(studyTarget);
  if (!mem) return buildLastLessonFromBootSnapshot(lang, studyTarget);
  if (!mem.lastLessonId || mem.lastLessonId < 1 || mem.lastLessonId > 32) return null;
  const names = lessonNamesForStudyTarget(lang, studyTarget ?? 'en');
  const id = mem.lastLessonId;
  const name = names[id - 1];
  if (!name) return null;
  return { id, name, progress: mem.lastLessonProgress, score: mem.lastLessonScore };
}

let bootCardMissLogged = false;

/**
 * зачем (пакет 07:26 [HOME-COLD]: lessonCard=empty, hydrationInMemory=false на холодном старте): памяти процесса ещё нет,
 * но стартовое чтение уже положило в снимок последний урок и число верных (app_snapshot_bootstrap). Счёт и балл — те
 * же формулы, что в loadData Главной; loadData потом уточняет (доступность урока). Язык изучения обязан совпасть.
 */
function buildLastLessonFromBootSnapshot(
  lang: Lang,
  studyTarget?: StudyTargetLang,
): { id: number; name: string; progress: number; score: string } | null {
  const lessons = getAppSnapshot().lessons;
  // зачем (координатор 05.10, пакет 08:26 lessonCard=empty): каждый null называет причину и что лежало в снимке.
  const miss = (reason: string): null => {
    if (!bootCardMissLogged) {
      bootCardMissLogged = true;
      console.warn('[HOME-COLD] boot_card:null', JSON.stringify({
        reason, atEpochMs: Date.now(), hasLessons: !!lessons, primedAt: getAppSnapshot().primedAt ?? null,
        snapshotTarget: lessons?.studyTarget ?? null, expectedTarget: storageStudyTarget(studyTarget),
        lastOpenedLesson: lessons?.lastOpenedLesson ?? null, lastOpenedLessonCorrect: lessons?.lastOpenedLessonCorrect ?? null,
      })); // guard-ok: ранний выход логируется, один раз за запуск
    }
    return null;
  };
  if (!lessons) return miss('no_lessons_in_snapshot');
  if (lessons.studyTarget !== storageStudyTarget(studyTarget)) return miss('study_target_mismatch');
  const id = lessons.lastOpenedLesson ? parseInt(lessons.lastOpenedLesson, 10) : NaN;
  const correct = lessons.lastOpenedLessonCorrect;
  if (!Number.isInteger(id) || id < 1 || id > 32) return miss('no_last_opened_lesson');
  if (typeof correct !== 'number') return miss('no_correct_count');
  const name = lessonNamesForStudyTarget(lang, studyTarget ?? 'en')[id - 1];
  if (!name) return miss('no_lesson_name');
  return { id, name, progress: correct, score: (correct / 50 * 5).toFixed(1) };
}

/* expo-router: не регистрировать утилиту как экран */
export default function __HomeScreenHydrationRouteShim() {
  return null;
}
