import { hasPermission, resolveAdminRole, type AdminPermission } from './permissions';

describe('admin permission matrix', () => {
  it('preserves legacy admin=true access without granting roles to ordinary users', () => {
    expect(resolveAdminRole({ admin: true })).toBe('admin');
    expect(resolveAdminRole({ admin: true, adminRole: 'owner' })).toBe('owner');
    expect(resolveAdminRole({ admin: false, adminRole: 'owner' })).toBeNull();
    expect(resolveAdminRole({ adminRole: 'admin' })).toBeNull();
  });

  it('allows content editors to manage drafts but not billing', () => {
    expect(hasPermission('content_editor', 'content.draft.write')).toBe(true);
    expect(hasPermission('content_editor', 'money.manual_access.write')).toBe(false);
  });

  it('allows support to inspect users but not mutate entitlements', () => {
    expect(hasPermission('support', 'users.read')).toBe(true);
    expect(hasPermission('support', 'money.manual_access.write')).toBe(false);
  });

  it('separates briefing and report read/write roles', () => {
    expect(hasPermission('analyst', 'briefing.read')).toBe(true);
    expect(hasPermission('analyst', 'briefing.generate')).toBe(false);
    expect(hasPermission('support', 'reports.read')).toBe(true);
    expect(hasPermission('support', 'reports.status.write')).toBe(true);
    expect(hasPermission('moderator', 'reports.status.write')).toBe(true);
    expect(hasPermission('developer', 'diagnostics.status.write')).toBe(true);
    expect(hasPermission('content_editor', 'reports.read')).toBe(false);
  });

  it('allows support operators to work the inbox but not resolve ambiguous delivery', () => {
    expect(hasPermission('support', 'support.inbox.read')).toBe(true);
    expect(hasPermission('support', 'support.inbox.pull')).toBe(true);
    expect(hasPermission('support', 'support.draft.write')).toBe(true);
    expect(hasPermission('support', 'support.reply.send')).toBe(true);
    expect(hasPermission('support', 'support.archive')).toBe(true);
    expect(hasPermission('support', 'support.settings.write')).toBe(true);
    expect(hasPermission('support', 'support.reply.resolve_ambiguous')).toBe(false);
    expect(hasPermission('owner', 'support.reply.resolve_ambiguous')).toBe(true);
    expect(hasPermission('admin', 'support.reply.resolve_ambiguous')).toBe(true);
  });

  it('keeps exact email contacts and campaigns restricted to owner/admin roles', () => {
    const emailPermissions: AdminPermission[] = [
      'emails.directory.read',
      'emails.directory.export',
      'emails.directory.backfill',
      'emails.campaigns.read',
      'emails.campaigns.write',
      'emails.campaigns.approve',
      'emails.campaigns.cancel',
    ];
    for (const permission of emailPermissions) {
      expect(hasPermission('owner', permission)).toBe(true);
      expect(hasPermission('admin', permission)).toBe(true);
      expect(hasPermission('support', permission)).toBe(false);
      expect(hasPermission('analyst', permission)).toBe(false);
    }
  });

  it('allows cache inspection broadly while keeping reset and Compass writes owner/admin only', () => {
    for (const role of ['owner', 'admin', 'content_editor', 'analyst', 'developer'] as const) {
      expect(hasPermission(role, 'content.cache.read')).toBe(true);
      expect(hasPermission(role, 'application.compass.read')).toBe(true);
    }
    expect(hasPermission('content_editor', 'content.cache.export')).toBe(true);
    expect(hasPermission('analyst', 'content.cache.export')).toBe(false);
    expect(hasPermission('developer', 'content.cache.reset')).toBe(false);
    expect(hasPermission('owner', 'content.cache.reset')).toBe(true);
    expect(hasPermission('admin', 'application.compass.write')).toBe(true);
    expect(hasPermission('content_editor', 'application.compass.write')).toBe(false);
  });

  it('allows owners to use every defined permission', () => {
    const permissions: AdminPermission[] = [
      'users.read', 'users.write', 'money.read', 'money.manual_access.write',
      'content.read', 'content.draft.write', 'content.publish', 'application.config.write',
      'diagnostics.read', 'community.moderate', 'admin.roles.write',
      'support.inbox.read', 'support.inbox.pull', 'support.draft.write',
      'support.reply.send', 'support.archive', 'support.settings.write',
      'support.reply.resolve_ambiguous',
      'briefing.read', 'briefing.generate', 'reports.read', 'reports.status.write',
      'reports.reply.draft', 'reports.reply.send', 'diagnostics.status.write',
      'emails.directory.read', 'emails.directory.export', 'emails.directory.backfill',
      'emails.campaigns.read', 'emails.campaigns.write', 'emails.campaigns.approve',
      'emails.campaigns.cancel',
      'content.cache.read', 'content.cache.export', 'content.cache.reset',
      'application.compass.read', 'application.compass.write', 'application.compass.approve',
    ];
    permissions.forEach(permission => expect(hasPermission('owner', permission)).toBe(true));
  });
});
