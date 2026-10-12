// зачем (координатор 12.10, робот пакетной съёмки + поправка Сверки «ссылка общая с соседями»): сухой прогон печатает верные команды adb,
// робот берёт только строки «уникальна: да», шаги тапов (по testID/тексту через uiautomator) жмут в центр найденной рамки, таймаут не
// затирает хороший кадр, vip/plan дают второй запуск.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'parity_batch_shoot.mjs');
const STEPS_MODULE = path.join(ROOT, 'scripts', 'parity_steps.mjs').replace(/\\/g, '/');

const FAKE_ADB = `
const fs = require('node:fs');
const args = process.argv.slice(2).slice(2); // без «-s <устройство>»
const log = process.env.FAKE_LOG;
if (log) fs.appendFileSync(log, args.join(' ') + '\\n');
if (args[0] === 'get-state') { process.stdout.write('device\\n'); }
else if (args[0] === 'logcat' && args[1] === '-d') { if (process.env.FAKE_MARKER === '1') process.stdout.write('I ReactNativeJS: [DEV-STATE] route: replace вызван → /x\\n'); }
else if (args[0] === 'exec-out' && args[1] === 'cat') { process.stdout.write(process.env.FAKE_XML ? fs.readFileSync(process.env.FAKE_XML, 'utf8') : '<hierarchy/>'); }
else if (args[0] === 'exec-out') { process.stdout.write(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(6000, 7)])); }
`;

