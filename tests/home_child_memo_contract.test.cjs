// зачем ([HOME-CHILD-COST] 18.10, координатор: шапка 8–14 мс и рейка 8–16 мс на каждом возврате «назад», actual ≈ base): перерисовки идут от пропсов, которые меняются на каждом возврате.
// Шапка: колокольчик получал isHomeTabActive и homeFocusTick внутри элемента bellSlot — теперь контекст. Рейка: ownerActive меняется на возврате, карточки вынесены в memo-компонент.
// Плюс журнал [HOME-CHILD-COST] печатает имена и значения «было → стало» изменившихся пропсов.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

function loadProbe() {
  const module = { exports: {} };
  const js = ts.transpileModule(read('app/home_focus_cost_probe.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
  vm.runInNewContext(js, {
    module, exports: module.exports,
    require: (id) => {
      if (id === 'react') return { createElement: () => null, Profiler: 'Profiler', useEffect: () => {}, useRef: (v) => ({ current: v }) };
      if (id === './dev_diag_gate') return { DIAG_ENABLED: true };
      if (id === './render_cause_probe') return { renderWindowEpoch: () => 0 };
      if (id === './back_tap_probe') return { noteBackStep: () => {} };
      throw Error(`Unmocked ${id}`);
    },
    console: { log: () => {}, warn: () => {} }, JSON, Math, Object, Set, Array,
  });
  return module.exports;
}
const probe = loadProbe();

test('журнал детей: имена и значения «было → стало», без содержимого; первый рендер без изменений', () => {
  const fn = () => 1;
  assert.equal(probe.diffProps(null, { a: 1 }).length, 0);
  const changes = probe.diffProps(
    { homeFocusTick: 3, active: false, onPress: fn, title: 'Привет', same: 7, list: [1, 2] },
    { homeFocusTick: 4, active: true, onPress: () => 2, title: 'Привет', same: 7, list: [1, 2, 3] },
  );
  const byName = Object.fromEntries(changes.map((c) => [c.name, `${c.from}→${c.to}`]));
  assert.equal(byName.homeFocusTick, '3→4');
  assert.equal(byName.active, 'false→true');
  assert.equal(byName.onPress, 'fn→fn');
  assert.equal(byName.list, 'arr[2]→arr[3]');
  assert.equal(byName.same, undefined);
  assert.equal(byName.title, undefined);
  assert.equal(probe.briefPropValue({ $$typeof: Symbol.for('react.element'), type: { displayName: 'Bell' } }), 'el<Bell>');
  assert.equal(probe.briefPropValue('x'.repeat(40)), JSON.stringify(`${'x'.repeat(24)}…`));
  assert.equal(probe.diffProps({ a: 1 }, { a: 2, b: 3, c: 4, d: 5, e: 6, f: 7, g: 8 }).length, 6, 'не больше 6 изменений');
});

test('шапка: колокольчик читает активность и счётчик фокусов из контекста, элемент в шапке без пропсов', () => {
  const ctx = read('components/home/v2/home_bell_state.ts');
  assert.ok(ctx.includes('export const HomeBellStateContext = createContext<HomeBellState | null>(null);'));
  const bell = read('components/NotificationCenterButton.tsx');
  assert.ok(bell.includes('const bellState = useContext(HomeBellStateContext);'));
  assert.ok(bell.includes('const isHomeTabActive = bellState?.active ?? isHomeTabActiveProp ?? false;'));
  assert.ok(bell.includes('const homeFocusTick = bellState?.focusTick ?? homeFocusTickProp ?? 0;'));
  assert.ok(bell.includes('isHomeTabActive?: boolean;') && bell.includes('homeFocusTick?: number;'), 'пропсы остались запасным путём без провайдера');
  const home = read('app/(tabs)/home.tsx');
  assert.ok(home.includes('bellSlot={<NotificationCenterButton />}'), 'элемент колокольчика не меняется между рендерами');
  assert.ok(home.includes('const homeBellState = useMemo(() => ({ active: homeRuntimeActive, focusTick }), [focusTick, homeRuntimeActive]);'));
  assert.ok(home.includes('<HomeBellStateContext.Provider value={homeBellState}>') && home.includes('</HomeBellStateContext.Provider>'));
  assert.ok(home.indexOf('<HomeBellStateContext.Provider') < home.indexOf('<HomeV2Header\n') && home.indexOf('</HomeBellStateContext.Provider>') > home.indexOf('<HomeV2Header\n'), 'провайдер вокруг шапки');
});

test('рейка: карточки — отдельный memo-компонент, смена ownerActive их не перерисовывает', () => {
  const rail = read('components/home/v2/HomeV2VideoRail.tsx');
  assert.ok(rail.includes('const VideoRailCards = memo(function VideoRailCards('));
  const view = rail.slice(rail.indexOf('const HomeV2VideoRailView = memo('));
  assert.ok(view.includes('<VideoRailCards videos={videos} title={title} plateColor={colorWithAlpha(p.glassRaised, HOME_PLATE_ALPHA)} glass={glass} onSelect={setActiveVideoId} />'));
  assert.ok(!view.includes('key={video.id}'), 'карточки больше не рисуются в теле рейки');
  const cards = rail.slice(rail.indexOf('const VideoRailCards = memo('), rail.indexOf('const HomeV2VideoRailView = memo('));
  assert.ok(!cards.includes('ownerActive'), 'карточкам ownerActive не нужен');
  assert.ok(cards.includes('onPress={() => onSelect(video.id)}'));
  assert.ok(cards.includes('recyclingKey') === false && cards.includes('testID={`home-v2-video-${video.id}`}'), 'testID карточек прежний');
});
