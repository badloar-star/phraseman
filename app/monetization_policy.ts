import { isFeaturePremiumGated } from './feature_gates';
import { isAlwaysOpenLesson, isMainCourseLesson } from './main_course_access';
import { plusOpensLesson } from './plus_lessons_rule';
import { LESSON_UNLOCK_SCORE, previousLessonScoreOpensNext } from './lesson_star_scale';

/**
 * Owner 2026-09-20: lessons 1–3 carry NO paywall — Free may reach them without
 * Plus. Owner 2026-09-20 (later, same day): being paywall-free is NOT the same
 * as being open. Only lesson 1 starts unlocked; lessons 2 and 3 must still be
 * earned with bronze ★2.5 on the previous lesson, or bought for 100 pearls.
 *
 * зачем: раньше эти два смысла были одной константой, и isFreeSampleLesson
 * коротко замыкало ВЫШЕ проверки бронзы в шести местах сразу — поэтому
 * уроки 2 и 3 открывались сами собой и вся система замков на них не работала.
 * Теперь пейвольная граница (FREE_LESSON_LIMIT) и стартовый доступ
 * (UNCONDITIONALLY_OPEN_LESSON_LIMIT) — разные величины.
 */
export const FREE_LESSON_LIMIT = 3;

/**
 * Сколько уроков открыто БЕЗ всяких условий. Ровно один: первый.
 * Всё остальное зарабатывается или покупается.
 */
export const UNCONDITIONALLY_OPEN_LESSON_LIMIT = 1;
// зачем (D121, владелец 2026-09-30): следующий урок открывается от 2★ = 60% правильных,
// то есть от оценки 3.0 из 5 (было 2 = 40% по D71). Значение берётся из единой шкалы
// lesson_star_scale.ts. Имя константы сохранено ради совместимости импортов; медаль
// «бронза» (medal_utils) остаётся 2.5. Уже открытые уроки не закрываются —
// см. previousLessonScoreOpensNext (grandfathering по сохранённому списку открытых).
export const BRONZE_UNLOCK_SCORE = LESSON_UNLOCK_SCORE;
const PREMIUM_SECTION_STARTERS = new Set([1, 9, 19, 29]);

export type LessonAccessState =
  | 'available'
  | 'premium_required'
  | 'progress_required';

/**
 * The main course is deliberately fail-closed: the three-lesson Free sample
 * is a local product contract.
 */
export function isFreeLesson(lessonId: number): boolean {
  if (!Number.isFinite(lessonId) || lessonId < 1) return false;
  if (isMainCourseLesson(lessonId)) return lessonId <= FREE_LESSON_LIMIT;
  return !isFeaturePremiumGated('lessons') || lessonId <= FREE_LESSON_LIMIT;
}

function normalizedLegacyFreeLessonCap(legacyFreeLessonCap?: number): number {
  if (!Number.isFinite(legacyFreeLessonCap)) return 0;
  return Math.min(8, Math.max(FREE_LESSON_LIMIT, Math.trunc(legacyFreeLessonCap ?? 0)));
}

export function hasLegacyFreeLessonAccess(
  lessonId: number,
  legacyFreeLessonCap?: number,
): boolean {
  if (!Number.isFinite(lessonId) || lessonId < 1) return false;
  return lessonId <= normalizedLegacyFreeLessonCap(legacyFreeLessonCap);
}

export function isLegacyLessonGrandfatheredOpen(
  lessonId: number,
  legacyFreeLessonCap?: number,
): boolean {
  return normalizedLegacyFreeLessonCap(legacyFreeLessonCap) > FREE_LESSON_LIMIT &&
    hasLegacyFreeLessonAccess(lessonId, legacyFreeLessonCap);
}

