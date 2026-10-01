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
// зачем: D140 (владелец 2026-10-01) — подарочные наборы удалены целиком: ни
// погашения, ни синхронизации ваучеров на сервере больше нет.
for (const removed of [
  'export const flashcardPackGiftRedeem',
  'export const flashcardPackGiftSyncState',
  'export const communityRedeemPackGiftVoucher',
  'export const flashcardPackGiftGrantGlobalBroadcast',
]) {
  assert.equal(source.includes(removed), false, `D140: pack-gift callable returned: ${removed}`);
}
console.log('server weekly boon gift path retired');
