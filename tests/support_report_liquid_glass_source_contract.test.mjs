import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('app/support_report.tsx', 'utf8');

const CLOSE_L_CALL_SIGNATURE = 'b10987a61038050827494cb91e3e977d9ac635add22ddc0922b69a5b4a678e0d';
const EXPECTED_L_CALL_COUNTS = new Map([
  // зачем (15.10, красные сторожи; 9376e4e7f): +1 карта — нейтральный текст карточки диагностики, пока журнал выключен (remote_flags); остальные 16 карт побайтно прежние.
  ['358b563c52f6c109ad9992e1cddf02f4d96d08111a465759e62b8cf4d759351f', 1],
  ['ea5b9e6ac07f9ca7724e6360493b3f857bf1ac870f9f062f0dbf5fbf4a252929', 1],
  ['2e5bd5812deeae94c75a593b252a5f6d850c40e051d27bab4c4ac8aea009683c', 1],
  ['c672a0ca30eabc1cf5e35c47fb0a74178bafe7936fb26fe6d46e9516739299ac', 1],
  ['cfa87d9160e3cefca9ac33d1d81c837569c7bbcff22273d4abe19927359e62b7', 1],
  // 05.10: подзаголовок «Расскажи, что случилось» — обращение на «ты» (решение владельца).
  ['c8549378ce6e70b48466971ec4a17030bce509a3384558d345296b6c6cda1749', 1],
  ['82e705d4b06ea723b06d2685c20af2dfdb52170b819e8557b1c534745f65dbce', 2],
  // 04.10 (profile.html PRF-09, abc8be429): подсказка и строка диагностики сокращены, длинный абзац про бонус убран.
  // зачем (41443be48, 12.10): в украинском тексте-подсказке «фразу» → «вислів» (единое слово «вислів» в uk-интерфейсе); отпечаток подсказки пересчитан после сверки текста
  ['d006cfc36089d8902bf26c380d866700810530ffb23f2cd6895c9c4c3a9bd53c', 1],
  ['e81a0adc1aef4b7aa958d40d03ac4c6be53ea0d5f2ccb6ccf3870cd5d77398d4', 1],
  ['0d28caef3ca1a7a66555e05d3d4b367f1594fb3a2c9bcad52cbfa4aed8421413', 1],
  ['d1305be1462fa75044a75d0cd4e9366bf7f0d4d77a3f50e16ac891dac085cf16', 1],
  ['882d52d08a08b4d61850ce12791e99ba44e56250425ea31916ecc1ac38070744', 1],
  ['dbd58511e45eaaf6d232348a25ae4248db34f3c330910d55fcf7e8216758cf59', 1],
  [CLOSE_L_CALL_SIGNATURE, 1],
  // зачем (координатор 12.10, откат «Отправлено» при сбое): плашка «Не отправилось. Попробуй ещё раз» и кнопка «Повторить»
  ['1c9f3af94cbc30f07469c50c34a212a9231ec34ed7d25372bbaa6ee3cf6e98df', 1],
  ['3e17c2abebc832c494422cbceb2d7f0f0847d5299cde8831ed993ba69d51d8f4', 1],
  // зачем (решение владельца 12.10 (б)): переключатель «Приложить журнал диагностики» — его подпись и текст «Журнал не будет приложен к обращению.»
  ['61cb63e8498914bfe3e1d182405686cc80bf932ab0690c00cce5207a18e7254b', 1],
  ['055841b39652220b0455f02542779c30f60f7cb75c306b2c8ccd2eac3dfd6800', 1],
]);
const LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const RUNTIME_COPY = {
  title: ['Поддержка', 'Підтримка', 'Support', 'Soporte', 'Suporte', 'Hỗ trợ', 'Dukungan', 'Destek', 'Pomoc'],
  subtitle: ['Расскажи, что случилось', 'Розкажи, що сталося', 'Tell us what happened', 'Cuéntanos qué pasó', 'Conte o que aconteceu', 'Hãy cho chúng tôi biết chuyện gì xảy ra', 'Ceritakan apa yang terjadi', 'Ne olduğunu anlat', 'Opisz, co się stało'],
  sentTitle: ['Обращение отправлено', 'Звернення надіслано', 'Request sent', 'Solicitud enviada', 'Solicitação enviada', 'Đã gửi yêu cầu', 'Laporan terkirim', 'Talep gönderildi', 'Zgłoszenie wysłane'],
  done: ['Готово', 'Готово', 'Done', 'Listo', 'Pronto', 'Xong', 'Selesai', 'Bitti', 'Gotowe'],
};

