import fs from 'fs';
import path from 'path';

describe('legacy free lesson migration has no user-facing UI', () => {
  test('does not emit a toast, modal, banner, or paywall', () => {
    const migrationSource = fs.readFileSync(
      path.join(process.cwd(), 'app', 'legacy_free_lesson_access.ts'),
      'utf8',
    );
    const cloudSource = fs.readFileSync(
      path.join(process.cwd(), 'app', 'cloud_sync.ts'),
      'utf8',
    );
    const helperStart = cloudSource.indexOf('async function completeLegacyLessonMigrationAfterRestore');
    const helperEnd = cloudSource.indexOf('export async function restoreAndMigrateFromCloud', helperStart);
    expect(helperStart).toBeGreaterThan(-1);
    expect(helperEnd).toBeGreaterThan(helperStart);

    const migrationSurface = migrationSource + cloudSource.slice(helperStart, helperEnd);
    for (const forbidden of [
      "emitAppEvent('action_toast'",
      'Alert.alert',
      'Modal',
      'openPremiumPaywall',
      'showBanner',
    ]) {
      expect(migrationSurface).not.toContain(forbidden);
    }
  });
});
