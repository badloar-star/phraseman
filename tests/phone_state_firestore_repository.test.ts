import type { PhoneStateScope } from '../modules/phone-state/account_secret';
import {
  createPhoneStateFirestoreRepository,
  phoneStatePaths,
  type DeviceStreamManifest,
} from '../modules/phone-state/firestore_repository';
import type { PersonalSyncSegment } from '../modules/phone-state/segments';

type StoredDocuments = Map<string, unknown>;

function alreadyExists(): Error & { code: string } {
  return Object.assign(new Error('already exists'), { code: 'firestore/already-exists' });
}

function createFirestoreHarness() {
  const documents: StoredDocuments = new Map();
  const calls = {
    writes: [] as string[],
    reads: [] as string[],
    queries: [] as Array<{
      path: string;
      filters: Array<[string, string, unknown]>;
      orders: Array<[string, string]>;
      limit: number | null;
    }>,
  };

  const collection = (path: string) => ({
    doc: (id: string) => {
      const documentPath = `${path}/${id}`;
      return {
        set: async (value: unknown) => {
          calls.writes.push(documentPath);
          if (documents.has(documentPath)) {
            throw alreadyExists();
          }
          documents.set(documentPath, value);
        },
        get: async () => {
          calls.reads.push(documentPath);
          return {
            exists: documents.has(documentPath),
            data: () => documents.get(documentPath),
          };
        },
      };
    },
    where(field: string, operator: string, value: unknown) {
      const query = {
        path,
        filters: [[field, operator, value]] as Array<[string, string, unknown]>,
        orders: [] as Array<[string, string]>,
        limit: null as number | null,
      };
      const chain = {
        where(nextField: string, nextOperator: string, nextValue: unknown) {
          query.filters.push([nextField, nextOperator, nextValue]);
          return chain;
        },
        orderBy(nextField: string, direction: string) {
          query.orders.push([nextField, direction]);
          return chain;
        },
        limit(nextLimit: number) {
          query.limit = nextLimit;
          return chain;
        },
        async get() {
          calls.queries.push(query);
          return { docs: [] };
        },
      };
      return chain;
    },
    orderBy(field: string, direction: string) {
      const query = {
        path,
        filters: [] as Array<[string, string, unknown]>,
        orders: [[field, direction]] as Array<[string, string]>,
        limit: null as number | null,
      };
      const chain = {
        limit(nextLimit: number) {
          query.limit = nextLimit;
          return chain;
        },
        async get() {
          calls.queries.push(query);
          return { docs: [] };
        },
      };
      return chain;
    },
  });

  return { firestore: { collection }, calls, documents };
}

const scope: PhoneStateScope = { stableUid: 'stable-1', accountGeneration: 1 };

const segmentA: PersonalSyncSegment = {
  schemaVersion: 'personal-sync-segment.v1',
  stableUid: scope.stableUid,
  accountGeneration: scope.accountGeneration,
  deviceId: 'device_0000000001',
  firstSequence: 1,
  lastSequence: 2,
  operationCount: 2,
  byteSize: 100,
  createdAtMs: 100,
  payloadCanonical: '[]',
  fingerprint: 'a'.repeat(64),
};

const manifest: DeviceStreamManifest = {
  schemaVersion: 'personal-sync-device.v1',
  stableUid: scope.stableUid,
  accountGeneration: scope.accountGeneration,
  deviceId: segmentA.deviceId,
  createdAtMs: 100,
  fingerprint: 'b'.repeat(64),
};

test('uses only owner-scoped phone-state paths', () => {
  expect(phoneStatePaths('stable-1')).toEqual({
    segments: 'users/stable-1/personal_sync_segments',
    checkpoints: 'users/stable-1/personal_sync_checkpoints',
    devices: 'users/stable-1/sync_devices',
    externalEvents: 'users/stable-1/personal_external_events',
  });
});

test('exact segment retry succeeds and conflicting bytes fail closed', async () => {
  const cloud = createFirestoreHarness();
  const repo = createPhoneStateFirestoreRepository(cloud.firestore);

  await expect(repo.createSegment(segmentA)).resolves.toEqual({ kind: 'created' });
  await expect(repo.createSegment(segmentA)).resolves.toEqual({ kind: 'duplicate' });
  await expect(repo.createSegment({ ...segmentA, fingerprint: 'f'.repeat(64) }))
    .rejects.toThrow('phone_state_segment_id_conflict');

  expect(cloud.calls.writes).toHaveLength(3);
  expect(cloud.calls.reads).toHaveLength(2);
  expect(cloud.calls.reads.every((path) => path.endsWith('_0000000000000001'))).toBe(true);
  expect(cloud.calls.queries).toEqual([]);
});

test('device manifest is immutable and exact retry performs one targeted read', async () => {
  const cloud = createFirestoreHarness();
  const repo = createPhoneStateFirestoreRepository(cloud.firestore);

  await expect(repo.ensureDeviceManifest(manifest)).resolves.toEqual({ kind: 'created' });
  await expect(repo.ensureDeviceManifest(manifest)).resolves.toEqual({ kind: 'duplicate' });
  await expect(repo.ensureDeviceManifest({ ...manifest, fingerprint: 'c'.repeat(64) }))
    .rejects.toThrow('phone_state_device_manifest_id_conflict');

  expect(cloud.calls.reads).toEqual([
    'users/stable-1/sync_devices/device_0000000001',
    'users/stable-1/sync_devices/device_0000000001',
  ]);
});

test('pull query starts strictly after the durable device cursor', async () => {
  const cloud = createFirestoreHarness();
  const repo = createPhoneStateFirestoreRepository(cloud.firestore);

  await repo.listSegmentsAfter(scope, segmentA.deviceId, 100, 20);

  expect(cloud.calls.queries).toEqual([{
    path: 'users/stable-1/personal_sync_segments',
    filters: [
      ['deviceId', '==', segmentA.deviceId],
      ['lastSequence', '>', 100],
    ],
    orders: [['lastSequence', 'asc']],
    limit: 20,
  }]);
});

test('manifest discovery and external-event pulls are bounded incremental queries', async () => {
  const cloud = createFirestoreHarness();
  const repo = createPhoneStateFirestoreRepository(cloud.firestore);

  await repo.listDeviceManifests(scope);
  await repo.listExternalEventsAfter(scope, 7, 25);

  expect(cloud.calls.queries).toEqual([
    {
      path: 'users/stable-1/sync_devices',
      filters: [['accountGeneration', '==', 1]],
      orders: [['deviceId', 'asc']],
      limit: null,
    },
    {
      path: 'users/stable-1/personal_external_events',
      filters: [['serverSequence', '>', 7]],
      orders: [['serverSequence', 'asc']],
      limit: 25,
    },
  ]);
});
