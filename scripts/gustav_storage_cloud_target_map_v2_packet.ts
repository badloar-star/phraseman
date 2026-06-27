import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  accepted: boolean;
  blockers: number;
  passed: boolean;
};

type StorageCloudContract = {
  schemaVersion: 'gustav-storage-cloud-target-map-v2';
  runId: string;
  generatedAt: string;
  studyTarget: 'fr';
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  sourceArtifacts: Record<string, string>;
  upstreamRuntimeContract: {
    path: string;
    status: string;
    readyForStorageCloudTargetMapV2: boolean;
    sha256: string;
  };
  targetStorageKeyContract: {
    targetKeyDomains: string[];
    sourceTargetKeyDomains: string[];
    targetScopedPatternHasFrench: boolean;
    sourceScopedPatternHasRuUk: boolean;
    rawTargetSensitiveFirewallPresent: boolean;
    storageStudyTargetDefaultsUnknownToEnglish: boolean;
    storageSourceLocaleDefaultsUnknownToRussian: boolean;
    exportedStorageKeyFactories: string[];
    scopedStorageKeyFactories: string[];
    aiDerivedStorageFactories: string[];
  };
  cloudSyncContract: {
    frenchTargetSyncKeysDeclared: boolean;
    frenchTargetSyncKeyFactoryRefs: number;
    frenchTargetSyncKeysRejectEnglishRefs: boolean;
    frenchTargetSyncKeysRejectSpanishRefs: boolean;
    syncKeysIncludesFrenchTargetSyncKeys: boolean;
    syncStudyTargetsIncludeEnglishFrench: boolean;
    frenchSyncSourceLocalesIncludeRuUkOnly: boolean;
    frenchCloudDailyTaskSnapshotKeysAreTargetScoped: boolean;
    removeCloudOnlyDailyTaskSnapshotsDeletesFrenchSnapshots: boolean;
    addTodayDailyTaskSnapshotsUploadsFrenchToday: boolean;
    stickyRestoreUsesFrenchTargetSyncKeys: boolean;
    restoreWritesFrenchDailyTasksToTargetScopedKey: boolean;
    fullRestoreReconcilesFrenchDailyTasks: boolean;
    accountWipeUsesSyncStudyTargets: boolean;
    accountWipeIncludesFrenchCommunityDraftUk: boolean;
    forceSyncUsesRuntimeSyncKeys: boolean;
    forceSyncRemovesCloudOnlySnapshots: boolean;
    forceSyncAddsTodayDailySnapshots: boolean;
  };
  testedSurfaces: Array<{
    testPath: string;
    evidence: string[];
  }>;
  migrationPolicy: {
    storageMigrationAllowed: false;
    cloudSyncMigrationAllowed: false;
    firebaseWritesOpenedByThisPacket: false;
    asyncStorageWritesOpenedByThisPacket: false;
    reviewerDecisionImportAllowed: false;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
  };
  productionBlockerMap: Array<{
    blockerId: string;
    area: string;
    status: 'blocked';
    evidence: string;
    nextUnblockArtifact: string;
  }>;
};

type Report = {
  schemaVersion: 'gustav-storage-cloud-target-map-v2-packet-v0';
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
    targetLocale: 'fr';
    sourceLocales: number;
    upstreamRuntimeContractReady: boolean;
    storageCloudTargetMapCreated: boolean;
    targetKeyDomains: number;
    sourceTargetKeyDomains: number;
    exportedStorageKeyFactories: number;
    scopedStorageKeyFactories: number;
    aiDerivedStorageFactories: number;
    targetScopedPatternHasFrench: boolean;
    sourceScopedPatternHasRuUk: boolean;
    rawTargetSensitiveFirewallPresent: boolean;
    storageStudyTargetDefaultsUnknownToEnglish: boolean;
    storageSourceLocaleDefaultsUnknownToRussian: boolean;
    frenchTargetSyncKeysDeclared: boolean;
    frenchTargetSyncKeyFactoryRefs: number;
    frenchTargetSyncKeysRejectEnglishRefs: boolean;
    frenchTargetSyncKeysRejectSpanishRefs: boolean;
    syncKeysIncludesFrenchTargetSyncKeys: boolean;
    syncStudyTargetsIncludeEnglishFrench: boolean;
    frenchSyncSourceLocalesIncludeRuUkOnly: boolean;
    frenchCloudDailyTaskSnapshotKeysAreTargetScoped: boolean;
    removeCloudOnlyDailyTaskSnapshotsDeletesFrenchSnapshots: boolean;
    addTodayDailyTaskSnapshotsUploadsFrenchToday: boolean;
    stickyRestoreUsesFrenchTargetSyncKeys: boolean;
    restoreWritesFrenchDailyTasksToTargetScopedKey: boolean;
    fullRestoreReconcilesFrenchDailyTasks: boolean;
    accountWipeUsesSyncStudyTargets: boolean;
    accountWipeIncludesFrenchCommunityDraftUk: boolean;
    forceSyncUsesRuntimeSyncKeys: boolean;
    forceSyncRemovesCloudOnlySnapshots: boolean;
    forceSyncAddsTodayDailySnapshots: boolean;
    testedSurfaceFiles: number;
    testedEvidenceChecks: number;
    storageMigrationAllowed: boolean;
    cloudSyncMigrationAllowed: boolean;
    firebaseWritesOpenedByThisPacket: boolean;
    asyncStorageWritesOpenedByThisPacket: boolean;
    activationApprovedFlags: number;
    readyForApplyOpenFlags: number;
    productionBlockers: number;
    fixtureProbesPassed: number;
    fixtureProbes: number;
    readyForAdminPackDeliverySurfaceV2: boolean;
    readyForGenerationV2: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    blockers: number;
    warnings: number;
  };
  artifactHashes: Record<string, string>;
  contract: StorageCloudContract;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    storageMigrationStarted: false;
    cloudSyncMigrationStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

