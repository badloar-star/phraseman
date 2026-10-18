// зачем ([BACK-BTN] 18.10, координатор; Сверка today_back_x4: decision 0–2 мс, «прибыли» через 318–372 мс): шаги возврата пишутся только пока есть тап «назад» и не больше 12 на тап;
// шаги стоят на размонтировании «Сегодня», рендере и конце эффектов Главной; бельё Главной измеряется по вложенным детям.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');

const lines = [];
let timersScheduled = 0;
let framesRequested = 0;
function load({ dev = true, store = false, clock = null, frames = null } = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync('app/back_tap_probe.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
  const scheduled = [];
  vm.runInNewContext(js, {
    module, exports: module.exports,
    require: (id) => {
      if (id === 'react-native') return { InteractionManager: { runAfterInteractions: () => { framesRequested += 1; } } };
      if (id === './dev_diag_gate') return { DIAG_ENABLED: dev && !store };
      throw Error(`Unmocked ${id}`);
    },
    __DEV__: dev,
    console: { log: (...a) => lines.push(a.join(' ')), warn: (...a) => lines.push(`WARN ${a.join(' ')}`) },
    requestAnimationFrame: (cb) => { framesRequested += 1; if (frames) frames.push(cb); return 0; }, setTimeout: (fn) => { timersScheduled += 1; scheduled.push(fn); return scheduled.length; }, clearTimeout: () => {}, Date: clock ? { now: () => clock.t } : Date, JSON,
  });
  return module.exports;
}
const probe = load();
beforeEach(() => { lines.length = 0; timersScheduled = 0; framesRequested = 0; probe.resetBackTapProbeForTests(); });

test('шаг без тапа не пишется', () => {
  probe.noteBackStep('home_render', { n: 1 });
  assert.equal(lines.length, 0);
});

test('шаг после тапа пишется с seq и миллисекундами; шаги ≤ 12 на тап; новый тап обнуляет счёт', () => {
  probe.noteBackTap('today_tasks', 'BackButton');
  lines.length = 0;
  for (let i = 0; i < 20; i += 1) probe.noteBackStep('home_render', { n: i });
  assert.equal(lines.length, probe.BACK_STEPS_PER_TAP);
  const first = lines[0];
  assert.ok(first.startsWith('[BACK-BTN] step '));
  const parsed = JSON.parse(first.slice('[BACK-BTN] step '.length));
  assert.deepEqual([parsed.seq, parsed.step, parsed.n], [1, 'home_render', 0]);
  assert.equal(typeof parsed.ms, 'number');
  probe.noteBackTap('today_tasks', 'BackButton');
  lines.length = 0;
  probe.noteBackStep('home_effects_done');
  assert.equal(lines.length, 1);
});

test('после «прибыли» шаги больше не пишутся', () => {
  probe.noteBackTap('today_tasks', 'BackButton');
  probe.noteBackArrived('home', 'focus_tick');
  lines.length = 0;
  probe.noteBackStep('home_render');
  assert.equal(lines.length, 0);
});

test('шаги стоят на «Сегодня» (размонтирование), на рендере и в конце эффектов Главной; вложенные дети под измерением', () => {
  const today = fs.readFileSync('app/today_tasks.tsx', 'utf8').replace(/\r\n/g, '\n');
  assert.ok(today.includes("useEffect(() => () => noteBackStep('today_unmount'), []);"));
  const cost = fs.readFileSync('app/home_focus_cost_probe.ts', 'utf8').replace(/\r\n/g, '\n');
  assert.ok(cost.includes("noteBackStep('home_render', { n: state.current.renders });"));
  assert.ok(cost.includes("noteBackStep('home_effects_done', { n: s.renders });"));
  const home = fs.readFileSync('app/(tabs)/home.tsx', 'utf8').replace(/\r\n/g, '\n');
  assert.ok(home.includes("const StoryAvatarSlot = withHomeChildCost('avatar_slot', StoryAvatarSlotBase);"));
  assert.ok(home.includes("const NotificationCenterButton = withHomeChildCost('bell', NotificationCenterButtonBase);"));
  const rail = fs.readFileSync('components/home/v2/HomeV2VideoRail.tsx', 'utf8').replace(/\r\n/g, '\n');
  assert.ok(rail.includes("const VideoThumb = withHomeChildCost('video_thumb', VideoThumbBase);"));
});

// зачем (Ревизор 3.44, cf8144a87; координатор 18.10, важно для стора): в сторовой сборке проба «назад» — no-op: ни таймеров, ни журнала, ни warn «no-arrival».
for (const [name, mode] of [['сторовая сборка (IS_STORE_RELEASE)', { dev: true, store: true }], ['не dev (__DEV__ = false)', { dev: false, store: false }]]) {
  test(`${name}: проба «назад» ничего не делает`, () => {
    const off = load(mode);
    off.resetBackTapProbeForTests();
    lines.length = 0; timersScheduled = 0; framesRequested = 0;
    off.noteBackTap('today_tasks', 'BackButton');
    off.noteBackDecision('today_tasks → home');
    off.noteBackStep('home_render', { n: 1 });
    off.noteBackArrived('home', 'focus_tick');
    assert.deepEqual(lines, [], 'нет ни одной строки журнала, в том числе warn');
    assert.equal(timersScheduled, 0, 'нет таймеров (тик 8 с)');
    assert.equal(framesRequested, 0, 'нет проб кадра и InteractionManager');
  });
}

test('в исходнике проба закрыта за __DEV__ && !IS_STORE_RELEASE и каждая функция начинается с проверки', () => {
  const src = fs.readFileSync('app/back_tap_probe.ts', 'utf8').replace(/\r\n/g, '\n');
  assert.ok(src.includes('const ENABLED = DIAG_ENABLED;'));
  assert.ok(src.includes("import { DIAG_ENABLED } from './dev_diag_gate';"));
  for (const fn of ['noteBackTap', 'noteBackDecision', 'noteBackArrived']) {
    const at = src.indexOf(`export function ${fn}(`);
    assert.ok(at > 0 && src.slice(at, at + 240).includes('if (!ENABLED) return;'), fn);
  }
  assert.ok(src.includes('if (!ENABLED || !pending) return;'), 'noteBackStep');
});

// зачем (координатор 18.10 03:00): после тапа 400 мс считаем кадры; кадр длиннее 32 мс — строка long-frame {ms, atMs}, в конце один итог frames {frames, long, maxMs}.
function runFrames(steps) {
  const clock = { t: 1000 };
  const frames = [];
  const p = load({ clock, frames });
  p.resetBackTapProbeForTests();
  lines.length = 0;
  p.noteBackTap('today_tasks', 'BackButton');
  frames.shift(); // первый кадр в очереди — прежняя проба «frame», цепочка long-frame идёт следом
  for (const dt of steps) {
    const cb = frames.shift();
    if (!cb) break;
    clock.t += dt;
    cb();
  }
  return { lines: lines.filter((l) => /long-frame|\] frames/.test(l)), pendingFrames: frames.length };
}

