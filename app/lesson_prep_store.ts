// ═══════════════════════════════════════════════════════════════════════════
// lesson_prep_store.ts — общее состояние «занятие готовится» для кнопок «Продолжить» (Главная) и «Начать» (вкладка «Уроки»).
//
// зачем (живой макет lesson-preparing-live.html, владелец утвердил; координатор 25.10): раньше кнопка только тускнела до 72 %, без слов и
// без хода, а при отказе Главная уводила на карту курса. Теперь запуск публикует здесь: началась подготовка (когда), «готово»
// (заливка дотягивается), конец (открыто / отказ). Кнопка подписывается и сама рисует ход; всё остальное на экране живое.
// Вид появляется не сразу, а через PREP_BUSY_SHOW_MS (обычно занятие уже собрано и кнопка ничего не ждёт) — это решает вид кнопки,
// здесь только факты. Журнал [PREP-CTA] — ветки и значения, которые их решили.
// ═══════════════════════════════════════════════════════════════════════════
import { useSyncExternalStore } from 'react';
import { prepOutcomeOf, type PrepOutcome } from '../components/lesson_prep/prep_cta_model';

const LOG = '[PREP-CTA]';

export type LessonPrepSource = 'home' | 'lessons';
export type LessonPrepState = Readonly<{
  source: LessonPrepSource;
  startedAt: number;
  /** Какое занятие готовится (для журнала сторожа); может не быть. */
  sessionTag?: string;
  /** Подготовка готова, идёт «дотягивание» заливки до перехода. */
  finishing: boolean;
}>;

let state: LessonPrepState | null = null;
// зачем (Ревизор 25.10, 🟡): синхронный бросок между beginLessonPrep и try оставлял «готовится» навсегда — «Продолжить» и «Начать» молчали
// до перезапуска. Сторож сбрасывает подготовку, которая висит дольше срока подготовки (12 с) с запасом на выход шторки.
export const LESSON_PREP_STUCK_RESET_MS = 20_000;
let stuckTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = (): void => listeners.forEach((l) => l());
const subscribe = (l: () => void): (() => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Сейчас готовится (любой источник) — для защиты от повторного тапа. */
export function isLessonPrepActive(): boolean {
  return state !== null;
}

export function peekLessonPrep(): LessonPrepState | null {
  return state;
}

/** Тап по кнопке запустил подготовку. Повторный вызов при идущей подготовке игнорируется (занятая кнопка ничего не запускает). */
export function beginLessonPrep(source: LessonPrepSource, now: number = Date.now(), sessionTag?: string): boolean {
  if (state) {
    console.log(LOG, 'begin:ignored', JSON.stringify({ reason: 'already_preparing', source: state.source, sinceStartMs: now - state.startedAt, askedBy: source })); // guard-ok: ранний выход с причиной
    return false;
  }
  state = { source, startedAt: now, finishing: false, ...(sessionTag ? { sessionTag } : {}) };
  console.log(LOG, 'begin', JSON.stringify({ source, sessionTag: sessionTag ?? null })); // guard-ok: одна строка на запуск
  armStuckReset(now);
  emit();
  return true;
}

function armStuckReset(startedAt: number): void {
  if (stuckTimer) clearTimeout(stuckTimer);
  stuckTimer = setTimeout(() => {
    stuckTimer = null;
    if (!state || state.startedAt !== startedAt) return;
    const stuck = state;
    state = null;
    console.warn('[V2-PREPARE] prep_state_stuck_reset', JSON.stringify({ reason: 'no_end_within_limit', source: stuck.source, sessionTag: stuck.sessionTag ?? null, finishing: stuck.finishing, stuckMs: Date.now() - stuck.startedAt })); // guard-ok: сброс зависшего состояния с причиной
    emit();
  }, LESSON_PREP_STUCK_RESET_MS);
}

/** Подготовка готова: заливка дотягивается, затем переход. */
export function markLessonPrepFinishing(): void {
  if (!state || state.finishing) return;
  state = { ...state, finishing: true };
  emit();
}

/** Конец подготовки: открыли занятие или отказ. Пишет, что увидел человек (ветка по времени). */
export function endLessonPrep(result: Readonly<{ ok: boolean; timedOut?: boolean; reason?: string }>, now: number = Date.now()): PrepOutcome | null {
  if (!state) {
    console.log(LOG, 'end:ignored', JSON.stringify({ reason: 'not_preparing' })); // guard-ok: ранний выход с причиной
    return null;
  }
  const elapsedMs = now - state.startedAt;
  const outcome = prepOutcomeOf({ elapsedMs, ok: result.ok, timedOut: result.timedOut === true });
  const source = state.source;
  state = null;
  if (stuckTimer) { clearTimeout(stuckTimer); stuckTimer = null; }
  console.log(LOG, 'end', JSON.stringify({ source, outcome, elapsedMs, ok: result.ok, timedOut: result.timedOut === true, reason: result.reason ?? null, shown: outcome === 'instant' ? 'кнопка не менялась' : outcome === 'timeout' || outcome === 'failed' ? 'кнопка вернулась, подсказка снизу, экран на месте' : 'ход дотянулся, переход' })); // guard-ok: итог для человека
  emit();
  return outcome;
}

/** Подписка для кнопки: состояние подготовки именно этого источника (или null). */
export function useLessonPrep(source: LessonPrepSource): LessonPrepState | null {
  const snap = useSyncExternalStore(subscribe, peekLessonPrep, peekLessonPrep);
  return snap && snap.source === source ? snap : null;
}

export function resetLessonPrepForTests(): void {
  state = null;
  if (stuckTimer) { clearTimeout(stuckTimer); stuckTimer = null; }
  listeners.forEach((l) => l());
}

/* expo-router: утилита, не экран */
export default function __LessonPrepStoreRouteShim() { return null; }
