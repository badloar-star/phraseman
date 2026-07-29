import fs from 'fs';
import path from 'path';

const root = process.cwd();
const giftPagePath = path.join(root, 'knowly-www', 'gift', 'index.html');
const giftPage = fs.readFileSync(giftPagePath, 'utf8');

const certificateAssets = {
  monthly: 'gift-certificate-monthly.webp',
  yearly: 'gift-certificate-yearly.webp',
  lifetime: 'gift-certificate-lifetime.webp',
} as const;

describe('gift certificate art contract', () => {
  it('preserves the existing champagne backdrop around the certificate flow', () => {
    const backdropAsset = path.join(root, 'knowly-www', 'assets', 'gift-background-champagne-glass-v3.webp');

    expect(fs.existsSync(backdropAsset)).toBe(true);
    expect(giftPage).toContain('/assets/gift-background-champagne-glass-v3.webp');
    expect(giftPage).toContain('<div class="gift-backdrop" aria-hidden="true"></div>');
  });

  it.each(Object.entries(certificateAssets))(
    'ships and references the %s certificate background',
    (plan, filename) => {
      const assetPath = path.join(root, 'knowly-www', 'assets', 'gift-certificates', filename);

      expect(fs.existsSync(assetPath)).toBe(true);
      expect(fs.statSync(assetPath).size).toBeGreaterThan(0);
      expect(giftPage).toContain(`/assets/gift-certificates/${filename}`);
      expect(giftPage).toContain(`.cert[data-plan="${plan}"]`);
    },
  );

  it('switches certificate art together with the selected gift plan', () => {
    expect(giftPage).toContain('<aside class="cert" data-plan="yearly"');
    expect(giftPage).toContain("$('giftCertificate').dataset.plan = plan;");
    expect(giftPage).toContain('id="giftCertificate"');
  });

  it('keeps a dedicated high-contrast treatment for the dark lifetime art', () => {
    expect(giftPage).toContain('.cert[data-plan="lifetime"] .cert-head');
    expect(giftPage).toContain('.cert[data-plan="lifetime"] .cert-to');
  });

  it('does not show a fake activation code before the certificate is purchased', () => {
    expect(giftPage).not.toContain('WEB-••');
    expect(giftPage).not.toContain('class="cert-code"');
    expect(giftPage).not.toContain('.cert-code {');
    expect(giftPage).not.toContain('Код появится в письме');
  });

  it('shows a stable plan-specific catchphrase and submits its identifier', () => {
    expect(giftPage).toContain('<script src="/assets/gift-certificate-phrases.js');
    expect(giftPage).toContain('id="pvCatchphrase"');
    expect(giftPage).toContain('phraseId:');
    expect(giftPage).toContain('function selectPhraseForPlan(plan)');
    expect(giftPage).toContain('giftPhraseId: state.phraseId');

    const syncPreview = giftPage.match(/function syncPreview\(\) \{[\s\S]*?\n    \}/)?.[0] ?? '';
    expect(syncPreview).not.toContain('Math.random');
    expect(syncPreview).not.toContain('selectPhraseForPlan');
  });

  it('widens the desktop certificate and adds an accessible travelling highlight', () => {
    expect(giftPage).toContain('class="wrap gift-wrap"');
    expect(giftPage).toContain('.gift-wrap { max-width: 1160px; }');
    expect(giftPage).toContain('grid-template-columns: minmax(0, .96fr) minmax(0, 1.04fr)');
    expect(giftPage).toContain('.cert::after');
    expect(giftPage).toContain('mix-blend-mode: screen;');
    expect(giftPage).toContain('@keyframes cert-shimmer-pass');
    expect(giftPage).toContain('animation: cert-shimmer-pass 6s');
    expect(giftPage).toContain('--cert-shimmer:');
    expect(giftPage).toContain('@media (prefers-reduced-motion: reduce)');
    expect(giftPage).toContain('.cert::after { animation: none; opacity: 0; }');
  });
});
