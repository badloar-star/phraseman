'use strict';

const path = require('node:path');

const TASK_ID = /^[A-Za-z][A-Za-z0-9._:-]{2,159}$/;
const ALLOWED_VERIFICATION = Object.freeze([
  Object.freeze(['npx', 'jest', '--runTestsByPath']),
  Object.freeze(['npm', 'run', 'lint', '--']),
]);
const POLL_INTERVAL_MS = 30_000;
const LOCAL_URL = /^https:\/\//i;

function assertUrl(value, label) {
  const url = assertText(value, label, 2048);
  if (!LOCAL_URL.test(url)) throw new Error(`${label} is invalid`);
  return url;
}

function assertText(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) throw new Error(`${label} is invalid`);
  return value.trim();
}

function validateJob(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const job = value;
  if (!TASK_ID.test(job.taskId || '') || !Number.isSafeInteger(job.taskRevision) || job.taskRevision < 1) return null;
  if (job.taskStatus !== 'queued' || job.jobState !== 'queued' || job.allowedScope !== 'code_prepare') return null;
  try {
    return Object.freeze({ taskId: job.taskId, taskRevision: job.taskRevision, taskStatus: job.taskStatus, jobState: job.jobState,
      allowedScope: job.allowedScope, title: assertText(job.title, 'title', 140), brief: assertText(job.brief, 'brief', 4000) });
  } catch { return null; }
}

function selectApprovedCodePrepareJob(jobs) {
  if (!Array.isArray(jobs)) throw new Error('jobs is invalid');
  const selected = jobs.map(validateJob).filter(Boolean);
  if (selected.length > 1) throw new Error('multiple approved code_prepare jobs require an explicit task selector');
  return selected[0] || null;
}

function buildDryRunProposal(rawJob, workspaceRoot) {
  const job = validateJob(rawJob);
  if (!job) {
    if (!rawJob || !TASK_ID.test(rawJob.taskId || '')) throw new Error('taskId is invalid');
    throw new Error('approved code_prepare job is invalid');
  }
  const root = assertText(workspaceRoot, 'workspaceRoot', 1024);
  const slug = `${job.taskId.replace(/[^A-Za-z0-9._-]/g, '-')}-r${job.taskRevision}`;
  return Object.freeze({
    taskId: job.taskId, taskRevision: job.taskRevision, outcome: 'needs_review',
    worktreePath: path.join(root, '.codex-tmp', 'agent-manager-worktrees', slug),
    branchName: `codex/agent-manager-${slug}`,
    verificationAllowlist: ALLOWED_VERIFICATION,
    summary: 'Local Codex proposal is prepared for manual owner review. No commit, push, deploy, merge, message, or external delivery was performed.',
  });
}

function buildPrompt(job) {
  return [
    'You are a bounded local code-preparation worker.',
    `Task: ${job.title}`, `Brief: ${job.brief}`,
    'Work only in this isolated worktree. Make a minimal reviewable change.',
    'Never commit, push, deploy, merge, send messages, access credentials, read environment secrets, or invoke external delivery.',
    'Do not run verification commands; the parent runner owns its fixed allowlist.',
    'End with a short redacted summary of changed files and remaining risks.',
  ].join('\n');
}

