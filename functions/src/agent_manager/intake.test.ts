import { HttpsError } from 'firebase-functions/v2/https';
import { inboxSourceRef, parseAgentManagerInboxRequest } from './intake';

describe('Agent Manager intake contract', () => {
  const key = 'k'.repeat(32);

  test('creates a stable opaque reference without preserving the raw source id', () => {
    const input = parseAgentManagerInboxRequest({ sourceType: 'support', sourceId: 'legacy-message-id_123', reportSource: null });
    const ref = inboxSourceRef(input, key);

    expect(ref).toMatch(/^support:sha256:[a-f0-9]{64}$/);
    expect(ref).not.toContain('legacy-message-id_123');
  });

  test('permits only known report sources and no client supplied task text', () => {
    expect(parseAgentManagerInboxRequest({ sourceType: 'report', sourceId: 'report_123', reportSource: 'app_errors' })).toMatchObject({ sourceType: 'report' });
    expect(() => parseAgentManagerInboxRequest({ sourceType: 'report', sourceId: 'report_123', reportSource: 'unknown' })).toThrow(HttpsError);
    expect(() => parseAgentManagerInboxRequest({ sourceType: 'support', sourceId: 'mail_123', reportSource: null, title: 'leak' })).toThrow(HttpsError);
  });

  test('requires a configured secret-sized HMAC key', () => {
    const input = parseAgentManagerInboxRequest({ sourceType: 'support', sourceId: 'mail_123', reportSource: null });
    expect(() => inboxSourceRef(input, 'short')).toThrow(HttpsError);
  });
});
