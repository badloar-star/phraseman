import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'high' | 'medium' | 'low' | 'info';

type PreservationDecision = {
  path: string;
  plannedAction: string;
  ownerArea: string;
  phase: string;
  risk: string;
  adapters: string[];
  gitStatus: string;
  currentlyDirty: boolean;
  exists: boolean;
  lineCount: number;
  diffAddedLines: number;
  diffDeletedLines: number;
  preservationStatus: 'preservation_plan_recorded' | 'file_missing';
  strategy: string[];
  requiredBeforeEdit: string[];
};

type Finding = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  sourceRefs: Array<{
    file: string;
    line: number;
    provenance?: string;
  }>;
};

type Audit = {
  schemaVersion: 'gustav-dirty-overlap-preservation-audit-v0';
  runId: string;
  status: Status;
  generatedAt: string;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  applyPlanPath: string;
  summary: {
    plannedDirtyOverlaps: number;
    reviewedOverlaps: number;
    currentlyDirtyOverlaps: number;
    noLongerDirtyOverlaps: number;
    missingFiles: number;
    totalDiffAddedLines: number;
    totalDiffDeletedLines: number;
    blockers: number;
    highRisks: number;
    canPreserveDirtyWorktree: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  decisions: PreservationDecision[];
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

function gitDirtyMap(repoRoot: string): Map<string, string> {
  const map = new Map<string, string>();
  const raw = cp.execFileSync('git', ['status', '--porcelain'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  for (const line of raw.split('\n').filter(Boolean)) {
    const status = line.slice(0, 2);
    const rawFile = line.slice(3).trim();
    const file = rawFile.includes(' -> ') ? rawFile.split(' -> ').pop() || rawFile : rawFile;
    map.set(file, status);
  }
  return map;
}

function diffNumstat(repoRoot: string, file: string): { added: number; deleted: number } {
  try {
    const raw = cp.execFileSync('git', ['diff', '--numstat', 'HEAD', '--', file], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!raw) return { added: 0, deleted: 0 };
    const [addedRaw, deletedRaw] = raw.split(/\s+/);
    const added = Number.parseInt(addedRaw, 10);
    const deleted = Number.parseInt(deletedRaw, 10);
    return {
      added: Number.isFinite(added) ? added : 0,
      deleted: Number.isFinite(deleted) ? deleted : 0,
    };
  } catch {
    return { added: 0, deleted: 0 };
  }
}

function lineCount(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  return fs.readFileSync(filePath, 'utf8').split('\n').length;
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV Dirty Overlap Preservation Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Planned dirty overlaps: ${audit.summary.plannedDirtyOverlaps}`,
    `- Reviewed overlaps: ${audit.summary.reviewedOverlaps}`,
    `- Currently dirty overlaps: ${audit.summary.currentlyDirtyOverlaps}`,
    `- No-longer-dirty overlaps: ${audit.summary.noLongerDirtyOverlaps}`,
    `- Missing files: ${audit.summary.missingFiles}`,
    `- Total diff added lines: ${audit.summary.totalDiffAddedLines}`,
    `- Total diff deleted lines: ${audit.summary.totalDiffDeletedLines}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- High risks: ${audit.summary.highRisks}`,
    `- Can preserve dirty worktree: ${audit.summary.canPreserveDirtyWorktree ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Decisions',
    '',
  ];
  for (const decision of audit.decisions) {
    lines.push(`### ${decision.path}`);
    lines.push('');
    lines.push(`- Git status: \`${decision.gitStatus || 'clean'}\``);
    lines.push(`- Currently dirty: ${decision.currentlyDirty ? 'yes' : 'no'}`);
    lines.push(`- Exists: ${decision.exists ? 'yes' : 'no'}`);
    lines.push(`- Diff: +${decision.diffAddedLines} / -${decision.diffDeletedLines}`);
    lines.push(`- Preservation status: \`${decision.preservationStatus}\``);
    lines.push(`- Phase: \`${decision.phase}\``);
    lines.push(`- Owner area: \`${decision.ownerArea}\``);
    lines.push(`- Adapters: ${decision.adapters.map((item) => `\`${item}\``).join(', ')}`);
    lines.push('- Strategy:');
    for (const item of decision.strategy) lines.push(`  - ${item}`);
    lines.push('- Required before edit:');
    for (const item of decision.requiredBeforeEdit) lines.push(`  - ${item}`);
    lines.push('');
  }
  lines.push('## Findings', '');
  if (audit.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`### ${finding.id}: ${finding.title}`);
      lines.push('');
      lines.push(`Severity: \`${finding.severity}\``);
      lines.push('');
      lines.push(finding.detail);
      lines.push('');
      if (finding.sourceRefs.length > 0) {
        lines.push('Source refs:');
        for (const ref of finding.sourceRefs) lines.push(`- \`${ref.file}:${ref.line}\`${ref.provenance ? ` (${ref.provenance})` : ''}`);
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
    console.error('Usage: npx tsx scripts/gustav_dirty_overlap_preservation_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const applyPlanPath = path.join(runDir, 'apply_plan', 'file_changes.json');
  const applyPlan = readJson<Record<string, unknown>>(applyPlanPath);
  const files = arr<Record<string, unknown>>(applyPlan.files);
  const overlaps = files.filter((file) => file.dirtyWorktreeOverlap === true);
  const dirtyMap = gitDirtyMap(repoRoot);

  const decisions: PreservationDecision[] = overlaps.map((file) => {
    const filePath = str(file.path);
    const abs = path.join(repoRoot, filePath);
    const exists = fs.existsSync(abs);
    const diff = diffNumstat(repoRoot, filePath);
    const currentlyDirty = dirtyMap.has(filePath);
    return {
      path: filePath,
      plannedAction: str(file.action),
      ownerArea: str(file.ownerArea),
      phase: str(file.phase),
      risk: str(file.risk),
      adapters: arr<string>(file.adapters).filter((item) => typeof item === 'string'),
      gitStatus: dirtyMap.get(filePath) || '',
      currentlyDirty,
      exists,
      lineCount: lineCount(abs),
      diffAddedLines: diff.added,
      diffDeletedLines: diff.deleted,
      preservationStatus: exists ? 'preservation_plan_recorded' : 'file_missing',
      strategy: [
        'Read the current file before any apply edit.',
        'Patch only the target-isolation call sites listed by the adapter plan.',
        'Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.',
        'If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.',
      ],
      requiredBeforeEdit: [
        'Re-run this preservation audit immediately before production apply.',
        'Review git diff for this file in the same turn as the edit.',
        'Keep rollback additive: disable new v2 target path without deleting legacy English keys.',
      ],
    };
  });

  const findings: Finding[] = [];
  const missing = decisions.filter((decision) => !decision.exists);
  if (missing.length > 0) {
    findings.push({
      id: 'DOP-001',
      severity: 'blocker',
      title: 'Planned dirty-overlap files are missing',
      detail: `${missing.length} planned overlap file(s) no longer exist.`,
      sourceRefs: missing.map((decision) => ({ file: decision.path, line: 1, provenance: 'apply_plan' })),
    });
  }
  if (decisions.length > 0 && missing.length === 0) {
    findings.push({
      id: 'DOP-000',
      severity: 'info',
      title: 'Dirty-overlap preservation plan recorded',
      detail: `${decisions.length} dirty-overlap file(s) have preservation instructions before any production apply.`,
      sourceRefs: [{ file: path.relative(repoRoot, applyPlanPath), line: 1, provenance: 'apply_plan' }],
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const highRisks = findings.filter((finding) => finding.severity === 'high').length;
  const audit: Audit = {
    schemaVersion: 'gustav-dirty-overlap-preservation-audit-v0',
    runId,
    status: blockers === 0 && highRisks === 0 ? 'PASS' : 'HOLD',
    generatedAt: new Date().toISOString(),
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    applyPlanPath: path.relative(repoRoot, applyPlanPath),
    summary: {
      plannedDirtyOverlaps: overlaps.length,
      reviewedOverlaps: decisions.length,
      currentlyDirtyOverlaps: decisions.filter((decision) => decision.currentlyDirty).length,
      noLongerDirtyOverlaps: decisions.filter((decision) => !decision.currentlyDirty).length,
      missingFiles: missing.length,
      totalDiffAddedLines: decisions.reduce((sum, decision) => sum + decision.diffAddedLines, 0),
      totalDiffDeletedLines: decisions.reduce((sum, decision) => sum + decision.diffDeletedLines, 0),
      blockers,
      highRisks,
      canPreserveDirtyWorktree: blockers === 0 && highRisks === 0,
      mayModifyProductionAppFiles: false,
    },
    decisions,
    findings,
    notes: [
      'This audit records preservation strategy only; it does not approve production app writes.',
      'Dirty files remain dirty and must be rechecked immediately before any approved apply.',
      'No French content is generated by this audit.',
    ],
  };

  const applyDir = path.join(runDir, 'apply_plan');
  ensureDir(applyDir);
  fs.writeFileSync(path.join(applyDir, 'dirty_overlap_preservation_audit.json'), `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(path.join(applyDir, 'dirty_overlap_preservation_audit.md'), renderMarkdown(audit));

  console.log(`GUSTAV dirty overlap preservation audit: ${audit.status}`);
  console.log(`Planned overlaps: ${audit.summary.plannedDirtyOverlaps}`);
  console.log(`Reviewed overlaps: ${audit.summary.reviewedOverlaps}`);
  console.log(`Currently dirty: ${audit.summary.currentlyDirtyOverlaps}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, path.join(applyDir, 'dirty_overlap_preservation_audit.json'))}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