export function requiresPremiumForLesson(
  lessonId: number,
  legacyFreeLessonCap?: number,
): boolean {
  if (!Number.isFinite(lessonId) || lessonId < 1) return false;
  // зачем (D122, владелец 2026-09-30): кому раньше бесплатно были открыты уроки 4–8,
  // тем доступ сохраняется. Потолок приходит ТОЛЬКО из сохранённого значения
  // legacy_free_lesson_cap (миграция legacy_free_lesson_access.ts замораживает его
  // один раз); новым аккаунтам он равен 3, поэтому новым ничего не дарится.
  if (isLegacyLessonGrandfatheredOpen(lessonId, legacyFreeLessonCap)) return false;
  if (isMainCourseLesson(lessonId)) return lessonId > FREE_LESSON_LIMIT;
  return !isFreeLesson(lessonId);
}

/**
 * Урок без пейвола: Free может до него добраться без Plus.
 * Это НЕ значит «открыт» — замок прогресса на нём по-прежнему действует.
 * Для «открыт безусловно» есть isUnconditionallyOpenLesson.
 */
export function isFreeSampleLesson(lessonId: number): boolean {
  return isMainCourseLesson(lessonId) && lessonId <= FREE_LESSON_LIMIT;
}

/** Единственный урок, открытый без прогресса и без покупки. */
export function isUnconditionallyOpenLesson(lessonId: number): boolean {
  return isMainCourseLesson(lessonId) && lessonId <= UNCONDITIONALLY_OPEN_LESSON_LIMIT;
}

export function isPremiumSectionStarterLesson(lessonId: number): boolean {
  return isMainCourseLesson(lessonId) && PREMIUM_SECTION_STARTERS.has(lessonId);
}

/**
 * Free list projection. Old progress and exams are intentionally ignored; only
 * the Free sample, exact durable pearl grants and the frozen legacy cap (D122)
 * survive. Persisted unlocks are used only to grandfather lessons 2–3 opened
 * under the pre-D121 threshold.
 */
export function buildSequentialFreeLessonUnlocks(params: {
  scores: readonly number[];
  persistedUnlocked?: readonly number[];
  purchasedLessons?: readonly number[];
  passedExams?: Readonly<Record<string, boolean>>;
  lessonCount?: number;
  freeLessonLimit?: number;
  legacyFreeLessonCap?: number;
}): boolean[] {
  const lessonCount = params.lessonCount ?? 32;
  const unlocked = new Array(Math.max(lessonCount, 0)).fill(false);
  if (lessonCount <= 0) return unlocked;

  // зачем (владелец 2026-09-20): раньше здесь безусловно открывались все
  // три бесплатных урока, и замок на 2–3 был недостижим. Теперь безусловен
  // только первый урок; 2 и 3 без пейвола, но требуют бронзы ★2.5 на
  // предыдущем или покупки за 100 жемчужин.
  for (let i = 0; i < Math.min(UNCONDITIONALLY_OPEN_LESSON_LIMIT, lessonCount); i++) {
    unlocked[i] = true;
  }
  const persisted = new Set(params.persistedUnlocked ?? []);
  for (let i = UNCONDITIONALLY_OPEN_LESSON_LIMIT; i < Math.min(FREE_LESSON_LIMIT, lessonCount); i++) {
    // зачем (D121): 2★ = 60%; урок, уже открытый по старому порогу, не закрываем.
    if (previousLessonScoreOpensNext(params.scores[i - 1] ?? 0, persisted.has(i + 1))) unlocked[i] = true;
  }
  for (const lessonId of params.purchasedLessons ?? []) {
    if (lessonId >= 1 && lessonId <= lessonCount) unlocked[lessonId - 1] = true;
  }
  // зачем (D122): уроки до замороженного legacy-потолка (4–8) были бесплатно
  // открыты раньше — возвращаем их. Для новых аккаунтов потолок = 3, цикл пуст.
  const legacyCap = normalizedLegacyFreeLessonCap(params.legacyFreeLessonCap);
  if (legacyCap > FREE_LESSON_LIMIT) {
    for (let i = 0; i < Math.min(legacyCap, lessonCount); i++) unlocked[i] = true;
  }

  return unlocked;
}

/** Plus projection. Owner 28.10 ~21:05 («Plus открывает все 32»): Plus opens ALL 32 main-course lessons at once (plusOpensLesson) — no 2★ on the
 * predecessor, no section starters. The former sequential rule below is kept only as the rollback path (PLUS_OPENS_ALL_LESSONS = false). */
