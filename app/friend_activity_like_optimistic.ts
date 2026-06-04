import type { FriendEvent } from './firestore_friend_activity';

export function normalizeActivityLikeCount(value: unknown): number {
  const count = Math.floor(Number(value ?? 0) || 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

export function bumpActivityLikeCount(events: FriendEvent[], targetUid: string, eventId: string): FriendEvent[] {
  return events.map(event =>
    event.uid === targetUid && event.id === eventId
      ? { ...event, activityLikeCount: normalizeActivityLikeCount(event.activityLikeCount) + 1 }
      : event,
  );
}

export function setActivityLikeCount(
  events: FriendEvent[],
  targetUid: string,
  eventId: string,
  count: unknown,
): FriendEvent[] {
  return events.map(event =>
    event.uid === targetUid && event.id === eventId
      ? { ...event, activityLikeCount: normalizeActivityLikeCount(count) }
      : event,
  );
}

export function rollbackActivityLikeCount(events: FriendEvent[], targetUid: string, eventId: string): FriendEvent[] {
  return events.map(event =>
    event.uid === targetUid && event.id === eventId
      ? { ...event, activityLikeCount: Math.max(0, normalizeActivityLikeCount(event.activityLikeCount) - 1) }
      : event,
  );
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
