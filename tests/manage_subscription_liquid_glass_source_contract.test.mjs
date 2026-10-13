import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const SOURCE_PATH = 'app/manage_subscription.tsx';
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const THEMES = ['graphite', 'polar', 'slate', 'ink', 'lavender', 'iris', 'rose', 'terracotta', 'taupe', 'olive', 'sage', 'eucalyptus', 'marine'];
const LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const BENEFITS = [
  ['energy', 'Энергия не расходуется'],
  ['free_conversation', 'Свободный разговор'],
  ['pronunciation', 'Произношение без дневного лимита'],
  ['saved_phrases', 'Сохранённые фразы без ограничения'],
  ['streak_freezes', '3 заморозки серии в месяц'],
  ['detailed_stats', 'Подробная статистика занятий'],
  ['flashcard_training', 'Тренировки с карточками без ограничений'],
];
const hash = value => crypto.createHash('sha256').update(value.replaceAll('\r\n', '\n')).digest('hex');
const parse = candidate => ts.createSourceFile(SOURCE_PATH, candidate, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const PROTECTED = {
  named: {
    CANCEL_REASONS: '98774110e6449c88c6c7a38cee4543dd13cdbc16d5ceca9dde2fd22124b56877',
    getStoreManageUrl: '889ed1b036067e1cf9398ee93d8f33a10cb2b54cddbb95066cf5bfb3de3bfd18',
    formatDate: '2b21987d10c5cbf17b7f4e4db7efb4ef404330f064c3cfeb903522c536472b5c',
    normalizeStoredPremiumPlan: '80b061538b95c3e412ca32d39839912a6145440350b67890e88d4370a7de0993',
    localPremiumPlan: '5bf00fdbbd770828440f955b2c054728a9017d8c04ec5fb9a7fa62191071d3bd',
    saveOfferBusyRef: '11c098352306821bedbf7a32ef18b62ae645c019dda94b2b653918b9dc635837',
    screenAccountRef: 'a87c8a558d3d5d19cd493847ae71a1b398779e64459f4b2139345a25edf7fdd7',
    // зачем (15.10, красные сторожи; сверено по diff eb716d9a0 и 23a4eb6f7): только dev-подмены съёмки — план `plan=` в памяти (getDevPlanOverride) и прогресс оффера удержания (getDevSaveOfferProgress); покупка, отмена и сохранение плана без изменений.
    metadata: 'f9927407e615e5b15ad74a3f6de16d3ccc5e7527f5fc32a9933e0f1d140ef1dc',
    currentPlan: 'b3faa9100cbf1afd53f96d18550e6df6642c75f06b6fbf41c8267fc92eeeefd8',
    nextDate: '66bf1de86141b5428c525d2697c97107074c60e15ef3481279cf1c85a465ed3e',
    isLifetime: '4f7491ad8e638bd4e6ed1e0e1d3c0d84f9c0c64406ed2c5d86231c72c8293668',
    isMonthly: '0e26382096b4bdbf76e42dc5ddcbc4093d3f9fecfc9eb3b4679bf524c59fc5ad',
    planLabel: '4452e54660a8def87df4a03d96a9e4b7673931a615c7c3a233dcc80726512200',
    // зачем (PM-229, db985607f, проверено по диффу): в этих трёх функциях изменились ТОЛЬКО немые `.catch(() => {})` → `.catch(noteSwallowedHandler(...))`:
    // причина сбоя пишется в журнал, значение по умолчанию и порядок платёжных шагов прежние. Хеши перечислены заново после этого осмотра.
    // зачем (15.10 вечер, перепрогон красных; сверено по diff d35cf5cec): в результаты handleChangePlan и openStoreCancel добавлено только поле messageEn (английский текст сообщения) — покупка, отмена и смена плана без изменений.
    handleChangePlan: 'edcaed7e3f6dc294a9030a9ae3802d8b1abd25231fb7f328fd257c3e6462892a',
    // хэш обновлён 10.10: в handleRestore добавлен синхронный замок restoringRef от двойного тапа (деньги/активация не менялись).
    // хэш обновлён 13.10 (Авторизация, profile-024/paywalls-022): dev-ветка restorepurchase=empty ДО вызова магазина (в сторе геттер выключен); деньги/активация не менялись.
    handleRestore: '2f879b25a72de5380be37eefbfad7ad57df78b29b68ed71f2ecf650e87688853',
    handleRestoreRef: '1b3dbed6ce5c65341dc1c80dac2a6478a19c791b36f0b38d6bb9d161c7663cf4',
    closeCancelSheet: 'f0f3df64441f33d8e9298e729fbe40fedf5ee81c3eade3bea7e3acc27c567090',
    openStoreCancel: 'bc53a7375ec8a9bab103ec11d2302ff01c79fa2995cc4424cd17aaf5ccee8892',
    submitCancel: '2516a18017d6460a9388c4195d80b6b710cce026bc673b3a51758fcfc723482a',
    acceptSaveOffer: '062c49d78361a4a2714e55ae2809682429d2b092819e441cb2a7ab0eb41b48b0',
    declineSaveOffer: '2a951a60709478ff7a332b8508882b2c326fa185f89b232f736687aaa2ede883',
  },
  effects: ['c1753c1d96cb8a6bb515eda888154f7dffeeca1eca00d0256620adad4a20dab0', '24651baf84ebb807d5a14a5628362a43a0d0c938bd98a8d936889eef9b7a6fd5' /* перепин 12.10: 7a79d3519 (Авторизация, paywalls-020) — ранний выход dev-подмены manage=loading до try в эффекте загрузки; в стор-сборке isDevManageLoadingHold() всегда false (заглушка), поведение не меняется */],
};

function protectedSnapshot(candidate) {
  const file = parse(candidate);
  const result = { named: {}, effects: [] };
  const names = new Set(Object.keys(PROTECTED.named));
  const walk = node => {
    if (ts.isFunctionDeclaration(node) && node.name && names.has(node.name.text)) result.named[node.name.text] = hash(node.getText(file));
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && names.has(node.name.text)) result.named[node.name.text] = hash(node.getText(file));
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect') result.effects.push(hash(node.getText(file)));
    ts.forEachChild(node, walk);
  };
  walk(file);
  return result;
}

