import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Risk = 'low' | 'medium' | 'high' | 'blocker';
type SurfaceKind =
  | 'root_shell'
  | 'tab'
  | 'registered_stack'
  | 'route_like'
  | 'admin'
  | 'component'
  | 'hook'
  | 'service';

type SurfaceDomain =
  | 'app_shell'
  | 'home_dashboard'
  | 'lesson_list'
  | 'lesson_menu'
  | 'lesson_runtime'
  | 'lesson_completion'
  | 'lesson_support'
  | 'quiz'
  | 'mistake_practice'
  | 'personal_practice'
  | 'flashcards'
  | 'achievements'
  | 'progress_stats'
  | 'cloud_sync'
  | 'settings_source_locale'
  | 'social_arena'
  | 'commerce_rewards'
  | 'admin_qa'
  | 'other';

type StorageRecord = {
  key?: string;
  keyPattern?: string;
  sourcePath: string;
  line: number;
  operation: string;
  targetNamespaceRequired?: boolean;
  scope?: string;
  risk?: Risk;
};

type StorageInventory = {
  records?: StorageRecord[];
};

type SurfaceEvidence = {
  line: number;
  marker: string;
  text: string;
};

type SurfaceEntry = {
  id: string;
  sourcePath: string;
  routeName?: string;
  kind: SurfaceKind;
  domain: SurfaceDomain;
  userFacing: boolean;
  status: Status;
  risk: Risk;
  markers: {
    usesStudyTargetContext: boolean;
    usesDevStudyTargetLang: boolean;
    usesSourceLocale: boolean;
    usesCloudSync: boolean;
    directAsyncStorageOps: number;
    routerTouches: number;
  };
  targetStorage: {
    records: number;
    uniqueKeys: number;
    keys: string[];
  };
  blockers: string[];
  requiredBeforeFrench: string[];
  tests: string[];
  evidence: SurfaceEvidence[];
};

type Report = {
  schemaVersion: 'gustav-surface-route-inventory-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    surfaces: number;
    appTsxFiles: number;
    stackScreens: number;
    tabScreens: number;
    targetSensitiveSurfaces: number;
    userFacingTargetSurfaces: number;
    devStudyTargetSurfaces: number;
    directStorageSurfaces: number;
    blockerSurfaces: number;
    blockers: number;
    routeLikeWithoutStackRegistration: number;
    stackScreensWithoutFile: number;
  };
  routeCoverage: {
    stackScreens: string[];
    tabScreens: string[];
    routeLikeWithoutStackRegistration: string[];
    stackScreensWithoutFile: string[];
    notes: string[];
  };
  surfaces: SurfaceEntry[];
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

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function stableRecordKey(record: { key?: string; keyPattern?: string }): string {
  return record.key ?? record.keyPattern ?? '';
}

function countRegex(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}

