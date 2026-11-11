import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
// зачем (владелец 11.11): разметку экрана рисует ManageSubscriptionDuoView — стенд раскрывает настоящий компонент, а не муляж
import { DUO_TIER_COLORS, loadDuoViewModule, visit } from './helpers/manage_subscription_duo_view.mjs';

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
    // зачем (13.10, перепин Авторизации; сверено по diff 92c6d2206): у причин отмены появился en — тип полный ManageSubscriptionCopy, ключи прежние.
    getStoreManageUrl: '889ed1b036067e1cf9398ee93d8f33a10cb2b54cddbb95066cf5bfb3de3bfd18',
    formatDate: '2b21987d10c5cbf17b7f4e4db7efb4ef404330f064c3cfeb903522c536472b5c',
    normalizeStoredPremiumPlan: '80b061538b95c3e412ca32d39839912a6145440350b67890e88d4370a7de0993',
    localPremiumPlan: '5bf00fdbbd770828440f955b2c054728a9017d8c04ec5fb9a7fa62191071d3bd',
    screenAccountRef: 'a87c8a558d3d5d19cd493847ae71a1b398779e64459f4b2139345a25edf7fdd7',
    // зачем (15.10, красные сторожи; сверено по diff eb716d9a0 и 23a4eb6f7): только dev-подмены съёмки — план `plan=` в памяти (getDevPlanOverride) и прогресс оффера удержания (getDevSaveOfferProgress); покупка, отмена и сохранение плана без изменений.
    // зачем (13.10, e225091d5): dev-план с датой (plan/planUntil) важнее пустого ответа RevenueCat эмулятора; в сторе getDevPlanOverride() = null — источник даты прежний.
    metadata: '406bcff09aba38b38c913edeb206cccc6f4f724d6b48143c853d5b9215c6b95f',
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
    // перепин 17.10 (сверено по diff abd036def и 9ddb73f87): «Восстановить» без связи с магазином — тост storeUnreachableToast вместо тишины;
    // потолок 8 с снимает крутилку и замок (номер запуска restoreRunRef — поздний finally не снимает чужой замок), сам запрос НЕ отменяется —
    // если магазин ответит позже, Plus применится как обычно. Вызов восстановления, активация и деньги не менялись.
    handleRestore: '366ec9ec060968586e365693c4145d52bf6099a3d746cb10930803c4df3cf933',
    handleRestoreRef: '1b3dbed6ce5c65341dc1c80dac2a6478a19c791b36f0b38d6bb9d161c7663cf4',
    openStoreCancel: 'be12df45cdfe447a387469009907174fa93e7b2af12fb9446df1a13bb7f56bd4',
  },
  effects: ['25747d9b780f1671db0a24b0ca1dd04975b98396bc7219f22bcba431ee262ecd', 'b3091d0891fbae592d026f4372f11bca860a56a4dced41029055f47e9ccbb43c' /* перепин 13.10 (PM-214): +1 строка rememberPremiumPlan(storedPlan, …, 'manage_local') после локального чтения — память плана для первого кадра, покупка/RevenueCat не тронуты; ранее перепин 12.10: 7a79d3519 (Авторизация, paywalls-020) — ранний выход dev-подмены manage=loading до try в эффекте загрузки; в стор-сборке isDevManageLoadingHold() всегда false (заглушка), поведение не меняется */, 'ccc451df72434a214e694912b540933642d696ea03a25d3897f45c762df945ce' /* добавлен 17.10 (84be74d0f): журнал [PLUS-MANAGE] и один router.replace на пейвол premium_expired, когда доступ выяснен и Plus нет — экран «Plus активирован» не рисуется без доступа; покупка/отмена/восстановление не тронуты */],
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

