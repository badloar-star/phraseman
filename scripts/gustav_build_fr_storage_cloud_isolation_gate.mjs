import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'storage');
const AUDIT_PATH = path.join(OUT_DIR, 'fr_storage_cloud_isolation_gate_audit_v1.json');

const SOURCE_PATHS = {
  targetStorageKeys: path.join(ROOT, 'app', 'target_storage_keys.ts'),
  cloudSync: path.join(ROOT, 'app', 'cloud_sync.ts'),
  studyTarget: path.join(ROOT, 'app', 'study_target.ts'),
  runtimeDeliveryGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'fr_lesson_runtime_delivery_gate_audit_v1.json'),
  targetStorageKeysTest: path.join(ROOT, 'tests', 'gustav_target_storage_keys.test.ts'),
  cloudSyncKeysTest: path.join(ROOT, 'tests', 'cloud_sync_sync_keys_validity.test.ts'),
  storageCloudPacketTest: path.join(ROOT, 'tests', 'gustav_storage_cloud_target_map_v2_packet.test.ts'),
};

const REQUIRED_FRENCH_FACTORY_REFS = [
  'unlockedLessonsKey',
  'lessonProgressKey',
  'lessonBestScoreKey',
  'lessonPassCountKey',
  'lessonListeningProgressKey',
  'lessonWordsKey',
  'levelExamKey',
  'trainerStoreKey',
  'activeRecallItemsKey',
  'mistakeLogKey',
  'personalPracticeTrainingProgressKey',
  'resolvedPersonalTrainingsKey',
  'flashcardsSavedKey',
  'flashcardsProgressKey',
  'customFlashcardsKey',
  'quizLifetimeCounterKey',
  'quizAchievementCounterKey',
  'irregularVerbsGlobalKey',
  'userStatsKey',
  'statsDailyBreakdownKey',
];

const FORBIDDEN_RUNTIME_SYNC_KEYS = [
  'study_target_v1',
  'dev_study_target_lang',
];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function sha256(filePath) {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sliceConstArray(source, constName) {
  const start = source.search(new RegExp(`export\\s+const\\s+${constName}\\s*=\\s*\\[`));
  if (start < 0) return '';
  const after = source.slice(start);
  const end = after.search(/\]\s+as\s+const\s*;/);
  return end >= 0 ? after.slice(0, end + 1) : after;
}

