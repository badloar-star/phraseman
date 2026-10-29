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
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
import { notePlusLessonsDecision, type PlusLessonsBranch } from './plus_lessons_diagnostics';

export type LessonRuntimeGate = 'available' | 'premium_required' | 'level_required' | 'progress_required';

// зачем (владелец 28.10 ~21:05, [PLUS-LESSONS]): каждое решение охранника уходит в журнал обращений с веткой, которая его приняла. Решения Plus («все 32
// открыты») пишет общая функция isLessonUnlockedByPremiumCourse — здесь только остальные ветки.
function decided(lessonId: number, gate: LessonRuntimeGate, branch: PlusLessonsBranch, premiumNow: boolean | null): LessonRuntimeGate {
  notePlusLessonsDecision('gate', lessonId, premiumNow, gate, branch);
  return gate;
}

export async function resolveLessonRuntimeGate(
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<LessonRuntimeGate> {
  try {
    // Урок 1 открыт всегда. Уроки 2–3 без пейвола, но за замком прогресса:
    // бронзу/покупку проверяет isLessonUnlockedByEarnedProgress ниже, и при отказе
    // они дают 'progress_required' (не пейвол) — requiresPremiumForLesson их не считает платными.
    if (isAlwaysOpenLesson(lessonId)) return 'available';
    if (await isTesterNoLimitsActive()) return decided(lessonId, 'available', 'tester', null);

    // The Free sample and exact pearl grants outrank subscription status.
    if (await isLessonUnlockedByEarnedProgress(lessonId, studyTarget)) return decided(lessonId, 'available', 'earned', null);

    const premium = await getVerifiedPremiumStatus().catch(noteSwallowedAs('lesson_premium_gate:promise_1', false));
    if (!premium) {
      return decided(lessonId, requiresPremiumForLesson(lessonId) ? 'premium_required' : 'progress_required', 'free_matrix', false);
    }
    // Plus: решение общей функции замка (все 32 открыты; откат — PLUS_OPENS_ALL_LESSONS), её же зовёт меню — охранник и меню не расходятся.
    if (!(await isLessonUnlockedByPremiumCourse(lessonId, studyTarget))) return decided(lessonId, 'progress_required', 'plus_matrix', true);
    return 'available';
  } catch (e) {
    // Ошибка чтения локального прогресса не может превращаться в доступ к уроку.
    // Немой catch запрещён: без причины такой отказ неотличим от «рано».
    console.warn('[LESSON-GATE] resolve:catch', JSON.stringify({
      lessonId,
      reason: e instanceof Error ? e.message : String(e),
    }));
    return decided(lessonId, 'progress_required', 'error', null);
  }
}

export async function shouldBlockPremiumLesson(lessonId: number, studyTarget?: RuntimeStudyTarget): Promise<boolean> {
  return (await resolveLessonRuntimeGate(lessonId, studyTarget)) === 'premium_required';
}

export async function shouldBlockLessonAccess(lessonId: number, studyTarget?: RuntimeStudyTarget): Promise<boolean> {
  return (await resolveLessonRuntimeGate(lessonId, studyTarget)) !== 'available';
}

/**
 * Последнее решение охранника lesson1 по уроку — чтобы меню при своём замке могло сверить, не разошлись ли два решения (Ревизор 3bed5434c: расхождение = риск петли по нажатиям).
 */
const lastGateDecisions = new Map<number, { gate: string; atMs: number; source?: 'list'; studyTarget?: string }>();

export function peekLessonGateDecision(lessonId: number): { gate: string; ageMs: number; source?: 'list' } | null {
  const saved = lastGateDecisions.get(lessonId);
  return saved ? { gate: saved.gate, ageMs: Date.now() - saved.atMs, ...(saved.source ? { source: saved.source } : {}) } : null;
}

/** Окно, в течение которого меню доверяет решению списка «урок открыт» (тап → меню занимает доли секунды). */
export const LESSON_LIST_DECISION_TRUST_MS = 60_000;

// зачем (координатор 28.10, видео пользователя 2.0.3: A1 8 из 8 на 3★, тап по пройденному уроку уводит на Главную или карту V2):
// список решал «открыт» по своим данным, а меню перепроверяло замок по ДРУГИМ ключам хранилища, решало «закрыто» и делало replace
// на вкладку — вкладки пересоздавались, человек видел Главную/карту V2 вместо урока. Решение списка теперь видно меню.
// зачем (🟡 Ревизора 29.10): решение хранится по номеру урока — без языка изучения после смены en↔es меню поверило бы чужому курсу
export function rememberLessonListDecision(lessonId: number, access: string, studyTarget: string): void {
  lastGateDecisions.set(lessonId, { gate: access, atMs: Date.now(), source: 'list', studyTarget });
}

/** Список только что открыл этот урок тапом (свежее решение «available»). */
export function lessonListJustOpened(lessonId: number, studyTarget: string): boolean {
  const saved = lastGateDecisions.get(lessonId);
  return saved !== undefined && saved.source === 'list' && saved.studyTarget === studyTarget && saved.gate === 'available'
    && Date.now() - saved.atMs < LESSON_LIST_DECISION_TRUST_MS;
}

export function openLessonAccessGate(
  router: any,
  lessonId: number,
  gate: string = 'unknown',
  decideMs: number | null = null,
): void {
  lastGateDecisions.set(lessonId, { gate, atMs: Date.now() });
  // decideMs (координатор 15.10): сколько мс охранник решал, прежде чем замок «выкинул» человека (один проход lesson1 → меню → список занимал ~5,3 с)
  console.log(`[LESSON-LOCK] access_gate → lesson_menu lessonId=${lessonId} gate=${gate} decideMs=${decideMs === null ? 'n/a' : decideMs}`); // guard-ok: звено цепочки lesson1 → lesson_menu (кто и с каким id зовёт переход)
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
  const gate = await resolveLessonRuntimeGate(lessonId, studyTarget).catch(noteSwallowedAs('lesson_premium_gate:promise_2', 'progress_required' as LessonRuntimeGate));
  if (gate === 'available') return;
  if (gate === 'premium_required') {
    openLessonPremiumPaywall(router, lessonId);
    return;
  }
  openLessonAccessGate(router, lessonId);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
