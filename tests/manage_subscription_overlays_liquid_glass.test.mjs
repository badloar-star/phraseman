import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const SOURCE_PATH = 'app/manage_subscription.tsx';
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
// Действующий набор тем 2.0 (constants/liquidGlassThemePalette.ts → LIQUID_GLASS_THEME_IDS):
// 13 тонированных + 10 градиентных (владелец 2026-10-04, constants/liquidGlassGradientThemes.ts).
const THEMES = [
  'graphite', 'polar', 'slate', 'ink', 'lavender', 'iris', 'rose', 'terracotta', 'taupe', 'olive', 'sage', 'eucalyptus', 'marine',
  'grad_aurora', 'grad_iris', 'grad_magma', 'grad_midnight', 'grad_champagne', 'grad_jade', 'grad_orchid', 'grad_ice', 'grad_coral', 'grad_lilac',
];
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
// Canonical HEAD overlay copy, with only the independently verified retired XP tuple removed.
const OVERLAY_LP_BASELINE = [
  `Почему уходишь?|Чому йдеш?|Why are you leaving?|¿Por qué te vas?|Por que você vai sair?|Vì sao bạn rời đi?|Mengapa kamu pergi?|Neden ayrılıyorsun?|Dlaczego odchodzisz?`.split('|'),
  `Это поможет нам стать лучше.|Це допоможе нам стати кращими.|This helps us get better.|Nos ayuda a mejorar.|Isso nos ajuda a melhorar.|Điều này giúp chúng tôi cải thiện.|Ini membantu kami menjadi lebih baik.|Bu, daha iyi olmamıza yardımcı olur.|To pomoże nam się poprawić.`.split('|'),
  // зачем (92c6d2206, 13.10): причины отмены получили en — в слоте en теперь r.en, а не русский r.ru (сторож охранял ошибку).
  ['r.ru', 'r.uk', 'r.en', 'r.es', "r['pt-BR']", 'r.vi', 'r.id', 'r.tr', 'r.pl'],
  `Расскажи подробнее…|Розкажи детальніше…|Tell us more…|Cuéntanos más…|Conte mais…|Nói rõ hơn…|Ceritakan lebih lanjut…|Biraz daha anlat…|Napisz więcej…`.split('|'),
  `Перейти к отмене|Перейти до скасування|Continue to cancel|Ir a cancelar|Ir para o cancelamento|Đi tới hủy gói|Lanjut ke pembatalan|İptale git|Przejdź do anulowania`.split('|'),
  `Остаться в Plus|Залишитися в Plus|Stay on Plus|Quedarme en Plus|Ficar no Plus|Ở lại Plus|Tetap di Plus|Plus'da kal|Zostań w Plus`.split('|'),
  `Расскажи, что пошло не так|Розкажи, що пішло не так|Tell us what went wrong|Cuéntanos qué salió mal|Conte o que deu errado|Hãy cho chúng tôi biết vấn đề|Ceritakan apa yang salah|Neyin yanlış gittiğini anlat|Napisz, co poszło nie tak`.split('|'),
  `Ты уже многого добился|Ти вже багато чого досяг|You've already achieved a lot|Ya has logrado mucho|Você já conquistou muito|Bạn đã đạt được rất nhiều|Kamu sudah mencapai banyak hal|Şimdiden çok şey başardın|Już wiele osiągnąłeś`.split('|'),
  `Мы читаем каждое обращение и чиним то, что мешает.|Ми читаємо кожне звернення і лагодимо те, що заважає.|We read every message and fix what's getting in your way.|Leemos cada mensaje y arreglamos lo que molesta.|Lemos cada mensagem e corrigimos o que atrapalha.|Chúng tôi đọc mọi phản hồi và sửa những gì gây cản trở.|Kami membaca setiap pesan dan memperbaiki yang mengganggu.|Her mesajı okuyoruz ve engel olan şeyi düzeltiyoruz.|Czytamy każde zgłoszenie i naprawiamy to, co przeszkadza.`.split('|'),
  `Прогресс останется с тобой, но занятия придётся продолжать без Plus.|Прогрес залишиться з тобою, але заняття доведеться продовжувати без Plus.|Your progress stays with you, but you'll have to keep learning without Plus.|Tu progreso se queda, pero seguirás sin Plus.|Seu progresso fica, mas você seguirá sem o Plus.|Tiến trình vẫn còn, nhưng bạn sẽ học tiếp mà không có Plus.|Progresmu tetap ada, tetapi kamu akan lanjut tanpa Plus.|İlerlemen kalır, ama Plus olmadan devam edeceksin.|Twoje postępy zostaną, ale będziesz uczyć się bez Plus.`.split('|'),
  `дней подряд|днів поспіль|days in a row|días seguidos|dias seguidos|ngày liên tiếp|hari berturut|gün üst üste|dni z rzędu`.split('|'),
  `уроков|уроків|lessons|lecciones|aulas|bài học|pelajaran|ders|lekcji`.split('|'),
  `Написать нам|Написати нам|Write to us|Escríbenos|Fale conosco|Nhắn cho chúng tôi|Hubungi kami|Bize yaz|Napisz do nas`.split('|'),
  `Остаться в Plus|Залишитися в Plus|Stay on Plus|Quedarme en Plus|Ficar no Plus|Ở lại Plus|Tetap di Plus|Plus'da kal|Zostań w Plus`.split('|'),
  `Всё равно отменить|Все одно скасувати|Cancel anyway|Cancelar de todos modos|Cancelar mesmo assim|Vẫn hủy|Tetap batalkan|Yine de iptal et|Anuluj mimo to`.split('|'),
  `Покупок не нашлось|Покупок не знайшлося|No purchases found|No se encontraron compras|Nenhuma compra encontrada|Không tìm thấy giao dịch|Pembelian tidak ditemukan|Satın alım bulunamadı|Nie znaleziono zakupów`.split('|'),
  `Проверь, тот ли это аккаунт магазина, с которого покупал. Чаще всего дело именно в нём.|Перевір, чи той це акаунт магазину, з якого купував. Найчастіше річ саме в ньому.|Check whether this is the store account you bought with. That is usually the reason.|Comprueba si es la cuenta de la tienda con la que compraste. Suele ser eso.|Verifique se é a conta da loja com que você comprou. Quase sempre é isso.|Hãy kiểm tra xem đây có đúng là tài khoản cửa hàng bạn đã mua không. Thường là do vậy.|Periksa apakah ini akun toko yang kamu pakai saat membeli. Biasanya itu penyebabnya.|Satın alırken kullandığın mağaza hesabı bu mu, kontrol et. Genelde sebebi budur.|Sprawdź, czy to konto sklepu, z którego kupowałeś. Zwykle o to chodzi.`.split('|'),
  `Написать в поддержку|Написати в підтримку|Contact support|Escribir a soporte|Falar com o suporte|Liên hệ hỗ trợ|Hubungi dukungan|Desteğe yaz|Napisz do wsparcia`.split('|'),
  `Закрыть|Закрити|Close|Cerrar|Fechar|Đóng|Tutup|Kapat|Zamknij`.split('|'),
];
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const DEPENDENCIES = {
  'components/feedback/FullscreenHybridEntrance.tsx': 'b0263a57569cf2cd6dcb399c9d72c165078f4780f1f1b6b86305e133eeb056b9',
  'components/DuoPressable.tsx': '510c7cbf2767cd24ec4fa2c357123318c94e29f84cacc1858bfac63b286d11f9',
  // хэш обновлён 10.10: PressableHybrid перешёл на общее движение кита (constants/kitPress).
  'components/PressableHybrid.tsx': '6321f8fdef1d67a253119d0e46165ff39231f6e51b065b96b40c5e30bb60962b',
  'app/manage_subscription_save_offer.ts': '6f4b7f84f662f1af2a3314df4ae838f519819f0214736609931bed286fc072cf',
  // 10.10: осознанные правки f5447d10c (PM-229, логи вместо немых catch) и ebc1a860d (S2d, withPurchaseFlow).
  'app/manage_subscription_purchase.ts': 'fd85c1c6e7cd523a7599deb61a17b892729861e1304f227bf0ef14cc4bb25106',
};

