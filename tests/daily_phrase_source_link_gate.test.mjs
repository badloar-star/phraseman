import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { evaluateDailyPhraseSourceLinks } from '../scripts/daily_phrase_source_link_gate.mjs';

const ledgerRow = {
  sourceId: '42',
  sourceName: 'Example Dictionary',
  sourceUrl: 'https://example.test/42',
  httpStatus: 200,
  retrievalMethod: 'official_dictionary_page',
  targetText: 'La frase exacta',
  definitionQuote: 'Definición exacta.',
  usageMarker: 'De uso actual',
};

function validInput() {
  return {
    bank: {
      studyTarget: 'es',
      sourceLocale: 'ru',
      surface: 'daily_phrase',
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
          sourceName: ledgerRow.sourceName,
          sourceUrl: ledgerRow.sourceUrl,
          httpStatus: ledgerRow.httpStatus,
          retrievalMethod: ledgerRow.retrievalMethod,
          definitionQuote: ledgerRow.definitionQuote,
          usageMarker: ledgerRow.usageMarker,
          checkedAt: '2026-09-27T06:00:00.000Z',
        },
      }],
    },
    ledger: {
      schemaVersion: 'daily-phrase-cvc-source-ledger-v1',
      studyTarget: 'es',
      source: 'Centro Virtual Cervantes — Refranero Multilingüe',
      checkedAt: '2026-09-27T06:00:00.000Z',
      rows: [{ ...ledgerRow }],
    },
    linkage: {
      schemaVersion: 'daily-phrase-source-linkage-v2',
      studyTarget: 'es',
      sourceLocale: 'ru',
      surface: 'daily_phrase',
      authoritativeLedger: {
        path: 'cvc-source-ledger.json',
        schemaVersion: 'daily-phrase-cvc-source-ledger-v1',
      },
      linkedCandidateRows: [{ rowId: 'es-001', cvcRow: 0, sourceId: '42' }],
    },
  };
}

test('passes only when candidate row, CVC evidence and linkage agree byte-for-byte', () => {
  const result = evaluateDailyPhraseSourceLinks(validInput(), ['es-001']);
  assert.equal(result.verdict, 'PASS');
  assert.deepEqual(result.issues, []);
});

test('accepts the target-neutral ledgerRow pointer with an explicit authoritative ledger path', () => {
  const input = validInput();
  input.bank.studyTarget = 'fr';
  input.bank.rows[0].id = 'fr-001';
  input.bank.rows[0].sourceEvidence.sourceLedgerRef = 'authoritative-source-ledger.json#rows[0]';
  input.ledger.schemaVersion = 'daily-phrase-authoritative-source-ledger-v1';
  input.ledger.studyTarget = 'fr';
  input.linkage.studyTarget = 'fr';
  input.linkage.authoritativeLedger = {
    path: 'authoritative-source-ledger.json',
    schemaVersion: 'daily-phrase-authoritative-source-ledger-v1',
  };
  input.linkage.linkedCandidateRows = [{ rowId: 'fr-001', ledgerRow: 0, sourceId: '42' }];

  const result = evaluateDailyPhraseSourceLinks(input, ['fr-001']);
  assert.equal(result.verdict, 'PASS', JSON.stringify(result.issues, null, 2));
  assert.deepEqual(result.issues, []);
});

test('holds when a declared authority descriptor schema disagrees with the supplied ledger', () => {
  const input = validInput();
  input.ledger.schemaVersion = 'daily-phrase-cvc-source-ledger-v1';
  input.linkage.authoritativeLedger = {
    path: 'cvc-source-ledger.json',
    schemaVersion: 'daily-phrase-authoritative-source-ledger-v1',
  };

  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'linkage.authority_schema_mismatch'));
});

test('holds malformed target-scoped source and linkage envelopes in the standalone evaluator', () => {
  const scenarios = [
    (input) => {
      input.ledger.schemaVersion = 'wrong-ledger-v99';
      input.linkage.authoritativeLedger.schemaVersion = 'wrong-ledger-v99';
    },
    (input) => { input.ledger.studyTarget = 'de'; },
    (input) => { input.linkage.schemaVersion = 'wrong-linkage-v99'; },
    (input) => { input.linkage.studyTarget = 'de'; },
    (input) => { input.linkage.sourceLocale = 'uk'; },
    (input) => { input.linkage.surface = 'learning_session'; },
  ];

  for (const mutate of scenarios) {
    const input = validInput();
    mutate(input);
    const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
    assert.equal(result.verdict, 'HOLD');
    assert.ok(result.issues.some((item) => item.code === 'envelope.invalid_scope'));
  }
});

