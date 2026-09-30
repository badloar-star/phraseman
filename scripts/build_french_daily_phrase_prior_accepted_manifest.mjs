import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildDailyPhrasePriorAcceptedManifest,
  defaultDailyPhrasePriorAcceptedPaths,
} from './build_daily_phrase_prior_accepted_manifest.mjs';
import { assertDailyPhraseAuthoringPacketPath } from './daily_phrase_manifest_paths.mjs';

const FRENCH_PATHS = defaultDailyPhrasePriorAcceptedPaths('fr');

function adaptLegacyFrenchReview(review) {
  const hashes = review?.hashesSha256;
  const adaptedHashes = hashes && typeof hashes === 'object' && !Array.isArray(hashes)
    ? { ...hashes }
    : hashes;
  if (adaptedHashes && !Object.prototype.hasOwnProperty.call(hashes, 'sourceEvidence')) {
    adaptedHashes.sourceEvidence = hashes.authoritativeLedger;
  }
  return {
    ...review,
    studyTarget: Object.prototype.hasOwnProperty.call(review ?? {}, 'studyTarget')
      ? review.studyTarget
      : 'fr',
    hashesSha256: adaptedHashes,
  };
}

export function buildFrenchDailyPhrasePriorAcceptedManifest({ artifacts, paths = FRENCH_PATHS, review }) {
  const adaptedReview = adaptLegacyFrenchReview(review);
  return buildDailyPhrasePriorAcceptedManifest({
    artifacts,
    paths,
    review: adaptedReview,
    studyTarget: 'fr',
  });
}

function readBytes(filePath) {
  return fs.readFileSync(path.resolve(process.cwd(), filePath));
}

function runCli() {
  const reviewPath = process.argv[2] || 'content/daily-phrases/fr/prior-accepted-review.json';
  const outputPath = process.argv[3] || 'content/daily-phrases/fr/prior-accepted-manifest.json';
  const review = adaptLegacyFrenchReview(
    JSON.parse(fs.readFileSync(path.resolve(process.cwd(), reviewPath), 'utf8')),
  );
  const packetPaths = Array.isArray(review?.authoringPacketPaths) ? review.authoringPacketPaths : [];
  for (const packetPath of packetPaths) assertDailyPhraseAuthoringPacketPath(packetPath, 'fr');
  const artifactPaths = [...Object.values(FRENCH_PATHS), ...packetPaths];
  const artifacts = Object.fromEntries(artifactPaths.map((artifactPath) => [artifactPath, readBytes(artifactPath)]));
  const manifest = buildFrenchDailyPhrasePriorAcceptedManifest({ artifacts, review });
  fs.writeFileSync(path.resolve(process.cwd(), outputPath), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    status: 'PASS',
    acceptedCount: manifest.acceptedCount,
    acceptedThrough: manifest.acceptedThrough,
    outputPath: path.resolve(process.cwd(), outputPath),
  }, null, 2));
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) runCli();
