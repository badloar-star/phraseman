import { HttpsError } from 'firebase-functions/v2/https';
import { hasPermission, type AdminPermission } from '../admin/permissions';
import { hasAdminRole, type AdminRole } from '../admin/roles';

export interface AgentOfficeAuth {
  readonly uid?: string;
  readonly token?: Record<string, unknown>;
}

export interface AgentOfficeActor {
  readonly actorUid: string;
  readonly role: AdminRole;
}

function requireExplicitActor(auth: AgentOfficeAuth | null | undefined): AgentOfficeActor {
  const actorUid = typeof auth?.uid === 'string' ? auth.uid.trim() : '';
  if (!actorUid || auth?.token?.admin !== true) throw new HttpsError('permission-denied', 'Admin only');
  const claimedRole = auth.token.adminRole;
  if (!hasAdminRole(claimedRole)) throw new HttpsError('permission-denied', 'adminRole claim required');
  return Object.freeze({ actorUid, role: claimedRole });
}

export function requireAgentOfficeReader(auth: AgentOfficeAuth | null | undefined, permission: AdminPermission): AgentOfficeActor {
  const actor = requireExplicitActor(auth);
  if (!hasPermission(actor.role, permission)) throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
  return actor;
}

export function requireAgentOfficeOwner(auth: AgentOfficeAuth | null | undefined): AgentOfficeActor & { readonly role: 'owner' } {
  const actor = requireExplicitActor(auth);
  if (actor.role !== 'owner') throw new HttpsError('permission-denied', 'Owner only');
  return Object.freeze({ actorUid: actor.actorUid, role: 'owner' });
}
