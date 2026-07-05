import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const CONTRACT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin', 'admin_source_locale_write_contract_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin', 'admin_source_locale_write_contract_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_admin_source_locale_write_contract.mjs');

describe('Gustav admin sourceLocale write contract', () => {
  it('requires sourceLocale-scoped official French admin write candidates and keeps writes closed', () => {
    const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('isAllowedAdminWriteCandidate');
    expect(script).toContain('course-packs/fr/uiLocale/');
    expect(script).toContain('course-packs/fr/sourceLocale/');
    expect(script).toContain('canonical_uk_audio_closed_candidate_accepts');
    expect(script).toContain('activation_open_rejected');

    expect(contract.schemaVersion).toBe('gustav-admin-source-locale-write-contract-v1');
    expect(contract.studyTarget).toBe('fr');
    expect(contract.targetLocale).toBe('fr');
    expect(contract.sourceLocales).toEqual(['ru', 'uk']);
    expect(contract.surfaces).toEqual(['lesson', 'audio_metadata']);
    expect(contract.allowedStoragePathPrefixes).toEqual(['course-packs/fr/ru/', 'course-packs/fr/uk/']);
    expect(contract.deniedStoragePathPrefixes).toEqual(expect.arrayContaining([
      'course-packs/en/',
      'course-packs/fr/uiLocale/',
      'course-packs/fr/sourceLocale/',
      'course-packs/fr/*/../../',
    ]));
    expect(contract.identityRules).toEqual(expect.arrayContaining([
      'Admin official French write candidates must include studyTarget=fr.',
      'Admin official French write candidates must include sourceLocale in ru|uk.',
      'uiLocale is display language only and must not drive studyTarget, sourceLocale, serverPath, upload or activation.',
      'serverPath must start with course-packs/fr/<sourceLocale>/<surface>/',
    ]));
    expect(Object.values(contract.disallowedTransitionsNow).every((value) => value === false)).toBe(true);
    expect(contract.disallowedTransitionsNow).toMatchObject({
      adminOfficialWriteAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      reviewerDecisionImportAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
    });

    expect(audit.schemaVersion).toBe('gustav-admin-source-locale-write-contract-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.sourceLocales).toBe(2);
    expect(audit.summary.surfaces).toBe(2);
    expect(audit.summary.allowedStoragePathPrefixes).toBe(2);
    expect(audit.summary.deniedStoragePathPrefixes).toBe(4);
    expect(audit.summary.manifestEntries).toBe(4);
    expect(audit.summary.manifestEntriesSourceScoped).toBe(4);
    expect(audit.summary.adminSourceLocaleReadOnlySurfacePresent).toBe(true);
    expect(audit.summary.fixtureProbesPassed).toBe(11);
    expect(audit.summary.fixtureProbes).toBe(11);
    expect(audit.summary.checksPassed).toBe(audit.summary.checksTotal);
    expect(audit.summary.blockers).toBe(0);
    expect(audit.summary.adminOfficialWriteAllowed).toBe(false);
    expect(audit.summary.serverUploadAllowed).toBe(false);
    expect(audit.summary.runtimeDownloadsEnabled).toBe(false);
    expect(audit.summary.activationApproved).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);

    const probes = new Map(audit.probes.map((probe: { id: string }) => [probe.id, probe]));
    expect(probes.get('canonical_ru_lesson_closed_candidate_accepts')).toMatchObject({ accepted: true, passed: true });
    expect(probes.get('canonical_uk_audio_closed_candidate_accepts')).toMatchObject({ accepted: true, passed: true });
    for (const id of [
      'missing_source_locale_rejected',
      'unsupported_source_locale_rejected',
      'ui_locale_path_rejected',
      'source_locale_literal_path_rejected',
      'english_path_rejected',
      'path_traversal_rejected',
      'upload_open_rejected',
      'runtime_open_rejected',
      'activation_open_rejected',
    ]) {
      expect(probes.get(id)).toMatchObject({ accepted: false, passed: true });
    }

    expect(audit.productionBlockers.map((blocker: { blockerId: string }) => blocker.blockerId)).toEqual([
      'admin_official_fr_write_surface_still_absent',
    ]);
    expect(audit.safety).toMatchObject({
      productionAppFilesModifiedByThisScript: false,
      adminUiModifiedByThisScript: false,
      adminStateModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
