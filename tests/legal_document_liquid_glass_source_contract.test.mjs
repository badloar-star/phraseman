import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const COMPONENT_PATH = 'components/legal/LegalDocumentSheet.tsx';
const PRIVACY_PATH = 'app/privacy_screen.tsx';
const TERMS_PATH = 'app/terms_screen.tsx';
const componentSource = fs.existsSync(COMPONENT_PATH) ? fs.readFileSync(COMPONENT_PATH, 'utf8') : '';
const privacySource = fs.readFileSync(PRIVACY_PATH, 'utf8');
const termsSource = fs.readFileSync(TERMS_PATH, 'utf8');

const LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const TERMS_TITLES = [
  'Условия использования', 'Умови використання', 'Terms of Use', 'Términos de uso', 'Termos de uso',
  'Điều khoản sử dụng', 'Ketentuan penggunaan', 'Kullanım Koşulları', 'Warunki korzystania',
];
const PRIVACY_EXTERNAL_LABELS = [
  'Открыть политику на сайте Knowly', 'Відкрити політику на сайті Knowly', 'Open the policy on knowlyapps.com',
  'Abrir la política en knowlyapps.com', 'Abrir a política em knowlyapps.com', 'Mở chính sách trên knowlyapps.com',
  'Buka kebijakan di knowlyapps.com', 'Politikayı knowlyapps.com üzerinde aç', 'Otwórz politykę na knowlyapps.com',
];
const TERMS_EXTERNAL_LABELS = [
  'Открыть условия на сайте Knowly', 'Відкрити умови на сайті Knowly', 'Open the terms on knowlyapps.com',
  'Abrir los términos en knowlyapps.com', 'Abrir os termos em knowlyapps.com', 'Mở điều khoản trên knowlyapps.com',
  'Buka ketentuan di knowlyapps.com', 'Şartları knowlyapps.com üzerinde aç', 'Otwórz warunki na knowlyapps.com',
];
const CLOSE_LABELS = ['Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij'];
const THEME_IDS = ['graphite', 'polar', 'slate', 'ink', 'lavender', 'iris', 'rose', 'terracotta', 'taupe', 'olive', 'sage', 'eucalyptus', 'marine'];

const LEGAL_FILES = [
  // зачем (30.09): политика обновлена по «да» владельца (визитка Про, опрос дня, Шпиль, D128 озвучка) — хеши сдвинуты осознанно.
  ['legal/privacy_policy_en.json', 'app/legal/privacy_policy_en.json', 'ba251cd69acb80145b6041dc585c86fbca6b33d1916a724f9c2a181033aadc28'],
  ['legal/privacy_policy_en_ios.json', 'app/legal/privacy_policy_en_ios.json', '6c1d3cbae4e08262d14a416963180ff6b506e3732850082695388064a45ac6c9'],
  ['legal/terms_of_use_en.json', 'app/legal/terms_of_use_en.json', '0800a1132761b91756da591c07fb15d1989456d22ad048ae9e2759c71990e9c4'],
  ['legal/terms_of_use_en_ios.json', 'app/legal/terms_of_use_en_ios.json', 'f081fe90fdd3248e677266c9e7970c7a8985249a55c9412658c608b38a4dfe02'],
];

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const transpile = (source, filename) => ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  fileName: filename,
  reportDiagnostics: true,
});

const visit = node => Array.isArray(node)
  ? node.flatMap(visit)
  : node && typeof node === 'object' ? [node, ...visit(node.props?.children)] : [];
const flattenStyle = style => Array.isArray(style)
  ? Object.assign({}, ...style.map(flattenStyle))
  : style && typeof style === 'object' ? style : {};
const findByTestId = (tree, testID) => visit(tree).find(node => node.props?.testID === testID);

function reactStub() {
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...(props ?? {}), children } }),
    memo: component => component,
    useCallback: callback => callback,
    useMemo: factory => factory(),
  };
  return { __esModule: true, default: React, ...React };
}

function executeModule(source, filename, modules) {
  const result = transpile(source, filename);
  assert.equal(result.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0, `${filename} transpiles`);
  const module = { exports: {} };
  vm.runInNewContext(result.outputText, {
    module,
    exports: module.exports,
    require: name => {
      assert.ok(name in modules, `${filename} uses expected dependency ${name}`);
      return modules[name];
    },
  }, { filename });
  return module.exports;
}

