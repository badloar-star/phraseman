import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildFrenchDailyPhrasePriorAcceptedManifest } from '../scripts/build_french_daily_phrase_prior_accepted_manifest.mjs';
import {
  buildDailyPhrasePriorAcceptedManifest,
  defaultDailyPhrasePriorAcceptedPaths,
} from '../scripts/build_daily_phrase_prior_accepted_manifest.mjs';
import { evaluateDailyPhrasePriorAcceptedManifest } from '../scripts/daily_phrase_prior_accepted_manifest_gate.mjs';
import { assertDailyPhraseAuthoringPacketPath } from '../scripts/daily_phrase_manifest_paths.mjs';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex').toUpperCase();
}

function acceptedRow(order) {
  const id = `fr-${String(order).padStart(3, '0')}`;
  const targetText = `Expression ${order}`;
  return {
    id,
    order,
    studyTarget: 'fr',
    sourceLocale: 'ru',
    surface: 'daily_phrase',
    targetText,
    targetExample: `${targetText} apparaît dans un exemple français vérifié.`,
    literal_ru: 'Буквально: «Большая лошадь идёт вперёд».',
    meaning_ru: `Выбирать самое большое ради размера в ситуации ${order}, не думая о пользе.`,
    text_ru: `❤️ Представь ярмарку: рядом стоят две лошади, а покупатель даже не смотрит, какая быстрее и послушнее — берёт самую большую. Вот настроение ${targetText}: выбрать что-то внушительное только потому, что оно больше, дороже или заметнее, пусть пользы от этого почти нет. Огромный внедорожник для двух кварталов? Точно оно. Размер впечатляет, но здравый смысл всё равно стоит проверить.`,
    literal_uk: 'Буквально: «Великий кінь іде вперед».',
    meaning_uk: `Обирати найбільше лише за розміром у ситуації ${order}, не думаючи про користь.`,
    text_uk: `❤️ Уяви ярмарок: поруч стоять два коні, а покупець навіть не дивиться, який швидший і слухняніший — бере найбільшого. Ось настрій ${targetText}: обрати щось поважне лише тому, що воно більше, дорожче або помітніше, хоча користі майже немає. Величезний позашляховик для двох кварталів? Саме воно. Розмір вражає, але здоровий глузд усе одно варто перевірити.`,
    quiz_ru: {
      correctFeedback: 'Верно: здесь высмеивают выбор размера ради впечатления без проверки пользы.',
      distractors: [
        { id: `${id}-literal`, text: 'Хвалить сильную лошадь за быстрый ход.', misconceptionCode: 'literal_reading', feedback: 'Образ лошади подталкивает к буквальному чтению, но речь идёт о показном выборе большого предмета.' },
        { id: `${id}-quality`, text: 'Всегда выбирать дорогую вещь как самую надёжную.', misconceptionCode: 'scope_shift', feedback: 'Цена может казаться признаком качества, однако выражение критикует размер и показность, а не советует платить больше.' },
      ],
    },
    quiz_uk: {
      correctFeedback: 'Правильно: вислів висміює вибір найбільшого заради враження без перевірки користі.',
      distractors: [
        { id: `${id}-literal`, text: 'Хвалити сильного коня за швидкий біг.', misconceptionCode: 'literal_reading', feedback: 'Образ коня спонукає читати буквально, але йдеться про показний вибір великого предмета.' },
        { id: `${id}-quality`, text: 'Завжди купувати дорожчу річ як найнадійнішу.', misconceptionCode: 'scope_shift', feedback: 'Ціна може здаватися ознакою якості, однак вислів критикує розмір і показність, а не радить платити більше.' },
      ],
    },
    sourceEvidence: {
      sourceLedgerRef: `authoritative-source-ledger.json#rows[${order - 1}]`,
      sourceId: `fixture:${order}`,
      sourceName: 'Fixture Dictionary',
      sourceUrl: `https://example.test/${order}`,
      httpStatus: 200,
      retrievalMethod: 'official_dictionary_page',
      definitionQuote: `Verified definition ${order}.`,
      usageMarker: 'expression',
      sourceType: 'fixture official source',
      checkedAt: '2026-09-27T06:00:00.000Z',
    },
    allowSave: true,
    active: false,
    activationApproved: false,
    candidateStatus: 'CANDIDATE_PENDING_INDEPENDENT_REVIEW',
  };
}

