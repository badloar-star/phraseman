import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.join(__dirname, 'community_packs.ts'), 'utf8');
for (const retired of [
  'WEEKLY_BOONS_REMOTE_CONFIG_KEY',
  'parseWeeklyBoonServerConfig',
  'activeFlashcardGiftOccurrence',
  'resolveServerPrimaryBoon',
  'weekly_boon_${occurrenceDate}',
  "source: 'weekly_boon'",
]) {
  assert.equal(source.includes(retired), false, `retired server weekly gift remains: ${retired}`);
}
assert.equal(source.includes('if (!voucherId) throw new HttpsError'), true, 'gift redemption still allows grant-less issuance');
assert.equal(source.includes('export const flashcardPackGiftRedeem = onCall'), true, 'valid gift redemption removed');
assert.equal(source.includes('export const flashcardPackGiftSyncState = onCall'), true, 'gift synchronization removed');
console.log('server weekly boon gift path retired');
