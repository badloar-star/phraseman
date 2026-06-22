import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
};

type DirtyFileRecord = {
  path: string;
  gitStatus: string;
  category: 'app' | 'component' | 'test' | 'gustav_gate_script' | 'asset' | 'other';
  ownership: 'user_app_work_read_only' | 'gustav_gate_script_read_only' | 'asset_work_read_only' | 'other_read_only';
  tracked: boolean;
  addedLines: number | null;
  deletedLines: number | null;
  markerCounts: Record<string, number>;
};

type CollectibleSetRecord = {
  setName: string;
  path: string;
  files: number;
  untrackedFiles: number;
};

type Report = {
  schemaVersion: 'gustav-current-app-dirty-baseline-snapshot-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    scopedDirtyEntries: number;
    dirtyTrackedFiles: number;
    dirtyUntrackedFiles: number;
    dirtyAppFiles: number;
    dirtyComponentFiles: number;
    dirtyTests: number;
    dirtyGustavGateScripts: number;
    dirtyAssetEntries: number;
    dirtyOtherEntries: number;
    trackedAddedLines: number;
    trackedDeletedLines: number;
    collectibleDalliSets: number;
    collectibleDalliFiles: number;
    untrackedCollectibleDalliFiles: number;
    unclassifiedDirtyEntries: number;
    blockers: number;
    warnings: number;
    readyForP1SurfaceDeltaScanner: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  scope: {
    paths: string[];
    notes: string[];
  };
  dirtyFiles: DirtyFileRecord[];
  collectibleSets: CollectibleSetRecord[];
  raw: {
    gitStatusShort: string[];
    gitDiffNameStatus: string[];
    gitDiffNumstat: string[];
    gitDiffStat: string;
    gitUntrackedFiles: string[];
  };
  findings: Finding[];
};

const SCOPE_PATHS = [
  'app',
  'components',
  'tests',
  'scripts/gustav_readiness_gate.ts',
  'scripts/gustav_target_key_slice_packet.ts',
  'assets/images/collectibles/dalli',
];

const MARKERS = [
  'AsyncStorage',
  'useStudyTarget',
  'StudyTargetLang',
  'studyTarget',
  'sourceLocale',
  'sourceLocales',
  'trackEvent',
  'premium',
  'gift',
  'shard',
  'xp',
  'weekly',
  'stats',
  'SpeakingPanel',
  'router.push',
  'router.replace',
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function runGit(repoRoot: string, args: string[]): string {
  return childProcess.execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function splitLines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trimEnd()).filter(Boolean);
}

function normalizeGitPath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^"|"$/g, '');
}

function parseStatusLine(line: string): { status: string; filePath: string } {
  const status = line.slice(0, 2).trim() || line.slice(0, 2);
  const rawPath = line.slice(3).trim();
  const renamed = rawPath.includes(' -> ') ? rawPath.split(' -> ').pop() ?? rawPath : rawPath;
  return {
    status,
    filePath: normalizeGitPath(renamed),
  };
}

function parseNumstat(lines: string[]): Map<string, { added: number | null; deleted: number | null }> {
  const map = new Map<string, { added: number | null; deleted: number | null }>();
  for (const line of lines) {
    const cells = line.split('\t');
    if (cells.length < 3) continue;
    const added = cells[0] === '-' ? null : Number(cells[0]);
    const deleted = cells[1] === '-' ? null : Number(cells[1]);
    const filePath = normalizeGitPath(cells.slice(2).join('\t'));
    map.set(filePath, {
      added: Number.isFinite(added) ? added : null,
      deleted: Number.isFinite(deleted) ? deleted : null,
    });
  }
  return map;
}

function categoryFor(filePath: string): DirtyFileRecord['category'] {
  if (filePath.startsWith('app/')) return 'app';
  if (filePath.startsWith('components/')) return 'component';
  if (filePath.startsWith('tests/')) return 'test';
  if (filePath === 'scripts/gustav_readiness_gate.ts' || filePath === 'scripts/gustav_target_key_slice_packet.ts') return 'gustav_gate_script';
  if (filePath.startsWith('assets/images/collectibles/dalli/')) return 'asset';
  return 'other';
}

function ownershipFor(category: DirtyFileRecord['category']): DirtyFileRecord['ownership'] {
  if (category === 'app' || category === 'component' || category === 'test') return 'user_app_work_read_only';
  if (category === 'gustav_gate_script') return 'gustav_gate_script_read_only';
  if (category === 'asset') return 'asset_work_read_only';
  return 'other_read_only';
}

