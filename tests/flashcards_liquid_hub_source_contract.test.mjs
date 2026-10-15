import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const read = (name) => readFileSync(join(process.cwd(), 'app', 'flashcards', name), 'utf8');
const HUB_SOURCE = read('FlashcardsHubScreen.tsx');
const COMMUNITY_SOURCE = read('SavedTopCommunityPacks.tsx');
const THEME_IDS = [
  'graphite', 'polar', 'slate', 'ink', 'lavender', 'iris', 'rose',
  'terracotta', 'taupe', 'olive', 'sage', 'eucalyptus', 'marine',
];
// зачем (§90, 02.10): chooseMode игнорирует выбор, пока идёт ранний тап (окно ждёт квоту) — законный сдвиг.
// зачем (PM-229, 62c7b2fc4, 03.10): в reloadCatalog четыре немых .catch(() => []) заменены на
// noteSwallowedAs(…, []) — значение по умолчанию прежнее, причина пишется в журнал. Законный сдвиг.
const PROTECTED_AST = '8c89ae17994bf4d1ddbd9865b0dcafbd7ebac641b5e51a5bce2f0d5b37604300';
const HEADER_GLASS_BODY = '715db3b10a0abee044e76b8baed73f7ad5de81fb96a669ef0381f776fdf98019';
const DEPENDENCY_HASHES = {
  // зачем: fb9d8d8e6 (PM-210, экономия старта) — прогрев пустого каталога стал честным no-op; хаб не затронут.
  // зачем: e7709a89a (PM-289, удалён дев-рынок за жемчуг) + edea8fec7 (PM-229, немые catch пишут причину); хаб не затронут.
  // + 817a18fa8 (Account V2 8C-2: удалены мёртвые saveOwnedPackIds/addOwnedPackId, немые catch с логом); хаб не затронут.
  // + 11.10 (журнал 5): packTitleForInterface чистит хвост файла через formatPackTitleForDisplay (cleanPackSourceTitle Ядра); хаб не затронут.
  'app/flashcards/marketplace.ts': 'ed04ad760c73b83b0012c5c27c1fb05ed282f42d144fa9d5c8f72bf0e9d25d98',
  // зачем: edea8fec7 (PM-229) — немые catch пишут причину; хаб не затронут.
  // + 11.10 (журнал 4–5): официальный набор → «Professor Lingman» без чтения public_profiles/video:*, ранг монеты автора; хаб не затронут.
  'app/community_packs/packAuthorNames.ts': '4d675844c656f715b057b83c30f118ad607a9bb9519dd98a5816888b51f9e2f4',
  // зачем: 7b64aa008 (PM-108) — свой набор приватный по умолчанию; edea8fec7 (PM-229) — немые catch с причиной; хаб не затронут.
  'app/community_packs/localAuthorPacks.ts': '0a5de56ef1c378c3d6e39a51b051a55834ad5bf2f42ba90ce602d6a4c0d8a504',
  // зачем: c98e4ad1e (D145) — шкала текста 16/13.
  // зачем: f0b2153b4 (FINAL_PHASE п.7) — лайк откатывается при исключении; хаб не затронут.
  // зачем (PM-092, e76118033 + шкала D145): счётчики плитки — 13px вторичным тоном слева.
  'app/community_packs/CommunityPackSocialBar.tsx': 'eeba3524c7f88774ac34829e7a28843b8b01ac01a2df7fa64032aee7309ec42b',
  // зачем: a5cbccab3 (темы 2.0) — «золото» темы = акцент.
  'constants/liquidGlassThemePalette.ts': '28d6be604dc306d70938ea8e94cb534ff523daafce99808974ef2bd648cf8d49',
  'app/flashcards/packMarketplaceIcons.ts': '4d7d168a867514b096dc3a5541503db4759e68a2359020cb02cf695316f78b11',
  'hooks/useFlashcardTrainingQuotaPreview.ts': 'c4b61412f1e7530bf202e6c1f5053007875f763e28f12a18aebc27424bf6f0aa',
  'app/flashcards/training_entry.ts': '7bae7128ede11dfce800bb0f9f22f5d9a61ba195009346fb98a7b24b3c9d9a85',
  'app/flashcards/myPacksCountCache.ts': '5fa8c823f8a34974ee2a29327c0a3152beafdd791f75eee3a2e7a9c5dc7a91f7',
  'app/flashcards/saved_language_contour.ts': '6c6a2dc0f839bed2298eceb9c7c0d3237c8c6c4f5c9894c74075ab290d33af7b',
};

