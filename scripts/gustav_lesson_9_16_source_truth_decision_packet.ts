import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'high' | 'medium' | 'low' | 'info';

type OptionStatus = 'rejected' | 'pending_review' | 'requires_manual_work' | 'approved';

type DecisionOption = {
  id: 'direct_generated_runtime' | 'historical_recovery_candidate' | 'clean_canonical_draft' | 'manual_rebuild';
  title: string;
  status: OptionStatus;
  recommended: boolean;
  sourceArtifacts: string[];
  evidence: string[];
  blockers: string[];
  requiredApproval: string[];
};

type Finding = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  files: string[];
};

type ApprovalTemplate = {
  schemaVersion: 'gustav-lesson-9-16-source-truth-approval-v0';
  runId: string;
  status: 'pending';
  generatedAt: string;
  decision: {
    approvedCanonicalSourceTruth: false;
    selectedOption: 'pending';
    approver: '';
    approvedAt: '';
    approvedArtifacts: string[];
    rejectedArtifacts: string[];
    notes: string[];
  };
  requiredCriteria: Array<{
    id: string;
    title: string;
    required: true;
    satisfied: false;
    evidence: string[];
  }>;
  safety: {
    mayStartFrenchGeneration: false;
    mayModifyProductionAppFiles: false;
    requiresApplyPlanBeforeProductionWrite: true;
  };
};

type Packet = {
  schemaVersion: 'gustav-lesson-9-16-source-truth-decision-packet-v0';
  runId: string;
  status: Status;
  generatedAt: string;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    options: number;
    approvedOptions: number;
    rejectedOptions: number;
    pendingReviewOptions: number;
    requiresManualWorkOptions: number;
    recommendedOptions: number;
    approvalArtifactExists: boolean;
    approvalGranted: boolean;
    cleanDraftStructurallyClean: boolean;
    cleanDraftSpanishLeaks: number;
    cleanDraftRuntimeGeneratedOrigins: number;
    historicalCandidateDoNotAutoMerge: boolean;
    blockers: number;
    highRisks: number;
    canResolveLesson916SourceTruth: boolean;
  };
  inputArtifacts: {
    generatedSourceTruthAudit: string;
    recoveryAudit: string;
    reconciliationAudit: string;
    canonicalDraftAudit: string;
    canonicalDraft: string;
  };
  approvalTemplatePath: string;
  approvalPath: string | null;
  options: DecisionOption[];
  findings: Finding[];
  requiredBeforeFrenchGeneration: string[];
  notes: string[];
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function safeReadJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return readJson<T>(filePath);
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function summaryOf(value: Record<string, unknown> | null): Record<string, unknown> {
  return value && value.summary && typeof value.summary === 'object'
    ? value.summary as Record<string, unknown>
    : {};
}

function n(summary: Record<string, unknown>, key: string): number {
  return typeof summary[key] === 'number' ? summary[key] as number : 0;
}

function b(summary: Record<string, unknown>, key: string): boolean {
  return typeof summary[key] === 'boolean' ? summary[key] as boolean : false;
}

