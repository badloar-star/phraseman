import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_PATH = 'components/FeedbackRatingCard.tsx';
const source = fs.readFileSync(path.join(ROOT, SOURCE_PATH), 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const THEMES = [
  'graphite', 'polar', 'slate', 'ink', 'lavender', 'iris', 'rose',
  'terracotta', 'taupe', 'olive', 'sage', 'eucalyptus', 'marine',
];
const DEPENDENCY_HASHES = {
  'app/feedback_client.ts': /* 10.10: App Check снят навсегда (4a1c787b4, пломба владельца) */ '25e7478401d2c77c0b63be9ddb1b42e880118e2f16ef42bb02040d53801568c6',
  'app/feedback_outbox.ts': '26deee2c37a146ce580dcfe1103a3308cd82fa5ca0ccb32bf47e05ad0daeaca4',
  // 10.10: осознанные правки 0e7e610d2 (обрезка параметров Firebase), 33636dd55 (D136–D140), edea8fec7 (PM-229).
  'app/analytics.ts': '00301b11c671af37fc9ee39c0d92b9b611f8feb3b0e34f0af95343408a298dfe',
  // 10.10: account-authority S2c/S2d (5c0c5e234, ebc1a860d) и PM-229 (1c6ba0f4e).
  'app/stable_id.ts': 'ac879721fd8fbcebf9e3ca3e68dadcedf6f50e5d149ad81c292164eeb5b61cc2',
  'hooks/use-haptics.ts': 'fbb8366e985889400c4736f097ed12532cd06e3d5b6e2a997129e776e66ab208',
  // зачем (30.09): +контракт диагностики PM-226 (DiagnosticErrorInput, [DIAG]) в efe19ae9d — только добавление, путь доставки отзыва не тронут.
  // 10.10: PM-228 (лимит журнала, 0d6609bd2) и PM-229 (c0b7e4b1e).
  'app/debug-logger.ts': 'c674fd3f4f3670ea6754978be2045c0dbe3d11dd485b0502d2ae201ef6515d04',
};
const PROTECTED_AST = { count: 7, digest: 'd7b3c388ae552a4f7e26861d7d8cebf2a20d5cd5dff8fe768c6e90c41d494a44' };
const LEGACY_RENDER_HASHES = {
  default: '267079d88eeb0b7faf69a36280c40073803a9adfbc18439fa141c775677af3cc',
  'compact-stars': 'd62f04873bc254aa93d38de979b3c405664f4d1c11195ab219c10954a15508c0',
};

const parse = candidate => ts.createSourceFile(
  SOURCE_PATH, candidate, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
);
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
const print = (node, file) => printer.printNode(ts.EmitHint.Unspecified, node, file);

function protectedBehavior(candidate) {
  const file = parse(candidate);
  let component;
  file.forEachChild(node => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'FeedbackRatingCard') component = node;
  });
  assert.ok(component, 'FeedbackRatingCard declaration exists');
  const items = [];
  const protectedVariables = new Set([
    'text', 'rating', 'aiSummaryConsent', 'state', 'flushPendingFeedback', 'sendFeedback',
  ]);
  let effectIndex = 0;
  const walk = node => {
    if (ts.isVariableDeclaration(node)) {
      const name = ts.isIdentifier(node.name)
        ? node.name.text
        : ts.isArrayBindingPattern(node.name) && node.name.elements[0] && ts.isIdentifier(node.name.elements[0].name)
          ? node.name.elements[0].name.text
          : null;
      if (name && protectedVariables.has(name)) items.push([`var.${name}`, hash(print(node, file))]);
    }
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect') {
      items.push([`effect.${effectIndex}`, hash(print(node, file))]);
      effectIndex += 1;
    }
    ts.forEachChild(node, walk);
  };
  walk(component);
  items.sort((left, right) => left[0].localeCompare(right[0]));
  return { count: items.length, digest: hash(items.map(item => item.join(':')).join('\n')) };
}

