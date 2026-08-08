import { HttpsError } from 'firebase-functions/v2/https';

export interface AdminPlansAuth {
  readonly uid?: string;
  readonly token?: Record<string, unknown>;
}

export interface AdminPlansOwner {
  readonly actorUid: string;
  readonly role: 'owner';
}

export function requireAdminPlansOwner(auth: AdminPlansAuth | null | undefined): AdminPlansOwner {
  const actorUid = typeof auth?.uid === 'string' ? auth.uid.trim() : '';
  if (!actorUid || auth?.token?.admin !== true || auth.token.adminRole !== 'owner') {
    throw new HttpsError('permission-denied', 'Owner admin claim required');
  }
  return Object.freeze({ actorUid, role: 'owner' });
}
