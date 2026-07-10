import { hasPermission, type AdminPermission } from './permissions';

describe('admin permission matrix', () => {
  it('allows content editors to manage drafts but not billing', () => {
    expect(hasPermission('content_editor', 'content.draft.write')).toBe(true);
    expect(hasPermission('content_editor', 'money.manual_access.write')).toBe(false);
  });

  it('allows support to inspect users but not mutate entitlements', () => {
    expect(hasPermission('support', 'users.read')).toBe(true);
    expect(hasPermission('support', 'money.manual_access.write')).toBe(false);
  });

  it('allows owners to use every defined permission', () => {
    const permissions: AdminPermission[] = [
      'users.read', 'users.write', 'money.read', 'money.manual_access.write',
      'content.read', 'content.draft.write', 'content.publish', 'application.config.write',
      'diagnostics.read', 'community.moderate', 'admin.roles.write',
    ];
    permissions.forEach(permission => expect(hasPermission('owner', permission)).toBe(true));
  });
});
