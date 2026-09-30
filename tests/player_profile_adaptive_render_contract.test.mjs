import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_PATH = 'components/PlayerProfileModal.tsx';
const source = fs.readFileSync(path.join(ROOT, SOURCE_PATH), 'utf8');
const BASELINE_PATH = path.join(ROOT, 'config', 'text-integrity-baseline.json');
const baselineSource = fs.readFileSync(BASELINE_PATH, 'utf8');
const THEMES = [
  'graphite', 'polar', 'slate', 'ink', 'lavender', 'iris', 'rose',
  'terracotta', 'taupe', 'olive', 'sage', 'eucalyptus', 'marine',
];
const LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const FONT_SCALE = { small: 1, medium: 1.15, large: 1.3 };
const PROTECTED_BEHAVIOR_DIGEST = 'eb4cf19d9e13fdb76d5a3b9740483c04b140ec97ec4f14a8417b95f68bd15e97';
const BASELINE_WITHOUT_RETIRED_PROFILE_BYTE_DIGEST = '02cc79deef34342b1bdfc49bfdbf123fb0771ec9a3cd85860fc4d31bb5a27d08';
const BASELINE_WITHOUT_RETIRED_PROFILE_STRUCTURAL_DIGEST = 'd492a861abf4bd7c08ffabb37116ea3a2a149edad0dbd4d89f8bed476617174e';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const parse = candidate => ts.createSourceFile(
  SOURCE_PATH,
  candidate,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
const print = (node, file) => printer.printNode(ts.EmitHint.Unspecified, node, file);

function protectedBehavior(candidate) {
  const file = parse(candidate);
  const items = [];
  const add = (key, value) => items.push([key, hash(value)]);
  let body;

  file.forEachChild(node => {
    if (ts.isInterfaceDeclaration(node) && ['PlayerInfo', 'MyInfo', 'Props'].includes(node.name.text)) {
      add(`interface.${node.name.text}`, print(node, file));
    }
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'PlayerProfileModalBody') body = node;
    if (ts.isFunctionDeclaration(node) && ['renderProfileModalOverlays', 'PlayerProfileModal'].includes(node.name?.text ?? '')) {
      add(`function.${node.name.text}`, print(node, file));
    }
  });
  assert.ok(body, 'PlayerProfileModalBody exists');

  const protectedVariables = new Set([
    'myCoinRank', 'publicRank', 'visibleRank', 'rankRow',
    'friendRequestTargetUid', 'showAddFriend', 'isAlreadyFriend', 'isFriendRequestSent',
    'likeTargetUid', 'canLike', 'likedThisProfile', 'profileState',
    'requestSentText', 'requestFailedText', 'relationshipText', 'friendActionLabel',
    'handleAddFriendPress', 'handleFriendButtonPress', 'handleRemoveFriendConfirm', 'handleToggleLike',
  ]);
  let effectIndex = 0;
  let localeIndex = 0;
  const walk = node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && protectedVariables.has(node.name.text)) {
      add(`body.variable.${node.name.text}`, print(node, file));
    }
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect') {
      add(`body.effect.${effectIndex}`, print(node, file));
      effectIndex += 1;
    }
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'triLang') {
      add(`body.locale.${localeIndex}`, print(node, file));
      localeIndex += 1;
    }
    const opening = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node) ? node : null;
    if (opening) {
      const testId = opening.attributes.properties.find(property => (
        ts.isJsxAttribute(property) && property.name.text === 'testID'
      ));
      const idText = testId?.initializer?.getText(file) ?? '';
      if ([
        'player-profile-close', 'player-profile-add-friend',
        'player-profile-report-user', 'player-profile-activity-like',
      ].some(id => idText.includes(id))) {
        const semanticAttributes = opening.attributes.properties
          .filter(property => !(ts.isJsxAttribute(property) && property.name.text === 'style'))
          .map(property => property.getText(file))
          .join('|');
        add(`body.action.${idText}`, semanticAttributes);
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(body);
  items.sort((left, right) => left[0].localeCompare(right[0]));
  return {
    count: items.length,
    digest: hash(items.map(item => item.join(':')).join('\n')),
  };
}

const visit = node => Array.isArray(node)
  ? node.flatMap(visit)
  : node && typeof node === 'object' ? [node, ...visit(node.props?.children)] : [];
const flatStyle = style => {
  const resolved = typeof style === 'function' ? style({ pressed: false }) : style;
  return Object.assign({}, ...((Array.isArray(resolved) ? resolved : [resolved]).flat(Infinity).filter(Boolean)));
};
const strings = value => Array.isArray(value)
  ? value.flatMap(strings)
  : value && typeof value === 'object' ? strings(value.props?.children)
    : typeof value === 'string' || typeof value === 'number' ? [String(value)] : [];
const textOf = node => strings(node?.props?.children).join(' ');
const byId = (tree, id) => visit(tree).find(node => node.props?.testID === id);

function createHarness({
  height = 844,
  width = 390,
  nativeFontScale = 1,
  fontSize = 'medium',
  uiScale = 1,
  themeId = 'graphite',
  lang = 'en',
  safeArea = { top: 47, right: 0, bottom: 34, left: 0 },
  requestSentUid = '',
  friendUid = '',
  likedUid = '',
  pendingFriendRequest = false,
} = {}) {
  const state = [];
  const refs = [];
  let stateCursor = 0;
  let refCursor = 0;
  let effects = [];
  const calls = { haptics: 0, tokenIds: [], close: 0 };
  const pending = new Promise(() => {});
  const React = {
    Fragment: Symbol('Fragment'),
    createElement(type, props, ...children) {
      const next = { ...(props ?? {}), children };
      return typeof type === 'function' ? type(next) : { type, props: next };
    },
    memo: component => component,
    useCallback: callback => callback,
    useEffect: effect => { effects.push(effect); },
    useRef(initialValue) {
      const index = refCursor++;
      if (!(index in refs)) refs[index] = { current: initialValue };
      return refs[index];
    },
    useState(initialValue) {
      const index = stateCursor++;
      if (!(index in state)) state[index] = typeof initialValue === 'function' ? initialValue() : initialValue;
      return [state[index], value => {
        state[index] = typeof value === 'function' ? value(state[index]) : value;
      }];
    },
  };
  class AnimatedValue {
    constructor(value) { this.value = value; }
    setValue(value) { this.value = value; }
    stopAnimation() {}
    interpolate() { return 1; }
  }
  const Animated = {
    View: 'Animated.View',
    Value: AnimatedValue,
    parallel: animations => ({ start: callback => { animations.forEach(animation => animation.start?.()); callback?.({ finished: true }); } }),
    timing: (value, config) => ({ start: callback => { value.setValue(config.toValue); callback?.({ finished: true }); } }),
  };
  const glass = {
    opaqueSheet: `sheet:${themeId}`, opaqueControl: `control:${themeId}`,
    text: '#fff', secondary: '#bbb', mutedText: '#999', selected: '#445', line: '#556',
  };
  const modules = {
    react: { __esModule: true, default: React, ...React },
    'react-native': {
      ActivityIndicator: 'ActivityIndicator', Animated, Easing: { out: value => value, cubic: 'cubic' },
      Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView',
      StyleSheet: { absoluteFillObject: { position: 'absolute' }, create: value => value },
      Text: 'Text', View: 'View', useWindowDimensions: () => ({ height, width, fontScale: nativeFontScale }),
    },
    'expo-image': { Image: 'Image' },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: 'Ionicons' },
    '../app/stable_safe_area_metrics': { useStableSafeAreaInsets: () => safeArea },
    './ThemeContext': {
      FONT_SCALE,
      useTheme: () => ({ fontSize, liquidGlassThemeId: themeId, themeMode: themeId, uiScale }),
    },
    './LangContext': { useLang: () => ({ lang }) },
    '../constants/i18n': { triLang: (active, copy) => copy[active] },
    '../constants/liquidGlassThemePalette': {
      liquidGlassTokens: id => { calls.tokenIds.push(id); return glass; },
    },
    '../app/config': { CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false },
    '../app/firestore_friend_requests': {
      deleteFriend: () => Promise.resolve(),
      sendFriendRequest: () => pendingFriendRequest ? pending : Promise.resolve('sent'),
    },
    '../app/friends_account_store': {
      friendsAccountStore: {
        subscribe: callback => { callback(friendUid ? [{ uid: friendUid }] : []); return () => {}; },
      },
    },
    '../app/synthetic_friend_requests': {
      isSyntheticUid: uid => String(uid).startsWith('synthetic:'),
      loadSyntheticFriendRequests: () => Promise.resolve(new Set(requestSentUid ? [requestSentUid] : [])),
      peekSyntheticFriendRequests: () => new Set(requestSentUid ? [requestSentUid] : []),
      rememberSyntheticFriendRequest: () => {},
    },
    '../app/synthetic_activity_likes': {
      hasLikedSynthetic: uid => uid === likedUid,
      loadSyntheticActivityLikes: () => Promise.resolve(),
      syntheticLikesAddedByMe: uid => uid === likedUid ? 1 : 0,
      toggleSyntheticLike: () => {},
    },
    '../constants/synthetic_residents': { residentBaseLikes: () => 12 },
    './ReportUserModal': { __esModule: true, default: 'ReportUserModal' },
    '../app/friend_activity_likes': {
      fetchActivityLikeTotal: () => Promise.resolve(12),
      fetchActivityLikeState: uid => Promise.resolve(uid === likedUid ? { date: '', targetUid: uid, eventId: 'profile' } : null),
      sendFriendActivityLike: () => Promise.resolve({ date: '', targetUid: '', eventId: 'profile', targetActivityLikeTotal: 13 }),
      removeFriendActivityLike: () => Promise.resolve({ date: '', targetUid: '', eventId: 'profile', targetActivityLikeTotal: 11 }),
      PROFILE_LIKE_EVENT_ID: 'profile',
    },
    '../app/user_id_policy': { getCanonicalUserId: () => Promise.resolve('self') },
    '../hooks/use-haptics': { hapticTap: () => { calls.haptics += 1; } },
    '../hooks/use-screen': { normalizeSafeAreaBottomInset: value => Math.max(0, value) },
    '../hooks/use_reduce_motion': { useReduceMotion: () => false },
    '../hooks/use_my_coin_rank': { useMyCoinRank: () => 5 },
    '../app/coin_rank_table_v1': { coinRankRowForDisplay: rank => ({ source: `coin:${rank}`, levelTitle: `Rank ${rank}` }) },
    '../app/player_profile_v2_state': {
      resolvePlayerProfileVisibleRank: input => input.isMe ? input.myRank : input.publicRank,
      resolvePlayerProfileV2State: input => {
        if (input.isMe) return 'self';
        if (!String(input.targetUid ?? '').trim()) return 'readonly';
        if (input.isFriend) return 'friend';
        if (input.friendRequestBusy) return 'add-busy';
        if (input.friendRequestSent) return 'request-sent';
        if (input.liked) return 'liked';
        return 'stranger';
      },
    },
    '../app/events': { emitAppEvent: () => {} },
    './InGameToast': { __esModule: true, default: 'InGameToast' },
    './ThemedConfirmModal': { __esModule: true, default: 'ThemedConfirmModal' },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: name => {
      assert.ok(modules[name], `stub exists for ${name}`);
      return modules[name];
    },
    Set,
  }, { filename: SOURCE_PATH });

  const baseProps = player => ({
    player,
    myInfo: { name: 'Owner', avatar: '', frame: '' },
    onClose: () => { calls.close += 1; },
  });
  const render = player => {
    stateCursor = 0;
    refCursor = 0;
    effects = [];
    return module.exports.default(baseProps(player));
  };
  const mount = async player => {
    render(player);
    const mountedEffects = effects.slice();
    for (const effect of mountedEffects) effect();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise(resolve => setImmediate(resolve));
    return render(player);
  };
  return { calls, glass, mount, render };
}

