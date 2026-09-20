import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSpanishCvcScaffold } from '../scripts/sync_spanish_daily_phrase_cvc_scaffold.mjs';

function fixture() {
  const authored = {
    id: 'es-001', order: 1, studyTarget: 'es', sourceLocale: 'ru', surface: 'daily_phrase',
    targetText: 'Primera frase', targetExample: 'Ejemplo.', literal_ru: 'RU', meaning_ru: 'RU meaning',
    text_ru: 'RU text', literal_uk: 'UK', meaning_uk: 'UK meaning', text_uk: 'UK text',
    allowSave: true, active: false, activationApproved: false,
    candidateStatus: 'CANDIDATE_PENDING_INDEPENDENT_REVIEW',
    sourceEvidence: { sourceLedgerRef: 'cvc-source-ledger.json#rows[0]', sourceId: '1' },
  };
  const hold = {
    id: 'es-002', order: 2, studyTarget: 'es', sourceLocale: 'ru', surface: 'daily_phrase',
    targetText: 'Old unrelated phrase', targetExample: 'Old.', literal_ru: 'Old', meaning_ru: 'Old', text_ru: 'Old',
    literal_uk: 'Old', meaning_uk: 'Old', text_uk: 'Old', allowSave: true, active: false,
    activationApproved: false, candidateStatus: 'HOLD', sourceEvidence: { status: 'HOLD' },
  };
  const rows = [
    { sourceId: '1', sourceUrl: 'https://example.test/1', httpStatus: 200, targetText: 'Primera frase', definitionQuote: 'Uno.', usageMarker: 'Muy usado' },
    { sourceId: '2', sourceUrl: 'https://example.test/2', httpStatus: 200, targetText: 'Segunda frase', definitionQuote: 'Dos.', usageMarker: 'De uso actual' },
  ];
  return {
    bank: { version: 1, studyTarget: 'es', rows: [authored, hold] },
    ledger: { source: 'Centro Virtual Cervantes — Refranero Multilingüe', checkedAt: '2026-09-20T00:00:00.000Z', rows },
    linkage: { authoritativeLedger: { path: 'cvc-source-ledger.json' }, linkedCandidateRows: [{ rowId: 'es-001', cvcRow: 0, sourceId: '1' }] },
  };
}

test('preserves authored rows byte-for-byte and source-links only HOLD rows', () => {
  const input = fixture();
  const authoredBefore = structuredClone(input.bank.rows[0]);
  const result = buildSpanishCvcScaffold(input, { fromOrder: 2 });
  assert.deepEqual(result.bank.rows[0], authoredBefore);
  const row = result.bank.rows[1];
  assert.equal(row.targetText, 'Segunda frase');
  assert.equal(row.candidateStatus, 'HOLD');
  assert.equal(row.active, false);
  assert.equal(row.activationApproved, false);
  assert.match(row.targetExample, /Segunda frase/u);
  assert.equal(row.sourceEvidence.sourceLedgerRef, 'cvc-source-ledger.json#rows[1]');
  assert.equal(row.sourceEvidence.definitionQuote, 'Dos.');
  assert.deepEqual(result.linkage.linkedCandidateRows[1], { rowId: 'es-002', cvcRow: 1, sourceId: '2' });
  assert.equal(result.scaffoldedRows, 1);
});

test('is idempotent on an already scaffolded HOLD bank', () => {
  const once = buildSpanishCvcScaffold(fixture(), { fromOrder: 2 });
  const twice = buildSpanishCvcScaffold(once, { fromOrder: 2 });
  assert.deepEqual(twice.bank, once.bank);
  assert.deepEqual(twice.linkage, once.linkage);
});

test('refuses to hide a ledger mismatch in an authored row', () => {
  const input = fixture();
  input.bank.rows[0].targetText = 'Conflicting authored phrase';
  assert.throws(
    () => buildSpanishCvcScaffold(input, { fromOrder: 2 }),
    /Authored row es-001 conflicts with CVC ledger row 0/u,
  );
});

test('refuses a bank whose row order cannot map one-to-one to the ledger', () => {
  const input = fixture();
  input.bank.rows[1].order = 3;
  assert.throws(() => buildSpanishCvcScaffold(input, { fromOrder: 2 }), /order 3/u);
});
