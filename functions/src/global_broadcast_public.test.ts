import { HttpsError } from 'firebase-functions/v2/https';
import {
  buildGlobalBroadcastPublicListResult,
  normalizeGlobalBroadcastPublicListLimit,
  projectGlobalBroadcastPublicRow,
} from './global_broadcast_public';

const safe = {
  publicPayloadSchemaVersion: 1,
  publicPayloadValidatedV1: true,
  active: true,
  rewardType: 'none',
  rewardAmount: 0,
  createdAtMs: 1_800_000_000_000,
  titleRu: 'Публично',
  messageRu: 'Только публичные данные',
};

describe('authenticated global broadcast public projection', () => {
  test('projects only the exact shared public allowlist and rejects invalid authority', () => {
    expect(projectGlobalBroadcastPublicRow('safe-id', safe)).toEqual({ id: 'safe-id', ...safe });
    expect(() => projectGlobalBroadcastPublicRow('unsafe-id', { ...safe, internalNote: 'secret' })).toThrow(HttpsError);
    expect(() => projectGlobalBroadcastPublicRow('unmarked', { active: true, titleRu: 'legacy' })).toThrow(HttpsError);
  });

  test('uses cap plus sentinel health and never emits raw invalid rows', () => {
    const complete = buildGlobalBroadcastPublicListResult([
      { id: 'older', data: { ...safe, createdAtMs: 100 } },
      { id: 'latest', data: { ...safe, createdAtMs: 200 } },
    ], 20, 300);
    expect(complete).toMatchObject({
      ok: true,
      items: [{ id: 'latest' }, { id: 'older' }],
      truncated: false,
      sourceHealth: { state: 'ready', complete: true, truncated: false, droppedCount: 0 },
    });

    const capped = buildGlobalBroadcastPublicListResult(
      Array.from({ length: 21 }, (_, index) => ({ id: `row-${index}`, data: { ...safe, createdAtMs: index } })),
      20,
      300,
    );
    expect(capped).toMatchObject({
      items: expect.any(Array), truncated: true,
      sourceHealth: { state: 'partial', complete: false, truncated: true },
    });
    expect((capped.items as unknown[]).length).toBe(20);

    const invalid = buildGlobalBroadcastPublicListResult([
      { id: 'safe-id', data: safe },
      { id: 'unsafe-id', data: { ...safe, createdBy: 'owner@example.com' } },
    ], 20, 300);
    expect(invalid).toMatchObject({
      items: [{ id: 'safe-id' }],
      sourceHealth: { state: 'error', complete: false, droppedCount: 1 },
    });
    expect(JSON.stringify(invalid)).not.toContain('owner@example.com');
  });

  test('normalizes a conservative server cap', () => {
    expect(normalizeGlobalBroadcastPublicListLimit(undefined)).toBe(20);
    expect(normalizeGlobalBroadcastPublicListLimit(4)).toBe(4);
    expect(normalizeGlobalBroadcastPublicListLimit(999)).toBe(20);
  });
});