function benefitCopyDiagnostics(candidate) {
  const file = parse(candidate);
  const declarations = [];
  const walk = node => {
    if (ts.isTypeAliasDeclaration(node) && ['ManageSubscriptionCopy', 'ManageSubscriptionBenefit'].includes(node.name.text)) {
      declarations.push(node.getText(file));
    }
    if (ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'INCLUDED')) {
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
    '../components/manage-subscription/ManageSubscriptionDuoView': loadDuoViewModule(React),
    // U23 (d75e10503): «Восстановить» ждёт подтверждения владельца на сервере — в стенде владелец подтверждён (прежний путь); отказ держит tests/u23_restore_owner_manage_subscription
    './restore_owner_confirmation': { confirmRestoreOwnerOnServer: async () => ({ verdict: 'confirmed', ms: 0 }), restoreOwnerNotConfirmedToast: () => ({}) },
    // 11.11: потолок ожидания загрузки экран берёт из общего шлюза (app/load_gate_config) — в стенде то же значение
    './load_gate_config': { LOAD_GATE_TOTAL_MS: 12000 },
    '../components/v2/BackGlyph': { __esModule: true, default: 'BackGlyph' }, // 17.10: «назад» — общий значок BackGlyph (слово владельца)
    '../components/v2/ScreenBackButton': { __esModule: true, default: 'ScreenBackButton', ScreenBackSlot: 'ScreenBackSlot', ScreenOriginBelowSafeTop: ({ children }) => children }, // 22.10: «назад» — общая кнопка
    '../hooks/use-screen': { useScreen: () => ({ contentMaxW: 640, rawBottomInset: 0 }) },
    '../constants/liquidGlassThemePalette': { liquidGlassTokens: id => { calls.tokenIds.push(id); return glass; } },
    // зачем (контраст-гейт OTA 25.10, Темы): подпись плашек статистики доводится legibleOn — в стенде тон проходит как есть
    '../constants/liquidGlassSurfaceRoles': { flattenOver: (top) => top, legibleOn: (color) => color },
    '../constants/i18n': { triLang: (active, copy) => copy[active], Lang: {} },
    '../components/paywall/paywallShared': { usePaywallChrome: () => ({ bgColors: ['#000', '#111'], tc: { heroAccent: '#ace', ctaBg: '#fff', ctaText: '#000' }, textPrimary: '#fff', textMuted: '#aaa', cardBg: '#222' }), PaywallCloseButton: 'PaywallCloseButton' },
    './revenuecat_init': { initRevenueCat: async () => {}, resolvePremiumPackages: () => ({ yearly: yearlyPackage ? yearlyPkg : null }), syncRevenueCatIdentity: async () => true },
    './paywall_purchase': { storePriceTrim: value => value },
    './revenuecat_premium_access': { revenueCatCustomerInfoHasPremiumAccess: () => true },
    './premium_revenuecat_state': { inferPremiumPlanFromCustomerInfo: (info, fallback) => info?._plan ?? fallback, inferPremiumPlanFromProductId: (_id, fallback) => storePlan ?? fallback, revenueCatPremiumMetadata: info => info ? { productId: `plus_${info._plan}`, expiryMs } : {} },
    './firebase': { logChangePlanStarted: () => {} },
    './analytics': { trackEvent: () => {} },
    './navigation_back': { safeRouterBack: (_router, fallback) => calls.backs.push(fallback) },
    '../hooks/use-haptics': { hapticTap: () => { calls.haptics += 1; } },
    './events': { emitAppEvent: () => {} }, './premium_guard': { invalidatePremiumCache: () => {} },
    // зачем (10.10): ebc1a860d (S2d) обернул операции подписки в withPurchaseFlow — стенд выполняет операцию как есть.
    './purchase_flow_activity': { withPurchaseFlow: (_source, operation) => operation() },
    './subscription_tier': { applyTierName: (value) => value },
    '../components/plus/use_subscription_tier': { useSubscriptionTier: () => 'plus' },
    './premium_real_storage': { readRealPremiumSnapshotForGeneration: async () => storePlan ? { active: true, plan: storePlan, rcProductId: 'plus_' + storePlan } : null },
    './account_generation': { captureAccountGeneration: () => token, isCurrentAccountGeneration: () => true, subscribeAccountGeneration: () => ({ remove() {} }) },
    './manage_subscription_purchase': { changeManageSubscriptionPlanForGeneration: async () => { calls.change += 1; return { status: 'changed', customerInfo: { _plan: 'yearly' }, plan: 'yearly' }; }, isManageSubscriptionOperationCurrent: () => true },
    './revenuecat_account_identity': { readRevenueCatCustomerInfoForGeneration: async () => customerInfo },
    './dev_paywall_state': { isDevManageLoadingHold: () => false, isDevRestorePurchaseEmpty: () => false }, // зачем (12.10, 7a79d3519): экран читает dev-подмену manage=loading; в сторе это заглушка, в харнесс-карте — выключено
    './debug-logger': { DebugLogger: { error: () => {} } },
    // зачем (Дизайн, приказ «пейволы все сделать»): подпись смены плана берёт цену магазин → кэш → справочная с «≈»; заглушки без кэша.
    './paywall_price_cache': { peekPaywallPriceCache: () => null },
    './paywall_reference_prices': { resolvePaywallReferencePrices: () => ({ yearly: '€39,99', monthly: '€7,99', yearlyPerMonth: '€3,33', source: 'builtin' }) },
    // зачем (PM-229): экран подключил журнал проглоченных ошибок; заглушка ничего не пишет и ничего не меняет в поведении
    './swallow_log': { noteSwallowedHandler: () => () => {} },
    // зачем (15.10, красные сторожи; тест устарел): dev-подмены плана и прогресса оффера удержания (eb716d9a0, 23a4eb6f7) — в харнессе выключены, как в проде.
    './dev_vip_override': { getDevPlanOverride: () => null },
    // зачем (PM-214, 13.10): первый кадр «Подписки» без ?plan= берёт план из памяти процесса — в харнессе памяти нет (скелет, как раньше)
    './premium_plan_peek': { peekPremiumPlan: () => null, rememberPremiumPlan: () => undefined },
    // зачем (17.10, 84be74d0f): экран спрашивает доступ до отрисовки (show / wait / paywall). Харнесс проверяет деньги на экране
    // Plus с выясненным доступом — то же состояние, что и раньше; сами исходы доступа держит tests/manage_subscription_access.test.ts.
    './manage_subscription_access': { decideManageAccess: () => ({ decision: 'show', reason: 'access_resolved_plus' }), MANAGE_NO_ACCESS_PAYWALL: { pathname: '/premium_modal', params: { context: 'premium_expired', source: 'notification_premium_expiry' } } },
    '../components/PremiumContext': { usePremium: () => ({ hasPremiumAccess: true, accessResolved: true }) },
  };
  const output = ts.transpileModule(source, { fileName: SOURCE_PATH, compilerOptions: { esModuleInterop: true, jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(output, { module: mod, exports: mod.exports, require: name => { assert.ok(name in modules, `stub exists for ${name}`); return modules[name]; }, console: { log() {}, warn() {}, error() {} }, Date, Intl, Number, String, Promise, setImmediate, setTimeout, clearTimeout /* 9ddb73f87: потолок «Восстановить» 8 с */ }, { filename: SOURCE_PATH });
  const render = () => { stateCursor = 0; refCursor = 0; effectCursor = 0; return mod.exports.default(); };
  const runEffects = () => { for (const slot of effects) if (slot && !slot.ran) { slot.ran = true; slot.cleanup = slot.effect(); } };
  return { calls, glass, render, runEffects, releaseRestore };
}

const settle = async () => { await Promise.resolve(); await Promise.resolve(); await new Promise(resolve => setImmediate(resolve)); };

test('protects the remaining payment and account declarations and effects', () => {
  assert.deepEqual(protectedSnapshot(source), PROTECTED);
});

test('requires English for benefits and excludes the former cancellation survey', () => {
  assert.doesNotMatch(source, /CANCEL_REASONS|logCancelSurvey|showCancelSheet/);
  assert.deepEqual(benefitCopyDiagnostics(source), []);
  const missingBenefitEnglish = source.replace(", en: 'Unlimited energy'", '');
  assert.notEqual(missingBenefitEnglish, source);
  assert.ok(benefitCopyDiagnostics(missingBenefitEnglish).some(message => message.includes("Property 'en' is missing")));
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
    // зачем (владелец 11.11, макет plus-screens-duo-2026-11-11, раздел B): карточка статуса — «пропуск» градиентом уровня (цвет уровня, темой не красится),
    // радиус 26, отступ сверху 24; заголовок 33/37 по макету. Стенд считает масштаб шрифта 1 (medium / medium).
    assert.deepEqual(Object.fromEntries(['backgroundColor', 'borderRadius', 'paddingHorizontal', 'marginTop'].map(key => [key, flatStyle(status.props.style)[key]])), { backgroundColor: DUO_TIER_COLORS.plus[1], borderRadius: 26, paddingHorizontal: 20, marginTop: 24 });
    assert.ok(visit(status).some(node => node.type === 'LinearGradient' && String(node.props.colors) === String(DUO_TIER_COLORS.plus)), `${themeId} pass uses the tier gradient`);
    const title = byId(tree, 'manage-subscription-title');
    assert.equal(flatStyle(title.props.style).fontSize, 33);
    assert.equal(flatStyle(title.props.style).lineHeight, 37);
    for (const [id] of BENEFITS) {
      const row = byId(tree, `manage-subscription-benefit-${id}`);
      assert.equal(row.props.accessibilityRole, 'text');
      const style = flatStyle(row.props.style);
      // макет 11.11: строки одного блока без своих плашек — высота 54, поля даёт общий блок
      assert.deepEqual([style.minHeight, style.borderRadius, style.paddingVertical, style.paddingHorizontal], [54, undefined, 8, undefined]);
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
  // 22.10: «назад» — общая ScreenBackButton (роль, вибрация и тишина — внутри неё); остальные действия держат свой контракт
  assert.equal(close.type, 'ScreenBackButton');
  assert.equal(typeof close.props.onPress, 'function');
  for (const control of [change, restore, cancel]) {
    assert.ok(control);
    assert.equal(control.props.accessibilityRole, 'button');
    // 11.11: кнопки нового вида — V2Pressable (звука у неё нет вовсе); вибрацию по-прежнему даёт сам обработчик, у кнопки она выключена
    assert.equal(control.type, 'V2Pressable');
    assert.equal(control.props.withHaptic, false);
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
  // 22.10: «назад» — общая ScreenBackButton, вибрацию даёт она сама (PressableHybrid) — у обработчика её больше нет: 4 → 3
  assert.equal(monthly.calls.haptics, 3, 'each original callback owns exactly one haptic');
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

// ЗАМОК ВЛАДЕЛЬЦА 28.10 (OWNER_LOCKS; tests/owner_locks_energy_30min_no_month_cap_2026_10_28.test.ts): месячного лимита тренировок нет
// (LIMIT = 0). Старая запись «месяц исчерпан» больше никого не блокирует; без записей; чужой аккаунт по-прежнему отклоняется.
test('actual monthly quota engine: no monthly cap for Free or Plus in all four modes, without writes, stale account still rejected', async () => {
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
  const freePreview = await access.preview({ token, accessResolved: true, hasPremiumAccess: false });
  assert.deepEqual([freePreview.status, freePreview.used, freePreview.bypass], ['allowed', 0, 'unlimited']);
  const plusPreview = await access.preview({ token, accessResolved: true, hasPremiumAccess: true });
  assert.deepEqual([plusPreview.status, plusPreview.used, plusPreview.bypass], ['allowed', 0, 'unlimited']);
  for (const hasPremiumAccess of [false, true]) {
    for (const mode of ['swipe', 'blitz', 'recall', 'speaking']) {
      const outcome = await access.consume({ token, accessResolved: true, hasPremiumAccess, receiptId: `${hasPremiumAccess ? 'plus' : 'free'}-${mode}`, mode });
      assert.deepEqual([outcome.status, outcome.used, outcome.bypass], ['allowed', 0, 'unlimited']);
    }
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
