import { operationFingerprint } from '../modules/phone-state/canonical';
import type { PhoneStateScope } from '../modules/phone-state/account_secret';
import type { PersonalOperation } from '../modules/phone-state/contracts';
import type {
  DeviceStreamManifest,
  PersonalExternalEvent,
  PhoneStateCloudRepository,
} from '../modules/phone-state/firestore_repository';
import { assembleSegments, personalSyncSegmentId, type PersonalSyncSegment } from '../modules/phone-state/segments';
import {
  createPhoneStateSyncEngine,
  type PhoneStateSyncLocalRepository,
  type SyncEngineFailpoint,
} from '../modules/phone-state/sync_engine';

const scope: PhoneStateScope = { stableUid: 'stable-1', accountGeneration: 1 };
const localDeviceId = 'local_device_0001';
const remoteDeviceId = 'remote_device_001';

function operation(deviceId: string, sequence: number): PersonalOperation {
  return {
    schemaVersion: 1,
    operationId: `${deviceId}:${sequence}`,
    stableUid: scope.stableUid,
    accountGeneration: scope.accountGeneration,
    deviceId,
    deviceSequence: sequence,
    hybridClock: { counter: sequence, deviceId },
    domain: 'counter',
    kind: 'delta',
    entityId: null,
    payload: { delta: 1 },
    exactResult: { value: sequence },
    createdAtMs: sequence,
    fingerprint: sequence.toString(16).padStart(64, '0'),
  };
}

async function segment(deviceId: string, count: number): Promise<PersonalSyncSegment> {
  return (await assembleSegments(
    Array.from({ length: count }, (_, index) => operation(deviceId, index + 1)),
    { reason: 'capacity' },
  ))[0];
}

async function eventAt(serverSequence: number): Promise<PersonalExternalEvent> {
  const body = {
    schemaVersion: 'personal-external-event.v1' as const,
    stableUid: scope.stableUid,
    eventId: `external-${serverSequence}`,
    serverSequence,
    domain: 'economy',
    kind: 'confirmed_grant',
    payload: { amount: serverSequence },
    createdAtMs: serverSequence,
  };
  return { ...body, fingerprint: await operationFingerprint(body) };
}

