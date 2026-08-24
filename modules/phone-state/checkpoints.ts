import type { PhoneStateScope } from './account_secret';
import {
  canonicalJson,
  canonicalJsonWithLimit,
  canonicalStringFingerprint,
  utf8ByteLength,
} from './canonical';
import type { ProjectionEnvelope } from './contracts';

export const PHONE_STATE_CHECKPOINT_OPERATION_THRESHOLD = 2_000;
export const PHONE_STATE_CHECKPOINT_BYTE_THRESHOLD = 512 * 1024;
export const PHONE_STATE_MAX_CHECKPOINT_BYTES = 512 * 1024;

const CHECKPOINT_ID = /^[A-Za-z0-9._:-]{8,160}$/;
const DEVICE_ID = /^[A-Za-z0-9._:-]{16,80}$/;
const SHA256 = /^[a-f0-9]{64}$/;

export type PersonalSyncCheckpoint = Readonly<{
  schemaVersion: 'personal-sync-checkpoint.v1';
  stableUid: string;
  accountGeneration: number;
  checkpointId: string;
  reducerVersions: Readonly<Record<string, number>>;
  vector: Readonly<Record<string, number>>;
  projectionsCanonical: string;
  byteSize: number;
  createdAtMs: number;
  fingerprint: string;
}>;

export interface PhoneStateCheckpointLocalRepository {
  applyCheckpointAtomically(input: Readonly<{
    checkpointId: string;
    projections: readonly ProjectionEnvelope[];
    vector: Readonly<Record<string, number>>;
  }>): Promise<void>;
}

type BuildCheckpointInput = Readonly<{
  scope: PhoneStateScope;
  checkpointId: string;
  reducerVersions: Readonly<Record<string, number>>;
  vector: Readonly<Record<string, number>>;
  projections: readonly ProjectionEnvelope[];
  createdAtMs: number;
}>;

type CheckpointFingerprintBody = Readonly<{
  schemaVersion: 'personal-sync-checkpoint.v1';
  stableUid: string;
  accountGeneration: number;
  checkpointId: string;
  reducerVersions: Readonly<Record<string, number>>;
  vector: Readonly<Record<string, number>>;
  projectionsFingerprint: string;
  byteSize: number;
  createdAtMs: number;
}>;

function invalidCheckpoint(): never {
  throw new Error('phone_state_checkpoint_invalid');
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function sortedPositiveVersions(value: unknown): Readonly<Record<string, number>> {
  if (!isPlainRecord(value)) invalidCheckpoint();
  const result: Record<string, number> = {};
  for (const key of Object.keys(value).sort()) {
    const version = value[key];
    if (!key || !Number.isSafeInteger(version) || (version as number) < 1) invalidCheckpoint();
    result[key] = version as number;
  }
  return Object.freeze(result);
}

function sortedVector(value: unknown): Readonly<Record<string, number>> {
  if (!isPlainRecord(value)) invalidCheckpoint();
  const result: Record<string, number> = {};
  for (const deviceId of Object.keys(value).sort()) {
    const sequence = value[deviceId];
    if (!DEVICE_ID.test(deviceId) || !Number.isSafeInteger(sequence) || (sequence as number) < 0) {
      invalidCheckpoint();
    }
    result[deviceId] = sequence as number;
  }
  return Object.freeze(result);
}

function normalizedProjections(
  value: unknown,
  reducerVersions: Readonly<Record<string, number>>,
): readonly ProjectionEnvelope[] {
  if (!Array.isArray(value)) invalidCheckpoint();
  const domains = new Set<string>();
  const result = value.map((candidate) => {
    if (!isPlainRecord(candidate)) invalidCheckpoint();
    const keys = Object.keys(candidate).sort().join(',');
    if (keys !== 'domain,reducerVersion,schemaVersion,state,throughOperationCount') {
      invalidCheckpoint();
    }
    const domain = candidate.domain;
    const reducerVersion = candidate.reducerVersion;
    const throughOperationCount = candidate.throughOperationCount;
    if (
      candidate.schemaVersion !== 1
      || typeof domain !== 'string'
      || !domain
      || domains.has(domain)
      || !Number.isSafeInteger(reducerVersion)
      || reducerVersion !== reducerVersions[domain]
      || !Number.isSafeInteger(throughOperationCount)
      || (throughOperationCount as number) < 0
    ) {
      invalidCheckpoint();
    }
    domains.add(domain);
    return Object.freeze({
      schemaVersion: 1 as const,
      domain,
      reducerVersion: reducerVersion as number,
      state: candidate.state,
      throughOperationCount: throughOperationCount as number,
    });
  }).sort((left, right) => left.domain.localeCompare(right.domain));

  if (
    domains.size !== Object.keys(reducerVersions).length
    || Object.keys(reducerVersions).some((domain) => !domains.has(domain))
  ) {
    invalidCheckpoint();
  }
  return Object.freeze(result);
}

function equalRecord(
  left: Readonly<Record<string, number>>,
  right: Readonly<Record<string, number>>,
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => left[key] === right[key]);
}

async function checkpointFingerprint(
  checkpoint: Omit<PersonalSyncCheckpoint, 'fingerprint'>,
): Promise<string> {
  const projectionsFingerprint = await canonicalStringFingerprint(checkpoint.projectionsCanonical);
  const body: CheckpointFingerprintBody = {
    schemaVersion: checkpoint.schemaVersion,
    stableUid: checkpoint.stableUid,
    accountGeneration: checkpoint.accountGeneration,
    checkpointId: checkpoint.checkpointId,
    reducerVersions: checkpoint.reducerVersions,
    vector: checkpoint.vector,
    projectionsFingerprint,
    byteSize: checkpoint.byteSize,
    createdAtMs: checkpoint.createdAtMs,
  };
  return canonicalStringFingerprint(canonicalJson(body));
}

