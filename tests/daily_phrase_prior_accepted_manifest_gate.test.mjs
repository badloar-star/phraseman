import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

import { evaluateDailyPhrasePriorAcceptedManifest } from '../scripts/daily_phrase_prior_accepted_manifest_gate.mjs';

function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'utf8');
  return createHash('sha256').update(bytes).digest('hex').toUpperCase();
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
  const bank = {
    studyTarget: 'fr',
    sourceLocale: 'ru',
    surface: 'daily_phrase',
    activationApproved: false,
    rows: allRows,
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
  const paths = {
    bank: 'content/daily-phrases/fr/source-bank.json',
    sourceEvidence: 'content/daily-phrases/fr/authoritative-source-ledger.json',
    sourceLinkage: 'content/daily-phrases/fr/source-ledger.json',
    englishBaseline: 'admin/daily_phrases_seed.json',
    styleContract: 'content/daily-phrases/quality/STYLE_CONTRACT.md',
    packet: 'content/daily-phrases/fr/authoring/fr-001-002.json',
  };
  const artifacts = {
    [paths.bank]: Buffer.from(`${JSON.stringify(bank, null, 2)}\n`),
    [paths.sourceEvidence]: Buffer.from(`${JSON.stringify(ledger, null, 2)}\n`),
    [paths.sourceLinkage]: Buffer.from(`${JSON.stringify(linkage, null, 2)}\n`),
    [paths.englishBaseline]: fs.readFileSync(new URL('../admin/daily_phrases_seed.json', import.meta.url)),
    [paths.styleContract]: Buffer.from('# style\n'),
    [paths.packet]: Buffer.from(`${JSON.stringify(packet, null, 2)}\n`),
  };
  const authorityArtifacts = Object.fromEntries(
    Object.entries(paths).filter(([key]) => key !== 'packet').map(([key, path]) => [key, {
      path,
      sha256: sha256(artifacts[path]),
    }]),
  );
  const manifest = {
    schemaVersion: 'daily-phrase-prior-accepted-manifest-v1',
    studyTarget: 'fr',
    sourceLocale: 'ru',
    surface: 'daily_phrase',
    editorialStatus: 'EDITORIAL_CONTINUITY_ACCEPTED',
    releaseTrusted: false,
    activationApproved: false,
    acceptedCount: 2,
    acceptedThrough: 'fr-002',
    acceptedRowIds: rows.map((row) => row.id),
    acceptedRows: rows.map((row) => ({ id: row.id, rowSha256: sha256(JSON.stringify(row)) })),
    authorityArtifacts,
    authoringPackets: [{
      path: paths.packet,
      sha256: sha256(artifacts[paths.packet]),
      rowIds: rows.map((row) => row.id),
    }],
    deterministicGates: {
      sourceLink: 'PASS',
      style: 'PASS',
      quiz: 'PASS',
      structural: 'PASS',
    },
    independentEditorialReview: {
      verdict: 'ACCEPT',
      findings: [],
      reviewedAt: '2026-09-27T06:10:00.000Z',
      reviewerIndependence: true,
      reviewerIdentity: '/root/reviewer-fixture',
      releaseTrusted: false,
    },
    releaseBoundary: 'Editorial continuity only; not a trusted release receipt and not activation approval.',
  };
  return { artifacts, manifest, rows, paths };
}