function renderApprovalTemplateMarkdown(template: ApprovalTemplate): string {
  const lines = [
    '# GUSTAV Lesson 9-16 Source-Truth Approval Template',
    '',
    `Run: \`${template.runId}\``,
    '',
    `Status: \`${template.status}\``,
    '',
    `Generated at: ${template.generatedAt}`,
    '',
    'This is a pending approval template. It is not an approval.',
    '',
    '## Decision',
    '',
    `- Approved canonical source truth: ${template.decision.approvedCanonicalSourceTruth ? 'yes' : 'no'}`,
    `- Selected option: \`${template.decision.selectedOption}\``,
    `- Approver: ${template.decision.approver || '`empty`'}`,
    `- Approved at: ${template.decision.approvedAt || '`empty`'}`,
    '',
    '## Required Criteria',
    '',
  ];
  for (const criterion of template.requiredCriteria) {
    lines.push(`### ${criterion.id}: ${criterion.title}`);
    lines.push('');
    lines.push(`Satisfied: ${criterion.satisfied ? 'yes' : 'no'}`);
    lines.push('');
    lines.push('Evidence:');
    for (const item of criterion.evidence) lines.push(`- \`${item}\``);
    lines.push('');
  }
  lines.push('## Safety', '');
  lines.push(`- May start French generation: ${template.safety.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  lines.push(`- May modify production app files: ${template.safety.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  lines.push(`- Requires apply plan before production write: ${template.safety.requiresApplyPlanBeforeProductionWrite ? 'yes' : 'no'}`);
  lines.push('');
  return lines.join('\n');
}

function renderPacketMarkdown(packet: Packet): string {
  const lines = [
    '# GUSTAV Lesson 9-16 Source-Truth Decision Packet',
    '',
    `Run: \`${packet.runId}\``,
    '',
    `Status: \`${packet.status}\``,
    '',
    `Generated at: ${packet.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Options: ${packet.summary.options}`,
    `- Approved options: ${packet.summary.approvedOptions}`,
    `- Rejected options: ${packet.summary.rejectedOptions}`,
    `- Pending-review options: ${packet.summary.pendingReviewOptions}`,
    `- Requires-manual-work options: ${packet.summary.requiresManualWorkOptions}`,
    `- Recommended options: ${packet.summary.recommendedOptions}`,
    `- Approval artifact exists: ${packet.summary.approvalArtifactExists ? 'yes' : 'no'}`,
    `- Approval granted: ${packet.summary.approvalGranted ? 'yes' : 'no'}`,
    `- Clean draft structurally clean: ${packet.summary.cleanDraftStructurallyClean ? 'yes' : 'no'}`,
    `- Clean draft Spanish leaks: ${packet.summary.cleanDraftSpanishLeaks}`,
    `- Clean draft runtime-generated origins: ${packet.summary.cleanDraftRuntimeGeneratedOrigins}`,
    `- Historical candidate do_not_auto_merge: ${packet.summary.historicalCandidateDoNotAutoMerge ? 'yes' : 'no'}`,
    `- Blockers: ${packet.summary.blockers}`,
    `- High risks: ${packet.summary.highRisks}`,
    `- Can resolve lesson 9-16 source truth: ${packet.summary.canResolveLesson916SourceTruth ? 'yes' : 'no'}`,
    '',
    '## Options',
    '',
  ];
  for (const option of packet.options) {
    lines.push(`### ${option.id}: ${option.title}`);
    lines.push('');
    lines.push(`- Status: \`${option.status}\``);
    lines.push(`- Recommended: ${option.recommended ? 'yes' : 'no'}`);
    lines.push('- Source artifacts:');
    for (const artifact of option.sourceArtifacts) lines.push(`  - \`${artifact}\``);
    lines.push('- Evidence:');
    for (const item of option.evidence) lines.push(`  - ${item}`);
    lines.push('- Blockers:');
    for (const item of option.blockers) lines.push(`  - ${item}`);
    lines.push('- Required approval:');
    for (const item of option.requiredApproval) lines.push(`  - ${item}`);
    lines.push('');
  }
  lines.push('## Findings', '');
  for (const finding of packet.findings) {
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
  lines.push('## Required Before French Generation', '');
  for (const item of packet.requiredBeforeFrenchGeneration) lines.push(`- ${item}`);
  lines.push('', '## Notes', '');
  for (const note of packet.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_lesson_9_16_source_truth_decision_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const generatedAt = new Date().toISOString();
  const generatedSourceTruthAuditPath = path.join(runDir, 'audits/generated_source_truth_audit.json');
  const recoveryAuditPath = path.join(runDir, 'audits/lesson_9_16_source_recovery_audit.json');
  const reconciliationAuditPath = path.join(runDir, 'audits/lesson_9_16_reconciliation_audit.json');
  const canonicalDraftAuditPath = path.join(runDir, 'audits/lesson_9_16_canonical_source_draft_audit.json');
  const canonicalDraftPath = path.join(runDir, 'source_graph/recovery/lesson_9_16_canonical_source_draft.json');
  const approvalPath = path.join(runDir, 'source_graph/recovery/lesson_9_16_source_truth_approval.json');

  const generatedSourceTruthAudit = safeReadJson<Record<string, unknown>>(generatedSourceTruthAuditPath);
  const recoveryAudit = safeReadJson<Record<string, unknown>>(recoveryAuditPath);
  const reconciliationAudit = safeReadJson<Record<string, unknown>>(reconciliationAuditPath);
  const canonicalDraftAudit = safeReadJson<Record<string, unknown>>(canonicalDraftAuditPath);
  const approval = safeReadJson<Record<string, unknown>>(approvalPath);
  const approvalDecision = approval && approval.decision && typeof approval.decision === 'object'
    ? approval.decision as Record<string, unknown>
    : null;
  const approvalGranted = approval?.schemaVersion === 'gustav-lesson-9-16-source-truth-approval-v0' &&
    approval.status === 'approved' &&
    approvalDecision?.approvedCanonicalSourceTruth === true &&
    approvalDecision?.selectedOption === 'clean_canonical_draft';
  const generatedSummary = summaryOf(generatedSourceTruthAudit);
  const recoverySummary = summaryOf(recoveryAudit);
  const reconciliationSummary = summaryOf(reconciliationAudit);
  const draftSummary = summaryOf(canonicalDraftAudit);

  const approvalTemplate: ApprovalTemplate = {
    schemaVersion: 'gustav-lesson-9-16-source-truth-approval-v0',
    runId,
    status: 'pending',
    generatedAt,
    decision: {
      approvedCanonicalSourceTruth: false,
      selectedOption: 'pending',
      approver: '',
      approvedAt: '',
      approvedArtifacts: [],
      rejectedArtifacts: [],
      notes: [],
    },
    requiredCriteria: [
      {
        id: 'APP-001',
        title: 'Clean draft reviewed against current app behavior',
        required: true,
        satisfied: false,
        evidence: [path.relative(repoRoot, canonicalDraftPath), path.relative(repoRoot, canonicalDraftAuditPath)],
      },
      {
        id: 'APP-002',
        title: 'Historical candidate rejected or reconciled explicitly',
        required: true,
        satisfied: false,
        evidence: [path.relative(repoRoot, reconciliationAuditPath)],
      },
      {
        id: 'APP-003',
        title: 'Runtime-generated origin risk accepted or replaced',
        required: true,
        satisfied: false,
        evidence: [path.relative(repoRoot, generatedSourceTruthAuditPath), path.relative(repoRoot, canonicalDraftAuditPath)],
      },
      {
        id: 'APP-004',
        title: 'Production apply plan required before app write',
        required: true,
        satisfied: false,
        evidence: ['docs/gustav/runs/2026-05-19_fr_inventory_v0a1/apply_plan/file_changes.json'],
      },
    ],
    safety: {
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      requiresApplyPlanBeforeProductionWrite: true,
    },
  };

  const recoveryDir = path.join(runDir, 'source_graph', 'recovery');
  ensureDir(recoveryDir);
  const approvalTemplatePath = path.join(recoveryDir, 'lesson_9_16_source_truth_approval_template.json');
  const approvalTemplateMdPath = path.join(recoveryDir, 'lesson_9_16_source_truth_approval_template.md');
  fs.writeFileSync(approvalTemplatePath, `${JSON.stringify(approvalTemplate, null, 2)}\n`);
  fs.writeFileSync(approvalTemplateMdPath, renderApprovalTemplateMarkdown(approvalTemplate));

  const options: DecisionOption[] = [
    {
      id: 'direct_generated_runtime',
      title: 'Use generated runtime phrase file directly',
      status: 'rejected',
      recommended: false,
      sourceArtifacts: ['app/lesson_data_9_16_phrases_es.gen.ts', path.relative(repoRoot, generatedSourceTruthAuditPath)],
      evidence: [
        `${n(generatedSummary, 'usedAsPhraseSourceInGraph')} generated artifact is used as phrase source.`,
        `${n(generatedSummary, 'generatedPhraseEntries')} generated phrase entries remain runtime evidence.`,
      ],
      blockers: [
        'Generated Spanish runtime must not become French curriculum source truth.',
        'Source graph and generated source-truth audits remain HOLD.',
      ],
      requiredApproval: ['Not approvable as direct source truth.'],
    },
    {
      id: 'historical_recovery_candidate',
      title: 'Promote historical git candidate',
      status: 'rejected',
      recommended: false,
      sourceArtifacts: [
        path.relative(repoRoot, recoveryAuditPath),
        path.join(path.relative(repoRoot, recoveryDir), 'lesson_9_16_historical_recovery_candidate.json'),
        path.relative(repoRoot, reconciliationAuditPath),
      ],
      evidence: [
        `${n(recoverySummary, 'inlineSourceCandidates')} historical inline candidates were found.`,
        `${n(recoverySummary, 'bestCandidateEnglishExactMatchesById')} exact English matches by id in best recovery candidate.`,
        `${n(reconciliationSummary, 'blockerLessons')} blocker lessons in reconciliation audit.`,
        `${n(reconciliationSummary, 'candidateInvalidCanonicalIds')} invalid canonical candidate ids.`,
      ],
      blockers: [
        'Reconciliation policy is do_not_auto_merge.',
        'Historical candidate does not match current runtime phrase intent closely enough.',
      ],
      requiredApproval: ['Only usable after manual reconciliation into a new clean source, not direct promotion.'],
    },
    {
      id: 'clean_canonical_draft',
      title: 'Review and approve clean EN/RU/UK canonical draft',
      status: approvalGranted ? 'approved' : 'pending_review',
      recommended: true,
      sourceArtifacts: [
        path.relative(repoRoot, canonicalDraftPath),
        path.relative(repoRoot, canonicalDraftAuditPath),
        approvalGranted ? path.relative(repoRoot, approvalPath) : path.relative(repoRoot, approvalTemplatePath),
      ],
      evidence: [
        `Structurally clean: ${b(draftSummary, 'structurallyClean') ? 'yes' : 'no'}.`,
        `${n(draftSummary, 'phrases')} phrases across ${n(draftSummary, 'lessons')} lessons.`,
        `${n(draftSummary, 'spanishFieldLeaks')} Spanish field leaks and ${n(draftSummary, 'spanishTokenLeakSuspects')} Spanish token suspects.`,
        `${n(draftSummary, 'runtimeGeneratedOrigins')} runtime-generated origins require explicit acceptance.`,
      ],
      blockers: [
        ...(approvalGranted ? [] : ['Approval artifact is pending.']),
        ...(approvalGranted ? [] : ['Runtime-generated origin risk must be explicitly accepted or replaced.']),
      ],
      requiredApproval: approvalGranted
        ? ['Approved for lesson 9-16 EN/RU/UK source truth in this Gustav run. Production apply plan is still required before app writes.']
        : [
            'Fill and approve the source-truth approval artifact.',
            'Record selectedOption=clean_canonical_draft and approvedCanonicalSourceTruth=true.',
            'Require production apply plan before writing a non-generated app source file.',
          ],
    },
    {
      id: 'manual_rebuild',
      title: 'Manually rebuild lesson 9-16 canonical source',
      status: 'requires_manual_work',
      recommended: false,
      sourceArtifacts: [path.relative(repoRoot, canonicalDraftPath), path.relative(repoRoot, reconciliationAuditPath)],
      evidence: [
        'Available if clean draft review rejects runtime-derived source truth.',
        'Would require human/pedagogical reconstruction before French generation.',
      ],
      blockers: [
        'No manual rebuild artifact exists yet.',
        'Would require another source graph extraction and quality audit.',
      ],
      requiredApproval: ['Approve rebuilt source artifact after review.'],
    },
  ];

  const findings: Finding[] = [];
  if (!generatedSourceTruthAudit || !recoveryAudit || !reconciliationAudit || !canonicalDraftAudit) {
    findings.push({
      id: 'L916P-001',
      severity: 'blocker',
      title: 'Required source-truth input audit is missing',
      detail: 'The decision packet needs generated source-truth, recovery, reconciliation and canonical draft audits.',
      files: [
        path.relative(repoRoot, generatedSourceTruthAuditPath),
        path.relative(repoRoot, recoveryAuditPath),
        path.relative(repoRoot, reconciliationAuditPath),
        path.relative(repoRoot, canonicalDraftAuditPath),
      ],
    });
  }
  if (n(reconciliationSummary, 'blockerLessons') > 0 || String(reconciliationSummary.recommendedPolicy) === 'do_not_auto_merge') {
    findings.push({
      id: 'L916P-002',
      severity: approvalGranted ? 'info' : 'blocker',
      title: 'Historical candidate cannot be selected',
      detail: approvalGranted
        ? `Historical recovery remains rejected by ${n(reconciliationSummary, 'blockerLessons')} blocker lessons and policy ${String(reconciliationSummary.recommendedPolicy || 'unknown')}; clean canonical draft was selected instead.`
        : `Historical recovery is blocked by ${n(reconciliationSummary, 'blockerLessons')} blocker lessons and policy ${String(reconciliationSummary.recommendedPolicy || 'unknown')}.`,
      files: [path.relative(repoRoot, reconciliationAuditPath)],
    });
  }
  if (!b(draftSummary, 'structurallyClean') || n(draftSummary, 'spanishFieldLeaks') > 0 || n(draftSummary, 'spanishTokenLeakSuspects') > 0) {
    findings.push({
      id: 'L916P-003',
      severity: 'blocker',
      title: 'Clean draft is not structurally approvable',
      detail: 'The clean canonical draft must be structurally clean with zero Spanish leaks before it can even enter approval review.',
      files: [path.relative(repoRoot, canonicalDraftAuditPath)],
    });
  }
  if (!approvalGranted) {
    findings.push({
      id: 'L916P-004',
      severity: 'blocker',
      title: 'Source-truth approval artifact is pending',
      detail: 'The approval template was created with approvedCanonicalSourceTruth=false. French generation remains blocked until explicit approval exists.',
      files: [path.relative(repoRoot, approvalTemplatePath)],
    });
  }
  if (n(draftSummary, 'runtimeGeneratedOrigins') > 0 && !approvalGranted) {
    findings.push({
      id: 'L916P-005',
      severity: 'high',
      title: 'Clean draft still has runtime-generated origin risk',
      detail: `${n(draftSummary, 'runtimeGeneratedOrigins')} clean draft phrases trace back to runtime_generated source graph refs and require explicit acceptance or replacement.`,
      files: [path.relative(repoRoot, canonicalDraftAuditPath)],
    });
  } else if (n(draftSummary, 'runtimeGeneratedOrigins') > 0) {
    findings.push({
      id: 'L916P-005',
      severity: 'info',
      title: 'Clean draft runtime-generated origin risk is accepted',
      detail: `${n(draftSummary, 'runtimeGeneratedOrigins')} clean draft phrases trace back to runtime_generated source graph refs, and the approval artifact explicitly accepts this risk for the clean EN/RU/UK draft.`,
      files: [path.relative(repoRoot, approvalPath), path.relative(repoRoot, canonicalDraftAuditPath)],
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const highRisks = findings.filter((finding) => finding.severity === 'high').length;
  const approvalArtifactExists = fs.existsSync(approvalPath);
  const packet: Packet = {
    schemaVersion: 'gustav-lesson-9-16-source-truth-decision-packet-v0',
    runId,
    status: blockers > 0 ? 'HOLD' : highRisks > 0 ? 'HOLD' : 'PASS',
    generatedAt,
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      options: options.length,
      approvedOptions: options.filter((option) => option.status === 'approved').length,
      rejectedOptions: options.filter((option) => option.status === 'rejected').length,
      pendingReviewOptions: options.filter((option) => option.status === 'pending_review').length,
      requiresManualWorkOptions: options.filter((option) => option.status === 'requires_manual_work').length,
      recommendedOptions: options.filter((option) => option.recommended).length,
      approvalArtifactExists,
      approvalGranted,
      cleanDraftStructurallyClean: b(draftSummary, 'structurallyClean'),
      cleanDraftSpanishLeaks: n(draftSummary, 'spanishFieldLeaks') + n(draftSummary, 'spanishTokenLeakSuspects'),
      cleanDraftRuntimeGeneratedOrigins: n(draftSummary, 'runtimeGeneratedOrigins'),
      historicalCandidateDoNotAutoMerge: String(reconciliationSummary.recommendedPolicy) === 'do_not_auto_merge',
      blockers,
      highRisks,
      canResolveLesson916SourceTruth: approvalGranted && blockers === 0 && highRisks === 0,
    },
    inputArtifacts: {
      generatedSourceTruthAudit: path.relative(repoRoot, generatedSourceTruthAuditPath),
      recoveryAudit: path.relative(repoRoot, recoveryAuditPath),
      reconciliationAudit: path.relative(repoRoot, reconciliationAuditPath),
      canonicalDraftAudit: path.relative(repoRoot, canonicalDraftAuditPath),
      canonicalDraft: path.relative(repoRoot, canonicalDraftPath),
    },
    approvalTemplatePath: path.relative(repoRoot, approvalTemplatePath),
    approvalPath: approvalArtifactExists ? path.relative(repoRoot, approvalPath) : null,
    options,
    findings,
    requiredBeforeFrenchGeneration: [
      'Review the clean canonical draft and either approve it or reject it.',
      'If approved, create a signed approval artifact with selectedOption=clean_canonical_draft.',
      'If rejected, create a manual rebuilt source and rerun source graph gates.',
      'Do not generate French until approvalGranted=true and readiness passes.',
    ],
    notes: [
      'This packet turns lesson 9-16 source truth into an explicit decision workflow.',
      'The approval template is pending and deliberately does not unlock generation.',
      'No production app files are modified by this script.',
    ],
  };

  const auditDir = path.join(runDir, 'audits');
  ensureDir(auditDir);
  const packetJsonPath = path.join(auditDir, 'lesson_9_16_source_truth_decision_packet.json');
  const packetMdPath = path.join(auditDir, 'lesson_9_16_source_truth_decision_packet.md');
  fs.writeFileSync(packetJsonPath, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(packetMdPath, renderPacketMarkdown(packet));

  console.log(`GUSTAV lesson 9-16 source-truth decision packet: ${packet.status}`);
  console.log(`Options: ${packet.summary.options}`);
  console.log(`Recommended options: ${packet.summary.recommendedOptions}`);
  console.log(`Approval granted: ${packet.summary.approvalGranted ? 'yes' : 'no'}`);
  console.log(`Blockers: ${packet.summary.blockers}`);
  console.log(`High risks: ${packet.summary.highRisks}`);
  console.log(`Approval template: ${path.relative(repoRoot, approvalTemplatePath)}`);
  console.log(`Report: ${path.relative(repoRoot, packetJsonPath)}`);
}

void main();
