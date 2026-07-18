import fs from 'fs';
import path from 'path';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('website Apple-mobile / Legacy-desktop release contract', () => {
  it('keeps the approved Apple surface below the mobile breakpoint', () => {
    const css = read('knowly-www/assets/phraseman.css');
    const appleMobile = css.slice(css.indexOf('/* Approved Apple-style mobile surface.'));

    expect(appleMobile).toContain('@media (max-width: 760px)');
    expect(appleMobile).toContain('--bg: #f5f5f7;');
    expect(appleMobile).toContain('--gold: #0071e3;');
    expect(appleMobile).toContain('background: #f5f5f7;');
    expect(appleMobile).toContain('.mobile-hero-cta');
  });

  it('keeps the Legacy desktop composition and its edge-safe hero background', () => {
    const html = read('knowly-www/index.html');
    const css = read('knowly-www/assets/phraseman.css');

    expect(html).toContain('class="hero-rays"');
    expect(html).toContain('phraseman-screen-home.webp');
    expect(css).toContain('@media (min-width: 761px)');
    expect(css).toContain('right: calc(50% - 50vw);');
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
    expect(verifier).toContain('desktop_legacy_surface_missing');
    expect(verifier).toContain('mobile_must_resolve_to_minimal');
    expect(verifier).toContain('desktop_must_resolve_to_legacy');
    expect(verifier).toContain("!isMobileViewport(root.document)");
    expect(verifier).toContain('obstructive_daily_phrase_card_present');
  });
});
