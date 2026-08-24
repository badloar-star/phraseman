import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const maxUpsellSurfaceFiles = [
  'components/paywall/PaywallPlanCards.tsx',
  'components/paywall/PaywallPlanTiles.tsx',
] as const;

describe('MAX release blockers', () => {
  it('does not promise a one-minute activation retry after the server rapid budget is exhausted', () => {
    const source = read('app/max_paywall.tsx');
    for (const stalePromise of [
      'через минуту', 'за хвилину', 'en un minuto', 'em um minuto',
      'sau một phút', 'dalam satu menit', 'Bir dakika sonra', 'za minutę',
    ]) {
      expect(source).not.toContain(stalePromise);
    }
  });
  it('discloses one lifetime Free/Plus/Pro call and the MAX monthly cadence in all eight locales', () => {
    const source = read('app/max_paywall.tsx');
    for (const copy of [
      'Бесплатно / Плюс / Про', 'Безкоштовно / Плюс / Про', 'Gratis / Plus / Pro',
      'Grátis / Plus / Pro', 'Miễn phí / Plus / Pro', 'Gratis / Plus / Pro',
      'Ücretsiz / Plus / Pro', 'Bezpłatnie / Plus / Pro',
      '3 мин · один раз на аккаунт', '3 хв · один раз на акаунт',
      '3 min · una vez por cuenta', '3 min · uma vez por conta',
      '3 phút · một lần cho mỗi tài khoản', '3 mnt · sekali per akun',
      '3 dk · hesap başına bir kez', '3 min · raz na konto',
    ]) expect(source).toContain(copy);
    expect(source).toContain("label: 'MAX'");
    expect(source).toContain('120 мин / мес');
    expect(source).not.toMatch(/15\s+(?:мин|хв|min|phút|mnt|dk)/i);
    expect(source).not.toMatch(/180\s+(?:дн|днів|días|dias|ngày|hari|günde|dni)/i);
    expect(source).toContain('Лимиты голосовых звонков');
    expect(source).not.toContain('Сколько длится звонок с MAX');
  });

  it('describes MAX as an upgrade tier, never a separate concurrent subscription', () => {
    const sources = maxUpsellSurfaceFiles.map(read).join('\n');
    for (const forbidden of [
      'Отдельная подписка', 'Окрема підписка', 'Suscripción aparte', 'Assinatura separada',
      'Gói riêng', 'Langganan terpisah', 'Ayrı abonelik', 'Osobna subskrypcja',
    ]) expect(sources).not.toContain(forbidden);
    const cards = read('components/paywall/PaywallPlanCards.tsx');
    const tiles = read('components/paywall/PaywallPlanTiles.tsx');
    expect(cards).toContain('onOpenMaxPaywall && additionalOfferExpanded && renderCard(');
    expect(cards).toMatch(/true,[^]*onOpenMaxPaywall,[^]*\)\}/);
    expect(tiles).toContain('onNavigate: onOpenMaxPaywall');
  });

  it('discloses the monthly cadence in every compact MAX card and banner locale', () => {
    const compactSurfaces = maxUpsellSurfaceFiles.map(read);
    for (const source of compactSurfaces) {
      for (const cadence of [
        '120 минут в месяц', '120 хвилин на місяць', '120 minutos al mes',
        '120 minutos por mês', '120 phút mỗi tháng', '120 menit per bulan',
        'ayda 120 dakika', '120 minut miesięcznie',
      ]) expect(source).toContain(cadence);
    }
  });

  it('registers MAX paywall in navigation and product analytics', () => {
    expect(read('app/navigation_back.ts')).toContain("'/max_paywall'");
    expect(read('app/product_analytics_screen_registry.ts')).toContain("'max_paywall'");
  });

  it('shows MAX by name in settings and subscription management', () => {
    const settings = read('app/(tabs)/settings.tsx');
    const manage = read('app/manage_subscription.tsx');
    expect(settings).toContain("premiumPlan === 'max_monthly'");
    expect(settings).toContain("? 'MAX'");
    expect(manage).toContain("normalized === 'max_monthly'");
    expect(manage).toContain("currentPlan === 'max_monthly'");
    expect(manage).toContain("'Подписка MAX'");
    expect(manage).toContain("'MAX активирован'");
  });

  it('does not publish MAX technical modules as Expo Router routes', () => {
    for (const file of [
      'app/max_paywall_state.ts', 'app/max_subscription_pending.ts', 'app/max_subscription_purchase.ts',
    ]) expect(fs.existsSync(path.join(root, file))).toBe(false);
    for (const file of [
      'modules/max_subscription/paywall_state.ts',
      'modules/max_subscription/pending.ts',
      'modules/max_subscription/purchase.ts',
    ]) {
      const source = read(file);
      expect(source).not.toContain('__RouteShim');
      expect(source).not.toMatch(/export\s+default/);
    }
  });

  it('uses source-aware completion so A–G purchases do not return to a Plus paywall', () => {
    const source = read('app/max_paywall.tsx');
    expect(source).toContain('useLocalSearchParams');
    expect(source).toContain('finishMaxPaywallNavigation');
    expect(read('modules/max_subscription/paywall_state.ts')).toContain("source.startsWith('paywall_')");
  });

  it('keeps restore available when offering load fails and avoids placeholder pricing', () => {
    const source = read('app/max_paywall.tsx');
    expect(source).not.toContain("?? '···'");
    expect(source).toContain('retryStoreOffer');
    expect(source).toContain('const [offerError, setOfferError]');
    expect(source).toContain("const visibleError = error || (!storeConfirmed ? offerError : '')");
    expect(source).not.toContain('disabled={busy !== null || storeConfirmed || !maxPackage}');
  });

  it('keeps pending activation independent from offering loading and blocks restore from clearing it', () => {
    const source = read('app/max_paywall.tsx');
    expect(source).toContain('shouldShowMaxPaywallPrimarySpinner');
    expect(source).toContain('const restoreDisabled = isMaxPaywallRestoreDisabled');
    expect(source).toContain('if (restoreDisabled) return;');
    expect(source).toContain('disabled={restoreDisabled}');
  });

  it('attributes MAX paywall analytics through the established consent-gated event API', () => {
    const source = read('app/max_paywall.tsx');
    expect(source).toContain("import { trackEvent } from './analytics';");
    expect(source).toContain("trackEvent('paywall_shown'");
    expect(source).toContain("trackEvent('paywall_cta_click'");
    expect(source).toContain('source: analyticsSource');
    expect(source).toContain("plan: 'max_monthly'");
  });

  it('never claims that a failed SDK response proves the store did not charge', () => {
    const source = read('app/max_paywall.tsx');
    expect(source).not.toContain('Деньги не списаны');
    for (const copy of [
      'Не удалось подтвердить статус покупки. Проверь активацию или восстанови покупку.',
      'Не вдалося підтвердити статус покупки. Перевір активацію або віднови покупку.',
      'No se pudo confirmar el estado de la compra. Comprueba la activación o restaura la compra.',
      'Não foi possível confirmar o status da compra. Verifique a ativação ou restaure a compra.',
      'Không thể xác nhận trạng thái giao dịch. Hãy kiểm tra kích hoạt hoặc khôi phục giao dịch.',
      'Status pembelian tidak dapat dikonfirmasi. Periksa aktivasi atau pulihkan pembelian.',
      'Satın alma durumu doğrulanamadı. Etkinleştirmeyi kontrol et veya satın almayı geri yükle.',
      'Nie udało się potwierdzić statusu zakupu. Sprawdź aktywację lub przywróć zakup.',
    ]) expect(source).toContain(copy);
  });

  it('does not truncate localized MAX upsell disclosure', () => {
    for (const source of maxUpsellSurfaceFiles.map(read)) {
      expect(source).not.toContain('adjustsFontSizeToFit');
    }
  });
});
