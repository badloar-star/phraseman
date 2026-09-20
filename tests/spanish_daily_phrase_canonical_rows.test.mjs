import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const bank = JSON.parse(fs.readFileSync(
  new URL('../content/daily-phrases/es/source-bank.json', import.meta.url),
  'utf8',
));
const byId = new Map(bank.rows.map((row) => [row.id, row]));
const cvcLedger = JSON.parse(fs.readFileSync(
  new URL('../content/daily-phrases/es/cvc-source-ledger.json', import.meta.url),
  'utf8',
));
const sourceLinkage = JSON.parse(fs.readFileSync(
  new URL('../content/daily-phrases/es/source-ledger.json', import.meta.url),
  'utf8',
));

test('es-003 example contains the canonical infinitive target exactly', () => {
  const row = byId.get('es-003');
  assert.ok(row.targetExample.includes(row.targetText));
});

test('es-007 literal copy preserves first person and present tense', () => {
  const row = byId.get('es-007');
  assert.equal(row.literal_ru, 'Буквально: «Я сам это готовлю и сам это съедаю».');
  assert.equal(row.literal_uk, 'Буквально: «Я сам це готую і сам це з’їдаю».');
});

test('es-008 uses natural exam wording and a clear source-faithful meaning', () => {
  const row = byId.get('es-008');
  assert.match(row.targetExample, /^Suspendió el examen/u);
  assert.equal(row.meaning_ru, 'То, что неприятность случилась со многими, не делает её легче.');
  assert.equal(row.meaning_uk, 'Те, що неприємність сталася з багатьма, не робить її легшою.');
});

test('es-019 canonical target and example use the same punctuation', () => {
  const row = byId.get('es-019');
  assert.equal(row.targetText, 'Quien a buen árbol se arrima, buena sombra le cobija');
  assert.ok(row.targetExample.includes(row.targetText));
});

test('es-021 through es-025 replace unverified placeholders with the next CVC rows', () => {
  const expected = [
    ['es-021', 20, '59120', 'Nadie es profeta en su tierra'],
    ['es-022', 21, '59343', 'Quien a hierro mata, a hierro muere'],
    ['es-023', 22, '59504', 'Santa Rita, Rita, lo que se da no se quita'],
    ['es-024', 23, '58037', 'A buen entendedor, pocas palabras bastan'],
    ['es-025', 24, '59256', 'Ojo por ojo, diente por diente'],
  ];

  for (const [id, cvcRow, sourceId, targetText] of expected) {
    const row = byId.get(id);
    const authority = cvcLedger.rows[cvcRow];
    const link = sourceLinkage.linkedCandidateRows.find((item) => item.rowId === id);
    assert.equal(row.targetText, targetText, id);
    assert.ok(row.targetExample.includes(targetText), `${id} example must contain the canonical target`);
    assert.equal(row.candidateStatus, 'CANDIDATE_PENDING_INDEPENDENT_REVIEW', id);
    assert.deepEqual(link, { rowId: id, cvcRow, sourceId }, `${id} linkage`);
    assert.equal(row.sourceEvidence.sourceLedgerRef, `cvc-source-ledger.json#rows[${cvcRow}]`, id);
    assert.equal(row.sourceEvidence.sourceId, sourceId, id);
    assert.equal(row.sourceEvidence.definitionQuote, authority.definitionQuote, id);
    assert.equal(row.sourceEvidence.usageMarker, authority.usageMarker, id);
  }
});

test('es-021 through es-025 use literal translations approved by the guardian', () => {
  assert.equal(byId.get('es-021').literal_ru, 'Буквально: «Никто не пророк на своей земле».');
  assert.equal(byId.get('es-021').literal_uk, 'Буквально: «Ніхто не пророк на своїй землі».');
  assert.equal(byId.get('es-022').literal_ru, 'Буквально: «Кто убивает железом, от железа умирает».');
  assert.equal(byId.get('es-022').literal_uk, 'Буквально: «Хто залізом убиває, від заліза помирає».');
  assert.equal(byId.get('es-023').literal_ru, 'Буквально: «Святая Рита, Рита: то, что подарено, не отбирают».');
  assert.equal(byId.get('es-023').literal_uk, 'Буквально: «Свята Рито, Рито: те, що подаровано, не забирають».');
  assert.equal(byId.get('es-024').literal_ru, 'Буквально: «Понятливому достаточно немногих слов».');
  assert.equal(byId.get('es-024').literal_uk, 'Буквально: «Тому, хто добре розуміє, досить кількох слів».');
  assert.equal(byId.get('es-025').literal_ru, 'Буквально: «Око за око, зуб за зуб».');
  assert.equal(byId.get('es-025').literal_uk, 'Буквально: «Око за око, зуб за зуб».');
});