const visit = node => Array.isArray(node) ? node.flatMap(visit) : node && typeof node === 'object' ? [node, ...visit(node.props?.children)] : [];
const flatStyle = style => Object.assign({}, ...((Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean)));
const byId = (tree, id) => visit(tree).find(node => node.props?.testID === id);
const textOf = node => visit(node).flatMap(item => item?.props?.children ?? []).filter(value => typeof value === 'string' || typeof value === 'number').join(' ');

function overlayLpCalls(candidate) {
  const start = candidate.indexOf("{showCancelSheet && cancelStep === 'reasons'");
  const end = candidate.indexOf('</SafeAreaView>', start);
  assert.ok(start >= 0 && end > start, 'overlay source range is present');
  const sourceFile = ts.createSourceFile(SOURCE_PATH, candidate, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const calls = [];
  const collect = node => {
    if (
      node.pos >= start
      && node.end <= end
      && ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === 'LP'
    ) {
      calls.push(node.arguments.map(argument => ts.isStringLiteralLike(argument)
        ? argument.text
        : argument.getText(sourceFile).replace(/\s+/g, ' ')));
    }
    ts.forEachChild(node, collect);
  };
  collect(sourceFile);
  return calls;
}

function assertOverlayLpBaseline(candidate) {
  assert.deepEqual(overlayLpCalls(candidate), OVERLAY_LP_BASELINE);
}

function loadKeyboardAvoidanceMath() {
  const keyboardSource = fs.readFileSync('components/keyboardAvoidance.ts', 'utf8');
  const output = ts.transpileModule(keyboardSource, {
    fileName: 'components/keyboardAvoidance.ts',
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(output, {
    module: mod,
    exports: mod.exports,
    require: name => name === 'react'
      ? { useEffect() {}, useState(value) { return [value, () => {}]; } }
      : { Keyboard: { addListener: () => ({ remove() {} }) }, Platform: { OS: 'android' }, useWindowDimensions: () => ({ height: 1600 }) },
    Number,
    Math,
  }, { filename: 'components/keyboardAvoidance.ts' });
  return mod.exports;
}

function assertOverlayContract(candidate) {
  assert.match(candidate, /import FullscreenHybridEntrance from ['"]\.\.\/components\/feedback\/FullscreenHybridEntrance['"]/);
  assert.match(candidate, /import DuoPressable from ['"]\.\.\/components\/DuoPressable['"]/);
  assert.match(candidate, /KeyboardAvoidingView/);
  assert.match(candidate, /function SubscriptionOverlayFrame/);
  assert.match(candidate, /accessibilityViewIsModal/);
  assert.match(candidate, /importantForAccessibility=\{overlayActive \? 'no-hide-descendants' : 'auto'\}/);
  assert.match(candidate, /<KeyboardAvoidingView[\s\S]*?behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}[\s\S]*?<View[\s\S]*?testID="manage-subscription-overlay-viewport"[\s\S]*?onLayout=\{handleViewportLayout\}/);
  assert.match(candidate, /<FullscreenHybridEntrance[\s\S]*?slots=\{\[[\s\S]*?testID="manage-subscription-overlay-panel"/);
  assert.match(candidate, /maxHeight:\s*panelMaxHeight/);
  assert.match(candidate, /testID="manage-subscription-overlay-scroll"[\s\S]*?keyboardShouldPersistTaps="handled"/);
  assert.match(candidate, /backgroundColor:\s*glass\.opaqueSheet/);
  assert.match(candidate, /borderTopLeftRadius:\s*24[\s\S]*?borderTopRightRadius:\s*24/);
  assert.doesNotMatch(candidate, /TouchableOpacity|BlurView|maxFontSizeMultiplier|numberOfLines|adjustsFontSizeToFit/);
  assert.match(candidate, /setShowRestoreEmpty\(false\);\s*router\.push\('\/support_report'/);
  assert.match(candidate, /closeCancelSheet\(\);\s*router\.push\('\/support_report'\)/);
}

function createHarness({ lang = 'ru', themeId = 'graphite', platform = 'ios', keyboardBottomInset = 0, rawBottomInset = 0, state: seededState = {}, offer = 'progress', progress = { displayStreak: 7, streak: 7, lessonsCompleted: 4 } } = {}) {
  const state = [];
  for (const [index, value] of Object.entries(seededState)) state[Number(index)] = value;
  const refs = [];
  let stateCursor = 0;
  let refCursor = 0;
  let currentKeyboardBottomInset = keyboardBottomInset;
  const calls = { haptics: 0, tokenIds: [], pushes: [], openedUrls: [], events: [] };
  const React = {
    Fragment: 'Fragment',
    createElement(type, props, ...children) { return { type, props: { ...(props ?? {}), children } }; },
    useState(initial) {
      const index = stateCursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => {
        const next = typeof value === 'function' ? value(state[index]) : value;
        if (index === 8 && next === false) calls.events.push('hide-restore');
        if (index === 9 && next === false) calls.events.push('hide-cancel');
        state[index] = next;
      }];
    },
    useRef(initial) { const index = refCursor++; return refs[index] ??= { current: initial }; },
    useCallback(callback) { return callback; },
    useEffect() {},
  };
  const glass = { bgTop: '#101', bgBottom: '#202', opaqueCard: '#303', opaqueSheet: '#313', opaqueControl: '#404', glassEdge: '#505', selected: '#606', lightTint: '#fff', text: '#eee', secondary: '#bbb', mutedText: '#999', cta: '#fafafa', ctaInk: '#111' };
  const token = { generation: 7, stableId: 'account-1', phase: 'active' };
  const modules = {
    react: { __esModule: true, default: React, ...React },
    'react-native': {
      View: 'View', Text: 'Text', ScrollView: 'ScrollView', KeyboardAvoidingView: 'KeyboardAvoidingView', ActivityIndicator: 'ActivityIndicator', TextInput: 'TextInput',
      StyleSheet: { create: value => value, absoluteFillObject: { position: 'absolute', inset: 0 } }, Linking: { openURL: url => { calls.openedUrls.push(url); return Promise.resolve(); } }, Platform: { OS: platform },
    },
    '@react-native-async-storage/async-storage': { __esModule: true, default: { multiGet: async () => [] } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { useLocalSearchParams: () => ({ plan: 'yearly', accountGeneration: '7', source: 'settings' }), useRouter: () => ({ push: route => { calls.events.push('push'); calls.pushes.push(route); } }) },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: 'Ionicons' },
    'react-native-purchases': { __esModule: true, default: { getOfferings: async () => ({ current: { availablePackages: [] } }), restorePurchases: async () => ({}) } },
    '../components/SafeLinearGradient': { LinearGradient: 'LinearGradient' },
    '../components/SkeletonShimmer': { __esModule: true, default: 'SkeletonBlock' },
    '../components/ContentWrap': { __esModule: true, default: 'ContentWrap' },
    '../components/DuoPressable': { __esModule: true, default: 'DuoPressable' },
    '../components/PressableHybrid': { __esModule: true, default: 'PressableHybrid' },
    '../components/v2/BackGlyph': { __esModule: true, default: 'BackGlyph' }, // 17.10: «назад» — общий значок BackGlyph (слово владельца)
    '../components/feedback/FullscreenHybridEntrance': { __esModule: true, default: props => React.createElement('FullscreenHybridEntrance', props, ...props.slots) },
    '../components/ThemeContext': { FONT_SCALE: { small: 1, medium: 1.15, large: 1.3 }, useTheme: () => ({ fontSize: 'medium', uiScale: 1, liquidGlassThemeId: themeId }) },
    '../components/LangContext': { useLang: () => ({ lang }) },
    '../constants/i18n': { triLang: (active, copy) => copy[active], Lang: {} },
    '../constants/liquidGlassThemePalette': { liquidGlassTokens: id => { calls.tokenIds.push(id); return glass; } },
    '../hooks/use-screen': { useScreen: () => ({ contentMaxW: 640, rawBottomInset }) },
    '../components/keyboardAvoidance': { useKeyboardBottomInset: enabled => enabled ? currentKeyboardBottomInset : 0 },
    '../components/paywall/paywallShared': { usePaywallChrome: () => ({}) },
    './revenuecat_init': { initRevenueCat: async () => {}, resolvePremiumPackages: () => ({}), syncRevenueCatIdentity: async () => true },
    './paywall_purchase': { storePriceTrim: value => value },
    './revenuecat_premium_access': { revenueCatCustomerInfoHasPremiumAccess: () => false },
    './premium_revenuecat_state': { inferPremiumPlanFromCustomerInfo: (_info, fallback) => fallback, inferPremiumPlanFromProductId: (_id, fallback) => fallback, revenueCatPremiumMetadata: () => ({}) },
    './firebase': { logCancelSurvey: () => {}, logChangePlanStarted: () => {} }, './analytics': { trackEvent: () => {} },
    './navigation_back': { safeRouterBack: () => {} }, '../hooks/use-haptics': { hapticTap: () => { calls.haptics += 1; } },
    './events': { emitAppEvent: () => {} }, './premium_guard': { invalidatePremiumCache: () => {} },
    // зачем (10.10): ebc1a860d (S2d) обернул операции подписки в withPurchaseFlow — стенд выполняет операцию как есть.
    './swallow_log': { noteSwallowedHandler: () => () => {} },
    // зачем (15.10, красные сторожи; тест устарел): экран спрашивает dev-подмену плана через './dev_vip_override' — в харнессе подмены нет, как в проде (getDevPlanOverride = () => null).
    './dev_vip_override': { getDevPlanOverride: () => null },
    // зачем (PM-214, 13.10): первый кадр «Подписки» без ?plan= берёт план из памяти процесса — в харнессе памяти нет (скелет, как раньше)
    './premium_plan_peek': { peekPremiumPlan: () => null, rememberPremiumPlan: () => undefined },
    './dev_save_offer_progress': { getDevSaveOfferProgress: () => null }, // зачем: dev-подмена прогресса оффера удержания — в харнессе выключена, как в проде
    // зачем (17.10, 84be74d0f): экран спрашивает доступ до отрисовки; харнесс — Plus с выясненным доступом, как и раньше (исходы доступа — tests/manage_subscription_access.test.ts)
    './manage_subscription_access': { decideManageAccess: () => ({ decision: 'show', reason: 'access_resolved_plus' }), MANAGE_NO_ACCESS_PAYWALL: { pathname: '/premium_modal', params: { context: 'premium_expired', source: 'notification_premium_expiry' } } },
    '../components/PremiumContext': { usePremium: () => ({ hasPremiumAccess: true, accessResolved: true }) },
    './purchase_flow_activity': { withPurchaseFlow: (_source, operation) => operation() },
    './account_generation': { captureAccountGeneration: () => token, isCurrentAccountGeneration: () => true, subscribeAccountGeneration: () => ({ remove() {} }) },
    './manage_subscription_purchase': { changeManageSubscriptionPlanForGeneration: async () => ({ status: 'stale' }), isManageSubscriptionOperationCurrent: () => true },
    './revenuecat_account_identity': { readRevenueCatCustomerInfoForGeneration: async () => null },
    './home_screen_hydration': { peekHomeScreenHydration: () => progress },
    './manage_subscription_save_offer': { resolveSaveOffer: () => offer }, './dev_paywall_state': { isDevManageLoadingHold: () => false, isDevRestorePurchaseEmpty: () => false }, // зачем (12.10, 7a79d3519): экран читает dev-подмену manage=loading; в сторе это заглушка, в харнесс-карте — выключено
    './debug-logger': { DebugLogger: { error: () => {} } },
    // зачем (Дизайн, приказ «пейволы все сделать»): подпись смены плана берёт цену магазин → кэш → справочная с «≈»; заглушки без кэша.
    './paywall_price_cache': { peekPaywallPriceCache: () => null },
    './paywall_reference_prices': { resolvePaywallReferencePrices: () => ({ yearly: '€39,99', monthly: '€7,99', yearlyPerMonth: '€3,33', source: 'builtin' }) },
  };
  const output = ts.transpileModule(source, { fileName: SOURCE_PATH, compilerOptions: { esModuleInterop: true, jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(output, { module: mod, exports: mod.exports, require: name => { assert.ok(name in modules, `stub exists for ${name}`); return modules[name]; }, console: { log() {}, warn() {}, error() {} }, Date, Intl, Number, String, Promise }, { filename: SOURCE_PATH });
  const materialize = node => {
    if (Array.isArray(node)) return node.map(materialize);
    if (!node || typeof node !== 'object') return node;
    if (typeof node.type === 'function') return materialize(node.type(node.props));
    return { ...node, props: { ...node.props, children: (node.props?.children ?? []).map(materialize) } };
  };
  const render = () => { stateCursor = 0; refCursor = 0; return materialize(mod.exports.default()); };
  const measure = (tree, height = 320) => { byId(tree, 'manage-subscription-overlay-viewport').props.onLayout({ nativeEvent: { layout: { height } } }); return render(); };
  return { calls, glass, render, measure, setKeyboardBottomInset: value => { currentKeyboardBottomInset = value; } };
}

test('uses the shared reduced-motion entrance and a measured opaque scrolling panel without clipping contracts', () => {
  assertOverlayContract(source);
  assert.match(source, /S\.sheetTitle, \{ color: glass\.text, fontSize: scaled\(22\), lineHeight: scaled\(28\) \}/);
  assert.match(source, /sheetTitle:\s*\{[^}]*fontWeight:\s*'700'/s);
  assert.match(source, /reasonRow:\s*\{[^}]*minHeight:\s*52[^}]*paddingVertical/s);
  assert.match(source, /input:\s*\{[^}]*minHeight:\s*88/s);
  assert.match(source, /sheetPrimary:\s*\{[^}]*minHeight:\s*52[^}]*paddingVertical/s);
  assert.match(source, /sheetSecondary:\s*\{[^}]*minHeight:\s*48[^}]*paddingVertical/s);
  assert.match(source, /offerStats:\s*\{[^}]*flexWrap:\s*'wrap'/s);
  for (const [file, expected] of Object.entries(DEPENDENCIES)) assert.equal(sha(file), expected, `${file} unchanged`);
});

test('measures the keyboard-reduced inner viewport and updates the numeric bound after resize', () => {
  const harness = createHarness({ state: { 9: true, 12: 'reasons' } });
  let tree = harness.render();
  const keyboardAvoider = visit(tree).find(node => node.type === 'KeyboardAvoidingView');
  const viewport = byId(tree, 'manage-subscription-overlay-viewport');
  assert.equal(keyboardAvoider.props.onLayout, undefined, 'outer keyboard frame must not own the measurement');
  assert.equal(viewport.type, 'View');
  viewport.props.onLayout({ nativeEvent: { layout: { height: 500 } } });
  tree = harness.render();
  assert.equal(flatStyle(byId(tree, 'manage-subscription-overlay-panel').props.style).maxHeight, 500);
  byId(tree, 'manage-subscription-overlay-viewport').props.onLayout({ nativeEvent: { layout: { height: 240 } } });
  tree = harness.render();
  assert.equal(flatStyle(byId(tree, 'manage-subscription-overlay-panel').props.style).maxHeight, 240);
});

test('uses real keyboard coordinates only when the Android window did not resize', () => {
  const { getKeyboardBottomInset } = loadKeyboardAvoidanceMath();
  assert.equal(getKeyboardBottomInset({ screenY: 936, height: 664 }, 1600), 664, 'edge-to-edge non-resizing window overlap');
  assert.equal(getKeyboardBottomInset({ screenY: 936, height: 664 }, 936), 0, 'already-resized viewport has no remaining overlap');
  assert.equal(getKeyboardBottomInset(null, 1600), 0, 'hidden keyboard has no overlap');
});

test('lifts and bounds the Android panel by keyboard overlap minus the SafeAreaView bottom inset', () => {
  const harness = createHarness({ platform: 'android', keyboardBottomInset: 332, rawBottomInset: 24, state: { 9: true, 12: 'reasons' } });
  let tree = harness.render();
  assert.equal(flatStyle(byId(tree, 'manage-subscription-overlay-viewport').props.style).paddingBottom, 308);
  tree = harness.measure(tree, 752);
  assert.equal(flatStyle(byId(tree, 'manage-subscription-overlay-panel').props.style).maxHeight, 444);

  harness.setKeyboardBottomInset(0);
  tree = harness.render();
  assert.equal(flatStyle(byId(tree, 'manage-subscription-overlay-viewport').props.style).paddingBottom ?? 0, 0, 'hide restores the full safe viewport');
  assert.equal(flatStyle(byId(tree, 'manage-subscription-overlay-panel').props.style).maxHeight, 752);

  harness.setKeyboardBottomInset(332);
  tree = harness.render();
  assert.equal(flatStyle(byId(tree, 'manage-subscription-overlay-viewport').props.style).paddingBottom, 308, 'showing again restores the lift');
  assert.equal(flatStyle(byId(tree, 'manage-subscription-overlay-panel').props.style).maxHeight, 444);
});

test('does not double-compensate resized Android viewports or alter iOS KeyboardAvoidingView behavior', () => {
  const resized = createHarness({ platform: 'android', keyboardBottomInset: 0, rawBottomInset: 24, state: { 9: true, 12: 'reasons' } });
  let tree = resized.measure(resized.render(), 444);
  assert.equal(flatStyle(byId(tree, 'manage-subscription-overlay-viewport').props.style).paddingBottom ?? 0, 0);
  assert.equal(flatStyle(byId(tree, 'manage-subscription-overlay-panel').props.style).maxHeight, 444);
  assert.equal(visit(tree).find(node => node.type === 'KeyboardAvoidingView').props.behavior, undefined);

  const ios = createHarness({ platform: 'ios', keyboardBottomInset: 332, rawBottomInset: 24, state: { 9: true, 12: 'reasons' } });
  tree = ios.measure(ios.render(), 752);
  assert.equal(flatStyle(byId(tree, 'manage-subscription-overlay-viewport').props.style).paddingBottom ?? 0, 0);
  assert.equal(flatStyle(byId(tree, 'manage-subscription-overlay-panel').props.style).maxHeight, 752);
  assert.equal(visit(tree).find(node => node.type === 'KeyboardAvoidingView').props.behavior, 'padding');
});

test('bounds the absolute overlay to ordinary safe-area content instead of the SafeAreaView itself', () => {
  const harness = createHarness({ state: { 9: true, 12: 'reasons' } });
  const tree = harness.render();
  const safeArea = visit(tree).find(node => node.type === 'SafeAreaView');
  const safeChildren = safeArea.props.children.filter(child => child && typeof child === 'object');
  assert.equal(safeChildren.length, 1, 'SafeAreaView owns one normal-flow content viewport');
  const safeContent = safeChildren[0];
  assert.equal(safeContent.props.testID, 'manage-subscription-safe-content');
  assert.deepEqual(flatStyle(safeContent.props.style), { flex: 1, position: 'relative' });
  assert.ok(safeContent.props.children.some(child => child?.props?.testID === 'manage-subscription-host'));
  assert.ok(safeContent.props.children.some(child => child?.props?.testID === 'manage-subscription-overlay'));
});

test('renders reasons, Other input, selected state, and disabled Continue for every palette', () => {
  for (const themeId of THEMES) {
    const harness = createHarness({ themeId, state: { 9: true, 12: 'reasons' } });
    let tree = harness.render();
    assert.equal(byId(tree, 'manage-subscription-host').props.accessibilityElementsHidden, true);
    tree = harness.measure(tree, 276);
    assert.deepEqual(harness.calls.tokenIds, [themeId, themeId]);
    const panel = byId(tree, 'manage-subscription-overlay-panel');
    assert.equal(flatStyle(panel.props.style).backgroundColor, harness.glass.opaqueSheet);
    assert.equal(flatStyle(panel.props.style).maxHeight, 276);
    assert.equal(byId(tree, 'manage-subscription-overlay-scroll').props.keyboardShouldPersistTaps, 'handled');
    assert.equal(byId(tree, 'manage-subscription-overlay').props.onPress, undefined, 'backdrop remains non-pressable');
    const reasons = visit(tree).filter(node => String(node.props?.testID ?? '').startsWith('manage-subscription-reason-'));
    assert.equal(reasons.length, 6);
    assert.ok(reasons.every(node => node.props.accessibilityRole === 'radio' && node.props.accessibilityState.selected === false));
    const primary = byId(tree, 'manage-subscription-reasons-continue');
    assert.equal(primary.type, 'DuoPressable');
    assert.equal(primary.props.disabled, true);
    assert.equal(primary.props.accessibilityState.disabled, true);
    assert.equal(primary.props.withHaptic, false);
  }
  const harness = createHarness({ state: { 9: true, 10: 'other', 12: 'reasons' } });
  let tree = harness.measure(harness.render());
  const other = byId(tree, 'manage-subscription-reason-other');
  assert.equal(other.props.accessibilityState.selected, true);
  assert.equal(other.props.withHaptic, false);
  assert.equal(other.props.withSound, false);
  assert.ok(byId(tree, 'manage-subscription-reason-other-input'));
});

test('keeps the six reason callbacks, English reason copy, Other text, and one-haptic Continue flow', () => {
  assert.match(source, /LP\(r\.ru, r\.uk, r\.en, r\.es, r\['pt-BR'\], r\.vi, r\.id, r\.tr, r\.pl\)/);
  const harness = createHarness({ state: { 9: true, 12: 'reasons' }, offer: 'progress' });
  let tree = harness.measure(harness.render());
  byId(tree, 'manage-subscription-reason-other').props.onPress();
  assert.equal(harness.calls.haptics, 1);
  tree = harness.render();
  const input = byId(tree, 'manage-subscription-reason-other-input');
  input.props.onChangeText('Нужна другая функция');
  tree = harness.render();
  assert.equal(byId(tree, 'manage-subscription-reason-other-input').props.value, 'Нужна другая функция');
  const continueButton = byId(tree, 'manage-subscription-reasons-continue');
  assert.equal(continueButton.props.disabled, false);
  continueButton.props.onPress();
  assert.equal(harness.calls.haptics, 2, 'reason and Continue callbacks each own exactly one haptic');
  tree = harness.render();
  assert.match(textOf(tree), /Ты уже многого добился/);
});

test('renders progress and support retention with reachable visible decline actions and original callbacks', () => {
  const progress = createHarness({ state: { 9: true, 10: 'too_expensive', 12: 'offer', 13: 'progress', 14: { streak: 7, lessonsCompleted: 4 } } });
  let tree = progress.measure(progress.render(), 240);
  assert.match(textOf(tree), /Ты уже многого добился/);
  assert.match(textOf(tree), /7[\s\S]*дней подряд/);
  assert.match(textOf(tree), /4[\s\S]*уроков/);
  assert.ok(byId(tree, 'manage-subscription-offer-decline'));
  assert.equal(byId(tree, 'manage-subscription-offer-accept').props.withHaptic, false);

  const support = createHarness({ state: { 9: true, 10: 'technical', 12: 'offer', 13: 'support' } });
  tree = support.measure(support.render(), 210);
  assert.match(textOf(tree), /Расскажи, что пошло не так/);
  assert.match(textOf(tree), /Мы читаем каждое обращение/);
  byId(tree, 'manage-subscription-offer-accept').props.onPress();
  assert.deepEqual(support.calls.events.slice(-2), ['hide-cancel', 'push']);
  assert.deepEqual(support.calls.pushes, ['/support_report']);
  assert.equal(support.calls.haptics, 1);
});

test('renders empty restore with support and Close while preserving close-before-push and one haptic', () => {
  const harness = createHarness({ state: { 8: true } });
  let tree = harness.measure(harness.render(), 190);
  assert.match(textOf(tree), /Покупок не нашлось/);
  assert.match(textOf(tree), /Проверь, тот ли это аккаунт магазина/);
  const support = byId(tree, 'manage-subscription-restore-support');
  const close = byId(tree, 'manage-subscription-restore-close');
  assert.equal(support.type, 'DuoPressable');
  assert.equal(close.type, 'PressableHybrid');
  assert.equal(support.props.withHaptic, false);
  assert.equal(close.props.withHaptic, false);
  support.props.onPress();
  assert.deepEqual(harness.calls.events.slice(-2), ['hide-restore', 'push']);
  assert.deepEqual(harness.calls.pushes, ['/support_report']);
  assert.equal(harness.calls.haptics, 1);
});

test('preserves the canonical ordered 19 overlay LP tuples from HEAD minus only retired XP copy', () => {
  assert.equal(OVERLAY_LP_BASELINE.length, 19);
  assert.ok(OVERLAY_LP_BASELINE.every(call => call.length === LANGS.length));
  assertOverlayLpBaseline(source);
  assert.throws(() => assertOverlayLpBaseline(source.replace('Почему уходишь?', 'Почему уходишь навсегда?')));
  assert.throws(() => assertOverlayLpBaseline(source.replace('Napisz do wsparcia', 'Skontaktuj się ze wsparciem')));
});

test('renders reasons, progress, support, and empty restore in all nine retained locales', () => {
  const tooExpensive = ['Слишком дорого', 'Занадто дорого', 'Too expensive', 'Demasiado caro', 'Muito caro', 'Quá đắt', 'Terlalu mahal', 'Çok pahalı', 'Za drogo'];
  for (const [localeIndex, lang] of LANGS.entries()) {
    const reasons = createHarness({ lang, state: { 9: true, 12: 'reasons' } });
    const reasonsTree = reasons.measure(reasons.render());
    const reasonsText = textOf(reasonsTree);
    assert.ok(reasonsText.includes(OVERLAY_LP_BASELINE[0][localeIndex]), `${lang} reasons title`);
    assert.ok(reasonsText.includes(OVERLAY_LP_BASELINE[1][localeIndex]), `${lang} reasons body`);
    assert.ok(reasonsText.includes(tooExpensive[localeIndex]), `${lang} reason copy / English Russian fallback`);
    assert.ok(reasonsText.includes(OVERLAY_LP_BASELINE[4][localeIndex]), `${lang} reasons primary`);
    assert.ok(reasonsText.includes(OVERLAY_LP_BASELINE[5][localeIndex]), `${lang} reasons secondary`);
    assert.equal(visit(reasonsTree).filter(node => String(node.props?.testID ?? '').startsWith('manage-subscription-reason-')).length, 6);

    const progress = createHarness({ lang, state: { 9: true, 10: 'too_expensive', 12: 'offer', 13: 'progress', 14: { streak: 7, lessonsCompleted: 4 } } });
    const progressText = textOf(progress.measure(progress.render()));
    for (const callIndex of [7, 9, 10, 11, 13, 14]) {
      assert.ok(progressText.includes(OVERLAY_LP_BASELINE[callIndex][localeIndex]), `${lang} progress call ${callIndex + 1}`);
    }

    const support = createHarness({ lang, state: { 9: true, 10: 'technical', 12: 'offer', 13: 'support' } });
    const supportText = textOf(support.measure(support.render()));
    for (const callIndex of [6, 8, 12, 14]) {
      assert.ok(supportText.includes(OVERLAY_LP_BASELINE[callIndex][localeIndex]), `${lang} support call ${callIndex + 1}`);
    }

    const restore = createHarness({ lang, state: { 8: true } });
    const restoreText = textOf(restore.measure(restore.render()));
    for (const callIndex of [15, 16, 17, 18]) {
      assert.ok(restoreText.includes(OVERLAY_LP_BASELINE[callIndex][localeIndex]), `${lang} restore call ${callIndex + 1}`);
    }
  }
});

test('hides host accessibility if and only if any overlay is active', () => {
  for (const [label, state, active] of [
    ['inactive', {}, false],
    ['reasons', { 9: true, 12: 'reasons' }, true],
    ['offer', { 9: true, 12: 'offer', 13: 'progress' }, true],
    ['restore', { 8: true }, true],
    ['both flags', { 8: true, 9: true, 12: 'reasons' }, true],
  ]) {
    const host = byId(createHarness({ state }).render(), 'manage-subscription-host');
    assert.equal(host.props.accessibilityElementsHidden, active, `${label} accessibilityElementsHidden`);
    assert.equal(host.props.importantForAccessibility, active ? 'no-hide-descendants' : 'auto', `${label} importantForAccessibility`);
  }
});

test('preserves stay, decline, restore-close, and both close-before-support callback flows', async () => {
  const stay = createHarness({ state: { 9: true, 12: 'reasons' } });
  byId(stay.measure(stay.render()), 'manage-subscription-reasons-stay').props.onPress();
  assert.deepEqual(stay.calls.events, ['hide-cancel']);
  assert.equal(byId(stay.render(), 'manage-subscription-host').props.accessibilityElementsHidden, false);
  assert.equal(stay.calls.haptics, 1);

  const decline = createHarness({ state: { 9: true, 10: 'too_expensive', 12: 'offer', 13: 'progress' } });
  byId(decline.measure(decline.render()), 'manage-subscription-offer-decline').props.onPress();
  assert.deepEqual(decline.calls.openedUrls, ['https://apps.apple.com/account/subscriptions']);
  await Promise.resolve();
  assert.ok(decline.calls.events.includes('hide-cancel'));
  assert.equal(decline.calls.haptics, 1);

  const restoreClose = createHarness({ state: { 8: true } });
  byId(restoreClose.measure(restoreClose.render()), 'manage-subscription-restore-close').props.onPress();
  assert.deepEqual(restoreClose.calls.events, ['hide-restore']);
  assert.equal(byId(restoreClose.render(), 'manage-subscription-host').props.accessibilityElementsHidden, false);
  assert.equal(restoreClose.calls.haptics, 1);

  const offerSupport = createHarness({ state: { 9: true, 10: 'technical', 12: 'offer', 13: 'support' } });
  byId(offerSupport.measure(offerSupport.render()), 'manage-subscription-offer-accept').props.onPress();
  assert.deepEqual(offerSupport.calls.events.slice(-2), ['hide-cancel', 'push']);
  assert.deepEqual(offerSupport.calls.pushes, ['/support_report']);

  const restoreSupport = createHarness({ state: { 8: true } });
  byId(restoreSupport.measure(restoreSupport.render()), 'manage-subscription-restore-support').props.onPress();
  assert.deepEqual(restoreSupport.calls.events.slice(-2), ['hide-restore', 'push']);
  assert.deepEqual(restoreSupport.calls.pushes, ['/support_report']);
});

test('contract mutations catch lost scrolling, transparent panels, font caps, and reordered support navigation', () => {
  for (const mutation of [
    source.replace('testID="manage-subscription-overlay-scroll"', 'testID="lost-scroll"'),
    source.replace('backgroundColor: glass.opaqueSheet', "backgroundColor: 'transparent'"),
    source.replace('multiline', 'multiline maxFontSizeMultiplier={1.2}'),
    source.replace("setShowRestoreEmpty(false); router.push('/support_report' as never);", "router.push('/support_report' as never); setShowRestoreEmpty(false);"),
  ]) assert.throws(() => assertOverlayContract(mutation));
});
