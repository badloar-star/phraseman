import type {
  YoutubeCatalogConfig,
  YoutubeCatalogManifest,
  YoutubeChannelSnapshot,
  YoutubePlaylistPage,
  YoutubePlaylistSnapshot,
  YoutubeVideoSnapshot,
} from '../../shared/youtube_catalog_contract';

type Row = Record<string, unknown>;
type Write = Readonly<{ path: string; value: Row }>;

export interface YoutubeCatalogTransaction {
  get(path: string): Promise<Row | null>;
  set(path: string, value: Row): void;
}

export interface YoutubeCatalogPersistence {
  get(path: string): Promise<Row | null>;
  set(path: string, value: Row): Promise<void>;
  writeBatch(writes: readonly Write[]): Promise<void>;
  runTransaction<T>(work: (transaction: YoutubeCatalogTransaction) => Promise<T>): Promise<T>;
  listSnapshotVersions(): Promise<Array<{ id: string; data: Row }>>;
  deletePrefix(prefix: string): Promise<number>;
}

export type YoutubeSyncLease = Readonly<{
  owner: string;
  token: string;
  leaseUntilMs: number;
}>;

export type YoutubeBuiltSnapshot = {
  version: string;
  manifest: YoutubeCatalogManifest;
  channels: Array<{
    channel: YoutubeChannelSnapshot;
    videos: YoutubeVideoSnapshot[];
    playlists: YoutubePlaylistSnapshot[];
    playlistPages: Array<{ playlistId: string; page: YoutubePlaylistPage }>;
  }>;
};

export interface YoutubeCatalogStore {
  readConfig(): Promise<YoutubeCatalogConfig | null>;
  claimSyncLease(nowMs: number, owner: string): Promise<YoutubeSyncLease | null>;
  publishSnapshot(snapshot: YoutubeBuiltSnapshot, lease: YoutubeSyncLease): Promise<string>;
  recordFailure(lease: YoutubeSyncLease, code: string, nowMs: number): Promise<void>;
  cleanupOldVersions(nowMs: number): Promise<number>;
  rollbackToVersion(version: string, nowMs: number, actor: string): Promise<string>;
}

const CONFIG_PATH = 'youtube_catalog/config';
const PUBLIC_PATH = 'youtube_catalog/public';
const SYNC_STATE_PATH = 'youtube_catalog/sync_state';
const SNAPSHOTS = 'youtube_catalog_snapshots';
const DEFAULT_BATCH_SIZE = 400;
const DEFAULT_LEASE_MS = 3 * 60_000;
const RETENTION_MS = 7 * 86_400_000;
const MAX_DOCUMENT_CHARS = 700_000;

function cloneRow(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...(value as Row) };
}

function assertDocumentSize(value: Row): void {
  if (JSON.stringify(value).length > MAX_DOCUMENT_CHARS) throw new Error('youtube_catalog_document_too_large');
}

function chunks<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function snapshotRoot(version: string): string {
  return `${SNAPSHOTS}/${version}`;
}

function buildWrites(snapshot: YoutubeBuiltSnapshot): Write[] {
  if (!snapshot.version || snapshot.manifest.activeVersion !== snapshot.version) {
    throw new Error('youtube_catalog_version_mismatch');
  }
  const writes: Write[] = [];
  for (const entry of snapshot.channels) {
    const channelRoot = `${snapshotRoot(snapshot.version)}/channels/${entry.channel.id}`;
    writes.push({ path: channelRoot, value: cloneRow(entry.channel) });
    for (const video of entry.videos) {
      writes.push({ path: `${channelRoot}/videos/${video.id}`, value: cloneRow(video) });
    }
    for (const playlist of entry.playlists) {
      writes.push({ path: `${channelRoot}/playlists/${playlist.id}`, value: cloneRow(playlist) });
    }
    for (const item of entry.playlistPages) {
      writes.push({
        path: `${channelRoot}/playlists/${item.playlistId}/pages/${item.page.page}`,
        value: cloneRow(item.page),
      });
    }
  }
  for (const write of writes) assertDocumentSize(write.value);
  assertDocumentSize(cloneRow(snapshot.manifest));
  return writes;
}

