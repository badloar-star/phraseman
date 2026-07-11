import { accountScopeKey } from '../app/account_scope_key';

describe('accountScopeKey', () => {
  it('serializes active account identity without object coercion', () => {
    expect(accountScopeKey({ generation: 3, stableId: 'alice', phase: 'active' }))
      .toBe('generation:3:uid:alice');
    expect(accountScopeKey({ generation: 3, stableId: 'bob', phase: 'active' }))
      .not.toBe('generation:3:uid:alice');
    expect(accountScopeKey({ generation: 4, stableId: 'alice', phase: 'active' }))
      .not.toBe('generation:3:uid:alice');
  });

  it('refuses cache scope while account identity is not active', () => {
    expect(accountScopeKey({ generation: 3, stableId: 'alice', phase: 'transitioning' })).toBeNull();
    expect(accountScopeKey({ generation: 0, stableId: null, phase: 'uninitialized' })).toBeNull();
  });
});
