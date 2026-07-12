import { applyBetaTesterAction, parseBetaTesterUpdateRequest } from './admin_beta_testers';

describe('admin beta tester command', () => {
  test('keeps Nimbus ownership when beta status is removed', () => {
    const before = { progress: { beta_tester: 'true', avatar_aura_owned_v1: JSON.stringify({ aura_beta_nimbus: true }), user_avatar_aura: 'aura_beta_nimbus' } };
    const patch = applyBetaTesterAction(before, 'unset_beta', 1000);
    expect(patch['progress.beta_tester']).toBe('false');
    expect(patch).not.toHaveProperty('progress.avatar_aura_owned_v1');
    expect(patch).not.toHaveProperty('progress.user_avatar_aura');
  });

  test('requires a reason and idempotency data', () => {
    expect(() => parseBetaTesterUpdateRequest({ uid: 'stable-user', action: 'set_beta' })).toThrow('reason');
  });
});