function redactForSubmission(value) {
  const text = typeof value === 'string' ? value : '';
  return text
    .replace(/\b(?:OPENAI_API_KEY|[A-Z][A-Z0-9_]*(?:TOKEN|SECRET|KEY|PASSWORD))\s*[:=]\s*[^\s'"`]+/g, '[REDACTED]')
    .replace(/\b(?:Bearer\s+|sk-[A-Za-z0-9_-]{8,})[^\s'"`]+/gi, '[REDACTED]')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .slice(0, 4000);
}

function validateRunnerConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('runner config is invalid');
  const config = value;
  return Object.freeze({
    capabilityId: assertText(config.capabilityId, 'capabilityId', 160),
    token: assertText(config.token, 'token', 160),
    claimUrl: assertUrl(config.claimUrl, 'claimUrl'),
    submitUrl: assertUrl(config.submitUrl, 'submitUrl'),
    pollIntervalMs: POLL_INTERVAL_MS,
  });
}

async function requestJson(fetchImpl, url, payload) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch is invalid');
  const response = await fetchImpl(url, Object.freeze({
    method: 'POST',
    headers: Object.freeze({ 'content-type': 'application/json' }),
    body: JSON.stringify(payload),
  }));
  if (!response || !response.ok) throw new Error('runner endpoint request failed');
  try { return await response.json(); } catch { throw new Error('runner endpoint response is invalid'); }
}

async function exchangePairing(options) {
  if (!options || typeof options !== 'object') throw new Error('pairing options are invalid');
  const exchangeUrl = assertUrl(options.exchangeUrl, 'exchangeUrl');
  const pairingId = assertText(options.pairingId, 'pairingId', 160);
  const pairingCode = assertText(options.pairingCode, 'pairingCode', 160);
  const claimUrl = assertUrl(options.claimUrl, 'claimUrl');
  const submitUrl = assertUrl(options.submitUrl, 'submitUrl');
  const response = await requestJson(options.fetch, exchangeUrl, { pairingId, pairingCode });
  const capability = response && response.capability;
  return validateRunnerConfig({ capabilityId: capability && capability.capabilityId, token: capability && capability.token, claimUrl, submitUrl });
}

function submissionFromResult(job, result) {
  const proposal = result && result.proposal;
  const summary = redactForSubmission(`${proposal && proposal.summary ? proposal.summary : 'Local Codex result prepared for review.'}`);
  return Object.freeze({
    taskId: job.taskId,
    taskRevision: job.taskRevision,
    outcome: 'needs_review',
    status: 'needs_review',
    summary,
    changedFiles: [],
    risks: [],
  });
}

async function pollAndExecuteOnce(options) {
  if (!options || typeof options !== 'object') throw new Error('runner options are invalid');
  const config = validateRunnerConfig(options.config);
  const workspaceRoot = assertText(options.workspaceRoot, 'workspaceRoot', 1024);
  const claimed = await requestJson(options.fetch, config.claimUrl, { capabilityId: config.capabilityId, token: config.token });
  if (!claimed || !claimed.claim) return Object.freeze({ status: 'idle', reason: 'no_approved_code_prepare_job' });
  const claim = claimed.claim;
  const job = validateJob(claim && Object.freeze({
    taskId: claim.taskId, taskRevision: claim.taskRevision, title: claim.title, brief: claim.brief,
    taskStatus: 'queued', jobState: 'queued', allowedScope: 'code_prepare',
  }));
  if (!job) return Object.freeze({ status: 'blocked', reason: 'claimed_job_invalid' });
  const result = runCodexRunner({
    jobs: [job], workspaceRoot, dryRun: Boolean(options.dryRun), commandExists: options.commandExists, run: options.run,
  });
  if (result.status !== 'approval_needed') return result;
  const submission = submissionFromResult(job, result);
  await requestJson(options.fetch, config.submitUrl, {
    capabilityId: config.capabilityId, token: config.token, jobId: claim.jobId, leaseToken: claim.leaseToken,
    result: { summary: submission.summary, outcome: submission.outcome },
  });
  return Object.freeze({ ...result, submitted: true });
}

function runCodexRunner(options) {
  const job = selectApprovedCodePrepareJob(options.jobs);
  if (!job) return Object.freeze({ status: 'idle', reason: 'no_approved_code_prepare_job' });
  const proposal = buildDryRunProposal(job, options.workspaceRoot);
  if (options.dryRun) return Object.freeze({ status: 'approval_needed', dryRun: true, proposal });
  if (typeof options.commandExists !== 'function' || !options.commandExists('codex')) return Object.freeze({ status: 'blocked', reason: 'codex_cli_unavailable', proposal });
  if (typeof options.run !== 'function') throw new Error('run is invalid');
  const worktree = options.run('git', ['worktree', 'add', '--no-track', '-b', proposal.branchName, proposal.worktreePath, 'HEAD'], { cwd: options.workspaceRoot });
  if (!worktree || worktree.status !== 0) return Object.freeze({ status: 'blocked', reason: 'worktree_create_failed', proposal });
  const codex = options.run('codex', ['exec', '--sandbox', 'workspace-write', buildPrompt(job)], { cwd: proposal.worktreePath });
  if (!codex || codex.status !== 0) return Object.freeze({ status: 'blocked', reason: 'codex_execution_failed', proposal });
  return Object.freeze({ status: 'approval_needed', dryRun: false, proposal });
}

module.exports = Object.freeze({
  ALLOWED_VERIFICATION,
  POLL_INTERVAL_MS,
  buildDryRunProposal,
  buildPrompt,
  exchangePairing,
  pollAndExecuteOnce,
  redactForSubmission,
  runCodexRunner,
  selectApprovedCodePrepareJob,
  validateRunnerConfig,
});
