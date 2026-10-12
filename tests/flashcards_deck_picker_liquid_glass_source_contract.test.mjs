import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const PICKER_PATH = 'app/flashcards/DeckPickerSheet.tsx';
const TILE_PATH = 'app/flashcards/DeckSelectionTile.tsx';
const SHELL_PATH = 'components/modal_fx/HybridSheetShell.tsx';
const COUNT_HELPER_PATH = 'lib/flashcards/compact_deck_count_label.ts';
const DECK_SELECTION_PATH = 'app/flashcards/deck_selection.ts';
const pickerSource = fs.readFileSync(PICKER_PATH, 'utf8');
const tileSource = fs.readFileSync(TILE_PATH, 'utf8');
const shellSource = fs.readFileSync(SHELL_PATH, 'utf8');
const countHelperSource = fs.existsSync(COUNT_HELPER_PATH) ? fs.readFileSync(COUNT_HELPER_PATH, 'utf8') : null;
const deckSelectionSource = fs.readFileSync(DECK_SELECTION_PATH, 'utf8');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const THEMES = ['graphite', 'polar', 'slate', 'ink', 'lavender', 'iris', 'rose', 'terracotta', 'taupe', 'olive', 'sage', 'eucalyptus', 'marine'];
const LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

const parse = (file, source) => ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

function componentFunction(file, source, name) {
  const ast = parse(file, source);
  let found;
  const walk = node => {
    if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) && node.name?.text === name) found = node;
    ts.forEachChild(node, walk);
  };
  walk(ast);
  assert.ok(found, `missing ${name}`);
  return { ast, node: found };
}

function protectedPickerBusiness(candidate) {
  const { ast, node } = componentFunction(PICKER_PATH, candidate, 'DeckPickerSheet');
  const names = new Set([
    'mounted', 'deckIds', 'size', 'starting', 'simpleMotion', 'ty', 'backdrop', 'unmount',
    'presetAppliedRef', 'toggleDeck', 'summary', 'selectedIds', 'canStart', 'selectedPreset',
    'handleStart', 'sheetHeading', 'startLabel', 'closeLabel', 'summaryLabel', 'cardsInSessionLabel',
  ]);
  const selected = [];
  let effectIndex = 0;
  const walk = child => {
    if (ts.isVariableDeclaration(child) && ts.isIdentifier(child.name) && names.has(child.name.text)) {
      selected.push({ name: child.name.text, position: child.getStart(ast), child });
    }
    if (ts.isExpressionStatement(child) && ts.isCallExpression(child.expression) && child.expression.expression.getText(ast) === 'useEffect') {
      selected.push({ name: `useEffect#${effectIndex++}`, position: child.getStart(ast), child });
    }
    ts.forEachChild(child, walk);
  };
  walk(node);
  selected.sort((a, b) => a.position - b.position);
  return {
    count: selected.length,
    hash: sha256(selected.map(({ name, child }) => `${name}:${sha256(printer.printNode(ts.EmitHint.Unspecified, child, ast))}`).join('\n')),
  };
}

function finalReturnHash(file, source, name) {
  const { ast, node } = componentFunction(file, source, name);
  const returns = node.body.statements.filter(ts.isReturnStatement);
  assert.ok(returns.length, `${name} has a return`);
  return sha256(printer.printNode(ts.EmitHint.Unspecified, returns.at(-1), ast));
}

