let _locked = false;
const _queue: (() => void)[] = [];

/**
 * Аренда взятого замка. Непрозрачный объект: снаружи с ним ничего сделать
 * нельзя, кроме как передать вложенному вызову.
 */
export type StorageLockLease = Readonly<{ readonly __storageLockLease: unique symbol }>;

/**
 * Кто держит замок ПРЯМО СЕЙЧАС. WeakSet, а не флаг: аренда, пережившая свой
 * блок, автоматически перестаёт быть действительной и не откроет замок задним
 * числом.
 */
let activeStorageLockLeases = new WeakSet<object>();

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

/**
 * Замок с ВОЗМОЖНОСТЬЮ УНАСЛЕДОВАТЬ уже взятую аренду.
 *
 * зачем (владелец 2026-09-20, лог 19:17:10): покупка диалога за руны висела
 * вечно. `buyDialogAccessLocally` брала этот замок, внутри читала баланс, а
 * чтение баланса (`recoverProjection`) брало ЕГО ЖЕ заново — и вставало в
 * очередь за замком, который держит сам вызывающий. Классический самозахват:
 * `step 6 before_read_balance` в логе есть, `step 7` не наступает никогда.
 *
 * Дедлайн снаружи от этого не спасает ПО ПОСТРОЕНИЮ — он режет ожидание в
 * очереди, а здесь работа уже началась и висит внутри.
 *
 * Механизм НЕ новый: точная копия наследования у замка аккаунта
 * (`withAccountTransitionLock`), где этот же класс бага закрыли 20.09.
 * Один способ на оба замка — иначе следующая сессия будет чинить третий.
 *
 * Вызов БЕЗ аренды ведёт себя ровно как раньше, поэтому сотни существующих
 * точек вызова не затронуты.
 */
export async function withStorageLock<T>(
  fn: (lease: StorageLockLease) => Promise<T>,
  inheritedLease?: StorageLockLease,
): Promise<T> {
  if (inheritedLease && activeStorageLockLeases.has(inheritedLease)) {
    return fn(inheritedLease);
  }
  await acquireStorageLock();
  const lease = Object.freeze({}) as unknown as StorageLockLease;
  activeStorageLockLeases.add(lease);
  try { return await fn(lease); }
  finally {
    activeStorageLockLeases.delete(lease);
    releaseStorageLock();
  }
}

/** Только для тестов: сбросить выданные аренды между прогонами. */
export function __resetStorageLockLeasesForTests(): void {
  activeStorageLockLeases = new WeakSet<object>();
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
  // зачем: аренда выдаётся и здесь, иначе покупка (единственный вызов с
  // дедлайном) не смогла бы передать её вложенному чтению баланса — ровно
  // тот самозахват, из-за которого кнопка и была мёртвой.
  fn: (lease: StorageLockLease) => Promise<T>,
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
  const lease = Object.freeze({}) as unknown as StorageLockLease;
  activeStorageLockLeases.add(lease);
  try { return { completed: true, value: await fn(lease) }; }
  finally {
    activeStorageLockLeases.delete(lease);
    releaseStorageLock();
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
