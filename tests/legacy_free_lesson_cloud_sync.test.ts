import fs from 'fs';
import path from 'path';
import {
  FRENCH_TARGET_SYNC_KEYS,
  SYNC_KEYS,
  __cloudSyncTestHooks,
  accountLocalDataKeysForToday,
} from '../app/cloud_sync';
import {
  legacyFreeLessonCapKey,
  legacyFreeLessonMigrationKey,
} from '../app/target_storage_keys';

describe('legacy free lesson cloud integration', () => {
  const cloudSyncSource = fs.readFileSync(
    path.join(process.cwd(), 'app', 'cloud_sync.ts'),
    'utf8',
  );

  test('syncs and account-wipes both target-scoped cap records', () => {
    const englishKeys = [
      legacyFreeLessonCapKey('en'),
      legacyFreeLessonMigrationKey('en'),
    ];
    const frenchKeys = [
      legacyFreeLessonCapKey('fr'),
      legacyFreeLessonMigrationKey('fr'),
    ];

    expect(SYNC_KEYS).toEqual(expect.arrayContaining(englishKeys));
    expect(FRENCH_TARGET_SYNC_KEYS).toEqual(expect.arrayContaining(frenchKeys));
    expect(accountLocalDataKeysForToday('2026-07-15')).toEqual(
      expect.arrayContaining([...englishKeys, ...frenchKeys]),
    );
  });

  test('routes cap and completion marker through the real restore merge', () => {
    const { mergeLessonRestoreValue } = __cloudSyncTestHooks;
    expect(mergeLessonRestoreValue(legacyFreeLessonCapKey('en'), '5', '7')).toBe('7');
    expect(mergeLessonRestoreValue(legacyFreeLessonCapKey('fr'), '8', '4')).toBe('8');
    expect(mergeLessonRestoreValue(legacyFreeLessonCapKey('en'), '99', '2')).toBe('8');
    expect(mergeLessonRestoreValue(
      legacyFreeLessonMigrationKey('en'),
      'complete',
      null,
    )).toBe('complete');
  });

  test('runs the silent migration after every public cloud restore result', () => {
    expect(cloudSyncSource).toContain('migrateLegacyFreeLessonAccessForAllTargets(attempt.status)');
    expect(cloudSyncSource).toContain('completeLegacyLessonMigrationAfterRestore');

    const booleanRestoreStart = cloudSyncSource.indexOf(
      'export async function restoreAndMigrateFromCloud()',
    );
    const detailedRestoreStart = cloudSyncSource.indexOf(
      'export async function restoreFromCloudDetailed',
    );
    expect(booleanRestoreStart).toBeGreaterThan(-1);
    expect(detailedRestoreStart).toBeGreaterThan(booleanRestoreStart);

    const booleanRestoreBody = cloudSyncSource.slice(booleanRestoreStart, detailedRestoreStart);
    const detailedRestoreBody = cloudSyncSource.slice(detailedRestoreStart);
    expect(booleanRestoreBody).toContain('completeLegacyLessonMigrationAfterRestore');
    expect(detailedRestoreBody).toContain('completeLegacyLessonMigrationAfterRestore');
  });
});
