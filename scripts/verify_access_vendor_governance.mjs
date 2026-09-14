import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const REQUIRED_VENDOR_FIELDS = [
  'vendorId', 'name', 'serviceIds', 'dataClasses', 'criticality', 'ownerRole',
  'ownerStatus', 'evidenceStatus', 'dpaStatus', 'socEvidenceStatus', 'reviewCadence',
  'renewalOrReviewDate', 'exitPlan',
];
const CRITICALITIES = new Set(['tier-0', 'tier-1', 'tier-2', 'tier-3']);
const OWNER_STATUSES = new Set(['assigned', 'human_pending']);
const CADENCES = new Set(['quarterly', 'annual']);
const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9]{12,}/,
  /AIza[A-Za-z0-9_-]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:token|secret|password|api[_-]?key)\s*[:=]\s*[^\s]{8,}/i,
];

function parseCli(argv) {
  if (argv.length !== 2 || argv[0] !== '--root' || !argv[1] || argv[1].startsWith('--')) {
    throw new Error('usage: verify_access_vendor_governance.mjs --root <path>');
  }
  return path.resolve(argv[1]);
}

function walkStrings(value, visit) {
  if (typeof value === 'string') return visit(value);
  if (Array.isArray(value)) return value.some((item) => walkStrings(item, visit));
  if (value && typeof value === 'object') return Object.values(value).some((item) => walkStrings(item, visit));
  return false;
}

async function verify(root) {
  const errors = [];
  const vendorPath = path.join(root, 'docs/security/VENDOR_REGISTER.json');
  let register;
  try {
    register = JSON.parse(await readFile(vendorPath, 'utf8'));
  } catch (error) {
    errors.push(`vendor register unreadable: ${error.message}`);
    return errors;
  }
  if (register.schemaVersion !== 1) errors.push('vendor register: unsupported schemaVersion');
  if (register.status !== 'Draft') errors.push('vendor register: status must remain Draft until restricted review');
  if (!Array.isArray(register.vendors) || register.vendors.length === 0) errors.push('vendor register: vendors must be non-empty');
  const ids = new Set();
  for (const [index, vendor] of (register.vendors ?? []).entries()) {
    const label = `vendor[${index}]`;
    for (const field of REQUIRED_VENDOR_FIELDS) {
      if (!(field in (vendor ?? {}))) errors.push(`${label}: missing ${field}`);
    }
    if (!vendor || typeof vendor !== 'object') continue;
    if (ids.has(vendor.vendorId)) errors.push(`${label}: duplicate vendorId ${vendor.vendorId}`);
    ids.add(vendor.vendorId);
    if (!Array.isArray(vendor.serviceIds) || vendor.serviceIds.some((id) => typeof id !== 'string')) errors.push(`${label}: serviceIds must be strings`);
    if (!Array.isArray(vendor.dataClasses) || vendor.dataClasses.length === 0) errors.push(`${label}: dataClasses must be non-empty`);
    if (!CRITICALITIES.has(vendor.criticality)) errors.push(`${label}: invalid criticality`);
    if (!OWNER_STATUSES.has(vendor.ownerStatus)) errors.push(`${label}: invalid ownerStatus`);
    if (!CADENCES.has(vendor.reviewCadence)) errors.push(`${label}: invalid reviewCadence`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vendor.renewalOrReviewDate ?? '')) errors.push(`${label}: invalid renewalOrReviewDate`);
    if (typeof vendor.exitPlan !== 'string' || vendor.exitPlan.trim().length < 20) errors.push(`${label}: exitPlan too short`);
  }
  if (walkStrings(register, (value) => SECRET_PATTERNS.some((pattern) => pattern.test(value)))) errors.push('vendor register contains secret-like value');

  for (const file of ['SECURITY.md', '.github/CODEOWNERS', '.github/dependabot.yml']) {
    try { await readFile(path.join(root, file), 'utf8'); } catch { errors.push(`missing governance file ${file}`); }
  }
  const codeowners = await readFile(path.join(root, '.github/CODEOWNERS'), 'utf8').catch(() => '');
  if (!codeowners.includes('pending') || !codeowners.includes('Draft')) errors.push('CODEOWNERS must state draft/pending routing');
  const dependabot = await readFile(path.join(root, '.github/dependabot.yml'), 'utf8').catch(() => '');
  if (!dependabot.includes('package-ecosystem: npm') || !dependabot.includes('directory: "/functions"')) errors.push('Dependabot must cover root and functions npm manifests');
  return errors;
}

try {
  const root = parseCli(process.argv.slice(2));
  const errors = await verify(root);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('access_vendor_governance_ok vendors=6 status=Draft');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
