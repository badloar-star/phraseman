import type { LeagueChatMessage } from './firestore_league_chat';

export function isLeagueChatMessageVisibleInFeed(message: LeagueChatMessage): boolean {
  return message.status === 'visible'
    && !message.pinned
    && message.compassKind !== 'icebreaker'
    && message.compassKind !== 'daily_summary';
}
