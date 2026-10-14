import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const SOURCE_PATH = 'app/survey_screen.tsx';
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const THEMES = ['graphite', 'polar', 'slate', 'ink', 'lavender', 'iris', 'rose', 'terracotta', 'taupe', 'olive', 'sage', 'eucalyptus', 'marine'];
const MESSAGES = {
  ru: 'Сейчас опрос недоступен. Можно вернуться в приложение и продолжить занятия.',
  uk: 'Зараз опитування недоступне. Можна повернутися в застосунок і продовжити заняття.',
  en: 'The survey is unavailable right now. You can return to the app and keep practicing.',
  es: 'La encuesta no está disponible ahora. Puedes volver a la aplicación y seguir practicando.',
  'pt-BR': 'A pesquisa está indisponível agora. Você pode voltar ao aplicativo e continuar praticando.',
  vi: 'Khảo sát hiện không khả dụng. Bạn có thể quay lại ứng dụng và tiếp tục học.',
  id: 'Survei sedang tidak tersedia. Kamu bisa kembali ke aplikasi dan melanjutkan latihan.',
  tr: 'Anket şu anda kullanılamıyor. Uygulamaya dönüp çalışmaya devam edebilirsin.',
  pl: 'Ankieta jest teraz niedostępna. Możesz wrócić do aplikacji i kontynuować naukę.',
};
const TITLES = {
  ru: 'Опрос', uk: 'Опитування', en: 'Survey', es: 'Encuesta', 'pt-BR': 'Pesquisa',
  vi: 'Khảo sát', id: 'Survei', tr: 'Anket', pl: 'Ankieta',
};
const CLOSE = {
  ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar',
  vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
};

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const parse = candidate => ts.createSourceFile(SOURCE_PATH, candidate, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const PROTECTED_AST = {
  scopeType: 'a6dc75774aa6b9164e3a5417b48851c67feb3741372e1052a9b8295bd4486411',
  scopeState: '1e8dccf8bc4a5b2d80859ba992a79e58380621a50c9e117955fbad3439cfffba',
  scope: '89a6e9e4a887a052206fb134e814dad8bcae18f651c1ca3f789ec3ceba2fb35d',
  routeScopeKey: '467b6b376e80121521404b2908942d24e6552231d400f37ce09b1f443e4a3a76',
  survey: '0e5dadc1d6e44650c621c487ab811a384ce56a4ffc309bf958d9990aa176c7f9',
  openedDayKey: 'a73c2c435c59cd2a106aa1b85675342bdafd198e49116257b0e5c5bad316bbfb',
  launch: 'a3fe315600eacda98cc846bbc7e6c51b6678bf9ae6b10f3010f24e779974905a',
  launchAccount: '6573fcaf53ec62ac10489391b27e1c3c160f8e256a5f764a2a00fca948be9c41',
  launchKey: 'dec74d0f99d33376aaabde6952b4c15d587bdefb6d70e19cdb827188f2cb3a8b',
  closeRoute: '6d7a6a0c82b725533242526425d52a4bcce58cd845b65eada3365dcec1e11906',
  requestRouteDismiss: '596fd2e28a6749d5e87869261215edf33bea573c5c77d9c8e1ddbdf3b3d34b6f',
  identityPending: '981a6704e0b1c66e6175bcd1d37fbecb0dc6a3aed7f0d14f197116b3dda23f21',
  // зачем (30.09): чистка типов 05573985e — testID на подписи и снятое явное allowFontScaling; тексты сообщений прежние.
  fallbackMessages: '1e8bfa42c09d6ba908cf1511dfbc04cdccee9aa83072bf3fd51608d21e9a93a2',
  fallbackClose: '51e89556dce9ce90627bb8a14cceb9a6f6a475cc5d6dd1eb15d40c1fb247d4c7',
  sharedSheet: '2bf422a86200e6edc2338c714f533c6f28bbe9063e13cbc8442406df2fe0a30c',
  effects: [
    'f3d6c283a61d46534095cac5dd2901d8b9ab9ccdabfc322e4b9977b0a4e6976c',
    '3f5ad1b366ba22aa0e9cc333e3ccbe89dd82028dc3ace53d37424601fe9d5965',
  ],
};

const PROTECTED_FILES = new Map([
  // зачем (30.09): жемчуг удалён из окна опроса (e2ba35f65) — законное изменение, хеш сдвинут.
  // зачем (Тень 12.10): в SurveySheetModal менялся ТОЛЬКО вид — варианты и поле ввода без кромок, с plateBoxShadow/raisedBoxShadow; логика прежняя.
  // зачем (координатор 12.10, разрешение на правку закреплённого файла): у снятого варианта transform со значением undefined → в dev
  // processTransform(null) падал на null.forEach при смене выбора (класс краша смены языка 91758eb36). Теперь `: []` — вид прежний.
  ['components/survey/SurveySheetModal.tsx', '81b69a017a60fa4f639bd9880204208dd11de7cc3da57ced0657c23a26040c11'],
  ['app/survey_handoff.ts', 'b93b86591466a6b7514340828964231245d32e1fb2529f04b2d0072b7b13ff6f'],
  // зачем (30.09): награда жемчугом за опрос удалена (PM-058/D70, efe19ae9d) — законно.
  ['app/survey_flow_controller.ts', '420e4a04cc27a63cf45ea604e2b00f19b87eef5d300d0d5acf0a7133b2977b30'],
    // зачем (10.10): диагностика замка аккаунта [ACCOUNT-LOCK] 04–05.10 (9b22f79fa, 3b156c292 и др.) — логика не менялась.
  // зачем (15.10, красные сторожи; fdab41c40): в модуль добавлена только регистрация диагностического зонда кэша registerHubCacheProbe (журнал [HUB-LIFECYCLE]); поколения аккаунта не менялись.
  ['app/account_generation.ts', '1c79c28d3a3c9d1fdaffab458179f982f5542efd197f5ba26976f2d16201cd92'],
    // зачем (10.10): модульный API Firebase (8798dc612) — getAuth через rnfbInstance.
  ['app/user_id_policy.ts', '7267cf972c901610f06266655f46fe5a5bff3175a06b08eb1a6454371f6a600c'],
]);

function protectedAst(candidate) {
  const file = parse(candidate);
  let screen;
  const result = { effects: [] };
  file.forEachChild(node => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === 'ScopeIdentityState') result.scopeType = hash(node.getText(file));
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'SurveyScreen') screen = node;
  });
  assert.ok(screen, 'SurveyScreen exists');
  const names = new Set(['scope', 'routeScopeKey', 'survey', 'openedDayKey', 'launch', 'launchAccount', 'launchKey', 'closeRoute', 'requestRouteDismiss', 'identityPending']);
  const walk = node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && names.has(node.name.text)) {
      result[node.name.text] = hash(node.getText(file));
    }
    if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name)
      && node.name.elements[0]?.name?.getText(file) === 'scopeIdentity') result.scopeState = hash(node.initializer.getText(file));
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'triLang') {
      const firstProperty = node.arguments[1]?.properties?.[0];
      if (firstProperty?.initializer?.text === MESSAGES.ru) result.fallbackMessages = hash(node.arguments[1].getText(file));
    }
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect') result.effects.push(hash(node.getText(file)));
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'SurveySheetModal') result.sharedSheet = hash(node.getText(file));
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'UnavailableSurvey') {
      const close = node.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.text === 'onClose');
      result.fallbackClose = hash(close.initializer.expression.getText(file));
    }
    ts.forEachChild(node, walk);
  };
  walk(screen);
  return result;
}

