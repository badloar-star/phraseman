import fs from 'node:fs';

const moduleFiles = [
  'admin/v2/scripts/admin-core.js', 'admin/v2/scripts/admin-router.js', 'admin/v2/scripts/admin-firebase.js',
  'admin/v2/scripts/admin-capabilities.js', 'admin/v2/scripts/admin-operational-snapshot.js',
  'admin/v2/scripts/admin-analytics-state.js', 'admin/v2/scripts/admin-analytics-view.js',
  'admin/v2/scripts/components/analytics-language.js',
  'admin/v2/scripts/pages/product-analytics.js', 'admin/v2/scripts/pages/product-sessions.js',
  'admin/v2/scripts/pages/learning-diagnostics.js', 'admin/v2/scripts/pages/conversion-diagnostics.js',
  'admin/v2/scripts/pages/retention-diagnostics.js', 'admin/v2/scripts/pages/subscription-analytics.js',
];
const shell = fs.readFileSync('admin/v2/index.html', 'utf8');
const failures = [];
const warnings = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

for (const file of moduleFiles) {
  assert(fs.existsSync(file), `missing Admin 2 module: ${file}`);
  const source = fs.readFileSync(file, 'utf8');
  assert(!/ÃƒÂ|Ãƒâ€˜|\?\?\?\?/.test(source), `${file} contains broken text`);
  if (file.includes('/pages/') || file.includes('/components/')) {
    assert(shell.includes('/v2/' + file.replace(/^admin\/v2\//, '')), `shell does not include ${file}`);
  }
}
assert(!/\bgetDocs\s*\(|\bcollection\s*\(/.test(moduleFiles.filter((file) => file.includes('/pages/')).map((file) => fs.readFileSync(file, 'utf8')).join('\n')), 'detailed analytics must use callable bridges, not browser Firestore reads');
assert(shell.indexOf('analytics-language.js') < shell.indexOf('product-analytics.js'), 'analytics language helper must load first');

if (process.argv.includes('--live') || process.env.ADMIN_V2_SMOKE_LIVE === '1') {
  const base = process.env.ADMIN_V2_SMOKE_URL || 'https://phraseman-ea0b3.web.app';
  for (const [label, url] of [['root', `${base}/`], ['shell', `${base}/v2/`]]) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      assert(response.ok, `${label} live response ${response.status}`);
    } catch (error) {
      failures.push(`${label} live fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} else warnings.push('Live checks skipped; run with --live after deployment.');

console.log(JSON.stringify({ verdict: failures.length ? 'FAIL' : 'PASS', failures, warnings }, null, 2));
if (failures.length) process.exit(1);
