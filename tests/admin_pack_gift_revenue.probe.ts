import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'acorn';

const root = path.resolve(__dirname, '..');
for (const relative of ['admin/legacy.html', 'admin/v2/legacy.html']) {
  // зачем: admin/legacy.html заморожен и удалён; отсутствующий файл не может показывать старые контролы
  if (!existsSync(path.join(root, relative))) continue;
  const source = readFileSync(path.join(root, relative), 'utf8');
  for (const retiredControl of ['weekly_boons_config', 'loadWeeklyBoons', 'saveWeeklyBoons', 'loadControlPanelBoons']) {
    assert.ok(!source.includes(retiredControl), `${relative} retains ${retiredControl}`);
  }
  let parsedScripts = 0;
  for (const [, attributes, inlineScript] of source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(attributes)) continue;
    parse(inlineScript, {
      ecmaVersion: 'latest',
      sourceType: /type=["']module/.test(attributes) ? 'module' : 'script',
    });
    parsedScripts += 1;
  }
  assert.ok(parsedScripts > 0, `${relative} has no inline scripts`);
  const start = source.indexOf('const COMMUNITY_PACK_FIXED_PRICE_SHARDS = 10;');
  const end = source.indexOf('window._cpSubTab', start);
  assert.ok(start >= 0 && end > start, `${relative} purchase helper missing`);
  const helpers = new Function(`${source.slice(start, end)}; return { communityPurchaseDisplayPrice };`)() as {
    communityPurchaseDisplayPrice: (purchase: Record<string, unknown>) => number;
  };
  for (const acquisitionSource of ['weekly_boon_gift', 'pack_gift_voucher']) {
    const purchase = { status: 'completed', acquisitionSource };
    assert.equal(helpers.communityPurchaseDisplayPrice(purchase), 0, `${relative} counts gift as revenue`);
  }
  const paid = { status: 'completed', acquisitionSource: 'paid_community_sale' };
  assert.equal(helpers.communityPurchaseDisplayPrice(paid), 10);
  // зачем: D110 — админ-возврат покупки набора удалён; кнопки и вызова быть не должно.
  assert.ok(!source.includes('adminRefundCommunityPackPurchase'), `${relative} still calls removed refund callable`);
  assert.ok(!source.includes('refundUgcPurchase'), `${relative} still renders removed refund action`);
}
console.log('admin pack gift revenue correctly excludes free vouchers');
