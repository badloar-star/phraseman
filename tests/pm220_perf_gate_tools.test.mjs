// PM-220: инструмент регрессионных ворот производительности (scripts/pm220_perf_gates.mjs) и его бюджеты.
// зачем (владелец: «так чтобы все летало»): ворота должны не только существовать, но и РЕАЛЬНО падать на
// регрессии и на отсутствие данных. Здесь — синтетические логи/обмеры, сам инструмент и «точки измерения»
// в коде (чтобы метки [COLD-START-IO] и [HOME-PAINT] нельзя было убрать, не заметив).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  evaluateAmStartSeries,
  evaluateBundle,
  evaluateColdStartIo,
  evaluateFrames,
  evaluateHomePaint,
  loadBudgets,
  parseAmStartTotalMs,
  parseColdStartIo,
  parseGfxinfoFrames,
  parseHomePaintMs,
  percentile,
} from '../scripts/pm220_perf_gates.mjs';

const budgets = loadBudgets();
const read = (p) => fs.readFileSync(p, 'utf8');

const PATCHED = '{"asyncGetItem":true,"asyncSetItem":true,"asyncRemoveItem":true,"asyncMergeItem":true,"asyncMultiGet":true,"asyncMultiSet":true,"asyncMultiRemove":true,"asyncGetAllKeys":true,"secureGet":true,"secureSet":true,"secureDelete":true}';
const ioLine = (over = {}) => {
  const v = { windowMs: 15000, calls: 140, groups: 90, maxInflight: 20, patched: PATCHED, ...over };
  return `10-03 12:00:00.000 I ReactNativeJS: [COLD-START-IO] summary windowMs=${v.windowMs} startedEpochMs=1791057747441 calls=${v.calls} groups=${v.groups} maxInflight=${v.maxInflight} patched=${v.patched} top=["AS.get:x n=1 total=5ms max=5ms"]`;
};

const logcat = (procTs, paintTs, markers = 1) => [
  `${procTs.toFixed(3)} I/ActivityManager(  500): Start proc 1234:app.phraseman/u0a77 for activity {app.phraseman/.MainActivity}`,
  `${(procTs + 0.5).toFixed(3)} I/other: noise`,
  ...Array.from({ length: markers }, () => `${paintTs.toFixed(3)} W/ReactNativeJS( 1234): [HOME-PAINT] first_frame epochMs=1`),
].join('\n');

test('budgets: каждый максимум не ниже измеренного и ссылается на реальные платформы', () => {
  for (const [platform, b] of Object.entries(budgets.bundle.platforms)) {
    assert.ok(b.maxBundleBytes >= b.measuredBundleBytes, `${platform}: бюджет JS ниже измеренного`);
    assert.ok(b.maxBundleGzipBytes >= b.measuredBundleGzipBytes, `${platform}: бюджет gzip ниже измеренного`);
    assert.ok(b.maxAssetCount >= b.measuredAssetCount && b.maxAssetBytes >= b.measuredAssetBytes, `${platform}: бюджет ассетов`);
    assert.ok(b.maxBundleBytes <= b.measuredBundleBytes * 1.05, `${platform}: запас по JS больше 5% — ворота ничего не ловят`);
  }
  assert.deepEqual(Object.keys(budgets.bundle.platforms).sort(), ['android', 'ios']);
  assert.ok(budgets.homePaint.maxMedianMs >= budgets.homePaint.baseline.medianMs);
  assert.ok(budgets.homePaint.maxP90Ms >= budgets.homePaint.baseline.p90Ms);
  assert.ok(String(budgets.provenance).includes('Q111'), 'бюджеты обязаны объяснять происхождение (Q111)');
});

test('bundle: в бюджете — ок; превышение JS и нехватка платформы — нарушение', () => {
  const ok = { bundleBytes: 36_000_000, bundleGzipBytes: 13_000_000, assetCount: 97, assetBytes: 1_900_000, assetsMissing: 0 };
  assert.equal(evaluateBundle({ android: ok, ios: ok }, budgets.bundle).ok, true);
  const bloated = { ...ok, bundleBytes: budgets.bundle.platforms.android.maxBundleBytes + 1 };
  const r = evaluateBundle({ android: bloated, ios: ok }, budgets.bundle);
  assert.equal(r.ok, false);
  assert.match(r.problems.join('\n'), /android\.bundleBytes/);
  const missing = evaluateBundle({ android: ok }, budgets.bundle);
  assert.equal(missing.ok, false);
  assert.match(missing.problems.join('\n'), /ios: нет в обмере/);
  const lost = evaluateBundle({ android: { ...ok, assetsMissing: 2 }, ios: ok }, budgets.bundle);
  assert.match(lost.problems.join('\n'), /не найдено ассетов 2/);
});

