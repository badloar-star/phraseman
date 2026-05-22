import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  filePath?: string;
};

type Slice = {
  id: string;
  title: string;
  mode: 'first_core' | 'dev_isolation' | 'p1_consumer_prep' | 'defer_to_later_adapter';
  adapters: string[];
  files: string[];
  dirtyWorktreeOverlaps: string[];
  laterPhaseAdapters: string[];
  entryCriteria: string[];
  exitCriteria: string[];
  mayModifyProductionAppFiles: boolean;
};

type Audit = {
  schemaVersion: 'gustav-p1-execution-slice-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    migrationAdapterPlan: string;
    phaseDependencyAudit: string;
    applyPlan: string;
    dirtyOverlapPreservationAudit: string;
  };
  summary: {
    p1PhaseExists: boolean;
    p1Adapters: number;
    p1PlannedFiles: number;
    p1DirtyOverlaps: number;
    p1FilesWithLaterPhaseAdapters: number;
    p1FilesWithOnlyP1Adapters: number;
    firstSliceFiles: number;
    firstSliceDirtyOverlaps: number;
    deferredMixedPhaseFiles: number;
    testSupportFiles: number;
    slices: number;
    blockers: number;
    warnings: number;
    canStartP1AfterApproval: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  slices: Slice[];
  findings: Finding[];
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

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function arr<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function bool(value: unknown): boolean {
  return value === true;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function phaseRank(phase: string): number {
  const match = /^P(\d+)$/.exec(phase);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function filePath(file: Record<string, unknown>): string {
  return str(file.path);
}

function fileAdapters(file: Record<string, unknown>): string[] {
  return arr<string>(file.adapters).map(String).filter(Boolean);
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1 Execution Slice Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- P1 phase exists: ${audit.summary.p1PhaseExists ? 'yes' : 'no'}`,
    `- P1 adapters: ${audit.summary.p1Adapters}`,
    `- P1 planned files: ${audit.summary.p1PlannedFiles}`,
    `- P1 dirty overlaps: ${audit.summary.p1DirtyOverlaps}`,
    `- P1 files with later-phase adapters: ${audit.summary.p1FilesWithLaterPhaseAdapters}`,
    `- P1 files with only P1 adapters: ${audit.summary.p1FilesWithOnlyP1Adapters}`,
    `- First slice files: ${audit.summary.firstSliceFiles}`,
    `- First slice dirty overlaps: ${audit.summary.firstSliceDirtyOverlaps}`,
    `- Deferred mixed-phase files: ${audit.summary.deferredMixedPhaseFiles}`,
    `- Test support files: ${audit.summary.testSupportFiles}`,
    `- Slices: ${audit.summary.slices}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- Can start P1 after approval: ${audit.summary.canStartP1AfterApproval ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Slices',
    '',
  ];

  for (const slice of audit.slices) {
    lines.push(`### ${slice.id}: ${slice.title}`);
    lines.push('');
    lines.push(`- Mode: \`${slice.mode}\``);
    lines.push(`- Adapters: ${slice.adapters.map((item) => `\`${item}\``).join(', ') || '`none`'}`);
    lines.push(`- Files: ${slice.files.length}`);
    for (const file of slice.files.slice(0, 40)) lines.push(`  - \`${file}\``);
    if (slice.files.length > 40) lines.push(`  - ...${slice.files.length - 40} more`);
    lines.push(`- Dirty overlaps: ${slice.dirtyWorktreeOverlaps.length}`);
    if (slice.dirtyWorktreeOverlaps.length > 0) {
      for (const file of slice.dirtyWorktreeOverlaps) lines.push(`  - \`${file}\``);
    }
    if (slice.laterPhaseAdapters.length > 0) {
      lines.push(`- Later-phase adapters: ${slice.laterPhaseAdapters.map((item) => `\`${item}\``).join(', ')}`);
    }
    lines.push(`- May modify production app files: ${slice.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
    lines.push('');
  }

  lines.push('## Findings', '');
  if (audit.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
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
    console.error('Usage: npx tsx scripts/gustav_p1_execution_slice_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const migrationPath = path.join(runDir, 'audits', 'migration_adapter_plan.json');
  const phasePath = path.join(runDir, 'audits', 'phase_dependency_audit.json');
  const applyPlanPath = path.join(runDir, 'apply_plan', 'file_changes.json');
  const dirtyAuditPath = path.join(runDir, 'apply_plan', 'dirty_overlap_preservation_audit.json');

  const migrationPlan = readJson<Record<string, unknown>>(migrationPath);
  const phaseAudit = readJson<Record<string, unknown>>(phasePath);
  const applyPlan = readJson<Record<string, unknown>>(applyPlanPath);
  const dirtyAudit = readJson<Record<string, unknown>>(dirtyAuditPath);
  const dirtySummary = dirtyAudit.summary && typeof dirtyAudit.summary === 'object'
    ? dirtyAudit.summary as Record<string, unknown>
    : {};

  const migrationAdapters = arr<Record<string, unknown>>(migrationPlan.adapters);
  const adapterPhase = new Map<string, string>();
  for (const adapter of migrationAdapters) {
    const id = str(adapter.id);
    if (id) adapterPhase.set(id, str(adapter.phase));
  }

  const p1Adapters = migrationAdapters
    .filter((adapter) => str(adapter.phase) === 'P1')
    .map((adapter) => str(adapter.id))
    .filter(Boolean);
  const p1AdapterSet = new Set(p1Adapters);
  const p1Phase = arr<Record<string, unknown>>(phaseAudit.phases).find((phase) => str(phase.phaseId) === 'P1');
  const applyFiles = arr<Record<string, unknown>>(applyPlan.files);
  const testSupportFiles = applyFiles.filter((file) => {
    const p = filePath(file);
    return p === 'tests/gustav_target_storage_keys.test.ts' || p === 'tests/gustav_surface_target_switch.test.ts';
  });
  const p1PlannedFiles = applyFiles.filter((file) => str(file.phase) === 'P1' || fileAdapters(file).some((adapter) => p1AdapterSet.has(adapter)));

  const corePaths = new Set([
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    ...testSupportFiles.map(filePath),
  ]);
  const devIsolationPaths = new Set([
    'app/study_target_lang_dev.ts',
    'components/StudyTargetContext.tsx',
    'app/spanish_content_gate.ts',
    'app/(tabs)/settings.tsx',
  ]);

  const coreFiles = [...p1PlannedFiles, ...testSupportFiles].filter((file) => corePaths.has(filePath(file)));
  const devFiles = p1PlannedFiles.filter((file) => devIsolationPaths.has(filePath(file)));
  const p1OnlyConsumerFiles = p1PlannedFiles.filter((file) => {
    const p = filePath(file);
    if (corePaths.has(p) || devIsolationPaths.has(p)) return false;
    return fileAdapters(file).every((adapter) => phaseRank(adapterPhase.get(adapter) ?? 'P99') <= 1);
  });
  const mixedPhaseFiles = p1PlannedFiles.filter((file) => {
    const p = filePath(file);
    if (corePaths.has(p) || devIsolationPaths.has(p)) return false;
    return fileAdapters(file).some((adapter) => phaseRank(adapterPhase.get(adapter) ?? 'P99') > 1);
  });

  const accounted = new Set([...coreFiles, ...devFiles, ...p1OnlyConsumerFiles, ...mixedPhaseFiles].map(filePath));
  const unaccounted = p1PlannedFiles.filter((file) => !accounted.has(filePath(file)));
  const findings: Finding[] = [];

  if (!p1Phase) {
    findings.push({
      severity: 'blocker',
      code: 'p1_phase_missing',
      message: 'Phase dependency audit does not include P1.',
    });
  }
  for (const required of ['production_study_target', 'target_storage_key_builder']) {
    if (!p1AdapterSet.has(required)) {
      findings.push({
        severity: 'blocker',
        code: 'p1_required_adapter_missing',
        message: `P1 is missing required adapter ${required}.`,
      });
    }
  }
  for (const requiredPath of ['app/study_target.ts', 'app/target_storage_keys.ts']) {
    if (!coreFiles.some((file) => filePath(file) === requiredPath)) {
      findings.push({
        severity: 'blocker',
        code: 'p1_core_contract_file_missing',
        filePath: requiredPath,
        message: `P1 first slice is missing core contract file ${requiredPath}.`,
      });
    }
  }
  if (unaccounted.length > 0) {
    for (const file of unaccounted) {
      findings.push({
        severity: 'blocker',
        code: 'p1_file_unclassified',
        filePath: filePath(file),
        message: `P1 file ${filePath(file)} was not assigned to an execution slice.`,
      });
    }
  }

  const firstSliceDirty = coreFiles.filter((file) => bool(file.dirtyWorktreeOverlap)).map(filePath);
  if (firstSliceDirty.length > 0) {
    findings.push({
      severity: 'blocker',
      code: 'p1_first_slice_dirty_overlap',
      message: `P1 first slice has dirty overlaps: ${firstSliceDirty.join(', ')}.`,
    });
  }
  const dirtyReviewed = dirtyAudit.status === 'PASS' && dirtySummary.canPreserveDirtyWorktree === true && dirtySummary.mayModifyProductionAppFiles === false;
  if (!dirtyReviewed) {
    findings.push({
      severity: 'blocker',
      code: 'p1_dirty_preservation_not_reviewed',
      message: 'Dirty overlap preservation must be PASS before P1 can be sliced safely.',
    });
  }
  if (applyPlan.mayModifyProductionAppFiles !== false || applyPlan.mayStartFrenchGeneration !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1_safety_flags_open',
      message: 'P1 slice audit requires apply plan safety flags to stay closed.',
    });
  }

  function sliceFor(input: {
    id: string;
    title: string;
    mode: Slice['mode'];
    files: Record<string, unknown>[];
    entryCriteria: string[];
    exitCriteria: string[];
  }): Slice {
    const adapters = unique(input.files.flatMap(fileAdapters).filter((adapter) => p1AdapterSet.has(adapter)));
    const laterPhaseAdapters = unique(input.files.flatMap(fileAdapters).filter((adapter) => phaseRank(adapterPhase.get(adapter) ?? 'P99') > 1));
    return {
      id: input.id,
      title: input.title,
      mode: input.mode,
      adapters,
      files: unique(input.files.map(filePath)),
      dirtyWorktreeOverlaps: unique(input.files.filter((file) => bool(file.dirtyWorktreeOverlap)).map(filePath)),
      laterPhaseAdapters,
      entryCriteria: input.entryCriteria,
      exitCriteria: input.exitCriteria,
      mayModifyProductionAppFiles: false,
    };
  }

  const slices: Slice[] = [
    sliceFor({
      id: 'P1A_CORE_CONTRACTS',
      title: 'Add production StudyTarget and target key contracts',
      mode: 'first_core',
      files: coreFiles,
      entryCriteria: [
        'Apply plan is explicitly approved.',
        'Only additive core contract files and direct tests are touched.',
        'No consumer route or storage file is modified in this slice.',
      ],
      exitCriteria: [
        'StudyTarget type supports en/fr without sourceLocale coupling.',
        'Target storage key builder returns distinct en/fr keys for target-sensitive domains.',
        'No production write occurs before approval.',
      ],
    }),
    sliceFor({
      id: 'P1B_DEV_TARGET_ISOLATION',
      title: 'Separate dev Spanish target switches from production StudyTarget',
      mode: 'dev_isolation',
      files: devFiles,
      entryCriteria: [
        'P1A core contracts are present.',
        'Dirty-overlap files are re-read immediately before edit.',
      ],
      exitCriteria: [
        'sourceLocale ru/uk changes do not change studyTarget fr.',
        'Spanish dev gates cannot activate French target state.',
      ],
    }),
    sliceFor({
      id: 'P1C_P1_ONLY_KEY_CONSUMER_PREP',
      title: 'Prepare consumers that only need the target key builder',
      mode: 'p1_consumer_prep',
      files: p1OnlyConsumerFiles,
      entryCriteria: [
        'P1A key builder exists and tests pass.',
        'No later-phase store semantics are introduced in this slice.',
      ],
      exitCriteria: [
        'P1-only raw key consumers can import target key helpers without changing behavior.',
        'Legacy English behavior remains the runtime default.',
      ],
    }),
    sliceFor({
      id: 'P1D_DEFER_MIXED_PHASE_CONSUMERS',
      title: 'Defer files that need later adapters',
      mode: 'defer_to_later_adapter',
      files: mixedPhaseFiles,
      entryCriteria: [
        'Do not touch these files in the first P1 implementation slice.',
        'Wait until their later adapter dependencies are ready.',
      ],
      exitCriteria: [
        'Every mixed-phase file is handled in its later adapter slice.',
        'P1 does not accidentally implement P2/P3/P4/P5 behavior.',
      ],
    }),
  ];

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const p1DirtyOverlaps = p1PlannedFiles.filter((file) => bool(file.dirtyWorktreeOverlap)).length;
  const p1FilesWithLaterPhaseAdapters = p1PlannedFiles.filter((file) => fileAdapters(file).some((adapter) => phaseRank(adapterPhase.get(adapter) ?? 'P99') > 1)).length;
  const p1FilesWithOnlyP1Adapters = p1PlannedFiles.filter((file) => fileAdapters(file).every((adapter) => phaseRank(adapterPhase.get(adapter) ?? 'P99') <= 1)).length;
  const canStartP1AfterApproval =
    blockers === 0 &&
    coreFiles.length >= 2 &&
    firstSliceDirty.length === 0 &&
    p1FilesWithLaterPhaseAdapters === mixedPhaseFiles.length + devFiles.filter((file) => fileAdapters(file).some((adapter) => phaseRank(adapterPhase.get(adapter) ?? 'P99') > 1)).length &&
    dirtyReviewed;

  const audit: Audit = {
    schemaVersion: 'gustav-p1-execution-slice-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: canStartP1AfterApproval ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      migrationAdapterPlan: path.relative(repoRoot, migrationPath),
      phaseDependencyAudit: path.relative(repoRoot, phasePath),
      applyPlan: path.relative(repoRoot, applyPlanPath),
      dirtyOverlapPreservationAudit: path.relative(repoRoot, dirtyAuditPath),
    },
    summary: {
      p1PhaseExists: Boolean(p1Phase),
      p1Adapters: p1Adapters.length,
      p1PlannedFiles: p1PlannedFiles.length,
      p1DirtyOverlaps,
      p1FilesWithLaterPhaseAdapters,
      p1FilesWithOnlyP1Adapters,
      firstSliceFiles: coreFiles.length,
      firstSliceDirtyOverlaps: firstSliceDirty.length,
      deferredMixedPhaseFiles: mixedPhaseFiles.length,
      testSupportFiles: testSupportFiles.length,
      slices: slices.length,
      blockers,
      warnings,
      canStartP1AfterApproval,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    slices,
    findings,
    notes: [
      'This audit narrows P1 into execution slices; it does not approve production writes.',
      'P1A is the only first implementation slice and is limited to core contracts plus direct tests.',
      'Files that also require P2/P3/P4/P5 adapters are explicitly deferred from the first P1 patch.',
      'French generation remains blocked until readiness generation blockers are resolved.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1_execution_slice_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1_execution_slice_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV P1 execution slice audit: ${audit.status}`);
  console.log(`P1 planned files: ${audit.summary.p1PlannedFiles}`);
  console.log(`First slice files: ${audit.summary.firstSliceFiles}`);
  console.log(`Deferred mixed-phase files: ${audit.summary.deferredMixedPhaseFiles}`);
  console.log(`First slice dirty overlaps: ${audit.summary.firstSliceDirtyOverlaps}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (blockers > 0) process.exit(1);
}

void main();
