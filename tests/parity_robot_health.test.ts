// зачем (координатор 12.10): робот не принимает за кадр красные экраны и не снимает при выключенном Metro; --stitch-only склеивает уже лежащие голые кадры без эмулятора.
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { AddressInfo } from 'node:net';

jest.setTimeout(90_000); // каждый тест запускает робот дважды (попытка + повтор в конце) с ожиданиями

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'parity_batch_shoot.mjs');
const STUB = path.join(ROOT, 'tests', 'helpers', 'fake_parity_shot.cjs');
const PNGJS = path.join(ROOT, 'node_modules', 'pngjs');

const FAKE_ADB = `
const fs = require('node:fs');
const args = process.argv.slice(2).slice(2);
if (process.env.FAKE_LOG) fs.appendFileSync(process.env.FAKE_LOG, args.join(' ') + '\\n');
if (args[0] === 'get-state') process.stdout.write('device\\n');
else if (args[0] === 'logcat' && args[1] === '-d') { if (process.env.FAKE_MARKER === '1') process.stdout.write('I ReactNativeJS: [DEV-STATE] route: replace вызван → /x\\n'); }
else if (args[0] === 'exec-out' && args[1] === 'cat') process.stdout.write(process.env.FAKE_XML ? fs.readFileSync(process.env.FAKE_XML, 'utf8') : '<hierarchy/>');
else if (args[0] === 'exec-out') process.stdout.write(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(6000, 7)]));
`;

const xmlWith = (text: string) => `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?><hierarchy rotation="0"><node index="0" text="" resource-id="" content-desc="" bounds="[0,0][1080,2400]"><node index="1" text="${text}" resource-id="" content-desc="" bounds="[10,10][500,200]"/></node></hierarchy>`;

