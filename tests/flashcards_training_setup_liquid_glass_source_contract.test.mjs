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
  // хэш обновлён 12.10 (Тень): строка без обводки (плашка raised/plate с boxShadow), обложка и бейдж счётчика — малая тень; логика и пропсы те же
  ['app/flashcards/DeckSelectionTile.tsx', '7578f86959512537d35e6b88e379fa9141a91f93addf42fcc80bd0c0a24bf0b4'], // 11.10 (координатор): рамка плитки 1.5 → 1 pt (D145); галочка — t.textOnGold; иконка набора — t.accentText (акцент как текст) // перепин 13.10 (светлый акцент, аудит §1, координатор): кольцо отметки плитки — gs.accentBorder вместо сырого t.accent (в светлых градиентных темах accent невидим); бизнес-логика и зависимости не менялись
  // зачем (30.09): темы 2.0 — ссылка раздела в цвете темы (p.link, 0c6d2549f); в «Спокойно» = textSecondary.
  // зачем (text-integrity 01.10): сняты обрезки подписей, кнопки и плашки растут по тексту — бизнес-логика не менялась.
  // зачем (FONTSCALE2, координатор 05.10): межстрочный растёт с системным шрифтом (useScaledTextStyles), поле поиска minHeight;
  // при шрифте 1.0 тот же объект стилей — вид и бизнес-логика прежние.
  // зачем (владелец 12.10, стиль «Тень»): V2Kit без обводок — кнопки/ответы/шторка получают тени из токенов темы; логика и пропсы те же.
  // перепин 15.10 (координатор, п.67): в строке кольца исхода добавлен комментарий shadow-ok для сторожа «Тени»; код не менялся
  // перепин 13.10 (Дизайн, aee10c22a; dialogs-003): V2LargeTitle получил необязательный проп `subtitleHidden` (хаб «Диалоги» прячет подзаголовок при открытой категории); у остальных вызовов он false, логика пропсов экрана настройки не менялась
  ['components/v2/V2Kit.tsx', 'c1206317d5a0ad593e5de683b27638824a835069077ad5d405226a3c282fe5ca'], // перепин 17.10 (R115): после пина — только вид: 16e2b8311 (13.10, кнопки на токене buttonFill) и 89a360603 (17.10, значок кнопки через NavIcon/BackGlyph); пропсы и логика V2Kit прежние
  // хэш обновлён 10.10: V2Pressable на нажатие кита (constants/kitPress), логика пропсов не менялась
  // хэш обновлён 13.10 (№11, сверено по diff 21cf84b2e): прозрачность из style умножается на прозрачность нажатия (недоступные кнопки снова гаснут); логика пропсов прежняя
  ['components/v2/V2Pressable.tsx', '2b3bf16b18f715c76d5410c9d56bf94fb9a3627bdee464e2f4ba7486816c9616'],
]);
const PROTECTED_RUNTIME = {
  // зачем (D158 / PM-214, 04.10): вечный скелетон наборов запрещён — повторы 1/3/8 с, «Сейчас недоступно»,
  // автоповтор при возврате в приложение и сторож потолка загрузки (+2 useEffect).
  count: 28,
  // зачем (владелец 01.10): без экрана ошибки — loadDecks не стирает показанные наборы при сбое, плюс тихий повтор (+1 useEffect).
  // зачем (30.09): D127 — «Устно» прячет наборы «без языка» (hideDecksWithoutVoice, 2acba6874); квота и старт не менялись.
  // зачем (координатор 02.10, вариант В): открытие набора — тихие повторы + мягкая подсказка через stage_with_retry.
  // зачем (владелец 04.10, cards-section): startTraining передаёт размер сессии («Карточек 10 / 20 / Все») в маршрут — осознанная правка базовой линии
  // зачем (ядро 04.10): блиц `sec` 30/60/90, recall `dir`, правда/ложь `size` — сознательная правка базовой линии (новое состояние secId/dirId и аргументы маршрута)
  // зачем (координатор 04.10): трассировка [FC-TRAIN-ENTRY] на каждом выходе тапа «Начать» + тап во время загрузки запоминается и срабатывает сам — сознательная правка базовой линии
  // зачем (15.10, координатор: красные сторожи; сверено по diff d70c92fcc и e531e6408): +1 useEffect с трассировкой [TRAIN-PREP] (cards-075) и dev-подмена статуса
  // экрана (`hold=setup_loading` / `fail=setup_decks`, computedSetupStatus) — только для съёмки и журнала; выдача наборов, квота и старт без изменений (число узлов 25 → 26).
  // зачем (15.10 вечер, перепрогон красных; сверено по diff 8fd8adbab): только журнал цепочки «Начать» ([FLASHCARDS-SESSION] setup:tap и setup:push) и describeDevCardsState; выдача наборов, квота и старт без изменений.
  // зачем (12.10 вечер, владелец п.83 «кнопка языка отфильтровывает наборы карточек по языкам»; сверено по diff): сознательная правка базовой линии — видимый список наборов зависит от выбранного языка
  // (viewLang/viewDecks/listReady, selectLanguage), canStart ждёт готовности списка ВЫБРАННОГО языка, loadDecks не затирает отметки на чужом языке, запуск несёт ?target и не пишет пресет чужого языка.
  // Квота, energy-гейты и логика «Начать» без изменений (число узлов 26 → 27). План: docs/phraseman-2.0/R1_FC_LANG_FILTER.md.
  // зачем (13.10, №11 регрессия Авторизации; сверено по diff bccef0011): только английский текст пустого состояния practise → practice (американское
  // написание, 2 строки); выдача наборов, квота, energy-гейты и «Начать» без изменений (число узлов прежнее, 27).
  // зачем (15.10, аудит кнопок Карточек #18 + 🟡 «Хаб/наборы»; сверено по diff 5b6aa8f76 и текущему): +1 useFocusEffect — список наборов обновляется
  // при возврате на экран (первый фокус пропущен); витрина предложений фильтруется по языку обучения. Выдача наборов, квота, энергия и «Начать» без изменений.
  hash: '20bc4ab7b445a90f9a3ea9e88777ce0115c133258e0974ef8ac729e4e21cbbf1', // перепин 17.10 (R115): единственное изменение маршрута после пина 15.10 — 719e4c771: перед router.push пишется локальная метка «последнее место» (recordHomeContinuePlace) и viewDeckList в зависимостях старта; логика старта/квоты прежняя
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
      ActivityIndicator: 'ActivityIndicator', AppState: { addEventListener: () => ({ remove: () => {} }) }, Pressable: 'Pressable', ScrollView: 'ScrollView', StatusBar: 'StatusBar', Text: 'Text', View: 'View',
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
    './community_packs/stage_with_retry': { stageCommunityPackCardsWithSilentRetry: async () => [], emitPackNotDownloadedToast: () => {} },
    './flashcards/marketplace': { packTitleForInterface: pack => pack.title },
    './config': { CLOUD_SYNC_ENABLED: false, IS_EXPO_GO: false },
    './events': { actionToastTri: () => ({}), emitAppEvent: () => {} },
    '../hooks/use-haptics': { hapticTap: () => { calls.haptic += 1; } },
    '../hooks/useFlashcardTrainingQuotaPreview': { useFlashcardTrainingQuotaPreview: () => ({ status: quotaStatus, limit: 30, used: 2 }) },
    './navigation_back': { safeRouterBack: (...args) => calls.back.push(args) },
    './stable_safe_area_metrics': { useStableSafeAreaInsets: () => insets },
    './load_gate_config': { LOAD_GATE_TOTAL_MS: 12_000, loadGateBackoffMs: (n) => (n >= 1 && n <= 3 ? [1000, 3000, 8000][n - 1] : null) },
    './swallow_log': { noteSwallowedAs: (_tag, fallback) => () => fallback },
  };
  const module = { exports: {} };
  // зачем (D158): сторож потолка ставит таймер; в песочнице таймеры пустые — рендер детерминирован.
  const wrapper = vm.runInNewContext(`(function(require,module,exports){${transpile(ROUTE_PATH, candidate)}\n})`, { console, setTimeout: () => 0, clearTimeout: () => {} });
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
        fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'center', // D145
        color: quota.status === 'exhausted' ? 'muted' : 'text',
      });
      assert.deepEqual(flatStyle(optIn.props.children.props.style), {
        fontSize: 15, lineHeight: 21, fontWeight: '700', textAlign: 'center',
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

// зачем (владелец 04.10: «в приложении запрещены любые различия с макетом», cards-section «Блиц / Устно / Правда-ложь / Вспомни и напиши»):
// разметка экрана настройки вынесена в TrainingSetupV2; контракт — состав элементов и привязка к логике экрана.
test('setup screen delegates the view to TrainingSetupV2 and keeps the start/quota/retry wiring', () => {
  const view = fs.readFileSync('app/flashcards/TrainingSetupV2.tsx', 'utf8');
  assert.match(routeSource, /<TrainingSetupV2/);
  assert.match(routeSource, /onStart=\{\(\) => void startTraining\(\)\}/);
  assert.match(routeSource, /onRetry=\{\(\) => retryDecksLoad\('tap'\)\}/);
  assert.match(routeSource, /quotaPreview\.status === 'exhausted'/);
  for (const id of ['fc-training-setup-header-title', 'fc-training-setup-monthly-limit', 'fc-training-setup-loading', 'fc-training-setup-start', 'fc-training-setup-upgrade', 'fc-training-setup-unavailable', 'fc-training-setup-empty']) {
    assert.ok(view.includes(id), `missing testID ${id}`);
  }
  // зачем (Карточки 2.0 12.10, cards-v2.html «Настройка»): наборы — плитки `.pk` в 2 колонки (DeckPickTile) с круглой отметкой; сегменты и кнопка — общие части kit.
  assert.ok(view.includes('KitCta') && view.includes('DeckPickTile') && view.includes('KitSegment') && view.includes('styles.chk'), 'shared kit parts');
  // зачем (решение координатора 12.10, кадр «Лимит Free»): исчерпанный лимит — не тупик, а «Безлимит с Plus» вместо «Начать».
  assert.match(view, /limitReached \?/);
  assert.match(routeSource, /limitReached=\{limitReached\}/);
  assert.match(routeSource, /onUpgrade=\{openUpgrade\}/);
  assert.doesNotMatch(view, /numberOfLines/);
});

test('session size is passed to speaking, recall and truefalse routes; blitz gets sec, recall gets dir', () => {
  const entry = fs.readFileSync('app/flashcards/training_entry.ts', 'utf8');
  assert.match(entry, /size\?: string/);
  assert.match(entry, /size: size \|\| 'all'/);
  assert.match(routeSource, /mode === 'speaking' \|\| mode === 'recall' \|\| mode === 'truefalse' \? sizeId : undefined, \{ sec: secId, dir: dirId, target: routeTarget \}/);
  assert.match(entry, /sec: extra\?\.sec \|\| '60'/);
  assert.match(entry, /dir: extra\?\.dir \|\| 'to_target'/);
});
