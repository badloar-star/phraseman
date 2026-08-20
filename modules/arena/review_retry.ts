/**
 * Закрывает короткую гонку между показом результата и записью разбора.
 * Повтор строго один: это не опрос и не новый постоянный источник чтений.
 */
export async function arenaReadReviewWithRetry<T>(
  read: () => Promise<T | null>,
  wait: () => Promise<void>,
): Promise<T | null> {
  const first = await read();
  if (first !== null) return first;
  await wait();
  return read();
}
