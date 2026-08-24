import type { PhoneStateScope } from './account_secret';
import type { PersonalSyncCheckpoint } from './checkpoints';
import { personalSyncSegmentId, type PersonalSyncSegment } from './segments';

export type { PersonalSyncCheckpoint } from './checkpoints';

export type DeviceStreamManifest = Readonly<{
  schemaVersion: 'personal-sync-device.v1';
  stableUid: string;
  accountGeneration: number;
  deviceId: string;
  createdAtMs: number;
  fingerprint: string;
}>;

export type PersonalExternalEvent = Readonly<{
  schemaVersion: 'personal-external-event.v1';
  stableUid: string;
  eventId: string;
  serverSequence: number;
  domain: string;
  kind: string;
  payload: unknown;
  createdAtMs: number;
  fingerprint: string;
}>;

export interface PhoneStateCloudRepository {
  createSegment(
    segment: PersonalSyncSegment,
  ): Promise<Readonly<{ kind: 'created' | 'duplicate' }>>;
  ensureDeviceManifest(
    manifest: DeviceStreamManifest,
  ): Promise<Readonly<{ kind: 'created' | 'duplicate' }>>;
  listDeviceManifests(scope: PhoneStateScope): Promise<readonly DeviceStreamManifest[]>;
  listSegmentsAfter(
    scope: PhoneStateScope,
    deviceId: string,
    sequence: number,
    limit: number,
  ): Promise<readonly PersonalSyncSegment[]>;
  listExternalEventsAfter(
    scope: PhoneStateScope,
    serverSequence: number,
    limit: number,
  ): Promise<readonly PersonalExternalEvent[]>;
  createCheckpoint(
    checkpoint: PersonalSyncCheckpoint,
  ): Promise<Readonly<{ kind: 'created' | 'duplicate' }>>;
  latestCheckpoint(scope: PhoneStateScope): Promise<PersonalSyncCheckpoint | null>;
}

export type PhoneStateFirestoreLike = Readonly<{
  collection: (path: string) => unknown;
}>;

type DocumentSnapshotLike = Readonly<{
  exists: boolean;
  data: () => unknown;
}>;

type DocumentReferenceLike = Readonly<{
  set: (value: unknown) => Promise<unknown>;
  get: () => Promise<DocumentSnapshotLike>;
}>;

type QueryDocumentLike = Readonly<{ data: () => unknown }>;
type QuerySnapshotLike = Readonly<{ docs: readonly QueryDocumentLike[] }>;

type QueryLike = Readonly<{
  where: (field: string, operator: string, value: unknown) => QueryLike;
  orderBy: (field: string, direction: 'asc' | 'desc') => QueryLike;
  limit: (value: number) => QueryLike;
  get: () => Promise<QuerySnapshotLike>;
}>;

type CollectionReferenceLike = QueryLike & Readonly<{
  doc: (id: string) => DocumentReferenceLike;
}>;

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{16,80}$/;
const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/;
const PATH_SEGMENT_PATTERN = /^[^/]{1,160}$/;

export const phoneStatePaths = (stableUid: string) => {
  if (!PATH_SEGMENT_PATTERN.test(stableUid)) {
    throw new Error('phone_state_scope_invalid');
  }
  return Object.freeze({
    segments: `users/${stableUid}/personal_sync_segments`,
    checkpoints: `users/${stableUid}/personal_sync_checkpoints`,
    devices: `users/${stableUid}/sync_devices`,
    externalEvents: `users/${stableUid}/personal_external_events`,
  });
};

function collection(
  firestore: PhoneStateFirestoreLike,
  path: string,
): CollectionReferenceLike {
  const result = firestore.collection(path);
  if (result === null || typeof result !== 'object') {
    throw new Error('phone_state_firestore_invalid');
  }
  return result as CollectionReferenceLike;
}

function validateScope(scope: PhoneStateScope): void {
  if (
    !PATH_SEGMENT_PATTERN.test(scope.stableUid)
    || !Number.isSafeInteger(scope.accountGeneration)
    || scope.accountGeneration < 0
  ) {
    throw new Error('phone_state_scope_invalid');
  }
}

function validateLimit(limit: number): void {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('phone_state_query_limit_invalid');
  }
}

function validateCursor(cursor: number): void {
  if (!Number.isSafeInteger(cursor) || cursor < 0) {
    throw new Error('phone_state_cursor_invalid');
  }
}

function errorCode(error: unknown): string {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code ?? '').toLowerCase();
  }
  return '';
}

function mayBeImmutableConflict(error: unknown): boolean {
  const code = errorCode(error);
  return code.includes('already-exists') || code.includes('permission-denied');
}

function fingerprintFrom(value: unknown): string | null {
  if (value === null || typeof value !== 'object' || !('fingerprint' in value)) {
    return null;
  }
  const fingerprint = (value as { fingerprint?: unknown }).fingerprint;
  return typeof fingerprint === 'string' ? fingerprint : null;
}

async function createImmutable(
  reference: DocumentReferenceLike,
  value: Readonly<{ fingerprint: string }>,
  conflictCode: string,
): Promise<Readonly<{ kind: 'created' | 'duplicate' }>> {
  try {
    await reference.set(value);
    return Object.freeze({ kind: 'created' });
  } catch (error) {
    if (!mayBeImmutableConflict(error)) {
      throw error;
    }
    let snapshot: DocumentSnapshotLike;
    try {
      snapshot = await reference.get();
    } catch {
      throw error;
    }
    if (!snapshot.exists) {
      throw error;
    }
    if (fingerprintFrom(snapshot.data()) === value.fingerprint) {
      return Object.freeze({ kind: 'duplicate' });
    }
    throw new Error(conflictCode);
  }
}

