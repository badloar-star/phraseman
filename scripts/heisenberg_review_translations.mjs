import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const reviewCore = require('./lib/heisenberg_review_core.cjs');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { mode: '', candidates: '', packet: '', decisions: '', outDir: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--prepare') args.mode = 'prepare';
    else if (arg === '--finalize') args.mode = 'finalize';
    else if (arg === '--candidates') args.candidates = argv[++i] || '';
    else if (arg === '--packet') args.packet = argv[++i] || '';
    else if (arg === '--decisions') args.decisions = argv[++i] || '';
    else if (arg === '--out-dir') args.outDir = argv[++i] || '';
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.mode) throw new Error('Pass --prepare or --finalize');
  if (!args.candidates) throw new Error('--candidates <accepted_rows.jsonl> is required');
  if (!args.outDir) throw new Error('--out-dir is required');
  if (args.mode === 'finalize' && (!args.packet || !args.decisions)) {
    throw new Error('--packet and --decisions are required for --finalize');
  }
  return args;
}

function abs(value) {
  return path.isAbsolute(value) ? value : path.join(ROOT, value);
}

function readJsonl(value) {
  const text = fs.readFileSync(abs(value), 'utf8').trim();
  return text ? text.split(/\r?\n/).filter(Boolean).map(JSON.parse) : [];
}

function writeJsonl(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const candidates = readJsonl(args.candidates);
  const outDir = abs(args.outDir);
  if (args.mode === 'prepare') {
    const duplicateIds = candidates.filter((row, index) => candidates.findIndex((other) => other.id === row.id) !== index);
    const eligible = candidates.filter((row) => (
      row.status === 'GO' ||
      (row.origin === 'existing-runtime' && row.status === 'EXISTING_NEEDS_REVIEW' && row.integrated === true)
    ) && row.targetText && row.id);
    const origins = [...new Set(eligible.map((row) => row.origin || 'translation-candidate'))];
    if (origins.length > 1) throw new Error('Review candidates must not mix existing-runtime and translation artifacts.');
    const packet = eligible.map(reviewCore.buildReviewPacketRow);
    writeJsonl(path.join(outDir, 'review_packet.jsonl'), packet);
    writeJsonl(path.join(outDir, 'review_decisions_template.jsonl'), packet.map((row) => ({
      id: row.id,
      verdict: '',
      reviewerId: '',
      reviewedAt: '',
      note: '',
      bindingHash: row.bindingHash,
    })));
    const report = {
      schema: 'heisenberg-human-review-prepare-v1',
      candidates: candidates.length,
      eligible: eligible.length,
      duplicateIds: duplicateIds.map((row) => row.id),
      status: duplicateIds.length ? 'HOLD' : 'READY_FOR_HUMAN_REVIEW',
      artifactType: origins[0] === 'existing-runtime' ? 'existing-runtime-review' : 'translation-review',
      activationApproved: false,
    };
    writeJson(path.join(outDir, 'review_prepare_report.json'), report);
    if (duplicateIds.length) process.exitCode = 1;
    return;
  }

  const finalizeOrigins = [...new Set(candidates.map((row) => row.origin || 'translation-candidate'))];
  if (finalizeOrigins.length > 1) throw new Error('Review candidates must not mix existing-runtime and translation artifacts.');
  const result = reviewCore.finalizeReview(candidates, readJsonl(args.packet), readJsonl(args.decisions));
  const existingRuntime = candidates.length > 0 && candidates.every((row) => row.origin === 'existing-runtime');
  const approvedName = existingRuntime ? 'approved_existing_review_rows.jsonl' : 'approved_rows.jsonl';
  writeJsonl(path.join(outDir, approvedName), result.approved);
  writeJsonl(path.join(outDir, 'held_rows.jsonl'), result.held);
  const report = {
    schema: 'heisenberg-human-review-finalize-v1',
    candidates: candidates.length,
    approved: result.approved.length,
    quarantinedApproved: result.quarantinedApproved.length,
    held: result.held.length,
    problems: result.problems,
    status: result.held.length || result.problems.length
      ? (existingRuntime ? 'HOLD_NO_RUNTIME_REVIEW_ARTIFACT' : 'HOLD_NO_APPLY_ARTIFACT')
      : (existingRuntime ? 'APPROVED_EXISTING_RUNTIME_REVIEW' : 'APPROVED_FOR_INTEGRATION_DRY_RUN'),
    artifactType: existingRuntime ? 'existing-runtime-review' : 'translation-review',
    approvedArtifact: approvedName,
    activationApproved: false,
  };
  writeJson(path.join(outDir, 'review_finalize_report.json'), report);
  if (result.held.length || result.problems.length) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(`[heisenberg-review] ${error?.message || error}`);
  process.exitCode = 1;
}
