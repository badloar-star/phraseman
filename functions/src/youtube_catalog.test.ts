import { HttpsError } from 'firebase-functions/v2/https';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertManualYoutubeRefreshAllowed,
  assertYoutubeCatalogAdminAccess,
  assertYoutubeCatalogReplay,
  buildYoutubeCatalogConfigFingerprint,
  parseYoutubeCatalogConfigCommand,
  runYoutubeCatalogSyncWithDependencies,
  summarizeYoutubeCatalogConfig,
} from './youtube_catalog';
import type { YoutubeCatalogConfig } from '../../shared/youtube_catalog_contract';
import {
  createYoutubeCatalogStore,
  type YoutubeCatalogPersistence,
  type YoutubeCatalogStore,
  type YoutubeCatalogTransaction,
  type YoutubeSyncLease,
} from './youtube_catalog_store';
import type { YoutubeDataGateway } from './youtube_data_api';

const CONFIG: YoutubeCatalogConfig = {
  schemaVersion: 1,
  enabled: true,
  channels: [{
    id: 'channel-en',
    youtubeChannelId: 'UCNNVZbMkh4jrW6uluaaJTwA',
    enabled: true,
    order: 0,
    languageTags: ['en'],
    playlistOverrides: {},
    premiereOverrides: {},
  }],
  localeDefaults: { en: 'channel-en' },
  updatedAt: '2026-08-08T12:00:00.000Z',
  updatedBy: 'owner-1',
};