async function createSyncHarness(options: Readonly<{
  failpoint?: SyncEngineFailpoint;
  uploadSegment?: PersonalSyncSegment;
  remoteSegment?: PersonalSyncSegment;
  externalCursor?: number;
  externalEvents?: readonly PersonalExternalEvent[];
}> = {}) {
  let failpoint = options.failpoint;
  let manifestAcknowledged = false;
  let uploadAcknowledged = false;
  const remoteCursors = new Map<string, number>();
  let externalCursor = options.externalCursor ?? 0;
  const appliedOperations: PersonalOperation[] = [];
  const appliedExternalEvents: PersonalExternalEvent[] = [];
  const cloudSegments = new Map<string, PersonalSyncSegment>();
  const upload = options.uploadSegment ?? null;
  const remote = options.remoteSegment ?? null;
  if (remote) cloudSegments.set(personalSyncSegmentId(remote), remote);

  const manifest: DeviceStreamManifest = {
    schemaVersion: 'personal-sync-device.v1',
    stableUid: scope.stableUid,
    accountGeneration: scope.accountGeneration,
    deviceId: localDeviceId,
    createdAtMs: 1,
    fingerprint: 'a'.repeat(64),
  };
  const remoteManifest: DeviceStreamManifest = {
    ...manifest,
    deviceId: remoteDeviceId,
    fingerprint: 'b'.repeat(64),
  };

  const local: PhoneStateSyncLocalRepository = {
    isDeviceManifestAcknowledged: async () => manifestAcknowledged,
    markDeviceManifestAcknowledged: async () => { manifestAcknowledged = true; },
    oldestPendingSegment: async () => upload && !uploadAcknowledged ? upload : null,
    markSegmentAcknowledged: async () => { uploadAcknowledged = true; },
    remoteCursor: async (deviceId) => remoteCursors.get(deviceId) ?? 0,
    externalCursor: async () => externalCursor,
    applyRemoteSegmentAndAdvanceCursor: async (deviceId, operations, nextCursor) => {
      appliedOperations.push(...operations);
      remoteCursors.set(deviceId, nextCursor);
      return { downloaded: operations.length, quarantined: 0 };
    },
    applyExternalEventsAndAdvanceCursor: async (events, nextCursor) => {
      appliedExternalEvents.push(...events);
      externalCursor = nextCursor;
      return { downloaded: events.length, quarantined: 0 };
    },
    quarantineRemoteReceipt: async () => undefined,
  };

  const cloud: PhoneStateCloudRepository = {
    createSegment: async (value) => {
      const id = personalSyncSegmentId(value);
      const existing = cloudSegments.get(id);
      if (existing) {
        if (existing.fingerprint !== value.fingerprint) {
          throw new Error('phone_state_segment_id_conflict');
        }
        return { kind: 'duplicate' };
      }
      cloudSegments.set(id, value);
      return { kind: 'created' };
    },
    ensureDeviceManifest: async () => ({ kind: 'created' }),
    listDeviceManifests: async () => remote ? [remoteManifest] : [],
    listSegmentsAfter: async (_scope, deviceId, cursor, limit) => (
      [...cloudSegments.values()]
        .filter((value) => value.deviceId === deviceId && value.lastSequence > cursor)
        .slice(0, limit)
    ),
    listExternalEventsAfter: async (_scope, cursor, limit) => (
      (options.externalEvents ?? [])
        .filter((event) => event.serverSequence > cursor)
        .slice(0, limit)
    ),
    createCheckpoint: async () => ({ kind: 'created' }),
    latestCheckpoint: async () => null,
  };

  const engine = createPhoneStateSyncEngine({
    scope,
    deviceManifest: manifest,
    cloud,
    local,
    pageSize: 20,
    failpoint: () => failpoint,
  });
  return {
    engine,
    clearFailpoint: () => { failpoint = undefined; },
    cursor: (deviceId: string) => local.remoteCursor(deviceId),
    externalCursor: () => local.externalCursor(),
    operationCount: async () => appliedOperations.length,
    externalEventCount: async () => appliedExternalEvents.length,
  };
}

test('server accept followed by local crash retries as exact duplicate', async () => {
  const upload = await segment(localDeviceId, 1);
  const harness = await createSyncHarness({
    failpoint: 'after_cloud_create',
    uploadSegment: upload,
  });

  await expect(harness.engine.flushOnce()).rejects.toThrow('failpoint:after_cloud_create');
  harness.clearFailpoint();
  await expect(harness.engine.flushOnce()).resolves.toMatchObject({
    uploaded: 1,
    duplicates: 1,
  });
  expect(await harness.operationCount()).toBe(0);
});

test('cursor advances only after remote segment transaction commits', async () => {
  const remote = await segment(remoteDeviceId, 20);
  const harness = await createSyncHarness({
    failpoint: 'before_cursor_advance',
    remoteSegment: remote,
  });

  await expect(harness.engine.pullOnce()).rejects.toThrow('failpoint:before_cursor_advance');
  expect(await harness.cursor(remoteDeviceId)).toBe(0);
  expect(await harness.operationCount()).toBe(0);
  harness.clearFailpoint();
  await harness.engine.pullOnce();
  expect(await harness.cursor(remoteDeviceId)).toBe(20);
  expect(await harness.operationCount()).toBe(20);
});

test('external cursor reads only unseen server sequence', async () => {
  const harness = await createSyncHarness({
    externalCursor: 40,
    externalEvents: [await eventAt(41), await eventAt(42)],
  });

  await harness.engine.pullOnce();

  expect(await harness.externalCursor()).toBe(42);
  expect(await harness.externalEventCount()).toBe(2);
});

test('stale-generation manifests are ignored without cursor movement', async () => {
  const remote = { ...await segment(remoteDeviceId, 1), accountGeneration: 2 };
  const harness = await createSyncHarness({ remoteSegment: remote });

  await harness.engine.pullOnce();

  expect(await harness.cursor(remoteDeviceId)).toBe(0);
  expect(await harness.operationCount()).toBe(0);
});