test('binds source authority metadata to the manifest target and Daily Phrase scope', () => {
  const scenarios = [
    {
      artifactKey: 'sourceEvidence',
      mutate: (artifact) => { artifact.studyTarget = 'de'; },
      expected: 'source_evidence.invalid_scope',
    },
    {
      artifactKey: 'sourceEvidence',
      mutate: (artifact) => { artifact.schemaVersion = 'daily-phrase-cvc-source-ledger-v1'; },
      expected: 'source_evidence.invalid_scope',
    },
    {
      artifactKey: 'sourceLinkage',
      mutate: (artifact) => { artifact.studyTarget = 'de'; },
      expected: 'source_linkage.invalid_scope',
    },
    {
      artifactKey: 'sourceLinkage',
      mutate: (artifact) => { artifact.surface = 'learning_session'; },
      expected: 'source_linkage.invalid_scope',
    },
  ];

  for (const scenario of scenarios) {
    const data = fixture();
    const artifactPath = data.paths[scenario.artifactKey];
    const artifact = JSON.parse(data.artifacts[artifactPath].toString('utf8'));
    scenario.mutate(artifact);
    data.artifacts[artifactPath] = Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`);
    data.manifest.authorityArtifacts[scenario.artifactKey].sha256 = sha256(data.artifacts[artifactPath]);

    const result = evaluateDailyPhrasePriorAcceptedManifest(data);
    assert.ok(result.issues.includes(scenario.expected), JSON.stringify(result.issues, null, 2));
  }
});

test('binds the nested source-linkage authority descriptor to the canonical evidence artifact', () => {
  for (const scenario of [
    {
      mutate: (linkage) => { linkage.authoritativeLedger.path = ' authoritative-source-ledger.json'; },
      rebindRefs: false,
    },
    {
      mutate: (linkage) => { linkage.authoritativeLedger.path = 'not-the-ledger.json'; },
      rebindRefs: true,
    },
    {
      mutate: (linkage) => { linkage.authoritativeLedger.schemaVersion = 'daily-phrase-cvc-source-ledger-v1'; },
      rebindRefs: false,
    },
  ]) {
    const data = fixture();
    const linkage = JSON.parse(data.artifacts[data.paths.sourceLinkage].toString('utf8'));
    scenario.mutate(linkage);
    data.artifacts[data.paths.sourceLinkage] = Buffer.from(`${JSON.stringify(linkage, null, 2)}\n`);
    data.manifest.authorityArtifacts.sourceLinkage.sha256 = sha256(data.artifacts[data.paths.sourceLinkage]);

    if (scenario.rebindRefs) {
      const bank = JSON.parse(data.artifacts[data.paths.bank].toString('utf8'));
      for (const [index, row] of bank.rows.slice(0, data.manifest.acceptedCount).entries()) {
        row.sourceEvidence.sourceLedgerRef = `not-the-ledger.json#rows[${index}]`;
      }
      rebindBank(data, bank);
    }

    const result = evaluateDailyPhrasePriorAcceptedManifest(data);
    assert.ok(
      result.issues.includes('source_linkage.invalid_authority_binding'),
      JSON.stringify(result.issues, null, 2),
    );
  }
});

test('rejects a numeric reviewedAt even when Date.parse would coerce it', () => {
  const data = fixture();
  data.manifest.independentEditorialReview.reviewedAt = 0;

  const result = evaluateDailyPhrasePriorAcceptedManifest(data);

  assert.ok(result.issues.includes('review.independent_accept_required'));
});

test('rejects an impossible reviewedAt calendar date instead of accepting Date.parse normalization', () => {
  const data = fixture();
  data.manifest.independentEditorialReview.reviewedAt = '2026-02-31T06:10:00.000Z';

  const result = evaluateDailyPhrasePriorAcceptedManifest(data);

  assert.ok(result.issues.includes('review.independent_accept_required'));
});

function rebindBank({ artifacts, manifest, paths }, bank) {
  artifacts[paths.bank] = Buffer.from(`${JSON.stringify(bank, null, 2)}\n`);
  manifest.authorityArtifacts.bank.sha256 = sha256(artifacts[paths.bank]);
  manifest.acceptedRows = bank.rows.slice(0, manifest.acceptedCount)
    .map((row) => ({ id: row.id, rowSha256: sha256(JSON.stringify(row)) }));
}