function authoringPacketRow(row) {
  const {
    id,
    targetText,
    targetExample,
    literal_ru,
    meaning_ru,
    text_ru,
    literal_uk,
    meaning_uk,
    text_uk,
    quiz_ru,
    quiz_uk,
  } = row;
  return {
    id,
    targetText,
    targetExample,
    literal_ru,
    meaning_ru,
    text_ru,
    literal_uk,
    meaning_uk,
    text_uk,
    quiz_ru,
    quiz_uk,
  };
}

function fixture() {
  const rows = [1, 2].map(acceptedRow);
  const allRows = [
    ...rows,
    ...Array.from({ length: 174 }, (_, index) => ({
      id: `fr-${String(index + 3).padStart(3, '0')}`,
      order: index + 3,
      targetText: `Scaffold ${index + 3}`,
      candidateStatus: 'SOURCE_SCAFFOLD_HOLD',
    })),
  ];
  const paths = {
    bank: 'content/daily-phrases/fr/source-bank.json',
    sourceEvidence: 'content/daily-phrases/fr/authoritative-source-ledger.json',
    sourceLinkage: 'content/daily-phrases/fr/source-ledger.json',
    englishBaseline: 'admin/daily_phrases_seed.json',
    styleContract: 'content/daily-phrases/quality/STYLE_CONTRACT.md',
    packet: 'content/daily-phrases/fr/authoring/fr-001-002.json',
  };
  const bank = {
    studyTarget: 'fr', sourceLocale: 'ru', surface: 'daily_phrase', activationApproved: false, rows: allRows,
  };
  const ledger = {
    schemaVersion: 'daily-phrase-authoritative-source-ledger-v1',
    studyTarget: 'fr',
    source: 'fixture official source',
    checkedAt: '2026-09-27T06:00:00.000Z',
    rows: rows.map((row, index) => ({
      sourceId: `fixture:${index + 1}`,
      sourceName: 'Fixture Dictionary',
      sourceUrl: `https://example.test/${index + 1}`,
      httpStatus: 200,
      retrievalMethod: 'official_dictionary_page',
      targetText: row.targetText,
      definitionQuote: `Verified definition ${index + 1}.`,
      usageMarker: 'expression',
      checkedAt: '2026-09-27T06:00:00.000Z',
    })),
  };
  const linkage = {
    schemaVersion: 'daily-phrase-source-linkage-v2',
    studyTarget: 'fr',
    sourceLocale: 'ru',
    surface: 'daily_phrase',
    authoritativeLedger: {
      path: 'authoritative-source-ledger.json',
      schemaVersion: 'daily-phrase-authoritative-source-ledger-v1',
    },
    linkedCandidateRows: rows.map((row, index) => ({ rowId: row.id, ledgerRow: index, sourceId: `fixture:${index + 1}` })),
  };
  const packet = {
    schemaVersion: 'daily-phrase-authoring-packet-v1',
    studyTarget: 'fr',
    sourceLocale: 'ru',
    status: 'DRAFT_REQUIRES_INDEPENDENT_REVIEW',
    rows: rows.map(authoringPacketRow),
  };
  const artifacts = {
    [paths.bank]: Buffer.from(`${JSON.stringify(bank, null, 2)}\n`),
    [paths.sourceEvidence]: Buffer.from(`${JSON.stringify(ledger, null, 2)}\n`),
    [paths.sourceLinkage]: Buffer.from(`${JSON.stringify(linkage, null, 2)}\n`),
    [paths.englishBaseline]: fs.readFileSync(new URL('../admin/daily_phrases_seed.json', import.meta.url)),
    [paths.styleContract]: Buffer.from('# style\n'),
    [paths.packet]: Buffer.from(`${JSON.stringify(packet, null, 2)}\n`),
  };
  const review = {
    schemaVersion: 'daily-phrase-independent-editorial-review-v1',
    verdict: 'ACCEPT',
    acceptedCount: 2,
    findings: [],
    reviewedAt: '2026-09-27T06:20:00.000Z',
    reviewerIndependence: true,
    reviewerIdentity: '/root/independent-fixture',
    releaseTrusted: false,
    deterministicGates: { sourceLink: 'PASS', style: 'PASS', quiz: 'PASS', structural: 'PASS' },
    authoringPacketPaths: [paths.packet],
    hashesSha256: {
      sourceBank: sha256(artifacts[paths.bank]),
      authoritativeLedger: sha256(artifacts[paths.sourceEvidence]),
      sourceLedger: sha256(artifacts[paths.sourceLinkage]),
      englishBaseline: sha256(artifacts[paths.englishBaseline]),
      styleContract: sha256(artifacts[paths.styleContract]),
      authoringPackets: {
        'fr-001-002': sha256(artifacts[paths.packet]),
      },
    },
  };
  return { artifacts, paths, review };
}

