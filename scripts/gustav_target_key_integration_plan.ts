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
  scope?: string;
  learningState?: boolean;
  targetNamespaceRequired?: boolean;
  risk?: Risk;
};

type StorageInventory = {
  summary?: {
    records?: number;
    targetNamespaceRequired?: number;
    blockers?: number;
    highRisks?: number;
    unknownScopeRecords?: number;
  };
  records?: StorageRecord[];
};

type CloudMapping = {
  summary?: {
    mapToTarget?: number;
    mapToSourceLocale?: number;
    mapToSourceAndTarget?: number;
    blockUnknown?: number;
    targetBucketRequired?: number;
    targetSensitiveLocalKeysMissingFromCloud?: number;
  };
  entries?: Array<{
    key?: string;
    keyPattern?: string;
    action?: string;
    risk?: Risk;
    targetPath?: string;
    sourcePath?: string;
    line?: number;
  }>;
};

type LocalCloudDecisionTable = {
  summary?: {
    entries?: number;
    syncUnderTarget?: number;
    keepLocalTargetScoped?: number;
    coveredByExistingCloudPattern?: number;
    blockers?: number;
    highRisks?: number;
  };
  entries?: Array<{
    key: string;
    action: string;
    risk?: Risk;
    targetPath?: string;
    localKeyShape?: string;
    evidence?: Array<{
      sourcePath: string;
      line: number;
      operation: string;
    }>;
  }>;
};

type AchievementTaxonomy = {
  summary?: {
    total?: number;
    global?: number;
    studyTarget?: number;
    mixed?: number;
    blockers?: number;
  };
};

type DomainName =
  | 'study_target_model'
  | 'target_key_builder'
  | 'lesson_progress'
  | 'lesson_session_local'
  | 'lesson_rewards'
  | 'level_exams'
  | 'mistake_practice'
  | 'personal_practice'
  | 'achievements'
  | 'cloud_sync'
  | 'flashcards'
  | 'analytics_stats'
  | 'source_locale_preferences'
  | 'unknown_target_storage';

type FileTouchpoint = {
  sourcePath: string;
  records: number;
  examples: Array<{
    key: string;
    line: number;
    operation: string;
  }>;
};

type DomainPlan = {
  domain: DomainName;
  status: Status;
  risk: Risk;
  productModule: string;
  proposedApi: string[];
  storageShape: string[];
  fileTouchpoints: FileTouchpoint[];
  blockers: string[];
  requiredBeforeFrench: string[];
  tests: string[];
  notes: string[];
};

type Report = {
  schemaVersion: 'gustav-target-key-integration-plan-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    domains: number;
    files: number;
    rawTargetStorageRecords: number;
    cloudTargetMappings: number;
    localCloudDecisions: number;
    blockerDomains: number;
    blockers: number;
    existingDevStudyTargetFiles: number;
  };
  existingDevStudyTargetWarning: {
    status: 'HOLD';
    reason: string;
    files: string[];
    requiredBeforeFrench: string[];
  };
  phases: Array<{
    id: string;
    title: string;
    status: Status;
    requiredBeforeFrench: string[];
  }>;
  domains: DomainPlan[];
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

function stableRecordKey(record: { key?: string; keyPattern?: string }): string {
  return record.key ?? record.keyPattern ?? '';
}

function normalizeId(id: string): string {
  return id.toLowerCase();
}