const FAKE_XML = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?><hierarchy rotation="0">
<node index="0" text="" resource-id="" content-desc="" bounds="[0,0][1080,2400]">
<node index="1" text="" resource-id="fc-saved-actions" content-desc="Меню" bounds="[900,100][1000,200]"/>
<node index="5" text="" resource-id="fc-menu-select" content-desc="" bounds="[100,900][500,1000]"/>
<node index="2" text="Отметить несколько" resource-id="" content-desc="" bounds="[100,1000][500,1100]"/>
<node index="3" text="" resource-id="fc-gallery-tile-a1" content-desc="" bounds="[20,400][520,600]"/>
<node index="4" text="" resource-id="fc-gallery-tile-b2" content-desc="" bounds="[560,400][1060,600]"/>
</node></hierarchy>`;

function run(args: string[], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args, '--no-' + 'metro-check'], { encoding: 'utf8', env: { ...process.env, PARITY_SHOT_SCRIPT: path.join(ROOT, 'tests', 'helpers', 'fake_parity_shot.cjs'), ...env }, timeout: 60_000 });
}

function evalModule(code: string): unknown {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `import * as m from 'file:///${STEPS_MODULE}'; const out = (${code}); console.log(JSON.stringify(out));`], { encoding: 'utf8', timeout: 30_000 });
  if (result.status !== 0) throw new Error(`eval failed: ${result.stderr}`);
  return JSON.parse(result.stdout.trim());
}

describe('parity_steps (grammar and node search)', () => {
  it('parses a step list and rejects malformed steps', () => {
    expect(evalModule(`m.parseSteps('tap:#fc-saved-actions; wait:300; type:zzzqq; back; scroll:down; see:#paywall-compare-toggle; settle:0')`)).toEqual([
      { op: 'tap', value: '#fc-saved-actions' }, { op: 'wait', value: '300' }, { op: 'type', value: 'zzzqq' }, { op: 'back', value: '' }, { op: 'scroll', value: 'down' }, { op: 'see', value: '#paywall-compare-toggle' }, { op: 'settle', value: '0' },
    ]);
    for (const bad of ['tap', 'wait:abc', 'type:привет', 'fly:#x', 'scroll:left', 'xy:10']) {
      expect(() => evalModule(`m.parseSteps(${JSON.stringify(bad)})`)).toThrow();
    }
    expect(evalModule(`m.parseSteps('')`)).toEqual([]);
  });

  it('finds nodes by testID, id prefix, nth match and text (exact before contains)', () => {
    const find = (selector: string) => evalModule(`(() => { const n = m.parseUiNodes(${JSON.stringify(FAKE_XML)}); const f = m.findNode(n, ${JSON.stringify(selector)}); return f && { id: f.id, text: f.text }; })()`);
    expect(find('#fc-saved-actions')).toEqual({ id: 'fc-saved-actions', text: '' });
    expect(find('#fc-gallery-tile-*')).toEqual({ id: 'fc-gallery-tile-a1', text: '' });
    expect(find('#fc-gallery-tile-*@2')).toEqual({ id: 'fc-gallery-tile-b2', text: '' });
    expect(find('#fc-gallery-tile-*@3')).toBeNull();
    expect(find('отметить несколько')).toEqual({ id: '', text: 'Отметить несколько' });
    expect(find('#no-such-id')).toBeNull();
  });
});

describe('parity_batch_shoot', () => {
  let tmp = '';
  let fakeAdb = '';
  let xmlFile = '';
  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'batch-shoot-'));
    fakeAdb = path.join(tmp, 'fake_adb.js');
    xmlFile = path.join(tmp, 'ui.xml');
    fs.writeFileSync(fakeAdb, FAKE_ADB);
    fs.writeFileSync(xmlFile, FAKE_XML);
  });
  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('--dry-run prints adb commands, skips non-unique rows / rows without a link, and never touches adb', () => {
    const result = run(['cards-005', 'cards-007', 'cards-042', 'cards-025', 'nope-001', '--guest', '--dry-run'], { ADB_PATH: path.join(tmp, 'no_such_adb.js') });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('режим=DRY-RUN');
    expect(result.stdout).toContain('adb -s emulator-5554 shell am force-stop app.phraseman');
    expect(result.stdout).toContain('adb -s emulator-5554 logcat -c');
    expect(result.stdout).toContain('am start -a android.intent.action.VIEW -d \'phraseman://dev_state?onboarding=done');
    expect(result.stdout).toContain('screencap -p > <out>/cards-005.png');
    expect(result.stdout).toContain('пропуск cards-042: не_уникальна');
    expect(result.stdout).toContain('пропуск cards-025: нет_готовой_ссылки');
    expect(result.stdout).toContain('пропуск nope-001: нет_в_DEV_LINKS_R1');
  });

  it('a unique row with steps prints its steps (cards-007: menu → select)', () => {
    const result = run(['cards-007', '--guest', '--dry-run']);
    expect(result.stdout).toContain('DRY cards-007');
    expect(result.stdout).toContain('tap #fc-saved-actions');
    expect(result.stdout).toContain('tap #fc-menu-select');
  });

  it('--include-nonunique takes the rows that share a link with neighbours', () => {
    const result = run(['cards-033', '--include-nonunique', '--guest', '--dry-run']);
    expect(result.stdout).toContain('DRY cards-033');
  });

  it('--all-pending picks only registry r1 pending rows that are unique and have a ready link', () => {
    const result = run(['--all-pending', '--guest', '--dry-run']);
    expect(result.status).toBe(0);
    const picked = Number((result.stdout.match(/к съёмке=(\d+)/) ?? [])[1]);
    expect(picked).toBeGreaterThan(10);
    expect(result.stdout).toContain('не_уникальна');
  });

  it('a dry run of a vip/plan link prints the second force-stop and launch', () => {
    const result = run(['paywalls-019', '--include-nonunique', '--dry-run']);
    expect(result.stdout.match(/force-stop app\.phraseman/g)?.length).toBe(2);
    expect(result.stdout).toContain('второй запуск');
  });

  it('on a fake adb: a ready marker saves <id>.png and writes an ok journal line', () => {
    const out = path.join(tmp, 'out_ok');
    const log = path.join(tmp, 'adb_ok.log');
    const result = run(['cards-014', '--guest', `--out=${out}`, '--settle-ms=0', '--poll-ms=100', '--timeout-ms=3000'], { ADB_PATH: fakeAdb, FAKE_MARKER: '1', FAKE_LOG: log });
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(out, 'cards-014.png'))).toBe(true);
    const journal = fs.readdirSync(path.join(out, '_runs')).find((f) => f.endsWith('.tsv')) as string;
    expect(fs.readFileSync(path.join(out, '_runs', journal), 'utf8')).toMatch(/cards-014\t[^\t]+\tok\t/);
    expect(fs.readFileSync(log, 'utf8')).toContain('am start -a android.intent.action.VIEW');
  });

  it('on a fake adb: steps tap the centre of the node found by testID and by text', () => {
    const out = path.join(tmp, 'out_steps');
    const log = path.join(tmp, 'adb_steps.log');
    const result = run(['cards-007', '--guest', `--out=${out}`, '--settle-ms=0', '--poll-ms=100', '--timeout-ms=3000'], { ADB_PATH: fakeAdb, FAKE_MARKER: '1', FAKE_LOG: log, FAKE_XML: xmlFile });
    expect(result.stderr).not.toContain('шаг не выполнен');
    expect(fs.existsSync(path.join(out, 'cards-007.png'))).toBe(true);
    const adbLog = fs.readFileSync(log, 'utf8');
    // #fc-saved-actions = [900,100][1000,200] → центр 950,150
    expect(adbLog).toContain('shell input tap 950 150');
    expect(adbLog).toContain('shell input tap 300 950'); // #fc-menu-select = [100,900][500,1000]
    expect(adbLog).toContain('uiautomator dump');
  });

  it('on a fake adb: a missing step target is an error, saved aside, and the real <id>.png is untouched', () => {
    const out = path.join(tmp, 'out_missing');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'cards-007.png'), 'GOOD-OLD-EVIDENCE');
    const emptyXml = path.join(tmp, 'empty.xml');
    fs.writeFileSync(emptyXml, '<hierarchy/>');
    const result = run(['cards-007', '--guest', `--out=${out}`, '--settle-ms=0', '--poll-ms=100', '--timeout-ms=3000'], { ADB_PATH: fakeAdb, FAKE_MARKER: '1', FAKE_XML: emptyXml });
    expect(result.status).toBe(1);
    expect(fs.readFileSync(path.join(out, 'cards-007.png'), 'utf8')).toBe('GOOD-OLD-EVIDENCE');
    const runsDir = path.join(out, '_runs');
    const stampDir = fs.readdirSync(runsDir).find((f) => !f.endsWith('.tsv')) as string;
    expect(fs.existsSync(path.join(runsDir, stampDir, 'cards-007.error.png'))).toBe(true);
    const journal = fs.readdirSync(runsDir).find((f) => f.endsWith('.tsv')) as string;
    expect(fs.readFileSync(path.join(runsDir, journal), 'utf8')).toMatch(/cards-007\t[^\t]+\terror\t\d+\t[^\t]*step_target_not_found/);
  }, 60_000);

  it('on a fake adb: no marker → timeout, exit code 1, and the real <id>.png is NOT overwritten', () => {
    const out = path.join(tmp, 'out_timeout');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'cards-014.png'), 'GOOD-OLD-EVIDENCE');
    const result = run(['cards-014', '--guest', `--out=${out}`, '--settle-ms=0', '--poll-ms=100', '--timeout-ms=600'], { ADB_PATH: fakeAdb, FAKE_MARKER: '0' });
    expect(result.status).toBe(1);
    expect(fs.readFileSync(path.join(out, 'cards-014.png'), 'utf8')).toBe('GOOD-OLD-EVIDENCE');
    const runsDir = path.join(out, '_runs');
    const stampDir = fs.readdirSync(runsDir).find((f) => !f.endsWith('.tsv')) as string;
    expect(fs.existsSync(path.join(runsDir, stampDir, 'cards-014.timeout.png'))).toBe(true);
    const journal = fs.readdirSync(runsDir).find((f) => f.endsWith('.tsv')) as string;
    expect(fs.readFileSync(path.join(runsDir, journal), 'utf8')).toMatch(/cards-014\t[^\t]+\ttimeout\t/);
  });

  it('on a fake adb: a vip/plan link launches the app twice', () => {
    const out = path.join(tmp, 'out_relaunch');
    const log = path.join(tmp, 'adb_relaunch.log');
    const result = run(['paywalls-019', '--include-nonunique', `--out=${out}`, '--settle-ms=0', '--poll-ms=100', '--timeout-ms=3000'], { ADB_PATH: fakeAdb, FAKE_MARKER: '1', FAKE_LOG: log });
    expect(result.status).toBe(0);
    const starts = fs.readFileSync(log, 'utf8').split('\n').filter((l) => l.includes('am start'));
    expect(starts.length).toBe(2);
  });

  it('rows that need card fixtures (cards=demo|empty|…) are skipped without --guest, with a clear reason', () => {
    const skipped = run(['cards-005', 'cards-007', '--dry-run']);
    expect(skipped.stdout).toContain('пропуск cards-005: нужен_анонимный_гость');
    expect(skipped.stdout).toContain('пропуск cards-007: нужен_анонимный_гость');
    expect(skipped.stdout).toContain('к съёмке=0');
    const allowed = run(['cards-005', '--guest', '--dry-run']);
    expect(allowed.stdout).toContain('DRY cards-005');
  });

  it('ok frame: evidence is the STITCHED composite, the bare frame stays in _runs, registry is never written', () => {
    const out = path.join(tmp, 'out_stitch');
    const result = run(['cards-014', '--guest', `--out=${out}`, '--settle-ms=0', '--poll-ms=100', '--timeout-ms=3000'], { ADB_PATH: fakeAdb, FAKE_MARKER: '1' });
    expect(result.status).toBe(0);
    expect(fs.readFileSync(path.join(out, 'cards-014.png')).subarray(0, 9).toString()).toBe('STITCHED:');
    const runs = path.join(out, '_runs');
    const stamp = fs.readdirSync(runs).find((f) => !f.endsWith('.tsv')) as string;
    expect(fs.existsSync(path.join(runs, stamp, 'cards-014.bare.png'))).toBe(true);
    const journal = fs.readdirSync(runs).find((f) => f.endsWith('.tsv')) as string;
    expect(fs.readFileSync(path.join(runs, journal), 'utf8')).toMatch(/cards-014\t[^\t]+\tok\t\d+\tmarker\+склейка/);
  });

  it('stitch failure: stitch_failed, exit 1, evidence untouched (old <id>.png kept), bare frame in _runs', () => {
    const out = path.join(tmp, 'out_stitch_fail');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'cards-014.png'), 'GOOD-OLD-COMPOSITE');
    const result = run(['cards-014', '--guest', `--out=${out}`, '--settle-ms=0', '--poll-ms=100', '--timeout-ms=3000'], { ADB_PATH: fakeAdb, FAKE_MARKER: '1', STUB_STITCH_FAIL: '1' });
    expect(result.status).toBe(1);
    expect(fs.readFileSync(path.join(out, 'cards-014.png'), 'utf8')).toBe('GOOD-OLD-COMPOSITE');
    const runs = path.join(out, '_runs');
    const stamp = fs.readdirSync(runs).find((f) => !f.endsWith('.tsv')) as string;
    expect(fs.existsSync(path.join(runs, stamp, 'cards-014.bare.png'))).toBe(true);
    const journal = fs.readdirSync(runs).find((f) => f.endsWith('.tsv')) as string;
    expect(fs.readFileSync(path.join(runs, journal), 'utf8')).toMatch(/cards-014\t[^\t]+\tstitch_failed\t/);
  });

  it('--no-stitch keeps the old behaviour (bare frame in evidence) and says so in the journal', () => {
    const out = path.join(tmp, 'out_nostitch');
    const result = run(['cards-014', '--guest', '--no-stitch', `--out=${out}`, '--settle-ms=0', '--poll-ms=100', '--timeout-ms=3000'], { ADB_PATH: fakeAdb, FAKE_MARKER: '1' });
    expect(result.status).toBe(0);
    expect(fs.readFileSync(path.join(out, 'cards-014.png')).subarray(0, 9).toString()).not.toBe('STITCHED:');
    const runs = path.join(out, '_runs');
    const journal = fs.readdirSync(runs).find((f) => f.endsWith('.tsv')) as string;
    expect(fs.readFileSync(path.join(runs, journal), 'utf8')).toContain('голый_кадр');
  });

  it('without ids and without --all-pending it refuses with a clear message', () => {
    const result = run(['--dry-run']);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('нечего снимать');
  });
});
