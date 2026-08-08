const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const modulePromise = import('../scripts/lib/language_test_external_review.mjs');

const bank = {
  language: 'es',
  bankVersion: 'candidate.es.1',
  questions: [
    {
      id: 'es-a1-001',
      level: 'A1',
      stimulus: '¿Cómo te llamas?',
      options: ['Me llamo Ana.', 'Ayer.', 'En Madrid.', 'Dos.'],
      correctIndex: 0,
    },
    {
      id: 'es-a1-002',
      level: 'A1',
      stimulus: 'Tengo ___ años.',
      options: ['veinte', 'ayer', 'azul', 'aquí'],
      correctIndex: 0,
    },
  ],
};

test('review work order binds every question to exact learner-visible content', async () => {
  const { buildReviewWorkOrder } = await modulePromise;
  const packet = buildReviewWorkOrder(bank);

  assert.equal(packet.schemaVersion, 'language-test-external-review-v1');
  assert.equal(packet.language, 'es');
  assert.equal(packet.bankVersion, 'candidate.es.1');
  assert.equal(packet.decisions.length, 2);
  assert.deepEqual(packet.decisions.map((row) => row.questionId), ['es-a1-001', 'es-a1-002']);
  assert.match(packet.decisions[0].contentHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(packet.decisions[0].question, bank.questions[0]);
  assert.equal(packet.decisions[0].status, 'unreviewed');
  assert.equal(packet.decisions[0].reviewEvidenceId, '');
  assert.equal(packet.reviewer.reviewerId, '');
  assert.equal(packet.reviewer.reviewerEvidenceId, '');
  assert.equal(packet.reviewer.qualificationEvidenceId, '');
  assert.equal(packet.reviewer.independentFromAuthoring, false);
});

test('question hash changes when any review evidence changes, independent of key order', async () => {
  const { hashReviewableQuestion } = await modulePromise;
  const question = {
    ...bank.questions[0],
    distractorRationalesRu: { 1: 'Неверный коммуникативный ответ.' },
  };
  const reordered = Object.fromEntries(Object.entries(question).reverse());
  const changedEvidence = {
    ...question,
    distractorRationalesRu: { 1: 'Другая причина ошибки.' },
  };

  assert.equal(hashReviewableQuestion(question), hashReviewableQuestion(reordered));
  assert.notEqual(hashReviewableQuestion(question), hashReviewableQuestion(changedEvidence));
});

test('complete qualified approval passes only for the exact bank revision', async () => {
  const { buildReviewWorkOrder, validateFilledReview } = await modulePromise;
  const packet = buildReviewWorkOrder(bank);
  packet.reviewer = {
    reviewerId: 'reviewer-es-01',
    reviewerEvidenceId: 'contract-or-directory-record-001',
    qualification: 'Qualified Spanish linguist; CEFR assessment experience',
    qualificationEvidenceId: 'credential-record-001',
    independentFromAuthoring: true,
    reviewedAt: '2026-08-03T12:00:00.000Z',
    attestation: 'I reviewed every item against the exact content hash.',
  };
  packet.decisions = packet.decisions.map((row) => ({
    ...row,
    status: 'approved',
    reviewEvidenceId: `evidence-${row.questionId}`,
    notes: 'Correct, natural, unambiguous, and level-appropriate.',
  }));

  const result = validateFilledReview(packet, bank);
  assert.equal(result.releaseReady, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.approved, 2);
  assert.equal(result.total, 2);
});

test('missing, duplicate, stale, or non-approved decisions block release', async () => {
  const { buildReviewWorkOrder, validateFilledReview } = await modulePromise;
  const packet = buildReviewWorkOrder(bank);
  packet.reviewer = {
    reviewerId: '',
    reviewerEvidenceId: '',
    qualification: '',
    qualificationEvidenceId: '',
    independentFromAuthoring: false,
    reviewedAt: '',
    attestation: '',
  };
  packet.decisions = [
    { ...packet.decisions[0], contentHash: '0'.repeat(64), status: 'approved', reviewEvidenceId: '', notes: '' },
    { ...packet.decisions[0], status: 'changes_required', reviewEvidenceId: 'duplicate-evidence', notes: 'Answer is ambiguous.' },
  ];

  const result = validateFilledReview(packet, bank);
  assert.equal(result.releaseReady, false);
  assert.ok(result.blockers.some((item) => item.includes('reviewerId')));
  assert.ok(result.blockers.some((item) => item.includes('qualificationEvidenceId')));
  assert.ok(result.blockers.some((item) => item.includes('independentFromAuthoring')));
  assert.ok(result.blockers.some((item) => item.includes('duplicate decision es-a1-001')));
  assert.ok(result.blockers.some((item) => item.includes('missing decision es-a1-002')));
  assert.ok(result.blockers.some((item) => item.includes('contentHash mismatch es-a1-001')));
  assert.ok(result.blockers.some((item) => item.includes('changes_required')));
  assert.ok(result.blockers.some((item) => item.includes('reviewEvidenceId')));
});

test('edited question snapshots block release even when the stored hash is unchanged', async () => {
  const { buildReviewWorkOrder, validateFilledReview } = await modulePromise;
  const packet = buildReviewWorkOrder(bank);
  packet.reviewer = {
    reviewerId: 'reviewer-es-01',
    reviewerEvidenceId: 'contract-or-directory-record-001',
    qualification: 'Qualified Spanish linguist; CEFR assessment experience',
    qualificationEvidenceId: 'credential-record-001',
    independentFromAuthoring: true,
    reviewedAt: '2026-08-03T12:00:00.000Z',
    attestation: 'I reviewed every item against the exact content hash.',
  };
  packet.decisions = packet.decisions.map((row) => ({
    ...row,
    status: 'approved',
    reviewEvidenceId: `evidence-${row.questionId}`,
    notes: 'Correct, natural, unambiguous, and level-appropriate.',
  }));
  packet.decisions[0].question.stimulus = 'Contenido cambiado después de la revisión.';

  const result = validateFilledReview(packet, bank);
  assert.equal(result.releaseReady, false);
  assert.ok(result.blockers.some((item) => item.includes('question snapshot mismatch es-a1-001')));
});

test('review evidence IDs must be present and unique per decision', async () => {
  const { buildReviewWorkOrder, validateFilledReview } = await modulePromise;
  const packet = buildReviewWorkOrder(bank);
  packet.reviewer = {
    reviewerId: 'reviewer-es-01',
    reviewerEvidenceId: 'contract-or-directory-record-001',
    qualification: 'Qualified Spanish linguist; CEFR assessment experience',
    qualificationEvidenceId: 'credential-record-001',
    independentFromAuthoring: true,
    reviewedAt: '2026-08-03T12:00:00.000Z',
    attestation: 'I reviewed every item against the exact content hash.',
  };
  packet.decisions = packet.decisions.map((row) => ({
    ...row,
    status: 'approved',
    reviewEvidenceId: 'same-evidence-for-every-row',
    notes: 'Correct, natural, unambiguous, and level-appropriate.',
  }));

  const result = validateFilledReview(packet, bank);
  assert.equal(result.releaseReady, false);
  assert.ok(result.blockers.some((item) => item.includes('duplicate reviewEvidenceId')));
});

test('candidate directory loader assembles all declared levels in CEFR order', async () => {
  const { loadCandidateBankDirectory } = await modulePromise;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'language-review-'));
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({
    language: 'es',
    bankVersion: 'candidate.es.1',
    authoredLevels: ['A1', 'A2'],
  }));
  fs.writeFileSync(path.join(root, 'A1.json'), JSON.stringify({ questions: [bank.questions[0]] }));
  fs.writeFileSync(path.join(root, 'A2.json'), JSON.stringify({ questions: [bank.questions[1]] }));

  const loaded = loadCandidateBankDirectory(root);
  assert.equal(loaded.language, 'es');
  assert.equal(loaded.bankVersion, 'candidate.es.1');
  assert.deepEqual(loaded.questions.map((question) => question.id), ['es-a1-001', 'es-a1-002']);
});

