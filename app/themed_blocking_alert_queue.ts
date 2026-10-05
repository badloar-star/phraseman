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

type Queued = {
  title: string;
  message: string;
  actions: readonly ThemedBlockingAlertAction[];
  icon?: ThemedBlockingAlertIcon;
  resolve: (value: string) => void;
};

const queue: Queued[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
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
  item?.resolve(value);
  notify();
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
  opts?: { icon?: ThemedBlockingAlertIcon },
): Promise<V | typeof THEMED_ALERT_DISMISSED> {
  if (actions.length === 0) {
    console.warn('[THEMED-ALERT] choice без кнопок — окно не показано', JSON.stringify({ title })); // guard-ok: ранний выход логируется
    return Promise.resolve(THEMED_ALERT_DISMISSED);
  }
  return new Promise((resolve) => {
    queue.push({ title, message, actions, icon: opts?.icon, resolve: (value) => resolve(value as V | typeof THEMED_ALERT_DISMISSED) });
    notify();
  });
}

/** Только для тестов. */
export function __resetThemedBlockingAlertQueueForTests(): void {
  queue.length = 0;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
