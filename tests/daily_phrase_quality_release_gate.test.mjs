import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

import { evaluateDailyPhraseQualityRelease } from '../scripts/daily_phrase_quality_release_gate.mjs';

const spanishBank = JSON.parse(fs.readFileSync(
  new URL('../content/daily-phrases/es/source-bank.json', import.meta.url),
  'utf8',
));
const englishSeed = JSON.parse(fs.readFileSync(
  new URL('../admin/daily_phrases_seed.json', import.meta.url),
  'utf8',
));

function clone(value) {
  return structuredClone(value);
}

function inputWith(bank, englishBaselineArtifact) {
  return {
    bank,
    sourceEvidenceArtifact: { source: 'test-fixture' },
    englishBaselineArtifact,
    priorAcceptedManifestArtifact: { prior: 'test-fixture' },
  };
}

function assertQuizBaselineIssue(result, code) {
  assert.ok(result.quiz, 'release diagnostics must include the quiz gate result');
  assert.equal(result.quiz.verdict, 'HOLD');
  assert.ok(result.issues.includes('candidate_bank_quiz_hold'));
  assert.ok(result.quiz.issues.some((item) => item.code === code), JSON.stringify(result.quiz, null, 2));
}

test('real 176-row Spanish bank has no quiz hold with the real hash-bound English seed', () => {
  const result = evaluateDailyPhraseQualityRelease(inputWith(spanishBank, englishSeed));

  assert.ok(result.quiz, 'release diagnostics must include the quiz gate result');
  assert.equal(result.quiz.verdict, 'PASS', JSON.stringify(result.quiz.issues, null, 2));
  assert.ok(!result.issues.includes('candidate_bank_quiz_hold'));
  assert.equal(result.quiz.checkedRows.length, 176);
});

test('accepts English baseline rows from array, object.rows, JSON string, and Buffer artifacts', () => {
  const artifacts = [
    englishSeed,
    { rows: englishSeed },
    JSON.stringify(englishSeed),
    Buffer.from(JSON.stringify({ rows: englishSeed }), 'utf8'),
  ];

  for (const englishBaselineArtifact of artifacts) {
    const result = evaluateDailyPhraseQualityRelease(inputWith(spanishBank, englishBaselineArtifact));
    assert.ok(result.quiz, 'release diagnostics must include the quiz gate result');
    assert.equal(result.quiz.verdict, 'PASS', JSON.stringify(result.quiz.issues, null, 2));
    assert.ok(!result.issues.includes('candidate_bank_quiz_hold'));
  }
});

test('checks and hashes one serialized snapshot while rejecting substituted baseline authority', () => {
  const alteredRows = clone(englishSeed);
  alteredRows[0] = {
    ...alteredRows[0],
    meaning: spanishBank.rows[0].quiz_ru.distractors[0].text,
    meaning_uk: spanishBank.rows[0].quiz_uk.distractors[0].text,
  };
  const alteredBytes = Buffer.from(JSON.stringify(alteredRows), 'utf8');
  const expectedHash = createHash('sha256').update(alteredBytes).digest('hex');
  let serializationCount = 0;
  const artifact = {
    rows: englishSeed,
    toJSON() {
      serializationCount += 1;
      return alteredRows;
    },
  };

  const result = evaluateDailyPhraseQualityRelease(inputWith(spanishBank, artifact));

  assert.equal(serializationCount, 1, 'baseline must be serialized exactly once');
  assert.equal(result.authority.baseline, expectedHash);
  assert.equal(result.quiz.verdict, 'HOLD');
  assert.ok(result.issues.includes('candidate_bank_quiz_hold'));
  assert.ok(result.quiz.issues.some(
    (item) => item.code === 'english_baseline.authority_mismatch',
  ));
});

test('missing localized quizzes create a quiz hold with locale-specific diagnostics', () => {
  const bank = clone(spanishBank);
  delete bank.rows[0].quiz_ru;
  delete bank.rows[0].quiz_uk;

  const result = evaluateDailyPhraseQualityRelease(inputWith(bank, englishSeed));

  assert.ok(result.quiz, 'release diagnostics must include the quiz gate result');
  assert.equal(result.quiz.verdict, 'HOLD');
  assert.ok(result.issues.includes('candidate_bank_quiz_hold'));
  assert.ok(result.quiz.issues.some((item) => item.rowId === bank.rows[0].id && item.code === 'ru.quiz_missing'));
  assert.ok(result.quiz.issues.some((item) => item.rowId === bank.rows[0].id && item.code === 'uk.quiz_missing'));
});

