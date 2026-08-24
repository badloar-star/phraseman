import type { PersonalOperation } from '../modules/phone-state/contracts';
import {
  assembleSegments,
  MAX_SEGMENT_BYTES,
  MAX_SEGMENT_OPERATIONS,
  personalSyncSegmentId,
  shouldSealOpenSegment,
} from '../modules/phone-state/segments';

const DEVICE_ID = 'device_0000000001';

function answerOperation(
  sequence: number,
  payload: unknown = { answer: `answer-${sequence}` },
): PersonalOperation {
  return {
    schemaVersion: 1,
    operationId: `${DEVICE_ID}:${sequence}`,
    stableUid: 'stable-1',
    accountGeneration: 1,
    deviceId: DEVICE_ID,
    deviceSequence: sequence,
    hybridClock: { counter: sequence, deviceId: DEVICE_ID },
    domain: 'answers',
    kind: 'answer',
    entityId: `question-${sequence}`,
    payload,
    exactResult: { accepted: true },
    createdAtMs: 1_000 + sequence,
    fingerprint: sequence.toString(16).padStart(64, '0'),
  };
}

function makeOperations(count: number): PersonalOperation[] {
  return Array.from({ length: count }, (_, index) => answerOperation(index + 1));
}

test('twenty answer operations seal as one lesson segment', async () => {
  const result = await assembleSegments(makeOperations(20), { reason: 'lesson_complete' });

  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    schemaVersion: 'personal-sync-segment.v1',
    stableUid: 'stable-1',
    accountGeneration: 1,
    deviceId: DEVICE_ID,
    firstSequence: 1,
    lastSequence: 20,
    operationCount: 20,
    createdAtMs: 1_020,
  });
  expect(result[0].byteSize).toBeLessThanOrEqual(MAX_SEGMENT_BYTES);
  expect(JSON.parse(result[0].payloadCanonical)).toHaveLength(20);
  expect(result[0].fingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect(personalSyncSegmentId(result[0])).toBe(`${DEVICE_ID}_0000000000000001`);
});

test('segments split before operation 51', async () => {
  const result = await assembleSegments(makeOperations(51), { reason: 'capacity' });

  expect(result).toHaveLength(2);
  expect(result.map((segment) => segment.operationCount)).toEqual([
    MAX_SEGMENT_OPERATIONS,
    1,
  ]);
  expect(result.map((segment) => [segment.firstSequence, segment.lastSequence])).toEqual([
    [1, 50],
    [51, 51],
  ]);
});

test('segments split before byte 65537 and preserve every operation once', async () => {
  const payload = { text: 'ж'.repeat(7_000) };
  const operations = Array.from(
    { length: 8 },
    (_, index) => answerOperation(index + 1, payload),
  );

  const segments = await assembleSegments(operations, { reason: 'capacity' });

  expect(segments.length).toBeGreaterThan(1);
  expect(segments.every((segment) => segment.byteSize <= MAX_SEGMENT_BYTES)).toBe(true);
  expect(segments.reduce((count, segment) => count + segment.operationCount, 0)).toBe(8);
  expect(segments.flatMap((segment) => JSON.parse(segment.payloadCanonical)))
    .toEqual(operations);
});

test('rejects one operation that cannot fit in an empty segment', async () => {
  const oversized = answerOperation(1, { text: 'x'.repeat(MAX_SEGMENT_BYTES) });

  await expect(assembleSegments([oversized], { reason: 'capacity' }))
    .rejects.toThrow('phone_state_operation_oversized');
});

test('rejects invalid device IDs, mixed scopes, and sequence gaps', async () => {
  await expect(assembleSegments([
    { ...answerOperation(1), deviceId: 'short' },
  ], { reason: 'capacity' })).rejects.toThrow('phone_state_segment_device_id_invalid');

  await expect(assembleSegments([
    answerOperation(1),
    { ...answerOperation(2), accountGeneration: 2 },
  ], { reason: 'capacity' })).rejects.toThrow('phone_state_segment_scope_mismatch');

  await expect(assembleSegments([
    answerOperation(1),
    answerOperation(3),
  ], { reason: 'capacity' })).rejects.toThrow('phone_state_segment_sequence_gap');
});

test.each([
  'lesson_complete',
  'exam_complete',
  'session_complete',
  'background',
] as const)('%s seals a non-empty open segment', (reason) => {
  expect(shouldSealOpenSegment({
    reason,
    operationCount: 1,
    byteSize: 100,
    openedAtMs: 0,
    nowMs: 1,
  })).toBe(true);
});

test('capacity and age triggers seal only when their boundary is reached', () => {
  expect(shouldSealOpenSegment({
    reason: 'operation_capacity',
    operationCount: MAX_SEGMENT_OPERATIONS,
    byteSize: 100,
    openedAtMs: 0,
    nowMs: 1,
  })).toBe(true);
  expect(shouldSealOpenSegment({
    reason: 'byte_capacity',
    operationCount: 1,
    byteSize: MAX_SEGMENT_BYTES,
    openedAtMs: 0,
    nowMs: 1,
  })).toBe(true);
  expect(shouldSealOpenSegment({
    reason: 'age_2m',
    operationCount: 1,
    byteSize: 100,
    openedAtMs: 1_000,
    nowMs: 120_999,
  })).toBe(false);
  expect(shouldSealOpenSegment({
    reason: 'age_2m',
    operationCount: 1,
    byteSize: 100,
    openedAtMs: 1_000,
    nowMs: 121_000,
  })).toBe(true);
});

test('empty segments never seal on lifecycle triggers', () => {
  expect(shouldSealOpenSegment({
    reason: 'background',
    operationCount: 0,
    byteSize: 0,
    openedAtMs: 0,
    nowMs: 10_000,
  })).toBe(false);
});
