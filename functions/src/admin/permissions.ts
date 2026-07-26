import { hasAdminRole, type AdminRole } from './roles';

export type AdminPermission =
  | 'users.read'
  | 'users.write'
  | 'money.read'
  | 'money.manual_access.write'
  | 'content.read'
  | 'content.draft.write'
  | 'content.publish'
  | 'content.review'
  | 'application.config.write'
  | 'campaigns.read'
  | 'campaigns.write'
  | 'diagnostics.read'
  | 'community.moderate'
  | 'admin.roles.write'
  | 'support.inbox.read'
  | 'support.inbox.pull'
  | 'support.draft.write'
  | 'support.reply.send'
  | 'support.archive'
  | 'support.settings.write'
  | 'support.reply.resolve_ambiguous'
  | 'briefing.read'
  | 'briefing.generate'
  | 'reports.read'
  | 'reports.status.write'
  | 'reports.reply.draft'
  | 'reports.reply.send'
  | 'diagnostics.status.write';

const SUPPORT_OPERATOR_PERMISSIONS: readonly AdminPermission[] = [
  'support.inbox.read',
  'support.inbox.pull',
  'support.draft.write',
  'support.reply.send',
  'support.archive',
  'support.settings.write',
];

const REPORT_OPERATOR_PERMISSIONS: readonly AdminPermission[] = [
  'reports.read',
  'reports.status.write',
  'reports.reply.draft',
  'reports.reply.send',
];

const BRIEFING_OPERATOR_PERMISSIONS: readonly AdminPermission[] = [
  'briefing.read',
  'briefing.generate',
];

const ROLE_PERMISSIONS: Readonly<Record<AdminRole, ReadonlySet<AdminPermission>>> = {
  owner: new Set([
    'users.read', 'users.write', 'money.read', 'money.manual_access.write',
    'content.read', 'content.draft.write', 'content.publish', 'content.review', 'application.config.write', 'campaigns.read', 'campaigns.write',
    'diagnostics.read', 'community.moderate', 'admin.roles.write',
    ...SUPPORT_OPERATOR_PERMISSIONS, 'support.reply.resolve_ambiguous',
    ...REPORT_OPERATOR_PERMISSIONS, ...BRIEFING_OPERATOR_PERMISSIONS, 'diagnostics.status.write',
  ]),
  admin: new Set([
    'users.read', 'users.write', 'money.read', 'money.manual_access.write',
    'content.read', 'content.draft.write', 'content.publish', 'content.review', 'application.config.write', 'campaigns.read', 'campaigns.write',
    'diagnostics.read', 'community.moderate',
    ...SUPPORT_OPERATOR_PERMISSIONS, 'support.reply.resolve_ambiguous',
    ...REPORT_OPERATOR_PERMISSIONS, ...BRIEFING_OPERATOR_PERMISSIONS, 'diagnostics.status.write',
  ]),
  support: new Set(['users.read', 'diagnostics.read', ...SUPPORT_OPERATOR_PERMISSIONS, ...REPORT_OPERATOR_PERMISSIONS]),
  content_editor: new Set(['content.read', 'content.draft.write']),
  content_reviewer: new Set(['content.read', 'content.review']),
  moderator: new Set(['users.read', 'community.moderate', 'reports.read', 'reports.status.write']),
  analyst: new Set(['users.read', 'money.read', 'content.read', 'campaigns.read', 'diagnostics.read', 'briefing.read', 'reports.read']),
  developer: new Set(['content.read', 'diagnostics.read', 'briefing.read', 'diagnostics.status.write']),
};

export function hasPermission(role: unknown, permission: AdminPermission): boolean {
  return hasAdminRole(role) && ROLE_PERMISSIONS[role].has(permission);
}

// зачем: union слияния 26.07 — локальная линия (admin_daily_digest) зовёт
// hasClaimedPermission, GitHub-линия ввела hasVerifiedCallablePermission; живут обе.
export function hasClaimedPermission(token: unknown, permission: AdminPermission): boolean {
  if (!token || typeof token !== 'object') return false;
  const claims = token as { admin?: unknown; adminRole?: unknown };
  return claims.admin === true && hasPermission(claims.adminRole, permission);
}

/**
 * Minimal shape of Firebase Functions' server-verified callable auth context.
 * The onCall SDK validates the Firebase ID token before populating request.auth;
 * callers must pass `request.auth`, never a client header or request payload.
 */
export interface VerifiedCallableAuth {
  uid: string;
  token: Readonly<Record<string, unknown>>;
}

export function hasVerifiedCallablePermission(auth: unknown, permission: AdminPermission): boolean {
  if (!auth || typeof auth !== 'object') return false;
  const candidate = auth as { uid?: unknown; token?: unknown };
  if (typeof candidate.uid !== 'string' || candidate.uid.trim().length === 0) return false;
  if (!candidate.token || typeof candidate.token !== 'object') return false;
  const claims = candidate.token as { admin?: unknown; adminRole?: unknown };
  return claims.admin === true && hasPermission(claims.adminRole, permission);
}