const parseSource = candidate => ts.createSourceFile('support_report.tsx', candidate, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const signature = values => crypto.createHash('sha256').update(JSON.stringify(values)).digest('hex');

function assertLocalizedBaseline(candidate) {
  const file = parseSource(candidate);
  const calls = [];
  const walk = node => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'L') {
      assert.equal(node.arguments.length, 9, `L() at ${file.getLineAndCharacterOfPosition(node.getStart()).line + 1} has nine locale arguments`);
      assert.ok(node.arguments.every(ts.isStringLiteral), 'every localized argument remains a literal from the reviewed baseline');
      calls.push(node.arguments.map(argument => argument.text));
    }
    ts.forEachChild(node, walk);
  };
  walk(file);
  assert.equal(calls.length, 19, 'the shared title removes one duplicate baseline call and adds the local close label; PRF-09 drops the long intro paragraph; +2 for the send-failed banner and retry label; +1 for the diagnostics-off card text; +2 (owner 12.10 (b)) for the attach-log switch label and the «log won’t be attached» text');
  const actual = new Map();
  for (const call of calls) {
    const digest = signature(call);
    actual.set(digest, (actual.get(digest) ?? 0) + 1);
  }
  assert.deepEqual(actual, EXPECTED_L_CALL_COUNTS);
}

function openingElementForTestId(candidate, testID) {
  const file = parseSource(candidate);
  let found;
  const walk = node => {
    const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
    if (opening) {
      const id = opening.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.text === 'testID');
      if (id && ts.isJsxAttribute(id) && id.initializer && ts.isStringLiteral(id.initializer) && id.initializer.text === testID) found = opening;
    }
    if (!found) ts.forEachChild(node, walk);
  };
  walk(file);
  assert.ok(found, `${testID} exists`);
  assert.equal(found.tagName.getText(file), 'PressableHybrid', `${testID} uses PressableHybrid`);
  return { file, opening: found };
}

function booleanProp(candidate, testID, prop) {
  const { opening } = openingElementForTestId(candidate, testID);
  const attribute = opening.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.text === prop);
  assert.ok(attribute && ts.isJsxAttribute(attribute) && attribute.initializer && ts.isJsxExpression(attribute.initializer), `${testID}.${prop} is explicit`);
  assert.ok(
    attribute.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword || attribute.initializer.expression?.kind === ts.SyntaxKind.FalseKeyword,
    `${testID}.${prop} is an explicit boolean literal`,
  );
  return attribute.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword;
}

function assertFeedbackContract(candidate) {
  // 22.10: «назад» — общая ScreenBackButton (вибрация при нажатии и тишина — внутри неё), свой PressableHybrid снят
  assert.ok(candidate.includes('<ScreenBackButton screen="support_report" testID="support-report-back"'), 'back is the shared ScreenBackButton');
  for (const id of ['support-report-submit', 'support-report-done', 'support-diagnostics-preview-toggle']) {
    assert.equal(booleanProp(candidate, id, 'withHaptic'), false, `${id} wrapper haptic stays disabled`);
    assert.equal(booleanProp(candidate, id, 'withSound'), false, `${id} wrapper sound stays disabled`);
  }
}

