import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type CoverageStatus = 'covered' | 'deferred' | 'missing';
type FindingSeverity = 'blocker' | 'warning' | 'info';

type Requirement = {
  checkId: string;
  policy: 'plan_required' | 'approval_required' | 'post_generation' | 'meta_verdict';
  requiredAdapters: string[];
  requiredTestEvidence: string[];
  requiredFileEvidence: string[];
  note: string;
};

type CoverageDecision = {
  checkId: string;
  title: string;
  blocks: string[];
  sourceArtifact: string;
  coverageStatus: CoverageStatus;
  policy: Requirement['policy'];
  requiredAdapters: string[];
  coveredAdapters: string[];
  missingAdapters: string[];
  applyPlanFiles: string[];
  requiredTestEvidence: string[];
  coveredTestEvidence: string[];
  missingTestEvidence: string[];
  requiredFileEvidence: string[];
  coveredFileEvidence: string[];
  missingFileEvidence: string[];
  requiredBeforeWork: string[];
  note: string;
};

type Finding = {
  severity: FindingSeverity;
  code: string;
  message: string;
  checkId?: string;
};

type Audit = {
  schemaVersion: 'gustav-readiness-apply-coverage-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    readinessGate: string;
    migrationAdapterPlan: string;
    applyPlan: string;
    dirtyOverlapPreservationAudit: string;
  };
  summary: {
    failedReadinessChecks: number;
    planRequiredChecks: number;
    coveredChecks: number;
    deferredChecks: number;
    missingChecks: number;
    requiredAdapters: number;
    coveredAdapters: number;
    missingAdapters: number;
    applyPlanFilesReferenced: number;
    requiredTestEvidence: number;
    coveredTestEvidence: number;
    missingTestEvidence: number;
    requiredFileEvidence: number;
    coveredFileEvidence: number;
    missingFileEvidence: number;
    blockers: number;
    warnings: number;
    applyPlanCoversFailedReadinessChecks: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  decisions: CoverageDecision[];
  findings: Finding[];
  notes: string[];
};

