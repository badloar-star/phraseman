import fs from 'fs';
import path from 'path';

describe('canonical Telegram Premium admin activation surface', () => {
  const live = fs.readFileSync(path.join(process.cwd(), 'admin', 'v2', 'legacy.html'), 'utf8');
  const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
  const index = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'index.ts'), 'utf8');

  it('keeps the Telegram workflow inside the sole live legacy admin surface', () => {
    expect(live).toContain("switchTab('testers')");
    expect(live).toContain('id="tab-testers"');
    expect(live).not.toContain("onclick=\"location.href='testers.html'\"");
    expect(live).not.toContain("window.location.href = 'testers.html'");
  });

  it('shows diagnostic orders and nickname candidates but only exposes the paid-plan activation command', () => {
    expect(live).toContain("collection(db, 'telegram_premium_orders')");
    expect(live).toContain("collection(db, 'promo_codes')");
    expect(live).toContain('loadTelegramPremiumOrders');
    expect(live).toContain('findTelegramPremiumUserCandidates');
    expect(live).toContain('renderTelegramPremiumCandidates');
    expect(live).toContain('telegramPremiumManualActivationAllowed');
    expect(live).toContain('Код уже активирован');
    expect(live).toContain('Ручная выдача заблокирована');
    expect(live).toContain('Активировать оплаченный период');
    expect(live).not.toContain('Активировать месяц');
    expect(live).not.toContain('Активировать год');
  });

  it('uses the protected callable with exact order/payment/plan identity and no direct writes', () => {
    expect(live).toContain("httpsCallable(functionsUs, 'adminActivateTelegramPremiumOrder')");
    expect(live).toContain('telegramPaymentChargeId: order.telegramPaymentChargeId');
    expect(live).toContain('expectedPlan: order.plan');
    expect(live).toContain('requestedUid: uid');
    expect(live).toContain('window.confirm(');
    expect(live).toContain('telegram-premium-activation-status');
    expect(live).not.toContain("updateDoc(doc(db, 'telegram_premium_orders'");
    // зачем: важен сам экспорт, а не стиль кавычек — Prettier в functions/ ставит двойные.
    expect(index).toMatch(
      /export \{ adminActivateTelegramPremiumOrder \} from ['"]\.\/telegram_premium_admin['"];/,
    );
  });

  it('blocks every direct client mutation of payment-linked orders', () => {
    const start = rules.indexOf('match /telegram_premium_orders/{orderId}');
    const body = rules.slice(start, rules.indexOf('\n    }', start) + 6);
    expect(body).toContain('allow read: if isAdmin();');
    expect(body).toMatch(/allow (?:create, )?update(?:, delete)?: if false;/);
    expect(body).toMatch(/allow (?:create(?:, update)?, delete|create, update, delete): if false;/);
    expect(body).not.toContain('allow update: if isAdmin();');
  });

  it('denies the frozen browser page from writing VIP fields even with an admin claim', () => {
    const guard = rules.match(/function progressHasNoPremiumWrites\(\) \{[\s\S]*?\n    \}/)?.[0] ?? '';
    expect(guard).not.toMatch(/return\s+isAdmin\(\)\s*\|\|/);
    expect(guard).toContain('.hasAny(blockedPremiumProgressKeys())');
  });

  it('provides tooltip, loading, success, error, and audit guidance for the dangerous action', () => {
    expect(live).toContain('title="Сервер сверит оплату, состояние записи и канонический профиль');
    expect(live).toContain('telegram-premium-activate-btn');
    expect(live).toContain('Активирую доступ…');
    expect(live).toContain('Повторного продления не было');
    expect(live).toContain('Действие записано в журнал аудита');
    expect(live).toContain('Ошибка активации');
  });
});
