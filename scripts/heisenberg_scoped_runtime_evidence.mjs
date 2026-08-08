import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const core = require('./lib/heisenberg_scoped_runtime_evidence_core.cjs');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { ledger: '', candidates: '', approvedReview: '', reviewReport: '', runtimeChecks: '', locale: '', surface: '', out: '', strict: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--ledger') args.ledger = argv[++i] || '';
    else if (arg === '--candidates') args.candidates = argv[++i] || '';
    else if (arg === '--approved-review') args.approvedReview = argv[++i] || '';
    else if (arg === '--review-report') args.reviewReport = argv[++i] || '';
    else if (arg === '--runtime-checks') args.runtimeChecks = argv[++i] || '';
    else if (arg === '--locale') args.locale = argv[++i] || '';
    else if (arg === '--surface') args.surface = argv[++i] || '';
    else if (arg === '--out') args.out = argv[++i] || '';
    else if (arg === '--strict') args.strict = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  for (const key of ['ledger', 'candidates', 'locale', 'surface', 'out']) {
    if (!args[key]) throw new Error(`--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} is required`);
  }
  return args;
}

function abs(value) { return path.isAbsolute(value) ? value : path.join(ROOT, value); }
function readJson(value, fallback = null) { return value && fs.existsSync(abs(value)) ? JSON.parse(fs.readFileSync(abs(value), 'utf8')) : fallback; }
function readJsonl(value) {
  if (!value || !fs.existsSync(abs(value))) return [];
  const text = fs.readFileSync(abs(value), 'utf8').trim();
  return text ? text.split(/\r?\n/).filter(Boolean).map(JSON.parse) : [];
}

try {
  const args = parseArgs(process.argv.slice(2));
  const evidence = core.buildScopedRuntimeEvidence({
    ledger: readJson(args.ledger, { rows: [] }),
    candidates: readJsonl(args.candidates),
    approvedRows: readJsonl(args.approvedReview),
    reviewReport: readJson(args.reviewReport),
    runtimeChecks: readJson(args.runtimeChecks, { activationPerformed: false }),
    locale: args.locale,
    surface: args.surface,
  });
  fs.mkdirSync(path.dirname(abs(args.out)), { recursive: true });
  fs.writeFileSync(abs(args.out), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(`[heisenberg-runtime-evidence] ${evidence.status}: ${evidence.summary.blockers} blocker(s), activation=false.`);
  if (args.strict && !evidence.scopedRuntimeReady) process.exitCode = 1;
} catch (error) {
  console.error(`[heisenberg-runtime-evidence] ${error?.message || error}`);
  process.exitCode = 1;
}