const hash = value => createHash('sha256').update(value).digest('hex');
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

function parse(name, source) {
  return ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function protectedAst() {
  const items = [];
  for (const [name, source] of [['hub', HUB_SOURCE], ['community', COMMUNITY_SOURCE]]) {
    const file = parse(name, source);
    const walk = node => {
      if (ts.isFunctionDeclaration(node) && ['sameCatalog', 'sameIds', 'mergeCatalogs', 'pickTopCommunityPacks'].includes(node.name?.text)) {
        items.push([node.name.text, printer.printNode(ts.EmitHint.Unspecified, node, file)]);
      }
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
        && ['reloadCatalog', 'openTopPack', 'openCreatePack', 'openTrainingPaywall', 'chooseMode', 'finishModeSheetDismissal'].includes(node.name.text)) {
        items.push([node.name.text, printer.printNode(ts.EmitHint.Unspecified, node.initializer, file)]);
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'useFocusEffect') {
        items.push(['useFocusEffect', printer.printNode(ts.EmitHint.Unspecified, node, file)]);
      }
      ts.forEachChild(node, walk);
    };
    walk(file);
  }
  return hash(JSON.stringify(items.sort(([left], [right]) => left.localeCompare(right))));
}

function headerGlassBodyHash() {
  const file = parse('hub', HUB_SOURCE);
  let body = null;
  file.forEachChild(node => {
    if (ts.isFunctionDeclaration(node) && ['GlassSheen', 'HeaderGlassSheen'].includes(node.name?.text)) body = node.body;
  });
  assert.ok(body, 'header glass helper exists');
  return hash(printer.printNode(ts.EmitHint.Unspecified, body, file));
}

function flatStyle(value) {
  if (Array.isArray(value)) return Object.assign({}, ...value.filter(Boolean).map(flatStyle));
  return value && typeof value === 'object' ? value : {};
}

function visit(node, result = []) {
  if (node == null || typeof node === 'boolean') return result;
  if (Array.isArray(node)) {
    node.forEach(child => visit(child, result));
    return result;
  }
  if (typeof node !== 'object') return result;
  result.push(node);
  visit(node.props?.children, result);
  return result;
}

function byId(tree, testID) {
  const node = visit(tree).find(item => item.props?.testID === testID);
  assert.ok(node, `missing rendered node ${testID}`);
  return node;
}

