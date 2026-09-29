import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

const root = join(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('seven non-onboarding paywalls use one live Liquid Glass shell', () => {
  for (const variant of 'abcdefg') {
    const source = read(`app/paywall_${variant}.tsx`);
    assert.ok(source.includes('PaywallLiquidGlass'), `variant ${variant}: shared shell`);
    assert.ok(source.includes('if (!isOnboarding)'), `variant ${variant}: every non-onboarding locale`);
    assert.ok(!source.includes("!isOnboarding && lang === 'ru'"), `variant ${variant}: no RU-only gate`);
  }
});

test('visible shell copy is translated for all active interface locales', () => {
  const shell = read('components/paywall/PaywallLiquidGlass.tsx');
  assert.ok(shell.includes('getLiquidPaywallCopy(lang)'), 'shell must resolve locale copy');
  const source = read('components/paywall/PaywallLiquidGlassCopy.ts');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('exports', code)(exports);
  const english = exports.getLiquidPaywallCopy('en');
  for (const locale of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
    const copy = exports.getLiquidPaywallCopy(locale);
    assert.equal(Object.keys(copy).length, 76, `${locale}: complete copy`);
    if (locale !== 'en') assert.notEqual(copy.titleA, english.titleA, `${locale}: no English fallback`);
    if (locale !== 'ru') assert.notEqual(copy.titleA, 'Учитесь без ожидания', `${locale}: no Russian fallback`);
  }
});

test('Liquid Glass shell retains real purchase, restore, and legal disclosure', () => {
  const source = read('components/paywall/PaywallLiquidGlass.tsx');
  for (const token of ['useStableSafeAreaInsets', 'PaywallLegalDisclosure', 'handlePurchase', 'handleRestore', 'ctaDisabled']) {
    assert.ok(source.includes(token), `missing ${token}`);
  }
  assert.ok(!/computeDecoyPriceString|OPENAI_API_KEY/.test(source), 'no invented decoy or API key');
});

test('A and D never render the lifetime package outside onboarding', () => {
  const source = read('components/paywall/PaywallLiquidGlass.tsx');
  assert.ok(!source.includes('<PlanCard plan="lifetime"'), 'no lifetime card in the shell');
  assert.ok(!source.includes('function AvailablePlans('), 'legacy plan list retired');
  assert.equal((source.match(/lifetimeAvailable={false}/g) ?? []).length, 2, 'both dock selectors suppress lifetime');
  assert.match(source, /lifetimePrice={null}/);
});

test('loading, error and checkout have separate safe actions', () => {
  const source = read('components/paywall/PaywallLiquidGlass.tsx');
  for (const state of ['loading', 'error', 'purchasing']) {
    assert.ok(source.includes(`state === '${state}'`), `missing ${state} state`);
  }
  assert.ok(source.includes("state === 'ready'"), 'continue free only in ready state');
  assert.ok(!source.includes("state === 'verifying'"), 'no invented verification state without hook signal');
});

test('checkout locks native dismissal from live purchase state and restores it afterward', () => {
  const source = read('components/paywall/PaywallLiquidGlass.tsx');
  assert.ok(source.includes('BackHandler.addEventListener'), 'Android system back has a screen-level guard');
  assert.ok(source.includes("'hardwareBackPress', () => true"), 'system back is consumed only while checkout owns the route');
  assert.ok(source.includes('subscription.remove()'), 'system back behavior is restored after checkout');
  assert.ok(!source.includes('usePreventRemove'), 'successful checkout navigation is not blocked by a blanket route-removal guard');
  assert.ok(source.includes('checkoutScreenOptions'), 'shell derives live navigation options');
  assert.match(source, /purchase\.purchasing\s*\|\|\s*purchase\.restoring/, 'purchase and restore both lock dismissal');
  assert.match(source, /gestureEnabled:\s*false/, 'native swipe dismissal is disabled while checkout owns the route');
  assert.ok(source.includes('<Stack.Screen options={checkoutScreenOptions} />'), 'live options reach the native route');
});

test('onboarding keeps the exact midnight chrome while non-onboarding remains theme-derived', () => {
  const source = read('components/paywall/paywallShared.tsx');
  assert.ok(source.includes('if (overrideThemeMode)'), 'explicit onboarding override has a fixed branch');
  assert.ok(source.includes('bgColors: screenBgTuple(mode)'), 'override resolves its own midnight gradient');
  assert.ok(source.includes("textPrimary: light ? SAGE_PORCELAIN.textPrimary : '#FFFFFF'"), 'override keeps legacy midnight text');
  assert.ok(source.includes("colors={['#010102', '#050713', '#0A1025']}"), 'onboarding background remains exact midnight');
  assert.ok(source.includes("backgroundColor: '#010102'"), 'onboarding dim remains exact midnight');
  assert.ok(source.includes('bgColors: [theme.bgPrimary, theme.bgSurface, theme.bgPrimary]'), 'non-onboarding still follows the active theme');
});

test('resolved partial inventory renders selectors and keeps restore reachable', () => {
  const source = read('components/paywall/PaywallLiquidGlass.tsx');
  assert.doesNotMatch(source, /purchase\.loading\s*\|\|\s*!selectedPrice/, 'missing selected price is not global loading');
  assert.match(source, /purchase\.loading\s*\?\s*'loading'\s*:\s*'ready'/, 'only a live offerings request owns loading state');
  assert.ok(source.includes("disabled={state === 'purchasing' || state === 'loading' || purchase.restoring}"), 'restore remains enabled after partial inventory resolves');
});

test('material keeps translucent tint, visible rim and sheen on Android without blur', () => {
  const source = read('components/paywall/PaywallLiquidGlass.tsx');
  for (const token of ['glassPanel', 'glassRim', 'glassSheen', 'androidFallback']) {
    assert.ok(source.includes(token), `missing ${token}`);
  }
  assert.ok(source.includes("Platform.OS === 'android' && S.androidFallback"), 'Android keeps its explicit material layer');
  assert.ok(source.includes('backgroundColor: g.card'), 'Android fallback keeps the active translucent theme tint');
  assert.ok(source.includes('borderColor: g.glassEdge'), 'Android fallback keeps the active light rim');
  assert.ok(source.includes("glassTint(g.lightTint, '24')"), 'Android fallback keeps a bounded active highlight sheen');
  assert.ok(source.includes("glassTint(g.lightTint, '08')"), 'highlight fades through a lighter active tint');
  assert.ok(!source.includes("androidFallback: { backgroundColor: '#1D1D20' }"), 'Android fallback is not a flat graphite fill');
});

test('A-G shell resolves every visual role from the canonical 13-theme palette', () => {
  const source = read('components/paywall/PaywallLiquidGlass.tsx');
  assert.ok(source.includes("import { liquidGlassTokens"), 'shell imports the canonical Liquid Glass registry');
  assert.ok(source.includes('const { liquidGlassThemeId } = useTheme()'), 'shell reads the live approved theme id');
  assert.ok(source.includes('liquidGlassTokens(liquidGlassThemeId)'), 'shell resolves the live material tokens');
  assert.ok(!source.includes('const C = {'), 'module-level graphite palette cannot mask Plus tints');
  for (const role of ['g.bgTop', 'g.bg', 'g.bgBottom', 'g.card', 'g.sheet', 'g.opaqueControl', 'g.glassEdge', 'g.lightTint', 'g.cta', 'g.ctaInk', 'g.text', 'g.secondary', 'g.line']) {
    assert.ok(source.includes(role), `missing live role ${role}`);
  }
  for (const promoRole of ['urgencyCurrentPriceText: g.text', 'urgencyStrikethroughColor: g.secondary', 'urgencyLabelText: g.secondary']) {
    assert.ok(source.includes(promoRole), `promo still inherits legacy graphite role ${promoRole}`);
  }

  const paletteSource = read('constants/liquidGlassThemePalette.ts');
  const paletteCode = ts.transpileModule(paletteSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const paletteExports = {};
  new Function('exports', paletteCode)(paletteExports);
  assert.equal(paletteExports.LIQUID_GLASS_THEME_IDS.length, 13, 'canonical registry remains complete');
  assert.equal(new Set(paletteExports.LIQUID_GLASS_THEME_IDS).size, 13, 'canonical ids remain unique');
});

test('dock actions wrap instead of truncating at large text sizes', () => {
  const source = read('components/paywall/PaywallLiquidGlass.tsx');
  assert.match(source, /dockLinks:[^\n]*flexWrap:\s*'wrap'/, 'dock actions wrap');
  assert.ok(!/numberOfLines|ellipsizeMode/.test(source), 'Liquid Glass copy is never truncated');
});
