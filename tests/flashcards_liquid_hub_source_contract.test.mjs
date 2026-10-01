import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const read = (name) => readFileSync(join(process.cwd(), 'app', 'flashcards', name), 'utf8');
const HUB_SOURCE = read('FlashcardsHubScreen.tsx');
const COMMUNITY_SOURCE = read('SavedTopCommunityPacks.tsx');
const THEME_IDS = [
  'graphite', 'polar', 'slate', 'ink', 'lavender', 'iris', 'rose',
  'terracotta', 'taupe', 'olive', 'sage', 'eucalyptus', 'marine',
];
const PROTECTED_AST = '92db73a8934c603855540f4463f931d38bed73d30bad259e0e8ddc0963e99c9b';
const HEADER_GLASS_BODY = '715db3b10a0abee044e76b8baed73f7ad5de81fb96a669ef0381f776fdf98019';
const DEPENDENCY_HASHES = {
  'app/flashcards/marketplace.ts': '6be20d876e0d6d44fd03c129b11566488545b59f97044d8c3e48ef4f01f04537',
  'app/community_packs/packAuthorNames.ts': '101a068d8ec4e6fe9bc1dfb430c6da9695458b59391d7bf18012932ad7e70c45',
  'app/community_packs/localAuthorPacks.ts': '0e29c9c4020533521ea6aaab723579163de4f919d5b94c91f808fb7543b47147',
  'app/community_packs/CommunityPackSocialBar.tsx': 'c05a2d6665d8f9b5a68d773f047c77cf8b1daa8c380e63daef4f525de87972cc',
  'constants/liquidGlassThemePalette.ts': '310804f71c92049bca92e155b2e16d2f25e77dc18e1d699ad9925b66c88b9b5d',
  'app/flashcards/packMarketplaceIcons.ts': '4d7d168a867514b096dc3a5541503db4759e68a2359020cb02cf695316f78b11',
  'hooks/useFlashcardTrainingQuotaPreview.ts': 'c4b61412f1e7530bf202e6c1f5053007875f763e28f12a18aebc27424bf6f0aa',
  'app/flashcards/training_entry.ts': '7bae7128ede11dfce800bb0f9f22f5d9a61ba195009346fb98a7b24b3c9d9a85',
  'app/flashcards/myPacksCountCache.ts': '5fa8c823f8a34974ee2a29327c0a3152beafdd791f75eee3a2e7a9c5dc7a91f7',
  'app/flashcards/saved_language_contour.ts': '6c6a2dc0f839bed2298eceb9c7c0d3237c8c6c4f5c9894c74075ab290d33af7b',
};

const hash = value => createHash('sha256').update(value).digest('hex');
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

function parse(name, source) {
  return ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function protectedAst() {
  const items = [];
  for (const [name, source] of [['hub', HUB_SOURCE], ['community', COMMUNITY_SOURCE]]) {
    const file = parse(name, source);
    const walk = node => {
      if (ts.isFunctionDeclaration(node) && ['sameCatalog', 'sameIds', 'mergeCatalogs', 'pickTopCommunityPacks'].includes(node.name?.text)) {
        items.push([node.name.text, printer.printNode(ts.EmitHint.Unspecified, node, file)]);
      }
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
        && ['reloadCatalog', 'openTopPack', 'openCreatePack', 'openTrainingPaywall', 'chooseMode', 'finishModeSheetDismissal'].includes(node.name.text)) {
        items.push([node.name.text, printer.printNode(ts.EmitHint.Unspecified, node.initializer, file)]);
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'useFocusEffect') {
        items.push(['useFocusEffect', printer.printNode(ts.EmitHint.Unspecified, node, file)]);
      }
      ts.forEachChild(node, walk);
    };
    walk(file);
  }
  return hash(JSON.stringify(items.sort(([left], [right]) => left.localeCompare(right))));
}

function headerGlassBodyHash() {
  const file = parse('hub', HUB_SOURCE);
  let body = null;
  file.forEachChild(node => {
    if (ts.isFunctionDeclaration(node) && ['GlassSheen', 'HeaderGlassSheen'].includes(node.name?.text)) body = node.body;
  });
  assert.ok(body, 'header glass helper exists');
  return hash(printer.printNode(ts.EmitHint.Unspecified, body, file));
}

function flatStyle(value) {
  if (Array.isArray(value)) return Object.assign({}, ...value.filter(Boolean).map(flatStyle));
  return value && typeof value === 'object' ? value : {};
}

function visit(node, result = []) {
  if (node == null || typeof node === 'boolean') return result;
  if (Array.isArray(node)) {
    node.forEach(child => visit(child, result));
    return result;
  }
  if (typeof node !== 'object') return result;
  result.push(node);
  visit(node.props?.children, result);
  return result;
}

function byId(tree, testID) {
  const node = visit(tree).find(item => item.props?.testID === testID);
  assert.ok(node, `missing rendered node ${testID}`);
  return node;
}

