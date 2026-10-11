import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { applyDailyPhraseAuthoringPacket } from '../scripts/apply_daily_phrase_authoring_packet.mjs';

const read = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

function actualFrenchInput() {
  return {
    bank: read('../content/daily-phrases/fr/source-bank.json'),
    ledger: read('../content/daily-phrases/fr/authoritative-source-ledger.json'),
    linkage: read('../content/daily-phrases/fr/source-ledger.json'),
    packet: read('../content/daily-phrases/fr/authoring/fr-001-005.json'),
    englishRows: read('../admin/daily_phrases_seed.json'),
  };
}

test('applies a source-linked authoring packet only after source, style and quiz gates pass', () => {
  const input = actualFrenchInput();
  const originalLegacyDraft = input.bank.rows[0].legacyDraft;
  const result = applyDailyPhraseAuthoringPacket(input);

  assert.equal(result.source.verdict, 'PASS', JSON.stringify(result.source.issues, null, 2));
  assert.equal(result.style.verdict, 'PASS', JSON.stringify(result.style.issues, null, 2));
  assert.equal(result.quiz.verdict, 'PASS', JSON.stringify(result.quiz.issues, null, 2));
  assert.deepEqual(result.appliedIds, ['fr-001', 'fr-002', 'fr-003', 'fr-004', 'fr-005']);

  const first = result.bank.rows[0];
  assert.equal(first.candidateStatus, 'CANDIDATE_PENDING_INDEPENDENT_REVIEW');
  assert.equal(first.active, false);
  assert.equal(first.activationApproved, false);
  assert.deepEqual(first.legacyDraft, originalLegacyDraft);
  assert.equal(first.sourceEvidence.sourceId, 'le-robert:cafard');
  assert.equal(first.sourceEvidence.sourceLedgerRef, 'authoritative-source-ledger.json#rows[0]');
  assert.equal(first.sourceEvidence.checkedAt, input.ledger.rows[0].checkedAt);
});

test('applies an Italian authoritative packet while keeping every row inactive', () => {
  const input = actualFrenchInput();
  input.bank.studyTarget = 'it';
  input.ledger.studyTarget = 'it';
  input.linkage.studyTarget = 'it';
  input.packet.studyTarget = 'it';
  input.linkage.authoritativeLedger.path = 'authoritative-source-ledger.json';
  input.bank.rows.forEach((row, index) => {
    row.id = `it-${String(index + 1).padStart(3, '0')}`;
    row.studyTarget = 'it';
    if (row.sourceEvidence) row.sourceEvidence.sourceLedgerRef = `authoritative-source-ledger.json#rows[${index}]`;
  });
  input.packet.rows.forEach((row, index) => { row.id = `it-${String(index + 1).padStart(3, '0')}`; });
  input.linkage.linkedCandidateRows.forEach((row, index) => { row.rowId = `it-${String(index + 1).padStart(3, '0')}`; });
  const result = applyDailyPhraseAuthoringPacket(input);
  assert.equal(result.source.verdict, 'PASS');
  assert.ok(result.bank.rows.every((row) => row.active === false && row.activationApproved === false));
  assert.equal(result.bank.rows[0].sourceEvidence.sourceLedgerRef, 'authoritative-source-ledger.json#rows[0]');
});

test('fails closed before mutation when packet target and bank target disagree', () => {
  const input = actualFrenchInput();
  input.packet.rows[0].targetText = 'Expression inventée';
  const original = structuredClone(input.bank);

  assert.throws(
    () => applyDailyPhraseAuthoringPacket(input),
    /targetText does not exactly match/u,
  );
  assert.deepEqual(input.bank, original);
});

test('rejects control or authority fields outside the authoring row allowlist', () => {
  for (const [field, value] of [
    ['activationApproved', true],
    ['sourceEvidence', { sourceId: 'forged' }],
  ]) {
    const input = actualFrenchInput();
    input.packet.rows[0][field] = value;
    const original = structuredClone(input.bank);

    assert.throws(
      () => applyDailyPhraseAuthoringPacket(input),
      /unsupported.*field|field.*allowlist/iu,
    );
    assert.deepEqual(input.bank, original);
  }
});

