import {
  createYoutubeCatalogStore,
  type YoutubeBuiltSnapshot,
  type YoutubeCatalogPersistence,
  type YoutubeCatalogTransaction,
} from './youtube_catalog_store';

type Row = Record<string, unknown>;

class MemoryPersistence implements YoutubeCatalogPersistence {
  readonly docs = new Map<string, Row>();
  failBatchNumber: number | null = null;
  batchCount = 0;

  async get(path: string): Promise<Row | null> {
    const value = this.docs.get(path);
    return value ? structuredClone(value) : null;
  }

  async set(path: string, value: Row): Promise<void> {
    this.docs.set(path, structuredClone(value));
  }

  async writeBatch(writes: ReadonlyArray<{ path: string; value: Row }>): Promise<void> {
    this.batchCount += 1;
    if (this.failBatchNumber === this.batchCount) throw new Error('injected_batch_failure');
    for (const write of writes) this.docs.set(write.path, structuredClone(write.value));
  }

  async runTransaction<T>(work: (transaction: YoutubeCatalogTransaction) => Promise<T>): Promise<T> {
    const pending = new Map<string, Row>();
    const transaction: YoutubeCatalogTransaction = {
      get: async (path) => pending.get(path) ?? this.get(path),
      set: (path, value) => { pending.set(path, structuredClone(value)); },
    };
    const result = await work(transaction);
    for (const [path, value] of pending) this.docs.set(path, value);
    return result;
  }

  async listSnapshotVersions(): Promise<Array<{ id: string; data: Row }>> {
    return [...this.docs.entries()]
      .filter(([path]) => /^youtube_catalog_snapshots\/[^/]+$/.test(path))
      .map(([path, data]) => ({ id: path.split('/')[1], data: structuredClone(data) }));
  }

  async deletePrefix(prefix: string): Promise<number> {
    let count = 0;
    for (const path of [...this.docs.keys()]) {
      if (path === prefix || path.startsWith(`${prefix}/`)) {
        this.docs.delete(path);
        count += 1;
      }
    }
    return count;
  }
}

const NOW = Date.parse('2026-08-08T12:00:00Z');

function snapshot(version = 'v1'): YoutubeBuiltSnapshot {
  return {
    version,
    manifest: {
      schemaVersion: 1,
      activeVersion: version,
      generatedAt: '2026-08-08T12:00:00Z',
      sourceRefreshedAt: '2026-08-08T11:59:00Z',
      defaultChannelId: 'channel-en',
      localeDefaults: { en: 'channel-en' },
      channels: [{ id: 'channel-en', displayName: 'PHRASEMAN', languageTags: ['en'], order: 0 }],
    },
    channels: [{
      channel: {
        id: 'channel-en',
        youtubeChannelId: 'UCNNVZbMkh4jrW6uluaaJTwA',
        displayName: 'PHRASEMAN',
        handle: '@PhrasemanENGLISH',
        url: 'https://www.youtube.com/@PhrasemanENGLISH/videos',
        languageTags: ['en'],
        order: 0,
        recentVideoIds: ['aaaaaaaaaaa'],
        playlistIds: ['PL1234567890'],
      },
      videos: [{
        id: 'aaaaaaaaaaa',
        channelId: 'channel-en',
        title: 'Lesson',
        description: '',
        thumbnailUrl: 'https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg',
        watchUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa',
        state: 'video',
        playlistIds: ['PL1234567890'],
      }],
      playlists: [{
        id: 'PL1234567890',
        channelId: 'channel-en',
        title: 'Course',
        description: '',
        url: 'https://www.youtube.com/playlist?list=PL1234567890',
        itemCount: 1,
        order: 0,
        pageCount: 1,
      }],
      playlistPages: [{ playlistId: 'PL1234567890', page: { page: 0, videoIds: ['aaaaaaaaaaa'] } }],
    }],
  };
}

