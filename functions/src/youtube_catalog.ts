import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  YOUTUBE_CATALOG_LIMITS,
  validateYoutubeCatalogConfig,
  type YoutubeCatalogConfig,
  type YoutubeCatalogManifest,
  type YoutubeChannelSnapshot,
  type YoutubePlaylistPage,
  type YoutubePlaylistSnapshot,
  type YoutubeVideoSnapshot,
} from '../../shared/youtube_catalog_contract';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, roleFromAdminToken } from './admin/permissions';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';
import {
  decideYoutubeSearchBudget,
  mergeYoutubeVideoSources,
  nextYoutubeSyncIntervalMs,
} from './youtube_catalog_core';
import {
  createYoutubeCatalogStore,
  type YoutubeBuiltSnapshot,
  type YoutubeCatalogPersistence,
  type YoutubeCatalogStore,
  type YoutubeCatalogTransaction,
} from './youtube_catalog_store';
import {
  createYoutubeDataGateway,
  YoutubeDataApiError,
  type YoutubeDataGateway,
  type YoutubePlaylistSource,
} from './youtube_data_api';

type Row = Record<string, unknown>;
type AdminRole = NonNullable<ReturnType<typeof roleFromAdminToken>>;

const REGION = 'us-central1';
const CONFIG_PATH = 'youtube_catalog/config';
const PUBLIC_PATH = 'youtube_catalog/public';
const SYNC_STATE_PATH = 'youtube_catalog/sync_state';
const MANUAL_REFRESH_PATH = 'youtube_catalog/manual_refresh';
const CONFIG_HISTORY = 'youtube_catalog_history';
const OPERATIONS = 'admin_command_operations';
const ADMIN_LOG = 'admin_log';
const DISCOVERY_INTERVAL_MS = 6 * 60 * 60_000;
const MANUAL_REFRESH_RATE_LIMIT_MS = 60_000;
const TOKEN_RE = /^[A-Za-z0-9._:-]{1,160}$/;

export const YOUTUBE_DATA_API_KEY = defineSecret('YOUTUBE_DATA_API_KEY');

export type YoutubeCatalogConfigCommand = Readonly<{
  nextConfig: YoutubeCatalogConfig;
  expectedRevision: number;
  reason: string;
  requestId: string;
  idempotencyKey: string;
}>;

export type YoutubeCatalogSyncResult = Readonly<{
  ok: boolean;
  code: string;
  version?: string;
  skipped?: boolean;
}>;

function isRecord(value: unknown): value is Row {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function safeErrorCode(error: unknown): string {
  if (error instanceof YoutubeDataApiError) return `youtube_api_${error.code}`;
  return 'sync_failed';
}

export function assertYoutubeCatalogAdminAccess(token: unknown): { role: AdminRole } {
  const role = roleFromAdminToken(token);
  if (!role || !hasPermission(role, 'application.config.write')) {
    throw new HttpsError('permission-denied', 'Role cannot manage YouTube catalog');
  }
  return { role };
}

export function parseYoutubeCatalogConfigCommand(data: unknown): YoutubeCatalogConfigCommand {
  if (!isRecord(data) || !isRecord(data.nextConfig)) {
    throw new HttpsError('invalid-argument', 'nextConfig object required');
  }
  const expectedRevision = Number(data.expectedRevision);
  const reason = text(data.reason, 500);
  const requestId = text(data.requestId, 160);
  const idempotencyKey = text(data.idempotencyKey, 160);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new HttpsError('invalid-argument', 'expectedRevision must be a non-negative integer');
  }
  if (!reason || !TOKEN_RE.test(requestId) || !TOKEN_RE.test(idempotencyKey)) {
    throw new HttpsError('invalid-argument', 'reason, requestId and idempotencyKey are required');
  }
  try {
    const nextConfig = validateYoutubeCatalogConfig(data.nextConfig);
    return Object.freeze({ nextConfig, expectedRevision, reason, requestId, idempotencyKey });
  } catch (error) {
    throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'youtube_catalog_config_invalid');
  }
}

export function buildYoutubeCatalogConfigFingerprint(command: YoutubeCatalogConfigCommand): string {
  return JSON.stringify(stableValue({
    action: 'youtube_catalog.config.publish',
    expectedRevision: command.expectedRevision,
    nextConfig: command.nextConfig,
    reason: command.reason,
    requestId: command.requestId,
  }));
}