function domainForRecord(record: { key?: string; keyPattern?: string; sourcePath?: string }): DomainName {
  const id = normalizeId(stableRecordKey(record));
  const file = record.sourcePath ?? '';

  if (file === 'app/cloud_sync.ts') return 'cloud_sync';
  if (id === 'lang' || id === 'app_lang' || id === 'dev_study_target_lang') return 'source_locale_preferences';
  if (id.includes('lesson${') || /^lesson\d+_/.test(id) || id === 'unlocked_lessons') {
    if (
      id.includes('cellindex') ||
      id.includes('phraseorder') ||
      id.includes('errorreplay') ||
      id.includes('intro_shown')
    ) {
      return 'lesson_session_local';
    }
    if (
      id.includes('bonus_granted') ||
      id.includes('irregular_shards_granted') ||
      id.includes('words_shards_granted') ||
      id.includes('perfect_passes')
    ) {
      return 'lesson_rewards';
    }
    return 'lesson_progress';
  }
  if (id.startsWith('level_exam_') || id === 'lingman_certificate_v1') return 'level_exams';
  if (
    id.includes('mistake_practice') ||
    id.includes('preposition_progress') ||
    id.includes('prep_drill_perfect') ||
    id.includes('pos_mastery')
  ) {
    return 'mistake_practice';
  }
  if (id.includes('diagnostic') || id.includes('open_diagnostic') || id.includes('personal_practice')) return 'personal_practice';
  if (id.includes('achievement') || id === 'achievements_state') return 'achievements';
  if (id.includes('flashcard') || id.includes('irregular_verbs') || id.includes('custom_cards')) return 'flashcards';
  if (
    id === 'daily_stats' ||
    id === 'user_stats_v1' ||
    id === 'stats_daily_breakdown_v1' ||
    id.includes('lifetime_quiz') ||
    id.includes('quiz_hard') ||
    id.includes('quiz_nav')
  ) {
    return 'analytics_stats';
  }
  return 'unknown_target_storage';
}

function touchpoints(records: StorageRecord[], domain: DomainName): FileTouchpoint[] {
  const byFile = new Map<string, StorageRecord[]>();
  for (const record of records) {
    if (!record.targetNamespaceRequired) continue;
    if (domainForRecord(record) !== domain) continue;
    const arr = byFile.get(record.sourcePath) ?? [];
    arr.push(record);
    byFile.set(record.sourcePath, arr);
  }

  return Array.from(byFile.entries())
    .map(([sourcePath, items]) => ({
      sourcePath,
      records: items.length,
      examples: items.slice(0, 4).map((item) => ({
        key: stableRecordKey(item),
        line: item.line,
        operation: item.operation,
      })),
    }))
    .sort((a, b) => b.records - a.records || a.sourcePath.localeCompare(b.sourcePath))
    .slice(0, 12);
}

function domainStatus(blockers: string[], touchpointCount: number): Status {
  if (blockers.length > 0 || touchpointCount > 0) return 'HOLD';
  return 'PASS';
}

