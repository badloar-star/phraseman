import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const shell = read('admin/v2/index.html');
const root = read('admin/index.html');
const legacy = read('admin/legacy.html');
const core = read('admin/v2/scripts/admin-core.js');
const router = read('admin/v2/scripts/admin-router.js');
const firebase = read('admin/v2/scripts/admin-firebase.js');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const start = core.indexOf('export const ADMIN_SECTIONS');
const end = core.indexOf(']);', start);
const sectionSource = core.slice(start, end);
const routes = [...sectionSource.matchAll(/route: '([^']+)'/g)].map((match) => match[1]);
const expected = ['overview', 'application', 'users', 'money', 'content', 'community', 'diagnostics'];

assert(shell.includes('name="viewport"'), 'responsive viewport is missing');
assert(JSON.stringify(routes) === JSON.stringify(expected), `expected seven ordered routes, got ${routes.join(', ')}`);
assert(shell.includes('/v2/styles/admin.css') && shell.includes('/v2/scripts/admin-router.js'), 'Admin 2 asset paths are not hosting-safe');
assert(root.includes("window.location.replace('/v2/'"), 'hosting root does not open Admin 2');
assert(legacy.includes('id="tab-analytics"'), 'legacy fallback is not preserved');
assert(router.includes("'control-panel': 'control-panel'"), 'legacy control-panel route alias is missing');
assert(firebase.includes('onAuthStateChanged') && firebase.includes('claims.admin'), 'admin claim gate is missing');
assert(core.includes('data-action="preview-release-maintenance"'), 'maintenance preview action is missing');
assert(core.includes('data-action="preview-promo-banner"'), 'promo banner preview action is missing');
assert(core.includes('data-action="preview-app-message"'), 'app message preview action is missing');
assert(!/[😀-🙏🌀-🫿]/u.test(shell), 'emoji are used as primary shell icons');

const result = { verdict: failures.length ? 'FAIL' : 'PASS', routes, failures };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