// зачем (темы 2.0): палитра импортирует соседние модули constants/ (цветовые помощники,
// уровни цвета) — загружаем их тем же транспилятором, остальное (типы) — пустой объект.
function loadConstantsModule(name, cache = new Map()) {
  if (cache.has(name)) return cache.get(name);
  const source = readFileSync(join(process.cwd(), 'constants', `${name}.ts`), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  cache.set(name, module.exports);
  const localRequire = (id) => (/^\.\/liquidGlass/.test(id) ? loadConstantsModule(id.slice(2), cache) : {});
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  cache.set(name, module.exports);
  return module.exports;
}

function actualThemeRegistry() {
  return loadConstantsModule('liquidGlassThemePalette');
}

function createRenderHarness(source, expose, { themeId = 'graphite' } = {}) {
  const calls = { haptic: 0, opened: [] };
  const stateSlots = [];
  let hookCursor = 0;
  let stateUpdates = 0;
  const Fragment = Symbol('Fragment');
  const createElement = (type, props, ...children) => {
    const nextProps = { ...(props ?? {}), children: children.length <= 1 ? children[0] : children };
    if (type === Fragment) return nextProps.children;
    if (typeof type === 'function') return type(nextProps);
    return { type, props: nextProps };
  };
  const React = {
    createElement,
    Fragment,
    useMemo: factory => factory(),
    useCallback: callback => callback,
    useEffect: () => {},
    useRef: value => ({ current: value }),
    useState: initial => {
      const index = hookCursor;
      hookCursor += 1;
      if (!(index in stateSlots)) stateSlots[index] = typeof initial === 'function' ? initial() : initial;
      return [stateSlots[index], update => {
        const next = typeof update === 'function' ? update(stateSlots[index]) : update;
        if (next !== stateSlots[index]) {
          stateSlots[index] = next;
          stateUpdates += 1;
        }
      }];
    },
  };
  const palette = actualThemeRegistry();
  const host = type => props => createElement(type, props, props.children);
  const reactNative = {
    ActivityIndicator: 'ActivityIndicator',
    Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View',
    Platform: { OS: 'android' },
    StyleSheet: { absoluteFill: { position: 'absolute', inset: 0 }, create: styles => styles },
  };
  const generic = new Proxy(() => null, { get: () => generic });
  const ionicons = Object.assign(host('Ionicons'), {
    glyphMap: Object.freeze({
      'albums-outline': 1,
      'airplane-outline': 2,
      'briefcase-outline': 3,
    }),
  });
  const stubs = {
    react: { __esModule: true, default: React, ...React },
    'react-native': reactNative,
    '@expo/vector-icons/Ionicons': { __esModule: true, default: ionicons },
    'expo-blur': { BlurView: host('BlurView') },
    'expo-image': { Image: host('Image') },
    '../../components/SafeLinearGradient': { LinearGradient: host('LinearGradient') },
    '../../components/text-integrity/FlowText': { FlowText: host('FlowText') },
    '../../components/ThemeContext': { useTheme: () => ({ liquidGlassThemeId: themeId, theme: { textSecond: '#aaa', textMuted: '#999', accent: '#fff' } }) },
    '../../constants/liquidGlassThemePalette': palette,
    '../../constants/i18n': { triLang: (lang, labels) => labels[lang] ?? labels.en },
    '../../hooks/use-haptics': { hapticTap: () => { calls.haptic += 1; } },
    './marketplace': {
      packTitleForInterface: pack => pack.titleRu,
      packCategoryIonIcon: category => ({
        business: 'briefcase-outline', travel: 'airplane-outline', invalid: 'not-an-icon', empty: '', prototype: 'toString',
      })[category] ?? 'albums-outline',
    },
    '../community_packs/packAuthorNames': { useCommunityAuthorName: pack => pack.authorName },
    '../community_packs/localAuthorPacks': { isLocalAuthorPackId: id => id.startsWith('local:') },
    './packMarketplaceIcons': { bundledPackTilePng: () => 'legacy-png', packTileImageForPack: () => 'legacy-art' },
    '../community_packs/CommunityPackSocialBar': { __esModule: true, default: host('CommunityPackSocialBar') },
  };
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const localRequire = id => stubs[id] ?? generic;
  new Function('require', 'module', 'exports', `${output}\n${expose}`)(localRequire, module, module.exports);
  return {
    exports: module.exports,
    calls,
    palette,
    render: renderFn => { hookCursor = 0; return renderFn(); },
    stateUpdates: () => stateUpdates,
  };
}

function physicalGradientAngle(gradient, width, height) {
  const dx = (gradient.props.end.x - gradient.props.start.x) * width;
  const dy = (gradient.props.end.y - gradient.props.start.y) * height;
  return Math.atan2(dy, dx) * 180 / Math.PI;
}

function assertPhysicalGradientGeometry(gradient, width, height) {
  const radians = 20 * Math.PI / 180;
  const dx = (gradient.props.end.x - gradient.props.start.x) * width;
  const dy = (gradient.props.end.y - gradient.props.start.y) * height;
  const expectedLength = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
  assert.ok(Math.abs(Math.hypot(dx, dy) - expectedLength) < 1e-9, 'gradient spans the exact CSS projection length');
  assert.ok(Math.abs((gradient.props.start.x + gradient.props.end.x) / 2 - 0.5) < 1e-12, 'gradient x midpoint stays centered');
  assert.ok(Math.abs((gradient.props.start.y + gradient.props.end.y) / 2 - 0.5) < 1e-12, 'gradient y midpoint stays centered');
  assert.ok(Math.abs(physicalGradientAngle(gradient, width, height) - 20) < 1e-9, 'gradient keeps the physical CSS 110deg angle');
}

const samplePack = (overrides = {}) => ({
  id: 'community:one', titleRu: 'Очень длинное название набора без обрезания', codeName: 'One',
  authorName: 'Автор', category: 'business', cardCount: 24, likesCount: 4, addedCount: 9,
  commentsCount: 2, isCommunityUgc: true, ...overrides,
});

test('protects hub focus, routes, quota callbacks, ranking, header material and dependencies', () => {
  assert.equal(protectedAst(), PROTECTED_AST);
  assert.equal(headerGlassBodyHash(), HEADER_GLASS_BODY);
  for (const [relativePath, expected] of Object.entries(DEPENDENCY_HASHES)) {
    assert.equal(hash(readFileSync(join(process.cwd(), relativePath))), expected, relativePath);
  }
});

test('hub keeps exact approved library order, labels and live routes', () => {
  const source = read('FlashcardsHubScreen.tsx');
  const rows = [...source.matchAll(/testID="fc-cards-hub-library-(saved|mine|community|video)"/g)].map((match) => match[1]);
  assert.deepEqual(rows, ['saved', 'mine', 'community', 'video']);
  for (const text of ['Сохранённые', 'Личная коллекция', 'Мои наборы', 'Созданные и добавленные', 'Наборы пользователей', 'Открыть каталог', 'Наборы из видео', 'Карточки по видео']) {
    assert.ok(source.includes(text), `missing approved label: ${text}`);
  }
  for (const route of ["cat: 'saved', from: 'hub'", "'/flashcards_my_packs'", "'/flashcards_packs'", "'/flashcards_video_packs'"]) {
    assert.ok(source.includes(route), `missing route: ${route}`);
  }
  for (const token of ['count={savedCount}', 'count={myPackCount}', 'count={communityPackCount}', 'peekSelectedSavedContour', 'loadSelectedSavedContour', 'Intl.NumberFormat']) {
    assert.ok(source.includes(token), `live or honest library count missing: ${token}`);
  }
});

test('Hub catalog equality reacts to changed visible pack metadata and cover without deep comparisons', () => {
  const source = read('FlashcardsHubScreen.tsx');
  const equality = source.slice(source.indexOf('function sameCatalog('), source.indexOf('/** Тот же список id'));
  for (const token of ['titleRu', 'titleUk', 'titleEs', 'authorName', 'cardCount', 'isCommunityUgc', 'packTileArtRevision']) {
    assert.ok(equality.includes(token), `stale community rail risk: ${token}`);
  }
});

test('latest hub has compact header, live segments, library before horizontal popular rail and anchored train CTA', () => {
  const source = read('FlashcardsHubScreen.tsx');
  for (const token of ['useStableSafeAreaInsets', 'paddingTop: insets.top', 'paddingBottom: insets.bottom', 'fc-cards-hub-segment-best', 'fc-cards-hub-segment-mine', 'fc-cards-hub-segment-community', 'onSeeAll=', 'styles.trainDock']) {
    assert.ok(source.includes(token), `missing hub contract: ${token}`);
  }
  assert.ok(source.indexOf('styles.header') < source.indexOf('styles.segments'));
  assert.ok(source.indexOf('fc-cards-hub-library-saved') < source.indexOf('<SavedTopCommunityPacks'));
  assert.ok(source.indexOf('</ScrollView>') < source.indexOf('styles.trainDock'));
});

test('existing create-pack and quota paywall routes remain reachable from the Hub', () => {
  const source = read('FlashcardsHubScreen.tsx');
  assert.match(source, /testID="fc-cards-hub-create-pack"/);
  assert.match(source, /buildFcCreateRoute\('pack'\)/);
  assert.match(source, /openTrainingPaywall\('flashcard_training', 'flashcards_hub_train'\)/);
  assert.match(source, /disabled=\{!trainingLocked && !trainingEntryReady\}/);
});

test.todo('owner must resolve whether Hub search is global or opens a destination-specific search before adding a live header action');

test('community highlights use real cover tiles in horizontal rail and preserve live loading and retry', () => {
  const source = read('SavedTopCommunityPacks.tsx');
  for (const token of ['packTitleForInterface(pack, lang)', 'useCommunityAuthorName(pack, lang)', 'pack.cardCount', 'openingPackId', 'onRetry', 'loading', 'CommunityPackSocialBar pack={pack}']) {
    assert.ok(source.includes(token), `missing real-data state: ${token}`);
  }
  assert.ok(source.includes('pickTopCommunityPacks(catalog, SHOWN)'), 'horizontal rail must keep additional real packs beyond the first three visible tiles');
  assert.match(source, /limit = COLS/, 'training setup keeps its existing three-suggestion default');
  assert.ok(source.includes('fc-cards-hub-see-all'), 'community section opens full catalog');
  assert.ok(source.includes('horizontal'), 'highlights are a horizontal rail');
  assert.ok(source.includes('const candidate = packCategoryIonIcon(category);'), 'local validator preserves the canonical category resolver');
  assert.ok(source.includes('communityPackIconName(pack.category)'), 'tiles validate the canonical category result');
  assert.doesNotMatch(source, /packTileImageForPack|bundledPackTilePng|ugcCardThemeKey|neon/i, 'retired appearance data cannot drive Hub tiles');
  assert.match(source, /cover: \{ width: 112, height: 112,/, 'community covers are exact 112dp squares');
  assert.match(source, /highlightRow: \{ width: 112 \}/, 'tile width matches the 112 dp mockup and leaves room for social indicators');
  assert.match(source, /rail: \{ flexDirection: 'row', gap: 10,/, 'rail uses the approved 10dp gap');
  assert.match(source, /sectionHeading: \{ minHeight: 44, marginTop: 20\.5, marginBottom: 2\.5,/, 'heading target compensates around the 21dp visual line');
  assert.doesNotMatch(source, /emptyCover|unavailableLabel|retryLabel/, 'зачем (владелец 01.10): пустая витрина = скелетон, без «недоступно» и «Повторить»');
  for (const token of ['styles.highlightBadge', 'styles.highlightTitle', 'styles.highlightAuthor', 'CommunityPackSocialBar', 'variant="tile"', 'styles.owned']) {
    assert.ok(source.includes(token), `restored popular indicator missing: ${token}`);
  }
});

test('actual library row keeps compact geometry and uses one opaque theme sheen without blur or rim', () => {
  for (const themeId of THEME_IDS) {
    const harness = createRenderHarness(HUB_SOURCE, 'exports.__LibraryRow = LibraryRow;', { themeId });
    const g = harness.palette.liquidGlassTokens(themeId);
    const tree = harness.exports.__LibraryRow({
      testID: 'library-probe', icon: 'people-outline', title: 'Наборы пользователей',
      subtitle: 'Открыть каталог без обрезания текста', count: 1200,
      countPendingLabel: 'Count loading', lang: 'ru', onPress: () => harness.calls.opened.push('library'),
    });
    const rowStyle = flatStyle(tree.props.style({ pressed: false }));
    assert.equal(rowStyle.minHeight, 58);
    assert.equal(rowStyle.borderRadius, 13);
    assert.equal(rowStyle.paddingVertical, 7);
    assert.equal(rowStyle.paddingLeft, 11);
    assert.equal(rowStyle.gap, 10);
    assert.equal(rowStyle.backgroundColor, g.opaqueCard);
    assert.equal(rowStyle.borderWidth, undefined);
    const sheen = byId(tree, 'library-probe-sheen');
    assert.equal(sheen.type, 'LinearGradient');
    assert.deepEqual(sheen.props.colors, ['rgba(239,241,255,0.09)', 'rgba(239,241,255,0)']);
    assert.deepEqual(sheen.props.locations, [0, 0.58]);
    for (const point of [sheen.props.start, sheen.props.end]) {
      assert.equal(Number.isFinite(point.x), true);
      assert.equal(Number.isFinite(point.y), true);
    }
    assert.equal(visit(tree).filter(node => node.type === 'LinearGradient').length, 1);
    assert.equal(visit(tree).some(node => node.type === 'BlurView'), false);
    const texts = visit(tree).filter(node => node.type === 'Text');
    assert.equal(texts.some(node => node.props.numberOfLines !== undefined), false);
    tree.props.onPress();
    assert.deepEqual(harness.calls.opened, ['library']);
  }
});

test('actual library sheen measures wide and expanded rows at the physical CSS 110deg angle', () => {
  const harness = createRenderHarness(
    HUB_SOURCE,
    'exports.__LibraryRowSheen = LibraryRowSheen; exports.__libraryRowGradientForSize = libraryRowGradientForSize;',
  );
  const renderSheen = () => harness.render(() => harness.exports.__LibraryRowSheen({ testID: 'angle-probe' }));
  let gradient = renderSheen();
  assert.deepEqual(gradient.props.colors, ['rgba(239,241,255,0.09)', 'rgba(239,241,255,0)']);
  assert.deepEqual(gradient.props.locations, [0, 0.58]);
  assert.equal(flatStyle(gradient.props.style).opacity, 0, 'unmeasured sheen stays hidden over the opaque card');
  for (const point of [gradient.props.start, gradient.props.end]) {
    assert.equal(Number.isFinite(point.x), true, 'unmeasured fallback x remains finite');
    assert.equal(Number.isFinite(point.y), true, 'unmeasured fallback y remains finite');
  }

  gradient.props.onLayout({ nativeEvent: { layout: { width: 300, height: 58 } } });
  assert.equal(harness.stateUpdates(), 1);
  gradient = renderSheen();
  assert.equal(flatStyle(gradient.props.style).opacity, 1, 'valid measured sheen becomes visible');
  assertPhysicalGradientGeometry(gradient, 300, 58);

  gradient.props.onLayout({ nativeEvent: { layout: { width: 300, height: 58 } } });
  assert.equal(harness.stateUpdates(), 1, 'unchanged layout does not schedule another state update');
  for (const invalid of [
    { width: 0, height: 58 }, { width: 300, height: 0 },
    { width: Number.NaN, height: 58 }, { width: Number.POSITIVE_INFINITY, height: 58 },
  ]) gradient.props.onLayout({ nativeEvent: { layout: invalid } });
  assert.equal(harness.stateUpdates(), 1, 'invalid geometry is ignored');
  gradient = renderSheen();
  assert.equal(flatStyle(gradient.props.style).opacity, 1, 'invalid geometry preserves the last valid visible sheen');

  gradient.props.onLayout({ nativeEvent: { layout: { width: 300, height: 116 } } });
  assert.equal(harness.stateUpdates(), 2);
  gradient = renderSheen();
  assertPhysicalGradientGeometry(gradient, 300, 116);
  const pure = harness.exports.__libraryRowGradientForSize(300, 58);
  assertPhysicalGradientGeometry({ props: pure }, 300, 58);
});

test('library sheen validator rejects tint, stop, angle, invalid-size and redundant-update regressions', () => {
  const validate = candidate => {
    const harness = createRenderHarness(
      candidate,
      'exports.__LibraryRowSheen = LibraryRowSheen;',
    );
    const renderSheen = () => harness.render(() => harness.exports.__LibraryRowSheen({ testID: 'mutation-angle' }));
    let gradient = renderSheen();
    assert.deepEqual(gradient.props.colors, ['rgba(239,241,255,0.09)', 'rgba(239,241,255,0)']);
    assert.deepEqual(gradient.props.locations, [0, 0.58]);
    assert.equal(flatStyle(gradient.props.style).opacity, 0);
    gradient.props.onLayout({ nativeEvent: { layout: { width: 300, height: 58 } } });
    gradient = renderSheen();
    assert.equal(flatStyle(gradient.props.style).opacity, 1);
    assertPhysicalGradientGeometry(gradient, 300, 58);
    gradient.props.onLayout({ nativeEvent: { layout: { width: 300, height: 58 } } });
    gradient.props.onLayout({ nativeEvent: { layout: { width: 0, height: 58 } } });
    assert.equal(harness.stateUpdates(), 1);
  };

  validate(HUB_SOURCE);
  for (const [index, mutation] of [
    HUB_SOURCE.replace('rgba(239,241,255,0.09)', 'rgba(255,255,255,0.09)'),
    HUB_SOURCE.replace('rgba(239,241,255,0)', 'transparent'),
    HUB_SOURCE.replace('rgba(239,241,255,0)', 'rgba(0,0,0,0)'),
    HUB_SOURCE.replace('locations={[0, 0.58]}', 'locations={[0, 1]}'),
    HUB_SOURCE.replace('const radians = 20 * Math.PI / 180;', 'const radians = 0;'),
    HUB_SOURCE.replace('const length = Math.abs(width * direction.x) + Math.abs(height * direction.y);', 'const length = 1;'),
    HUB_SOURCE.replace('if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;', 'if (false) return;'),
    HUB_SOURCE.replace('current.width === width && current.height === height', 'false'),
    HUB_SOURCE.replace('opacity: layout.width > 0 && layout.height > 0 ? 1 : 0', 'opacity: 1'),
  ].entries()) {
    assert.notEqual(mutation, HUB_SOURCE, `negative sheen mutation ${index + 1} target exists`);
    assert.throws(() => validate(mutation), `negative sheen mutation ${index + 1} must fail validation`);
  }
});

test('actual populated community rail is transparent outside 112dp category covers and preserves state and callbacks', () => {
  for (const themeId of THEME_IDS) {
    const themed = createRenderHarness(COMMUNITY_SOURCE, 'exports.__CommunityHighlightRow = CommunityHighlightRow;', { themeId });
    const themedTree = themed.exports.__CommunityHighlightRow({
      pack: samplePack(), lang: 'ru', owned: false, opening: false, disabled: false, onOpen: () => {},
    });
    const themedOuter = flatStyle(themedTree.props.style({ pressed: false }));
    const themedCover = flatStyle(byId(themedTree, 'saved-top-pack-cover-community:one').props.style);
    const tokens = themed.palette.liquidGlassTokens(themeId);
    assert.equal(themedOuter.backgroundColor, undefined, `${themeId}: outer remains transparent`);
    assert.equal(themedCover.backgroundColor, tokens.opaqueCard, `${themeId}: cover follows opaque theme material`);
    assert.equal(themedCover.borderColor, tokens.glassEdge, `${themeId}: cover rim follows theme`);
  }

  const harness = createRenderHarness(COMMUNITY_SOURCE, 'exports.__CommunityHighlightRow = CommunityHighlightRow;');
  const pack = samplePack();
  const tree = harness.exports.__CommunityHighlightRow({
    pack, lang: 'ru', owned: true, opening: true, disabled: false,
    onOpen: value => harness.calls.opened.push(value.id),
  });
  const outerStyle = flatStyle(tree.props.style({ pressed: false }));
  assert.equal(outerStyle.width, 112);
  for (const property of ['height', 'minHeight', 'padding', 'paddingHorizontal', 'paddingVertical', 'borderWidth', 'backgroundColor']) {
    assert.equal(outerStyle[property], undefined, `outer tile remains transparent: ${property}`);
  }
  const cover = byId(tree, `saved-top-pack-cover-${pack.id}`);
  const coverStyle = flatStyle(cover.props.style);
  assert.equal(coverStyle.width, 112);
  assert.equal(coverStyle.height, 112);
  assert.equal(coverStyle.borderRadius, 12);
  assert.equal(coverStyle.borderWidth, 1);
  const icon = visit(cover).find(node => node.type === 'Ionicons' && node.props.name === 'briefcase-outline');
  assert.ok(icon, 'category icon is rendered from the canonical resolver');
  assert.equal(visit(cover).some(node => node.type === 'Image'), false, 'retired cover art is absent');
  assert.equal(visit(tree).some(node => node.type === 'LinearGradient'), false, 'populated community tile stays plain opaque material');
  assert.ok(visit(cover).some(node => node.type === 'ActivityIndicator'), 'opening state remains visible');
  assert.ok(visit(cover).some(node => node.type === 'Ionicons' && node.props.name === 'checkmark-circle'), 'owned state remains visible');
  const title = byId(tree, `saved-top-pack-title-${pack.id}`);
  assert.deepEqual(flatStyle(title.props.style), { fontSize: 12, lineHeight: 16, fontWeight: '700', marginTop: 5, color: '#FFFFFF' });
  assert.equal(title.props.numberOfLines, undefined);
  const author = byId(tree, `saved-top-pack-author-${pack.id}`);
  assert.equal(flatStyle(author.props.style).fontSize, 10);
  assert.equal(flatStyle(author.props.style).marginTop, 1);
  const badge = byId(tree, `saved-top-pack-count-${pack.id}`);
  const badgeStyle = flatStyle(badge.props.style);
  assert.equal(badgeStyle.minHeight, 19);
  assert.equal(badgeStyle.height, undefined);
  const social = visit(tree).find(node => node.type === 'CommunityPackSocialBar');
  assert.equal(social.props.pack, pack);
  assert.equal(social.props.owned, true);
  assert.equal(social.props.variant, 'tile');
  tree.props.onPress();
  assert.equal(harness.calls.haptic, 1);
  assert.deepEqual(harness.calls.opened, [pack.id]);

  const disabledTree = harness.exports.__CommunityHighlightRow({
    pack: samplePack({ id: 'community:disabled', category: 'unknown' }), lang: 'ru',
    owned: false, opening: false, disabled: true, onOpen: () => {},
  });
  assert.equal(disabledTree.props.accessible, false);
  assert.deepEqual(byId(disabledTree, 'saved-top-pack-activation-community:disabled').props.accessibilityState, { disabled: true, busy: false });
  const disabledCover = byId(disabledTree, 'saved-top-pack-cover-community:disabled');
  assert.ok(visit(disabledCover).some(node => node.type === 'Ionicons' && node.props.name === 'albums-outline'));
});

test('community tile keeps the live social bar reachable beside one guarded activation group', () => {
  const validate = candidate => {
    const harness = createRenderHarness(candidate, 'exports.__CommunityHighlightRow = CommunityHighlightRow;');
    const pack = samplePack({ id: 'community:a11y' });
    const render = overrides => harness.exports.__CommunityHighlightRow({
      pack, lang: 'en', owned: true, opening: true, disabled: false,
      onOpen: value => harness.calls.opened.push(value.id), ...overrides,
    });
    const tree = render();
    assert.equal(tree.props.accessible, false, 'physical whole-tile Pressable must not mask descendants');
    assert.equal(tree.props.accessibilityLabel, undefined);
    const activation = byId(tree, 'saved-top-pack-activation-community:a11y');
    assert.equal(activation.props.accessible, true);
    assert.equal(activation.props.accessibilityRole, 'button');
    assert.equal(activation.props.accessibilityLabel, `${pack.titleRu}. ${pack.authorName}`);
    assert.deepEqual(activation.props.accessibilityState, { disabled: false, busy: true });
    assert.deepEqual(activation.props.accessibilityActions, [{ name: 'activate' }]);
    assert.equal(activation.props.onAccessibilityTap, tree.props.onPress, 'VoiceOver double-tap uses the same guarded activation adapter');
    assert.equal(visit(activation).some(node => node.type === 'CommunityPackSocialBar'), false, 'live counters stay outside the static activation group');
    assert.equal(visit(tree).filter(node => node.type === 'CommunityPackSocialBar').length, 1);

    tree.props.onPress();
    assert.equal(harness.calls.haptic, 1, 'physical activation gives one haptic');
    assert.deepEqual(harness.calls.opened, [pack.id]);
    activation.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } });
    assert.equal(harness.calls.haptic, 2, 'accessibility activation gives one haptic');
    assert.deepEqual(harness.calls.opened, [pack.id, pack.id]);
    activation.props.onAccessibilityTap();
    assert.equal(harness.calls.haptic, 3, 'VoiceOver double-tap gives one haptic');
    assert.deepEqual(harness.calls.opened, [pack.id, pack.id, pack.id]);
    activation.props.onAccessibilityAction({ nativeEvent: { actionName: 'magicTap' } });
    assert.equal(harness.calls.haptic, 3, 'unrelated accessibility actions are ignored');

    const disabled = render({ disabled: true, opening: false });
    const disabledActivation = byId(disabled, 'saved-top-pack-activation-community:a11y');
    assert.deepEqual(disabledActivation.props.accessibilityState, { disabled: true, busy: false });
    disabled.props.onPress();
    disabledActivation.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } });
    disabledActivation.props.onAccessibilityTap();
    assert.equal(harness.calls.haptic, 3, 'disabled physical and accessibility paths have no feedback');
    assert.deepEqual(harness.calls.opened, [pack.id, pack.id, pack.id]);
  };

  validate(COMMUNITY_SOURCE);
  for (const mutation of [
    COMMUNITY_SOURCE.replace('accessible={false}', 'accessible={true}'),
    COMMUNITY_SOURCE.replace('if (disabled) return;', ''),
    COMMUNITY_SOURCE.replace("actionName === 'activate'", "actionName === 'magicTap'"),
  ]) {
    assert.notEqual(mutation, COMMUNITY_SOURCE, 'negative accessibility mutation target exists');
    assert.throws(() => validate(mutation), 'accessibility regression mutation must fail');
  }
});

