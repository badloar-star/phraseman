import * as emailUnsubscribe from './email_unsubscribe';

type RotationHelpers = {
  unsubscribeTokenWithSecret?: (email: string, secret: string) => string;
  verifyUnsubscribeTokenWithSecrets?: (
    email: string,
    token: string,
    currentSecret: string,
    previousSecret?: string,
  ) => boolean;
  resolveUnsubscribeRequest?: (input: {
    method: string;
    email: string;
    token: string;
    currentSecret: string;
    previousSecret?: string;
    persist: (email: string) => Promise<void>;
  }) => Promise<{ status: number; valid: boolean; persisted: boolean; email: string | null }>;
  validateMarketingEmailConfiguration?: (input: {
    unsubscribeSecret: string;
    unsubscribeBaseUrl: string;
    from: string;
  }) => { ok: boolean; error?: string };
};

const helpers = emailUnsubscribe as RotationHelpers;

describe('email unsubscribe secret rotation', () => {
  test('exports pure rotation helpers', () => {
    expect(typeof helpers.unsubscribeTokenWithSecret).toBe('function');
    expect(typeof helpers.verifyUnsubscribeTokenWithSecrets).toBe('function');
  });

  test('accepts tokens from the current and previous secrets only', () => {
    const tokenWith = helpers.unsubscribeTokenWithSecret!;
    const verifyWith = helpers.verifyUnsubscribeTokenWithSecrets!;
    const email = 'learner@example.com';

    const currentToken = tokenWith(email, 'new-secret');
    const previousToken = tokenWith(email, 'old-secret');
    const unrelatedToken = tokenWith(email, 'unrelated-secret');

    expect(verifyWith(email, currentToken, 'new-secret', 'old-secret')).toBe(true);
    expect(verifyWith(email, previousToken, 'new-secret', 'old-secret')).toBe(true);
    expect(verifyWith(email, unrelatedToken, 'new-secret', 'old-secret')).toBe(false);
    expect(verifyWith(email, previousToken, 'new-secret', '')).toBe(false);
  });

  test('does not report success when suppression persistence fails', async () => {
    const tokenWith = helpers.unsubscribeTokenWithSecret!;
    const resolve = helpers.resolveUnsubscribeRequest!;
    await expect(resolve({
      method: 'POST',
      email: 'learner@example.com',
      token: tokenWith('learner@example.com', 'current-secret'),
      currentSecret: 'current-secret',
      persist: async () => { throw new Error('firestore unavailable'); },
    })).resolves.toEqual({
      status: 503,
      valid: true,
      persisted: false,
      email: 'learner@example.com',
    });
  });

  test('fails closed for placeholder secrets, insecure URLs and sandbox senders', () => {
    const validate = helpers.validateMarketingEmailConfiguration!;
    const validLengthSecret = 'a'.repeat(40);
    expect(validate({ unsubscribeSecret: 'UNCONFIGURED', unsubscribeBaseUrl: 'https://example.com/u', from: 'Phraseman <mail@example.com>' }))
      .toEqual({ ok: false, error: 'email_unsubscribe_secret_not_configured' });
    expect(validate({ unsubscribeSecret: validLengthSecret, unsubscribeBaseUrl: 'http://example.com/u', from: 'Phraseman <mail@example.com>' }))
      .toEqual({ ok: false, error: 'email_unsubscribe_url_not_secure' });
    expect(validate({ unsubscribeSecret: validLengthSecret, unsubscribeBaseUrl: 'https://example.com/u', from: 'Phraseman <onboarding@resend.dev>' }))
      .toEqual({ ok: false, error: 'admin_email_sender_not_approved' });
    expect(validate({ unsubscribeSecret: validLengthSecret, unsubscribeBaseUrl: 'https://example.com/u', from: 'Phraseman <mail@example.com>' }))
      .toEqual({ ok: true });
  });
});
