import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('Android AsyncStorage capacity contract', () => {
  it('raises the native database cap above the 6 MB library default in every prebuild', () => {
    const appConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    expect(appConfig.expo.plugins).toContain('./plugins/withAsyncStorageCapacity');

    let plugin: null | {
      upsertAsyncStorageCapacity: (
        items: Array<{ type: string; key?: string; value?: string }>,
      ) => Array<{ type: string; key?: string; value?: string }>;
    } = null;
    try {
      plugin = require('../plugins/withAsyncStorageCapacity');
    } catch {
      plugin = null;
    }
    expect(plugin).not.toBeNull();

    const properties = plugin!.upsertAsyncStorageCapacity([
      { type: 'property', key: 'AsyncStorage_db_size_in_MB', value: '6' },
      { type: 'property', key: 'unrelated', value: 'keep-me' },
      { type: 'property', key: 'AsyncStorage_db_size_in_MB', value: '12' },
    ]);
    expect(properties.filter((item) => item.key === 'AsyncStorage_db_size_in_MB')).toEqual([
      { type: 'property', key: 'AsyncStorage_db_size_in_MB', value: '64' },
    ]);
    expect(properties).toContainEqual({ type: 'property', key: 'unrelated', value: 'keep-me' });
  });

  it('fingerprints large sync values without losing exact change detection', () => {
    let codec: null | {
      encodeCloudSyncSnapshotValue: (value: string | null) => string | null;
      cloudSyncSnapshotValueMatches: (stored: string | null | undefined, value: string | null) => boolean;
    } = null;
    try {
      codec = require('../app/cloud_sync_snapshot_codec');
    } catch {
      codec = null;
    }
    expect(codec).not.toBeNull();
    const large = JSON.stringify({ cards: ['x'.repeat(815_283)] });
    const encoded = codec!.encodeCloudSyncSnapshotValue(large);

    expect(encoded).toEqual(expect.stringMatching(/^@phraseman-sync-fingerprint:v1:/));
    expect(encoded!.length).toBeLessThan(160);
    expect(codec!.cloudSyncSnapshotValueMatches(encoded, large)).toBe(true);
    expect(codec!.cloudSyncSnapshotValueMatches(encoded, `${large}changed`)).toBe(false);
    expect(codec!.encodeCloudSyncSnapshotValue('small')).toBe('small');
    expect(codec!.encodeCloudSyncSnapshotValue(null)).toBeNull();
  });

  it('wires compact snapshot values into restore and diff comparison', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app/cloud_sync.ts'), 'utf8');
    expect(source).toContain('encodeCloudSyncSnapshotValue(value)');
    expect(source).toContain('cloudSyncSnapshotValueMatches(previousSnapshot[key], value)');
  });
});
