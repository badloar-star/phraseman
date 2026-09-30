const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../app/paywall_purchase.ts'), 'utf8');

test('non-onboarding purchase uncertainty has a separate safe alert', () => {
  const helper = source.split('function showUnverifiedPurchaseAlert(lang: Lang): void {')[1]
    ?.split('function showDevPurchasePreviewAlert')[0];
  assert.ok(helper, 'unverified result needs an explicit alert helper');
  assert.match(helper, /Статус покупки не подтверждён/);
  assert.match(helper, /Восстановить/);
  assert.match(helper, /Не покупай повторно/);
  assert.doesNotMatch(helper, /Попробуй ещё раз|Try again/);
});

test('existing onboarding alert remains isolated from non-onboarding copy', () => {
  const purchaseCatch = source.split('} catch (err: unknown) {')[1]
    ?.split('// ── восстановление ──')[0];
  assert.ok(purchaseCatch);
  assert.match(purchaseCatch, /ONBOARDING_PURCHASE_SOURCES\.has\(source\)/);
  assert.match(purchaseCatch, /showUnverifiedPurchaseAlert\(lang\)/);
  assert.match(purchaseCatch, /showPurchasePendingAlert\(lang\)/);
});
