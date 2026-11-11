// зачем (владелец 11.11: «когда перемещается по вкладкам, цвет вкладки и иконки меняется и становится прозрачным»; правило 24.09
// «ТАББАР НЕ ДОЛЖЕН БЫТЬ ПРОЗРАЧНЫМ»): на iOS заливка панели была 0,64 → 0,76 — сквозь неё было видно страницу под панелью.
// Сторож: плотность заливки одна на обе платформы и не ниже 0,85. Ослаблять — только по новому слову владельца.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../components/v2/V2TabBar.tsx'), 'utf8');
const MIN_ALPHA = 0.85;

function constant(name) {
  const m = source.match(new RegExp(`const ${name} = (\\d+(?:\\.\\d+)?);`));
  assert.ok(m, `нет константы ${name}`);
  return Number(m[1]);
}

test('заливка капсулы панели плотная — страница под панелью её не красит', () => {
  assert.ok(constant('TAB_GLASS_ALPHA_TOP') >= MIN_ALPHA);
  assert.ok(constant('TAB_GLASS_ALPHA_BOTTOM') >= MIN_ALPHA);
});

// зачем (владелец 11.11: «на долю секунды белые при анимации перемещения»): плашка уезжала сразу, а значки перекрашивались только с
// перерисовкой экрана вкладки (60–230 мс по журналу). Вид значка переключается в обработчике касания ДО вызова экрана и тем же
// путём, что плашка (useNativeDriver), а цвет больше не выбирается по входному activeIndex.
test('значок меняет вид в момент касания, раньше перерисовки экрана', () => {
  const tap = source.slice(source.indexOf('const tapSelect = '), source.indexOf('const endGesture = '));
  assert.ok(tap.indexOf("markSelected(idx, 'tap')") > 0, 'tapSelect не переключает значок');
  assert.ok(tap.indexOf("markSelected(idx, 'tap')") < tap.indexOf('live.current.onSelect(idx)'), 'значок переключается после вызова экрана');
  const drag = source.slice(source.indexOf('const endGesture = '), source.indexOf('const responder = '));
  assert.ok(drag.indexOf("markSelected(target, 'drag')") > 0 && drag.indexOf("markSelected(target, 'drag')") < drag.indexOf('live.current.onSelect(target)'));
  const mark = source.slice(source.indexOf('const markSelected = '), source.indexOf('const pressIn = '));
  assert.match(mark, /Animated\.timing\(g\.on, \{ toValue: i === idx \? 1 : 0, duration: 0, useNativeDriver: true \}\)\.start\(\)/);
  assert.match(mark, /markSelected\(activeIndex, 'prop'\)/, 'свайп и ссылки не доводят значки');
  assert.match(mark, /не подтверждён экраном/, 'нет отката, если экран не принял выбор');
});

test('у вкладки два слоя значка, цвет не зависит от входного activeIndex', () => {
  assert.match(source, /<TabGlyph item=\{item\} on=\{false\} color=\{idleColor\} \/>/);
  assert.match(source, /<TabGlyph item=\{item\} on color=\{activeColor\} \/>/);
  assert.match(source, /opacity: glyphs\[i\]!\.off/);
  assert.match(source, /opacity: glyphs\[i\]!\.on/);
  assert.doesNotMatch(source, /const color = on \?/);
});

// зачем (владелец 11.11: «при переключении вкладок лёгкий фриз, но неприятный»): сдвиг страницы не ждёт перерисовки Главной и соседей —
// контекст вкладок приходит фоновым рендером. Заморозка уходящей вкладки обязана ждать того же фонового рендера, иначе вкладка уснёт,
// не узнав о потере владения, и её таймеры останутся крутиться.
test('контекст вкладок — фоновым рендером, заморозка ждёт его же', () => {
  const layout = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/_layout.tsx'), 'utf8');
  assert.match(layout, /const settledPhysicalPageIdx = useDeferredValue\(physicalPageIdx\);/);
  assert.match(layout, /const runtimeOwnerId = useDeferredValue\(physicalPageToRuntimeOwner\(renderPhysicalIdx, pageLayout\)\);/);
  assert.match(layout, /const settledActiveIdx = useDeferredValue\(activeIdx\);/);
  assert.match(layout, /<TabProvider\s+activeIdx=\{settledActiveIdx\}\s+runtimeOwnerId=\{runtimeOwnerId\}/);
  assert.match(layout, /const freezeWanted = \(logicalIdx: number\) => farFrom\(logicalIdx, physicalPageIdx\) && farFrom\(logicalIdx, settledPhysicalPageIdx\);/);
  // страница, панель и доступность — по живому индексу, без отставания
  assert.match(layout, /physicalPageIdx=\{renderPhysicalIdx\}/);
  assert.match(layout, /visualIdx=\{visualIdx\}/);
});

test('плотность заливки не зависит от платформы и задаётся только константами', () => {
  const start = source.indexOf('const glassFill = useMemo(');
  const end = source.indexOf('const count = items.length');
  assert.ok(start > 0 && end > start, 'блок glassFill не найден');
  const block = source.slice(start, end);
  assert.doesNotMatch(block, /Platform\.OS/);
  const alphas = [...block.matchAll(/alphaHex\([^,]+,\s*([^)]+)\)/g)].map((m) => m[1].trim());
  assert.deepEqual(alphas, ['TAB_GLASS_ALPHA_TOP', 'TAB_GLASS_ALPHA_BOTTOM']);
});
