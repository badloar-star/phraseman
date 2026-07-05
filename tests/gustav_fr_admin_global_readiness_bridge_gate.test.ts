import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(
  ROOT,
  'docs',
  'gustav',
  'generated',
  'fr',
  'admin',
  'fr_admin_global_readiness_bridge_gate_v1.json',
);
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_admin_global_readiness_bridge_gate.mjs');

describe('Gustav French admin global readiness bridge gate', () => {
  it('summarizes admin parity/isolation/rollback readiness without opening official French writes', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('sourceLocaleRequiredForOfficialFrenchWrites');
    expect(script).toContain('marketplaceCardPacksSeparatedFromOfficialFrenchPacks');
    expect(script).toContain('ugcCommunityPacksSeparatedFromOfficialFrenchPacks');
    expect(script).toContain('activationRollbackSourceLocaleScoped');
    expect(script).toContain('adminUiModifiedByThisScript');

    expect(gate.schemaVersion).toBe('gustav-fr-admin-global-readiness-bridge-gate-v1');
    expect(gate.status).toBe('PASS_ADMIN_SURFACES_READY_GLOBAL_FRENCH_HOLD');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.sourceStudyTarget).toBe('en');
    expect(gate.sourceLocales).toEqual(['ru', 'uk']);
    expect(gate.surface).toBe('admin_surfaces');
    expect(gate.activationApproved).toBe(false);
    expect(gate.readyForAppApply).toBe(false);
    expect(gate.readyForRuntimeEnable).toBe(false);
    expect(gate.structuralBlockers).toEqual([]);

    expect(gate.summary).toMatchObject({
      equivalenceRows: 6,
      equivalenceBlockedRows: 0,
      genericTargetAwareRows: 2,
      sourceLocaleRequiredRows: 5,
      sourceLocaleProvenRows: 5,
      officialFrenchAdminSurfacesRequired: 5,
      officialFrenchAdminSurfacesObserved: 5,
      missingOfficialFrenchAdminSurfaces: 0,
      dangerousOfficialFrenchAdminWrites: 0,
      officialCoursePackCandidateRows: 0,
      officialFrenchWritePatternMatches: 0,
      fixtureProbesPassed: 19,
      fixtureProbes: 19,
      upstreamReadyCount: 3,
      upstreamGateCount: 10,
      activeApprovalReceiptExists: false,
      activeHashLockManifestExists: false,
      readyForApply: false,
      activationApproved: false,
    });

    expect(gate.invariants).toMatchObject({
      adminUiBibleLoaded: true,
      noHumanReviewGate: true,
      llmTrustedSourceReviewInstead: true,
      sourceLocaleRequiredForOfficialFrenchWrites: true,
      uiLocaleCannotDriveStudyTargetOrSourceLocale: true,
      marketplaceCardPacksSeparatedFromOfficialFrenchPacks: true,
      ugcCommunityPacksSeparatedFromOfficialFrenchPacks: true,
      activationRollbackSourceLocaleScoped: true,
      unsafeRollbackScopesRejected: true,
      noOfficialFrenchWritesOpened: true,
      noAdminWritesOpenedByBridge: true,
      runtimeDownloadsClosed: true,
      activationRemainsClosed: true,
    });

    expect(gate.summary.adminSurfaceEvidenceReady).toBe(true);
    expect(gate.missingSurfaces).toEqual([]);
    expect(gate.productionBlockers).toEqual(expect.arrayContaining([
      'admin_official_fr_write_surface_still_absent',
      'official_fr_write_surface_absent',
      'active_explicit_approval_receipt_missing',
      'active_hash_lock_manifest_missing',
      'llm_review_decisions_not_imported',
      'audio_tts_and_checksum_not_ready',
      'runtime_delivery_not_ready',
      'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD',
    ]));
    expect(gate.safety).toMatchObject({
      readOnly: true,
      productionAppFilesModifiedByThisScript: false,
      adminUiModifiedByThisScript: false,
      adminStateModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    });
  });
});
