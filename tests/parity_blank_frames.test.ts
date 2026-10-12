// зачем (координатор 12.10, разбор Макетов b94db931f): робот не должен принимать пустой (светлый/чёрный) кадр за доказательство. Проверяем на подставных
// PNG: пустой → повтор до непустого с ms_to_nonblank; вечно пустой / пустой дольше порога → blank_too_long, файл только в _runs, старый <id>.png цел;
// --burst-ms снимает без повторов.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'parity_batch_shoot.mjs');
const BLANK_MODULE = path.join(ROOT, 'scripts', 'parity_blank.mjs').replace(/\\/g, '/');
const PNGJS = path.join(ROOT, 'node_modules', 'pngjs').replace(/\\/g, '/');

const FAKE_ADB = `
const fs = require('node:fs');
const { PNG } = require(${JSON.stringify(PNGJS)});
const args = process.argv.slice(2).slice(2);
function frame(blank) {
  const png = new PNG({ width: 120, height: 240 });
  for (let y = 0; y < 240; y += 1) for (let x = 0; x < 120; x += 1) {
    const i = (y * 120 + x) * 4;
    if (blank) { png.data[i] = 255; png.data[i + 1] = 255; png.data[i + 2] = 255; }
    else { png.data[i] = (x * 2) % 256; png.data[i + 1] = (y * 1) % 256; png.data[i + 2] = ((x + y) * 3) % 256; }
    png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}
if (args[0] === 'get-state') process.stdout.write('device\\n');
else if (args[0] === 'logcat' && args[1] === '-d') process.stdout.write('I ReactNativeJS: [DEV-STATE] route: replace вызван → /x\\n');
else if (args[0] === 'exec-out' && args[1] === 'screencap') {
  const counter = process.env.FAKE_COUNTER;
  const n = fs.existsSync(counter) ? Number(fs.readFileSync(counter, 'utf8')) : 0;
  fs.writeFileSync(counter, String(n + 1));
  process.stdout.write(frame(n < Number(process.env.FAKE_BLANK_COUNT || '0')));
}
`;

function run(args: string[], env: Record<string, string>) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, PARITY_SHOT_SCRIPT: path.join(ROOT, 'tests', 'helpers', 'fake_parity_shot.cjs'), ...env }, timeout: 90_000 });
}

function evalBlank(code: string): unknown {
  const script = `import * as m from 'file:///${BLANK_MODULE}'; import { createRequire } from 'node:module'; const { PNG } = createRequire(import.meta.url)(${JSON.stringify(PNGJS)}); `
    + `const make = (fn) => { const png = new PNG({ width: 200, height: 300 }); for (let y = 0; y < 300; y += 1) for (let x = 0; x < 200; x += 1) { const i = (y * 200 + x) * 4; const [r, g, b] = fn(x, y); png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255; } return PNG.sync.write(png); }; `
    + `console.log(JSON.stringify((${code})));`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 30_000 });
  if (result.status !== 0) throw new Error(`eval failed: ${result.stderr}`);
  return JSON.parse(result.stdout.trim());
}

describe('parity_blank (analyzeFrame)', () => {
  it('white / black / 96% one colour / near-flat frames are blank; a real-looking frame is not', () => {
    const out = evalBlank(`({
      white: m.analyzeFrame(make(() => [255, 255, 255])).blank,
      black: m.analyzeFrame(make(() => [0, 0, 0])).blank,
      mostlyWhite: m.analyzeFrame(make((x, y) => (y < 10 ? [20, 90, 200] : [255, 255, 255]))).blank,
      busy: m.analyzeFrame(make((x, y) => [(x * 2) % 256, y % 256, ((x + y) * 3) % 256])).blank,
      halfAndHalf: m.analyzeFrame(make((x) => (x < 100 ? [255, 255, 255] : [10, 10, 10]))).blank,
      garbage: m.analyzeFrame(Buffer.from('not a png')),
    })`) as Record<string, unknown>;
    expect(out).toEqual({ white: true, black: true, mostlyWhite: true, busy: false, halfAndHalf: true, garbage: null });
  });
});

