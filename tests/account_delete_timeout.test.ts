import {
  ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS,
  ACCOUNT_DELETE_FUNCTION_TIMEOUT_MS,
  ACCOUNT_DELETE_TIMEOUT_SAFETY_MARGIN_MS,
} from '../app/account_delete_timeout';

describe('account deletion timeout contract', () => {
  it('does not let the client give up while the backend deletion is still expected to run', () => {
    expect(ACCOUNT_DELETE_FUNCTION_TIMEOUT_MS).toBe(540_000);
    expect(ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS).toBeGreaterThan(60_000);
    expect(ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS).toBeLessThan(ACCOUNT_DELETE_FUNCTION_TIMEOUT_MS);
    expect(ACCOUNT_DELETE_FUNCTION_TIMEOUT_MS - ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS)
      .toBeGreaterThanOrEqual(ACCOUNT_DELETE_TIMEOUT_SAFETY_MARGIN_MS);
  });
});