const visit = node => Array.isArray(node)
  ? node.flatMap(visit)
  : node && typeof node === 'object' ? [node, ...visit(node.props?.children)] : [];
const flatStyle = style => Object.assign(
  {}, ...((Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean)),
);
const renderedText = node => visit(node)
  .flatMap(item => item?.props?.children ?? [])
  .filter(item => typeof item === 'string' || typeof item === 'number')
  .join(' ');
function byId(tree, testID) {
  const node = visit(tree).find(item => item.props?.testID === testID);
  assert.ok(node, `${testID} exists`);
  return node;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === 'function') return '[Function]';
  if (typeof value === 'symbol') return String(value);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => [key, canonical(item)]));
}
const renderHash = tree => hash(JSON.stringify(canonical(tree)));

function effectiveClosedCardHeight(cardStyle, headerStyle, titleLineHeight) {
  const headerHeight = Math.max(
    headerStyle.minHeight ?? 0,
    titleLineHeight + 2 * (headerStyle.paddingVertical ?? 0),
  );
  return 2 * cardStyle.paddingVertical + headerHeight + 2 * (headerStyle.marginVertical ?? 0);
}

function ratingRowMetrics(rowStyle, availableWidth) {
  const width = Math.min(availableWidth, rowStyle.maxWidth ?? availableWidth);
  const targetsWidth = 5 * 44;
  return {
    width,
    wraps: width < targetsWidth,
    gap: width >= targetsWidth ? (width - targetsWidth) / 4 : null,
  };
}

