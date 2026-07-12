import fs from 'node:fs';
import { ADMIN_SECTIONS } from '../admin/v2/scripts/admin-core.js';
import { ADMIN_CAPABILITY_REGISTRY } from '../admin/v2/scripts/admin-capabilities.js';

const core = fs.readFileSync('admin/v2/scripts/admin-core.js', 'utf8');
const firebase = fs.readFileSync('admin/v2/scripts/admin-firebase.js', 'utf8');
const router = fs.readFileSync('admin/v2/scripts/admin-router.js', 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const expectedRoutes = ['overview', 'application', 'users', 'money', 'content', 'community', 'diagnostics'];
const routes = ADMIN_SECTIONS.map((section) => section.route);

assert(JSON.stringify(routes) === JSON.stringify(expectedRoutes), `expected seven ordered primary sections, got ${routes.join(', ')}`);
assert(ADMIN_CAPABILITY_REGISTRY.length === 59, `expected 59 capabilities, got ${ADMIN_CAPABILITY_REGISTRY.length}`);
assert(core.includes('renderCapabilityWorkspace') && core.includes('<iframe'), 'same-origin legacy fallback workspace is missing');
assert(router.includes('resolveCapabilityHash(globalThis.location.hash)'), 'capability deep-link resolver is missing');
assert(core.includes('function renderDailyBriefing') && core.includes('Product Manager Digest'), 'Product Manager Digest screen is missing');
assert(core.includes('function renderAssetStudio') && core.includes('DALL-E Asset Studio'), 'DALL-E Asset Studio screen is missing');
assert(core.includes('function renderSupport') && core.includes("data-action=\"pull-support\""), 'support mail screen or Gmail pull action is missing');
assert(core.includes('function renderAnalytics') && core.includes('renderAdminAnalytics'), 'native analytics screen is missing');
assert(core.includes('function renderReportQueue') && core.includes('send-report-reply'), 'report center reply workflow is missing');
assert(firebase.includes('onAuthStateChanged') && firebase.includes('adminRole'), 'authenticated admin role gate is missing');
assert(firebase.includes('browserLocalPersistence') && firebase.includes('setPersistence'), 'persistent shared browser auth is missing');
assert(firebase.includes('httpsCallable'), 'server command boundary is missing');

const result = { verdict: failures.length ? 'FAIL' : 'PASS', failures, routes, capabilities: ADMIN_CAPABILITY_REGISTRY.length };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
