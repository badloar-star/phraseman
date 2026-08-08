import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type FindingSeverity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: FindingSeverity;
  code: string;
  message: string;
  path?: string;
};

type DomainCandidate =
  | 'lesson_rows'
  | 'lesson_runtime'
  | 'personal_plan_content'
  | 'ai_dialog_scenarios'
  | 'flashcard_marketplace_bundles'
  | 'club_rewards_stats_weekly'
  | 'premium_loyalty_speaking'
  | 'collectible_reward_assets'
  | 'target_storage_and_cloud_sync'
  | 'source_locale_ui_copy'
  | 'gustav_gate_scripts'
  | 'unclassified';

type DirtyCategory = 'app' | 'component' | 'test' | 'gustav_gate_script' | 'asset' | 'other';

type MarkerCounts = {
  AsyncStorage: number;
  useStudyTarget: number;
  StudyTargetLang: number;
  studyTarget: number;
  sourceLocale: number;
  sourceLocales: number;
  useLang: number;
  trackEvent: number;
  premium: number;
  gift: number;
  shard: number;
  xp: number;
  weekly: number;
  stats: number;
  analytics: number;
  SpeakingPanel: number;
  router: number;
  planContent: number;
  dialog: number;
  flashcard: number;
  collectible: number;
};

type Evidence = {
  line: number;
  marker: keyof MarkerCounts;
  text: string;
};

type OldSurfaceInventory = {
  schemaVersion?: string;
  generatedAt?: string;
  summary?: {
    surfaces?: number;
    appTsxFiles?: number;
    stackScreens?: number;
    tabScreens?: number;
    blockers?: number;
  };
  surfaces?: Array<{
    sourcePath?: string;
    domain?: string;
    kind?: string;
    risk?: string;
    markers?: Record<string, unknown>;
  }>;
};

type P0DirtySnapshot = {
  schemaVersion?: string;
  generatedAt?: string;
  status?: string;
  summary?: {
    scopedDirtyEntries?: number;
    dirtyTrackedFiles?: number;
    dirtyUntrackedFiles?: number;
    dirtyAppFiles?: number;
    dirtyComponentFiles?: number;
    dirtyTests?: number;
    dirtyGustavGateScripts?: number;
    dirtyAssetEntries?: number;
    blockers?: number;
    readyForP1SurfaceDeltaScanner?: boolean;
    readyForApply?: boolean;
    mayModifyProductionAppFiles?: boolean;
  };
  dirtyFiles?: Array<{
    path: string;
    gitStatus: string;
    category: DirtyCategory;
    ownership: string;
    tracked: boolean;
    addedLines: number | null;
    deletedLines: number | null;
    markerCounts?: Record<string, number>;
  }>;
  raw?: {
    gitStatusShort?: string[];
    gitDiffNameStatus?: string[];
    gitUntrackedFiles?: string[];
  };
};

type DirtyFileDeltaRecord = {
  path: string;
  gitStatus: string;
  category: DirtyCategory;
  tracked: boolean;
  fileExists: boolean;
  addedLines: number | null;
  deletedLines: number | null;
  primaryDomain: DomainCandidate;
  secondaryDomains: DomainCandidate[];
  classificationReason: string;
  markerCounts: MarkerCounts;
  evidence: Evidence[];
};

type SurfaceDeltaRecord = {
  path: string;
  routeName?: string;
  primaryDomain: DomainCandidate;
  markerCounts: MarkerCounts;
  dirtyInP0: boolean;
  existedInOldInventory: boolean;
  likelyUserFacing: boolean;
  evidence: Evidence[];
};

type CollectibleSetRecord = {
  setName: string;
  path: string;
  files: number;
  untrackedFiles: number;
  newInDirtyBaseline: boolean;
};