function protectedShellCoordination(candidate) {
  const { ast, node } = componentFunction(SHELL_PATH, candidate, 'HybridSheetShell');
  const names = new Set([
    'bottomInset', 'keyboardBottomInset', 'reduceMotion', 'onDismissedRef', 'dismissalEnabled',
    'dismissalEnabledRef', 'previousDismissalEnabledRef', 'coordinatorRef', 'dispatchNativeDismissRef',
    'nativePresentation', 'nativeDismissTimeoutRef', 'nativeDismissInteractionRef',
    'cancelNativeDismissFallback', 'dispatchNativeDismiss', 'handleNativeDismiss', 'backdropO', 'sheetY',
    'sheetOpacity', 'dragTranslateY', 'handleCloseRef', 'dismissFallbackRef', 'dismissCompletedRef',
    'dismissRequestedRef', 'completeDismiss', 'dismissSheet', 'panGesture', 'backdropStyle', 'sheetStyle',
  ]);
  const selected = [];
  let effectIndex = 0;
  const walk = child => {
    if (ts.isVariableDeclaration(child) && ts.isIdentifier(child.name) && names.has(child.name.text)) {
      selected.push({ name: child.name.text, position: child.getStart(ast), child });
    }
    if (ts.isExpressionStatement(child) && ts.isCallExpression(child.expression) && child.expression.expression.getText(ast) === 'useEffect') {
      selected.push({ name: `useEffect#${effectIndex++}`, position: child.getStart(ast), child });
    }
    ts.forEachChild(child, walk);
  };
  walk(node);
  selected.sort((a, b) => a.position - b.position);
  return {
    count: selected.length,
    hash: sha256(selected.map(({ name, child }) => `${name}:${sha256(printer.printNode(ts.EmitHint.Unspecified, child, ast))}`).join('\n')),
  };
}