function assertDiagnosticsProjection(candidate) {
  const file = parseSource(candidate);
  let properties;
  const walk = node => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'map'
      && node.expression.expression.getText(file).includes('diagnosticsPreview.events.slice(-12)')) {
      const callback = node.arguments[0];
      assert.ok(callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)), 'diagnostic map callback exists');
      const eventName = callback.parameters[0]?.name.getText(file);
      const seen = new Set();
      const scan = child => {
        if (ts.isPropertyAccessExpression(child) && child.expression.getText(file) === eventName) seen.add(child.name.text);
        ts.forEachChild(child, scan);
      };
      scan(callback.body);
      properties = [...seen].sort();
    }
    ts.forEachChild(node, walk);
  };
  walk(file);
  assert.deepEqual(properties, ['atMs', 'event', 'result'], 'rendered diagnostics expose only time, event, and result');
}

function createHarness({ lang = 'ru', capturePromise } = {}) {
  const state = [];
  const refs = [];
  const calls = { back: [], dismiss: 0, haptics: 0, sends: [] };
  let cursor = 0;
  let refCursor = 0;
  const effects = [];
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useCallback: callback => callback,
    useEffect: effect => { effects.push(effect); },
    useMemo: factory => factory(),
    useRef: initial => {
      const index = refCursor++;
      return refs[index] ??= { current: initial };
    },
    useState: initial => {
      const index = cursor++;
      state[index] ??= typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
  };
  const diagnostics = {
    capturedAtMs: 1,
    events: [
      { atMs: 2, event: 'navigation', result: 'success', screen: 'SECRET_SCREEN' },
      { atMs: 3, event: 'feature_action', result: 'info', screen: 'SECRET_SCREEN' },
    ],
  };
  const modules = {
    react: { __esModule: true, default: React, ...React },
    'react-native': {
      Keyboard: { dismiss: () => { calls.dismiss += 1; } }, Text: 'Text', TextInput: 'TextInput', View: 'View',
    },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: 'Ionicons' },
    'expo-router': { useRouter: () => ({ id: 'router' }) },
    '../components/BouncyScrollView': { __esModule: true, default: 'BouncyScrollView' },
    '../components/LangContext': { useLang: () => ({ lang }) },
    '../components/PressableHybrid': { __esModule: true, default: 'PressableHybrid' },
    '../components/SafeLinearGradient': { __esModule: true, default: 'SafeLinearGradient' },
    '../components/v2/ShadowSurface': { plateBoxShadow: () => [{ stub: 'plate' }], raisedBoxShadow: () => [{ stub: 'raised' }], nestedBoxShadow: () => [{ stub: 'nested' }], actionBoxShadow: () => [{ stub: 'action' }], PlateFill: 'PlateFill', RAISED_LIFT: -3 },
    '../components/ScreenGradient': { __esModule: true, default: 'ScreenGradient' },
    '../components/v2/ScreenBackButton': { __esModule: true, default: 'ScreenBackButton', ScreenBackSlot: 'ScreenBackSlot', ScreenBackZone: 'ScreenBackZone' },
    '../components/ThemeContext': {
      FONT_SCALE: { small: 1, medium: 1.15, large: 1.3 },
      useTheme: () => ({
        theme: { textPrimary: '#fff', textMuted: '#aaa', textGhost: '#777' },
        fontSize: 'medium', uiScale: 1, liquidGlassThemeId: 'graphite',
      }),
    },
    '../constants/i18n': { triLang: (activeLang, copy) => copy[activeLang] },
    '../constants/liquidGlassThemePalette': {
      liquidGlassTokens: () => ({
        opaqueCard: '#222', opaqueControl: '#333', selected: '#444', glassEdge: '#555', plateFillFrom: '#262626', dividerTone: '#3a3a3a', accent: '#abc', accentInk: '#111',
        cta: '#f5f5f5', ctaInk: '#111', lightTint: '#fff', secondary: '#aaa', mutedText: '#888',
      }),
    },
    '../hooks/use-haptics': { hapticTap: () => { calls.haptics += 1; } },
    '../hooks/use-screen': { normalizeSafeAreaBottomInset: value => value },
    './error_report': { ERROR_REPORT_COMMENT_MIN_LEN: 10 },
    './navigation_back': { safeRouterBack: (_router, fallback) => calls.back.push(fallback) },
    './stable_safe_area_metrics': { useStableSafeAreaInsets: () => ({ top: 1, bottom: 2, left: 3, right: 4 }) },
    // зачем (15.10, красные сторожи; тест устарел): экран спрашивает флаг диагностики через './remote_flags' — в харнессе он выключен, как в проде (isSupportDiagnosticsEnabled = () => false).
    './remote_flags': { isSupportDiagnosticsEnabled: () => false },
    './support_diagnostics': { captureSupportDiagnosticBundle: () => capturePromise ?? Promise.resolve(diagnostics) },
    // зачем: PM-229 (db985607f) добавил в экран noteSwallowedHandler — обвязка теста его не знала.
    './swallow_log': { noteSwallowedHandler: () => () => undefined },
    './support_report_outbox': { sendSupportReportInBackground: (...args) => { calls.sends.push(args); return Promise.resolve(); } },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => modules[name] }, { filename: 'support_report.tsx' });
  const render = () => {
    cursor = 0;
    refCursor = 0;
    return module.exports.default();
  };
  return { calls, diagnostics, effects, render };
}