type Report = {
  schemaVersion: 'gustav-current-app-surface-delta-inventory-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: {
    oldSurfaceInventory: string;
    p0DirtyBaselineSnapshot: string;
  };
  summary: {
    oldSurfaceInventoryGeneratedAt: string | null;
    oldSurfaceInventoryAppTsxFiles: number;
    oldSurfaceInventorySurfaces: number;
    oldSurfaceInventoryBlockers: number;
    currentAppTsFiles: number;
    currentAppTsxFiles: number;
    currentComponentTsFiles: number;
    currentComponentTsxFiles: number;
    currentTestTsFiles: number;
    currentTestTsxFiles: number;
    appTsxDeltaSinceOldInventory: number;
    currentAppTsxNotInOldInventory: number;
    oldAppTsxMissingFromCurrentTree: number;
    dirtyFilesFromP0: number;
    dirtyAppComponentTestFiles: number;
    classifiedDirtyAppComponentTestFiles: number;
    unclassifiedDirtyAppComponentTestFiles: number;
    dirtyAssetEntries: number;
    collectibleDalliSets: number;
    collectibleDalliFiles: number;
    untrackedCollectibleDalliFiles: number;
    markerSensitiveDirtyFiles: number;
    blockers: number;
    warnings: number;
    readyForP2DomainRegistry: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  markerTotalsForDirtyFiles: MarkerCounts;
  oldInventoryDelta: {
    currentAppTsxNotInOldInventory: SurfaceDeltaRecord[];
    oldAppTsxMissingFromCurrentTree: string[];
  };
  dirtyFileDomainMap: DirtyFileDeltaRecord[];
  collectibleSets: CollectibleSetRecord[];
  raw: {
    gitStatusShort: string[];
    gitDiffNameStatus: string[];
    currentAppTsxFiles: string[];
  };
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    productionApplyApproved: false;
  };
};

const MARKER_ORDER: Array<keyof MarkerCounts> = [
  'AsyncStorage',
  'useStudyTarget',
  'StudyTargetLang',
  'studyTarget',
  'sourceLocale',
  'sourceLocales',
  'useLang',
  'trackEvent',
  'premium',
  'gift',
  'shard',
  'xp',
  'weekly',
  'stats',
  'analytics',
  'SpeakingPanel',
  'router',
  'planContent',
  'dialog',
  'flashcard',
  'collectible',
];

