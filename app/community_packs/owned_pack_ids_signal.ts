// Сигнал «состав моих наборов изменился» (добавили или убрали) — без импортов, чтобы хранилище и хук не зависели друг от друга по кругу.
// зачем (аудит кнопок Карточек #14/#15, R47): строки видео-наборов и экран ролика узнают «этот набор уже у меня» из локальных id и обновляются сразу после добавления/«убрать из моих».
const listeners = new Set<() => void>();
let version = 0;

export function ownedPackIdsVersion(): number {
  return version;
}

export function notifyOwnedPackIdsChanged(): void {
  version += 1;
  for (const listener of Array.from(listeners)) {
    try { listener(); } catch (error: unknown) {
      console.warn(`[PACK-OWNED] listener failed reason=${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export function subscribeOwnedPackIdsChanged(listener: () => void): () => void {
  listeners.add(listener); // guard-ok: подписка в памяти, не запись данных
  return () => { listeners.delete(listener); };
}
