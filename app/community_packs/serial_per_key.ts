// ═════════════════════════════════════════════════════════════════════
// serial_per_key.ts — задачи с одним ключом идут строго по очереди, разные ключи — параллельно.
//
// зачем (аудит Optimistic UI «Шпиль и Сообщество», координатор 12.10): лайк набора — «прочитать локальный флаг →
// перевернуть → записать». Два быстрых тапа читали флаг ДО записи первого и оба ставили «лайк», а на экране
// сердце гасло: экран и хранилище расходились. Теперь второй тап ждёт первый и читает уже записанное.
// ═════════════════════════════════════════════════════════════════════
export type SerialPerKey = <T>(key: string, task: () => Promise<T>) => Promise<T>;

export function createSerialPerKey(): SerialPerKey {
  const tails = new Map<string, Promise<unknown>>();
  return <T>(key: string, task: () => Promise<T>): Promise<T> => {
    const previous = tails.get(key) ?? Promise.resolve();
    // Упавшая прошлая задача не должна останавливать очередь: её ошибку уже получил её собственный вызывающий.
    const run: Promise<T> = previous.then(
      () => task(),
      (error: unknown) => {
        console.warn(`[SERIAL] ${key}: прошлая задача упала (${error instanceof Error ? error.message : String(error)}) — идём дальше`); // guard-ok: причина пропуска
        return task();
      },
    );
    tails.set(key, run);
    const cleanup = () => { if (tails.get(key) === run) tails.delete(key); };
    run.then(cleanup, cleanup);
    return run;
  };
}