export function assertYoutubeCatalogReplay(
  operation: Row,
  requestFingerprint: string,
  actorUid: string,
): void {
  if (operation.requestFingerprint !== requestFingerprint || operation.actorUid !== actorUid) {
    throw new HttpsError('already-exists', 'idempotencyKey replay does not match the original command');
  }
}

export function assertManualYoutubeRefreshAllowed(nowMs: number, previousAtMs: number): void {
  if (Number.isFinite(previousAtMs) && nowMs - previousAtMs < MANUAL_REFRESH_RATE_LIMIT_MS) {
    throw new HttpsError('resource-exhausted', 'YouTube catalog refresh is limited to once per minute');
  }
}

export function summarizeYoutubeCatalogConfig(config: YoutubeCatalogConfig): Row {
  return {
    schemaVersion: config.schemaVersion,
    enabled: config.enabled,
    channelCount: config.channels.length,
    enabledChannelCount: config.channels.filter((channel) => channel.enabled).length,
    channelIds: config.channels.map((channel) => channel.id),
    localeDefaults: { ...config.localeDefaults },
  };
}

function utcDay(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function versionId(nowMs: number, owner: string): string {
  const stamp = new Date(nowMs).toISOString().replace(/[-:.TZ]/g, '');
  const suffix = owner.replace(/[^0-9A-Za-z_-]/g, '').slice(-24) || 'worker';
  return `yt_${stamp}_${suffix}`;
}

function playlistOrder(source: YoutubePlaylistSource, override: YoutubeCatalogConfig['channels'][number]['playlistOverrides'][string], fallback: number): number {
  return override?.order == null ? fallback : override.order;
}

async function buildYoutubeSnapshot(input: {
  config: YoutubeCatalogConfig;
  gateway: YoutubeDataGateway;
  nowMs: number;
  owner: string;
  syncState: Row;
}): Promise<{ snapshot: YoutubeBuiltSnapshot; syncPatch: Row }> {
  const enabledChannels = input.config.channels.filter((channel) => channel.enabled)
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  if (enabledChannels.length === 0) throw new Error('youtube_catalog_no_enabled_channels');

  const lastDiscoveryAtMs = Number(input.syncState.lastDiscoveryAtMs ?? 0);
  const discoveryDue = !Number.isFinite(lastDiscoveryAtMs) || input.nowMs - lastDiscoveryAtMs >= DISCOVERY_INTERVAL_MS;
  const searchDecision = decideYoutubeSearchBudget({
    utcDay: utcDay(input.nowMs),
    storedUtcDay: String(input.syncState.searchBudgetUtcDay ?? ''),
    callsUsed: Number(input.syncState.searchCallsUsed ?? 0),
    cursor: Number(input.syncState.searchCursor ?? 0),
    eligibleChannelIds: discoveryDue ? enabledChannels.map((channel) => channel.id) : [],
    requestedCallsPerChannel: 2,
  });
  const discoveryIds = new Set(searchDecision.channelIds);
  const channelEntries: YoutubeBuiltSnapshot['channels'] = [];

  for (const configChannel of enabledChannels) {
    const channelSource = await input.gateway.getChannel(configChannel.youtubeChannelId);
    const [uploadIds, playlistSources, upcomingIds, liveIds] = await Promise.all([
      input.gateway.getUploadVideoIds(channelSource.uploadsPlaylistId, YOUTUBE_CATALOG_LIMITS.videosPerChannel),
      input.gateway.getPlaylists(channelSource.id, YOUTUBE_CATALOG_LIMITS.playlistsPerChannel),
      discoveryIds.has(configChannel.id) ? input.gateway.searchEvents(channelSource.id, 'upcoming') : Promise.resolve([]),
      discoveryIds.has(configChannel.id) ? input.gateway.searchEvents(channelSource.id, 'live') : Promise.resolve([]),
    ]);
    const pinnedIds = configChannel.pinnedVideos?.map((video) => video.id) ?? [];
    const videoIds = [...new Set([...liveIds, ...upcomingIds, ...pinnedIds, ...uploadIds])]
      .slice(0, YOUTUBE_CATALOG_LIMITS.videosPerChannel);
    const videoSources = await input.gateway.getVideos(videoIds);
    let videos = mergeYoutubeVideoSources({
      channelId: configChannel.id,
      nowMs: input.nowMs,
      sources: videoSources,
      pinned: configChannel.pinnedVideos ?? [],
      overrides: configChannel.premiereOverrides,
    });

    const visiblePlaylists = playlistSources
      .filter((playlist) => configChannel.playlistOverrides[playlist.id]?.hidden !== true)
      .sort((left, right) => playlistOrder(left, configChannel.playlistOverrides[left.id], playlistSources.indexOf(left))
        - playlistOrder(right, configChannel.playlistOverrides[right.id], playlistSources.indexOf(right)));
    const playlistPages: Array<{ playlistId: string; page: YoutubePlaylistPage }> = [];
    const playlists: YoutubePlaylistSnapshot[] = [];
    const memberships = new Map<string, string[]>();
    for (const [index, playlist] of visiblePlaylists.entries()) {
      const listedIds = await input.gateway.getPlaylistVideoIds(playlist.id, YOUTUBE_CATALOG_LIMITS.playlistItems);
      const knownIds = listedIds.filter((id) => videoIds.includes(id));
      for (const id of knownIds) memberships.set(id, [...(memberships.get(id) ?? []), playlist.id]);
      for (let page = 0; page * YOUTUBE_CATALOG_LIMITS.playlistPageSize < knownIds.length; page += 1) {
        playlistPages.push({
          playlistId: playlist.id,
          page: { page, videoIds: knownIds.slice(page * YOUTUBE_CATALOG_LIMITS.playlistPageSize, (page + 1) * YOUTUBE_CATALOG_LIMITS.playlistPageSize) },
        });
      }
      const override = configChannel.playlistOverrides[playlist.id];
      playlists.push({
        id: playlist.id,
        channelId: configChannel.id,
        title: override?.titleOverride ?? playlist.title,
        description: playlist.description,
        ...(playlist.thumbnailUrl ? { thumbnailUrl: playlist.thumbnailUrl } : {}),
        url: `https://www.youtube.com/playlist?list=${encodeURIComponent(playlist.id)}`,
        itemCount: knownIds.length,
        order: playlistOrder(playlist, override, index),
        pageCount: Math.ceil(knownIds.length / YOUTUBE_CATALOG_LIMITS.playlistPageSize),
      });
    }
    videos = videos.map((video): YoutubeVideoSnapshot => ({ ...video, playlistIds: memberships.get(video.id) ?? [] }));
    const activeEvent = videos.find((video) => video.state === 'live') ?? videos.find((video) => video.state === 'upcoming');
    const channel: YoutubeChannelSnapshot = {
      id: configChannel.id,
      youtubeChannelId: channelSource.id,
      displayName: configChannel.displayNameOverride ?? channelSource.displayName,
      handle: channelSource.handle || configChannel.youtubeChannelId,
      url: channelSource.handle
        ? `https://www.youtube.com/${encodeURIComponent(channelSource.handle)}/videos`
        : `https://www.youtube.com/channel/${encodeURIComponent(channelSource.id)}/videos`,
      ...(channelSource.avatarUrl ? { avatarUrl: channelSource.avatarUrl } : {}),
      languageTags: [...configChannel.languageTags],
      order: configChannel.order,
      ...(activeEvent ? { activeEventVideoId: activeEvent.id } : {}),
      recentVideoIds: videos.map((video) => video.id),
      playlistIds: playlists.map((playlist) => playlist.id),
    };
    channelEntries.push({ channel, videos, playlists, playlistPages });
  }

  const manifestChannels: YoutubeCatalogManifest['channels'] = channelEntries.map(({ channel }) => ({
    id: channel.id,
    displayName: channel.displayName,
    ...(channel.avatarUrl ? { avatarUrl: channel.avatarUrl } : {}),
    languageTags: channel.languageTags,
    order: channel.order,
  }));
  if (manifestChannels.length === 0) throw new Error('youtube_catalog_empty_snapshot');
  const defaultChannelId = Object.values(input.config.localeDefaults).find((id) => manifestChannels.some((channel) => channel.id === id))
    ?? manifestChannels[0].id;
  const version = versionId(input.nowMs, input.owner);
  const nowIso = new Date(input.nowMs).toISOString();
  const allVideos = channelEntries.flatMap((entry) => entry.videos);
  return {
    snapshot: {
      version,
      manifest: {
        schemaVersion: 1,
        activeVersion: version,
        generatedAt: nowIso,
        sourceRefreshedAt: nowIso,
        defaultChannelId,
        localeDefaults: { ...input.config.localeDefaults },
        channels: manifestChannels,
      },
      channels: channelEntries,
    },
    syncPatch: {
      searchBudgetUtcDay: utcDay(input.nowMs),
      searchCallsUsed: searchDecision.nextCallsUsed,
      searchCursor: searchDecision.nextCursor,
      ...(discoveryIds.size > 0 ? { lastDiscoveryAtMs: input.nowMs } : {}),
      nextRunAtMs: input.nowMs + nextYoutubeSyncIntervalMs(allVideos, input.nowMs),
    },
  };
}

export async function runYoutubeCatalogSyncWithDependencies(input: {
  nowMs: number;
  owner: string;
  trigger: 'cron' | 'manual';
  store: YoutubeCatalogStore;
  gateway: YoutubeDataGateway;
  syncState?: Row;
  patchSyncState?: (patch: Row) => Promise<void>;
}): Promise<YoutubeCatalogSyncResult> {
  let lease: Awaited<ReturnType<YoutubeCatalogStore['claimSyncLease']>> = null;
  try {
    const rawConfig = await input.store.readConfig();
    if (!rawConfig) return { ok: false, code: 'config_missing', skipped: true };
    const config = validateYoutubeCatalogConfig(rawConfig);
    if (!config.enabled) return { ok: true, code: 'disabled', skipped: true };
    const syncState = input.syncState ?? {};
    if (input.trigger === 'cron' && Number(syncState.nextRunAtMs ?? 0) > input.nowMs) {
      return { ok: true, code: 'not_due', skipped: true };
    }
    lease = await input.store.claimSyncLease(input.nowMs, input.owner);
    if (!lease) return { ok: true, code: 'lease_busy', skipped: true };
    const { snapshot, syncPatch } = await buildYoutubeSnapshot({ config, gateway: input.gateway, nowMs: input.nowMs, owner: input.owner, syncState });
    if (snapshot.channels.length === 0 || snapshot.manifest.channels.length === 0) throw new Error('youtube_catalog_empty_snapshot');
    const version = await input.store.publishSnapshot(snapshot, lease);
    await input.patchSyncState?.(syncPatch);
    await input.store.cleanupOldVersions(input.nowMs);
    return { ok: true, code: 'published', version };
  } catch (error) {
    const code = safeErrorCode(error);
    if (lease) await input.store.recordFailure(lease, code, input.nowMs);
    return { ok: false, code };
  }
}

function createFirestorePersistence(db: admin.firestore.Firestore): YoutubeCatalogPersistence {
  return {
    async get(path) {
      const snapshot = await db.doc(path).get();
      return snapshot.exists ? (snapshot.data() ?? {}) as Row : null;
    },
    async set(path, value) {
      await db.doc(path).set(value);
    },
    async writeBatch(writes) {
      const batch = db.batch();
      for (const write of writes) batch.set(db.doc(write.path), write.value);
      await batch.commit();
    },
    runTransaction<T>(work: (transaction: YoutubeCatalogTransaction) => Promise<T>) {
      return db.runTransaction(async (firestoreTx) => work({
        get: async (path) => {
          const snapshot = await firestoreTx.get(db.doc(path));
          return snapshot.exists ? (snapshot.data() ?? {}) as Row : null;
        },
        set: (path, value) => { firestoreTx.set(db.doc(path), value); },
      }));
    },
    async listSnapshotVersions() {
      const snapshot = await db.collection('youtube_catalog_snapshots').get();
      return snapshot.docs.map((document) => ({ id: document.id, data: document.data() as Row }));
    },
    async deletePrefix(prefix) {
      await db.recursiveDelete(db.doc(prefix));
      return 1;
    },
  };
}

async function patchFirestoreSyncState(db: admin.firestore.Firestore, patch: Row): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.doc(SYNC_STATE_PATH);
    const snapshot = await tx.get(ref);
    tx.set(ref, { ...(snapshot.data() ?? {}), ...patch }, { merge: false });
  });
}

