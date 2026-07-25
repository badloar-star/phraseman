import { hasClaimedPermission, hasPermission, type AdminPermission } from './permissions';

describe('admin permission matrix', () => {
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

  it('allows owners to use every defined permission', () => {
    const permissions: AdminPermission[] = [
      'users.read', 'users.write', 'users.auth_repair', 'users.message.write',
      'money.read', 'money.manual_access.write',
      'content.read', 'content.draft.write', 'content.publish', 'application.config.write',
      'diagnostics.read', 'community.moderate', 'admin.roles.write',
      'support.inbox.read', 'support.inbox.pull', 'support.draft.write',
      'support.reply.send', 'support.archive', 'support.settings.write',
      'support.reply.resolve_ambiguous',
      'briefing.read', 'briefing.generate', 'reports.read', 'reports.status.write',
      'reports.reply.draft', 'reports.reply.send', 'diagnostics.status.write',
      'ideas.read', 'ideas.decide',
    ];
    permissions.forEach(permission => expect(hasPermission('owner', permission)).toBe(true));
  });

  // зачем: ручной список выше уже один раз разъехался с реальной матрицей — четыре новых
  // права (users.auth_repair, users.message.write, ideas.*) добавили в permissions.ts, а
  // сюда забыли, и тесты остались зелёными. Сверяем список с ТИПОМ через ALL_PERMISSIONS:
  // забудешь дописать — упадёт компиляция или этот тест, а не прод.
  it('keeps the owner permission list in sync with the AdminPermission type', () => {
    // Каждый ключ = одно право из union; TS не даст ни пропустить, ни выдумать лишнее.
    const exhaustive: Record<AdminPermission, true> = {
      'users.read': true, 'users.write': true, 'users.auth_repair': true,
      'users.message.write': true,
      'money.read': true, 'money.manual_access.write': true,
      'content.read': true, 'content.draft.write': true, 'content.publish': true,
      'application.config.write': true, 'campaigns.read': true, 'campaigns.write': true,
      'diagnostics.read': true, 'community.moderate': true, 'admin.roles.write': true,
      'support.inbox.read': true, 'support.inbox.pull': true, 'support.draft.write': true,
      'support.reply.send': true, 'support.archive': true, 'support.settings.write': true,
      'support.reply.resolve_ambiguous': true,
      'briefing.read': true, 'briefing.generate': true,
      'reports.read': true, 'reports.status.write': true,
      'reports.reply.draft': true, 'reports.reply.send': true,
      'diagnostics.status.write': true,
      'ideas.read': true, 'ideas.decide': true,
    };
    // owner обязан иметь ВСЁ: любое новое право без явного решения — дыра или мёртвый код.
    (Object.keys(exhaustive) as AdminPermission[]).forEach((permission) => {
      expect(hasPermission('owner', permission)).toBe(true);
    });
  });

  // зачем: новые права трогают чужие аккаунты (перепривязка auth, личные сообщения) и
  // судьбу идей — фиксируем, КОМУ они НЕ достались, чтобы расширение роли было осознанным.
  it('restricts auth repair and personal messaging to owner/admin only', () => {
    for (const role of ['owner', 'admin'] as const) {
      expect(hasPermission(role, 'users.auth_repair')).toBe(true);
      expect(hasPermission(role, 'users.message.write')).toBe(true);
    }
    // support видит юзеров, но НЕ перепривязывает вход и не пишет им лично.
    for (const role of ['support', 'moderator', 'analyst', 'developer', 'content_editor'] as const) {
      expect(hasPermission(role, 'users.auth_repair')).toBe(false);
      expect(hasPermission(role, 'users.message.write')).toBe(false);
    }
  });

  it('grants the ideas workflow to owner, admin and moderator only', () => {
    for (const role of ['owner', 'admin', 'moderator'] as const) {
      expect(hasPermission(role, 'ideas.read')).toBe(true);
      expect(hasPermission(role, 'ideas.decide')).toBe(true);
    }
    for (const role of ['support', 'analyst', 'developer', 'content_editor'] as const) {
      expect(hasPermission(role, 'ideas.read')).toBe(false);
      expect(hasPermission(role, 'ideas.decide')).toBe(false);
    }
  });
});

describe('claimed admin permissions', () => {
  it('allows money analytics only to claimed roles with money.read', () => {
    expect(hasClaimedPermission({ admin: true, adminRole: 'owner' }, 'money.read')).toBe(true);
    expect(hasClaimedPermission({ admin: true, adminRole: 'analyst' }, 'money.read')).toBe(true);
    expect(hasClaimedPermission({ admin: true, adminRole: 'support' }, 'money.read')).toBe(false);
    expect(hasClaimedPermission({ admin: true, adminRole: 'moderator' }, 'money.read')).toBe(false);
    expect(hasClaimedPermission({ admin: true, adminRole: 'developer' }, 'money.read')).toBe(false);
    expect(hasClaimedPermission({ admin: false, adminRole: 'owner' }, 'money.read')).toBe(false);
    expect(hasClaimedPermission({ admin: true }, 'money.read')).toBe(false);
  });
});