function makeDomain(input: {
  domain: DomainName;
  records: StorageRecord[];
  productModule: string;
  proposedApi: string[];
  storageShape: string[];
  blockers: string[];
  requiredBeforeFrench: string[];
  tests: string[];
  notes?: string[];
  risk?: Risk;
}): DomainPlan {
  const fileTouchpoints = touchpoints(input.records, input.domain);
  return {
    domain: input.domain,
    status: domainStatus(input.blockers, fileTouchpoints.length),
    risk: input.risk ?? (input.blockers.length > 0 ? 'blocker' : 'high'),
    productModule: input.productModule,
    proposedApi: input.proposedApi,
    storageShape: input.storageShape,
    fileTouchpoints,
    blockers: input.blockers,
    requiredBeforeFrench: input.requiredBeforeFrench,
    tests: input.tests,
    notes: input.notes ?? [],
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Target Key Integration Plan',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Domains: ${report.summary.domains}`,
    `- Files with target storage touchpoints: ${report.summary.files}`,
    `- Raw target storage records: ${report.summary.rawTargetStorageRecords}`,
    `- Cloud target mappings: ${report.summary.cloudTargetMappings}`,
    `- Local/cloud decisions: ${report.summary.localCloudDecisions}`,
    `- Blocker domains: ${report.summary.blockerDomains}`,
    `- Blockers: ${report.summary.blockers}`,
    '',
    '## Existing Dev Study Target Warning',
    '',
    report.existingDevStudyTargetWarning.reason,
    '',
  ];
  for (const file of report.existingDevStudyTargetWarning.files) {
    lines.push(`- \`${file}\``);
  }
  lines.push('', 'Required before French:', '');
  for (const item of report.existingDevStudyTargetWarning.requiredBeforeFrench) {
    lines.push(`- ${item}`);
  }
  lines.push('', '## Phases', '');
  for (const phase of report.phases) {
    lines.push(`### ${phase.id}: ${phase.title}`);
    lines.push('');
    lines.push(`Status: \`${phase.status}\``);
    lines.push('');
    for (const item of phase.requiredBeforeFrench) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }
  lines.push('## Domains', '');
  for (const domain of report.domains) {
    lines.push(`### ${domain.domain}`);
    lines.push('');
    lines.push(`Status: \`${domain.status}\``);
    lines.push(`Risk: \`${domain.risk}\``);
    lines.push(`Product module: \`${domain.productModule}\``);
    lines.push('');
    lines.push('Proposed API:');
    for (const api of domain.proposedApi) lines.push(`- \`${api}\``);
    lines.push('');
    lines.push('Storage shape:');
    for (const shape of domain.storageShape) lines.push(`- \`${shape}\``);
    if (domain.fileTouchpoints.length > 0) {
      lines.push('', 'Top file touchpoints:');
      for (const touchpoint of domain.fileTouchpoints.slice(0, 8)) {
        const first = touchpoint.examples[0];
        lines.push(`- \`${touchpoint.sourcePath}\`: ${touchpoint.records} records; example \`${first.key}\` at line ${first.line}`);
      }
    }
    if (domain.blockers.length > 0) {
      lines.push('', 'Blockers:');
      for (const blocker of domain.blockers) lines.push(`- ${blocker}`);
    }
    lines.push('', 'Required before French:');
    for (const item of domain.requiredBeforeFrench) lines.push(`- ${item}`);
    lines.push('', 'Tests:');
    for (const test of domain.tests) lines.push(`- ${test}`);
    if (domain.notes.length > 0) {
      lines.push('', 'Notes:');
      for (const note of domain.notes) lines.push(`- ${note}`);
    }
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
    console.error('Usage: npx tsx scripts/gustav_target_key_integration_plan.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const storage = readJson<StorageInventory>(path.join(runDir, 'inputs', 'storage_key_inventory.json'));
  const cloud = readJson<CloudMapping>(path.join(runDir, 'audits', 'cloud_sync_mapping.json'));
  const localCloud = readJson<LocalCloudDecisionTable>(path.join(runDir, 'audits', 'local_cloud_decision_table.json'));
  const achievement = readJson<AchievementTaxonomy>(path.join(runDir, 'audits', 'achievement_taxonomy.json'));

  const records = storage.records ?? [];
  const targetRecords = records.filter((record) => record.targetNamespaceRequired);
  const targetFiles = new Set(targetRecords.map((record) => record.sourcePath));
  const unknownTargetTouchpoints = touchpoints(records, 'unknown_target_storage');
  const unknownTargetBlockers = unknownTargetTouchpoints.length > 0
    ? ['Any target-sensitive unknown storage record blocks French generation.']
    : [];
  const cloudTargetMappings = (cloud.entries ?? []).filter((entry) => (
    entry.action === 'map_to_target' ||
    entry.action === 'map_to_source_and_target' ||
    entry.action === 'block_unknown'
  )).length;

  const domains: DomainPlan[] = [
    makeDomain({
      domain: 'study_target_model',
      records,
      productModule: 'app/study_target.ts + components/StudyTargetContext.tsx',
      proposedApi: [
        "type StudyTarget = 'en' | 'fr'",
        'getStudyTarget(): Promise<StudyTarget>',
        'setStudyTarget(target: StudyTarget): Promise<void>',
        'useStudyTarget(): { studyTarget: StudyTarget; setStudyTarget: ... }',
      ],
      storageShape: [
        'study_target_v1',
        'legacy dev key dev_study_target_lang stays isolated until removed or renamed',
      ],
      blockers: [
        'Current StudyTargetLang is dev-only and supports en/es, not production en/fr.',
        'Existing Spanish gate helpers must not become the production multi-target model.',
      ],
      requiredBeforeFrench: [
        'Create a production StudyTarget type and provider independent from sourceLocale.',
        'Decide whether the dev Spanish target feature is removed, renamed, or guarded behind a separate adapter.',
        'Add route-level tests proving sourceLocale=ru/uk does not mutate studyTarget=fr.',
      ],
      tests: [
        'Changing app_lang from ru to uk preserves studyTarget=fr.',
        'Selecting French target does not activate Spanish dev content gates.',
      ],
      notes: [
        'This domain has few storage records because the risk is architectural, not just key count.',
      ],
    }),
    makeDomain({
      domain: 'target_key_builder',
      records,
      productModule: 'app/target_storage_keys.ts',
      proposedApi: [
        'targetKey(domain, studyTarget, id?)',
        'sourceTargetKey(domain, studyTarget, sourceLocale, id?)',
        'legacyEnglishKey(domain, id?)',
        'assertTargetKey(key)',
      ],
      storageShape: [
        '<domain>_v2::{studyTarget}',
        '<domain>_v2::{studyTarget}::{id}',
        '<domain>_v2::{studyTarget}::{sourceLocale}::{id}',
      ],
      blockers: [
        `${targetRecords.length} target-sensitive storage records still depend on raw keys or scattered templates.`,
        'No single production key builder exists for study target storage.',
      ],
      requiredBeforeFrench: [
        'Route every target-sensitive AsyncStorage key through one builder or a reviewed migration adapter.',
        'Add a lint/test guard rejecting new raw target-sensitive keys outside migration modules.',
        'Keep legacy English reads inside explicit compatibility modules only.',
      ],
      tests: [
        'Key builder returns distinct keys for en and fr for every learning domain.',
        'Raw target-sensitive key detector fails when app code adds a new flat learning key.',
      ],
    }),
    makeDomain({
      domain: 'lesson_progress',
      records,
      productModule: 'app/lesson_progress_store.ts',
      proposedApi: [
        'getLessonProgress(studyTarget, lessonId)',
        'setLessonProgress(studyTarget, lessonId, progress)',
        'getUnlockedLessons(studyTarget)',
        'recordLessonPass(studyTarget, lessonId, score)',
      ],
      storageShape: [
        'lesson_progress_v2::{studyTarget}::{lessonId}',
        'lesson_words_v2::{studyTarget}::{lessonId}',
        'unlocked_lessons_v2::{studyTarget}',
      ],
      blockers: [
        'Lesson progress, words, pass counts and unlocks are currently represented by legacy English flat keys.',
        'Cloud mapping says lesson state must move under progress/targets/{studyTarget}.',
      ],
      requiredBeforeFrench: [
        'Create a lesson progress store and migrate English legacy keys to en only.',
        'Make French lesson reads refuse legacy English fallbacks.',
        'Audit lesson order differences before mapping English lesson ids to French lesson ids.',
      ],
      tests: [
        'English legacy lesson32_progress migrates to en and not fr.',
        'French target starts with no completed lessons after English progress exists.',
      ],
    }),
    makeDomain({
      domain: 'lesson_session_local',
      records,
      productModule: 'app/lesson_session_store.ts',
      proposedApi: [
        'getLessonSession(studyTarget, lessonId)',
        'setLessonSession(studyTarget, lessonId, state)',
        'clearLessonSession(studyTarget, lessonId)',
      ],
      storageShape: [
        'lesson_session_v2::{studyTarget}::{lessonId}',
        'lesson_error_replay_v2::{studyTarget}::{lessonId}',
        'quiz_nav_level_v2::{studyTarget}',
      ],
      blockers: [
        'Local-only session keys must still be target-scoped so French cannot resume an English lesson session.',
      ],
      requiredBeforeFrench: [
        'Move cell index, phrase order, replay queue and quiz navigation into target-scoped local stores.',
        'Keep these keys out of cloud by explicit allowlist decision.',
      ],
      tests: [
        'Switching en -> fr does not reuse lesson cellIndex or phraseOrder.',
        'Cloud sync never exports local-only lesson session keys.',
      ],
    }),
    makeDomain({
      domain: 'lesson_rewards',
      records,
      productModule: 'app/reward_idempotency_store.ts',
      proposedApi: [
        'hasRewardGrant(studyTarget, rewardId)',
        'markRewardGrant(studyTarget, rewardId)',
        'rewardIdForLesson(studyTarget, lessonId, rewardType)',
      ],
      storageShape: [
        'reward_grants_v2::{studyTarget}::{rewardId}',
        'progress/targets/{studyTarget}/reward_grants',
      ],
      blockers: [
        'Flat reward/idempotency keys can double-grant or suppress rewards after target switch or cloud restore.',
      ],
      requiredBeforeFrench: [
        'Decide whether reward idempotency is local target-scoped or cloud/server target-scoped.',
        'Map legacy reward grants to English only.',
      ],
      tests: [
        'French lesson reward can be granted even if English equivalent reward key exists.',
        'Cloud restore cannot duplicate a target reward grant.',
      ],
    }),
    makeDomain({
      domain: 'level_exams',
      records,
      productModule: 'app/level_exam_store.ts',
      proposedApi: [
        'getLevelExamState(studyTarget, level)',
        'recordLevelExamResult(studyTarget, level, pct)',
        'getCertificate(studyTarget)',
      ],
      storageShape: [
        'level_exam_v2::{studyTarget}::{level}',
        'certificate_v2::{studyTarget}',
      ],
      blockers: [
        'Level exam and certificate keys are target-language proof state and cannot remain shared.',
      ],
      requiredBeforeFrench: [
        'Separate exam state and certificates by studyTarget.',
        'Decide whether French CEFR levels reuse English level ids or define a target-specific map.',
      ],
      tests: [
        'English A1 pass does not unlock French A1 certificate.',
        'French exam result writes only to fr target bucket.',
      ],
    }),
    makeDomain({
      domain: 'mistake_practice',
      records,
      productModule: 'app/mistake_practice_store.ts',
      proposedApi: [
        'loadMistakeEventJournal(accountScope, studyTarget)',
        'appendMistakeEvent(accountScope, studyTarget, event)',
        'mergeMistakeEvents(accountScope, studyTarget, events)',
      ],
      storageShape: [
        'mistake_practice_v2::{studyTarget}::{accountScope}',
      ],
      blockers: [
        'Mistake Practice events carry target words, phrases and grammar categories.',
      ],
      requiredBeforeFrench: [
        'Keep every mistake journal physically scoped by owner and studyTarget.',
      ],
      tests: [
        'English mistakes are invisible in French Mistake Practice.',
        'A late account-A append cannot write into account B.',
      ],
    }),
    makeDomain({
      domain: 'personal_practice',
      records,
      productModule: 'app/personal_practice_store.ts',
      proposedApi: [
        'getDiagnosis(studyTarget, sourceLocale)',
        'saveDiagnosis(studyTarget, sourceLocale, diagnosis)',
        'recommendPractice(studyTarget, sourceLocale, learnerState)',
      ],
      storageShape: [
        'personal_practice_v2::{studyTarget}::{sourceLocale}',
        'diagnostic_last_v2::{studyTarget}::{sourceLocale}',
        'open_diagnostic_v2::{studyTarget}',
      ],
      blockers: [
        'Personal practice must combine target-specific learner state with source-locale-specific explanations without collision.',
      ],
      requiredBeforeFrench: [
        'Store diagnosis ids as fr:<id> for French and en:<id> for legacy English.',
        'Separate recommendation state from localized feedback copy.',
      ],
      tests: [
        'Russian and Ukrainian feedback copies do not overwrite each other for the same French diagnosis.',
        'French diagnosis never reads English active recall mistakes.',
      ],
    }),
    makeDomain({
      domain: 'achievements',
      records,
      productModule: 'app/achievement_progress_store.ts',
      proposedApi: [
        'getAchievementProgress(scope, studyTarget?, id)',
        'incrementTargetAchievement(studyTarget, id, amount)',
        'incrementGlobalAchievement(id, amount)',
      ],
      storageShape: [
        'achievements_global_v2',
        'achievements_target_v2::{studyTarget}',
        'progress/targets/{studyTarget}/achievements',
      ],
      blockers: [
        `Achievement taxonomy has ${achievement.summary?.studyTarget ?? 0} target achievements and ${achievement.summary?.mixed ?? 0} mixed-policy achievements.`,
        'Flat achievements_state cannot be reused for French.',
      ],
      requiredBeforeFrench: [
        'Split achievement state into global and per-target buckets using the taxonomy.',
        'Resolve mixed achievements before cloud restore is enabled for French.',
      ],
      tests: [
        'Target achievement unlocks independently for en and fr.',
        'Global achievements remain shared only when taxonomy marks them global.',
      ],
    }),
    makeDomain({
      domain: 'cloud_sync',
      records,
      productModule: 'app/cloud_sync.ts',
      proposedApi: [
        'syncTargetProgress(studyTarget)',
        'restoreTargetProgress(studyTarget)',
        'mergeLegacyEnglishCloudIntoTargetEn()',
        'syncGlobalProgress()',
      ],
      storageShape: [
        'progress/global/*',
        'progress/targets/{studyTarget}/*',
        'progress/sourceLocales/{sourceLocale}/*',
      ],
      blockers: [
        `${cloud.summary?.targetBucketRequired ?? 0} cloud keys require target buckets.`,
        `${cloud.summary?.blockUnknown ?? 0} cloud payloads remain blocked by mixed field policy.`,
      ],
      requiredBeforeFrench: [
        'Make cloud restore/merge target-aware before any French content apply.',
        'Map legacy flat cloud progress to targets.en only.',
        'Never hydrate fr from legacy English cloud fields.',
      ],
      tests: [
        'Cloud restore for en does not write fr keys.',
        'Cloud restore for fr does not overwrite en keys.',
      ],
    }),
    makeDomain({
      domain: 'flashcards',
      records,
      productModule: 'app/flashcards/target_storage.ts',
      proposedApi: [
        'getFlashcards(studyTarget)',
        'saveFlashcard(studyTarget, card)',
        'getFlashcardProgress(studyTarget, cardId)',
      ],
      storageShape: [
        'flashcards_v2::{studyTarget}',
        'custom_flashcards_v2::{studyTarget}',
        'flashcards_progress_v2::{studyTarget}',
      ],
      blockers: [
        'Flashcard cards/progress can contain target-language fronts, translations and sourceLocale explanations.',
      ],
      requiredBeforeFrench: [
        'Add studyTarget metadata to user flashcards and system packs.',
        'Keep sourceLocale copy as card metadata, not the target namespace.',
      ],
      tests: [
        'English custom flashcard does not appear in French collection unless explicitly copied.',
        'Same sourceLocale card copy can exist under different study targets.',
      ],
    }),
    makeDomain({
      domain: 'analytics_stats',
      records,
      productModule: 'app/target_stats_store.ts',
      proposedApi: [
        'recordTargetLearningEvent(studyTarget, event)',
        'recordGlobalEngagementEvent(event)',
        'getTargetStats(studyTarget)',
        'getGlobalStats()',
      ],
      storageShape: [
        'stats_global_v2',
        'stats_target_v2::{studyTarget}',
        'daily_stats_target_v2::{studyTarget}',
      ],
      blockers: [
        'daily_stats, user_stats_v1 and stats_daily_breakdown_v1 mix product/global and target-learning metrics.',
      ],
      requiredBeforeFrench: [
        'Split analytics fields by target/global policy before sync.',
        'Decide whether XP remains account-global while learning counters become target-specific.',
      ],
      tests: [
        'French words/phrases/quizzes do not increment English target stats.',
        'Global engagement counters stay global after target switch.',
      ],
    }),
    makeDomain({
      domain: 'source_locale_preferences',
      records,
      productModule: 'components/LangContext.tsx + app/source_locales.ts',
      proposedApi: [
        'getSourceLocale()',
        'setSourceLocale(sourceLocale)',
        'localizedCopyFor(sourceLocale, studyTarget, contentId)',
      ],
      storageShape: [
        'app_lang',
        'progress/sourceLocales/{sourceLocale}/preferences',
      ],
      blockers: [
        'Source/interface locale must stay separate from study target in all generated French material.',
      ],
      requiredBeforeFrench: [
        'French content must provide Russian and Ukrainian source copy without changing target progress buckets.',
        'Generated content ids must be stable across sourceLocale translations.',
      ],
      tests: [
        'Switch ru -> uk changes explanations only, not French lesson state.',
        'Same French content id resolves to different sourceLocale copy maps.',
      ],
    }),
    makeDomain({
      domain: 'unknown_target_storage',
      records,
      productModule: 'no product module until classified',
      proposedApi: [
        'classifyUnknownTargetStorage(record)',
      ],
      storageShape: [
        'blocked until each unknown receives a reviewed target/global/source scope',
      ],
      blockers: unknownTargetBlockers,
      requiredBeforeFrench: [
        'Classify all unknown target storage records or add explicit reviewed exceptions.',
      ],
      tests: [
        'Storage inventory reports zero unknown target-sensitive learning keys.',
      ],
      risk: unknownTargetTouchpoints.length > 0 ? 'blocker' : 'medium',
    }),
  ];

  const blockers = domains.reduce((sum, domain) => sum + domain.blockers.length, 0);
  const blockerDomains = domains.filter((domain) => domain.status !== 'PASS' || domain.risk === 'blocker').length;
  const report: Report = {
    schemaVersion: 'gustav-target-key-integration-plan-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      domains: domains.length,
      files: targetFiles.size,
      rawTargetStorageRecords: targetRecords.length,
      cloudTargetMappings,
      localCloudDecisions: localCloud.summary?.entries ?? 0,
      blockerDomains,
      blockers,
      existingDevStudyTargetFiles: 8,
    },
    existingDevStudyTargetWarning: {
      status: 'HOLD',
      reason: 'PhraseMan already contains a dev-only StudyTargetLang path for en/es. Gustav must not treat it as the production multi-language target model for French.',
      files: [
        'app/study_target_lang_dev.ts',
        'components/StudyTargetContext.tsx',
        'app/spanish_content_gate.ts',
        'app/lesson_data_all.ts',
        'app/lesson_intro_screens.tsx',
        'app/(tabs)/settings.tsx',
        'app/flashcards_collection.tsx',
        'app/_admin_intro_preview.tsx',
      ],
      requiredBeforeFrench: [
        'Rename or isolate dev StudyTargetLang from production StudyTarget.',
        'Define production StudyTarget as en/fr before any target-aware storage migration.',
        'Audit all imports of StudyTargetLang so French does not inherit Spanish dev gates.',
      ],
    },
    phases: [
      {
        id: 'P0',
        title: 'Freeze inventory and block product writes',
        status: 'HOLD',
        requiredBeforeFrench: [
          'Keep Gustav in run-only artifact mode until target storage design is approved.',
          'Re-run storage, cloud and target integration validators after any app storage change.',
        ],
      },
      {
        id: 'P1',
        title: 'Introduce production StudyTarget and key builder',
        status: 'HOLD',
        requiredBeforeFrench: [
          'Add production StudyTarget model independent from sourceLocale and dev Spanish target.',
          'Create target key builder and raw-key guard tests.',
        ],
      },
      {
        id: 'P2',
        title: 'Migrate English compatibility only',
        status: 'HOLD',
        requiredBeforeFrench: [
          'Copy legacy flat learning keys to en target buckets without deleting rollback keys.',
          'Prove fr reads do not fallback to legacy English keys.',
        ],
      },
      {
        id: 'P3',
        title: 'Target-aware cloud restore and local-only policy',
        status: 'HOLD',
        requiredBeforeFrench: [
          'Split cloud payloads by global/sourceLocale/studyTarget policy.',
          'Document local-only target-scoped keys and exclude them from cloud sync.',
        ],
      },
      {
        id: 'P4',
        title: 'Enable content generation gate',
        status: 'HOLD',
        requiredBeforeFrench: [
          'Allow French generation only after storage, cloud, trainer and personal-practice gates are green.',
          'Keep generated French content in a closed run container until app apply is explicitly approved.',
        ],
      },
    ],
    domains,
    notes: [
      'This artifact is an integration plan, not a product migration.',
      'It intentionally blocks French while production target storage, cloud restore and personal practice isolation are missing.',
      'The current English base remains the reference source, but legacy English storage must be mapped to en only.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'target_key_integration_plan.json');
  const outMd = path.join(runDir, 'audits', 'target_key_integration_plan.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV target key integration plan: ${report.status}`);
  console.log(`Domains: ${report.summary.domains}`);
  console.log(`Raw target storage records: ${report.summary.rawTargetStorageRecords}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
}

void main();
