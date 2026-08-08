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
import type { YoutubeCatalogStore, YoutubeSyncLease } from './youtube_catalog_store';
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
    expect(indexSource).toContain('adminGetYoutubeCatalogWorkspace');
    expect(indexSource).toContain("from './youtube_catalog'");
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
});