export function buildPremiumLessonUnlocks(params: {
  scores: readonly number[];
  purchasedLessons?: readonly number[];
  persistedUnlocked?: readonly number[];
  legacyFreeLessonCap?: number;
  lessonCount?: number;
}): boolean[] {
  const lessonCount = params.lessonCount ?? 32;
  const unlocked = new Array(Math.max(lessonCount, 0)).fill(false);
  const purchased = new Set(params.purchasedLessons ?? []);
  const persisted = new Set(params.persistedUnlocked ?? []);
  for (let i = 0; i < lessonCount; i++) {
    const lessonId = i + 1;
    // зачем: у Plus снят пейвол, но не замок прогресса. Безусловно открыт
    // первый урок и старты разделов 9/19/29; уроки 2–3 больше НЕ дарятся.
    unlocked[i] = plusOpensLesson(lessonId)
      || isUnconditionallyOpenLesson(lessonId)
      || isPremiumSectionStarterLesson(lessonId)
      || purchased.has(lessonId)
      // зачем (D122): уроки до замороженного legacy-потолка были открыты и раньше.
      || isLegacyLessonGrandfatheredOpen(lessonId, params.legacyFreeLessonCap)
      // зачем (D121): 2★ = 60%; урок, уже открытый по старому порогу, не закрываем.
      || (i > 0 && previousLessonScoreOpensNext(params.scores[i - 1] ?? 0, persisted.has(lessonId)));
  }
  return unlocked;
}

export type CoursePaywallContext = 'course_after_lesson3';

export function lessonPaywallContext(
  lessonId: number,
  legacyFreeLessonCap?: number,
): CoursePaywallContext | null {
  if (!requiresPremiumForLesson(lessonId, legacyFreeLessonCap)) return null;
  return 'course_after_lesson3';
}

export function resolveLessonAccess(params: {
  lessonId: number;
  unlocked: boolean;
  isPremium: boolean;
  purchased?: boolean;
  devMode?: boolean;
  noLimits?: boolean;
  legacyFreeLessonCap?: number;
}): LessonAccessState {
  const {
    lessonId,
    unlocked,
    isPremium,
    purchased = false,
    devMode = false,
    noLimits = false,
    legacyFreeLessonCap,
  } = params;
  // зачем (владелец 2026-09-20): раньше здесь стоял isFreeSampleLesson — уроки
  // 2 и 3 возвращали 'available' выше проверки прогресса и открывались сами.
  // Безусловен только урок 1; остальное решает замок ниже.
  if (isAlwaysOpenLesson(lessonId) || isUnconditionallyOpenLesson(lessonId)) return 'available';
  // зачем (владелец 22.09, «урок 2 — пустой экран и сразу кидает назад, модала
  // нет»): здесь стояло `if (devMode || noLimits) return 'available'`, а devMode —
  // это DEV_CONTENT_UNLOCK, БЕЗУСЛОВНАЯ константа любой дев-сборки, а не флаг с
  // диска. Список считал открытыми все 32 урока и пускал тап на /lesson_menu, а
  // тот замок считает ИНАЧЕ (lesson_menu.tsx:547 — только isTesterNoLimitsActive,
  // без DEV_CONTENT_UNLOCK), честно видел замок и делал safeRouterBack. Отсюда
  // пустой экран вместо модала: решение о навигации принимала одна логика, а
  // правду знала другая (8 записей [LESSON-LOCK] menu:bounce_back в логе).
  // Теперь devMode снимает только ПРЕМИУМ-требование (дев-сборке не нужна
  // подписка), а замок по прогрессу остаётся — ровно как в lesson_menu, поэтому
  // список сам показывает gateModal и никуда не ведёт.
  if (noLimits) return 'available';
  // Exact pearl grants are permanent entitlements and outrank subscription.
  if (purchased) return 'available';
  // зачем (D122): legacy-потолок снова снимает пейвол с уроков 4–8 у старых пользователей.
  if (requiresPremiumForLesson(lessonId, legacyFreeLessonCap) && !isPremium && !devMode) return 'premium_required';
  return unlocked ? 'available' : 'progress_required';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