function benefitRows(candidate) {
  const file = parse(candidate);
  let declaration;
  const walk = node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'INCLUDED') declaration = node;
    ts.forEachChild(node, walk);
  };
  walk(file);
  assert.ok(declaration && ts.isArrayLiteralExpression(declaration.initializer), 'INCLUDED remains a literal reviewable list');
  return declaration.initializer.elements.map(element => {
    assert.ok(ts.isObjectLiteralExpression(element));
    return Object.fromEntries(element.properties.map(property => {
      assert.ok(ts.isPropertyAssignment(property));
      const key = property.name.getText(file).replace(/^['"]|['"]$/g, '');
      assert.ok(ts.isStringLiteral(property.initializer));
      return [key, property.initializer.text];
    }));
  });
}

function initializerHash(candidate, variableName) {
  const file = parse(candidate);
  let initializer = '';
  const walk = node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === variableName) {
      initializer = node.initializer?.getText(file) ?? '';
    }
    ts.forEachChild(node, walk);
  };
  walk(file);
  return hash(initializer);
}

function reasonCopyDiagnostics(candidate) {
  const file = parse(candidate);
  const declarations = [];
  const walk = node => {
    if (ts.isTypeAliasDeclaration(node) && ['ManageSubscriptionCopy', 'ManageSubscriptionReasonCopy', 'ManageSubscriptionBenefit'].includes(node.name.text)) {
      declarations.push(node.getText(file));
    }
    if (ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => ts.isIdentifier(declaration.name) && ['INCLUDED', 'CANCEL_REASONS'].includes(declaration.name.text))) {
      declarations.push(node.getText(file));
    }
    ts.forEachChild(node, walk);
  };
  walk(file);
  const fileName = 'manage_subscription_reason_contract.ts';
  const contract = [
    'interface Array<T> { readonly [index: number]: T }',
    'type Exclude<T, U> = T extends U ? never : T;',
    'type Pick<T, K extends keyof T> = { [P in K]: T[P] };',
    'type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;',
    'declare namespace React { type ComponentProps<T> = { name: string } }',
    'declare const Ionicons: unknown;',
    ...declarations,
  ].join('\n');
  const options = { strict: true, noEmit: true, noLib: true, types: [] };
  const host = {
    fileExists: name => name === fileName,
    readFile: name => name === fileName ? contract : undefined,
    getSourceFile: (name, languageVersion) => name === fileName ? ts.createSourceFile(name, contract, languageVersion, true) : undefined,
    getDefaultLibFileName: () => '',
    writeFile() {},
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    getCanonicalFileName: name => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
  };
  return ts.createProgram([fileName], options, host).getSemanticDiagnostics().map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '));
}

