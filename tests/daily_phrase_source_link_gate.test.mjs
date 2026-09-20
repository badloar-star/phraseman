import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { evaluateDailyPhraseSourceLinks } from '../scripts/daily_phrase_source_link_gate.mjs';

const ledgerRow = {
  sourceId: '42',
  sourceUrl: 'https://example.test/42',
  httpStatus: 200,
  targetText: 'La frase exacta',
  definitionQuote: 'Definición exacta.',
  usageMarker: 'De uso actual',
};

function validInput() {
  return {
    bank: {
      rows: [{
        id: 'es-001',
        targetText: ledgerRow.targetText,
        targetExample: 'En la conversación apareció La frase exacta sin cambiar sus palabras.',
        candidateStatus: 'CANDIDATE_PENDING_INDEPENDENT_REVIEW',
        literal_ru: 'Буквально: «Точная фраза».',
        meaning_ru: 'Точное русское значение.',
        literal_uk: 'Буквально: «Точна фраза».',
        meaning_uk: 'Точне українське значення.',
        sourceEvidence: {
          sourceType: 'Centro Virtual Cervantes — Refranero Multilingüe',
          sourceLedgerRef: 'cvc-source-ledger.json#rows[0]',
          sourceId: ledgerRow.sourceId,
          sourceUrl: ledgerRow.sourceUrl,
          httpStatus: ledgerRow.httpStatus,
          definitionQuote: ledgerRow.definitionQuote,
          usageMarker: ledgerRow.usageMarker,
        },
      }],
    },
    ledger: { rows: [{ ...ledgerRow }] },
    linkage: {
      linkedCandidateRows: [{ rowId: 'es-001', cvcRow: 0, sourceId: '42' }],
    },
  };
}

test('passes only when candidate row, CVC evidence and linkage agree byte-for-byte', () => {
  const result = evaluateDailyPhraseSourceLinks(validInput(), ['es-001']);
  assert.equal(result.verdict, 'PASS');
  assert.deepEqual(result.issues, []);
});

test('holds when the learner target does not match the linked CVC row', () => {
  const input = validInput();
  input.bank.rows[0].targetText = 'Una frase inventada';
  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'target.mismatch'));
});

test('allows editorial punctuation while preserving the exact lexical target', () => {
  const input = validInput();
  input.ledger.rows[0].targetText = 'Quien a buen árbol se arrima buena sombra le cobija';
  input.bank.rows[0].targetText = 'Quien a buen árbol se arrima, buena sombra le cobija';
  input.bank.rows[0].targetExample = 'Quien a buen árbol se arrima, buena sombra le cobija.';
  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'PASS');
});

test('holds when the authored example omits the exact target lexical sequence', () => {
  const input = validInput();
  input.bank.rows[0].targetExample = 'En la conversación apareció una frase parecida, pero no la expresión exacta.';
  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'target_example.target_missing'));
});

test('holds when the exact source quotation is changed', () => {
  const input = validInput();
  input.bank.rows[0].sourceEvidence.definitionQuote = 'Resumen libre.';
  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'evidence.definition_quote_mismatch'));
});

test('holds when an authored row is absent from the explicit linkage manifest', () => {
  const input = validInput();
  input.linkage.linkedCandidateRows = [];
  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'linkage.missing'));
});

test('holds when the ledger pointer disagrees with the linkage manifest', () => {
  const input = validInput();
  input.bank.rows[0].sourceEvidence.sourceLedgerRef = 'cvc-source-ledger.json#rows[1]';
  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'evidence.ledger_ref_mismatch'));
});

test('holds when a requested row is still a HOLD placeholder', () => {
  const input = validInput();
  const row = input.bank.rows[0];
  row.candidateStatus = 'HOLD';
  row.literal_ru = `Буквальный перевод «${row.targetText}» будет написан после редакционной проверки.`;
  row.meaning_ru = `Точное значение «${row.targetText}» будет сформулировано после независимой проверки источника.`;
  row.literal_uk = `Буквальний переклад «${row.targetText}» буде написано після редакційної перевірки.`;
  row.meaning_uk = `Точне значення «${row.targetText}» буде сформульовано після незалежної перевірки джерела.`;
  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'HOLD');
  assert.deepEqual(result.issues.map((item) => item.code), ['candidate.not_authored']);
});

test('holds an authored candidate when required Russian or Ukrainian literal/meaning fields are blank or missing', () => {
  const expected = [
    'translation.literal_ru_missing',
    'translation.meaning_ru_missing',
    'translation.literal_uk_missing',
    'translation.meaning_uk_missing',
  ];
  for (const mutation of [
    (row) => {
      row.literal_ru = '   ';
      row.meaning_ru = '   ';
      row.literal_uk = '   ';
      row.meaning_uk = '   ';
    },
    (row) => {
      delete row.literal_ru;
      delete row.meaning_ru;
      delete row.literal_uk;
      delete row.meaning_uk;
    },
  ]) {
    const input = validInput();
    mutation(input.bank.rows[0]);
    const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
    assert.equal(result.verdict, 'HOLD');
    assert.deepEqual(result.issues.map((item) => item.code), expected);
  }
});

test('holds an authored candidate when required Russian or Ukrainian literal/meaning text retains factory placeholders', () => {
  const input = validInput();
  const row = input.bank.rows[0];
  row.literal_ru = `Буквальный перевод «${row.targetText}» будет написан после редакционной проверки.`;
  row.meaning_ru = `Точное значение «${row.targetText}» будет сформулировано после независимой проверки источника.`;
  row.literal_uk = `Буквальний переклад «${row.targetText}» буде написано після редакційної перевірки.`;
  row.meaning_uk = `Точне значення «${row.targetText}» буде сформульовано після незалежної перевірки джерела.`;
  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'HOLD');
  assert.deepEqual(result.issues.map((item) => item.code), [
    'translation.literal_ru_factory_placeholder',
    'translation.meaning_ru_factory_placeholder',
    'translation.literal_uk_factory_placeholder',
    'translation.meaning_uk_factory_placeholder',
  ]);
});

test('the accepted Spanish first 20 remain linked to the frozen CVC snapshot', () => {
  const read = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
  const ids = Array.from({ length: 20 }, (_, index) => `es-${String(index + 1).padStart(3, '0')}`);
  const result = evaluateDailyPhraseSourceLinks({
    bank: read('../content/daily-phrases/es/source-bank.json'),
    ledger: read('../content/daily-phrases/es/cvc-source-ledger.json'),
    linkage: read('../content/daily-phrases/es/source-ledger.json'),
  }, ids);
  assert.equal(result.verdict, 'PASS', JSON.stringify(result.issues, null, 2));
});
