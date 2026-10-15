import fs from 'fs';
import path from 'path';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

// зачем (15.10, разбор красных): главная живёт на дизайне PhraseMan 2.0 (bc525a28a, «да» владельца) — картинка голоса и
// approved/voice.css заменены на /assets/v2/{base,home}.css + theme.js, телефон-«студия» убран по макету. Смысл сторожа прежний:
// главная доступна (адаптив, уменьшенное движение, видимый фокус), её каркас и главные входы на месте, а выкладка сайта
// заблокирована, пока не пройдёт проверка поверхности (scripts/verify_website_surface_contract.mjs).
describe('current website release contract', () => {
  it('keeps the 2.0 homepage responsive and accessible', () => {
    const css = read('knowly-www/assets/v2/base.css') + read('knowly-www/assets/v2/home.css');
    const html = read('knowly-www/index.html');
    expect(css).toMatch(/@media \(max-width: 700px\)/);
    expect(css).toMatch(/@media \(max-width: 440px\)/);
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain(':focus-visible');
    expect(html).toContain('id="theme-toggle"');
    expect(html).toContain('class="skip" href="#content"');
  });

  it('keeps the current homepage composition and its main entries', () => {
    const html = read('knowly-www/index.html');

    expect(html).toContain('data-approved-studio="20260908"');
    for (const asset of ['/assets/v2/base.css', '/assets/v2/home.css', '/assets/v2/theme.js']) expect(html).toContain(asset);
    expect(html).toContain('class="cinema-hero');
    expect(html).toContain('class="container hero-statement');
    expect(html).not.toContain('/assets/voice-design.css');
    expect(html).not.toContain('/assets/approved/voice.css');
    expect(html).not.toContain('class="hero wrap"');
    expect(html).toContain('Начать бесплатно');
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
    // ветка 2.0 и запрет возврата конструктора плана (квиз /start/ и сбор e-mail)
    expect(verifier).toContain('v2_home_surface_missing');
    // /app/ в 2.0: настоящие экраны приложения и путь на скачивание, файлы снимков существуют (Ревизор 15.10)
    expect(verifier).toContain('approved_app_screen_asset_missing');
    expect(verifier).toContain("'/assets/approved/app-lessons.webp', '/assets/approved/app-cards.webp', '/assets/approved/app-dialogs.webp'");
    expect(verifier).toContain('retired_plan_builder_lead_capture_present');
    expect(verifier).toContain('plan_builder_quiz_mode_reachable');
    expect(verifier).toContain('retired_plan_builder_redirect_missing');
    // прежние ветки не выброшены — откат к ним остаётся защищённым
    expect(verifier).toContain('approved_studio_surface_missing');
    expect(verifier).toContain('mobile_must_resolve_to_minimal');
    expect(verifier).toContain('desktop_must_resolve_to_legacy');
    expect(verifier).toContain('obstructive_daily_phrase_card_present');
  });
});
