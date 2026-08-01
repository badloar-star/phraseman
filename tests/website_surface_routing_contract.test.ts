import fs from 'fs';
import path from 'path';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('current website release contract', () => {
  it('keeps the approved Apple surface below the mobile breakpoint', () => {
    const css = read('knowly-www/assets/phraseman.css');
    const appleMobile = css.slice(css.indexOf('/* Approved Apple-style mobile surface.'));

    expect(appleMobile).toContain('@media (max-width: 760px)');
    expect(appleMobile).toContain('--bg: #f5f5f7;');
    expect(appleMobile).toContain('--gold: #0071e3;');
    expect(appleMobile).toContain('background: #f5f5f7;');
    expect(appleMobile).toContain('.mobile-hero-cta');
  });

  it('keeps the current homepage composition and responsive styles', () => {
    const html = read('knowly-www/index.html');
    const css = read('knowly-www/assets/home.css');

    expect(html).toContain('href="/assets/home.css?v=');
    expect(html).toContain('class="stage" id="stage"');
    expect(html).toContain('id="pm-title"');
    expect(html).toContain('gift-bridge');
    expect(html).toContain('id="gift-title"');
    expect(html).toContain('Начать мой первый урок');
    expect(css).toContain('@media (max-width: 720px)');
    expect(css).toContain('.stage > .wrap');
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
