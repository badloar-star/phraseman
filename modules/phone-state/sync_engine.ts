import { canonicalJson, operationFingerprint, utf8ByteLength } from './canonical';
import type { PhoneStateScope } from './account_secret';
import type { PersonalOperation } from './contracts';
import type {
  DeviceStreamManifest,
  PersonalExternalEvent,
  PhoneStateCloudRepository,
} from './firestore_repository';
import { personalSyncSegmentId, type PersonalSyncSegment } from './segments';

export type SyncPassResult = Readonly<{
  uploaded: number;
  duplicates: number;
  downloaded: number;
  quarantined: number;
  hasMore: boolean;
}>;

export interface PhoneStateSyncEngine {
  flushOnce(): Promise<SyncPassResult>;
  pullOnce(): Promise<SyncPassResult>;
  syncOnce(): Promise<SyncPassResult>;
}

export type SyncEngineFailpoint = 'after_cloud_create' | 'before_cursor_advance';

export interface PhoneStateSyncLocalRepository {
  isDeviceManifestAcknowledged(deviceId: string): Promise<boolean>;
  markDeviceManifestAcknowledged(deviceId: string): Promise<void>;
  oldestPendingSegment(): Promise<PersonalSyncSegment | null>;
  markSegmentAcknowledged(segmentId: string): Promise<void>;
  remoteCursor(deviceId: string): Promise<number>;
  externalCursor(): Promise<number>;
  applyRemoteSegmentAndAdvanceCursor(
    deviceId: string,
    operations: readonly PersonalOperation[],
    nextCursor: number,
  ): Promise<Readonly<{ downloaded: number; quarantined: number }>>;
  applyExternalEventsAndAdvanceCursor(
    events: readonly PersonalExternalEvent[],
    nextCursor: number,
  ): Promise<Readonly<{ downloaded: number; quarantined: number }>>;
  quarantineRemoteReceipt(
    sourceKind: 'segment' | 'external_event' | 'device_manifest',
    sourceId: string,
    reason: string,
    canonicalPayload: string,
  ): Promise<void>;
}

export type CreatePhoneStateSyncEngineOptions = Readonly<{
  scope: PhoneStateScope;
  deviceManifest: DeviceStreamManifest;
  cloud: PhoneStateCloudRepository;
  local: PhoneStateSyncLocalRepository;
  pageSize?: number;
  failpoint?: () => SyncEngineFailpoint | undefined;
}>;

const EMPTY_RESULT: SyncPassResult = Object.freeze({
  uploaded: 0,
  duplicates: 0,
  downloaded: 0,
  quarantined: 0,
  hasMore: false,
});

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{16,80}$/;
const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/;