export async function runYoutubeCatalogSync(input: { trigger: 'cron' | 'manual'; owner?: string }): Promise<YoutubeCatalogSyncResult> {
  const db = admin.firestore();
  const persistence = createFirestorePersistence(db);
  const store = createYoutubeCatalogStore(persistence);
  const syncState = await persistence.get(SYNC_STATE_PATH) ?? {};
  const key = YOUTUBE_DATA_API_KEY.value().trim();
  if (!key) return { ok: false, code: 'api_key_missing' };
  return runYoutubeCatalogSyncWithDependencies({
    nowMs: Date.now(),
    owner: input.owner ?? `${input.trigger}-${Date.now()}`,
    trigger: input.trigger,
    store,
    gateway: createYoutubeDataGateway({ apiKey: key }),
    syncState,
    patchSyncState: (patch) => patchFirestoreSyncState(db, patch),
  });
}

export const youtubeCatalogSyncCron = onSchedule({
  schedule: 'every 1 minutes',
  timeZone: 'UTC',
  region: REGION,
  timeoutSeconds: 120,
  memory: '512MiB',
  secrets: [YOUTUBE_DATA_API_KEY],
}, async () => {
  await runYoutubeCatalogSync({ trigger: 'cron' });
});

export const adminGetYoutubeCatalogWorkspace = onCall(
  { ...ADMIN_SENSITIVE_WRITE_OPTIONS, invoker: 'public' },
  async (request) => {
    requireAdminAppCheck(request);
    assertYoutubeCatalogAdminAccess(request.auth?.token);
    const db = admin.firestore();
    const [config, manifest, syncState, history] = await Promise.all([
      db.doc(CONFIG_PATH).get(),
      db.doc(PUBLIC_PATH).get(),
      db.doc(SYNC_STATE_PATH).get(),
      db.collection(CONFIG_HISTORY).orderBy('timestamp', 'desc').limit(50).get(),
    ]);
    const configData = config.data() ?? {};
    const revision = Number(configData.revision ?? 0);
    if (!Number.isSafeInteger(revision) || revision < 0) throw new HttpsError('data-loss', 'youtube_catalog_revision_invalid');
    return {
      ok: true,
      config: { ...configData, revision },
      manifest: manifest.data() ?? null,
      syncState: syncState.data() ?? null,
      history: history.docs.map((document) => ({ id: document.id, ...document.data() })),
    };
  },
);

