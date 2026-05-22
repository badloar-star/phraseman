import {
  ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS,
  ACCOUNT_DELETE_FUNCTION_TIMEOUT_MS,
  ACCOUNT_DELETE_TIMEOUT_SAFETY_MARGIN_MS,
} from '../app/account_delete_timeout';

describe('account deletion timeout contract', () => {
  it('keeps the client waiting longer than the backend function timeout', () => {
    expect(ACCOUNT_DELETE_FUNCTION_TIMEOUT_MS).toBe(540_000);
    expect(ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS).toBeGreaterThan(ACCOUNT_DELETE_FUNCTION_TIMEOUT_MS);
    expect(ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS - ACCOUNT_DELETE_FUNCTION_TIMEOUT_MS)
      .toBeGreaterThanOrEqual(ACCOUNT_DELETE_TIMEOUT_SAFETY_MARGIN_MS);
  });
});