test('English-pool copies and duplicate distractor answers create a quiz hold', () => {
  const bank = clone(spanishBank);
  const row = bank.rows[0];
  row.quiz_ru.distractors[0].text = englishSeed[0].meaning;
  row.quiz_ru.distractors[1].text = englishSeed[0].meaning;
  row.quiz_uk.distractors[0].text = englishSeed[0].meaning_uk;
  row.quiz_uk.distractors[1].text = englishSeed[0].meaning_uk;

  const result = evaluateDailyPhraseQualityRelease(inputWith(bank, englishSeed));

  assert.ok(result.quiz, 'release diagnostics must include the quiz gate result');
  assert.equal(result.quiz.verdict, 'HOLD');
  assert.ok(result.issues.includes('candidate_bank_quiz_hold'));
  assert.ok(result.quiz.issues.some((item) => item.code === 'ru.english_pool_copy'));
  assert.ok(result.quiz.issues.some((item) => item.code === 'uk.english_pool_copy'));
  assert.ok(result.quiz.issues.some((item) => item.code === 'ru.answer_not_distinct'));
  assert.ok(result.quiz.issues.some((item) => item.code === 'uk.answer_not_distinct'));
});

test('missing English artifact fails closed and ignores a separate un-hashed English row pool', () => {
  const result = evaluateDailyPhraseQualityRelease({
    ...inputWith(spanishBank, undefined),
    englishRows: englishSeed,
  });

  assertQuizBaselineIssue(result, 'english_baseline.missing');
});

test('malformed English JSON artifact fails closed', () => {
  const result = evaluateDailyPhraseQualityRelease(inputWith(spanishBank, '{not-json'));
  assertQuizBaselineIssue(result, 'english_baseline.malformed_json');
});

test('English artifact with an invalid shape fails closed', () => {
  const result = evaluateDailyPhraseQualityRelease(inputWith(spanishBank, { entries: englishSeed }));
  assertQuizBaselineIssue(result, 'english_baseline.invalid_shape');
});

test('English artifact with the wrong row count fails closed', () => {
  const result = evaluateDailyPhraseQualityRelease(inputWith(spanishBank, englishSeed.slice(0, 175)));
  assertQuizBaselineIssue(result, 'english_baseline.wrong_count');
});

test('circular and BigInt English artifacts fail closed without throwing', () => {
  const circular = { rows: englishSeed };
  circular.self = circular;
  const artifacts = [circular, { rows: englishSeed, revision: 1n }];

  for (const englishBaselineArtifact of artifacts) {
    let result;
    assert.doesNotThrow(() => {
      result = evaluateDailyPhraseQualityRelease(inputWith(spanishBank, englishBaselineArtifact));
    });
    assertQuizBaselineIssue(result, 'english_baseline.unserializable');
  }
});

function rowReceiptInput(reviewedAt) {
  const baseInput = inputWith(spanishBank, englishSeed);
  const authority = evaluateDailyPhraseQualityRelease(baseInput).authority;
  return {
    ...baseInput,
    receipts: [{
      judge: 'judge_truth',
      rowId: 'es-001',
      contractVersion: 'daily-phrase-quality-v1',
      candidateBankSha256: authority.bank,
      rowSha256: authority.rows['es-001'],
      sourceEvidenceSha256: authority.source,
      englishBaselineSha256: authority.baseline,
      priorAcceptedManifestSha256: authority.prior,
      verdict: 'PASS',
      findings: [],
      mustFix: [],
      evidenceQuotes: ['Evidence bound to the candidate row.'],
      reviewedAt,
      reviewerIndependence: true,
    }],
  };
}

test('rejects numeric reviewedAt in row receipts instead of relying on Date.parse coercion', () => {
  const result = evaluateDailyPhraseQualityRelease(rowReceiptInput(0));

  assert.ok(result.issues.includes('row:es-001:judge_truth_missing_review_evidence'));
});

test('rejects impossible reviewedAt calendar dates in row receipts', () => {
  const result = evaluateDailyPhraseQualityRelease(rowReceiptInput('2026-02-31T06:10:00.000Z'));

  assert.ok(result.issues.includes('row:es-001:judge_truth_missing_review_evidence'));
});
