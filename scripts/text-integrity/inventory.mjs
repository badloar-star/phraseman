import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {
  auditAgainstBaseline, bootstrapBaseline, collectProductionFiles, loadAndValidateBaseline,
  scanTextIntegrity, updateBaselineShrinkOnly,
} = require('./inventory-core.cjs');

const flags = process.argv.slice(2);
const allowed = new Set(['--bootstrap-baseline', '--update-baseline']);
if (flags.some((flag) => !allowed.has(flag)) || new Set(flags).size !== flags.length || flags.length > 1) {
  process.stderr.write('Invalid text-integrity inventory flags\n');
  process.exitCode = 2;
} else {
const root = process.cwd();
const target = path.join(root, 'config', 'text-integrity-baseline.json');
const relativeFiles = collectProductionFiles(root);
const result = scanTextIntegrity(root, relativeFiles);
let baselineValid = null;
try {
  let baseline;
  if (flags[0] === '--bootstrap-baseline') {
    bootstrapBaseline(target, result.groups);
    baseline = loadAndValidateBaseline(target);
  } else {
    baseline = loadAndValidateBaseline(target);
    baselineValid = true;
    if (flags[0] === '--update-baseline') {
      updateBaselineShrinkOnly(target, result.groups);
      baseline = loadAndValidateBaseline(target);
    }
  }
  baselineValid = true;
  const audit = auditAgainstBaseline(baseline, result.groups);
  process.stdout.write(`${JSON.stringify({
    files: result.files, unsafeSites: result.unsafeSites, unsafeGroups: result.unsafeGroups,
    added: audit.added.length, removed: audit.removed.length,
    countIncreased: audit.countIncreased.length, countDecreased: audit.countDecreased.length,
  })}\n`);
  if (!audit.ok) process.exitCode = 1;
} catch (error) {
  const code = error && typeof error === 'object' ? error.code : undefined;
  const schemaInvalid = code === 'TEXT_INTEGRITY_SCHEMA_INVALID';
  const updateRefused = code === 'TEXT_INTEGRITY_UPDATE_REFUSED';
  const errorCategory = schemaInvalid ? 'schema-invalid'
    : updateRefused ? 'update-refused'
      : code === 'TEXT_INTEGRITY_CURRENT_INVALID' ? 'inventory-invalid' : 'write-failed';
  process.stdout.write(`${JSON.stringify({
    files: result.files, unsafeSites: result.unsafeSites, unsafeGroups: result.unsafeGroups,
    baselineValid: schemaInvalid ? false : baselineValid === true,
    errorCategory, updateRefused, writeFailed: errorCategory === 'write-failed',
    added: 0, removed: 0, countIncreased: 0, countDecreased: 0,
  })}\n`);
  process.stderr.write(`${error instanceof Error ? error.message : 'Text integrity baseline failure'}\n`);
  process.exitCode = 1;
}
}
