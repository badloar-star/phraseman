import { canonicalJson, operationFingerprint, utf8ByteLength } from './canonical';
import type { PersonalOperation } from './contracts';

export const MAX_SEGMENT_OPERATIONS = 50;
export const MAX_SEGMENT_BYTES = 64 * 1024;
export const MAX_OPEN_SEGMENT_AGE_MS = 2 * 60 * 1000;

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{16,80}$/;

export type PersonalSyncSegment = Readonly<{
  schemaVersion: 'personal-sync-segment.v1';
  stableUid: string;
  accountGeneration: number;
  deviceId: string;
  firstSequence: number;
  lastSequence: number;
  operationCount: number;
  byteSize: number;
  createdAtMs: number;
  payloadCanonical: string;
  fingerprint: string;
}>;

export type SegmentAssemblyReason =
  | 'capacity'
  | 'lesson_complete'
  | 'exam_complete'
  | 'session_complete'
  | 'background'
  | 'age_2m';

export type SegmentSealReason =
  | 'operation_capacity'
  | 'byte_capacity'
  | 'lesson_complete'
  | 'exam_complete'
  | 'session_complete'
  | 'background'
  | 'age_2m';

export type ShouldSealOpenSegmentInput = Readonly<{
  reason: SegmentSealReason;
  operationCount: number;
  byteSize: number;
  openedAtMs: number;
  nowMs: number;
}>;

const ASSEMBLY_REASONS = new Set<SegmentAssemblyReason>([
  'capacity',
  'lesson_complete',
  'exam_complete',
  'session_complete',
  'background',
  'age_2m',
]);

function isSafeIntegerAtLeast(value: unknown, minimum: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= minimum;
}

function validateOperationShape(operation: PersonalOperation): void {
  if (
    operation.schemaVersion !== 1
    || typeof operation.operationId !== 'string'
    || operation.operationId.length === 0
    || typeof operation.stableUid !== 'string'
    || operation.stableUid.length === 0
    || !isSafeIntegerAtLeast(operation.accountGeneration, 0)
    || !DEVICE_ID_PATTERN.test(operation.deviceId)
    || !isSafeIntegerAtLeast(operation.deviceSequence, 1)
    || operation.hybridClock.deviceId !== operation.deviceId
    || !isSafeIntegerAtLeast(operation.hybridClock.counter, 0)
    || typeof operation.domain !== 'string'
    || operation.domain.length === 0
    || typeof operation.kind !== 'string'
    || operation.kind.length === 0
    || (operation.entityId !== null && typeof operation.entityId !== 'string')
    || !isSafeIntegerAtLeast(operation.createdAtMs, 0)
    || !/^[a-f0-9]{64}$/.test(operation.fingerprint)
  ) {
    if (!DEVICE_ID_PATTERN.test(operation.deviceId)) {
      throw new Error('phone_state_segment_device_id_invalid');
    }
    throw new Error('phone_state_segment_operation_invalid');
  }
}

function canonicalOperation(operation: PersonalOperation): string {
  try {
    return canonicalJson(operation);
  } catch (error) {
    if (
      error instanceof Error
      && error.message === 'canonical output exceeds 65536 UTF-8 bytes'
    ) {
      throw new Error('phone_state_operation_oversized');
    }
    throw new Error('phone_state_segment_operation_invalid');
  }
}

async function sealSegment(
  operations: readonly PersonalOperation[],
  canonicalOperations: readonly string[],
): Promise<PersonalSyncSegment> {
  const first = operations[0];
  const last = operations[operations.length - 1];
  const payloadCanonical = `[${canonicalOperations.join(',')}]`;
  const byteSize = utf8ByteLength(payloadCanonical);
  if (byteSize > MAX_SEGMENT_BYTES) {
    throw new Error('phone_state_segment_oversized');
  }
  return Object.freeze({
    schemaVersion: 'personal-sync-segment.v1',
    stableUid: first.stableUid,
    accountGeneration: first.accountGeneration,
    deviceId: first.deviceId,
    firstSequence: first.deviceSequence,
    lastSequence: last.deviceSequence,
    operationCount: operations.length,
    byteSize,
    createdAtMs: last.createdAtMs,
    payloadCanonical,
    fingerprint: await operationFingerprint(operations),
  });
}

export function personalSyncSegmentId(
  segment: Pick<PersonalSyncSegment, 'deviceId' | 'firstSequence'>,
): string {
  if (
    !DEVICE_ID_PATTERN.test(segment.deviceId)
    || !isSafeIntegerAtLeast(segment.firstSequence, 1)
  ) {
    throw new Error('phone_state_segment_id_invalid');
  }
  return `${segment.deviceId}_${String(segment.firstSequence).padStart(16, '0')}`;
}

export async function assembleSegments(
  operations: readonly PersonalOperation[],
  options: Readonly<{ reason: SegmentAssemblyReason }>,
): Promise<readonly PersonalSyncSegment[]> {
  if (!ASSEMBLY_REASONS.has(options.reason)) {
    throw new Error('phone_state_segment_reason_invalid');
  }
  if (operations.length === 0) {
    return [];
  }

  const first = operations[0];
  validateOperationShape(first);
  const canonicalOperations: string[] = [];
  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index];
    validateOperationShape(operation);
    if (
      operation.stableUid !== first.stableUid
      || operation.accountGeneration !== first.accountGeneration
      || operation.deviceId !== first.deviceId
    ) {
      throw new Error('phone_state_segment_scope_mismatch');
    }
    if (
      index > 0
      && operation.deviceSequence !== operations[index - 1].deviceSequence + 1
    ) {
      throw new Error('phone_state_segment_sequence_gap');
    }
    const canonical = canonicalOperation(operation);
    if (utf8ByteLength(canonical) + 2 > MAX_SEGMENT_BYTES) {
      throw new Error('phone_state_operation_oversized');
    }
    canonicalOperations.push(canonical);
  }

  const segments: PersonalSyncSegment[] = [];
  let segmentOperations: PersonalOperation[] = [];
  let segmentCanonical: string[] = [];
  let segmentBytes = 2;

  const flush = async (): Promise<void> => {
    if (segmentOperations.length === 0) {
      return;
    }
    segments.push(await sealSegment(segmentOperations, segmentCanonical));
    segmentOperations = [];
    segmentCanonical = [];
    segmentBytes = 2;
  };

  for (let index = 0; index < operations.length; index += 1) {
    const canonical = canonicalOperations[index];
    const operationBytes = utf8ByteLength(canonical);
    const separatorBytes = segmentOperations.length === 0 ? 0 : 1;
    if (
      segmentOperations.length >= MAX_SEGMENT_OPERATIONS
      || segmentBytes + separatorBytes + operationBytes > MAX_SEGMENT_BYTES
    ) {
      await flush();
    }
    segmentOperations.push(operations[index]);
    segmentCanonical.push(canonical);
    segmentBytes += (segmentOperations.length === 1 ? 0 : 1) + operationBytes;
  }
  await flush();
  return segments;
}

export function shouldSealOpenSegment(input: ShouldSealOpenSegmentInput): boolean {
  if (input.operationCount <= 0) {
    return false;
  }
  switch (input.reason) {
    case 'operation_capacity':
      return input.operationCount >= MAX_SEGMENT_OPERATIONS;
    case 'byte_capacity':
      return input.byteSize >= MAX_SEGMENT_BYTES;
    case 'lesson_complete':
    case 'exam_complete':
    case 'session_complete':
    case 'background':
      return true;
    case 'age_2m':
      return input.nowMs - input.openedAtMs >= MAX_OPEN_SEGMENT_AGE_MS;
  }
}
