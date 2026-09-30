import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateDailyPhraseQuizContent } from './daily_phrase_quiz_content_gate.mjs';
import { evaluateDailyPhraseSourceLinks } from './daily_phrase_source_link_gate.mjs';
import { evaluateDailyPhraseBatchStyle } from './daily_phrase_style_gate.mjs';
import { evaluateDailyPhraseEnglishBaseline } from './daily_phrase_english_baseline.mjs';
import {
  dailyPhrasePacketRowMatchesBank,
  missingDailyPhrasePacketRowFields,
  unsupportedDailyPhrasePacketRowFields,
} from './daily_phrase_authoring_packet_contract.mjs';
import {
  assertDailyPhraseAuthoringPacketPath,
  assertDailyPhraseAuthorityPaths,
  collectDailyPhraseManifestArtifactPaths,
  isDailyPhraseManifestTarget,
} from './daily_phrase_manifest_paths.mjs';
import { exactDailyPhraseRowId } from './daily_phrase_row_selection.mjs';
import { validateTargetDailyPhraseSubset } from './validate_target_daily_phrase_bank.mjs';
import { isStrictUtcInstant } from './daily_phrase_time.mjs';

export { isStrictUtcInstant } from './daily_phrase_time.mjs';

export const DAILY_PHRASE_PRIOR_ACCEPTED_MANIFEST_VERSION = 'daily-phrase-prior-accepted-manifest-v1';

const REQUIRED_AUTHORITY_ARTIFACTS = Object.freeze([
  'bank',
  'sourceEvidence',
  'sourceLinkage',
  'englishBaseline',
  'styleContract',
]);
const REQUIRED_GATES = Object.freeze(['sourceLink', 'style', 'quiz', 'structural']);

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function exactNonblankString(value) {
  return typeof value === 'string' && value.length > 0 && value.trim() === value
    ? value
    : '';
}

function sha256Bytes(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value ?? ''), 'utf8');
  return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function expectedHash(value) {
  return typeof value === 'string' && /^[A-F0-9]{64}$/u.test(value) ? value : '';
}

function exactRowIdArray(value) {
  if (!Array.isArray(value)) return { ids: [], valid: false };
  const ids = [];
  let valid = true;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) {
      valid = false;
      ids.push('');
      continue;
    }
    const rowId = exactDailyPhraseRowId(value[index]);
    if (!rowId) valid = false;
    ids.push(rowId ?? '');
  }
  return { ids, valid };
}

function parseArtifactJson(artifacts, artifactPath, issueCode, issues) {
  const bytes = artifacts?.[artifactPath];
  if (bytes === undefined) {
    issues.push(`${issueCode}.missing_bytes`);
    return null;
  }
  try {
    return JSON.parse(Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes));
  } catch {
    issues.push(`${issueCode}.invalid_json`);
    return null;
  }
}

function sameArray(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(left, index)
      || !Object.prototype.hasOwnProperty.call(right, index)
      || left[index] !== right[index]) return false;
  }
  return true;
}

