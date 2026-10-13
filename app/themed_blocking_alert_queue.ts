/**
 * Очередь блокирующих инфо-диалогов в стиле приложения (без системного Alert).
 * Используется из non-React кода (например flushCommunityModerationAlertsFromInbox).
 */

// зачем (Сверка overlays-runtime 039–041, 05.10): у стадий аккаунта в макете плитка со значком (`.or-stage`, замок).
// Закладка — окно аварийной копии (038).
export type ThemedBlockingAlertIcon = 'lock-closed' | 'bookmark';

/** Кнопка окна: value возвращается вызывающему; ghost — прозрачная с кромкой (`.cta.gh`). */
export type ThemedBlockingAlertAction<V extends string = string> = Readonly<{ label: string; value: V; ghost?: boolean }>;

/** Системная «назад» закрывает окно без выбора. */
export const THEMED_ALERT_DISMISSED = 'dismiss' as const;

/**
 * зачем (ревью Ядра 2dba22af6, координатор 13.10): окно очереди ждёт слот арбитра без потолка; если слот держит модалка, которую
 * закрывает человек, вызывающий (вход → «Восстановить аккаунт?») ждёт молча. warnAfterMs — лог «кто держит слот»,
 * forceAfterMs — окно показывается поверх без слота. Без slotWait поведение прежнее.
 */
export type ThemedBlockingAlertSlotWait = Readonly<{ logPrefix: string; warnAfterMs: number; forceAfterMs: number }>;

type Queued = {
  title: string;
  message: string;
  actions: readonly ThemedBlockingAlertAction[];
  icon?: ThemedBlockingAlertIcon;
  resolve: (value: string) => void;
  /** Показать без слота арбитра (выставляется по потолку slotWait). */
  forceVisible?: boolean;
  enqueuedAt?: number;
  shownAt?: number;
  timers?: ReturnType<typeof setTimeout>[];
};

type HostState = Readonly<{ visible: boolean; arbiterActive: string | null; headTitle: string | null }>;

const queue: Queued[] = [];
const listeners = new Set<() => void>();
let hostState: HostState | null = null;

function notify() {
  listeners.forEach((l) => l());
}

function clearItemTimers(item: Queued | undefined): void {
  if (!item?.timers) return;
  item.timers.forEach((t) => clearTimeout(t));
  item.timers = undefined;
}

/**
 * Хост сообщает, видно ли окно-голова и кто держит слот арбитра. Нужен очереди для лога ожидания и чтобы не форсировать уже
 * показанное окно.
 */
export function noteThemedBlockingAlertHostState(state: HostState): void {
  hostState = state;
  const head = queue[0];
  if (state.visible && head && head.shownAt == null && state.headTitle === head.title) head.shownAt = Date.now();
}

function armSlotWait(item: Queued, slotWait: ThemedBlockingAlertSlotWait): void {
  const describe = () => JSON.stringify({
    title: item.title.slice(0, 48),
    waitedMs: Date.now() - (item.enqueuedAt ?? Date.now()),
    holder: hostState?.arbiterActive ?? 'none',
    hostSeen: hostState != null,
    queuePos: queue.indexOf(item),
  });
  const waiting = () => queue.includes(item) && item.shownAt == null;
  item.timers = [
    setTimeout(() => {
      // зачем: warn, а не log — релиз вырезает console.log (babel transform-remove-console), а эти строки нужны на телефоне.
      if (waiting()) console.warn(`${slotWait.logPrefix} waiting_slot ${describe()}`);
    }, slotWait.warnAfterMs),
    setTimeout(() => {
      if (!waiting()) return;
      item.forceVisible = true;
      console.warn(`${slotWait.logPrefix} slot_timeout_force_visible ${describe()}`);
      notify();
    }, slotWait.forceAfterMs),
  ];
}

export function subscribeThemedBlockingAlertQueue(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Первый элемент очереди или null */
export function getThemedBlockingAlertHead(): Readonly<Queued> | null {
  return queue[0] ?? null;
}

/** Закрыть текущий диалог; value — выбранная кнопка (по умолчанию «закрыто без выбора»). */
export function resolveThemedBlockingAlertHead(value: string = THEMED_ALERT_DISMISSED): void {
  const item = queue.shift();
  clearItemTimers(item);
  item?.resolve(value);
  notify();
}

// зачем (координатор 12.10, dev-состояния пейвола для съёмки): после dev-состояния окно (например «Покупка ждёт подтверждения») оставалось в очереди и перекрывало следующий кадр съёмки. Очистка — только для dev-путей.
export function clearThemedBlockingAlerts(reason: string): number {
  const count = queue.length;
  if (count === 0) return 0;
  console.log(`[THEMED-ALERT] очередь очищена reason=${reason} окон=${count}`); // guard-ok: очистка называет причину
  while (queue.length > 0) {
    const item = queue.shift();
    clearItemTimers(item);
    item?.resolve(THEMED_ALERT_DISMISSED);
  }
  notify();
  return count;
}

export function enqueueThemedBlockingInfoAlert(
  title: string,
  message: string,
  okLabel: string,
  opts?: { icon?: ThemedBlockingAlertIcon },
): Promise<void> {
  return new Promise((resolve) => {
    queue.push({ title, message, actions: [{ label: okLabel, value: 'ok' }], icon: opts?.icon, resolve: () => resolve() });
    notify();
  });
}

/**
 * зачем (Дизайн 05.10, макеты 014/038/039): окно с несколькими кнопками — «Проверить статус / Восстановить покупки»,
 * «Закрыть / Повторить». Возвращает value нажатой кнопки или THEMED_ALERT_DISMISSED.
 */
export function enqueueThemedBlockingChoiceAlert<V extends string>(
  title: string,
  message: string,
  actions: readonly ThemedBlockingAlertAction<V>[],
  opts?: { icon?: ThemedBlockingAlertIcon; slotWait?: ThemedBlockingAlertSlotWait },
): Promise<V | typeof THEMED_ALERT_DISMISSED> {
  if (actions.length === 0) {
    console.warn('[THEMED-ALERT] choice без кнопок — окно не показано', JSON.stringify({ title })); // guard-ok: ранний выход логируется
    return Promise.resolve(THEMED_ALERT_DISMISSED);
  }
  return new Promise((resolve) => {
    const item: Queued = {
      title,
      message,
      actions,
      icon: opts?.icon,
      enqueuedAt: Date.now(),
      resolve: (value) => resolve(value as V | typeof THEMED_ALERT_DISMISSED),
    };
    queue.push(item);
    if (opts?.slotWait) armSlotWait(item, opts.slotWait);
    notify();
  });
}

/** Только для тестов. */
export function __resetThemedBlockingAlertQueueForTests(): void {
  queue.forEach((item) => clearItemTimers(item));
  queue.length = 0;
  hostState = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