function retargetFixture(fixtureData, studyTarget) {
  const oldPaths = fixtureData.paths;
  const canonical = defaultDailyPhrasePriorAcceptedPaths(studyTarget);
  const paths = {
    ...canonical,
    packet: `content/daily-phrases/${studyTarget}/authoring/${studyTarget}-001-002.json`,
  };
  const bank = JSON.parse(fixtureData.artifacts[oldPaths.bank].toString('utf8'));
  bank.studyTarget = studyTarget;
  for (const [index, row] of bank.rows.entries()) {
    row.id = `${studyTarget}-${String(index + 1).padStart(3, '0')}`;
    if (index < fixtureData.review.acceptedCount) row.studyTarget = studyTarget;
  }
  const ledger = JSON.parse(fixtureData.artifacts[oldPaths.sourceEvidence].toString('utf8'));
  ledger.schemaVersion = studyTarget === 'es'
    ? 'daily-phrase-cvc-source-ledger-v1'
    : 'daily-phrase-authoritative-source-ledger-v1';
  ledger.studyTarget = studyTarget;
  const linkage = JSON.parse(fixtureData.artifacts[oldPaths.sourceLinkage].toString('utf8'));
  linkage.schemaVersion = 'daily-phrase-source-linkage-v2';
  linkage.studyTarget = studyTarget;
  linkage.sourceLocale = 'ru';
  linkage.surface = 'daily_phrase';
  linkage.authoritativeLedger.path = path.posix.basename(paths.sourceEvidence);
  linkage.authoritativeLedger.schemaVersion = ledger.schemaVersion;
  linkage.linkedCandidateRows.forEach((row, index) => {
    row.rowId = `${studyTarget}-${String(index + 1).padStart(3, '0')}`;
  });
  for (const [index, row] of bank.rows.slice(0, fixtureData.review.acceptedCount).entries()) {
    row.sourceEvidence.sourceLedgerRef = `${linkage.authoritativeLedger.path}#rows[${index}]`;
  }
  const packet = JSON.parse(fixtureData.artifacts[oldPaths.packet].toString('utf8'));
  packet.studyTarget = studyTarget;
  packet.rows.forEach((row, index) => {
    row.id = `${studyTarget}-${String(index + 1).padStart(3, '0')}`;
  });
  const artifacts = {
    [paths.bank]: Buffer.from(`${JSON.stringify(bank, null, 2)}\n`),
    [paths.sourceEvidence]: Buffer.from(`${JSON.stringify(ledger, null, 2)}\n`),
    [paths.sourceLinkage]: Buffer.from(`${JSON.stringify(linkage, null, 2)}\n`),
    [paths.englishBaseline]: fixtureData.artifacts[oldPaths.englishBaseline],
    [paths.styleContract]: fixtureData.artifacts[oldPaths.styleContract],
    [paths.packet]: Buffer.from(`${JSON.stringify(packet, null, 2)}\n`),
  };
  const review = {
    ...fixtureData.review,
    studyTarget,
    authoringPacketPaths: [paths.packet],
    hashesSha256: {
      sourceBank: sha256(artifacts[paths.bank]),
      sourceEvidence: sha256(artifacts[paths.sourceEvidence]),
      sourceLedger: sha256(artifacts[paths.sourceLinkage]),
      englishBaseline: sha256(artifacts[paths.englishBaseline]),
      styleContract: sha256(artifacts[paths.styleContract]),
      authoringPackets: {
        [`${studyTarget}-001-002`]: sha256(artifacts[paths.packet]),
      },
    },
  };
  return { artifacts, paths, review };
}

