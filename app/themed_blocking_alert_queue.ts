/**
 * Очередь блокирующих инфо-диалогов в стиле приложения (без системного Alert).
 * Используется из non-React кода (например flushCommunityModerationAlertsFromInbox).
 */

type Queued = { title: string; message: string; okLabel: string; resolve: () => void };

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
export function getThemedBlockingAlertHead(): Queued | null {
  return queue[0] ?? null;
}

/** Закрыть текущий диалог и разрешить Promise ожидания */
export function resolveThemedBlockingAlertHead(): void {
  const item = queue.shift();
  item?.resolve();
  notify();
}

export function enqueueThemedBlockingInfoAlert(
  title: string,
  message: string,
  okLabel: string
): Promise<void> {
  return new Promise((resolve) => {
    queue.push({ title, message, okLabel, resolve });
    notify();
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