const selfPlayer = { name: 'Owner', points: 100, isMe: true, uid: 'self', coinRank: 5 };
const player = (uid = 'synthetic:player') => ({ name: 'A very long player name that must wrap', points: 100, isMe: false, uid, coinRank: 9 });

test('protects public types, identity/rank derivation, social effects and callbacks, localized copy, nested overlays, and outer lifecycle', () => {
  const protectedResult = protectedBehavior(source);
  assert.deepEqual(protectedResult, { count: 54, digest: PROTECTED_BEHAVIOR_DIGEST });
  const mutation = source.replace("result === 'already_friends'", "result === 'sent'");
  assert.notEqual(mutation, source);
  assert.notDeepEqual(protectedBehavior(mutation), protectedResult);
});

test('removes only the four obsolete renderCardBody truncation records from the text-integrity baseline', () => {
  const baseline = JSON.parse(baselineSource);
  const retiredProfileRecords = baseline.groups.filter(record => (
    record.file === SOURCE_PATH
    && record.ownerName === 'renderCardBody'
    && record.ownerPath === 'PlayerProfileModalBody>renderCardBody'
    && record.prop === 'numberOfLines'
  ));
  assert.equal(source.includes('renderCardBody'), false, 'the recorded owner no longer exists');
  assert.equal(source.includes('numberOfLines'), false, 'the current player card has no truncation site');
  assert.deepEqual(retiredProfileRecords, [], 'all four obsolete records are removed without replacement');
  assert.equal(baseline.groups.length, 185, 'only the four obsolete records leave the current 189-record baseline');
  assert.equal(hash(JSON.stringify(baseline.groups)), BASELINE_WITHOUT_RETIRED_PROFILE_STRUCTURAL_DIGEST);
  assert.equal(hash(baselineSource), BASELINE_WITHOUT_RETIRED_PROFILE_BYTE_DIGEST);
});