export function createYoutubeCatalogStore(
  persistence: YoutubeCatalogPersistence,
  options: { batchSize?: number; leaseMs?: number } = {},
): YoutubeCatalogStore {
  const batchSize = Math.min(400, Math.max(1, Math.floor(options.batchSize ?? DEFAULT_BATCH_SIZE)));
  const leaseMs = Math.max(1_000, Math.floor(options.leaseMs ?? DEFAULT_LEASE_MS));

  return {
    async readConfig() {
      return await persistence.get(CONFIG_PATH) as YoutubeCatalogConfig | null;
    },

    claimSyncLease(nowMs, owner) {
      return persistence.runTransaction(async (tx) => {
        const before = await tx.get(SYNC_STATE_PATH) ?? {};
        const leaseUntilMs = Number(before.leaseUntilMs ?? 0);
        if (leaseUntilMs > nowMs && before.leaseOwner !== owner) return null;
        const token = `${owner}:${nowMs}`;
        const lease: YoutubeSyncLease = { owner, token, leaseUntilMs: nowMs + leaseMs };
        tx.set(SYNC_STATE_PATH, {
          ...before,
          leaseOwner: owner,
          leaseToken: token,
          leaseUntilMs: lease.leaseUntilMs,
          lastAttemptAtMs: nowMs,
        });
        return lease;
      });
    },

    async publishSnapshot(snapshot, lease) {
      const writes = buildWrites(snapshot);
      const syncBefore = await persistence.get(SYNC_STATE_PATH);
      if (syncBefore?.leaseToken !== lease.token || syncBefore.leaseOwner !== lease.owner) {
        throw new Error('youtube_catalog_lease_lost');
      }
      const rootPath = snapshotRoot(snapshot.version);
      const counts = {
        channels: snapshot.channels.length,
        videos: snapshot.channels.reduce((sum, entry) => sum + entry.videos.length, 0),
        playlists: snapshot.channels.reduce((sum, entry) => sum + entry.playlists.length, 0),
        pages: snapshot.channels.reduce((sum, entry) => sum + entry.playlistPages.length, 0),
      };
      await persistence.set(rootPath, {
        schemaVersion: 1,
        status: 'building',
        createdAtMs: Number(snapshot.manifest.generatedAt ? Date.parse(snapshot.manifest.generatedAt) : Date.now()),
        counts,
        manifest: cloneRow(snapshot.manifest),
      });
      for (const batch of chunks(writes, batchSize)) await persistence.writeBatch(batch);
      const written = await Promise.all(writes.map((write) => persistence.get(write.path)));
      if (written.some((row) => row == null)) throw new Error('youtube_catalog_snapshot_incomplete');
      await persistence.set(rootPath, {
        schemaVersion: 1,
        status: 'ready',
        createdAtMs: Number(snapshot.manifest.generatedAt ? Date.parse(snapshot.manifest.generatedAt) : Date.now()),
        readyAtMs: Date.now(),
        counts,
        manifest: cloneRow(snapshot.manifest),
      });
      return persistence.runTransaction(async (tx) => {
        const state = await tx.get(SYNC_STATE_PATH) ?? {};
        if (state.leaseToken !== lease.token || state.leaseOwner !== lease.owner) {
          throw new Error('youtube_catalog_lease_lost');
        }
        tx.set(PUBLIC_PATH, cloneRow(snapshot.manifest));
        tx.set(SYNC_STATE_PATH, {
          ...state,
          lastSuccessfulVersion: snapshot.version,
          lastSuccessAtMs: Date.now(),
          lastErrorCode: null,
          leaseOwner: null,
          leaseToken: null,
          leaseUntilMs: 0,
        });
        return snapshot.version;
      });
    },

    recordFailure(lease, code, nowMs) {
      return persistence.runTransaction(async (tx) => {
        const state = await tx.get(SYNC_STATE_PATH) ?? {};
        if (state.leaseToken !== lease.token || state.leaseOwner !== lease.owner) return;
        tx.set(SYNC_STATE_PATH, {
          ...state,
          lastErrorCode: code.slice(0, 120),
          lastFailureAtMs: nowMs,
          leaseOwner: null,
          leaseToken: null,
          leaseUntilMs: 0,
        });
      });
    },

    async cleanupOldVersions(nowMs) {
      const publicManifest = await persistence.get(PUBLIC_PATH);
      const activeVersion = String(publicManifest?.activeVersion ?? '');
      const versions = await persistence.listSnapshotVersions();
      let removed = 0;
      for (const version of versions) {
        const createdAtMs = Number(version.data.createdAtMs ?? 0);
        if (version.id === activeVersion || !Number.isFinite(createdAtMs) || nowMs - createdAtMs <= RETENTION_MS) continue;
        await persistence.deletePrefix(snapshotRoot(version.id));
        removed += 1;
      }
      return removed;
    },

    async rollbackToVersion(version, nowMs, actor) {
      const target = await persistence.get(snapshotRoot(version));
      if (target?.status !== 'ready') throw new Error('rollback_version_not_ready');
      return persistence.runTransaction(async (tx) => {
        const before = await tx.get(PUBLIC_PATH) ?? {};
        const storedManifest = cloneRow(target.manifest);
        tx.set(PUBLIC_PATH, {
          ...before,
          ...storedManifest,
          activeVersion: version,
          rollbackAtMs: nowMs,
          rollbackBy: actor,
        });
        return version;
      });
    },
  };
}
