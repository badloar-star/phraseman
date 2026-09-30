import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (name: string) => readFileSync(path.join(__dirname, name), 'utf8');
const packs = read('community_packs.ts');
assert.equal(packs.includes("acquisitionSource: 'pack_gift_voucher'"), true, 'new gift receipt retains retired source');
assert.equal(packs.includes("acquisitionSource: 'weekly_boon_gift'"), false, 'new weekly gift receipt still emitted');
for (const file of ['admin_daily_digest.ts', 'admin_user_profile.ts', 'admin_alert_sources_revenue.ts']) {
  assert.equal(read(file).includes("'pack_gift_voucher'"), true, `${file} may count a free gift as revenue`);
}
console.log('pack gift source is generic and non-revenue');
