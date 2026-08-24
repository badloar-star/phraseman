import { HttpsError } from 'firebase-functions/v2/https';
import {
  GLOBAL_BROADCAST_PUBLIC_SCHEMA_HASH,
  inspectGlobalBroadcastPublicAuthority,
  requireGlobalBroadcastPublicAuthority,
} from './global_broadcast_public_schema';

describe('global broadcast public grant authority', () => {
  const valid = {
    publicPayloadSchemaVersion: 1,
    publicPayloadValidatedV1: true,
    active: true,
    rewardType: 'shards',
    rewardAmount: 10,
    titleRu: 'Public',
  };

  test('accepts only the exact server-validated public schema', () => {
    expect(inspectGlobalBroadcastPublicAuthority(valid)).toMatchObject({
      valid: true,
      schemaVersionValid: true,
      serverValidationValid: true,
      forbiddenKeys: [],
      unknownKeys: [],
    });
    expect(requireGlobalBroadcastPublicAuthority(valid)).toBe(valid);
    expect(GLOBAL_BROADCAST_PUBLIC_SCHEMA_HASH).toMatch(/^[a-f0-9]{64}$/);
  });

  test.each([
    ['unmarked', { active: true, rewardType: 'shards' }],
    ['marker-only', { publicPayloadSchemaVersion: 1, active: true, rewardType: 'shards' }],
    ['unknown field', { ...valid, internalNote: 'secret' }],
    ['forbidden field', { ...valid, createdBy: 'owner@example.com' }],
  ])('rejects %s first-grant authority', (_name, row) => {
    expect(() => requireGlobalBroadcastPublicAuthority(row)).toThrow(HttpsError);
  });
});
