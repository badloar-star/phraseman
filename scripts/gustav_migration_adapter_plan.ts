import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Risk = 'low' | 'medium' | 'high' | 'blocker';

type StorageRecord = {
  key?: string;
  keyPattern?: string;
  sourcePath: string;
  line: number;
  operation: string;
  targetNamespaceRequired?: boolean;
};

type StorageInventory = {
  summary?: Record<string, unknown>;
  records?: StorageRecord[];
};

type SurfaceEntry = {
  sourcePath: string;
  kind: string;
  domain: string;
  userFacing: boolean;
  risk: Risk;
  blockers: string[];
  markers?: {
    usesStudyTargetContext?: boolean;
    usesDevStudyTargetLang?: boolean;
    directAsyncStorageOps?: number;
  };
  targetStorage?: {
    records?: number;
    keys?: string[];
  };
};

type SurfaceInventory = {
  summary?: Record<string, unknown>;
  surfaces?: SurfaceEntry[];
};

type TargetKeyPlan = {
  summary?: Record<string, unknown>;
  domains?: Array<{
    domain: string;
    productModule: string;
    proposedApi: string[];
    storageShape: string[];
    fileTouchpoints: Array<{ sourcePath: string; records: number }>;
  }>;
};

type CloudMapping = {
  summary?: Record<string, unknown>;
  entries?: Array<{
    key?: string;
    keyPattern?: string;
    action?: string;
    targetPath?: string;
  }>;
};

type LocalCloudDecisionTable = {
  summary?: Record<string, unknown>;
  entries?: Array<{
    key: string;
    action: string;
    targetPath?: string;
    localKeyShape?: string;
  }>;
};

type AdapterId =
  | 'production_study_target'
  | 'target_storage_key_builder'
  | 'legacy_english_compat'
  | 'lesson_progress_store'
  | 'lesson_session_store'
  | 'lesson_reward_idempotency'
  | 'level_exam_certificate_store'
  | 'quiz_progress_store'
  | 'mistake_practice_store'
  | 'personal_practice_store'
  | 'flashcards_target_store'
  | 'achievement_progress_store'
  | 'target_stats_store'
  | 'cloud_sync_target_buckets'
  | 'route_surface_integration'
  | 'raw_storage_guard';

type Adapter = {
  id: AdapterId;
  phase: string;
  status: Status;
  risk: Risk;
  ownerArea:
    | 'study_target'
    | 'storage'
    | 'lesson'
    | 'quiz'
    | 'trainer'
    | 'personal_practice'
    | 'flashcards'
    | 'achievements'
    | 'stats'
    | 'cloud'
    | 'ui'
    | 'tests';
  dependsOn: AdapterId[];
  productModules: string[];
  coveredSurfaceDomains: string[];
  sourceFiles: string[];
  storageKeys: string[];
  cloudActions: string[];
  implementationSteps: string[];
  testsRequired: string[];
  rollbackNotes: string[];
  blockers: string[];
};

type Phase = {
  id: string;
  title: string;
  status: Status;
  adapters: AdapterId[];
  exitCriteria: string[];
};

type Report = {
  schemaVersion: 'gustav-migration-adapter-plan-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    phases: number;
    adapters: number;
    blockerAdapters: number;
    productModules: number;
    sourceFiles: number;
    storageKeys: number;
    targetStorageRecords: number;
    surfaceBlockers: number;
    cloudTargetMappings: number;
    localCloudDecisions: number;
    canStartFrenchGenerationAfterPlanOnly: boolean;
  };
  phases: Phase[];
  adapters: Adapter[];
  highestRiskFiles: Array<{
    sourcePath: string;
    domain: string;
    targetStorageRecords: number;
    blockers: number;
  }>;
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

function num(obj: Record<string, unknown> | undefined, key: string): number {
  return obj && typeof obj[key] === 'number' ? obj[key] as number : 0;
}

