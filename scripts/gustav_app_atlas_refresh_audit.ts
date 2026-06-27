import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type DomainId =
  | 'lesson_rows'
  | 'lesson_intro_screens'
  | 'quizzes'
  | 'words_vocabulary'
  | 'preposition_packs'
  | 'flashcards'
  | 'daily_phrases'
  | 'personal_plan_content'
  | 'ai_output_language_contracts'
  | 'ai_dialogs'
  | 'mistake_explanations'
  | 'weekly_review'
  | 'stats_insights'
  | 'premium_dialogs_paywall'
  | 'collectibles_reward_text'
  | 'admin_reviewer_import_flows'
  | 'target_storage_and_cloud_sync'
  | 'source_locale_ui_copy'
  | 'gustav_gate_scripts'
  | 'unknown';

type MarkerHit = {
  marker: string;
  count: number;
  firstLine: number | null;
  firstText: string | null;
};

type AtlasRecord = {
  path: string;
  extension: string;
  category: string;
  primaryDomain: DomainId;
  secondaryDomains: DomainId[];
  bytes: number;
  sha256: string;
  lineCount: number;
  targetSensitive: boolean;
  aiPromptEntrypoint: boolean;
  generatedContentConsumer: boolean;
  storageOrCacheTouch: boolean;
  sourceLocaleTouch: boolean;
  targetLocaleTouch: boolean;
  uiLocaleTouch: boolean;
  reviewerOrImportTouch: boolean;
  markerHits: MarkerHit[];
};

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type JsonObject = Record<string, unknown>;

type Report = {
  schemaVersion: 'gustav-app-atlas-refresh-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  summary: {
    scannedFiles: number;
    appTsFiles: number;
    appTsxFiles: number;
    componentTsFiles: number;
    componentTsxFiles: number;
    constantTsFiles: number;
    hookTsFiles: number;
    functionsSrcTsFiles: number;
    gustavScriptFiles: number;
    testTsFiles: number;
    targetSensitiveFiles: number;
    unclassifiedTargetSensitiveFiles: number;
    aiPromptEntrypoints: number;
    generatedContentConsumers: number;
    storageOrCacheTouchFiles: number;
    sourceLocaleTouchFiles: number;
    targetLocaleTouchFiles: number;
    uiLocaleTouchFiles: number;
    reviewerOrImportTouchFiles: number;
    oldSurfaceInventoryAppTsxFiles: number;
    previousDeltaCurrentAppTsxFiles: number;
    currentAppTsxNotInOldInventory: number;
    oldSurfaceInventoryStale: boolean;
    previousDeltaInventoryStale: boolean;
    atlasFreshAtAuditTime: boolean;
    blockers: number;
    warnings: number;
    readyForDomainRegistryV2: boolean;
    readyForGenerationV2: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  domainCounts: Record<string, number>;
  targetSensitiveDomains: Record<string, number>;
  aiPromptEntrypoints: AtlasRecord[];
  generatedContentConsumers: AtlasRecord[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    productionApplyApproved: false;
  };
};

const ROOTS = [
  'app',
  'components',
  'constants',
  'hooks',
  'functions/src',
  'scripts',
  'tests',
] as const;

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const MARKERS = [
  'AsyncStorage',
  'StudyTargetLang',
  'studyTarget',
  'useStudyTarget',
  'targetLocale',
  'sourceLocale',
  'sourceLocales',
  'uiLocale',
  'useLang',
  'i18n',
  'locale',
  'cache',
  'prompt',
  'openai',
  'ai',
  'dialog',
  'mistake',
  'weekly',
  'stats',
  'premium',
  'paywall',
  'lesson',
  'quiz',
  'flashcard',
  'collectible',
  'reviewer',
  'decision',
  'import',
  'planContent',
  'personal_plan',
  'preposition',
  'daily',
  'Firebase',
  'firestore',
  'cloud',
  'storage',
] as const;

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function array<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', '.expo', 'dist', 'build', 'coverage', '.gradle'].includes(entry.name)) continue;
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SOURCE_EXTENSIONS.has(ext)) files.push(fullPath);
    }
  }
  return files.sort((a, bValue) => a.localeCompare(bValue));
}

