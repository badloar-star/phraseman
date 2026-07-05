import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const LAUNCH_CONTRACT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_launch_contract_v1.json');
const LAUNCH_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_launch_contract_audit_v1.json');
const READINESS_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_execution_readiness_gate_audit_v1.json');
const OUT_PACKET_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_live_handoff_v1.json');
const OUT_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_live_handoff_v1.md');

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256(filePath) {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function ps(command) {
  return `$env:PHRASEMAN_ALLOW_OPENAI_DEV_SPEND='1'; ${command}; Remove-Item Env:\\PHRASEMAN_ALLOW_OPENAI_DEV_SPEND`;
}

function renderMarkdown(packet) {
  return [
    '# French LLM Review Live Handoff',
    '',
    `Status: \`${packet.status}\``,
    '',
    `Batch: ${packet.nextLaunch.batchNumber}, rows ${packet.nextLaunch.startIndex}-${packet.nextLaunch.endIndex}`,
    `Estimated cost: $${packet.nextLaunch.estimatedCostUsd}`,
    '',
    '## Dry Run',
    '',
    `\`${packet.commands.dryRun}\``,
    '',
    '## Live Run',
    '',
    `\`${packet.commands.livePowerShellOneShot}\``,
    '',
    '## Stop Conditions',
    '',
    ...packet.stopConditions.map((condition) => `- ${condition}`),
    '',
  ].join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const contract = readJson(LAUNCH_CONTRACT_PATH);
  const audit = readJson(LAUNCH_AUDIT_PATH);
  const readiness = readJson(READINESS_AUDIT_PATH);
  const nextLaunch = contract.nextLaunch || {};
  const liveCommand = nextLaunch.executeCommand || '';
  const packet = {
    schemaVersion: 'gustav-fr-lesson-llm-review-live-handoff-v1',
    generatedAt,
    status: 'HOLD_SPEND_GUARD_CLOSED',
    activationApproved: false,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    targetContentLang: 'fr',
    inputs: {
      launchContract: rel(LAUNCH_CONTRACT_PATH),
      launchAudit: rel(LAUNCH_AUDIT_PATH),
      readinessAudit: rel(READINESS_AUDIT_PATH),
    },
    hashes: {
      launchContractSha256: sha256(LAUNCH_CONTRACT_PATH),
      launchAuditSha256: sha256(LAUNCH_AUDIT_PATH),
      readinessAuditSha256: sha256(READINESS_AUDIT_PATH),
    },
    nextLaunch: {
      batchNumber: nextLaunch.batchNumber,
      startIndex: nextLaunch.startIndex,
      endIndex: nextLaunch.endIndex,
      limit: nextLaunch.limit,
      estimatedCostUsd: nextLaunch.estimatedCostUsd,
      reasoningLevels: nextLaunch.reasoningLevels,
    },
    commands: {
      dryRun: nextLaunch.dryRunCommand,
      live: liveCommand,
      livePowerShellOneShot: liveCommand ? ps(liveCommand) : '',
      postBatchGates: nextLaunch.postBatchGates || [],
    },
    readiness: {
      openaiApiKeyPresent: readiness.summary?.liveCredentialState?.openaiApiKeyPresent === true,
      spendGuardOpen: readiness.summary?.liveCredentialState?.spendGuardOpen === true,
      launchAuditCanExecuteLiveNow: audit.summary?.canExecuteLiveNow === true,
      runnerWillStillRequireSpendGuard: true,
      runnerWillStillEnforceMaxRowsAndCost: true,
    },
    stopConditions: [
      'Do not run live command unless the operator intentionally accepts paid OpenAI spend.',
      'Stop after this single 25-row batch; rerun gates before any next batch.',
      'Stop if runner reports BLOCK, any llm_call_failed, or any llm_decision_rejected_before_append.',
      'Stop if schema gate reports duplicate, unknown identity, wrong target, opened import/apply/activation flags, or invalid row.',
      'Do not import, materialize audio, upload server packs, enable runtime downloads or approve activation after this handoff alone.',
    ],
    safety: {
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApprovedWrittenByThisScript: false,
    },
  };

  writeJson(OUT_PACKET_PATH, packet);
  fs.writeFileSync(OUT_MD_PATH, `${renderMarkdown(packet)}\n`, 'utf8');
  console.log(`Gustav French LLM review live handoff: ${packet.status}`);
  console.log(`Rows: ${packet.nextLaunch.startIndex}-${packet.nextLaunch.endIndex}`);
  console.log(`Estimated cost: $${packet.nextLaunch.estimatedCostUsd}`);
  console.log(rel(OUT_PACKET_PATH));
}

main();