test('rejects packet, ledger and linkage envelopes outside the target-scoped authoring contract', () => {
  const scenarios = [
    (input) => { input.packet.status = 'CLAIMED_RELEASE_APPROVED'; },
    (input) => { input.ledger.schemaVersion = 'wrong-ledger-v99'; },
    (input) => { input.linkage.schemaVersion = 'wrong-linkage-v99'; },
    (input) => { input.linkage.surface = 'learning_session'; },
    (input) => { input.linkage.authoritativeLedger.path = 'not-the-ledger.json'; },
    (input) => { input.linkage.authoritativeLedger.schemaVersion = 'wrong-ledger-v99'; },
  ];

  for (const mutate of scenarios) {
    const input = actualFrenchInput();
    mutate(input);
    const original = structuredClone(input.bank);

    assert.throws(
      () => applyDailyPhraseAuthoringPacket(input),
      /authoring|ledger|linkage|Daily Phrase|authority/iu,
    );
    assert.deepEqual(input.bank, original);
  }
});

test('fails closed when an authoring packet would persist structurally invalid learner fields', () => {
  const input = actualFrenchInput();
  input.packet.rows[0].targetExample = [input.packet.rows[0].targetExample];

  assert.throws(
    () => applyDailyPhraseAuthoringPacket(input),
    (error) => {
      assert.match(error.message, /mandatory content gate/);
      assert.equal(error.diagnostics.structural.status, 'FAIL');
      assert.ok(error.diagnostics.structural.errors.includes('row:fr-001:targetExample_required'));
      return true;
    },
  );
});

test('fails closed when a packet row lacks explicit authoritative linkage', () => {
  const input = actualFrenchInput();
  input.linkage.linkedCandidateRows = input.linkage.linkedCandidateRows.slice(1);

  assert.throws(
    () => applyDailyPhraseAuthoringPacket(input),
    /exactly one source link/u,
  );
});

test('rejects duplicate packet ids instead of applying the same row twice', () => {
  const input = actualFrenchInput();
  input.packet.rows.push(structuredClone(input.packet.rows[0]));
  assert.throws(
    () => applyDailyPhraseAuthoringPacket(input),
    /duplicate row id/u,
  );
});

test('rejects packet reordering before it can bypass consecutive batch gates', () => {
  const input = actualFrenchInput();
  for (const row of input.packet.rows.slice(0, 3)) {
    row.meaning_ru = 'Распоряжаться ожидаемым результатом и считать успех обеспеченным слишком рано.';
    row.meaning_uk = 'Розпоряджатися очікуваним результатом і вважати успіх гарантованим завчасно.';
    row.quiz_ru.distractors[0].text = 'Продать настоящую медвежью шкуру до охоты.';
    row.quiz_ru.distractors[1].text = 'Осторожно составить запасной план на случай неудачи.';
    row.quiz_uk.distractors[0].text = 'Продати справжню ведмежу шкуру до полювання.';
    row.quiz_uk.distractors[1].text = 'Обережно скласти запасний план на випадок невдачі.';
  }
  const [first, second, third, fourth, fifth] = input.packet.rows;
  input.packet.rows = [first, second, fourth, third, fifth];

  assert.throws(
    () => applyDailyPhraseAuthoringPacket(input),
    /canonical bank order/u,
  );
});

test('rejects a gapped packet before it can shrink consecutive batch gates', () => {
  const input = actualFrenchInput();
  input.packet.rows = [input.packet.rows[0], input.packet.rows[2]];

  assert.throws(
    () => applyDailyPhraseAuthoringPacket(input),
    /contiguous canonical bank range/u,
  );
});

test('copies the linked source-row timestamp instead of backdating new evidence to the ledger epoch', () => {
  const input = actualFrenchInput();
  const rowTimestamp = '2026-09-28T04:05:06.789Z';
  input.ledger.rows[0].checkedAt = rowTimestamp;
  assert.notEqual(rowTimestamp, input.ledger.checkedAt);

  const result = applyDailyPhraseAuthoringPacket(input);
  assert.equal(result.bank.rows[0].sourceEvidence.checkedAt, rowTimestamp);
  assert.equal(result.source.verdict, 'PASS', JSON.stringify(result.source.issues, null, 2));
});

