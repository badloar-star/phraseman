import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin', 'fr_admin_parity_isolation_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_admin_parity_isolation_gate.mjs');

describe('Gustav French admin parity/isolation gate', () => {
  it('keeps French admin delivery in HOLD while mapping exact production admin blockers', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('REQUIRED_ADMIN_PACK_SURFACES');
    expect(script).toContain('admin_source_locale_dimension_not_proven');
    expect(script).toContain('dangerousOfficialFrenchAdminWrites');
    expect(script).toContain('productionApplyApproved: false');

    expect(audit.schemaVersion).toBe('gustav-fr-admin-parity-isolation-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.studyTarget).toBe('fr');
    expect(audit.sourceLocales).toEqual(['ru', 'uk']);
    expect(audit.activationApproved).toBe(false);

    expect(audit.summary.atlasLearningRelevantSections).toBeGreaterThan(0);
    expect(audit.summary.atlasLearningRelevantButtons).toBeGreaterThan(0);
    expect(audit.summary.adminMentionsStudyTarget).toBe(true);
    expect(audit.summary.adminMentionsFrenchOption).toBe(true);
    expect(audit.summary.adminCardPackPreviewIsTargetAware).toBe(true);
    expect(audit.summary.dangerousOfficialFrenchAdminWrites).toBe(0);
    expect(audit.summary.upstreamOpenFlags).toBe(0);
    expect(audit.summary.requiredOfficialFrenchAdminSurfaces).toBe(5);
    expect(audit.summary.productionBlockers).toBe(0);
    expect(audit.summary.checksPassed).toBe(audit.summary.checksTotal);
    expect(audit.summary.blockers).toBe(0);

    expect(audit.summary.officialFrenchCoursePackSurfaceObserved).toBe(true);
    expect(audit.summary.reviewerDecisionSurfaceObserved).toBe(true);
    expect(audit.summary.adminMentionsSourceLocale).toBe(true);

    expect(audit.productionBlockers).toEqual([]);

    expect(audit.surfaceMatrix).toHaveLength(5);
    expect(audit.surfaceMatrix.find((row: { id: string }) => row.id === 'official_fr_course_pack_status')).toMatchObject({
      observedInCurrentAdmin: true,
      activationAllowedNow: false,
      writeAllowedNow: false,
      uploadAllowedNow: false,
    });
    expect(audit.surfaceMatrix.find((row: { id: string }) => row.id === 'fr_admin_diagnostics')).toMatchObject({
      observedInCurrentAdmin: true,
      activationAllowedNow: false,
      writeAllowedNow: false,
      uploadAllowedNow: false,
    });

    expect(audit.summary.adminUiModifiedByThisGate).toBe(false);
    expect(audit.summary.adminWritesOpenedByThisGate).toBe(false);
    expect(audit.summary.reviewerDecisionImportAllowed).toBe(false);
    expect(audit.summary.serverUploadAllowed).toBe(false);
    expect(audit.summary.firebaseUploadAllowed).toBe(false);
    expect(audit.summary.runtimeDownloadsEnabled).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.mayModifyProductionAppFiles).toBe(false);
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
