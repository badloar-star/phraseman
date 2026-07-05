import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'storage', 'fr_storage_cloud_isolation_bridge_gate_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_storage_cloud_isolation_bridge_gate.mjs');

describe('Gustav French storage/cloud isolation bridge gate', () => {
  it('promotes storage/cloud isolation evidence while keeping migration, downloads and activation closed', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('productionStudyTargetsRemainEnglishOnly');
    expect(script).toContain('runtimeDownloadsClosed');
    expect(script).toContain('activationRemainsClosed');

    expect(gate.schemaVersion).toBe('gustav-fr-storage-cloud-isolation-bridge-gate-v1');
    expect(gate.status).toBe('PASS_ISOLATION_READY_GLOBAL_FRENCH_HOLD');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.surface).toBe('storage_cloud_runtime_isolation');
    expect(gate.activationApproved).toBe(false);
    expect(gate.globalFrenchActivationApproved).toBe(false);
    expect(gate.readyForApply).toBe(false);
    expect(gate.readyForRuntimeDownloads).toBe(false);
    expect(gate.blockers).toEqual([]);

    expect(gate.summary).toMatchObject({
      checksPassed: 25,
      checksTotal: 25,
      requiredFrenchFactoryRefs: 21,
      frenchFactoryRefs: 21,
      missingFrenchFactoryRefs: 0,
      syncStudyTargets: ['en', 'fr'],
      frenchSyncSourceLocales: ['ru', 'uk'],
      productionStudyTargets: ['en'],
      internalStudyTargets: ['en', 'fr'],
      forbiddenRuntimeSyncKeyMentions: [],
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      globalFrenchStillHold: true,
    });
    expect(gate.summary.exportedStorageKeyFactories).toBeGreaterThanOrEqual(90);

    expect(gate.invariants).toMatchObject({
      targetStorageFactoriesComplete: true,
      noMissingFrenchFactoryRefs: true,
      noSelectionKeysInRuntimeSync: true,
      frenchCloudSyncSourceLocaleScoped: true,
      productionStudyTargetsRemainEnglishOnly: true,
      internalFrenchTargetAvailableForGates: true,
      legacyCloudRestoreDoesNotPolluteFrench: true,
      uiLocaleDoesNotControlStudyTargetStorage: true,
      storageMigrationClosed: true,
      cloudSyncMigrationClosed: true,
      runtimeDownloadsClosed: true,
      activationRemainsClosed: true,
    });
  });
});