function createHarness({
  candidate = source,
  presentation = 'liquid-glass-rate',
  themeId = 'graphite',
  fontSize = 'medium',
  uiScale = 1,
  enqueueResult = true,
  title = 'Were these words worth it?',
  placeholder = 'Which words were missing? Which were pointless?',
  sendLabel = 'Send',
  thanksLabel = 'Thanks! Feedback sent',
} = {}) {
  const state = [];
  const effectSlots = [];
  const pendingEffects = [];
  let stateCursor = 0;
  let effectCursor = 0;
  const calls = {
    haptics: [], tokenIds: [], stableIds: 0, enqueued: [], flushed: [], submitted: [],
    tracked: [], errors: [],
  };
  const React = {
    Fragment: Symbol('Fragment'),
    createElement: (type, props, ...children) => ({ type, props: { ...(props ?? {}), children } }),
    useState: initial => {
      const index = stateCursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], next => {
        state[index] = typeof next === 'function' ? next(state[index]) : next;
      }];
    },
    useEffect: (effect, dependencies) => {
      const index = effectCursor++;
      const previous = effectSlots[index];
      const changed = !previous || !dependencies || dependencies.some((item, itemIndex) => item !== previous.dependencies?.[itemIndex]);
      effectSlots[index] = { ...previous, dependencies };
      if (changed) pendingEffects.push({ index, effect });
    },
  };
  const glass = {
    opaqueCard: `${themeId}-opaque-card`, glassEdge: `${themeId}-edge`,
    lightTint: `${themeId}-light`, cta: `${themeId}-cta`, ctaInk: `${themeId}-ink`,
    opaqueControl: `${themeId}-control`, mutedText: `${themeId}-muted`, text: `${themeId}-text`,
    // зачем (владелец 13.10, №35): токены кнопок темы — главная ctaFill, отключённая buttonFillDisabled
    ctaFill: `${themeId}-cta`, buttonFillDisabled: `${themeId}-control`,
  };
  const modules = {
    react: { __esModule: true, default: React, ...React },
    'react-native': {
      StyleSheet: { create: value => value, absoluteFill: { position: 'absolute', inset: 0 } },
      Text: 'Text', TextInput: 'TextInput', TouchableOpacity: 'TouchableOpacity', View: 'View',
    },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: 'Ionicons' },
    './GlassSurface': { glassFill: (color, opacity) => `fill(${color},${opacity})` },
    './ThemeContext': {
      FONT_SCALE: { small: 1, medium: 1.15, large: 1.3 },
      useTheme: () => ({
        theme: {
          textPrimary: '#text', correct: '#correct', gold: '#gold', textGhost: '#ghost',
          bgSurface: '#surface', bgCard: '#card', accent: '#accent', correctText: '#ink',
        },
        f: { body: 16, bodyLg: 18 }, liquidGlassThemeId: themeId, fontSize, uiScale,
      }),
    },
    './SafeLinearGradient': { __esModule: true, default: 'LinearGradient', LinearGradient: 'LinearGradient' },
    '../constants/liquidGlassThemePalette': {
      liquidGlassTokens: id => { calls.tokenIds.push(id); return glass; },
    },
    // зачем (владелец 12.10, стиль «Тень»): карточка без рамки — тень плашки из ShadowSurface (в харнессе — заглушка)
    './v2/ShadowSurface': { plateBoxShadow: () => [{ offsetX: 0, offsetY: 14, blurRadius: 26, spreadDistance: -14, color: '#shadow' }] },
    '../hooks/use-haptics': { hapticTap: () => calls.haptics.push('tap') },
    '../app/analytics': { trackEvent: (...args) => { calls.tracked.push(args); } },
    '../app/stable_id': { getStableId: async () => { calls.stableIds += 1; return 'account-1'; } },
    '../app/feedback_client': {
      FEEDBACK_AI_SUMMARY_CONSENT_VERSION: 'feedback-ai-summary-v2',
      submitFeedbackEntry: async input => { calls.submitted.push(input); },
    },
    '../app/feedback_outbox': {
      enqueueFeedbackEntry: async (...args) => { calls.enqueued.push(args); return enqueueResult; },
      flushFeedbackOutbox: async (...args) => { calls.flushed.push(args); },
    },
    '../app/debug-logger': { DebugLogger: { error: (...args) => calls.errors.push(args) } },
    // зачем (337e0e9be, dev_dialog_feedback): карточка читает dev-флаг «отправлено» — в harness его нет, всегда false
    '../app/dev_dialog_state': { isDevDialogFeedbackSent: () => false },
  };
  const output = ts.transpileModule(candidate, {
    fileName: SOURCE_PATH,
    compilerOptions: {
      esModuleInterop: true, jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: name => {
      if (!(name in modules)) throw new Error(`unexpected feedback dependency ${name}`);
      return modules[name];
    },
  }, { filename: SOURCE_PATH });

  const props = {
    kind: 'vocab', entityId: 'attempt-1', entityLabel: 'Deck label', lang: 'en',
    userName: 'Ada', title, placeholder, sendLabel, thanksLabel,
    ratingA11yLabel: 'Rating', testID: 'feedback-probe', presentation,
  };
  const render = (overrides = {}) => {
    stateCursor = 0;
    effectCursor = 0;
    return module.exports.default({ ...props, ...overrides });
  };
  const runEffects = () => {
    for (const pending of pendingEffects.splice(0)) {
      effectSlots[pending.index].cleanup?.();
      effectSlots[pending.index].cleanup = pending.effect();
    }
  };
  return { calls, glass, render, runEffects, state };
}

const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve => setImmediate(resolve));
};

test('protects feedback delivery AST, dependencies, and unchanged legacy presentations', () => {
  assert.deepEqual(protectedBehavior(source), PROTECTED_AST);
  for (const [relativePath, expected] of Object.entries(DEPENDENCY_HASHES)) {
    assert.equal(hash(fs.readFileSync(path.join(ROOT, relativePath))), expected, relativePath);
  }
  for (const presentation of ['default', 'compact-stars']) {
    const harness = createHarness({ presentation });
    assert.equal(renderHash(harness.render()), LEGACY_RENDER_HASHES[presentation], presentation);
  }
  const mutation = source.replace("trackEvent('feedback_entry_sent'", "trackEvent('feedback_entry_changed'");
  assert.notEqual(mutation, source);
  assert.notDeepEqual(protectedBehavior(mutation), protectedBehavior(source));
});

