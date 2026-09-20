import { evaluateDailyPhraseQualityRelease } from '../scripts/daily_phrase_quality_release_gate.mjs';

const JUDGES = ['judge_truth', 'judge_reader', 'judge_pedagogy', 'judge_distractors', 'judge_locale', 'judge_taste'] as const;
const now = '2026-09-19T12:00:00.000Z';
const artifact = 'immutable fixture artifact';

function bank() {
  return {
    studyTarget: 'es', sourceLocale: 'ru', surface: 'daily_phrase', activationApproved: false,
    rows: Array.from({ length: 176 }, (_, index) => ({
      id: `es-${index + 1}`, order: index + 1, studyTarget: 'es', sourceLocale: 'ru', surface: 'daily_phrase',
      targetText: `expresión ${index + 1}`, targetExample: `Ejemplo natural ${index + 1}`,
      literal_ru: `буквально ${index + 1}`, meaning_ru: `значение ${index + 1}`, text_ru: `Пояснение ${index + 1}`,
      literal_uk: `буквально ${index + 1}`, meaning_uk: `значення ${index + 1}`, text_uk: `Пояснення ${index + 1}`,
      allowSave: true, active: false, activationApproved: false,
    })),
  };
}

function releaseInput() {
  const candidate = bank();
  const base = { bank: candidate, sourceEvidenceArtifact: artifact, englishBaselineArtifact: artifact, priorAcceptedManifestArtifact: artifact };
  const first = evaluateDailyPhraseQualityRelease(base);
  const authority = first.authority;
  const signed = (judge: string, rowId?: string) => ({
    judge, contractVersion: 'daily-phrase-quality-v1', candidateBankSha256: authority.bank,
    ...(rowId ? { rowId, rowSha256: authority.rows[rowId] } : {}),
    sourceEvidenceSha256: authority.source, englishBaselineSha256: authority.baseline, priorAcceptedManifestSha256: authority.prior,
    verdict: 'PASS', findings: [], mustFix: [], evidenceQuotes: ['verified immutable artifact'], reviewedAt: now,
    reviewerIndependence: true, reviewerIdentity: `trusted:${judge}`,
  });
  return {
    ...base,
    guardian: signed('prephrase_guardian'), bankProgression: { ...signed('judge_bank_progression'), rowId: '__bank__' },
    receipts: candidate.rows.flatMap((row) => JUDGES.map((judge) => signed(judge, row.id))),
  };
}

describe('Daily Phrase quality release gate', () => {
  it('holds incomplete banks even with otherwise valid-looking receipts', () => {
    const input = releaseInput();
    input.bank.rows.pop();
    expect(evaluateDailyPhraseQualityRelease(input).verdict).toBe('HOLD');
  });

  it('holds every candidate until the orchestrator-owned trust root validates receipts', () => {
    const input = releaseInput();
    expect(evaluateDailyPhraseQualityRelease(input).issues).toContain('missing_or_stale_trusted_prephrase_guardian');
  });

  it('does not let a caller-provided verifier mint a release', () => {
    const input = { ...releaseInput(), verifyReceiptIssuer: () => true };
    expect(evaluateDailyPhraseQualityRelease(input).verdict).toBe('HOLD');
  });
});