function localizedMessages(candidate) {
  const file = parse(candidate);
  let result;
  const walk = node => {
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'triLang') {
      const object = node.arguments[1];
      if (ts.isObjectLiteralExpression(object) && object.properties.some(property => property.initializer?.text === MESSAGES.ru)) {
        result = Object.fromEntries(object.properties.map(property => [property.name.text, property.initializer.text]));
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(file);
  return result;
}

const visit = node => Array.isArray(node)
  ? node.flatMap(visit)
  : node && typeof node === 'object' ? [node, ...visit(node.props?.children)] : [];
const strings = value => Array.isArray(value)
  ? value.flatMap(strings)
  : value && typeof value === 'object' ? strings(value.props?.children)
    : typeof value === 'string' ? [value] : [];
const flatStyle = style => Object.assign({}, ...((Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean)));

function createHarness({ candidate = source, lang = 'ru', themeId = 'graphite', fontSize = 'medium', uiScale = 1, messageOverride } = {}) {
  const state = [];
  const refs = [];
  const effects = [];
  const calls = { back: [], clear: 0, haptics: 0, tokenIds: [] };
  let stateCursor = 0;
  let refCursor = 0;
  const React = {
    Fragment: Symbol('Fragment'),
    createElement: (type, props, ...children) => ({ type, props: { ...(props ?? {}), children } }),
    useCallback: callback => callback,
    useEffect: effect => { effects.push(effect); },
    useMemo: factory => factory(),
    useRef: initial => {
      const index = refCursor++;
      return refs[index] ??= { current: initial };
    },
    useState: initial => {
      const index = stateCursor++;
      state[index] ??= typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
  };
  const glass = {
    opaqueCard: `${themeId}-card`, opaqueControl: `${themeId}-control`, selected: `${themeId}-selected`,
    glassEdge: `${themeId}-edge`, lightTint: `${themeId}-light`, cta: `${themeId}-cta`,
    ctaInk: `${themeId}-ink`, secondary: `${themeId}-secondary`, mutedText: `${themeId}-muted`,
  };
  const modules = {
    react: { __esModule: true, default: React, ...React },
    'react-native': { ActivityIndicator: 'ActivityIndicator', StyleSheet: { create: value => value }, View: 'View' },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: 'Ionicons' },
    'expo-router': { useRouter: () => ({ id: 'router' }), useLocalSearchParams: () => ({ surveyId: 'missing' }) },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '../components/BouncyScrollView': { __esModule: true, default: 'BouncyScrollView' },
    '../components/ContentWrap': { __esModule: true, default: 'ContentWrap' },
    '../components/LangContext': { useLang: () => ({ lang }) },
    '../components/PressableHybrid': { __esModule: true, default: 'PressableHybrid' },
    '../components/SafeLinearGradient': { __esModule: true, default: 'SafeLinearGradient' },
    '../components/ScreenGradient': { __esModule: true, default: 'ScreenGradient' },
    '../components/survey/SurveySheetModal': { __esModule: true, default: 'SurveySheetModal' },
    '../components/text-integrity': { FlowText: 'FlowText' },
    '../components/ThemeContext': {
      FONT_SCALE: { small: 1, medium: 1.15, large: 1.3 },
      useTheme: () => ({
        theme: { bgPrimary: '#000', textPrimary: '#fff' }, f: { body: 16 }, themeMode: 'dark',
        fontSize, uiScale, liquidGlassThemeId: themeId,
      }),
    },
    '../constants/i18n': {
      triLang: (active, copy) => messageOverride && copy.ru === MESSAGES.ru ? messageOverride : copy[active],
    },
    '../constants/liquidGlassThemePalette': {
      liquidGlassTokens: id => { calls.tokenIds.push(id); return glass; },
    },
    '../constants/theme': { screenTextOnGradient: () => ({ primary: '#fff' }) },
    '../hooks/use-haptics': { hapticTap: () => { calls.haptics += 1; } },
    './account_generation': {
      captureAccountGeneration: () => ({ phase: 'active', stableId: 'account-a', generation: 1 }),
      subscribeAccountGeneration: () => ({ remove() {} }),
    },
    // зачем (10.10): 83cc65a5e (мгновенное открытие) добавил синхронную сверку личности; стенд идёт прежним путём
    // «checking», который и проверяют тесты недоступного маршрута.
    './config': { CLOUD_SYNC_ENABLED: false },
    './stable_id': { peekStableId: () => null },
    './local_date': { getUtcDayKey: () => '2099-01-01' },
    './navigation_back': { safeRouterBack: (...args) => calls.back.push(args) },
    './stable_safe_area_metrics': { useStableSafeAreaInsets: () => ({ top: 11, right: 12, bottom: 13, left: 14 }) },
    './survey_handoff': {
      clearPrimedSurvey: () => { calls.clear += 1; },
      takePrimedSurvey: () => null,
    },
    './survey_flow_controller': {},
    './user_id_policy': { getCanonicalUserId: () => Promise.resolve('account-a') },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(candidate, {
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => modules[name], console, Date, Math, setTimeout, clearTimeout }, { filename: SOURCE_PATH });
  const expand = node => {
    if (Array.isArray(node)) return node.map(expand);
    if (!node || typeof node !== 'object') return node;
    if (typeof node.type === 'function') return expand(node.type(node.props));
    return { ...node, props: { ...node.props, children: expand(node.props?.children) } };
  };
  const render = () => {
    stateCursor = 0;
    refCursor = 0;
    effects.length = 0;
    return module.exports.default();
  };
  const renderFallback = async () => {
    render();
    const pendingEffects = effects.splice(0);
    for (const effect of pendingEffects) effect();
    await Promise.resolve();
    await Promise.resolve();
    return expand(render());
  };
  return { calls, glass, renderFallback };
}

test('identity, handoff, day-boundary, once-close, shared-sheet, messages, and protected source files remain byte-exact', () => {
  assert.deepEqual(protectedAst(source), PROTECTED_AST);
  assert.deepEqual(localizedMessages(source), MESSAGES);
  for (const [file, expected] of PROTECTED_FILES) assert.equal(hash(fs.readFileSync(file)), expected, file);

  const identityMutation = source.replace('canonicalStableId === scope.stableId', 'canonicalStableId !== scope.stableId');
  assert.notEqual(identityMutation, source);
  assert.notDeepEqual(protectedAst(identityMutation), PROTECTED_AST);
  const messageMutation = source.replace('Сейчас опрос недоступен.', 'Опрос пока недоступен.');
  assert.notEqual(messageMutation, source);
  assert.notDeepEqual(localizedMessages(messageMutation), MESSAGES);
});

test('actual unavailable route renders the approved bounded geometry, stable safe edges, font normalization, and full wrapping', async () => {
  const harness = createHarness({ lang: 'ru', fontSize: 'large', uiScale: 1.2 });
  const tree = await harness.renderFallback();
  const nodes = visit(tree);
  const byId = id => {
    const node = nodes.find(item => item.props?.testID === id);
    assert.ok(node, `${id} exists`);
    return node;
  };
  const safe = byId('survey-fallback-safe-frame');
  assert.deepEqual(flatStyle(safe.props.style), { flex: 1, paddingTop: 11, paddingRight: 12, paddingBottom: 13, paddingLeft: 14 });
  assert.ok(nodes.some(node => node.type === 'ContentWrap'));
  assert.equal(nodes.find(node => node.type === 'ScreenGradient').props.artBackdrop, 'settings');

  const close = byId('survey-fallback-close');
  assert.equal(close.type, 'PressableHybrid');
  // 11.10 (паритет profile.html PRF-13, `.rb.bare`): «назад» — голый шеврон без круга и кромки, область нажатия 48×44.
  assert.deepEqual(flatStyle(close.props.style), { width: 48, height: 44, alignSelf: 'flex-start', marginTop: 4 });
  assert.deepEqual(flatStyle(close.props.contentStyle), { width: 48, height: 44, alignItems: 'flex-start', justifyContent: 'center' });
  const closeIcon = visit(close).find(node => node.type === 'Ionicons');
  // зачем (10.10): паритет с макетом profile.html (abc8be429) — «назад» шевроном вместо крестика.
  assert.equal(closeIcon.props.name, 'chevron-back');
  assert.equal(closeIcon.props.size, 21);

  const scale = 1.3 / 1.15 * 1.2;
  const titleStyle = flatStyle(byId('survey-fallback-title').props.style);
  assert.equal(titleStyle.fontSize, Math.round(34 * scale));
  assert.equal(titleStyle.lineHeight, Math.round(40 * scale));
  assert.equal(titleStyle.marginTop, 10);
  const scroll = byId('survey-fallback-scroll');
  assert.equal(scroll.type, 'BouncyScrollView');
  assert.equal(flatStyle(scroll.props.style).flex, 1);
  assert.equal(flatStyle(scroll.props.contentContainerStyle).flexGrow, 1);
  const empty = flatStyle(byId('survey-fallback-empty').props.style);
  assert.equal(empty.flex, 1);
  assert.equal(empty.justifyContent, 'center');
  assert.equal(empty.alignItems, 'center');
  assert.equal(empty.paddingTop, undefined);

  const tile = byId('survey-fallback-icon-tile');
  assert.deepEqual(flatStyle(tile.props.style), {
    width: 61, height: 61, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    // 11.10 (стиль «Тень»): плитка без кромки — тон фона и блик.
    backgroundColor: harness.glass.opaqueControl, overflow: 'hidden',
  });
  const tileIcon = visit(tile).find(node => node.type === 'Ionicons');
  assert.equal(tileIcon.props.size, 25);
  assert.equal(tileIcon.props.name, 'chatbubble-outline');
  assert.equal(byId('survey-fallback-icon-sheen').props.pointerEvents, 'none');

  const headingStyle = flatStyle(byId('survey-fallback-heading').props.style);
  assert.equal(headingStyle.fontSize, Math.round(20 * scale));
  assert.equal(headingStyle.lineHeight, Math.round(26 * scale));
  assert.equal(headingStyle.marginTop, 17);
  const bodyStyle = flatStyle(byId('survey-fallback-body').props.style);
  assert.equal(bodyStyle.fontSize, Math.round(14 * scale));
  assert.equal(bodyStyle.lineHeight, Math.round(20 * scale));
  assert.equal(bodyStyle.maxWidth, 280);
  assert.equal(bodyStyle.marginTop, 7);
  const ok = byId('survey-fallback-ok');
  assert.equal(ok.type, 'PressableHybrid');
  assert.equal(flatStyle(ok.props.style).marginTop, 20);
  // 11.10 (паритет profile.html PRF-13): малая кнопка `.cta.sm` — 42, r21.
  assert.equal(flatStyle(ok.props.contentStyle).minHeight, 42);
  assert.equal(flatStyle(ok.props.contentStyle).borderRadius, 21);
  assert.equal(strings(ok.props.children).join(''), 'Вернуться'); // макет PRF-13 (abc8be429): «Вернуться» вместо «OK»
  for (const node of nodes.filter(item => item.type === 'FlowText')) {
    assert.equal(node.props.numberOfLines, undefined);
    assert.equal(node.props.adjustsFontSizeToFit, undefined);
    assert.equal(node.props.maxFontSizeMultiplier, undefined);
    // 30.09: явное allowFontScaling={true} снято чисткой типов (05573985e) — по умолчанию и так true;
    // суть сторожа — масштаб шрифта НЕ запрещён.
    assert.notEqual(node.props.allowFontScaling, false);
  }
  assert.match(source, /FONT_SCALE\[fontSize\]\s*\/\s*FONT_SCALE\.medium\s*\*\s*uiScale/);
  assert.doesNotMatch(source, /SafeAreaView|BlurView|paddingTop:\s*170|adjustsFontSizeToFit|maxFontSizeMultiplier|numberOfLines/);
});

test('all nine actual localized fallbacks preserve copy, split only typography, and share one silent wrapper callback', async () => {
  for (const locale of LOCALES) {
    const harness = createHarness({ lang: locale });
    const tree = await harness.renderFallback();
    const nodes = visit(tree);
    const byId = id => {
      const node = nodes.find(item => item.props?.testID === id);
      assert.ok(node, `${locale}: ${id} exists`);
      return node;
    };
    assert.equal(strings(byId('survey-fallback-title').props.children).join(''), TITLES[locale]);
    assert.equal(byId('survey-fallback-close').props.accessibilityLabel, CLOSE[locale]);
    // 11.10 (паритет profile.html PRF-13): заголовок пустого состояния — без точки; текст в остальном не меняется.
    const original = MESSAGES[locale];
    const cut = original.indexOf('. ');
    const expected = cut >= 0 ? `${original.slice(0, cut)} ${original.slice(cut + 2)}` : original.replace(/[.。]\s*$/, '');
    assert.equal(strings(byId('survey-fallback-message').props.children).join(' '), expected);
    const close = byId('survey-fallback-close');
    const ok = byId('survey-fallback-ok');
    assert.equal(close.props.onPress, ok.props.onPress);
    assert.equal(close.props.withHaptic, false);
    assert.equal(close.props.withSound, false);
    assert.equal(ok.props.withHaptic, false);
    assert.equal(ok.props.withSound, false);
    close.props.onPress();
    assert.equal(harness.calls.haptics, 1);
    assert.equal(harness.calls.clear, 1);
    assert.equal(harness.calls.back.length, 1);
    assert.equal(harness.calls.back[0].length, 1, 'safeRouterBack keeps its original no-fallback call');
  }
});

test('sentence splitting is safe when no boundary exists and every neutral theme reaches actual fallback nodes', async () => {
  const unsplit = createHarness({ messageOverride: 'Fallback without sentence boundary' });
  const unsplitNodes = visit(await unsplit.renderFallback());
  const message = unsplitNodes.find(node => node.props?.testID === 'survey-fallback-message');
  assert.ok(message, 'unsplit message exists');
  assert.equal(strings(message.props.children).join(''), 'Fallback without sentence boundary');
  assert.equal(unsplitNodes.some(node => node.props?.testID === 'survey-fallback-body'), false);

  for (const themeId of THEMES) {
    const harness = createHarness({ themeId });
    const nodes = visit(await harness.renderFallback());
    const tile = nodes.find(node => node.props?.testID === 'survey-fallback-icon-tile');
    const ok = nodes.find(node => node.props?.testID === 'survey-fallback-ok');
    assert.ok(tile, `${themeId}: icon tile exists`);
    assert.ok(ok, `${themeId}: OK action exists`);
    assert.ok(harness.calls.tokenIds.length >= 1);
    assert.ok(harness.calls.tokenIds.every(id => id === themeId));
    assert.equal(flatStyle(tile.props.style).backgroundColor, `${themeId}-control`);
    assert.equal(flatStyle(ok.props.contentStyle).backgroundColor, `${themeId}-cta`);
  }
});

test('node-scoped fallback checks reject feedback and geometry mutations', async () => {
  const assertCriticalNodes = async candidate => {
    const nodes = visit(await createHarness({ candidate }).renderFallback());
    const close = nodes.find(node => node.props?.testID === 'survey-fallback-close');
    const tile = nodes.find(node => node.props?.testID === 'survey-fallback-icon-tile');
    assert.ok(close);
    assert.ok(tile);
    assert.equal(close.props.withHaptic, false);
    assert.equal(close.props.withSound, false);
    assert.equal(flatStyle(tile.props.style).width, 61);
    assert.equal(flatStyle(tile.props.style).height, 61);
    assert.equal(flatStyle(tile.props.style).borderRadius, 16);
  };
  await assertCriticalNodes(source);

  const feedbackMutation = source.replace(
    /(testID="survey-fallback-close"[\s\S]*?withHaptic=)\{false\}/,
    '$1{true}',
  );
  assert.notEqual(feedbackMutation, source);
  await assert.rejects(() => assertCriticalNodes(feedbackMutation));

  const geometryMutation = source.replace(
    /(testID="survey-fallback-icon-tile"[\s\S]*?width:\s*)61/,
    '$160',
  );
  assert.notEqual(geometryMutation, source);
  await assert.rejects(() => assertCriticalNodes(geometryMutation));
});

test('survey screen remains syntactically transpileable', () => {
  const result = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true,
  });
  assert.equal(result.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
});