// зачем (темы 2.0): палитра импортирует соседние модули constants/ (цветовые помощники,
// уровни цвета) — загружаем их тем же транспилятором, остальное (типы) — пустой объект.
function loadConstantsModule(name, cache = new Map()) {
  if (cache.has(name)) return cache.get(name);
  const source = readFileSync(join(process.cwd(), 'constants', `${name}.ts`), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  cache.set(name, module.exports);
  const localRequire = (id) => (/^\.\/liquidGlass/.test(id) ? loadConstantsModule(id.slice(2), cache) : {});
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  cache.set(name, module.exports);
  return module.exports;
}

function actualThemeRegistry() {
  return loadConstantsModule('liquidGlassThemePalette');
}

function createRenderHarness(source, expose, { themeId = 'graphite' } = {}) {
  const calls = { haptic: 0, opened: [] };
  const stateSlots = [];
  let hookCursor = 0;
  let stateUpdates = 0;
  const Fragment = Symbol('Fragment');
  const createElement = (type, props, ...children) => {
    const nextProps = { ...(props ?? {}), children: children.length <= 1 ? children[0] : children };
    if (type === Fragment) return nextProps.children;
    if (typeof type === 'function') return type(nextProps);
    return { type, props: nextProps };
  };
  const React = {
    createElement,
    Fragment,
    useMemo: factory => factory(),
    useCallback: callback => callback,
    useEffect: () => {},
    useRef: value => ({ current: value }),
    useState: initial => {
      const index = hookCursor;
      hookCursor += 1;
      if (!(index in stateSlots)) stateSlots[index] = typeof initial === 'function' ? initial() : initial;
      return [stateSlots[index], update => {
        const next = typeof update === 'function' ? update(stateSlots[index]) : update;
        if (next !== stateSlots[index]) {
          stateSlots[index] = next;
          stateUpdates += 1;
        }
      }];
    },
  };
  const palette = actualThemeRegistry();
  const host = type => props => createElement(type, props, props.children);
  const reactNative = {
    ActivityIndicator: 'ActivityIndicator',
    Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View',
    Platform: { OS: 'android' },
    StyleSheet: { absoluteFill: { position: 'absolute', inset: 0 }, create: styles => styles },
  };
  const generic = new Proxy(() => null, { get: () => generic });
  const ionicons = Object.assign(host('Ionicons'), {
    glyphMap: Object.freeze({
      'albums-outline': 1,
      'airplane-outline': 2,
      'briefcase-outline': 3,
    }),
  });
  const stubs = {
    react: { __esModule: true, default: React, ...React },
    'react-native': reactNative,
    '@expo/vector-icons/Ionicons': { __esModule: true, default: ionicons },
    'expo-blur': { BlurView: host('BlurView') },
    'expo-image': { Image: host('Image') },
    '../../components/SafeLinearGradient': { LinearGradient: host('LinearGradient') },
    '../../components/text-integrity/FlowText': { FlowText: host('FlowText') },
    '../../components/ThemeContext': { useTheme: () => ({ liquidGlassThemeId: themeId, theme: { textSecond: '#aaa', textMuted: '#999', accent: '#fff' } }) },
    '../../constants/liquidGlassThemePalette': palette,
    // зачем (Тень 12.10): плашки берут тень из components/v2/ShadowSurface; для харнесса — те же числа из constants/liquidGlassShadowStyle
    '../../components/v2/ShadowSurface': { plateBoxShadow: loadConstantsModule('liquidGlassShadowStyle').plateShadowStyle },
    '../../constants/i18n': { triLang: (lang, labels) => labels[lang] ?? labels.en },
    '../../hooks/use-haptics': { hapticTap: () => { calls.haptic += 1; } },
    './marketplace': {
      packTitleForInterface: pack => pack.titleRu,
      packCategoryIonIcon: category => ({
        business: 'briefcase-outline', travel: 'airplane-outline', invalid: 'not-an-icon', empty: '', prototype: 'toString',
      })[category] ?? 'albums-outline',
    },
    '../community_packs/packAuthorNames': { useCommunityAuthorName: pack => pack.authorName },
    '../community_packs/localAuthorPacks': { isLocalAuthorPackId: id => id.startsWith('local:') },
    // зачем (аудит Карточек 🟡, 15.10): витрина фильтрует по языку обучения; в харнессе — английский, «без языка» проходит.
    '../../components/StudyTargetContext': { useStudyTarget: () => ({ studyTarget: 'en' }) },
    './pack_languages': {
      normalizePackLanguage: value => (['en', 'fr', 'de', 'es', 'it', 'none'].includes(value) ? value : 'en'),
      packMatchesLanguageFilter: (value, selected) => { const language = ['en', 'fr', 'de', 'es', 'it', 'none'].includes(value) ? value : 'en'; return language === 'none' || language === selected; },
    },
    './packMarketplaceIcons': { bundledPackTilePng: () => 'legacy-png', packTileImageForPack: () => 'legacy-art' },
    '../community_packs/CommunityPackSocialBar': { __esModule: true, default: host('CommunityPackSocialBar') },
    // зачем (D158, 04.10): секция использует общий useLoadGate; здесь он не исчерпан — рисуется скелетон, как раньше.
    '../use_load_gate': { useLoadGate: () => ({ exhausted: false, retryNow: () => {} }) },
  };
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const localRequire = id => stubs[id] ?? generic;
  new Function('require', 'module', 'exports', `${output}\n${expose}`)(localRequire, module, module.exports);
  return {
    exports: module.exports,
    calls,
    palette,
    render: renderFn => { hookCursor = 0; return renderFn(); },
    stateUpdates: () => stateUpdates,
  };
}

function physicalGradientAngle(gradient, width, height) {
  const dx = (gradient.props.end.x - gradient.props.start.x) * width;
  const dy = (gradient.props.end.y - gradient.props.start.y) * height;
  return Math.atan2(dy, dx) * 180 / Math.PI;
}

function assertPhysicalGradientGeometry(gradient, width, height) {
  const radians = 20 * Math.PI / 180;
  const dx = (gradient.props.end.x - gradient.props.start.x) * width;
  const dy = (gradient.props.end.y - gradient.props.start.y) * height;
  const expectedLength = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
  assert.ok(Math.abs(Math.hypot(dx, dy) - expectedLength) < 1e-9, 'gradient spans the exact CSS projection length');
  assert.ok(Math.abs((gradient.props.start.x + gradient.props.end.x) / 2 - 0.5) < 1e-12, 'gradient x midpoint stays centered');
  assert.ok(Math.abs((gradient.props.start.y + gradient.props.end.y) / 2 - 0.5) < 1e-12, 'gradient y midpoint stays centered');
  assert.ok(Math.abs(physicalGradientAngle(gradient, width, height) - 20) < 1e-9, 'gradient keeps the physical CSS 110deg angle');
}

const samplePack = (overrides = {}) => ({
  id: 'community:one', titleRu: 'Очень длинное название набора без обрезания', codeName: 'One',
  authorName: 'Автор', category: 'business', cardCount: 24, likesCount: 4, addedCount: 9,
  commentsCount: 2, isCommunityUgc: true, ...overrides,
});

test('Hub catalog equality reacts to changed visible pack metadata and cover without deep comparisons', () => {
  const source = read('FlashcardsHubScreen.tsx');
  const equality = source.slice(source.indexOf('function sameCatalog('), source.indexOf('/** Тот же список id'));
  for (const token of ['titleRu', 'titleUk', 'titleEs', 'authorName', 'cardCount', 'isCommunityUgc', 'packTileArtRevision']) {
    assert.ok(equality.includes(token), `stale community rail risk: ${token}`);
  }
});

test('community highlights use real cover tiles in horizontal rail and preserve live loading and retry', () => {
  const source = read('SavedTopCommunityPacks.tsx');
  for (const token of ['packTitleForInterface(pack, lang)', 'useCommunityAuthorName(pack, lang)', 'pack.cardCount', 'openingPackId', 'onRetry', 'loading', 'CommunityPackSocialBar pack={pack}']) {
    assert.ok(source.includes(token), `missing real-data state: ${token}`);
  }
  assert.ok(source.includes('pickTopCommunityPacks(catalog, SHOWN, normalizePackLanguage(topStudyTarget))'), 'horizontal rail must keep additional real packs beyond the first three visible tiles');
  assert.match(source, /limit = COLS/, 'training setup keeps its existing three-suggestion default');
  assert.ok(source.includes('fc-cards-hub-see-all'), 'community section opens full catalog');
  assert.ok(source.includes('horizontal'), 'highlights are a horizontal rail');
  assert.ok(source.includes('const candidate = packCategoryIonIcon(category);'), 'local validator preserves the canonical category resolver');
  assert.ok(source.includes('communityPackIconName(pack.category)'), 'tiles validate the canonical category result');
  assert.doesNotMatch(source, /packTileImageForPack|bundledPackTilePng|ugcCardThemeKey|neon/i, 'retired appearance data cannot drive Hub tiles');
  assert.match(source, /cover: \{ width: 112, height: 112,/, 'community covers are exact 112dp squares');
  assert.match(source, /highlightRow: \{ width: 112 \}/, 'tile width matches the 112 dp mockup and leaves room for social indicators');
  assert.match(source, /rail: \{ flexDirection: 'row', gap: 10,/, 'rail uses the approved 10dp gap');
  assert.match(source, /sectionHeading: \{ minHeight: 44, marginTop: 20\.5, marginBottom: 2\.5,/, 'heading target compensates around the 21dp visual line');
  assert.doesNotMatch(source, /emptyCover|unavailableLabel|retryLabel/, 'зачем (владелец 01.10): пустая витрина = скелетон, без «недоступно» и «Повторить»');
  for (const token of ['styles.highlightBadge', 'styles.highlightTitle', 'styles.highlightAuthor', 'CommunityPackSocialBar', 'variant="tile"', 'styles.owned']) {
    assert.ok(source.includes(token), `restored popular indicator missing: ${token}`);
  }
});

test('actual populated community rail is transparent outside 112dp category covers and preserves state and callbacks', () => {
  for (const themeId of THEME_IDS) {
    const themed = createRenderHarness(COMMUNITY_SOURCE, 'exports.__CommunityHighlightRow = CommunityHighlightRow;', { themeId });
    const themedTree = themed.exports.__CommunityHighlightRow({
      pack: samplePack(), lang: 'ru', owned: false, opening: false, disabled: false, onOpen: () => {},
    });
    const themedOuter = flatStyle(themedTree.props.style({ pressed: false }));
    const themedCover = flatStyle(byId(themedTree, 'saved-top-pack-cover-community:one').props.style);
    const tokens = themed.palette.liquidGlassTokens(themeId);
    assert.equal(themedOuter.backgroundColor, undefined, `${themeId}: outer remains transparent`);
    assert.equal(themedCover.backgroundColor, tokens.opaqueCard, `${themeId}: cover follows opaque theme material`);
    // зачем (Тень 12.10): обложка без кромки — рамки нет, плашку отделяет тень темы
    assert.equal(themedCover.borderColor, undefined, `${themeId}: cover has no rim`);
    assert.ok(Array.isArray(themedCover.boxShadow) && themedCover.boxShadow.length > 0, `${themeId}: cover has a theme plate shadow`);
  }

  const harness = createRenderHarness(COMMUNITY_SOURCE, 'exports.__CommunityHighlightRow = CommunityHighlightRow;');
  const pack = samplePack();
  const tree = harness.exports.__CommunityHighlightRow({
    pack, lang: 'ru', owned: true, opening: true, disabled: false,
    onOpen: value => harness.calls.opened.push(value.id),
  });
  const outerStyle = flatStyle(tree.props.style({ pressed: false }));
  assert.equal(outerStyle.width, 112);
  for (const property of ['height', 'minHeight', 'padding', 'paddingHorizontal', 'paddingVertical', 'borderWidth', 'backgroundColor']) {
    assert.equal(outerStyle[property], undefined, `outer tile remains transparent: ${property}`);
  }
  const cover = byId(tree, `saved-top-pack-cover-${pack.id}`);
  const coverStyle = flatStyle(cover.props.style);
  assert.equal(coverStyle.width, 112);
  assert.equal(coverStyle.height, 112);
  assert.equal(coverStyle.borderRadius, 12);
  assert.equal(coverStyle.borderWidth, undefined, 'cover has no rim (Тень 12.10)');
  const icon = visit(cover).find(node => node.type === 'Ionicons' && node.props.name === 'briefcase-outline');
  assert.ok(icon, 'category icon is rendered from the canonical resolver');
  assert.equal(visit(cover).some(node => node.type === 'Image'), false, 'retired cover art is absent');
  assert.equal(visit(tree).some(node => node.type === 'LinearGradient'), false, 'populated community tile stays plain opaque material');
  assert.ok(visit(cover).some(node => node.type === 'ActivityIndicator'), 'opening state remains visible');
  assert.ok(visit(cover).some(node => node.type === 'Ionicons' && node.props.name === 'checkmark-circle'), 'owned state remains visible');
  const title = byId(tree, `saved-top-pack-title-${pack.id}`);
  assert.deepEqual(flatStyle(title.props.style), { fontSize: 13, lineHeight: 17, fontWeight: '700', marginTop: 5, color: '#FFFFFF' });
  assert.equal(title.props.numberOfLines, undefined);
  const author = byId(tree, `saved-top-pack-author-${pack.id}`);
  assert.equal(flatStyle(author.props.style).fontSize, 13);
  assert.equal(flatStyle(author.props.style).marginTop, 1);
  const badge = byId(tree, `saved-top-pack-count-${pack.id}`);
  const badgeStyle = flatStyle(badge.props.style);
  assert.equal(badgeStyle.minHeight, 19);
  assert.equal(badgeStyle.height, undefined);
  const social = visit(tree).find(node => node.type === 'CommunityPackSocialBar');
  assert.equal(social.props.pack, pack);
  assert.equal(social.props.owned, true);
  assert.equal(social.props.variant, 'tile');
  tree.props.onPress();
  assert.equal(harness.calls.haptic, 1);
  assert.deepEqual(harness.calls.opened, [pack.id]);

  const disabledTree = harness.exports.__CommunityHighlightRow({
    pack: samplePack({ id: 'community:disabled', category: 'unknown' }), lang: 'ru',
    owned: false, opening: false, disabled: true, onOpen: () => {},
  });
  assert.equal(disabledTree.props.accessible, false);
  assert.deepEqual(byId(disabledTree, 'saved-top-pack-activation-community:disabled').props.accessibilityState, { disabled: true, busy: false });
  const disabledCover = byId(disabledTree, 'saved-top-pack-cover-community:disabled');
  assert.ok(visit(disabledCover).some(node => node.type === 'Ionicons' && node.props.name === 'albums-outline'));
});

test('community tile keeps the live social bar reachable beside one guarded activation group', () => {
  const validate = candidate => {
    const harness = createRenderHarness(candidate, 'exports.__CommunityHighlightRow = CommunityHighlightRow;');
    const pack = samplePack({ id: 'community:a11y' });
    const render = overrides => harness.exports.__CommunityHighlightRow({
      pack, lang: 'en', owned: true, opening: true, disabled: false,
      onOpen: value => harness.calls.opened.push(value.id), ...overrides,
    });
    const tree = render();
    assert.equal(tree.props.accessible, false, 'physical whole-tile Pressable must not mask descendants');
    assert.equal(tree.props.accessibilityLabel, undefined);
    const activation = byId(tree, 'saved-top-pack-activation-community:a11y');
    assert.equal(activation.props.accessible, true);
    assert.equal(activation.props.accessibilityRole, 'button');
    assert.equal(activation.props.accessibilityLabel, `${pack.titleRu}. ${pack.authorName}`);
    assert.deepEqual(activation.props.accessibilityState, { disabled: false, busy: true });
    assert.deepEqual(activation.props.accessibilityActions, [{ name: 'activate' }]);
    assert.equal(activation.props.onAccessibilityTap, tree.props.onPress, 'VoiceOver double-tap uses the same guarded activation adapter');
    assert.equal(visit(activation).some(node => node.type === 'CommunityPackSocialBar'), false, 'live counters stay outside the static activation group');
    assert.equal(visit(tree).filter(node => node.type === 'CommunityPackSocialBar').length, 1);

    tree.props.onPress();
    assert.equal(harness.calls.haptic, 1, 'physical activation gives one haptic');
    assert.deepEqual(harness.calls.opened, [pack.id]);
    activation.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } });
    assert.equal(harness.calls.haptic, 2, 'accessibility activation gives one haptic');
    assert.deepEqual(harness.calls.opened, [pack.id, pack.id]);
    activation.props.onAccessibilityTap();
    assert.equal(harness.calls.haptic, 3, 'VoiceOver double-tap gives one haptic');
    assert.deepEqual(harness.calls.opened, [pack.id, pack.id, pack.id]);
    activation.props.onAccessibilityAction({ nativeEvent: { actionName: 'magicTap' } });
    assert.equal(harness.calls.haptic, 3, 'unrelated accessibility actions are ignored');

    const disabled = render({ disabled: true, opening: false });
    const disabledActivation = byId(disabled, 'saved-top-pack-activation-community:a11y');
    assert.deepEqual(disabledActivation.props.accessibilityState, { disabled: true, busy: false });
    disabled.props.onPress();
    disabledActivation.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } });
    disabledActivation.props.onAccessibilityTap();
    assert.equal(harness.calls.haptic, 3, 'disabled physical and accessibility paths have no feedback');
    assert.deepEqual(harness.calls.opened, [pack.id, pack.id, pack.id]);
  };

  validate(COMMUNITY_SOURCE);
  for (const mutation of [
    COMMUNITY_SOURCE.replace('accessible={false}', 'accessible={true}'),
    COMMUNITY_SOURCE.replace('if (disabled) return;', ''),
    COMMUNITY_SOURCE.replace("actionName === 'activate'", "actionName === 'magicTap'"),
  ]) {
    assert.notEqual(mutation, COMMUNITY_SOURCE, 'negative accessibility mutation target exists');
    assert.throws(() => validate(mutation), 'accessibility regression mutation must fail');
  }
});

