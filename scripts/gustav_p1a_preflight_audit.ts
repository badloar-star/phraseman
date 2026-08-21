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

type FirstSliceReadiness = {
  filePath: string;
  plannedAction: string;
  phase: string;
  expectedRole: 'study_target_model' | 'target_key_builder' | 'test_contract' | 'unknown';
  existsNow: boolean;
  parentDirExists: boolean;
  dirtyWorktreeOverlap: boolean;
  preflightDecision: 'ready_to_add_after_approval' | 'requires_re_read_before_edit' | 'blocked';
};

type DevTargetEntrypoint = {
  filePath: string;
  role: 'dev_target_provider' | 'dev_target_storage' | 'dev_spanish_gate' | 'target_consumer' | 'test' | 'unknown';
  totalMarkers: number;
  markers: Record<string, number>;
  requiredBoundary: string;
};

type Audit = {
  schemaVersion: 'gustav-p1a-preflight-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1aCoreContractSpec: string;
    p1ExecutionSliceAudit: string;
    applyPlan: string;
  };
  summary: {
    firstSliceFiles: number;
    firstSliceExistingNow: number;
    firstSliceAdditionsReady: number;
    firstSliceDirtyOverlaps: number;
    firstSliceParentsReady: number;
    deferredDevBridgeFiles: number;
    deferredConsumerFiles: number;
    devTargetEntrypoints: number;
    forbiddenRawKeyPatterns: number;
    blockers: number;
    warnings: number;
    preflightReadyAfterApproval: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  firstSliceReadiness: FirstSliceReadiness[];
  implementationBoundaries: {
    p1aCoreFiles: string[];
    deferredDevBridgeFiles: string[];
    deferredConsumerFiles: string[];
    forbiddenRawKeyPatterns: string[];
  };
  devTargetEntrypoints: DevTargetEntrypoint[];
  findings: Finding[];
  notes: string[];
};

const TOKEN_PATTERNS: Array<[string, RegExp]> = [
  ['StudyTargetLang', /\bStudyTargetLang\b/g],
  ['useStudyTarget', /\buseStudyTarget\b/g],
  ['getDevStudyTargetLang', /\bgetDevStudyTargetLang\b/g],
  ['setDevStudyTargetLang', /\bsetDevStudyTargetLang\b/g],
  ['study_target_lang_dev', /study_target_lang_dev/g],
  ['spanishStudyActive', /\bspanishStudyActive\b/g],
  ['spanishSurfacesEnabled', /\bspanishSurfacesEnabled\b/g],
  ['ENABLE_DEV_STUDY_TARGET_LANG', /\bENABLE_DEV_STUDY_TARGET_LANG\b/g],
];

const FORBIDDEN_RAW_KEY_PATTERNS = [
  'lesson{lessonId}_progress',
  'lesson{lessonId}_words',
  'lesson{lessonId}_best_score',
  'lesson{lessonId}_intro_shown',
  'lesson{lessonId}_preposition_progress',
  'last_opened_lesson',
  'smart_review_queue',
  'custom_flashcards_v2',
  'flashcards_progress_v1',
  'achievements_state',
  'daily_stats',
  'user_stats_v1',
  'stats_daily_breakdown_v1',
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

function bool(value: unknown): boolean {
  return value === true;
}

function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function listFiles(root: string, dirs: string[]): string[] {
  const result: string[] = [];
  const allowedExt = new Set(['.ts', '.tsx']);

  function visit(dir: string): void {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
        continue;
      }
      if (entry.isFile() && allowedExt.has(path.extname(entry.name))) result.push(full);
    }
  }

  for (const dir of dirs) visit(path.join(root, dir));
  return result.sort();
}

function roleForEntrypoint(filePath: string): DevTargetEntrypoint['role'] {
  if (filePath === 'components/StudyTargetContext.tsx') return 'dev_target_provider';
  if (filePath === 'components/LangContext.tsx') return 'dev_target_provider';
  if (filePath === 'app/(tabs)/settings.tsx') return 'dev_target_provider';
  if (filePath === 'app/study_target_lang_dev.ts') return 'dev_target_storage';
  if (filePath === 'app/spanish_content_gate.ts') return 'dev_spanish_gate';
  if (filePath === 'app/config.ts') return 'dev_spanish_gate';
  if (filePath.startsWith('tests/')) return 'test';
  if (filePath.includes('lesson') || filePath.includes('flashcards') || filePath.includes('review') || filePath.includes('pack_opening') || filePath === 'app/phrase_target_utils.ts') {
    return 'target_consumer';
  }
  return 'unknown';
}