function stableRecordKey(record: { key?: string; keyPattern?: string }): string {
  return record.key ?? record.keyPattern ?? '';
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function keysMatching(records: StorageRecord[], tests: RegExp[]): string[] {
  return unique(
    records
      .filter((record) => record.targetNamespaceRequired)
      .map(stableRecordKey)
      .filter((key) => tests.some((test) => test.test(key.toLowerCase()))),
  ).slice(0, 30);
}

function filesForDomains(surfaces: SurfaceEntry[], domains: string[]): string[] {
  return unique(
    surfaces
      .filter((surface) => domains.includes(surface.domain))
      .filter((surface) => surface.blockers.length > 0 || (surface.targetStorage?.records ?? 0) > 0)
      .map((surface) => surface.sourcePath),
  ).slice(0, 30);
}

function filesForStorageKeys(records: StorageRecord[], tests: RegExp[]): string[] {
  return unique(
    records
      .filter((record) => record.targetNamespaceRequired)
      .filter((record) => tests.some((test) => test.test(stableRecordKey(record).toLowerCase())))
      .map((record) => record.sourcePath),
  ).slice(0, 30);
}

function cloudActionsFor(cloud: CloudMapping, tests: RegExp[]): string[] {
  return unique(
    (cloud.entries ?? [])
      .filter((entry) => tests.some((test) => test.test((entry.key ?? entry.keyPattern ?? '').toLowerCase())))
      .map((entry) => `${entry.key ?? entry.keyPattern}:${entry.action ?? 'unknown'} -> ${entry.targetPath ?? 'no-target-path'}`),
  ).slice(0, 20);
}

function localDecisionsFor(localCloud: LocalCloudDecisionTable, tests: RegExp[]): string[] {
  return unique(
    (localCloud.entries ?? [])
      .filter((entry) => tests.some((test) => test.test(entry.key.toLowerCase())))
      .map((entry) => `${entry.key}:${entry.action}:${entry.targetPath ?? entry.localKeyShape ?? 'no-target'}`),
  ).slice(0, 20);
}

function adapter(input: Adapter): Adapter {
  return input;
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Migration Adapter Plan',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Phases: ${report.summary.phases}`,
    `- Adapters: ${report.summary.adapters}`,
    `- Blocker adapters: ${report.summary.blockerAdapters}`,
    `- Product modules: ${report.summary.productModules}`,
    `- Source files covered: ${report.summary.sourceFiles}`,
    `- Storage keys covered: ${report.summary.storageKeys}`,
    `- Target storage records: ${report.summary.targetStorageRecords}`,
    `- Surface blockers: ${report.summary.surfaceBlockers}`,
    `- Cloud target mappings: ${report.summary.cloudTargetMappings}`,
    `- Local/cloud decisions: ${report.summary.localCloudDecisions}`,
    `- Can start French generation after this plan only: ${report.summary.canStartFrenchGenerationAfterPlanOnly ? 'yes' : 'no'}`,
    '',
    '## Phases',
    '',
  ];
  for (const phase of report.phases) {
    lines.push(`### ${phase.id}: ${phase.title}`);
    lines.push('');
    lines.push(`Status: \`${phase.status}\``);
    lines.push(`Adapters: ${phase.adapters.map((id) => `\`${id}\``).join(', ')}`);
    lines.push('');
    lines.push('Exit criteria:');
    for (const item of phase.exitCriteria) lines.push(`- ${item}`);
    lines.push('');
  }
  lines.push('## Adapters', '');
  for (const entry of report.adapters) {
    lines.push(`### ${entry.id}`);
    lines.push('');
    lines.push(`Phase: \`${entry.phase}\``);
    lines.push(`Status: \`${entry.status}\``);
    lines.push(`Risk: \`${entry.risk}\``);
    lines.push(`Owner area: \`${entry.ownerArea}\``);
    if (entry.dependsOn.length > 0) {
      lines.push(`Depends on: ${entry.dependsOn.map((id) => `\`${id}\``).join(', ')}`);
    }
    lines.push('');
    lines.push('Product modules:');
    for (const file of entry.productModules) lines.push(`- \`${file}\``);
    if (entry.sourceFiles.length > 0) {
      lines.push('', 'Covered source files:');
      for (const file of entry.sourceFiles.slice(0, 12)) lines.push(`- \`${file}\``);
    }
    if (entry.storageKeys.length > 0) {
      lines.push('', 'Storage keys:');
      for (const key of entry.storageKeys.slice(0, 16)) lines.push(`- \`${key}\``);
    }
    lines.push('', 'Implementation steps:');
    for (const step of entry.implementationSteps) lines.push(`- ${step}`);
    lines.push('', 'Tests required:');
    for (const test of entry.testsRequired) lines.push(`- ${test}`);
    lines.push('', 'Rollback notes:');
    for (const note of entry.rollbackNotes) lines.push(`- ${note}`);
    if (entry.blockers.length > 0) {
      lines.push('', 'Blockers:');
      for (const blocker of entry.blockers) lines.push(`- ${blocker}`);
    }
    lines.push('');
  }
  lines.push('## Highest Risk Files', '');
  for (const file of report.highestRiskFiles) {
    lines.push(`- \`${file.sourcePath}\` (${file.domain}): ${file.targetStorageRecords} target records, ${file.blockers} blockers`);
  }
  lines.push('', '## Notes', '');
  for (const note of report.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_migration_adapter_plan.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const storage = readJson<StorageInventory>(path.join(runDir, 'inputs', 'storage_key_inventory.json'));
  const surfaces = readJson<SurfaceInventory>(path.join(runDir, 'audits', 'surface_route_inventory.json'));
  const targetPlan = readJson<TargetKeyPlan>(path.join(runDir, 'audits', 'target_key_integration_plan.json'));
  const cloud = readJson<CloudMapping>(path.join(runDir, 'audits', 'cloud_sync_mapping.json'));
  const localCloud = readJson<LocalCloudDecisionTable>(path.join(runDir, 'audits', 'local_cloud_decision_table.json'));

  const records = storage.records ?? [];
  const surfaceEntries = surfaces.surfaces ?? [];
  const unknownKeys = keysMatching(records, [/^<unknown>$/]);
  const lessonTests = [/lesson/, /unlocked_lessons/];
  const quizTests = [/quiz/];
  const mistakePracticeTests = [/mistake_practice/, /preposition/, /prep_drill/];
  const flashcardTests = [/flashcard/, /irregular_verbs/];
  const achievementTests = [/achievement/];
  const examTests = [/level_exam/, /certificate/];
  const statsTests = [/daily_stats/, /user_stats/, /stats_daily/, /lifetime_quiz/];

  const adapters: Adapter[] = [
    adapter({
      id: 'production_study_target',
      phase: 'P1',
      status: 'HOLD',
      risk: 'blocker',
      ownerArea: 'study_target',
      dependsOn: [],
      productModules: ['app/study_target.ts', 'components/StudyTargetContext.tsx'],
      coveredSurfaceDomains: ['app_shell', 'settings_source_locale'],
      sourceFiles: ['app/study_target_lang_dev.ts', 'components/StudyTargetContext.tsx', 'app/spanish_content_gate.ts', 'app/(tabs)/settings.tsx'],
      storageKeys: ['study_target_v1', 'dev_study_target_lang'],
      cloudActions: [],
      implementationSteps: [
        'Introduce production StudyTarget type with en/fr and keep it separate from sourceLocale.',
        'Rename or isolate dev StudyTargetLang so Spanish experiments cannot drive French target selection.',
        'Expose a provider API that route surfaces can consume without reading sourceLocale as target.',
      ],
      testsRequired: [
        'Switch sourceLocale ru -> uk and assert studyTarget remains fr.',
        'Enable French target and assert Spanish dev gates do not activate.',
      ],
      rollbackNotes: [
        'Feature-flag the production target provider and keep dev Spanish path untouched until migration is complete.',
      ],
      blockers: [
        'Current StudyTargetLang is dev-only en/es.',
        'Production StudyTarget does not exist yet.',
      ],
    }),
    adapter({
      id: 'target_storage_key_builder',
      phase: 'P1',
      status: 'HOLD',
      risk: 'blocker',
      ownerArea: 'storage',
      dependsOn: ['production_study_target'],
      productModules: ['app/target_storage_keys.ts'],
      coveredSurfaceDomains: ['lesson_runtime', 'quiz', 'mistake_practice', 'flashcards', 'achievements', 'progress_stats'],
      sourceFiles: unique((targetPlan.domains ?? []).flatMap((domain) => domain.fileTouchpoints?.map((t) => t.sourcePath) ?? [])),
      storageKeys: unique(records.filter((record) => record.targetNamespaceRequired).map(stableRecordKey)).slice(0, 40),
      cloudActions: [],
      implementationSteps: [
        'Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper.',
        'Add a runtime assertTargetKey guard for target-sensitive domains.',
        'Allow raw legacy keys only inside explicitly named migration adapters.',
      ],
      testsRequired: [
        'Key builder returns distinct keys for en/fr for every target-sensitive domain.',
        'Raw storage guard fails on a new flat lesson/mistake-practice/quiz key outside migration adapters.',
      ],
      rollbackNotes: [
        'Keep helper additive first; do not delete legacy keys until migration confidence is recorded.',
      ],
      blockers: [
        `${num(storage.summary, 'targetNamespaceRequired')} target-sensitive storage records still exist.`,
        `${unknownKeys.length ? 'Unknown target-sensitive key family exists.' : 'Raw target-sensitive key families still need routing.'}`,
      ],
    }),
    adapter({
      id: 'legacy_english_compat',
      phase: 'P2',
      status: 'HOLD',
      risk: 'blocker',
      ownerArea: 'storage',
      dependsOn: ['target_storage_key_builder'],
      productModules: ['app/legacy_english_progress_migration.ts'],
      coveredSurfaceDomains: ['lesson_list', 'lesson_runtime', 'quiz', 'mistake_practice', 'flashcards'],
      sourceFiles: filesForStorageKeys(records, [/lesson/, /quiz/, /mistake_practice/, /flashcard/, /level_exam/]),
      storageKeys: unique(records.filter((record) => record.targetNamespaceRequired).map(stableRecordKey)).slice(0, 40),
      cloudActions: ['legacy flat keys map to en target only'],
      implementationSteps: [
        'Read legacy flat keys only through a one-time English compatibility adapter.',
        'Copy legacy learning state to v2::en without deleting rollback keys.',
        'Make fr target reads fail closed when only legacy English keys exist.',
      ],
      testsRequired: [
        'Existing English user keeps lesson, quiz, mistake-practice and flashcard state after migration.',
        'French user sees empty target state even when legacy English progress exists.',
      ],
      rollbackNotes: [
        'Do not remove legacy keys; rollback disables v2 reads and falls back to existing English behavior.',
      ],
      blockers: [
        'Legacy English mapping has not been implemented or tested.',
      ],
    }),
    adapter({
      id: 'lesson_progress_store',
      phase: 'P3',
      status: 'HOLD',
      risk: 'blocker',
      ownerArea: 'lesson',
      dependsOn: ['legacy_english_compat'],
      productModules: ['app/lesson_progress_store.ts'],
      coveredSurfaceDomains: ['lesson_list', 'lesson_menu', 'lesson_runtime', 'lesson_completion', 'home_dashboard'],
      sourceFiles: filesForDomains(surfaceEntries, ['lesson_list', 'lesson_menu', 'lesson_runtime', 'lesson_completion', 'home_dashboard']),
      storageKeys: keysMatching(records, [/lesson.*progress/, /lesson.*best_score/, /lesson.*pass_count/, /lesson.*words/, /unlocked_lessons/]),
      cloudActions: cloudActionsFor(cloud, [/lesson/, /unlocked_lessons/]),
      implementationSteps: [
        'Centralize lesson progress, unlocks, words and score reads/writes.',
        'Replace direct AsyncStorage calls in lesson list/menu/runtime/completion surfaces with store calls.',
        'Keep French lesson ids separate until a French source graph approves lesson ordering.',
      ],
      testsRequired: [
        'English lesson completion does not mark French lesson complete.',
        'French target does not reuse English unlocked_lessons.',
        'Home and lessons tab render target-specific progress.',
      ],
      rollbackNotes: [
        'Store adapter can read v2 first and legacy en second only when studyTarget=en.',
      ],
      blockers: [
        'Lesson surfaces currently use flat lesson keys across multiple screens.',
      ],
    }),
    adapter({
      id: 'lesson_session_store',
      phase: 'P3',
      status: 'HOLD',
      risk: 'blocker',
      ownerArea: 'lesson',
      dependsOn: ['target_storage_key_builder'],
      productModules: ['app/lesson_session_store.ts'],
      coveredSurfaceDomains: ['lesson_runtime'],
      sourceFiles: filesForDomains(surfaceEntries, ['lesson_runtime']),
      storageKeys: keysMatching(records, [/cellindex/, /phraseorder/, /errorreplay/, /intro_shown/]),
      cloudActions: localDecisionsFor(localCloud, [/cellindex/, /phraseorder/, /errorreplay/, /intro_shown/]),
      implementationSteps: [
        'Move lesson runtime session state to target-scoped local-only keys.',
        'Document these keys as not cloud-synced.',
        'Reset session state on studyTarget change unless an explicit target session exists.',
      ],
      testsRequired: [
        'Switch en -> fr does not resume English cell index, phrase order or replay queue.',
        'Cloud sync does not export local session keys.',
      ],
      rollbackNotes: [
        'Session adapter can clear v2 target session keys without touching legacy lesson progress.',
      ],
      blockers: [
        'Lesson runtime can resume local state from the wrong target.',
      ],
    }),
    adapter({
      id: 'lesson_reward_idempotency',
      phase: 'P3',
      status: 'HOLD',
      risk: 'blocker',
      ownerArea: 'lesson',
      dependsOn: ['target_storage_key_builder'],
      productModules: ['app/reward_idempotency_store.ts'],
      coveredSurfaceDomains: ['lesson_completion', 'lesson_runtime', 'commerce_rewards'],
      sourceFiles: filesForStorageKeys(records, [/bonus_granted/, /shards_granted/, /prep_drill_perfect/]),
      storageKeys: keysMatching(records, [/bonus_granted/, /shards_granted/, /prep_drill_perfect/]),
      cloudActions: localDecisionsFor(localCloud, [/bonus_granted/, /shards_granted/, /prep_drill_perfect/]),
      implementationSteps: [
        'Create target-scoped reward grant ids.',
        'Decide per reward whether idempotency is local target-scoped or synced under target.',
        'Map legacy reward markers to English only.',
      ],
      testsRequired: [
        'French reward can be granted even if English reward marker exists.',
        'Cloud restore does not double-grant target rewards.',
      ],
      rollbackNotes: [
        'Preserve legacy reward markers; disable new grants behind a feature flag if needed.',
      ],
      blockers: [
        'Flat reward markers can suppress or duplicate French rewards.',
      ],
    }),
    adapter({
      id: 'level_exam_certificate_store',
      phase: 'P3',
      status: 'HOLD',
      risk: 'blocker',
      ownerArea: 'lesson',
      dependsOn: ['legacy_english_compat'],
      productModules: ['app/level_exam_store.ts', 'app/certificate_store.ts'],
      coveredSurfaceDomains: ['lesson_list', 'progress_stats'],
      sourceFiles: filesForStorageKeys(records, examTests),
      storageKeys: keysMatching(records, examTests),
      cloudActions: cloudActionsFor(cloud, examTests),
      implementationSteps: [
        'Store exam results and certificates under studyTarget.',
        'Keep English certificates mapped to en only.',
        'Do not assume French CEFR structure equals English until source graph approves it.',
      ],
      testsRequired: [
        'English A1 pass does not unlock French A1 certificate.',
        'French exam state writes only to fr target bucket.',
      ],
      rollbackNotes: [
        'Certificate v2 can be hidden without deleting legacy certificate key.',
      ],
      blockers: [
        'Exam/certificate proof state is currently target-unscoped.',
      ],
    }),
    adapter({
      id: 'quiz_progress_store',
      phase: 'P3',
      status: 'HOLD',
      risk: 'blocker',
      ownerArea: 'quiz',
      dependsOn: ['target_storage_key_builder'],
      productModules: ['app/quiz_progress_store.ts'],
      coveredSurfaceDomains: ['quiz'],
      sourceFiles: filesForDomains(surfaceEntries, ['quiz']),
      storageKeys: keysMatching(records, quizTests),
      cloudActions: cloudActionsFor(cloud, quizTests).concat(localDecisionsFor(localCloud, quizTests)),
      implementationSteps: [
        'Move quiz navigation and counters to target-aware store APIs.',
        'Keep quiz_nav_level local target-scoped unless explicit cloud policy changes.',
        'Route quiz achievement counters through achievement adapter.',
      ],
      testsRequired: [
        'French quiz navigation does not resume English quiz level.',
        'French quiz counters do not increment English quiz achievements.',
      ],
      rollbackNotes: [
        'Quiz v2 keys can be cleared per target while preserving legacy English counters.',
      ],
      blockers: [
        'Quiz state has direct route and tab surfaces with target-sensitive keys.',
      ],
    }),
    adapter({
      id: 'mistake_practice_store',
      phase: 'P3',
      status: 'HOLD',
      risk: 'blocker',
      ownerArea: 'personal_practice',
      dependsOn: ['target_storage_key_builder'],
      productModules: ['app/mistake_practice_store.ts', 'app/mistake_practice_cloud_transport.ts'],
      coveredSurfaceDomains: ['mistake_practice'],
      sourceFiles: filesForDomains(surfaceEntries, ['mistake_practice']),
      storageKeys: keysMatching(records, mistakePracticeTests),
      cloudActions: cloudActionsFor(cloud, mistakePracticeTests).concat(localDecisionsFor(localCloud, mistakePracticeTests)),
      implementationSteps: [
        'Keep immutable mistake events under owner and studyTarget.',
        'Keep sourceLocale feedback separate from target practice state.',
        'Expose one journal consumed by Cards Errors and Learning V2.',
      ],
      testsRequired: [
        'French Mistake Practice never reads English events.',
        'Mistake events survive ru/uk sourceLocale switch without duplication.',
      ],
      rollbackNotes: [
        'The immutable v2 journal is additive and does not import retired practice stores.',
      ],
      blockers: [
        'Mistake Practice events carry target-language material.',
      ],
    }),
    adapter({
      id: 'personal_practice_store',
      phase: 'P3',
      status: 'HOLD',
      risk: 'blocker',
      ownerArea: 'personal_practice',
      dependsOn: ['mistake_practice_store'],
      productModules: ['app/personal_practice_store.ts', 'app/diagnostic_store.ts'],
      coveredSurfaceDomains: ['personal_practice'],
      sourceFiles: filesForDomains(surfaceEntries, ['personal_practice']),
      storageKeys: keysMatching(records, [/diagnostic/, /open_diagnostic/]),
      cloudActions: cloudActionsFor(cloud, [/diagnostic/]).concat(localDecisionsFor(localCloud, [/diagnostic/])),
      implementationSteps: [
        'Prefix every diagnosis and recommendation id with studyTarget.',
        'Store localized feedback under studyTarget/sourceLocale, not under target-only progress.',
        'Make My Practice recommendations consume target practice store snapshots.',
      ],
      testsRequired: [
        'fr:<id> and en:<id> diagnoses cannot collide.',
        'Russian and Ukrainian feedback for French diagnosis do not overwrite each other.',
      ],
      rollbackNotes: [
        'Diagnosis v2 can be disabled and legacy English diagnostic_last kept as en-only.',
      ],
      blockers: [
        'My Practice can otherwise mix English diagnosis and French recommendations.',
      ],
    }),
    adapter({
      id: 'flashcards_target_store',
      phase: 'P3',
      status: 'HOLD',
      risk: 'blocker',
      ownerArea: 'flashcards',
      dependsOn: ['target_storage_key_builder'],
      productModules: ['app/flashcards/target_storage.ts', 'hooks/use-flashcards.ts'],
      coveredSurfaceDomains: ['flashcards'],
      sourceFiles: filesForDomains(surfaceEntries, ['flashcards']),
      storageKeys: keysMatching(records, flashcardTests),
      cloudActions: cloudActionsFor(cloud, flashcardTests),
      implementationSteps: [
        'Add studyTarget metadata to system and custom cards.',
        'Move progress and owned target card state under studyTarget.',
        'Keep sourceLocale translations as card copy metadata.',
      ],
      testsRequired: [
        'English custom card does not appear in French unless explicitly copied.',
        'French flashcard progress is independent from English progress.',
      ],
      rollbackNotes: [
        'Flashcard v2 can read legacy English only when studyTarget=en.',
      ],
      blockers: [
        'Flashcard content and progress are target-sensitive.',
      ],
    }),
    adapter({
      id: 'achievement_progress_store',
      phase: 'P4',
      status: 'HOLD',
      risk: 'blocker',
      ownerArea: 'achievements',
      dependsOn: ['lesson_progress_store', 'quiz_progress_store', 'mistake_practice_store', 'flashcards_target_store'],
      productModules: ['app/achievement_progress_store.ts', 'app/achievements.ts', 'app/achievements_screen.tsx'],
      coveredSurfaceDomains: ['achievements'],
      sourceFiles: filesForDomains(surfaceEntries, ['achievements']),
      storageKeys: keysMatching(records, achievementTests),
      cloudActions: cloudActionsFor(cloud, achievementTests),
      implementationSteps: [
        'Split achievement state into global and target buckets using taxonomy.',
        'Route target-content counters through target stores.',
        'Hold mixed achievements until product policy decides global versus per-target behavior.',
      ],
      testsRequired: [
        'Target achievement unlocks independently for en and fr.',
        'Global achievement remains shared only when taxonomy says global.',
      ],
      rollbackNotes: [
        'Keep flat achievements_state read-only during migration and never delete before rollback window.',
      ],
      blockers: [
        'Achievement taxonomy still contains target and mixed blocker entries.',
      ],
    }),
    adapter({
      id: 'target_stats_store',
      phase: 'P4',
      status: 'HOLD',
      risk: 'blocker',
      ownerArea: 'stats',
      dependsOn: ['lesson_progress_store', 'quiz_progress_store', 'mistake_practice_store'],
      productModules: ['app/target_stats_store.ts', 'app/lifetime_profile_stats.ts', 'app/stats_daily_breakdown.ts'],
      coveredSurfaceDomains: ['progress_stats'],
      sourceFiles: filesForDomains(surfaceEntries, ['progress_stats']).concat(filesForStorageKeys(records, statsTests)),
      storageKeys: keysMatching(records, statsTests),
      cloudActions: cloudActionsFor(cloud, statsTests),
      implementationSteps: [
        'Split global engagement stats from target learning stats.',
        'Decide whether XP stays global while words/phrases/quizzes become target-scoped.',
        'Route progress_map and lifetime profile reads through split stats APIs.',
      ],
      testsRequired: [
        'French words/phrases/quizzes do not increment English target stats.',
        'Global engagement counters remain shared after target switch.',
      ],
      rollbackNotes: [
        'Keep v1 stats payloads intact and expose v2 stats behind target feature flag.',
      ],
      blockers: [
        'Stats payloads currently mix global and target learning fields.',
      ],
    }),
    adapter({
      id: 'cloud_sync_target_buckets',
      phase: 'P4',
      status: 'HOLD',
      risk: 'blocker',
      ownerArea: 'cloud',
      dependsOn: ['lesson_progress_store', 'quiz_progress_store', 'mistake_practice_store', 'flashcards_target_store', 'achievement_progress_store', 'target_stats_store'],
      productModules: ['app/cloud_sync.ts', 'app/auth_provider.ts'],
      coveredSurfaceDomains: ['cloud_sync'],
      sourceFiles: filesForDomains(surfaceEntries, ['cloud_sync']),
      storageKeys: unique((cloud.entries ?? []).map((entry) => entry.key ?? entry.keyPattern ?? '')).slice(0, 40),
      cloudActions: unique((cloud.entries ?? []).filter((entry) => entry.action !== 'keep_global').map((entry) => `${entry.key ?? entry.keyPattern}:${entry.action}`)).slice(0, 40),
      implementationSteps: [
        'Move cloud learning payloads under progress/targets/{studyTarget}.',
        'Keep global account/product state under progress/global.',
        'Restore only selected target buckets and map legacy flat cloud state to en.',
      ],
      testsRequired: [
        'Cloud restore for en does not write fr target keys.',
        'Cloud restore for fr does not overwrite en target keys.',
        'Empty local AsyncStorage cannot overwrite existing target cloud buckets.',
      ],
      rollbackNotes: [
        'Do not delete legacy cloud fields until dual-read window is complete.',
      ],
      blockers: [
        'Cloud sync mapping still has target and mixed payload blockers.',
      ],
    }),
    adapter({
      id: 'route_surface_integration',
      phase: 'P5',
      status: 'HOLD',
      risk: 'blocker',
      ownerArea: 'ui',
      dependsOn: ['production_study_target', 'lesson_progress_store', 'quiz_progress_store', 'mistake_practice_store', 'flashcards_target_store', 'achievement_progress_store'],
      productModules: ['app/_layout.tsx', 'app/(tabs)/home.tsx', 'app/(tabs)/lessons.tsx', 'app/lesson1.tsx', 'app/quizzes.tsx', 'app/mistake_practice_session.tsx', 'app/flashcards.tsx'],
      coveredSurfaceDomains: ['home_dashboard', 'lesson_list', 'lesson_runtime', 'quiz', 'mistake_practice', 'flashcards', 'achievements', 'progress_stats'],
      sourceFiles: unique(surfaceEntries.filter((surface) => surface.userFacing && surface.blockers.length > 0).map((surface) => surface.sourcePath)).slice(0, 40),
      storageKeys: [],
      cloudActions: [],
      implementationSteps: [
        'Inject production studyTarget into every user-facing learning route.',
        'Replace direct target-sensitive storage reads with adapter APIs.',
        'Keep sourceLocale switching limited to copy/explanations.',
      ],
      testsRequired: [
        'Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.',
        'No user-facing French route displays English progress after target switch.',
      ],
      rollbackNotes: [
        'Route integration should be feature-flagged so English-only app shell can stay active.',
      ],
      blockers: [
        `${num(surfaces.summary, 'blockerSurfaces')} blocker surfaces remain in current inventory.`,
      ],
    }),
    adapter({
      id: 'raw_storage_guard',
      phase: 'P5',
      status: 'HOLD',
      risk: 'blocker',
      ownerArea: 'tests',
      dependsOn: ['target_storage_key_builder'],
      productModules: ['scripts/gustav_storage_inventory.ts', 'tests/target_storage_keys.test.ts'],
      coveredSurfaceDomains: ['all'],
      sourceFiles: [],
      storageKeys: [],
      cloudActions: [],
      implementationSteps: [
        'Add CI/test gate that fails new raw target-sensitive AsyncStorage keys outside migration adapters.',
        'Update Gustav readiness gate to require adapter-plan implementation evidence, not just plan existence.',
        'Keep generated French blocked until this guard is green.',
      ],
      testsRequired: [
        'Adding AsyncStorage.getItem(`lesson${id}_progress`) outside adapter must fail guard.',
        'Migration adapter raw legacy reads are allowed by explicit allowlist only.',
      ],
      rollbackNotes: [
        'Guard can start as warning in architecture branch, then become blocking before French generation.',
      ],
      blockers: [
        'No raw storage guard exists yet.',
      ],
    }),
  ];

  const phases: Phase[] = [
    {
      id: 'P0',
      title: 'Plan-only freeze',
      status: 'HOLD',
      adapters: [],
      exitCriteria: [
        'No product runtime files are changed by this plan.',
        'Adapter plan is reviewed with storage, cloud, route and My Practice risks visible.',
      ],
    },
    {
      id: 'P1',
      title: 'Production target identity and key builder',
      status: 'HOLD',
      adapters: ['production_study_target', 'target_storage_key_builder'],
      exitCriteria: [
        'Production StudyTarget is separate from sourceLocale and dev StudyTargetLang.',
        'Target storage keys can be generated and tested for en/fr.',
      ],
    },
    {
      id: 'P2',
      title: 'Legacy English compatibility',
      status: 'HOLD',
      adapters: ['legacy_english_compat'],
      exitCriteria: [
        'Legacy flat learning state copies to en only.',
        'French reads have no legacy fallback.',
      ],
    },
    {
      id: 'P3',
      title: 'Target local stores for learning surfaces',
      status: 'HOLD',
      adapters: ['lesson_progress_store', 'lesson_session_store', 'lesson_reward_idempotency', 'level_exam_certificate_store', 'quiz_progress_store', 'mistake_practice_store', 'personal_practice_store', 'flashcards_target_store'],
      exitCriteria: [
        'Lessons, quizzes, Mistake Practice and flashcards use target-aware store APIs.',
        'Route-level target switch tests pass for en/fr.',
      ],
    },
    {
      id: 'P4',
      title: 'Cloud, achievements and stats split',
      status: 'HOLD',
      adapters: ['achievement_progress_store', 'target_stats_store', 'cloud_sync_target_buckets'],
      exitCriteria: [
        'Global versus target payloads are split.',
        'Cloud restore hydrates only selected target buckets.',
      ],
    },
    {
      id: 'P5',
      title: 'Surface integration and guards',
      status: 'HOLD',
      adapters: ['route_surface_integration', 'raw_storage_guard'],
      exitCriteria: [
        'All user-facing blocker surfaces are covered by target-aware adapters.',
        'Readiness gate returns GO for French generation.',
      ],
    },
  ];

  const productModuleSet = new Set(adapters.flatMap((entry) => entry.productModules));
  const sourceFileSet = new Set(adapters.flatMap((entry) => entry.sourceFiles));
  const storageKeySet = new Set(adapters.flatMap((entry) => entry.storageKeys));
  const blockerAdapters = adapters.filter((entry) => entry.blockers.length > 0);
  const highestRiskFiles = surfaceEntries
    .filter((surface) => surface.blockers.length > 0 || (surface.targetStorage?.records ?? 0) > 0)
    .sort((a, b) => (b.targetStorage?.records ?? 0) - (a.targetStorage?.records ?? 0) || b.blockers.length - a.blockers.length)
    .slice(0, 30)
    .map((surface) => ({
      sourcePath: surface.sourcePath,
      domain: surface.domain,
      targetStorageRecords: surface.targetStorage?.records ?? 0,
      blockers: surface.blockers.length,
    }));

  const report: Report = {
    schemaVersion: 'gustav-migration-adapter-plan-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockerAdapters.length > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      phases: phases.length,
      adapters: adapters.length,
      blockerAdapters: blockerAdapters.length,
      productModules: productModuleSet.size,
      sourceFiles: sourceFileSet.size,
      storageKeys: storageKeySet.size,
      targetStorageRecords: num(storage.summary, 'targetNamespaceRequired'),
      surfaceBlockers: num(surfaces.summary, 'blockers'),
      cloudTargetMappings: num(cloud.summary, 'targetBucketRequired'),
      localCloudDecisions: num(localCloud.summary, 'entries'),
      canStartFrenchGenerationAfterPlanOnly: false,
    },
    phases,
    adapters,
    highestRiskFiles,
    notes: [
      'This is an implementation strategy artifact, not permission to edit product runtime files.',
      'Every adapter remains HOLD until implemented and verified by tests.',
      'French generation remains blocked after this plan because planning does not equal target-safe storage/runtime implementation.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'migration_adapter_plan.json');
  const outMd = path.join(runDir, 'audits', 'migration_adapter_plan.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV migration adapter plan: ${report.status}`);
  console.log(`Adapters: ${report.summary.adapters}`);
  console.log(`Blocker adapters: ${report.summary.blockerAdapters}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
}

void main();
