// зачем (координатор 12.10, робот пакетной съёмки): сухой прогон должен печатать верные команды adb, а настоящий цикл —
// правильно вести себя на подставном adb: кадр ok кладётся в <id>.png, таймаут НЕ перезаписывает <id>.png, vip/plan дают второй запуск.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'parity_batch_shoot.mjs');

const FAKE_ADB = `
const fs = require('node:fs');
const args = process.argv.slice(2).slice(2); // без «-s <устройство>»
const log = process.env.FAKE_LOG;
if (log) fs.appendFileSync(log, args.join(' ') + '\\n');
if (args[0] === 'get-state') { process.stdout.write('device\\n'); }
else if (args[0] === 'logcat' && args[1] === '-d') { if (process.env.FAKE_MARKER === '1') process.stdout.write('I ReactNativeJS: [DEV-STATE] route: replace вызван → /x\\n'); }
else if (args[0] === 'exec-out') { process.stdout.write(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(6000, 7)])); }
`;

function run(args: string[], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, ...env }, timeout: 60_000 });
}

describe('parity_batch_shoot', () => {
  let tmp = '';
  let fakeAdb = '';
  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'batch-shoot-'));
    fakeAdb = path.join(tmp, 'fake_adb.js');
    fs.writeFileSync(fakeAdb, FAKE_ADB);
  });
  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('--dry-run prints adb commands, skips rows without a link / needing taps, and never touches adb', () => {
    const result = run(['cards-005', 'cards-012', 'cards-025', 'nope-001', '--dry-run'], { ADB_PATH: path.join(tmp, 'no_such_adb.js') });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('режим=DRY-RUN');
    expect(result.stdout).toContain('adb -s emulator-5554 shell am force-stop app.phraseman');
    expect(result.stdout).toContain('adb -s emulator-5554 logcat -c');
    expect(result.stdout).toContain('am start -a android.intent.action.VIEW -d \'phraseman://dev_state?onboarding=done');
    expect(result.stdout).toContain('screencap -p > <out>/cards-005.png');
    expect(result.stdout).toContain('пропуск cards-012: нужны_тапы');
    expect(result.stdout).toContain('пропуск cards-025: нет_готовой_ссылки');
    expect(result.stdout).toContain('пропуск nope-001: нет_в_DEV_LINKS_R1');
  });

  it('--with-taps takes the rows that need taps', () => {
    const result = run(['cards-012', '--with-taps', '--dry-run']);
    expect(result.stdout).toContain('DRY cards-012');
  });

  it('--all-pending picks only registry r1 pending rows that have a ready link', () => {
    const result = run(['--all-pending', '--dry-run']);
    expect(result.status).toBe(0);
    const picked = Number((result.stdout.match(/к съёмке=(\d+)/) ?? [])[1]);
    expect(picked).toBeGreaterThan(50);
    expect(result.stdout).not.toContain('нет_в_DEV_LINKS_R1: '); // формат причины — отдельным пропуском, не ошибкой
  });

  it('a dry run of a vip/plan link prints the second force-stop and launch', () => {
    const result = run(['paywalls-019', '--dry-run']);
    expect(result.stdout.match(/force-stop app\.phraseman/g)?.length).toBe(2);
    expect(result.stdout).toContain('второй запуск');
  });

  it('on a fake adb: a ready marker saves <id>.png and writes an ok journal line', () => {
    const out = path.join(tmp, 'out_ok');
    const log = path.join(tmp, 'adb_ok.log');
    const result = run(['cards-005', `--out=${out}`, '--settle-ms=0', '--poll-ms=100', '--timeout-ms=3000'], { ADB_PATH: fakeAdb, FAKE_MARKER: '1', FAKE_LOG: log });
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(out, 'cards-005.png'))).toBe(true);
    const journal = fs.readdirSync(path.join(out, '_runs')).find((f) => f.endsWith('.tsv')) as string;
    expect(fs.readFileSync(path.join(out, '_runs', journal), 'utf8')).toMatch(/cards-005\t[^\t]+\tok\t/);
    expect(fs.readFileSync(log, 'utf8')).toContain('am start -a android.intent.action.VIEW');
  });

  it('on a fake adb: no marker → timeout, exit code 1, and the real <id>.png is NOT overwritten', () => {
    const out = path.join(tmp, 'out_timeout');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'cards-005.png'), 'GOOD-OLD-EVIDENCE');
    const result = run(['cards-005', `--out=${out}`, '--settle-ms=0', '--poll-ms=100', '--timeout-ms=600'], { ADB_PATH: fakeAdb, FAKE_MARKER: '0' });
    expect(result.status).toBe(1);
    expect(fs.readFileSync(path.join(out, 'cards-005.png'), 'utf8')).toBe('GOOD-OLD-EVIDENCE');
    const runsDir = path.join(out, '_runs');
    const stampDir = fs.readdirSync(runsDir).find((f) => !f.endsWith('.tsv')) as string;
    expect(fs.existsSync(path.join(runsDir, stampDir, 'cards-005.timeout.png'))).toBe(true);
    const journal = fs.readdirSync(runsDir).find((f) => f.endsWith('.tsv')) as string;
    expect(fs.readFileSync(path.join(runsDir, journal), 'utf8')).toMatch(/cards-005\t[^\t]+\ttimeout\t/);
  });

  it('on a fake adb: a vip/plan link launches the app twice', () => {
    const out = path.join(tmp, 'out_relaunch');
    const log = path.join(tmp, 'adb_relaunch.log');
    const result = run(['paywalls-019', `--out=${out}`, '--settle-ms=0', '--poll-ms=100', '--timeout-ms=3000'], { ADB_PATH: fakeAdb, FAKE_MARKER: '1', FAKE_LOG: log });
    expect(result.status).toBe(0);
    const starts = fs.readFileSync(log, 'utf8').split('\n').filter((l) => l.includes('am start'));
    expect(starts.length).toBe(2);
  });

  it('without ids and without --all-pending it refuses with a clear message', () => {
    const result = run(['--dry-run']);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('нечего снимать');
  });
});