function safeCursor(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function triggerFailpoint(
  configured: (() => SyncEngineFailpoint | undefined) | undefined,
  current: SyncEngineFailpoint,
): void {
  if (configured?.() === current) {
    throw new Error(`failpoint:${current}`);
  }
}

function mergeResults(left: SyncPassResult, right: SyncPassResult): SyncPassResult {
  return Object.freeze({
    uploaded: left.uploaded + right.uploaded,
    duplicates: left.duplicates + right.duplicates,
    downloaded: left.downloaded + right.downloaded,
    quarantined: left.quarantined + right.quarantined,
    hasMore: left.hasMore || right.hasMore,
  });
}

function validateManifest(
  scope: PhoneStateScope,
  manifest: DeviceStreamManifest,
): boolean {
  return manifest.schemaVersion === 'personal-sync-device.v1'
    && manifest.stableUid === scope.stableUid
    && manifest.accountGeneration === scope.accountGeneration
    && DEVICE_ID_PATTERN.test(manifest.deviceId)
    && FINGERPRINT_PATTERN.test(manifest.fingerprint);
}

async function operationsFromSegment(
  scope: PhoneStateScope,
  deviceId: string,
  expectedFirstSequence: number,
  segment: PersonalSyncSegment,
): Promise<readonly PersonalOperation[]> {
  if (
    segment.schemaVersion !== 'personal-sync-segment.v1'
    || segment.stableUid !== scope.stableUid
    || segment.accountGeneration !== scope.accountGeneration
    || segment.deviceId !== deviceId
    || segment.firstSequence !== expectedFirstSequence
    || !safeCursor(segment.lastSequence)
    || segment.lastSequence < segment.firstSequence
    || !Number.isSafeInteger(segment.operationCount)
    || segment.operationCount < 1
    || segment.operationCount > 50
    || segment.lastSequence - segment.firstSequence + 1 !== segment.operationCount
    || utf8ByteLength(segment.payloadCanonical) !== segment.byteSize
    || segment.byteSize > 64 * 1024
    || !FINGERPRINT_PATTERN.test(segment.fingerprint)
  ) {
    throw new Error('phone_state_remote_segment_invalid');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(segment.payloadCanonical) as unknown;
  } catch {
    throw new Error('phone_state_remote_segment_invalid');
  }
  if (!Array.isArray(parsed) || parsed.length !== segment.operationCount) {
    throw new Error('phone_state_remote_segment_invalid');
  }
  const operations = parsed as PersonalOperation[];
  if (canonicalJson(operations) !== segment.payloadCanonical) {
    throw new Error('phone_state_remote_segment_invalid');
  }
  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index];
    if (
      operation.schemaVersion !== 1
      || operation.stableUid !== scope.stableUid
      || operation.accountGeneration !== scope.accountGeneration
      || operation.deviceId !== deviceId
      || operation.deviceSequence !== segment.firstSequence + index
      || operation.hybridClock?.deviceId !== deviceId
      || !FINGERPRINT_PATTERN.test(operation.fingerprint)
    ) {
      throw new Error('phone_state_remote_segment_invalid');
    }
  }
  if (await operationFingerprint(operations) !== segment.fingerprint) {
    throw new Error('phone_state_remote_segment_invalid');
  }
  return operations;
}

async function validateExternalEvents(
  scope: PhoneStateScope,
  expectedFirstSequence: number,
  events: readonly PersonalExternalEvent[],
): Promise<void> {
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (
      event.schemaVersion !== 'personal-external-event.v1'
      || event.stableUid !== scope.stableUid
      || event.serverSequence !== expectedFirstSequence + index
      || typeof event.eventId !== 'string'
      || event.eventId.length === 0
      || !FINGERPRINT_PATTERN.test(event.fingerprint)
    ) {
      throw new Error('phone_state_external_event_invalid');
    }
    const { fingerprint: _fingerprint, ...body } = event;
    if (await operationFingerprint(body) !== event.fingerprint) {
      throw new Error('phone_state_external_event_invalid');
    }
  }
}

