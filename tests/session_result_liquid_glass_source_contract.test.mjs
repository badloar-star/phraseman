import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_PATH = 'app/flashcards/SessionResultScreen.tsx';
const source = fs.readFileSync(path.join(ROOT, SOURCE_PATH), 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const parse = (relativePath, candidate) => ts.createSourceFile(
  relativePath,
  candidate,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
const print = (node, file) => printer.printNode(ts.EmitHint.Unspecified, node, file);

const THEMES = [
  'graphite', 'polar', 'slate', 'ink', 'lavender', 'iris', 'rose',
  'terracotta', 'taupe', 'olive', 'sage', 'eucalyptus', 'marine',
];
const LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const CLOSE_COPY = {
  ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar',
  vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
};
const CALLER_HASHES = {
  'app/flashcards_blitz_session.tsx': '3d1ea533da47551edd3986fb9340fd9c4289ae390c3067b6eeae5cc242634fcb',
  'app/flashcards_recall_session.tsx': 'd2aadef834596945ab0bfc45014d13bd7bc3581b1aaba8845eab26b482416127',
  'app/flashcards_swipe.tsx': '6d0e9410bfed5feaccf12bc784473e4f6d33d839cc626215ec8668738f288ee1',
  'app/flashcards_speaking_session.tsx': 'ab93e11aadd09277d3a23075d47f4d7f4d1ade81de67800234f9fae0c17843ea',
};
const PROTECTED_BEHAVIOR_HASH = '0689a7139976210059b57b497d298adf7e966deabd1edcc755d7b6c19d375734';

function protectedBehavior(candidate) {
  const file = parse(SOURCE_PATH, candidate);
  let propsType;
  let reward;
  let screen;
  file.forEachChild(node => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === 'SessionResultScreenProps') propsType = node;
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'ResultRuneAward') reward = node;
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'SessionResultScreenImpl') screen = node;
  });
  assert.ok(propsType && reward && screen, 'result component protected declarations exist');
  const items = [];
  const add = (key, value) => items.push([key, hash(value)]);
  add('props.type', print(propsType, file));

  for (const [scope, root] of [['reward', reward], ['screen', screen]]) {
    let effectIndex = 0;
    const walk = node => {
      if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect') {
        add(`${scope}.effect.${effectIndex}`, print(node, file));
        effectIndex += 1;
      }
      if (ts.isVariableDeclaration(node)) {
        const name = ts.isIdentifier(node.name)
          ? node.name.text
          : ts.isArrayBindingPattern(node.name) && node.name.elements[0] && ts.isIdentifier(node.name.elements[0].name)
            ? node.name.elements[0].name.text
            : null;
        if ([
          'runeFlight', 'originReady', 'targetReady', 'playedRef',
          'accent', 'total', 'accuracyPct', 'showFeedback',
        ].includes(name)) add(`${scope}.var.${name}`, print(node, file));
      }

      const opening = ts.isJsxElement(node)
        ? node.openingElement
        : ts.isJsxSelfClosingElement(node) ? node : null;
      if (scope === 'reward' && opening && opening.tagName.getText(file) === 'View') {
        const ref = opening.attributes.properties.find(
          property => ts.isJsxAttribute(property) && property.name.text === 'ref',
        );
        const refText = ref?.initializer?.getText(file) ?? '';
        if (refText.includes('counterRef') || refText.includes('originRef')) {
          const attributes = opening.attributes.properties
            .filter(property => !(ts.isJsxAttribute(property) && property.name.text === 'style'))
            .map(property => property.getText(file))
            .join('|');
          add(`reward.anchor.${refText.includes('counterRef') ? 'counter' : 'origin'}`, attributes);
        }
      }
      if (ts.isJsxSelfClosingElement(node) && ['FeedbackRatingCard', 'ResultRuneAward'].includes(node.tagName.getText(file))) {
        const rendered = print(node, file);
        add(
          `screen.jsx.${node.tagName.getText(file)}`,
          node.tagName.getText(file) === 'FeedbackRatingCard'
            ? rendered.replace(/\s+presentation="liquid-glass-rate"/, '')
            : rendered,
        );
      }
      if (
        scope === 'reward'
        && ts.isJsxSelfClosingElement(node)
        && ['Image', 'AnimatedCountUpText', 'LearningV2RuneFlight'].includes(node.tagName.getText(file))
      ) {
        const attributes = node.attributes.properties
          .filter(property => !(ts.isJsxAttribute(property) && property.name.text === 'style'))
          .map(property => property.getText(file))
          .join('|');
        add(`reward.jsx.${node.tagName.getText(file)}`, attributes);
      }
      if (scope === 'screen' && ts.isJsxElement(node)) {
        const attributes = node.openingElement.attributes.properties;
        const testID = attributes.find(
          property => ts.isJsxAttribute(property) && property.name.text === 'testID',
        );
        const testText = testID?.initializer?.getText(file) ?? '';
        if (testText.includes('-retry') || testText.includes('-done')) {
          const onPress = attributes.find(
            property => ts.isJsxAttribute(property) && property.name.text === 'onPress',
          );
          add(`screen.press.${testText.includes('-retry') ? 'retry' : 'done'}`, onPress.initializer.getText(file));
        }
      }
      if (
        scope === 'screen'
        && ts.isBinaryExpression(node)
        && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
        && node.left.getText(file) === 'onRetryWrong'
      ) add('screen.retry.visibility', `${print(node.left, file)}&&${print(node.right, file)}`);
      if (
        scope === 'screen'
        && ts.isBinaryExpression(node)
        && node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
        && node.left.getText(file) === 'retryLabel'
      ) add('screen.retry.label', print(node, file));
      ts.forEachChild(node, walk);
    };
    walk(root);
  }
  items.sort((left, right) => left[0].localeCompare(right[0]));
  return {
    count: items.length,
    digest: hash(items.map(item => item.join(':')).join('\n')),
  };
}

