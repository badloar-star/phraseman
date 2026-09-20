import { getVerifiedPremiumStatus, isTesterNoLimitsActive } from './premium_guard';
import { isAlwaysOpenLesson } from './main_course_access';
import {
  lessonPaywallContext,
  requiresPremiumForLesson,
} from './monetization_policy';
import { isLessonUnlockedByEarnedProgress, isLessonUnlockedByPremiumCourse } from './lesson_lock_system';
import type { RuntimeStudyTarget } from './target_storage_keys';
import { markNextNavigationAsReplace } from './navigation_back';
import { openPremiumPaywall } from './paywall_navigation';
import { lessonPurchaseContinuationParams } from './paywall_lesson_continuation';

export type LessonRuntimeGate = 'available' | 'premium_required' | 'level_required' | 'progress_required';

export async function resolveLessonRuntimeGate(
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<LessonRuntimeGate> {
  try {
    // Урок 1 открыт всегда. Уроки 2–3 без пейвола, но за замком прогресса:
    // бронзу/покупку проверяет isLessonUnlockedByEarnedProgress ниже, и при отказе
    // они дают 'progress_required' (не пейвол) — requiresPremiumForLesson их не считает платными.
    if (isAlwaysOpenLesson(lessonId)) return 'available';
    if (await isTesterNoLimitsActive()) return 'available';

    // The Free sample and exact pearl grants outrank subscription status.
    if (await isLessonUnlockedByEarnedProgress(lessonId, studyTarget)) return 'available';

    const premium = await getVerifiedPremiumStatus().catch(() => false);
    if (!premium) {
      return requiresPremiumForLesson(lessonId) ? 'premium_required' : 'progress_required';
    }
    if (!(await isLessonUnlockedByPremiumCourse(lessonId, studyTarget))) return 'progress_required';
    return 'available';
  } catch (e) {
    // Ошибка чтения локального прогресса не может превращаться в доступ к уроку.
    // Немой catch запрещён: без причины такой отказ неотличим от «рано».
    console.warn('[LESSON-GATE] resolve:catch', JSON.stringify({
      lessonId,
      reason: e instanceof Error ? e.message : String(e),
    }));
    return 'progress_required';
  }
}

export async function shouldBlockPremiumLesson(lessonId: number, studyTarget?: RuntimeStudyTarget): Promise<boolean> {
  return (await resolveLessonRuntimeGate(lessonId, studyTarget)) === 'premium_required';
}

export async function shouldBlockLessonAccess(lessonId: number, studyTarget?: RuntimeStudyTarget): Promise<boolean> {
  return (await resolveLessonRuntimeGate(lessonId, studyTarget)) !== 'available';
}

export function openLessonAccessGate(
  router: any,
  lessonId: number,
): void {
  router.replace({
    pathname: '/lesson_menu',
    params: { id: lessonId },
  } as any);
}

export function openLessonPremiumPaywall(
  router: any,
  lessonId: number,
): void {
  markNextNavigationAsReplace();
  openPremiumPaywall(router, {
    context: lessonPaywallContext(lessonId),
    lessons_done: Math.max(0, lessonId - 1),
    ...lessonPurchaseContinuationParams(lessonId),
  }, 'replace');
}

/**
 * Единый маршрутизатор блокировки урока: премиум-лок ведёт ПРЯМО на пейвол,
 * остальные блокировки (уровень/прогресс) — на промежуточный экран урока.
 * Используется in-screen guard'ами уроков, чтобы при попытке открыть
 * премиум-урок сразу показывался пейвол, а не заглушка «доступно в Premium».
 */
export async function openLessonGateByRuntime(
  router: any,
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  const gate = await resolveLessonRuntimeGate(lessonId, studyTarget).catch(() => 'progress_required' as LessonRuntimeGate);
  if (gate === 'available') return;
  if (gate === 'premium_required') {
    openLessonPremiumPaywall(router, lessonId);
    return;
  }
  openLessonAccessGate(router, lessonId);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