function loadRoute(kind, { lang, os }) {
  const calls = { sequence: [], back: [] };
  const LegalDocumentSheet = 'LegalDocumentSheet';
  const privacyGeneric = JSON.parse(fs.readFileSync('app/legal/privacy_policy_en.json', 'utf8'));
  const privacyIos = JSON.parse(fs.readFileSync('app/legal/privacy_policy_en_ios.json', 'utf8'));
  const termsGeneric = JSON.parse(fs.readFileSync('app/legal/terms_of_use_en.json', 'utf8'));
  const termsIos = JSON.parse(fs.readFileSync('app/legal/terms_of_use_en_ios.json', 'utf8'));
  const modules = {
    react: reactStub(),
    'react-native': { Linking: { openURL: url => { calls.sequence.push(`url:${url}`); return Promise.resolve(); } } },
    'expo-router': { useRouter: () => ({ id: 'router' }) },
    '../components/LangContext': { useLang: () => ({ lang }) },
    '../components/legal/LegalDocumentSheet': { __esModule: true, default: LegalDocumentSheet },
    '../constants/i18n': { triLang: (active, copy) => copy[active] },
    '../hooks/use-haptics': { hapticTap: () => calls.sequence.push('haptic') },
    './config': {
      KNOWLY_LEGAL_PRIVACY_URL: 'https://knowlyapps.com/legal/privacy/',
      KNOWLY_LEGAL_TERMS_URL: 'https://knowlyapps.com/legal/terms/',
    },
    './legal/privacy_policy_en.json': privacyGeneric,
    './legal/privacy_policy_en_ios.json': privacyIos,
    './legal/terms_of_use_en.json': termsGeneric,
    './legal/terms_of_use_en_ios.json': termsIos,
    './navigation_back': { safeRouterBack: (_router, fallback) => calls.back.push(fallback) },
    './platform_ui_preview': { useEffectivePlatformOS: () => os },
  };
  const source = kind === 'privacy' ? privacySource : termsSource;
  const exports = executeModule(source, `${kind}_screen.tsx`, modules);
  return { calls, tree: exports.default(), privacyGeneric, privacyIos, termsGeneric, termsIos };
}

function loadComponent({ fontSize = 'medium', uiScale = 1, themeId = 'graphite' } = {}) {
  assert.notEqual(componentSource, '', 'the shared legal document component exists');
  const modules = {
    react: reactStub(),
    'react-native': { Text: 'Text', View: 'View' },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: 'Ionicons' },
    '../BouncyScrollView': { __esModule: true, default: 'BouncyScrollView' },
    '../ContentWrap': { __esModule: true, default: 'ContentWrap' },
    '../PressableHybrid': { __esModule: true, default: 'PressableHybrid' },
    '../SafeLinearGradient': { __esModule: true, default: 'SafeLinearGradient' },
    '../ScreenGradient': { __esModule: true, default: 'ScreenGradient' },
    '../ThemeContext': {
      FONT_SCALE: { small: 1, medium: 1.15, large: 1.3 },
      useTheme: () => ({
        fontSize,
        uiScale,
        liquidGlassThemeId: themeId,
        theme: { textPrimary: '#primary' },
      }),
    },
    '../../constants/liquidGlassThemePalette': {
      liquidGlassTokens: id => ({ opaqueCard: `opaque-${id}`, opaqueControl: `control-${id}`, glassEdge: `edge-${id}`, lightTint: `tint-${id}`, secondary: `secondary-${id}`, selected: `selected-${id}` }),
    },
    '../../app/stable_safe_area_metrics': { useStableSafeAreaInsets: () => ({ top: 11, right: 12, bottom: 13, left: 14 }) },
  };
  const exports = executeModule(componentSource, COMPONENT_PATH, modules);
  const props = {
    title: 'A title long enough to wrap without clipping',
    closeAccessibilityLabel: 'Close',
    externalAccessibilityLabel: 'Open externally',
    sections: [{ heading: 'First', body: 'First body' }, { heading: 'Second', body: 'Second body' }],
    onClose: () => undefined,
    onOpenExternal: () => undefined,
  };
  return { props, tree: exports.default(props) };
}

test('all protected legal copy files retain exact hashes and byte-identical mirrors', () => {
  for (const [rootPath, appPath, expectedHash] of LEGAL_FILES) {
    const rootBytes = fs.readFileSync(rootPath);
    const appBytes = fs.readFileSync(appPath);
    assert.equal(sha256(rootBytes), expectedHash, `${rootPath} hash`);
    assert.equal(sha256(appBytes), expectedHash, `${appPath} hash`);
    assert.equal(Buffer.compare(rootBytes, appBytes), 0, `${rootPath} and ${appPath} remain byte-identical`);
  }
});