function partitionedFixture() {
  const data = fixture();
  const rows = Array.from({ length: 10 }, (_, index) => acceptedRow(index + 1));
  const ruOpenings = [
    'Утром открылась ярмарка', 'После дождя ожила площадь', 'К полудню пришли покупатели',
    'Возле вокзала шумел рынок', 'В субботу распахнулись палатки', 'На рассвете приехали торговцы',
    'Перед обедом загудели ряды', 'У старой ратуши начался торг', 'В праздник заполнилась площадь',
    'К вечеру засветились витрины',
  ];
  const ukOpenings = [
    'Вранці відкрився ярмарок', 'Після дощу ожила площа', 'Опівдні прийшли покупці',
    'Біля вокзалу шумів ринок', 'У суботу відкрилися намети', 'На світанку приїхали торговці',
    'Перед обідом загуділи ряди', 'Біля старої ратуші почався торг', 'На свято заповнилася площа',
    'Надвечір засвітилися вітрини',
  ];

  for (const [index, row] of rows.entries()) {
    row.text_ru = row.text_ru
      .replace('Представь ярмарку', ruOpenings[index])
      .replace('Огромный внедорожник для двух кварталов? Точно оно.', 'Огромный внедорожник для двух кварталов — точно оно.');
    row.text_uk = row.text_uk
      .replace('Уяви ярмарок', ukOpenings[index])
      .replace('Величезний позашляховик для двох кварталів? Саме воно.', 'Величезний позашляховик для двох кварталів — саме воно.');
    if ([4, 9].includes(index)) {
      row.text_ru = row.text_ru
        .replace(`❤️ ${ruOpenings[index]}:`, `❤️ ${row.targetText} — ${ruOpenings[index].toLocaleLowerCase('ru')}:`)
        .replace(`Вот настроение ${row.targetText}:`, 'Вот настроение этого выбора:')
        .replace('Размер впечатляет, но', 'Размер впечатляет. Но');
      row.text_uk = row.text_uk
        .replace(`❤️ ${ukOpenings[index]}:`, `❤️ ${row.targetText} — ${ukOpenings[index].toLocaleLowerCase('uk')}:`)
        .replace(`Ось настрій ${row.targetText}:`, 'Ось настрій такого вибору:')
        .replace('Розмір вражає, але', 'Розмір вражає. Але');
    }
    if ([2, 7].includes(index)) {
      row.quiz_ru.distractors[0].text += ' после подробной проверки всех дорожных условий и оборудования';
      row.quiz_uk.distractors[0].text += ' після докладної перевірки всіх дорожніх умов та спорядження';
    }
  }

  const bank = JSON.parse(data.artifacts[data.paths.bank].toString('utf8'));
  bank.rows = [...rows, ...bank.rows.slice(10)];
  const ledger = {
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
    authoritativeLedger: { path: 'authoritative-source-ledger.json' },
    linkedCandidateRows: rows.map((row, index) => ({
      rowId: row.id,
      ledgerRow: index,
      sourceId: `fixture:${index + 1}`,
    })),
  };
  const packetPaths = [
    'content/daily-phrases/fr/authoring/fr-001-005.json',
    'content/daily-phrases/fr/authoring/fr-006-010.json',
  ];
  const packets = [rows.slice(0, 5), rows.slice(5, 10)].map((packetRows) => ({
    schemaVersion: 'daily-phrase-authoring-packet-v1',
    studyTarget: 'fr',
    sourceLocale: 'ru',
    status: 'DRAFT_REQUIRES_INDEPENDENT_REVIEW',
    rows: packetRows.map(authoringPacketRow),
  }));

  data.artifacts[data.paths.bank] = Buffer.from(`${JSON.stringify(bank, null, 2)}\n`);
  data.artifacts[data.paths.sourceEvidence] = Buffer.from(`${JSON.stringify(ledger, null, 2)}\n`);
  data.artifacts[data.paths.sourceLinkage] = Buffer.from(`${JSON.stringify(linkage, null, 2)}\n`);
  for (const [index, packetPath] of packetPaths.entries()) {
    data.artifacts[packetPath] = Buffer.from(`${JSON.stringify(packets[index], null, 2)}\n`);
  }

  data.manifest.acceptedCount = 10;
  data.manifest.acceptedThrough = 'fr-010';
  data.manifest.acceptedRowIds = rows.map((row) => row.id);
  data.manifest.acceptedRows = rows.map((row) => ({ id: row.id, rowSha256: sha256(JSON.stringify(row)) }));
  for (const key of ['bank', 'sourceEvidence', 'sourceLinkage']) {
    data.manifest.authorityArtifacts[key].sha256 = sha256(data.artifacts[data.paths[key]]);
  }
  data.manifest.authoringPackets = packetPaths.map((packetPath, index) => ({
    path: packetPath,
    sha256: sha256(data.artifacts[packetPath]),
    rowIds: packets[index].rows.map((row) => row.id),
  }));
  data.partitioned = { bank, ledger, packets, packetPaths };
  return data;
}

