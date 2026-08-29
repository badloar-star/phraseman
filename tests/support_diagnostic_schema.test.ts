import {
  SUPPORT_DIAGNOSTIC_BUNDLE_MAX_BYTES,
  sanitizeSupportDiagnosticBundle,
  sanitizeSupportDiagnosticEvent,
} from '../app/support_diagnostic_schema';

describe('support diagnostic privacy schema', () => {
  const NOW = 2_000_000_000_000;

  it('keeps only allowlisted bounded fields', () => {
    expect(sanitizeSupportDiagnosticEvent({
      atMs: NOW,
      event: 'customization_purchase',
      screen: '/avatar_select',
      result: 'blocked',
      reason: 'insufficient_currency',
      subject: 'aura',
      durationMs: 412.8,
      action: 'avatar:purchase_confirm',
      email: 'person@example.com',
      uid: 'firebase-user-id',
      stack: 'Error at purchase()',
      tags: { price: 100 },
    })).toEqual({
      atMs: NOW,
      event: 'customization_purchase',
      screen: '/avatar_select',
      result: 'blocked',
      reason: 'insufficient_currency',
      subject: 'aura',
      durationMs: 413,
      action: 'avatar:purchase_confirm',
    });
  });

  it('keeps bounded static feature actions but rejects opaque identities', () => {
    expect(sanitizeSupportDiagnosticEvent({
      atMs: NOW,
      event: 'feature_action',
      action: 'friends:add_request_result',
      result: 'success',
    })).toEqual({
      atMs: NOW,
      event: 'feature_action',
      action: 'friends:add_request_result',
      result: 'success',
    });
    expect(sanitizeSupportDiagnosticEvent({
      atMs: NOW,
      event: 'feature_action',
      action: 'profile:AbCdEfGhIjKlMnOpQrStUvWx1234',
    })).toEqual({ atMs: NOW, event: 'feature_action' });
  });

  it('rejects free-form or identity-bearing values instead of redacting guesses', () => {
    expect(sanitizeSupportDiagnosticEvent({
      atMs: NOW,
      event: 'navigation',
      screen: '/profile/person@example.com',
      result: 'info',
    })).toEqual({ atMs: NOW, event: 'navigation', result: 'info' });

    expect(sanitizeSupportDiagnosticEvent({
      atMs: NOW,
      event: 'customization_purchase',
      reason: 'server said receipt abc-123 failed',
    })).toEqual({ atMs: NOW, event: 'customization_purchase' });

    expect(sanitizeSupportDiagnosticEvent({
      atMs: NOW,
      event: 'navigation',
      screen: '/profile/AbCdEfGhIjKlMnOpQrStUvWx1234',
    })).toEqual({ atMs: NOW, event: 'navigation' });
  });

  it('drops invalid events and returns a chronological capped bundle', () => {
    const events = Array.from({ length: 260 }, (_, index) => ({
      atMs: NOW - index,
      event: index === 17 ? 'raw_log' : 'navigation',
      screen: `/screen_${index}`,
      result: 'info',
    }));
    const bundle = sanitizeSupportDiagnosticBundle({
      version: 1,
      capturedAtMs: NOW,
      events,
      token: 'Bearer secret',
    });

    expect(bundle).not.toBeNull();
    expect(bundle?.events).toHaveLength(200);
    expect(bundle?.events.every((event) => event.event === 'navigation')).toBe(true);
    expect(bundle?.events[0].atMs).toBeLessThanOrEqual(bundle?.events.at(-1)?.atMs ?? 0);
    expect(Buffer.byteLength(JSON.stringify(bundle), 'utf8')).toBeLessThanOrEqual(
      SUPPORT_DIAGNOSTIC_BUNDLE_MAX_BYTES,
    );
    expect(bundle).not.toHaveProperty('token');
  });
});
