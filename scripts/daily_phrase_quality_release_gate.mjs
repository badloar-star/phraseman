import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { validateTargetDailyPhraseBank } from './validate_target_daily_phrase_bank.mjs';
import { isTrustedDailyPhraseReceipt } from './daily_phrase_trusted_receipt_verifier.mjs';
import { evaluateDailyPhraseBatchStyle } from './daily_phrase_style_gate.mjs';
import { evaluateDailyPhraseQuizContent } from './daily_phrase_quiz_content_gate.mjs';
import { evaluateDailyPhraseEnglishBaseline } from './daily_phrase_english_baseline.mjs';
import { isStrictUtcInstant } from './daily_phrase_time.mjs';

export const DAILY_PHRASE_QUALITY_JUDGES = Object.freeze([
  'judge_truth', 'judge_reader', 'judge_pedagogy', 'judge_distractors', 'judge_locale', 'judge_taste',
]);
export const DAILY_PHRASE_QUALITY_CONTRACT_VERSION = 'daily-phrase-quality-v1';

const text = (value) => typeof value === 'string' ? value.trim() : '';
const artifactBytes = (value) => {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === 'string') return value;
  return JSON.stringify(value) ?? String(value);
};
const sha256 = (value) => createHash('sha256').update(artifactBytes(value)).digest('hex');
const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');
const emptyFindings = (receipt) => Array.isArray(receipt?.findings) && !receipt.findings.length
  && Array.isArray(receipt?.mustFix) && !receipt.mustFix.length;

function baselineIssue(code, message) {
  return { rowId: '__baseline__', code, message };
}

function snapshotEnglishBaselineArtifact(artifact) {
  if (artifact === undefined || artifact === null) {
    return {
      bytes: Buffer.alloc(0),
      issues: [baselineIssue('english_baseline.missing', 'Hash-bound English baseline artifact is required')],
    };
  }

  if (Buffer.isBuffer(artifact)) return { bytes: Buffer.from(artifact), issues: [] };
  if (typeof artifact === 'string') return { bytes: Buffer.from(artifact, 'utf8'), issues: [] };

  try {
    const serialized = JSON.stringify(artifact);
    if (typeof serialized !== 'string') throw new TypeError('Artifact is not JSON serializable');
    return { bytes: Buffer.from(serialized, 'utf8'), issues: [] };
  } catch {
    return {
      bytes: Buffer.alloc(0),
      issues: [baselineIssue('english_baseline.unserializable', 'English baseline artifact must be JSON serializable')],
    };
  }
}

function parseEnglishBaselineSnapshot(snapshot) {
  if (snapshot.issues.length) return { rows: [], issues: snapshot.issues };

  let parsed;
  try {
    parsed = JSON.parse(snapshot.bytes.toString('utf8'));
  } catch {
    return {
      rows: [],
      issues: [baselineIssue('english_baseline.malformed_json', 'English baseline artifact must contain valid JSON')],
    };
  }

  const evaluated = evaluateDailyPhraseEnglishBaseline(parsed, { requireCanonical: true });
  return { rows: evaluated.rows, issues: evaluated.issues };
}

function receiptIssue(receipt, judge, rowId, authority, verifyReceiptIssuer) {
  const prefix = `row:${rowId}`;
  if (!receipt || receipt.judge !== judge || receipt.rowId !== rowId) return `${prefix}:invalid_${judge}_receipt`;
  if (receipt.contractVersion !== DAILY_PHRASE_QUALITY_CONTRACT_VERSION) return `${prefix}:${judge}_invalid_contract_version`;
  if (receipt.candidateBankSha256 !== authority.bank || receipt.rowSha256 !== authority.rows[rowId]
    || receipt.sourceEvidenceSha256 !== authority.source || receipt.englishBaselineSha256 !== authority.baseline
    || receipt.priorAcceptedManifestSha256 !== authority.prior) return `${prefix}:${judge}_stale_artifact_hash`;
  if (receipt.verdict !== 'PASS' || !emptyFindings(receipt)) return `${prefix}:${judge}_unresolved_findings`;
  if (!Array.isArray(receipt.evidenceQuotes) || !receipt.evidenceQuotes.length || !isStrictUtcInstant(receipt.reviewedAt)) return `${prefix}:${judge}_missing_review_evidence`;
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
    && isStrictUtcInstant(receipt.reviewedAt)
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
  const englishBaselineSnapshot = snapshotEnglishBaselineArtifact(input?.englishBaselineArtifact);
  const englishBaseline = parseEnglishBaselineSnapshot(englishBaselineSnapshot);
  const evaluatedQuiz = evaluateDailyPhraseQuizContent(rows, {
    targetRows: rows,
    englishRows: englishBaseline.rows,
  });
  const quizIssues = [...englishBaseline.issues, ...evaluatedQuiz.issues];
  const quiz = {
    ...evaluatedQuiz,
    verdict: quizIssues.length ? 'HOLD' : 'PASS',
    issues: quizIssues,
  };
  const expectedRowIds = rows.map((row) => text(row?.id)).filter(Boolean);
  const verifyReceiptIssuer = isTrustedDailyPhraseReceipt;
  const authority = {
    bank: sha256(bank),
    source: sha256(input?.sourceEvidenceArtifact),
    baseline: sha256Bytes(englishBaselineSnapshot.bytes),
    prior: sha256(input?.priorAcceptedManifestArtifact),
    rows: Object.fromEntries(rows.map((row) => [text(row?.id), sha256(row)])),
  };
  const guardian = input?.guardian;
  const progression = input?.bankProgression;
  const receipts = Array.isArray(input?.receipts) ? input.receipts : [];

  if (structural.status !== 'STRUCTURAL_PASS') issues.push('candidate_bank_not_structurally_ready');
  if (style.verdict !== 'PASS') issues.push('candidate_bank_style_hold');
  if (quiz.verdict !== 'PASS') issues.push('candidate_bank_quiz_hold');
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
  return { verdict: issues.length ? 'HOLD' : 'PASS', issues, authority, style, quiz };
}

export default evaluateDailyPhraseQualityRelease;