function safeText(filePath: string): string {
  const stat = fs.statSync(filePath);
  if (stat.size > 900_000) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function countMarker(text: string, marker: string): MarkerHit {
  if (!text) return { marker, count: 0, firstLine: null, firstText: null };
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'gi');
  const count = text.match(re)?.length ?? 0;
  if (count === 0) return { marker, count, firstLine: null, firstText: null };
  const lines = text.split(/\r?\n/);
  const lowerMarker = marker.toLowerCase();
  const firstIndex = lines.findIndex((line) => line.toLowerCase().includes(lowerMarker));
  return {
    marker,
    count,
    firstLine: firstIndex >= 0 ? firstIndex + 1 : null,
    firstText: firstIndex >= 0 ? lines[firstIndex].trim().slice(0, 180) : null,
  };
}

function hasAny(text: string, ...needles: string[]): boolean {
  const lower = text.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

function classifyCategory(relativePath: string): string {
  if (relativePath.startsWith('app/')) return 'app';
  if (relativePath.startsWith('components/')) return 'component';
  if (relativePath.startsWith('constants/')) return 'constant';
  if (relativePath.startsWith('hooks/')) return 'hook';
  if (relativePath.startsWith('functions/src/')) return 'function';
  if (relativePath.startsWith('scripts/')) return 'script';
  if (relativePath.startsWith('tests/')) return 'test';
  return 'other';
}

function addSecondary(domains: Set<DomainId>, domain: DomainId): void {
  if (domain !== 'unknown') domains.add(domain);
}

function classifyDomain(relativePath: string, text: string): { primary: DomainId; secondary: DomainId[] } {
  const p = relativePath.toLowerCase();
  const secondary = new Set<DomainId>();

  if (p.startsWith('scripts/gustav')) return { primary: 'gustav_gate_scripts', secondary: [] };

  if (hasAny(p, 'ai_language_gate', 'heisenberg_semantic') || hasAny(text, 'rejectGeneratedLanguageText', 'localeLanguageSignal')) {
    return { primary: 'ai_output_language_contracts', secondary: [] };
  }
  if (hasAny(p, 'explain_judge', 'ai_typing_bubble')) return { primary: 'ai_output_language_contracts', secondary: [] };
  if (hasAny(p, 'callable_options')) return { primary: 'source_locale_ui_copy', secondary: [] };
  if (hasAny(p, 'diagnosis_training')) return { primary: 'personal_plan_content', secondary: [] };
  if (hasAny(p, 'compass')) return { primary: 'personal_plan_content', secondary: [] };
  if (hasAny(p, 'speak-answer', 'use-speak-answer', 'speak_answer', 'use-audio')) return { primary: 'premium_dialogs_paywall', secondary: [] };
  if (hasAny(p, 'progress_event', 'progress_events')) return { primary: 'target_storage_and_cloud_sync', secondary: [] };
  if (hasAny(p, 'review_locale_runtime')) return { primary: 'source_locale_ui_copy', secondary: [] };

  if (hasAny(p, 'weekly') || hasAny(text, 'weekly_review')) return { primary: 'weekly_review', secondary: [] };
  if (hasAny(p, 'stats', 'analytics') || hasAny(text, 'stats_insights')) return { primary: 'stats_insights', secondary: [] };
  if (hasAny(p, 'mistake', 'problem_coach') || hasAny(text, 'mistake_explain', 'mistake explanation')) return { primary: 'mistake_explanations', secondary: [] };
  if (hasAny(p, 'premium', 'paywall', 'loyalty', 'speaking', 'referral') || hasAny(text, 'premium_dialog')) return { primary: 'premium_dialogs_paywall', secondary: [] };
  if (hasAny(p, 'ai_dialog', 'dialog_scenario', 'ai_companion') || hasAny(text, 'DIALOG_SCENARIOS', 'dialogScenario')) return { primary: 'ai_dialogs', secondary: [] };
  if (hasAny(p, 'personal_plan', 'plan_content') || hasAny(text, 'planContent', 'PlanContent')) return { primary: 'personal_plan_content', secondary: [] };
  if (hasAny(p, 'flashcard') || hasAny(text, 'flashcard')) return { primary: 'flashcards', secondary: [] };
  if (hasAny(p, 'collectible', 'pack_opening') || hasAny(text, 'collectible')) return { primary: 'collectibles_reward_text', secondary: [] };
  if (hasAny(p, 'reviewer', 'review_decision', 'import') || hasAny(text, 'reviewerDecision', 'decision import')) return { primary: 'admin_reviewer_import_flows', secondary: [] };
  if (hasAny(p, 'lesson_intro') || hasAny(text, 'introScreens')) return { primary: 'lesson_intro_screens', secondary: [] };
  if (hasAny(p, 'lesson_words', 'vocabulary') || hasAny(text, 'wordsFr', 'vocabulary')) return { primary: 'words_vocabulary', secondary: [] };
  if (hasAny(p, 'quiz', 'quizzes') || hasAny(text, 'quizDistractors', 'quizCorrect')) return { primary: 'quizzes', secondary: [] };
  if (hasAny(p, 'preposition') || hasAny(text, 'preposition')) return { primary: 'preposition_packs', secondary: [] };
  if (hasAny(p, 'daily') || hasAny(text, 'dailyPhrases')) return { primary: 'daily_phrases', secondary: [] };
  if (hasAny(p, 'lesson') || hasAny(text, 'lessonId', 'lesson rows')) return { primary: 'lesson_rows', secondary: [] };

  if (hasAny(text, 'AsyncStorage', 'firestore', 'Firebase', 'cache', 'storage')) {
    addSecondary(secondary, 'target_storage_and_cloud_sync');
  }
  if (hasAny(text, 'sourceLocale', 'sourceLocales', 'useLang', 'i18n')) {
    addSecondary(secondary, 'source_locale_ui_copy');
  }

  if (secondary.has('target_storage_and_cloud_sync')) {
    secondary.delete('target_storage_and_cloud_sync');
    return { primary: 'target_storage_and_cloud_sync', secondary: Array.from(secondary).sort() };
  }
  if (secondary.has('source_locale_ui_copy')) {
    secondary.delete('source_locale_ui_copy');
    return { primary: 'source_locale_ui_copy', secondary: Array.from(secondary).sort() };
  }

  if (p.includes('admin') || p.includes('settings') || p.includes('privacy') || p.includes('terms')) {
    return { primary: 'source_locale_ui_copy', secondary: [] };
  }

  return { primary: 'unknown', secondary: [] };
}

function isTargetSensitive(text: string): boolean {
  return hasAny(
    text,
    'StudyTargetLang',
    'studyTarget',
    'useStudyTarget',
    'targetLocale',
    'AsyncStorage',
    'progress/targets',
    'target-language',
    'target language',
    'wordsFr',
    'proposedFrench',
  );
}

function atlasRecord(repoRoot: string, filePath: string): AtlasRecord {
  const relativePath = rel(repoRoot, filePath);
  const stat = fs.statSync(filePath);
  const text = safeText(filePath);
  const markerHits = MARKERS.map((marker) => countMarker(text, marker)).filter((hit) => hit.count > 0);
  const domain = classifyDomain(relativePath, text);
  const targetSensitive = isTargetSensitive(text);
  const aiPromptEntrypoint = hasAny(relativePath, 'ai_', 'ai-language', 'ai_language', 'weekly_review_client', 'stats_insights_client')
    || hasAny(
      text,
      'openai',
      'model:',
      'modelName',
      'systemPrompt',
      'userPrompt',
      'promptVersion',
      'aiLanguage',
      'language contract',
      'rejectGeneratedLanguageText',
      'chat.completions',
      'responses.create',
    );
  const generatedContentConsumer = hasAny(text, 'lessonId', 'phraseId', 'wordsFr', 'sourceGraph', 'generated', 'PlanContent', 'DIALOG_SCENARIOS');
  const storageOrCacheTouch = hasAny(text, 'AsyncStorage', 'cache', 'firestore', 'Firebase', 'storage');
  const sourceLocaleTouch = hasAny(text, 'sourceLocale', 'sourceLocales', 'useLang', 'i18n');
  const targetLocaleTouch = hasAny(text, 'targetLocale', 'StudyTargetLang', 'studyTarget', 'useStudyTarget');
  const uiLocaleTouch = hasAny(text, 'uiLocale');
  const reviewerOrImportTouch = hasAny(relativePath, 'reviewer', 'import', 'decision') || hasAny(text, 'reviewerDecision', 'decision import');
  return {
    path: relativePath,
    extension: path.extname(filePath).toLowerCase(),
    category: classifyCategory(relativePath),
    primaryDomain: domain.primary,
    secondaryDomains: domain.secondary,
    bytes: stat.size,
    sha256: sha256(filePath),
    lineCount: text ? text.split(/\r?\n/).length : 0,
    targetSensitive,
    aiPromptEntrypoint,
    generatedContentConsumer,
    storageOrCacheTouch,
    sourceLocaleTouch,
    targetLocaleTouch,
    uiLocaleTouch,
    reviewerOrImportTouch,
    markerHits,
  };
}

function countWhere(records: AtlasRecord[], predicate: (record: AtlasRecord) => boolean): number {
  return records.filter(predicate).length;
}

function countByDomain(records: AtlasRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of records) counts[record.primaryDomain] = (counts[record.primaryDomain] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [bValue]) => a.localeCompare(bValue)));
}

