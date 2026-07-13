import { hasAdminRole, type AdminRole } from './roles';

export type AdminPermission =
  | 'users.read'
  | 'users.write'
  | 'users.research.read'
  | 'users.research.export'
  | 'users.research.write'
  | 'users.moderation.read'
  | 'users.moderation.safety.read'
  | 'users.moderation.sensitive.read'
  | 'users.moderation.aggregate.read'
  | 'users.moderation.export'
  | 'users.moderation.write'
  | 'users.moderation.identity.write'
  | 'users.moderation.ban.write'
  | 'users.moderation.approve'
  | 'users.moderation.restore'
  | 'money.read'
  | 'money.manual_access.write'
  | 'content.read'
  | 'content.draft.write'
  | 'content.publish'
  | 'content.cache.read'
  | 'content.cache.export'
  | 'content.cache.reset'
  | 'application.compass.read'
  | 'application.compass.write'
  | 'application.compass.approve'
  | 'application.review_promo.read'
  | 'application.review_promo.write'
  | 'application.alerts.read'
  | 'application.alerts.write'
  | 'application.alerts.test'
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
  | 'diagnostics.status.write'
  | 'emails.directory.read'
  | 'emails.directory.export'
  | 'emails.directory.backfill'
  | 'emails.campaigns.read'
  | 'emails.campaigns.write'
  | 'emails.campaigns.approve'
  | 'emails.campaigns.cancel';

export function resolveAdminRole(token: Readonly<Record<string, unknown>> | null | undefined): AdminRole | null {
  if (token?.admin !== true) return null;
  return hasAdminRole(token.adminRole) ? token.adminRole : 'admin';
}

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

const EMAIL_ADMIN_PERMISSIONS: readonly AdminPermission[] = [
  'emails.directory.read',
  'emails.directory.export',
  'emails.directory.backfill',
  'emails.campaigns.read',
  'emails.campaigns.write',
  'emails.campaigns.approve',
  'emails.campaigns.cancel',
];

const CACHE_ADMIN_PERMISSIONS: readonly AdminPermission[] = [
  'content.cache.read',
  'content.cache.export',
  'content.cache.reset',
  'application.compass.read',
  'application.compass.write',
  'application.compass.approve',
];

const APPLICATION_OPERATIONS_PERMISSIONS: readonly AdminPermission[] = [
  'application.review_promo.read',
  'application.review_promo.write',
  'application.alerts.read',
  'application.alerts.write',
  'application.alerts.test',
];

const MODERATION_ADMIN_PERMISSIONS: readonly AdminPermission[] = [
  'users.moderation.read',
  'users.moderation.safety.read',
  'users.moderation.sensitive.read',
  'users.moderation.aggregate.read',
  'users.moderation.export',
  'users.moderation.write',
  'users.moderation.identity.write',
  'users.moderation.ban.write',
  'users.moderation.approve',
  'users.moderation.restore',
];

const ROLE_PERMISSIONS: Readonly<Record<AdminRole, ReadonlySet<AdminPermission>>> = {
  owner: new Set([
    'users.read', 'users.write', 'money.read', 'money.manual_access.write',
    'users.research.read', 'users.research.export', 'users.research.write',
    'content.read', 'content.draft.write', 'content.publish', 'application.config.write', 'campaigns.read', 'campaigns.write',
    'diagnostics.read', 'community.moderate', 'admin.roles.write',
    ...SUPPORT_OPERATOR_PERMISSIONS, 'support.reply.resolve_ambiguous',
    ...REPORT_OPERATOR_PERMISSIONS, ...BRIEFING_OPERATOR_PERMISSIONS, 'diagnostics.status.write',
    ...EMAIL_ADMIN_PERMISSIONS,
    ...CACHE_ADMIN_PERMISSIONS,
    ...APPLICATION_OPERATIONS_PERMISSIONS,
    ...MODERATION_ADMIN_PERMISSIONS,
  ]),
  admin: new Set([
    'users.read', 'users.write', 'money.read', 'money.manual_access.write',
    'users.research.read', 'users.research.export', 'users.research.write',
    'content.read', 'content.draft.write', 'content.publish', 'application.config.write', 'campaigns.read', 'campaigns.write',
    'diagnostics.read', 'community.moderate',
    ...SUPPORT_OPERATOR_PERMISSIONS, 'support.reply.resolve_ambiguous',
    ...REPORT_OPERATOR_PERMISSIONS, ...BRIEFING_OPERATOR_PERMISSIONS, 'diagnostics.status.write',
    ...EMAIL_ADMIN_PERMISSIONS,
    ...CACHE_ADMIN_PERMISSIONS,
    ...APPLICATION_OPERATIONS_PERMISSIONS,
    ...MODERATION_ADMIN_PERMISSIONS,
  ]),
  support: new Set(['users.read', 'users.research.read', 'users.moderation.read', 'diagnostics.read', ...SUPPORT_OPERATOR_PERMISSIONS, ...REPORT_OPERATOR_PERMISSIONS]),
  content_editor: new Set(['content.read', 'content.draft.write', 'content.cache.read', 'content.cache.export', 'application.compass.read']),
  moderator: new Set(['users.read', 'users.research.read', 'users.moderation.read', 'users.moderation.safety.read', 'users.moderation.sensitive.read', 'users.moderation.write', 'community.moderate', 'reports.read', 'reports.status.write']),
  analyst: new Set(['users.read', 'users.research.read', 'users.research.export', 'users.moderation.aggregate.read', 'money.read', 'content.read', 'content.cache.read', 'application.compass.read', 'campaigns.read', 'diagnostics.read', 'briefing.read', 'reports.read']),
  developer: new Set(['content.read', 'content.cache.read', 'application.compass.read', 'diagnostics.read', 'briefing.read', 'diagnostics.status.write']),
};

export function hasPermission(role: unknown, permission: AdminPermission): boolean {
  return hasAdminRole(role) && ROLE_PERMISSIONS[role].has(permission);
}