test('actual route wrappers preserve platform-specific section arrays and all localized titles and action labels', () => {
  for (const os of ['ios', 'android']) {
    LOCALES.forEach((lang, index) => {
      const privacy = loadRoute('privacy', { lang, os });
      assert.equal(privacy.tree.type, 'LegalDocumentSheet');
      assert.equal(privacy.tree.props.title, 'Privacy Policy');
      assert.equal(privacy.tree.props.externalAccessibilityLabel, PRIVACY_EXTERNAL_LABELS[index]);
      assert.equal(privacy.tree.props.closeAccessibilityLabel, CLOSE_LABELS[index]);
      assert.deepEqual(privacy.tree.props.sections, os === 'ios' ? privacy.privacyIos : privacy.privacyGeneric);

      const terms = loadRoute('terms', { lang, os });
      assert.equal(terms.tree.type, 'LegalDocumentSheet');
      assert.equal(terms.tree.props.title, TERMS_TITLES[index]);
      assert.equal(terms.tree.props.externalAccessibilityLabel, TERMS_EXTERNAL_LABELS[index]);
      assert.equal(terms.tree.props.closeAccessibilityLabel, CLOSE_LABELS[index]);
      assert.deepEqual(terms.tree.props.sections, os === 'ios' ? terms.termsIos : terms.termsGeneric);
    });
  }
});

test('actual wrapper callbacks preserve safe fallback and exactly one ordered haptic before each external URL', () => {
  for (const [kind, url] of [
    ['privacy', 'https://knowlyapps.com/legal/privacy/'],
    ['terms', 'https://knowlyapps.com/legal/terms/'],
  ]) {
    const harness = loadRoute(kind, { lang: 'en', os: 'android' });
    harness.tree.props.onClose();
    assert.deepEqual(harness.calls.back, ['/(tabs)/settings']);
    assert.deepEqual(harness.calls.sequence, [], `${kind} close callback does not duplicate wrapper haptic`);
    harness.tree.props.onOpenExternal();
    assert.deepEqual(harness.calls.sequence, ['haptic', `url:${url}`]);
  }
});

test('actual compact header keeps centered wrapping title and scoped silent action feedback', () => {
  const { tree } = loadComponent();
  assert.equal(tree.type, 'ScreenGradient');
  assert.equal(tree.props.artBackdrop, 'settings');
  const header = findByTestId(tree, 'legal-document-header');
  const title = findByTestId(tree, 'legal-document-title');
  const close = findByTestId(tree, 'legal-document-close');
  const external = findByTestId(tree, 'legal-document-external');
  assert.ok(header && title && close && external);
  assert.equal(flattenStyle(header.props.style).height, undefined, 'header has no fixed height');
  assert.equal(flattenStyle(header.props.style).minHeight, 48);
  assert.equal(flattenStyle(title.props.style).textAlign, 'center');
  assert.equal(flattenStyle(title.props.style).flex, 1);
  assert.equal(title.props.numberOfLines, undefined);
  assert.equal(title.props.adjustsFontSizeToFit, undefined);
  assert.equal(title.props.maxFontSizeMultiplier, undefined);
  for (const action of [close, external]) {
    assert.equal(action.type, 'PressableHybrid');
    assert.deepEqual(action.props.hitSlop, 3);
    assert.equal(flattenStyle(action.props.contentStyle).width, 42);
    assert.equal(flattenStyle(action.props.contentStyle).height, 42);
    assert.equal(flattenStyle(action.props.contentStyle).borderRadius, 21);
    assert.equal(action.props.withSound, false);
  }
  assert.equal(close.props.withHaptic, true, 'close retains its one wrapper haptic');
  assert.equal(external.props.withHaptic, false, 'external callback owns its one ordered haptic');
  const closeIcon = visit(close).find(node => node.type === 'Ionicons');
  const externalIcon = visit(external).find(node => node.type === 'Ionicons');
  assert.equal(closeIcon.props.size, 20);
  assert.equal(externalIcon.props.size, 19);
  assert.match(externalIcon.props.name, /open|arrow/);
});

