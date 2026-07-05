import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_decision_staging_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_decision_staging_gate.mjs');

describe('Gustav French lesson decision staging gate', () => {
  it('keeps external/canonical decision staging dry-run only until a 1600-row candidate or canonical source is ready', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('candidateCopiedToCanonicalByThisScript: false');
    expect(script).toContain('reviewerDecisionsImportedByThisScript: false');
    expect(script).toContain('CANDIDATE_DOES_NOT_MATCH_1600_REQUEST_IDENTITIES');
    expect(script).toContain('forbiddenCandidatePathClasses');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-decision-staging-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.studyTarget).toBe('fr');
    expect(audit.sourceLocales).toEqual(['ru', 'uk']);
    expect(audit.targetContentLang).toBe('fr');

    expect(audit.policy).toMatchObject({
      dryRunOnly: true,
      canonicalDecisionSource: 'docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_decisions_v1.jsonl',
    });
    expect(audit.policy.candidateRule).toContain('this gate never copies it');

    expect(audit.summary.requestRows).toBe(1600);
    expect(audit.summary.candidateProvided).toBe(false);
    expect(audit.summary.candidateExists).toBe(false);
    expect(audit.summary.canonicalSourceAlreadyReady).toBe(false);
    expect(audit.summary.candidateReadyForCanonicalStaging).toBe(false);
    expect(audit.summary.readyForCanonicalDecisionSource).toBe(false);
    expect(audit.summary.canonicalWritePerformedByThisScript).toBe(false);
    expect(audit.summary.importPerformedByThisScript).toBe(false);
    expect(audit.summary.decisionRows).toBe(0);
    expect(audit.summary.uniqueDecisionIdentities).toBe(0);
    expect(audit.summary.structurallyMatchesRequestSet).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);

    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'NO_CANDIDATE_AND_CANONICAL_SOURCE_NOT_READY',
      'READY_FOR_CANONICAL_DECISION_SOURCE_FALSE',
    ]));
    expect(audit.safety).toMatchObject({
      readOnly: true,
      candidateCopiedToCanonicalByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApprovedWrittenByThisScript: false,
    });
  });
});