function quotedLiterals(source) {
  return [...source.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function countRefs(source, needles) {
  return needles.filter((needle) => source.includes(`${needle}(`));
}

function main() {
  const generatedAt = new Date().toISOString();
  const targetStorageSource = readText(SOURCE_PATHS.targetStorageKeys);
  const cloudSyncSource = readText(SOURCE_PATHS.cloudSync);
  const studyTargetSource = readText(SOURCE_PATHS.studyTarget);
  const targetStorageTest = readText(SOURCE_PATHS.targetStorageKeysTest);
  const cloudSyncKeysTest = readText(SOURCE_PATHS.cloudSyncKeysTest);
  const storageCloudPacketTest = readText(SOURCE_PATHS.storageCloudPacketTest);
  const runtimeGate = readJson(SOURCE_PATHS.runtimeDeliveryGate);

  const blockers = [];
  const warnings = [];
  const frenchTargetSyncBlock = sliceConstArray(cloudSyncSource, 'FRENCH_TARGET_SYNC_KEYS');
  const syncKeysBlock = sliceConstArray(cloudSyncSource, 'SYNC_KEYS');
  const frenchSyncSourceLocales = quotedLiterals(
    cloudSyncSource.match(/const\s+FRENCH_SYNC_SOURCE_LOCALES\s*=\s*\[([^\]]+)\]/)?.[1] || '',
  );
  const syncStudyTargets = quotedLiterals(
    cloudSyncSource.match(/const\s+SYNC_STUDY_TARGETS\s*=\s*\[([^\]]+)\]/)?.[1] || '',
  );
  const productionStudyTargets = quotedLiterals(
    studyTargetSource.match(/export\s+const\s+STUDY_TARGETS\s*=\s*\[([^\]]+)\]/)?.[1] || '',
  );
  const internalStudyTargets = quotedLiterals(
    studyTargetSource.match(/export\s+const\s+INTERNAL_STUDY_TARGETS\s*=\s*\[([^\]]+)\]/)?.[1] || '',
  );

  const exportedFactories = [...targetStorageSource.matchAll(/export function ([a-zA-Z0-9_]+)\(/g)]
    .map((match) => match[1]);
  const frenchFactoryRefs = countRefs(frenchTargetSyncBlock, REQUIRED_FRENCH_FACTORY_REFS);
  const forbiddenRuntimeSyncKeyMentions = FORBIDDEN_RUNTIME_SYNC_KEYS.filter((key) => syncKeysBlock.includes(`'${key}'`));

  const checks = {
    runtimeGateHold: runtimeGate.status === 'HOLD',
    runtimeGateDoesNotAllowApply: runtimeGate.summary?.readyForApply === false && runtimeGate.activationApproved === false,
    targetKeyDomainsDeclared: /export const TARGET_KEY_DOMAINS\s*=\s*\[/.test(targetStorageSource),
    sourceTargetDomainDeclared: /SOURCE_TARGET_KEY_DOMAINS\s*=\s*\['personal_practice'\]/.test(targetStorageSource),
    targetKeyFactoryPresent: /export function targetKey\(/.test(targetStorageSource),
    sourceTargetKeyFactoryPresent: /export function sourceTargetKey\(/.test(targetStorageSource),
    assertRawTargetFirewallPresent: /export function assertTargetKey\(/.test(targetStorageSource) &&
      /Raw target-sensitive key/.test(targetStorageSource),
    unknownStudyTargetDefaultsToEnglish: /storageStudyTarget[\s\S]*return studyTarget === 'fr' \? 'fr' : defaultStudyTarget\(\)/.test(targetStorageSource),
    unknownSourceLocaleDefaultsToRussian: /storageSourceLocale[\s\S]*return sourceLocale === 'uk' \? 'uk' : 'ru'/.test(targetStorageSource),
    frenchTargetSyncKeysDeclared: /export const FRENCH_TARGET_SYNC_KEYS\s*=\s*\[/.test(cloudSyncSource),
    frenchFactoryCoverage: frenchFactoryRefs.length >= REQUIRED_FRENCH_FACTORY_REFS.length,
    syncKeysIncludesFrenchTargetSyncKeys: /\.\.\.FRENCH_TARGET_SYNC_KEYS/.test(syncKeysBlock),
    syncStudyTargetsEnglishFrenchOnly: syncStudyTargets.join(',') === 'en,fr',
    frenchSourceLocalesRuUkOnly: frenchSyncSourceLocales.join(',') === 'ru,uk',
    productionStudyTargetsEnglishOnly: productionStudyTargets.join(',') === 'en',
    internalStudyTargetsIncludeFrench: internalStudyTargets.join(',') === 'en,fr',
    selectionKeysExcludedFromRuntimeSync: forbiddenRuntimeSyncKeyMentions.length === 0,
    runtimeSyncKeyFilterPresent: /export function getRuntimeSyncKeys/.test(cloudSyncSource) &&
      /typeof key === 'string'/.test(cloudSyncSource) &&
      /key\.length > 0/.test(cloudSyncSource),
    strictFrenchSyncKeyTestPresent: /FRENCH_TARGET_SYNC_KEYS is strictly French target scoped/.test(cloudSyncKeysTest),
    uiLocaleLeakTestPresent: /FORBIDDEN_FRENCH_TARGET_LOCALE_SEGMENTS/.test(cloudSyncKeysTest),
    legacyFlatFrenchKeyTestPresent: /LEGACY_FLAT_FRENCH_KEYS/.test(cloudSyncKeysTest),
    selectionKeysCloudExclusionTestPresent: /study target selection keys are local-only and never cloud synced/.test(cloudSyncKeysTest),
    storagePacketReadonlyTestPresent: /keeps storage\/cloud work read-only for production state/.test(storageCloudPacketTest),
  };

  for (const [name, ok] of Object.entries(checks)) {
    if (!ok) blockers.push(name);
  }

  const directLegacyRiskNotes = [];
  for (const legacy of ['unlocked_lessons', 'lesson1_progress', 'level_exam_A1_passed']) {
    if (cloudSyncSource.includes(`'${legacy}'`)) {
      directLegacyRiskNotes.push(`${legacy} remains in legacy English/cloud scope`);
    }
  }
  if (directLegacyRiskNotes.length > 0) {
    warnings.push(...directLegacyRiskNotes);
  }

  const audit = {
    schemaVersion: 'gustav-fr-storage-cloud-isolation-gate-audit-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : 'HOLD',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    sourceArtifacts: Object.fromEntries(
      Object.entries(SOURCE_PATHS).map(([key, filePath]) => [key, rel(filePath)]),
    ),
    hashes: Object.fromEntries(
      Object.entries(SOURCE_PATHS).map(([key, filePath]) => [`${key}Sha256`, sha256(filePath)]),
    ),
    summary: {
      runtimeGateStatus: runtimeGate.status,
      runtimeGateReadyForApply: runtimeGate.summary?.readyForApply === true,
      targetKeyDomains: (targetStorageSource.match(/'[^']+'/g) || []).filter((x) => x.includes('_')).length,
      exportedStorageKeyFactories: exportedFactories.length,
      requiredFrenchFactoryRefs: REQUIRED_FRENCH_FACTORY_REFS.length,
      frenchFactoryRefs: frenchFactoryRefs.length,
      missingFrenchFactoryRefs: REQUIRED_FRENCH_FACTORY_REFS.length - frenchFactoryRefs.length,
      syncStudyTargets,
      frenchSyncSourceLocales,
      productionStudyTargets,
      internalStudyTargets,
      forbiddenRuntimeSyncKeyMentions,
      checksPassed: Object.values(checks).filter(Boolean).length,
      checksTotal: Object.keys(checks).length,
      blockers: blockers.length,
      warnings: warnings.length,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      firebaseWritesOpenedByThisGate: false,
      runtimeDownloadsEnabled: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    checks,
    requiredFrenchFactoryRefs: REQUIRED_FRENCH_FACTORY_REFS,
    observedFrenchFactoryRefs: frenchFactoryRefs,
    blockers,
    warnings,
    nextRequiredGates: [
      'legacy_cloud_to_en_only_restore_gate',
      'fr_target_cloud_restore_no_english_stars_gate',
      'source_locale_switch_preserves_fr_progress_gate',
      'account_merge_global_vs_target_bucket_gate',
      'storage_migration_plan_gate',
      'cloud_sync_migration_plan_gate',
      'rollback_gate',
      'explicit_activation_approval_gate',
    ],
    safety: {
      productionAppFilesModifiedByThisScript: false,
      asyncStorageMigrationStarted: false,
      cloudSyncMigrationStarted: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(AUDIT_PATH, audit);

  console.log(`Gustav French storage/cloud isolation gate: ${audit.status}`);
  console.log(`Checks: ${audit.summary.checksPassed}/${audit.summary.checksTotal}`);
  console.log(`French factory refs: ${audit.summary.frenchFactoryRefs}/${audit.summary.requiredFrenchFactoryRefs}`);
  console.log(`Ready for apply: no`);
  console.log(rel(AUDIT_PATH));
  if (blockers.length > 0) process.exitCode = 1;
}

main();
