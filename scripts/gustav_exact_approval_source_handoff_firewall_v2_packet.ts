import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type JsonObject = Record<string, unknown>;

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  passed: boolean;
  detail: string;
};

type Report = {
  schemaVersion: 'gustav-exact-approval-source-handoff-firewall-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    targetLocale: string;
    handoffState: string;
    finalGapReady: boolean;
    finalGapState: string;
    finalGapRequirementsReady: number;
    finalGapRequirementsBlocked: number;
    finalGapBlockedRequirementId: string;
    exactApprovalWaitStateReady: boolean;
    p31CreationGateReady: boolean;
    approvalSourcePath: string;
    defaultApprovalSourcePath: string;
    approvalSourceIsCanonical: boolean;
    approvalSourceExists: boolean;
    approvalSourceContainsExactSentence: boolean;
    requiredApprovalSentenceSha256: string;
    approvalSourceSha256: string;
    activeApprovalReceiptExists: boolean;
    activeHashLockExists: boolean;
    nextAllowedStepWhileAbsent: string;
    nextAllowedStepWhenPresent: string;
    createActiveArtifactsNow: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    activationApproved: boolean;
    serverUploadAllowed: boolean;
    firebaseUploadAllowed: boolean;
    runtimeDownloadsEnabled: boolean;
    storageMigrationAllowed: boolean;
    cloudSyncMigrationAllowed: boolean;
    productionHardBlockers: number;
    canStartProductionApply: boolean;
    blockers: number;
    warnings: number;
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  requiredApprovalSentence: string;
  probes: Probe[];
  findings: Finding[];
  safety: {
    reportOnly: true;
    createsActiveApprovalArtifacts: false;
    executesProductionApply: false;
    uploadsServerOrFirebasePacks: false;
    enablesRuntimeDownloads: false;
    modifiesProductionAppFiles: false;
  };
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonObject;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function summaryOf(filePath: string): JsonObject {
  return object(readJson(filePath).summary);
}

function arr(value: JsonObject, key: string): JsonObject[] {
  const raw = value[key];
  return Array.isArray(raw) ? raw.map(object) : [];
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
  return false;
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function sha256Text(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function sha256File(filePath: string): string {
  if (!fs.existsSync(filePath)) return '';
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function addFinding(findings: Finding[], severity: Finding['severity'], code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function probe(id: string, passed: boolean, detail: string): Probe {
  return { id, passed, detail };
}

function hasPassedProbe(report: JsonObject, id: string): boolean {
  return arr(report, 'probes').some((item) => s(item, 'id') === id && b(item, 'passed'));
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Exact Approval Source Handoff Firewall V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Target locale: \`${report.summary.targetLocale}\``,
    `- Handoff state: \`${report.summary.handoffState}\``,
    `- Final gap: ${report.summary.finalGapState}, ready/blocked ${report.summary.finalGapRequirementsReady}/${report.summary.finalGapRequirementsBlocked}`,
    `- Blocked requirement: \`${report.summary.finalGapBlockedRequirementId}\``,
    `- Approval source path: \`${report.summary.approvalSourcePath}\``,
    `- Approval source exists: ${report.summary.approvalSourceExists ? 'yes' : 'no'}`,
    `- Approval source contains exact sentence: ${report.summary.approvalSourceContainsExactSentence ? 'yes' : 'no'}`,
    `- Required sentence SHA-256: \`${report.summary.requiredApprovalSentenceSha256}\``,
    `- Active approval receipt/hash-lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Next allowed while absent: \`${report.summary.nextAllowedStepWhileAbsent}\``,
    `- Next allowed when present: \`${report.summary.nextAllowedStepWhenPresent}\``,
    `- Create active artifacts now: ${report.summary.createActiveArtifactsNow ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Production hard blockers: ${report.summary.productionHardBlockers}`,
    `- Can start production apply: ${report.summary.canStartProductionApply ? 'yes' : 'no'}`,
    `- Probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Required Approval Sentence',
    '',
    report.requiredApprovalSentence ? `\`${report.requiredApprovalSentence}\`` : '- Missing.',
    '',
    '## Probes',
    '',
  ];
  for (const item of report.probes) {
    lines.push(`- ${item.passed ? 'PASS' : 'FAIL'} \`${item.id}\`: ${item.detail}`);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }
  lines.push(
    '',
    '## Safety',
    '',
    '- This packet is report-only.',
    '- It does not create active approval artifacts.',
    '- It does not execute production apply, upload packs, enable runtime downloads, or modify production app files.',
    '',
  );
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_exact_approval_source_handoff_firewall_v2_packet.ts --run <run-dir> --target fr');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const target = argValue('--target') || 'fr';
  const auditsDir = path.join(runDir, 'audits');
  const findings: Finding[] = [];
  ensureDir(auditsDir);

  const p67Path = path.join(auditsDir, 'final_production_readiness_gap_v2_packet.json');
  const p65Path = path.join(auditsDir, 'exact_approval_wait_state_v2_packet.json');
  const p31Path = path.join(auditsDir, 'explicit_approval_receipt_creation_gate_v2_packet.json');
  const masterPath = path.join(runDir, 'generated', 'fr', 'reviewer', 'french_reviewer_master_manifest.json');
  const p67 = readJson(p67Path);
  const p67Summary = object(p67.summary);
  const p65 = readJson(p65Path);
  const p65Summary = object(p65.summary);
  const p65Contract = object(p65.waitStateContract);
  const p31 = readJson(p31Path);
  const p31Summary = object(p31.summary);
  const masterSummary = summaryOf(masterPath);

  const requiredApprovalSentence = s(p31, 'requiredApprovalSentence');
  const requiredApprovalSentenceSha256 = s(p65Summary, 'requiredApprovalSentenceSha256') || sha256Text(requiredApprovalSentence);
  const approvalSourcePath = path.resolve(repoRoot, s(p65Summary, 'approvalSourcePath') || s(p65Contract, 'exactApprovalSourcePath') || s(p31Summary, 'sourcePath'));
  const defaultApprovalSourcePath = path.resolve(repoRoot, s(p65Summary, 'defaultApprovalSourcePath') || s(p65Contract, 'defaultApprovalSourcePath') || s(p31Summary, 'sourcePath'));
  const approvalSourceExists = fs.existsSync(approvalSourcePath);
  const approvalSourceText = approvalSourceExists ? fs.readFileSync(approvalSourcePath, 'utf8') : '';
  const approvalSourceContainsExactSentence = approvalSourceExists && requiredApprovalSentence !== '' && approvalSourceText.includes(requiredApprovalSentence);
  const activeApprovalReceiptPath = path.join(runDir, 'apply_plan', 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(runDir, 'apply_plan', 'hash_lock_manifest_v2.json');
  const activeApprovalReceiptExists = fs.existsSync(activeApprovalReceiptPath);
  const activeHashLockExists = fs.existsSync(activeHashLockPath);
  const finalGapBlockedRequirementIds = arr(p67, 'requirements').filter((item) => s(item, 'state') === 'blocked').map((item) => s(item, 'id'));
  const finalGapReady =
    s(p67, 'status') === 'PASS' &&
    s(p67Summary, 'productionReadinessState') === 'preactivation_ready_exact_approval_required' &&
    n(p67Summary, 'requirementsReady') === 10 &&
    n(p67Summary, 'requirementsBlocked') === 1 &&
    finalGapBlockedRequirementIds.length === 1 &&
    finalGapBlockedRequirementIds[0] === 'REQ-ACTIVATION';
  const exactApprovalWaitStateReady =
    s(p65, 'status') === 'PASS' &&
    s(p65Summary, 'waitState') === 'exact_approval_wait_state_ready' &&
    b(p65Summary, 'closedEvidenceReady') &&
    b(p65Summary, 'approvalSourceIsCanonical') &&
    b(p65Summary, 'exactApprovalStillRequired') &&
    !b(p65Summary, 'readyForApply');
  const p31CreationGateReady =
    s(p31, 'status') !== 'BLOCK' &&
    s(p31Summary, 'receiptCreationState') === 'approval_receipt_creation_waiting_for_exact_sentence' &&
    n(p31Summary, 'blockers') === 0 &&
    b(p31Summary, 'approvalSourceIsCanonical') &&
    !b(p31Summary, 'activeApprovalReceiptCreated') &&
    !b(p31Summary, 'activeHashLockCreated') &&
    !b(p31Summary, 'readyForApply');
  const approvalSourceIsCanonical = path.resolve(approvalSourcePath) === path.resolve(defaultApprovalSourcePath);
  const createActiveArtifactsNow = false;
  const canStartProductionApply =
    approvalSourceContainsExactSentence &&
    activeApprovalReceiptExists &&
    activeHashLockExists &&
    b(masterSummary, 'readyForApply') &&
    b(masterSummary, 'activationApproved');
  const handoffState = approvalSourceContainsExactSentence
    ? 'exact_approval_source_present_ready_for_p31_only'
    : 'waiting_for_exact_approval_source_file';

  const probes: Probe[] = [
    probe('final-gap-only-activation-blocked', finalGapReady, `${n(p67Summary, 'requirementsReady')}/${n(p67Summary, 'requirementsBlocked')}/${finalGapBlockedRequirementIds.join(',')}`),
    probe('p65-wait-state-ready', exactApprovalWaitStateReady, `${s(p65, 'status')}/${s(p65Summary, 'waitState')}/${b(p65Summary, 'approvalSourceIsCanonical')}`),
    probe('p31-creation-gate-waits', p31CreationGateReady, `${s(p31, 'status')}/${s(p31Summary, 'receiptCreationState')}/${b(p31Summary, 'activeApprovalReceiptCreated')}/${b(p31Summary, 'activeHashLockCreated')}`),
    probe('canonical-source-path-only', approvalSourceIsCanonical, `${rel(repoRoot, approvalSourcePath)} == ${rel(repoRoot, defaultApprovalSourcePath)}`),
    probe('required-sentence-hash-matches', requiredApprovalSentence !== '' && sha256Text(requiredApprovalSentence) === requiredApprovalSentenceSha256, `${sha256Text(requiredApprovalSentence)}/${requiredApprovalSentenceSha256}`),
    probe('source-absent-holds-or-present-routes-p31', !approvalSourceContainsExactSentence || handoffState === 'exact_approval_source_present_ready_for_p31_only', handoffState),
    probe('active-artifacts-absent-before-p31', !activeApprovalReceiptExists && !activeHashLockExists, `${activeApprovalReceiptExists}/${activeHashLockExists}`),
    probe('p31-fixtures-prove-plain-continue-holds', hasPassedProbe(p31, 'plain_continue_without_exact_sentence_holds'), 'plain continue cannot create active artifacts'),
    probe('p31-fixtures-reject-noncanonical-source', hasPassedProbe(p31, 'noncanonical_exact_source_rejected'), 'noncanonical exact source rejected'),
    probe('p31-fixtures-simulate-exact-source-path', hasPassedProbe(p31, 'exact_sentence_with_create_and_p50_would_create'), 'exact source path is simulated only'),
    probe('production-flags-closed', !b(masterSummary, 'readyForApply') && !b(masterSummary, 'mayModifyProductionAppFiles') && !b(masterSummary, 'activationApproved'), `${b(masterSummary, 'readyForApply')}/${b(masterSummary, 'mayModifyProductionAppFiles')}/${b(masterSummary, 'activationApproved')}`),
  ];

  if (target !== 'fr') addFinding(findings, 'blocker', 'target_locale_not_fr', 'Exact approval source handoff is only valid for studyTarget=fr.');
  if (!finalGapReady) addFinding(findings, 'blocker', 'final_gap_not_ready', 'Final production readiness gap must be PASS with only REQ-ACTIVATION blocked.', rel(repoRoot, p67Path));
  if (!exactApprovalWaitStateReady) addFinding(findings, 'blocker', 'p65_wait_state_not_ready', 'P65 wait state must be ready before source handoff.', rel(repoRoot, p65Path));
  if (!p31CreationGateReady) addFinding(findings, 'blocker', 'p31_creation_gate_not_waiting', 'P31 creation gate must be in exact-sentence wait mode.', rel(repoRoot, p31Path));
  if (!approvalSourceIsCanonical) addFinding(findings, 'blocker', 'approval_source_not_canonical', 'Only the canonical approval source path may be used.', rel(repoRoot, approvalSourcePath));
  if (activeApprovalReceiptExists || activeHashLockExists) addFinding(findings, 'blocker', 'active_artifacts_already_exist', 'Active approval artifacts must not exist before P31 creates them.');
  if (createActiveArtifactsNow || canStartProductionApply) addFinding(findings, 'blocker', 'handoff_opened_apply', 'P68 is not allowed to create artifacts or start production apply.');
  for (const item of probes) {
    if (!item.passed) addFinding(findings, 'blocker', `probe_failed_${item.id}`, item.detail);
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const fixtureProbesPassed = probes.filter((item) => item.passed).length;
  const report: Report = {
    schemaVersion: 'gustav-exact-approval-source-handoff-firewall-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      targetLocale: target,
      handoffState,
      finalGapReady,
      finalGapState: s(p67Summary, 'productionReadinessState'),
      finalGapRequirementsReady: n(p67Summary, 'requirementsReady'),
      finalGapRequirementsBlocked: n(p67Summary, 'requirementsBlocked'),
      finalGapBlockedRequirementId: finalGapBlockedRequirementIds.join(','),
      exactApprovalWaitStateReady,
      p31CreationGateReady,
      approvalSourcePath: rel(repoRoot, approvalSourcePath),
      defaultApprovalSourcePath: rel(repoRoot, defaultApprovalSourcePath),
      approvalSourceIsCanonical,
      approvalSourceExists,
      approvalSourceContainsExactSentence,
      requiredApprovalSentenceSha256,
      approvalSourceSha256: sha256File(approvalSourcePath),
      activeApprovalReceiptExists,
      activeHashLockExists,
      nextAllowedStepWhileAbsent: 'wait_for_exact_approval_source_file',
      nextAllowedStepWhenPresent: 'P31_EXPLICIT_APPROVAL_RECEIPT_CREATION_GATE_V2',
      createActiveArtifactsNow,
      readyForApply: b(masterSummary, 'readyForApply'),
      mayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
      activationApproved: b(masterSummary, 'activationApproved'),
      serverUploadAllowed: b(masterSummary, 'serverUploadAllowed'),
      firebaseUploadAllowed: b(masterSummary, 'firebaseUploadAllowed'),
      runtimeDownloadsEnabled: b(masterSummary, 'runtimeDownloadsEnabled'),
      storageMigrationAllowed: b(masterSummary, 'storageMigrationAllowed'),
      cloudSyncMigrationAllowed: b(masterSummary, 'cloudSyncMigrationAllowed'),
      productionHardBlockers: approvalSourceContainsExactSentence ? 0 : 1,
      canStartProductionApply,
      blockers,
      warnings,
      fixtureProbesPassed,
      fixtureProbes: probes.length,
    },
    requiredApprovalSentence,
    probes,
    findings,
    safety: {
      reportOnly: true,
      createsActiveApprovalArtifacts: false,
      executesProductionApply: false,
      uploadsServerOrFirebasePacks: false,
      enablesRuntimeDownloads: false,
      modifiesProductionAppFiles: false,
    },
  };

  const outJson = path.join(auditsDir, 'exact_approval_source_handoff_firewall_v2_packet.json');
  const outMd = path.join(auditsDir, 'exact_approval_source_handoff_firewall_v2_packet.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV exact approval source handoff firewall V2 packet: ${report.status}`);
  console.log(`Handoff state: ${report.summary.handoffState}`);
  console.log(`Approval source exists/exact: ${report.summary.approvalSourceExists ? 'yes' : 'no'}/${report.summary.approvalSourceContainsExactSentence ? 'yes' : 'no'}`);
  console.log(`Next while absent/present: ${report.summary.nextAllowedStepWhileAbsent}/${report.summary.nextAllowedStepWhenPresent}`);
  console.log(`Active approval receipt/hash-lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`);
  console.log(`Can start production apply: ${report.summary.canStartProductionApply ? 'yes' : 'no'}`);
  console.log(`Probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status === 'BLOCK') process.exitCode = 1;
}

main();