test('the standalone CLI binds the linkage authority path to the supplied ledger filename', () => {
  const input = validInput();
  input.linkage.authoritativeLedger = {
    path: 'renamed-ledger.json',
    schemaVersion: input.ledger.schemaVersion,
  };
  input.bank.rows[0].sourceEvidence.sourceLedgerRef = 'renamed-ledger.json#rows[0]';
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-phrase-source-link-'));
  const bankPath = path.join(tempDir, 'bank.json');
  const ledgerPath = path.join(tempDir, 'actual-ledger.json');
  const linkagePath = path.join(tempDir, 'linkage.json');
  try {
    fs.writeFileSync(bankPath, JSON.stringify(input.bank));
    fs.writeFileSync(ledgerPath, JSON.stringify(input.ledger));
    fs.writeFileSync(linkagePath, JSON.stringify(input.linkage));
    const result = spawnSync(process.execPath, [
      'scripts/daily_phrase_source_link_gate.mjs',
      bankPath,
      ledgerPath,
      linkagePath,
      '--ids',
      'es-001',
    ], { cwd: process.cwd(), encoding: 'utf8' });

    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.match(result.stdout, /linkage\.authority_path_mismatch/u);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('explicit invalid ledger filenames cannot disable authority path binding', () => {
  for (const ledgerFileName of [null, 123, ['cvc-source-ledger.json'], '']) {
    const input = validInput();
    input.ledgerFileName = ledgerFileName;
    const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);

    assert.equal(result.verdict, 'HOLD', JSON.stringify(ledgerFileName));
    assert.ok(
      result.issues.some((item) => item.code === 'linkage.authority_path_mismatch'),
      JSON.stringify(ledgerFileName),
    );
  }
});

test('keeps the legacy cvcRow pointer backward compatible', () => {
  const input = validInput();
  assert.equal('ledgerRow' in input.linkage.linkedCandidateRows[0], false);

  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'PASS', JSON.stringify(result.issues, null, 2));
});

test('holds when generic and legacy ledger pointers disagree', () => {
  const input = validInput();
  input.ledger.rows.push({ ...ledgerRow, sourceId: '43' });
  input.linkage.linkedCandidateRows[0].ledgerRow = 1;

  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'linkage.ledger_row_conflict'));
});

test('holds when the learner target does not match the linked CVC row', () => {
  const input = validInput();
  input.bank.rows[0].targetText = 'Una frase inventada';
  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'target.mismatch'));
});

test('holds when either authored or authoritative targetText is not a string', () => {
  for (const mutate of [
    (input) => { input.bank.rows[0].targetText = ['La frase exacta']; },
    (input) => { input.ledger.rows[0].targetText = ['La frase exacta']; },
  ]) {
    const input = validInput();
    mutate(input);

    const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);

    assert.equal(result.verdict, 'HOLD');
    assert.ok(result.issues.some((item) => item.code === 'target.invalid_type'));
  }
});

test('allows editorial punctuation while preserving the exact lexical target', () => {
  const input = validInput();
  input.ledger.rows[0].targetText = 'Quien a buen árbol se arrima buena sombra le cobija';
  input.bank.rows[0].targetText = 'Quien a buen árbol se arrima, buena sombra le cobija';
  input.bank.rows[0].targetExample = 'Quien a buen árbol se arrima, buena sombra le cobija.';
  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'PASS');
});

test('holds when authored target punctuation introduces a terminal boundary absent from the authority', () => {
  const input = validInput();
  input.ledger.rows[0].targetText = 'Caballo grande, ande o no ande';
  input.bank.rows[0].targetText = 'Caballo. grande, ande o no ande';
  input.bank.rows[0].targetExample = 'Caballo. grande, ande o no ande';

  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'target.mismatch'));
});

test('holds when the authored example omits the exact target lexical sequence', () => {
  const input = validInput();
  input.bank.rows[0].targetExample = 'En la conversación apareció una frase parecida, pero no la expresión exacta.';
  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'target_example.target_missing'));
});