test('renders the normal 530dp composition and bounds a short sheet to the real safe viewport with complete scrolling', async () => {
  const normal = createHarness();
  const normalTree = await normal.mount(player());
  const normalSheet = byId(normalTree, 'player-profile-modal-sheet');
  const normalScroll = byId(normalTree, 'player-profile-scroll');
  assert.equal(flatStyle(normalSheet.props.style).height, 530);
  assert.equal(flatStyle(normalSheet.props.style).maxHeight, 751);
  assert.equal(flatStyle(normalSheet.props.style).minHeight, undefined);
  assert.equal(flatStyle(normalScroll.props.style).minHeight, 0);
  assert.equal(flatStyle(normalScroll.props.style).flex, 1);
  for (const id of ['player-profile-close', 'player-profile-add-friend', 'player-profile-report-user', 'player-profile-activity-like']) {
    assert.ok(visit(normalScroll).some(node => node.props?.testID === id), `${id} stays in the scrollable content`);
  }

  const short = createHarness({ height: 480 });
  const shortTree = await short.mount(player());
  const shortSheet = byId(shortTree, 'player-profile-modal-sheet');
  assert.equal(flatStyle(shortSheet.props.style).height, 387);
  assert.equal(flatStyle(shortSheet.props.style).maxHeight, 387);
  assert.ok(flatStyle(shortSheet.props.style).height <= 480 - 47 - 34 - 12);
});

