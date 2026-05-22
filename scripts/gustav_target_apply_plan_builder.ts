import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type ApprovalStatus = 'not_requested' | 'approved' | 'rejected';
type OwnerArea =
  | 'course'
  | 'quiz'
  | 'source_locale'
  | 'study_target'
  | 'trainer'
  | 'personal_practice'
  | 'storage'
  | 'ui'
  | 'heisenberg'
  | 'tests'
  | 'admin'
  | 'unknown';

type FileChange = {
  path: string;
  action: 'add' | 'modify' | 'delete';
  reason: string;
  sourceArtifactPath: string;
  ownerArea: OwnerArea;
  risk: 'low' | 'medium' | 'high' | 'blocker';
  adapters: string[];
  phase: string;
  testsRequired: string[];
  rollbackAction: string;
  dirtyWorktreeOverlap: boolean;
};

type ApplyPlan = {
  schemaVersion: 'gustav-apply-file-changes-v0';
  sourceRunId: string;
  status: Status;
  approvalStatus: ApprovalStatus;
  generatedAt: string;
  mayModifyProductionAppFiles: boolean;
  mayStartFrenchGeneration: boolean;
  summary: {
    files: number;
    add: number;
    modify: number;
    delete: number;
    productionFiles: number;
    testFiles: number;
    dirtyWorktreeFiles: number;
    dirtyWorktreeOverlaps: number;
    phases: number;
    adapters: number;
    blockers: number;
    highRisks: number;
  };
  blockers: string[];
  dirtyWorktree: {
    files: string[];
    overlaps: string[];
    preservationAuditPath?: string;
    preservationReviewed: boolean;
  };
  files: FileChange[];
  requiredApprovalText: string;
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

function arr<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function risk(value: unknown): FileChange['risk'] {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'blocker'
    ? value
    : 'blocker';
}

function splitModule(value: string): string[] {
  return value
    .split(/\s+\+\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ownerArea(value: string, file: string): OwnerArea {
  if (file.includes('__tests__') || file.endsWith('.test.ts') || file.endsWith('.test.tsx')) return 'tests';
  if (file.includes('/_admin') || file.includes('_admin_')) return 'admin';
  if (file.includes('StudyTarget') || file.includes('study_target')) return 'study_target';
  if (value === 'study_target') return 'study_target';
  if (value === 'quiz') return 'quiz';
  if (value === 'trainer') return 'trainer';
  if (value === 'personal_practice') return 'personal_practice';
  if (value === 'source_locale') return 'source_locale';
  if (value === 'lesson' || value === 'flashcards') return 'course';
  if (['storage', 'cloud', 'achievements', 'stats'].includes(value)) return 'storage';
  if (value === 'surface') return 'ui';
  if (file.startsWith('app/') || file.startsWith('components/') || file.startsWith('hooks/')) return 'storage';
  return 'unknown';
}

function gitDirtyFiles(repoRoot: string): string[] {
  try {
    const raw = cp.execFileSync('git', ['status', '--porcelain'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return raw
      .split('\n')
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .map((line) => line.slice(3).trim())
      .map((line) => line.includes(' -> ') ? line.split(' -> ').pop() || line : line)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function renderApplyPlan(plan: ApplyPlan): string {
  const lines = [
    '# GUSTAV Target Isolation Apply Plan',
    '',
    `Run: \`${plan.sourceRunId}\``,
    '',
    `Status: \`${plan.status}\``,
    '',
    `Approval: \`${plan.approvalStatus}\``,
    '',
    `Generated at: ${plan.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Files: ${plan.summary.files}`,
    `- Add: ${plan.summary.add}`,
    `- Modify: ${plan.summary.modify}`,
    `- Delete: ${plan.summary.delete}`,
    `- Production files: ${plan.summary.productionFiles}`,
    `- Test files: ${plan.summary.testFiles}`,
    `- Dirty worktree files: ${plan.summary.dirtyWorktreeFiles}`,
    `- Dirty worktree overlaps: ${plan.summary.dirtyWorktreeOverlaps}`,
    `- Dirty preservation reviewed: ${plan.dirtyWorktree.preservationReviewed ? 'yes' : 'no'}`,
    `- Phases: ${plan.summary.phases}`,
    `- Adapters: ${plan.summary.adapters}`,
    `- Blockers: ${plan.summary.blockers}`,
    `- High risks: ${plan.summary.highRisks}`,
    '',
    '## Safety',
    '',
    `- May modify production app files: ${plan.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- May start French generation: ${plan.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    '',
    'Required approval text:',
    '',
    `> ${plan.requiredApprovalText}`,
    '',
    '## Blockers',
    '',
  ];
  for (const blocker of plan.blockers) lines.push(`- ${blocker}`);
  lines.push('', '## Dirty Worktree Overlaps', '');
  if (plan.dirtyWorktree.overlaps.length === 0) {
    lines.push('No overlaps with planned production target files.');
  } else {
    for (const file of plan.dirtyWorktree.overlaps) lines.push(`- \`${file}\``);
  }
  lines.push('', '## File Changes', '');
  for (const file of plan.files) {
    lines.push(`### ${file.path}`);
    lines.push('');
    lines.push(`- Action: \`${file.action}\``);
    lines.push(`- Phase: \`${file.phase}\``);
    lines.push(`- Owner area: \`${file.ownerArea}\``);
    lines.push(`- Risk: \`${file.risk}\``);
    lines.push(`- Adapters: ${file.adapters.map((item) => `\`${item}\``).join(', ')}`);
    lines.push(`- Dirty worktree overlap: ${file.dirtyWorktreeOverlap ? 'yes' : 'no'}`);
    lines.push(`- Reason: ${file.reason}`);
    lines.push(`- Rollback: ${file.rollbackAction}`);
    if (file.testsRequired.length > 0) {
      lines.push('- Tests:');
      for (const test of file.testsRequired.slice(0, 6)) lines.push(`  - ${test}`);
    }
    lines.push('');
  }
  lines.push('## Notes', '');
  for (const note of plan.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

function renderList(title: string, items: string[]): string {
  return [`# ${title}`, '', ...items.map((item) => `- ${item}`), ''].join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_target_apply_plan_builder.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const migrationPath = path.join(runDir, 'audits', 'migration_adapter_plan.json');
  const migrationPlan = readJson<Record<string, unknown>>(migrationPath);
  const adapters = arr<Record<string, unknown>>(migrationPlan.adapters);
  const phases = arr<Record<string, unknown>>(migrationPlan.phases);
  const dirtyFiles = gitDirtyFiles(repoRoot);
  const dirtySet = new Set(dirtyFiles);
  const changes = new Map<string, FileChange>();
  const sourceArtifactPath = path.relative(repoRoot, migrationPath);

  for (const adapter of adapters) {
    const adapterId = str(adapter.id);
    const adapterPhase = str(adapter.phase);
    const adapterRisk = risk(adapter.risk);
    const adapterOwner = str(adapter.ownerArea);
    const testsRequired = arr<string>(adapter.testsRequired).filter((item) => typeof item === 'string');
    const rollbackNotes = arr<string>(adapter.rollbackNotes).filter((item) => typeof item === 'string');
    const reason = arr<string>(adapter.implementationSteps).filter((item) => typeof item === 'string').join(' ');
    const modulePaths = [
      ...arr<string>(adapter.productModules).flatMap((item) => splitModule(String(item))),
      ...arr<string>(adapter.sourceFiles).flatMap((item) => splitModule(String(item))),
    ]
      .filter((file) => file.startsWith('app/') || file.startsWith('components/') || file.startsWith('hooks/'))
      .filter((file) => !file.endsWith('.md'));

    for (const file of modulePaths) {
      const exists = fs.existsSync(path.join(repoRoot, file));
      const current = changes.get(file);
      const next: FileChange = current ?? {
        path: file,
        action: exists ? 'modify' : 'add',
        reason: reason || `Implement adapter ${adapterId}.`,
        sourceArtifactPath,
        ownerArea: ownerArea(adapterOwner, file),
        risk: adapterRisk,
        adapters: [],
        phase: adapterPhase,
        testsRequired: [],
        rollbackAction: rollbackNotes.join(' ') || 'Disable v2 target adapter and keep legacy English behavior untouched.',
        dirtyWorktreeOverlap: dirtySet.has(file),
      };
      next.adapters = Array.from(new Set([...next.adapters, adapterId]));
      next.testsRequired = Array.from(new Set([...next.testsRequired, ...testsRequired]));
      if (next.risk !== 'blocker') next.risk = adapterRisk;
      if (next.phase > adapterPhase) next.phase = adapterPhase;
      changes.set(file, next);
    }
  }

  const testChanges: FileChange[] = [
    'tests/gustav_target_storage_keys.test.ts',
    'tests/gustav_legacy_english_migration.test.ts',
    'tests/gustav_cloud_target_sync.test.ts',
    'tests/gustav_surface_target_switch.test.ts',
  ].map((file) => ({
    path: file,
    action: fs.existsSync(path.join(repoRoot, file)) ? 'modify' : 'add',
    reason: 'Verify target isolation before French generation is allowed.',
    sourceArtifactPath,
    ownerArea: 'tests',
    risk: 'high',
    adapters: ['raw_storage_guard', 'route_surface_integration'],
    phase: 'P5',
    testsRequired: ['Run target-isolation test suite before any French generation.'],
    rollbackAction: 'Remove proposed test files if the apply plan is rejected; no production state changes are made.',
    dirtyWorktreeOverlap: dirtySet.has(file),
  }));
  for (const file of testChanges) changes.set(file.path, file);

  const files = Array.from(changes.values()).sort((a, b) => a.path.localeCompare(b.path));
  const overlaps = files.filter((file) => file.dirtyWorktreeOverlap).map((file) => file.path);
  const preservationAuditPath = path.join(runDir, 'apply_plan', 'dirty_overlap_preservation_audit.json');
  const preservationAudit = safeReadJson<Record<string, unknown>>(preservationAuditPath);
  const preservationSummary = preservationAudit && preservationAudit.summary && typeof preservationAudit.summary === 'object'
    ? preservationAudit.summary as Record<string, unknown>
    : null;
  const dirtyPreservationReviewed =
    preservationAudit?.schemaVersion === 'gustav-dirty-overlap-preservation-audit-v0' &&
    preservationAudit.status === 'PASS' &&
    preservationSummary?.canPreserveDirtyWorktree === true &&
    preservationSummary?.plannedDirtyOverlaps === overlaps.length &&
    preservationSummary?.reviewedOverlaps === overlaps.length &&
    preservationSummary?.missingFiles === 0;
  const blockers = [
    'Apply plan is not explicitly approved by the user.',
    'Production app files must not be modified until approvalStatus becomes approved.',
    ...(overlaps.length > 0 && !dirtyPreservationReviewed ? [`${overlaps.length} planned file(s) overlap with the current dirty worktree and require preservation review.`] : []),
  ];
  const plan: ApplyPlan = {
    schemaVersion: 'gustav-apply-file-changes-v0',
    sourceRunId: runId,
    status: 'HOLD',
    approvalStatus: 'not_requested',
    generatedAt: new Date().toISOString(),
    mayModifyProductionAppFiles: false,
    mayStartFrenchGeneration: false,
    summary: {
      files: files.length,
      add: files.filter((file) => file.action === 'add').length,
      modify: files.filter((file) => file.action === 'modify').length,
      delete: files.filter((file) => file.action === 'delete').length,
      productionFiles: files.filter((file) => file.path.startsWith('app/') || file.path.startsWith('components/') || file.path.startsWith('hooks/')).length,
      testFiles: files.filter((file) => file.ownerArea === 'tests').length,
      dirtyWorktreeFiles: dirtyFiles.length,
      dirtyWorktreeOverlaps: overlaps.length,
      phases: phases.length,
      adapters: adapters.length,
      blockers: blockers.length,
      highRisks: files.filter((file) => file.risk === 'high' || file.risk === 'blocker').length,
    },
    blockers,
    dirtyWorktree: {
      files: dirtyFiles,
      overlaps,
      preservationAuditPath: fs.existsSync(preservationAuditPath) ? path.relative(repoRoot, preservationAuditPath) : undefined,
      preservationReviewed: dirtyPreservationReviewed,
    },
    files,
    requiredApprovalText: `User approved apply plan ${runId} on 2026-05-19. Approved file list: docs/gustav/runs/${runId}/apply_plan/file_changes.json.`,
    notes: [
      'This plan is a proposal only; it does not authorize production writes.',
      'No French content may be generated from this plan alone.',
      'Every production file write must remain inside this file list after approval.',
    ],
  };

  const applyDir = path.join(runDir, 'apply_plan');
  ensureDir(applyDir);
  fs.writeFileSync(path.join(applyDir, 'file_changes.json'), `${JSON.stringify(plan, null, 2)}\n`);
  fs.writeFileSync(path.join(applyDir, 'APPLY_PLAN.md'), renderApplyPlan(plan));
  fs.writeFileSync(path.join(applyDir, 'migration_plan.md'), renderList('GUSTAV Target Isolation Migration Plan', arr<Record<string, unknown>>(migrationPlan.phases).map((phase) => `${str(phase.id)}: ${str(phase.title) || str(phase.status)}`)));
  fs.writeFileSync(path.join(applyDir, 'rollback_plan.md'), renderList('GUSTAV Target Isolation Rollback Plan', Array.from(new Set(files.map((file) => file.rollbackAction)))));
  fs.writeFileSync(path.join(applyDir, 'tests_required.md'), renderList('GUSTAV Target Isolation Tests Required', Array.from(new Set(files.flatMap((file) => file.testsRequired)))));
  fs.writeFileSync(path.join(applyDir, 'heisenberg_impact.md'), renderList('GUSTAV Heisenberg Impact Review', [
    'Target storage changes must not weaken existing English Heisenberg audits.',
    'Legacy English compatibility must keep existing English progress readable under en only.',
    'French generation remains blocked until target isolation tests and generated-content audits pass.',
  ]));
  fs.writeFileSync(path.join(applyDir, 'english_regression_risk.md'), renderList('GUSTAV English Regression Risk', [
    'Existing flat English keys must be copied to en target buckets without deletion.',
    'Rollback must preserve old English behavior by disabling v2 reads.',
    'French target must never read legacy English fallback keys.',
      ...overlaps.map((file) => `${dirtyPreservationReviewed ? 'Dirty worktree preservation plan recorded' : 'Dirty worktree overlap requires manual preservation review'}: ${file}`),
  ]));

  console.log(`GUSTAV target apply plan: ${plan.status}`);
  console.log(`Files: ${plan.summary.files}`);
  console.log(`Production files: ${plan.summary.productionFiles}`);
  console.log(`Dirty overlaps: ${plan.summary.dirtyWorktreeOverlaps}`);
  console.log(`Approval status: ${plan.approvalStatus}`);
  console.log(`May modify production app files: ${plan.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, path.join(applyDir, 'file_changes.json'))}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
