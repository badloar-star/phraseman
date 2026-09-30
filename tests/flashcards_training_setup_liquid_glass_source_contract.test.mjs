import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const ROUTE_PATH = 'app/flashcards_training_setup.tsx';
const QUOTA_PATH = 'components/MonthlyTrainingSessionIndicator.tsx';
const TILE_PATH = 'app/flashcards/DeckSelectionTile.tsx';
const COUNT_HELPER_PATH = 'lib/flashcards/compact_deck_count_label.ts';
const DECK_SELECTION_PATH = 'app/flashcards/deck_selection.ts';
const routeSource = fs.readFileSync(ROUTE_PATH, 'utf8');
const quotaSource = fs.readFileSync(QUOTA_PATH, 'utf8');
const tileSource = fs.readFileSync(TILE_PATH, 'utf8');
const countHelperSource = fs.existsSync(COUNT_HELPER_PATH) ? fs.readFileSync(COUNT_HELPER_PATH, 'utf8') : null;
const deckSelectionSource = fs.readFileSync(DECK_SELECTION_PATH, 'utf8');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const THEMES = ['graphite', 'polar', 'slate', 'ink', 'lavender', 'iris', 'rose', 'terracotta', 'taupe', 'olive', 'sage', 'eucalyptus', 'marine'];
const PROTECTED_FILES = new Map([
  ['app/flashcards/DeckSelectionTile.tsx', '66045ca246c71271aabfe658c06ab51db20d5de9dfd386ca4525ee4804374a4e'],
  ['components/v2/V2Kit.tsx', '7c06e9047f8d39f6e5001593d1b148c37e873b31e4b365ccb20c9342b37ec108'],
  ['components/v2/V2Pressable.tsx', '109ed9abd8f4f9cad448dad5ea3cac1c0ea7f058f86d8e6dae571ba807a37a83'],
]);
const PROTECTED_RUNTIME = {
  count: 21,
  // зачем (30.09): D127 — «Устно» прячет наборы «без языка» (hideDecksWithoutVoice, 2acba6874); квота и старт не менялись.
  hash: 'd6a5556ddee1a8817a824415d5a3e0f1596de27dcde35e043a8ad81c5cc661f1',
};

const parse = (path, source) => ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

function protectedRuntime(candidate) {
  const ast = parse(ROUTE_PATH, candidate);
  let screen;
  ast.forEachChild(node => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'FlashcardsTrainingSetupScreen') screen = node;
  });
  assert.ok(screen, 'training setup screen exists');
  const selected = new Set([
    'mode', 'warmDecks', 'decksRef', 'startInFlightRef', 'openingPackRef', 'copy', 'loadDecks',
    'hasNoDecks', 'openSuggestedPack', 'summary', 'blitzHasEnoughCards', 'quotaAllowsStart', 'canStart',
    'resetStartLock', 'leave', 'startTraining', 'selectionExplanation', 'loadErrorMessage',
  ]);
  const nodes = [];
  let effectIndex = 0;
  let focusIndex = 0;
  const walk = node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && selected.has(node.name.text)) {
      nodes.push({ name: node.name.text, position: node.getStart(ast), node });
    }
    if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
      const call = node.expression.expression.getText(ast);
      if (call === 'useEffect') nodes.push({ name: `useEffect#${effectIndex++}`, position: node.getStart(ast), node });
      if (call === 'useFocusEffect') nodes.push({ name: `useFocusEffect#${focusIndex++}`, position: node.getStart(ast), node });
    }
    ts.forEachChild(node, walk);
  };
  walk(screen);
  nodes.sort((a, b) => a.position - b.position);
  return {
    count: nodes.length,
    hash: sha256(nodes.map(({ name, node }) => `${name}:${sha256(printer.printNode(ts.EmitHint.Unspecified, node, ast))}`).join('\n')),
  };
}