test('uses all thirteen opaque palettes and app typography scaling without multiplying native font scale twice', async () => {
  for (const themeId of THEMES) {
    const harness = createHarness({ themeId });
    const tree = await harness.mount(player());
    assert.ok(harness.calls.tokenIds.every(id => id === themeId), `${themeId} token lookup`);
    assert.equal(flatStyle(byId(tree, 'player-profile-modal-sheet').props.style).backgroundColor, harness.glass.opaqueSheet);
  }

  const large = createHarness({ fontSize: 'large', uiScale: 1.2, nativeFontScale: 1.8 });
  const largeTree = await large.mount(player());
  const name = visit(largeTree).find(node => node.type === 'Text' && textOf(node).includes('A very long player name'));
  const scale = (FONT_SCALE.large / FONT_SCALE.medium) * 1.2;
  assert.equal(flatStyle(name.props.style).fontSize, 29 * scale);
  assert.equal(flatStyle(name.props.style).lineHeight, 35 * scale);

  const otherNativeScale = createHarness({ fontSize: 'large', uiScale: 1.2, nativeFontScale: 2.4 });
  const otherTree = await otherNativeScale.mount(player());
  const otherName = visit(otherTree).find(node => node.type === 'Text' && textOf(node).includes('A very long player name'));
  assert.equal(flatStyle(otherName.props.style).fontSize, flatStyle(name.props.style).fontSize);
  assert.match(source, /FONT_SCALE\[fontSize\]\s*\/\s*FONT_SCALE\.medium\s*\*\s*uiScale/);
  assert.doesNotMatch(source, /numberOfLines|adjustsFontSizeToFit|maxFontSizeMultiplier/);
});

