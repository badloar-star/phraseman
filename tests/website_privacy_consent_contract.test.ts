import fs from 'fs';
import path from 'path';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('website privacy consent contract', () => {
  it('requests only the quiz-plan email without marketing consent UI', () => {
    const start = read('knowly-www/assets/start.js');

    expect(start).toContain('submitLead(email);');
    expect(start).toContain('marketingConsent: false');
    expect(start).toContain('На этот адрес придёт только ваш персональный план.');
    expect(start).not.toContain('qlead-marketing-consent');
    expect(start).not.toContain('Можно присылать мне до двух писем');
  });

  it('does not schedule marketing nudges without explicit consent', () => {
    const leads = read('functions/src/web_leads.ts');

    expect(leads).toContain('const marketingConsent = body.marketingConsent === true;');
    expect(leads).toContain('marketingConsent: marketingConsent || existing?.marketingConsent === true');
    expect(leads).toContain('if (lead.marketingConsent !== true)');
  });

  it('lets visitors reopen cookie settings after the banner is dismissed', () => {
    const stats = read('knowly-www/assets/stats.js');

    expect(stats).toContain('window.KnowlyCookieSettings');
    expect(stats).toContain('data-cookie-settings');
  });

  it('does not declare a photo-library purpose when no image picker is used', () => {
    const appConfig = read('app.json');

    expect(appConfig).not.toContain('NSPhotoLibraryUsageDescription');
  });

  it('loads cookie settings on generated legal pages', () => {
    const legalSync = read('scripts/sync-legal-html.mjs');

    expect(legalSync).toContain('<script src="/assets/stats.js" defer></script>');
  });
});
