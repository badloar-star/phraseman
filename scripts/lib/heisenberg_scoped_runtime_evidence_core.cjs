'use strict';

const reviewCore = require('./heisenberg_review_core.cjs');

const REQUIRED_RUNTIME_CHECKS = [
  'localeRegistered',
  'nonProductionSelectionVerified',
  'targetCopySelected',
  'russianFallbackAbsent',
  'studyTargetEnglishPreserved',
  'focusedTestsPassed',
];

function uniqueBy(rows, key) {
  const map = new Map();
  const duplicates = [];
  for (const row of rows) {
    const value = row?.[key];
    if (map.has(value)) duplicates.push(value);
    else map.set(value, row);
  }
  return { map, duplicates };
}

function buildScopedRuntimeEvidence(input) {
  const blockers = [];
  const locale = input.locale;
  const surface = input.surface;
  const scopeRows = (input.ledger?.rows || []).filter(
    (row) => row.sourceLocale === locale && row.surface === surface,
  );
  const candidates = (input.candidates || []).filter(
    (row) => row.targetLocale === locale && row.surface === surface && row.origin === 'existing-runtime',
  );
  const approved = (input.approvedRows || []).filter(
    (row) => row.targetLocale === locale && row.surface === surface && row.origin === 'existing-runtime',
  );
  const candidateIndex = uniqueBy(candidates, 'unitKey');
  const approvedIndex = uniqueBy(approved, 'unitKey');
  if (!scopeRows.length) blockers.push('scope-ledger-empty');
  if (scopeRows.some((row) => !row.targetPresent || !row.structurallyValid)) blockers.push('scope-not-structurally-complete');
  if (candidateIndex.duplicates.length) blockers.push('duplicate-review-candidate-unit');
  if (approvedIndex.duplicates.length) blockers.push('duplicate-approved-review-unit');
  if (candidates.length !== scopeRows.length) blockers.push('review-candidate-count-mismatch');
  if (approved.length !== candidates.length) blockers.push('approved-review-count-mismatch');
  if (input.reviewReport?.status !== 'APPROVED_EXISTING_RUNTIME_REVIEW') blockers.push('existing-review-report-not-approved');
  if (input.reviewReport?.activationApproved !== false) blockers.push('review-activation-boundary-invalid');
  for (const candidate of candidates) {
    if (!approvedIndex.map.has(candidate.unitKey)) blockers.push(`missing-approved-unit:${candidate.unitKey}`);
  }
  for (const row of approved) {
    const candidate = candidateIndex.map.get(row.unitKey);
    const candidateBinding = candidate ? reviewCore.buildReviewPacketRow(candidate) : null;
    const approvedBinding = reviewCore.buildReviewPacketRow(row);
    if (
      row.humanApproved !== true ||
      row.runtimeReviewApproved !== true ||
      row.reviewerImportAllowed !== false ||
      row.integrationApplyAllowed !== false ||
      row.activationApproved !== false
    ) blockers.push(`invalid-existing-review-flags:${row.unitKey}`);
    if (
      !candidateBinding ||
      row.bindingHash !== approvedBinding.bindingHash ||
      row.sourceHash !== approvedBinding.sourceHash ||
      row.targetHash !== approvedBinding.targetHash ||
      row.bindingHash !== candidateBinding.bindingHash ||
      row.sourceHash !== candidateBinding.sourceHash ||
      row.targetHash !== candidateBinding.targetHash
    ) blockers.push(`approved-review-binding-mismatch:${row.unitKey}`);
  }
  const runtimeChecks = input.runtimeChecks || {};
  for (const check of REQUIRED_RUNTIME_CHECKS) {
    if (runtimeChecks[check] !== true) blockers.push(`runtime-check-failed:${check}`);
  }
  if (runtimeChecks.activationPerformed !== false) blockers.push('production-activation-boundary-invalid');
  const scopedRuntimeReady = blockers.length === 0;
  return {
    schema: 'heisenberg-scoped-runtime-evidence-v1',
    generatedAt: new Date().toISOString(),
    studyTarget: 'en',
    sourceLocale: locale,
    surface,
    status: scopedRuntimeReady ? 'SCOPED_RUNTIME_VERIFIED_NO_ACTIVATION' : 'HOLD',
    scopedRuntimeReady,
    productionReleaseReady: false,
    activationApproved: false,
    summary: {
      ledgerUnits: scopeRows.length,
      structurallyPresentUnits: scopeRows.filter((row) => row.targetPresent && row.structurallyValid).length,
      reviewCandidates: candidates.length,
      approvedReviewUnits: approved.length,
      runtimeChecksPassed: REQUIRED_RUNTIME_CHECKS.filter((check) => runtimeChecks[check] === true).length,
      runtimeChecksRequired: REQUIRED_RUNTIME_CHECKS.length,
      blockers: blockers.length,
    },
    blockers: [...new Set(blockers)],
    runtimeChecks,
  };
}

module.exports = { REQUIRED_RUNTIME_CHECKS, buildScopedRuntimeEvidence };