function boundaryForRole(role: DevTargetEntrypoint['role']): string {
  switch (role) {
    case 'dev_target_provider':
      return 'Must bridge production StudyTarget after P1A, while keeping dev en/es storage isolated.';
    case 'dev_target_storage':
      return 'Must remain dev-only and must not accept fr as a dev StudyTargetLang value.';
    case 'dev_spanish_gate':
      return 'Must not become the French production target gate.';
    case 'target_consumer':
      return 'Must keep reading existing en/es dev target until the later P1B/P1C bridge is approved.';
    case 'test':
      return 'Must continue proving dev Spanish target behavior separately from production French.';
    default:
      return 'Must be reviewed before it can consume production StudyTarget.';
  }
}

function scanDevTargetEntrypoints(repoRoot: string): DevTargetEntrypoint[] {
  const files = listFiles(repoRoot, ['app', 'components', 'tests']);
  const entries: DevTargetEntrypoint[] = [];
  for (const fullPath of files) {
    const text = fs.readFileSync(fullPath, 'utf8');
    const markers: Record<string, number> = {};
    let totalMarkers = 0;
    for (const [name, pattern] of TOKEN_PATTERNS) {
      const count = countMatches(text, pattern);
      if (count > 0) {
        markers[name] = count;
        totalMarkers += count;
      }
    }
    if (totalMarkers === 0) continue;
    const relative = path.relative(repoRoot, fullPath);
    const role = roleForEntrypoint(relative);
    entries.push({
      filePath: relative,
      role,
      totalMarkers,
      markers,
      requiredBoundary: boundaryForRole(role),
    });
  }
  return entries.sort((a, b) => a.filePath.localeCompare(b.filePath));
}

