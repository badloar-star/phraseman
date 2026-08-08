import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadCandidateBankDirectory,
  validateFilledReview,
} from './lib/language_test_external_review.mjs';
import {
  buildReleaseBank,
  RELEASE_LANGUAGES,
  RELEASE_LEVELS,
  writeReleaseBank,
} from './lib/language_test_release_bank.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const bankVersion = '2026-08-03.1';

for (const language of RELEASE_LANGUAGES) {
  const candidateDirectory = join(repositoryRoot, 'content', 'language-test-pilots', language, 'candidate-bank');
  const reviewPath = join(repositoryRoot, 'content', 'language-test-pilots', 'review-work-orders', `${language}.external-review.json`);
  const candidateBank = loadCandidateBankDirectory(candidateDirectory);
  const reviewPacket = JSON.parse(readFileSync(reviewPath, 'utf8'));
  const review = validateFilledReview(reviewPacket, candidateBank);
  if (!review.releaseReady) {
    throw new Error(`${language}: review is not release-ready (${review.approved}/${review.total}; ${review.blockers[0] ?? 'unknown blocker'})`);
  }

  const levelBanks = Object.fromEntries(RELEASE_LEVELS.map((level) => [
    level,
    JSON.parse(readFileSync(join(candidateDirectory, `${level}.json`), 'utf8')),
  ]));
  const releaseBank = buildReleaseBank({ language, bankVersion, levelBanks });
  if (write) {
    writeReleaseBank(join(repositoryRoot, 'knowly-www', 'english-level-test', 'data', `questions.${language}.json`), releaseBank);
    writeReleaseBank(join(repositoryRoot, 'functions-english-test', 'data', `questions.${language}.json`), releaseBank);
  }
  console.log(`${language}: ${releaseBank.questions.length} reviewed questions ${write ? 'written' : 'ready'}`);
}