function dataRows<T>(snapshot: QuerySnapshotLike): readonly T[] {
  return snapshot.docs.map((document) => document.data() as T);
}

export function createPhoneStateFirestoreRepository(
  firestore: PhoneStateFirestoreLike,
): PhoneStateCloudRepository {
  const createSegment = async (
    segment: PersonalSyncSegment,
  ): Promise<Readonly<{ kind: 'created' | 'duplicate' }>> => {
    validateScope(segment);
    if (
      segment.schemaVersion !== 'personal-sync-segment.v1'
      || !DEVICE_ID_PATTERN.test(segment.deviceId)
      || !FINGERPRINT_PATTERN.test(segment.fingerprint)
    ) {
      throw new Error('phone_state_segment_invalid');
    }
    const paths = phoneStatePaths(segment.stableUid);
    return createImmutable(
      collection(firestore, paths.segments).doc(personalSyncSegmentId(segment)),
      segment,
      'phone_state_segment_id_conflict',
    );
  };

  const ensureDeviceManifest = async (
    manifest: DeviceStreamManifest,
  ): Promise<Readonly<{ kind: 'created' | 'duplicate' }>> => {
    validateScope(manifest);
    if (
      manifest.schemaVersion !== 'personal-sync-device.v1'
      || !DEVICE_ID_PATTERN.test(manifest.deviceId)
      || !FINGERPRINT_PATTERN.test(manifest.fingerprint)
    ) {
      throw new Error('phone_state_device_manifest_invalid');
    }
    const paths = phoneStatePaths(manifest.stableUid);
    return createImmutable(
      collection(firestore, paths.devices).doc(manifest.deviceId),
      manifest,
      'phone_state_device_manifest_id_conflict',
    );
  };

  const listDeviceManifests = async (
    scope: PhoneStateScope,
  ): Promise<readonly DeviceStreamManifest[]> => {
    validateScope(scope);
    const snapshot = await collection(firestore, phoneStatePaths(scope.stableUid).devices)
      .where('accountGeneration', '==', scope.accountGeneration)
      .orderBy('deviceId', 'asc')
      .get();
    return dataRows<DeviceStreamManifest>(snapshot);
  };

  const listSegmentsAfter = async (
    scope: PhoneStateScope,
    deviceId: string,
    sequence: number,
    limit: number,
  ): Promise<readonly PersonalSyncSegment[]> => {
    validateScope(scope);
    validateCursor(sequence);
    validateLimit(limit);
    if (!DEVICE_ID_PATTERN.test(deviceId)) {
      throw new Error('phone_state_segment_device_id_invalid');
    }
    const snapshot = await collection(firestore, phoneStatePaths(scope.stableUid).segments)
      .where('deviceId', '==', deviceId)
      .where('lastSequence', '>', sequence)
      .orderBy('lastSequence', 'asc')
      .limit(limit)
      .get();
    return dataRows<PersonalSyncSegment>(snapshot);
  };

  const listExternalEventsAfter = async (
    scope: PhoneStateScope,
    serverSequence: number,
    limit: number,
  ): Promise<readonly PersonalExternalEvent[]> => {
    validateScope(scope);
    validateCursor(serverSequence);
    validateLimit(limit);
    const snapshot = await collection(
      firestore,
      phoneStatePaths(scope.stableUid).externalEvents,
    )
      .where('serverSequence', '>', serverSequence)
      .orderBy('serverSequence', 'asc')
      .limit(limit)
      .get();
    return dataRows<PersonalExternalEvent>(snapshot);
  };

  const createCheckpoint = async (
    checkpoint: PersonalSyncCheckpoint,
  ): Promise<Readonly<{ kind: 'created' | 'duplicate' }>> => {
    validateScope(checkpoint);
    if (
      checkpoint.schemaVersion !== 'personal-sync-checkpoint.v1'
      || !PATH_SEGMENT_PATTERN.test(checkpoint.checkpointId)
      || !FINGERPRINT_PATTERN.test(checkpoint.fingerprint)
    ) {
      throw new Error('phone_state_checkpoint_invalid');
    }
    const paths = phoneStatePaths(checkpoint.stableUid);
    return createImmutable(
      collection(firestore, paths.checkpoints).doc(checkpoint.checkpointId),
      checkpoint,
      'phone_state_checkpoint_id_conflict',
    );
  };

  const latestCheckpoint = async (
    scope: PhoneStateScope,
  ): Promise<PersonalSyncCheckpoint | null> => {
    validateScope(scope);
    const snapshot = await collection(firestore, phoneStatePaths(scope.stableUid).checkpoints)
      .where('accountGeneration', '==', scope.accountGeneration)
      .orderBy('createdAtMs', 'desc')
      .limit(1)
      .get();
    return dataRows<PersonalSyncCheckpoint>(snapshot)[0] ?? null;
  };

  return Object.freeze({
    createSegment,
    ensureDeviceManifest,
    listDeviceManifests,
    listSegmentsAfter,
    listExternalEventsAfter,
    createCheckpoint,
    latestCheckpoint,
  });
}