export function evaluateDailyPhrasePriorAcceptedManifest({ manifest, artifacts }) {
  const issues = [];
  const studyTarget = typeof manifest?.studyTarget === 'string' ? manifest.studyTarget : '';
  const acceptedRowIdInput = exactRowIdArray(manifest?.acceptedRowIds);
  const acceptedRowIds = acceptedRowIdInput.ids;
  if (!acceptedRowIdInput.valid) issues.push('manifest.invalid_accepted_row_ids');

  if (manifest?.schemaVersion !== DAILY_PHRASE_PRIOR_ACCEPTED_MANIFEST_VERSION) {
    issues.push('manifest.invalid_schema_version');
  }
  if (!isDailyPhraseManifestTarget(studyTarget)
    || manifest?.sourceLocale !== 'ru'
    || manifest?.surface !== 'daily_phrase') {
    issues.push('manifest.invalid_scope');
  }
  if (isDailyPhraseManifestTarget(studyTarget)) {
    try {
      assertDailyPhraseAuthorityPaths(
        Object.fromEntries(REQUIRED_AUTHORITY_ARTIFACTS.map(
          (key) => [key, manifest?.authorityArtifacts?.[key]?.path],
        )),
        studyTarget,
      );
    } catch {
      issues.push('manifest.noncanonical_authority_paths');
    }
  }
  if (manifest?.editorialStatus !== 'EDITORIAL_CONTINUITY_ACCEPTED') {
    issues.push('manifest.editorial_acceptance_required');
  }
  if (manifest?.releaseTrusted !== false) issues.push('manifest.release_trust_must_remain_false');
  if (manifest?.activationApproved !== false) issues.push('manifest.activation_must_remain_closed');
  if (!Number.isInteger(manifest?.acceptedCount) || manifest.acceptedCount < 1
    || manifest.acceptedCount !== acceptedRowIds.length) {
    issues.push('manifest.accepted_count_mismatch');
  }

  const artifactRecords = manifest?.authorityArtifacts ?? {};
  for (const key of REQUIRED_AUTHORITY_ARTIFACTS) {
    const record = artifactRecords[key];
    const artifactPath = exactNonblankString(record?.path);
    if (!artifactPath || artifacts?.[artifactPath] === undefined) {
      issues.push(`artifact.${key}.missing`);
      continue;
    }
    if (sha256Bytes(artifacts[artifactPath]) !== expectedHash(record?.sha256)) {
      issues.push(`artifact.${key}.sha256_mismatch`);
    }
  }

  const bankPath = exactNonblankString(artifactRecords?.bank?.path);
  const bank = bankPath ? parseArtifactJson(artifacts, bankPath, 'artifact.bank', issues) : null;
  const bankRows = Array.isArray(bank?.rows) ? bank.rows : [];
  const sourceEvidencePath = exactNonblankString(artifactRecords?.sourceEvidence?.path);
  const sourceLinkagePath = exactNonblankString(artifactRecords?.sourceLinkage?.path);
  const englishBaselinePath = exactNonblankString(artifactRecords?.englishBaseline?.path);
  const sourceEvidence = sourceEvidencePath
    ? parseArtifactJson(artifacts, sourceEvidencePath, 'artifact.sourceEvidence', issues)
    : null;
  const sourceLinkage = sourceLinkagePath
    ? parseArtifactJson(artifacts, sourceLinkagePath, 'artifact.sourceLinkage', issues)
    : null;
  const englishRows = englishBaselinePath
    ? parseArtifactJson(artifacts, englishBaselinePath, 'artifact.englishBaseline', issues)
    : null;
  const englishBaseline = evaluateDailyPhraseEnglishBaseline(
    englishRows,
    { requireCanonical: true },
  );
  for (const finding of englishBaseline.issues) {
    const suffix = finding.code.replace(/^english_baseline\./u, '');
    issues.push(`artifact.englishBaseline.${suffix}`);
  }
  const expectedSourceEvidenceSchema = studyTarget === 'es'
    ? 'daily-phrase-cvc-source-ledger-v1'
    : 'daily-phrase-authoritative-source-ledger-v1';
  if (sourceEvidence && (sourceEvidence.schemaVersion !== expectedSourceEvidenceSchema
    || sourceEvidence.studyTarget !== studyTarget)) {
    issues.push('source_evidence.invalid_scope');
  }
  if (sourceLinkage && (sourceLinkage.schemaVersion !== 'daily-phrase-source-linkage-v2'
    || sourceLinkage.studyTarget !== studyTarget
    || sourceLinkage.sourceLocale !== 'ru'
    || sourceLinkage.surface !== 'daily_phrase')) {
    issues.push('source_linkage.invalid_scope');
  }
  const expectedSourceEvidenceFileName = sourceEvidencePath
    ? path.posix.basename(sourceEvidencePath.replaceAll('\\', '/'))
    : '';
  if (sourceLinkage && (!sourceLinkage.authoritativeLedger
    || sourceLinkage.authoritativeLedger.path !== expectedSourceEvidenceFileName
    || sourceLinkage.authoritativeLedger.schemaVersion !== expectedSourceEvidenceSchema)) {
    issues.push('source_linkage.invalid_authority_binding');
  }
  if (bank && (bank.studyTarget !== studyTarget
    || bank.sourceLocale !== 'ru'
    || bank.surface !== 'daily_phrase')) {
    issues.push('bank.invalid_scope');
  }
  if (bank && bank.activationApproved !== false) issues.push('bank.activation_must_remain_closed');

  const canonicalPrefix = bankRows.slice(0, acceptedRowIds.length)
    .map((row) => exactDailyPhraseRowId(row?.id) ?? '');
  if (!sameArray(acceptedRowIds, canonicalPrefix)
    || manifest?.acceptedThrough !== acceptedRowIds.at(-1)
    || new Set(acceptedRowIds).size !== acceptedRowIds.length) {
    issues.push('manifest.accepted_rows_must_be_canonical_prefix');
  }
  if (acceptedRowIds.some((rowId) => !rowId.startsWith(`${studyTarget}-`))) {
    issues.push('manifest.accepted_row_target_mismatch');
  }

  const acceptedRows = Array.isArray(manifest?.acceptedRows) ? manifest.acceptedRows : [];
  let acceptedRowsValid = Array.isArray(manifest?.acceptedRows);
  const acceptedHashById = new Map();
  for (let index = 0; index < acceptedRows.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(acceptedRows, index)) {
      acceptedRowsValid = false;
      continue;
    }
    const row = acceptedRows[index];
    const rowId = exactDailyPhraseRowId(row?.id);
    const rowHash = expectedHash(row?.rowSha256);
    if (!rowId || !rowHash || acceptedHashById.has(rowId)) acceptedRowsValid = false;
    if (rowId) acceptedHashById.set(rowId, rowHash);
  }
  if (!acceptedRowsValid || acceptedRows.length !== acceptedRowIds.length
    || acceptedHashById.size !== acceptedRowIds.length) {
    issues.push('manifest.accepted_row_hash_inventory_mismatch');
  }
  for (const rowId of acceptedRowIds) {
    const row = bankRows.find((candidate) => candidate?.id === rowId);
    if (!row) {
      issues.push(`row:${rowId}.missing_from_bank`);
      continue;
    }
    if (row.active !== false || row.activationApproved !== false
      || row.candidateStatus !== 'CANDIDATE_PENDING_INDEPENDENT_REVIEW') {
      issues.push(`row:${rowId}.closed_candidate_status_required`);
    }
    if (sha256Bytes(JSON.stringify(row)) !== acceptedHashById.get(rowId)) {
      issues.push(`row:${rowId}.sha256_mismatch`);
    }
  }

  const packetCoverage = [];
  const packets = Array.isArray(manifest?.authoringPackets) ? manifest.authoringPackets : [];
  for (const [index, packetRecord] of packets.entries()) {
    const packetPath = exactNonblankString(packetRecord?.path);
    const prefix = `packet:${index}`;
    const declaredRowIdInput = exactRowIdArray(packetRecord?.rowIds);
    const declaredRowIds = declaredRowIdInput.ids;
    if (!declaredRowIdInput.valid) issues.push(`${prefix}.invalid_row_ids`);
    try {
      assertDailyPhraseAuthoringPacketPath(packetPath, studyTarget, declaredRowIds);
    } catch {
      issues.push(`${prefix}.noncanonical_path`);
    }
    if (!packetPath || artifacts?.[packetPath] === undefined) {
      issues.push(`${prefix}.missing`);
      continue;
    }
    if (sha256Bytes(artifacts[packetPath]) !== expectedHash(packetRecord?.sha256)) {
      issues.push(`${prefix}.sha256_mismatch`);
    }
    const packet = parseArtifactJson(artifacts, packetPath, prefix, issues);
    const packetRows = Array.isArray(packet?.rows) ? packet.rows : [];
    const packetRowIdInput = exactRowIdArray(packetRows.map((row) => row?.id));
    const packetRowIds = packetRowIdInput.ids;
    if (packet?.schemaVersion !== 'daily-phrase-authoring-packet-v1'
      || packet?.studyTarget !== studyTarget
      || packet?.sourceLocale !== 'ru'
      || packet?.status !== 'DRAFT_REQUIRES_INDEPENDENT_REVIEW'
      || !packetRowIdInput.valid
      || !sameArray(declaredRowIds, packetRowIds)) {
      issues.push(`${prefix}.invalid_authoring_packet`);
    }
    const bankRowsById = new Map(bankRows.map((row) => [exactDailyPhraseRowId(row?.id) ?? '', row]));
    for (const packetRow of packetRows) {
      const rowId = exactDailyPhraseRowId(packetRow?.id) ?? '__invalid__';
      const bankRow = bankRowsById.get(rowId);
      if (missingDailyPhrasePacketRowFields(packetRow).length > 0) {
        issues.push(`${prefix}.row:${rowId}.missing_required_fields`);
      }
      if (unsupportedDailyPhrasePacketRowFields(packetRow).length > 0) {
        issues.push(`${prefix}.row:${rowId}.unsupported_fields`);
      }
      if (!dailyPhrasePacketRowMatchesBank(packetRow, bankRow)
        || Object.keys(packetRow).some(
          (key) => JSON.stringify(packetRow[key]) !== JSON.stringify(bankRow?.[key]),
        )) {
        issues.push(`${prefix}.row:${rowId}.bank_mismatch`);
      }
    }

    const canonicalPacketRows = declaredRowIds.map((rowId) => bankRowsById.get(rowId)).filter(Boolean);
    if (canonicalPacketRows.length === declaredRowIds.length && declaredRowIds.length > 0) {
      const sourceResult = evaluateDailyPhraseSourceLinks({
        bank,
        ledger: sourceEvidence,
        linkage: sourceLinkage,
        ledgerFileName: expectedSourceEvidenceFileName,
      }, declaredRowIds);
      for (const finding of sourceResult.issues) {
        issues.push(`${prefix}.source_hold:${finding.code}`);
      }

      const styleResult = evaluateDailyPhraseBatchStyle(canonicalPacketRows);
      for (const finding of styleResult.issues) {
        issues.push(`${prefix}.style_hold:${finding.code}`);
      }

      const quizResult = evaluateDailyPhraseQuizContent(canonicalPacketRows, {
        targetRows: bankRows,
        englishRows: englishBaseline.rows,
      });
      for (const finding of quizResult.issues) {
        issues.push(`${prefix}.quiz_hold:${finding.code}`);
      }

      const structuralResult = validateTargetDailyPhraseSubset(bank, declaredRowIds);
      for (const error of structuralResult.errors) {
        issues.push(`${prefix}.structural_hold:${error}`);
      }
    }
    packetCoverage.push(...declaredRowIds);
  }
  if (!sameArray(packetCoverage, acceptedRowIds)) issues.push('manifest.packet_coverage_mismatch');

  const acceptedCanonicalRows = acceptedRowIds
    .map((rowId) => bankRows.find((row) => row?.id === rowId))
    .filter(Boolean);
  if (acceptedCanonicalRows.length === acceptedRowIds.length && acceptedRowIds.length > 0) {
    const aggregateStyle = evaluateDailyPhraseBatchStyle(acceptedCanonicalRows);
    for (const finding of aggregateStyle.issues) {
      issues.push(`aggregate.style_hold:${finding.code}`);
    }

    const aggregateQuiz = evaluateDailyPhraseQuizContent(acceptedCanonicalRows, {
      targetRows: bankRows,
      englishRows: englishBaseline.rows,
      enforceRepeatedLongestAcrossAll: true,
    });
    for (const finding of aggregateQuiz.issues) {
      issues.push(`aggregate.quiz_hold:${finding.code}`);
    }

    const aggregateStructural = validateTargetDailyPhraseSubset(bank, acceptedRowIds);
    for (const error of aggregateStructural.errors) {
      issues.push(`aggregate.structural_hold:${error}`);
    }
  }

  for (const gate of REQUIRED_GATES) {
    if (manifest?.deterministicGates?.[gate] !== 'PASS') issues.push(`gate.${gate}.pass_required`);
  }

  const review = manifest?.independentEditorialReview;
  if (review?.verdict !== 'ACCEPT'
    || review?.reviewerIndependence !== true
    || !text(review?.reviewerIdentity)
    || !isStrictUtcInstant(review?.reviewedAt)
    || !Array.isArray(review?.findings)
    || review.findings.length !== 0) {
    issues.push('review.independent_accept_required');
  }
  if (review?.releaseTrusted !== false) issues.push('review.release_trust_must_remain_false');
  if (!text(manifest?.releaseBoundary)) issues.push('manifest.release_boundary_required');

  return {
    contractVersion: DAILY_PHRASE_PRIOR_ACCEPTED_MANIFEST_VERSION,
    verdict: issues.length ? 'HOLD' : 'PASS',
    acceptedCount: acceptedRowIds.length,
    issues,
  };
}

