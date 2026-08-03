import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function hashReviewableQuestion(question) {
  return createHash('sha256').update(JSON.stringify(canonicalize(question)), 'utf8').digest('hex');
}

export function buildReviewWorkOrder(bank) {
  return {
    schemaVersion: 'language-test-external-review-v1',
    language: bank.language,
    bankVersion: bank.bankVersion,
    reviewer: {
      reviewerId: '',
      reviewerEvidenceId: '',
      qualification: '',
      qualificationEvidenceId: '',
      independentFromAuthoring: false,
      reviewedAt: '',
      attestation: '',
    },
    decisions: bank.questions.map((question) => ({
      questionId: question.id,
      level: question.level,
      contentHash: hashReviewableQuestion(question),
      question: structuredClone(question),
      status: 'unreviewed',
      reviewEvidenceId: '',
      notes: '',
    })),
  };
}

export function loadCandidateBankDirectory(directory) {
  const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
  const questions = [];
  for (const level of manifest.authoredLevels ?? []) {
    const levelBank = JSON.parse(readFileSync(join(directory, `${level}.json`), 'utf8'));
    questions.push(...levelBank.questions);
  }
  return {
    language: manifest.language,
    bankVersion: manifest.bankVersion,
    questions,
  };
}

export function validateFilledReview(packet, bank) {
  const blockers = [];
  const expected = new Map(bank.questions.map((question) => [question.id, question]));

  if (packet?.schemaVersion !== 'language-test-external-review-v1') {
    blockers.push('schemaVersion must be language-test-external-review-v1');
  }
  if (packet?.language !== bank.language) blockers.push('language does not match the candidate bank');
  if (packet?.bankVersion !== bank.bankVersion) blockers.push('bankVersion does not match the candidate bank');

  for (const field of [
    'reviewerId',
    'reviewerEvidenceId',
    'qualification',
    'qualificationEvidenceId',
    'reviewedAt',
    'attestation',
  ]) {
    if (!hasText(packet?.reviewer?.[field])) blockers.push(`reviewer.${field} is required`);
  }
  if (packet?.reviewer?.independentFromAuthoring !== true) {
    blockers.push('reviewer.independentFromAuthoring must be true');
  }
  if (hasText(packet?.reviewer?.reviewedAt) && Number.isNaN(Date.parse(packet.reviewer.reviewedAt))) {
    blockers.push('reviewer.reviewedAt must be an ISO-compatible date');
  }

  const rows = Array.isArray(packet?.decisions) ? packet.decisions : [];
  if (!Array.isArray(packet?.decisions)) blockers.push('decisions must be an array');
  const byId = new Map();
  const evidenceIds = new Set();
  for (const row of rows) {
    if (!hasText(row?.questionId)) {
      blockers.push('decision questionId is required');
      continue;
    }
    const existing = byId.get(row.questionId) ?? [];
    existing.push(row);
    byId.set(row.questionId, existing);
    if (!expected.has(row.questionId)) blockers.push(`unknown decision ${row.questionId}`);
    if (row.status !== 'approved') blockers.push(`decision ${row.questionId} status is ${String(row.status)}`);
    if (!hasText(row.reviewEvidenceId)) {
      blockers.push(`decision ${row.questionId} reviewEvidenceId is required`);
    } else if (evidenceIds.has(row.reviewEvidenceId)) {
      blockers.push(`duplicate reviewEvidenceId ${row.reviewEvidenceId}`);
    } else {
      evidenceIds.add(row.reviewEvidenceId);
    }
    if (!hasText(row.notes)) blockers.push(`decision ${row.questionId} notes are required`);
  }

  let approved = 0;
  for (const [questionId, question] of expected) {
    const matching = byId.get(questionId) ?? [];
    if (matching.length === 0) {
      blockers.push(`missing decision ${questionId}`);
      continue;
    }
    if (matching.length > 1) blockers.push(`duplicate decision ${questionId}`);
    const expectedHash = hashReviewableQuestion(question);
    if (matching.some((row) => row.contentHash !== expectedHash)) {
      blockers.push(`contentHash mismatch ${questionId}`);
    }
    if (matching.some((row) => !row.question || hashReviewableQuestion(row.question) !== expectedHash)) {
      blockers.push(`question snapshot mismatch ${questionId}`);
    }
    if (
      matching.length === 1
      && matching[0].contentHash === expectedHash
      && matching[0].question
      && hashReviewableQuestion(matching[0].question) === expectedHash
      && matching[0].status === 'approved'
      && hasText(matching[0].reviewEvidenceId)
      && hasText(matching[0].notes)
    ) {
      approved += 1;
    }
  }

  return {
    releaseReady: blockers.length === 0 && approved === expected.size,
    blockers,
    approved,
    total: expected.size,
  };
}
