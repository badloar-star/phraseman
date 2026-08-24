import fs from 'node:fs';
import path from 'node:path';

const jarvisDir = __dirname;
const fetcherFiles = fs.readdirSync(jarvisDir)
  .filter((name) => name.endsWith('_firestore_fetcher.ts'))
  .sort();
const fetcherSource = fetcherFiles
  .map((name) => fs.readFileSync(path.join(jarvisDir, name), 'utf8'))
  .join('\n');

describe('Jarvis intentionally does not inspect tournament semantic review internals', () => {
  it('keeps jobs, raw verdict receipts, candidates and bundle internals outside every fetcher', () => {
    expect(fetcherFiles.length).toBeGreaterThan(0);
    for (const forbidden of [
      'tournament_semantic_jobs',
      'tournament_semantic_review_receipts',
      'tournament_pool_v11_bundles',
      'pendingReview',
      'primaryVerdict',
      'adversarialVerdict',
    ]) {
      expect(fetcherSource).not.toContain(forbidden);
    }
  });
});
