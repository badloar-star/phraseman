import { hasVerifiedCallablePermission } from './permissions';

describe('verified callable admin permissions', () => {
  it('accepts Firebase callable auth with the required role permission', () => {
    expect(hasVerifiedCallablePermission({
      uid: 'admin-user',
      token: { admin: true, adminRole: 'analyst' },
    }, 'money.read')).toBe(true);
  });

  it('rejects a raw decoded-looking token that is not callable request.auth', () => {
    expect(hasVerifiedCallablePermission({ admin: true, adminRole: 'owner' }, 'money.read')).toBe(false);
  });

  it('rejects missing uid, missing claims, and unauthorized roles', () => {
    expect(hasVerifiedCallablePermission({ uid: '', token: { admin: true, adminRole: 'owner' } }, 'money.read')).toBe(false);
    expect(hasVerifiedCallablePermission({ uid: 'admin-user' }, 'money.read')).toBe(false);
    expect(hasVerifiedCallablePermission({
      uid: 'support-user',
      token: { admin: true, adminRole: 'support' },
    }, 'money.read')).toBe(false);
  });
});