const MARKER_PATTERNS: Array<[keyof MarkerCounts, RegExp]> = [
  ['AsyncStorage', /AsyncStorage\./g],
  ['useStudyTarget', /useStudyTarget\s*\(/g],
  ['StudyTargetLang', /StudyTargetLang|study_target_lang_dev|spanishStudyActive|spanishSurfacesEnabled|spanishLessonUiStringsActive|flashcardContentLang/g],
  ['studyTarget', /\bstudyTarget\b|study_target/g],
  ['sourceLocale', /\bsourceLocale\b/g],
  ['sourceLocales', /\bsourceLocales\b/g],
  ['useLang', /useLang\s*\(/g],
  ['trackEvent', /\btrackEvent\s*\(/g],
  ['premium', /premium|paywall/gi],
  ['gift', /gift|loyalty/gi],
  ['shard', /shard/gi],
  ['xp', /\bXP\b|\bxp\b|experience/gi],
  ['weekly', /weekly/gi],
  ['stats', /stats|insight/gi],
  ['analytics', /analytics|trackEvent/gi],
  ['SpeakingPanel', /SpeakingPanel|speaking/gi],
  ['router', /\brouter\.(push|replace|back|dismiss|dismissTo)|<Link\b|href=/g],
  ['planContent', /PlanDay|planContent|PLAN_|plan_content|personal_plan/gi],
  ['dialog', /scenario|dialog|Dialogs/gi],
  ['flashcard', /flashcard|Victoria/gi],
  ['collectible', /collectible|dalli/gi],
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function execGit(repoRoot: string, args: string[]): string[] {
  try {
    const out = childProcess.execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return out.split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function walkTsFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walkTsFiles(full, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function routeNameFor(sourcePath: string): string | undefined {
  if (!sourcePath.startsWith('app/')) return undefined;
  if (!sourcePath.endsWith('.tsx')) return undefined;
  return sourcePath.replace(/^app\//, '').replace(/\.tsx$/, '');
}

function zeroMarkers(): MarkerCounts {
  return {
    AsyncStorage: 0,
    useStudyTarget: 0,
    StudyTargetLang: 0,
    studyTarget: 0,
    sourceLocale: 0,
    sourceLocales: 0,
    useLang: 0,
    trackEvent: 0,
    premium: 0,
    gift: 0,
    shard: 0,
    xp: 0,
    weekly: 0,
    stats: 0,
    analytics: 0,
    SpeakingPanel: 0,
    router: 0,
    planContent: 0,
    dialog: 0,
    flashcard: 0,
    collectible: 0,
  };
}

function countRegex(text: string, re: RegExp): number {
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

function markerCountsForText(text: string): MarkerCounts {
  const counts = zeroMarkers();
  for (const [name, re] of MARKER_PATTERNS) {
    counts[name] = countRegex(text, re);
  }
  return counts;
}

function addMarkerTotals(target: MarkerCounts, source: MarkerCounts): void {
  for (const key of MARKER_ORDER) target[key] += source[key];
}

function evidenceForText(text: string, maxRows = 8): Evidence[] {
  const evidence: Evidence[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    for (const [marker, re] of MARKER_PATTERNS) {
      re.lastIndex = 0;
      if (re.test(line)) {
        evidence.push({
          line: i + 1,
          marker,
          text: line.trim().slice(0, 180),
        });
        break;
      }
    }
    if (evidence.length >= maxRows) break;
  }
  return evidence;
}

function hasAnyMarker(counts: MarkerCounts, names: Array<keyof MarkerCounts>): boolean {
  return names.some((name) => counts[name] > 0);
}

function classifyDomain(sourcePath: string, text: string, category?: DirtyCategory): {
  primaryDomain: DomainCandidate;
  secondaryDomains: DomainCandidate[];
  reason: string;
} {
  const p = sourcePath.replace(/\\/g, '/');
  const low = p.toLowerCase();
  const counts = markerCountsForText(text);
  const secondary = new Set<DomainCandidate>();

  if (low.startsWith('assets/images/collectibles/dalli')) {
    return {
      primaryDomain: 'collectible_reward_assets',
      secondaryDomains: [],
      reason: 'collectible Dalli asset path',
    };
  }
  if (low.includes('gustav_readiness_gate') || low.includes('gustav_target_key_slice_packet')) {
    return {
      primaryDomain: 'gustav_gate_scripts',
      secondaryDomains: ['target_storage_and_cloud_sync'],
      reason: 'existing GUSTAV readiness/target-key gate script',
    };
  }
  if (low.includes('ai_dialog') || low.includes('dialogstabcontent')) {
    if (hasAnyMarker(counts, ['premium', 'gift', 'xp'])) secondary.add('premium_loyalty_speaking');
    return {
      primaryDomain: 'ai_dialog_scenarios',
      secondaryDomains: Array.from(secondary),
      reason: 'AI dialog scenario or dialog surface path',
    };
  }
  if (low.includes('/flashcards/bundles/') || low.includes('victoriabundleshared')) {
    if (hasAnyMarker(counts, ['sourceLocale', 'sourceLocales'])) secondary.add('source_locale_ui_copy');
    return {
      primaryDomain: 'flashcard_marketplace_bundles',
      secondaryDomains: Array.from(secondary),
      reason: 'flashcard bundle or Victoria shared schema path',
    };
  }
  if (low.includes('plan_content') || low.includes('personal_plan')) {
    if (hasAnyMarker(counts, ['sourceLocale', 'sourceLocales'])) secondary.add('source_locale_ui_copy');
    return {
      primaryDomain: 'personal_plan_content',
      secondaryDomains: Array.from(secondary),
      reason: 'personal plan content/runtime path',
    };
  }
  if (low.includes('weeklyreview') || low.includes('weekly_review')) {
    if (hasAnyMarker(counts, ['AsyncStorage', 'studyTarget'])) secondary.add('target_storage_and_cloud_sync');
    return {
      primaryDomain: 'club_rewards_stats_weekly',
      secondaryDomains: Array.from(secondary),
      reason: 'weekly review path',
    };
  }
  if (low.includes('lesson_data') || low.includes('lesson_teaching')) {
    if (hasAnyMarker(counts, ['sourceLocale', 'sourceLocales', 'StudyTargetLang', 'studyTarget'])) secondary.add('lesson_runtime');
    return {
      primaryDomain: 'lesson_rows',
      secondaryDomains: Array.from(secondary),
      reason: 'lesson row metadata or teaching notes path',
    };
  }
  if (low.includes('lesson1') || low.includes('lesson_')) {
    if (hasAnyMarker(counts, ['StudyTargetLang', 'studyTarget', 'useStudyTarget'])) secondary.add('target_storage_and_cloud_sync');
    return {
      primaryDomain: 'lesson_runtime',
      secondaryDomains: Array.from(secondary),
      reason: 'lesson runtime path',
    };
  }
  if (low.includes('club') || low.includes('stats_insights') || low.includes('weekly_review')) {
    if (hasAnyMarker(counts, ['AsyncStorage', 'studyTarget'])) secondary.add('target_storage_and_cloud_sync');
    if (hasAnyMarker(counts, ['gift', 'shard', 'xp'])) secondary.add('premium_loyalty_speaking');
    return {
      primaryDomain: 'club_rewards_stats_weekly',
      secondaryDomains: Array.from(secondary),
      reason: 'club, stats, or weekly review path',
    };
  }
  if (low.includes('collectible')) {
    if (hasAnyMarker(counts, ['sourceLocale', 'useLang'])) secondary.add('source_locale_ui_copy');
    return {
      primaryDomain: 'collectible_reward_assets',
      secondaryDomains: Array.from(secondary),
      reason: 'collectible UI or asset surface path',
    };
  }
  if (
    low.includes('premium')
    || low.includes('paywall')
    || low.includes('subscription')
    || low.includes('referral')
    || low.includes('fullaccess')
    || low.includes('access_')
  ) {
    if (hasAnyMarker(counts, ['sourceLocale', 'useLang', 'trackEvent', 'analytics'])) secondary.add('source_locale_ui_copy');
    return {
      primaryDomain: 'premium_loyalty_speaking',
      secondaryDomains: Array.from(secondary),
      reason: 'premium, paywall, subscription, or referral path',
    };
  }
  if (low.includes('speaking') || low.includes('voice')) {
    if (hasAnyMarker(counts, ['sourceLocale', 'useLang'])) secondary.add('source_locale_ui_copy');
    return {
      primaryDomain: 'premium_loyalty_speaking',
      secondaryDomains: Array.from(secondary),
      reason: 'speaking or voice path',
    };
  }
  if (low.includes('introfullaccessmodal') || low.includes('loyaltygiftmodal') || low.includes('speakingpanel')) {
    if (hasAnyMarker(counts, ['trackEvent', 'analytics'])) secondary.add('source_locale_ui_copy');
    return {
      primaryDomain: 'premium_loyalty_speaking',
      secondaryDomains: Array.from(secondary),
      reason: 'premium, loyalty, or speaking component path',
    };
  }
  if (low.includes('leaderboard')) {
    if (hasAnyMarker(counts, ['AsyncStorage', 'studyTarget'])) secondary.add('target_storage_and_cloud_sync');
    return {
      primaryDomain: 'club_rewards_stats_weekly',
      secondaryDomains: Array.from(secondary),
      reason: 'leaderboard surface path',
    };
  }
  if (low.includes('admin') || low.includes('_admin') || low.includes('_lab') || low.includes('lab.tsx') || low.includes('dev_module_stub')) {
    return {
      primaryDomain: 'source_locale_ui_copy',
      secondaryDomains: [],
      reason: 'admin/lab/dev surface fallback',
    };
  }
  if (low.includes('anim_demo')) {
    return {
      primaryDomain: 'source_locale_ui_copy',
      secondaryDomains: [],
      reason: 'animation demo surface fallback',
    };
  }
  if (low.includes('cloud') || low.includes('sync') || low.includes('target_storage') || low.includes('study_target')) {
    return {
      primaryDomain: 'target_storage_and_cloud_sync',
      secondaryDomains: [],
      reason: 'target storage or cloud sync path',
    };
  }

  if (hasAnyMarker(counts, ['AsyncStorage', 'useStudyTarget', 'StudyTargetLang', 'studyTarget'])) {
    return {
      primaryDomain: 'target_storage_and_cloud_sync',
      secondaryDomains: [],
      reason: 'target/storage marker fallback',
    };
  }
  if (hasAnyMarker(counts, ['sourceLocale', 'sourceLocales', 'useLang'])) {
    return {
      primaryDomain: 'source_locale_ui_copy',
      secondaryDomains: [],
      reason: 'source locale marker fallback',
    };
  }
  if (category === 'test' && low.includes('test')) {
    return {
      primaryDomain: 'source_locale_ui_copy',
      secondaryDomains: [],
      reason: 'test file fallback with no stronger domain marker',
    };
  }

  return {
    primaryDomain: 'unclassified',
    secondaryDomains: [],
    reason: 'no path or marker rule matched',
  };
}

function isLikelyUserFacingAppTsx(sourcePath: string): boolean {
  if (!sourcePath.startsWith('app/') || !sourcePath.endsWith('.tsx')) return false;
  const low = sourcePath.toLowerCase();
  if (low.includes('_admin') || low.includes('admin_') || low.includes('settings_testers')) return false;
  if (low.includes('/community_packs/')) return false;
  if (low.includes('/flashcards/bundles/')) return false;
  return true;
}

function buildSurfaceDeltaRecord(input: {
  repoRoot: string;
  sourcePath: string;
  oldAppTsxSet: Set<string>;
  dirtyPathSet: Set<string>;
}): SurfaceDeltaRecord {
  const full = path.join(input.repoRoot, input.sourcePath);
  const text = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  const classified = classifyDomain(input.sourcePath, text);
  return {
    path: input.sourcePath,
    routeName: routeNameFor(input.sourcePath),
    primaryDomain: classified.primaryDomain,
    markerCounts: markerCountsForText(text),
    dirtyInP0: input.dirtyPathSet.has(input.sourcePath),
    existedInOldInventory: input.oldAppTsxSet.has(input.sourcePath),
    likelyUserFacing: isLikelyUserFacingAppTsx(input.sourcePath),
    evidence: evidenceForText(text, 5),
  };
}

function buildDirtyRecord(repoRoot: string, dirty: NonNullable<P0DirtySnapshot['dirtyFiles']>[number]): DirtyFileDeltaRecord {
  const full = path.join(repoRoot, dirty.path);
  const fileExists = fs.existsSync(full);
  const text = fileExists && fs.statSync(full).isFile() ? fs.readFileSync(full, 'utf8') : dirty.path;
  const markerCounts = markerCountsForText(text);
  const classified = classifyDomain(dirty.path, text, dirty.category);
  return {
    path: dirty.path,
    gitStatus: dirty.gitStatus,
    category: dirty.category,
    tracked: dirty.tracked,
    fileExists,
    addedLines: dirty.addedLines,
    deletedLines: dirty.deletedLines,
    primaryDomain: classified.primaryDomain,
    secondaryDomains: classified.secondaryDomains,
    classificationReason: classified.reason,
    markerCounts,
    evidence: evidenceForText(text, 6),
  };
}

function buildCollectibleSets(repoRoot: string, p0: P0DirtySnapshot): CollectibleSetRecord[] {
  const root = path.join(repoRoot, 'assets', 'images', 'collectibles', 'dalli');
  if (!fs.existsSync(root)) return [];

  const untrackedFiles = new Set(
    execGit(repoRoot, ['ls-files', '--others', '--exclude-standard', '--', 'assets/images/collectibles/dalli'])
      .map((file) => file.replace(/\\/g, '/')),
  );
  const p0DirtySetPaths = new Set(
    (p0.dirtyFiles ?? [])
      .filter((file) => file.category === 'asset')
      .map((file) => file.path.replace(/\\/g, '/').replace(/\/$/, '')),
  );

  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const setPath = path.join(root, entry.name);
      const relPath = rel(repoRoot, setPath);
      const files = fs.readdirSync(setPath, { withFileTypes: true }).filter((item) => item.isFile()).length;
      const untracked = Array.from(untrackedFiles).filter((file) => file.startsWith(`${relPath}/`)).length;
      return {
        setName: entry.name,
        path: relPath,
        files,
        untrackedFiles: untracked,
        newInDirtyBaseline: untracked > 0 || p0DirtySetPaths.has(relPath),
      };
    })
    .sort((a, b) => a.setName.localeCompare(b.setName));
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Current App Surface Delta Inventory',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Old surface inventory generated at: ${report.summary.oldSurfaceInventoryGeneratedAt ?? 'unknown'}`,
    `- Old app TSX files: ${report.summary.oldSurfaceInventoryAppTsxFiles}`,
    `- Current app TS files: ${report.summary.currentAppTsFiles}`,
    `- Current app TSX files: ${report.summary.currentAppTsxFiles}`,
    `- App TSX delta since old inventory: ${report.summary.appTsxDeltaSinceOldInventory}`,
    `- Current app TSX not in old inventory: ${report.summary.currentAppTsxNotInOldInventory}`,
    `- Old app TSX missing from current tree: ${report.summary.oldAppTsxMissingFromCurrentTree}`,
    `- Current component TS files: ${report.summary.currentComponentTsFiles}`,
    `- Current component TSX files: ${report.summary.currentComponentTsxFiles}`,
    `- Current test TS files: ${report.summary.currentTestTsFiles}`,
    `- Dirty files from P0: ${report.summary.dirtyFilesFromP0}`,
    `- Dirty app/component/test files: ${report.summary.dirtyAppComponentTestFiles}`,
    `- Classified dirty app/component/test files: ${report.summary.classifiedDirtyAppComponentTestFiles}`,
    `- Unclassified dirty app/component/test files: ${report.summary.unclassifiedDirtyAppComponentTestFiles}`,
    `- Dalli collectible sets: ${report.summary.collectibleDalliSets}`,
    `- Dalli collectible files: ${report.summary.collectibleDalliFiles}`,
    `- Untracked Dalli collectible files: ${report.summary.untrackedCollectibleDalliFiles}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for P2 domain registry: ${report.summary.readyForP2DomainRegistry ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Dirty File Domain Map',
    '',
  ];

  for (const record of report.dirtyFileDomainMap) {
    const secondary = record.secondaryDomains.length > 0 ? `; secondary=${record.secondaryDomains.join(',')}` : '';
    lines.push(`- \`${record.gitStatus}\` \`${record.path}\` -> \`${record.primaryDomain}\`${secondary} (${record.classificationReason})`);
  }

  lines.push('', '## New Current App TSX Files Not In Old Inventory', '');
  if (report.oldInventoryDelta.currentAppTsxNotInOldInventory.length === 0) {
    lines.push('No new app TSX files detected.');
  } else {
    for (const record of report.oldInventoryDelta.currentAppTsxNotInOldInventory.slice(0, 80)) {
      const dirty = record.dirtyInP0 ? ', dirty-in-P0' : '';
      lines.push(`- \`${record.path}\` -> \`${record.primaryDomain}\`${dirty}`);
    }
    if (report.oldInventoryDelta.currentAppTsxNotInOldInventory.length > 80) {
      lines.push(`- ... ${report.oldInventoryDelta.currentAppTsxNotInOldInventory.length - 80} more`);
    }
  }

  lines.push('', '## Collectible Sets', '');
  for (const set of report.collectibleSets) {
    const state = set.newInDirtyBaseline ? ', new/dirty baseline' : '';
    lines.push(`- \`${set.setName}\`: files ${set.files}, untracked ${set.untrackedFiles}${state}`);
  }

  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) {
      const where = finding.path ? ` \`${finding.path}\`` : '';
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`${where}: ${finding.message}`);
    }
  }

  lines.push(
    '',
    '## Safety',
    '',
    '- This scanner is read-only.',
    '- It does not modify production app files.',
    '- It does not modify generated French ledgers.',
    '- It does not write reviewer decisions.',
    '- It does not approve production app apply.',
    '',
  );

  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_current_app_surface_delta_inventory.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const oldInventoryPath = path.join(auditsDir, 'surface_route_inventory.json');
  const p0Path = path.join(auditsDir, 'current_app_dirty_baseline_snapshot.json');
  const findings: Finding[] = [];

  if (!fs.existsSync(oldInventoryPath)) {
    findings.push({
      severity: 'blocker',
      code: 'missing_old_surface_inventory',
      message: 'P1 requires the old surface route inventory JSON.',
      path: rel(repoRoot, oldInventoryPath),
    });
  }
  if (!fs.existsSync(p0Path)) {
    findings.push({
      severity: 'blocker',
      code: 'missing_p0_dirty_baseline',
      message: 'P1 requires the P0 dirty baseline snapshot JSON.',
      path: rel(repoRoot, p0Path),
    });
  }
  if (findings.some((finding) => finding.severity === 'blocker')) {
    console.error(findings.map((finding) => `${finding.code}: ${finding.message}`).join('\n'));
    process.exit(1);
  }

  const oldInventory = readJson<OldSurfaceInventory>(oldInventoryPath);
  const p0 = readJson<P0DirtySnapshot>(p0Path);

  if (p0.status !== 'PASS' || !p0.summary?.readyForP1SurfaceDeltaScanner) {
    findings.push({
      severity: 'blocker',
      code: 'p0_not_ready_for_p1',
      message: 'P0 snapshot is not marked ready for P1.',
      path: rel(repoRoot, p0Path),
    });
  }

  const appFiles = walkTsFiles(path.join(repoRoot, 'app')).map((file) => rel(repoRoot, file)).sort();
  const componentFiles = walkTsFiles(path.join(repoRoot, 'components')).map((file) => rel(repoRoot, file)).sort();
  const testFiles = walkTsFiles(path.join(repoRoot, 'tests')).map((file) => rel(repoRoot, file)).sort();
  const appTsxFiles = appFiles.filter((file) => file.endsWith('.tsx'));
  const componentTsxFiles = componentFiles.filter((file) => file.endsWith('.tsx'));
  const testTsxFiles = testFiles.filter((file) => file.endsWith('.tsx'));
  const oldAppTsxSet = new Set(
    (oldInventory.surfaces ?? [])
      .map((surface) => surface.sourcePath ?? '')
      .filter((file) => file.startsWith('app/') && file.endsWith('.tsx')),
  );
  const currentAppTsxSet = new Set(appTsxFiles);
  const dirtyPathSet = new Set((p0.dirtyFiles ?? []).map((dirty) => dirty.path.replace(/\\/g, '/')));

  const currentAppTsxNotInOldInventory = appTsxFiles
    .filter((file) => !oldAppTsxSet.has(file))
    .map((file) => buildSurfaceDeltaRecord({
      repoRoot,
      sourcePath: file,
      oldAppTsxSet,
      dirtyPathSet,
    }));
  const oldAppTsxMissingFromCurrentTree = Array.from(oldAppTsxSet)
    .filter((file) => !currentAppTsxSet.has(file))
    .sort();

  const dirtyFileDomainMap = (p0.dirtyFiles ?? []).map((dirty) => buildDirtyRecord(repoRoot, dirty));
  const dirtyAppComponentTest = dirtyFileDomainMap.filter((record) => (
    record.category === 'app' || record.category === 'component' || record.category === 'test'
  ));
  const unclassifiedDirty = dirtyAppComponentTest.filter((record) => record.primaryDomain === 'unclassified');
  for (const record of unclassifiedDirty) {
    findings.push({
      severity: 'blocker',
      code: 'unclassified_dirty_app_surface',
      message: 'Dirty app/component/test file has no P1 domain candidate.',
      path: record.path,
    });
  }

  if ((oldInventory.summary?.appTsxFiles ?? 0) !== appTsxFiles.length) {
    findings.push({
      severity: 'warning',
      code: 'old_surface_inventory_stale',
      message: `Old inventory app TSX count ${oldInventory.summary?.appTsxFiles ?? 0} differs from current count ${appTsxFiles.length}.`,
    });
  }
  if (currentAppTsxNotInOldInventory.length > 0) {
    findings.push({
      severity: 'warning',
      code: 'new_app_tsx_surfaces_since_old_inventory',
      message: `${currentAppTsxNotInOldInventory.length} current app TSX files were not present in the old surface inventory.`,
    });
  }
  if (oldAppTsxMissingFromCurrentTree.length > 0) {
    findings.push({
      severity: 'warning',
      code: 'old_app_tsx_missing_from_current_tree',
      message: `${oldAppTsxMissingFromCurrentTree.length} old inventory app TSX files are missing from the current tree.`,
    });
  }

  const collectibleSets = buildCollectibleSets(repoRoot, p0);
  const markerTotalsForDirtyFiles = zeroMarkers();
  for (const record of dirtyFileDomainMap) addMarkerTotals(markerTotalsForDirtyFiles, record.markerCounts);

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';
  const report: Report = {
    schemaVersion: 'gustav-current-app-surface-delta-inventory-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      oldSurfaceInventory: rel(repoRoot, oldInventoryPath),
      p0DirtyBaselineSnapshot: rel(repoRoot, p0Path),
    },
    summary: {
      oldSurfaceInventoryGeneratedAt: oldInventory.generatedAt ?? null,
      oldSurfaceInventoryAppTsxFiles: oldInventory.summary?.appTsxFiles ?? 0,
      oldSurfaceInventorySurfaces: oldInventory.summary?.surfaces ?? 0,
      oldSurfaceInventoryBlockers: oldInventory.summary?.blockers ?? 0,
      currentAppTsFiles: appFiles.length,
      currentAppTsxFiles: appTsxFiles.length,
      currentComponentTsFiles: componentFiles.length,
      currentComponentTsxFiles: componentTsxFiles.length,
      currentTestTsFiles: testFiles.length,
      currentTestTsxFiles: testTsxFiles.length,
      appTsxDeltaSinceOldInventory: appTsxFiles.length - (oldInventory.summary?.appTsxFiles ?? 0),
      currentAppTsxNotInOldInventory: currentAppTsxNotInOldInventory.length,
      oldAppTsxMissingFromCurrentTree: oldAppTsxMissingFromCurrentTree.length,
      dirtyFilesFromP0: dirtyFileDomainMap.length,
      dirtyAppComponentTestFiles: dirtyAppComponentTest.length,
      classifiedDirtyAppComponentTestFiles: dirtyAppComponentTest.length - unclassifiedDirty.length,
      unclassifiedDirtyAppComponentTestFiles: unclassifiedDirty.length,
      dirtyAssetEntries: dirtyFileDomainMap.filter((record) => record.category === 'asset').length,
      collectibleDalliSets: collectibleSets.length,
      collectibleDalliFiles: collectibleSets.reduce((sum, set) => sum + set.files, 0),
      untrackedCollectibleDalliFiles: collectibleSets.reduce((sum, set) => sum + set.untrackedFiles, 0),
      markerSensitiveDirtyFiles: dirtyFileDomainMap.filter((record) => (
        hasAnyMarker(record.markerCounts, [
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
          'analytics',
          'SpeakingPanel',
          'router',
        ])
      )).length,
      blockers,
      warnings,
      readyForP2DomainRegistry: blockers === 0,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    markerTotalsForDirtyFiles,
    oldInventoryDelta: {
      currentAppTsxNotInOldInventory,
      oldAppTsxMissingFromCurrentTree,
    },
    dirtyFileDomainMap,
    collectibleSets,
    raw: {
      gitStatusShort: execGit(repoRoot, [
        'status',
        '--short',
        '--',
        'app',
        'components',
        'tests',
        'scripts/gustav_readiness_gate.ts',
        'scripts/gustav_target_key_slice_packet.ts',
        'assets/images/collectibles/dalli',
      ]),
      gitDiffNameStatus: execGit(repoRoot, [
        'diff',
        '--name-status',
        '--',
        'app',
        'components',
        'tests',
        'scripts/gustav_readiness_gate.ts',
        'scripts/gustav_target_key_slice_packet.ts',
      ]),
      currentAppTsxFiles: appTsxFiles,
    },
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      productionApplyApproved: false,
    },
  };

  const outJson = path.join(auditsDir, 'current_app_surface_delta_inventory.json');
  const outMd = path.join(auditsDir, 'current_app_surface_delta_inventory.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV current app surface delta inventory: ${report.status}`);
  console.log(`Old app TSX files: ${report.summary.oldSurfaceInventoryAppTsxFiles}`);
  console.log(`Current app TSX files: ${report.summary.currentAppTsxFiles}`);
  console.log(`New current app TSX not in old inventory: ${report.summary.currentAppTsxNotInOldInventory}`);
  console.log(`Dirty app/component/test classified: ${report.summary.classifiedDirtyAppComponentTestFiles}/${report.summary.dirtyAppComponentTestFiles}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Ready for P2 domain registry: ${report.summary.readyForP2DomainRegistry ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status !== 'PASS') process.exit(1);
}

void main();
