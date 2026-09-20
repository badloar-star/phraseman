import { resolveArenaStudyTarget } from '../modules/arena/target_registry';

export type ArenaInviteRoute = '/arena' | Readonly<{
  pathname: '/arena_invite';
  params: Readonly<{ inviteId: string; studyTarget: 'en' | 'es' | 'fr' | 'de' }>;
}>;

/** External Arena capabilities are valid only when the payload names its target. */
export function arenaInviteRouteFromPayload(value: unknown): ArenaInviteRoute {
  const row = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const inviteId = typeof row.inviteId === 'string' ? row.inviteId.trim().slice(0, 256) : '';
  const studyTarget = resolveArenaStudyTarget(row.studyTarget);
  return inviteId && studyTarget
    ? { pathname: '/arena_invite', params: { inviteId, studyTarget } }
    : '/arena';
}

/* expo-router route shim: helper, not a screen */
export default function __ArenaNotificationRouteShim() { return null; }