test('actual community ranking filters non-community and local-author packs and keeps the top ten order', () => {
  const harness = createRenderHarness(COMMUNITY_SOURCE, '');
  const catalog = [
    samplePack({ id: 'official:ignored', isCommunityUgc: false, likesCount: 99 }),
    samplePack({ id: 'local:ignored', likesCount: 98 }),
    ...Array.from({ length: 12 }, (_, index) => samplePack({
      id: `community:${String(index).padStart(2, '0')}`,
      likesCount: index,
      addedCount: 20 - index,
    })),
  ];
  const ranked = harness.exports.pickTopCommunityPacks(catalog, 10);
  assert.equal(ranked.length, 10);
  assert.deepEqual(ranked.map(pack => pack.id), [
    'community:11', 'community:10', 'community:09', 'community:08', 'community:07',
    'community:06', 'community:05', 'community:04', 'community:03', 'community:02',
  ]);
});

test('community category icons accept only own Ionicons glyph names and fall back safely', () => {
  const validate = candidate => {
    const harness = createRenderHarness(
      candidate,
      'exports.__communityPackIconName = communityPackIconName; exports.__CommunityHighlightRow = CommunityHighlightRow;',
    );
    assert.equal(harness.exports.__communityPackIconName('business'), 'briefcase-outline');
    assert.equal(harness.exports.__communityPackIconName('travel'), 'airplane-outline');
    for (const category of ['invalid', 'empty', 'prototype']) {
      assert.equal(harness.exports.__communityPackIconName(category), 'albums-outline', `${category}: invalid canonical result falls back`);
      const tree = harness.exports.__CommunityHighlightRow({
        pack: samplePack({ id: `community:${category}`, category }), lang: 'en',
        owned: false, opening: false, disabled: false, onOpen: () => {},
      });
      assert.ok(visit(tree).some(node => node.type === 'Ionicons' && node.props.name === 'albums-outline'));
    }
    assert.doesNotMatch(candidate, /name=\{[^\n]*as never/, 'category icon must not bypass Ionicons name validation');
  };

  validate(COMMUNITY_SOURCE);
  for (const mutation of [
    COMMUNITY_SOURCE.replace(
      "Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, candidate)",
      "typeof candidate === 'string'",
    ),
    COMMUNITY_SOURCE.replace(
      "return isIoniconName(candidate) ? candidate : 'albums-outline';",
      "return candidate;",
    ),
  ]) {
    assert.notEqual(mutation, COMMUNITY_SOURCE, 'negative icon validation mutation target exists');
    assert.throws(() => validate(mutation), 'invalid icon validation mutation must fail');
  }
});

test('actual heading, populated, loading and empty renders preserve adaptive geometry and controls', () => {
  const harness = createRenderHarness(COMMUNITY_SOURCE, '');
  const seeAll = [];
  const retry = [];
  const common = {
    ownedCommunityPackIds: [], lang: 'ru', contentWidth: 280,
    onOpenPreview: pack => harness.calls.opened.push(pack.id),
    onSeeAll: () => seeAll.push('all'), onRetry: () => retry.push('retry'), openingPackId: null,
  };
  const populated = harness.exports.default({ ...common, catalog: [samplePack()], loading: false });
  const section = byId(populated, 'saved-top-community-section');
  assert.equal(flatStyle(section.props.style).width, 280);
  const headingRow = byId(populated, 'saved-top-community-heading-row');
  assert.deepEqual(flatStyle(headingRow.props.style), {
    minHeight: 44, marginTop: 20.5, marginBottom: 2.5, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', gap: 8,
  });
  const heading = byId(populated, 'saved-top-community-heading');
  assert.equal(flatStyle(heading.props.style).fontSize, 16);
  assert.equal(flatStyle(heading.props.style).lineHeight, 21);
  assert.equal(flatStyle(heading.props.style).fontWeight, '800');
  assert.equal(heading.props.numberOfLines, undefined);
  const seeAllTarget = byId(populated, 'fc-cards-hub-see-all');
  const seeAllStyle = flatStyle(seeAllTarget.props.style);
  assert.equal(seeAllStyle.minHeight, 44);
  assert.equal(seeAllStyle.minWidth, 44);
  assert.equal(seeAllStyle.maxWidth, '42%');
  assert.equal(seeAllStyle.flexShrink, 1);
  const seeAllText = visit(seeAllTarget).find(node => node.type === 'Text');
  assert.equal(flatStyle(seeAllText.props.style).flexShrink, 1);
  assert.equal(seeAllText.props.numberOfLines, undefined);
  seeAllTarget.props.onPress();
  assert.deepEqual(seeAll, ['all']);
  assert.equal(flatStyle(byId(populated, 'saved-top-community-rail').props.contentContainerStyle).gap, 10);

  const loading = harness.exports.default({ ...common, catalog: [], loading: true });
  assert.equal(visit(loading).some(node => node.type === 'LinearGradient'), false, 'loading tiles do not add decorative gradients');
  const loadingTiles = visit(loading).filter(node => /^saved-top-pack-loading-\d$/.test(node.props?.testID ?? ''));
  assert.equal(loadingTiles.length, 3);
  for (const [index, tile] of loadingTiles.entries()) {
    assert.equal(flatStyle(tile.props.style).width, 112);
    assert.equal(flatStyle(byId(tile, `saved-top-pack-loading-cover-${index}`).props.style).height, 112);
    assert.ok(byId(tile, `saved-top-pack-loading-title-${index}`));
    assert.ok(byId(tile, `saved-top-pack-loading-author-${index}`));
  }

  const empty = harness.exports.default({ ...common, catalog: [], loading: false });
  assert.equal(visit(empty).some(node => node.type === 'LinearGradient'), false, 'empty cover does not add decorative gradients');
  // зачем (владелец 01.10): пустой каталог = тот же скелетон (3 плитки 112), без «недоступно» и «Повторить».
  const emptyTiles = visit(empty).filter(node => /^saved-top-pack-loading-\d$/.test(node.props?.testID ?? ''));
  assert.equal(emptyTiles.length, 3);
  assert.equal(visit(empty).some(node => node.props?.testID === 'saved-top-community-retry'), false);
  assert.equal(visit(empty).some(node => node.props?.testID === 'saved-top-community-empty-cover'), false);
});

// зачем (владелец 01.10): окно выбора тренировки — шторка снизу по скрину владельца.
test('training selector is a bottom sheet with four rows, disabled speaking state and a round close', () => {
  const source = read('FlashcardsTrainingModeSheet.tsx');
  assert.ok(source.includes('Режим тренировки'));
  assert.ok(source.includes('<Modal'));
  assert.ok(source.includes('styles.sheet'));
  assert.ok(source.includes('fc-training-mode-cancel'));
  assert.ok(source.includes("row.mode === 'speaking' && !speakingEnabled"));
  assert.ok(!source.includes("allRows.filter((row) => row.mode !== 'speaking')"));
});

test('hub, community rows and training sheet follow all live Plus themes', () => {
  for (const file of ['FlashcardsHubScreen.tsx', 'SavedTopCommunityPacks.tsx', 'FlashcardsTrainingModeSheet.tsx']) {
    const source = read(file);
    assert.ok(source.includes('liquidGlassTokens(liquidGlassThemeId)'), `${file}: approved live theme registry`);
    assert.ok(!/#(?:0C0C0D|151517|FFFFFF|A6A6A8|F2F1F6|242426|1C1C1E)/i.test(source), `${file}: no fixed graphite or fixed content color`);
  }
});

test('approved graphite, lavender and marine tokens remain distinct materials', () => {
  const exports = loadConstantsModule('liquidGlassThemePalette');
  const [graphite, lavender, marine] = ['graphite', 'lavender', 'marine'].map(exports.liquidGlassTokens);
  assert.equal(new Set([graphite.card, lavender.card, marine.card]).size, 3);
  assert.equal(new Set([graphite.bg, lavender.bg, marine.bg]).size, 3);
  assert.equal(new Set([graphite.cta, lavender.cta, marine.cta]).size, 3);
  for (const tokens of [graphite, lavender, marine]) {
    assert.match(tokens.card, /^#[0-9A-F]{8}$/i);
    assert.ok(parseInt(tokens.card.slice(7), 16) < 255, 'card remains translucent');
  }
});


// зачем (владелец 04.10, хаб А утверждён и перенесён 1 в 1 из docs/design/v2-app/cards-section.html): прежние проверки раскладки «библиотека рядами + лента сообщества + сегменты»
// удалены вместе с самой раскладкой; здесь — сторож утверждённой: четыре равные плитки, стопка, главная кнопка с остатком, без прокрутки и без обводок.
// зачем: приказ владельца 11.10 — вернуть хаб утра (4 крупные плитки внизу, цвета берутся из темы пользователя)
test('approved hub A: stack, accent CTA with the monthly remainder and four equal tiles, no scroll, no outlines', () => {
  const hub = readFileSync('app/flashcards/FlashcardsHubScreen.tsx', 'utf8');
  const view = readFileSync('app/flashcards/CardsHubV2.tsx', 'utf8');
  for (const id of ['saved', 'mine', 'video', 'community']) assert.match(hub, new RegExp(`id: '${id}'`), `tile ${id}`);
  for (const route of ["'/flashcards_collection'", "'/flashcards_my_packs'", "'/flashcards_packs'", "'/flashcards_video_packs'"]) assert.match(hub, new RegExp(route), `route ${route}`);
  assert.match(hub, /осталось \$\{trainingRemaining\} из \$\{quotaPreview\.limit\}/, 'CTA shows the remaining monthly sessions');
  assert.match(view, /fc-cards-hub-train/);
  assert.match(view, /stackTop/);
  // зачем (координатор 05.10, FONTSCALE2): при шрифте 1.0 хаб без прокрутки, как в макете; ScrollView разрешён ТОЛЬКО как запасной вариант при крупном системном шрифте
  assert.doesNotMatch(view, /borderWidth: (?!StyleSheet\.hairlineWidth)/, 'hub A has only 1px hairline edges');
  assert.equal((view.match(/<ScrollView/g) ?? []).length, 1, 'one ScrollView only');
  assert.ok(view.includes('return fs > 1') && view.includes('? <ScrollView'), 'hub A has no scroll at font scale 1.0');
  assert.match(view, /tiles: \{[^}]*flexWrap: 'wrap'/);
});
