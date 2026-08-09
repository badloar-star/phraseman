const fs = require('fs');
const path = require('path');

test('the permanently banned admin v2 cannot be the active admin entry or Hosting source', () => {
  const firebase = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firebase.json'), 'utf8'));
  const adminHosting = firebase.hosting.find((entry: { target?: string }) => entry.target === 'admin');
  const entry = fs.readFileSync(path.join(__dirname, '..', 'admin', 'index.html'), 'utf8');
  const guard = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'deploy_lock_guard.mjs'), 'utf8');

  expect(adminHosting.public).toBe('admin');
  expect(adminHosting.redirects).toEqual(expect.arrayContaining([
    expect.objectContaining({ source: '/v2/**', destination: '/legacy.html' }),
  ]));
  expect(entry).not.toMatch(/admin\/v2|["']\/v2\/?["']/u);
  expect(entry).toContain('/legacy.html');
  expect(guard).toContain('admin/v2 is permanently banned');
});
