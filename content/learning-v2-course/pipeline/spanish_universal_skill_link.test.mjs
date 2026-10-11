import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const LINK = path.join(ROOT, 'content/learning-v2-course/audit-2026-10-08/spanish-es-ES-skill-link.json');

test('Spanish Learning V2 entry session is bound to the reusable es-ES profile and remains held', () => {
  assert.equal(existsSync(LINK), true, 'missing Spanish universal-skill link');
  const link = JSON.parse(readFileSync(LINK, 'utf8'));
  assert.equal(link.targetLanguage, 'es');
  assert.equal(link.languageProfile, 'es-ES');
  assert.equal(link.targetVariety, 'es-ES');
  assert.deepEqual(link.explanationLocales, ['ru', 'en']);
  assert.equal(link.releaseAuthority, false);
  assert.equal(link.status, 'HOLD');
  assert.equal(link.requiredEvidence.blindLearnerAttempt, true);
  assert.equal(link.requiredEvidence.sourceBoundFacts, true);
  assert.equal(link.requiredEvidence.finalVersionReviewCoverage, true);
  for (const relativePath of [link.skillEntry, link.languageProfileEntry, link.sessionSource]) {
    assert.equal(existsSync(path.resolve(ROOT, relativePath)), true, `missing linked input: ${relativePath}`);
  }
  const source = readFileSync(path.resolve(ROOT, link.sessionSource));
  assert.equal(createHash('sha256').update(source).digest('hex'), link.sessionSourceSha256,
    'Spanish source changed: renew the linkage evidence before authoring from it');
});
