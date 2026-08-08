declare const require: any;

const review = require('../scripts/lib/heisenberg_review_core.cjs');
const runtime = require('../scripts/lib/heisenberg_scoped_runtime_evidence_core.cjs');

function fixture() {
  const candidate = {
    schema: 'heisenberg-existing-runtime-review-candidate-v1',
    id: 'existing:unit-1',
    origin: 'existing-runtime',
    status: 'EXISTING_NEEDS_REVIEW',
    integrated: true,
    studyTarget: 'en',
    surface: 'ui-locale',
    unitKey: 'unit-1',
    file: 'constants/demo_i18n.ts',
    keyPath: 'save.pt-BR',
    targetItemId: 'target-1',
    targetItemKeyPath: 'save.pt-BR',
    sourceLocale: 'ru',
    sourceText: 'Сохранить',
    sourceTexts: { ru: 'Сохранить', uk: 'Зберегти', es: 'Guardar' },
    targetLocale: 'pt-BR',
    targetText: 'Salvar',
    machineGenerated: false,
    activationApproved: false,
  };
  const packet = review.buildReviewPacketRow(candidate);
  const finalized = review.finalizeReview([candidate], [packet], [{
    id: candidate.id,
    verdict: 'APPROVE',
    reviewerId: 'ptbr-linguist',
    reviewedAt: '2026-07-11T21:00:00.000Z',
    note: 'Checked in UI context.',
    bindingHash: packet.bindingHash,
  }]);
  return {
    candidate,
    approved: finalized.approved[0],
    ledger: { rows: [{ sourceLocale: 'pt-BR', surface: 'ui-locale', unitKey: 'unit-1', targetPresent: true, structurallyValid: true }] },
    reviewReport: { status: 'APPROVED_EXISTING_RUNTIME_REVIEW', activationApproved: false },
    runtimeChecks: {
      localeRegistered: true,
      nonProductionSelectionVerified: true,
      targetCopySelected: true,
      russianFallbackAbsent: true,
      studyTargetEnglishPreserved: true,
      focusedTestsPassed: true,
      activationPerformed: false,
    },
  };
}

describe('Heisenberg scoped runtime evidence', () => {
  it('verifies a complete reviewed scope while keeping production release closed', () => {
    const f = fixture();
    const evidence = runtime.buildScopedRuntimeEvidence({
      ...f,
      candidates: [f.candidate],
      approvedRows: [f.approved],
      locale: 'pt-BR',
      surface: 'ui-locale',
    });
    expect(evidence).toMatchObject({
      status: 'SCOPED_RUNTIME_VERIFIED_NO_ACTIVATION',
      scopedRuntimeReady: true,
      productionReleaseReady: false,
      activationApproved: false,
      blockers: [],
    });
  });

  it('holds on partial review, tampered bindings, fallback or activation', () => {
    const f = fixture();
    const evidence = runtime.buildScopedRuntimeEvidence({
      ...f,
      candidates: [f.candidate],
      approvedRows: [{ ...f.approved, targetText: 'Guardar' }],
      reviewReport: { status: 'HOLD_NO_RUNTIME_REVIEW_ARTIFACT', activationApproved: false },
      runtimeChecks: { ...f.runtimeChecks, russianFallbackAbsent: false, activationPerformed: true },
      locale: 'pt-BR',
      surface: 'ui-locale',
    });
    expect(evidence.scopedRuntimeReady).toBe(false);
    expect(evidence.blockers).toEqual(expect.arrayContaining([
      'existing-review-report-not-approved',
      'approved-review-binding-mismatch:unit-1',
      'runtime-check-failed:russianFallbackAbsent',
      'production-activation-boundary-invalid',
    ]));
  });

  it('rejects an approved row tampered and self-rehashed after review', () => {
    const f = fixture();
    const tampered = { ...f.approved, targetText: 'Guardar' };
    const selfHashes = review.buildReviewPacketRow(tampered);
    tampered.sourceHash = selfHashes.sourceHash;
    tampered.targetHash = selfHashes.targetHash;
    tampered.bindingHash = selfHashes.bindingHash;
    const evidence = runtime.buildScopedRuntimeEvidence({
      ...f,
      candidates: [f.candidate],
      approvedRows: [tampered],
      locale: 'pt-BR',
      surface: 'ui-locale',
    });
    expect(evidence.scopedRuntimeReady).toBe(false);
    expect(evidence.blockers).toContain('approved-review-binding-mismatch:unit-1');
  });
});
