import assert from 'node:assert/strict';
import test from 'node:test';

import { buildItalianDailyPhraseScaffold } from '../scripts/scaffold_italian_daily_phrase_bank.mjs';

function authorityRows() {
  return [{
    sourceId: 'treccani:prendere-due-piccioni',
    sourceName: 'Treccani',
    sourceUrl: 'https://www.treccani.it/',
    httpStatus: 200,
    retrievalMethod: 'official_dictionary_page',
    targetText: 'Prendere due piccioni con una fava',
    definitionQuote: 'Ottenere due risultati con una sola azione.',
    usageMarker: 'modo di dire',
    checkedAt: '2026-10-03T00:00:00.000Z',
  }];
}

function authorityLedger(rows = authorityRows()) {
  return {
    schemaVersion: 'daily-phrase-authoritative-source-ledger-v1', studyTarget: 'it',
    source: 'Treccani legacy label; Treccani', sourceHomes: ['https://www.treccani.it/'],
    sourceAliases: ['Treccani legacy label'],
    checkedAt: '2026-10-03T00:00:00.000Z', requiredCount: 176,
    acceptedCount: rows.length, status: 'SOURCE_PARTIAL_HOLD', rows,
  };
}

test('builds exactly 176 closed Italian rows with target-scoped ids and source links', () => {
  const result = buildItalianDailyPhraseScaffold({ authorityLedger: authorityLedger() });
  assert.equal(result.bank.studyTarget, 'it');
  assert.equal(result.bank.rows.length, 176);
  assert.deepEqual(result.bank.rows.slice(0, 2).map((row) => row.id), ['it-001', 'it-002']);
  assert.equal(result.bank.rows.at(-1).id, 'it-176');
  assert.equal(result.bank.rows[0].candidateStatus, 'SOURCE_SCAFFOLD_HOLD');
  assert.equal(result.bank.rows[1].candidateStatus, 'SOURCE_UNVERIFIED_HOLD');
  assert.ok(result.bank.rows.every((row) => row.active === false && row.activationApproved === false));
  assert.deepEqual(result.linkage.linkedCandidateRows, [{
    rowId: 'it-001', ledgerRow: 0, sourceId: 'treccani:prendere-due-piccioni',
  }]);
  assert.equal(result.linkage.authoritativeLedger.path, 'authoritative-source-ledger.json');
  assert.deepEqual(result.linkage.authoritativeLedger.sourceAliases, ['Treccani legacy label']);
});

test('preserves authored Italian content only when its canonical source target is unchanged', () => {
  const scaffold = buildItalianDailyPhraseScaffold({ authorityLedger: authorityLedger() });
  const authored = { ...scaffold.bank.rows[0], candidateStatus: 'CANDIDATE_PENDING_INDEPENDENT_REVIEW', text_ru: 'готовый текст' };
  assert.deepEqual(
    buildItalianDailyPhraseScaffold({ authorityLedger: authorityLedger(), existingBank: { rows: [authored] } }).bank.rows[0],
    authored,
  );
  assert.throws(
    () => buildItalianDailyPhraseScaffold({ authorityLedger: authorityLedger(), existingBank: { rows: [{ ...authored, targetText: 'другая фраза' }] } }),
    /canonical Italian source target/u,
  );
});

test('fails closed for malformed, duplicate, or non-Italian authority ledger data', () => {
  assert.throws(() => buildItalianDailyPhraseScaffold({ authorityLedger: { ...authorityLedger(), studyTarget: 'de' } }), /studyTarget=it/u);
  assert.throws(() => buildItalianDailyPhraseScaffold({ authorityLedger: { ...authorityLedger(), acceptedCount: 2 } }), /acceptedCount/u);
  const duplicate = authorityRows();
  duplicate.push({ ...duplicate[0], sourceId: 'treccani:duplicate' });
  assert.throws(() => buildItalianDailyPhraseScaffold({ authorityLedger: authorityLedger(duplicate) }), /unique targetText/u);
});

test('rejects coercible non-string authority metadata and non-strict timestamps', () => {
  const malformedRows = [
    { field: 'sourceId', value: 42 },
    { field: 'sourceName', value: true },
    { field: 'sourceUrl', value: 123 },
    { field: 'retrievalMethod', value: false },
    { field: 'targetText', value: 456 },
    { field: 'definitionQuote', value: 789 },
    { field: 'usageMarker', value: true },
    { field: 'checkedAt', value: 0 },
    { field: 'checkedAt', value: '2026-02-31T00:00:00.000Z' },
  ];
  for (const { field, value } of malformedRows) {
    const rows = authorityRows();
    rows[0] = { ...rows[0], [field]: value };
    assert.throws(
      () => buildItalianDailyPhraseScaffold({ authorityLedger: authorityLedger(rows) }),
      new RegExp(field, 'u'),
    );
  }

  assert.throws(
    () => buildItalianDailyPhraseScaffold({ authorityLedger: { ...authorityLedger(), source: 42 } }),
    /source/u,
  );
  assert.throws(
    () => buildItalianDailyPhraseScaffold({ authorityLedger: { ...authorityLedger(), sourceHomes: [42] } }),
    /sourceHomes/u,
  );
  assert.throws(
    () => buildItalianDailyPhraseScaffold({ authorityLedger: { ...authorityLedger(), checkedAt: 0 } }),
    /checkedAt/u,
  );
  for (const sourceAliases of [
    'Treccani legacy label',
    [''],
    [' Treccani legacy label'],
    ['Treccani legacy label', 42],
    ['Treccani legacy label', 'Treccani legacy label'],
  ]) {
    assert.throws(
      () => buildItalianDailyPhraseScaffold({ authorityLedger: { ...authorityLedger(), sourceAliases } }),
      /sourceAliases/u,
    );
  }
});

test('rejects current-source and unrelated Italian source aliases', () => {
  const ledger = authorityLedger();
  for (const sourceAliases of [[ledger.source], ['Unrelated prior provider']]) {
    assert.throws(
      () => buildItalianDailyPhraseScaffold({
        authorityLedger: { ...ledger, sourceAliases },
      }),
      /sourceAliases/u,
    );
  }
});

test('allows one official source page to attest multiple distinct Italian expressions', () => {
  const rows = authorityRows();
  rows.push({ ...rows[0], targetText: 'Non tutte le ciambelle riescono col buco' });
  const result = buildItalianDailyPhraseScaffold({ authorityLedger: authorityLedger(rows) });
  assert.deepEqual(result.linkage.linkedCandidateRows.map((row) => row.ledgerRow), [0, 1]);
  assert.equal(result.linkage.linkedCandidateRows[1].sourceId, result.linkage.linkedCandidateRows[0].sourceId);
});
