import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  adapterId?: string;
  filePath?: string;
};

type AdapterDecision = {
  adapterId: string;
  phase: string;
  status: string;
  dependencies: string[];
  dependencyPhases: Array<{ adapterId: string; phase: string; relation: 'earlier' | 'same' | 'later' | 'missing' }>;
  applyPlanFiles: string[];
  dirtyWorktreeOverlaps: string[];
  testsRequired: string[];
  canStartBeforeApproval: boolean;
  canModifyProductionAppFiles: boolean;
};

type PhaseDecision = {
  phaseId: string;
  title: string;
  adapters: string[];
  dependencies: string[];
  files: string[];
  dirtyWorktreeOverlaps: string[];
  testsRequired: string[];
  exitCriteria: string[];
  canStartBeforeApproval: boolean;
  canModifyProductionAppFiles: boolean;
};

type Audit = {
  schemaVersion: 'gustav-phase-dependency-audit-v0';
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
    applyPlan: string;
    dirtyOverlapPreservationAudit: string;
  };
  summary: {
    phases: number;
    adapters: number;
    dependencies: number;
    samePhaseDependencies: number;
    crossPhaseDependencies: number;
    missingDependencies: number;
    phaseOrderViolations: number;
    phaseMembershipViolations: number;
    applyPlanFiles: number;
    adaptersWithoutApplyFiles: number;
    applyFilesWithUnknownAdapters: number;
    nextExecutablePhase: string;
    nextExecutableAdapters: number;
    nextPhaseFiles: number;
    nextPhaseDirtyOverlaps: number;
    dirtyOverlapPreservationReviewed: boolean;
    approvalStatus: string;
    blockers: number;
    warnings: number;
    canSequencePhasesSafely: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  phases: PhaseDecision[];
  adapters: AdapterDecision[];
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

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV Phase Dependency Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Phases: ${audit.summary.phases}`,
    `- Adapters: ${audit.summary.adapters}`,
    `- Dependencies: ${audit.summary.dependencies}`,
    `- Same-phase dependencies: ${audit.summary.samePhaseDependencies}`,
    `- Cross-phase dependencies: ${audit.summary.crossPhaseDependencies}`,
    `- Missing dependencies: ${audit.summary.missingDependencies}`,
    `- Phase order violations: ${audit.summary.phaseOrderViolations}`,
    `- Phase membership violations: ${audit.summary.phaseMembershipViolations}`,
    `- Apply-plan files: ${audit.summary.applyPlanFiles}`,
    `- Adapters without apply files: ${audit.summary.adaptersWithoutApplyFiles}`,
    `- Apply files with unknown adapters: ${audit.summary.applyFilesWithUnknownAdapters}`,
    `- Next executable phase: \`${audit.summary.nextExecutablePhase}\``,
    `- Next executable adapters: ${audit.summary.nextExecutableAdapters}`,
    `- Next phase files: ${audit.summary.nextPhaseFiles}`,
    `- Next phase dirty overlaps: ${audit.summary.nextPhaseDirtyOverlaps}`,
    `- Dirty overlap preservation reviewed: ${audit.summary.dirtyOverlapPreservationReviewed ? 'yes' : 'no'}`,
    `- Approval status: \`${audit.summary.approvalStatus}\``,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- Can sequence phases safely: ${audit.summary.canSequencePhasesSafely ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Phases',
    '',
  ];

  for (const phase of audit.phases) {
    lines.push(`### ${phase.phaseId}: ${phase.title}`);
    lines.push('');
    lines.push(`- Adapters: ${phase.adapters.map((item) => `\`${item}\``).join(', ') || '`none`'}`);
    lines.push(`- Dependencies: ${phase.dependencies.map((item) => `\`${item}\``).join(', ') || '`none`'}`);
    lines.push(`- Files: ${phase.files.length}`);
    lines.push(`- Dirty overlaps: ${phase.dirtyWorktreeOverlaps.length}`);
    lines.push(`- Tests: ${phase.testsRequired.length}`);
    lines.push(`- May modify production app files: ${phase.canModifyProductionAppFiles ? 'yes' : 'no'}`);
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
    console.error('Usage: npx tsx scripts/gustav_phase_dependency_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const migrationPath = path.join(runDir, 'audits', 'migration_adapter_plan.json');
  const applyPlanPath = path.join(runDir, 'apply_plan', 'file_changes.json');
  const dirtyAuditPath = path.join(runDir, 'apply_plan', 'dirty_overlap_preservation_audit.json');

  const migrationPlan = readJson<Record<string, unknown>>(migrationPath);
  const applyPlan = readJson<Record<string, unknown>>(applyPlanPath);
  const dirtyAudit = fs.existsSync(dirtyAuditPath) ? readJson<Record<string, unknown>>(dirtyAuditPath) : null;
  const dirtySummary = dirtyAudit && dirtyAudit.summary && typeof dirtyAudit.summary === 'object'
    ? dirtyAudit.summary as Record<string, unknown>
    : null;

  const phasesRaw = arr<Record<string, unknown>>(migrationPlan.phases);
  const adaptersRaw = arr<Record<string, unknown>>(migrationPlan.adapters);
  const applyFiles = arr<Record<string, unknown>>(applyPlan.files);
  const phaseIds = new Set(phasesRaw.map((phase) => str(phase.id)).filter(Boolean));
  const adapterIds = new Set(adaptersRaw.map((adapter) => str(adapter.id)).filter(Boolean));
  const adapterById = new Map(adaptersRaw.map((adapter) => [str(adapter.id), adapter] as const).filter(([id]) => Boolean(id)));
  const filesByAdapter = new Map<string, Record<string, unknown>[]>();
  const findings: Finding[] = [];

  for (const file of applyFiles) {
    const filePath = str(file.path);
    for (const adapterId of arr<string>(file.adapters).map(String)) {
      if (!adapterIds.has(adapterId)) {
        findings.push({
          severity: 'blocker',
          code: 'apply_file_unknown_adapter',
          filePath,
          message: `Apply-plan file ${filePath} references unknown adapter ${adapterId}.`,
        });
      }
      const existing = filesByAdapter.get(adapterId) ?? [];
      existing.push(file);
      filesByAdapter.set(adapterId, existing);
    }
  }

  const adapterDecisions: AdapterDecision[] = [];
  let dependencies = 0;
  let samePhaseDependencies = 0;
  let crossPhaseDependencies = 0;
  let missingDependencies = 0;
  let phaseOrderViolations = 0;
  let phaseMembershipViolations = 0;

  for (const adapter of adaptersRaw) {
    const adapterId = str(adapter.id);
    const phase = str(adapter.phase);
    const deps = arr<string>(adapter.dependsOn).map(String);
    const dependencyPhases: AdapterDecision['dependencyPhases'] = [];
    const files = filesByAdapter.get(adapterId) ?? [];
    const dirtyOverlaps = files.filter((file) => bool(file.dirtyWorktreeOverlap)).map((file) => str(file.path));
    const testsRequired = unique([
      ...arr<string>(adapter.testsRequired).map(String),
      ...files.flatMap((file) => arr<string>(file.testsRequired).map(String)),
    ]);

    if (!phaseIds.has(phase)) {
      phaseMembershipViolations += 1;
      findings.push({
        severity: 'blocker',
        code: 'adapter_phase_missing',
        adapterId,
        message: `Adapter ${adapterId} references missing phase ${phase}.`,
      });
    }

    for (const dep of deps) {
      dependencies += 1;
      const depAdapter = adapterById.get(dep);
      if (!depAdapter) {
        missingDependencies += 1;
        dependencyPhases.push({ adapterId: dep, phase: 'missing', relation: 'missing' });
        findings.push({
          severity: 'blocker',
          code: 'adapter_dependency_missing',
          adapterId,
          message: `Adapter ${adapterId} depends on missing adapter ${dep}.`,
        });
        continue;
      }
      const depPhase = str(depAdapter.phase);
      const relation = phaseRank(depPhase) < phaseRank(phase)
        ? 'earlier'
        : phaseRank(depPhase) === phaseRank(phase)
          ? 'same'
          : 'later';
      if (relation === 'same') samePhaseDependencies += 1;
      if (relation === 'earlier') crossPhaseDependencies += 1;
      if (relation === 'later') {
        phaseOrderViolations += 1;
        findings.push({
          severity: 'blocker',
          code: 'adapter_dependency_phase_order_violation',
          adapterId,
          message: `Adapter ${adapterId} in ${phase} depends on later adapter ${dep} in ${depPhase}.`,
        });
      }
      dependencyPhases.push({ adapterId: dep, phase: depPhase, relation });
    }

    if (files.length === 0) {
      findings.push({
        severity: 'blocker',
        code: 'adapter_without_apply_files',
        adapterId,
        message: `Adapter ${adapterId} has no apply-plan files.`,
      });
    }

    adapterDecisions.push({
      adapterId,
      phase,
      status: str(adapter.status),
      dependencies: deps,
      dependencyPhases,
      applyPlanFiles: unique(files.map((file) => str(file.path))),
      dirtyWorktreeOverlaps: unique(dirtyOverlaps),
      testsRequired,
      canStartBeforeApproval: false,
      canModifyProductionAppFiles: false,
    });
  }

  const phaseDecisions: PhaseDecision[] = phasesRaw
    .map((phase) => {
      const phaseId = str(phase.id);
      const phaseAdapters = arr<string>(phase.adapters).map(String);
      for (const adapterId of phaseAdapters) {
        const adapter = adapterById.get(adapterId);
        if (!adapter || str(adapter.phase) !== phaseId) {
          phaseMembershipViolations += 1;
          findings.push({
            severity: 'blocker',
            code: 'phase_adapter_membership_mismatch',
            adapterId,
            message: `Phase ${phaseId} lists adapter ${adapterId}, but the adapter is missing or assigned to ${adapter ? str(adapter.phase) : 'missing'}.`,
          });
        }
      }
      const phaseAdapterSet = new Set(phaseAdapters);
      const phaseAdapterDecisions = adapterDecisions.filter((adapter) => phaseAdapterSet.has(adapter.adapterId));
      const files = unique(phaseAdapterDecisions.flatMap((adapter) => adapter.applyPlanFiles));
      const dirtyOverlaps = unique(phaseAdapterDecisions.flatMap((adapter) => adapter.dirtyWorktreeOverlaps));
      const testsRequired = unique(phaseAdapterDecisions.flatMap((adapter) => adapter.testsRequired));
      const deps = unique(phaseAdapterDecisions.flatMap((adapter) => adapter.dependencies));
      return {
        phaseId,
        title: str(phase.title),
        adapters: phaseAdapters,
        dependencies: deps,
        files,
        dirtyWorktreeOverlaps: dirtyOverlaps,
        testsRequired,
        exitCriteria: arr<string>(phase.exitCriteria).map(String),
        canStartBeforeApproval: false,
        canModifyProductionAppFiles: false,
      };
    })
    .sort((a, b) => phaseRank(a.phaseId) - phaseRank(b.phaseId));

  for (const adapter of adaptersRaw) {
    const adapterId = str(adapter.id);
    const phase = str(adapter.phase);
    const listedByPhase = phasesRaw.some((rawPhase) => str(rawPhase.id) === phase && arr<string>(rawPhase.adapters).map(String).includes(adapterId));
    if (!listedByPhase) {
      phaseMembershipViolations += 1;
      findings.push({
        severity: 'blocker',
        code: 'adapter_not_listed_in_phase',
        adapterId,
        message: `Adapter ${adapterId} says phase ${phase}, but that phase does not list it.`,
      });
    }
  }

  const nextExecutablePhase = phaseDecisions.find((phase) => phase.adapters.length > 0)?.phaseId ?? 'none';
  const nextPhase = phaseDecisions.find((phase) => phase.phaseId === nextExecutablePhase) ?? null;
  const adaptersWithoutApplyFiles = adapterDecisions.filter((adapter) => adapter.applyPlanFiles.length === 0).length;
  const applyFilesWithUnknownAdapters = applyFiles.filter((file) => arr<string>(file.adapters).map(String).some((adapter) => !adapterIds.has(adapter))).length;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const dirtyOverlapPreservationReviewed =
    dirtyAudit?.status === 'PASS' &&
    dirtySummary?.canPreserveDirtyWorktree === true &&
    dirtySummary?.mayModifyProductionAppFiles === false;
  const canSequencePhasesSafely =
    blockers === 0 &&
    missingDependencies === 0 &&
    phaseOrderViolations === 0 &&
    phaseMembershipViolations === 0 &&
    adaptersWithoutApplyFiles === 0 &&
    applyFilesWithUnknownAdapters === 0 &&
    dirtyOverlapPreservationReviewed &&
    applyPlan.mayModifyProductionAppFiles === false &&
    applyPlan.mayStartFrenchGeneration === false;

  const audit: Audit = {
    schemaVersion: 'gustav-phase-dependency-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: canSequencePhasesSafely ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      migrationAdapterPlan: path.relative(repoRoot, migrationPath),
      applyPlan: path.relative(repoRoot, applyPlanPath),
      dirtyOverlapPreservationAudit: path.relative(repoRoot, dirtyAuditPath),
    },
    summary: {
      phases: phasesRaw.length,
      adapters: adaptersRaw.length,
      dependencies,
      samePhaseDependencies,
      crossPhaseDependencies,
      missingDependencies,
      phaseOrderViolations,
      phaseMembershipViolations,
      applyPlanFiles: applyFiles.length,
      adaptersWithoutApplyFiles,
      applyFilesWithUnknownAdapters,
      nextExecutablePhase,
      nextExecutableAdapters: nextPhase?.adapters.length ?? 0,
      nextPhaseFiles: nextPhase?.files.length ?? 0,
      nextPhaseDirtyOverlaps: nextPhase?.dirtyWorktreeOverlaps.length ?? 0,
      dirtyOverlapPreservationReviewed,
      approvalStatus: str(applyPlan.approvalStatus),
      blockers,
      warnings,
      canSequencePhasesSafely,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    phases: phaseDecisions,
    adapters: adapterDecisions.sort((a, b) => phaseRank(a.phase) - phaseRank(b.phase) || a.adapterId.localeCompare(b.adapterId)),
    findings,
    notes: [
      'This audit validates implementation order only; it does not approve production writes.',
      'Same-phase dependencies require serial work inside the phase.',
      'The next executable phase is informational until the apply plan is explicitly approved.',
      'French generation remains blocked until readiness generation blockers are resolved.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'phase_dependency_audit.json');
  const outMd = path.join(runDir, 'audits', 'phase_dependency_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV phase dependency audit: ${audit.status}`);
  console.log(`Phases: ${audit.summary.phases}`);
  console.log(`Adapters: ${audit.summary.adapters}`);
  console.log(`Dependencies: ${audit.summary.dependencies}`);
  console.log(`Next executable phase: ${audit.summary.nextExecutablePhase}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (blockers > 0) process.exit(1);
}

void main();
