// ═══════════════════════════════════════════════════════════════════════════
// my_packs_missing_cache.ts — кэш «набора нет» для «Моих наборов» и подписка на добавление набора НА УРОВНЕ МОДУЛЯ.
//
// зачем (Ревизор R44, координатор 15.10): подписка на `community_pack_added` жила только пока «Мои наборы» открыты, а кэш «набора нет» (30 мин) — на уровне модуля.
// Сценарий «открыл Мои → ушёл → добавил набор из видео → вернулся < 30 мин» давал скрытый набор: событие пришло, когда подписчика нет, кэш остался. Теперь подписка
// регистрируется при загрузке модуля и работает всё время жизни приложения: кэш сбрасывается в момент добавления, а id нового набора ждёт в памяти, пока экран его не заберёт.
// Журнал: [MY-PACKS].
// ═══════════════════════════════════════════════════════════════════════════
import { onAppEvent } from '../events';
import { MY_PACKS_MISSING_TTL_MS, MissingPackCache } from './myPacksDataIntegrity';

export const missingPackCache = new MissingPackCache(200, MY_PACKS_MISSING_TTL_MS);

let pendingAddedPackId: string | null = null;
const listeners = new Set<(packId: string) => void>();

/** Только что добавленный набор, который экран «Мои наборы» ещё не показал (или null). */
export function peekPendingAddedPackId(): string | null {
  return pendingAddedPackId;
}

export function clearPendingAddedPackId(): void {
  pendingAddedPackId = null;
}

/** Экран подписывается на добавление, пока он открыт (кэш и «ожидающий id» живут и без него). */
export function subscribeAddedPack(listener: (packId: string) => void): () => void {
  listeners.add(listener); // guard-ok: подписка в памяти, не запись данных
  return () => { listeners.delete(listener); };
}

/** Обработчик события добавления — вынесен ради теста. */
export function handlePackAdded(packId: string): void {
  missingPackCache.clear();
  pendingAddedPackId = packId;
  console.log(`[MY-PACKS] pack_added (module) pack=${packId} -> кэш «набора нет» сброшен, id ждёт экран, слушателей=${listeners.size}`); // guard-ok: событие добавления
  for (const listener of Array.from(listeners)) {
    try { listener(packId); } catch (error: unknown) {
      console.warn(`[MY-PACKS] added listener failed reason=${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Регистрация при загрузке модуля: живёт всё время работы приложения.
onAppEvent('community_pack_added', ({ packId }) => { handlePackAdded(packId); });