test('builds a hash-bound manifest that passes the continuity gate', () => {
  const { artifacts, paths, review } = fixture();
  const manifest = buildFrenchDailyPhrasePriorAcceptedManifest({ artifacts, paths, review });
  const result = evaluateDailyPhrasePriorAcceptedManifest({ manifest, artifacts });
  assert.equal(result.verdict, 'PASS');
  assert.equal(manifest.acceptedCount, 2);
  assert.equal(manifest.acceptedThrough, 'fr-002');
  assert.equal(manifest.releaseTrusted, false);
  assert.equal(manifest.independentEditorialReview.reviewerIdentity, '/root/independent-fixture');
});

test('refuses to manufacture continuity acceptance from a HOLD review', () => {
  const { artifacts, paths, review } = fixture();
  review.verdict = 'HOLD';
  assert.throws(
    () => buildFrenchDailyPhrasePriorAcceptedManifest({ artifacts, paths, review }),
    /independent ACCEPT review/,
  );
});

test('refuses a review that claims release trust', () => {
  const { artifacts, paths, review } = fixture();
  review.releaseTrusted = true;
  assert.throws(
    () => buildFrenchDailyPhrasePriorAcceptedManifest({ artifacts, paths, review }),
    /must remain non-release-trusted/,
  );
});

test('refuses a numeric independent-review timestamp', () => {
  const { artifacts, paths, review } = fixture();
  review.reviewedAt = 0;

  assert.throws(
    () => buildFrenchDailyPhrasePriorAcceptedManifest({ artifacts, paths, review }),
    /independent ACCEPT review/,
  );
});

test('refuses an impossible independent-review calendar date', () => {
  const { artifacts, paths, review } = fixture();
  review.reviewedAt = '2026-02-31T06:20:00.000Z';

  assert.throws(
    () => buildFrenchDailyPhrasePriorAcceptedManifest({ artifacts, paths, review }),
    /independent ACCEPT review/,
  );
});

test('builds the same fail-closed continuity manifest for a German target', () => {
  const { artifacts, paths, review } = retargetFixture(fixture(), 'de');

  const manifest = buildDailyPhrasePriorAcceptedManifest({ artifacts, paths, review, studyTarget: 'de' });
  const result = evaluateDailyPhrasePriorAcceptedManifest({ manifest, artifacts });
  assert.equal(result.verdict, 'PASS');
  assert.equal(manifest.studyTarget, 'de');
  assert.equal(manifest.acceptedThrough, 'de-002');
  assert.equal(manifest.releaseTrusted, false);
  assert.equal(manifest.activationApproved, false);
});

test('builds the same closed continuity manifest for an Italian target', () => {
  const italian = retargetFixture(fixture(), 'it');
  const manifest = buildDailyPhrasePriorAcceptedManifest({ ...italian, studyTarget: 'it' });
  assert.equal(evaluateDailyPhrasePriorAcceptedManifest({ manifest, artifacts: italian.artifacts }).verdict, 'PASS');
  assert.equal(manifest.acceptedThrough, 'it-002');
  assert.equal(manifest.releaseTrusted, false);
  assert.equal(manifest.activationApproved, false);
  assert.equal(manifest.authorityArtifacts.sourceEvidence.path, 'content/daily-phrases/it/authoritative-source-ledger.json');
});

test('builds the same authority-bound continuity manifest for a Spanish target', () => {
  const spanish = retargetFixture(fixture(), 'es');

  const manifest = buildDailyPhrasePriorAcceptedManifest({ ...spanish, studyTarget: 'es' });
  const result = evaluateDailyPhrasePriorAcceptedManifest({
    manifest,
    artifacts: spanish.artifacts,
  });

  assert.equal(result.verdict, 'PASS', JSON.stringify(result.issues, null, 2));
  assert.equal(manifest.authorityArtifacts.sourceEvidence.path, 'content/daily-phrases/es/cvc-source-ledger.json');
});

