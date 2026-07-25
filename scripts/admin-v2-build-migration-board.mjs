import fs from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const root = process.cwd();
const defaultBoardPath = path.join(root, 'docs', 'admin', 'ADMIN_V2_MIGRATION_COVERAGE.json');
const boardPath = process.env.ADMIN_V2_MIGRATION_BOARD_PATH
  ? path.resolve(process.env.ADMIN_V2_MIGRATION_BOARD_PATH)
  : defaultBoardPath;
const capabilityPath = path.join(root, 'admin', 'v2', 'scripts', 'admin-capabilities.js');

const APPROVED_SOURCE_COUNTS = Object.freeze({
  buttons: 441,
  functions: 952,
  links: 357,
});
const APPROVED_ROUTES = Object.freeze([
  'overview',
  'application',
  'users',
  'money',
  'content',
  'community',
  'diagnostics',
]);
const APPROVED_NATIVE_CAPABILITY_IDS = Object.freeze([
  'daily-digest',
  'remote-config',
  'paywall-ab',
  'app-messages',
  'users',
  'reports',
  'gmail-support',
  'analytics',
  'openai-budget',
  'promo-codes',
  'coin-center',
  'asset-studio',
  'plans',
]);
// These pages were created directly in Admin V2 and therefore are not rows in
// the historical migration inventory. They still must use a native V2 route.
const V2_ONLY_NATIVE_CAPABILITY_IDS = Object.freeze([
  'english-test',
]);
const NATIVE_PAGE_ROUTES = new Set([
  ...APPROVED_ROUTES,
  'support',
  'analytics',
  'daily-briefing',
  'report-center',
  'asset-studio',
  'campaigns',
  'control-panel',
  'admin-settings',
  'agent-office',
  'agent-manager',
  'plans',
  'coin-center',
  'english-test',
]);
const STATUS_KEYS = Object.freeze(['inventory', 'ported', 'fallback', 'guarded', 'blocked']);

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Migration board check failed:\n- cannot read ${filePath}: ${error.message}`);
    process.exit(1);
  }
}

function countStatuses(rows) {
  const counts = Object.fromEntries(STATUS_KEYS.map((key) => [key, 0]));
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(counts, row?.status)) counts[row.status] += 1;
  }
  return counts;
}

function sameMembers(actual, expected) {
  return actual.length === expected.length
    && [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
}

function validateUnique(rows, key, label, errors) {
  const values = rows.map((row) => row?.[key]);
  if (values.some((value) => typeof value !== 'string' || !value)) {
    errors.push(`${label}.${key} values must be non-empty strings`);
  }
  if (new Set(values).size !== values.length) errors.push(`${label}.${key} values must be unique`);
}

const board = readJson(boardPath);
const capabilitySource = fs.readFileSync(capabilityPath, 'utf8');
const capabilityModuleUrl = `data:text/javascript;base64,${Buffer.from(capabilitySource).toString('base64')}`;
const { ADMIN_CAPABILITY_REGISTRY } = await import(capabilityModuleUrl);
const errors = [];

if (board.schemaVersion !== 2) errors.push('schemaVersion must equal 2');
for (const [key, expected] of Object.entries(APPROVED_SOURCE_COUNTS)) {
  if (board.source?.[key] !== expected) errors.push(`source.${key} must equal ${expected}`);
}
if (!sameMembers(Array.isArray(board.routes) ? board.routes : [], APPROVED_ROUTES)) {
  errors.push(`routes must contain exactly: ${APPROVED_ROUTES.join(', ')}`);
}

const buttonCoverage = Array.isArray(board.buttonCoverage) ? board.buttonCoverage : [];
const functionCoverage = Array.isArray(board.functionCoverage) ? board.functionCoverage : [];
const capabilityCoverage = Array.isArray(board.capabilityCoverage) ? board.capabilityCoverage : [];
if (buttonCoverage.length !== APPROVED_SOURCE_COUNTS.buttons) {
  errors.push(`buttonCoverage length must equal ${APPROVED_SOURCE_COUNTS.buttons}`);
}
if (functionCoverage.length !== APPROVED_SOURCE_COUNTS.functions) {
  errors.push(`functionCoverage length must equal ${APPROVED_SOURCE_COUNTS.functions}`);
}
validateUnique(buttonCoverage, 'coverageId', 'buttonCoverage', errors);
validateUnique(buttonCoverage, 'buttonKey', 'buttonCoverage', errors);
validateUnique(functionCoverage, 'coverageId', 'functionCoverage', errors);
validateUnique(capabilityCoverage, 'capabilityId', 'capabilityCoverage', errors);

for (const [label, rows] of [['buttonCoverage', buttonCoverage], ['functionCoverage', functionCoverage]]) {
  rows.forEach((row, index) => {
    if (!APPROVED_ROUTES.includes(row?.target?.route)) {
      errors.push(`${label}[${index}].target.route must be an approved route`);
    }
  });
}

for (const [label, rows] of [
  ['capabilities', capabilityCoverage],
  ['buttons', buttonCoverage],
  ['functions', functionCoverage],
]) {
  const savedSummary = board.summary?.[label];
  const counted = countStatuses(rows);
  if (savedSummary?.total !== rows.length) errors.push(`summary.${label}.total must equal ${rows.length}`);
  for (const key of STATUS_KEYS) {
    if (savedSummary?.[key] !== counted[key]) {
      errors.push(`summary.${label}.${key} must equal ${counted[key]}`);
    }
  }
}

const registry = Array.isArray(ADMIN_CAPABILITY_REGISTRY) ? ADMIN_CAPABILITY_REGISTRY : [];
const registryIds = registry.map((capability) => capability?.id);
const allowedRegistryIds = [...APPROVED_NATIVE_CAPABILITY_IDS, ...V2_ONLY_NATIVE_CAPABILITY_IDS];
if (!sameMembers(registryIds, allowedRegistryIds)) {
  errors.push(`native registry ids must contain exactly: ${allowedRegistryIds.join(', ')}`);
}
validateUnique(registry, 'id', 'native registry', errors);

const coverageByCapabilityId = new Map(capabilityCoverage.map((row) => [row.capabilityId, row]));
for (const [index, capability] of registry.entries()) {
  const keys = Object.keys(capability).sort();
  const expectedKeys = ['description', 'id', 'label', 'migrationStatus', 'nativeRoute', 'route'];
  if (!sameMembers(keys, expectedKeys)) {
    errors.push(`native registry[${index}] must use the approved native schema`);
  }
  if (capability.migrationStatus !== 'native') {
    errors.push(`native registry ${capability.id} migrationStatus must equal native`);
  }
  if (!APPROVED_ROUTES.includes(capability.route)) {
    errors.push(`native registry ${capability.id} route must be an approved route`);
  }
  if (!NATIVE_PAGE_ROUTES.has(capability.nativeRoute)) {
    errors.push(`native registry ${capability.id} nativeRoute must be a native V2 page`);
  }
  if (!capability.label || !capability.description) {
    errors.push(`native registry ${capability.id} label and description must be non-empty`);
  }

  if (V2_ONLY_NATIVE_CAPABILITY_IDS.includes(capability.id)) continue;
  const saved = coverageByCapabilityId.get(capability.id);
  if (!saved) {
    errors.push(`saved board must contain native registry capability ${capability.id}`);
  } else {
    if (saved.route !== capability.route) {
      errors.push(`saved board route for ${capability.id} must equal ${capability.route}`);
    }
    if (saved.nativeRoute !== capability.nativeRoute) {
      errors.push(`saved board nativeRoute for ${capability.id} must equal ${capability.nativeRoute}`);
    }
  }
}

if (errors.length) {
  console.error(`Migration board check failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  process.exit(1);
}

console.log(JSON.stringify({
  checked: boardPath,
  state: 'verified',
  buttons: board.source.buttons,
  functions: board.source.functions,
  links: board.source.links,
  capabilities: capabilityCoverage.length,
  nativeCapabilities: registry.length,
  routes: APPROVED_ROUTES,
}, null, 2));