test('passes an exact non-release editorial-continuity manifest', () => {
  const { artifacts, manifest } = fixture();
  const result = evaluateDailyPhrasePriorAcceptedManifest({ manifest, artifacts });
  assert.deepEqual(result, {
    contractVersion: 'daily-phrase-prior-accepted-manifest-v1',
    verdict: 'PASS',
    acceptedCount: 2,
    issues: [],
  });
});

test('fails closed if the manifest claims release trust or activation approval', () => {
  const { artifacts, manifest } = fixture();
  manifest.releaseTrusted = true;
  manifest.activationApproved = true;
  const result = evaluateDailyPhrasePriorAcceptedManifest({ manifest, artifacts });
  assert.ok(result.issues.includes('manifest.release_trust_must_remain_false'));
  assert.ok(result.issues.includes('manifest.activation_must_remain_closed'));
});

test('requires exact raw manifest scope and row identity scalars', () => {
  const scenarios = [
    {
      mutate: (data) => { data.manifest.studyTarget = ' fr '; },
      expected: 'manifest.invalid_scope',
    },
    {
      mutate: (data) => { data.manifest.acceptedRowIds[0] = ' fr-001'; },
      expected: 'manifest.invalid_accepted_row_ids',
    },
    {
      mutate: (data) => { data.manifest.acceptedRows[0].id = ' fr-001'; },
      expected: 'manifest.accepted_row_hash_inventory_mismatch',
    },
    {
      mutate: (data) => { data.manifest.authoringPackets[0].rowIds[0] = 'fr-001 '; },
      expected: 'packet:0.invalid_row_ids',
    },
  ];

  for (const scenario of scenarios) {
    const data = fixture();
    scenario.mutate(data);
    const result = evaluateDailyPhrasePriorAcceptedManifest(data);
    assert.equal(result.verdict, 'HOLD');
    assert.ok(result.issues.includes(scenario.expected), JSON.stringify(result.issues, null, 2));
  }
});

test('requires canonical uppercase 64-hex manifest digest leaves', () => {
  const scenarios = [
    {
      mutate: (data) => { data.manifest.authorityArtifacts.bank.sha256 = ` ${data.manifest.authorityArtifacts.bank.sha256}`; },
      expected: 'artifact.bank.sha256_mismatch',
    },
    {
      mutate: (data) => { data.manifest.acceptedRows[0].rowSha256 += ' '; },
      expected: 'row:fr-001.sha256_mismatch',
    },
    {
      mutate: (data) => { data.manifest.authoringPackets[0].sha256 = data.manifest.authoringPackets[0].sha256.toLowerCase(); },
      expected: 'packet:0.sha256_mismatch',
    },
  ];

  for (const scenario of scenarios) {
    const data = fixture();
    scenario.mutate(data);
    const result = evaluateDailyPhrasePriorAcceptedManifest(data);
    assert.equal(result.verdict, 'HOLD');
    assert.ok(result.issues.includes(scenario.expected), JSON.stringify(result.issues, null, 2));
  }
});