test('rejects a hash-consistent Spanish linkage redirected away from its canonical CVC ledger', () => {
  const spanish = retargetFixture(fixture(), 'es');
  const linkage = JSON.parse(spanish.artifacts[spanish.paths.sourceLinkage].toString('utf8'));
  linkage.authoritativeLedger.path = 'not-the-ledger.json';
  spanish.artifacts[spanish.paths.sourceLinkage] = Buffer.from(`${JSON.stringify(linkage, null, 2)}\n`);
  spanish.review.hashesSha256.sourceLedger = sha256(spanish.artifacts[spanish.paths.sourceLinkage]);

  const bank = JSON.parse(spanish.artifacts[spanish.paths.bank].toString('utf8'));
  for (const [index, row] of bank.rows.slice(0, spanish.review.acceptedCount).entries()) {
    row.sourceEvidence.sourceLedgerRef = `not-the-ledger.json#rows[${index}]`;
  }
  spanish.artifacts[spanish.paths.bank] = Buffer.from(`${JSON.stringify(bank, null, 2)}\n`);
  spanish.review.hashesSha256.sourceBank = sha256(spanish.artifacts[spanish.paths.bank]);

  assert.throws(
    () => buildDailyPhrasePriorAcceptedManifest({ ...spanish, studyTarget: 'es' }),
    /invalid_authority_binding/,
  );
});

test('generic builder rejects a requested target that does not match the bank', () => {
  const { artifacts, paths, review } = retargetFixture(fixture(), 'de');
  const bank = JSON.parse(artifacts[paths.bank].toString('utf8'));
  bank.studyTarget = 'fr';
  artifacts[paths.bank] = Buffer.from(`${JSON.stringify(bank, null, 2)}\n`);
  review.hashesSha256.sourceBank = sha256(artifacts[paths.bank]);
  assert.throws(
    () => buildDailyPhrasePriorAcceptedManifest({ artifacts, paths, review, studyTarget: 'de' }),
    /studyTarget does not match/,
  );
});

test('fails closed when the independent review omits its hash inventory', () => {
  const { artifacts, paths, review } = fixture();
  delete review.hashesSha256;
  assert.throws(
    () => buildFrenchDailyPhrasePriorAcceptedManifest({ artifacts, paths, review }),
    /hash inventory is required/,
  );
});

test('fails closed when candidate bytes changed after independent review', () => {
  const { artifacts, paths, review } = fixture();
  const bank = JSON.parse(artifacts[paths.bank].toString('utf8'));
  bank.rows[0].meaning_ru = 'Изменено после независимой проверки.';
  artifacts[paths.bank] = Buffer.from(`${JSON.stringify(bank, null, 2)}\n`);
  assert.throws(
    () => buildFrenchDailyPhrasePriorAcceptedManifest({ artifacts, paths, review }),
    /hashes do not match/,
  );
});

test('generic builder requires an exact review schema and target scope', () => {
  const german = retargetFixture(fixture(), 'de');
  german.review.schemaVersion = 'unknown-review-v0';
  assert.throws(
    () => buildDailyPhrasePriorAcceptedManifest({ ...german, studyTarget: 'de' }),
    /review schema/,
  );

  const wrongTarget = retargetFixture(fixture(), 'de');
  wrongTarget.review.studyTarget = 'es';
  assert.throws(
    () => buildDailyPhrasePriorAcceptedManifest({ ...wrongTarget, studyTarget: 'de' }),
    /review studyTarget/,
  );
});

test('uses the CVC authority ledger for the Spanish continuity manifest', () => {
  const paths = defaultDailyPhrasePriorAcceptedPaths('es');
  assert.equal(paths.sourceEvidence, 'content/daily-phrases/es/cvc-source-ledger.json');
});

test('rejects authoring packet paths outside the target-scoped allowlist', () => {
  const german = retargetFixture(fixture(), 'de');
  const originalPacket = german.review.authoringPacketPaths[0];
  german.review.authoringPacketPaths = ['../outside.json'];
  german.artifacts['../outside.json'] = german.artifacts[originalPacket];
  assert.throws(
    () => buildDailyPhrasePriorAcceptedManifest({ ...german, studyTarget: 'de' }),
    /authoring packet path/,
  );
});