export const adminPublishYoutubeCatalogConfig = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    const { role } = assertYoutubeCatalogAdminAccess(request.auth?.token);
    const actorUid = request.auth?.uid;
    if (!actorUid) throw new HttpsError('unauthenticated', 'Authentication required');
    const command = parseYoutubeCatalogConfigCommand(request.data);
    const fingerprint = buildYoutubeCatalogConfigFingerprint(command);
    const db = admin.firestore();
    const configRef = db.doc(CONFIG_PATH);
    const operationRef = db.collection(OPERATIONS).doc(`youtube_config_${command.idempotencyKey}`);
    const historyRef = db.collection(CONFIG_HISTORY).doc();
    const auditRef = db.collection(ADMIN_LOG).doc();
    const nowIso = new Date().toISOString();
    return db.runTransaction(async (tx) => {
      const [configSnapshot, operationSnapshot] = await Promise.all([tx.get(configRef), tx.get(operationRef)]);
      if (operationSnapshot.exists) {
        const previous = operationSnapshot.data() ?? {};
        assertYoutubeCatalogReplay(previous, fingerprint, actorUid);
        return { ...(isRecord(previous.result) ? previous.result : {}), replayed: true };
      }
      const before = configSnapshot.data() ?? {};
      const currentRevision = Number(before.revision ?? 0);
      if (!Number.isSafeInteger(currentRevision) || currentRevision !== command.expectedRevision) {
        throw new HttpsError('failed-precondition', 'YouTube catalog changed; reload before publishing');
      }
      const nextConfig = validateYoutubeCatalogConfig({ ...command.nextConfig, updatedAt: nowIso, updatedBy: actorUid });
      const after = { ...nextConfig, revision: currentRevision + 1 };
      const audit = createAuditRecord({
        action: 'youtube_catalog.config.publish',
        actorUid,
        role,
        entity: { collection: 'youtube_catalog', id: 'config' },
        reason: command.reason,
        before: configSnapshot.exists ? summarizeYoutubeCatalogConfig(validateYoutubeCatalogConfig(before)) : {},
        after: summarizeYoutubeCatalogConfig(nextConfig),
        rollbackReference: historyRef.id,
        requestId: command.requestId,
        timestamp: nowIso,
      });
      const result = { ok: true, revision: currentRevision + 1, auditId: auditRef.id, replayed: false };
      tx.set(configRef, { ...after, updatedAt: nowIso });
      tx.create(historyRef, { ...audit, operationId: operationRef.id, revision: currentRevision + 1, config: after });
      tx.create(auditRef, { ...audit, operationId: operationRef.id });
      tx.create(operationRef, {
        action: 'youtube_catalog.config.publish',
        actorUid,
        requestFingerprint: fingerprint,
        result,
        auditId: auditRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return result;
    });
  },
);

