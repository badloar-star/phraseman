import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const REQUESTS_JSONL_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_requests_v1.jsonl');
const MANIFEST_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_requests_manifest_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_requests_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_llm_review_requests.mjs');

const REQUIRED_GATES = [
  'language_field_isolation_gate',
  'source_locale_coverage_gate',
  'official_source_evidence_gate',
  'target_sequence_fit_gate',
  'anti_calque_gate',
  'grammar_cluster_gate',
  'naturalness_register_gate',
  'source_meaning_parity_gate',
  'quiz_one_correct_answer_gate',
  'distractor_quality_gate',
  'no_mojibake_or_placeholder_gate',
];

const ALLOWED_ROW_DECISIONS = [
  'accept_quality_gates',
  'needs_regeneration',
  'needs_llm_regeneration_review',
  'reject_candidate',
  'skip_for_later',
];

function readJsonl(filePath: string): any[] {
  return fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
}

describe('Gustav French lesson LLM official-source review requests', () => {
  it('creates one strict request per lesson row without filling decisions or opening production flags', () => {
    const requests = readJsonl(REQUESTS_JSONL_PATH);
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('mayUseUnofficialSourcesForApproval: false');
    expect(script).toContain("reasoningLevel: 'deep'");
    expect(script).toContain('all French production LLM review requests must use deep reasoning');
    expect(script).toContain('llmApiCalledByThisScript: false');
    expect(script).toContain('reviewerDecisionsWrittenByThisScript: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');

    expect(manifest.schemaVersion).toBe('gustav-fr-lesson-llm-review-requests-manifest-v1');
    expect(manifest.status).toBe('HOLD_READY_FOR_LLM_EXECUTION');
    expect(manifest.studyTarget).toBe('fr');
    expect(manifest.sourceLocales).toEqual(['ru', 'uk']);
    expect(manifest.activationApproved).toBe(false);
    expect(manifest.requestRows).toBe(1600);
    expect(manifest.batches).toBe(32);
    expect(manifest.reasoningCounts).toEqual({ deep: 1600 });
    expect(manifest.rowDecisionAllowedValues).toEqual(ALLOWED_ROW_DECISIONS);
    expect(manifest.requiredGateIds).toEqual(REQUIRED_GATES);
    expect(manifest.safety).toMatchObject({
      requestOnly: true,
      llmApiCalledByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-llm-review-requests-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.requestRows).toBe(1600);
    expect(audit.batches).toBe(32);
    expect(audit.requiredGateCount).toBe(11);
    expect(audit.blankResponseTemplateRows).toBe(1600);
    expect(audit.openedImportApplyActivationRows).toBe(0);
    expect(audit.missingTrustedSourceRows).toBe(0);
    expect(audit.missingGateRubricRows).toBe(0);
    expect(audit.readyForLlmOfficialSourceExecution).toBe(true);
    expect(audit.readyForDecisionImportV2).toBe(false);
    expect(audit.readyForApply).toBe(false);
    expect(audit.mayModifyProductionAppFiles).toBe(false);
    expect(audit.reasoningCounts).toEqual({ deep: 1600 });
    expect(audit.blockers).toEqual([]);

    expect(requests).toHaveLength(1600);
    for (const request of [requests[0], requests[799], requests[1599]]) {
      expect(request.schemaVersion).toBe('gustav-fr-lesson-llm-official-source-review-request-v1');
      expect(request.reviewScope).toBe('lesson_row');
      expect(request.studyTarget).toBe('fr');
      expect(request.targetContentLang).toBe('fr');
      expect(request.aiOutputLang).toBe('fr');
      expect(request.sourceLocaleCoverage).toEqual(['ru', 'uk']);
      expect(request.trustedSourceContext.policy).toMatchObject({
        officialOrTrustedEvidenceRequired: true,
        mayUseUnofficialSourcesForApproval: false,
        ifEvidenceInsufficientUseGateDecision: 'needs_source_check',
        citeSourceIdsInGateEvidenceNotes: true,
      });
      expect(request.trustedSourceContext.trustedSources.length).toBeGreaterThanOrEqual(2);
      expect(request.instructions.hardRules).toEqual(expect.arrayContaining([
        'Do not auto-accept.',
        'Return only JSON matching outputJsonSchema.',
        'If reviewerDecision=accept_quality_gates, every gateReviewerDecisions value must be pass and all corrected* fields must be empty strings, except correctedQuizDistractors must be an empty array.',
        'If reviewerDecision is not accept_quality_gates, at least one gateReviewerDecisions value must be fail or needs_source_check.',
        'Only reviewerDecision=needs_llm_regeneration_review may include corrected* fields, and then at least one corrected field must be non-empty.',
        'If reviewerDecision=skip_for_later, at least one gateReviewerDecisions value must be needs_source_check.',
        'Keep reviewerImportAllowed=false, productionApplyAllowed=false and activationApproved=false for every result.',
      ]));
      expect(request.instructions.reasoningLevel).toBe('deep');
      expect(Object.keys(request.instructions.gateRubrics)).toEqual(REQUIRED_GATES);
      expect(request.outputJsonSchema.properties.schemaVersion.type).toBe('string');
      expect(request.outputJsonSchema.properties.requestId.type).toBe('string');
      expect(request.outputJsonSchema.properties.sourceQueueIndex.type).toBe('integer');
      expect(request.outputJsonSchema.properties.sourceLocaleCoverage.type).toBe('array');
      expect(request.outputJsonSchema.properties.sourceLocaleCoverage.const).toBeUndefined();
      expect(request.outputJsonSchema.properties.sourceLocaleCoverage.minItems).toBe(2);
      expect(request.outputJsonSchema.properties.sourceLocaleCoverage.maxItems).toBe(2);
      expect(request.outputJsonSchema.properties.sourceLocaleCoverage.items.enum).toEqual(['ru', 'uk']);
      expect(request.outputJsonSchema.properties.reviewerDecision.enum).toEqual(ALLOWED_ROW_DECISIONS);
      expect(request.outputJsonSchema.properties.reviewerDecision.type).toBe('string');
      expect(request.outputJsonSchema.properties.gateReviewerDecisions.required).toEqual(REQUIRED_GATES);
      expect(request.outputJsonSchema.properties.gateReviewerDecisions.properties.language_field_isolation_gate.type).toBe('string');
      expect(request.outputJsonSchema.properties.reviewerImportAllowed.type).toBe('boolean');
      expect(request.outputJsonSchema.properties.correctedTargetText.description).toContain('empty string');
      expect(request.outputJsonSchema.properties.correctedQuizDistractors.description).toContain('empty array');
      expect(request.blankResponseTemplate.reviewerDecision).toBe('');
      expect(Object.keys(request.blankResponseTemplate.gateReviewerDecisions)).toEqual(REQUIRED_GATES);
      expect(new Set(Object.values(request.blankResponseTemplate.gateReviewerDecisions))).toEqual(new Set(['']));
      expect(request.blankResponseTemplate.reviewerImportAllowed).toBe(false);
      expect(request.blankResponseTemplate.productionApplyAllowed).toBe(false);
      expect(request.blankResponseTemplate.activationApproved).toBe(false);
      expect(request.safety).toMatchObject({
        requestOnly: true,
        llmDecisionAlreadyFilled: false,
        reviewerDecisionsImportedByThisRequest: false,
        appBundleModifiedByThisRequest: false,
        firebaseOrServerUploadStarted: false,
        runtimeDownloadsEnabled: false,
        activationApproved: false,
      });
    }

    expect(requests[0].sourceQueueIndex).toBe(1);
    expect(requests[0].lessonId).toBe(1);
    expect(requests[1599].sourceQueueIndex).toBe(1600);
    expect(requests[1599].lessonId).toBe(32);
  });
});
