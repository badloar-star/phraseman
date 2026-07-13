import fs from 'fs';
import path from 'path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Admin v2 native Plus Control Center', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');
  const capabilities = read('admin/v2/scripts/admin-capabilities.js');
  const functionsIndex = read('functions/src/index.ts');
  const server = read('functions/src/admin_plus_control.ts');
  const legacy = read('admin/index.html');
  const rules = read('firestore.rules');
  const indexes = JSON.parse(read('firestore.indexes.json'));

  test('moves premium, vip and plus-radar to the native Money route', () => {
    expect(capabilities).toContain("premium: 'money'");
    expect(capabilities).toContain("vip: 'money'");
    expect(capabilities).toContain("'plus-radar': 'money'");
    expect(core).toContain('renderPlusControlCenter');
    expect(core).toContain('data-action="load-plus-control"');
    expect(legacy).toContain("window.location.href = './v2/index.html#premium'");
    expect(legacy).toContain("window.location.href = './v2/index.html#vip'");
    expect(legacy).toContain("window.location.href = './v2/index.html#plus-radar'");
    expect(capabilities).toContain("capabilityId: directCapability.id");
  });

  test('uses one protected server projection and never scans users in the browser', () => {
    expect(functionsIndex).toContain('adminGetPlusControlWorkspace');
    expect(functionsIndex).toContain('adminPreviewLegacyPlusMigration');
    expect(functionsIndex).toContain('adminApplyLegacyPlusMigration');
    expect(firebase).toContain('adminGetPlusControlWorkspace');
    expect(firebase).toContain('ReCaptchaEnterpriseProvider');
    expect(firebase).toContain('await getToken(appCheck, false)');
    expect(server.match(/enforceAppCheck: true/g)).toHaveLength(3);
    expect(server).toContain("roleFor(request, 'money.read')");
    expect(server).toContain('hasPermission(role, permission)');
    expect(server).toContain('admin_plus_control_snapshots');
    expect(server).toContain('packPlusControlSnapshot');
    expect(server).toContain('SNAPSHOT_MAX_ENCODED_CHARS = 8_000_000');
    expect(core).toContain('workspace?.snapshotCursor');
    expect(server).toContain('source:');
    expect(core).not.toContain('buildPlusRadarRows(window._users');
    expect(core).toContain("action === 'preview-plus-migration'");
    expect(core).toContain("action === 'apply-plus-migration'");
    expect(legacy).toContain('repairAdminGrantPremiumCompatV2');
    expect(rules).toContain('match /admin_plus_migration_previews/{docId} { allow read, write: if false; }');
    expect(rules).toContain('match /admin_plus_control_snapshots/{document=**} { allow read, write: if false; }');
  });

  test('adds the RevenueCat profile query index using eventTimestampMs', () => {
    const match = indexes.indexes.find((index: any) => index.collectionGroup === 'revenuecat_premium_events'
      && index.fields.some((field: any) => field.fieldPath === 'uid' && field.order === 'ASCENDING')
      && index.fields.some((field: any) => field.fieldPath === 'eventTimestampMs' && field.order === 'DESCENDING'));
    expect(match).toBeDefined();
  });
});
