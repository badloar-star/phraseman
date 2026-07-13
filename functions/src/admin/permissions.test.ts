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

  it('keeps Plus survey and Telegram alert controls owner/admin only', () => {
    const permissions = [
      'application.review_promo.read', 'application.review_promo.write',
      'application.alerts.read', 'application.alerts.write', 'application.alerts.test',
    ] as const;
    for (const permission of permissions) {
      expect(hasPermission('owner', permission)).toBe(true);
      expect(hasPermission('admin', permission)).toBe(true);
      expect(hasPermission('analyst', permission)).toBe(false);
      expect(hasPermission('support', permission)).toBe(false);
    }
  });

  it('separates Voice research reading, export and mutation roles', () => {
    for (const role of ['owner', 'admin', 'support', 'moderator', 'analyst'] as const) {
      expect(hasPermission(role, 'users.research.read')).toBe(true);
    }
    expect(hasPermission('analyst', 'users.research.export')).toBe(true);
    expect(hasPermission('support', 'users.research.export')).toBe(false);
    expect(hasPermission('moderator', 'users.research.export')).toBe(false);
    expect(hasPermission('owner', 'users.research.write')).toBe(true);
    expect(hasPermission('admin', 'users.research.write')).toBe(true);
    expect(hasPermission('analyst', 'users.research.write')).toBe(false);
  });

  it('separates moderation queues, sensitive text, aggregates and dangerous actions', () => {
    expect(hasPermission('support', 'users.moderation.read')).toBe(true);
    expect(hasPermission('support', 'users.moderation.safety.read')).toBe(false);
    expect(hasPermission('support', 'users.moderation.sensitive.read')).toBe(false);
    expect(hasPermission('support', 'users.moderation.write')).toBe(false);

    expect(hasPermission('moderator', 'users.moderation.read')).toBe(true);
    expect(hasPermission('moderator', 'users.moderation.safety.read')).toBe(true);
    expect(hasPermission('moderator', 'users.moderation.sensitive.read')).toBe(true);
    expect(hasPermission('moderator', 'users.moderation.write')).toBe(true);
    expect(hasPermission('moderator', 'users.moderation.identity.write')).toBe(false);
    expect(hasPermission('moderator', 'users.moderation.ban.write')).toBe(false);

    expect(hasPermission('analyst', 'users.moderation.aggregate.read')).toBe(true);
    expect(hasPermission('analyst', 'users.moderation.read')).toBe(false);
    expect(hasPermission('analyst', 'users.moderation.safety.read')).toBe(false);
    expect(hasPermission('analyst', 'users.moderation.export')).toBe(false);

    for (const role of ['owner', 'admin'] as const) {
      for (const permission of [
        'users.moderation.read', 'users.moderation.safety.read', 'users.moderation.sensitive.read',
        'users.moderation.aggregate.read', 'users.moderation.export', 'users.moderation.write',
        'users.moderation.identity.write', 'users.moderation.ban.write', 'users.moderation.approve',
        'users.moderation.restore',
      ] as const) expect(hasPermission(role, permission)).toBe(true);
    }

    for (const role of ['content_editor', 'developer'] as const) {
      expect(hasPermission(role, 'users.moderation.read')).toBe(false);
      expect(hasPermission(role, 'users.moderation.aggregate.read')).toBe(false);
    }
  });

  it('separates Money inspection, export, mutations and approval', () => {
    expect(hasPermission('analyst', 'money.read')).toBe(true);
    expect(hasPermission('analyst', 'money.export')).toBe(true);
    expect(hasPermission('analyst', 'money.refunds.write')).toBe(false);
    expect(hasPermission('analyst', 'money.payment_orders.write')).toBe(false);
    expect(hasPermission('analyst', 'money.payment_config.write')).toBe(false);
    expect(hasPermission('analyst', 'money.approve')).toBe(false);

    for (const role of ['owner', 'admin'] as const) {
      expect(hasPermission(role, 'money.export')).toBe(true);
      expect(hasPermission(role, 'money.refunds.write')).toBe(true);
      expect(hasPermission(role, 'money.payment_orders.write')).toBe(true);
      expect(hasPermission(role, 'money.payment_config.write')).toBe(true);
      expect(hasPermission(role, 'money.approve')).toBe(true);
    }
  });

  it('lets content editors process reports without publishing or approving', () => {
    expect(hasPermission('content_editor', 'content.reports.write')).toBe(true);
    expect(hasPermission('content_editor', 'content.publish')).toBe(false);
    expect(hasPermission('content_editor', 'content.approve')).toBe(false);
    expect(hasPermission('owner', 'content.approve')).toBe(true);
    expect(hasPermission('admin', 'content.approve')).toBe(true);
  });

  it('separates Community help and chat moderation from Arena authority', () => {
    expect(hasPermission('support', 'community.help.read')).toBe(true);
    expect(hasPermission('support', 'community.help.write')).toBe(false);
    expect(hasPermission('support', 'community.read')).toBe(false);

    for (const permission of [
      'community.read', 'community.help.read', 'community.help.write', 'community.chat.write',
    ] as const) expect(hasPermission('moderator', permission)).toBe(true);

    expect(hasPermission('moderator', 'community.arena.write')).toBe(false);
    expect(hasPermission('moderator', 'community.arena.destructive')).toBe(false);
    expect(hasPermission('moderator', 'community.arena.economy.write')).toBe(false);
    expect(hasPermission('moderator', 'community.approve')).toBe(false);

    for (const role of ['owner', 'admin'] as const) {
      for (const permission of [
        'community.read', 'community.help.read', 'community.help.write', 'community.chat.write',
        'community.arena.write', 'community.arena.destructive',
        'community.arena.economy.write', 'community.approve',
      ] as const) expect(hasPermission(role, permission)).toBe(true);
    }
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
      'application.review_promo.read', 'application.review_promo.write',
      'application.alerts.read', 'application.alerts.write', 'application.alerts.test',
      'users.research.read', 'users.research.export', 'users.research.write',
      'users.moderation.read', 'users.moderation.safety.read', 'users.moderation.sensitive.read',
      'users.moderation.aggregate.read', 'users.moderation.export', 'users.moderation.write',
      'users.moderation.identity.write', 'users.moderation.ban.write', 'users.moderation.approve',
      'users.moderation.restore',
      'money.export', 'money.refunds.write', 'money.payment_orders.write',
      'money.payment_config.write', 'money.approve',
      'content.reports.write', 'content.approve',
      'community.read', 'community.help.read', 'community.help.write', 'community.chat.write',
      'community.arena.write', 'community.arena.destructive',
      'community.arena.economy.write', 'community.approve',
    ];
    permissions.forEach(permission => expect(hasPermission('owner', permission)).toBe(true));
  });
});