function readArtifact(filePath) {
  return fs.readFileSync(path.resolve(process.cwd(), filePath));
}

function runCli() {
  const manifestPath = process.argv[2];
  if (!manifestPath) {
    console.error('Usage: node scripts/daily_phrase_prior_accepted_manifest_gate.mjs <manifest.json>');
    process.exitCode = 1;
    return;
  }
  const manifest = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), manifestPath), 'utf8'));
  let paths;
  try {
    paths = collectDailyPhraseManifestArtifactPaths(manifest);
  } catch (error) {
    console.log(JSON.stringify({
      contractVersion: DAILY_PHRASE_PRIOR_ACCEPTED_MANIFEST_VERSION,
      verdict: 'HOLD',
      acceptedCount: Array.isArray(manifest?.acceptedRowIds) ? manifest.acceptedRowIds.length : 0,
      issues: [`manifest.unsafe_artifact_path:${error instanceof Error ? error.message : String(error)}`],
    }, null, 2));
    process.exitCode = 1;
    return;
  }
  const artifacts = Object.fromEntries(paths.map((artifactPath) => [artifactPath, readArtifact(artifactPath)]));
  const result = evaluateDailyPhrasePriorAcceptedManifest({ manifest, artifacts });
  console.log(JSON.stringify(result, null, 2));
  if (result.verdict !== 'PASS') process.exitCode = 1;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) runCli();
