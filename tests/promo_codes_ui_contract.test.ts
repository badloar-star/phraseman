import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

describe('promo codes UI/admin contract', () => {
  it('settings exposes promo code entry behind the remote flag', () => {
    const flags = read('app/remote_flags.ts');
    const settings = read('app/(tabs)/settings.tsx');

    expect(flags).toContain("| 'promo_codes_enabled'");
    expect(flags).toContain('promo_codes_enabled: false');
    expect(flags).toContain("isPromoCodesEnabled = () => getRemoteBool('promo_codes_enabled')");

    expect(settings).toContain('isPromoCodesEnabled');
    expect(settings).toContain('settings-promo-code-row');
    expect(settings).toContain("router.push('/promo_code_entry' as any)");
  });

  it('successful redemption wakes VIP access immediately', () => {
    const entry = read('app/promo_code_entry.tsx');
    const client = read('app/promo_code_client.ts');

    expect(client).toContain("'promo_disabled'");
    expect(client).toContain("rewardKind?: 'days' | 'lifetime'");
    expect(client).toContain('vipUntilMs?: number');
    expect(client).toContain('grantAtMs?: number');
    expect(entry).toContain("emitAppEvent('vip_activated')");
    expect(entry).toContain("emitAppEvent('premium_access_changed', { active: true, source: 'vip' })");
    expect(entry).toContain('<VipCelebrationModal');
    expect(entry).toContain('TonalSurface');
    expect(entry).toContain('ActivityIndicator size="small"');
    expect(entry).toContain('Активируем…');
    expect(entry).toContain("['vip_plan', params.rewardKind === 'lifetime' ? 'promo_lifetime' : 'promo']");
    expect(entry).toContain('Plus-подписка активирована навсегда');
    expect(entry).toContain('Введи промокод, чтобы получить Plus-подписку.');
    expect(entry).toContain('Plus-подписка активирована на ${d} дн.');
    expect(entry).not.toContain('дней полного доступа');
  });

  it('settings shows supplemental access details below the Plus card', () => {
    const settings = read('app/(tabs)/settings.tsx');

    expect(settings).toContain('settings-plus-access-details');
    expect(settings).toContain('settings-vip-card');
    expect(settings).toContain('Промокод');
    expect(settings).toContain('Полный доступ на 3 дня');
    expect(settings).toContain('Подарок: полный доступ на 3 дня');
    // 2026-07-26: подпись plusRowSub (включая «Plus доступ активен») удалена
    // редизайном настроек (запрет владельца на подписи-расшифровки под
    // названием) — статус теперь в plusRowLabel «… активирован ✓».
    expect(settings).toContain("${L('активирован', 'активовано'");
  });

  it('admin has a promo code section with generation and copy controls', () => {
    const admin = read('admin/index.html');
    const index = read('functions/src/index.ts');
    const fn = read('functions/src/promo_codes.ts');

    expect(index).toContain('promoCodeBatchUpsert');
    expect(fn).toContain("const PROMO_CODES_ENABLED_FLAG = 'promo_codes_enabled'");
    expect(fn).toContain('promoCodeBatchUpsert');

    expect(admin).toContain("switchTab('promo-codes')");
    expect(admin).toContain('id="tab-promo-codes"');
    expect(admin).toContain('id="cp-bool-promo_codes_enabled"');
    expect(admin).toContain("httpsCallable(functionsUs, 'promoCodeBatchUpsert')");
    expect(admin).toContain('createOneTimePromoCodes');
    expect(admin).toContain('copyAllPromoCodes');
    expect(admin).toContain('promo-codes-modal');
  });

  it('admin shows promo redemptions and backend grants VIP automatically', () => {
    const admin = read('admin/index.html');
    const fn = read('functions/src/promo_codes.ts');

    expect(fn).toContain("vip_active: 'true'");
    expect(fn).toContain("vip_plan: rewardKind === 'lifetime' ? 'promo_lifetime' : 'promo'");
    expect(fn).toContain('tx.set(redemptionRef, {');
    expect(fn).toContain('stableUid');
    expect(fn).toContain('vipUntilMs');
    expect(fn).toContain('grantAtMs: nowMs');
    expect(fn).toContain('tx.set(userRef, { progress: vipPatch, updatedAt: nowMs }, { merge: true })');

    expect(admin).toContain('Кто активировал промокод');
    expect(admin).toContain('id="promo-redemptions-list"');
    expect(admin).toContain('loadPromoRedemptions');
    expect(admin).toContain("collectionGroup(db, 'promo_redemptions')");
    expect(admin).toContain('openPromoRedemptionUser');
  });
});