function expectedRole(filePath: string): FirstSliceReadiness['expectedRole'] {
  if (filePath === 'app/study_target.ts') return 'study_target_model';
  if (filePath === 'app/target_storage_keys.ts') return 'target_key_builder';
  if (filePath.startsWith('tests/')) return 'test_contract';
  return 'unknown';
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Preflight Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- First slice files: ${audit.summary.firstSliceFiles}`,
    `- First slice existing now: ${audit.summary.firstSliceExistingNow}`,
    `- First slice additions ready: ${audit.summary.firstSliceAdditionsReady}`,
    `- First slice dirty overlaps: ${audit.summary.firstSliceDirtyOverlaps}`,
    `- First slice parents ready: ${audit.summary.firstSliceParentsReady}`,
    `- Deferred dev bridge files: ${audit.summary.deferredDevBridgeFiles}`,
    `- Deferred consumer files: ${audit.summary.deferredConsumerFiles}`,
    `- Dev target entrypoints: ${audit.summary.devTargetEntrypoints}`,
    `- Forbidden raw key patterns: ${audit.summary.forbiddenRawKeyPatterns}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- Preflight ready after approval: ${audit.summary.preflightReadyAfterApproval ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## First Slice Readiness',
    '',
  ];

  for (const file of audit.firstSliceReadiness) {
    lines.push(`- \`${file.filePath}\`: ${file.preflightDecision}`);
    lines.push(`  - action: \`${file.plannedAction}\`, phase: \`${file.phase}\`, role: \`${file.expectedRole}\``);
    lines.push(`  - exists now: ${file.existsNow ? 'yes' : 'no'}, parent dir exists: ${file.parentDirExists ? 'yes' : 'no'}, dirty overlap: ${file.dirtyWorktreeOverlap ? 'yes' : 'no'}`);
  }

  lines.push('', '## Deferred Boundaries', '');
  lines.push('P1B dev bridge files:');
  for (const file of audit.implementationBoundaries.deferredDevBridgeFiles) lines.push(`- \`${file}\``);
  lines.push('', 'Deferred consumer files:');
  for (const file of audit.implementationBoundaries.deferredConsumerFiles.slice(0, 40)) lines.push(`- \`${file}\``);
  if (audit.implementationBoundaries.deferredConsumerFiles.length > 40) {
    lines.push(`- ...${audit.implementationBoundaries.deferredConsumerFiles.length - 40} more`);
  }

  lines.push('', '## Dev Target Entrypoints', '');
  for (const entry of audit.devTargetEntrypoints) {
    lines.push(`- \`${entry.filePath}\`: \`${entry.role}\`, markers ${entry.totalMarkers}`);
    lines.push(`  - boundary: ${entry.requiredBoundary}`);
  }

  lines.push('', '## Forbidden Raw Key Patterns', '');
  for (const pattern of audit.implementationBoundaries.forbiddenRawKeyPatterns) lines.push(`- \`${pattern}\``);

  lines.push('', '## Findings', '');
  if (audit.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
      if (finding.filePath) lines.push(`  - file: \`${finding.filePath}\``);
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
    console.error('Usage: npx tsx scripts/gustav_p1a_preflight_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const p1aPath = path.join(runDir, 'audits', 'p1a_core_contract_spec.json');
  const p1SlicePath = path.join(runDir, 'audits', 'p1_execution_slice_audit.json');
  const applyPlanPath = path.join(runDir, 'apply_plan', 'file_changes.json');

  const p1a = readJson<Record<string, unknown>>(p1aPath);
  const p1Slice = readJson<Record<string, unknown>>(p1SlicePath);
  const applyPlan = readJson<Record<string, unknown>>(applyPlanPath);
  const findings: Finding[] = [];

  const firstSlice = p1a.firstSlice && typeof p1a.firstSlice === 'object'
    ? p1a.firstSlice as Record<string, unknown>
    : null;
  const firstSliceFiles = arr<string>(firstSlice?.files).map(String);
  const firstSliceDirty = new Set(arr<string>(firstSlice?.dirtyWorktreeOverlaps).map(String));
  const applyFiles = arr<Record<string, unknown>>(applyPlan.files);
  const applyByPath = new Map(applyFiles.map((file) => [str(file.path), file]));

  if (p1a.status !== 'PASS') {
    findings.push({
      severity: 'blocker',
      code: 'p1a_contract_not_pass',
      message: `P1A contract spec must be PASS before preflight, found ${String(p1a.status)}.`,
      filePath: path.relative(repoRoot, p1aPath),
    });
  }
  if (!firstSlice || firstSliceFiles.length === 0) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_first_slice_missing',
      message: 'P1A contract spec must include firstSlice.files.',
      filePath: path.relative(repoRoot, p1aPath),
    });
  }
  if (applyPlan.mayModifyProductionAppFiles !== false || applyPlan.mayStartFrenchGeneration !== false) {
    findings.push({
      severity: 'blocker',
      code: 'preflight_safety_flags_open',
      message: 'P1A preflight requires apply and French generation safety flags to remain closed.',
      filePath: path.relative(repoRoot, applyPlanPath),
    });
  }

  const firstSliceReadiness: FirstSliceReadiness[] = firstSliceFiles.map((filePath) => {
    const applyFile = applyByPath.get(filePath);
    const absolute = path.join(repoRoot, filePath);
    const parentDirExists = fs.existsSync(path.dirname(absolute));
    const existsNow = fs.existsSync(absolute);
    const dirtyWorktreeOverlap = bool(applyFile?.dirtyWorktreeOverlap) || firstSliceDirty.has(filePath);
    const plannedAction = str(applyFile?.action) || 'missing_from_apply_plan';
    let preflightDecision: FirstSliceReadiness['preflightDecision'] = 'ready_to_add_after_approval';
    if (!applyFile || !parentDirExists || dirtyWorktreeOverlap || plannedAction !== 'add') {
      preflightDecision = 'blocked';
    } else if (existsNow) {
      preflightDecision = 'requires_re_read_before_edit';
    }
    return {
      filePath,
      plannedAction,
      phase: str(applyFile?.phase) || 'unknown',
      expectedRole: expectedRole(filePath),
      existsNow,
      parentDirExists,
      dirtyWorktreeOverlap,
      preflightDecision,
    };
  });

  for (const file of firstSliceReadiness) {
    if (file.plannedAction === 'missing_from_apply_plan') {
      findings.push({
        severity: 'blocker',
        code: 'first_slice_missing_from_apply_plan',
        message: 'First-slice file is not present in apply plan.',
        filePath: file.filePath,
      });
    }
    if (file.expectedRole === 'unknown') {
      findings.push({
        severity: 'blocker',
        code: 'first_slice_unknown_role',
        message: 'First-slice file has no P1A role.',
        filePath: file.filePath,
      });
    }
    if (file.plannedAction !== 'add') {
      findings.push({
        severity: 'blocker',
        code: 'first_slice_not_additive',
        message: `P1A first slice must be additive before dev bridge work; planned action is ${file.plannedAction}.`,
        filePath: file.filePath,
      });
    }
    if (!file.parentDirExists) {
      findings.push({
        severity: 'blocker',
        code: 'first_slice_parent_missing',
        message: 'Parent directory does not exist.',
        filePath: file.filePath,
      });
    }
    if (file.dirtyWorktreeOverlap) {
      findings.push({
        severity: 'blocker',
        code: 'first_slice_dirty_overlap',
        message: 'First-slice file has a dirty worktree overlap.',
        filePath: file.filePath,
      });
    }
    if (file.existsNow) {
      findings.push({
        severity: 'warning',
        code: 'first_slice_file_already_exists',
        message: 'File already exists and must be re-read before any implementation edit.',
        filePath: file.filePath,
      });
    }
  }

  const slices = arr<Record<string, unknown>>(p1Slice.slices);
  const devBridge = slices.find((slice) => str(slice.id) === 'P1B_DEV_TARGET_ISOLATION');
  const p1c = slices.find((slice) => str(slice.id) === 'P1C_P1_ONLY_KEY_CONSUMER_PREP');
  const p1d = slices.find((slice) => str(slice.id) === 'P1D_DEFER_MIXED_PHASE_CONSUMERS');
  const deferredDevBridgeFiles = arr<string>(devBridge?.files).map(String).sort();
  const deferredConsumerFiles = [
    ...arr<string>(p1c?.files).map(String),
    ...arr<string>(p1d?.files).map(String),
  ].sort();
  if (!deferredDevBridgeFiles.includes('components/StudyTargetContext.tsx')) {
    findings.push({
      severity: 'blocker',
      code: 'study_target_context_not_deferred',
      message: 'P1B must explicitly bridge components/StudyTargetContext.tsx after P1A.',
      filePath: 'components/StudyTargetContext.tsx',
    });
  }
  if (!deferredDevBridgeFiles.includes('app/study_target_lang_dev.ts')) {
    findings.push({
      severity: 'blocker',
      code: 'dev_study_target_storage_not_deferred',
      message: 'P1B must explicitly isolate app/study_target_lang_dev.ts after P1A.',
      filePath: 'app/study_target_lang_dev.ts',
    });
  }

  const devTargetEntrypoints = scanDevTargetEntrypoints(repoRoot);
  if (!devTargetEntrypoints.some((entry) => entry.filePath === 'components/StudyTargetContext.tsx')) {
    findings.push({
      severity: 'blocker',
      code: 'study_target_context_not_scanned',
      message: 'Preflight scan did not find components/StudyTargetContext.tsx.',
      filePath: 'components/StudyTargetContext.tsx',
    });
  }
  if (!devTargetEntrypoints.some((entry) => entry.filePath === 'app/study_target_lang_dev.ts')) {
    findings.push({
      severity: 'blocker',
      code: 'dev_study_target_storage_not_scanned',
      message: 'Preflight scan did not find app/study_target_lang_dev.ts.',
      filePath: 'app/study_target_lang_dev.ts',
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const firstSliceExistingNow = firstSliceReadiness.filter((file) => file.existsNow).length;
  const firstSliceDirtyOverlaps = firstSliceReadiness.filter((file) => file.dirtyWorktreeOverlap).length;
  const firstSliceAdditionsReady = firstSliceReadiness.filter((file) => file.preflightDecision === 'ready_to_add_after_approval').length;
  const firstSliceParentsReady = firstSliceReadiness.filter((file) => file.parentDirExists).length;
  const preflightReadyAfterApproval =
    blockers === 0 &&
    firstSliceReadiness.length === 4 &&
    firstSliceExistingNow === 0 &&
    firstSliceDirtyOverlaps === 0 &&
    firstSliceAdditionsReady === firstSliceReadiness.length &&
    applyPlan.approvalStatus === 'not_requested' &&
    applyPlan.mayModifyProductionAppFiles === false &&
    applyPlan.mayStartFrenchGeneration === false;

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-preflight-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1aCoreContractSpec: path.relative(repoRoot, p1aPath),
      p1ExecutionSliceAudit: path.relative(repoRoot, p1SlicePath),
      applyPlan: path.relative(repoRoot, applyPlanPath),
    },
    summary: {
      firstSliceFiles: firstSliceReadiness.length,
      firstSliceExistingNow,
      firstSliceAdditionsReady,
      firstSliceDirtyOverlaps,
      firstSliceParentsReady,
      deferredDevBridgeFiles: deferredDevBridgeFiles.length,
      deferredConsumerFiles: deferredConsumerFiles.length,
      devTargetEntrypoints: devTargetEntrypoints.length,
      forbiddenRawKeyPatterns: FORBIDDEN_RAW_KEY_PATTERNS.length,
      blockers,
      warnings,
      preflightReadyAfterApproval,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    firstSliceReadiness,
    implementationBoundaries: {
      p1aCoreFiles: firstSliceFiles,
      deferredDevBridgeFiles,
      deferredConsumerFiles,
      forbiddenRawKeyPatterns: FORBIDDEN_RAW_KEY_PATTERNS,
    },
    devTargetEntrypoints,
    findings,
    notes: [
      'This audit is a preflight guard only; it does not write production files.',
      'P1A can add only the production StudyTarget contract, target key builder and direct tests after explicit apply approval.',
      'The existing en/es dev StudyTargetLang path must be bridged later and must not become the French production target model.',
      'French generation remains blocked until target-isolation implementation and generated-content audits pass.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_preflight_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1a_preflight_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A preflight audit: ${audit.status}`);
  console.log(`First slice files: ${audit.summary.firstSliceFiles}`);
  console.log(`First slice additions ready: ${audit.summary.firstSliceAdditionsReady}`);
  console.log(`Dev target entrypoints: ${audit.summary.devTargetEntrypoints}`);
  console.log(`Deferred dev bridge files: ${audit.summary.deferredDevBridgeFiles}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