test('CLI generates a 240-row unreviewed packet for a real candidate language', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'language-review-cli-'));
  const output = path.join(root, 'es-review.json');
  const result = spawnSync(process.execPath, [
    path.join(__dirname, '..', 'scripts', 'language_test_external_review.mjs'),
    '--generate',
    'es',
    '--output',
    output,
  ], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  const packet = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.equal(packet.decisions.length, 240);
  assert.ok(packet.decisions.every((row) => row.status === 'unreviewed'));
});

test('CLI validates a complete packet and rejects an unreviewed packet', async () => {
  const { buildReviewWorkOrder, loadCandidateBankDirectory } = await modulePromise;
  const candidateDirectory = path.join(__dirname, '..', 'content', 'language-test-pilots', 'es', 'candidate-bank');
  const packet = buildReviewWorkOrder(loadCandidateBankDirectory(candidateDirectory));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'language-review-validate-'));
  const input = path.join(root, 'es-review.json');
  fs.writeFileSync(input, JSON.stringify(packet));
  const script = path.join(__dirname, '..', 'scripts', 'language_test_external_review.mjs');

  const blocked = spawnSync(process.execPath, [script, '--validate', 'es', '--input', input], { encoding: 'utf8' });
  assert.equal(blocked.status, 1);
  assert.match(blocked.stdout, /releaseReady=false/);

  packet.reviewer = {
    reviewerId: 'reviewer-es-01',
    reviewerEvidenceId: 'contract-or-directory-record-001',
    qualification: 'Qualified Spanish linguist; CEFR assessment experience',
    qualificationEvidenceId: 'credential-record-001',
    independentFromAuthoring: true,
    reviewedAt: '2026-08-03T12:00:00.000Z',
    attestation: 'I reviewed every item against the exact content hash.',
  };
  packet.decisions = packet.decisions.map((row) => ({
    ...row,
    status: 'approved',
    reviewEvidenceId: `evidence-${row.questionId}`,
    notes: 'Correct, natural, unambiguous, and level-appropriate.',
  }));
  fs.writeFileSync(input, JSON.stringify(packet));

  const passed = spawnSync(process.execPath, [script, '--validate', 'es', '--input', input], { encoding: 'utf8' });
  assert.equal(passed.status, 0, passed.stderr);
  assert.match(passed.stdout, /releaseReady=true/);
  assert.match(passed.stdout, /approved=240\/240/);
});

