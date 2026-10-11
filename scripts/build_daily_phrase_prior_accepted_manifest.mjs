import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertDailyPhraseAuthoringPacketPath,
  assertDailyPhraseAuthorityPaths,
  defaultDailyPhrasePriorAcceptedPaths,
  isDailyPhraseManifestTarget,
} from './daily_phrase_manifest_paths.mjs';
import {
  evaluateDailyPhrasePriorAcceptedManifest,
  isStrictUtcInstant,
} from './daily_phrase_prior_accepted_manifest_gate.mjs';

export { defaultDailyPhrasePriorAcceptedPaths } from './daily_phrase_manifest_paths.mjs';

function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value ?? ''), 'utf8');
  return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function parseJson(bytes, label) {
  try {
    return JSON.parse(Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes));
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
}

function reviewFindingsAreEmpty(findings) {
  if (Array.isArray(findings)) return findings.length === 0;
  return findings && typeof findings === 'object'
    && Object.values(findings).every((items) => Array.isArray(items) && items.length === 0);
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isSha256(value) {
  return typeof value === 'string' && /^[A-F0-9]{64}$/iu.test(value);
}

function exactText(value) {
  return typeof value === 'string' && value.trim() === value && value.length > 0 ? value : '';
}

function gateStatus(review, name) {
  const value = review?.deterministicGates?.[name];
  return typeof value === 'string' ? value : value?.status;
}

function assertIndependentReview(review, studyTarget) {
  if (review?.schemaVersion !== 'daily-phrase-independent-editorial-review-v1') {
    throw new Error('Exact independent editorial review schema is required');
  }
  if (review?.studyTarget !== studyTarget) {
    throw new Error(`Independent review studyTarget must equal ${studyTarget}`);
  }
  if (review?.verdict !== 'ACCEPT'
    || review?.acceptedCount < 1
    || !reviewFindingsAreEmpty(review?.findings)
    || review?.reviewerIndependence !== true
    || !exactText(review?.reviewerIdentity)
    || !isStrictUtcInstant(review?.reviewedAt)) {
    throw new Error('A fresh independent ACCEPT review with no findings is required');
  }
  if (review?.releaseTrusted !== false) {
    throw new Error('Editorial continuity review must remain non-release-trusted');
  }
  const gates = review?.deterministicGates;
  const structuralStatus = isPlainObject(gates)
    && Object.prototype.hasOwnProperty.call(gates, 'structural')
    ? gateStatus(review, 'structural')
    : gateStatus(review, 'subsetStructural');
  const statuses = {
    sourceLink: gateStatus(review, 'sourceLink'),
    style: gateStatus(review, 'style'),
    quiz: gateStatus(review, 'quiz'),
    structural: structuralStatus,
  };
  if (statuses.sourceLink !== 'PASS' || statuses.style !== 'PASS' || statuses.quiz !== 'PASS'
    || !['PASS', 'STRUCTURAL_PASS'].includes(statuses.structural)) {
    throw new Error('All four deterministic gates must pass before continuity acceptance');
  }
  return { sourceLink: 'PASS', style: 'PASS', quiz: 'PASS', structural: 'PASS' };
}

function assertReportedHashes(review, computed) {
  const reported = review?.hashesSha256;
  if (!isPlainObject(reported) || !isPlainObject(reported.authoringPackets)) {
    throw new Error('Independent review hash inventory is required');
  }
  const comparisons = [
    [reported.sourceBank, computed.bank],
    [reported.sourceEvidence, computed.sourceEvidence],
    [reported.sourceLedger, computed.sourceLinkage],
    [reported.englishBaseline, computed.englishBaseline],
    [reported.styleContract, computed.styleContract],
  ];
  if (comparisons.some(([left, right]) => !isSha256(left) || left.toUpperCase() !== right)) {
    throw new Error('Independent review hashes do not match the current authority artifacts');
  }
  for (const packet of computed.packets) {
    const label = path.basename(packet.path, '.json');
    const reportedPacketHash = reported.authoringPackets[label];
    if (!isSha256(reportedPacketHash) || reportedPacketHash.toUpperCase() !== packet.sha256) {
      throw new Error(`Independent review hash does not match ${packet.path}`);
    }
  }
}

export function buildDailyPhrasePriorAcceptedManifest({
  artifacts,
  paths,
  review,
  studyTarget,
}) {
  if (!isDailyPhraseManifestTarget(studyTarget)) {
    throw new Error(`Unsupported Daily Phrase studyTarget: ${studyTarget}`);
  }
  assertDailyPhraseAuthorityPaths(paths, studyTarget);
  const deterministicGates = assertIndependentReview(review, studyTarget);
  const requiredPaths = ['bank', 'sourceEvidence', 'sourceLinkage', 'englishBaseline', 'styleContract'];
  for (const key of requiredPaths) {
    if (!paths?.[key] || artifacts?.[paths[key]] === undefined) {
      throw new Error(`Missing ${key} authority artifact`);
    }
  }

  const bank = parseJson(artifacts[paths.bank], `${studyTarget} candidate bank`);
  if (bank?.studyTarget !== studyTarget) {
    throw new Error(`Requested studyTarget does not match candidate bank: ${studyTarget}`);
  }
  if (bank?.sourceLocale !== 'ru' || bank?.surface !== 'daily_phrase' || bank?.activationApproved !== false) {
    throw new Error('Candidate bank must remain a closed ru-source Daily Phrase bank');
  }
  const acceptedRows = Array.isArray(bank?.rows) ? bank.rows.slice(0, review.acceptedCount) : [];
  if (acceptedRows.length !== review.acceptedCount) throw new Error('Review acceptedCount exceeds the candidate bank');
  const acceptedRowIds = acceptedRows.map((row) => exactText(row?.id));
  if (acceptedRowIds.some((rowId) => !rowId || !rowId.startsWith(`${studyTarget}-`))) {
    throw new Error('Accepted row ids must match the requested studyTarget');
  }

  const packetPaths = Array.isArray(review?.authoringPacketPaths) ? review.authoringPacketPaths : [];
  const packetRecords = packetPaths.map((packetPath) => {
    assertDailyPhraseAuthoringPacketPath(packetPath, studyTarget);
    const bytes = artifacts?.[packetPath];
    if (bytes === undefined) throw new Error(`Missing authoring packet ${packetPath}`);
    const packet = parseJson(bytes, packetPath);
    if (packet?.studyTarget !== studyTarget) {
      throw new Error(`Authoring packet studyTarget does not match ${studyTarget}: ${packetPath}`);
    }
    const rowIds = Array.isArray(packet?.rows)
      ? packet.rows.map((row) => exactText(row?.id))
      : [];
    assertDailyPhraseAuthoringPacketPath(packetPath, studyTarget, rowIds);
    return {
      path: packetPath,
      sha256: sha256(bytes),
      rowIds,
    };
  });
  const packetCoverage = packetRecords.flatMap((packet) => packet.rowIds);
  if (packetCoverage.length !== acceptedRowIds.length
    || packetCoverage.some((rowId, index) => rowId !== acceptedRowIds[index])) {
    throw new Error('Authoring packets must cover the accepted canonical prefix exactly once and in order');
  }

  const authorityArtifacts = Object.fromEntries(requiredPaths.map((key) => [key, {
    path: paths[key],
    sha256: sha256(artifacts[paths[key]]),
  }]));
  assertReportedHashes(review, {
    ...Object.fromEntries(requiredPaths.map((key) => [key, authorityArtifacts[key].sha256])),
    packets: packetRecords,
  });

  const manifest = {
    schemaVersion: 'daily-phrase-prior-accepted-manifest-v1',
    studyTarget,
    sourceLocale: 'ru',
    surface: 'daily_phrase',
    editorialStatus: 'EDITORIAL_CONTINUITY_ACCEPTED',
    releaseTrusted: false,
    activationApproved: false,
    acceptedCount: acceptedRowIds.length,
    acceptedThrough: acceptedRowIds.at(-1),
    acceptedRowIds,
    acceptedRows: acceptedRows.map((row) => ({ id: row.id, rowSha256: sha256(JSON.stringify(row)) })),
    authorityArtifacts,
    authoringPackets: packetRecords,
    deterministicGates,
    independentEditorialReview: {
      verdict: review.verdict,
      findings: [],
      reviewedAt: review.reviewedAt,
      reviewerIndependence: true,
      reviewerIdentity: review.reviewerIdentity,
      releaseTrusted: false,
    },
    releaseBoundary: 'Editorial continuity only; not a trusted release receipt and not activation approval.',
  };
  const gate = evaluateDailyPhrasePriorAcceptedManifest({ manifest, artifacts });
  if (gate.verdict !== 'PASS') throw new Error(`Built continuity manifest failed its gate: ${gate.issues.join(', ')}`);
  return manifest;
}

function readBytes(filePath) {
  return fs.readFileSync(path.resolve(process.cwd(), filePath));
}

function runCli() {
  const studyTarget = String(process.argv[2] ?? '').trim();
  if (!isDailyPhraseManifestTarget(studyTarget)) {
    console.error('Usage: node scripts/build_daily_phrase_prior_accepted_manifest.mjs <es|fr|de|it> [review.json] [output.json]');
    process.exitCode = 2;
    return;
  }
  const paths = defaultDailyPhrasePriorAcceptedPaths(studyTarget);
  const reviewPath = process.argv[3] || `content/daily-phrases/${studyTarget}/prior-accepted-review.json`;
  const outputPath = process.argv[4] || `content/daily-phrases/${studyTarget}/prior-accepted-manifest.json`;
  const review = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), reviewPath), 'utf8'));
  const packetPaths = Array.isArray(review?.authoringPacketPaths) ? review.authoringPacketPaths : [];
  assertDailyPhraseAuthorityPaths(paths, studyTarget);
  for (const packetPath of packetPaths) assertDailyPhraseAuthoringPacketPath(packetPath, studyTarget);
  const artifactPaths = [...Object.values(paths), ...packetPaths];
  const artifacts = Object.fromEntries(artifactPaths.map((artifactPath) => [artifactPath, readBytes(artifactPath)]));
  const manifest = buildDailyPhrasePriorAcceptedManifest({ artifacts, paths, review, studyTarget });
  fs.writeFileSync(path.resolve(process.cwd(), outputPath), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    status: 'PASS',
    studyTarget,
    acceptedCount: manifest.acceptedCount,
    acceptedThrough: manifest.acceptedThrough,
    outputPath: path.resolve(process.cwd(), outputPath),
  }, null, 2));
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) runCli();