test('keeps default and compact-stars controls expanded with their original geometry and callbacks', async () => {
  for (const presentation of ['default', 'compact-stars']) {
    const harness = createHarness({ presentation });
    let tree = harness.render();
    assert.equal(visit(tree).some(node => node.props?.testID === 'feedback-probe-header'), false);
    const star = byId(tree, 'feedback-probe-star-3');
    assert.deepEqual(flatStyle(star.props.style), { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' });
    assert.equal(visit(star).find(node => node.type === 'Ionicons').props.size, presentation === 'compact-stars' ? 28 : 26);
    const input = byId(tree, 'feedback-probe-input');
    assert.equal(input.props.multiline, presentation !== 'compact-stars');
    assert.equal(input.props.maxLength, 2000);
    assert.equal(input.props.maxFontSizeMultiplier, 2);

    star.props.onPress();
    tree = harness.render();
    assert.equal(byId(tree, 'feedback-probe-star-3').props.accessibilityState.selected, true);
    byId(tree, 'feedback-probe-input').props.onChangeText('legacy path');
    tree = harness.render();
    byId(tree, 'feedback-probe-send').props.onPress();
    assert.deepEqual(harness.calls.haptics, ['tap', 'tap']);
    tree = harness.render();
    assert.match(renderedText(tree), /Thanks! Feedback sent/);
    await settle();
    assert.equal(harness.calls.enqueued.length, 1);
  }
});

test('renders a closed opaque liquid-glass card for all 13 themes with an accessible wrapping header', () => {
  for (const themeId of THEMES) {
    const harness = createHarness({ themeId });
    const tree = harness.render();
    const card = byId(tree, 'feedback-probe');
    const cardStyle = flatStyle(card.props.style);
    assert.equal(cardStyle.backgroundColor, harness.glass.opaqueCard);
    assert.equal(cardStyle.borderColor, undefined, 'стиль «Тень»: у карточки нет обводки');
    assert.ok(Array.isArray(cardStyle.boxShadow) && cardStyle.boxShadow.length > 0, 'вместо рамки — тень плашки');
    assert.equal(cardStyle.borderRadius, 16);
    assert.equal(cardStyle.borderWidth, undefined);
    assert.equal(cardStyle.paddingVertical, 15);
    assert.equal(cardStyle.paddingHorizontal, 16);
    assert.deepEqual(harness.calls.tokenIds, [themeId]);

    const sheen = byId(tree, 'feedback-probe-sheen');
    assert.equal(sheen.type, 'LinearGradient');
    assert.equal(sheen.props.pointerEvents, 'none');
    assert.deepEqual([...sheen.props.colors], [harness.glass.lightTint, 'transparent']);
    const header = byId(tree, 'feedback-probe-header');
    assert.equal(header.props.accessibilityRole, 'button');
    assert.deepEqual({ ...header.props.accessibilityState }, { expanded: false, disabled: false });
    assert.equal(header.props.accessibilityLabel, 'Were these words worth it?');
    const headerStyle = flatStyle(header.props.style);
    assert.equal(headerStyle.minHeight, 44);
    assert.equal(headerStyle.paddingVertical, 11);
    assert.equal(headerStyle.marginVertical, -11);
    const title = byId(tree, 'feedback-probe-title');
    assert.equal(renderedText(title), 'Were these words worth it?');
    assert.equal(flatStyle(title.props.style).fontWeight, '700');
    assert.equal(flatStyle(title.props.style).fontSize, 16 /* D145 */);
    assert.equal(flatStyle(title.props.style).lineHeight, 22);
    const closedContentHeight = effectiveClosedCardHeight(
      cardStyle, headerStyle, flatStyle(title.props.style).lineHeight,
    );
    assert.equal(closedContentHeight, 52, 'closed card content is 22dp title plus 30dp padding');
    assert.equal(
      closedContentHeight,
      52,
      'без рамки закрытая карточка снаружи 52dp (была 54 с рамкой 1dp)',
    );
    assert.equal(title.props.numberOfLines, undefined);
    assert.equal(title.props.maxFontSizeMultiplier, undefined);
    assert.equal(visit(header).find(node => node.type === 'Ionicons').props.name, 'chevron-down');
    assert.equal(visit(tree).some(node => node.props?.testID === 'feedback-probe-input'), false);
    assert.equal(visit(tree).some(node => node.props?.testID === 'feedback-probe-send'), false);
  }
});

test('opens to adaptive 34dp stars, full field geometry, and a wrapping right action', () => {
  const harness = createHarness({ fontSize: 'large', uiScale: 1.2, sendLabel: 'Send this detailed feedback now' });
  let tree = harness.render();
  byId(tree, 'feedback-probe-header').props.onPress();
  assert.deepEqual(harness.calls.haptics, ['tap']);
  tree = harness.render();
  assert.equal(byId(tree, 'feedback-probe-header').props.accessibilityState.expanded, true);
  const stars = visit(byId(tree, 'feedback-probe-rating')).filter(node => /feedback-probe-star-\d/.test(node.props?.testID ?? ''));
  assert.equal(stars.length, 5);
  for (const star of stars) {
    const targetStyle = flatStyle(star.props.style);
    assert.equal(targetStyle.minWidth, 44);
    assert.equal(targetStyle.minHeight, 44);
    assert.equal(visit(star).find(node => node.type === 'Ionicons').props.size, 34);
  }
  const ratingStyle = flatStyle(byId(tree, 'feedback-probe-rating').props.style);
  assert.equal(ratingStyle.flexWrap, 'wrap');
  assert.equal(ratingStyle.width, '100%');
  assert.equal(ratingStyle.maxWidth, 260);
  assert.equal(ratingStyle.alignSelf, 'center');
  assert.equal(ratingStyle.justifyContent, 'space-between');
  assert.equal(ratingStyle.columnGap, undefined);
  assert.deepEqual(ratingRowMetrics(ratingStyle, 260), { width: 260, wraps: false, gap: 10 });
  assert.deepEqual(ratingRowMetrics(ratingStyle, 248), { width: 248, wraps: false, gap: 7 });
  assert.deepEqual(ratingRowMetrics(ratingStyle, 246), { width: 246, wraps: false, gap: 6.5 });
  assert.deepEqual(ratingRowMetrics(ratingStyle, 219), { width: 219, wraps: true, gap: null });

  const preferenceScale = (1.3 / 1.15) * 1.2;
  const input = byId(tree, 'feedback-probe-input');
  const inputStyle = flatStyle(input.props.style);
  assert.equal(input.props.multiline, true);
  assert.equal(input.props.maxLength, 2000);
  assert.equal(input.props.maxFontSizeMultiplier, undefined);
  assert.equal(inputStyle.minHeight, 56);
  assert.equal(inputStyle.borderRadius, 12);
  assert.equal(inputStyle.paddingHorizontal, 14);
  assert.equal(inputStyle.paddingTop, 12);
  assert.equal(inputStyle.paddingBottom, 12);
  assert.equal(inputStyle.marginTop, 16);
  assert.equal(inputStyle.fontSize, 16 * preferenceScale);
  assert.equal(inputStyle.lineHeight, 22 * preferenceScale);

  const send = byId(tree, 'feedback-probe-send');
  assert.equal(send.props.disabled, true);
  assert.equal(flatStyle(send.props.style).minHeight, 44);
  const visual = byId(tree, 'feedback-probe-send-visual');
  const visualStyle = flatStyle(visual.props.style);
  assert.equal(visualStyle.minHeight, 42);
  assert.equal(visualStyle.borderRadius, 21);
  const label = byId(tree, 'feedback-probe-send-label');
  assert.equal(renderedText(label), 'Send this detailed feedback now');
  assert.equal(flatStyle(label.props.style).fontWeight, '600');
  assert.equal(flatStyle(label.props.style).fontSize, 16 * preferenceScale);
  assert.equal(flatStyle(label.props.style).lineHeight, 22 * preferenceScale);
  assert.equal(label.props.numberOfLines, undefined);
  assert.equal(visit(visual).find(node => node.type === 'Ionicons').props.size, 16);
});

test('collapse preserves draft and rating and performs no submit, flush, or network action', async () => {
  const harness = createHarness();
  let tree = harness.render();
  harness.runEffects();
  await settle();
  harness.calls.haptics.length = 0;
  harness.calls.flushed.length = 0;
  harness.calls.stableIds = 0;

  byId(tree, 'feedback-probe-header').props.onPress();
  tree = harness.render();
  byId(tree, 'feedback-probe-input').props.onChangeText('Retained draft');
  byId(tree, 'feedback-probe-star-4').props.onPress();
  tree = harness.render();
  assert.equal(byId(tree, 'feedback-probe-input').props.value, 'Retained draft');
  assert.equal(byId(tree, 'feedback-probe-star-4').props.accessibilityState.selected, true);

  byId(tree, 'feedback-probe-header').props.onPress();
  tree = harness.render();
  assert.equal(visit(tree).some(node => node.props?.testID === 'feedback-probe-input'), false);
  byId(tree, 'feedback-probe-header').props.onPress();
  tree = harness.render();
  assert.equal(byId(tree, 'feedback-probe-input').props.value, 'Retained draft');
  assert.equal(byId(tree, 'feedback-probe-star-4').props.accessibilityState.selected, true);
  assert.equal(harness.calls.haptics.length, 4, 'open, star, collapse, and reopen each haptic once');
  assert.equal(harness.calls.stableIds, 0);
  assert.deepEqual(harness.calls.flushed, []);
  assert.deepEqual(harness.calls.enqueued, []);
  assert.deepEqual(harness.calls.submitted, []);
  assert.deepEqual(harness.calls.tracked, []);
});

test('keeps optimistic sent state, exact payload, fallback delivery, and fully wrapping thanks copy', async () => {
  const harness = createHarness({ enqueueResult: false, thanksLabel: 'A very long thanks message that must remain fully visible' });
  let tree = harness.render();
  byId(tree, 'feedback-probe-header').props.onPress();
  tree = harness.render();
  byId(tree, 'feedback-probe-input').props.onChangeText('  useful note  ');
  byId(tree, 'feedback-probe-star-5').props.onPress();
  tree = harness.render();
  harness.calls.haptics.length = 0;
  byId(tree, 'feedback-probe-send').props.onPress();
  assert.deepEqual(harness.calls.haptics, ['tap']);

  tree = harness.render();
  assert.equal(visit(tree).some(node => node.props?.testID === 'feedback-probe-input'), false);
  const thanks = byId(tree, 'feedback-probe-thanks');
  assert.equal(renderedText(thanks), 'A very long thanks message that must remain fully visible');
  assert.equal(flatStyle(thanks.props.style).flexShrink, 1);
  assert.equal(thanks.props.numberOfLines, undefined);
  assert.equal(thanks.props.maxFontSizeMultiplier, undefined);
  assert.deepEqual({ ...byId(tree, 'feedback-probe-header').props.accessibilityState }, { expanded: true, disabled: true });

  await settle();
  assert.equal(
    JSON.stringify(canonical(harness.calls.tracked)),
    JSON.stringify(canonical([['feedback_entry_sent', { kind: 'vocab', rating: 5, hasText: true }]])),
  );
  assert.equal(harness.calls.enqueued.length, 1);
  assert.deepEqual({ ...harness.calls.enqueued[0][1] }, {
    kind: 'vocab', entityId: 'attempt-1', entityLabel: 'Deck label', message: 'useful note', rating: 5,
    aiSummaryConsent: true, aiSummaryConsentVersion: 'feedback-ai-summary-v2', lang: 'en', userName: 'Ada',
  });
  assert.equal(harness.calls.submitted.length, 1, 'failed persistence keeps one best-effort direct delivery');
});

test('negative mutations reject flat, clipped, inaccessible, capped, or state-reset liquid variants', () => {
  const validate = candidate => {
    const harness = createHarness({ candidate });
    let tree = harness.render();
    const card = byId(tree, 'feedback-probe');
    assert.equal(flatStyle(card.props.style).backgroundColor, harness.glass.opaqueCard);
    const cardStyle = flatStyle(card.props.style);
    const header = byId(tree, 'feedback-probe-header');
    assert.equal(header.props.accessibilityState.expanded, false);
    const headerStyle = flatStyle(header.props.style);
    assert.equal(headerStyle.paddingVertical, 11);
    assert.equal(headerStyle.marginVertical, -11);
    const titleStyle = flatStyle(byId(tree, 'feedback-probe-title').props.style);
    const closedContentHeight = effectiveClosedCardHeight(cardStyle, headerStyle, titleStyle.lineHeight);
    assert.equal(closedContentHeight, 52);
    assert.equal(closedContentHeight, 52);
    header.props.onPress();
    tree = harness.render();
    const ratingStyle = flatStyle(byId(tree, 'feedback-probe-rating').props.style);
    assert.equal(ratingStyle.maxWidth, 260);
    assert.equal(ratingStyle.alignSelf, 'center');
    assert.equal(ratingStyle.justifyContent, 'space-between');
    assert.deepEqual(ratingRowMetrics(ratingStyle, 246), { width: 246, wraps: false, gap: 6.5 });
    assert.equal(flatStyle(byId(tree, 'feedback-probe-input').props.style).minHeight, 56);
    assert.equal(byId(tree, 'feedback-probe-input').props.maxFontSizeMultiplier, undefined);
    assert.equal(flatStyle(byId(tree, 'feedback-probe-send').props.style).minHeight, 44);
    assert.equal(flatStyle(byId(tree, 'feedback-probe-send-visual').props.style).minHeight, 42);
  };
  validate(source);
  for (const [index, mutation] of [
    source.replace('backgroundColor: glass.opaqueCard', 'backgroundColor: glass.card'),
    source.replace('paddingVertical: 11,', 'paddingVertical: 0,'),
    source.replace('marginVertical: -11,', 'marginVertical: 0,'),
    source.replace("maxWidth: 260,", "maxWidth: 248,"),
    source.replace("justifyContent: 'space-between',", "justifyContent: 'center',"),
    source.replace("alignSelf: 'center',", "alignSelf: 'stretch',"),
    source.replace("accessibilityState={{ expanded: liquidBodyVisible, disabled: state === 'sent' }}", "accessibilityState={{ disabled: state === 'sent' }}"),
    source.replace('minHeight: 56', 'height: 56'),
    source.replace('maxLength={2000}\n              maxFontSizeMultiplier={undefined}', 'maxLength={2000}\n              maxFontSizeMultiplier={2}'),
    source.replace('liquidSendTarget: {\n    minHeight: 44', 'liquidSendTarget: {\n    minHeight: 42'),
    source.replace('minHeight: 42', 'height: 42'),
    source.replace('setExpanded(current => !current)', 'setExpanded(false)'),
  ].entries()) {
    assert.notEqual(mutation, source, 'negative mutation target exists');
    assert.throws(() => validate(mutation), `negative mutation ${index + 1} must fail validation`);
  }
});
