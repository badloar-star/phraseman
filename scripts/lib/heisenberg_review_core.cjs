'use strict';

const crypto = require('node:crypto');

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');
}

function bindingFields(row) {
  return {
    candidateSchema: row.candidateSchema || row.schema || 'heisenberg-filled-row-v1',
    candidateRowId: row.candidateRowId || row.id,
    id: row.id,
    origin: row.origin || 'translation-candidate',
    status: row.status,
    integrated: row.integrated === true,
    file: row.file,
    keyPath: row.keyPath,
    targetItemId: row.targetItemId || null,
    targetItemKeyPath: row.targetItemKeyPath || row.keyPath,
    sourceLocale: row.sourceLocale,
    targetLocale: row.targetLocale,
    sourceText: row.sourceText,
    sourceTexts: row.sourceTexts || { [row.sourceLocale]: row.sourceText },
    targetText: row.targetText,
  };
}

function buildReviewPacketRow(row) {
  const fields = bindingFields(row);
  return {
    ...fields,
    sourceHash: sha256({
      file: fields.file,
      keyPath: fields.keyPath,
      sourceLocale: fields.sourceLocale,
      sourceText: fields.sourceText,
      sourceTexts: fields.sourceTexts,
    }),
    targetHash: sha256({ targetLocale: fields.targetLocale, targetText: fields.targetText }),
    bindingHash: sha256(fields),
    machineStatus: row.status,
    machineGenerated: row.machineGenerated !== false,
    reviewDecision: null,
  };
}

function validateDecision(decision) {
  const errors = [];
  if (!decision || !decision.id) errors.push('missing-id');
  if (!['APPROVE', 'HOLD'].includes(decision?.verdict)) errors.push('invalid-verdict');
  if (!String(decision?.reviewerId || '').trim()) errors.push('missing-reviewerId');
  if (!String(decision?.reviewedAt || '').trim() || Number.isNaN(Date.parse(decision.reviewedAt))) errors.push('invalid-reviewedAt');
  if (!String(decision?.note || '').trim()) errors.push('missing-note');
  if (!String(decision?.bindingHash || '').trim()) errors.push('missing-bindingHash');
  return errors;
}

function finalizeReview(candidateRows, packetRows, decisions) {
  const problems = [];
  const approved = [];
  const held = [];
  const candidateById = new Map();
  const packetById = new Map();
  const decisionById = new Map();

  for (const row of candidateRows) {
    if (candidateById.has(row.id)) problems.push({ id: row.id, code: 'duplicate-candidate-id' });
    else candidateById.set(row.id, row);
  }
  for (const row of packetRows) {
    if (packetById.has(row.id)) problems.push({ id: row.id, code: 'duplicate-packet-id' });
    else packetById.set(row.id, row);
  }
  for (const decision of decisions) {
    if (decisionById.has(decision.id)) problems.push({ id: decision.id, code: 'duplicate-decision-id' });
    else decisionById.set(decision.id, decision);
  }

  for (const [id, decision] of decisionById) {
    const errors = validateDecision(decision);
    if (errors.length) {
      problems.push(...errors.map((code) => ({ id, code })));
      continue;
    }
    const candidate = candidateById.get(id);
    const packet = packetById.get(id);
    if (!candidate || !packet) {
      problems.push({ id, code: !candidate ? 'unknown-candidate-id' : 'unknown-packet-id' });
      continue;
    }
    const existingRuntime = candidate.origin === 'existing-runtime';
    const eligible = candidate.status === 'GO' || (
      existingRuntime && candidate.status === 'EXISTING_NEEDS_REVIEW' && candidate.integrated === true
    );
    if (!eligible) {
      problems.push({ id, code: 'candidate-not-review-eligible' });
      continue;
    }
    const recomputed = buildReviewPacketRow(candidate);
    const packetContent = buildReviewPacketRow(packet);
    if (
      packet.bindingHash !== packetContent.bindingHash ||
      packet.sourceHash !== packetContent.sourceHash ||
      packet.targetHash !== packetContent.targetHash ||
      packet.bindingHash !== recomputed.bindingHash ||
      packet.sourceHash !== recomputed.sourceHash ||
      packet.targetHash !== recomputed.targetHash
    ) {
      problems.push({ id, code: 'packet-binding-mismatch' });
      continue;
    }
    if (decision.bindingHash !== recomputed.bindingHash) {
      problems.push({ id, code: 'decision-binding-mismatch' });
      continue;
    }
    const reviewed = {
      ...candidate,
      sourceHash: recomputed.sourceHash,
      targetHash: recomputed.targetHash,
      bindingHash: recomputed.bindingHash,
      humanApproved: decision.verdict === 'APPROVE',
      runtimeReviewApproved: existingRuntime && decision.verdict === 'APPROVE',
      reviewerImportAllowed: !existingRuntime && decision.verdict === 'APPROVE',
      integrationApplyAllowed: !existingRuntime && decision.verdict === 'APPROVE',
      productionApplyAllowed: false,
      activationApproved: false,
      review: {
        verdict: decision.verdict,
        reviewerId: decision.reviewerId,
        reviewedAt: decision.reviewedAt,
        note: decision.note,
      },
    };
    (decision.verdict === 'APPROVE' ? approved : held).push(reviewed);
  }

  for (const id of candidateById.keys()) {
    if (!decisionById.has(id)) problems.push({ id, code: 'missing-decision' });
  }
  const failClosed = held.length > 0 || problems.length > 0;
  return {
    approved: failClosed ? [] : approved,
    quarantinedApproved: failClosed ? approved : [],
    held,
    problems,
  };
}

function isApplyApproved(row) {
  return Boolean(
    row?.status === 'GO' &&
    row.humanApproved === true &&
    row.reviewerImportAllowed === true &&
    row.integrationApplyAllowed === true &&
    row.activationApproved === false &&
    row.sourceHash && row.targetHash && row.bindingHash &&
    row.review?.verdict === 'APPROVE' &&
    row.review?.reviewerId && row.review?.reviewedAt && row.review?.note,
  );
}

module.exports = { bindingFields, buildReviewPacketRow, finalizeReview, isApplyApproved, sha256 };
