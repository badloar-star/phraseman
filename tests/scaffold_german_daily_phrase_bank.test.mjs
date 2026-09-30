import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGermanDailyPhraseScaffold } from '../scripts/scaffold_german_daily_phrase_bank.mjs';

function authorityRows() {
  return [
    {
      sourceId: 'duden:holzweg',
      sourceName: 'Duden',
      sourceUrl: 'https://www.duden.de/rechtschreibung/Holzweg',
      httpStatus: 200,
      retrievalMethod: 'official_dictionary_page',
      targetText: 'auf dem Holzweg sein',
      definitionQuote: 'mit einer Vorstellung, Meinung o. Ä. von etwas sehr irren',
      usageMarker: 'kein Gebrauchsmarker im Eintrag',
      checkedAt: '2026-09-27T17:00:00.000Z',
    },
    {
      sourceId: 'duden:tomate',
      sourceName: 'Duden',
      sourceUrl: 'https://www.duden.de/rechtschreibung/Tomate',
      httpStatus: 200,
      retrievalMethod: 'official_dictionary_page',
      targetText: 'Tomaten auf den Augen haben',
      definitionQuote: 'etwas, jemanden aus Unachtsamkeit übersehen',
      usageMarker: 'salopp abwertend',
      checkedAt: '2026-09-27T17:00:00.000Z',
    },
  ];
}

function authorityLedger(rows = authorityRows()) {
  return {
    schemaVersion: 'daily-phrase-authoritative-source-ledger-v1',
    studyTarget: 'de',
    source: 'Duden — official dictionary entries and official publisher excerpts',
    sourceHomes: ['https://www.duden.de/rechtschreibung/', 'https://shop.duden.de/'],
    checkedAt: '2026-09-27T17:00:00.000Z',
    requiredCount: 176,
    acceptedCount: rows.length,
    status: 'SOURCE_PARTIAL_HOLD',
    rows,
  };
}

test('builds a closed ordered German scaffold and target-neutral source linkage', () => {
  const result = buildGermanDailyPhraseScaffold({ authorityLedger: authorityLedger() });

  assert.equal(result.bank.studyTarget, 'de');
  assert.equal(result.bank.activationApproved, false);
  assert.equal(result.bank.status, 'SOURCE_PARTIAL_HOLD');
  assert.equal(result.bank.rows.length, 176);
  assert.deepEqual(result.bank.rows.slice(0, 2).map((row) => row.id), ['de-001', 'de-002']);
  assert.equal(result.bank.rows.at(-1).id, 'de-176');
  assert.deepEqual(result.bank.rows.slice(0, 2).map((row) => row.targetText), [
    'auf dem Holzweg sein',
    'Tomaten auf den Augen haben',
  ]);
  assert.ok(result.bank.rows.slice(0, 2).every((row) => row.candidateStatus === 'SOURCE_SCAFFOLD_HOLD'));
  assert.equal(result.bank.rows[2].candidateStatus, 'SOURCE_UNVERIFIED_HOLD');
  assert.equal(result.bank.rows[2].targetText, '');
  assert.ok(result.bank.rows.every((row) => row.active === false && row.activationApproved === false));
  assert.ok(result.bank.rows.every((row) => row.targetExample === '' && row.text_ru === '' && row.text_uk === ''));

  assert.equal(result.linkage.schemaVersion, 'daily-phrase-source-linkage-v2');
  assert.equal(result.linkage.studyTarget, 'de');
  assert.equal(result.linkage.authoritativeLedger.path, 'authoritative-source-ledger.json');
  assert.deepEqual(result.linkage.linkedCandidateRows, [
    { rowId: 'de-001', ledgerRow: 0, sourceId: 'duden:holzweg' },
    { rowId: 'de-002', ledgerRow: 1, sourceId: 'duden:tomate' },
  ]);
  assert.equal(result.linkage.status, 'SOURCE_PARTIAL_HOLD');
});

test('preserves an authored inactive row only when its canonical source target is unchanged', () => {
  const authored = {
    ...buildGermanDailyPhraseScaffold({ authorityLedger: authorityLedger() }).bank.rows[0],
    targetExample: 'Mit dieser Vermutung bist du auf dem Holzweg.',
    literal_ru: 'Буквально: «Быть на деревянной дороге».',
    meaning_ru: 'Сильно ошибаться в предположении.',
    text_ru: 'готовый текст',
    literal_uk: 'Буквально: «Бути на дерев’яній дорозі».',
    meaning_uk: 'Сильно помилятися у припущенні.',
    text_uk: 'готовий текст',
    quiz_ru: { correctFeedback: 'ok', distractors: [] },
    quiz_uk: { correctFeedback: 'ok', distractors: [] },
    candidateStatus: 'CANDIDATE_PENDING_INDEPENDENT_REVIEW',
  };
  const existingBank = { rows: [authored] };
  const result = buildGermanDailyPhraseScaffold({ authorityLedger: authorityLedger(), existingBank });

  assert.deepEqual(result.bank.rows[0], authored);
  assert.equal(result.bank.rows[1].candidateStatus, 'SOURCE_SCAFFOLD_HOLD');
  assert.equal(result.bank.rows[2].candidateStatus, 'SOURCE_UNVERIFIED_HOLD');

  existingBank.rows[0] = { ...authored, targetText: 'changed target' };
  assert.throws(
    () => buildGermanDailyPhraseScaffold({ authorityLedger: authorityLedger(), existingBank }),
    /canonical German source target/u,
  );
});

test('fails closed on malformed, duplicate, or non-German authority ledgers', () => {
  const duplicateRows = authorityRows();
  duplicateRows[1] = { ...duplicateRows[1], targetText: duplicateRows[0].targetText };
  assert.throws(
    () => buildGermanDailyPhraseScaffold({ authorityLedger: authorityLedger(duplicateRows) }),
    /unique targetText/u,
  );

  assert.throws(
    () => buildGermanDailyPhraseScaffold({ authorityLedger: { ...authorityLedger(), studyTarget: 'fr' } }),
    /studyTarget=de/u,
  );

  assert.throws(
    () => buildGermanDailyPhraseScaffold({ authorityLedger: { ...authorityLedger(), acceptedCount: 3 } }),
    /acceptedCount/u,
  );
});

test('allows one dictionary page and sourceId to attest multiple distinct expressions', () => {
  const rows = authorityRows();
  rows[1] = {
    ...rows[1],
    sourceId: rows[0].sourceId,
    sourceUrl: rows[0].sourceUrl,
  };

  const result = buildGermanDailyPhraseScaffold({ authorityLedger: authorityLedger(rows) });
  assert.equal(result.bank.rows.length, 176);
  assert.deepEqual(result.linkage.linkedCandidateRows.map((row) => row.sourceId), [
    'duden:holzweg',
    'duden:holzweg',
  ]);
  assert.deepEqual(result.linkage.linkedCandidateRows.map((row) => row.ledgerRow), [0, 1]);
});
