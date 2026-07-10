import { HttpsError } from 'firebase-functions/v2/https';
import { parseRemoteConfigRequest } from './admin_remote_config';

describe('parseRemoteConfigRequest', () => {
  it('accepts the compatible remote-config shape', () => {
    expect(parseRemoteConfigRequest({
      nextConfig: { bools: { maintenance: false }, version: 2 },
      expectedRevision: 3,
      idempotencyKey: 'op-3',
      reason: 'Enable the reviewed release flag',
      requestId: 'req-3',
    })).toMatchObject({ expectedRevision: 3, idempotencyKey: 'op-3' });
  });

  it('rejects arbitrary document fields and stale revision values', () => {
    expect(() => parseRemoteConfigRequest({
      nextConfig: { secret: 'nope' }, expectedRevision: 0, idempotencyKey: 'op', reason: 'x', requestId: 'r',
    })).toThrow(HttpsError);
    expect(() => parseRemoteConfigRequest({
      nextConfig: { bools: {} }, expectedRevision: 1.5, idempotencyKey: 'op', reason: 'x', requestId: 'r',
    })).toThrow(HttpsError);
  });
});