function quotaLabelHash(candidate) {
  const ast = parse(QUOTA_PATH, candidate);
  let label;
  const walk = node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'label') label = node;
    ts.forEachChild(node, walk);
  };
  walk(ast);
  assert.ok(label, 'quota label memo exists');
  return sha256(printer.printNode(ts.EmitHint.Unspecified, label, ast));
}

function transpile(path, source) {
  return ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
}

function loadSharedCountFormatter() {
  assert.ok(countHelperSource, `${COUNT_HELPER_PATH} exists`);
  const deckSelectionModule = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${transpile(DECK_SELECTION_PATH, deckSelectionSource)}\n})`)(name => {
    if (name !== '../../constants/i18n') throw new Error(`unexpected deck-selection dependency ${name}`);
    return {
      legacyRuUk: lang => lang === 'uk' ? 'uk' : lang === 'es' || lang === 'en' ? 'es' : 'ru',
    };
  }, deckSelectionModule, deckSelectionModule.exports);
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${transpile(COUNT_HELPER_PATH, countHelperSource)}\n})`)(name => {
    if (name === '../../constants/i18n') return { triLang: (active, copy) => copy[active] ?? copy.es };
    if (name === '../../app/flashcards/deck_selection') return deckSelectionModule.exports;
    throw new Error(`unexpected count-helper dependency ${name}`);
  }, module, module.exports);
  return module.exports;
}

