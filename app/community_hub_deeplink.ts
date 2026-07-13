/**
 * Deep-link into the Help Board modal from anywhere in the app.
 *
 * The modal lives inside CommunityChatHubButton rather than Expo Router, so this
 * small listener registry keeps early links until the button mounts.
 */

export type CommunityHubDeepLink = { tab: 'help'; topicId: string; commentId?: string };

type Listener = (link: CommunityHubDeepLink) => void;
type LegacyCommunityHubDeepLink = CommunityHubDeepLink | Record<string, unknown>;

let pendingLink: CommunityHubDeepLink | null = null;
const listeners = new Set<Listener>();

export function openCommunityHub(link: LegacyCommunityHubDeepLink): void {
  if (link.tab !== 'help') return;
  const helpLink: CommunityHubDeepLink = {
    tab: 'help',
    topicId: String(link.topicId || ''),
    commentId: typeof link.commentId === 'string' ? link.commentId : undefined,
  };
  if (!helpLink.topicId) return;

  if (listeners.size === 0) {
    pendingLink = helpLink;
    return;
  }
  listeners.forEach((listener) => {
    try {
      listener(helpLink);
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
