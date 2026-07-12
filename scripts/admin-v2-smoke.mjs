import fs from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const root = process.cwd();
const liveBase = process.env.ADMIN_V2_SMOKE_URL || 'https://phraseman-ea0b3.web.app';
const localOnly = process.argv.includes('--local');
const failures = [];
const warnings = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const scriptFiles = fs.readdirSync(path.join(root, 'admin', 'v2', 'scripts'))
  .filter((name) => name.endsWith('.js'))
  .sort()
  .map((name) => `admin/v2/scripts/${name}`);
const sourceFiles = ['admin/v2/index.html', ...scriptFiles];
const sourceText = sourceFiles.map(read).join('\n');
const legacyFiles = ['admin/index.html', 'admin/testers.html', 'admin/beta_testers.html', 'admin/full.html', 'admin/site.html'];
const legacyIndex = read('admin/index.html');
const capabilitySource = read('admin/v2/scripts/admin-capabilities.js');
const capabilityModuleUrl = `data:text/javascript;base64,${Buffer.from(capabilitySource).toString('base64')}`;
const { ADMIN_CAPABILITY_REGISTRY } = await import(capabilityModuleUrl);

checkLocalShell();
checkCapabilityParity();
checkActionCoverage();
checkAccessibility();
checkCacheContinuity();
if (!localOnly) await checkLiveHosting();

const result = {
  verdict: failures.length ? 'FAIL' : 'PASS',
  mode: localOnly ? 'local' : 'live',
  liveBase,
  evidence: {
    capabilities: ADMIN_CAPABILITY_REGISTRY.length,
    nativeCapabilities: ADMIN_CAPABILITY_REGISTRY.filter((item) => item.nativeRoute).length,
    fallbackCapabilities: ADMIN_CAPABILITY_REGISTRY.filter((item) => !item.nativeRoute).length,
    legacyFiles: legacyFiles.length,
    legacyTabs: [...legacyIndex.matchAll(/<div id="tab-([^"]+)"/g)].length,
  },
  failures,
  warnings,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);

function checkLocalShell() {
  const index = read('admin/v2/index.html');
  assert(index.includes('name="viewport"'), 'responsive viewport is missing');
  assert(index.includes('id="primary-nav"'), 'dynamic primary navigation mount is missing');
  assert(index.includes('id="app"'), 'application workspace mount is missing');
  assert(index.includes('./scripts/admin-router.js'), 'router module is not loaded by the shell');
  assert(index.includes('./styles/admin.css'), 'admin stylesheet is not loaded by the shell');
  for (const file of sourceFiles) {
    const source = read(file);
    assert(!/Ã|Ã‘|\?\?\?\?/.test(source), `${file} contains mojibake or broken text`);
    if (!file.endsWith('.js')) continue;
    for (const match of source.matchAll(/(?:from\s+|import\s*)['"](\.\.?\/[^'"]+)['"]/g)) {
      const imported = path.resolve(path.dirname(path.join(root, file)), match[1]);
      assert(fs.existsSync(imported), `${file} imports missing module ${match[1]}`);
    }
  }
}

function checkCapabilityParity() {
  const ids = ADMIN_CAPABILITY_REGISTRY.map((item) => item.id);
  const registeredTabs = ADMIN_CAPABILITY_REGISTRY.filter((item) => item.legacyTab).map((item) => item.legacyTab).sort();
  const legacyTabs = [...legacyIndex.matchAll(/<div id="tab-([^"]+)"/g)].map((match) => match[1]).sort();
  const registeredPages = ADMIN_CAPABILITY_REGISTRY.filter((item) => item.legacyPage).map((item) => `admin/${item.legacyPage}`).sort();
  assert(ADMIN_CAPABILITY_REGISTRY.length === 59, `expected 59 capabilities, got ${ADMIN_CAPABILITY_REGISTRY.length}`);
  assert(new Set(ids).size === ids.length, 'capability registry contains duplicate ids');
  assert(JSON.stringify(registeredTabs) === JSON.stringify(legacyTabs), 'not every legacy tab is registered exactly once');
  assert(JSON.stringify(registeredPages) === JSON.stringify(legacyFiles.slice(1).sort()), 'standalone legacy pages are not registered exactly once');
  assert(ADMIN_CAPABILITY_REGISTRY.filter((item) => item.nativeRoute).length === 16, 'native capability count drifted from 16');
  assert(ADMIN_CAPABILITY_REGISTRY.filter((item) => !item.nativeRoute).length === 43, 'fallback capability count drifted from 43');
  for (const file of legacyFiles) assert(fs.existsSync(path.join(root, file)), `legacy source is missing: ${file}`);
}

