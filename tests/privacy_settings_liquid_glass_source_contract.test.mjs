import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('app/privacy_settings.tsx', 'utf8');
const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
// 11.10 (паритет profile.html PRF-07): 5 карт заменены текстами макета — подпись аналитики «Приложение работает и без этого»
// (вместо пары «Помогают понять…»/«Сейчас не отправляются»), примечание при отказе, «AI-разбор ошибок», «Сейчас не используется/-ются».
const ORIGINAL_LOCALE_SIGNATURES = [
  // зачем (15.10, красные сторожи; 79dc5dc4a, settings-gap-016): заголовок экрана укорочен «Приватность и данные» → «Приватность» на 9 языках (одна строка на узких экранах);
  // отпечаток карты заголовка заменён на новый, остальные 18 прежних карт побайтно те же.
  'b5b2c36daef45fb0da569409aee566b6fbd927a581ffdf907b3b92bcec5c3e89',
  'ba5804535e65f07d50d9dabc1129edf6e4cb17f41ecd790a427977c3697fb067',
  '76480bd36c546b53eeda83ad4ae54f315c979187c2fd6eaf89587bb04d3990c7',
  '01452ec938935627bd244abf814845f6c288c0a463b70290d5c32ac465f43dfa',
  'e0690c01636524ac0b25a09053282b986c386b796c7931bb871e3fcebb9833c3',
  'f345546cc028a3a9441bfe7ce4743bea9ca794a29535c9c06f7263741628d411',
  'ae4537eab7c45a6f9850a68bdfdd29efaf7d55240a1768bd58efa4f7b3c1c6ac',
  'c2faf6d04e53d5ed63a12980a5f1ddcc4af56918f6c42aedf24dba996d801449',
  '411bf7a8e0a523644f47e1420d49131cb754658e80c09f5c15cdad3b50e355fd',
  '2a75c541a8726db6004ecef2c3feaadfe9b140e7344206013c20ebd3537640e2',
  '6d71623a4577c55c8a1e46d17fd19999f9b4768b7dc37dfa8485f295a7d3a11e',
  '4e5e049ed04375ef9b80bce8cc459897716f3d28479176669ffbc26defae70a1',
  'bec19d24ad2ff0a49ac3eb838222c0716f3aefdae317f0b1d97bcd119ca065c3',
  'f40953d99ecd46670f37e95d8e506ca1b87bd616ec1fd1cd9682bb6bca55c1e5',
  'cf4eb60e3d53d8699e873b77792908e11e822aa17bfced7aac6727dfa01a3a9f',
  '9560e914ffe7dd6596130821f20c4e29a06bbdd5bbd491822b174fdcf4beb9dc',
  '0e9eded31321db9213fd5abbe34e9ee96bcda7a3491c19a8bf55c2c618941bad',
  'b3127350af9f1af203ec1fa8e40bae75cab61fd391146265b88110da32f2914d',
  '696488438b01421e3446cefa632028eb4c3f2e275b72b76b93e4ae256a5fbb21',
];
const ORIGINAL_HANDLER_SIGNATURES = {
  toggleAnalytics: '70f22d2ab4eb3a0f4a8d0eda17061d20d20d96cc409e61a45ecf18c9840a1617',
  toggleAiExplain: '24193d509fab9df246c546da117ec67a9a27147183d5d2408eb496c4d2a892d5',
  toggleAiDialog: 'a47644583719aeabf4988e9acf1cae8b49ca319203198a490107218415ea750c',
};

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const parse = candidate => ts.createSourceFile('privacy_settings.tsx', candidate, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function localeSignatures(candidate) {
  const file = parse(candidate);
  const signatures = [];
  const walk = node => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'L'
      && node.arguments.length === 1 && ts.isObjectLiteralExpression(node.arguments[0])) {
      const pairs = node.arguments[0].properties.map(property => {
        assert.ok(ts.isPropertyAssignment(property) && ts.isStringLiteral(property.initializer), 'localized values stay string literals');
        return [property.name.getText(file), property.initializer.text];
      });
      // 12.10 (координатор, подготовка к английскому интерфейсу): в каждой карте есть en сразу после uk; отпечаток восьми
      // прежних языков считается без en — их тексты по-прежнему побайтно сверяются со снимком.
      const keys = pairs.map(([key]) => key.replace(/^['"]|['"]$/g, ''));
      assert.deepEqual(keys, [LOCALES[0], LOCALES[1], 'en', ...LOCALES.slice(2)], 'each map keeps the eight production locales plus en after uk');
      signatures.push(sha(JSON.stringify(pairs.filter(([key]) => key.replace(/^['"]|['"]$/g, '') !== 'en'))));
    }
    ts.forEachChild(node, walk);
  };
  walk(file);
  return signatures;
}

function handlerSignatures(candidate) {
  const file = parse(candidate);
  const result = {};
  const walk = node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
      && Object.hasOwn(ORIGINAL_HANDLER_SIGNATURES, node.name.text)) {
      result[node.name.text] = sha(node.initializer.getText(file).replace(/\r\n/g, '\n'));
    }
    ts.forEachChild(node, walk);
  };
  walk(file);
  return result;
}

function createHarness(initial = { analytics: 'denied', explain: 'denied', dialog: 'denied' }, lang = 'ru', candidate = source) {
  const state = [];
  let cursor = 0;
  let refCursor = 0;
  const refs = [];
  const failLocal = new Set();
  const order = [];
  const calls = { back: [], push: [] };
  const React = {
    createElement(type, props, ...children) {
      const next = { ...(props ?? {}), children };
      return typeof type === 'function' ? type(next) : { type, props: next };
    },
    useCallback: callback => callback,
    useRef(initialValue) {
      const index = refCursor++;
      refs[index] ??= { current: initialValue };
      return refs[index];
    },
    useState(initialValue) {
      const index = cursor++;
      state[index] ??= typeof initialValue === 'function' ? initialValue() : initialValue;
      return [state[index], value => {
        const next = typeof value === 'function' ? value(state[index]) : value;
        order.push(`state:${index}:${String(next)}`);
        state[index] = next;
      }];
    },
  };
  const localSetter = name => value => {
    order.push(`local:${name}:${value}`);
    return failLocal.has(name) ? Promise.reject(new Error(`local ${name} failed`)) : Promise.resolve();
  };
  const cloud = name => () => { order.push(`cloud:${name}`); return Promise.resolve(); };
  const router = { push: route => calls.push.push(route) };
  const modules = {
    // 12.10 (стиль «Тень»): дорожка выключенного — тон без кромки (switchOffTrackTone; контраст тем — switch_track_border_contract).
    // 13.10 (Темы 4801981d8): включённый — дорожка акцента и бегунок accentInk (switchOnTone; токен проверяет local_switch_on_tone_contract).
    '../components/settings/switch_chrome': {
      switchOffTrackTone: (glass) => ({ track: glass.opaqueControl, knob: glass.secondary }),
      switchOnTone: (glass) => ({ track: glass.accentGraphic, knob: glass.accentInk }),
    },
    react: { __esModule: true, default: React, ...React },
    'react-native': { Text: 'Text', View: 'View' },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: 'Ionicons' },
    '../components/v2/BackGlyph': { __esModule: true, default: 'BackGlyph' }, // 17.10: «назад» — общий значок BackGlyph (слово владельца)
    'expo-router': { useRouter: () => router },
    '../components/BouncyScrollView': { __esModule: true, default: 'BouncyScrollView' },
    '../components/ScreenGradient': { __esModule: true, default: 'ScreenGradient' },
    '../components/ContentWrap': { __esModule: true, default: 'ContentWrap' },
    '../components/PressableHybrid': { __esModule: true, default: 'PressableHybrid' },
    '../components/v2/ShadowSurface': { plateBoxShadow: () => [{ stub: 'plate' }], raisedBoxShadow: () => [{ stub: 'raised' }], nestedBoxShadow: () => [{ stub: 'nested' }], PlateFill: 'PlateFill', RAISED_LIFT: -3 },
    '../components/DeleteAccountConfirmModal': { __esModule: true, default: 'DeleteAccountConfirmModal' },
    '../components/ThemeContext': {
      FONT_SCALE: { small: 1, medium: 1.15, large: 1.3 },
      useTheme: () => ({
        theme: { textPrimary: '#fff', textMuted: '#aaa', wrong: '#f66' },
        fontSize: 'medium', uiScale: 1, liquidGlassThemeId: 'graphite',
      }),
    },
    '../components/LangContext': { useLang: () => ({ lang }) },
    '../constants/i18n': { triLang: (active, copy) => copy[active] },
    '../constants/liquidGlassThemePalette': {
      liquidGlassTokens: () => ({ opaqueCard: '#222', opaqueControl: '#333', selected: '#444', glassEdge: '#555', lightTint: '#fff', secondary: '#aaa', plateFillFrom: '#262626', dividerTone: '#3a3a3a' }),
    },
    '../hooks/use-haptics': { hapticTap: () => { order.push('haptic'); } },
    './navigation_back': { safeRouterBack: (_router, fallback) => calls.back.push(fallback) },
    './stable_safe_area_metrics': { useStableSafeAreaInsets: () => ({ top: 1, bottom: 2, left: 3, right: 4 }) },
    './analytics_consent': {
      getAnalyticsConsentState: () => initial.analytics,
      setAnalyticsConsent: localSetter('analytics'),
    },
    './age_consent_cloud': { recordConsentToCloud: cloud('analytics') },
    // 12.10 (Дизайн через координатора, R1 E-2): облако идёт через склейку тапов (app/consent_cloud_coalescer.ts — свои тесты);
    // здесь склейка отправляет сразу, чтобы порядок «локально → облако» проверялся как прежде. Тост отката — через событие.
    './consent_cloud_coalescer': { scheduleConsentCloudRecord: (_key, send) => { void send(); } },
    // 12.10 (координатор, съёмка R1): dev robot_no_cloud выключен — порядок «локально → облако» проверяется как в продукте.
    './dev_robot_no_cloud': { isDevRobotNoCloud: () => false, noteRobotNoCloudSkip: () => undefined },
    './events': { emitAppEvent: (name, payload) => { order.push(`event:${name}:${payload?.type}:${payload?.messageEn}`); } },
    './ai_explain_consent': {
      getAiExplainConsentState: () => initial.explain,
      setAiExplainConsent: localSetter('explain'),
      recordAiExplainConsentToCloud: cloud('explain'),
    },
    './ai_dialog_consent': {
      getAiDialogConsentState: () => initial.dialog,
      setAiDialogConsent: localSetter('dialog'),
      recordAiDialogConsentToCloud: cloud('dialog'),
    },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(candidate, {
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, __DEV__: false, require: name => {
    assert.ok(modules[name], `stub exists for ${name}`);
    return modules[name];
  } }, { filename: 'privacy_settings.tsx' });
  const render = () => { cursor = 0; refCursor = 0; return module.exports.default(); };
  return { calls, order, render, failLocal };
}

const visit = node => Array.isArray(node)
  ? node.flatMap(visit)
  : node && typeof node === 'object' ? [node, ...visit(node.props?.children)] : [];
const flatStyle = style => Array.isArray(style) ? Object.assign({}, ...style.map(flatStyle)) : (style ?? {});
const strings = value => Array.isArray(value) ? value.flatMap(strings) : typeof value === 'string' ? [value] : [];
const textOf = node => strings(node?.props?.children).join('');

function assertActionWrapperFeedback(candidate) {
  const nodes = visit(createHarness(undefined, 'ru', candidate).render());
  for (const id of ['privacy-policy-row', 'privacy-terms-row', 'privacy-delete-account']) {
    const row = nodes.find(node => node.type === 'PressableHybrid' && node.props?.testID === id);
    assert.ok(row, `${id} is an actionable PrivacyRow wrapper`);
    assert.equal(row.props.withHaptic, false, `${id} disables wrapper haptic because its callback owns feedback`);
    assert.equal(row.props.withSound, false, `${id} remains silent`);
  }
}

function assertCloseHeaderGeometry(candidate) {
  const close = visit(createHarness(undefined, 'ru', candidate).render()).find(node => node.props?.testID === 'privacy-settings-close');
  assert.ok(close, 'close action renders');
  // 04.10 (profile.html PRF-07 и `.rb.bare`, коммиты abc8be429/7aae452a2): в шапке «назад» — голый шеврон
  // 21 без круга, область нажатия 48×44.
  assert.equal(flatStyle(close.props.style).width, 48);
  assert.equal(flatStyle(close.props.style).height, 44);
  assert.equal(flatStyle(close.props.contentStyle).width, 48);
  assert.equal(flatStyle(close.props.contentStyle).height, 44);
  assert.equal(flatStyle(close.props.contentStyle).borderRadius, undefined);
  // 17.10 (слово владельца): шеврон — общий значок «назад» BackGlyph (контур макета kit.js), а не системный Ionicons
  const icon = visit(close).find(node => node.type === 'BackGlyph');
  assert.ok(icon, 'close uses the shared BackGlyph');
  assert.equal(icon?.props.size, 21);
}

test('reviewed handlers and all original eight-locale maps remain byte-semantic snapshots', () => {
  assert.deepEqual(handlerSignatures(source), ORIGINAL_HANDLER_SIGNATURES);
  const signatures = localeSignatures(source);
  // зачем 22 (приказ владельца 11.10): +1 карта — пункт «Память диалогов» переехал сюда из раздела «Диалоги».
  assert.equal(signatures.length, 22, 'only close, subtitle and dialogue-memory maps are added to the 19 reviewed maps');
  for (const signature of ORIGINAL_LOCALE_SIGNATURES) {
    assert.equal(signatures.filter(value => value === signature).length, 1, `${signature} survives exactly once`);
  }
});

test('actual switches preserve independent state, local-before-cloud order, and one haptic per action', async () => {
  const harness = createHarness({ analytics: 'granted', explain: 'denied', dialog: 'granted' });
  let tree = harness.render();
  let nodes = visit(tree);
  const rows = ['privacy-analytics-consent', 'privacy-ai-explain-consent', 'privacy-ai-dialog-consent']
    .map(id => nodes.find(node => node.props?.testID === id));
  assert.deepEqual(rows.map(row => row.type), ['View', 'View', 'View'], 'toggle rows themselves are not pressable');
  let switches = nodes.filter(node => node.type === 'PressableHybrid' && node.props.accessibilityRole === 'switch');
  assert.deepEqual(switches.map(node => node.props.accessibilityState.checked), [true, false, true]);
  assert.ok(switches.every(node => node.props.withHaptic === false && node.props.withSound === false));

  for (const [index, expected] of [[0, 'denied'], [1, 'granted'], [2, 'denied']]) {
    harness.order.length = 0;
    switches[index].props.onPress();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(harness.order, [
      'haptic', `state:${index}:${expected === 'granted'}`, `local:${['analytics', 'explain', 'dialog'][index]}:${expected}`,
      `cloud:${['analytics', 'explain', 'dialog'][index]}`,
    ]);
    tree = harness.render();
    nodes = visit(tree);
    switches = nodes.filter(node => node.type === 'PressableHybrid' && node.props.accessibilityRole === 'switch');
  }
});

// зачем (FINAL_PHASE п.7, Optimistic UI): сбой локальной записи возвращает тумблер, облако не трогаем.
test('a failed local consent write rolls the switch back and skips the cloud record', async () => {
  const harness = createHarness({ analytics: 'granted', explain: 'denied', dialog: 'granted' });
  harness.failLocal.add('analytics');
  const warn = console.warn;
  console.warn = () => {};
  try {
    const switches = visit(harness.render()).filter(node => node.type === 'PressableHybrid' && node.props.accessibilityRole === 'switch');
    harness.order.length = 0;
    switches[0].props.onPress();
    await new Promise(resolve => setImmediate(resolve));
    // 12.10 (R1 E-2): откат больше не молчит — тост с понятной причиной; облако не трогаем.
    assert.deepEqual(harness.order, [
      'haptic', 'state:0:false', 'local:analytics:denied', 'state:0:true',
      "event:action_toast:error:Couldn't save the setting. Try again.",
    ]);
  } finally {
    console.warn = warn;
  }
});

test('actual close, legal navigation, and delete open/close callbacks keep their original behavior', () => {
  const harness = createHarness();
  let tree = harness.render();
  let nodes = visit(tree);
  const close = nodes.find(node => node.props?.testID === 'privacy-settings-close');
  assert.equal(close.props.withHaptic, true);
  assert.equal(close.props.withSound, false);
  assertCloseHeaderGeometry(source);
  assertActionWrapperFeedback(source);
  harness.order.length = 0;
  close.props.onPress();
  assert.deepEqual(harness.calls.back, ['/(tabs)/settings']);
  assert.deepEqual(harness.order, [], 'close callback does not duplicate the wrapper haptic');

  for (const [id, route] of [['privacy-policy-row', '/privacy_screen'], ['privacy-terms-row', '/terms_screen']]) {
    harness.order.length = 0;
    nodes.find(node => node.props?.testID === id).props.onPress();
    assert.deepEqual(harness.order, ['haptic']);
    assert.equal(harness.calls.push.at(-1), route);
  }
  harness.order.length = 0;
  nodes.find(node => node.props?.testID === 'privacy-delete-account').props.onPress();
  assert.deepEqual(harness.order, ['haptic', 'state:3:true']);
  tree = harness.render();
  nodes = visit(tree);
  let modal = nodes.find(node => node.type === 'DeleteAccountConfirmModal');
  assert.equal(modal.props.visible, true);
  modal.props.onRequestClose();
  tree = harness.render();
  modal = visit(tree).find(node => node.type === 'DeleteAccountConfirmModal');
  assert.equal(modal.props.visible, false);
});

test('feedback and close geometry assertions reject scoped wrapper and header mutations', () => {
  const feedbackMutation = source.replace(
    /(onPress=\{onPress\}\s+withHaptic=)\{false\}/,
    '$1{true}',
  );
  assert.notEqual(feedbackMutation, source, 'the actionable PrivacyRow feedback mutation was applied');
  assert.throws(() => assertActionWrapperFeedback(feedbackMutation));

  const headerMutation = source.replace(
    "style={{ width: 48, height: 44, alignSelf: 'flex-start', marginTop: 4 }}",
    "style={{ width: 47, height: 44, alignSelf: 'flex-start', marginTop: 4 }}",
  );
  assert.notEqual(headerMutation, source, 'the close-header mutation was applied');
  assert.throws(() => assertCloseHeaderGeometry(headerMutation));
});

test('every rendered row and local switch has the approved geometry, wrapping, glass, and accessibility', () => {
  const tree = createHarness().render();
  const nodes = visit(tree);
  const scroll = nodes.find(node => node.type === 'BouncyScrollView');
  const scrollNodes = visit(scroll);
  assert.ok(scrollNodes.some(node => node.props?.testID === 'privacy-settings-close'), 'header is inside the scroll view');
  const root = nodes.find(node => node.type === 'View' && flatStyle(node.props.style).paddingTop === 1);
  assert.deepEqual(
    ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].map(key => flatStyle(root.props.style)[key]),
    [1, 2, 3, 4],
  );
  const ids = ['privacy-analytics-consent', 'privacy-ai-explain-consent', 'privacy-ai-dialog-consent', 'privacy-policy-row', 'privacy-terms-row', 'privacy-delete-account'];
  for (const id of ids) {
    const row = nodes.find(node => node.props?.testID === id);
    assert.ok(row, `${id} renders`);
    const style = flatStyle(row.type === 'View' ? row.props.style : row.props.contentStyle);
    assert.equal(style.minHeight, 64);
    assert.equal(style.borderRadius, 14);
    assert.equal(style.paddingVertical, 10);
    assert.equal(style.paddingHorizontal, 14);
    assert.equal(style.gap, 14);
    const descendants = visit(row);
    assert.ok(descendants.some(node => node.type === 'View' && flatStyle(node.props.style).width === 41 && flatStyle(node.props.style).borderRadius === 10), `${id} has 41/10 tile`);
    assert.ok(descendants.some(node => node.type === 'Ionicons' && node.props.size === 20), `${id} has 20px icon`);
    // зачем (стиль «Тень», владелец 12.10): вместо блика-градиента и рамки — заливка плашки и тень, кромок нет.
    assert.equal(descendants.filter(node => node.type === 'PlateFill').length, 1, `${id} has one plate fill`);
    assert.ok(style.boxShadow, `${id} carries the plate shadow`);
    assert.ok(!descendants.some(node => node.type === 'View' && flatStyle(node.props.style).borderWidth === 1), `${id} has no rim`);
    for (const text of descendants.filter(node => node.type === 'Text')) {
      assert.equal(text.props.numberOfLines, undefined);
      assert.equal(text.props.adjustsFontSizeToFit, undefined);
      assert.equal(text.props.ellipsizeMode, undefined);
    }
  }
  const switches = nodes.filter(node => node.type === 'PressableHybrid' && node.props.accessibilityRole === 'switch');
  assert.equal(switches.length, 3);
  for (const control of switches) {
    assert.equal(flatStyle(control.props.style).minHeight, 48);
    const track = visit(control).find(node => node.type === 'View' && flatStyle(node.props.style).height === 29);
    const thumb = visit(track).find(node => node.type === 'View' && flatStyle(node.props.style).height === 21);
    assert.equal(flatStyle(track.props.style).width, 48);
    assert.equal(flatStyle(thumb.props.style).width, 21);
    // зачем (стиль «Тень», координатор 12.10): дорожка без обводки — отделяется тоном.
    assert.equal(flatStyle(track.props.style).borderWidth, undefined);
    assert.equal(typeof control.props.accessibilityLabel, 'string');
    assert.equal(typeof control.props.accessibilityState.checked, 'boolean');
  }
  const notes = nodes.filter(node => node.type === 'View' && flatStyle(node.props.style).marginTop === 12 && flatStyle(node.props.style).padding === 16);
  assert.equal(notes.length, 2);
  assert.ok(notes.every(node => flatStyle(node.props.style).borderRadius === 14));
});

test('all locale shells render and disclosures, dynamic strings, semantic delete color, and uncapped typography stay intact', () => {
  for (const locale of LOCALES) {
    const text = visit(createHarness(undefined, locale).render()).filter(node => node.type === 'Text').map(textOf).join(' ');
    assert.ok(text.length > 100, `${locale} renders localized content`);
  }
  const tree = createHarness({ analytics: 'denied', explain: 'denied', dialog: 'denied' }).render();
  const nodes = visit(tree);
  const text = nodes.filter(node => node.type === 'Text').map(textOf).join(' ');
  for (const required of [
    'Необязательные данные и документы',
    // 11.10 (паритет profile.html PRF-07): при отказе — текст макета; прежний текст остаётся для включённого согласия.
    'Сейчас данные об использовании не отправляются.',
    'Сбор технических сбоев для стабильности продолжается.',
    'Каждая функция работает только после отдельного согласия.',
    'В зависимости от функции в OpenAI отправляется текст или речь.',
    'Выключено — новые запросы не отправляются.',
    // 11.10 (паритет profile.html PRF-07): подписи строк как в макете.
    'Приложение работает и без этого', 'AI-разбор ошибок', 'Сейчас не используется', 'Сейчас не используются',
  ]) assert.ok(text.includes(required), required);
  const deleteRow = nodes.find(node => node.props?.testID === 'privacy-delete-account');
  assert.ok(visit(deleteRow).filter(node => node.type === 'Text' || node.type === 'Ionicons').some(node => node.props.color === '#f66' || flatStyle(node.props.style).color === '#f66'));
  assert.match(source, /FONT_SCALE\[fontSize\]\s*\/\s*FONT_SCALE\.medium\s*\*\s*uiScale/);
  assert.match(source, /fontSize:\s*scaled\(34\),\s*lineHeight:\s*scaled\(40\)[\s\S]*?marginTop:\s*10/);
  assert.match(source, /fontSize:\s*scaled\(15\),\s*lineHeight:\s*scaled\(20\)[\s\S]*?marginTop:\s*7/);
  assert.match(source, /fontSize:\s*scaled\(11\)[\s\S]*?fontWeight:\s*'700'[\s\S]*?letterSpacing:\s*1\.7[\s\S]*?textTransform:\s*'uppercase'[\s\S]*?marginTop:\s*24[\s\S]*?marginBottom:\s*10/);
  assert.doesNotMatch(source, /CustomSwitch|SettingsGroup|SettingsRow|SettingsSectionTitle|SectionSheetHeader|SafeAreaView|BlurView|numberOfLines|adjustsFontSizeToFit|maxFontSizeMultiplier/);
});

test('the route remains TSX-transpileable', () => {
  const result = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true,
  });
  assert.equal(result.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
});