test('detects stale authority bytes and stale accepted-row hashes', () => {
  const { artifacts, manifest, paths } = fixture();
  artifacts[paths.sourceEvidence] = Buffer.from('{"source":"changed"}\n');
  manifest.acceptedRows[0].rowSha256 = '0'.repeat(64);
  const result = evaluateDailyPhrasePriorAcceptedManifest({ manifest, artifacts });
  assert.ok(result.issues.includes('artifact.sourceEvidence.sha256_mismatch'));
  assert.ok(result.issues.includes('row:fr-001.sha256_mismatch'));
});

test('requires one canonical prefix with exact packet coverage', () => {
  const { artifacts, manifest } = fixture();
  manifest.acceptedRowIds = ['fr-002', 'fr-001'];
  manifest.authoringPackets[0].rowIds = ['fr-001'];
  const result = evaluateDailyPhrasePriorAcceptedManifest({ manifest, artifacts });
  assert.ok(result.issues.includes('manifest.accepted_rows_must_be_canonical_prefix'));
  assert.ok(result.issues.includes('manifest.packet_coverage_mismatch'));
});

test('requires an independent ACCEPT while keeping it explicitly non-release-trusted', () => {
  const { artifacts, manifest } = fixture();
  manifest.independentEditorialReview.verdict = 'HOLD';
  manifest.independentEditorialReview.reviewerIndependence = false;
  manifest.independentEditorialReview.releaseTrusted = true;
  const result = evaluateDailyPhrasePriorAcceptedManifest({ manifest, artifacts });
  assert.ok(result.issues.includes('review.independent_accept_required'));
  assert.ok(result.issues.includes('review.release_trust_must_remain_false'));
});

test('rejects authority and packet paths outside the target-scoped allowlist', () => {
  const authorityCase = fixture();
  authorityCase.manifest.authorityArtifacts.bank.path = '../outside-bank.json';
  authorityCase.artifacts['../outside-bank.json'] = authorityCase.artifacts[authorityCase.paths.bank];
  const authorityResult = evaluateDailyPhrasePriorAcceptedManifest(authorityCase);
  assert.ok(authorityResult.issues.includes('manifest.noncanonical_authority_paths'));

  const packetCase = fixture();
  packetCase.manifest.authoringPackets[0].path = '../outside-packet.json';
  packetCase.artifacts['../outside-packet.json'] = packetCase.artifacts[packetCase.paths.packet];
  const packetResult = evaluateDailyPhrasePriorAcceptedManifest(packetCase);
  assert.ok(packetResult.issues.includes('packet:0.noncanonical_path'));

  const paddedPacketCase = fixture();
  paddedPacketCase.manifest.authoringPackets[0].path = ` ${paddedPacketCase.paths.packet}`;
  const paddedPacketResult = evaluateDailyPhrasePriorAcceptedManifest(paddedPacketCase);
  assert.ok(paddedPacketResult.issues.includes('packet:0.noncanonical_path'));
});

test('fails closed on a sparse accepted-row hash inventory', () => {
  const data = fixture();
  delete data.manifest.acceptedRows[0];

  let result;
  assert.doesNotThrow(() => {
    result = evaluateDailyPhrasePriorAcceptedManifest(data);
  });
  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.includes('manifest.accepted_row_hash_inventory_mismatch'));
});

test('rejects a packet whose learner fields no longer equal the canonical bank', () => {
  const fixtureData = fixture();
  const { artifacts, manifest, paths } = fixtureData;
  const packet = JSON.parse(artifacts[paths.packet].toString('utf8'));
  packet.rows[0].targetText = 'Changed expression';
  artifacts[paths.packet] = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  manifest.authoringPackets[0].sha256 = sha256(artifacts[paths.packet]);
  const result = evaluateDailyPhrasePriorAcceptedManifest({ manifest, artifacts });
  assert.ok(result.issues.includes('packet:0.row:fr-001.bank_mismatch'));
});