function parseManualRefreshCommand(data: unknown): { reason: string; requestId: string; idempotencyKey: string; fingerprint: string } {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'refresh command required');
  const reason = text(data.reason, 500);
  const requestId = text(data.requestId, 160);
  const idempotencyKey = text(data.idempotencyKey, 160);
  if (!reason || !TOKEN_RE.test(requestId) || !TOKEN_RE.test(idempotencyKey)) {
    throw new HttpsError('invalid-argument', 'reason, requestId and idempotencyKey are required');
  }
  return { reason, requestId, idempotencyKey, fingerprint: JSON.stringify(stableValue({ action: 'youtube_catalog.refresh', reason, requestId })) };
}

export const adminRefreshYoutubeCatalog = onCall(
  { ...ADMIN_SENSITIVE_WRITE_OPTIONS, timeoutSeconds: 120, memory: '512MiB', secrets: [YOUTUBE_DATA_API_KEY] },
  async (request) => {
    requireAdminAppCheck(request);
    const { role } = assertYoutubeCatalogAdminAccess(request.auth?.token);
    const actorUid = request.auth?.uid;
    if (!actorUid) throw new HttpsError('unauthenticated', 'Authentication required');
    const command = parseManualRefreshCommand(request.data);
    const db = admin.firestore();
    const operationRef = db.collection(OPERATIONS).doc(`youtube_refresh_${command.idempotencyKey}`);
    const refreshRef = db.doc(MANUAL_REFRESH_PATH);
    const nowMs = Date.now();
    const claimed = await db.runTransaction(async (tx) => {
      const [operationSnapshot, refreshSnapshot] = await Promise.all([tx.get(operationRef), tx.get(refreshRef)]);
      if (operationSnapshot.exists) {
        const previous = operationSnapshot.data() ?? {};
        assertYoutubeCatalogReplay(previous, command.fingerprint, actorUid);
        return { replayed: true, result: isRecord(previous.result) ? previous.result : { ok: true, code: 'accepted' } };
      }
      assertManualYoutubeRefreshAllowed(nowMs, Number(refreshSnapshot.data()?.lastRequestedAtMs ?? 0));
      tx.set(refreshRef, { lastRequestedAtMs: nowMs, lastRequestedBy: actorUid });
      tx.create(operationRef, {
        action: 'youtube_catalog.refresh',
        actorUid,
        requestFingerprint: command.fingerprint,
        status: 'running',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { replayed: false, result: null };
    });
    if (claimed.replayed) return { ...claimed.result, replayed: true };
    const result = await runYoutubeCatalogSync({ trigger: 'manual', owner: `admin-${actorUid}-${nowMs}` });
    const auditRef = db.collection(ADMIN_LOG).doc();
    const audit = createAuditRecord({
      action: 'youtube_catalog.refresh',
      actorUid,
      role,
      entity: { collection: 'youtube_catalog', id: 'public' },
      reason: command.reason,
      before: {},
      after: { ok: result.ok, code: result.code, version: result.version ?? null },
      requestId: command.requestId,
      timestamp: new Date().toISOString(),
    });
    await db.runTransaction(async (tx) => {
      tx.set(operationRef, { status: 'completed', result, auditId: auditRef.id, completedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      tx.create(auditRef, { ...audit, operationId: operationRef.id });
    });
    return { ...result, auditId: auditRef.id, replayed: false };
  },
);
