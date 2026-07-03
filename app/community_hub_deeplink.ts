/**
 * Deep-link в хаб чатов (Help Board / чат лиги) из любого места приложения —
 * прежде всего из центра уведомлений на главной («X ответил на ваше сообщение»).
 *
 * Хаб — модалка внутри CommunityChatHubButton, роутером её не открыть, поэтому
 * лёгкий реестр слушателей: кнопка-хаб подписывается при монтировании, а если
 * ссылка пришла раньше (кнопка ещё не смонтирована) — она ждёт первого подписчика.
 */

export type CommunityHubDeepLink =
  | { tab: 'help'; topicId: string; commentId?: string }
  | { tab: 'league'; messageId: string };

type Listener = (link: CommunityHubDeepLink) => void;

let pendingLink: CommunityHubDeepLink | null = null;
const listeners = new Set<Listener>();

/** Открыть хаб чатов на нужной вкладке и позиции. */
export function openCommunityHub(link: CommunityHubDeepLink): void {
  if (listeners.size === 0) {
    pendingLink = link;
    return;
  }
  listeners.forEach((listener) => {
    try {
      listener(link);
    } catch {}
  });
}

export function subscribeCommunityHubDeepLink(listener: Listener): () => void {
  listeners.add(listener);
  if (pendingLink) {
    const link = pendingLink;
    pendingLink = null;
    try {
      listener(link);
    } catch {}
  }
  return () => {
    listeners.delete(listener);
  };
}