function readSummary(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return object(readJson<JsonObject>(filePath).summary);
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV App Atlas Refresh Audit',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Scanned files: ${report.summary.scannedFiles}`,
    `- App TS / TSX files: ${report.summary.appTsFiles} / ${report.summary.appTsxFiles}`,
    `- Component TS / TSX files: ${report.summary.componentTsFiles} / ${report.summary.componentTsxFiles}`,
    `- Constants TS files: ${report.summary.constantTsFiles}`,
    `- Hook TS files: ${report.summary.hookTsFiles}`,
    `- Functions src TS files: ${report.summary.functionsSrcTsFiles}`,
    `- Gustav script files: ${report.summary.gustavScriptFiles}`,
    `- Test TS files: ${report.summary.testTsFiles}`,
    `- Target-sensitive files: ${report.summary.targetSensitiveFiles}`,
    `- Unclassified target-sensitive files: ${report.summary.unclassifiedTargetSensitiveFiles}`,
    `- AI prompt entrypoints: ${report.summary.aiPromptEntrypoints}`,
    `- Generated content consumers: ${report.summary.generatedContentConsumers}`,
    `- Storage/cache touch files: ${report.summary.storageOrCacheTouchFiles}`,
    `- Source-locale touch files: ${report.summary.sourceLocaleTouchFiles}`,
    `- Target-locale touch files: ${report.summary.targetLocaleTouchFiles}`,
    `- UI-locale touch files: ${report.summary.uiLocaleTouchFiles}`,
    `- Reviewer/import touch files: ${report.summary.reviewerOrImportTouchFiles}`,
    `- Old surface inventory app TSX files: ${report.summary.oldSurfaceInventoryAppTsxFiles}`,
    `- Previous delta current app TSX files: ${report.summary.previousDeltaCurrentAppTsxFiles}`,
    `- Current app TSX not in old inventory: ${report.summary.currentAppTsxNotInOldInventory}`,
    `- Old surface inventory stale: ${report.summary.oldSurfaceInventoryStale ? 'yes' : 'no'}`,
    `- Previous delta inventory stale: ${report.summary.previousDeltaInventoryStale ? 'yes' : 'no'}`,
    `- Atlas fresh at audit time: ${report.summary.atlasFreshAtAuditTime ? 'yes' : 'no'}`,
    `- Ready for Domain Registry V2: ${report.summary.readyForDomainRegistryV2 ? 'yes' : 'no'}`,
    `- Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Domain Counts',
    '',
  ];

  for (const [domain, count] of Object.entries(report.domainCounts)) {
    lines.push(`- \`${domain}\`: ${count}`);
  }

  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }

  lines.push('', '## Outputs', '');
  Object.entries(report.outputs).forEach(([key, filePath]) => lines.push(`- ${key}: \`${filePath}\``));
  lines.push(
    '',
    '## Safety',
    '',
    '- This audit read source files and wrote only Gustav run artifacts.',
    '- It did not modify production app files.',
    '- It did not modify generated French ledgers.',
    '- It did not write reviewer decisions or approvals.',
    '',
  );
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_app_atlas_refresh_audit.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);

  const files = ROOTS.flatMap((root) => walkFiles(path.join(repoRoot, root)))
    .filter((filePath) => {
      const relativePath = rel(repoRoot, filePath);
      if (relativePath.startsWith('scripts/') && !path.basename(relativePath).startsWith('gustav_')) return false;
      return true;
    });
  const records = files.map((filePath) => atlasRecord(repoRoot, filePath));

  const oldSurfaceInventoryPath = path.join(auditsDir, 'surface_route_inventory.json');
  const previousDeltaPath = path.join(auditsDir, 'current_app_surface_delta_inventory.json');
  const oldSurfaceSummary = readSummary(oldSurfaceInventoryPath);
  const previousDeltaSummary = readSummary(previousDeltaPath);
  const previousDelta = fs.existsSync(previousDeltaPath) ? readJson<JsonObject>(previousDeltaPath) : {};
  const currentAppTsxNotInOldInventory = array(object(previousDelta.oldInventoryDelta).currentAppTsxNotInOldInventory).length
    || n(previousDeltaSummary, 'currentAppTsxNotInOldInventory');

  const appTsxFiles = countWhere(records, (record) => record.path.startsWith('app/') && record.extension === '.tsx');
  const previousDeltaCurrentAppTsxFiles = n(previousDeltaSummary, 'currentAppTsxFiles');
  const oldSurfaceInventoryAppTsxFiles = n(oldSurfaceSummary, 'appTsxFiles') || n(previousDeltaSummary, 'oldSurfaceInventoryAppTsxFiles');
  const oldSurfaceInventoryStale = oldSurfaceInventoryAppTsxFiles > 0 && oldSurfaceInventoryAppTsxFiles !== appTsxFiles;
  const previousDeltaInventoryStale = previousDeltaCurrentAppTsxFiles > 0 && previousDeltaCurrentAppTsxFiles !== appTsxFiles;

  const findings: Finding[] = [];
  if (oldSurfaceInventoryStale) {
    addFinding(
      findings,
      'warning',
      'old_surface_inventory_stale',
      `Old surface inventory app TSX count ${oldSurfaceInventoryAppTsxFiles} differs from current app TSX count ${appTsxFiles}.`,
    );
  }
  if (previousDeltaInventoryStale) {
    addFinding(
      findings,
      'warning',
      'previous_delta_inventory_stale',
      `Previous current-app delta count ${previousDeltaCurrentAppTsxFiles} differs from current app TSX count ${appTsxFiles}.`,
    );
  }

  const targetSensitiveRecords = records.filter((record) => record.targetSensitive);
  const unclassifiedTargetSensitiveRecords = targetSensitiveRecords.filter((record) => record.primaryDomain === 'unknown');
  for (const record of unclassifiedTargetSensitiveRecords) {
    addFinding(findings, 'blocker', 'unclassified_target_sensitive_file', 'Target-sensitive file is not classified into an app domain.', record.path);
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const atlasPath = path.join(auditsDir, 'app_atlas.json');
  const reportPath = path.join(auditsDir, 'app_atlas_refresh_audit.json');
  const reportMdPath = path.join(auditsDir, 'app_atlas_refresh_audit.md');

  const atlas = {
    schemaVersion: 'gustav-app-atlas-v0',
    runId,
    generatedAt: new Date().toISOString(),
    summary: {
      files: records.length,
      domainCounts: countByDomain(records),
      targetSensitiveFiles: targetSensitiveRecords.length,
      aiPromptEntrypoints: records.filter((record) => record.aiPromptEntrypoint).length,
      generatedContentConsumers: records.filter((record) => record.generatedContentConsumer).length,
    },
    roots: ROOTS,
    records,
  };
  fs.writeFileSync(atlasPath, `${JSON.stringify(atlas, null, 2)}\n`, 'utf8');

  const report: Report = {
    schemaVersion: 'gustav-app-atlas-refresh-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : (warnings > 0 ? 'HOLD' : 'PASS'),
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      oldSurfaceInventory: rel(repoRoot, oldSurfaceInventoryPath),
      previousCurrentAppDeltaInventory: rel(repoRoot, previousDeltaPath),
    },
    outputs: {
      appAtlas: rel(repoRoot, atlasPath),
      auditJson: rel(repoRoot, reportPath),
      auditMd: rel(repoRoot, reportMdPath),
    },
    summary: {
      scannedFiles: records.length,
      appTsFiles: countWhere(records, (record) => record.path.startsWith('app/') && record.extension === '.ts'),
      appTsxFiles,
      componentTsFiles: countWhere(records, (record) => record.path.startsWith('components/') && record.extension === '.ts'),
      componentTsxFiles: countWhere(records, (record) => record.path.startsWith('components/') && record.extension === '.tsx'),
      constantTsFiles: countWhere(records, (record) => record.path.startsWith('constants/') && record.extension === '.ts'),
      hookTsFiles: countWhere(records, (record) => record.path.startsWith('hooks/') && record.extension === '.ts'),
      functionsSrcTsFiles: countWhere(records, (record) => record.path.startsWith('functions/src/') && record.extension === '.ts'),
      gustavScriptFiles: countWhere(records, (record) => record.path.startsWith('scripts/gustav_')),
      testTsFiles: countWhere(records, (record) => record.path.startsWith('tests/') && record.extension === '.ts'),
      targetSensitiveFiles: targetSensitiveRecords.length,
      unclassifiedTargetSensitiveFiles: unclassifiedTargetSensitiveRecords.length,
      aiPromptEntrypoints: countWhere(records, (record) => record.aiPromptEntrypoint),
      generatedContentConsumers: countWhere(records, (record) => record.generatedContentConsumer),
      storageOrCacheTouchFiles: countWhere(records, (record) => record.storageOrCacheTouch),
      sourceLocaleTouchFiles: countWhere(records, (record) => record.sourceLocaleTouch),
      targetLocaleTouchFiles: countWhere(records, (record) => record.targetLocaleTouch),
      uiLocaleTouchFiles: countWhere(records, (record) => record.uiLocaleTouch),
      reviewerOrImportTouchFiles: countWhere(records, (record) => record.reviewerOrImportTouch),
      oldSurfaceInventoryAppTsxFiles,
      previousDeltaCurrentAppTsxFiles,
      currentAppTsxNotInOldInventory,
      oldSurfaceInventoryStale,
      previousDeltaInventoryStale,
      atlasFreshAtAuditTime: blockers === 0,
      blockers,
      warnings,
      readyForDomainRegistryV2: blockers === 0,
      readyForGenerationV2: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    domainCounts: countByDomain(records),
    targetSensitiveDomains: countByDomain(targetSensitiveRecords),
    aiPromptEntrypoints: records.filter((record) => record.aiPromptEntrypoint).slice(0, 200),
    generatedContentConsumers: records.filter((record) => record.generatedContentConsumer).slice(0, 200),
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      productionApplyApproved: false,
    },
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(reportMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV app atlas refresh audit: ${report.status}`);
  console.log(`Scanned files: ${report.summary.scannedFiles}`);
  console.log(`App TSX files: ${report.summary.appTsxFiles}`);
  console.log(`Target-sensitive files: ${report.summary.targetSensitiveFiles}`);
  console.log(`Unclassified target-sensitive files: ${report.summary.unclassifiedTargetSensitiveFiles}`);
  console.log(`AI prompt entrypoints: ${report.summary.aiPromptEntrypoints}`);
  console.log(`Ready for Domain Registry V2: ${report.summary.readyForDomainRegistryV2 ? 'yes' : 'no'}`);
  console.log(`Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, reportPath)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
