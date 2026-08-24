export type FriendSocialMarkerKind = 'high_five' | 'study_invite' | 'duel_invite';

export type FriendSocialEvent = Readonly<{
  id: string;
  actorStableUid: string;
  kind: FriendSocialMarkerKind;
  createdAtMs: number;
  expiresAtMs?: number;
  inviteId?: string;
  notificationId?: string;
}>;

type NotificationLike = Readonly<{
  id: string;
  type: string;
  fromUid: string;
  createdAt: number;
  read?: boolean;
  nav?: { kind?: string; actorStableUid?: string; eventId?: string; action?: string; inviteId?: string } | null;
}>;

/** Один и тот же durable bell row питает маркер карточки — отдельного listener нет. */
export function friendSocialEventsFromNotifications(rows: readonly NotificationLike[]): FriendSocialEvent[] {
  return dedupeFriendEvents(rows.flatMap((row): FriendSocialEvent[] => {
    if (row.read === true) return [];
    const nav = row.nav;
    if (nav?.kind !== 'friend_event') return [];
    const actorStableUid = String(nav.actorStableUid || row.fromUid || '').trim();
    if (!actorStableUid) return [];
    const kind: FriendSocialMarkerKind | null = nav.action === 'high_five'
      ? 'high_five'
      : nav.action === 'study_invite'
        ? 'study_invite'
        : nav.action === 'duel_invite'
          ? 'duel_invite'
          : null;
    if (!kind) return [];
    const createdAtMs = Math.max(0, Number(row.createdAt) || 0);
    return [{
      id: String(nav.eventId || row.id),
      actorStableUid,
      kind,
      createdAtMs,
      ...(kind === 'duel_invite' ? { expiresAtMs: createdAtMs + 10 * 60 * 1_000 } : {}),
      ...(nav.inviteId ? { inviteId: String(nav.inviteId) } : {}),
      notificationId: row.id,
    }];
  }));
}

const MARKER_PRIORITY: Readonly<Record<FriendSocialMarkerKind, number>> = {
  high_five: 1,
  study_invite: 2,
  duel_invite: 3,
};

export function dedupeFriendEvents(events: readonly FriendSocialEvent[]): FriendSocialEvent[] {
  const byId = new Map<string, FriendSocialEvent>();
  for (const event of events) {
    const current = byId.get(event.id);
    if (!current || event.createdAtMs >= current.createdAtMs) byId.set(event.id, event);
  }
  return [...byId.values()];
}

function isMarkerActive(event: FriendSocialEvent, nowMs: number): boolean {
  return event.kind !== 'duel_invite'
    || typeof event.expiresAtMs !== 'number'
    || event.expiresAtMs > nowMs;
}

export function selectFriendMarker(
  events: readonly FriendSocialEvent[],
  nowMs: number = Date.now(),
): FriendSocialEvent | null {
  return dedupeFriendEvents(events)
    .filter((event) => isMarkerActive(event, nowMs))
    .sort((left, right) =>
      MARKER_PRIORITY[right.kind] - MARKER_PRIORITY[left.kind]
      || right.createdAtMs - left.createdAtMs
      || left.id.localeCompare(right.id))[0] ?? null;
}

export function acknowledgeMarker(
  events: readonly FriendSocialEvent[],
  eventId: string,
): FriendSocialEvent[] {
  return events.filter((event) => event.id !== eventId);
}

export function remainingDuelSeconds(event: FriendSocialEvent, nowMs: number = Date.now()): number {
  if (event.kind !== 'duel_invite' || typeof event.expiresAtMs !== 'number') return 0;
  return Math.max(0, Math.ceil((event.expiresAtMs - nowMs) / 1_000));
}

export function nextFriendMarkerExpiryMs(
  events: readonly FriendSocialEvent[],
  nowMs: number = Date.now(),
): number | null {
  let nearest: number | null = null;
  for (const event of events) {
    if (event.kind !== 'duel_invite' || typeof event.expiresAtMs !== 'number' || event.expiresAtMs <= nowMs) continue;
    nearest = nearest === null ? event.expiresAtMs : Math.min(nearest, event.expiresAtMs);
  }
  return nearest;
}

export default function __RouteShim() {
  return null;
}