function checkActionCoverage() {
  const declared = unique([...sourceText.matchAll(/data-action=[\\]?['"]([^'"]+)/g)].map((match) => match[1]));
  const handled = new Set([...sourceText.matchAll(/action\s*===\s*['"]([^'"]+)/g)].map((match) => match[1]));
  const missing = declared.filter((action) => !handled.has(action));
  assert(declared.length >= 65, `expected at least 65 native actions, got ${declared.length}`);
  assert(!missing.length, `native actions without handlers: ${missing.join(', ')}`);
  for (const attribute of ['data-support-filter', 'data-factory-step', 'data-select-job', 'data-select-asset-job', 'data-capability-id']) {
    assert(sourceText.includes(`getAttribute('${attribute}')`) || sourceText.includes(`closest('[${attribute}]')`), `${attribute} has no delegated interaction handler`);
  }
}

function checkAccessibility() {
  const buttonTags = [...sourceText.matchAll(/<button\b[\s\S]*?>/g)].map((match) => match[0]);
  const missingTooltip = buttonTags.filter((tag) => !/(?:title|aria-label)=/.test(tag));
  assert(buttonTags.length >= 100, `native button inventory unexpectedly small: ${buttonTags.length}`);
  assert(!missingTooltip.length, `${missingTooltip.length} native buttons lack title or aria-label`);
  assert(!/[😀-🙏🌀-🫿]/u.test(sourceText), 'emoji are used as native interface icons');
  const css = read('admin/v2/styles/admin.css');
  assert(css.includes(':focus-visible'), 'visible keyboard focus style is missing');
  assert(css.includes('@media (prefers-reduced-motion: reduce)'), 'reduced-motion override is missing');
}

function checkCacheContinuity() {
  const rules = read('firestore.rules');
  for (const collectionName of ['choice_explanations', 'phrase_explanations', 'mistake_explanations', 'quiz_explanations', 'compass_briefings']) {
    assert(legacyIndex.includes(collectionName), `legacy cache reader is missing ${collectionName}`);
    assert(rules.includes(collectionName), `Firestore rules are missing ${collectionName}`);
  }
  assert(capabilitySource.includes("id: 'explain-cache'"), 'explanation cache capability is missing');
  assert(capabilitySource.includes("id: 'compass'"), 'Compass cache capability is missing');
  const firebaseSource = read('admin/v2/scripts/admin-firebase.js');
  assert(firebaseSource.includes('browserLocalPersistence'), 'v2 auth does not explicitly use persistent browser auth');
  assert(legacyIndex.includes("fetch('/__/firebase/init.json'"), 'legacy fallback does not share Hosting Firebase configuration');
}

async function checkLiveHosting() {
  const liveFiles = [
    ['v2-index', '/v2/index.html'],
    ['v2-style', '/v2/styles/admin.css'],
    ...scriptFiles.map((file) => [file, `/${file.replaceAll('\\', '/')}`]),
    ...legacyFiles.map((file) => [file, `/${file.replace(/^admin\//, '')}`]),
    ['migration-board', '/v2/data/ADMIN_V2_MIGRATION_COVERAGE.json'],
  ];
  for (const [label, pathname] of liveFiles) {
    try {
      const response = await fetch(`${liveBase}${pathname}`, { cache: 'no-store', redirect: 'follow' });
      assert(response.ok, `${label} returned HTTP ${response.status}`);
      if (label === 'v2-index') {
        const text = await response.text();
        assert(text.includes('./scripts/admin-router.js'), 'live v2 shell does not load the router');
      }
      if (label === 'admin/index.html') {
        const framePolicy = response.headers.get('x-frame-options') || '';
        const csp = response.headers.get('content-security-policy') || '';
        assert(framePolicy.toUpperCase() === 'SAMEORIGIN', `legacy frame policy is ${framePolicy || 'missing'}, expected SAMEORIGIN`);
        assert(/frame-ancestors\s+'self'/.test(csp), 'legacy CSP does not restrict framing to same origin');
      }
    } catch (error) {
      failures.push(`${label} live check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function unique(values) {
  return [...new Set(values)].sort();
}