type JsonObject = Record<string, unknown>;

const SOURCE_LOCALES = ['ru', 'uk'] as const;
const SOURCE_FILES = {
  targetStorageKeys: 'app/target_storage_keys.ts',
  cloudSync: 'app/cloud_sync.ts',
  studyTarget: 'app/study_target.ts',
  runtimeServerDeliveryContractV2Packet: 'audits/runtime_server_delivery_contract_v2_packet.json',
  targetStorageKeyTest: 'tests/gustav_target_storage_keys.test.ts',
  cloudSyncDailyTasksMergeTest: 'tests/cloud_sync_daily_tasks_merge.test.ts',
  cloudSyncSyncKeysValidityTest: 'tests/cloud_sync_sync_keys_validity.test.ts',
  cloudMixedPayloadTargetStatsTest: 'tests/gustav_cloud_mixed_payload_target_stats.test.ts',
  cloudSyncIntroLocalOnlyTest: 'tests/cloud_sync_intro_local_only.test.ts',
  personalPracticeTargetIsolationTest: 'tests/gustav_personal_practice_target_isolation.test.ts',
} as const;

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

function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
  return false;
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function quotedArray(source: string, constName: string): string[] {
  const match = source.match(new RegExp(`(?:export\\s+)?const\\s+${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function sourceSlice(source: string, startNeedle: string, endNeedle: string): string {
  const start = source.indexOf(startNeedle);
  if (start < 0) return '';
  const end = source.indexOf(endNeedle, start);
  return end < 0 ? source.slice(start) : source.slice(start, end + endNeedle.length);
}

function functionBody(source: string, functionName: string): string {
  const index = source.indexOf(`function ${functionName}`);
  if (index < 0) return '';
  const next = source.indexOf('\nexport function ', index + 1);
  const defaultExport = source.indexOf('\nexport default ', index + 1);
  const endCandidates = [next, defaultExport].filter((value) => value > index);
  const end = endCandidates.length > 0 ? Math.min(...endCandidates) : source.length;
  return source.slice(index, end);
}

function exportedStorageKeyFactories(targetStorageSource: string): string[] {
  return [...targetStorageSource.matchAll(/export function ([A-Za-z0-9_]*Key)\s*\(/g)]
    .map((match) => match[1])
    .filter((name) => name !== 'assertTargetKey')
    .sort();
}

function scopedStorageKeyFactories(targetStorageSource: string, names: string[]): string[] {
  return names.filter((name) => {
    const body = functionBody(targetStorageSource, name);
    return /scopedOrLegacyKey|scopedSourceTargetOrLegacyKey|sourceTargetKey|targetKey/.test(body);
  });
}

function aiDerivedStorageFactories(names: string[]): string[] {
  const aiNames = new Set([
    'mistakeLogKey',
    'weeklyReviewStorageKey',
    'statsInsightsStorageKey',
    'trainerStoreKey',
    'activeRecallItemsKey',
    'posMasteryKey',
    'personalPracticeTrainingProgressKey',
    'personalPracticeFreeAccessKey',
    'resolvedPersonalTrainingsKey',
  ]);
  return names.filter((name) => aiNames.has(name));
}

function testedSurfaces(repoRoot: string): StorageCloudContract['testedSurfaces'] {
  const tests = [
    SOURCE_FILES.targetStorageKeyTest,
    SOURCE_FILES.cloudSyncDailyTasksMergeTest,
    SOURCE_FILES.cloudSyncSyncKeysValidityTest,
    SOURCE_FILES.cloudMixedPayloadTargetStatsTest,
    SOURCE_FILES.cloudSyncIntroLocalOnlyTest,
    SOURCE_FILES.personalPracticeTargetIsolationTest,
  ];
  return tests
    .filter((relativePath) => fs.existsSync(path.join(repoRoot, relativePath)))
    .map((relativePath) => {
      const source = readText(path.join(repoRoot, relativePath));
      const evidence = [
        source.includes('assertTargetKey') ? 'raw-target-sensitive firewall assertions' : '',
        source.includes('FRENCH_TARGET_SYNC_KEYS') ? 'French cloud sync allowlist assertions' : '',
        source.includes('personalPracticeTrainingProgressKey') ? 'personal practice sourceLocale scoped assertions' : '',
        source.includes('statsDailyBreakdownKey') || source.includes('userStatsKey') ? 'target stats isolation assertions' : '',
        source.includes('lessonIntroShownKey') ? 'intro local-only policy assertions' : '',
      ].filter(Boolean);
      return { testPath: relativePath, evidence };
    });
}

function buildProductionBlockers(): StorageCloudContract['productionBlockerMap'] {
  return [
    {
      blockerId: 'P11-STORAGE-001-storage-migration-plan-not-approved',
      area: 'storage',
      status: 'blocked',
      evidence: 'P11 maps namespaces only; no AsyncStorage migration command or apply approval exists.',
      nextUnblockArtifact: 'audits/storage_migration_dry_run_v2_packet.json',
    },
    {
      blockerId: 'P11-CLOUD-001-firestore-rules-not-verified-for-fr-target-keys',
      area: 'cloud_sync',
      status: 'blocked',
      evidence: 'French target keys are mapped, but Firestore rules and server-owned field policy still require a target-key specific gate.',
      nextUnblockArtifact: 'audits/cloud_rules_target_key_policy_v2_packet.json',
    },
    {
      blockerId: 'P11-CLOUD-002-restore-conflict-policy-not-llm-official-source-approved',
      area: 'cloud_sync',
      status: 'blocked',
      evidence: 'Sticky restore behavior is mapped, but production activation requires reviewer-approved conflict policy evidence.',
      nextUnblockArtifact: 'audits/cloud_restore_conflict_policy_v2_packet.json',
    },
    {
      blockerId: 'P11-ADMIN-001-admin-delivery-surfaces-not-approved',
      area: 'admin',
      status: 'blocked',
      evidence: 'Admin preview/import/upload surfaces are not yet bound to storage/cloud target namespaces.',
      nextUnblockArtifact: 'audits/admin_pack_delivery_surface_v2_packet.json',
    },
    {
      blockerId: 'P11-REVIEWER-001-v2-decisions-not-imported',
      area: 'reviewer_import',
      status: 'blocked',
      evidence: 'Reviewer decisions remain templates only; no approved import exists.',
      nextUnblockArtifact: 'audits/reviewer_decision_import_v2_dry_run.json',
    },
    {
      blockerId: 'P11-PAYLOAD-001-runtime-payload-shards-not-materialized',
      area: 'pack_payload',
      status: 'blocked',
      evidence: 'Storage/cloud map does not create downloadable French payload shards.',
      nextUnblockArtifact: 'pack_candidates/fr/runtime_slices/*',
    },
    {
      blockerId: 'P11-SERVER-001-server-manifest-not-published',
      area: 'server_delivery',
      status: 'blocked',
      evidence: 'No Firebase/server manifest is uploaded or enabled.',
      nextUnblockArtifact: 'audits/server_delivery_manifest_v2_packet.json',
    },
    {
      blockerId: 'P11-RUNTIME-001-runtime-downloads-still-disabled',
      area: 'runtime_loader',
      status: 'blocked',
      evidence: 'COURSE_PACK_REMOTE_LOADING_ENABLED remains false and no runtime cache activation exists.',
      nextUnblockArtifact: 'audits/runtime_download_activation_gate_v2.json',
    },
    {
      blockerId: 'P11-ACTIVATION-001-activation-not-approved',
      area: 'activation',
      status: 'blocked',
      evidence: 'activationApproved remains false until all gates, rollback and explicit apply approval exist.',
      nextUnblockArtifact: 'apply_plan/APPLY_PLAN.md',
    },
  ];
}

function buildContract(repoRoot: string, runDir: string): StorageCloudContract {
  const runId = path.basename(runDir);
  const targetStoragePath = path.join(repoRoot, SOURCE_FILES.targetStorageKeys);
  const cloudSyncPath = path.join(repoRoot, SOURCE_FILES.cloudSync);
  const runtimePacketPath = path.join(runDir, SOURCE_FILES.runtimeServerDeliveryContractV2Packet);
  const targetStorageSource = readText(targetStoragePath);
  const cloudSyncSource = readText(cloudSyncPath);
  const runtimePacket = object(readJson<unknown>(runtimePacketPath));
  const runtimeSummary = object(runtimePacket.summary);

  const keyFactories = exportedStorageKeyFactories(targetStorageSource);
  const scopedFactories = scopedStorageKeyFactories(targetStorageSource, keyFactories);
  const frenchSyncSlice = sourceSlice(cloudSyncSource, 'export const FRENCH_TARGET_SYNC_KEYS', '] as const;');
  const syncKeysSlice = sourceSlice(cloudSyncSource, 'export const SYNC_KEYS', '] as const;');
  const accountWipeSlice = functionBody(cloudSyncSource, 'accountLocalDataKeysForToday');
  const addTodaySlice = functionBody(cloudSyncSource, 'addTodayDailyTaskSnapshots');
  const removeSnapshotsSlice = functionBody(cloudSyncSource, 'removeCloudOnlyDailyTaskSnapshots');
  const stickyRestoreSlice = functionBody(cloudSyncSource, 'buildFrenchTargetStickyRestorePairs');
  const forceSyncSlice = functionBody(cloudSyncSource, 'forceSyncToCloud');

  return {
    schemaVersion: 'gustav-storage-cloud-target-map-v2',
    runId,
    generatedAt: new Date().toISOString(),
    studyTarget: 'fr',
    targetLocale: 'fr',
    sourceLocales: ['ru', 'uk'],
    sourceArtifacts: {
      targetStorageKeys: SOURCE_FILES.targetStorageKeys,
      cloudSync: SOURCE_FILES.cloudSync,
      studyTarget: SOURCE_FILES.studyTarget,
      runtimeServerDeliveryContractV2Packet: rel(repoRoot, runtimePacketPath),
    },
    upstreamRuntimeContract: {
      path: rel(repoRoot, runtimePacketPath),
      status: s(runtimePacket, 'status'),
      readyForStorageCloudTargetMapV2: b(runtimeSummary, 'readyForStorageCloudTargetMapV2'),
      sha256: sha256(runtimePacketPath),
    },
    targetStorageKeyContract: {
      targetKeyDomains: quotedArray(targetStorageSource, 'TARGET_KEY_DOMAINS'),
      sourceTargetKeyDomains: quotedArray(targetStorageSource, 'SOURCE_TARGET_KEY_DOMAINS'),
      targetScopedPatternHasFrench: /TARGET_SCOPED_KEY_PATTERN[\s\S]*\(\?:en\|fr\)/.test(targetStorageSource),
      sourceScopedPatternHasRuUk: /personal_practice_v2::[\s\S]*\(\?:ru\|uk\)/.test(targetStorageSource),
      rawTargetSensitiveFirewallPresent:
        targetStorageSource.includes('RAW_TARGET_SENSITIVE_PATTERNS') &&
        targetStorageSource.includes('Raw target-sensitive key is blocked'),
      storageStudyTargetDefaultsUnknownToEnglish:
        functionBody(targetStorageSource, 'storageStudyTarget').includes("studyTarget === 'fr' ? 'fr' : defaultStudyTarget()"),
      storageSourceLocaleDefaultsUnknownToRussian:
        functionBody(targetStorageSource, 'storageSourceLocale').includes("sourceLocale === 'uk' ? 'uk' : 'ru'"),
      exportedStorageKeyFactories: keyFactories,
      scopedStorageKeyFactories: scopedFactories,
      aiDerivedStorageFactories: aiDerivedStorageFactories(keyFactories),
    },
    cloudSyncContract: {
      frenchTargetSyncKeysDeclared: frenchSyncSlice.length > 0,
      frenchTargetSyncKeyFactoryRefs: (frenchSyncSlice.match(/Key\(/g) ?? []).length,
      frenchTargetSyncKeysRejectEnglishRefs: !/Key\([^)]*'en'/.test(frenchSyncSlice),
      frenchTargetSyncKeysRejectSpanishRefs: !/::es|'es'|\.es\b/.test(frenchSyncSlice),
      syncKeysIncludesFrenchTargetSyncKeys: syncKeysSlice.includes('...FRENCH_TARGET_SYNC_KEYS'),
      syncStudyTargetsIncludeEnglishFrench: /\['en',\s*'fr'\]\s+as const/.test(cloudSyncSource),
      frenchSyncSourceLocalesIncludeRuUkOnly: /FRENCH_SYNC_SOURCE_LOCALES\s*=\s*\['ru',\s*'uk'\]\s+as const/.test(cloudSyncSource),
      frenchCloudDailyTaskSnapshotKeysAreTargetScoped:
        cloudSyncSource.includes("targetKey('cloud_sync', 'fr', 'daily_tasks_progress')") &&
        cloudSyncSource.includes("targetKey('cloud_sync', 'fr', 'daily_tasks_progress_day')"),
      removeCloudOnlyDailyTaskSnapshotsDeletesFrenchSnapshots:
        removeSnapshotsSlice.includes('FRENCH_CLOUD_DAILY_TASKS_PROGRESS_KEY') &&
        removeSnapshotsSlice.includes('FRENCH_CLOUD_DAILY_TASKS_PROGRESS_DAY_KEY'),
      addTodayDailyTaskSnapshotsUploadsFrenchToday:
        addTodaySlice.includes("dailyTasksProgressKey(todayKey, 'fr')") &&
        addTodaySlice.includes('data[FRENCH_CLOUD_DAILY_TASKS_PROGRESS_KEY]'),
      stickyRestoreUsesFrenchTargetSyncKeys:
        stickyRestoreSlice.includes('FRENCH_TARGET_SYNC_KEYS.filter') &&
        stickyRestoreSlice.includes('AsyncStorage.multiGet([...restorableKeys])'),
      restoreWritesFrenchDailyTasksToTargetScopedKey:
        cloudSyncSource.includes("dailyTasksProgressKey(getTodayKey(), 'fr')"),
      fullRestoreReconcilesFrenchDailyTasks:
        cloudSyncSource.includes("fullRestoreDailyTargets.push('fr')") &&
        cloudSyncSource.includes('reconcileRestoredDayDailyStorageIfNeeded(fullRestoreDailyTargets)'),
      accountWipeUsesSyncStudyTargets:
        accountWipeSlice.includes('SYNC_STUDY_TARGETS.flatMap((target)'),
      accountWipeIncludesFrenchCommunityDraftUk:
        accountWipeSlice.includes("target === 'fr' ? [communityPackCreateDraftKey(target, 'uk')]"),
      forceSyncUsesRuntimeSyncKeys:
        forceSyncSlice.includes('AsyncStorage.multiGet(getRuntimeSyncKeys())'),
      forceSyncRemovesCloudOnlySnapshots:
        forceSyncSlice.includes('removeCloudOnlyDailyTaskSnapshots(data)'),
      forceSyncAddsTodayDailySnapshots:
        forceSyncSlice.includes('await addTodayDailyTaskSnapshots(data)'),
    },
    testedSurfaces: testedSurfaces(repoRoot),
    migrationPolicy: {
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      firebaseWritesOpenedByThisPacket: false,
      asyncStorageWritesOpenedByThisPacket: false,
      reviewerDecisionImportAllowed: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    productionBlockerMap: buildProductionBlockers(),
  };
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function validateContract(contract: StorageCloudContract): Finding[] {
  const findings: Finding[] = [];
  if (contract.schemaVersion !== 'gustav-storage-cloud-target-map-v2') {
    addFinding(findings, 'blocker', 'schema_version_invalid', 'Storage/cloud target map schema is invalid.');
  }
  if (contract.studyTarget !== 'fr' || contract.targetLocale !== 'fr') {
    addFinding(findings, 'blocker', 'target_not_fr', 'P11 is scoped to studyTarget=fr only.');
  }
  for (const locale of SOURCE_LOCALES) {
    if (!contract.sourceLocales.includes(locale)) {
      addFinding(findings, 'blocker', 'source_locale_missing', `Missing source locale: ${locale}.`);
    }
  }
  if (!contract.upstreamRuntimeContract.readyForStorageCloudTargetMapV2) {
    addFinding(findings, 'blocker', 'upstream_runtime_contract_not_ready', 'P10 runtime/server delivery contract is not ready for P11.');
  }
  if (contract.targetStorageKeyContract.targetKeyDomains.length < 10) {
    addFinding(findings, 'blocker', 'target_key_domains_too_few', 'Target storage domains are unexpectedly small.');
  }
  if (!contract.targetStorageKeyContract.sourceTargetKeyDomains.includes('personal_practice')) {
    addFinding(findings, 'blocker', 'personal_practice_source_domain_missing', 'personal_practice must be sourceLocale-scoped.');
  }
  if (!contract.targetStorageKeyContract.targetScopedPatternHasFrench) {
    addFinding(findings, 'blocker', 'target_scoped_pattern_missing_fr', 'Target scoped key pattern does not explicitly accept fr.');
  }
  if (!contract.targetStorageKeyContract.sourceScopedPatternHasRuUk) {
    addFinding(findings, 'blocker', 'source_scoped_pattern_missing_ru_uk', 'Source scoped key pattern does not explicitly constrain ru/uk.');
  }
  if (!contract.targetStorageKeyContract.rawTargetSensitiveFirewallPresent) {
    addFinding(findings, 'blocker', 'raw_target_sensitive_firewall_missing', 'Raw target-sensitive key firewall is missing.');
  }
  if (!contract.targetStorageKeyContract.storageStudyTargetDefaultsUnknownToEnglish) {
    addFinding(findings, 'blocker', 'study_target_default_not_safe', 'Unknown storage study target must default to English legacy state.');
  }
  if (!contract.targetStorageKeyContract.storageSourceLocaleDefaultsUnknownToRussian) {
    addFinding(findings, 'blocker', 'source_locale_default_not_safe', 'Unknown sourceLocale must default to ru for legacy compatibility.');
  }
  if (contract.targetStorageKeyContract.exportedStorageKeyFactories.length < 45) {
    addFinding(findings, 'blocker', 'storage_key_factory_coverage_too_low', 'Too few exported storage key factories were mapped.');
  }
  if (contract.targetStorageKeyContract.scopedStorageKeyFactories.length < 40) {
    addFinding(findings, 'blocker', 'scoped_storage_key_factory_coverage_too_low', 'Too few storage key factories are target/source scoped.');
  }
  if (contract.targetStorageKeyContract.aiDerivedStorageFactories.length < 8) {
    addFinding(findings, 'blocker', 'ai_derived_storage_factories_missing', 'AI-derived storage keys are not fully represented in the target map.');
  }

  const cloud = contract.cloudSyncContract;
  for (const [key, value] of Object.entries(cloud)) {
    if (typeof value === 'boolean' && !value) {
      addFinding(findings, 'blocker', `cloud_sync_contract_false_${key}`, `Cloud sync contract requirement failed: ${key}.`);
    }
  }
  if (cloud.frenchTargetSyncKeyFactoryRefs < 40) {
    addFinding(findings, 'blocker', 'french_sync_key_refs_too_low', 'French cloud sync allowlist has too few key factory references.');
  }
  const evidenceChecks = contract.testedSurfaces.reduce((sum, surface) => sum + surface.evidence.length, 0);
  if (contract.testedSurfaces.length < 5 || evidenceChecks < 8) {
    addFinding(findings, 'warning', 'test_evidence_surface_thin', 'Storage/cloud test evidence is present but should be expanded before production activation.');
  }
  if (contract.migrationPolicy.storageMigrationAllowed) {
    addFinding(findings, 'blocker', 'storage_migration_opened_too_early', 'Storage migration must remain disabled in P11.');
  }
  if (contract.migrationPolicy.cloudSyncMigrationAllowed) {
    addFinding(findings, 'blocker', 'cloud_sync_migration_opened_too_early', 'Cloud sync migration must remain disabled in P11.');
  }
  if (contract.migrationPolicy.firebaseWritesOpenedByThisPacket || contract.migrationPolicy.asyncStorageWritesOpenedByThisPacket) {
    addFinding(findings, 'blocker', 'writes_opened_too_early', 'P11 packet must not open Firebase or AsyncStorage writes.');
  }
  if (contract.migrationPolicy.activationApproved || contract.migrationPolicy.readyForApply || contract.migrationPolicy.mayModifyProductionAppFiles) {
    addFinding(findings, 'blocker', 'activation_or_apply_opened_too_early', 'Activation/apply must remain closed in P11.');
  }
  if (contract.productionBlockerMap.length < 8) {
    addFinding(findings, 'blocker', 'production_blocker_map_too_small', 'P11 must enumerate storage/cloud/admin/reviewer/server/runtime/activation blockers.');
  }
  return findings;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeProbes(contract: StorageCloudContract): Probe[] {
  const fixtures: Array<{ id: string; expectedAccept: boolean; mutate?: (draft: StorageCloudContract) => void }> = [
    { id: 'canonical_storage_cloud_contract_accepts', expectedAccept: true },
    {
      id: 'storage_migration_allowed_rejected',
      expectedAccept: false,
      mutate: (draft) => { (draft.migrationPolicy as { storageMigrationAllowed: boolean }).storageMigrationAllowed = true; },
    },
    {
      id: 'cloud_sync_migration_allowed_rejected',
      expectedAccept: false,
      mutate: (draft) => { (draft.migrationPolicy as { cloudSyncMigrationAllowed: boolean }).cloudSyncMigrationAllowed = true; },
    },
    {
      id: 'target_pattern_missing_fr_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.targetStorageKeyContract.targetScopedPatternHasFrench = false; },
    },
    {
      id: 'source_pattern_missing_ru_uk_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.targetStorageKeyContract.sourceScopedPatternHasRuUk = false; },
    },
    {
      id: 'french_sync_not_in_sync_keys_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.cloudSyncContract.syncKeysIncludesFrenchTargetSyncKeys = false; },
    },
    {
      id: 'french_daily_cloud_snapshot_missing_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.cloudSyncContract.frenchCloudDailyTaskSnapshotKeysAreTargetScoped = false; },
    },
    {
      id: 'sticky_restore_missing_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.cloudSyncContract.stickyRestoreUsesFrenchTargetSyncKeys = false; },
    },
    {
      id: 'account_wipe_missing_target_coverage_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.cloudSyncContract.accountWipeUsesSyncStudyTargets = false; },
    },
    {
      id: 'apply_opened_rejected',
      expectedAccept: false,
      mutate: (draft) => { (draft.migrationPolicy as { readyForApply: boolean }).readyForApply = true; },
    },
  ];
  return fixtures.map((fixture) => {
    const draft = clone(contract);
    fixture.mutate?.(draft);
    const blockers = validateContract(draft).filter((finding) => finding.severity === 'blocker').length;
    const accepted = blockers === 0;
    return {
      id: fixture.id,
      expectedAccept: fixture.expectedAccept,
      accepted,
      blockers,
      passed: accepted === fixture.expectedAccept,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Storage/Cloud Target Map V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Target locale: ${report.summary.targetLocale}`,
    `- Source locales: ${report.summary.sourceLocales}`,
    `- Upstream runtime contract ready: ${report.summary.upstreamRuntimeContractReady ? 'yes' : 'no'}`,
    `- Target key domains: ${report.summary.targetKeyDomains}`,
    `- Source target key domains: ${report.summary.sourceTargetKeyDomains}`,
    `- Exported storage key factories: ${report.summary.exportedStorageKeyFactories}`,
    `- Scoped storage key factories: ${report.summary.scopedStorageKeyFactories}`,
    `- AI-derived storage factories: ${report.summary.aiDerivedStorageFactories}`,
    `- French sync key factory refs: ${report.summary.frenchTargetSyncKeyFactoryRefs}`,
    `- Sync keys include French target keys: ${report.summary.syncKeysIncludesFrenchTargetSyncKeys ? 'yes' : 'no'}`,
    `- French daily cloud snapshots scoped: ${report.summary.frenchCloudDailyTaskSnapshotKeysAreTargetScoped ? 'yes' : 'no'}`,
    `- Sticky restore uses French target keys: ${report.summary.stickyRestoreUsesFrenchTargetSyncKeys ? 'yes' : 'no'}`,
    `- Account wipe covers study targets: ${report.summary.accountWipeUsesSyncStudyTargets ? 'yes' : 'no'}`,
    `- Storage migration allowed: ${report.summary.storageMigrationAllowed ? 'yes' : 'no'}`,
    `- Cloud sync migration allowed: ${report.summary.cloudSyncMigrationAllowed ? 'yes' : 'no'}`,
    `- Production blockers mapped: ${report.summary.productionBlockers}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Ready for Admin Pack Delivery Surface V2: ${report.summary.readyForAdminPackDeliverySurfaceV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Tested Surfaces',
    '',
  ];
  for (const surface of report.contract.testedSurfaces) {
    lines.push(`- \`${surface.testPath}\`: ${surface.evidence.join('; ') || 'file present'}`);
  }
  lines.push('', '## Production Blockers', '');
  for (const blocker of report.contract.productionBlockerMap) {
    lines.push(`- \`${blocker.blockerId}\` (${blocker.area}): ${blocker.evidence} Next: \`${blocker.nextUnblockArtifact}\``);
  }
  lines.push('', '## Probes', '');
  for (const probe of report.probes) {
    lines.push(`- \`${probe.id}\`: ${probe.passed ? 'pass' : 'fail'} (accepted=${probe.accepted}, blockers=${probe.blockers})`);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }
  lines.push(
    '',
    '## Safety',
    '',
    '- This packet writes only Gustav run artifacts.',
    '- It does not modify production app files.',
    '- It does not modify AsyncStorage or Firebase data.',
    '- It does not import reviewer decisions.',
    '- It does not approve activation or apply.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_storage_cloud_target_map_v2_packet.ts --run <run-dir> --target fr');
  }
  if (target !== 'fr') {
    throw new Error('P11 storage/cloud target map is currently scoped to --target fr.');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const packDir = path.join(runDir, 'pack_candidates', target);
  ensureDir(auditsDir);
  ensureDir(packDir);

  const runtimePacketPath = path.join(runDir, SOURCE_FILES.runtimeServerDeliveryContractV2Packet);
  const outContract = path.join(packDir, 'storage_cloud_target_map_v2.json');
  const outJson = path.join(auditsDir, 'storage_cloud_target_map_v2_packet.json');
  const outMd = path.join(auditsDir, 'storage_cloud_target_map_v2_packet.md');

  const contract = buildContract(repoRoot, runDir);
  const validationFindings = validateContract(contract);
  const probes = makeProbes(contract);
  const failedProbes = probes.filter((probe) => !probe.passed);
  const findings = [...validationFindings];
  for (const probe of failedProbes) {
    addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
  }
  addFinding(
    findings,
    'info',
    'storage_cloud_map_only',
    'Storage/cloud namespaces are mapped, but no migration, Firebase write, reviewer import or activation was opened.',
  );

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const evidenceChecks = contract.testedSurfaces.reduce((sum, surface) => sum + surface.evidence.length, 0);
  const activationApprovedFlags = contract.migrationPolicy.activationApproved ? 1 : 0;
  const readyForApplyOpenFlags =
    contract.migrationPolicy.readyForApply || contract.migrationPolicy.mayModifyProductionAppFiles ? 1 : 0;

  const report: Report = {
    schemaVersion: 'gustav-storage-cloud-target-map-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      targetStorageKeys: SOURCE_FILES.targetStorageKeys,
      cloudSync: SOURCE_FILES.cloudSync,
      studyTarget: SOURCE_FILES.studyTarget,
      runtimeServerDeliveryContractV2Packet: rel(repoRoot, runtimePacketPath),
      targetStorageKeyTest: SOURCE_FILES.targetStorageKeyTest,
      cloudSyncDailyTasksMergeTest: SOURCE_FILES.cloudSyncDailyTasksMergeTest,
      cloudSyncSyncKeysValidityTest: SOURCE_FILES.cloudSyncSyncKeysValidityTest,
      cloudMixedPayloadTargetStatsTest: SOURCE_FILES.cloudMixedPayloadTargetStatsTest,
      cloudSyncIntroLocalOnlyTest: SOURCE_FILES.cloudSyncIntroLocalOnlyTest,
      personalPracticeTargetIsolationTest: SOURCE_FILES.personalPracticeTargetIsolationTest,
    },
    outputs: {
      storageCloudTargetMapV2: rel(repoRoot, outContract),
      storageCloudTargetMapV2PacketJson: rel(repoRoot, outJson),
      storageCloudTargetMapV2PacketMd: rel(repoRoot, outMd),
    },
    summary: {
      targetLocale: 'fr',
      sourceLocales: contract.sourceLocales.length,
      upstreamRuntimeContractReady: contract.upstreamRuntimeContract.readyForStorageCloudTargetMapV2,
      storageCloudTargetMapCreated: true,
      targetKeyDomains: contract.targetStorageKeyContract.targetKeyDomains.length,
      sourceTargetKeyDomains: contract.targetStorageKeyContract.sourceTargetKeyDomains.length,
      exportedStorageKeyFactories: contract.targetStorageKeyContract.exportedStorageKeyFactories.length,
      scopedStorageKeyFactories: contract.targetStorageKeyContract.scopedStorageKeyFactories.length,
      aiDerivedStorageFactories: contract.targetStorageKeyContract.aiDerivedStorageFactories.length,
      targetScopedPatternHasFrench: contract.targetStorageKeyContract.targetScopedPatternHasFrench,
      sourceScopedPatternHasRuUk: contract.targetStorageKeyContract.sourceScopedPatternHasRuUk,
      rawTargetSensitiveFirewallPresent: contract.targetStorageKeyContract.rawTargetSensitiveFirewallPresent,
      storageStudyTargetDefaultsUnknownToEnglish: contract.targetStorageKeyContract.storageStudyTargetDefaultsUnknownToEnglish,
      storageSourceLocaleDefaultsUnknownToRussian: contract.targetStorageKeyContract.storageSourceLocaleDefaultsUnknownToRussian,
      frenchTargetSyncKeysDeclared: contract.cloudSyncContract.frenchTargetSyncKeysDeclared,
      frenchTargetSyncKeyFactoryRefs: contract.cloudSyncContract.frenchTargetSyncKeyFactoryRefs,
      frenchTargetSyncKeysRejectEnglishRefs: contract.cloudSyncContract.frenchTargetSyncKeysRejectEnglishRefs,
      frenchTargetSyncKeysRejectSpanishRefs: contract.cloudSyncContract.frenchTargetSyncKeysRejectSpanishRefs,
      syncKeysIncludesFrenchTargetSyncKeys: contract.cloudSyncContract.syncKeysIncludesFrenchTargetSyncKeys,
      syncStudyTargetsIncludeEnglishFrench: contract.cloudSyncContract.syncStudyTargetsIncludeEnglishFrench,
      frenchSyncSourceLocalesIncludeRuUkOnly: contract.cloudSyncContract.frenchSyncSourceLocalesIncludeRuUkOnly,
      frenchCloudDailyTaskSnapshotKeysAreTargetScoped: contract.cloudSyncContract.frenchCloudDailyTaskSnapshotKeysAreTargetScoped,
      removeCloudOnlyDailyTaskSnapshotsDeletesFrenchSnapshots: contract.cloudSyncContract.removeCloudOnlyDailyTaskSnapshotsDeletesFrenchSnapshots,
      addTodayDailyTaskSnapshotsUploadsFrenchToday: contract.cloudSyncContract.addTodayDailyTaskSnapshotsUploadsFrenchToday,
      stickyRestoreUsesFrenchTargetSyncKeys: contract.cloudSyncContract.stickyRestoreUsesFrenchTargetSyncKeys,
      restoreWritesFrenchDailyTasksToTargetScopedKey: contract.cloudSyncContract.restoreWritesFrenchDailyTasksToTargetScopedKey,
      fullRestoreReconcilesFrenchDailyTasks: contract.cloudSyncContract.fullRestoreReconcilesFrenchDailyTasks,
      accountWipeUsesSyncStudyTargets: contract.cloudSyncContract.accountWipeUsesSyncStudyTargets,
      accountWipeIncludesFrenchCommunityDraftUk: contract.cloudSyncContract.accountWipeIncludesFrenchCommunityDraftUk,
      forceSyncUsesRuntimeSyncKeys: contract.cloudSyncContract.forceSyncUsesRuntimeSyncKeys,
      forceSyncRemovesCloudOnlySnapshots: contract.cloudSyncContract.forceSyncRemovesCloudOnlySnapshots,
      forceSyncAddsTodayDailySnapshots: contract.cloudSyncContract.forceSyncAddsTodayDailySnapshots,
      testedSurfaceFiles: contract.testedSurfaces.length,
      testedEvidenceChecks: evidenceChecks,
      storageMigrationAllowed: contract.migrationPolicy.storageMigrationAllowed,
      cloudSyncMigrationAllowed: contract.migrationPolicy.cloudSyncMigrationAllowed,
      firebaseWritesOpenedByThisPacket: contract.migrationPolicy.firebaseWritesOpenedByThisPacket,
      asyncStorageWritesOpenedByThisPacket: contract.migrationPolicy.asyncStorageWritesOpenedByThisPacket,
      activationApprovedFlags,
      readyForApplyOpenFlags,
      productionBlockers: contract.productionBlockerMap.length,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      readyForAdminPackDeliverySurfaceV2: blockers === 0,
      readyForGenerationV2: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    artifactHashes: {
      runtimeServerDeliveryContractV2Packet: sha256(runtimePacketPath),
      targetStorageKeys: sha256(path.join(repoRoot, SOURCE_FILES.targetStorageKeys)),
      cloudSync: sha256(path.join(repoRoot, SOURCE_FILES.cloudSync)),
      studyTarget: sha256(path.join(repoRoot, SOURCE_FILES.studyTarget)),
    },
    contract,
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageMigrationStarted: false,
      cloudSyncMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outContract, contract);
  writeJson(outJson, report);
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV storage/cloud target map V2 packet: ${report.status}`);
  console.log(`Target key domains: ${report.summary.targetKeyDomains}`);
  console.log(`Scoped storage key factories: ${report.summary.scopedStorageKeyFactories}`);
  console.log(`French sync key factory refs: ${report.summary.frenchTargetSyncKeyFactoryRefs}`);
  console.log(`Ready for Admin Pack Delivery Surface V2: ${report.summary.readyForAdminPackDeliverySurfaceV2 ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
