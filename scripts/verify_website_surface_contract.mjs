import fs from 'node:fs';
import path from 'node:path';

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function readRequired(filePath, errorCode) {
  if (!fs.existsSync(filePath)) throw new Error(`${errorCode}: ${filePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

function requireAll(source, needles, errorCode) {
  const missing = needles.filter((needle) => !source.includes(needle));
  if (missing.length) throw new Error(`${errorCode}: ${missing.join(', ')}`);
}

const root = path.resolve(argument('--root', 'knowly-www'));
const requireSecurityHeaders = process.argv.includes('--require-security-headers');
const firebaseConfigPath = path.resolve(argument('--firebase-config', path.join(root, '..', 'firebase.json')));
const home = readRequired(path.join(root, 'index.html'), 'website_home_missing');
const experimentPath = path.join(root, 'assets', 'landing-experiment.js');
const isCompositeRelease = fs.existsSync(experimentPath);
const legacyCss = readRequired(path.join(root, 'assets', 'phraseman.css'), 'desktop_legacy_styles_missing');

if (home.includes('data-approved-studio="20260908"')) {
  requireAll(home, ['class="cinema-hero', 'class="container hero-statement', 'voice-master.webp', 'voice-mobile.webp', '/assets/approved/voice.css', 'id="main-nav"', 'data-lang-btn="en"', 'id="theme-toggle"', '/assets/stats.js'], 'approved_studio_surface_missing');
  if (home.includes('/assets/voice-design.css') || home.includes('class="hero wrap"')) throw new Error('legacy_layout_bridge_must_not_return');
  const app = readRequired(path.join(root,'app/index.html'),'app_page_missing');
  requireAll(app, ['app-intro-scene', 'app-overview', 'app-device-screen', 'app-screen-owner-20260908.png'], 'approved_app_scene_missing');
  const gift = readRequired(path.join(root,'gift/index.html'),'gift_missing');
  requireAll(gift,['id="giftForm"','id="giftTo"','id="giftFrom"','id="buyerEmail"','id="cardBtn"','id="paypal-buttons"','id="giftCertificate"','gift-certificate-yearly.webp'], 'original_gift_behavior_missing');
  const test = readRequired(path.join(root,'english-level-test/index.html'),'level_test_missing');
  requireAll(test,['data-production-test','assessment-root','id="app"','defer src="./engine.js','defer src="./app.js','./certificate.js'], 'real_test_controller_missing');
  const runtime=readRequired(path.join(root,'assets/approved/production.js'),'production_adapter_missing');
  requireAll(runtime,['data.priceCents','KnowlyCookieSettings','consentCheckbox','assessment-consent'],'production_behavior_missing');
  const css=readRequired(path.join(root,'assets/approved/voice.css'),'approved_design_missing');
  requireAll(css,['The background dissolves','overflow:visible','linear-gradient(180deg,transparent,#f8f0e7)'],'scene_transition_missing');
  const worldCss = readRequired(path.join(root, 'assets/approved/world.css'), 'approved_world_styles_missing');
  requireAll(worldCss, [
    'body.edition .support-card>a:not(.button){color:#26354c',
    'body.edition .contact-email,body.edition .article-body a,body.edition .small-link{color:#263b5a',
    'body.edition main .small-note{color:#5c6170}',
  ], 'approved_light_surface_contrast_missing');
} else if (home.includes('/assets/voice-design.css')) {
  const design = readRequired(path.join(root, 'assets/voice-design.css'), 'voice_design_missing');
  requireAll(home, [
    'voice-home', 'data-world-depth', 'voice-master.webp', 'voice-mobile.webp',
    'js-store-toggle', 'id="store-menu-hero"', 'data-store="ios"', 'data-store="android"',
    'id="theme-toggle"', 'data-lang-btn="en"', 'data-lang-btn="ru"',
    'id="testCnt"', 'id="startTestBtn"', 'data-test-lang="es"',
    '/assets/stats.js', '/assets/ds.js', '/assets/home-live.js',
    'class="faq-q"', 'href="/gift/"', 'href="/premium/"',
  ], 'voice_home_contract_missing');
  requireAll(design, ['prefers-reduced-motion', 'max-width:760px', ':focus-visible', "data-theme='dark'"], 'voice_accessibility_missing');
  const journal = readRequired(path.join(root, 'guides/index.html'), 'journal_missing');
  for (const name of ['plan','phrases','habit','conversation','pronunciation','travel']) {
    requireAll(journal, [`guide-${name}.webp`], 'unique_journal_cover_missing');
    readRequired(path.join(root, `assets/voice-20260908/guide-${name}.webp`), 'journal_asset_missing');
  }
  const gift = readRequired(path.join(root, 'gift/index.html'), 'gift_missing');
  requireAll(gift, ['id="giftForm"','id="giftTo"','id="giftFrom"','id="buyerEmail"','id="cardBtn"','id="paypal-buttons"','data-price="yearly"','id="giftCertificate"'], 'gift_behavior_missing');
  const test = readRequired(path.join(root,'english-level-test/index.html'),'level_test_missing');
  requireAll(test, ['id="app"','./engine.js','./i18n.locales.js','./i18n.js','./certificate.js','./app.js'], 'level_test_behavior_missing');
} else if (isCompositeRelease) {
  const legacy = readRequired(
    path.join(root, 'legacy', 'index.html'),
    'desktop_legacy_surface_missing',
  );
  const premiumCss = readRequired(
    path.join(root, 'assets', 'landing-premium.css'),
    'mobile_apple_surface_missing',
  );
  const experiment = readRequired(experimentPath, 'surface_router_missing');

  requireAll(
    legacy,
    ['class="hero-rays"', 'phraseman-screen-home.webp', 'Скачать бесплатно и начать первый урок'],
    'desktop_legacy_surface_missing',
  );
  requireAll(
    legacyCss,
    [
      '@media (min-width: 761px)',
      'right: calc(50% - 50vw);',
      'width: calc(min(100%, 900px) + 50vw - 50%);',
    ],
    'desktop_legacy_surface_missing',
  );

  requireAll(
    home,
    [
      'data-premium-landing',
      'data-hero-variant="minimal"',
      'landing-legacy-shell',
      'Скачать бесплатно и начать первый урок',
    ],
    'mobile_apple_surface_missing',
  );
  if (home.includes('class="product-stage"')) {
    throw new Error('obstructive_daily_phrase_card_present');
  }
  requireAll(
    premiumCss,
    ['--paper-soft: #f5f5f7;', '--gold: #0071e3;', '@media (max-width: 760px)'],
    'mobile_apple_surface_missing',
  );
  requireAll(
    experiment,
    ['function isMobileViewport', 'width <= 760', "? 'minimal' : 'legacy'"],
    'mobile_must_resolve_to_minimal',
  );
  requireAll(
    experiment,
    [
      "detectPlatform(root.navigator) === 'desktop'",
      '!isMobileViewport(root.document)',
      "root.location.replace('/legacy/')",
    ],
    'desktop_must_resolve_to_legacy',
  );
} else {
  const homeCss = readRequired(
    path.join(root, 'assets', 'home.css'),
    'current_home_styles_missing',
  );

  requireAll(
    home,
    [
      'href="/assets/home.css?v=',
      'class="stage" id="stage"',
      'id="pm-title"',
      'gift-bridge',
      'id="gift-title"',
      'Начать мой первый урок',
    ],
    'current_home_surface_missing',
  );
  requireAll(
    homeCss,
    ['@media (max-width: 720px)', '.stage > .wrap', '.nav-chips'],
    'current_home_surface_missing',
  );

  const appleMarker = legacyCss.indexOf('/* Approved Apple-style mobile surface.');
  const appleMobile = appleMarker >= 0 ? legacyCss.slice(appleMarker) : '';

  requireAll(
    appleMobile,
    [
      '@media (max-width: 760px)',
      '--bg: #f5f5f7;',
      '--gold: #0071e3;',
      'background: #f5f5f7;',
      '.mobile-hero-cta',
    ],
    'mobile_apple_surface_missing',
  );
}

const retiredPlanFiles = [
  path.join(root, 'start', 'index.html'),
  path.join(root, 'assets', 'start.js'),
];
for (const retiredPlanFile of retiredPlanFiles) {
  if (fs.existsSync(retiredPlanFile)) {
    throw new Error(`retired_plan_builder_source_present:${retiredPlanFile}`);
  }
}

const publicCopyFiles = fs.readdirSync(root, { recursive: true })
  .filter((entry) => /\.(?:html|js)$/u.test(entry))
  .map((entry) => path.join(root, entry));
for (const publicCopyFile of publicCopyFiles) {
  const source = fs.readFileSync(publicCopyFile, 'utf8');
  if (source.includes('href="/start/"')) {
    throw new Error(`retired_plan_builder_link_present:${publicCopyFile}`);
  }
  if (source.includes('Подобрать практику') || source.includes('Find your practice') || source.includes('Find your plan')) {
    throw new Error(`retired_plan_builder_copy_present:${publicCopyFile}`);
  }
}

for (const coreRoute of ['index.html', 'app/index.html', 'download/index.html', 'english-level-test/index.html', 'guides/index.html', 'gift/index.html', 'contact/index.html', 'faq/index.html', 'premium/index.html', 'russia/index.html', '404.html']) {
  const source = readRequired(path.join(root, coreRoute), `website_core_route_missing:${coreRoute}`);
  if (!source.includes('class="skip" href="#content"')) throw new Error(`website_skip_link_missing:${coreRoute}`);
  const headingCount = (source.match(/<h1(?:\s|>)/gu) ?? []).length;
  if (headingCount !== 1) throw new Error(`website_h1_count_invalid:${coreRoute}:${headingCount}`);
}

const sitemap = readRequired(path.join(root, 'sitemap.xml'), 'website_sitemap_missing');
if (sitemap.includes('/start/')) throw new Error('retired_plan_builder_sitemap_present');
const llms = readRequired(path.join(root, 'llms.txt'), 'website_llms_inventory_missing');
if (llms.includes('/start/')) throw new Error('retired_plan_builder_llms_inventory_present');

const firebase = JSON.parse(readRequired(firebaseConfigPath, 'firebase_config_missing'));
const websiteHosting = (firebase.hosting ?? []).find((entry) => entry.target === 'knowlywww');
if (!websiteHosting) throw new Error('knowlywww_hosting_target_missing');
for (const source of ['/start/']) {
  const redirect = (websiteHosting.redirects ?? []).find((entry) => entry.source === source);
  if (!redirect || redirect.destination !== '/download/' || redirect.type !== 301) {
    throw new Error(`retired_plan_builder_redirect_missing:${source}`);
  }
}

if (requireSecurityHeaders) {
  const hosting = websiteHosting;
  if (!hosting) throw new Error('knowlywww_hosting_target_missing');
  const wildcard = (hosting.headers ?? []).find((entry) => entry.source === '**');
  const headers = new Map((wildcard?.headers ?? []).map(({ key, value }) => [key, value]));
  const required = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  };
  for (const [key, value] of Object.entries(required)) {
    if (headers.get(key) !== value) throw new Error(`website_security_header_missing:${key}`);
  }
  const reportOnly = headers.get('Content-Security-Policy-Report-Only') ?? '';
  if (!reportOnly || headers.has('Content-Security-Policy')) throw new Error('website_csp_must_be_report_only');
  for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"]) {
    if (!reportOnly.includes(directive)) throw new Error(`website_csp_directive_missing:${directive}`);
  }
}

console.log(`website_surface_contract_ok root=${root} layout=${home.includes('/assets/voice-design.css') ? 'voice' : isCompositeRelease ? 'composite' : 'canonical'}`);