test('rejects an id-only packet instead of treating omitted learner fields as matching', () => {
  const { artifacts, manifest, paths } = fixture();
  const packet = JSON.parse(artifacts[paths.packet].toString('utf8'));
  packet.rows = packet.rows.map(({ id }) => ({ id }));
  artifacts[paths.packet] = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  manifest.authoringPackets[0].sha256 = sha256(artifacts[paths.packet]);

  const result = evaluateDailyPhrasePriorAcceptedManifest({ manifest, artifacts });

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.includes('packet:0.row:fr-001.missing_required_fields'));
  assert.ok(result.issues.includes('packet:0.row:fr-002.missing_required_fields'));
});

test('rejects a bank-only optional author field omitted from the reviewed packet', () => {
  const fixtureData = fixture();
  const bank = JSON.parse(fixtureData.artifacts[fixtureData.paths.bank].toString('utf8'));
  bank.rows[0].targetSurfaceForms = { text_ru: 'Expression 1' };
  rebindBank(fixtureData, bank);

  const result = evaluateDailyPhrasePriorAcceptedManifest(fixtureData);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.includes('packet:0.row:fr-001.bank_mismatch'));
});

test('rejects a bank-matching control field outside the reviewed packet schema', () => {
  const data = fixture();
  const packet = JSON.parse(data.artifacts[data.paths.packet].toString('utf8'));
  packet.rows[0].active = false;
  data.artifacts[data.paths.packet] = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  data.manifest.authoringPackets[0].sha256 = sha256(data.artifacts[data.paths.packet]);

  const result = evaluateDailyPhrasePriorAcceptedManifest(data);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.includes('packet:0.row:fr-001.unsupported_fields'));
});

test('binds the packet filename range to its declared first and last row ids', () => {
  const { artifacts, manifest, paths } = fixture();
  const wrongPath = 'content/daily-phrases/fr/authoring/fr-999-999.json';
  artifacts[wrongPath] = artifacts[paths.packet];
  manifest.authoringPackets[0].path = wrongPath;

  const result = evaluateDailyPhrasePriorAcceptedManifest({ manifest, artifacts });

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.includes('packet:0.noncanonical_path'));
});

test('replays style across the full accepted prefix instead of trusting packet partitions', () => {
  const data = partitionedFixture();

  const result = evaluateDailyPhrasePriorAcceptedManifest(data);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(
    result.issues.includes('aggregate.style_hold:batch.concentrated_sentence_count'),
    JSON.stringify(result.issues, null, 2),
  );
  assert.ok(
    result.issues.includes('aggregate.style_hold:batch.concentrated_target_position'),
    JSON.stringify(result.issues, null, 2),
  );
});

test('replays structural uniqueness across packet boundaries', () => {
  const data = partitionedFixture();
  const { bank, ledger, packets, packetPaths } = data.partitioned;
  bank.rows[5].targetText = bank.rows[0].targetText;
  bank.rows[5].targetExample = bank.rows[5].targetExample.replace('Expression 6', 'Expression 1');
  bank.rows[5].text_ru = bank.rows[5].text_ru.replaceAll('Expression 6', 'Expression 1');
  bank.rows[5].text_uk = bank.rows[5].text_uk.replaceAll('Expression 6', 'Expression 1');
  ledger.rows[5].targetText = bank.rows[5].targetText;
  packets[1].rows[0] = authoringPacketRow(bank.rows[5]);

  rebindBank(data, bank);
  data.artifacts[data.paths.sourceEvidence] = Buffer.from(`${JSON.stringify(ledger, null, 2)}\n`);
  data.manifest.authorityArtifacts.sourceEvidence.sha256 = sha256(data.artifacts[data.paths.sourceEvidence]);
  data.artifacts[packetPaths[1]] = Buffer.from(`${JSON.stringify(packets[1], null, 2)}\n`);
  data.manifest.authoringPackets[1].sha256 = sha256(data.artifacts[packetPaths[1]]);

  const result = evaluateDailyPhrasePriorAcceptedManifest(data);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(
    result.issues.includes('aggregate.structural_hold:row:fr-006:duplicate_target_text'),
    JSON.stringify(result.issues, null, 2),
  );
});

