import { hasAdminRole, type AdminRole } from './roles';

export type AdminPermission =
  | 'users.read'
  | 'users.write'
  | 'money.read'
  | 'money.manual_access.write'
  | 'content.read'
  | 'content.draft.write'
  | 'content.publish'
  | 'application.config.write'
  | 'diagnostics.read'
  | 'community.moderate'
  | 'admin.roles.write';

const ROLE_PERMISSIONS: Readonly<Record<AdminRole, ReadonlySet<AdminPermission>>> = {
  owner: new Set([
    'users.read', 'users.write', 'money.read', 'money.manual_access.write',
    'content.read', 'content.draft.write', 'content.publish', 'application.config.write',
    'diagnostics.read', 'community.moderate', 'admin.roles.write',
  ]),
  admin: new Set([
    'users.read', 'users.write', 'money.read', 'money.manual_access.write',
    'content.read', 'content.draft.write', 'content.publish', 'application.config.write',
    'diagnostics.read', 'community.moderate',
  ]),
  support: new Set(['users.read', 'diagnostics.read']),
  content_editor: new Set(['content.read', 'content.draft.write']),
  moderator: new Set(['users.read', 'community.moderate']),
  analyst: new Set(['users.read', 'money.read', 'content.read', 'diagnostics.read']),
  developer: new Set(['content.read', 'diagnostics.read']),
};

export function hasPermission(role: unknown, permission: AdminPermission): boolean {
  return hasAdminRole(role) && ROLE_PERMISSIONS[role].has(permission);
}
