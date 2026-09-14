import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('admin/v2/legacy.html', 'utf8');

test('live admin keeps the login gate and stable session DOM', () => {
  for (const marker of ['id="admin-login"', 'id="admin-login-card"', 'id="admin-login-err"', 'id="admin-signin-google"', 'id="admin-app"', 'pm-admin-authenticated']) {
    assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(source, /permission-denied|permission_denied/);
  assert.match(source, /signOut|logout/i);
});

test('admin surface boundary and App Check owner restriction remain visible', () => {
  assert.doesNotMatch(source, /admin\/v2\/index\.html|white admin v2 router/i);
  assert.match(fs.readFileSync('functions/src/callable_options.ts', 'utf8'), /ADMIN_SENSITIVE_WRITE_OPTIONS/);
  assert.match(fs.readFileSync('functions/src/admin_sensitive_writes.test.ts', 'utf8'), /App Check|app.?check/i);
});
