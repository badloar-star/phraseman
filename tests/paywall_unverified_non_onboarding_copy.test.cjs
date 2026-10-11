const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../app/paywall_purchase.ts'), 'utf8');

// зачем (координатор 12.10): правило теста — окно «Статус покупки не подтверждён» не обещает повторную оплату («Попробуй ещё раз» / «Try again» запрещены,
// риск двойного списания; в окне есть «Не покупай повторно»). Срез окна раньше шёл до showDevPurchasePreviewAlert, но между ними позже встали тосты
// результата проверки (paywallRestoreToast: «Try again later») — они не часть окна и роняли тест по ложной причине. Окно кончается перед блоком тостов.
function unverifiedAlertSource() {
  return source.split('function showUnverifiedPurchaseAlert(lang: Lang)')[1]
    ?.split('export type PaywallRestoreToastKind')[0];
}

test('non-onboarding purchase uncertainty has a separate safe alert', () => {
  const helper = unverifiedAlertSource();
  assert.ok(helper, 'unverified result needs an explicit alert helper');
  assert.doesNotMatch(helper, /paywallRestoreToast|Try again later/, 'the slice must end before the result toasts');
  assert.match(helper, /Не покупай повторно/);
  for (const key of ['ru:', 'uk:', 'en:', 'es:', "'pt-BR':", 'vi:', 'id:', 'tr:', 'pl:']) {
    assert.ok(helper.includes(key), `alert text needs ${key}`);
  }
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
  assert.match(purchaseCatch, /showPurchasePendingAlert\(lang, /);
});

// зачем (65а, решено по рекомендации; макет 014): окно умеет то, о чём просит его текст —
// «Проверить статус» (чтение customerInfo) и «Восстановить покупки» (restorePurchases), одним путём доступа.
test('unverified alert offers check status and restore, wired to the shared entitlement path', () => {
  const actions = source.split('export function unverifiedPurchaseAlertActions(')[1]?.split('function showUnverifiedPurchaseAlert')[0];
  assert.ok(actions, 'two-action helper must exist');
  assert.match(actions, /value: 'check', ghost: true/);
  assert.match(actions, /value: 'restore'/);
  for (const key of ['ru:', 'uk:', 'en:', 'es:', "'pt-BR':", 'vi:', 'id:', 'tr:', 'pl:']) {
    assert.equal(actions.split(key).length - 1, 2, `both buttons need ${key}`);
  }
  const helper = unverifiedAlertSource();
  assert.match(helper, /enqueueThemedBlockingChoiceAlert\(/);
  assert.match(helper, /unverifiedPurchaseAlertActions\(lang\)/);
  const purchaseCatch = source.split('} catch (err: unknown) {')[1]?.split('// ── восстановление ──')[0];
  assert.match(purchaseCatch, /if \(choice === 'dismiss'\) return;/);
  assert.match(purchaseCatch, /entitlementSyncRef\.current\?\.\(choice\)/);
  const restore = source.split('const handleRestore = useCallback(')[1]?.split('const handleClose = useCallback')[0];
  assert.match(restore, /^async \(mode: 'restore' \| 'check' = 'restore'\)/);
  assert.match(restore, /mode === 'check' \? Purchases\.getCustomerInfo\(\) : Purchases\.restorePurchases\(\)/);
  assert.match(source, /entitlementSyncRef\.current = handleRestore;/);
});