test('long-frame: кадры ≤ 32 мс молчат, длинный пишется с ms и atMs, итог один', () => {
  const r = runFrames([16, 16, 90, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16]);
  const long = r.lines.filter((l) => l.includes('long-frame'));
  assert.equal(long.length, 1);
  const parsed = JSON.parse(long[0].slice(long[0].indexOf('{')));
  assert.deepEqual([parsed.seq, parsed.ms, parsed.atMs], [1, 90, 122]);
  const sum = r.lines.filter((l) => l.includes('] frames '));
  assert.equal(sum.length, 1);
  const total = JSON.parse(sum[0].slice(sum[0].indexOf('{')));
  assert.equal(total.long, 1);
  assert.equal(total.maxMs, 90);
  assert.ok(total.windowMs >= 400);
  assert.equal(r.pendingFrames, 0, 'после итога кадры не запрашиваются');
});

test('long-frame: ровно 32 мс — не длинный (порог строго больше)', () => {
  const r = runFrames(new Array(30).fill(32));
  assert.equal(r.lines.filter((l) => l.includes('long-frame')).length, 0);
  assert.equal(JSON.parse(r.lines.find((l) => l.includes('] frames ')).replace(/^[^{]*/, '')).long, 0);
});

test('long-frame: новый тап заменяет цепочку — прежняя пишет frames-cancelled и не продолжается', () => {
  const clock = { t: 1000 };
  const frames = [];
  const p = load({ clock, frames });
  p.resetBackTapProbeForTests();
  lines.length = 0;
  p.noteBackTap('today_tasks', 'BackButton');
  const first = frames[1]; // [проба frame, цепочка long-frame]
  p.noteBackTap('today_tasks', 'BackButton');
  clock.t += 16;
  first();
  assert.ok(lines.some((l) => l.includes('frames-cancelled')));
});

test('long-frame: синхронный requestAnimationFrame при замороженных часах не уходит в бесконечную рекурсию (потолок кадров)', () => {
  const clock = { t: 1000 };
  const mod = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync('app/back_tap_probe.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
  vm.runInNewContext(js, {
    module: mod, exports: mod.exports,
    require: (id) => (id === 'react-native' ? { InteractionManager: { runAfterInteractions: () => {} } } : { DIAG_ENABLED: true }),
    __DEV__: true, console: { log: (...a) => lines.push(a.join(' ')), warn: () => {} },
    requestAnimationFrame: (cb) => { cb(); return 0; }, setTimeout: () => 1, clearTimeout: () => {}, Date: { now: () => clock.t }, JSON,
  });
  lines.length = 0;
  mod.exports.noteBackTap('today_tasks', 'BackButton');
  const sum = lines.filter((l) => l.includes('] frames '));
  assert.equal(sum.length, 1);
  assert.equal(JSON.parse(sum[0].slice(sum[0].indexOf('{'))).frames, 120);
});

test('в исходнике порог и окно — именованные константы, цепочка кадров стоит внутри noteBackTap', () => {
  const src = fs.readFileSync('app/back_tap_probe.ts', 'utf8').replace(/\r\n/g, '\n');
  assert.ok(src.includes('const FRAME_WINDOW_MS = 400;'));
  assert.ok(src.includes('const LONG_FRAME_MS = 32;'));
  const at = src.indexOf('export function noteBackTap(');
  assert.ok(src.slice(at, at + 1400).includes('watchFrames(p.seq, p.at);'));
});
