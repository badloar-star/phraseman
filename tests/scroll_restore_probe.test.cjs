// зачем ([SCROLL-RESTORE] 18.10, координатор): журнал «экран залип прокрученным вниз» не должен спамить и не должен ничего менять.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');

const lines = [];
function load({ dev = true, store = false } = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync('app/scroll_restore_probe.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
  vm.runInNewContext(js, {
    module, exports: module.exports,
    require: (id) => { if (id === './config') return { IS_STORE_RELEASE: store }; throw Error(`Unmocked ${id}`); },
    __DEV__: dev,
    console: { log: (...a) => lines.push(a), warn: () => {} }, Date, JSON, Math,
  });
  return module.exports;
}
const probe = load();
beforeEach(() => { lines.length = 0; probe.resetScrollRestoreProbeForTests(); });
const parsed = () => lines.map(([tag, what, json]) => ({ tag, what, ...JSON.parse(json) }));

test('событие пишет одну строку с экраном, положением и высотой', () => {
  probe.noteScrollContentHeight('settings', 1200, 0);
  probe.noteScrollOffset('settings', 40, 0);
  probe.noteScrollEvent('settings', 'tab_visible', { setBy: 'restore_scrollTo', savedY: 40 }, 1000);
  const [row] = parsed();
  assert.equal(row.tag, '[SCROLL-RESTORE]');
  assert.deepEqual([row.what, row.screen, row.event, row.y, row.contentH, row.setBy], ['event', 'settings', 'tab_visible', 40, 1200, 'restore_scrollTo']);
});

test('рывок ≥ 300 dp без пальца вскоре после события пишется, с пальцем и поздно — нет', () => {
  probe.noteScrollEvent('home', 'lang_change', {}, 1000);
  probe.noteScrollOffset('home', 500, 1200);
  assert.equal(parsed().filter((r) => r.what === 'jump_without_finger').length, 1);
  probe.noteScrollDrag('home', true);
  probe.noteScrollOffset('home', 5, 1300);
  probe.noteScrollDrag('home', false);
  probe.noteScrollOffset('home', 900, 9000);
  assert.equal(parsed().filter((r) => r.what === 'jump_without_finger').length, 1, 'палец и позднее окно молчат');
});

test('высота пишется только при изменении ≥ 24 dp, первое значение молча', () => {
  probe.noteScrollContentHeight('home', 1000, 0);
  probe.noteScrollContentHeight('home', 1010, 1);
  assert.equal(lines.length, 0);
  probe.noteScrollContentHeight('home', 1400, 2);
  const [row] = parsed();
  assert.deepEqual([row.what, row.before, row.after], ['content_height', 1010, 1400]);
});

test('не больше 8 строк на событие', () => {
  probe.noteScrollEvent('home', 'focus', {}, 1000);
  for (let i = 0; i < 30; i += 1) probe.noteScrollContentHeight('home', 1000 + i * 100, 1001 + i);
  assert.equal(lines.length, 8);
});

test('Настройки пишут событие перед scrollTo, Главная и Настройки отдают размер и положение', () => {
  const settings = fs.readFileSync('app/(tabs)/settings.tsx', 'utf8').replace(/\r\n/g, '\n');
  const eventAt = settings.indexOf("noteScrollEvent('settings', 'tab_visible'");
  assert.ok(eventAt > 0 && eventAt < settings.indexOf('scrollRef.current.scrollTo({ y: settingsScrollYRef.current, animated: false })'), 'событие раньше scrollTo');
  assert.ok(settings.includes("noteScrollEvent('settings', 'lang_change'"));
  assert.ok(settings.includes("noteScrollContentHeight('settings'"));
  assert.ok(settings.includes("noteScrollOffset('settings'"));
  const home = fs.readFileSync('app/(tabs)/home.tsx', 'utf8').replace(/\r\n/g, '\n');
  for (const needle of ["noteScrollEvent('home', 'lang_change'", "noteScrollEvent('home', 'focus'", "noteScrollContentHeight('home'", "noteScrollOffset('home'"]) assert.ok(home.includes(needle), needle);
});

// зачем (Ревизор 3.44, координатор 18.10): в сторовой сборке журнал прокрутки — no-op.
test('сторовая сборка и не-dev: журнал [SCROLL-RESTORE] ничего не пишет', () => {
  for (const mode of [{ dev: true, store: true }, { dev: false, store: false }]) {
    const off = load(mode);
    lines.length = 0;
    off.noteScrollEvent('home', 'lang_change', { lang: 'es' }, 1000);
    off.noteScrollContentHeight('home', 900, 1001);
    off.noteScrollContentHeight('home', 1400, 1002);
    off.noteScrollOffset('home', 800, 1003);
    off.noteScrollDrag('home', true);
    assert.deepEqual(lines, []);
  }
});