function callerNodeHash(relativePath) {
  const candidate = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  const file = parse(relativePath, candidate);
  let resultNode;
  const walk = node => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'SessionResultScreen') resultNode = node;
    ts.forEachChild(node, walk);
  };
  walk(file);
  assert.ok(resultNode, `${relativePath} result caller exists`);
  return hash(print(resultNode, file));
}

const visit = node => Array.isArray(node)
  ? node.flatMap(visit)
  : node && typeof node === 'object' ? [node, ...visit(node.props?.children)] : [];
const strings = value => Array.isArray(value)
  ? value.flatMap(strings)
  : value && typeof value === 'object' ? strings(value.props?.children)
    : typeof value === 'string' || typeof value === 'number' ? [String(value)] : [];
const renderedText = node => strings(node?.props?.children).join(' ');
const flatStyle = style => Object.assign(
  {},
  ...((Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean)),
);
const directChildren = node => (Array.isArray(node?.props?.children)
  ? node.props.children.flat(Infinity).filter(Boolean)
  : node?.props?.children ? [node.props.children] : []);
function parentOf(root, target) {
  let result;
  const walk = node => {
    if (result || !node || typeof node !== 'object') return;
    if (directChildren(node).includes(target)) {
      result = node;
      return;
    }
    for (const child of directChildren(node)) walk(child);
  };
  walk(root);
  return result;
}

