// ════════════════════════════════════════════════════════════════════════════
// paywall_exit_offer_themed_modal_contract.test.ts
//
// зачем (D187, владелец 14.10: «Удалить код»): оффер пробного периода на выходе из пейвола («Точно уходишь? N дней
// бесплатно») удалён целиком. Он был выключен на единственном пейволе (disableExitOffer: true), но жил в хуке: перехват
// первого тапа «закрыть» ставил невидимый оффер, если бы его кто-то включил. Теперь закрытие одно и прямое —
// handleClose → doClose с первого тапа, с постоянной строкой журнала об источнике закрытия.
//
// Прежний контракт (оффер рисуется ThemedConfirmModal, а не нативным Alert) снят вместе с оффером. Запрет нативного
// Alert на экране пейвола и поведение после лимита диалогов сохранены.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const PAYWALL_SCREENS = ['components/paywall/PaywallPlusScreen.tsx'] as const;

function readPurchaseHook(): string {
  return fs.readFileSync(path.join(ROOT, 'app', 'paywall_purchase.ts'), 'utf8');
}

function readPaywallScreen(screen: string): string {
  return fs.readFileSync(path.join(ROOT, screen), 'utf8');
}

describe('D187: no exit-intent offer — the paywall closes on the first tap', () => {
  it('keeps no exit-offer state, storage key, copy or gate in the purchase hook', () => {
    const source = readPurchaseHook();
    for (const gone of [
      'ExitTrialOfferState',
      'setExitOffer',
      'EXIT_TRIAL_OFFER_SEEN_KEY',
      'Точно уходишь?',
      'shouldShowExitTrialOffer',
      'disableExitOffer',
    ]) {
      expect(source).not.toContain(gone);
    }
  });

  it('removed the exit-offer gate module', () => {
    expect(fs.existsSync(path.join(ROOT, 'app', 'paywall_trial_offer.ts'))).toBe(false);
  });

  it('closes straight away and logs where the close came from (swipe / close button / scrim)', () => {
    const source = readPurchaseHook();
    const start = source.indexOf('const handleClose = useCallback(');
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, start + 900);
    expect(body).toContain('doClose(reason)');
    expect(body).toMatch(/\[PAYWALL-CLOSE\] via=/);
  });

  it.each(PAYWALL_SCREENS)('does not pass the retired exit-offer switch on %s', (screen) => {
    expect(readPaywallScreen(screen)).not.toContain('disableExitOffer');
  });

  it('does not reopen the exhausted dialog after a dialog-limit paywall close', () => {
    const source = readPurchaseHook();
    expect(source).toContain("if (context === 'dialog_limit')");
    expect(source).toContain("router.replace('/(tabs)/home' as any);");
  });

  it.each(PAYWALL_SCREENS)('does not fall back to a native Alert on %s', (screen) => {
    expect(readPaywallScreen(screen)).not.toContain('Alert.alert(');
  });
});
