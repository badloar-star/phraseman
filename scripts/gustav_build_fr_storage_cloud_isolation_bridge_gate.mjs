import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'storage', 'fr_storage_cloud_isolation_gate_audit_v1.json');
const OUT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'storage', 'fr_storage_cloud_isolation_bridge_gate_v1.json');

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function main() {
  const generatedAt = new Date().toISOString();
  const audit = readJson(AUDIT_PATH);
  const blockers = [];

  if (audit.schemaVersion !== 'gustav-fr-storage-cloud-isolation-gate-audit-v1') blockers.push('AUDIT_SCHEMA_MISMATCH');
  if (audit.status !== 'HOLD') blockers.push('AUDIT_STATUS_NOT_HOLD');
  if (audit.studyTarget !== 'fr') blockers.push('STUDY_TARGET_NOT_FR');
  if (audit.activationApproved !== false) blockers.push('ACTIVATION_NOT_FALSE');
  if (audit.summary?.checksPassed !== audit.summary?.checksTotal) blockers.push('NOT_ALL_STORAGE_CLOUD_CHECKS_PASS');
  if (audit.summary?.blockers !== 0 || audit.blockers?.length !== 0) blockers.push('AUDIT_HAS_BLOCKERS');
  if (audit.summary?.requiredFrenchFactoryRefs !== audit.summary?.frenchFactoryRefs) blockers.push('FRENCH_FACTORY_REFS_INCOMPLETE');
  if (audit.summary?.missingFrenchFactoryRefs !== 0) blockers.push('MISSING_FRENCH_FACTORY_REFS');
  if (audit.summary?.forbiddenRuntimeSyncKeyMentions?.length !== 0) blockers.push('LOCAL_SELECTION_KEYS_CLOUD_SYNCED');
  if (JSON.stringify(audit.summary?.syncStudyTargets) !== JSON.stringify(['en', 'fr'])) blockers.push('SYNC_STUDY_TARGETS_NOT_EN_FR');
  if (JSON.stringify(audit.summary?.frenchSyncSourceLocales) !== JSON.stringify(['ru', 'uk'])) blockers.push('FRENCH_SOURCE_LOCALES_NOT_RU_UK');
  if (JSON.stringify(audit.summary?.productionStudyTargets) !== JSON.stringify(['en'])) blockers.push('PRODUCTION_STUDY_TARGETS_NOT_EN_ONLY');
  if (JSON.stringify(audit.summary?.internalStudyTargets) !== JSON.stringify(['en', 'fr'])) blockers.push('INTERNAL_STUDY_TARGETS_NOT_EN_FR');
  if (audit.summary?.storageMigrationAllowed !== false) blockers.push('STORAGE_MIGRATION_OPEN');
  if (audit.summary?.cloudSyncMigrationAllowed !== false) blockers.push('CLOUD_SYNC_MIGRATION_OPEN');
  if (audit.summary?.firebaseWritesOpenedByThisGate !== false) blockers.push('FIREBASE_WRITES_OPEN');
  if (audit.summary?.runtimeDownloadsEnabled !== false) blockers.push('RUNTIME_DOWNLOADS_OPEN');
  if (audit.summary?.readyForApply !== false) blockers.push('READY_FOR_APPLY_TRUE');
  if (audit.safety?.productionAppFilesModifiedByThisScript !== false) blockers.push('PRODUCTION_APP_FILES_MODIFIED');

  const gate = {
    schemaVersion: 'gustav-fr-storage-cloud-isolation-bridge-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS_ISOLATION_READY_GLOBAL_FRENCH_HOLD' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    surface: 'storage_cloud_runtime_isolation',
    activationApproved: false,
    globalFrenchActivationApproved: false,
    readyForApply: false,
    readyForRuntimeDownloads: false,
    inputs: {
      storageCloudAudit: rel(AUDIT_PATH),
    },
    summary: {
      checksPassed: audit.summary?.checksPassed,
      checksTotal: audit.summary?.checksTotal,
      targetKeyDomains: audit.summary?.targetKeyDomains,
      exportedStorageKeyFactories: audit.summary?.exportedStorageKeyFactories,
      requiredFrenchFactoryRefs: audit.summary?.requiredFrenchFactoryRefs,
      frenchFactoryRefs: audit.summary?.frenchFactoryRefs,
      missingFrenchFactoryRefs: audit.summary?.missingFrenchFactoryRefs,
      syncStudyTargets: audit.summary?.syncStudyTargets,
      frenchSyncSourceLocales: audit.summary?.frenchSyncSourceLocales,
      productionStudyTargets: audit.summary?.productionStudyTargets,
      internalStudyTargets: audit.summary?.internalStudyTargets,
      forbiddenRuntimeSyncKeyMentions: audit.summary?.forbiddenRuntimeSyncKeyMentions,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      globalFrenchStillHold: true,
    },
    invariants: {
      targetStorageFactoriesComplete: audit.summary?.requiredFrenchFactoryRefs === audit.summary?.frenchFactoryRefs,
      noMissingFrenchFactoryRefs: audit.summary?.missingFrenchFactoryRefs === 0,
      noSelectionKeysInRuntimeSync: audit.summary?.forbiddenRuntimeSyncKeyMentions?.length === 0,
      frenchCloudSyncSourceLocaleScoped: JSON.stringify(audit.summary?.frenchSyncSourceLocales) === JSON.stringify(['ru', 'uk']),
      productionStudyTargetsRemainEnglishOnly: JSON.stringify(audit.summary?.productionStudyTargets) === JSON.stringify(['en']),
      internalFrenchTargetAvailableForGates: JSON.stringify(audit.summary?.internalStudyTargets) === JSON.stringify(['en', 'fr']),
      legacyCloudRestoreDoesNotPolluteFrench: audit.checks?.frenchLegacyCloudDoesNotRestoreToFrenchTestPresent === true,
      uiLocaleDoesNotControlStudyTargetStorage: audit.checks?.uiLocaleLeakTestPresent === true,
      storageMigrationClosed: audit.summary?.storageMigrationAllowed === false,
      cloudSyncMigrationClosed: audit.summary?.cloudSyncMigrationAllowed === false,
      runtimeDownloadsClosed: audit.summary?.runtimeDownloadsEnabled === false,
      activationRemainsClosed: true,
    },
    blockers,
    nextRequiredGlobalSteps: [
      'Keep runtime downloads closed until every French content/server/admin gate is ready.',
      'Open storage/cloud migration only through a separately approved migration/rollback gate.',
      'Keep production study target list English-only until explicit French production activation.',
    ],
  };

  writeJson(OUT_PATH, gate);
  console.log(`${gate.status} ${rel(OUT_PATH)} checks=${gate.summary.checksPassed}/${gate.summary.checksTotal} blockers=${blockers.length}`);
}

main();