function createHarness({
  candidate = source,
  lang = 'en',
  themeId = 'graphite',
  fontSize = 'medium',
  uiScale = 1,
  width = 390,
  nativeFontScale = 1,
  contentMaxW = 640,
  feedbackGate = () => Promise.resolve(false),
} = {}) {
  const state = [];
  const refs = [];
  const effects = [];
  const calls = {
    events: [], tokenIds: [], assets: [], feedbackChecks: [], feedbackMarks: [],
    flights: [], clearedFlights: 0,
  };
  let stateCursor = 0;
  let refCursor = 0;
  const React = {
    Fragment: Symbol('Fragment'),
    createElement: (type, props, ...children) => ({ type, props: { ...(props ?? {}), children } }),
    memo: component => component,
    useEffect: effect => { effects.push(effect); },
    useRef: initial => {
      const index = refCursor++;
      return refs[index] ??= { current: initial };
    },
    useState: initial => {
      const index = stateCursor++;
      state[index] ??= typeof initial === 'function' ? initial() : initial;
      return [state[index], value => {
        state[index] = typeof value === 'function' ? value(state[index]) : value;
      }];
    },
  };
  const glass = {
    opaqueCard: `${themeId}-card`, opaqueControl: `${themeId}-control`,
    glassEdge: `${themeId}-edge`, lightTint: `${themeId}-light`,
    cta: `${themeId}-cta`, ctaInk: `${themeId}-ink`, secondary: `${themeId}-secondary`,
  };
  const modules = {
    react: { __esModule: true, default: React, ...React },
    'react-native': {
      ScrollView: 'ScrollView', Text: 'Text', View: 'View', TouchableOpacity: 'TouchableOpacity',
      StyleSheet: { create: value => value, hairlineWidth: 1, absoluteFill: { position: 'absolute', inset: 0 } },
      useWindowDimensions: () => ({ width, height: 844, scale: 3, fontScale: nativeFontScale }),
    },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: 'Ionicons' },
    'expo-image': { Image: 'Image' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '../../components/ThemeContext': {
      FONT_SCALE: { small: 1, medium: 1.15, large: 1.3 },
      useTheme: () => ({
        theme: {
          accent: '#accent', correctText: '#dark', textPrimary: '#primary', textMuted: '#muted',
          correct: '#correct', wrong: '#wrong', bgCard: '#old-card', border: '#old-border',
        },
        f: { h2: 24, body: 15, numLg: 30, caption: 13, bodyLg: 17 },
        themeMode: 'dark', liquidGlassThemeId: themeId, fontSize, uiScale,
      }),
    },
    '../theme_ui_assets': {
      themeUiAsset: (...args) => { calls.assets.push(args); return `${args.join('-')}-asset`; },
    },
    '../../components/LangContext': { useLang: () => ({ lang }) },
    '../../components/ScreenGradient': { __esModule: true, default: 'ScreenGradient' },
    '../../components/ContentWrap': { __esModule: true, default: 'ContentWrap' },
    '../../components/PressableHybrid': { __esModule: true, default: 'PressableHybrid' },
    '../../components/SafeLinearGradient': {
      __esModule: true, default: 'SafeLinearGradient', LinearGradient: 'SafeLinearGradient',
    },
    '../../components/AnimatedCountUpText': { AnimatedCountUpText: 'AnimatedCountUpText' },
    '../../components/FeedbackRatingCard': { __esModule: true, default: 'FeedbackRatingCard' },
    '../../constants/color_contrast': { buttonForegroundForBackground: () => '#contrast' },
    '../../constants/i18n': { triLang: (active, copy) => copy[active] },
    '../../constants/liquidGlassThemePalette': {
      liquidGlassTokens: id => { calls.tokenIds.push(id); return glass; },
    },
    '../feedback_prompt_throttle': {
      shouldPromptFeedback: kind => { calls.feedbackChecks.push(kind); return feedbackGate(); },
      markFeedbackPrompted: kind => { calls.feedbackMarks.push(kind); },
    },
    '../../hooks/use-screen': { useScreen: () => ({ contentMaxW }) },
    './SoundService': {
      fcHaptic: kind => { calls.events.push(`haptic:${kind}`); },
      playSfx: name => { calls.events.push(`sfx:${name}`); },
    },
    '../../components/LearningV2RuneFlight': { LearningV2RuneFlight: 'LearningV2RuneFlight' },
    '../../hooks/usePracticeRuneFlight': {
      usePracticeRuneFlight: () => ({
        counterRef: { current: null }, originRef: { current: null },
        flight: null,
        fly: amount => calls.flights.push(amount),
        clearFlight: () => { calls.clearedFlights += 1; },
      }),
    },
    '../stable_safe_area_metrics': {
      useStableSafeAreaInsets: () => ({ top: 11, right: 12, bottom: 13, left: 14 }),
    },
  };
  const output = ts.transpileModule(candidate, {
    fileName: SOURCE_PATH,
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: name => {
      if (!(name in modules)) throw new Error(`unexpected result dependency ${name}`);
      return modules[name];
    },
    requestAnimationFrame: callback => { callback(); return 1; },
    cancelAnimationFrame: () => {},
  }, { filename: SOURCE_PATH });

  const expand = node => {
    if (Array.isArray(node)) return node.map(expand);
    if (!node || typeof node !== 'object') return node;
    if (typeof node.type === 'function') return expand(node.type(node.props));
    return { ...node, props: { ...node.props, children: expand(node.props?.children) } };
  };
  const render = props => {
    stateCursor = 0;
    refCursor = 0;
    effects.length = 0;
    return expand(module.exports.SessionResultScreen(props));
  };
  return { calls, effects, glass, render, state };
}

