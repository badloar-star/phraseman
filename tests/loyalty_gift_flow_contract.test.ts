import fs from 'fs';
import path from 'path';

const layoutSource = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
const loyaltyGiftSource = fs.readFileSync(path.join(process.cwd(), 'app', 'loyalty_gift.ts'), 'utf8');
const modalSource = fs.readFileSync(path.join(process.cwd(), 'components', 'LoyaltyGiftModal.tsx'), 'utf8');

describe('loyalty gift 3-day flow contract', () => {
  it('keeps the 3-day loyalty gift offer disabled in the root flow', () => {
    expect(layoutSource).toContain('const LOYALTY_UPDATE_MODAL_ENABLED = false;');
    expect(layoutSource).toContain('if (!LOYALTY_UPDATE_MODAL_ENABLED) return;');
  });

  it('claims the gift through startLoyaltyGift and refreshes premium access immediately', () => {
    expect(layoutSource).toContain('const claimLoyaltyGift = useCallback');
    expect(layoutSource).toContain('await startLoyaltyGift(Date.now(), lang)');
    expect(layoutSource).toContain("emitAppEvent('loyalty_gift_changed')");
    expect(layoutSource).toContain("onAppEvent('loyalty_gift_changed'");
  });

  it('mirrors the loyalty gift to cloud fields used by server premium checks', () => {
    expect(loyaltyGiftSource).toContain("readGiftAccessFromCloud('loyalty')");
    expect(loyaltyGiftSource).toContain("persistGiftAccessOnCloud('loyalty', nowMs, endsAt)");
  });

  it('offers exactly a 3-day full-access gift in the user-facing modal copy', () => {
    expect(modalSource).toContain('Держи 3 дня');
    expect(modalSource).toContain('Забрать 3 дня');
    expect(modalSource).toContain('ничего не спишется, подписка не включится');
  });
});
