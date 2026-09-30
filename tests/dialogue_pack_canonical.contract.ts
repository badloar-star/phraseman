import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { DIALOGUE_LANGUAGE_PACKS } from '../app/dialogue_language_packs';
import { canonicalDialoguePackJson } from '../app/dialogue_pack_canonical';

const review = JSON.parse(readFileSync(resolve(__dirname, '../docs/dialogues/native-content-review-2026-09-20.json'), 'utf8')) as {
  targets: Record<'es' | 'fr' | 'de', { packSha256: string; canonicalBytes: number }>;
};
// Historical review receipts used JS string length for ES/FR and UTF-8 byte
// length for DE under the same `canonicalBytes` label. The hash, not this
// ambiguous count, is the cryptographic identity of the reviewed pack.
const reviewedCountUnit = { es: 'utf16', fr: 'utf16', de: 'utf8' } as const;

assert.equal(canonicalDialoguePackJson({ z: 1, a: { y: 2, b: 3 } }), '{"a":{"b":3,"y":2},"z":1}');
assert.equal(canonicalDialoguePackJson({ rows: [3, 1, 2] }), '{"rows":[3,1,2]}');

const mismatches: string[] = [];
for (const target of ['es', 'fr', 'de'] as const) {
  const pack = DIALOGUE_LANGUAGE_PACKS[target];
  assert.ok(pack, `${target}: missing native pack`);
  const canonical = canonicalDialoguePackJson(pack);
  const bytes = Buffer.byteLength(canonical, 'utf8');
  const sha256 = createHash('sha256').update(canonical, 'utf8').digest('hex');
  const reviewedCount = reviewedCountUnit[target] === 'utf8' ? bytes : canonical.length;
  if (reviewedCount !== review.targets[target].canonicalBytes || sha256 !== review.targets[target].packSha256) {
    mismatches.push(`${target}: ${bytes} UTF-8 bytes, ${canonical.length} UTF-16 units, ${sha256} live vs ${review.targets[target].canonicalBytes} recorded count/${review.targets[target].packSha256} reviewed`);
  }
}
assert.deepEqual(mismatches, [], `native pack review drift:\n${mismatches.join('\n')}`);

console.log('dialogue-pack-canonical-contract: PASS (3 reviewed packs, historical counts and exact hashes)');