describe('parity_batch_shoot: blank frames', () => {
  let tmp = '';
  let fakeAdb = '';
  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'blank-shoot-'));
    fakeAdb = path.join(tmp, 'fake_adb.js');
    fs.writeFileSync(fakeAdb, FAKE_ADB);
  });
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const base = (out: string) => ['paywalls-011', '--guest', `--out=${out}`, '--settle-ms=0', '--poll-ms=100', '--timeout-ms=3000', '--blank-poll-ms=100'];
  const journalOf = (out: string) => {
    const runs = path.join(out, '_runs');
    const name = fs.readdirSync(runs).find((f) => f.endsWith('.tsv')) as string;
    return fs.readFileSync(path.join(runs, name), 'utf8');
  };

  it('blank twice, then a real frame: saved as <id>.png, ok, ms_to_nonblank > 0 in the journal', () => {
    const out = path.join(tmp, 'ok');
    const counter = path.join(tmp, 'c_ok');
    const result = run(base(out), { ADB_PATH: fakeAdb, FAKE_COUNTER: counter, FAKE_BLANK_COUNT: '2' });
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(out, 'paywalls-011.png'))).toBe(true);
    const line = journalOf(out).split('\n').find((l) => l.startsWith('paywalls-011')) as string;
    expect(line).toMatch(/\tok\t/);
    expect(line).toMatch(/пусто_\d+мс/);
    expect(Number(line.split('\t')[6])).toBeGreaterThan(0);
  });

  it('always blank: blank_too_long, exit 1, evidence only in _runs, the old <id>.png is untouched', () => {
    const out = path.join(tmp, 'never');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'paywalls-011.png'), 'GOOD-OLD-EVIDENCE');
    const result = run([...base(out), '--blank-retries=3'], { ADB_PATH: fakeAdb, FAKE_COUNTER: path.join(tmp, 'c_never'), FAKE_BLANK_COUNT: '99' });
    expect(result.status).toBe(1);
    expect(fs.readFileSync(path.join(out, 'paywalls-011.png'), 'utf8')).toBe('GOOD-OLD-EVIDENCE');
    expect(journalOf(out)).toMatch(/paywalls-011\t[^\t]+\tblank_too_long\t/);
    const stamp = fs.readdirSync(path.join(out, '_runs')).find((f) => !f.endsWith('.tsv')) as string;
    expect(fs.existsSync(path.join(out, '_runs', stamp, 'paywalls-011.blank_too_long.png'))).toBe(true);
  });

  it('blank longer than --blank-max-ms but then a real frame: still blank_too_long, both frames kept in _runs', () => {
    const out = path.join(tmp, 'late');
    const result = run([...base(out), '--blank-poll-ms=250', '--blank-max-ms=200'], { ADB_PATH: fakeAdb, FAKE_COUNTER: path.join(tmp, 'c_late'), FAKE_BLANK_COUNT: '2' });
    expect(result.status).toBe(1);
    expect(fs.existsSync(path.join(out, 'paywalls-011.png'))).toBe(false);
    const stamp = fs.readdirSync(path.join(out, '_runs')).find((f) => !f.endsWith('.tsv')) as string;
    expect(fs.existsSync(path.join(out, '_runs', stamp, 'paywalls-011.blank_too_long.png'))).toBe(true);
    expect(fs.existsSync(path.join(out, '_runs', stamp, 'paywalls-011.blank_too_long.late.png'))).toBe(true);
  });

  it('--burst-ms takes the first frame at once with no blank retries (even if it is blank)', () => {
    const out = path.join(tmp, 'burst');
    const counter = path.join(tmp, 'c_burst');
    const result = run([...base(out), '--burst-ms=100'], { ADB_PATH: fakeAdb, FAKE_COUNTER: counter, FAKE_BLANK_COUNT: '99' });
    expect(result.status).toBe(0);
    expect(fs.readFileSync(counter, 'utf8')).toBe('1'); // ровно один снимок
    expect(journalOf(out)).toMatch(/burst_100мс/);
  });

  it('--no-blank-check keeps the old single-shot behaviour', () => {
    const out = path.join(tmp, 'off');
    const counter = path.join(tmp, 'c_off');
    const result = run([...base(out), '--no-blank-check'], { ADB_PATH: fakeAdb, FAKE_COUNTER: counter, FAKE_BLANK_COUNT: '99' });
    expect(result.status).toBe(0);
    expect(fs.readFileSync(counter, 'utf8')).toBe('1');
  });
});