test('replays source, style, and structural gates from current packet rows', () => {
  const cases = [
    {
      mutate: (row) => { row.sourceEvidence.definitionQuote = 'Changed frozen quote.'; },
      issue: 'packet:0.source_hold:evidence.definition_quote_mismatch',
    },
    {
      mutate: (row) => { row.text_ru = '❤️ Коротко про Expression 1.'; },
      issue: 'packet:0.style_hold:ru.word_count',
    },
    {
      mutate: (row) => { row.allowSave = false; },
      issue: 'packet:0.structural_hold:row:fr-001:allow_save_required',
    },
  ];
  for (const scenario of cases) {
    const fixtureData = fixture();
    const { artifacts, manifest, paths } = fixtureData;
    const bank = JSON.parse(artifacts[paths.bank].toString('utf8'));
    scenario.mutate(bank.rows[0]);
    rebindBank(fixtureData, bank);
    const result = evaluateDailyPhrasePriorAcceptedManifest({ manifest, artifacts });
    assert.ok(result.issues.includes(scenario.issue), JSON.stringify(result.issues, null, 2));
  }
});

test('replays quiz gates per original packet instead of trusting an aggregate PASS claim', () => {
  const { artifacts, manifest, paths } = fixture();
  const bank = JSON.parse(artifacts[paths.bank].toString('utf8'));
  bank.rows[2] = acceptedRow(3);
  for (const row of bank.rows.slice(0, 3)) {
    row.meaning_ru = 'Распоряжаться ожидаемым результатом и считать успех обеспеченным слишком рано.';
    row.quiz_ru.distractors[0].text = 'Продать настоящую шкуру до охоты.';
    row.quiz_ru.distractors[1].text = 'Осторожно составить запасной план.';
  }
  rebindBank({ artifacts, manifest, paths }, bank);

  const packet = JSON.parse(artifacts[paths.packet].toString('utf8'));
  packet.rows.push({ id: 'fr-003', targetText: 'Expression 3' });
  artifacts[paths.packet] = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);

  manifest.acceptedCount = 3;
  manifest.acceptedThrough = 'fr-003';
  manifest.acceptedRowIds = bank.rows.slice(0, 3).map((row) => row.id);
  manifest.acceptedRows = bank.rows.slice(0, 3).map((row) => ({ id: row.id, rowSha256: sha256(JSON.stringify(row)) }));
  manifest.authoringPackets[0].sha256 = sha256(artifacts[paths.packet]);
  manifest.authoringPackets[0].rowIds = bank.rows.slice(0, 3).map((row) => row.id);

  const result = evaluateDailyPhrasePriorAcceptedManifest({ manifest, artifacts });
  assert.ok(result.issues.includes('packet:0.quiz_hold:ru.repeated_longest_correct'));
});