test('homepaint: разбор Start proc → метка, мс считаются от процесса', () => {
  const parsed = parseHomePaintMs(logcat(1000.0, 1001.8), 'app.phraseman');
  assert.equal(parsed.ms, 1800);
  assert.equal(parsed.markers, 1);
  assert.equal(parseHomePaintMs('ничего полезного', 'app.phraseman').ms, null);
  assert.equal(parseHomePaintMs(logcat(5, 7, 2), 'app.phraseman').markers, 2);
});

test('homepaint: медиана/p90 в бюджете проходят, регрессия и «мало запусков»/«две метки» — нарушение', () => {
  const runs = (ms, markers = 1) => ms.map((v) => ({ ms: v, markers }));
  const good = evaluateHomePaint(runs([1400, 1500, 1700, 1800, 2000, 2100]), budgets.homePaint);
  assert.equal(good.ok, true);
  const slow = evaluateHomePaint(runs([3000, 3100, 3200, 3300, 3400, 3500]), budgets.homePaint);
  assert.equal(slow.ok, false);
  assert.match(slow.problems.join('\n'), /медиана/);
  assert.match(slow.problems.join('\n'), /p90/);
  assert.equal(evaluateHomePaint(runs([1500, 1600]), budgets.homePaint).ok, false);
  const doubled = evaluateHomePaint(runs([1500, 1600, 1700, 1800, 1900], 2), budgets.homePaint);
  assert.equal(doubled.ok, false);
  assert.match(doubled.problems.join('\n'), /ожидалась 1/);
  const missing = evaluateHomePaint([...runs([1500, 1600, 1700, 1800, 1900]), { ms: null, markers: 0 }], budgets.homePaint);
  assert.equal(missing.ok, false);
  assert.match(missing.problems.join('\n'), /нет Start proc/);
  assert.equal(percentile([], 0.5), null);
});

test('coldio: разбор реальной строки, потолок, неполная трассировка и отсутствие строки', () => {
  const parsed = parseColdStartIo(`${ioLine()}\n`);
  assert.equal(parsed.calls, 140);
  assert.equal(parsed.maxInflight, 20);
  assert.equal(parsed.patched.secureGet, true);
  assert.equal(evaluateColdStartIo(parsed, budgets.coldStartIo).ok, true);

  const over = evaluateColdStartIo(parseColdStartIo(ioLine({ calls: 900, maxInflight: 60 })), budgets.coldStartIo);
  assert.equal(over.ok, false);
  assert.match(over.problems.join('\n'), /calls 900/);
  assert.match(over.problems.join('\n'), /maxInflight 60/);

  const halfPatched = ioLine({ patched: PATCHED.replace('"secureGet":true', '"secureGet":false') });
  assert.match(evaluateColdStartIo(parseColdStartIo(halfPatched), budgets.coldStartIo).problems.join('\n'), /secureGet/);

  assert.match(evaluateColdStartIo(parseColdStartIo(ioLine({ windowMs: 5000 })), budgets.coldStartIo).problems.join('\n'), /несопоставимы/);
  const none = evaluateColdStartIo(parseColdStartIo('пусто'), budgets.coldStartIo);
  assert.equal(none.ok, false);
  assert.match(none.problems.join('\n'), /нет строки/);
  // несколько запусков в одном логе — берётся последняя строка
  assert.equal(parseColdStartIo(`${ioLine({ calls: 1 })}\n${ioLine({ calls: 2 })}`).calls, 2);
});

