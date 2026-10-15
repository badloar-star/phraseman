import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('Plus paywall footer locale contract', () => {
  const dispatcher = fs.readFileSync(path.join(ROOT, 'app', 'premium_modal.tsx'), 'utf8');
  // 2026-09-30 (D78): CTA-блок A–G удалён — подвал и ссылки живут в пейволе Plus.
  const plus = fs.readFileSync(path.join(ROOT, 'components', 'paywall', 'PaywallPlus.tsx'), 'utf8');
  const plusCopy = fs.readFileSync(path.join(ROOT, 'components', 'paywall', 'PaywallPlusCopy.ts'), 'utf8');

  it('keeps locale/legal footer copy in the single Plus paywall', () => {
    expect(plusCopy).toContain('triLang(lang, copy)');
    // R58 #1 (15.10): домена phraseman.app нет — ссылки из app/config.ts (сторож paywall_legal_links_contract)
    expect(plus).toContain('const TERMS_URL = KNOWLY_LEGAL_TERMS_URL;');
    expect(plus).toContain('const PRIVACY_URL = KNOWLY_LEGAL_PRIVACY_URL;');
    expect(plus).toContain('onRestore');
  });

  it('keeps purchase and restore pending states visible and mutually blocked', () => {
    expect(plus).toContain('accessibilityState={{ disabled: ctaDisabled, busy: purchasing }}');
    // зачем (кнопка покупки на фоне g.accent, 11.10): кружок того же цвета, что надпись на кнопке, — g.accentInk (прежний ctaInk был под другую заливку)
    expect(plus).toContain('<ActivityIndicator color={g.ctaFillInk} />');
    expect(plus).toContain('accessibilityState={{ busy: restoring }}');
  });

  it('does not keep the old premium modal legal/footer renderer alive', () => {
    expect(dispatcher).toContain('PremiumModalDispatcher');
    expect(dispatcher).not.toContain('legalPlanned');
    expect(dispatcher).not.toContain('PREMIUM_DATE_LOCALE');
    expect(dispatcher).not.toContain('footerPeriodPlanned');
  });
});