export function createPhoneStateSyncEngine(
  options: CreatePhoneStateSyncEngineOptions,
): PhoneStateSyncEngine {
  const pageSize = options.pageSize ?? 20;
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error('phone_state_sync_page_size_invalid');
  }
  if (!validateManifest(options.scope, options.deviceManifest)) {
    throw new Error('phone_state_device_manifest_invalid');
  }

  const flushOnce = async (): Promise<SyncPassResult> => {
    if (!await options.local.isDeviceManifestAcknowledged(options.deviceManifest.deviceId)) {
      await options.cloud.ensureDeviceManifest(options.deviceManifest);
      await options.local.markDeviceManifestAcknowledged(options.deviceManifest.deviceId);
    }

    const segment = await options.local.oldestPendingSegment();
    if (!segment) {
      return EMPTY_RESULT;
    }
    const cloudResult = await options.cloud.createSegment(segment);
    triggerFailpoint(options.failpoint, 'after_cloud_create');
    await options.local.markSegmentAcknowledged(personalSyncSegmentId(segment));
    return Object.freeze({
      uploaded: 1,
      duplicates: cloudResult.kind === 'duplicate' ? 1 : 0,
      downloaded: 0,
      quarantined: 0,
      hasMore: true,
    });
  };

  const pullOnce = async (): Promise<SyncPassResult> => {
    let result = EMPTY_RESULT;
    const manifests = await options.cloud.listDeviceManifests(options.scope);
    for (const manifest of manifests) {
      if (!validateManifest(options.scope, manifest)) {
        await options.local.quarantineRemoteReceipt(
          'device_manifest',
          typeof manifest?.deviceId === 'string' ? manifest.deviceId : 'invalid',
          'phone_state_device_manifest_invalid',
          canonicalJson(manifest),
        );
        result = mergeResults(result, { ...EMPTY_RESULT, quarantined: 1 });
        continue;
      }

      let cursor = await options.local.remoteCursor(manifest.deviceId);
      if (!safeCursor(cursor)) {
        throw new Error('phone_state_remote_cursor_invalid');
      }
      const segments = await options.cloud.listSegmentsAfter(
        options.scope,
        manifest.deviceId,
        cursor,
        pageSize,
      );
      if (segments.length >= pageSize) {
        result = mergeResults(result, { ...EMPTY_RESULT, hasMore: true });
      }
      for (const segment of segments) {
        try {
          const operations = await operationsFromSegment(
            options.scope,
            manifest.deviceId,
            cursor + 1,
            segment,
          );
          triggerFailpoint(options.failpoint, 'before_cursor_advance');
          const applied = await options.local.applyRemoteSegmentAndAdvanceCursor(
            manifest.deviceId,
            operations,
            segment.lastSequence,
          );
          cursor = segment.lastSequence;
          result = mergeResults(result, {
            ...EMPTY_RESULT,
            downloaded: applied.downloaded,
            quarantined: applied.quarantined,
          });
        } catch (error) {
          if (error instanceof Error && error.message.startsWith('failpoint:')) {
            throw error;
          }
          await options.local.quarantineRemoteReceipt(
            'segment',
            (() => {
              try {
                return personalSyncSegmentId(segment);
              } catch {
                return 'invalid';
              }
            })(),
            error instanceof Error ? error.message : 'phone_state_remote_segment_invalid',
            canonicalJson(segment),
          );
          result = mergeResults(result, { ...EMPTY_RESULT, quarantined: 1 });
          break;
        }
      }
    }

    const externalCursor = await options.local.externalCursor();
    if (!safeCursor(externalCursor)) {
      throw new Error('phone_state_external_cursor_invalid');
    }
    const events = await options.cloud.listExternalEventsAfter(
      options.scope,
      externalCursor,
      pageSize,
    );
    if (events.length >= pageSize) {
      result = mergeResults(result, { ...EMPTY_RESULT, hasMore: true });
    }
    if (events.length > 0) {
      try {
        await validateExternalEvents(options.scope, externalCursor + 1, events);
        triggerFailpoint(options.failpoint, 'before_cursor_advance');
        const applied = await options.local.applyExternalEventsAndAdvanceCursor(
          events,
          events[events.length - 1].serverSequence,
        );
        result = mergeResults(result, {
          ...EMPTY_RESULT,
          downloaded: applied.downloaded,
          quarantined: applied.quarantined,
        });
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('failpoint:')) {
          throw error;
        }
        await options.local.quarantineRemoteReceipt(
          'external_event',
          events[0]?.eventId ?? 'invalid',
          error instanceof Error ? error.message : 'phone_state_external_event_invalid',
          canonicalJson(events),
        );
        result = mergeResults(result, { ...EMPTY_RESULT, quarantined: 1 });
      }
    }
    return result;
  };

  const syncOnce = async (): Promise<SyncPassResult> => mergeResults(
    await flushOnce(),
    await pullOnce(),
  );

  return Object.freeze({ flushOnce, pullOnce, syncOnce });
}
