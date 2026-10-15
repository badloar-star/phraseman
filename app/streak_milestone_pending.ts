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
import { useEffect, useSyncExternalStore, type ComponentType } from 'react';
import { onAccountOwnerChanged } from './account_owner_change';
import type { Lang } from '../constants/i18n';
// Пропсы окна рубежа повторены здесь, а не импортированы: в components/streak/moments ходят только разрешённые места (сторож v3).
type StreakMilestoneHostShape = Readonly<{ lang: Lang; onOpenChange?: (open: boolean) => void }>;

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

/**
 * Ленивая загрузка окна рубежа не удалась (R64 / слот #36): без этого рубеж оставался «ожидающим» навсегда — слот арбитра итога и другие окна
 * ждали вечно. Причина в журнал, рубеж считаем показанным, окно закрытым; возвращаем пустой компонент, чтобы экран итога не падал.
 * Использование: lazy(() => import('…/StreakMilestoneHost').catch(streakMilestoneHostLoadFailed)).
 */
export function streakMilestoneHostLoadFailed(error: unknown): { default: ComponentType<StreakMilestoneHostShape> } {
  console.warn('[STREAK-MILESTONE] host_load_failed', error instanceof Error ? error.message : String(error));
  consumeStreakMilestonePending();
  markStreakMilestoneOpen(null);
  return { default: StreakMilestoneHostUnavailable };
}

// зачем (Ревизор 15.10, 🟡 к edd75a0e3): React.lazy запоминает результат загрузки — после сбоя каждый следующий рубеж в этом процессе
// получает ту же заглушку, а помощник выше срабатывает лишь раз. Поэтому заглушка сама при КАЖДОМ показе забирает ожидающий рубеж и
// снимает удержание, иначе экран итога снова висел бы на milestoneHold.
function StreakMilestoneHostUnavailable(_props: StreakMilestoneHostShape): null {
  useEffect(() => {
    const pending = consumeStreakMilestonePending();
    markStreakMilestoneOpen(null);
    console.warn('[STREAK-MILESTONE] host_unavailable_release', JSON.stringify({ days: pending?.days ?? null }));
  }, []);
  return null;
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