function transpile(file, source) {
  return ts.transpileModule(source, {
    fileName: file,
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

const flatStyle = style => Object.assign({}, ...(Array.isArray(style) ? style.flat(Infinity) : [style]).filter(Boolean));
const visit = node => Array.isArray(node)
  ? node.flatMap(visit)
  : node && typeof node === 'object' ? [node, ...visit(node.props?.children)] : [];

function reactHarness() {
  const state = [];
  const refs = [];
  let stateCursor = 0;
  let refCursor = 0;
  const React = {
    Fragment: Symbol('Fragment'),
    createElement(type, props, ...children) {
      return { type, props: { ...(props ?? {}), children: children.length <= 1 ? children[0] : children } };
    },
    memo: component => component,
    useCallback: callback => callback,
    useEffect: () => {},
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
  return { React, beginRender() { stateCursor = 0; refCursor = 0; } };
}

function themeGlass(themeId) {
  return {
    opaqueCard: `${themeId}-card`, opaqueSheet: `${themeId}-sheet`, opaqueControl: `${themeId}-control`,
    glassEdge: `${themeId}-edge`, lightTint: `${themeId}-light`, selected: `${themeId}-selected`,
    cta: `${themeId}-cta`, ctaInk: `${themeId}-ink`, text: `${themeId}-text`,
    secondary: `${themeId}-secondary`, mutedText: `${themeId}-muted`, line: `${themeId}-line`,
  };
}

// зачем (Тень 12.10): заглушка ShadowSurface — каждая тень это маркер вида `<вид>:<тема>`, по нему тесты проверяют, что плашка берёт тень темы
const shadowStub = {
  plateBoxShadow: g => `plate:${g.opaqueCard}`,
  nestedBoxShadow: g => `nested:${g.opaqueCard}`,
  raisedBoxShadow: g => `raised:${g.opaqueCard}`,
  actionBoxShadow: g => `action:${g.opaqueCard}`,
  useShadowGlass: () => themeGlass('graphite'),
  PlateFill: 'PlateFill',
};

function loadPicker({
  themeId = 'graphite', lang = 'en', fontSize = 'large', uiScale = 1.2,
  height = 420, width = 320, summaryCopy,
} = {}) {
  const hooks = reactHarness();
  const calls = { haptic: 0, start: [], persist: [], dismiss: 0, tokenIds: [] };
  const glass = themeGlass(themeId);
  const sharedCountFormatter = loadSharedCountFormatter();
  const modules = {
    react: { __esModule: true, default: hooks.React, ...hooks.React },
    'react-native': {
      Modal: 'Modal', Platform: { OS: 'ios' }, Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View',
      useWindowDimensions: () => ({ height, width }),
    },
    'react-native-reanimated': {
      __esModule: true, default: { View: 'Reanimated.View' }, runOnJS: fn => fn,
      useAnimatedStyle: fn => fn(), useSharedValue: value => ({ value }),
      withSpring: value => value, withTiming: value => value,
    },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: 'Ionicons' },
    '../../constants/i18n': { triLang: (active, copy) => copy[active] },
    '../../constants/flashcards_motion': { FC_TIMING: { base: 1, fast: 1, enter: 1 } },
    '../../constants/liquidGlassThemePalette': { liquidGlassTokens: id => { calls.tokenIds.push(id); return glass; } },
    // зачем (Тень 12.10): тени плашек берутся из components/v2/ShadowSurface — в харнессе это маркеры темы, а не числа
    '../../components/v2/ShadowSurface': shadowStub,
    '../../components/ThemeContext': {
      FONT_SCALE: { small: 1, medium: 1.15, large: 1.3 },
      useTheme: () => ({ liquidGlassThemeId: themeId, fontSize, uiScale }),
    },
    '../../hooks/use-screen': { normalizeSafeAreaBottomInset: value => value },
    './SoundService': { fcHaptic: () => { calls.haptic += 1; } },
    './low_power': { isLowPowerEffective: () => false },
    '../../components/modal_fx/HybridSheetShell': { __esModule: true, default: 'HybridSheetShell' },
    '../../components/PressableHybrid': { __esModule: true, default: 'PressableHybrid' },
    './DeckSelectionTile': { __esModule: true, default: 'DeckSelectionTile' },
    '../../lib/flashcards/compact_deck_count_label': sharedCountFormatter,
    './deck_selection': {
      deckSelectionLabel: (_active, summary) => summaryCopy ?? `${summary.deckCount} selected · ${summary.cardCount}`,
      summarizeDeckSelection: (decks, ids) => ({ deckCount: ids.length, cardCount: decks.filter(deck => ids.includes(deck.deckId)).reduce((sum, deck) => sum + deck.count, 0) }),
      toggleDeckSelection: (current, id) => current.includes(id) ? current.filter(value => value !== id) : [...current, id],
    },
    './mode_prefs': {
      FC_SESSION_SIZES: [10, 15, 20], FC_DEFAULT_SESSION_SIZE: 10,
      presetDeckIds: preset => preset?.deckIds ?? (preset?.deckId ? [preset.deckId] : []),
      setLastPreset: async (...args) => { calls.persist.push(args); },
    },
    '../stable_safe_area_metrics': { useStableSafeAreaInsets: () => ({ top: 17, right: 11, bottom: 19, left: 13 }) },
  };
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${transpile(PICKER_PATH, pickerSource)}\n})`)(name => {
    if (!(name in modules)) throw new Error(`unexpected picker dependency ${name}`);
    return modules[name];
  }, module, module.exports);
  const decks = [
    { deckId: 'saved', title: 'A deliberately very long deck title that must wrap completely', count: 1, icon: 'albums', sourceKind: 'saved', coverImage: { uri: 'old-cover' } },
    { deckId: 'custom', title: 'Second', count: 987654321, icon: 'person', sourceKind: 'custom' },
    { deckId: 'pack:disabled', title: 'Disabled', count: 0, icon: 'lock', sourceKind: 'pack' },
  ];
  const props = {
    visible: true, onClose: () => {}, onStart: value => calls.start.push(value), decks,
    initialPreset: { deckId: 'saved', deckIds: ['saved'], size: 10 }, lang,
    t: { textPrimary: 'old-text', textMuted: 'old-muted', accent: 'old-accent', bgSurface: 'old-surface', correctText: 'old-ink', textGhost: 'old-ghost' },
    f: { h3: 22, body: 16, sub: 14, caption: 12 }, mode: 'speaking', motionVariant: 'hybrid',
  };
  const render = () => {
    hooks.beginRender();
    const shell = module.exports.default(props);
    const requestDismiss = () => { calls.dismiss += 1; };
    const content = typeof shell.props.children === 'function' ? shell.props.children({ requestDismiss }) : shell.props.children;
    return { shell, content, nodes: visit(content) };
  };
  return { calls, glass, props, render };
}

test('shared compact count formatter is pure and preserves all nine locale contracts', () => {
  const { compactDeckCountLabel } = loadSharedCountFormatter();
  assert.equal(typeof compactDeckCountLabel, 'function');
  const expected = {
    ru: ['1 карточка', '2 карточки', '5 карточек'],
    uk: ['1 картка', '2 картки', '5 карток'],
    en: ['1 card', '2 cards', '5 cards'],
    es: ['1 tarjeta', '2 tarjetas', '5 tarjetas'],
    'pt-BR': ['1 cartão', '2 cartões', '5 cartões'],
    vi: ['1 thẻ', '2 thẻ', '5 thẻ'],
    id: ['1 kartu', '2 kartu', '5 kartu'],
    tr: ['1 kart', '2 kart', '5 kart'],
    pl: ['1 fiszka', '2 fiszki', '5 fiszek'],
  };
  for (const lang of LOCALES) {
    assert.deepEqual([1, 2, 5].map(count => compactDeckCountLabel(lang, count)), expected[lang], lang);
  }
  assert.equal(compactDeckCountLabel('en', Number.NaN), '0 cards');
  assert.equal(compactDeckCountLabel('pl', -4), '0 fiszek');
  assert.equal(compactDeckCountLabel('pt-BR', 2.9), '2 cartões');
  const parityCounts = [Number.NaN, Number.POSITIVE_INFINITY, -1, 0, 1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 2.9, 987654321];
  const parityMatrix = LOCALES.flatMap(lang => parityCounts.map((count, index) => [lang, index, compactDeckCountLabel(lang, count)]));
  assert.equal(sha256(JSON.stringify(parityMatrix)), 'b5b2f62aec32348368e4692db45bfa38491dbc6e28d10b7e019bb0d54f07c910');
  assert.match(pickerSource, /from '\.\.\/\.\.\/lib\/flashcards\/compact_deck_count_label'/);
  assert.doesNotMatch(pickerSource, /function compactCardsCountLabel/);
});

function loadTile({ themeId = 'graphite', presentation, selected = true, countLabel = '1 card', count = 1, coverImage = { uri: 'old-cover' } } = {}) {
  const hooks = reactHarness();
  const calls = { haptic: 0, toggle: [] };
  const glass = themeGlass(themeId);
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
    // зачем (координатор 05.10, FONTSCALE2): плитка берёт межстрочный из общего хука; при шрифте 1.0 он возвращает число как есть
    '../../hooks/useLineScale': { useLineScale: () => lineHeight => lineHeight },
    '../../components/v2/ShadowSurface': shadowStub,
    './DeckPickerSheet': {},
  };
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${transpile(TILE_PATH, tileSource)}\n})`)(name => {
    if (!(name in modules)) throw new Error(`unexpected tile dependency ${name}`);
    return modules[name];
  }, module, module.exports);
  hooks.beginRender();
  const tree = module.exports.default({
    deck: { deckId: 'saved', title: 'A very long title that must remain fully visible', count, icon: 'albums', sourceKind: 'saved', coverImage },
    index: 0, selected, simpleMotion: false, onToggle: id => calls.toggle.push(id),
    t: { accent: 'old-accent', border: 'old-border', bgSurface: 'old-surface', textMuted: 'old-muted', textPrimary: 'old-text', bgCard: 'old-card', textSecond: 'old-second', textGhost: 'old-ghost', correctText: 'old-ink' },
    f: { body: 16, sub: 14, caption: 12 }, presentation, liquidGlass: glass, textScale: 1.25, countLabel,
  });
  return { calls, glass, tree, nodes: visit(tree) };
}

