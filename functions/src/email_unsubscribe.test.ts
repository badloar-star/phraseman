import * as emailUnsubscribe from './email_unsubscribe';

type RotationHelpers = {
  unsubscribeTokenWithSecret?: (email: string, secret: string) => string;
  verifyUnsubscribeTokenWithSecrets?: (
    email: string,
    token: string,
    currentSecret: string,
    previousSecret?: string,
  ) => boolean;
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
});
