import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin', 'fr_admin_write_path_isolation_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_admin_write_path_isolation_gate.mjs');

describe('Gustav French admin write-path isolation gate', () => {
  it('separates existing marketplace/UGC writes from official French course-pack activation writes', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('OFFICIAL_FR_WRITE_PATTERNS');
    expect(script).toContain('marketplace_card_packs');
    expect(script).toContain('ugc_community_packs');
    expect(script).toContain('sourceLocaleFutureRequirement');
    expect(script).toContain('productionApplyApproved: false');

    expect(audit.schemaVersion).toBe('gustav-fr-admin-write-path-isolation-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.studyTarget).toBe('fr');
    expect(audit.sourceLocales).toEqual(['ru', 'uk']);
    expect(audit.activationApproved).toBe(false);

    expect(audit.summary.writeCallsTotal).toBeGreaterThan(0);
    expect(audit.summary.cardPackWriteRows).toBeGreaterThan(0);
    expect(audit.summary.ugcCommunityPackWriteRows).toBeGreaterThan(0);
    expect(audit.summary.officialCoursePackCandidateRows).toBe(0);
    expect(audit.summary.officialFrenchWritePatternMatches).toBe(0);
    expect(audit.summary.storageUploadWriteCalls).toBe(0);
    expect(audit.summary.sourceLocaleRequiredForFutureOfficialWrites).toBe(true);
    expect(audit.summary.adminMentionsSourceLocale).toBe(true);
    expect(audit.summary.productionBlockers).toBe(1);
    expect(audit.summary.checksPassed).toBe(audit.summary.checksTotal);
    expect(audit.summary.blockers).toBe(0);

    expect(audit.writeInventorySummary.domains).toEqual(expect.arrayContaining([
      'marketplace_card_packs',
      'ugc_community_packs',
    ]));
    expect(audit.writeInventorySummary.officialCoursePackCandidateLines).toEqual([]);
    expect(audit.writeInventorySummary.officialFrenchWriteMatches).toEqual([]);

    expect(audit.productionBlockers.map((blocker: { blockerId: string }) => blocker.blockerId)).toEqual([
      'official_fr_write_surface_absent',
    ]);

    expect(audit.sourceLocaleFutureRequirement).toMatchObject({
      requiredForFutureOfficialFrenchWrites: true,
      requiredSegments: ['studyTarget=fr', 'sourceLocale=ru|uk'],
      currentAdminMentionsSourceLocale: true,
      readOnlyAdminSurfaceProvesSourceLocale: true,
    });
    expect(audit.sourceLocaleFutureRequirement.deniedSegments).toEqual(expect.arrayContaining([
      'uiLocale-as-studyTarget',
      'sourceLocale-missing',
      'course-packs/fr/uiLocale',
      'course-packs/fr/sourceLocale',
    ]));

    expect(audit.summary.adminUiModifiedByThisGate).toBe(false);
    expect(audit.summary.adminWritesOpenedByThisGate).toBe(false);
    expect(audit.summary.officialFrenchWritesOpened).toBe(false);
    expect(audit.summary.reviewerDecisionImportAllowed).toBe(false);
    expect(audit.summary.serverUploadAllowed).toBe(false);
    expect(audit.summary.firebaseUploadAllowed).toBe(false);
    expect(audit.summary.runtimeDownloadsEnabled).toBe(false);
    expect(audit.summary.activationApproved).toBe(false);
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
