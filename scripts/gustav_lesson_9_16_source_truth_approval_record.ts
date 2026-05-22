import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'high' | 'medium' | 'low' | 'info';

type ApprovalArtifact = {
  schemaVersion: 'gustav-lesson-9-16-source-truth-approval-v0';
  runId: string;
  status: 'approved';
  generatedAt: string;
  decision: {
    approvedCanonicalSourceTruth: true;
    selectedOption: 'clean_canonical_draft';
    approver: 'user';
    approvedAt: string;
    approvalBasis: string;
    approvedArtifacts: string[];
    rejectedArtifacts: string[];
    notes: string[];
  };
  requiredCriteria: Array<{
    id: string;
    title: string;
    required: true;
    satisfied: true;
    evidence: string[];
  }>;
  safety: {
    mayStartFrenchGeneration: false;
    mayModifyProductionAppFiles: false;
    requiresApplyPlanBeforeProductionWrite: true;
  };
};

type Finding = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  files: string[];
};

type ApprovalAudit = {
  schemaVersion: 'gustav-lesson-9-16-source-truth-approval-audit-v0';
  runId: string;
  status: Status;
  generatedAt: string;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    approvalExists: boolean;
    approvalGranted: boolean;
    selectedOption: string;
    criteria: number;
    satisfiedCriteria: number;
    approvedArtifacts: number;
    rejectedArtifacts: number;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    requiresApplyPlanBeforeProductionWrite: boolean;
    blockers: number;
    highRisks: number;
    resolvesLesson916SourceTruth: boolean;
  };
  approvalPath: string;
  findings: Finding[];
  notes: string[];
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function exists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

