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
    expect(giftPage).toContain('.cert[data-plan="lifetime"] .cert-note');
  });
});
