import fs from 'node:fs';

const moduleFiles = [
  'admin/v2/scripts/admin-core.js', 'admin/v2/scripts/admin-router.js', 'admin/v2/scripts/admin-firebase.js',
  'admin/v2/scripts/admin-capabilities.js', 'admin/v2/scripts/admin-operational-snapshot.js',
  'admin/v2/scripts/admin-analytics-state.js', 'admin/v2/scripts/admin-analytics-trends-state.js',
  'admin/v2/scripts/admin-analytics-view.js',
  'admin/v2/scripts/components/analytics-language.js',
  'admin/v2/scripts/components/admin-time-series-chart.js',
  'admin/v2/scripts/components/admin-bar-chart.js',
  'admin/v2/scripts/pages/product-analytics.js', 'admin/v2/scripts/pages/product-sessions.js',
  'admin/v2/scripts/pages/learning-diagnostics.js', 'admin/v2/scripts/pages/conversion-diagnostics.js',
  'admin/v2/scripts/pages/retention-diagnostics.js', 'admin/v2/scripts/pages/subscription-analytics.js',
];
const directScriptFiles = [
  'admin/v2/scripts/components/analytics-language.js',
  'admin/v2/scripts/pages/product-analytics.js', 'admin/v2/scripts/pages/product-sessions.js',
  'admin/v2/scripts/pages/learning-diagnostics.js', 'admin/v2/scripts/pages/conversion-diagnostics.js',
  'admin/v2/scripts/pages/retention-diagnostics.js', 'admin/v2/scripts/pages/subscription-analytics.js',
];
const shell = fs.readFileSync('admin/v2/index.html', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const failures = [];
const warnings = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

for (const file of moduleFiles) {
  assert(fs.existsSync(file), `missing Admin 2 module: ${file}`);
  const source = fs.readFileSync(file, 'utf8');
  assert(!/ÃƒÂ|Ãƒâ€˜|\?\?\?\?/.test(source), `${file} contains broken text`);
}
for (const file of directScriptFiles) {
  assert(moduleFiles.includes(file), `${file} must remain a required Admin 2 module`);
  assert(shell.includes('/' + file.replace(/^admin\/v2\//, '')), `shell does not include ${file}`);
}
assert(
  packageJson.scripts?.['admin:serve'] === 'node tests/e2e/admin_v2_static_server.mjs',
  'admin:serve must use the repository-owned canonical-root Admin V2 loopback server',
);
const analyticsModuleFiles = moduleFiles.filter((file) => (
  file === 'admin/v2/scripts/admin-core.js'
  || file.startsWith('admin/v2/scripts/admin-analytics-')
  || file.startsWith('admin/v2/scripts/components/analytics-')
  || /^admin\/v2\/scripts\/components\/admin-(?:time-series-chart|bar-chart)\.js$/.test(file)
  || file === 'admin/v2/scripts/pages/product-analytics.js'
  || file === 'admin/v2/scripts/pages/product-sessions.js'
  || file === 'admin/v2/scripts/pages/subscription-analytics.js'
  || file.endsWith('-diagnostics.js')
));
const requiredGuardedAnalyticsFiles = [
  'admin/v2/scripts/admin-core.js',
  'admin/v2/scripts/pages/product-sessions.js',
  ...moduleFiles.filter((file) => /^admin\/v2\/scripts\/components\/admin-(?:time-series-chart|bar-chart)\.js$/.test(file)),
  ...moduleFiles.filter((file) => file.endsWith('-diagnostics.js')),
];
for (const file of requiredGuardedAnalyticsFiles) {
  assert(analyticsModuleFiles.includes(file), `${file} must be protected by the analytics Firestore guard`);
}
assert(!analyticsModuleFiles.includes('admin/v2/scripts/admin-firebase.js'), 'admin-firebase.js must not be analytics-guarded because it hosts callable bridges');
const analyticsModuleSource = analyticsModuleFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const firestoreImportPattern = /(?:\bfrom\s*|\bimport\s*\(\s*)['"][^'"]*(?:firebase-firestore|firebase\/firestore)[^'"]*['"]/;
const browserFirestoreReadPatterns = [
  firestoreImportPattern,
  /\b(?:getFirestore|getDoc|getDocs|onSnapshot|getAggregateFromServer|getCountFromServer)\s*\(/,
  /\b(?:db|firestore)\s*\.\s*(?:collection|doc)\s*\(/,
];
const usesBrowserFirestoreRead = (source) => browserFirestoreReadPatterns.some((pattern) => pattern.test(source));
const forbiddenFirestoreFixtures = [
  "import { collection } from 'firebase/firestore';",
  "import { getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';",
  'getFirestore()', 'getDoc(reference)', 'getDocs(query)', 'onSnapshot(query, callback)',
  'getAggregateFromServer(query)', 'getCountFromServer(query)', 'db.collection("users")', 'firestore.doc("users/id")',
];
const allowedFirestoreFixtures = ['collection(rows)', 'const collection = (rows) => rows;', 'document.getElementById("analytics")'];
for (const fixture of forbiddenFirestoreFixtures) assert(usesBrowserFirestoreRead(fixture), `Firestore smoke fixture must be rejected: ${fixture}`);
for (const fixture of allowedFirestoreFixtures) assert(!usesBrowserFirestoreRead(fixture), `local smoke fixture must remain allowed: ${fixture}`);
assert(!usesBrowserFirestoreRead(analyticsModuleSource), 'analytics modules must use callable bridges, not direct browser Firestore reads');
assert(shell.indexOf('analytics-language.js') < shell.indexOf('product-analytics.js'), 'analytics language helper must load first');

if (process.argv.includes('--live') || process.env.ADMIN_V2_SMOKE_LIVE === '1') {
  const base = process.env.ADMIN_V2_SMOKE_URL || 'https://phraseman-ea0b3.web.app';
  for (const [label, url] of [['root', `${base}/`]]) {
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
