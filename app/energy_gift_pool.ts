// energy_gift_pool.ts — «копилка подарков энергии» на устройстве (подарок друга, идея 9 «Друзей»; владелец 05.11: разрешить с лимитом).
// зачем: энергия живёт на телефоне и не синхронизируется (решение 21.10), подарок получает ОДНО устройство — то, где нажали «Забрать».
// Копилка — отдельный счётчик 0..3, НЕ запас: ENERGY_BASE_CAPACITY / бонус Пика / energy_state_v2 не меняются; тратится первой при старте занятия
// (подключение к точке траты — после подтверждения Ядра, см. docs/work/tasks/energy-gift-design-2026-11-05.md). Ключ лежит в стираемом семействе
// story_events_v1: — исчезает при выходе/удалении аккаунта. Подарок применяется ЛОКАЛЬНО сразу (Optimistic UI), сервер подтверждает фоном:
// журнал `pending` переживает падение между «забрал на сервере» и «зачислил на телефоне» — id подарка зачисляется один раз.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribeAccountGeneration } from './account_generation';

const LOG = '[ENERGY-GIFT]';
export const ENERGY_GIFT_POOL_MAX = 3;
const APPLIED_KEEP = 30;
export const energyGiftPoolKey = (owner: string): string => `story_events_v1:energy_gift_pool:${owner}`;

type PoolState = Readonly<{ pool: number; applied: readonly string[]; pending: readonly string[]; spent: readonly string[] }>;
const EMPTY: PoolState = { pool: 0, applied: [], pending: [], spent: [] };
const memory = new Map<string, PoolState>();
const listeners = new Set<(owner: string, pool: number) => void>();
let watching = false;

function watchAccountChanges(): void {
  if (watching) return;
  watching = true;
  subscribeAccountGeneration(() => { memory.clear(); console.log(LOG, 'pool_memory_reset account_changed'); }); // guard-ok: смена аккаунта
}

function normalize(raw: unknown): PoolState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(-APPLIED_KEEP) : []);
  const n = Number(o.pool);
  return { pool: Number.isFinite(n) ? Math.max(0, Math.min(ENERGY_GIFT_POOL_MAX, Math.trunc(n))) : 0, applied: ids(o.applied), pending: ids(o.pending), spent: ids(o.spent) };
}

function commit(owner: string, next: PoolState, reason: string): PoolState {
  const prev = memory.get(owner) ?? EMPTY;
  memory.set(owner, next); // мгновенно: UI и трата видят значение сразу, запись догоняет фоном
  void AsyncStorage.setItem(energyGiftPoolKey(owner), JSON.stringify(next)).catch((error: unknown) => {
    console.warn(LOG, 'pool_write_failed', reason, String((error as Error)?.message ?? error).slice(0, 120));
  });
  if (prev.pool !== next.pool) listeners.forEach((l) => { try { l(owner, next.pool); } catch (e) { console.warn(LOG, 'pool_listener_failed', String((e as Error)?.message ?? e).slice(0, 80)); } });
  console.log(LOG, 'pool', reason, JSON.stringify({ owner: owner.slice(0, 6), before: prev.pool, after: next.pool, pending: next.pending.length })); // guard-ok: одна строка на изменение
  return next;
}