function chain() {
  const value = {};
  for (const method of ['enabled', 'activeOffsetY', 'failOffsetX', 'onUpdate', 'onEnd']) value[method] = () => value;
  return value;
}

function loadShell(material, themeId = 'graphite') {
  const hooks = reactHarness();
  const glass = themeGlass(themeId);
  const modules = {
    react: { __esModule: true, default: hooks.React, ...hooks.React },
    'expo-blur': { BlurView: 'BlurView' },
    'react-native': {
      Dimensions: { get: () => ({ width: 400, height: 800 }) }, InteractionManager: { runAfterInteractions: fn => ({ cancel() {}, fn }) }, Modal: 'Modal', Platform: { OS: 'ios' }, Pressable: 'Pressable', View: 'View',
      StyleSheet: { create: value => value, absoluteFill: { position: 'absolute', inset: 0 }, absoluteFillObject: { position: 'absolute', inset: 0 } },
    },
    'react-native-gesture-handler': { Gesture: { Pan: chain }, GestureDetector: 'GestureDetector', GestureHandlerRootView: 'GestureHandlerRootView' },
    'react-native-reanimated': {
      __esModule: true, default: { View: 'Animated.View' }, cancelAnimation() {}, Easing: { out: value => value, cubic: 'cubic', ease: 'ease', bezier: (...points) => points }, runOnJS: fn => fn,
      useAnimatedStyle: fn => fn(), useSharedValue: value => ({ value }), withSpring: value => value, withTiming: value => value,
    },
    '../../app/stable_safe_area_metrics': { useStableSafeAreaInsets: () => ({ bottom: 19 }) },
    '../../hooks/use-screen': { normalizeSafeAreaBottomInset: value => value },
    '../../app/safe_modal_navigation': { NATIVE_MODAL_DISMISS_GAP_MS: 1 },
    '../../hooks/use-haptics': { hapticTap() {} },
    '../../constants/motionHybrid': { KIT_MOTION: { dimMs: 1, sheetMs: 1, sheetEase: [0.2, 1, 0.3, 1] }, LUM: { backdropMs: 1, resolveMs: 1, settle: {}, exitMs: 1 }, SHEET: { dragReturn: {} } },
    '../../hooks/use_reduce_motion': { useReduceMotion: () => true },
    '../keyboardAvoidance': { useKeyboardBottomInset: () => 0 },
    '../ThemeContext': { useTheme: () => ({ theme: { bgCard: 'legacy-card', accent: 'legacy-accent', border: 'legacy-border' }, liquidGlassThemeId: themeId }) },
    '../../constants/liquidGlassThemePalette': { liquidGlassTokens: () => glass },
    '../SafeLinearGradient': { LinearGradient: 'LinearGradient' },
    '../TonalSurface': { __esModule: true, default: 'TonalSurface' },
    './native_modal_dismiss_coordinator': { createNativeModalDismissState: visible => ({ visible, token: 1 }), reduceNativeModalDismiss: state => ({ state, commands: [] }) },
    '../../app/debug-logger': { DebugLogger: { error() {} } },
  };
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${transpile(SHELL_PATH, shellSource)}\n})`)(name => {
    if (!(name in modules)) throw new Error(`unexpected shell dependency ${name}`);
    return modules[name];
  }, module, module.exports);
  hooks.beginRender();
  const tree = module.exports.default({ visible: true, onClose() {}, closeLabel: 'Close', material, children: 'content' });
  return { glass, tree, nodes: visit(tree) };
}

test('protects pre-edit business, classic, default tile, and dependency contracts', () => {
  // зачем (REVIEW_UI_11, 04.10): удалена недостижимая ветка 'classic' и её эффект входа (−1 useEffect) — деловая
  // логика выбора/пресета/старта не менялась; эталон и хэш последнего return обновлены по смыслу.
  assert.deepEqual(protectedPickerBusiness(pickerSource), {
    count: 18,
    hash: 'de0ad33d93b0190fe26645e2b23f5dbeae11b03adfd592fb74ff52327feec66f',
  });
  // зачем (Тень 12.10): хэш последнего return листа обновлён — менялся ТОЛЬКО стиль (кнопка закрытия, чипы размера и «Начать» без border,
  // с boxShadow плашки/действия; gap чипов 8→10); логика и разметка не менялись.
  assert.equal(finalReturnHash(PICKER_PATH, pickerSource, 'DeckPickerSheet'), '4841c3a2dd0edf4b2b71f3743cb55c164977d4a5e4379b935c4e6eb2e6078fea');
  // зачем (Тень 12.10): хэш обновлён — менялся ТОЛЬКО стиль плитки (обложка без border, строка/бейдж с boxShadow плашки); логика и разметка те же.
  assert.equal(finalReturnHash(TILE_PATH, tileSource, 'DeckSelectionTile'), 'ab92026f7b9982140f6df9865312da65a12249a4439b02feda8781fa283c4104'); // 11.10: иконка выбора — accentText (акцент как текст на карточке) // 11.10: галочка выбора берёт цвет из t.textOnGold (текст на акценте по теме), не из t.correctText // перепин 13.10 (светлый акцент, аудит §1, координатор): кольцо отметки плитки — gs.accentBorder вместо сырого t.accent (в светлых градиентных темах accent невидим); бизнес-логика и зависимости не менялись
  assert.deepEqual(protectedShellCoordination(shellSource), {
    count: 32,
    // зачем (координатор 10.10, гейт «приложение = макет»): хэш обновлён — вход и выход шторки перешли на kit.css `.sheet`
    // (440 мс cubic-bezier(.2,1,.3,1), затемнение 260 мс, без выцветания); порядок и логика закрытия не менялись.
    hash: 'd988c04bc0f078c5197dddb509e43822aea79a0b1249b9535968b5e97029008c',
  });
  assert.deepEqual(
    {
      selection: sha256(fs.readFileSync('app/flashcards/deck_selection.ts')),
      prefs: sha256(fs.readFileSync('app/flashcards/mode_prefs.ts')),
      pressable: sha256(fs.readFileSync('components/PressableHybrid.tsx')),
    },
    {
      selection: '36983768bb30e47df6fcd07687ec40aac2c89791293dbc1584cd2ff5832c99ce',
      prefs: 'c429dbc2fe16bc9c0d962494ed3c389fcf7a85ae64c686adc769e3aa73c80ae0',
      // хэш обновлён 10.10: PressableHybrid перешёл на общее движение кита (constants/kitPress) — см. press-standard-and-sheet-timing-2026-10-10.
      pressable: '6321f8fdef1d67a253119d0e46165ff39231f6e51b065b96b40c5e30bb60962b',
    },
  );
});

test('actual picker renders a safe bounded opaque sheet with sibling scrolling regions and dismiss coordination', () => {
  for (const themeId of THEMES) {
    const h = loadPicker({ themeId });
    const { shell, nodes } = h.render();
    assert.equal(shell.type, 'HybridSheetShell');
    assert.equal(shell.props.material, 'liquid-glass-opaque');
    assert.equal(shell.props.backdropAccessible, false);
    assert.deepEqual(h.calls.tokenIds, [themeId]);
    const frame = nodes.find(node => node.props?.testID === 'fc-deck-picker-safe-frame');
    assert.ok(frame, `${themeId} safe frame`);
    assert.equal(flatStyle(frame.props.style).paddingLeft, 13);
    assert.equal(flatStyle(frame.props.style).paddingRight, 11);
    assert.ok(flatStyle(frame.props.style).maxHeight <= 420 - 17 - 19);
    const body = nodes.find(node => node.props?.testID === 'fc-deck-picker-body');
    const dock = nodes.find(node => node.props?.testID === 'fc-deck-picker-dock');
    assert.equal(body.type, 'ScrollView');
    assert.equal(dock.type, 'ScrollView');
    assert.equal(flatStyle(body.props.style).flexShrink, 0);
    assert.equal(typeof flatStyle(body.props.style).maxHeight, 'number');
    assert.equal(flatStyle(dock.props.style).flexShrink, 0);
    assert.equal(typeof flatStyle(dock.props.style).maxHeight, 'number');
    assert.equal(visit(body).some(node => node.props?.testID === 'fc-deck-start'), false);
    assert.equal(visit(dock).filter(node => node.props?.testID === 'fc-deck-start').length, 1);
    for (const size of [10, 15, 20]) {
      const chip = nodes.find(node => node.props?.testID === `fc-deck-size-${size}`);
      assert.equal(flatStyle(chip.props.style).minHeight, 44);
    }
    const close = nodes.find(node => node.props?.testID === 'fc-deck-sheet-close');
    assert.equal(flatStyle(close.props.style).width, 44);
    assert.equal(flatStyle(close.props.style).height, 44);
    assert.equal(close.props.accessibilityLabel, 'Close');
    close.props.onPress();
    assert.equal(h.calls.dismiss, 1);
  }
});

test('short screen with extreme native type keeps the whole header scrollable and reserves a positive numeric dock viewport', () => {
  const h = loadPicker({
    height: 320,
    width: 220,
    uiScale: 1.95,
    summaryCopy: 'A deliberately long selected-pack summary that wraps onto multiple lines',
  });
  const { nodes } = h.render();
  const frame = nodes.find(node => node.props?.testID === 'fc-deck-picker-safe-frame');
  const body = nodes.find(node => node.props?.testID === 'fc-deck-picker-body');
  const dock = nodes.find(node => node.props?.testID === 'fc-deck-picker-dock');
  const heading = nodes.find(node => node.props?.testID === 'fc-deck-picker-heading');
  const summary = nodes.find(node => node.props?.testID === 'fc-deck-selection-summary');
  const close = nodes.find(node => node.props?.testID === 'fc-deck-sheet-close');
  assert.ok(frame && body && dock && heading && summary && close);

  const frameHeight = flatStyle(frame.props.style).maxHeight;
  const bodyHeight = flatStyle(body.props.style).maxHeight;
  const dockHeight = flatStyle(dock.props.style).maxHeight;
  assert.equal(typeof frameHeight, 'number');
  assert.equal(typeof bodyHeight, 'number');
  assert.equal(typeof dockHeight, 'number');
  assert.ok(frameHeight > 0 && bodyHeight > 0 && dockHeight > 0);
  assert.ok(bodyHeight + dockHeight <= frameHeight);
  assert.equal(flatStyle(dock.props.style).flexShrink, 0);

  const bodyNodes = visit(body);
  assert.ok(bodyNodes.includes(heading), 'large wrapping heading belongs to the scrollable body');
  assert.ok(bodyNodes.includes(summary), 'large wrapping summary belongs to the scrollable body');
  assert.ok(bodyNodes.includes(close), 'the coordinated close target remains reachable in the scrollable body');
  assert.equal(visit(dock).filter(node => node.props?.testID === 'fc-deck-start').length, 1);
  assert.ok(flatStyle(heading.props.style).fontSize > 48);
  assert.ok(flatStyle(summary.props.style).fontSize > 33);
  const twoLineHeaderEstimate = flatStyle(heading.props.style).lineHeight * 2
    + flatStyle(summary.props.style).lineHeight * 2 + 4;
  assert.ok(twoLineHeaderEstimate > frameHeight, 'fixture reproduces the old clipped fixed-header geometry');
});

test('actual compact rows ignore stale covers, wrap text, localize counts, and preserve one toggle haptic', () => {
  const singularCount = {
    ru: '1 карточка', uk: '1 картка', en: '1 card', es: '1 tarjeta',
    'pt-BR': '1 cartão', vi: '1 thẻ', id: '1 kartu', tr: '1 kart', pl: '1 fiszka',
  };
  for (const lang of LOCALES) {
    const h = loadPicker({ lang });
    const rows = h.render().nodes.filter(node => node.type === 'DeckSelectionTile');
    assert.equal(rows.length, 3);
    assert.equal(rows[0].props.presentation, 'compact-liquid-glass');
    assert.equal(rows[0].props.countLabel, singularCount[lang]);
    assert.ok(rows[1].props.countLabel.startsWith('987654321 '), `${lang} preserves the actual large count`);
    assert.ok(!/[А-Яа-яЁё]/.test(rows[0].props.countLabel) || ['ru', 'uk'].includes(lang), `${lang} count label is localized`);
  }

  const compact = loadTile({ presentation: 'compact-liquid-glass', selected: true });
  const row = compact.nodes.find(node => node.props?.testID === 'fc-deck-option-saved');
  assert.equal(row.type, 'Pressable');
  const rowStyle = flatStyle(row.props.style({ pressed: false }));
  assert.deepEqual(rowStyle.paddingVertical, 10);
  assert.deepEqual(rowStyle.paddingHorizontal, 4);
  assert.equal(rowStyle.gap, 14);
  assert.equal(rowStyle.borderBottomWidth, 1);
  const tile = compact.nodes.find(node => node.props?.testID === 'fc-deck-option-cover-saved');
  assert.equal(flatStyle(tile.props.style).width, 52);
  assert.equal(flatStyle(tile.props.style).height, 52);
  assert.equal(flatStyle(tile.props.style).borderRadius, 10);
  assert.ok(!compact.nodes.some(node => node.type === 'Image'), 'compact row ignores persisted coverImage');
  assert.ok(compact.nodes.some(node => node.type === 'Ionicons' && node.props.name === 'layers-outline'));
  const title = compact.nodes.find(node => node.props?.testID === 'fc-deck-option-title-saved');
  assert.equal(title.type, 'Text');
  assert.equal(title.props.numberOfLines, undefined);
  assert.equal(title.props.maxFontSizeMultiplier, undefined);
  assert.equal(flatStyle(title.props.style).fontSize, 20);
  assert.equal(flatStyle(title.props.style).fontWeight, '700');
  const subtitle = compact.nodes.find(node => node.props?.testID === 'fc-deck-option-count-saved');
  assert.equal(subtitle.props.children, '1 card');
  assert.equal(flatStyle(subtitle.props.style).fontSize, 13 * 1.25); // D145
  const checkbox = compact.nodes.find(node => node.props?.testID === 'fc-deck-option-checkbox-saved');
  assert.equal(flatStyle(checkbox.props.style).width, 24);
  assert.equal(flatStyle(checkbox.props.style).height, 24);
  assert.equal(flatStyle(checkbox.props.style).borderRadius, 7);
  row.props.onPress();
  assert.deepEqual(compact.calls.toggle, ['saved']);
  assert.equal(compact.calls.haptic, 1);

  const disabled = loadTile({ presentation: 'compact-liquid-glass', count: 0, selected: false });
  const disabledRow = disabled.nodes.find(node => node.props?.testID === 'fc-deck-option-saved');
  assert.equal(disabledRow.props.disabled, true);
  assert.equal(disabledRow.props.accessibilityState.disabled, true);
  assert.equal(disabled.calls.haptic, 0);
  assert.equal(disabled.calls.toggle.length, 0);
});

test('default tile still renders its provided image and the opaque material adds no blur', () => {
  const oldTile = loadTile();
  assert.ok(oldTile.nodes.some(node => node.type === 'Image' && node.props.source.uri === 'old-cover'));
  assert.ok(oldTile.nodes.some(node => node.type === 'AdaptiveLabel'));

  const legacy = loadShell(undefined);
  assert.ok(legacy.nodes.some(node => node.type === 'TonalSurface'));
  assert.ok(!legacy.nodes.some(node => node.type === 'BlurView'));
  const translucent = loadShell('liquid-glass');
  assert.ok(translucent.nodes.some(node => node.type === 'BlurView'));
  assert.equal(flatStyle(translucent.nodes.find(node => node.props?.accessibilityViewIsModal).props.style).backgroundColor, translucent.glass.sheet);
  for (const themeId of THEMES) {
    const opaque = loadShell('liquid-glass-opaque', themeId);
    assert.ok(!opaque.nodes.some(node => node.type === 'BlurView'), `${themeId} opaque sheet has no blur`);
    assert.equal(flatStyle(opaque.nodes.find(node => node.props?.accessibilityViewIsModal).props.style).backgroundColor, opaque.glass.opaqueSheet);
    assert.ok(opaque.nodes.some(node => node.type === 'LinearGradient' && Array.from(node.props.colors)[0] === opaque.glass.selected));
  }
});

test('start keeps the same optimistic payload and compact CTA remains fully wrapping', () => {
  const h = loadPicker();
  const first = h.render();
  const custom = first.nodes.find(node => node.type === 'DeckSelectionTile' && node.props.deck.deckId === 'custom');
  custom.props.onToggle('custom');
  const next = h.render();
  const start = next.nodes.find(node => node.props?.testID === 'fc-deck-start');
  assert.equal(start.type, 'PressableHybrid');
  assert.equal(flatStyle(start.props.style).minHeight, 48);
  assert.equal(flatStyle(start.props.style).borderRadius, 24);
  const label = visit(start).find(node => node.props?.testID === 'fc-deck-start-label');
  assert.equal(label.props.numberOfLines, undefined);
  assert.equal(label.props.maxFontSizeMultiplier, undefined);
  assert.ok(Math.abs(flatStyle(label.props.style).fontSize - (16 * (1.3 / 1.15) * 1.2)) < 1e-9);
  assert.equal(flatStyle(label.props.style).fontWeight, '700');
  start.props.onPress();
  assert.equal(h.calls.haptic, 1);
  assert.equal(h.calls.start.length, 1);
  assert.deepEqual(
    { ...h.calls.start[0], deckIds: Array.from(h.calls.start[0].deckIds) },
    { deckId: 'saved', deckIds: ['saved', 'custom'], size: 10 },
  );
  assert.equal(h.calls.persist.length, 1);
  assert.equal(h.calls.persist[0][0], 'speaking');
  assert.equal(h.calls.persist[0][1], h.calls.start[0]);
});
