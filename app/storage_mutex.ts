let _locked = false;
const _queue: (() => void)[] = [];

export function acquireStorageLock(): Promise<void> {
  return new Promise(resolve => {
    if (!_locked) { _locked = true; resolve(); }
    else _queue.push(resolve);
  });
}

export function releaseStorageLock(): void {
  const next = _queue.shift();
  if (next) next();
  else _locked = false;
}

export async function withStorageLock<T>(fn: () => Promise<T>): Promise<T> {
  await acquireStorageLock();
  try { return await fn(); }
  finally { releaseStorageLock(); }
}

export type StorageLockDeadlineResult<T> =
  | { completed: true; value: T }
  | { completed: false };

/**
 * Взять замок С ОГРАНИЧЕНИЕМ ПО ВРЕМЕНИ ожидания в очереди.
 *
 * зачем (владелец 2026-09-20, логи 14:58): `acquireStorageLock()` ждёт
 * ВЕЧНО — очередь без таймаута. Покупка диалога встала в эту
 * очередь и не вернулась вообще, а кнопка осталась мёртвой.
 *
 * Старый `withStorageLock` НЕ трогаем: его зовут сотни раз, и фоновым
 * очередям/миграциям ждать можно сколько угодно. Дедлайн нужен только
 * там, где за ожиданием стоит живой человек с нажатой кнопкой.
 *
 * Дедлайн режет ТОЛЬКО ожидание. Если замок уже взят — работа идёт
 * до конца и освобождает замок штатно, иначе половинчатая запись сломала бы
 * экономику хуже, чем зависание.
 */
export async function withStorageLockDeadline<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
): Promise<StorageLockDeadlineResult<T>> {
  if (!_locked) {
    _locked = true;
  } else {
    let resolveWait!: () => void;
    const waiter = new Promise<void>((resolve) => { resolveWait = resolve; });
    _queue.push(resolveWait);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const acquired = await Promise.race([
      waiter.then(() => true),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), Math.max(0, timeoutMs));
      }),
    ]);
    if (timer) clearTimeout(timer);
    if (!acquired) {
      // Снимаем СВОЙ слот из очереди, чтобы прошлое ожидание не съело
      // будущий release впустую (иначе замок завис бы уже ПО-НАСТОЯЩЕМУ).
      const i = _queue.indexOf(resolveWait);
      if (i >= 0) {
        _queue.splice(i, 1);
      } else {
        // Слот уже выдан гонкой между таймаутом и release — мы владеем замком
        // и обязаны его отдать, иначе он останется занят навсегда.
        void waiter.then(() => { releaseStorageLock(); });
      }
      return { completed: false };
    }
  }
  try { return { completed: true, value: await fn() }; }
  finally { releaseStorageLock(); }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
