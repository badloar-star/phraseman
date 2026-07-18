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
const home = readRequired(path.join(root, 'index.html'), 'website_home_missing');
const experimentPath = path.join(root, 'assets', 'landing-experiment.js');
const isCompositeRelease = fs.existsSync(experimentPath);
const legacyPath = isCompositeRelease ? path.join(root, 'legacy', 'index.html') : path.join(root, 'index.html');
const legacy = readRequired(legacyPath, 'desktop_legacy_surface_missing');
const legacyCss = readRequired(path.join(root, 'assets', 'phraseman.css'), 'desktop_legacy_styles_missing');

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

if (isCompositeRelease) {
  const premiumCss = readRequired(
    path.join(root, 'assets', 'landing-premium.css'),
    'mobile_apple_surface_missing',
  );
  const experiment = readRequired(experimentPath, 'surface_router_missing');

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

console.log(`website_surface_contract_ok root=${root} layout=${isCompositeRelease ? 'composite' : 'canonical'}`);
