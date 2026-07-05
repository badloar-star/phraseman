import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice', 'fr_personal_practice_native_bank_review_requests_audit_v1.json');
const REQUESTS_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice', 'fr_personal_practice_native_bank_review_requests_v1.jsonl');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_personal_practice_native_bank_review_requests.mjs');

function readJsonl(filePath: string) {
  return fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

describe('Gustav French personal practice native bank review requests', () => {
  it('builds strict LLM review requests for all 56 native-bank candidate rows', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const requests = readJsonl(REQUESTS_PATH);
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('mayUseUnofficialSourcesForApproval: false');
    expect(script).toContain('Do not approve if the English diagnosis slot is reused as French content');
    expect(script).toContain('Keep reviewerImportAllowed=false, productionApplyAllowed=false and activationApproved=false.');
    expect(script).toContain('llmApiCalledByThisScript: false');

    expect(audit.schemaVersion).toBe('gustav-fr-personal-practice-native-bank-review-requests-audit-v1');
    expect(audit.status).toBe('HOLD_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW');
    expect(audit.studyTarget).toBe('fr');
    expect(audit.sourceStudyTarget).toBe('en');
    expect(audit.sourceLocales).toEqual(['ru', 'uk']);
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary).toMatchObject({
      bankCandidateRows: 56,
      reviewRequestRows: 56,
      duplicateRequestIds: 0,
      unsafeRows: 0,
      deepReasoningRows: 56,
      sourceSafeRows: 56,
      readyForExternalReview: true,
      readyForDecisionImport: false,
      readyForRuntimeEnable: false,
      readyForApply: false,
    });
    expect(audit.blockers).toEqual([]);
    expect(audit.outputs.futureDecisionsJsonl).toBe('docs/gustav/generated/fr/personal_practice/fr_personal_practice_native_bank_review_decisions_v1.jsonl');

    expect(requests).toHaveLength(56);
    expect(requests[0]).toMatchObject({
      schemaVersion: 'gustav-fr-personal-practice-native-bank-review-request-v1',
      requestId: 'fr.personal_practice.native_bank.01.review_request.v1',
      reviewScope: 'personal_practice_native_bank_row',
      sourceQueueIndex: 1,
      frenchTrainingId: 'fr_partitive_indefinite_articles',
      sourceEnglishTrainingId: 'article_a_an',
      studyTarget: 'fr',
      targetContentLang: 'fr',
      aiOutputLang: 'fr',
      sourceLocaleCoverage: ['ru', 'uk'],
    });
    expect(requests[0].instructions.reasoningLevel).toBe('deep');
    expect(requests[0].outputJsonSchema.properties.requestId.const).toBe(requests[0].requestId);
    expect(requests[0].outputJsonSchema.properties.reviewerImportAllowed.const).toBe(false);
    expect(requests[0].blankResponseTemplate).toMatchObject({
      reviewerDecision: '',
      reviewerImportAllowed: false,
      productionApplyAllowed: false,
      activationApproved: false,
    });
    for (const request of requests) {
      expect(request.candidate.studyTarget).toBe('fr');
      expect(request.candidate.generationContract.mayTranslateEnglishTrainingText).toBe(false);
      expect(request.trustedSourceContext.policy.officialOrTrustedEvidenceRequired).toBe(true);
      expect(request.safety).toMatchObject({
        requestOnly: true,
        llmDecisionAlreadyFilled: false,
        reviewerDecisionsImportedByThisRequest: false,
        appBundleModifiedByThisRequest: false,
        serverUploadStarted: false,
        runtimeDownloadsEnabled: false,
        activationApproved: false,
      });
    }
  });
});