test('accepts an explicitly declared grammatical surface form of a lemma target', () => {
  const input = validInput();
  input.ledger.rows[0].targetText = 'jemandem sein Herz ausschütten';
  input.bank.rows[0].targetText = 'jemandem sein Herz ausschütten';
  input.bank.rows[0].targetExample = 'Anna wollte ihrer Schwester ihr Herz ausschütten.';
  input.bank.rows[0].targetSurfaceForms = {
    targetExample: 'ihrer Schwester ihr Herz ausschütten',
  };
  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'PASS', JSON.stringify(result.issues, null, 2));
});

test('rejects a declared target surface form that is not a plausible inflection', () => {
  const input = validInput();
  input.ledger.rows[0].targetText = 'jemandem sein Herz ausschütten';
  input.bank.rows[0].targetText = 'jemandem sein Herz ausschütten';
  input.bank.rows[0].targetExample = 'Anna wollte ein ruhiges Gespräch führen.';
  input.bank.rows[0].targetSurfaceForms = {
    targetExample: 'ein ruhiges Gespräch führen',
  };
  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'target_example.invalid_surface_form'));
});

test('holds when the exact source quotation is changed', () => {
  const input = validInput();
  input.bank.rows[0].sourceEvidence.definitionQuote = 'Resumen libre.';
  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'evidence.definition_quote_mismatch'));
});

test('holds when required evidence fields are absent from both authority and candidate', () => {
  const scenarios = [
    ['sourceId', 'authority.source_id_invalid'],
    ['sourceUrl', 'authority.source_url_invalid'],
    ['definitionQuote', 'authority.definition_quote_invalid'],
    ['usageMarker', 'authority.usage_marker_invalid'],
    ['httpStatus', 'authority.http_status_invalid'],
  ];

  for (const [field, expectedCode] of scenarios) {
    const input = validInput();
    delete input.ledger.rows[0][field];
    delete input.bank.rows[0].sourceEvidence[field];
    if (field === 'sourceId') delete input.linkage.linkedCandidateRows[0].sourceId;

    const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);

    assert.equal(result.verdict, 'HOLD', field);
    assert.ok(result.issues.some((item) => item.code === expectedCode), field);
  }
});

test('holds target-specific authoritative evidence that omits dictionary provenance fields', () => {
  const input = validInput();
  input.ledger.schemaVersion = 'daily-phrase-authoritative-source-ledger-v1';
  delete input.ledger.rows[0].sourceName;
  delete input.ledger.rows[0].retrievalMethod;
  delete input.bank.rows[0].sourceEvidence.sourceName;
  delete input.bank.rows[0].sourceEvidence.retrievalMethod;

  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'authority.source_name_invalid'));
  assert.ok(result.issues.some((item) => item.code === 'authority.retrieval_method_invalid'));
});

test('holds when source name or retrieval method overstates the linked provenance', () => {
  for (const [field, value, expectedCode] of [
    ['sourceName', 'Another Dictionary', 'evidence.source_name_mismatch'],
    ['retrievalMethod', 'official_dictionary_page_after_redirect', 'evidence.retrieval_method_mismatch'],
  ]) {
    const input = validInput();
    input.bank.rows[0].sourceEvidence[field] = value;
    const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
    assert.equal(result.verdict, 'HOLD', field);
    assert.ok(result.issues.some((item) => item.code === expectedCode), field);
  }
});

test('binds checkedAt to the linked source row before falling back to the ledger timestamp', () => {
  const input = validInput();
  input.ledger.checkedAt = '2026-09-26T12:00:00.000Z';
  input.ledger.rows[0].checkedAt = '2026-09-27T01:08:57.113Z';
  input.bank.rows[0].sourceEvidence.checkedAt = input.ledger.rows[0].checkedAt;

  const pass = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(pass.verdict, 'PASS', JSON.stringify(pass.issues, null, 2));

  input.bank.rows[0].sourceEvidence.checkedAt = input.ledger.checkedAt;
  const hold = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(hold.verdict, 'HOLD');
  assert.ok(hold.issues.some((item) => item.code === 'evidence.checked_at_mismatch'));
});