test('builder refuses a hash-valid packet that omits its learner-facing fields', () => {
  const german = retargetFixture(fixture(), 'de');
  const packetPath = german.review.authoringPacketPaths[0];
  const packet = JSON.parse(german.artifacts[packetPath].toString('utf8'));
  packet.rows = packet.rows.map(({ id }) => ({ id }));
  german.artifacts[packetPath] = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  german.review.hashesSha256.authoringPackets['de-001-002'] = sha256(german.artifacts[packetPath]);

  assert.throws(
    () => buildDailyPhrasePriorAcceptedManifest({ ...german, studyTarget: 'de' }),
    /missing_required_fields/,
  );
});

test('keeps the legacy French CLI compatible with the accepted unscoped review', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-phrase-manifest-'));
  const outputPath = path.join(tempDir, 'manifest.json');
  try {
    const result = spawnSync(process.execPath, [
      'scripts/build_french_daily_phrase_prior_accepted_manifest.mjs',
      'content/daily-phrases/fr/prior-accepted-review.json',
      outputPath,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const manifest = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    assert.equal(manifest.studyTarget, 'fr');
    assert.equal(manifest.acceptedCount, 176);
    assert.equal(manifest.releaseTrusted, false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('rejects hash leaves and hash inventories that rely on array-to-string coercion', () => {
  const cases = [
    (review) => { review.hashesSha256.sourceBank = [review.hashesSha256.sourceBank]; },
    (review) => {
      const label = Object.keys(review.hashesSha256.authoringPackets)[0];
      review.hashesSha256.authoringPackets[label] = [review.hashesSha256.authoringPackets[label]];
    },
    (review) => {
      const arrayInventory = [];
      Object.assign(arrayInventory, review.hashesSha256);
      review.hashesSha256 = arrayInventory;
    },
    (review) => {
      const arrayPackets = [];
      Object.assign(arrayPackets, review.hashesSha256.authoringPackets);
      review.hashesSha256.authoringPackets = arrayPackets;
    },
  ];

  for (const mutate of cases) {
    const input = fixture();
    mutate(input.review);
    assert.throws(
      () => buildFrenchDailyPhrasePriorAcceptedManifest(input),
      /hash|SHA-256|inventory/iu,
    );
  }
});

test('legacy French fallbacks apply only when fields are absent, never when present-null', () => {
  const nullTarget = fixture();
  nullTarget.review.studyTarget = null;
  assert.throws(
    () => buildFrenchDailyPhrasePriorAcceptedManifest(nullTarget),
    /studyTarget/iu,
  );

  const nullEvidence = fixture();
  nullEvidence.review.hashesSha256.sourceEvidence = null;
  assert.throws(
    () => buildFrenchDailyPhrasePriorAcceptedManifest(nullEvidence),
    /hash|SHA-256/iu,
  );
});

test('an explicit invalid structural gate cannot fall through to the legacy alias', () => {
  const input = fixture();
  input.review.deterministicGates.structural = null;
  input.review.deterministicGates.subsetStructural = 'STRUCTURAL_PASS';

  assert.throws(
    () => buildFrenchDailyPhrasePriorAcceptedManifest(input),
    /four deterministic gates/iu,
  );
});

test('authoring packet paths enforce a contiguous range of at most ten exact row ids', () => {
  const eleven = Array.from(
    { length: 11 },
    (_, index) => `fr-${String(index + 1).padStart(3, '0')}`,
  );
  assert.throws(
    () => assertDailyPhraseAuthoringPacketPath(
      'content/daily-phrases/fr/authoring/fr-001-011.json',
      'fr',
      eleven,
    ),
    /10|range/iu,
  );
  assert.throws(
    () => assertDailyPhraseAuthoringPacketPath(
      'content/daily-phrases/fr/authoring/fr-001-003.json',
      'fr',
      ['fr-001', 'fr-099', 'fr-003'],
    ),
    /contiguous|range|row ids/iu,
  );
  assert.throws(
    () => assertDailyPhraseAuthoringPacketPath(
      'content/daily-phrases/fr/authoring/fr-001-003.json',
      'fr',
      new Array(3),
    ),
    /contiguous|range|row ids/iu,
  );
});