test('точки измерения на месте: метки пишутся через console.warn и подключены к запуску', () => {
  const trace = read('app/cold_start_io_trace.ts');
  assert.match(trace, /console\.warn\(`\[COLD-START-IO\] summary windowMs=/);
  assert.match(trace, /calls=\$\{calls\} groups=\$\{groups\.size\} maxInflight=\$\{maxInflight\}/);
  const paint = read('app/home_paint_marker.ts');
  assert.match(paint, /console\.warn\(`\[HOME-PAINT\] first_frame epochMs=/);
  // release вырезает console.log/info/debug — метки обязаны идти через warn, а warn обязан остаться
  assert.match(read('babel.config.js'), /transform-remove-console', \{ exclude: \['warn', 'error'\] \}/);
  assert.match(read('app/_layout.tsx'), /^installColdStartIoTrace\(\);/m);
  assert.match(read('app/(tabs)/home.tsx'), /useEffect\(\(\) => \{ markHomeFirstPaint\(\); \}, \[\]\)/);
});

// PM-220 A2 (04.10): бюджеты холодного/тёплого старта, повторного входа и плавности кадров — из замера слабого профиля (INBOX §141).
const amLog = (values) => values.map((v) => `Status: ok\nTotalTime: ${v}\nWaitTime: ${v + 2}\nComplete`).join('\n');

test('amstart: базовые замеры проходят, регрессия и нехватка запусков ловятся', () => {
  for (const key of ['coldStartAmW', 'warmStart', 'reenter']) {
    const base = budgets[key].baseline;
    const ok = evaluateAmStartSeries(parseAmStartTotalMs(amLog(base.values)), budgets[key]);
    assert.equal(ok.ok, true, `${key}: базовая линия обязана проходить свой бюджет: ${ok.problems.join('; ')}`);
    assert.ok(budgets[key].maxMedianMs > base.medianMs, `${key}: потолок медианы ниже базовой линии`);
  }
  const slow = evaluateAmStartSeries([4000, 4100, 3900, 4200, 4050], budgets.coldStartAmW);
  assert.equal(slow.ok, false);
  assert.match(slow.problems.join('\n'), /медиана/);
  const few = evaluateAmStartSeries([900, 950], budgets.coldStartAmW);
  assert.equal(few.ok, false);
  assert.match(few.problems.join('\n'), /мало для вывода/);
  assert.deepEqual(parseAmStartTotalMs('нет данных'), []);
});

const gfx = (over = {}) => {
  const v = { frames: 266, janky: 16, pct: '6.02', p50: 17, p90: 24, p95: 28, p99: 32, ...over };
  return [
    `Total frames rendered: ${v.frames}`,
    `Janky frames: ${v.janky} (${v.pct}%)`,
    `50th percentile: ${v.p50}ms`,
    `90th percentile: ${v.p90}ms`,
    `95th percentile: ${v.p95}ms`,
    `99th percentile: ${v.p99}ms`,
  ].join('\n');
};

test('frames: базовая плавность проходит, медленные кадры, мало кадров и пустой вывод — нет', () => {
  const parsed = parseGfxinfoFrames(gfx());
  assert.deepEqual(parsed, { frames: 266, jankyPct: 6.02, p50: 17, p90: 24, p95: 28, p99: 32 });
  assert.equal(evaluateFrames(parsed, budgets.frames).ok, true);
  const slow = evaluateFrames(parseGfxinfoFrames(gfx({ p95: 80, p99: 120, pct: '40.0' })), budgets.frames);
  assert.equal(slow.ok, false);
  assert.match(slow.problems.join('\n'), /p95 кадра 80/);
  assert.match(slow.problems.join('\n'), /janky 40/);
  assert.equal(evaluateFrames(parseGfxinfoFrames(gfx({ frames: 20 })), budgets.frames).ok, false);
  assert.equal(evaluateFrames(parseGfxinfoFrames('пусто'), budgets.frames).ok, false);
});

test('coldio: потолок обращений согласован с замером после снимка хранилища', () => {
  const worstBaseline = Math.max(...budgets.coldStartIo.baseline.runs.map((r) => r.calls));
  assert.ok(budgets.coldStartIo.ceiling.calls >= worstBaseline, 'потолок ниже худшего замера');
  assert.ok(budgets.coldStartIo.ceiling.calls <= worstBaseline * 1.6, 'потолок слишком свободный — ворота не поймают возврат к старым цифрам');
  assert.equal(evaluateColdStartIo(parseColdStartIo(ioLine({ calls: 409 })), budgets.coldStartIo).ok, false, 'старые 409 обращений обязаны ловиться');
});