function lineForIndex(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function evidenceFor(text: string, patterns: Array<[string, RegExp]>): SurfaceEvidence[] {
  const rows: SurfaceEvidence[] = [];
  const lines = text.split(/\r?\n/);
  for (const [marker, re] of patterns) {
    for (let i = 0; i < lines.length; i += 1) {
      if (re.test(lines[i] ?? '')) {
        rows.push({
          line: i + 1,
          marker,
          text: (lines[i] ?? '').trim().slice(0, 180),
        });
        if (rows.length >= 10) return rows;
      }
    }
  }
  return rows;
}

function routeNameFor(sourcePath: string): string | undefined {
  if (!sourcePath.startsWith('app/')) return undefined;
  if (!sourcePath.endsWith('.tsx')) return undefined;
  const noExt = sourcePath.replace(/^app\//, '').replace(/\.tsx$/, '');
  if (noExt === '_layout' || noExt.endsWith('/_layout')) return noExt;
  if (noExt.startsWith('_')) return noExt;
  return noExt;
}

function extractStackScreens(layoutText: string): string[] {
  const screens = new Set<string>();
  const re = /<Stack\.Screen\s+name=["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(layoutText))) {
    screens.add(match[1] ?? '');
  }
  return Array.from(screens).filter(Boolean).sort();
}

function extractTabScreens(tabsLayoutText: string): string[] {
  const routes = new Set<string>();
  const re = /['"]\/\(tabs\)\/([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(tabsLayoutText))) {
    routes.add(`(tabs)/${match[1]}`);
  }
  for (const fallback of ['(tabs)/home', '(tabs)/lessons', '(tabs)/arena', '(tabs)/friends', '(tabs)/settings']) {
    routes.add(fallback);
  }
  return Array.from(routes).sort();
}

function kindFor(sourcePath: string, routeName: string | undefined, stackScreens: Set<string>, tabScreens: Set<string>): SurfaceKind {
  if (sourcePath === 'app/_layout.tsx' || sourcePath === 'app/(tabs)/_layout.tsx') return 'root_shell';
  if (sourcePath.includes('_admin') || sourcePath.includes('admin_') || sourcePath.includes('settings_testers')) return 'admin';
  if (routeName && tabScreens.has(routeName)) return 'tab';
  if (routeName && stackScreens.has(routeName)) return 'registered_stack';
  if (sourcePath.startsWith('app/') && sourcePath.endsWith('.tsx')) return 'route_like';
  if (sourcePath.startsWith('components/')) return 'component';
  if (sourcePath.startsWith('hooks/')) return 'hook';
  return 'service';
}

function domainFor(sourcePath: string, targetKeys: string[]): SurfaceDomain {
  const file = sourcePath.toLowerCase();
  const keys = targetKeys.join(' ').toLowerCase();
  if (file.includes('_layout') || file.includes('tabcontext') || file.includes('tabslider')) return 'app_shell';
  if (file.includes('cloud_sync') || file.includes('auth_provider')) return 'cloud_sync';
  if (file.includes('/home') || file.endsWith('app/index.tsx')) return 'home_dashboard';
  if (file.includes('/lessons') || file.includes('lesson_lock') || file.includes('lessons_tab_state')) return 'lesson_list';
  if (file.includes('lesson_menu')) return 'lesson_menu';
  if (file.includes('lesson1') || file.includes('lesson_words') || file.includes('lesson_irregular') || file.includes('preposition_drill')) return 'lesson_runtime';
  if (file.includes('lesson_complete')) return 'lesson_completion';
  if (file.includes('lesson_help') || file.includes('hint')) return 'lesson_support';
  if (file.includes('achievement')) return 'achievements';
  if (file.includes('quiz') || keys.includes('quiz_')) return 'quiz';
  if (file.includes('mistake_practice')) return 'mistake_practice';
  if (file.includes('diagnostic') || file.includes('diagnosis') || file.includes('problem_coach')) return 'personal_practice';
  if (file.includes('flashcard') || keys.includes('flashcard')) return 'flashcards';
  if (file.includes('progress_map') || file.includes('stats') || file.includes('analytics') || keys.includes('daily_stats')) return 'progress_stats';
  if (file.includes('settings') || file.includes('langcontext') || file.includes('source_locale')) return 'settings_source_locale';
  if (file.includes('arena') || file.includes('friend') || file.includes('league') || file.includes('club')) return 'social_arena';
  if (file.includes('premium') || file.includes('gift') || file.includes('shards') || file.includes('paywall')) return 'commerce_rewards';
  if (file.includes('admin') || file.includes('tester')) return 'admin_qa';
  return 'other';
}

function isUserFacing(kind: SurfaceKind, sourcePath: string): boolean {
  if (kind === 'admin' || kind === 'service' || kind === 'hook') return false;
  if (sourcePath.includes('/community_packs/')) return false;
  if (sourcePath.includes('/flashcards/bundles/')) return false;
  return kind === 'root_shell' || kind === 'tab' || kind === 'registered_stack' || kind === 'route_like' || kind === 'component';
}

function buildEntry(input: {
  repoRoot: string;
  sourcePath: string;
  text: string;
  records: StorageRecord[];
  stackScreens: Set<string>;
  tabScreens: Set<string>;
}): SurfaceEntry {
  const routeName = routeNameFor(input.sourcePath);
  const kind = kindFor(input.sourcePath, routeName, input.stackScreens, input.tabScreens);
  const targetRecords = input.records.filter((record) => record.targetNamespaceRequired);
  const keys = Array.from(new Set(targetRecords.map(stableRecordKey).filter(Boolean))).sort();
  const domain = domainFor(input.sourcePath, keys);
  const directAsyncStorageOps = countRegex(input.text, /AsyncStorage\.(getItem|setItem|removeItem|multiGet|multiSet|multiRemove|clear)\b/g);
  const markers = {
    usesStudyTargetContext: /useStudyTarget\s*\(/.test(input.text),
    usesDevStudyTargetLang: /StudyTargetLang|study_target_lang_dev|spanishStudyActive|spanishSurfacesEnabled|spanishLessonUiStringsActive|flashcardContentLang/.test(input.text),
    usesSourceLocale: /sourceLocale|sourceLocales|useLang\s*\(|app_lang|\bLang\b/.test(input.text),
    usesCloudSync: /cloud_sync|syncToCloud|restoreFromCloud|SYNC_KEYS|ensureStableAuthLink/.test(input.text),
    directAsyncStorageOps,
    routerTouches: countRegex(input.text, /\brouter\.(push|replace|back|dismiss|dismissTo)|<Link\b|href=/g),
  };
  const userFacing = isUserFacing(kind, input.sourcePath);
  const blockers: string[] = [];

  if (targetRecords.length > 0) {
    blockers.push('Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.');
  }
  if (userFacing && targetRecords.length > 0 && !markers.usesStudyTargetContext) {
    blockers.push('User-facing surface can display target-sensitive state without explicit production studyTarget context.');
  }
  if (markers.usesDevStudyTargetLang) {
    blockers.push('Surface touches dev StudyTargetLang or Spanish content gates; production French must not inherit this path.');
  }
  if (domain === 'mistake_practice' || domain === 'personal_practice') {
    if (targetRecords.length > 0 || /diagnostic|diagnosis|mistake_practice/.test(input.text)) {
      blockers.push('Practice surface needs target-prefixed diagnosis/practice ids and sourceLocale-separated feedback.');
    }
  }
  if (domain === 'cloud_sync' && markers.usesCloudSync) {
    blockers.push('Cloud/auth shell must restore and sync selected studyTarget buckets only.');
  }
  if (kind === 'route_like' && userFacing && targetRecords.length > 0) {
    blockers.push('Route-like file has target-sensitive state but is not registered in the root Stack inventory.');
  }

  const risk: Risk = blockers.length > 0
    ? 'blocker'
    : targetRecords.length > 0
      ? 'high'
      : userFacing && (domain === 'lesson_runtime' || domain === 'quiz' || domain === 'mistake_practice' || domain === 'flashcards')
        ? 'high'
        : markers.directAsyncStorageOps > 0
          ? 'medium'
          : 'low';
  const status: Status = risk === 'blocker' ? 'HOLD' : 'PASS';

  const requiredBeforeFrench = new Set<string>();
  if (targetRecords.length > 0) {
    requiredBeforeFrench.add('Replace raw target-sensitive storage access with production target-aware store APIs.');
    requiredBeforeFrench.add('Map legacy English state to en only and prove fr has no legacy fallback.');
  }
  if (userFacing) {
    requiredBeforeFrench.add('Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.');
  }
  if (markers.usesDevStudyTargetLang) {
    requiredBeforeFrench.add('Remove, rename or isolate dev StudyTargetLang before enabling French production target.');
  }
  if (domain === 'mistake_practice' || domain === 'personal_practice') {
    requiredBeforeFrench.add('Prefix practice/diagnosis ids with studyTarget and keep localized feedback under sourceLocale.');
  }
  if (domain === 'cloud_sync') {
    requiredBeforeFrench.add('Add target-aware cloud restore/merge tests for en and fr buckets.');
  }
  if (requiredBeforeFrench.size === 0) {
    requiredBeforeFrench.add('No French-specific route gate required unless this surface receives target content later.');
  }

  const tests = new Set<string>();
  if (targetRecords.length > 0) tests.add(`${input.sourcePath}: en progress and fr progress render independently.`);
  if (userFacing) tests.add(`${input.sourcePath}: sourceLocale switch changes copy only, not studyTarget state.`);
  if (domain === 'mistake_practice' || domain === 'personal_practice') tests.add(`${input.sourcePath}: French Mistake Practice never reads English mistake state.`);
  if (domain === 'cloud_sync') tests.add(`${input.sourcePath}: cloud restore does not hydrate fr from legacy English payload.`);
  if (tests.size === 0) tests.add(`${input.sourcePath}: covered by global route smoke test.`);

  return {
    id: input.sourcePath.replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, ''),
    sourcePath: input.sourcePath,
    routeName,
    kind,
    domain,
    userFacing,
    status,
    risk,
    markers,
    targetStorage: {
      records: targetRecords.length,
      uniqueKeys: keys.length,
      keys: keys.slice(0, 20),
    },
    blockers,
    requiredBeforeFrench: Array.from(requiredBeforeFrench),
    tests: Array.from(tests),
    evidence: evidenceFor(input.text, [
      ['studyTarget', /useStudyTarget|StudyTargetLang|spanishStudyActive|spanishSurfacesEnabled/],
      ['sourceLocale', /sourceLocale|sourceLocales|useLang|app_lang/],
      ['storage', /AsyncStorage\.(getItem|setItem|removeItem|multiGet|multiSet|multiRemove|clear)/],
      ['router', /\brouter\.(push|replace|back|dismiss|dismissTo)|<Link\b|href=/],
    ]),
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Surface Route Inventory',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Surfaces: ${report.summary.surfaces}`,
    `- App TSX files: ${report.summary.appTsxFiles}`,
    `- Stack screens: ${report.summary.stackScreens}`,
    `- Tab screens: ${report.summary.tabScreens}`,
    `- Target-sensitive surfaces: ${report.summary.targetSensitiveSurfaces}`,
    `- User-facing target surfaces: ${report.summary.userFacingTargetSurfaces}`,
    `- Dev StudyTarget surfaces: ${report.summary.devStudyTargetSurfaces}`,
    `- Direct storage surfaces: ${report.summary.directStorageSurfaces}`,
    `- Blocker surfaces: ${report.summary.blockerSurfaces}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Route-like without Stack registration: ${report.summary.routeLikeWithoutStackRegistration}`,
    `- Stack screens without file: ${report.summary.stackScreensWithoutFile}`,
    '',
    '## Route Coverage',
    '',
    'Stack screens:',
  ];
  for (const screen of report.routeCoverage.stackScreens) lines.push(`- \`${screen}\``);
  lines.push('', 'Tab screens:');
  for (const screen of report.routeCoverage.tabScreens) lines.push(`- \`${screen}\``);
  if (report.routeCoverage.routeLikeWithoutStackRegistration.length > 0) {
    lines.push('', 'Route-like TSX files without Stack registration:');
    for (const screen of report.routeCoverage.routeLikeWithoutStackRegistration.slice(0, 40)) lines.push(`- \`${screen}\``);
  }
  if (report.routeCoverage.stackScreensWithoutFile.length > 0) {
    lines.push('', 'Stack screens without matching app file:');
    for (const screen of report.routeCoverage.stackScreensWithoutFile) lines.push(`- \`${screen}\``);
  }
  lines.push('', '## Blocker Surfaces', '');
  for (const surface of report.surfaces.filter((entry) => entry.blockers.length > 0).slice(0, 60)) {
    lines.push(`### ${surface.sourcePath}`);
    lines.push('');
    lines.push(`Kind: \`${surface.kind}\``);
    lines.push(`Domain: \`${surface.domain}\``);
    lines.push(`Risk: \`${surface.risk}\``);
    lines.push(`Target storage records: ${surface.targetStorage.records}`);
    if (surface.targetStorage.keys.length > 0) {
      lines.push(`Keys: ${surface.targetStorage.keys.map((key) => `\`${key}\``).join(', ')}`);
    }
    lines.push('');
    lines.push('Blockers:');
    for (const blocker of surface.blockers) lines.push(`- ${blocker}`);
    lines.push('');
    lines.push('Required before French:');
    for (const item of surface.requiredBeforeFrench) lines.push(`- ${item}`);
    lines.push('');
  }
  lines.push('## Notes', '');
  for (const note of report.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_surface_route_inventory.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const storage = readJson<StorageInventory>(path.join(runDir, 'inputs', 'storage_key_inventory.json'));
  const records = storage.records ?? [];
  const byFile = new Map<string, StorageRecord[]>();
  for (const record of records) {
    const arr = byFile.get(record.sourcePath) ?? [];
    arr.push(record);
    byFile.set(record.sourcePath, arr);
  }

  const layoutPath = path.join(repoRoot, 'app', '_layout.tsx');
  const tabsLayoutPath = path.join(repoRoot, 'app', '(tabs)', '_layout.tsx');
  const layoutText = fs.existsSync(layoutPath) ? fs.readFileSync(layoutPath, 'utf8') : '';
  const tabsLayoutText = fs.existsSync(tabsLayoutPath) ? fs.readFileSync(tabsLayoutPath, 'utf8') : '';
  const stackScreens = extractStackScreens(layoutText);
  const tabScreens = extractTabScreens(tabsLayoutText);
  const stackScreenSet = new Set(stackScreens);
  const tabScreenSet = new Set(tabScreens);

  const appFiles = walk(path.join(repoRoot, 'app')).map((file) => rel(repoRoot, file));
  const appTsxFiles = appFiles.filter((file) => file.endsWith('.tsx'));
  const candidateFiles = new Set<string>();
  for (const file of appTsxFiles) candidateFiles.add(file);
  for (const [file, fileRecords] of byFile.entries()) {
    if (fileRecords.some((record) => record.targetNamespaceRequired)) candidateFiles.add(file);
  }
  for (const critical of [
    'components/StudyTargetContext.tsx',
    'components/LangContext.tsx',
    'hooks/use-flashcards.ts',
  ]) {
    if (fs.existsSync(path.join(repoRoot, critical))) candidateFiles.add(critical);
  }

  const surfaces = Array.from(candidateFiles)
    .filter((file) => fs.existsSync(path.join(repoRoot, file)))
    .map((file) => buildEntry({
      repoRoot,
      sourcePath: file,
      text: fs.readFileSync(path.join(repoRoot, file), 'utf8'),
      records: byFile.get(file) ?? [],
      stackScreens: stackScreenSet,
      tabScreens: tabScreenSet,
    }))
    .sort((a, b) => {
      const riskRank: Record<Risk, number> = { blocker: 0, high: 1, medium: 2, low: 3 };
      return riskRank[a.risk] - riskRank[b.risk]
        || b.targetStorage.records - a.targetStorage.records
        || a.sourcePath.localeCompare(b.sourcePath);
    });

  const routeLikeWithoutStackRegistration = surfaces
    .filter((surface) => surface.kind === 'route_like' && surface.routeName && !surface.routeName.includes('/'))
    .map((surface) => surface.routeName as string)
    .sort();
  const routeFileByName = new Set(
    appTsxFiles
      .map(routeNameFor)
      .filter((name): name is string => Boolean(name)),
  );
  const stackScreensWithoutFile = stackScreens
    .filter((screen) => screen !== '(tabs)' && !routeFileByName.has(screen))
    .sort();

  const blockerSurfaces = surfaces.filter((surface) => surface.blockers.length > 0);
  const blockers = blockerSurfaces.reduce((sum, surface) => sum + surface.blockers.length, 0);
  const report: Report = {
    schemaVersion: 'gustav-surface-route-inventory-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      surfaces: surfaces.length,
      appTsxFiles: appTsxFiles.length,
      stackScreens: stackScreens.length,
      tabScreens: tabScreens.length,
      targetSensitiveSurfaces: surfaces.filter((surface) => surface.targetStorage.records > 0).length,
      userFacingTargetSurfaces: surfaces.filter((surface) => surface.userFacing && surface.targetStorage.records > 0).length,
      devStudyTargetSurfaces: surfaces.filter((surface) => surface.markers.usesDevStudyTargetLang).length,
      directStorageSurfaces: surfaces.filter((surface) => surface.markers.directAsyncStorageOps > 0).length,
      blockerSurfaces: blockerSurfaces.length,
      blockers,
      routeLikeWithoutStackRegistration: routeLikeWithoutStackRegistration.length,
      stackScreensWithoutFile: stackScreensWithoutFile.length,
    },
    routeCoverage: {
      stackScreens,
      tabScreens,
      routeLikeWithoutStackRegistration,
      stackScreensWithoutFile,
      notes: [
        'Route-like files are TSX files directly under app that look navigable but are not declared in the root Stack inventory.',
        'Nested TSX files under app are included as surfaces because Expo Router can treat app-folder TSX files as routes unless project configuration excludes them.',
      ],
    },
    surfaces,
    notes: [
      'This scanner is read-only and does not approve French generation.',
      'The goal is to connect user-visible surfaces to target-sensitive storage and dev StudyTarget risks.',
      'French remains blocked while blocker surfaces exist.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'surface_route_inventory.json');
  const outMd = path.join(runDir, 'audits', 'surface_route_inventory.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV surface route inventory: ${report.status}`);
  console.log(`Surfaces: ${report.summary.surfaces}`);
  console.log(`Blocker surfaces: ${report.summary.blockerSurfaces}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
}

void main();
