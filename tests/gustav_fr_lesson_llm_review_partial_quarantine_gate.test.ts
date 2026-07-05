import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(
  ROOT,
  'docs',
  'gustav',
  'generated',
  'fr',
  'reviewer',
  'fr_lesson_llm_review_partial_quarantine_gate_audit_v1.json',
);
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_llm_review_partial_quarantine_gate.mjs');

describe('Gustav French LLM review partial quarantine gate', () => {
  it('allows resume tracking while keeping partial decisions away from import, audio, server and activation', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('partialQuarantinedRows');
    expect(script).toContain('fullImportAllowedNow');
    expect(script).toContain('reviewerDecisionsImportedByThisScript: false');
    expect(script).toContain('audioGenerationStarted: false');
    expect(script).toContain('activationApprovedWrittenByThisScript: false');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-llm-review-partial-quarantine-gate-audit-v1');
    expect(['HOLD_EMPTY', 'HOLD_PARTIAL_QUARANTINED']).toContain(audit.status);
    expect(audit.activationApproved).toBe(false);
    expect(audit.studyTarget).toBe('fr');
    expect(audit.sourceLocales).toEqual(['ru', 'uk']);
    expect(audit.targetContentLang).toBe('fr');

    expect(audit.summary.expectedRows).toBe(1600);
    expect(audit.summary.decisionRows).toBeGreaterThanOrEqual(0);
    expect(audit.summary.decisionRows).toBeLessThanOrEqual(1600);
    expect(audit.summary.validDecisionRows).toBe(audit.summary.decisionRows);
    expect(audit.summary.partialQuarantinedRows).toBe(
      audit.summary.validDecisionRows > 0 && audit.summary.validDecisionRows < 1600
        ? audit.summary.validDecisionRows
        : 0,
    );
    expect(audit.summary.invalidDecisionRows).toBe(0);
    expect(audit.summary.openedImportApplyActivationRows).toBe(0);
    expect(audit.summary.missingDecisionRows).toBe(1600 - audit.summary.validDecisionRows);
    expect(audit.summary.nextResumeStartIndex).toBe(audit.summary.validDecisionRows + 1);
    expect(audit.summary.canResumeNextBatch).toBe(true);
    expect(audit.summary.fullDecisionSetPresent).toBe(false);
    expect(audit.summary.fullImportAllowedNow).toBe(false);
    expect(audit.summary.readyForAudioManifestGate).toBe(false);
    expect(audit.summary.readyForServerPackManifestGate).toBe(false);
    expect(audit.summary.readyForRuntimeDeliveryGate).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.blockers).toBe(0);

    expect(audit.safety).toMatchObject({
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      audioGenerationStarted: false,
      productionApplyApproved: false,
      activationApprovedWrittenByThisScript: false,
    });
    if (audit.summary.validDecisionRows === 0) {
      expect(audit.findings).toEqual(expect.arrayContaining([
        expect.objectContaining({
          severity: 'info',
          code: 'no_valid_decisions_yet',
        }),
      ]));
    } else {
      expect(audit.findings).toEqual(expect.arrayContaining([
        expect.objectContaining({
          severity: 'info',
          code: 'partial_decisions_quarantined',
        }),
      ]));
    }
    expect(audit.nextRequiredGates).toEqual(expect.arrayContaining([
      'resume_llm_official_source_review_batches',
      'decision_progress_gate',
      'partial_quarantine_gate',
      'llm_review_decision_schema_gate_after_1600_valid_rows',
      'decision_staging_gate_after_1600_valid_rows',
    ]));
  });
});
