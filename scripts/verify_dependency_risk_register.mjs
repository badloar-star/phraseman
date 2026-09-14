import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const SEVERITIES = new Set(['moderate', 'high', 'critical']);
const STATUSES = new Set(['open', 'resolved', 'accepted']);
const TREATMENTS = new Set(['mitigate', 'update', 'accept']);
const SECRET_PATTERNS = [/sk-[A-Za-z0-9]{12,}/, /AIza[A-Za-z0-9_-]{20,}/, /BEGIN .*PRIVATE KEY/];

function parseCli(argv) {
  const values = { root: '.', register: 'docs/security/DEPENDENCY_RISK_REGISTER.json', asOf: new Date().toISOString().slice(0, 10) };
  const valueFlags = new Set(['--root', '--register', '--as-of']);
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!valueFlags.has(flag)) throw new Error(`unknown argument: ${flag}`);
    if (seen.has(flag)) throw new Error(`duplicate argument: ${flag}`);
    seen.add(flag);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${flag}`);
    if (flag === '--root') values.root = value;
    if (flag === '--register') values.register = value;
    if (flag === '--as-of') values.asOf = value;
    index += 1;
  }
  return values;
}

function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const result = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(result.valueOf()) || result.toISOString().slice(0, 10) !== value ? null : result;
}

function walkStrings(value, visit) {
  if (typeof value === 'string') return visit(value);
  if (Array.isArray(value)) return value.some((item) => walkStrings(item, visit));
  if (value && typeof value === 'object') return Object.values(value).some((item) => walkStrings(item, visit));
  return false;
}

async function verify(root, registerFile, asOf) {
  const errors = [];
  let register;
  try { register = JSON.parse(await readFile(path.resolve(root, registerFile), 'utf8')); }
  catch (error) { return [`register unreadable: ${error.message}`]; }
  if (register.schemaVersion !== 1) errors.push('register: unsupported schemaVersion');
  if (register.status !== 'Draft') errors.push('register: status must remain Draft until owner/release review');
  const asOfDate = date(asOf);
  if (!asOfDate) errors.push(`invalid as-of date ${asOf}`);
  if (!Array.isArray(register.risks) || register.risks.length === 0) errors.push('register: risks must be non-empty');
  const ids = new Set();
  for (const [index, risk] of (register.risks ?? []).entries()) {
    const label = `risk[${index}]`;
    if (!risk || typeof risk !== 'object') { errors.push(`${label}: must be object`); continue; }
    for (const field of ['riskId', 'scope', 'package', 'severity', 'advisoryIds', 'dependencyPaths', 'reachability', 'fixedVersion', 'treatment', 'ownerRole', 'status', 'dueDate', 'evidenceSources']) {
      if (!(field in risk)) errors.push(`${label}: missing ${field}`);
    }
    if (ids.has(risk.riskId)) errors.push(`${label}: duplicate riskId ${risk.riskId}`);
    ids.add(risk.riskId);
    if (!/^DEP-(ROOT|FUNCTIONS)-[A-Z0-9-]+$/.test(risk.riskId ?? '')) errors.push(`${label}: invalid riskId`);
    if (!SEVERITIES.has(risk.severity)) errors.push(`${label}: invalid severity ${risk.severity}`);
    if (!TREATMENTS.has(risk.treatment)) errors.push(`${label}: invalid treatment ${risk.treatment}`);
    if (!STATUSES.has(risk.status)) errors.push(`${label}: invalid status ${risk.status}`);
    if (!Array.isArray(risk.advisoryIds) || risk.advisoryIds.some((id) => !Number.isInteger(id) || id < 1000000)) errors.push(`${label}: invalid advisoryIds`);
    if (!Array.isArray(risk.dependencyPaths) || risk.dependencyPaths.length === 0) errors.push(`${label}: dependencyPaths must be non-empty`);
    if (typeof risk.ownerRole !== 'string' || risk.ownerRole.trim().length < 3) errors.push(`${label}: ownerRole missing`);
    const due = date(risk.dueDate);
    if (!due) errors.push(`${label}: invalid dueDate ${risk.dueDate}`);
    if (risk.status === 'open' && asOfDate && due && due < asOfDate) errors.push(`${label}: dueDate is expired while risk is open`);
    if (risk.status === 'resolved') {
      const resolved = date(risk.resolvedOn);
      if (!resolved) errors.push(`${label}: resolved risk requires resolvedOn`);
      if (resolved && asOfDate && resolved > asOfDate) errors.push(`${label}: resolvedOn is after as-of`);
      if (!Array.isArray(risk.evidenceSources) || risk.evidenceSources.length === 0) errors.push(`${label}: resolved risk requires evidenceSources`);
      for (const source of risk.evidenceSources ?? []) {
        if (typeof source !== 'string' || path.isAbsolute(source) || source.includes('..')) errors.push(`${label}: unsafe evidence source ${source}`);
        else {
          try { await access(path.resolve(root, source)); } catch { errors.push(`${label}: missing evidence source ${source}`); }
        }
      }
    }
    if (risk.status !== 'resolved' && !Array.isArray(risk.evidenceSources)) errors.push(`${label}: evidenceSources must be an array`);
  }
  if (walkStrings(register, (value) => SECRET_PATTERNS.some((pattern) => pattern.test(value)))) errors.push('register contains secret-like value');
  return errors;
}

try {
  const args = parseCli(process.argv.slice(2));
  const errors = await verify(path.resolve(args.root), args.register, args.asOf);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`dependency_risk_register_ok risks=${JSON.parse(await readFile(path.resolve(args.root, args.register), 'utf8')).risks.length} asOf=${args.asOf}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
