import { createHash } from 'node:crypto';
import { validateTargetDailyPhraseBank } from './validate_target_daily_phrase_bank.mjs';
import { isTrustedDailyPhraseReceipt } from './daily_phrase_trusted_receipt_verifier.mjs';
import { evaluateDailyPhraseBatchStyle } from './daily_phrase_style_gate.mjs';

export const DAILY_PHRASE_QUALITY_JUDGES = Object.freeze([
  'judge_truth', 'judge_reader', 'judge_pedagogy', 'judge_distractors', 'judge_locale', 'judge_taste',
]);
export const DAILY_PHRASE_QUALITY_CONTRACT_VERSION = 'daily-phrase-quality-v1';

const text = (value) => typeof value === 'string' ? value.trim() : '';
const sha256 = (value) => createHash('sha256')
  .update(typeof value === 'string' ? value : JSON.stringify(value))
  .digest('hex');
const emptyFindings = (receipt) => Array.isArray(receipt?.findings) && !receipt.findings.length
  && Array.isArray(receipt?.mustFix) && !receipt.mustFix.length;

function receiptIssue(receipt, judge, rowId, authority, verifyReceiptIssuer) {
  const prefix = `row:${rowId}`;
  if (!receipt || receipt.judge !== judge || receipt.rowId !== rowId) return `${prefix}:invalid_${judge}_receipt`;
  if (receipt.contractVersion !== DAILY_PHRASE_QUALITY_CONTRACT_VERSION) return `${prefix}:${judge}_invalid_contract_version`;
  if (receipt.candidateBankSha256 !== authority.bank || receipt.rowSha256 !== authority.rows[rowId]
    || receipt.sourceEvidenceSha256 !== authority.source || receipt.englishBaselineSha256 !== authority.baseline
    || receipt.priorAcceptedManifestSha256 !== authority.prior) return `${prefix}:${judge}_stale_artifact_hash`;
  if (receipt.verdict !== 'PASS' || !emptyFindings(receipt)) return `${prefix}:${judge}_unresolved_findings`;
  if (!Array.isArray(receipt.evidenceQuotes) || !receipt.evidenceQuotes.length || !Number.isFinite(Date.parse(receipt.reviewedAt))) return `${prefix}:${judge}_missing_review_evidence`;
  if (receipt.reviewerIndependence !== true || !verifyReceiptIssuer(receipt)) return `${prefix}:${judge}_untrusted_reviewer`;
  return null;
}

function bankReceiptIsValid(receipt, judge, authority, verifyReceiptIssuer) {
  return receipt?.judge === judge
    && receipt?.contractVersion === DAILY_PHRASE_QUALITY_CONTRACT_VERSION
    && receipt?.candidateBankSha256 === authority.bank
    && receipt?.sourceEvidenceSha256 === authority.source
    && receipt?.englishBaselineSha256 === authority.baseline
    && receipt?.priorAcceptedManifestSha256 === authority.prior
    && receipt?.verdict === 'PASS'
    && emptyFindings(receipt)
    && Array.isArray(receipt.evidenceQuotes) && receipt.evidenceQuotes.length > 0
    && Number.isFinite(Date.parse(receipt.reviewedAt))
    && receipt?.reviewerIndependence === true
    && verifyReceiptIssuer(receipt);
}

/**
 * Release accepts canonical artifact bytes, not author-supplied digests.
 * The verifier is imported from an orchestrator-owned trust root. It starts
 * closed, so candidate JSON cannot mint reviewer authority.
 */
export function evaluateDailyPhraseQualityRelease(input) {
  const issues = [];
  const bank = input?.bank;
  const structural = validateTargetDailyPhraseBank(bank);
  const rows = Array.isArray(bank?.rows) ? bank.rows : [];
  const style = evaluateDailyPhraseBatchStyle(rows);
  const expectedRowIds = rows.map((row) => text(row?.id)).filter(Boolean);
  const verifyReceiptIssuer = isTrustedDailyPhraseReceipt;
  const authority = {
    bank: sha256(bank),
    source: sha256(input?.sourceEvidenceArtifact),
    baseline: sha256(input?.englishBaselineArtifact),
    prior: sha256(input?.priorAcceptedManifestArtifact),
    rows: Object.fromEntries(rows.map((row) => [text(row?.id), sha256(row)])),
  };
  const guardian = input?.guardian;
  const progression = input?.bankProgression;
  const receipts = Array.isArray(input?.receipts) ? input.receipts : [];

  if (structural.status !== 'STRUCTURAL_PASS') issues.push('candidate_bank_not_structurally_ready');
  if (style.verdict !== 'PASS') issues.push('candidate_bank_style_hold');
  if (expectedRowIds.length !== 176 || new Set(expectedRowIds).size !== 176) issues.push('expected_row_ids_must_be_176_for_release');
  if (bank?.activationApproved !== false) issues.push('candidate_activation_must_remain_closed');
  if (!input?.sourceEvidenceArtifact || !input?.englishBaselineArtifact || !input?.priorAcceptedManifestArtifact) issues.push('missing_canonical_authority_artifact');
  if (!bankReceiptIsValid(guardian, 'prephrase_guardian', authority, verifyReceiptIssuer)) issues.push('missing_or_stale_trusted_prephrase_guardian');
  if (!bankReceiptIsValid(progression, 'judge_bank_progression', authority, verifyReceiptIssuer)
    || progression?.rowId !== '__bank__') issues.push('missing_or_stale_trusted_bank_progression_receipt');

  for (const rowId of expectedRowIds) {
    for (const judge of DAILY_PHRASE_QUALITY_JUDGES) {
      const matches = receipts.filter((receipt) => receipt?.rowId === rowId && receipt?.judge === judge);
      if (matches.length !== 1) {
        issues.push(matches.length ? `row:${rowId}:duplicate_${judge}_receipt` : `row:${rowId}:missing_${judge}_receipt`);
        continue;
      }
      const issue = receiptIssue(matches[0], judge, rowId, authority, verifyReceiptIssuer);
      if (issue) issues.push(issue);
    }
  }
  return { verdict: issues.length ? 'HOLD' : 'PASS', issues, authority, style };
}

export default evaluateDailyPhraseQualityRelease;