export function subscribeGiftPool(listener: (owner: string, pool: number) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function peekGiftPool(owner: string): number {
  watchAccountChanges();
  return (memory.get(owner) ?? EMPTY).pool;
}

/** Читает копилку с диска один раз на аккаунт; память, изменённая за время чтения, свежее диска. */
export async function readGiftPool(owner: string): Promise<number> {
  watchAccountChanges();
  if (memory.has(owner)) return memory.get(owner)!.pool;
  try {
    const raw = await AsyncStorage.getItem(energyGiftPoolKey(owner));
    if (!memory.has(owner)) memory.set(owner, raw ? normalize(JSON.parse(raw)) : EMPTY);
    console.log(LOG, 'pool_read', JSON.stringify({ owner: owner.slice(0, 6), pool: memory.get(owner)!.pool, source: raw ? 'disk' : 'empty' })); // guard-ok: одна строка на чтение
  } catch (error: unknown) {
    console.warn(LOG, 'pool_read_failed → копилка 0', String((error as Error)?.message ?? error).slice(0, 120));
    if (!memory.has(owner)) memory.set(owner, EMPTY);
  }
  return memory.get(owner)!.pool;
}

export type ApplyGiftResult = 'applied' | 'duplicate' | 'full';

/** Зачисляет подарок СРАЗУ (до ответа сервера). Повтор того же giftId — 'duplicate', копилка полна — 'full' (подарок ждёт на сервере). */
export function applyGiftLocal(owner: string, giftId: string): ApplyGiftResult {
  watchAccountChanges();
  const cur = memory.get(owner) ?? EMPTY;
  if (cur.applied.includes(giftId)) { console.log(LOG, 'apply_skipped duplicate', giftId.slice(0, 8)); return 'duplicate'; } // guard-ok: ранний выход называет причину
  if (cur.pool >= ENERGY_GIFT_POOL_MAX) { console.log(LOG, 'apply_skipped pool_full', giftId.slice(0, 8)); return 'full'; } // guard-ok: ранний выход называет причину
  commit(owner, { pool: cur.pool + 1, applied: [...cur.applied, giftId].slice(-APPLIED_KEEP), pending: [...cur.pending, giftId], spent: cur.spent }, 'apply');
  return 'applied';
}

/** Сервер подтвердил «Забрать»: подарок больше не ждёт повторной отправки claim. */
export function confirmGift(owner: string, giftId: string): void {
  const cur = memory.get(owner) ?? EMPTY;
  if (!cur.pending.includes(giftId)) return;
  commit(owner, { ...cur, pending: cur.pending.filter((id) => id !== giftId) }, 'confirm');
}

/** Сервер отказал: откат ТОЛЬКО неподтверждённого локального зачисления (поздний отказ не трогает уже подтверждённое). */
export function rollbackGift(owner: string, giftId: string): boolean {
  const cur = memory.get(owner) ?? EMPTY;
  if (!cur.pending.includes(giftId)) { console.log(LOG, 'rollback_skipped not_pending', giftId.slice(0, 8)); return false; } // guard-ok: ранний выход называет причину
  commit(owner, { pool: Math.max(0, cur.pool - 1), applied: cur.applied.filter((id) => id !== giftId), pending: cur.pending.filter((id) => id !== giftId), spent: cur.spent }, 'rollback');
  return true;
}

/** Подарки, зачисленные локально, но не подтверждённые сервером (повторить claim при запуске — claim идемпотентен). */
export function pendingGiftIds(owner: string): readonly string[] {
  return (memory.get(owner) ?? EMPTY).pending;
}

/** Копилка сейчас (зеркало для журнала энергии: giftUnit = флаг && readGiftBank(owner) > 0). Синхронно, без записи. */
export function readGiftBank(owner: string): number {
  return peekGiftPool(owner);
}

/**
 * Тратит единицу копилки (первой, перед обычной энергией). false — копилка пуста.
 * зачем (Ядро 05.11, вариант B): реальное списание идёт внутри durable-операции журнала энергии; operationId делает трату
 * идемпотентной — повтор того же старта не списывает копилку второй раз (возвращает true без изменения).
 */
export function spendGiftUnit(owner: string, operationId?: string): boolean {
  watchAccountChanges();
  const cur = memory.get(owner) ?? EMPTY;
  if (operationId && cur.spent.includes(operationId)) { console.log(LOG, 'spend_skipped duplicate_op', operationId.slice(0, 8)); return true; } // guard-ok: повтор той же операции
  if (cur.pool <= 0) { console.log(LOG, 'spend_skipped pool_empty', operationId ? operationId.slice(0, 8) : '-'); return false; } // guard-ok: ранний выход называет причину
  commit(owner, { ...cur, pool: cur.pool - 1, spent: operationId ? [...cur.spent, operationId].slice(-APPLIED_KEEP) : cur.spent }, 'spend');
  return true;
}

/**
 * Возвращает в копилку единицу, потраченную операцией operationId (откат/возврат занятия). Идемпотентно: вернуть можно только
 * то, что потрачено этой операцией и ещё не возвращено; потолок ENERGY_GIFT_POOL_MAX не превышается.
 */
export function creditGiftUnit(owner: string, operationId: string): boolean {
  watchAccountChanges();
  const cur = memory.get(owner) ?? EMPTY;
  if (!cur.spent.includes(operationId)) { console.log(LOG, 'credit_skipped not_spent', operationId.slice(0, 8)); return false; } // guard-ok: нечего возвращать / уже возвращено
  commit(owner, { ...cur, pool: Math.min(ENERGY_GIFT_POOL_MAX, cur.pool + 1), spent: cur.spent.filter((id) => id !== operationId) }, 'credit');
  return true;
}

export function __resetEnergyGiftPoolForTests(): void { memory.clear(); listeners.clear(); }

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
