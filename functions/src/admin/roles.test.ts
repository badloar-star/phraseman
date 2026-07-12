import { ADMIN_ROLES, hasAdminRole } from './roles';

describe('admin roles', () => {
  it('contains the least-privilege roles required by the admin design', () => {
    expect(ADMIN_ROLES).toEqual(expect.arrayContaining([
      'owner', 'admin', 'support', 'content_editor', 'moderator', 'analyst', 'developer',
    ]));
  });

  it('rejects unknown roles', () => {
    expect(hasAdminRole('intruder')).toBe(false);
    expect(hasAdminRole('support')).toBe(true);
  });
});
