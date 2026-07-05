import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_decision_import_source_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_decision_import_source_gate.mjs');

describe('Gustav French lesson decision import source gate', () => {
  it('accepts only the canonical French reviewer decision source and keeps import/apply closed', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('CANONICAL_REL');
    expect(script).toContain('Downloads files are not trusted import sources');
    expect(script).toContain('Temp candidates must be staged into the canonical path');
    expect(script).toContain('reviewerDecisionsImportedByThisScript: false');
    expect(script).toContain('activationApprovedWrittenByThisScript: false');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-decision-import-source-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.studyTarget).toBe('fr');
    expect(audit.targetContentLang).toBe('fr');
    expect(audit.sourceLocales).toEqual(['ru', 'uk']);

    expect(audit.policy.canonicalDecisionSource).toBe('docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_decisions_v1.jsonl');
    expect(audit.policy.acceptedSourceRule).toContain('schema gate PASS for 1600 rows');
    expect(audit.policy.externalDecisionImportRule).toContain('staged to the canonical French reviewer path');

    expect(audit.summary.requestRows).toBe(1600);
    expect(audit.summary.requestAuditReady).toBe(true);
    expect(audit.summary.canonicalDecisionSourceExists).toBe(true);
    expect(audit.summary.decisionRows).toBeGreaterThan(0);
    expect(audit.summary.decisionRows).toBeLessThan(1600);
    expect(audit.summary.schemaGateReady).toBe(false);
    expect(audit.summary.importDryRunReady).toBe(false);
    expect(audit.summary.allRowsAccepted).toBe(false);
    expect(audit.summary.importSourceAccepted).toBe(false);
    expect(audit.summary.importExecutionAllowed).toBe(false);
    expect(audit.summary.acceptedLedgerMaterializationAllowed).toBe(false);
    expect(audit.summary.readyForAudioManifestGate).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.structuralBlockers).toBe(0);
    expect(audit.summary.productionBlockers).toBeGreaterThan(0);
    expect(audit.summary.probesPassed).toBe(audit.summary.probes);

    expect(audit.probes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'canonical_fr_reviewer_decisions_source_allowed',
        expectedAccept: true,
        accepted: true,
        passed: true,
      }),
      expect.objectContaining({
        id: 'downloads_decision_file_rejected',
        expectedAccept: false,
        accepted: false,
        passed: true,
      }),
      expect.objectContaining({
        id: 'app_bundle_decision_file_rejected',
        expectedAccept: false,
        accepted: false,
        passed: true,
      }),
      expect.objectContaining({
        id: 'english_target_decision_file_rejected',
        expectedAccept: false,
        accepted: false,
        passed: true,
      }),
      expect.objectContaining({
        id: 'temp_candidate_without_canonical_stage_rejected',
        expectedAccept: false,
        accepted: false,
        passed: true,
      }),
    ]));

    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'DECISION_ROWS_NOT_1600',
      'SCHEMA_GATE_NOT_READY',
      'IMPORT_DRY_RUN_NOT_READY',
      'ALL_ROWS_ACCEPTED_NOT_PROVEN',
      'IMPORT_SOURCE_NOT_ACCEPTED',
    ]));
    expect(audit.safety).toMatchObject({
      readOnly: true,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      acceptedLedgersMaterializedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApprovedWrittenByThisScript: false,
    });
  });
});