test('preserves declared grammatical target surface forms through packet application', () => {
  const input = actualFrenchInput();
  const first = input.packet.rows[0];
  first.targetExample = 'Depuis ce matin, Léa a le cafard et refuse toutes les invitations.';
  first.text_ru = first.text_ru.replace(
    'Лену накрыло то самое Avoir le cafard:',
    'по Лене сразу видно: Léa a le cafard —',
  );
  first.text_uk = first.text_uk.replace('Avoir le cafard', 'Léa a le cafard');
  first.targetSurfaceForms = {
    targetExample: 'Léa a le cafard',
    text_ru: 'Léa a le cafard',
    text_uk: 'Léa a le cafard',
  };

  const result = applyDailyPhraseAuthoringPacket(input);

  assert.deepEqual(result.bank.rows[0].targetSurfaceForms, first.targetSurfaceForms);
  assert.equal(result.source.verdict, 'PASS', JSON.stringify(result.source.issues, null, 2));
  assert.equal(result.style.verdict, 'PASS', JSON.stringify(result.style.issues, null, 2));
});

test('removes a stale bank surface declaration when the full packet omits it', () => {
  const input = actualFrenchInput();
  input.bank.rows[0].targetSurfaceForms = {
    targetExample: 'a le cafard',
    text_ru: 'a le cafard',
    text_uk: 'a le cafard',
  };
  assert.equal(Object.hasOwn(input.packet.rows[0], 'targetSurfaceForms'), false);

  const result = applyDailyPhraseAuthoringPacket(input);

  assert.equal(Object.hasOwn(result.bank.rows[0], 'targetSurfaceForms'), false);
  assert.equal(result.structural.status, 'STRUCTURAL_PASS');
});

test('rejects unknown or malformed targetSurfaceForms before persisting the packet', () => {
  const input = actualFrenchInput();
  input.packet.rows[0].targetSurfaceForms = { unused: [] };

  assert.throws(
    () => applyDailyPhraseAuthoringPacket(input),
    (error) => {
      assert.match(error.message, /mandatory content gate/);
      assert.ok(error.diagnostics.source.issues.some(
        (item) => item.code === 'target_example.invalid_surface_form',
      ));
      return true;
    },
  );
});

test('requires a complete canonical English baseline before applying a packet', () => {
  const missing = actualFrenchInput();
  delete missing.englishRows;
  assert.throws(
    () => applyDailyPhraseAuthoringPacket(missing),
    /English.*baseline|baseline.*English/iu,
  );

  const empty = actualFrenchInput();
  empty.englishRows = [];
  assert.throws(
    () => applyDailyPhraseAuthoringPacket(empty),
    /English.*baseline|baseline.*English/iu,
  );

  const sparse = actualFrenchInput();
  sparse.packet.rows[0].quiz_ru.distractors[0].text = sparse.englishRows[10].meaning;
  sparse.englishRows = new Array(176);
  assert.throws(
    () => applyDailyPhraseAuthoringPacket(sparse),
    /English.*baseline|baseline.*English/iu,
  );

  const partiallySparse = actualFrenchInput();
  delete partiallySparse.englishRows[10];
  assert.throws(
    () => applyDailyPhraseAuthoringPacket(partiallySparse),
    /English.*baseline|baseline.*English/iu,
  );
});

test('keeps English-pool copy detection mandatory at the applicator boundary', () => {
  const input = actualFrenchInput();
  input.packet.rows[0].quiz_ru.distractors[0].text = input.englishRows[10].meaning;

  assert.throws(
    () => applyDailyPhraseAuthoringPacket(input),
    (error) => {
      assert.match(error.message, /mandatory content gate/u);
      assert.ok(error.diagnostics.quiz.issues.some((item) => item.code === 'ru.english_pool_copy'));
      return true;
    },
  );
});