function validateEnvelopeFields(checkpoint: PersonalSyncCheckpoint, scope: PhoneStateScope): void {
  if (
    checkpoint.schemaVersion !== 'personal-sync-checkpoint.v1'
    || checkpoint.stableUid !== scope.stableUid
    || checkpoint.accountGeneration !== scope.accountGeneration
    || !CHECKPOINT_ID.test(checkpoint.checkpointId)
    || !Number.isSafeInteger(checkpoint.accountGeneration)
    || checkpoint.accountGeneration < 0
    || !Number.isSafeInteger(checkpoint.createdAtMs)
    || checkpoint.createdAtMs < 0
    || !Number.isSafeInteger(checkpoint.byteSize)
    || checkpoint.byteSize < 2
    || checkpoint.byteSize > PHONE_STATE_MAX_CHECKPOINT_BYTES
    || !SHA256.test(checkpoint.fingerprint)
  ) {
    invalidCheckpoint();
  }
}

export async function buildCheckpoint(input: BuildCheckpointInput): Promise<PersonalSyncCheckpoint> {
  if (!CHECKPOINT_ID.test(input.checkpointId)) invalidCheckpoint();
  if (!Number.isSafeInteger(input.createdAtMs) || input.createdAtMs < 0) invalidCheckpoint();
  const reducerVersions = sortedPositiveVersions(input.reducerVersions);
  const vector = sortedVector(input.vector);
  const projections = normalizedProjections(input.projections, reducerVersions);

  let projectionsCanonical: string;
  try {
    projectionsCanonical = canonicalJsonWithLimit(projections, PHONE_STATE_MAX_CHECKPOINT_BYTES);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('canonical output exceeds')) {
      throw new Error('phone_state_checkpoint_oversized');
    }
    throw error;
  }
  const base = Object.freeze({
    schemaVersion: 'personal-sync-checkpoint.v1' as const,
    stableUid: input.scope.stableUid,
    accountGeneration: input.scope.accountGeneration,
    checkpointId: input.checkpointId,
    reducerVersions,
    vector,
    projectionsCanonical,
    byteSize: utf8ByteLength(projectionsCanonical),
    createdAtMs: input.createdAtMs,
  });
  return Object.freeze({ ...base, fingerprint: await checkpointFingerprint(base) });
}

export async function restoreCheckpoint(input: Readonly<{
  checkpoint: PersonalSyncCheckpoint;
  scope: PhoneStateScope;
  expectedReducerVersions: Readonly<Record<string, number>>;
  local: PhoneStateCheckpointLocalRepository;
}>): Promise<Readonly<{
  projections: readonly ProjectionEnvelope[];
  vector: Readonly<Record<string, number>>;
}>> {
  try {
    validateEnvelopeFields(input.checkpoint, input.scope);
    const reducerVersions = sortedPositiveVersions(input.checkpoint.reducerVersions);
    const expectedReducerVersions = sortedPositiveVersions(input.expectedReducerVersions);
    if (!equalRecord(reducerVersions, expectedReducerVersions)) invalidCheckpoint();
    const vector = sortedVector(input.checkpoint.vector);
    if (utf8ByteLength(input.checkpoint.projectionsCanonical) !== input.checkpoint.byteSize) {
      invalidCheckpoint();
    }
    const parsed: unknown = JSON.parse(input.checkpoint.projectionsCanonical);
    const projections = normalizedProjections(parsed, reducerVersions);
    if (
      canonicalJsonWithLimit(projections, PHONE_STATE_MAX_CHECKPOINT_BYTES)
      !== input.checkpoint.projectionsCanonical
    ) {
      invalidCheckpoint();
    }
    const normalized = Object.freeze({
      schemaVersion: input.checkpoint.schemaVersion,
      stableUid: input.checkpoint.stableUid,
      accountGeneration: input.checkpoint.accountGeneration,
      checkpointId: input.checkpoint.checkpointId,
      reducerVersions,
      vector,
      projectionsCanonical: input.checkpoint.projectionsCanonical,
      byteSize: input.checkpoint.byteSize,
      createdAtMs: input.checkpoint.createdAtMs,
    });
    if (await checkpointFingerprint(normalized) !== input.checkpoint.fingerprint) {
      invalidCheckpoint();
    }

    await input.local.applyCheckpointAtomically({
      checkpointId: input.checkpoint.checkpointId,
      projections,
      vector,
    });
    return Object.freeze({ projections, vector });
  } catch (error) {
    if (error instanceof Error && error.message === 'phone_state_checkpoint_invalid') throw error;
    invalidCheckpoint();
  }
}

export function shouldCreateCheckpoint(input: Readonly<{
  acknowledgedOperations: number;
  acknowledgedBytes: number;
}>): boolean {
  if (
    !Number.isSafeInteger(input.acknowledgedOperations)
    || input.acknowledgedOperations < 0
    || !Number.isSafeInteger(input.acknowledgedBytes)
    || input.acknowledgedBytes < 0
  ) {
    throw new TypeError('phone_state_checkpoint_counter_invalid');
  }
  return input.acknowledgedOperations >= PHONE_STATE_CHECKPOINT_OPERATION_THRESHOLD
    || input.acknowledgedBytes >= PHONE_STATE_CHECKPOINT_BYTE_THRESHOLD;
}
