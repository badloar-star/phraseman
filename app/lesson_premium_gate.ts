import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVerifiedPremiumStatus } from './premium_guard';
import { lessonPaywallContext, requiresPremiumForLesson } from './monetization_policy';
import { isLessonUnlockedByPremiumCourse } from './lesson_lock_system';
import type { RuntimeStudyTarget } from './target_storage_keys';

export type LessonRuntimeGate = 'available' | 'premium_required' | 'level_required';

export async function resolveLessonRuntimeGate(
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<LessonRuntimeGate> {
  const noLimitsRaw = await AsyncStorage.getItem('tester_no_limits').catch(() => null);
  if (noLimitsRaw === 'true') return 'available';

  const premium = await getVerifiedPremiumStatus().catch(() => false);
  if (!premium && requiresPremiumForLesson(lessonId)) return 'premium_required';
  if (premium && !(await isLessonUnlockedByPremiumCourse(lessonId, studyTarget))) return 'level_required';
  return 'available';
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
  router.replace({
    pathname: '/premium_modal',
    params: {
      context: lessonPaywallContext(lessonId),
      lessons_done: String(Math.max(0, lessonId - 1)),
    },
  } as any);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
