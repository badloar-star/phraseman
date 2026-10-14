// ═══════════════════════════════════════════════════════════════════════════
// welcome_back_signal.ts — снимок «человек вернулся после долгого отсутствия» в памяти процесса (D193).
//
// зачем (координатор 14.10): корневой layout на старте и на возврате в приложение сначала оценивает winback по прошлой активности, а
// потом ПЕРЕЗАПИСЫВАЕТ её текущим временем (recordLastActive). Окно «С возвращением» решается позже — после первого кадра Главной —
// и увидело бы разрыв ~0. Поэтому recordLastActive перед перезаписью кладёт сюда прошлую активность, если разрыв не меньше порога.
// Только память: после перезапуска процесса снимка нет — значит, это возвращение уже засчитано (прошлая активность перезаписана).
// ═══════════════════════════════════════════════════════════════════════════
import { WELCOME_BACK_MIN_AWAY_MS } from './welcome_back_model';

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__ === true;

export type WelcomeBackReturnGap = Readonly<{ lastActiveMs: number; detectedAtMs: number; source: 'record_last_active' | 'dev' }>;

let pending: WelcomeBackReturnGap | null = null;
const listeners = new Set<(gap: WelcomeBackReturnGap | null) => void>();

function emit(): void {
  listeners.forEach((listener) => {
    try {
      listener(pending);
    } catch (error) {
      console.warn('[WELCOME-BACK] signal listener failed', String(error)); // guard-ok: catch пишет причину
    }
  });
}

/** Звать ПЕРЕД перезаписью прошлой активности: previousLastActiveMs — то, что лежало в хранилище. */
export function noteWelcomeBackReturnGap(previousLastActiveMs: number | null, nowMs: number): void {
  if (previousLastActiveMs === null || !Number.isFinite(previousLastActiveMs) || previousLastActiveMs <= 0) {
    if (IS_DEV) console.log(`[WELCOME-BACK] signal skip reason=no_previous_activity value=${String(previousLastActiveMs)}`); // guard-ok: ранний выход
    return;
  }
  const awayMs = nowMs - previousLastActiveMs;
  if (awayMs < WELCOME_BACK_MIN_AWAY_MS) {
    if (IS_DEV) console.log(`[WELCOME-BACK] signal skip reason=recent awayDays=${(awayMs / 86_400_000).toFixed(1)}`); // guard-ok: ранний выход
    return;
  }
  pending = { lastActiveMs: previousLastActiveMs, detectedAtMs: nowMs, source: 'record_last_active' };
  console.log(`[WELCOME-BACK] signal set awayDays=${(awayMs / 86_400_000).toFixed(1)} lastActive=${new Date(previousLastActiveMs).toISOString()}`); // guard-ok: одна строка на возвращение
  emit();
}

/** DEV: «человек не заходил N дней» — для превью и прогонов без недели ожидания (только dev-сборка). */
export function setDevWelcomeBackAwayDays(days: number | null, nowMs: number = Date.now()): boolean {
  if (!IS_DEV) {
    console.warn('[WELCOME-BACK] dev away: отклонено — не dev-сборка'); // guard-ok: ранний выход логируется
    return false;
  }
  pending = days !== null && Number.isFinite(days) && days > 0
    ? { lastActiveMs: nowMs - days * 86_400_000, detectedAtMs: nowMs, source: 'dev' }
    : null;
  console.log(`[WELCOME-BACK] dev away=${pending ? days : 'off'}`); // guard-ok: единичный лог dev-ссылки
  emit();
  return true;
}

export function peekWelcomeBackReturnGap(): WelcomeBackReturnGap | null {
  return pending;
}

/** Снять снимок, когда окно показано (или решено не показывать насовсем). */
export function clearWelcomeBackReturnGap(reason: string): void {
  if (!pending) return;
  console.log(`[WELCOME-BACK] signal cleared reason=${reason}`); // guard-ok: одна строка
  pending = null;
  emit();
}

export function subscribeWelcomeBackReturnGap(listener: (gap: WelcomeBackReturnGap | null) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