const REQUIREMENTS: Requirement[] = [
  {
    checkId: 'RDY-002',
    policy: 'meta_verdict',
    requiredAdapters: [],
    requiredTestEvidence: [],
    requiredFileEvidence: [],
    note: 'Run verdict remains HOLD until the concrete readiness blockers are implemented and re-audited.',
  },
  {
    checkId: 'RDY-010',
    policy: 'plan_required',
    requiredAdapters: ['target_storage_key_builder', 'legacy_english_compat', 'raw_storage_guard'],
    requiredTestEvidence: ['distinct keys for en/fr', 'legacy English', 'raw storage guard'],
    requiredFileEvidence: ['target_storage_keys', 'legacy_english_progress_migration'],
    note: 'Storage blockers must be covered by target keys, legacy English migration and raw-key guard tests.',
  },
  {
    checkId: 'RDY-020',
    policy: 'plan_required',
    requiredAdapters: ['cloud_sync_target_buckets', 'legacy_english_compat', 'target_stats_store'],
    requiredTestEvidence: ['Cloud restore', 'legacy English', 'target cloud'],
    requiredFileEvidence: ['cloud_sync', 'auth_provider'],
    note: 'Cloud sync blockers require target buckets, legacy hydration rules and target/global stats separation.',
  },
  {
    checkId: 'RDY-021',
    policy: 'plan_required',
    requiredAdapters: ['cloud_sync_target_buckets', 'achievement_progress_store', 'target_stats_store'],
    requiredTestEvidence: ['Target achievement', 'Global engagement', 'Cloud restore'],
    requiredFileEvidence: ['achievement_progress_store', 'target_stats_store'],
    note: 'Mixed cloud payloads must be split by achievement/global stats policy before apply.',
  },
  {
    checkId: 'RDY-030',
    policy: 'plan_required',
    requiredAdapters: ['achievement_progress_store'],
    requiredTestEvidence: ['Target achievement', 'Global achievement'],
    requiredFileEvidence: ['achievement_progress_store', 'achievements'],
    note: 'Achievement taxonomy blockers require target/global achievement state implementation.',
  },
  {
    checkId: 'RDY-040',
    policy: 'plan_required',
    requiredAdapters: [
      'cloud_sync_target_buckets',
      'lesson_session_store',
      'mistake_practice_store',
      'personal_practice_store',
      'flashcards_target_store',
    ],
    requiredTestEvidence: ['Cloud restore', 'French trainer', 'fr:<id>', 'French flashcard'],
    requiredFileEvidence: ['lesson_session_store', 'mistake_practice_store', 'personal_practice_store', 'flashcards/target_storage'],
    note: 'Local/cloud decisions need concrete stores for local-only target state and synced target state.',
  },
  {
    checkId: 'RDY-050',
    policy: 'plan_required',
    requiredAdapters: ['production_study_target', 'target_storage_key_builder', 'legacy_english_compat', 'raw_storage_guard'],
    requiredTestEvidence: ['studyTarget remains fr', 'distinct keys for en/fr', 'raw storage guard'],
    requiredFileEvidence: ['study_target', 'StudyTargetContext', 'target_storage_keys'],
    note: 'Production target architecture needs a separate StudyTarget model, key builder and guard rails.',
  },
  {
    checkId: 'RDY-060',
    policy: 'plan_required',
    requiredAdapters: ['route_surface_integration', 'production_study_target'],
    requiredTestEvidence: ['Route smoke matrix', 'No user-facing French route'],
    requiredFileEvidence: ['_layout', '(tabs)/home', '(tabs)/lessons', '(tabs)/settings'],
    note: 'User-facing surfaces must receive production studyTarget without confusing it with sourceLocale.',
  },
  {
    checkId: 'RDY-080',
    policy: 'post_generation',
    requiredAdapters: [],
    requiredTestEvidence: [],
    requiredFileEvidence: ['generated_content_audit'],
    note: 'Generated content audit is intentionally deferred until after generation; it must block production apply.',
  },
  {
    checkId: 'RDY-090',
    policy: 'approval_required',
    requiredAdapters: [],
    requiredTestEvidence: [],
    requiredFileEvidence: ['file_changes.json', 'dirty_overlap_preservation_audit'],
    note: 'Apply approval must stay explicit; coverage can prepare the packet but cannot approve it.',
  },
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function arr<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function textIncludes(haystack: string[], needle: string): boolean {
  const normalizedNeedle = needle.toLowerCase();
  return haystack.some((item) => item.toLowerCase().includes(normalizedNeedle));
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV Readiness Apply Coverage Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Failed readiness checks: ${audit.summary.failedReadinessChecks}`,
    `- Plan-required checks: ${audit.summary.planRequiredChecks}`,
    `- Covered checks: ${audit.summary.coveredChecks}`,
    `- Deferred checks: ${audit.summary.deferredChecks}`,
    `- Missing checks: ${audit.summary.missingChecks}`,
    `- Required adapters: ${audit.summary.requiredAdapters}`,
    `- Covered adapters: ${audit.summary.coveredAdapters}`,
    `- Missing adapters: ${audit.summary.missingAdapters}`,
    `- Apply-plan files referenced: ${audit.summary.applyPlanFilesReferenced}`,
    `- Required test evidence: ${audit.summary.requiredTestEvidence}`,
    `- Covered test evidence: ${audit.summary.coveredTestEvidence}`,
    `- Missing test evidence: ${audit.summary.missingTestEvidence}`,
    `- Required file evidence: ${audit.summary.requiredFileEvidence}`,
    `- Covered file evidence: ${audit.summary.coveredFileEvidence}`,
    `- Missing file evidence: ${audit.summary.missingFileEvidence}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- Apply plan covers failed readiness checks: ${audit.summary.applyPlanCoversFailedReadinessChecks ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Decisions',
    '',
  ];

  for (const decision of audit.decisions) {
    lines.push(`### ${decision.checkId}: ${decision.title}`);
    lines.push('');
    lines.push(`- Coverage: \`${decision.coverageStatus}\``);
    lines.push(`- Policy: \`${decision.policy}\``);
    lines.push(`- Blocks: ${decision.blocks.map((item) => `\`${item}\``).join(', ') || '`none`'}`);
    lines.push(`- Covered adapters: ${decision.coveredAdapters.map((item) => `\`${item}\``).join(', ') || '`none`'}`);
    if (decision.missingAdapters.length > 0) lines.push(`- Missing adapters: ${decision.missingAdapters.map((item) => `\`${item}\``).join(', ')}`);
    lines.push(`- Apply-plan files: ${decision.applyPlanFiles.length}`);
    if (decision.missingTestEvidence.length > 0) lines.push(`- Missing test evidence: ${decision.missingTestEvidence.map((item) => `\`${item}\``).join(', ')}`);
    if (decision.missingFileEvidence.length > 0) lines.push(`- Missing file evidence: ${decision.missingFileEvidence.map((item) => `\`${item}\``).join(', ')}`);
    lines.push(`- Note: ${decision.note}`);
    lines.push('');
  }

  lines.push('## Findings', '');
  if (audit.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`${finding.checkId ? ` (${finding.checkId})` : ''}: ${finding.message}`);
    }
  }

  lines.push('', '## Notes', '');
  for (const note of audit.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_readiness_apply_coverage_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const readinessPath = path.join(runDir, 'audits', 'gustav_readiness_gate.json');
  const migrationPath = path.join(runDir, 'audits', 'migration_adapter_plan.json');
  const applyPlanPath = path.join(runDir, 'apply_plan', 'file_changes.json');
  const dirtyAuditPath = path.join(runDir, 'apply_plan', 'dirty_overlap_preservation_audit.json');

  const readiness = readJson<Record<string, unknown>>(readinessPath);
  const migrationPlan = readJson<Record<string, unknown>>(migrationPath);
  const applyPlan = readJson<Record<string, unknown>>(applyPlanPath);
  const dirtyAudit = fs.existsSync(dirtyAuditPath) ? readJson<Record<string, unknown>>(dirtyAuditPath) : null;

  const failedChecks = arr<Record<string, unknown>>(readiness.checks).filter((check) => check.status === 'FAIL');
  const adapters = arr<Record<string, unknown>>(migrationPlan.adapters);
  const applyFiles = arr<Record<string, unknown>>(applyPlan.files);
  const adapterIds = new Set(adapters.map((adapter) => str(adapter.id)).filter(Boolean));
  const applyFilesByAdapter = new Map<string, Record<string, unknown>[]>();
  const allTestText = [
    ...adapters.flatMap((adapter) => arr<string>(adapter.testsRequired).map(String)),
    ...applyFiles.flatMap((file) => arr<string>(file.testsRequired).map(String)),
  ];
  const allFileText = [
    ...adapters.flatMap((adapter) => [
      ...arr<string>(adapter.productModules).map(String),
      ...arr<string>(adapter.sourceFiles).map(String),
    ]),
    ...applyFiles.map((file) => str(file.path)),
    'file_changes.json',
    fs.existsSync(dirtyAuditPath) ? 'dirty_overlap_preservation_audit' : '',
  ].filter(Boolean);

  for (const file of applyFiles) {
    for (const adapter of arr<string>(file.adapters).map(String)) {
      const existing = applyFilesByAdapter.get(adapter) ?? [];
      existing.push(file);
      applyFilesByAdapter.set(adapter, existing);
    }
  }

  const findings: Finding[] = [];
  const decisions: CoverageDecision[] = [];

  for (const check of failedChecks) {
    const checkId = str(check.id);
    const requirement = REQUIREMENTS.find((item) => item.checkId === checkId) ?? {
      checkId,
      policy: 'plan_required' as const,
      requiredAdapters: [],
      requiredTestEvidence: [],
      requiredFileEvidence: [],
      note: 'No explicit coverage rule exists for this failed readiness check.',
    };
    const coveredAdapters = requirement.requiredAdapters.filter((adapter) => adapterIds.has(adapter) && (applyFilesByAdapter.get(adapter)?.length ?? 0) > 0);
    const missingAdapters = requirement.requiredAdapters.filter((adapter) => !coveredAdapters.includes(adapter));
    const relatedFiles = unique(coveredAdapters.flatMap((adapter) => applyFilesByAdapter.get(adapter) ?? []).map((file) => str(file.path)).filter(Boolean));
    const coveredTestEvidence = requirement.requiredTestEvidence.filter((needle) => textIncludes(allTestText, needle));
    const missingTestEvidence = requirement.requiredTestEvidence.filter((needle) => !coveredTestEvidence.includes(needle));
    const coveredFileEvidence = requirement.requiredFileEvidence.filter((needle) => textIncludes(allFileText, needle));
    const missingFileEvidence = requirement.requiredFileEvidence.filter((needle) => !coveredFileEvidence.includes(needle));

    let coverageStatus: CoverageStatus = 'covered';
    if (requirement.policy === 'post_generation') {
      coverageStatus = 'deferred';
    } else if (requirement.policy === 'meta_verdict') {
      coverageStatus = 'deferred';
    } else if (requirement.policy === 'approval_required') {
      const dirtySummary = dirtyAudit && dirtyAudit.summary && typeof dirtyAudit.summary === 'object'
        ? dirtyAudit.summary as Record<string, unknown>
        : null;
      const approvalStillClosed =
        applyPlan.approvalStatus === 'not_requested' &&
        applyPlan.mayModifyProductionAppFiles === false &&
        dirtyAudit?.status === 'PASS' &&
        dirtySummary?.canPreserveDirtyWorktree === true;
      coverageStatus = approvalStillClosed && missingFileEvidence.length === 0 ? 'covered' : 'missing';
    } else if (missingAdapters.length > 0 || missingTestEvidence.length > 0 || missingFileEvidence.length > 0) {
      coverageStatus = 'missing';
    }

    if (coverageStatus === 'missing') {
      findings.push({
        severity: 'blocker',
        code: 'readiness_apply_coverage_missing',
        checkId,
        message: `${checkId} is missing coverage: adapters=${missingAdapters.join(', ') || 'none'}, tests=${missingTestEvidence.join(', ') || 'none'}, files=${missingFileEvidence.join(', ') || 'none'}.`,
      });
    }

    decisions.push({
      checkId,
      title: str(check.title),
      blocks: arr<string>(check.blocks).map(String),
      sourceArtifact: str(check.sourceArtifact),
      coverageStatus,
      policy: requirement.policy,
      requiredAdapters: requirement.requiredAdapters,
      coveredAdapters,
      missingAdapters,
      applyPlanFiles: relatedFiles,
      requiredTestEvidence: requirement.requiredTestEvidence,
      coveredTestEvidence,
      missingTestEvidence,
      requiredFileEvidence: requirement.requiredFileEvidence,
      coveredFileEvidence,
      missingFileEvidence,
      requiredBeforeWork: arr<string>(check.requiredBeforeWork).map(String),
      note: requirement.note,
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const coveredChecks = decisions.filter((decision) => decision.coverageStatus === 'covered').length;
  const deferredChecks = decisions.filter((decision) => decision.coverageStatus === 'deferred').length;
  const missingChecks = decisions.filter((decision) => decision.coverageStatus === 'missing').length;
  const requiredAdapters = unique(decisions.flatMap((decision) => decision.requiredAdapters));
  const coveredAdapters = unique(decisions.flatMap((decision) => decision.coveredAdapters));
  const missingCoverageDecisions = decisions.filter((decision) => decision.coverageStatus === 'missing');
  const missingAdapters = unique(missingCoverageDecisions.flatMap((decision) => decision.missingAdapters));
  const requiredTestEvidence = decisions.flatMap((decision) => decision.requiredTestEvidence);
  const coveredTestEvidence = decisions.flatMap((decision) => decision.coveredTestEvidence);
  const missingTestEvidence = missingCoverageDecisions.flatMap((decision) => decision.missingTestEvidence);
  const requiredFileEvidence = decisions.flatMap((decision) => decision.requiredFileEvidence);
  const coveredFileEvidence = decisions.flatMap((decision) => decision.coveredFileEvidence);
  const missingFileEvidence = missingCoverageDecisions.flatMap((decision) => decision.missingFileEvidence);
  const applyPlanCoversFailedReadinessChecks = blockers === 0 && missingChecks === 0;
  const audit: Audit = {
    schemaVersion: 'gustav-readiness-apply-coverage-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: applyPlanCoversFailedReadinessChecks ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      readinessGate: path.relative(repoRoot, readinessPath),
      migrationAdapterPlan: path.relative(repoRoot, migrationPath),
      applyPlan: path.relative(repoRoot, applyPlanPath),
      dirtyOverlapPreservationAudit: path.relative(repoRoot, dirtyAuditPath),
    },
    summary: {
      failedReadinessChecks: failedChecks.length,
      planRequiredChecks: decisions.filter((decision) => decision.policy === 'plan_required').length,
      coveredChecks,
      deferredChecks,
      missingChecks,
      requiredAdapters: requiredAdapters.length,
      coveredAdapters: coveredAdapters.length,
      missingAdapters: missingAdapters.length,
      applyPlanFilesReferenced: unique(decisions.flatMap((decision) => decision.applyPlanFiles)).length,
      requiredTestEvidence: requiredTestEvidence.length,
      coveredTestEvidence: coveredTestEvidence.length,
      missingTestEvidence: missingTestEvidence.length,
      requiredFileEvidence: requiredFileEvidence.length,
      coveredFileEvidence: coveredFileEvidence.length,
      missingFileEvidence: missingFileEvidence.length,
      blockers,
      warnings,
      applyPlanCoversFailedReadinessChecks,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    decisions,
    findings,
    notes: [
      'This audit validates coverage of failed readiness checks by the migration adapter plan and apply plan.',
      'A PASS here does not approve production writes and does not allow French generation.',
      'RDY-080 remains intentionally deferred until generated French content exists.',
      'RDY-090 remains intentionally approval-gated until the user explicitly approves the apply plan.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'readiness_apply_coverage_audit.json');
  const outMd = path.join(runDir, 'audits', 'readiness_apply_coverage_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV readiness apply coverage audit: ${audit.status}`);
  console.log(`Failed readiness checks: ${audit.summary.failedReadinessChecks}`);
  console.log(`Covered checks: ${audit.summary.coveredChecks}`);
  console.log(`Deferred checks: ${audit.summary.deferredChecks}`);
  console.log(`Missing checks: ${audit.summary.missingChecks}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (blockers > 0) process.exit(1);
}

void main();