test('requires checkedAt evidence to be a strict real UTC instant', () => {
  for (const checkedAt of ['not-a-timestamp', '2026-02-31T06:00:00.000Z', 123]) {
    const input = validInput();
    input.ledger.checkedAt = checkedAt;
    input.bank.rows[0].sourceEvidence.checkedAt = checkedAt;
    const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);

    assert.equal(result.verdict, 'HOLD', String(checkedAt));
    assert.ok(result.issues.some((item) => item.code === 'authority.checked_at_invalid'));
    assert.ok(result.issues.some((item) => item.code === 'evidence.checked_at_invalid'));
  }

  const rowScoped = validInput();
  rowScoped.ledger.rows[0].checkedAt = '2026-02-31T06:00:00.000Z';
  rowScoped.bank.rows[0].sourceEvidence.checkedAt = rowScoped.ledger.rows[0].checkedAt;
  const rowResult = evaluateDailyPhraseSourceLinks(rowScoped, ['es-001']);
  assert.ok(rowResult.issues.some((item) => item.code === 'authority.checked_at_invalid'));
});

test('does not let a present null row checkedAt inherit the valid ledger timestamp', () => {
  const input = validInput();
  input.ledger.rows[0].checkedAt = null;
  input.bank.rows[0].sourceEvidence.checkedAt = input.ledger.checkedAt;

  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'authority.checked_at_invalid'));
});

test('holds when an authored row is absent from the explicit linkage manifest', () => {
  const input = validInput();
  input.linkage.linkedCandidateRows = [];
  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);
  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'linkage.missing'));
});

test('holds two candidates that reuse one authoritative ledger pointer', () => {
  const input = validInput();
  const second = structuredClone(input.bank.rows[0]);
  second.id = 'es-002';
  second.targetText = 'La, frase exacta';
  second.targetExample = 'En otra conversación apareció La, frase exacta con puntuación editorial.';
  input.bank.rows.push(second);
  input.linkage.linkedCandidateRows.push({ rowId: 'es-002', cvcRow: 0, sourceId: '42' });

  const result = evaluateDailyPhraseSourceLinks(input, ['es-001', 'es-002']);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'linkage.duplicate_authority_pointer'));
});

test('holds when a requested candidate id is duplicated in the bank', () => {
  const input = validInput();
  input.bank.rows.push(JSON.parse(JSON.stringify(input.bank.rows[0])));

  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'candidate.duplicate'));
});

test('holds duplicate selected candidate ids when no explicit id filter is supplied', () => {
  const input = validInput();
  input.bank.rows.push(JSON.parse(JSON.stringify(input.bank.rows[0])));

  const result = evaluateDailyPhraseSourceLinks(input);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'candidate.duplicate'));
});

test('reports a duplicate and a missing id even when their total row counts cancel out', () => {
  const input = validInput();
  input.bank.rows.push(JSON.parse(JSON.stringify(input.bank.rows[0])));

  const result = evaluateDailyPhraseSourceLinks(input, ['es-001', 'es-002']);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.rowId === 'es-001' && item.code === 'candidate.duplicate'));
  assert.ok(result.issues.some((item) => item.rowId === 'es-002' && item.code === 'candidate.missing'));
});

test('holds duplicate requested ids before Set deduplication can hide them', () => {
  const input = validInput();
  const result = evaluateDailyPhraseSourceLinks(input, ['es-001', 'es-001']);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'request.duplicate_id'));
});

test('source CLI fails closed on duplicate requested ids', () => {
  const result = spawnSync(process.execPath, [
    'scripts/daily_phrase_source_link_gate.mjs',
    'content/daily-phrases/es/source-bank.json',
    'content/daily-phrases/es/cvc-source-ledger.json',
    'content/daily-phrases/es/source-ledger.json',
    '--ids',
    'es-001,es-001',
  ], { cwd: process.cwd(), encoding: 'utf8' });
  const output = `${result.stdout}\n${result.stderr}`;

  assert.notEqual(result.status, 0, output);
  assert.match(output, /request\.duplicate_id|duplicate[^\n]*es-001/iu);
});

test('holds a candidate row id encoded as a one-element array instead of a string', () => {
  const input = validInput();
  input.bank.rows[0].id = ['es-001'];

  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'candidate.invalid_id_type'));
  assert.ok(result.issues.some((item) => item.rowId === 'es-001' && item.code === 'candidate.missing'));
});

test('holds a linkage row id encoded as a one-element array instead of a string', () => {
  const input = validInput();
  input.linkage.linkedCandidateRows[0].rowId = ['es-001'];

  const result = evaluateDailyPhraseSourceLinks(input, ['es-001']);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'linkage.invalid_row_id_type'));
  assert.ok(result.issues.some((item) => item.rowId === 'es-001' && item.code === 'linkage.missing'));
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
