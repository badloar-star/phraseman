const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const home = fs.readFileSync(path.join(root, 'app/(tabs)/home.tsx'), 'utf8');
const railPath = path.join(root, 'components/home/v2/HomeV2VideoRail.tsx');

function renderHeader({ bellSlot, avatarSlot, stats }) {
  const ts = require('typescript');
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(root, 'components/home/v2/HomeV2Header.tsx'), 'utf8');
  const module = { exports: {} };
  const createElement = (type, props, ...children) => ({
    type,
    props: { ...props, children: children.length === 1 ? children[0] : children },
  });
  // зачем (Моменты 17.10, скорость Главной): шапка стала тонкой обёрткой + memo-видом (useRef, memo, isValidElement в сравнении) — песочнице нужны эти функции
  const React = { createElement, Fragment: Symbol('Fragment'), memo: (component) => component, useRef: (value) => ({ current: value }), isValidElement: (node) => Boolean(node && typeof node === 'object' && 'type' in node) };
  const modules = {
    react: { __esModule: true, default: React, memo: React.memo, useRef: React.useRef, isValidElement: React.isValidElement },
    'react-native': { StyleSheet: { create: styles => styles, hairlineWidth: 1 }, View: 'View' },
    '../../v2/V2Pressable': { __esModule: true, default: 'V2Pressable' },
    '../../text-integrity/FlowText': { FlowText: 'FlowText' },
    '../../../constants/v2Style': { V2: { radius: { row: 12 } }, V2_TYPE: { caption: {} } },
    '../../v2/useV2Palette': { useV2Palette: () => ({ text: '#000', textSecondary: '#111' }) },
    '../../v2/V2Glass': { V2GlassSheen: 'V2GlassSheen', useV2GlassStyle: () => ({}) },
    // зачем (координатор 12.10): шапка с 9ffbfb41a берёт плашки из homePlate (useHomePlateStyle/useHomePlateLog) и спиннер кита; песочница теста о них не знала → красный тест с 11.10
    './homePlate': { useHomePlateStyle: () => ({ plateFill: '#000', plateShadow: [] }), useHomePlateLog: () => undefined },
    '../../v2/KitSpinner': { __esModule: true, default: 'KitSpinner' },
    // зачем (17.10): шапка пишет причины перерисовок (render_cause_probe) — в песочнице это пустые заглушки
    '../../../app/render_cause_probe': { useRenderCause: () => undefined, renderWindowEpoch: () => 0 },
  };
  const output = ts.transpileModule(source, {
    compilerOptions: { esModuleInterop: true, jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${output}\n})`, {
    require: name => modules[name], module, exports: module.exports,
  })(name => modules[name], module, module.exports);
  // обёртка возвращает элемент memo-вида — разворачиваем функции-компоненты до разметки, как это сделал бы React
  let node = module.exports.default({ bellSlot, avatarSlot, stats });
  while (node && typeof node.type === 'function') node = node.type(node.props);
  return node;
}

function childrenOf(node) {
  return Array.isArray(node.props.children) ? node.props.children : [node.props.children];
}

test('V2 Home reuses its real video snapshot and places the rail between feature tiles and Today', () => {
  assert.match(home, /setHomeV2Videos\(snapshot\.videos\)/);
  const start = home.indexOf('const renderHomeV2 = () =>');
  const body = home.slice(start, start + 18500);
  const tiles = body.indexOf('<HomeV2FeatureTiles');
  const rail = body.indexOf('<HomeV2VideoRail');
  const today = body.indexOf('<HomeV2TodayCard');
  assert.ok(tiles >= 0 && rail > tiles && today > rail);
  assert.match(body.slice(rail, today), /onSeeAll=\{\(\) => go\('\/\(tabs\)\/video'\)\}/);
});

test('video rail scrolls horizontally and plays only the selected real video', () => {
  assert.ok(fs.existsSync(railPath));
  const rail = fs.readFileSync(railPath, 'utf8');
  const playerModal = fs.readFileSync(path.join(root, 'components/home/v2/HomeV2VideoPlayerModal.tsx'), 'utf8');
  assert.match(rail, /<ScrollView[^>]*horizontal/);
  assert.match(rail, /videos\.slice\(0, 8\)\.map\(/);
  assert.match(rail, /setActiveVideoId\(video\.id\)/);
  assert.doesNotMatch(rail, /^import YoutubeInlinePlayer/m);
  assert.match(rail, /require\('\.\/HomeV2VideoPlayerModal'\)/);
  assert.match(playerModal, /<Modal[^>]*visible/);
  assert.match(playerModal, /<YoutubeInlinePlayer/);
  assert.match(playerModal, /videoId=\{video\.id\}/);
  assert.match(playerModal, /onRequestClose=\{onClose\}/);
  assert.match(playerModal, /insets\.top/);
  assert.match(playerModal, /insets\.bottom/);
  assert.match(playerModal, /useStableSafeAreaInsets/);
  assert.doesNotMatch(playerModal, /\buseSafeAreaInsets\b/);
});

test('video rail reserves geometry while loading and does not label network failures as an empty catalog', () => {
  const rail = fs.readFileSync(railPath, 'utf8');
  assert.match(rail, /status: 'loading' \| 'ready' \| 'error'/);
  assert.doesNotMatch(rail, /unavailable|temporarily|Нет доступных видео/); // владелец 01.10
  assert.match(rail, /home-v2-video-loading/);
  assert.match(rail, /height: 138/);
  assert.match(home, /setHomeV2VideoStatus\('error'\)/);
  assert.match(home, /setHomeV2VideoStatus\(snapshot\.error && snapshot\.videos\.length === 0 \? 'error' : 'ready'\)/);
});

test('video rail keeps thumbnails clean and rectangular like the approved example', () => {
  const rail = fs.readFileSync(railPath, 'utf8');
  assert.doesNotMatch(rail, /<FlowText[^>]*>\{video\.title\}<\/FlowText>/);
  assert.doesNotMatch(rail, /<Text[^>]*>\{video\.title\}<\/Text>/);
  assert.match(rail, /accessibilityLabel=\{`\$\{title\}: \$\{video\.title\}`\}/);
  assert.match(rail, /card: \{[^}]*borderRadius: 0/);
});

test('Home header has one compact utility row without brand or tagline, and Video follows tiles closely', () => {
  const header = fs.readFileSync(path.join(root, 'components/home/v2/HomeV2Header.tsx'), 'utf8');
  assert.doesNotMatch(header, />PhraseMan<|s\.tagline|<CrownIcon/);
  assert.match(header, /\{bellSlot\}/);
  assert.match(header, /\{avatarSlot\}/);
  assert.match(header, /stats\.map\(/);
  assert.doesNotMatch(header, /numberOfLines/);
  assert.doesNotMatch(home, /tagline=\{triLang\(/);
  // зачем (04.10): с D129/D130 (0829e4b3e) плитки рендерятся только для готовых разделов языка — внутри
  // того же плотного блока gap 4 стоит условие homeV2Tiles.length > 0; смысл «Видео сразу за плитками» прежний.
  assert.match(home, /<View style=\{\{ gap: 4 \}\}>\s*\{homeV2Tiles\.length > 0 \? <HomeV2FeatureTiles/);
});

test('compact Home utility row shrinks on narrow screens and preserves optional stat interactivity', () => {
  const header = fs.readFileSync(path.join(root, 'components/home/v2/HomeV2Header.tsx'), 'utf8');
  assert.match(header, /statSlot: \{[^}]*flex: 1[^}]*minWidth: 0/);
  assert.match(header, /stats: \{[^}]*flex: 1/);
  assert.match(header, /stat\.onPress \?/);
  assert.match(header, /accessibilityRole="text"/);
  const coinsStat = home.slice(home.indexOf("testID: 'home-v2-coins'"), home.indexOf("testID: 'home-v2-coins'") + 750);
  // зачем (04.10): PM-052/D75 (9ecb23d94) убрал сбор наград и rewardCollect; в подписи — сам баланс,
  // а пока он не известен — «—», как и на экране (без нуля-заглушки).
  assert.match(coinsStat, /accessibilityLabel: `\$\{homeV2CoinsLabel\}: \$\{runesKnown \? runesBalance : '—'\}`/);
  assert.match(coinsStat, /onPress: \(\) => \{ nav\.push\('\/coin_rank'\); \}/);
  assert.doesNotMatch(coinsStat, /homeRunesA11yLabel/);
});

test('Home header renders stats left and a non-shrinking bell-avatar action group right without changing stat semantics', () => {
  let streakPresses = 0;
  const onStreakPress = () => { streakPresses += 1; };
  const header = renderHeader({
    bellSlot: { type: 'Bell' },
    avatarSlot: { type: 'Avatar' },
    stats: [
      { testID: 'streak', icon: null, value: '3', label: 'days', accessibilityLabel: '3 days', onPress: onStreakPress },
      { testID: 'coins', icon: null, value: '42', label: 'coins', accessibilityLabel: '42 coins' },
    ],
  });
  const [topRow] = childrenOf(header);
  const [stats, actions] = childrenOf(topRow);
  assert.equal(stats.props.style.flex, 1);
  assert.equal(stats.props.style.minWidth, 0);
  assert.equal(actions.props.style.flexShrink, 0);
  assert.equal(actions.props.style.flexDirection, 'row');
  assert.equal(actions.props.style.alignItems, 'center');
  assert.equal(actions.props.style.gap, 7);
  assert.deepEqual(childrenOf(actions), [{ type: 'Bell' }, { type: 'Avatar' }]);

  const [streak, coins] = childrenOf(stats);
  // зачем (Моменты 17.10): шапка зовёт САМЫЙ СВЕЖИЙ onPress через ref — тождество функции не проверяем, поведение проверяется ниже (тап доходит до обработчика)
  assert.equal(typeof streak.props.onPress, 'function');
  streak.props.onPress();
  assert.equal(streakPresses, 1);
  assert.equal(coins.type, 'View');
  assert.equal(coins.props.accessibilityRole, 'text');
  assert.equal(coins.props.onPress, undefined);

  assert.doesNotThrow(() => renderHeader({
    stats: [
      { testID: 'streak', icon: null, value: '3', label: 'days', accessibilityLabel: '3 days', onPress: onStreakPress },
      { testID: 'coins', icon: null, value: '42', label: 'coins', accessibilityLabel: '42 coins' },
    ],
  }));
});