test('all four persisted handoff files cover the exact current candidate revisions', async () => {
  const { hashReviewableQuestion, loadCandidateBankDirectory } = await modulePromise;
  for (const language of ['es', 'de', 'it', 'fr']) {
    const candidateDirectory = path.join(__dirname, '..', 'content', 'language-test-pilots', language, 'candidate-bank');
    const bank = loadCandidateBankDirectory(candidateDirectory);
    const packetPath = path.join(
      __dirname,
      '..',
      'content',
      'language-test-pilots',
      'review-work-orders',
      `${language}.external-review.json`,
    );
    const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
    const expected = new Map(bank.questions.map((question) => [question.id, hashReviewableQuestion(question)]));

    assert.equal(packet.language, language);
    assert.equal(packet.bankVersion, bank.bankVersion);
    assert.equal(packet.decisions.length, 240);
    assert.equal(new Set(packet.decisions.map((row) => row.questionId)).size, 240);
    assert.ok(packet.decisions.every((row) => row.status === 'approved'));
    assert.ok(packet.decisions.every((row) => typeof row.reviewEvidenceId === 'string' && row.reviewEvidenceId.length > 0));
    assert.equal(packet.reviewer.independentFromAuthoring, true);
    assert.ok(packet.decisions.every((row) => expected.get(row.questionId) === row.contentHash));
    assert.ok(packet.decisions.every(
      (row) => row.question && hashReviewableQuestion(row.question) === row.contentHash,
    ));
  }
});
