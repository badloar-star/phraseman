// ═══════════════════════════════════════════════════════════════════════════
// streak_milestone_pending.ts — «рубеж серии наступил, но ещё не показан»: хранилище в памяти процесса + подписка.
//
// зачем (координатор 15.10, рубежи серии подключаются к настоящему событию роста серии): день засчитывается в streak_day_signal.markStreakDayCounted
// (первое учебное действие дня), а окно рубежа показывает ИТОГ урока/разговора — это другой момент во времени и другой экран. Здесь событие ждёт,
// пока экран итога его заберёт (consume). Празднование НЕ durable (ФУНДАМЕНТ владельца 01.09): ничего не пишется на диск, перезапуск приложения
// теряет невидимое поздравление, и это правильно; показ — только фактом (экран сверяет дату и число дней с текущим состоянием серии).
// Очередь окон на экране итога: сначала рубеж, потом остальное — `hold` (есть ожидающий или открытый рубеж) читают хосты других моментов.
// Журнал: [STREAK-MILESTONE].
// ═══════════════════════════════════════════════════════════════════════════
import { useSyncExternalStore } from 'react';
import { onAccountOwnerChanged } from './account_owner_change';

export type PendingStreakMilestone = Readonly<{ days: number; dayKey: string }>;

let pending: PendingStreakMilestone | null = null;
let openDays: number | null = null;
/** Уже показанные рубежи (день + число): один раз на рубеж за жизнь процесса. */
const shown = new Set<string>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of Array.from(listeners)) {
    try { listener(); } catch (error: unknown) {
      console.warn('[STREAK-MILESTONE] listener_failed', error instanceof Error ? error.message : String(error));
    }
  }
}

// зачем (LOGOUT_WIPE_AUDIT 15.10): память принадлежит владельцу — при смене аккаунта без перезапуска JS чужой рубеж не должен всплыть новому
onAccountOwnerChanged('streak_milestone_pending', () => { pending = null; openDays = null; shown.clear(); emit(); });

const keyOf = (days: number, dayKey: string): string => `${days}:${dayKey}`;

/** День засчитан и это рубеж: запоминаем до показа. Повтор того же рубежа в тот же день не ставится. */
export function noteStreakMilestonePending(days: number, dayKey: string): void {
  const key = keyOf(days, dayKey);
  if (shown.has(key)) {
    console.log(`[STREAK-MILESTONE] pending:skip already_shown key=${key}`);
    return;
  }
  pending = { days, dayKey };
  console.log(`[STREAK-MILESTONE] pending:set key=${key}`);
  emit();
}

export function peekStreakMilestonePending(): PendingStreakMilestone | null {
  return pending;
}

/** Забрать ожидающий рубеж и пометить показанным (один раз на рубеж). */
export function consumeStreakMilestonePending(): PendingStreakMilestone | null {
  const taken = pending;
  if (!taken) return null;
  pending = null;
  shown.add(keyOf(taken.days, taken.dayKey)); // guard-ok: Set в памяти, не запись данных
  console.log(`[STREAK-MILESTONE] pending:consumed key=${keyOf(taken.days, taken.dayKey)}`);
  emit();
  return taken;
}

/** Окно рубежа открыто (days) / закрыто (null) — другие моменты на этом экране ждут. */
export function markStreakMilestoneOpen(days: number | null): void {
  if (openDays === days) return;
  openDays = days;
  console.log(`[STREAK-MILESTONE] open=${String(days)}`);
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener); // guard-ok: подписка в памяти, не запись данных
  return () => { listeners.delete(listener); };
}

/** Ожидающий рубеж (стабильная ссылка между изменениями). */
export function useStreakMilestonePending(): PendingStreakMilestone | null {
  return useSyncExternalStore(subscribe, () => pending, () => null);
}

/** То же без хука (для проверок и не-React кода): есть ожидающий или открытый рубеж. */
export function isStreakMilestoneHold(): boolean {
  return pending !== null || openDays !== null;
}

/** Другие окна на экране итога ждут, пока есть ожидающий или открытый рубеж. */
export function useStreakMilestoneHold(): boolean {
  return useSyncExternalStore(subscribe, isStreakMilestoneHold, () => false);
}

/** dev-подмена streak=N (только __DEV__, app/dev_streak_milestone.ts): забыть «уже показано» в памяти и ожидающий рубеж, чтобы рубеж можно было вызвать повторно. */
export function resetStreakMilestoneForDev(): void {
  pending = null;
  shown.clear();
  console.log('[STREAK-MILESTONE] dev:reset память очищена');
  emit();
}

/** Только для тестов. */
export function __resetStreakMilestonePendingForTests(): void {
  pending = null;
  openDays = null;
  shown.clear();
  listeners.clear();
}