function baseProps(overrides = {}) {
  return {
    correct: 7,
    wrong: 3,
    runesGained: 12,
    learnLeft: 2,
    onRetryWrong: () => {},
    onDone: () => {},
    accentColor: '#session-accent',
    feedback: { entityId: 'attempt-1', entityLabel: 'Deck label' },
    testID: 'result-probe',
    ...overrides,
  };
}

function byId(tree, testID) {
  const node = visit(tree).find(item => item.props?.testID === testID);
  assert.ok(node, `${testID} exists`);
  return node;
}

function assertTopDownResultFlow(tree) {
  const title = byId(tree, 'result-probe-title');
  const content = parentOf(tree, title);
  assert.ok(content, 'title content block exists');
  const contentStyle = flatStyle(content.props.style);
  assert.equal(contentStyle.flexGrow, undefined, 'content does not consume surplus vertical space');
  assert.equal(contentStyle.justifyContent, undefined, 'content remains in normal top-down flow');

  const cta = parentOf(tree, byId(tree, 'result-probe-done'));
  const rootContent = parentOf(tree, content);
  assert.ok(cta && rootContent, 'content and CTA parents exist');
  assert.ok(
    directChildren(rootContent).indexOf(content) < directChildren(rootContent).indexOf(cta),
    'CTA follows result content in normal flow',
  );
}

function assertCoreLayout(tree, harness, { stacked }) {
  const safe = byId(tree, 'result-probe-safe-frame');
  assert.deepEqual(flatStyle(safe.props.style), {
    flex: 1, paddingTop: 11, paddingRight: 12, paddingBottom: 13, paddingLeft: 14,
  });
  assert.ok(visit(tree).some(node => node.type === 'ContentWrap'));
  const container = byId(tree, 'result-probe');
  assert.equal(flatStyle(container.props.style).paddingHorizontal, 20);

  const close = byId(tree, 'result-probe-close');
  assert.equal(close.type, 'PressableHybrid');
  assert.equal(close.props.withHaptic, false);
  assert.equal(close.props.withSound, false);
  assert.equal(flatStyle(close.props.style).width, 48);
  assert.equal(flatStyle(close.props.style).height, 48);
  assert.equal(
    flatStyle(close.props.style).justifyContent,
    'flex-end',
    'the 42dp visual circle ends at the 48dp target bottom so the title gap is exactly 18dp',
  );
  assert.equal(flatStyle(close.props.contentStyle).width, 42);
  assert.equal(flatStyle(close.props.contentStyle).height, 42);
  assert.equal(flatStyle(close.props.contentStyle).borderRadius, 21);
  assert.equal(flatStyle(close.props.contentStyle).borderWidth, 1);
  assert.equal(flatStyle(close.props.contentStyle).backgroundColor, harness.glass.opaqueControl);
  const closeIcon = visit(close).find(node => node.type === 'Ionicons');
  assert.equal(closeIcon.props.name, 'close');
  assert.equal(closeIcon.props.size, 20);

  const title = byId(tree, 'result-probe-title');
  const titleStyle = flatStyle(title.props.style);
  assert.equal(titleStyle.fontWeight, '700');
  assert.equal(titleStyle.textAlign, 'center');
  assert.equal(titleStyle.marginTop, 18);
  assertTopDownResultFlow(tree);
  const statsStyle = flatStyle(byId(tree, 'result-probe-stats').props.style);
  assert.equal(statsStyle.borderRadius, 16);
  assert.equal(statsStyle.borderWidth, 1);
  assert.equal(statsStyle.backgroundColor, harness.glass.opaqueCard);
  assert.equal(statsStyle.borderColor, harness.glass.glassEdge);
  assert.equal(statsStyle.flexDirection, stacked ? 'column' : 'row');
  const sheen = byId(tree, 'result-probe-stats-sheen');
  assert.equal(sheen.type, 'SafeLinearGradient');
  assert.equal(sheen.props.pointerEvents, 'none');
  assert.deepEqual([...sheen.props.colors], [harness.glass.lightTint, 'transparent']);

  const counts = visit(tree).filter(node => node.type === 'AnimatedCountUpText');
  assert.deepEqual(counts.map(node => node.props.value), [7, 3, 70, 12]);
  for (const count of counts.slice(0, 3)) {
    const style = flatStyle(count.props.style);
    assert.equal(style.fontWeight, '700');
    assert.ok(style.fontSize > 0);
    assert.ok(style.lineHeight > style.fontSize);
  }

  const rune = byId(tree, 'result-probe-runes');
  const runeStyle = flatStyle(rune.props.style);
  assert.equal(runeStyle.minHeight, 54);
  assert.equal(runeStyle.marginTop, 12);
  assert.equal(runeStyle.gap, 14);
  const runeImage = visit(rune).find(node => node.type === 'Image');
  assert.deepEqual(flatStyle(runeImage.props.style), { width: 44, height: 44 });
  assert.equal(runeImage.props.source, 'dark-rune-asset');
  assert.match(rune.props.accessibilityLabel, /Runes earned: 12/);

  const done = byId(tree, 'result-probe-done');
  assert.equal(done.type, 'PressableHybrid');
  assert.equal(done.props.withHaptic, false);
  assert.equal(done.props.withSound, false);
  assert.equal(flatStyle(done.props.contentStyle).minHeight, 52);
  assert.equal(flatStyle(done.props.contentStyle).borderRadius, 26);
  assert.equal(flatStyle(done.props.contentStyle).backgroundColor, harness.glass.cta);
  const retry = byId(tree, 'result-probe-retry');
  assert.equal(flatStyle(retry.props.contentStyle).minHeight, 48);
  assert.ok(visit(tree).indexOf(done) < visit(tree).indexOf(retry), 'primary Done precedes quiet retry');
}

