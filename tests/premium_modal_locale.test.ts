import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('A/B/C paywall footer locale contract', () => {
  const dispatcher = fs.readFileSync(path.join(ROOT, 'app', 'premium_modal.tsx'), 'utf8');
  const ctaBlock = fs.readFileSync(path.join(ROOT, 'components', 'paywall', 'PaywallCtaBlock.tsx'), 'utf8');

  it('keeps locale/legal footer copy in the shared new paywall CTA block', () => {
    expect(ctaBlock).toContain('triLang(lang');
    expect(ctaBlock).toContain('https://phraseman.app/terms');
    expect(ctaBlock).toContain('https://phraseman.app/privacy');
    expect(ctaBlock).toContain('onRestore');
    expect(ctaBlock).toContain('onContinueFree');
  });

  it('does not keep the old premium modal legal/footer renderer alive', () => {
    expect(dispatcher).toContain('PremiumModalDispatcher');
    expect(dispatcher).not.toContain('legalPlanned');
    expect(dispatcher).not.toContain('PREMIUM_DATE_LOCALE');
    expect(dispatcher).not.toContain('footerPeriodPlanned');
  });
});
