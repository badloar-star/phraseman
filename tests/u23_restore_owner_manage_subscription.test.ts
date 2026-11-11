/*
 * U23 «Привязка Pro», экран подписки: «Plus вернулся» показывается только после того,
 * как сервер подтвердил, что аккаунт — владелец покупки. Пейвол и сама проверка —
 * в tests/u23_restore_owner_confirmation.test.ts.
 */
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/manage_subscription.tsx'), 'utf8');
const restore = src.slice(src.indexOf('const handleRestore = useCallback('));

describe('manage subscription «Восстановить» gates Plus on the server verdict', () => {
  it('owner check runs after the store answer and before Plus is shown', () => {
    const gate = restore.indexOf("confirmRestoreOwnerOnServer(generation.stableId, 'manage_subscription')");
    expect(gate).toBeGreaterThan(restore.indexOf('Purchases.restorePurchases()'));
    expect(restore.indexOf('setInfo(restored);')).toBeGreaterThan(gate);
    expect(restore.indexOf("emitAppEvent('premium_activated')")).toBeGreaterThan(gate);
  });

  it('an unconfirmed owner gets the honest toast instead of «Plus вернулся»', () => {
    expect(restore).toContain("if (ownerCheck.verdict !== 'confirmed') {");
    expect(restore).toContain('restoreOwnerNotConfirmedToast()');
  });
});
