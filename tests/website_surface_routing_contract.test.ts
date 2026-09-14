import fs from 'fs';
import path from 'path';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('current website release contract', () => {
  it('keeps the approved voice art responsive and accessible', () => {
    const css = read('knowly-www/assets/approved/voice.css') + read('knowly-www/assets/approved/site.css');
    const html = read('knowly-www/index.html');
    expect(css).toContain('@media(max-width:700px)');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain(':focus-visible');
    expect(html).toContain('id="theme-toggle"');
    expect(html).toContain('<source media=');
    expect(html).toContain('voice-mobile.webp');
    expect(html).toContain('voice-master.webp');
  });

  it('keeps the current homepage composition and responsive styles', () => {
    const html = read('knowly-www/index.html');
    const css = read('knowly-www/assets/approved/voice.css');

    expect(html).toContain('data-approved-studio="20260908"');
    expect(html).toContain('href="/assets/approved/voice.css"');
    expect(html).toContain('class="cinema-hero');
    expect(html).toContain('class="container hero-statement');
    expect(html).not.toContain('/assets/voice-design.css');
    expect(html).not.toContain('class="hero wrap"');
    expect(html).toContain('Начать бесплатно');
    expect(css).toContain('The background dissolves');
    for (const feature of ['id="theme-toggle"', 'data-lang-btn="en"', 'href="/download/"', 'href="/english-level-test/"', 'data-cookie-settings']) {
      expect(html).toContain(feature);
    }
    const test = read('knowly-www/english-level-test/index.html');
    expect(test).toContain('data-production-test');
    expect(test).toContain('defer src="./app.js');
    expect(test).toContain('assessment-consent');
  });

  it('blocks a hosting release unless the surface contract passes', () => {
    const packageJson = JSON.parse(read('package.json'));
    const verifier = read('scripts/verify_website_surface_contract.mjs');

    expect(packageJson.scripts['website:surface-contract']).toBe(
      'node scripts/verify_website_surface_contract.mjs --root knowly-www',
    );
    expect(packageJson.scripts['hosting:knowly-www']).toMatch(
      /^npm run website:surface-contract && /,
    );
    expect(verifier).toContain('mobile_apple_surface_missing');
    expect(verifier).toContain('current_home_surface_missing');
    expect(verifier).toContain('mobile_must_resolve_to_minimal');
    expect(verifier).toContain('desktop_must_resolve_to_legacy');
    expect(verifier).toContain("!isMobileViewport(root.document)");
    expect(verifier).toContain('obstructive_daily_phrase_card_present');
  });
});
