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

test('плотность заливки не зависит от платформы и задаётся только константами', () => {
  const start = source.indexOf('const glassFill = useMemo(');
  const end = source.indexOf('const count = items.length');
  assert.ok(start > 0 && end > start, 'блок glassFill не найден');
  const block = source.slice(start, end);
  assert.doesNotMatch(block, /Platform\.OS/);
  const alphas = [...block.matchAll(/alphaHex\([^,]+,\s*([^)]+)\)/g)].map((m) => m[1].trim());
  assert.deepEqual(alphas, ['TAB_GLASS_ALPHA_TOP', 'TAB_GLASS_ALPHA_BOTTOM']);
});
