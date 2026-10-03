// ════════════════════════════════════════════════════════════════════════════
// storage_mutation_bus.ts — шина уведомлений о записях в AsyncStorage (§122)
//
// зачем: снапшот (storage_snapshot.ts) обязан узнавать о КАЖДОЙ записи, чтобы не отдать устаревшее значение. Охрана
// async_storage_null_bind_guard оборачивает мутаторы AsyncStorage и публикует сюда события; снапшот подписывается здесь,
// НЕ импортируя охрану: импорт охраны самоустанавливает обёртки, а значит ломал бы любой тест, мокающий AsyncStorage.
// Пока охрана не поставила слежение (isMutationTrackingActive() === false), снапшот работает как прозрачная прослойка без памяти.
// ════════════════════════════════════════════════════════════════════════════

export type StorageMutationEvent = Readonly<{ phase: 'start' | 'end'; keys: readonly string[] | 'all' }>;

const listeners = new Set<(event: StorageMutationEvent) => void>();
let trackingActive = false;

export function subscribeStorageMutations(listener: (event: StorageMutationEvent) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function emitStorageMutation(event: StorageMutationEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.warn('[SNAPSHOT-RT] подписчик записи упал', error instanceof Error ? error.message : String(error));
    }
  }
}

export function markStorageMutationTrackingActive(): void {
  trackingActive = true;
}

export function isMutationTrackingActive(): boolean {
  return trackingActive;
}