test('wraps names, relationships, rank and like copy while keeping every action target at least 48dp', async () => {
  const tree = await createHarness({ width: 320, fontSize: 'large', uiScale: 1.2 }).mount(player());
  for (const value of [
    'A very long player name that must wrap', 'You can send a friend request',
    'Player rank', 'Rank 9', 'Activity likes',
  ]) {
    const text = visit(tree).find(node => node.type === 'Text' && textOf(node).includes(value));
    assert.ok(text, `${value} renders`);
    assert.equal(text.props.numberOfLines, undefined);
    assert.equal(text.props.adjustsFontSizeToFit, undefined);
    assert.equal(text.props.ellipsizeMode, undefined);
    assert.equal(flatStyle(text.props.style).flexShrink, 1, `${value} can wrap within its row`);
  }
  for (const id of ['player-profile-close', 'player-profile-add-friend', 'player-profile-report-user']) {
    const style = flatStyle(byId(tree, id).props.style);
    assert.ok(style.width >= 48 && style.height >= 48, `${id} has a 48dp layout target`);
  }
  assert.ok(flatStyle(byId(tree, 'player-profile-activity-like').props.style).minHeight >= 48);
});

test('renders all nine locales and all seven social states without changing one-action/one-haptic ownership', async () => {
  for (const lang of LOCALES) {
    const tree = await createHarness({ lang }).mount({ ...player(), uid: undefined });
    const close = byId(tree, 'player-profile-close');
    assert.equal(typeof close.props.accessibilityLabel, 'string', `${lang} close label`);
    assert.ok(close.props.accessibilityLabel.length > 0, `${lang} non-empty copy`);
  }

  const selfTree = await createHarness().mount(selfPlayer);
  assert.ok(textOf(selfTree).includes('Your player card'));
  assert.equal(byId(selfTree, 'player-profile-add-friend'), undefined);

  const readonlyTree = await createHarness().mount({ ...player(), uid: undefined });
  assert.ok(textOf(readonlyTree).includes('View-only profile'));
  assert.equal(byId(readonlyTree, 'player-profile-report-user'), undefined);

  const strangerHarness = createHarness();
  const stranger = player();
  const strangerTree = await strangerHarness.mount(stranger);
  assert.ok(textOf(strangerTree).includes('You can send a friend request'));
  const add = byId(strangerTree, 'player-profile-add-friend');
  add.props.onPress();
  assert.equal(strangerHarness.calls.haptics, 1, 'friend callback owns exactly one haptic');

  const busyHarness = createHarness({ pendingFriendRequest: true });
  const busyPlayer = player('remote:busy');
  let busyTree = await busyHarness.mount(busyPlayer);
  byId(busyTree, 'player-profile-add-friend').props.onPress();
  busyTree = busyHarness.render(busyPlayer);
  assert.ok(textOf(busyTree).includes('Sending request…'));
  assert.equal(byId(busyTree, 'player-profile-add-friend').props.disabled, true);
  assert.equal(busyHarness.calls.haptics, 1);

  const sentUid = 'synthetic:sent';
  const sentTree = await createHarness({ requestSentUid: sentUid }).mount(player(sentUid));
  assert.ok(textOf(sentTree).includes('Request sent'));
  assert.equal(byId(sentTree, 'player-profile-add-friend').props.disabled, true);

  const friendUid = 'synthetic:friend';
  const friendTree = await createHarness({ friendUid }).mount(player(friendUid));
  assert.ok(textOf(friendTree).includes('You are friends'));
  assert.equal(byId(friendTree, 'player-profile-add-friend').props.disabled, false);

  const likedUid = 'synthetic:liked';
  const likedTree = await createHarness({ likedUid }).mount(player(likedUid));
  assert.ok(textOf(likedTree).includes('Activity liked'));
  assert.equal(byId(likedTree, 'player-profile-activity-like').props.accessibilityState.selected, true);
});

test('the player-profile component remains TSX-transpileable', () => {
  const result = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(result.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
});