function markerCounts(repoRoot: string, filePath: string): Record<string, number> {
  const fullPath = path.resolve(repoRoot, filePath);
  const counts: Record<string, number> = {};
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return counts;
  if (!/\.(ts|tsx|js|jsx|json|md)$/.test(filePath)) return counts;
  const content = fs.readFileSync(fullPath, 'utf8');
  for (const marker of MARKERS) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    counts[marker] = (content.match(new RegExp(escaped, 'g')) ?? []).length;
  }
  return counts;
}

function countFiles(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) count += countFiles(fullPath);
    if (entry.isFile()) count += 1;
  }
  return count;
}

function collectibleSets(repoRoot: string, untrackedFiles: string[]): CollectibleSetRecord[] {
  const baseDir = path.join(repoRoot, 'assets', 'images', 'collectibles', 'dalli');
  if (!fs.existsSync(baseDir)) return [];
  return fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const fullPath = path.join(baseDir, entry.name);
      const relative = artifactPath(repoRoot, fullPath);
      return {
        setName: entry.name,
        path: relative,
        files: countFiles(fullPath),
        untrackedFiles: untrackedFiles.filter((file) => file.startsWith(`${relative}/`)).length,
      };
    })
    .sort((a, b) => a.setName.localeCompare(b.setName));
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Current App Dirty Baseline Snapshot',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Scoped dirty entries: ${report.summary.scopedDirtyEntries}`,
    `- Dirty tracked files: ${report.summary.dirtyTrackedFiles}`,
    `- Dirty untracked files: ${report.summary.dirtyUntrackedFiles}`,
    `- Dirty app files: ${report.summary.dirtyAppFiles}`,
    `- Dirty component files: ${report.summary.dirtyComponentFiles}`,
    `- Dirty tests: ${report.summary.dirtyTests}`,
    `- Dirty GUSTAV gate scripts: ${report.summary.dirtyGustavGateScripts}`,
    `- Dirty asset entries: ${report.summary.dirtyAssetEntries}`,
    `- Dirty other entries: ${report.summary.dirtyOtherEntries}`,
    `- Tracked added lines: ${report.summary.trackedAddedLines}`,
    `- Tracked deleted lines: ${report.summary.trackedDeletedLines}`,
    `- Collectible Dalli sets: ${report.summary.collectibleDalliSets}`,
    `- Collectible Dalli files: ${report.summary.collectibleDalliFiles}`,
    `- Untracked collectible Dalli files: ${report.summary.untrackedCollectibleDalliFiles}`,
    `- Unclassified dirty entries: ${report.summary.unclassifiedDirtyEntries}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for P1 surface delta scanner: ${report.summary.readyForP1SurfaceDeltaScanner ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Dirty Files',
    '',
  ];
  for (const file of report.dirtyFiles) {
    lines.push(`- \`${file.gitStatus}\` \`${file.path}\` (${file.category}, ${file.ownership}, tracked=${file.tracked ? 'yes' : 'no'}, +${file.addedLines ?? 'n/a'}/-${file.deletedLines ?? 'n/a'})`);
  }
  lines.push('', '## Collectible Sets', '');
  for (const set of report.collectibleSets) {
    lines.push(`- \`${set.setName}\`: files ${set.files}, untracked ${set.untrackedFiles}, path \`${set.path}\``);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }
  lines.push('', '## Safety', '');
  lines.push('- This snapshot is read-only.');
  lines.push('- App, component, test, and asset dirty files are treated as existing user/app work.');
  lines.push('- This snapshot does not approve production app writes.');
  lines.push('- This snapshot does not modify generated French ledgers.');
  lines.push('- This snapshot does not write reviewer decisions.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_current_app_dirty_baseline_snapshot.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const findings: Finding[] = [];

  const statusLines = splitLines(runGit(repoRoot, ['status', '--short', '--', ...SCOPE_PATHS]));
  const diffNameStatusLines = splitLines(runGit(repoRoot, ['diff', '--name-status', '--', ...SCOPE_PATHS]));
  const diffNumstatLines = splitLines(runGit(repoRoot, ['diff', '--numstat', '--', ...SCOPE_PATHS]));
  const diffStat = runGit(repoRoot, ['diff', '--stat', '--', ...SCOPE_PATHS]).trim();
  const untrackedFiles = splitLines(runGit(repoRoot, ['ls-files', '--others', '--exclude-standard', '--', ...SCOPE_PATHS]))
    .map(normalizeGitPath);
  const untrackedSet = new Set(untrackedFiles);
  const numstat = parseNumstat(diffNumstatLines);

  const dirtyFiles = statusLines.map((line) => {
    const parsed = parseStatusLine(line);
    const category = categoryFor(parsed.filePath);
    const stats = numstat.get(parsed.filePath);
    return {
      path: parsed.filePath,
      gitStatus: parsed.status,
      category,
      ownership: ownershipFor(category),
      tracked: !untrackedSet.has(parsed.filePath) && parsed.status !== '??',
      addedLines: stats?.added ?? null,
      deletedLines: stats?.deleted ?? null,
      markerCounts: markerCounts(repoRoot, parsed.filePath),
    };
  }).sort((a, b) => a.path.localeCompare(b.path));

  const unclassifiedDirtyEntries = dirtyFiles.filter((file) => file.category === 'other').length;
  if (unclassifiedDirtyEntries > 0) {
    findings.push({
      severity: 'blocker',
      code: 'unclassified_dirty_entries',
      message: `${unclassifiedDirtyEntries} dirty scoped entries are not classified.`,
    });
  }

  const collectibleSetRecords = collectibleSets(repoRoot, untrackedFiles);
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const trackedAddedLines = dirtyFiles.reduce((sum, file) => sum + (file.addedLines ?? 0), 0);
  const trackedDeletedLines = dirtyFiles.reduce((sum, file) => sum + (file.deletedLines ?? 0), 0);

  const report: Report = {
    schemaVersion: 'gustav-current-app-dirty-baseline-snapshot-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      scopedDirtyEntries: dirtyFiles.length,
      dirtyTrackedFiles: dirtyFiles.filter((file) => file.tracked).length,
      dirtyUntrackedFiles: dirtyFiles.filter((file) => !file.tracked).length,
      dirtyAppFiles: dirtyFiles.filter((file) => file.category === 'app').length,
      dirtyComponentFiles: dirtyFiles.filter((file) => file.category === 'component').length,
      dirtyTests: dirtyFiles.filter((file) => file.category === 'test').length,
      dirtyGustavGateScripts: dirtyFiles.filter((file) => file.category === 'gustav_gate_script').length,
      dirtyAssetEntries: dirtyFiles.filter((file) => file.category === 'asset').length,
      dirtyOtherEntries: dirtyFiles.filter((file) => file.category === 'other').length,
      trackedAddedLines,
      trackedDeletedLines,
      collectibleDalliSets: collectibleSetRecords.length,
      collectibleDalliFiles: collectibleSetRecords.reduce((sum, set) => sum + set.files, 0),
      untrackedCollectibleDalliFiles: collectibleSetRecords.reduce((sum, set) => sum + set.untrackedFiles, 0),
      unclassifiedDirtyEntries,
      blockers,
      warnings,
      readyForP1SurfaceDeltaScanner: blockers === 0 && dirtyFiles.length > 0,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    scope: {
      paths: SCOPE_PATHS,
      notes: [
        'This P0 snapshot intentionally scopes to current app/component/test changes, two existing GUSTAV gate scripts, and collectible Dalli assets.',
        'Generated GUSTAV audit outputs and French reviewer scripts are not treated as production app work in this snapshot.',
        'Dirty app/component/test/asset records are marked read-only for algorithm expansion.',
      ],
    },
    dirtyFiles,
    collectibleSets: collectibleSetRecords,
    raw: {
      gitStatusShort: statusLines,
      gitDiffNameStatus: diffNameStatusLines,
      gitDiffNumstat: diffNumstatLines,
      gitDiffStat: diffStat,
      gitUntrackedFiles: untrackedFiles,
    },
    findings,
  };

  ensureDir(auditsDir);
  const outJson = path.join(auditsDir, 'current_app_dirty_baseline_snapshot.json');
  const outMd = path.join(auditsDir, 'current_app_dirty_baseline_snapshot.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV current app dirty baseline snapshot: ${report.status}`);
  console.log(`Scoped dirty entries: ${report.summary.scopedDirtyEntries}`);
  console.log(`Dirty tracked files: ${report.summary.dirtyTrackedFiles}`);
  console.log(`Dirty untracked files: ${report.summary.dirtyUntrackedFiles}`);
  console.log(`Dirty app files: ${report.summary.dirtyAppFiles}`);
  console.log(`Dirty component files: ${report.summary.dirtyComponentFiles}`);
  console.log(`Dirty tests: ${report.summary.dirtyTests}`);
  console.log(`Dirty GUSTAV gate scripts: ${report.summary.dirtyGustavGateScripts}`);
  console.log(`Dirty asset entries: ${report.summary.dirtyAssetEntries}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Ready for P1 surface delta scanner: ${report.summary.readyForP1SurfaceDeltaScanner ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);

  if (blockers > 0) process.exit(1);
}

void main();