test('rejects a shape-valid substituted English baseline authority', () => {
  const input = actualFrenchInput();
  input.packet.rows[0].quiz_ru.distractors[0].text = input.englishRows[0].meaning;
  input.englishRows = Array.from({ length: 176 }, (_, index) => ({
    meaning: `Иное значение номер ${index + 1} для подменённого набора.`,
    meaning_uk: `Інше значення номер ${index + 1} для підміненого набору.`,
  }));

  assert.throws(
    () => applyDailyPhraseAuthoringPacket(input),
    (error) => {
      assert.match(error.message, /canonical English Daily Phrase baseline/iu);
      assert.ok(error.diagnostics.englishBaseline.issues.some(
        (item) => item.code === 'english_baseline.authority_mismatch',
      ));
      return true;
    },
  );
});

test('rejects one-element array linkage ids instead of coercing them to strings', () => {
  const input = actualFrenchInput();
  input.linkage.linkedCandidateRows[0].rowId = ['fr-001'];

  assert.throws(
    () => applyDailyPhraseAuthoringPacket(input),
    /source link|rowId|linkage/iu,
  );
});

test('rejects non-string quiz leaves before persisting them', () => {
  const cases = [
    (row) => { row.quiz_ru.correctFeedback = [row.quiz_ru.correctFeedback]; },
    (row) => { row.quiz_ru.distractors[0].id = [row.quiz_ru.distractors[0].id]; },
    (row) => { row.quiz_ru.distractors[0].text = [row.quiz_ru.distractors[0].text]; },
    (row) => { row.quiz_ru.distractors[0].misconceptionCode = [row.quiz_ru.distractors[0].misconceptionCode]; },
    (row) => { row.quiz_ru.distractors[0].feedback = [row.quiz_ru.distractors[0].feedback]; },
  ];

  for (const mutate of cases) {
    const input = actualFrenchInput();
    mutate(input.packet.rows[0]);
    assert.throws(
      () => applyDailyPhraseAuthoringPacket(input),
      (error) => {
        assert.match(error.message, /mandatory content gate/u);
        assert.ok(error.diagnostics.quiz.issues.some((item) => item.code.endsWith('_type')));
        return true;
      },
    );
  }
});

test('rejects authoring packets larger than the ten-row quality-gate boundary', () => {
  const input = actualFrenchInput();
  const second = read('../content/daily-phrases/fr/authoring/fr-006-010.json');
  const third = read('../content/daily-phrases/fr/authoring/fr-011-015.json');
  input.packet.rows = [...input.packet.rows, ...second.rows, third.rows[0]];

  assert.throws(
    () => applyDailyPhraseAuthoringPacket(input),
    /at most 10|maximum.*10|1-10/iu,
  );
});

test('applicator CLI binds the supplied ledger filename to the linkage descriptor', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-phrase-apply-ledger-'));
  try {
    const input = actualFrenchInput();
    const paths = {
      bank: path.join(tempDir, 'bank.json'),
      packet: path.join(tempDir, 'packet.json'),
      ledger: path.join(tempDir, 'renamed-ledger.json'),
      linkage: path.join(tempDir, 'linkage.json'),
    };
    fs.writeFileSync(paths.bank, `${JSON.stringify(input.bank)}\n`);
    fs.writeFileSync(paths.packet, `${JSON.stringify(input.packet)}\n`);
    fs.writeFileSync(paths.ledger, `${JSON.stringify(input.ledger)}\n`);
    fs.writeFileSync(paths.linkage, `${JSON.stringify(input.linkage)}\n`);

    const result = spawnSync(process.execPath, [
      'scripts/apply_daily_phrase_authoring_packet.mjs',
      paths.bank,
      paths.packet,
      paths.ledger,
      paths.linkage,
      path.resolve('admin/daily_phrases_seed.json'),
    ], { cwd: process.cwd(), encoding: 'utf8' });
    const output = `${result.stdout}\n${result.stderr}`;

    assert.notEqual(result.status, 0, output);
    assert.match(output, /ledger.*(?:filename|path|descriptor)|authority.*path/iu);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('applicator rejects a bank whose canonical id-order-position identity is broken', () => {
  const input = actualFrenchInput();
  input.bank.rows[99].order = 999;

  assert.throws(
    () => applyDailyPhraseAuthoringPacket(input),
    (error) => {
      assert.match(error.message, /mandatory content gate/u);
      assert.ok(error.diagnostics.structural.errors.includes(
        'row:fr-100:canonical_order_required',
      ));
      return true;
    },
  );
});