describe('youtube catalog runtime', () => {
  test('exports scheduler and admin callables with the admin App Check boundary and secret', () => {
    const source = readFileSync(resolve(__dirname, 'youtube_catalog.ts'), 'utf8');
    const indexSource = readFileSync(resolve(__dirname, 'index.ts'), 'utf8');
    const packageJson = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8')) as { scripts: Record<string, string> };
    expect(source).toContain("defineSecret('YOUTUBE_DATA_API_KEY')");
    expect(source).toContain('export const youtubeCatalogSyncCron = onSchedule(');
    for (const name of ['adminGetYoutubeCatalogWorkspace', 'adminPublishYoutubeCatalogConfig', 'adminRefreshYoutubeCatalog']) {
      const start = source.indexOf(`export const ${name} = onCall(`);
      expect(start).toBeGreaterThan(-1);
      const body = source.slice(start, source.indexOf('\nexport const ', start + 1) > start ? source.indexOf('\nexport const ', start + 1) : undefined);
      expect(body).toContain('ADMIN_SENSITIVE_WRITE_OPTIONS');
      expect(body).toContain('requireAdminAppCheck(request);');
    }
    expect(source).toContain("export const adminGetYoutubeCatalogWorkspace = onCall(\n  { ...ADMIN_SENSITIVE_WRITE_OPTIONS, invoker: 'public' },");
    expect(indexSource).toContain('adminGetYoutubeCatalogWorkspace');
    // зачем 2026-08-23: index.ts всегда импортировал через ДВОЙНЫЕ кавычки, а сторож
    // искал одинарные — тест был красным независимо от правок кода. Сверяем по имени
    // модуля, не по стилю кавычек, чтобы сторож ловил реальную регрессию.
    expect(indexSource).toMatch(/from ["']\.\/youtube_catalog["']/);
    expect(packageJson.scripts['deploy:youtube-catalog']).toContain('functions:youtubeCatalogSyncCron');
    expect(packageJson.scripts['deploy:youtube-catalog']).not.toContain('firebase deploy --only functions"');
  });

  test('requires admin claim and application.config.write permission', () => {
    expect(() => assertYoutubeCatalogAdminAccess(null)).toThrow(HttpsError);
    expect(() => assertYoutubeCatalogAdminAccess({ admin: true, adminRole: 'support' })).toThrow(HttpsError);
    expect(assertYoutubeCatalogAdminAccess({ admin: true, adminRole: 'admin' })).toMatchObject({ role: 'admin' });
    expect(assertYoutubeCatalogAdminAccess({ admin: true })).toMatchObject({ role: 'owner' });
  });

  test('parses a revisioned idempotent publish command', () => {
    const command = parseYoutubeCatalogConfigCommand({
      nextConfig: CONFIG,
      expectedRevision: 4,
      reason: 'Add the English channel',
      requestId: 'request-1',
      idempotencyKey: 'youtube-config-1',
    });
    expect(command.expectedRevision).toBe(4);
    expect(command.nextConfig.channels).toHaveLength(1);
    expect(() => parseYoutubeCatalogConfigCommand({ nextConfig: CONFIG })).toThrow(HttpsError);
  });

  test('fingerprint is stable and rejects a mismatched replay', () => {
    const command = parseYoutubeCatalogConfigCommand({
      nextConfig: CONFIG,
      expectedRevision: 4,
      reason: 'Add the English channel',
      requestId: 'request-1',
      idempotencyKey: 'youtube-config-1',
    });
    const fingerprint = buildYoutubeCatalogConfigFingerprint(command);
    expect(fingerprint).toBe(buildYoutubeCatalogConfigFingerprint({
      ...command,
      nextConfig: { ...command.nextConfig, localeDefaults: { en: 'channel-en' } },
    }));
    expect(() => assertYoutubeCatalogReplay({ requestFingerprint: 'different', actorUid: 'owner-1' }, fingerprint, 'owner-1')).toThrow(HttpsError);
    expect(() => assertYoutubeCatalogReplay({ requestFingerprint: fingerprint, actorUid: 'owner-2' }, fingerprint, 'owner-1')).toThrow(HttpsError);
    expect(() => assertYoutubeCatalogReplay({ requestFingerprint: fingerprint, actorUid: 'owner-1' }, fingerprint, 'owner-1')).not.toThrow();
  });

  test('enforces the 60-second manual refresh limit', () => {
    expect(() => assertManualYoutubeRefreshAllowed(1_000_000, 940_001)).toThrow(HttpsError);
    expect(() => assertManualYoutubeRefreshAllowed(1_000_000, 940_000)).not.toThrow();
  });

  test('audit summary omits channel payload and premiere overrides', () => {
    const summary = summarizeYoutubeCatalogConfig(CONFIG);
    expect(summary).toEqual({ schemaVersion: 1, enabled: true, channelCount: 1, enabledChannelCount: 1, channelIds: ['channel-en'], localeDefaults: { en: 'channel-en' } });
    expect(JSON.stringify(summary)).not.toContain('UCNNVZbMkh4jrW6uluaaJTwA');
    expect(JSON.stringify(summary)).not.toContain('premiereOverrides');
  });

  test('does not publish when the API fails or when the built snapshot is empty', async () => {
    const lease: YoutubeSyncLease = { owner: 'cron', token: 'cron:1', leaseUntilMs: 9999999 };
    const store = {
      readConfig: jest.fn().mockResolvedValue(CONFIG),
      claimSyncLease: jest.fn().mockResolvedValue(lease),
      publishSnapshot: jest.fn(),
      recordFailure: jest.fn().mockResolvedValue(undefined),
      cleanupOldVersions: jest.fn().mockResolvedValue(0),
      rollbackToVersion: jest.fn(),
    } satisfies YoutubeCatalogStore;
    const gateway = {
      getChannel: jest.fn().mockRejectedValue(new Error('api failed')),
    } as unknown as YoutubeDataGateway;

    await expect(runYoutubeCatalogSyncWithDependencies({ nowMs: Date.parse('2026-08-08T12:00:00Z'), owner: 'cron', trigger: 'cron', store, gateway }))
      .resolves.toMatchObject({ ok: false, code: 'sync_failed' });
    expect(store.publishSnapshot).not.toHaveBeenCalled();
    expect(store.recordFailure).toHaveBeenCalledWith(lease, 'sync_failed', expect.any(Number));
  });
  // зачем 2026-10-01: квота поиска (429) и пропавший плейлист (404) роняли всю
  // синхронизацию и крон сжигал квоту повторами — новые видео не появлялись.
  test('publishes uploads when search quota and a playlist fail; failed cron backs off', async () => {
    const lease: YoutubeSyncLease = { owner: 'cron', token: 'cron:2', leaseUntilMs: 9999999 };
    const store = {
      readConfig: jest.fn().mockResolvedValue(CONFIG),
      claimSyncLease: jest.fn().mockResolvedValue(lease),
      publishSnapshot: jest.fn().mockResolvedValue('v-1'),
      recordFailure: jest.fn().mockResolvedValue(undefined),
      cleanupOldVersions: jest.fn().mockResolvedValue(0),
      rollbackToVersion: jest.fn(),
    } satisfies YoutubeCatalogStore;
    const gateway = {
      getChannel: jest.fn().mockResolvedValue({ id: 'UCx', uploadsPlaylistId: 'UUx', displayName: 'X', handle: '@x' }),
      getUploadVideoIds: jest.fn().mockResolvedValue([]),
      getPlaylists: jest.fn().mockResolvedValue([{ id: 'PL-gone', title: 'Gone', description: '' }]),
      searchEvents: jest.fn().mockRejectedValue(new Error('quota')),
      getVideos: jest.fn().mockResolvedValue([]),
      getPlaylistVideoIds: jest.fn().mockRejectedValue(new Error('not_found')),
    } as unknown as YoutubeDataGateway;
    const patchSyncState = jest.fn().mockResolvedValue(undefined);
    const nowMs = Date.parse('2026-10-01T12:00:00Z');
    await expect(runYoutubeCatalogSyncWithDependencies({ nowMs, owner: 'cron', trigger: 'cron', store, gateway, patchSyncState }))
      .resolves.toMatchObject({ ok: true, code: 'published' });
    expect(store.publishSnapshot).toHaveBeenCalled();

    const failingGateway = { getChannel: jest.fn().mockRejectedValue(new Error('api failed')) } as unknown as YoutubeDataGateway;
    const backoffPatch = jest.fn().mockResolvedValue(undefined);
    await runYoutubeCatalogSyncWithDependencies({ nowMs, owner: 'cron', trigger: 'cron', store, gateway: failingGateway, patchSyncState: backoffPatch });
    expect(backoffPatch).toHaveBeenCalledWith({ nextRunAtMs: nowMs + 15 * 60_000 });
  });

  // зачем (§CORE-0163, находка K аудита стоимости Firebase): плановый синк не перепубликует неизменившийся каталог —
  // ни записи снимка, ни чтения проверки, ни удаления; изменение — публикуем как раньше; ручной запуск — всегда.
  describe('publish gate end to end', () => {
    type Row = Record<string, unknown>;
    class CountingPersistence implements YoutubeCatalogPersistence {
      readonly docs = new Map<string, Row>();
      snapshotReads = 0;
      batches = 0;
      deletes = 0;
      versionListings = 0;
      async get(path: string) {
        if (path.startsWith('youtube_catalog_snapshots/')) this.snapshotReads += 1;
        const value = this.docs.get(path);
        return value ? structuredClone(value) : null;
      }
      async set(path: string, value: Row) { this.docs.set(path, structuredClone(value)); }
      async writeBatch(writes: ReadonlyArray<{ path: string; value: Row }>) {
        this.batches += 1;
        for (const write of writes) this.docs.set(write.path, structuredClone(write.value));
      }
      async runTransaction<T>(work: (transaction: YoutubeCatalogTransaction) => Promise<T>): Promise<T> {
        const pending = new Map<string, Row>();
        const result = await work({
          get: async (path) => pending.get(path) ?? (this.docs.has(path) ? structuredClone(this.docs.get(path)!) : null),
          set: (path, value) => { pending.set(path, structuredClone(value)); },
        });
        for (const [path, value] of pending) this.docs.set(path, value);
        return result;
      }
      async listSnapshotVersions() {
        this.versionListings += 1;
        return [...this.docs.entries()]
          .filter(([path]) => /^youtube_catalog_snapshots\/[^/]+$/.test(path))
          .map(([path, data]) => ({ id: path.split('/')[1], data: structuredClone(data) }));
      }
      async deletePrefix() { this.deletes += 1; return 1; }
    }

    const gateway = (title: string) => ({
      getChannel: jest.fn().mockResolvedValue({ id: 'UCx', uploadsPlaylistId: 'UUx', displayName: title, handle: '@x' }),
      getUploadVideoIds: jest.fn().mockResolvedValue([]),
      getPlaylists: jest.fn().mockResolvedValue([]),
      searchEvents: jest.fn().mockResolvedValue([]),
      getVideos: jest.fn().mockResolvedValue([]),
      getPlaylistVideoIds: jest.fn().mockResolvedValue([]),
    }) as unknown as YoutubeDataGateway;

    async function run(persistence: CountingPersistence, nowMs: number, title: string, trigger: 'cron' | 'manual' = 'cron') {
      const store = createYoutubeCatalogStore(persistence);
      const syncState = (await persistence.get('youtube_catalog/sync_state')) ?? {};
      return runYoutubeCatalogSyncWithDependencies({
        nowMs, owner: `${trigger}-${nowMs}`, trigger, store, gateway: gateway(title), syncState,
        patchSyncState: async (patch) => {
          persistence.docs.set('youtube_catalog/sync_state', { ...(persistence.docs.get('youtube_catalog/sync_state') ?? {}), ...patch });
        },
      });
    }

    test('unchanged → no snapshot write, no verification read, no delete; changed → published as before', async () => {
      jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const persistence = new CountingPersistence();
      persistence.docs.set('youtube_catalog/config', CONFIG as unknown as Row);
      const t0 = Date.parse('2026-10-11T04:00:00Z');

      await expect(run(persistence, t0, 'Phraseman')).resolves.toMatchObject({ ok: true, code: 'published' });
      const activeAfterFirst = persistence.docs.get('youtube_catalog/public')?.activeVersion;
      expect(persistence.docs.get('youtube_catalog/sync_state')).toMatchObject({ lastPublishedStructureHash: expect.any(String) });

      persistence.snapshotReads = 0; persistence.batches = 0; persistence.deletes = 0; persistence.versionListings = 0;
      await expect(run(persistence, t0 + 15 * 60_000, 'Phraseman')).resolves.toMatchObject({ ok: true, code: 'unchanged', skipped: true });
      expect(persistence.batches).toBe(0);
      expect(persistence.snapshotReads).toBe(0);
      expect(persistence.deletes).toBe(0);
      expect(persistence.versionListings).toBe(0);
      expect(persistence.docs.get('youtube_catalog/public')?.activeVersion).toBe(activeAfterFirst);
      expect(persistence.docs.get('youtube_catalog/sync_state')).toMatchObject({ leaseOwner: null, leaseToken: null, leaseUntilMs: 0 });
      expect(Number(persistence.docs.get('youtube_catalog/sync_state')?.nextRunAtMs)).toBeGreaterThan(t0 + 15 * 60_000);

      await expect(run(persistence, t0 + 30 * 60_000, 'Phraseman EN')).resolves.toMatchObject({ ok: true, code: 'published' });
      expect(persistence.batches).toBeGreaterThan(0);
      expect(persistence.docs.get('youtube_catalog/public')?.activeVersion).not.toBe(activeAfterFirst);

      persistence.batches = 0;
      await expect(run(persistence, t0 + 45 * 60_000, 'Phraseman EN', 'manual')).resolves.toMatchObject({ ok: true, code: 'published' });
      expect(persistence.batches).toBeGreaterThan(0);
    });

    test('a rollback clears the fingerprints so the next sync publishes', async () => {
      jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const persistence = new CountingPersistence();
      persistence.docs.set('youtube_catalog/config', CONFIG as unknown as Row);
      const t0 = Date.parse('2026-10-11T05:00:00Z');
      await run(persistence, t0, 'Phraseman');
      const first = String(persistence.docs.get('youtube_catalog/public')?.activeVersion);
      await run(persistence, t0 + 15 * 60_000, 'Phraseman EN');
      await createYoutubeCatalogStore(persistence).rollbackToVersion(first, t0 + 20 * 60_000, 'admin');
      expect(persistence.docs.get('youtube_catalog/sync_state')).toMatchObject({ lastPublishedStructureHash: null });
      await expect(run(persistence, t0 + 30 * 60_000, 'Phraseman EN')).resolves.toMatchObject({ code: 'published' });
    });
  });
});
