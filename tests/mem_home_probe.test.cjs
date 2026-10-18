// зачем ([MEM-HOME] 18.10, координатор, R129): реестр живых картинок/экранов Главной и «Обучения» считает «живо/всего», печатает сводку на смене корневых экземпляров и молчит в сторе.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');

const lines = [];
const memLogs = [];
function load({ dev = true, store = false } = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync('app/mem_home_probe.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
  vm.runInNewContext(js, {
    module, exports: module.exports,
    require: (id) => {
      if (id === 'react') return { useEffect: (fn) => { fn(); } };
      if (id === 'react-native') return { Image: { resolveAssetSource: (n) => ({ width: n, height: n }) } };
      if (id === './dev_diag_gate') return { DIAG_ENABLED: dev && !store };
      if (id === './mem_probe') return { logMemory: (tag) => memLogs.push(tag) };
      throw Error(`Unmocked ${id}`);
    },
    console: { log: (...a) => lines.push(a.join(' ')), warn: (...a) => lines.push(`WARN ${a.join(' ')}`) }, JSON, Math,
  });
  return module.exports;
}
const probe = load();
beforeEach(() => { lines.length = 0; memLogs.length = 0; probe.resetMemHomeProbeForTests(); });

test('счёт живых и всего; оценка декода = ширина × высота × 4', () => {
  const off1 = probe.memHomeRegister('themed_art', probe.estimateDecodedBytes(256));
  probe.memHomeRegister('themed_art', probe.estimateDecodedBytes(256));
  off1();
  probe.memHomeSummary('t');
  const row = JSON.parse(lines[lines.length - 1].replace('[MEM-HOME] t ', ''));
  assert.equal(row.kinds.themed_art.startsWith('1/2 ~0.3MB'), true, row.kinds.themed_art);
  assert.equal(row.liveDecodedMb, 0.3);
  assert.deepEqual(memLogs, ['mem_home:t'], 'рядом печатается JS-куча');
});

test('смена числа корневых экземпляров (*_instance) печатает сводку сама: два Главных подряд без размонтирования видны', () => {
  probe.memHomeRegister('home_instance');
  const second = probe.memHomeRegister('home_instance');
  const mountLines = lines.filter((l) => l.includes('home_instance:mount'));
  assert.equal(mountLines.length, 2);
  assert.ok(mountLines[1].includes('"home_instance":"2/2"'), 'живых 2 — утечка дерева');
  second();
  assert.ok(lines.some((l) => l.includes('home_instance:unmount') && l.includes('"home_instance":"1/2"')));
});

test('обычные картинки сводку не печатают (только корни)', () => {
  probe.memHomeRegister('video_thumb');
  assert.equal(lines.length, 0);
});

test('сторовая сборка и не-dev: реестр — no-op (ни строк, ни JS-кучи)', () => {
  for (const mode of [{ dev: true, store: true }, { dev: false, store: false }]) {
    const off = load(mode);
    lines.length = 0; memLogs.length = 0;
    const unregister = off.memHomeRegister('home_instance', 1000);
    off.memHomeSummary('t');
    unregister();
    assert.deepEqual(lines, []);
    assert.deepEqual(memLogs, []);
  }
});

test('подключено: корень Главной, «Обучение», превью видео и слои арта; сводка на фокусе Главной', () => {
  const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  assert.ok(read('app/(tabs)/home.tsx').includes("useMemHomeRegisterSources('home_instance');"));
  assert.ok(read('app/(tabs)/home.tsx').includes("memHomeSummary('home_focus', { focusTick });"));
  assert.ok(read('app/(tabs)/lessons.tsx').includes("useMemHomeRegisterSources('lessons_instance');"));
  assert.ok(read('app/flashcards/VideoThumb.tsx').includes("useMemHomeRegisterSources('video_thumb');"));
  assert.ok(read('components/theme/ThemedArtLayers.tsx').includes("useMemHomeRegisterSources('themed_art', source, accent);"));
});
