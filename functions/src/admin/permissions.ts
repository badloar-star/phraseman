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
  | 'admin.roles.write'
  | 'support.inbox.read'
  | 'support.inbox.pull'
  | 'support.draft.write'
  | 'support.reply.send'
  | 'support.archive'
  | 'support.settings.write'
  | 'support.reply.resolve_ambiguous';

const SUPPORT_OPERATOR_PERMISSIONS: readonly AdminPermission[] = [
  'support.inbox.read',
  'support.inbox.pull',
  'support.draft.write',
  'support.reply.send',
  'support.archive',
  'support.settings.write',
];

const ROLE_PERMISSIONS: Readonly<Record<AdminRole, ReadonlySet<AdminPermission>>> = {
  owner: new Set([
    'users.read', 'users.write', 'money.read', 'money.manual_access.write',
    'content.read', 'content.draft.write', 'content.publish', 'application.config.write',
    'diagnostics.read', 'community.moderate', 'admin.roles.write',
    ...SUPPORT_OPERATOR_PERMISSIONS, 'support.reply.resolve_ambiguous',
  ]),
  admin: new Set([
    'users.read', 'users.write', 'money.read', 'money.manual_access.write',
    'content.read', 'content.draft.write', 'content.publish', 'application.config.write',
    'diagnostics.read', 'community.moderate',
    ...SUPPORT_OPERATOR_PERMISSIONS, 'support.reply.resolve_ambiguous',
  ]),
  support: new Set(['users.read', 'diagnostics.read', ...SUPPORT_OPERATOR_PERMISSIONS]),
  content_editor: new Set(['content.read', 'content.draft.write']),
  moderator: new Set(['users.read', 'community.moderate']),
  analyst: new Set(['users.read', 'money.read', 'content.read', 'diagnostics.read']),
  developer: new Set(['content.read', 'diagnostics.read']),
};

export function hasPermission(role: unknown, permission: AdminPermission): boolean {
  return hasAdminRole(role) && ROLE_PERMISSIONS[role].has(permission);
}