function loadActualTileRenderer(calls) {
  const hooks = reactHarness();
  const modules = {
    react: { __esModule: true, default: hooks.React, ...hooks.React },
    'react-native': {
      Pressable: 'Pressable', Text: 'Text', View: 'View', useWindowDimensions: () => ({ width: 320 }),
      StyleSheet: { create: value => value, absoluteFill: { position: 'absolute', inset: 0 }, absoluteFillObject: { position: 'absolute', inset: 0 } },
    },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: 'Ionicons' },
    'expo-image': { Image: 'Image' },
    'react-native-reanimated': {
      __esModule: true, default: { View: 'Reanimated.View' }, useAnimatedStyle: fn => fn(),
      useSharedValue: value => ({ value }), withDelay: (_delay, value) => value, withSpring: value => value, withTiming: value => value,
    },
    '../../constants/flashcards_motion': { FC_TIMING: { fast: 1 }, fcStaggerDelay: value => value },
    '../../components/SafeLinearGradient': { LinearGradient: 'LinearGradient' },
    '../../components/text-integrity/AdaptiveLabel': { AdaptiveLabel: 'AdaptiveLabel' },
    './SoundService': { fcHaptic: () => { calls.haptic += 1; } },
    './DeckPickerSheet': {},
  };
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${transpile(TILE_PATH, tileSource)}\n})`)(name => {
    if (!(name in modules)) throw new Error(`unexpected tile dependency ${name}`);
    return modules[name];
  }, module, module.exports);
  return props => {
    hooks.beginRender();
    return module.exports.default(props);
  };
}

const flatStyle = style => Object.assign({}, ...(Array.isArray(style) ? style.flat(Infinity) : [style]).filter(Boolean));
const visit = node => Array.isArray(node)
  ? node.flatMap(visit)
  : node && typeof node === 'object' ? [node, ...visit(node.props?.children)] : [];

function reactHarness() {
  const state = [];
  const refs = [];
  const effects = [];
  let stateCursor = 0;
  let refCursor = 0;
  const React = {
    Fragment: Symbol('Fragment'),
    createElement(type, props, ...children) {
      return { type, props: { ...(props ?? {}), children: children.length <= 1 ? children[0] : children } };
    },
    memo: component => component,
    useCallback: callback => callback,
    useEffect: callback => effects.push(callback),
    useMemo: factory => factory(),
    useRef(initial) {
      const index = refCursor++;
      return refs[index] ??= { current: initial };
    },
    useState(initial) {
      const index = stateCursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
  };
  return {
    React,
    effects,
    beginRender() { stateCursor = 0; refCursor = 0; effects.length = 0; },
  };
}

function createRouteHarness({
  candidate = routeSource,
  mode = 'recall', warmDecks = [{ deckId: 'saved', title: 'A very long saved deck title', count: 12 }],
  loadedDecks = warmDecks, loadRejects = false, quotaStatus = 'allowed', themeId = 'graphite',
  suggestedPacks = [], lang = 'en', actualTile = false,
  fontSize = 'medium', uiScale = 1, insets = { top: 11, right: 12, bottom: 13, left: 14 },
} = {}) {
  const hooks = reactHarness();
  const calls = { push: [], back: [], haptic: 0, tokenIds: [], preset: [] };
  const router = { push: value => calls.push.push(value) };
  const glass = {
    opaqueCard: `${themeId}-card`, opaqueControl: `${themeId}-control`, glassEdge: `${themeId}-edge`, lightTint: `${themeId}-light`,
    selected: `${themeId}-selected`, cta: `${themeId}-cta`, ctaInk: `${themeId}-ink`, text: `${themeId}-text`, secondary: `${themeId}-secondary`,
  };
  const sharedCountFormatter = loadSharedCountFormatter();
  const actualTileRenderer = actualTile ? loadActualTileRenderer(calls) : null;
  const modules = {
    react: { __esModule: true, default: hooks.React, ...hooks.React },
    'react-native': {
      ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', ScrollView: 'ScrollView', StatusBar: 'StatusBar', Text: 'Text', View: 'View',
      StyleSheet: { create: value => value, absoluteFill: { position: 'absolute', inset: 0 } },
    },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: 'Ionicons' },
    'expo-router': { useFocusEffect: () => {}, useLocalSearchParams: () => ({ mode }), useRouter: () => router },
    'react-native-reanimated': { useReducedMotion: () => false },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '../components/ContentWrap': { __esModule: true, default: 'ContentWrap' },
    '../components/MonthlyTrainingSessionIndicator': { __esModule: true, default: 'MonthlyTrainingSessionIndicator' },
    '../components/SafeLinearGradient': { LinearGradient: 'LinearGradient', __esModule: true, default: 'LinearGradient' },
    '../components/ScreenGradient': { __esModule: true, default: 'ScreenGradient' },
    '../components/feature_intro/FeatureIntroEntry': { __esModule: true, default: 'FeatureIntroEntry' },
    '../components/LangContext': { useLang: () => ({ lang }) },
    '../components/ThemeContext': {
      FONT_SCALE: { small: 1, medium: 1.15, large: 1.3 },
      useTheme: () => ({
        theme: { textPrimary: '#fff', textSecond: '#ddd', wrong: '#f66', accent: '#9cf' },
        f: { sub: 14, bodyLg: 17, caption: 12 }, statusBarLight: true, liquidGlassThemeId: themeId, fontSize, uiScale,
      }),
    },
    '../components/PremiumContext': { usePremium: () => ({ accessResolved: true }) },
    '../components/StudyTargetContext': { useStudyTarget: () => ({ studyTarget: 'english' }) },
    '../components/v2/V2Kit': { V2IconButton: 'V2IconButton' },
    '../components/v2/V2Pressable': { __esModule: true, default: 'V2Pressable' },
    '../components/v2/useV2Palette': { useV2Palette: () => ({ glass: 'old-glass', stroke: 'old-stroke', glassRaised: 'old-raised', iconTint: 'old-icon', text: 'old-text' }) },
    '../constants/i18n': { triLang: (lang, copy) => copy[lang] },
    '../constants/liquidGlassThemePalette': { liquidGlassTokens: id => { calls.tokenIds.push(id); return glass; } },
    '../constants/v2Style': { V2: { screenPad: 20, radius: { card: 16 }, iconButton: 42 } },
    './flashcards/blitz_logic': { canStartBlitz: count => count >= 4 },
    './flashcards/training_setup_explanation': { trainingSetupExplanation: (state, length, label, copy) => state === 'loading' ? copy.loading : state === 'error' ? copy.error : length ? label : copy.empty },
    './flashcards/deck_options': {
      loadFcDeckOptions: async () => { if (loadRejects) throw new Error('load failed'); return loadedDecks; },
      peekFcDeckOptions: () => warmDecks,
      sameDeckOptions: () => false,
      // D127 (30.09): «Устно» прячет наборы «без языка» — в остальных режимах список как есть.
      hideDecksWithoutVoice: decks => decks,
    },
    './flashcards/DeckPickerSheet': {},
    './flashcards/DeckSelectionTile': { __esModule: true, default: actualTileRenderer ?? 'DeckSelectionTile' },
    '../lib/flashcards/compact_deck_count_label': sharedCountFormatter,
    './flashcards/deck_selection': {
      deckSelectionLabel: (_lang, summary) => `${summary.deckCount} packs, ${summary.cardCount} cards`,
      summarizeDeckSelection: (decks, ids) => ({ deckCount: ids.length, cardCount: decks.filter(deck => ids.includes(deck.deckId)).reduce((sum, deck) => sum + deck.count, 0) }),
      toggleDeckSelection: (current, id) => current.includes(id) ? current.filter(value => value !== id) : [...current, id],
    },
    './flashcards/tabbar_state': { fcTrainOptionPresetMode: value => value },
    './flashcards/mode_prefs': {
      FC_DEFAULT_SESSION_SIZE: 10, getLastPreset: async () => null, presetDeckIds: () => [],
      setLastPreset: async (...args) => { calls.preset.push(args); },
    },
    './flashcards/training_entry': {
      buildCardsTrainingRoute: currentMode => ({ pathname: `/session/${currentMode}`, params: {} }),
      parseCardsTrainingMode: value => ['blitz', 'speaking', 'recall', 'truefalse'].includes(value) ? value : null,
    },
    './flashcards/SavedTopCommunityPacks': { pickTopCommunityPacks: packs => packs.slice(0, 3) },
    './community_packs/communityFirestore': { loadPublishedCommunityMarketPacks: async () => suggestedPacks, peekPublishedCommunityMarketPacks: () => suggestedPacks },
    './community_packs/staging': { stageCommunityPackCardsForNavigation: async () => [] },
    './flashcards/marketplace': { packTitleForInterface: pack => pack.title },
    './config': { CLOUD_SYNC_ENABLED: false, IS_EXPO_GO: false },
    './events': { actionToastTri: () => ({}), emitAppEvent: () => {} },
    '../hooks/use-haptics': { hapticTap: () => { calls.haptic += 1; } },
    '../hooks/useFlashcardTrainingQuotaPreview': { useFlashcardTrainingQuotaPreview: () => ({ status: quotaStatus, limit: 30, used: 2 }) },
    './navigation_back': { safeRouterBack: (...args) => calls.back.push(args) },
    './stable_safe_area_metrics': { useStableSafeAreaInsets: () => insets },
  };
  const module = { exports: {} };
  const wrapper = vm.runInNewContext(`(function(require,module,exports){${transpile(ROUTE_PATH, candidate)}\n})`);
  wrapper(name => {
    if (!(name in modules)) throw new Error(`unexpected route dependency ${name}`);
    return modules[name];
  }, module, module.exports);
  const expand = node => {
    if (Array.isArray(node)) return node.map(expand);
    if (!node || typeof node !== 'object') return node;
    if (typeof node.type === 'function') return expand(node.type(node.props));
    return { ...node, props: { ...node.props, children: expand(node.props?.children) } };
  };
  const render = () => { hooks.beginRender(); return expand(module.exports.default()); };
  const settle = async () => {
    render();
    for (const effect of [...hooks.effects]) effect();
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    return render();
  };
  return { calls, glass, render, settle };
}

function loadQuota({ lang = 'en' } = {}) {
  const React = { createElement: (type, props, ...children) => ({ type, props: { ...(props ?? {}), children: children.length <= 1 ? children[0] : children } }), useMemo: factory => factory() };
  const module = { exports: {} };
  const modules = {
    react: { __esModule: true, default: React, ...React },
    'react-native': { StyleSheet: { create: value => value }, Text: 'Text', View: 'View' },
    './LangContext': { useLang: () => ({ lang }) },
    '../constants/i18n': { triLang: (active, copy) => copy[active] },
    '../app/monthly_training_sessions': {},
  };
  vm.runInNewContext(`(function(require,module,exports){${transpile(QUOTA_PATH, quotaSource)}\n})`)(name => modules[name], module, module.exports);
  return module.exports.default;
}

test('business AST and shared dependencies stay at the pre-edit baseline', () => {
  assert.deepEqual(protectedRuntime(routeSource), PROTECTED_RUNTIME);
  assert.equal(quotaLabelHash(quotaSource), '967e3835b433d9f1506e2de4757da7d1c4bd6235e4825bacc3e91e218e8da6ee');
  for (const [path, expected] of PROTECTED_FILES) assert.equal(sha256(fs.readFileSync(path)), expected, path);
  const mutation = routeSource.replace("quotaPreview.status !== 'exhausted'", "quotaPreview.status === 'allowed'");
  assert.notEqual(mutation, routeSource);
  assert.notDeepEqual(protectedRuntime(mutation), PROTECTED_RUNTIME);
});

test('actual route uses stable four-edge ownership, compact wrapping type, and sibling bounded dock', () => {
  const h = createRouteHarness({ fontSize: 'large', uiScale: 1.2 });
  const nodes = visit(h.render());
  const byId = id => {
    const node = nodes.find(item => item.props?.testID === id);
    assert.ok(node, `${id} exists`);
    return node;
  };
  assert.deepEqual(flatStyle(byId('fc-training-setup-safe-frame').props.style), {
    flex: 1, minHeight: 0, backgroundColor: 'transparent', paddingTop: 11, paddingRight: 12, paddingLeft: 14,
  });
  const header = byId('fc-training-setup-header');
  assert.equal(header.type, 'View');
  const back = byId('fc-training-setup-header-back');
  assert.equal(back.type, 'V2IconButton');
  back.props.onPress();
  assert.equal(h.calls.back.length, 1);
  assert.equal(h.calls.back[0][1], '/flashcards');
  const expectedScale = 1.3 / 1.15 * 1.2;
  const title = byId('fc-training-setup-header-title');
  assert.equal(title.props.numberOfLines, undefined);
  assert.equal(flatStyle(title.props.style).fontSize, 20 * expectedScale);
  assert.equal(flatStyle(title.props.style).lineHeight, 24 * expectedScale);
  assert.equal(flatStyle(title.props.style).fontWeight, '700');
  assert.equal(flatStyle(title.props.style).textAlign, 'left');
  assert.equal(flatStyle(header.props.style).gap, 14);
  assert.ok(!nodes.some(node => node.props?.testID === 'fc-training-setup-header-trailing'));
  assert.equal(flatStyle(byId('fc-training-setup-summary').props.style).fontSize, 15 * expectedScale);
  assert.equal(flatStyle(byId('fc-training-setup-summary').props.style).lineHeight, 21 * expectedScale);
  assert.equal(byId('fc-training-setup-summary').props.maxFontSizeMultiplier, undefined);

  const body = byId('fc-training-setup-body-scroll');
  const dock = byId('fc-training-setup-dock-scroll');
  assert.equal(body.type, 'ScrollView');
  assert.equal(dock.type, 'ScrollView');
  assert.deepEqual(flatStyle(body.props.style), { flex: 1, minHeight: 0 });
  assert.deepEqual(flatStyle(dock.props.style), { flexGrow: 0, flexShrink: 1, maxHeight: '46%' });
  assert.ok(!visit(body).some(node => node.props?.testID === 'fc-training-setup-start'));
  assert.equal(visit(dock).filter(node => node.props?.testID === 'fc-training-setup-start').length, 1);
  assert.equal(visit(dock).filter(node => node.props?.testID === 'fc-training-setup-monthly-limit').length, 1);
  assert.equal(flatStyle(dock.props.contentContainerStyle).paddingBottom, 13);
  assert.equal(flatStyle(byId('fc-training-setup-start').props.style).minHeight, 48);
  assert.equal(flatStyle(byId('fc-training-setup-start').props.style).borderRadius, 24);
});

test('actual route renders loading, empty, load-error, and invalid states on opaque themed surfaces', async () => {
  for (const themeId of THEMES) {
    const h = createRouteHarness({ warmDecks: null, loadedDecks: [], themeId });
    const initial = visit(h.render());
    const loading = initial.find(node => node.props?.testID === 'fc-training-setup-loading');
    assert.ok(loading, `${themeId} loading surface`);
    assert.equal(flatStyle(loading.props.style).backgroundColor, `${themeId}-card`);
    const sheen = visit(loading).find(node => node.props?.testID === 'fc-training-setup-loading-sheen');
    assert.deepEqual(Array.from(sheen.props.colors), [`${themeId}-selected`, 'transparent']);
    assert.equal(sheen.props.pointerEvents, 'none');
    const progress = visit(loading).find(node => node.props?.accessibilityRole === 'progressbar');
    assert.equal(progress.props.accessibilityLabel, 'Loading packs');
    const placeholderRows = visit(loading).filter(node => /^fc-training-setup-loading-row-\d+$/.test(node.props?.testID ?? ''));
    assert.equal(placeholderRows.length, 3, `${themeId} has three passive list rows`);
    for (const row of placeholderRows) {
      assert.equal(row.props.accessible, false);
      assert.equal(row.props.accessibilityElementsHidden, true);
      assert.equal(row.props.importantForAccessibility, 'no-hide-descendants');
      assert.ok(visit(row).filter(node => node.type === 'View').length >= 5, 'placeholder row contains icon and two text lines');
    }
    const settled = visit(await h.settle());
    const empty = settled.find(node => node.props?.testID === 'fc-training-setup-empty');
    assert.ok(empty, `${themeId} empty surface`);
    assert.equal(flatStyle(empty.props.style).backgroundColor, `${themeId}-card`);
    const emptyMessage = visit(empty).filter(node => node.props?.testID === 'fc-training-setup-empty-message');
    assert.equal(emptyMessage.length, 1, `${themeId} empty copy appears once inside card`);
    assert.equal(emptyMessage[0].props.children, 'No cards to practise yet. Save cards or add a community pack.');
    assert.ok(!settled.some(node => node.props?.testID === 'fc-training-setup-summary'));
  }

  const suggestedPack = { id: 'pack-1', title: 'Suggested pack', codeName: 'suggested' };
  const suggested = visit(await createRouteHarness({ warmDecks: null, loadedDecks: [], suggestedPacks: [suggestedPack] }).settle());
  assert.equal(suggested.filter(node => node.props?.testID === 'fc-training-setup-summary').length, 1);
  assert.equal(suggested.filter(node => node.props?.testID === 'fc-training-setup-empty-message').length, 0);
  assert.equal(suggested.filter(node => node.props?.testID === 'fc-training-setup-suggest-pack-1').length, 1);
  const failed = visit(await createRouteHarness({ warmDecks: null, loadRejects: true }).settle());
  assert.ok(failed.some(node => node.props?.testID === 'fc-training-setup-error'));
  const retry = failed.find(node => node.props?.testID === 'fc-training-setup-retry');
  assert.equal(retry.type, 'V2Pressable');
  assert.equal(flatStyle(retry.props.style).minHeight, 48);
  assert.equal(retry.props.children.props.numberOfLines, undefined);

  const invalid = visit(await createRouteHarness({ mode: 'bad', warmDecks: null }).settle());
  assert.ok(invalid.some(node => node.props?.testID === 'fc-training-setup-error'));
  assert.ok(!invalid.some(node => node.props?.testID === 'fc-training-setup-retry'));
});

test('ready content preserves deck props, full suggested titles, quota fail-open, and one start callback', async () => {
  const h = createRouteHarness();
  const nodes = visit(await h.settle());
  assert.equal(nodes.filter(node => node.props?.testID === 'fc-training-setup-start').length, 1);
  assert.equal(nodes.filter(node => node.props?.testID === 'fc-training-setup-monthly-limit').length, 1);
  const deck = nodes.find(node => node.type === 'DeckSelectionTile');
  assert.ok(deck);
  assert.equal(deck.props.testIDPrefix, 'fc-training-setup-deck');
  assert.equal(deck.props.deck.deckId, 'saved');
  assert.equal(deck.props.index, 0);
  assert.equal(deck.props.selected, true);
  assert.equal(deck.props.simpleMotion, false);
  assert.equal(typeof deck.props.onToggle, 'function');
  assert.ok(deck.props.t && deck.props.f);
  assert.equal(deck.props.presentation, 'compact-liquid-glass');
  assert.equal(deck.props.liquidGlass, h.glass);
  assert.equal(deck.props.textScale, 1);
  assert.equal(deck.props.countLabel, '12 cards');
  const start = nodes.find(node => node.props?.testID === 'fc-training-setup-start');
  assert.equal(start.props.disabled, false);
  assert.equal(start.props.withHaptic, undefined);
  assert.equal(start.props.children.props.numberOfLines, undefined);
  const intro = nodes.find(node => node.type === 'FeatureIntroEntry');
  assert.equal(intro.props.id, 'training_recall_first_visit');
  assert.equal(intro.props.enabled, true);
  start.props.onPress();
  await Promise.resolve();
  assert.equal(h.calls.push.length, 1);

  const unavailable = createRouteHarness({ quotaStatus: 'unavailable' });
  const unavailableNodes = visit(await unavailable.settle());
  assert.equal(unavailableNodes.find(node => node.props?.testID === 'fc-training-setup-start').props.disabled, false);
  const exhausted = createRouteHarness({ quotaStatus: 'exhausted' });
  const exhaustedNodes = visit(await exhausted.settle());
  assert.equal(exhaustedNodes.find(node => node.props?.testID === 'fc-training-setup-start').props.disabled, true);

  assert.ok(!routeSource.includes('numberOfLines={2}\n                              style={[styles.suggestTitle'));
  assert.match(routeSource, /suggestTitle:\s*\{[^}]*minWidth:\s*0[^}]*\}/s);
});

test('setup caller uses the actual compact renderer across all themes with selected, disabled, stale-cover and one-haptic behavior', async () => {
  for (const themeId of THEMES) {
    const h = createRouteHarness({
      actualTile: true,
      themeId,
      warmDecks: [
        { deckId: 'saved', title: 'A title that must wrap instead of truncating', count: 1, coverImage: { uri: 'stale-cover' } },
        { deckId: 'custom', title: 'Disabled', count: 0, coverImage: { uri: 'stale-disabled-cover' } },
      ],
    });
    const warmNodes = visit(h.render());
    const disabled = warmNodes.find(node => node.props?.testID === 'fc-training-setup-deck-custom');
    assert.ok(disabled, `${themeId} warm disabled row`);
    assert.equal(disabled.props.accessibilityState.disabled, true);
    assert.equal(disabled.props.disabled, true);
    assert.ok(!warmNodes.some(node => node.type === 'Image'), `${themeId} warm rows ignore cached covers`);

    const nodes = visit(await h.settle());
    const selected = nodes.find(node => node.props?.testID === 'fc-training-setup-deck-saved');
    assert.ok(selected, `${themeId} selected actual row`);
    assert.equal(selected.props.accessibilityState.checked, true);
    assert.equal(selected.props.disabled, false);
    assert.ok(!nodes.some(node => node.type === 'Image'), `${themeId} ignores cached covers`);
    const title = nodes.find(node => node.props?.testID === 'fc-training-setup-deck-title-saved');
    assert.equal(title.type, 'Text');
    assert.equal(title.props.numberOfLines, undefined);
    assert.equal(title.props.maxFontSizeMultiplier, undefined);
    const count = nodes.find(node => node.props?.testID === 'fc-training-setup-deck-count-saved');
    assert.equal(count.props.children, '1 card');
    const cover = nodes.find(node => node.props?.testID === 'fc-training-setup-deck-cover-saved');
    assert.equal(flatStyle(cover.props.style).backgroundColor, `${themeId}-control`);
    selected.props.onPress();
    assert.equal(h.calls.haptic, 1, `${themeId} one row haptic`);
  }
});

test('monthly quota actual output is byte-compatible by default and opt-in metrics only change typography', () => {
  for (const lang of LOCALES) {
    const Quota = loadQuota({ lang });
    for (const quota of [
      { status: 'waiting', limit: 30, used: 0 },
      { status: 'allowed', limit: 30, used: 2 },
      { status: 'exhausted', limit: 30, used: 30 },
    ]) {
      const baseProps = { quota, textColor: 'text', mutedColor: 'muted', testID: 'quota' };
      const beforeShape = Quota(baseProps);
      const optIn = Quota({ ...baseProps, textMetrics: { fontSize: 15, lineHeight: 21 } });
      assert.equal(beforeShape.type, 'View');
      assert.deepEqual(flatStyle(beforeShape.props.children.props.style), {
        fontSize: 12, lineHeight: 17, fontWeight: '800', textAlign: 'center',
        color: quota.status === 'exhausted' ? 'muted' : 'text',
      });
      assert.deepEqual(flatStyle(optIn.props.children.props.style), {
        fontSize: 15, lineHeight: 21, fontWeight: '800', textAlign: 'center',
        color: quota.status === 'exhausted' ? 'muted' : 'text',
      });
      assert.equal(typeof beforeShape.props.children.props.children, 'string');
      assert.ok(beforeShape.props.children.props.children.length > 0);
      assert.deepEqual(optIn.props.children.props.children, beforeShape.props.children.props.children);
    }
  }
  assert.match(quotaSource, /textMetrics\?: Readonly<\{ fontSize: number; lineHeight: number \}>/);
  const mutation = quotaSource.replace('textMetrics,', 'textMetrics: undefined,');
  assert.notEqual(mutation, quotaSource);
});

test('presentation mutation guards reject capped text and dock-in-body regressions', () => {
  assert.ok(!routeSource.includes('maxFontSizeMultiplier='));
  assert.ok(!routeSource.includes('numberOfLines={1}'));
  assert.match(routeSource, /testID="fc-training-setup-header-title"/);
  const capped = routeSource.replace('testID="fc-training-setup-header-title"', 'testID="fc-training-setup-header-title" numberOfLines={1}');
  assert.notEqual(capped, routeSource);
  assert.match(capped, /fc-training-setup-header-title" numberOfLines=\{1\}/);
  assert.match(routeSource, /paddingBottom: insets\.bottom/);
  const noSafeBottom = routeSource.replace('paddingBottom: insets.bottom', 'paddingBottom: 0');
  assert.notEqual(noSafeBottom, routeSource);

  const inspect = candidate => {
    const nodes = visit(createRouteHarness({ candidate }).render());
    assert.equal(nodes.find(node => node.props?.testID === 'fc-training-setup-header-title').props.numberOfLines, undefined);
    assert.equal(flatStyle(nodes.find(node => node.props?.testID === 'fc-training-setup-dock-scroll').props.contentContainerStyle).paddingBottom, 13);
  };
  inspect(routeSource);
  assert.throws(() => inspect(capped));
  assert.throws(() => inspect(noSafeBottom));

  const flatSheen = routeSource.replace("colors={[glass.selected, 'transparent']}", "colors={['transparent', 'transparent']}");
  assert.notEqual(flatSheen, routeSource);
  const assertSheen = candidate => {
    const nodes = visit(createRouteHarness({ candidate, warmDecks: null, loadedDecks: [] }).render());
    const colors = nodes.find(node => node.props?.testID === 'fc-training-setup-loading-sheen').props.colors;
    assert.deepEqual(Array.from(colors), ['graphite-selected', 'transparent']);
  };
  assertSheen(routeSource);
  assert.throws(() => assertSheen(flatSheen));
});