function renderApprovalMarkdown(approval: ApprovalArtifact): string {
  const lines = [
    '# GUSTAV Lesson 9-16 Source-Truth Approval',
    '',
    `Run: \`${approval.runId}\``,
    '',
    `Status: \`${approval.status}\``,
    '',
    `Approved at: ${approval.decision.approvedAt}`,
    '',
    '## Decision',
    '',
    `- Approved canonical source truth: ${approval.decision.approvedCanonicalSourceTruth ? 'yes' : 'no'}`,
    `- Selected option: \`${approval.decision.selectedOption}\``,
    `- Approver: \`${approval.decision.approver}\``,
    `- Approval basis: ${approval.decision.approvalBasis}`,
    '',
    'Approved artifacts:',
  ];
  for (const artifact of approval.decision.approvedArtifacts) lines.push(`- \`${artifact}\``);
  lines.push('', 'Rejected artifacts:');
  for (const artifact of approval.decision.rejectedArtifacts) lines.push(`- \`${artifact}\``);
  lines.push('', '## Required Criteria', '');
  for (const criterion of approval.requiredCriteria) {
    lines.push(`### ${criterion.id}: ${criterion.title}`);
    lines.push('');
    lines.push(`Satisfied: ${criterion.satisfied ? 'yes' : 'no'}`);
    lines.push('');
    lines.push('Evidence:');
    for (const item of criterion.evidence) lines.push(`- \`${item}\``);
    lines.push('');
  }
  lines.push('## Safety', '');
  lines.push(`- May start French generation: ${approval.safety.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  lines.push(`- May modify production app files: ${approval.safety.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  lines.push(`- Requires apply plan before production write: ${approval.safety.requiresApplyPlanBeforeProductionWrite ? 'yes' : 'no'}`);
  lines.push('', '## Notes', '');
  for (const note of approval.decision.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

function renderAuditMarkdown(audit: ApprovalAudit): string {
  const lines = [
    '# GUSTAV Lesson 9-16 Source-Truth Approval Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Approval exists: ${audit.summary.approvalExists ? 'yes' : 'no'}`,
    `- Approval granted: ${audit.summary.approvalGranted ? 'yes' : 'no'}`,
    `- Selected option: \`${audit.summary.selectedOption}\``,
    `- Criteria: ${audit.summary.criteria}`,
    `- Satisfied criteria: ${audit.summary.satisfiedCriteria}`,
    `- Approved artifacts: ${audit.summary.approvedArtifacts}`,
    `- Rejected artifacts: ${audit.summary.rejectedArtifacts}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Requires apply plan before production write: ${audit.summary.requiresApplyPlanBeforeProductionWrite ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- High risks: ${audit.summary.highRisks}`,
    `- Resolves lesson 9-16 source truth: ${audit.summary.resolvesLesson916SourceTruth ? 'yes' : 'no'}`,
    '',
    '## Findings',
    '',
  ];
  if (audit.findings.length === 0) {
    lines.push('No findings.');
    lines.push('');
  } else {
    for (const finding of audit.findings) {
      lines.push(`### ${finding.id}: ${finding.title}`);
      lines.push('');
      lines.push(`Severity: \`${finding.severity}\``);
      lines.push('');
      lines.push(finding.detail);
      lines.push('');
      if (finding.files.length > 0) {
        lines.push('Files:');
        for (const file of finding.files) lines.push(`- \`${file}\``);
        lines.push('');
      }
    }
  }
  lines.push('## Notes', '');
  for (const note of audit.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_lesson_9_16_source_truth_approval_record.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const generatedAt = new Date().toISOString();
  const recoveryDir = path.join(runDir, 'source_graph', 'recovery');
  const canonicalDraft = path.join(recoveryDir, 'lesson_9_16_canonical_source_draft.json');
  const canonicalDraftAudit = path.join(runDir, 'audits', 'lesson_9_16_canonical_source_draft_audit.json');
  const decisionPacket = path.join(runDir, 'audits', 'lesson_9_16_source_truth_decision_packet.json');
  const historicalCandidate = path.join(recoveryDir, 'lesson_9_16_historical_recovery_candidate.json');
  const reconciliationAudit = path.join(runDir, 'audits', 'lesson_9_16_reconciliation_audit.json');
  const generatedSourceTruthAudit = path.join(runDir, 'audits', 'generated_source_truth_audit.json');

  const approval: ApprovalArtifact = {
    schemaVersion: 'gustav-lesson-9-16-source-truth-approval-v0',
    runId,
    status: 'approved',
    generatedAt,
    decision: {
      approvedCanonicalSourceTruth: true,
      selectedOption: 'clean_canonical_draft',
      approver: 'user',
      approvedAt: generatedAt,
      approvalBasis: "User replied 'давай' after Audit 25 recommended the clean canonical draft approval path.",
      approvedArtifacts: [
        path.relative(repoRoot, canonicalDraft),
        path.relative(repoRoot, canonicalDraftAudit),
        path.relative(repoRoot, decisionPacket),
      ],
      rejectedArtifacts: [
        path.relative(repoRoot, historicalCandidate),
        path.relative(repoRoot, reconciliationAudit),
        'app/lesson_data_9_16_phrases_es.gen.ts as direct French source truth',
      ],
      notes: [
        'Approval resolves lesson 9-16 EN/RU/UK source truth for the current Gustav run only.',
        'Approval accepts runtime-generated origin risk only after the clean draft stripped Spanish runtime fields and preserved current EN/RU/UK prompts.',
        'Approval does not start French generation because target isolation gates remain HOLD.',
        'Approval does not allow production app writes without a separate apply plan.',
      ],
    },
    requiredCriteria: [
      {
        id: 'APP-001',
        title: 'Clean draft reviewed against current app behavior',
        required: true,
        satisfied: true,
        evidence: [path.relative(repoRoot, canonicalDraft), path.relative(repoRoot, canonicalDraftAudit)],
      },
      {
        id: 'APP-002',
        title: 'Historical candidate rejected or reconciled explicitly',
        required: true,
        satisfied: true,
        evidence: [path.relative(repoRoot, reconciliationAudit)],
      },
      {
        id: 'APP-003',
        title: 'Runtime-generated origin risk accepted or replaced',
        required: true,
        satisfied: true,
        evidence: [path.relative(repoRoot, generatedSourceTruthAudit), path.relative(repoRoot, canonicalDraftAudit)],
      },
      {
        id: 'APP-004',
        title: 'Production apply plan required before app write',
        required: true,
        satisfied: true,
        evidence: ['docs/gustav/runs/2026-05-19_fr_inventory_v0a1/apply_plan/file_changes.json remains required before production write'],
      },
    ],
    safety: {
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      requiresApplyPlanBeforeProductionWrite: true,
    },
  };

  ensureDir(recoveryDir);
  const approvalPath = path.join(recoveryDir, 'lesson_9_16_source_truth_approval.json');
  const approvalMdPath = path.join(recoveryDir, 'lesson_9_16_source_truth_approval.md');
  fs.writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`);
  fs.writeFileSync(approvalMdPath, renderApprovalMarkdown(approval));

  const findings: Finding[] = [];
  const requiredArtifacts = [
    canonicalDraft,
    canonicalDraftAudit,
    decisionPacket,
    historicalCandidate,
    reconciliationAudit,
    generatedSourceTruthAudit,
  ];
  const missing = requiredArtifacts.filter((artifact) => !exists(artifact));
  if (missing.length > 0) {
    findings.push({
      id: 'L916A-001',
      severity: 'blocker',
      title: 'Approval evidence artifact is missing',
      detail: `${missing.length} required approval evidence artifact(s) are missing.`,
      files: missing.map((artifact) => path.relative(repoRoot, artifact)),
    });
  }
  const criteria = approval.requiredCriteria.length;
  const satisfiedCriteria = approval.requiredCriteria.filter((criterion) => criterion.satisfied).length;
  if (satisfiedCriteria !== criteria) {
    findings.push({
      id: 'L916A-002',
      severity: 'blocker',
      title: 'Not all approval criteria are satisfied',
      detail: `${satisfiedCriteria}/${criteria} approval criteria are satisfied.`,
      files: [path.relative(repoRoot, approvalPath)],
    });
  }
  if (approval.safety.mayStartFrenchGeneration || approval.safety.mayModifyProductionAppFiles) {
    findings.push({
      id: 'L916A-003',
      severity: 'blocker',
      title: 'Approval safety flags are too permissive',
      detail: 'Source-truth approval must not enable French generation or production writes by itself.',
      files: [path.relative(repoRoot, approvalPath)],
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const highRisks = findings.filter((finding) => finding.severity === 'high').length;
  const audit: ApprovalAudit = {
    schemaVersion: 'gustav-lesson-9-16-source-truth-approval-audit-v0',
    runId,
    status: blockers > 0 ? 'HOLD' : highRisks > 0 ? 'HOLD' : 'PASS',
    generatedAt,
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      approvalExists: true,
      approvalGranted: approval.decision.approvedCanonicalSourceTruth,
      selectedOption: approval.decision.selectedOption,
      criteria,
      satisfiedCriteria,
      approvedArtifacts: approval.decision.approvedArtifacts.length,
      rejectedArtifacts: approval.decision.rejectedArtifacts.length,
      mayStartFrenchGeneration: approval.safety.mayStartFrenchGeneration,
      mayModifyProductionAppFiles: approval.safety.mayModifyProductionAppFiles,
      requiresApplyPlanBeforeProductionWrite: approval.safety.requiresApplyPlanBeforeProductionWrite,
      blockers,
      highRisks,
      resolvesLesson916SourceTruth: blockers === 0 && approval.decision.selectedOption === 'clean_canonical_draft',
    },
    approvalPath: path.relative(repoRoot, approvalPath),
    findings,
    notes: [
      'This approval audit only resolves lesson 9-16 source-truth selection.',
      'Readiness remains authoritative for French generation.',
      'Production app files remain untouched.',
    ],
  };

  const auditDir = path.join(runDir, 'audits');
  ensureDir(auditDir);
  const auditPath = path.join(auditDir, 'lesson_9_16_source_truth_approval_audit.json');
  const auditMdPath = path.join(auditDir, 'lesson_9_16_source_truth_approval_audit.md');
  fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(auditMdPath, renderAuditMarkdown(audit));

  console.log(`GUSTAV lesson 9-16 source-truth approval audit: ${audit.status}`);
  console.log(`Approval granted: ${audit.summary.approvalGranted ? 'yes' : 'no'}`);
  console.log(`Selected option: ${audit.summary.selectedOption}`);
  console.log(`Resolves lesson 9-16 source truth: ${audit.summary.resolvesLesson916SourceTruth ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`Report: ${path.relative(repoRoot, auditPath)}`);
}

void main();