test('replays repeated-longest quiz balance across packet boundaries', () => {
  const data = partitionedFixture();
  const { bank } = data.partitioned;
  const rows = bank.rows.slice(0, 10);

  for (const [index, row] of rows.slice(0, 3).entries()) {
    const number = index + 1;
    row.meaning_ru = `Предусмотрительно считать подтверждённым результат номер ${number} ещё до окончательного завершения всей работы.`;
    row.meaning_uk = `Завбачливо вважати підтвердженим результат номер ${number} ще до остаточного завершення всієї роботи.`;
    row.quiz_ru.distractors[0].text = `Продать шкуру медведя до начала охоты номер ${number}.`;
    row.quiz_ru.distractors[1].text = `Составить простой запасной план на случай неудачи ${number}.`;
    row.quiz_uk.distractors[0].text = `Продати шкуру ведмедя до початку полювання номер ${number}.`;
    row.quiz_uk.distractors[1].text = `Скласти простий запасний план на випадок невдачі ${number}.`;
  }
  for (const row of rows.slice(3)) {
    row.quiz_ru.distractors[0].text = 'Покупать большую вещь только после подробной проверки её реальной пользы и нужных качеств.';
    row.quiz_ru.distractors[1].text = 'Сначала сравнить цену, надёжность и удобство нескольких доступных вариантов перед окончательным выбором.';
    row.quiz_uk.distractors[0].text = 'Купувати велику річ лише після докладної перевірки її справжньої користі та потрібних якостей.';
    row.quiz_uk.distractors[1].text = 'Спочатку порівняти ціну, надійність і зручність кількох доступних варіантів перед остаточним вибором.';
  }

  rebindBank(data, bank);
  const packetPaths = [
    'content/daily-phrases/fr/authoring/fr-001-002.json',
    'content/daily-phrases/fr/authoring/fr-003-010.json',
  ];
  const packets = [rows.slice(0, 2), rows.slice(2)].map((packetRows) => ({
    schemaVersion: 'daily-phrase-authoring-packet-v1',
    studyTarget: 'fr',
    sourceLocale: 'ru',
    status: 'DRAFT_REQUIRES_INDEPENDENT_REVIEW',
    rows: packetRows.map(authoringPacketRow),
  }));
  for (const [index, packetPath] of packetPaths.entries()) {
    data.artifacts[packetPath] = Buffer.from(`${JSON.stringify(packets[index], null, 2)}\n`);
  }
  data.manifest.authoringPackets = packetPaths.map((packetPath, index) => ({
    path: packetPath,
    sha256: sha256(data.artifacts[packetPath]),
    rowIds: packets[index].rows.map((row) => row.id),
  }));

  const result = evaluateDailyPhrasePriorAcceptedManifest(data);

  assert.ok(
    result.issues.includes('aggregate.quiz_hold:ru.repeated_longest_correct'),
    JSON.stringify(result.issues, null, 2),
  );
  assert.ok(
    result.issues.includes('aggregate.quiz_hold:uk.repeated_longest_correct'),
    JSON.stringify(result.issues, null, 2),
  );
});

test('rejects a hash-bound English baseline with an empty canonical pool', () => {
  const data = fixture();
  data.artifacts[data.paths.englishBaseline] = Buffer.from('[]\n');
  data.manifest.authorityArtifacts.englishBaseline.sha256 = sha256(
    data.artifacts[data.paths.englishBaseline],
  );

  const result = evaluateDailyPhrasePriorAcceptedManifest(data);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.includes('artifact.englishBaseline.wrong_count'));
});

test('rejects hash-consistent non-string quiz leaves during continuity replay', () => {
  const data = fixture();
  const bank = JSON.parse(data.artifacts[data.paths.bank].toString('utf8'));
  bank.rows[0].quiz_ru.correctFeedback = [bank.rows[0].quiz_ru.correctFeedback];
  rebindBank(data, bank);

  const packet = JSON.parse(data.artifacts[data.paths.packet].toString('utf8'));
  packet.rows[0].quiz_ru.correctFeedback = [packet.rows[0].quiz_ru.correctFeedback];
  data.artifacts[data.paths.packet] = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  data.manifest.authoringPackets[0].sha256 = sha256(data.artifacts[data.paths.packet]);

  const result = evaluateDailyPhrasePriorAcceptedManifest(data);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.includes('packet:0.quiz_hold:ru.correct_feedback_type'));
});

test('rejects a hash-consistent bank with a noncanonical row order', () => {
  const data = fixture();
  const bank = JSON.parse(data.artifacts[data.paths.bank].toString('utf8'));
  bank.rows[2].order = 999;
  rebindBank(data, bank);

  const result = evaluateDailyPhrasePriorAcceptedManifest(data);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.includes(
    'packet:0.structural_hold:row:fr-003:canonical_order_required',
  ));
});