const visit = node => Array.isArray(node) ? node.flatMap(visit) : node && typeof node === 'object' ? [node, ...visit(node.props?.children)] : [];
const flatStyle = style => Object.assign({}, ...((Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean)));
const textOf = node => visit(node).flatMap(item => item?.props?.children ?? []).filter(value => typeof value === 'string').join('');
const byId = (tree, id) => visit(tree).find(node => node.props?.testID === id);

function createHarness({ plan = 'yearly', themeId = 'graphite', lang = 'ru', storePlan = plan, yearlyPackage = true, restoreDeferred = false, initialInfo, initialLoading, expiryMs = null } = {}) {
  const state = [];
  const initialStateByIndex = new Map();
  if (initialInfo !== undefined) initialStateByIndex.set(1, initialInfo);
  if (initialLoading !== undefined) initialStateByIndex.set(3, initialLoading);
  const refs = [];
  const effects = [];
  let stateCursor = 0;
  let refCursor = 0;
  let effectCursor = 0;
  const calls = { haptics: 0, backs: [], pushes: [], tokenIds: [], restore: 0, change: 0 };
  let releaseRestore;
  const restoreWait = new Promise(resolve => { releaseRestore = resolve; });
  const React = {
    Fragment: 'Fragment',
    createElement(type, props, ...children) { return { type, props: { ...(props ?? {}), children } }; },
    useState(initial) {
      const index = stateCursor++;
      if (!(index in state)) state[index] = initialStateByIndex.has(index)
        ? initialStateByIndex.get(index)
        : typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useRef(initial) { const index = refCursor++; return refs[index] ??= { current: initial }; },
    useCallback(callback) { return callback; },
    useEffect(effect) { const index = effectCursor++; if (!effects[index]) effects[index] = { effect, ran: false }; },
  };
  const glass = { bgTop: '#101', bgBottom: '#202', opaqueCard: '#303', opaqueControl: '#404', glassEdge: '#505', selected: '#606', lightTint: '#fff', text: '#eee', secondary: '#bbb', mutedText: '#999', cta: '#fafafa', ctaInk: '#111' };
  const router = { push: route => calls.pushes.push(route) };
  const token = { generation: 7, stableId: 'account-1', phase: 'active' };
  const customerInfo = { _plan: storePlan, entitlements: { active: {} } };
  const yearlyPkg = { identifier: 'annual', product: { priceString: '€44.99' } };
  const modules = {
    react: { __esModule: true, default: React, ...React },
    'react-native': {
      View: 'View', Text: 'Text', ScrollView: 'ScrollView', StyleSheet: { create: value => value, absoluteFillObject: { position: 'absolute', inset: 0 } },
      TouchableOpacity: 'TouchableOpacity', ActivityIndicator: 'ActivityIndicator', TextInput: 'TextInput', KeyboardAvoidingView: 'KeyboardAvoidingView', Linking: { openURL: async () => {} }, Platform: { OS: 'ios' },
    },
    '@react-native-async-storage/async-storage': { __esModule: true, default: { multiGet: async () => [['premium_plan', storePlan ?? null], ['premium_rc_product_id', storePlan ? `plus_${storePlan}` : null]] } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { useLocalSearchParams: () => plan ? { plan, accountGeneration: '7', source: 'settings' } : {}, useRouter: () => router },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: 'Ionicons' },
    'react-native-purchases': { __esModule: true, default: { getOfferings: async () => ({ current: { availablePackages: yearlyPackage ? [yearlyPkg] : [] } }), restorePurchases: async () => { calls.restore += 1; if (restoreDeferred) await restoreWait; return customerInfo; } } },
    '../components/SafeLinearGradient': { LinearGradient: 'LinearGradient' },
    '../components/SkeletonShimmer': { __esModule: true, default: 'SkeletonBlock' },
    '../components/LangContext': { useLang: () => ({ lang }) },
    '../components/ThemeContext': { FONT_SCALE: { small: 1, medium: 1.15, large: 1.3 }, useTheme: () => ({ fontSize: 'medium', uiScale: 1, liquidGlassThemeId: themeId }) },
    '../components/ContentWrap': { __esModule: true, default: 'ContentWrap' },
    '../components/DuoPressable': { __esModule: true, default: 'DuoPressable' },
    '../components/feedback/FullscreenHybridEntrance': { __esModule: true, default: 'FullscreenHybridEntrance' },
    '../components/keyboardAvoidance': { useKeyboardBottomInset: () => 0 },
    '../components/PressableHybrid': { __esModule: true, default: 'PressableHybrid' },
    '../hooks/use-screen': { useScreen: () => ({ contentMaxW: 640, rawBottomInset: 0 }) },
    '../constants/liquidGlassThemePalette': { liquidGlassTokens: id => { calls.tokenIds.push(id); return glass; } },
    '../constants/i18n': { triLang: (active, copy) => copy[active], Lang: {} },
    '../components/paywall/paywallShared': { usePaywallChrome: () => ({ bgColors: ['#000', '#111'], tc: { heroAccent: '#ace', ctaBg: '#fff', ctaText: '#000' }, textPrimary: '#fff', textMuted: '#aaa', cardBg: '#222' }), PaywallCloseButton: 'PaywallCloseButton' },
    './revenuecat_init': { initRevenueCat: async () => {}, resolvePremiumPackages: () => ({ yearly: yearlyPackage ? yearlyPkg : null }), syncRevenueCatIdentity: async () => true },
    './paywall_purchase': { storePriceTrim: value => value },
    './revenuecat_premium_access': { revenueCatCustomerInfoHasPremiumAccess: () => true },
    './premium_revenuecat_state': { inferPremiumPlanFromCustomerInfo: (info, fallback) => info?._plan ?? fallback, inferPremiumPlanFromProductId: (_id, fallback) => storePlan ?? fallback, revenueCatPremiumMetadata: info => info ? { productId: `plus_${info._plan}`, expiryMs } : {} },
    './firebase': { logCancelSurvey: () => {}, logChangePlanStarted: () => {} },
    './analytics': { trackEvent: () => {} },
    './navigation_back': { safeRouterBack: (_router, fallback) => calls.backs.push(fallback) },
    '../hooks/use-haptics': { hapticTap: () => { calls.haptics += 1; } },
    './events': { emitAppEvent: () => {} }, './premium_guard': { invalidatePremiumCache: () => {} },
    // зачем (10.10): ebc1a860d (S2d) обернул операции подписки в withPurchaseFlow — стенд выполняет операцию как есть.
    './purchase_flow_activity': { withPurchaseFlow: (_source, operation) => operation() },
    './account_generation': { captureAccountGeneration: () => token, isCurrentAccountGeneration: () => true, subscribeAccountGeneration: () => ({ remove() {} }) },
    './manage_subscription_purchase': { changeManageSubscriptionPlanForGeneration: async () => { calls.change += 1; return { status: 'changed', customerInfo: { _plan: 'yearly' }, plan: 'yearly' }; }, isManageSubscriptionOperationCurrent: () => true },
    './revenuecat_account_identity': { readRevenueCatCustomerInfoForGeneration: async () => customerInfo },
    './home_screen_hydration': { peekHomeScreenHydration: () => null },
    './manage_subscription_save_offer': { resolveSaveOffer: () => 'none' },
    './dev_paywall_state': { isDevManageLoadingHold: () => false, isDevRestorePurchaseEmpty: () => false }, // зачем (12.10, 7a79d3519): экран читает dev-подмену manage=loading; в сторе это заглушка, в харнесс-карте — выключено
    './debug-logger': { DebugLogger: { error: () => {} } },
    // зачем (Дизайн, приказ «пейволы все сделать»): подпись смены плана берёт цену магазин → кэш → справочная с «≈»; заглушки без кэша.
    './paywall_price_cache': { peekPaywallPriceCache: () => null },
    './paywall_reference_prices': { resolvePaywallReferencePrices: () => ({ yearly: '€39,99', monthly: '€7,99', yearlyPerMonth: '€3,33', source: 'builtin' }) },
    // зачем (PM-229): экран подключил журнал проглоченных ошибок; заглушка ничего не пишет и ничего не меняет в поведении
    './swallow_log': { noteSwallowedHandler: () => () => {} },
    // зачем (15.10, красные сторожи; тест устарел): dev-подмены плана и прогресса оффера удержания (eb716d9a0, 23a4eb6f7) — в харнессе выключены, как в проде.
    './dev_vip_override': { getDevPlanOverride: () => null },
    './dev_save_offer_progress': { getDevSaveOfferProgress: () => null },
  };
  const output = ts.transpileModule(source, { fileName: SOURCE_PATH, compilerOptions: { esModuleInterop: true, jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(output, { module: mod, exports: mod.exports, require: name => { assert.ok(name in modules, `stub exists for ${name}`); return modules[name]; }, console: { log() {}, warn() {}, error() {} }, Date, Intl, Number, String, Promise, setImmediate }, { filename: SOURCE_PATH });
  const render = () => { stateCursor = 0; refCursor = 0; effectCursor = 0; return mod.exports.default(); };
  const runEffects = () => { for (const slot of effects) if (slot && !slot.ran) { slot.ran = true; slot.cleanup = slot.effect(); } };
  return { calls, glass, render, runEffects, releaseRestore };
}

const settle = async () => { await Promise.resolve(); await Promise.resolve(); await new Promise(resolve => setImmediate(resolve)); };

test('protects all 21 payment/account/business declarations and both account effects', () => {
  assert.deepEqual(protectedSnapshot(source), PROTECTED);
});

test('requires English for benefits while keeping cancellation reasons type-safe and byte-stable', () => {
  assert.match(source, /type ManageSubscriptionReasonCopy = Omit<ManageSubscriptionCopy, 'en'>;/);
  assert.equal(initializerHash(source, 'CANCEL_REASONS'), '8e013629a7677c4b84a2c047632ce3cae4c33141ba7d72247da07fc9fb545d52');
  assert.deepEqual(reasonCopyDiagnostics(source), []);
  const missingBenefitEnglish = source.replace(", en: 'Unlimited energy'", '');
  assert.notEqual(missingBenefitEnglish, source);
  assert.ok(reasonCopyDiagnostics(missingBenefitEnglish).some(message => message.includes("Property 'en' is missing")));
});

test('ships only the seven directly verified benefits with nine complete locales', () => {
  const rows = benefitRows(source);
  assert.deepEqual(rows.map(row => [row.benefitId, row.ru]), BENEFITS);
  for (const row of rows) {
    assert.deepEqual(Object.keys(row).filter(key => key !== 'benefitId' && key !== 'icon'), LOCALES);
    assert.ok(LOCALES.every(locale => row[locale]?.trim()), `${row.benefitId} has all locale copy`);
  }
  assert.doesNotMatch(rows.map(row => Object.values(row).join(' ')).join(' '), /аур|aura|theme|тема|weekly|недел|leaderboard|рейтинг|Learning V2|1500|custom card/i);
});

test('renders the bounded Liquid Glass host across all 13 palettes with normalized full-wrap typography', () => {
  for (const themeId of THEMES) {
    const harness = createHarness({ themeId });
    const tree = harness.render();
    assert.deepEqual(harness.calls.tokenIds, [themeId]);
    const status = byId(tree, 'manage-subscription-status-card');
    assert.ok(status, `${themeId} status card`);
    assert.deepEqual(Object.fromEntries(['backgroundColor', 'borderRadius', 'padding', 'marginTop'].map(key => [key, flatStyle(status.props.style)[key]])), { backgroundColor: harness.glass.opaqueCard, borderRadius: 22, padding: 20, marginTop: 20 });
    const title = byId(tree, 'manage-subscription-title');
    assert.equal(flatStyle(title.props.style).fontSize, 34);
    assert.equal(flatStyle(title.props.style).lineHeight, 40);
    assert.equal(flatStyle(title.props.style).flexShrink, 1);
    for (const [id] of BENEFITS) {
      const row = byId(tree, `manage-subscription-benefit-${id}`);
      assert.equal(row.props.accessibilityRole, 'text');
      const style = flatStyle(row.props.style);
      assert.deepEqual([style.minHeight, style.borderRadius, style.paddingVertical, style.paddingHorizontal], [64, 14, 10, 14]);
      assert.equal(visit(row).some(node => node.type === 'Ionicons' && String(node.props.name).includes('chevron')), false);
    }
  }
  assert.match(source, /FONT_SCALE\[fontSize\]\s*\/\s*FONT_SCALE\.medium\s*\*\s*uiScale/);
  assert.doesNotMatch(source, /fontScale\s*[:=]|PixelRatio\.getFontScale|adjustsFontSizeToFit/);
  assert.match(source, /<ContentWrap>[\s\S]*?<ScrollView[\s\S]*?<\/ScrollView>[\s\S]*?<\/ContentWrap>/);
  assert.match(source, /<SafeAreaView style=\{S\.safe\}>/);
});

test('uses passive host surfaces without container borders', () => {
  for (const plan of ['yearly', 'monthly']) {
    const tree = createHarness({ plan }).render();
    for (const node of visit(tree)) {
      for (const prop of ['style', 'contentStyle']) {
        const style = flatStyle(node.props?.[prop]);
        const label = `${plan}:${node.props?.testID ?? node.type}:${prop}`;
        assert.equal(Object.hasOwn(style, 'borderWidth'), false, `${label} has no borderWidth`);
        assert.equal(Object.hasOwn(style, 'borderColor'), false, `${label} has no borderColor`);
      }
    }
  }
});

test('keeps loading, monthly, yearly, lifetime, absent-store-data, and busy controls behaviorally distinct', async () => {
  const loading = createHarness({ plan: null });
  assert.ok(byId(loading.render(), 'manage-subscription-loading'));

  const yearly = createHarness({ plan: 'yearly' });
  let tree = yearly.render();
  assert.ok(byId(tree, 'manage-subscription-restore'));
  assert.ok(byId(tree, 'manage-subscription-cancel'));
  assert.equal(byId(tree, 'manage-subscription-change-plan'), undefined);
  assert.doesNotMatch(textOf(byId(tree, 'manage-subscription-status-card')), /€|\$|Следующее списание/);

  const lifetime = createHarness({ plan: 'lifetime' });
  tree = lifetime.render();
  assert.match(textOf(tree), /Разовая покупка/);
  assert.equal(byId(tree, 'manage-subscription-cancel'), undefined);

  const monthly = createHarness({ plan: 'monthly', restoreDeferred: true });
  monthly.render();
  monthly.runEffects();
  await settle();
  tree = monthly.render();
  const change = byId(tree, 'manage-subscription-change-plan');
  const restore = byId(tree, 'manage-subscription-restore');
  const cancel = byId(tree, 'manage-subscription-cancel');
  const close = byId(tree, 'manage-subscription-close');
  for (const control of [change, restore, cancel, close]) {
    assert.ok(control);
    assert.equal(control.props.accessibilityRole, 'button');
    assert.equal(control.props.withHaptic, false);
    assert.equal(control.props.withSound, false);
  }
  close.props.onPress();
  cancel.props.onPress();
  await change.props.onPress();
  const pendingRestore = restore.props.onPress();
  tree = monthly.render();
  assert.equal(byId(tree, 'manage-subscription-restore').props.disabled, true);
  assert.equal(byId(tree, 'manage-subscription-restore').props.accessibilityState.disabled, true);
  monthly.releaseRestore();
  await pendingRestore;
  assert.equal(monthly.calls.haptics, 4, 'each original callback owns exactly one haptic');
  assert.equal(monthly.calls.change, 1);
  assert.equal(monthly.calls.restore, 1);
  assert.deepEqual(monthly.calls.backs, ['/(tabs)/settings']);
});

test('keeps real renewal dates and lifetime notes hidden while store data is loading', async () => {
  const expiryMs = Date.UTC(2026, 11, 15, 12);
  const loadingWithDate = createHarness({
    plan: 'yearly',
    storePlan: 'yearly',
    initialInfo: { _plan: 'yearly' },
    initialLoading: true,
    expiryMs,
  });
  let tree = loadingWithDate.render();
  assert.ok(byId(tree, 'manage-subscription-loading'));
  assert.doesNotMatch(textOf(byId(tree, 'manage-subscription-status-card')), /Следующее списание/);
  loadingWithDate.runEffects();
  await settle();
  tree = loadingWithDate.render();
  assert.match(textOf(byId(tree, 'manage-subscription-status-card')), /Следующее списание/);

  const loadingLifetime = createHarness({
    plan: 'lifetime',
    storePlan: 'lifetime',
    initialInfo: { _plan: 'lifetime' },
    initialLoading: true,
  });
  tree = loadingLifetime.render();
  assert.ok(byId(tree, 'manage-subscription-loading'));
  assert.match(textOf(byId(tree, 'manage-subscription-status-card')), /Phraseman Pro/);
  assert.doesNotMatch(textOf(byId(tree, 'manage-subscription-status-card')), /Разовая покупка/);
  loadingLifetime.runEffects();
  await settle();
  tree = loadingLifetime.render();
  assert.match(textOf(byId(tree, 'manage-subscription-status-card')), /Разовая покупка/);
});

test('actual monthly quota engine gives exhausted Plus all four training modes without writes and keeps controls', async () => {
  const quotaPath = 'app/monthly_training_sessions.ts';
  const quotaSource = fs.readFileSync(quotaPath, 'utf8');
  const quotaOutput = ts.transpileModule(quotaSource, { fileName: quotaPath, compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const quotaModule = { exports: {} };
  vm.runInNewContext(quotaOutput, {
    module: quotaModule, exports: quotaModule.exports,
    require: name => name === '@react-native-async-storage/async-storage'
      ? { __esModule: true, default: {} }
      : name === './account_generation'
        ? { captureAccountGeneration: () => ({}), isCurrentAccountGeneration: () => true }
        : assert.fail(`unexpected quota dependency ${name}`),
    Date, Intl, Number, String, Promise, Map, Set, Object, JSON, Math, encodeURIComponent,
  }, { filename: quotaPath });
  const token = { generation: 1, stableId: 'premium-user', phase: 'active' };
  const now = Date.UTC(2026, 8, 28, 12);
  const period = '2026-09';
  const original = JSON.stringify({ version: 1, period, starts: Array.from({ length: 30 }, (_, index) => `free-${index}`) });
  let current = true;
  let stored = original;
  const writes = [];
  const access = quotaModule.exports.createMonthlyTrainingSessionAccess({
    now: () => now, timeZone: () => 'UTC', isCurrentAccount: () => current,
    storage: { getItem: async () => stored, setItem: async (_key, value) => { writes.push(value); stored = value; } },
  });
  assert.equal((await access.preview({ token, accessResolved: true, hasPremiumAccess: false })).status, 'exhausted');
  const plusPreview = await access.preview({ token, accessResolved: true, hasPremiumAccess: true });
  assert.deepEqual([plusPreview.status, plusPreview.used, plusPreview.bypass], ['allowed', 30, 'idempotent']);
  for (const mode of ['swipe', 'blitz', 'recall', 'speaking']) {
    const outcome = await access.consume({ token, accessResolved: true, hasPremiumAccess: true, receiptId: `plus-${mode}`, mode });
    assert.deepEqual([outcome.status, outcome.used, outcome.bypass], ['allowed', 30, 'idempotent']);
  }
  assert.equal(stored, original);
  assert.deepEqual(writes, []);
  current = false;
  assert.equal((await access.preview({ token, hasPremiumAccess: true })).status, 'stale_account');
  assert.equal((await access.consume({ token, hasPremiumAccess: true, receiptId: 'stale', mode: 'swipe' })).status, 'stale_account');
  for (const [file, mode] of [['app/flashcards_swipe.tsx', 'swipe'], ['app/flashcards_blitz_session.tsx', 'blitz'], ['app/flashcards_recall_session.tsx', 'recall'], ['app/flashcards_speaking_session.tsx', 'speaking']]) {
    const caller = fs.readFileSync(file, 'utf8');
    assert.match(caller, new RegExp(`consumeMonthlyTrainingSession\\(\\{[\\s\\S]*?hasPremiumAccess,[\\s\\S]*?mode: '${mode}'`), `${mode} forwards entitlement`);
  }
});