test('actual community ranking filters non-community and local-author packs and keeps the top ten order', () => {
  const harness = createRenderHarness(COMMUNITY_SOURCE, '');
  const catalog = [
    samplePack({ id: 'official:ignored', isCommunityUgc: false, likesCount: 99 }),
    samplePack({ id: 'local:ignored', likesCount: 98 }),
    ...Array.from({ length: 12 }, (_, index) => samplePack({
      id: `community:${String(index).padStart(2, '0')}`,
      likesCount: index,
      addedCount: 20 - index,
    })),
  ];
  const ranked = harness.exports.pickTopCommunityPacks(catalog, 10);
  assert.equal(ranked.length, 10);
  assert.deepEqual(ranked.map(pack => pack.id), [
    'community:11', 'community:10', 'community:09', 'community:08', 'community:07',
    'community:06', 'community:05', 'community:04', 'community:03', 'community:02',
  ]);
});

test('community category icons accept only own Ionicons glyph names and fall back safely', () => {
  const validate = candidate => {
    const harness = createRenderHarness(
      candidate,
      'exports.__communityPackIconName = communityPackIconName; exports.__CommunityHighlightRow = CommunityHighlightRow;',
    );
    assert.equal(harness.exports.__communityPackIconName('business'), 'briefcase-outline');
    assert.equal(harness.exports.__communityPackIconName('travel'), 'airplane-outline');
    for (const category of ['invalid', 'empty', 'prototype']) {
      assert.equal(harness.exports.__communityPackIconName(category), 'albums-outline', `${category}: invalid canonical result falls back`);
      const tree = harness.exports.__CommunityHighlightRow({
        pack: samplePack({ id: `community:${category}`, category }), lang: 'en',
        owned: false, opening: false, disabled: false, onOpen: () => {},
      });
      assert.ok(visit(tree).some(node => node.type === 'Ionicons' && node.props.name === 'albums-outline'));
    }
    assert.doesNotMatch(candidate, /name=\{[^\n]*as never/, 'category icon must not bypass Ionicons name validation');
  };

  validate(COMMUNITY_SOURCE);
  for (const mutation of [
    COMMUNITY_SOURCE.replace(
      "Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, candidate)",
      "typeof candidate === 'string'",
    ),
    COMMUNITY_SOURCE.replace(
      "return isIoniconName(candidate) ? candidate : 'albums-outline';",
      "return candidate;",
    ),
  ]) {
    assert.notEqual(mutation, COMMUNITY_SOURCE, 'negative icon validation mutation target exists');
    assert.throws(() => validate(mutation), 'invalid icon validation mutation must fail');
  }
});

test('actual heading, populated, loading and empty renders preserve adaptive geometry and controls', () => {
  const harness = createRenderHarness(COMMUNITY_SOURCE, '');
  const seeAll = [];
  const retry = [];
  const common = {
    ownedCommunityPackIds: [], lang: 'ru', contentWidth: 280,
    onOpenPreview: pack => harness.calls.opened.push(pack.id),
    onSeeAll: () => seeAll.push('all'), onRetry: () => retry.push('retry'), openingPackId: null,
  };
  const populated = harness.exports.default({ ...common, catalog: [samplePack()], loading: false });
  const section = byId(populated, 'saved-top-community-section');
  assert.equal(flatStyle(section.props.style).width, 280);
  const headingRow = byId(populated, 'saved-top-community-heading-row');
  assert.deepEqual(flatStyle(headingRow.props.style), {
    minHeight: 44, marginTop: 20.5, marginBottom: 2.5, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', gap: 8,
  });
  const heading = byId(populated, 'saved-top-community-heading');
  assert.equal(flatStyle(heading.props.style).fontSize, 16);
  assert.equal(flatStyle(heading.props.style).lineHeight, 21);
  assert.equal(flatStyle(heading.props.style).fontWeight, '800');
  assert.equal(heading.props.numberOfLines, undefined);
  const seeAllTarget = byId(populated, 'fc-cards-hub-see-all');
  const seeAllStyle = flatStyle(seeAllTarget.props.style);
  assert.equal(seeAllStyle.minHeight, 44);
  assert.equal(seeAllStyle.minWidth, 44);
  assert.equal(seeAllStyle.maxWidth, '42%');
  assert.equal(seeAllStyle.flexShrink, 1);
  const seeAllText = visit(seeAllTarget).find(node => node.type === 'Text');
  assert.equal(flatStyle(seeAllText.props.style).flexShrink, 1);
  assert.equal(seeAllText.props.numberOfLines, undefined);
  seeAllTarget.props.onPress();
  assert.deepEqual(seeAll, ['all']);
  assert.equal(flatStyle(byId(populated, 'saved-top-community-rail').props.contentContainerStyle).gap, 10);

  const loading = harness.exports.default({ ...common, catalog: [], loading: true });
  assert.equal(visit(loading).some(node => node.type === 'LinearGradient'), false, 'loading tiles do not add decorative gradients');
  const loadingTiles = visit(loading).filter(node => /^saved-top-pack-loading-\d$/.test(node.props?.testID ?? ''));
  assert.equal(loadingTiles.length, 3);
  for (const [index, tile] of loadingTiles.entries()) {
    assert.equal(flatStyle(tile.props.style).width, 112);
    assert.equal(flatStyle(byId(tile, `saved-top-pack-loading-cover-${index}`).props.style).height, 112);
    assert.ok(byId(tile, `saved-top-pack-loading-title-${index}`));
    assert.ok(byId(tile, `saved-top-pack-loading-author-${index}`));
  }

  const empty = harness.exports.default({ ...common, catalog: [], loading: false });
  assert.equal(visit(empty).some(node => node.type === 'LinearGradient'), false, 'empty cover does not add decorative gradients');
  // зачем (владелец 01.10): пустой каталог = тот же скелетон (3 плитки 112), без «недоступно» и «Повторить».
  const emptyTiles = visit(empty).filter(node => /^saved-top-pack-loading-\d$/.test(node.props?.testID ?? ''));
  assert.equal(emptyTiles.length, 3);
  assert.equal(visit(empty).some(node => node.props?.testID === 'saved-top-community-retry'), false);
  assert.equal(visit(empty).some(node => node.props?.testID === 'saved-top-community-empty-cover'), false);
});

test('focused validators reject translucent rows, framed tiles, retired art and fixed heading geometry', () => {
  const validate = (hubCandidate, communityCandidate) => {
    const rowHarness = createRenderHarness(hubCandidate, 'exports.__LibraryRow = LibraryRow;');
    const row = rowHarness.exports.__LibraryRow({
      testID: 'mutation-row', icon: 'people-outline', title: 'Title', subtitle: 'Subtitle',
      count: 1, countPendingLabel: 'Loading', lang: 'en', onPress: () => {},
    });
    const rowStyle = flatStyle(row.props.style({ pressed: false }));
    assert.equal(rowStyle.backgroundColor, rowHarness.palette.liquidGlassTokens('graphite').opaqueCard);
    assert.equal(rowStyle.borderWidth, undefined);
    assert.equal(visit(row).filter(node => node.type === 'LinearGradient').length, 1);
    assert.equal(visit(row).some(node => node.type === 'BlurView'), false);

    const communityHarness = createRenderHarness(communityCandidate, 'exports.__CommunityHighlightRow = CommunityHighlightRow;');
    const tree = communityHarness.exports.__CommunityHighlightRow({
      pack: samplePack(), lang: 'ru', owned: false, opening: false, disabled: false, onOpen: () => {},
    });
    const outer = flatStyle(tree.props.style({ pressed: false }));
    assert.equal(outer.padding, undefined);
    assert.equal(outer.borderWidth, undefined);
    assert.equal(outer.minHeight, undefined);
    assert.equal(visit(tree).some(node => node.type === 'Image'), false);
    assert.equal(visit(tree).some(node => node.type === 'LinearGradient'), false);
    const cover = flatStyle(byId(tree, 'saved-top-pack-cover-community:one').props.style);
    assert.equal(cover.width, 112);
    assert.equal(cover.height, 112);
    assert.ok(visit(tree).some(node => node.type === 'Ionicons' && node.props.name === 'briefcase-outline'));
    const badgeStyle = flatStyle(byId(tree, 'saved-top-pack-count-community:one').props.style);
    assert.equal(badgeStyle.minHeight, 19);
    assert.equal(badgeStyle.height, undefined);
    const rendered = communityHarness.exports.default({
      catalog: [samplePack()], ownedCommunityPackIds: [], lang: 'ru', contentWidth: 280,
      onOpenPreview: () => {}, onSeeAll: () => {}, openingPackId: null, loading: false,
    });
    const headingStyle = flatStyle(byId(rendered, 'saved-top-community-heading-row').props.style);
    assert.equal(headingStyle.minHeight, 44);
    assert.equal(headingStyle.marginTop, 20.5);
    assert.equal(headingStyle.marginBottom, 2.5);
    const seeAllStyle = flatStyle(byId(rendered, 'fc-cards-hub-see-all').props.style);
    assert.equal(seeAllStyle.minWidth, 44);
    assert.equal(seeAllStyle.maxWidth, '42%');
    assert.equal(seeAllStyle.flexShrink, 1);
  };

  validate(HUB_SOURCE, COMMUNITY_SOURCE);
  for (const [index, [hubCandidate, communityCandidate]] of [
    [HUB_SOURCE.replace('backgroundColor: g.opaqueCard', 'backgroundColor: g.card'), COMMUNITY_SOURCE],
    [HUB_SOURCE.replace('<LibraryRowSheen testID={`${testID}-sheen`} />', '<HeaderGlassSheen edge={g.glassEdge} tint={g.selected} wash={g.opaqueCard} />'), COMMUNITY_SOURCE],
    [HUB_SOURCE, COMMUNITY_SOURCE.replace("highlightRow: { width: 112 },", "highlightRow: { width: 112, padding: 6, borderWidth: 1 },")],
    [HUB_SOURCE, COMMUNITY_SOURCE.replace('width: 112, height: 112', 'width: 108, height: 108')],
    [HUB_SOURCE, COMMUNITY_SOURCE.replace('name={communityPackIconName(pack.category)}', 'name="albums-outline"')],
    [HUB_SOURCE, COMMUNITY_SOURCE.replace('minHeight: 44, marginTop: 20.5, marginBottom: 2.5', 'height: 26, marginTop: 32, marginBottom: 14')],
    [HUB_SOURCE, COMMUNITY_SOURCE.replace("seeAll: { minHeight: 44, maxWidth: '42%',", 'seeAll: { minHeight: 44,')],
    [HUB_SOURCE, COMMUNITY_SOURCE.replace("maxWidth: '42%', minWidth: 44", "maxWidth: '42%', minWidth: 0")],
    [HUB_SOURCE, COMMUNITY_SOURCE.replace('minHeight: 19,', 'height: 19,')],
  ].entries()) {
    assert.notEqual(`${hubCandidate}\n${communityCandidate}`, `${HUB_SOURCE}\n${COMMUNITY_SOURCE}`, 'mutation target exists');
    assert.throws(() => validate(hubCandidate, communityCandidate), `negative mutation ${index + 1} must fail validation`);
  }
});

// зачем (владелец 01.10): окно выбора тренировки — шторка снизу по скрину владельца.
test('training selector is a bottom sheet with four rows, disabled speaking state and a round close', () => {
  const source = read('FlashcardsTrainingModeSheet.tsx');
  assert.ok(source.includes('Тренироваться с карточками'));
  assert.ok(source.includes('Выбери формат тренировки'));
  assert.ok(source.includes('<Modal'));
  assert.ok(source.includes('styles.sheet'));
  assert.ok(source.includes('styles.close'));
  assert.ok(source.includes("row.mode === 'speaking' && !speakingEnabled"));
  assert.ok(!source.includes("allRows.filter((row) => row.mode !== 'speaking')"));
});

test('library rows are opaque without rim while community material is confined to the square cover', () => {
  const hub = read('FlashcardsHubScreen.tsx');
  const community = read('SavedTopCommunityPacks.tsx');
  assert.ok(hub.includes('backgroundColor: g.opaqueCard'), 'library rows use the approved opaque theme material');
  assert.ok(hub.includes("colors={['rgba(239,241,255,0.09)', 'rgba(239,241,255,0)']}"), 'library row uses the exact same-RGB fade tint');
  assert.doesNotMatch(community, /<BlurView|from 'expo-blur'/, 'community tiles never sample the backdrop');
  assert.match(community, /backgroundColor: g\.opaqueCard, borderColor: g\.glassEdge/, 'only the square cover receives opaque material and rim');
});

test('hub, community rows and training sheet follow all live Plus themes', () => {
  for (const file of ['FlashcardsHubScreen.tsx', 'SavedTopCommunityPacks.tsx', 'FlashcardsTrainingModeSheet.tsx']) {
    const source = read(file);
    assert.ok(source.includes('liquidGlassTokens(liquidGlassThemeId)'), `${file}: approved live theme registry`);
    assert.ok(!/#(?:0C0C0D|151517|FFFFFF|A6A6A8|F2F1F6|242426|1C1C1E)/i.test(source), `${file}: no fixed graphite or fixed content color`);
  }
});

test('approved graphite, lavender and marine tokens remain distinct materials', () => {
  const exports = loadConstantsModule('liquidGlassThemePalette');
  const [graphite, lavender, marine] = ['graphite', 'lavender', 'marine'].map(exports.liquidGlassTokens);
  assert.equal(new Set([graphite.card, lavender.card, marine.card]).size, 3);
  assert.equal(new Set([graphite.bg, lavender.bg, marine.bg]).size, 3);
  assert.equal(new Set([graphite.cta, lavender.cta, marine.cta]).size, 3);
  for (const tokens of [graphite, lavender, marine]) {
    assert.match(tokens.card, /^#[0-9A-F]{8}$/i);
    assert.ok(parseInt(tokens.card.slice(7), 16) < 255, 'card remains translucent');
  }
});

test('only the existing Hub header glass uses native blur; rows, community covers and training sheet do not', () => {
  const hub = read('FlashcardsHubScreen.tsx');
  const community = read('SavedTopCommunityPacks.tsx');
  const sheet = read('FlashcardsTrainingModeSheet.tsx');
  const library = hub.slice(hub.indexOf('function LibraryRow('), hub.indexOf('export default function FlashcardsHubScreen'));
  assert.ok(hub.includes('function HeaderGlassSheen'), 'existing header diffusion remains local to its helper');
  assert.doesNotMatch(library, /BlurView|A6|rowSheen|borderWidth/, 'library row has no blur, wash or rim');
  assert.doesNotMatch(community, /BlurView|dimezisBlurView/, 'community covers use passive material only');
  assert.ok(!sheet.includes('<BlurView'), 'centered dialog does not sample and reveal the underlying screen');
  assert.ok(sheet.includes('LinearGradient'), 'centered dialog has inner sheen');
});