describe('youtube catalog versioned store', () => {
  test('publishes all documents before atomically switching activeVersion', async () => {
    const persistence = new MemoryPersistence();
    const store = createYoutubeCatalogStore(persistence);
    const lease = await store.claimSyncLease(NOW, 'worker-a');

    await expect(store.publishSnapshot(snapshot(), lease!)).resolves.toBe('v1');

    expect(await persistence.get('youtube_catalog_snapshots/v1')).toMatchObject({ status: 'ready' });
    expect(await persistence.get('youtube_catalog_snapshots/v1/channels/channel-en/videos/aaaaaaaaaaa')).toMatchObject({ title: 'Lesson' });
    expect(await persistence.get('youtube_catalog/public')).toMatchObject({ activeVersion: 'v1' });
    expect(await persistence.get('youtube_catalog/sync_state')).toMatchObject({ lastSuccessfulVersion: 'v1' });
  });

  test('does not switch the public pointer when a snapshot batch fails', async () => {
    const persistence = new MemoryPersistence();
    await persistence.set('youtube_catalog/public', { activeVersion: 'stable' });
    const store = createYoutubeCatalogStore(persistence, { batchSize: 1 });
    const lease = await store.claimSyncLease(NOW, 'worker-a');
    persistence.failBatchNumber = 2;

    await expect(store.publishSnapshot(snapshot('broken'), lease!)).rejects.toThrow('injected_batch_failure');
    expect(await persistence.get('youtube_catalog/public')).toEqual({ activeVersion: 'stable' });
    expect(await persistence.get('youtube_catalog_snapshots/broken')).toMatchObject({ status: 'building' });
  });

  test('prevents a second worker from taking a live lease and allows it after expiry', async () => {
    const persistence = new MemoryPersistence();
    const store = createYoutubeCatalogStore(persistence, { leaseMs: 60_000 });

    const first = await store.claimSyncLease(NOW, 'worker-a');
    expect(first).not.toBeNull();
    await expect(store.claimSyncLease(NOW + 30_000, 'worker-b')).resolves.toBeNull();
    await expect(store.claimSyncLease(NOW + 61_000, 'worker-b')).resolves.toMatchObject({ owner: 'worker-b' });
  });

  test('cleanup keeps active and recent versions while deleting old inactive versions', async () => {
    const persistence = new MemoryPersistence();
    await persistence.set('youtube_catalog/public', { activeVersion: 'active-old' });
    await persistence.set('youtube_catalog_snapshots/active-old', { status: 'ready', createdAtMs: NOW - 10 * 86_400_000 });
    await persistence.set('youtube_catalog_snapshots/remove-old', { status: 'ready', createdAtMs: NOW - 8 * 86_400_000 });
    await persistence.set('youtube_catalog_snapshots/recent', { status: 'ready', createdAtMs: NOW - 2 * 86_400_000 });
    const store = createYoutubeCatalogStore(persistence);

    await expect(store.cleanupOldVersions(NOW)).resolves.toBe(1);
    expect(await persistence.get('youtube_catalog_snapshots/active-old')).not.toBeNull();
    expect(await persistence.get('youtube_catalog_snapshots/remove-old')).toBeNull();
    expect(await persistence.get('youtube_catalog_snapshots/recent')).not.toBeNull();
  });

  test('rolls back only to a ready version', async () => {
    const persistence = new MemoryPersistence();
    await persistence.set('youtube_catalog/public', { activeVersion: 'current' });
    await persistence.set('youtube_catalog_snapshots/ready', { status: 'ready' });
    await persistence.set('youtube_catalog_snapshots/building', { status: 'building' });
    const store = createYoutubeCatalogStore(persistence);

    await expect(store.rollbackToVersion('building', NOW, 'owner')).rejects.toThrow('rollback_version_not_ready');
    await expect(store.rollbackToVersion('ready', NOW, 'owner')).resolves.toBe('ready');
    expect(await persistence.get('youtube_catalog/public')).toMatchObject({ activeVersion: 'ready' });
  });

  test('rejects an oversized Firestore document before writing it', async () => {
    const persistence = new MemoryPersistence();
    const store = createYoutubeCatalogStore(persistence);
    const lease = await store.claimSyncLease(NOW, 'worker-a');
    const oversized = snapshot('oversized');
    oversized.channels[0].videos[0] = {
      ...oversized.channels[0].videos[0],
      description: 'x'.repeat(700_001),
    };

    await expect(store.publishSnapshot(oversized, lease!)).rejects.toThrow('youtube_catalog_document_too_large');
    expect(await persistence.get('youtube_catalog/public')).toBeNull();
  });
});