const visit = node => Array.isArray(node)
  ? node.flatMap(visit)
  : node && typeof node === 'object' ? [node, ...visit(node.props?.children)] : [];
const strings = value => Array.isArray(value)
  ? value.flatMap(strings)
  : typeof value === 'string' ? [value] : [];
const renderedText = tree => visit(tree)
  .filter(node => node.type === 'Text')
  .flatMap(node => strings(node.props.children))
  .join(' ');

test('support screen uses the approved bounded liquid-glass geometry and font normalization', () => {
  assert.match(source, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(source, /FONT_SCALE\[fontSize\]\s*\/\s*FONT_SCALE\.medium\s*\*\s*uiScale/);
  for (const side of ['top', 'bottom', 'left', 'right']) assert.match(source, new RegExp(`padding${side[0].toUpperCase()}${side.slice(1)}:\\s*insets\\.${side}`));
  // 04.10 (profile.html `.rb.bare`, 7aae452a2): «назад» — голый шеврон, область нажатия 48×44.
  // ЗАМОК ВЛАДЕЛЬЦА 22.10 («кнопка в своём месте, не пересекается с другими элементами»): полоса кнопки ScreenBackZone стоит ДО прокрутки
  assert.ok(source.indexOf('<ScreenBackZone />') >= 0 && source.indexOf('<ScreenBackZone />') < source.indexOf('<BouncyScrollView'), 'the button zone stands before the scroll');
  assert.match(source, /fontSize:\s*scaled\(34\),\s*lineHeight:\s*scaled\(40\)/);
  assert.match(source, /fontSize:\s*scaled\(15\),\s*lineHeight:\s*scaled\(20\)/);
  assert.match(source, /fontSize:\s*scaled\(13\)[\s\S]*?letterSpacing:\s*1\.7/);
  // зачем (стиль «Тень», владелец 12.10): поле описания — плашка с тенью вместо кромки borderWidth:1.
  assert.match(source, /minHeight:\s*118[\s\S]*?borderRadius:\s*14[\s\S]*?boxShadow:\s*plateBoxShadow\(glass\)/);
  assert.doesNotMatch(source, /borderWidth|glassEdge/);
  assert.match(source, /marginTop:\s*12[\s\S]*?borderRadius:\s*14[\s\S]*?paddingVertical:\s*14[\s\S]*?paddingHorizontal:\s*16/);
  assert.match(source, /minHeight:\s*48[\s\S]*?marginTop:\s*18[\s\S]*?borderRadius:\s*24/);
  assert.match(source, /automaticallyAdjustKeyboardInsets/);
  assert.doesNotMatch(source, /SectionSheetHeader|SafeAreaView|TouchableOpacity|BlurView|adjustsFontSizeToFit|maxFontSizeMultiplier|fontWeight:\s*'800'/);
});

test('actual handlers keep validation, duplicate guard, optimistic confirmation, preview collapse, and close behavior', async () => {
  const harness = createHarness();
  let tree = harness.render();
  for (const effect of harness.effects.splice(0)) effect();
  await Promise.resolve();
  tree = harness.render();
  let nodes = visit(tree);
  const header = nodes.find(node => node.type === 'ScreenBackButton' && node.props.testID === 'support-report-back');
  assert.ok(header, 'the header back is the shared ScreenBackButton');
  assert.equal(typeof header.props.onPress, 'function');
  const input = nodes.find(node => node.type === 'TextInput' && node.props.testID === 'support-report-input');
  let submit = nodes.find(node => node.type === 'PressableHybrid' && node.props.testID === 'support-report-submit');
  assert.equal(submit.props.disabled, true, 'short reports stay disabled');
  assert.equal(submit.props.withHaptic, false);
  assert.equal(submit.props.withSound, false);
  input.props.onChangeText('  enough detail  ');
  tree = harness.render();
  nodes = visit(tree);
  submit = nodes.find(node => node.type === 'PressableHybrid' && node.props.testID === 'support-report-submit');
  assert.equal(submit.props.disabled, false);
  const toggle = nodes.find(node => node.type === 'PressableHybrid' && node.props.testID === 'support-diagnostics-preview-toggle');
  assert.equal(toggle.props.accessibilityState.expanded, false);
  assert.equal(toggle.props.withHaptic, false);
  assert.equal(toggle.props.withSound, false);
  toggle.props.onPress();
  tree = harness.render();
  nodes = visit(tree);
  assert.equal(nodes.find(node => node.props?.testID === 'support-diagnostics-preview-toggle').props.accessibilityState.expanded, true);
  const previewText = renderedText(tree);
  assert.match(previewText, /navigation/);
  assert.match(previewText, /feature_action/);
  assert.match(previewText, /success/);
  assert.match(previewText, /info/);
  assert.doesNotMatch(previewText, /SECRET_SCREEN/, 'screen metadata is not projected into the preview');
  nodes.find(node => node.props?.testID === 'support-report-submit').props.onPress();
  nodes.find(node => node.props?.testID === 'support-report-submit').props.onPress();
  assert.equal(harness.calls.dismiss, 1);
  assert.equal(harness.calls.haptics, 1);
  assert.equal(harness.calls.sends.length, 1, 'duplicate taps cannot enqueue twice');
  assert.equal(harness.calls.sends[0][0].comment, 'enough detail');
  assert.equal(harness.calls.sends[0][0].screen, 'settings_support');
  assert.equal(harness.calls.sends[0][0].diagnostics, harness.diagnostics);
  tree = harness.render();
  nodes = visit(tree);
  const done = nodes.find(node => node.type === 'PressableHybrid' && node.props.testID === 'support-report-done');
  assert.ok(done, 'optimistic sent shell renders before delivery resolves');
  assert.equal(done.props.withHaptic, false);
  assert.equal(done.props.withSound, false);
  done.props.onPress();
  assert.deepEqual(harness.calls.back, ['/(tabs)/settings']);
});

test('feedback props are scoped to each action and targeted mutations are rejected', () => {
  assertFeedbackContract(source);
  const mutation = source.replace(
    /(testID="support-report-submit"[\s\S]*?withHaptic=)\{false\}/,
    '$1{true}',
  );
  assert.notEqual(mutation, source, 'the feedback mutation was applied in memory');
  assert.throws(() => assertFeedbackContract(mutation));
});

test('all reviewed nine-locale argument arrays survive and every locale renders through the actual screen', () => {
  assertLocalizedBaseline(source);
  LOCALES.forEach((locale, index) => {
    const harness = createHarness({ lang: locale });
    let tree = harness.render();
    let text = renderedText(tree);
    assert.ok(text.includes(RUNTIME_COPY.title[index]), `${locale} title renders`);
    assert.ok(text.includes(RUNTIME_COPY.subtitle[index]), `${locale} subtitle renders`);
    let nodes = visit(tree);
    nodes.find(node => node.type === 'TextInput' && node.props.testID === 'support-report-input').props.onChangeText('enough detail');
    tree = harness.render();
    nodes = visit(tree);
    nodes.find(node => node.props?.testID === 'support-report-submit').props.onPress();
    tree = harness.render();
    text = renderedText(tree);
    assert.ok(text.includes(RUNTIME_COPY.sentTitle[index]), `${locale} sent title renders`);
    assert.ok(text.includes(RUNTIME_COPY.done[index]), `${locale} done label renders`);
  });
  const mutation = source.replace("'Поддержка', 'Підтримка', 'Support'", "'Поддержка', 'Підтримка', 'Support changed'");
  assert.notEqual(mutation, source, 'the locale mutation was applied in memory');
  assert.throws(() => assertLocalizedBaseline(mutation));
});

test('diagnostic projection is AST-scoped and rejects an event.screen mutation', () => {
  assertDiagnosticsProjection(source);
  const original = "{event.result ? ` · ${event.result}` : ''}";
  const mutation = source.replace(original, `{event.screen}${original}`);
  assert.notEqual(mutation, source, 'the diagnostic projection mutation was applied in memory');
  assert.throws(() => assertDiagnosticsProjection(mutation));
});

test('capture cleanup prevents a late diagnostic bundle from updating the unmounted screen', async () => {
  let resolveCapture;
  const capturePromise = new Promise(resolve => { resolveCapture = resolve; });
  const harness = createHarness({ capturePromise });
  let tree = harness.render();
  const cleanup = harness.effects.splice(0)[0]();
  assert.equal(typeof cleanup, 'function', 'the mounted guard registers cleanup');
  cleanup();
  resolveCapture(harness.diagnostics);
  await Promise.resolve();
  await Promise.resolve();
  tree = harness.render();
  assert.equal(visit(tree).some(node => node.props?.testID === 'support-diagnostics-preview-toggle'), false);
});

test('support copy, payload, diagnostics allowlist projection, and controls remain intact', () => {
  for (const text of [
    'Описание проблемы', 'Например: в «Карточках» нажимаю «Послушать», но звука нет.',
    'Техническая диагностика', 'без сообщений, паролей и платёжных данных.',
    'Посмотреть', 'Скрыть', 'Отправить', 'Обращение отправлено',
    'Спасибо! Команда всё проверит и ответит в приложении.', 'Готово',
  ]) assert.ok(source.includes(text), `${text} is preserved`);
  for (const token of [
    'ERROR_REPORT_COMMENT_MIN_LEN', 'submissionStartedRef.current', 'maxLength={3000}',
    "screen: 'settings_support'", "dataId: 'settings_support_request'", "dataText: 'In-app support request'",
    'diagnosticsPreview.events.slice(-12)',
    'testID="support-diagnostics-disclosure"', 'testID="support-diagnostics-preview-toggle"',
    'accessibilityLiveRegion="polite"',
  ]) assert.ok(source.includes(token), `${token} is preserved`);
  assert.ok(source.indexOf("setState('sent');") < source.indexOf('void sendSupportReportInBackground('));
  assert.doesNotMatch(source, /awardSubmissionXp|diagnosticsPreview\.(?:comment|message|password|payment)/);
});

test('the TSX remains syntactically transpileable', () => {
  const result = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true,
  });
  assert.equal(result.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
});