function runAsync(args: string[], env: Record<string, string>): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], { env: { ...process.env, PARITY_SHOT_SCRIPT: STUB, ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

describe('parity robot: Metro и красные экраны', () => {
  let tmp = '';
  let fakeAdb = '';
  let server: http.Server;
  let metroUrl = '';
  beforeAll(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'health-shoot-'));
    fakeAdb = path.join(tmp, 'fake_adb.js');
    fs.writeFileSync(fakeAdb, FAKE_ADB);
    server = http.createServer((_req, res) => { res.end('packager-status:running'); });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    metroUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/status`;
  });
  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const base = (out: string) => ['paywalls-011', '--guest', `--out=${out}`, '--settle-ms=0', '--poll-ms=100', '--timeout-ms=1500', '--no-blank-check', '--no-stitch', `--metro-url=${metroUrl}`];
  const journalOf = (out: string) => {
    const runs = path.join(out, '_runs');
    return fs.readFileSync(path.join(runs, fs.readdirSync(runs).find((f) => f.endsWith('.tsv')) as string), 'utf8');
  };
  const runDirOf = (out: string) => {
    const runs = path.join(out, '_runs');
    return path.join(runs, fs.readdirSync(runs).find((f) => !f.endsWith('.tsv')) as string);
  };

  it('Metro running and a normal screen: ok', async () => {
    const out = path.join(tmp, 'ok');
    const result = await runAsync(base(out), { ADB_PATH: fakeAdb, FAKE_MARKER: '1' });
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(out, 'paywalls-011.png'))).toBe(true);
  });

  it('Metro down for the whole wait: metro_down, no frame, retried once at the end, exit 1', async () => {
    const out = path.join(tmp, 'down');
    const log = path.join(tmp, 'down.log');
    const result = await runAsync([...base(out).filter((a) => !a.startsWith('--metro-url')), '--metro-url=http://127.0.0.1:1/status', '--metro-wait-ms=600'], { ADB_PATH: fakeAdb, FAKE_MARKER: '1', FAKE_LOG: log });
    expect(result.status).toBe(1);
    expect(fs.existsSync(path.join(out, 'paywalls-011.png'))).toBe(false);
    const journal = journalOf(out);
    expect(journal.match(/paywalls-011\t[^\t]+\tmetro_down\t/g)?.length).toBe(2); // первая попытка + повтор в конце
    expect(journal).toContain('+повтор');
    expect(result.stdout).toContain('повтор в конце прогона: paywalls-011');
    expect(result.stderr).toContain('после повтора всё ещё нет кадра');
    expect(fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '').not.toContain('am start'); // приложение не запускалось при мёртвом Metro
  });

  it.each([
    ['Unable to load script. Make sure you\'re running Metro or that your bundle index.android.bundle is packaged correctly', 'metro_down'],
    ['Render Error', 'redbox'],
  ])('red screen "%s" → %s: frame only in _runs, no evidence, repeated once at the end', async (text, status) => {
    const out = path.join(tmp, `red_${status}`);
    const xml = path.join(tmp, `red_${status}.xml`);
    fs.writeFileSync(xml, xmlWith(text));
    const log = path.join(tmp, `red_${status}.log`);
    const result = await runAsync(base(out), { ADB_PATH: fakeAdb, FAKE_MARKER: '1', FAKE_XML: xml, FAKE_LOG: log });
    expect(result.status).toBe(1);
    expect(fs.existsSync(path.join(out, 'paywalls-011.png'))).toBe(false);
    expect(fs.existsSync(path.join(runDirOf(out), `paywalls-011.${status}.png`))).toBe(true);
    expect(journalOf(out).match(new RegExp(`paywalls-011\\t[^\\t]+\\t${status}\\t`, 'g'))?.length).toBe(2);
    expect(fs.readFileSync(log, 'utf8').split('\n').filter((l) => l.includes('am start')).length).toBe(2);
  });

  it('DEV-STATE… still on screen and no marker → fixture_hang; with the marker it is only transient and not flagged', async () => {
    const out = path.join(tmp, 'hang');
    const xml = path.join(tmp, 'hang.xml');
    fs.writeFileSync(xml, xmlWith('DEV-STATE...'));
    const hang = await runAsync(base(out), { ADB_PATH: fakeAdb, FAKE_MARKER: '0', FAKE_XML: xml });
    expect(hang.status).toBe(1);
    expect(journalOf(out)).toMatch(/paywalls-011\t[^\t]+\tfixture_hang\t/);
    expect(fs.existsSync(path.join(runDirOf(out), 'paywalls-011.fixture_hang.png'))).toBe(true);
    const out2 = path.join(tmp, 'transient');
    const transient = await runAsync(base(out2), { ADB_PATH: fakeAdb, FAKE_MARKER: '1', FAKE_XML: xml });
    expect(transient.status).toBe(0);
    expect(fs.existsSync(path.join(out2, 'paywalls-011.png'))).toBe(true);
  });
});

describe('parity robot: --stitch-only', () => {
  let tmp = '';
  const { PNG } = require(PNGJS) as { PNG: new (o: { width: number; height: number }) => { data: Buffer }; };
  const makePng = (width: number, height: number) => {
    const png = new PNG({ width, height });
    for (let i = 0; i < png.data.length; i += 4) { png.data[i] = i % 251; png.data[i + 1] = (i >> 3) % 251; png.data[i + 2] = 90; png.data[i + 3] = 255; }
    return (require(PNGJS).PNG as { sync: { write: (p: unknown) => Buffer } }).sync.write(png);
  };
  beforeAll(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stitch-only-')); });
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it('bare frames become composites, the bare copy goes to _runs; composites, missing and non-PNG files are skipped', async () => {
    const out = path.join(tmp, 'a');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'cards-006.png'), makePng(1080, 2400));
    fs.writeFileSync(path.join(out, 'cards-007.png'), makePng(300, 200)); // уже склейка
    fs.writeFileSync(path.join(out, 'cards-008.png'), 'not a png');
    const result = await runAsync(['--stitch-only', 'cards-006', 'cards-007', 'cards-008', 'cards-009', `--out=${out}`], { STUB_STITCH_PNG: '1' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('склеено=1 пропущено=3 не_удалось=0');
    const runs = path.join(out, '_runs');
    const stamp = fs.readdirSync(runs).find((f) => !f.endsWith('.tsv')) as string;
    expect(fs.existsSync(path.join(runs, stamp, 'cards-006.bare.png'))).toBe(true);
    const composite = fs.readFileSync(path.join(out, 'cards-006.png'));
    expect(composite.readUInt32BE(16)).toBe(300);
    expect(composite.readUInt32BE(20)).toBe(200);
    const journal = fs.readFileSync(path.join(runs, fs.readdirSync(runs).find((f) => f.startsWith('stitch_')) as string), 'utf8');
    expect(journal).toMatch(/cards-007\t[^\t]+\tskipped\tуже_не_голый_300x200/);
    expect(journal).toMatch(/cards-008\t[^\t]+\tskipped\tне_PNG/);
    expect(journal).toMatch(/cards-009\t[^\t]+\tskipped\tнет_файла/);
  }, 60_000);

  it('stitch failure keeps the original bare frame in place and exits 1', async () => {
    const out = path.join(tmp, 'b');
    fs.mkdirSync(out, { recursive: true });
    const bare = makePng(1080, 2400);
    fs.writeFileSync(path.join(out, 'cards-010.png'), bare);
    const result = await runAsync(['--stitch-only', 'cards-010', `--out=${out}`], { STUB_STITCH_FAIL: '1' });
    expect(result.status).toBe(1);
    expect(fs.readFileSync(path.join(out, 'cards-010.png')).equals(bare)).toBe(true);
    expect(result.stdout).toContain('не_удалось=1');
  }, 60_000);

  it('--stitch-only-recent takes only fresh bare frames', async () => {
    const out = path.join(tmp, 'c');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'cards-011.png'), makePng(1080, 2400));
    fs.writeFileSync(path.join(out, 'cards-012.png'), makePng(1080, 2400));
    const old = new Date(Date.now() - 3 * 3600_000);
    fs.utimesSync(path.join(out, 'cards-012.png'), old, old);
    const result = await runAsync(['--stitch-only-recent=30', `--out=${out}`], { STUB_STITCH_PNG: '1' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('stitch-only cards-011: stitched');
    expect(result.stdout).not.toContain('cards-012');
  }, 60_000);
});
