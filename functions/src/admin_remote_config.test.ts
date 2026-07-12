import { HttpsError } from 'firebase-functions/v2/https';
import { assertNoProtectedCompassChanges, mergeRemoteConfigBranches, parseRemoteConfigRequest } from './admin_remote_config';

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
    expect(() => parseRemoteConfigRequest({
      nextConfig: { bools: 'not-an-object' }, expectedRevision: 0, idempotencyKey: 'op', reason: 'x', requestId: 'r',
    })).toThrow(HttpsError);
  });

  it('merges typed branches without deleting keys outside the submitted patch', () => {
    expect(mergeRemoteConfigBranches(
      { revision: 4, bools: { maintenance: false, referrals: true }, numbers: { freeLessons: 3 }, texts: { banner: 'old' }, untouched: 'keep' },
      { bools: { maintenance: true }, texts: { banner: 'new' } },
    )).toEqual({
      revision: 4,
      bools: { maintenance: true, referrals: true },
      numbers: { freeLessons: 3 },
      texts: { banner: 'new' },
      untouched: 'keep',
    });
  });

  it('rejects actual Compass key changes while allowing unchanged keys in a full branch', () => {
    const before = { bools: { compass_enabled: false, maintenance: false }, texts: { compass_voice_fallback_ru: 'old' } };
    expect(() => assertNoProtectedCompassChanges(before, { bools: { compass_enabled: false, maintenance: true } })).not.toThrow();
    expect(() => assertNoProtectedCompassChanges(before, { bools: { compass_enabled: true } })).toThrow(HttpsError);
    expect(() => assertNoProtectedCompassChanges(before, { texts: { compass_voice_fallback_ru: 'new' } })).toThrow(HttpsError);
  });
});
