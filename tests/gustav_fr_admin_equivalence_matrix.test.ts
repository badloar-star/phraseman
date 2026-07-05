import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const MATRIX_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin', 'admin_french_target_equivalence_matrix_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin', 'admin_french_target_equivalence_matrix_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_admin_equivalence_matrix.mjs');

describe('Gustav French admin target equivalence matrix', () => {
  it('maps every required official French admin surface and keeps blocked rows closed', () => {
    const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('SURFACE_REQUIREMENTS');
    expect(script).toContain('admin_source_locale_dimension');
    expect(script).toContain('sourceLocaleRequiredRowsProven');
    expect(script).toContain('productionApplyApproved: false');

    expect(matrix.schemaVersion).toBe('gustav-admin-french-target-equivalence-matrix-v1');
    expect(matrix.status).toBe('HOLD');
    expect(matrix.studyTarget).toBe('fr');
    expect(matrix.targetLocale).toBe('fr');
    expect(matrix.sourceLocales).toEqual(['ru', 'uk']);
    expect(matrix.activationApproved).toBe(false);

    expect(matrix.summary.rows).toBe(6);
    expect(matrix.summary.genericTargetAwareRows).toBe(2);
    expect(matrix.summary.blockedRows).toBe(0);
    expect(matrix.summary.sourceLocaleRequiredRows).toBe(5);
    expect(matrix.summary.sourceLocaleProvenRows).toBe(5);
    expect(matrix.summary.productionBlockers).toBe(0);
    expect(matrix.summary.adminWritesOpened).toBe(0);
    expect(matrix.summary.serverUploadsOpened).toBe(0);
    expect(matrix.summary.reviewerImportsOpened).toBe(0);
    expect(matrix.summary.runtimeDownloadsOpened).toBe(0);
    expect(matrix.summary.activationApprovedRows).toBe(0);
    expect(matrix.summary.readyForApply).toBe(false);
    expect(matrix.summary.mayModifyProductionAppFiles).toBe(false);

    const byId = new Map(matrix.rows.map((row: { surfaceId: string }) => [row.surfaceId, row]));
    expect([...byId.keys()]).toEqual(expect.arrayContaining([
      'official_fr_course_pack_status',
      'fr_llm_reviewer_queue_status',
      'fr_audio_tts_status',
      'fr_activation_rollback_control',
      'fr_admin_diagnostics',
      'admin_source_locale_dimension',
    ]));

    expect(byId.get('official_fr_course_pack_status')).toMatchObject({
      frenchSupportStatus: 'target_specific',
      sourceLocaleRequired: true,
      sourceLocaleProven: true,
      adminWriteAllowedNow: false,
      serverUploadAllowedNow: false,
      activationAllowedNow: false,
    });
    expect(byId.get('fr_llm_reviewer_queue_status')).toMatchObject({
      frenchSupportStatus: 'target_specific',
      reviewerImportAllowedNow: false,
      activationAllowedNow: false,
    });
    expect(byId.get('fr_audio_tts_status')).toMatchObject({
      frenchSupportStatus: 'generic_target_aware',
      sourceLocaleRequired: false,
      serverUploadAllowedNow: false,
    });
    expect(byId.get('fr_activation_rollback_control')).toMatchObject({
      frenchSupportStatus: 'generic_target_aware',
      sourceLocaleRequired: true,
      sourceLocaleProven: true,
      activationAllowedNow: false,
    });
    expect(byId.get('admin_source_locale_dimension')).toMatchObject({
      frenchSupportStatus: 'target_specific',
      sourceLocaleRequired: true,
      sourceLocaleProven: true,
    });

    expect(matrix.productionBlockers).toEqual([]);

    expect(matrix.safety).toMatchObject({
      productionAppFilesModifiedByThisScript: false,
      adminUiModifiedByThisScript: false,
      adminStateModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });

    expect(audit.schemaVersion).toBe('gustav-admin-french-target-equivalence-matrix-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.checksPassed).toBe(audit.summary.checksTotal);
    expect(audit.summary.blockers).toBe(0);
    expect(audit.safety).toEqual(matrix.safety);
  });
});