test('protects reward lifecycle, calculations, feedback behavior, callbacks, props, and all four callers', () => {
  assert.deepEqual(protectedBehavior(source), { count: 23, digest: PROTECTED_BEHAVIOR_HASH });
  for (const [relativePath, expected] of Object.entries(CALLER_HASHES)) {
    assert.equal(callerNodeHash(relativePath), expected, relativePath);
  }
  const mutation = source.replace("playSfx('session_complete');", "playSfx('tap');");
  assert.notEqual(mutation, source);
  assert.notDeepEqual(protectedBehavior(mutation), protectedBehavior(source));
});

test('renders stable four-edge, 13-theme geometry and stacks stats only for constrained scaled layouts', () => {
  for (const themeId of THEMES) {
    const harness = createHarness({ themeId, width: 430, nativeFontScale: 1 });
    const tree = harness.render(baseProps());
    assert.deepEqual(harness.calls.tokenIds, [themeId]);
    assertCoreLayout(tree, harness, { stacked: false });
  }

  const large = createHarness({ width: 320, nativeFontScale: 1.8, fontSize: 'large', uiScale: 1.2 });
  const largeTree = large.render(baseProps());
  assertCoreLayout(largeTree, large, { stacked: true });
  const titleStyle = flatStyle(byId(largeTree, 'result-probe-title').props.style);
  const preferenceScale = (1.3 / 1.15) * 1.2;
  assert.equal(titleStyle.fontSize, 30 * preferenceScale);
  assert.equal(titleStyle.lineHeight, 36 * preferenceScale);

  const samePreferenceDifferentNative = createHarness({ width: 900, nativeFontScale: 2.2, fontSize: 'large', uiScale: 1.2 });
  const otherTitle = flatStyle(byId(samePreferenceDifferentNative.render(baseProps()), 'result-probe-title').props.style);
  assert.equal(otherTitle.fontSize, titleStyle.fontSize, 'native fontScale is not multiplied into font size twice');
  const clamped = createHarness({ width: 1200, contentMaxW: 640, nativeFontScale: 2 });
  assertCoreLayout(clamped.render(baseProps()), clamped, { stacked: true });
  assert.doesNotMatch(source, /Math\.min\(2\.4,\s*Math\.max\(1,\s*nativeFontScale/);
  assert.doesNotMatch(source, /numberOfLines|adjustsFontSizeToFit|maxFontSizeMultiplier|BlurView/);
});

test('keeps exact zero/nonzero calculations, optional score, rune settlement, scroll, and full wrapping', () => {
  const zeroHarness = createHarness();
  const zero = zeroHarness.render(baseProps({ correct: 0, wrong: 0, runesGained: 0, scoreText: undefined }));
  assert.deepEqual(
    visit(zero).filter(node => node.type === 'AnimatedCountUpText').map(node => node.props.value),
    [0, 0, 0],
  );
  assert.equal(visit(zero).some(node => node.props?.testID === 'result-probe-runes'), false);
  assert.equal(visit(zero).some(node => node.props?.testID === 'result-probe-score'), false);
  assertTopDownResultFlow(zero);

  const scoredHarness = createHarness();
  const scored = scoredHarness.render(baseProps({ scoreText: 'Score: 1250' }));
  assert.equal(renderedText(byId(scored, 'result-probe-score')), 'Score: 1250');
  const scroll = visit(scored).find(node => node.type === 'ScrollView');
  assert.ok(scroll);
  assert.equal(scroll.props.automaticallyAdjustKeyboardInsets, true);
  assert.equal(scroll.props.keyboardShouldPersistTaps, 'handled');
  assert.equal(scroll.props.showsVerticalScrollIndicator, false);
  assert.match(source, /runesGained > 0 \? <ResultRuneAward amount=\{runesGained\} testID=\{testID\} \/> : null/);

  const rune = byId(scored, 'result-probe-runes');
  rune.props.onLayout();
  const origin = visit(scored).find(node => node.type === 'View' && node.props?.pointerEvents === 'none' && node.props?.onLayout);
  assert.ok(origin, 'rune flight origin exists');
  origin.props.onLayout();
  scoredHarness.render(baseProps({ scoreText: 'Score: 1250' }));
  for (const effect of scoredHarness.effects.splice(0)) effect();
  assert.deepEqual(scoredHarness.calls.flights, [12]);
});

test('preserves feedback allowed, denied, and cancelled behavior with every original card prop', async () => {
  const denied = createHarness({ feedbackGate: () => Promise.resolve(false) });
  let tree = denied.render(baseProps());
  for (const effect of denied.effects.splice(0)) effect();
  await Promise.resolve();
  await Promise.resolve();
  tree = denied.render(baseProps());
  assert.equal(visit(tree).some(node => node.type === 'FeedbackRatingCard'), false);
  assertTopDownResultFlow(tree);
  assert.deepEqual(denied.calls.feedbackChecks, ['vocab']);
  assert.deepEqual(denied.calls.feedbackMarks, []);

  const allowed = createHarness({ feedbackGate: () => Promise.resolve(true) });
  allowed.render(baseProps());
  for (const effect of allowed.effects.splice(0)) effect();
  await Promise.resolve();
  await Promise.resolve();
  tree = allowed.render(baseProps());
  const card = visit(tree).find(node => node.type === 'FeedbackRatingCard');
  assert.ok(card, 'allowed feedback is rendered');
  assert.deepEqual(
    {
      kind: card.props.kind,
      entityId: card.props.entityId,
      entityLabel: card.props.entityLabel,
      lang: card.props.lang,
      title: card.props.title,
      placeholder: card.props.placeholder,
      sendLabel: card.props.sendLabel,
      thanksLabel: card.props.thanksLabel,
      ratingA11yLabel: card.props.ratingA11yLabel,
      testID: card.props.testID,
      presentation: card.props.presentation,
    },
    {
      kind: 'vocab', entityId: 'attempt-1', entityLabel: 'Deck label', lang: 'en',
      title: 'Were these words worth it?',
      placeholder: 'Which words were missing? Which were pointless?',
      sendLabel: 'Send', thanksLabel: 'Thanks! Feedback sent', ratingA11yLabel: 'Rating',
      testID: 'result-probe-feedback', presentation: 'liquid-glass-rate',
    },
  );
  assert.deepEqual(allowed.calls.feedbackMarks, ['vocab']);

  let resolveGate;
  const gate = new Promise(resolve => { resolveGate = resolve; });
  const cancelled = createHarness({ feedbackGate: () => gate });
  cancelled.render(baseProps());
  const cleanups = cancelled.effects.splice(0).map(effect => effect()).filter(Boolean);
  for (const cleanup of cleanups) cleanup();
  resolveGate(true);
  await Promise.resolve();
  await Promise.resolve();
  tree = cancelled.render(baseProps());
  assert.equal(visit(tree).some(node => node.type === 'FeedbackRatingCard'), false);
  assert.deepEqual(cancelled.calls.feedbackMarks, []);
});

test('Done, close, and retry each haptic once before the original callback and keep retry visibility rules', () => {
  const completion = createHarness();
  completion.render(baseProps({ feedback: undefined }));
  for (const effect of completion.effects.splice(0)) effect();
  assert.deepEqual(completion.calls.events, ['sfx:session_complete', 'haptic:finish']);

  const harness = createHarness({ lang: 'ru' });
  const props = baseProps({
    onDone: () => harness.calls.events.push('callback:done'),
    onRetryWrong: () => harness.calls.events.push('callback:retry'),
  });
  const tree = harness.render(props);
  byId(tree, 'result-probe-done').props.onPress();
  byId(tree, 'result-probe-close').props.onPress();
  byId(tree, 'result-probe-retry').props.onPress();
  assert.deepEqual(harness.calls.events, [
    'haptic:tap', 'callback:done',
    'haptic:tap', 'callback:done',
    'haptic:tap', 'callback:retry',
  ]);

  const hidden = createHarness().render(baseProps({ learnLeft: 0, retryLabel: undefined }));
  assert.equal(visit(hidden).some(node => node.props?.testID === 'result-probe-retry'), false);
  const absent = createHarness().render(baseProps({ learnLeft: 4, onRetryWrong: undefined }));
  assert.equal(visit(absent).some(node => node.props?.testID === 'result-probe-retry'), false);
  const custom = createHarness().render(baseProps({ learnLeft: 0, retryLabel: 'One more!' }));
  assert.equal(renderedText(byId(custom, 'result-probe-retry')), 'One more!');

  for (const lang of LOCALES) {
    const localized = createHarness({ lang }).render(baseProps());
    assert.equal(byId(localized, 'result-probe-close').props.accessibilityLabel, CLOSE_COPY[lang]);
  }
});

test('scoped validators reject geometry, safe-edge, feedback-wrapper, and rune regressions', () => {
  const validate = candidate => {
    const harness = createHarness({ candidate, width: 430 });
    assertCoreLayout(harness.render(baseProps()), harness, { stacked: false });
  };
  validate(source);
  for (const mutation of [
    source.replace('paddingHorizontal: 20', 'paddingHorizontal: 24'),
    source.replace('borderRadius: 16', 'borderRadius: 18'),
    source.replace('minHeight: 52', 'minHeight: 48'),
    source.replace('paddingLeft: insets.left', 'paddingLeft: 0'),
    source.replace('withHaptic={false}', 'withHaptic={true}'),
    source.replace("themeUiAsset(themeMode, 'rune')", "themeUiAsset(themeMode, 'coin')"),
    source.replace("centerBlock: { alignItems: 'center'", "centerBlock: { flexGrow: 1, justifyContent: 'center', alignItems: 'center'"),
    source.replace("justifyContent: 'flex-end', alignSelf: 'flex-start'", "justifyContent: 'flex-start', alignSelf: 'flex-start'"),
    source.replace('marginTop: 18 },', 'marginTop: 10 },'),
    source.replace('marginTop: 12,\n    minHeight: 54', 'marginTop: 18,\n    minHeight: 54'),
    source.replace('gap: 14,', 'gap: 8,'),
  ]) {
    assert.notEqual(mutation, source, 'negative mutation target exists');
    assert.throws(() => validate(mutation));
  }
});