test('actual document card is opaque, 13-theme aware, width-clamped, safe on four edges, and flex-bounded below its header', () => {
  for (const themeId of THEME_IDS) {
    const { tree } = loadComponent({ themeId });
    const safeFrame = findByTestId(tree, 'legal-document-safe-frame');
    assert.deepEqual(
      { paddingTop: flattenStyle(safeFrame.props.style).paddingTop, paddingRight: flattenStyle(safeFrame.props.style).paddingRight, paddingBottom: flattenStyle(safeFrame.props.style).paddingBottom, paddingLeft: flattenStyle(safeFrame.props.style).paddingLeft },
      { paddingTop: 11, paddingRight: 12, paddingBottom: 13, paddingLeft: 14 },
    );
    assert.ok(visit(tree).some(node => node.type === 'ContentWrap'), 'content width is clamped');
    const cardStyle = flattenStyle(findByTestId(tree, 'legal-document-card').props.style);
    assert.equal(cardStyle.backgroundColor, `opaque-${themeId}`);
    assert.equal(cardStyle.borderRadius, 22);
    assert.equal(cardStyle.marginTop, 18);
    assert.equal(cardStyle.marginHorizontal, 20);
    assert.equal(cardStyle.maxHeight, 690);
    assert.equal(cardStyle.flex, 1);
    assert.equal(cardStyle.flexShrink, 1);
    assert.equal(cardStyle.minHeight, 0);
    const sheen = findByTestId(tree, 'legal-document-card-sheen');
    assert.equal(sheen.type, 'SafeLinearGradient');
    assert.equal(sheen.props.pointerEvents, 'none');
    assert.deepEqual(Array.from(sheen.props.colors), [`selected-${themeId}`, 'transparent']);
    assert.equal(flattenStyle(sheen.props.style).position, 'absolute');
    assert.equal(flattenStyle(sheen.props.style).inset, 0);
    const scroll = findByTestId(tree, 'legal-document-scroll');
    assert.equal(scroll.type, 'BouncyScrollView');
    assert.equal(flattenStyle(scroll.props.style).flex, 1);
    assert.equal(flattenStyle(scroll.props.contentContainerStyle).padding, 20);
    assert.equal(findByTestId(tree, 'legal-document-header').props.children.includes(scroll), false, 'body scroll is outside the header');
  }
});

test('actual section nodes implement normalized font roles, spacing, and uncapped full wrapping', () => {
  const { tree } = loadComponent({ fontSize: 'large', uiScale: 1.1 });
  const designScale = 1.3 / 1.15 * 1.1;
  const scaled = value => Math.round(value * designScale);
  const firstSection = findByTestId(tree, 'legal-document-section-0');
  const secondSection = findByTestId(tree, 'legal-document-section-1');
  assert.equal(flattenStyle(firstSection.props.style).marginBottom, 22);
  assert.equal(flattenStyle(secondSection.props.style).marginBottom, 0);
  const firstHeading = findByTestId(tree, 'legal-document-heading-0');
  const secondHeading = findByTestId(tree, 'legal-document-heading-1');
  const firstBody = findByTestId(tree, 'legal-document-body-0');
  const secondBody = findByTestId(tree, 'legal-document-body-1');
  assert.deepEqual(
    [flattenStyle(firstHeading.props.style).fontSize, flattenStyle(firstHeading.props.style).lineHeight, flattenStyle(firstHeading.props.style).fontWeight],
    [scaled(19), scaled(24), '700'],
  );
  assert.deepEqual(
    [flattenStyle(secondHeading.props.style).fontSize, flattenStyle(secondHeading.props.style).lineHeight, flattenStyle(secondHeading.props.style).fontWeight],
    [scaled(16), scaled(21), '700'],
  );
  for (const [body, gap] of [[firstBody, 9], [secondBody, 7]]) {
    assert.deepEqual(
      [flattenStyle(body.props.style).fontSize, flattenStyle(body.props.style).lineHeight, flattenStyle(body.props.style).fontWeight, flattenStyle(body.props.style).marginTop],
      [scaled(15), scaled(24), '400', gap],
    );
  }
  for (const text of [firstHeading, secondHeading, firstBody, secondBody]) {
    assert.equal(text.props.allowFontScaling, true);
    assert.equal(text.props.numberOfLines, undefined);
    assert.equal(text.props.adjustsFontSizeToFit, undefined);
    assert.equal(text.props.maxFontSizeMultiplier, undefined);
  }
});

test('implementation stays presentation-only and avoids forbidden shared-header, blur, timers, and capped text paths', () => {
  assert.match(componentSource, /FONT_SCALE\[fontSize\]\s*\/\s*FONT_SCALE\.medium\s*\*\s*uiScale/);
  assert.doesNotMatch(componentSource, /SectionSheetHeader|TonalSurface|BlurView|setTimeout|setInterval|Linking|hapticTap|safeRouterBack/);
  assert.doesNotMatch(componentSource, /numberOfLines|adjustsFontSizeToFit|maxFontSizeMultiplier/);
  for (const source of [privacySource, termsSource]) {
    assert.doesNotMatch(source, /SectionSheetHeader|SafeAreaView|BouncyScrollView|liquidGlassTokens|useStableSafeAreaInsets/);
    assert.match(source, /useEffectivePlatformOS\(\)/);
    assert.match(source, /useMemo\(/);
  }
});

test('all owned TSX sources remain syntactically transpileable', () => {
  for (const [path, source] of [[COMPONENT_PATH, componentSource], [PRIVACY_PATH, privacySource], [TERMS_PATH, termsSource]]) {
    assert.notEqual(source, '', `${path} exists`);
    const result = transpile(source, path);
    assert.equal(result.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0, path);
  }
});
