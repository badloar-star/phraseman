import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const layout = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
const events = fs.readFileSync(path.join(root, 'app/events.ts'), 'utf8');

test('startup converges post-delete identity before anonymous auth or cloud restore', () => {
  const bootstrapStart = layout.indexOf('const bootstrap = async');
  const bootstrap = layout.slice(bootstrapStart, layout.indexOf('runHeavyInitRef.current', bootstrapStart));
  const fresh = bootstrap.indexOf("ensureFreshPostDeletionIdentity('startup')");
  expect(fresh).toBeGreaterThanOrEqual(0);
  expect(fresh).toBeLessThan(bootstrap.indexOf('runAuthRecoveryBootGate'));
  expect(fresh).toBeLessThan(bootstrap.indexOf('restoreCloudForBoot'));
});

test('retired and foreground signals coalesce through the same coordinator without a second modal', () => {
  expect(events).toContain('identity_retired:');
  expect(events).toContain('post_delete_identity_ready:');
  expect(layout).toContain("onAppEvent('identity_retired'");
  expect(layout).toContain("ensureFreshPostDeletionIdentity('identity_retired',");
  expect(layout).toContain("ensureFreshPostDeletionIdentity('foreground')");
  expect(layout).not.toContain('PostDeleteRecoveryModal');
});
