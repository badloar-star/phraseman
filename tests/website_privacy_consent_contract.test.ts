import fs from 'fs';
import path from 'path';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('website privacy consent contract', () => {
  it('sends marketing consent separately from the requested quiz-plan email', () => {
    const start = read('knowly-www/assets/start.js');

    expect(start).toContain('marketingConsent: !!marketingConsent');
    expect(start).toContain('id: \'qlead-marketing-consent\'');
    expect(start).toContain('name: \'marketingConsent\'');
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
