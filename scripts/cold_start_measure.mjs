// Замер холодного старта release-сборки: серия запусков → отрезки «процесс → JS → первый кадр Главной → снятие заставки».
//   run    --serial <adb-serial> --out <каталог> [--runs 6] [--settle 20] [--label <имя сборки>]
//   report <каталог>
// зачем (владелец 11.11, передача от Codex: «снять сравнимую базу в release»): прежний baseline010.sh жил во временной папке
// и потерялся вместе с ней, поэтому замер 04.10 нельзя было повторить тем же способом. Скрипт лежит в репозитории и пишет
// рядом с журналами паспорт прогона (сборка, устройство, ядра, память), чтобы числа разных дней можно было сравнивать.
// Только чтение приложения: ничего не устанавливает и не стирает данные; устройство задаётся явно, значения по умолчанию нет —
// на ПК одновременно живут эмуляторы других сессий.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseAmStartTotalMs, parseColdStartIo, parseHomePaintMs, percentile } from './pm220_perf_gates.mjs';

const LOG = '[COLD-MEASURE]';
const PKG = 'app.phraseman';
const ADB = process.env.ADB ?? 'C:/Users/badlo/AppData/Local/Android/Sdk/platform-tools/adb.exe';

function adb(serial, args, timeoutMs = 60_000) {
  return execFileSync(ADB, ['-s', serial, ...args], { encoding: 'utf8', timeout: timeoutMs, maxBuffer: 256 * 1024 * 1024 });
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function argValue(args, name, fallback = null) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

/** Первая метка вида «<marker> epochMs=N» → N (часы устройства, те же, что у logcat -v epoch). */
export function parseMarkerEpochMs(logText, marker) {
  const at = logText.indexOf(marker);
  if (at < 0) return null;
  const m = /epochMs=(\d+)/.exec(logText.slice(at, at + marker.length + 40));
  return m ? Number(m[1]) : null;
}

/** Один журнал запуска → отрезки в мс; null — метки нет (в отчёте это видно, молча не подменяется). */
export function parseRun(logText, amText = '') {
  const paint = parseHomePaintMs(logText, PKG);
  const procMs = paint.procTs === null ? null : Math.round(paint.procTs * 1000);
  const jsEntry = parseMarkerEpochMs(logText, '[COLD-START] js_entry');
  const firstFrame = parseMarkerEpochMs(logText, '[HOME-PAINT] first_frame');
  const splashHidden = parseMarkerEpochMs(logText, '[COLD-START] native_splash_hidden');
  const diff = (a, b) => (a === null || b === null ? null : b - a);
  const io = parseColdStartIo(logText);
  return {
    procToJsEntry: diff(procMs, jsEntry),
    jsEntryToFirstFrame: diff(jsEntry, firstFrame),
    procToFirstFrame: diff(procMs, firstFrame),
    procToSplashHidden: diff(procMs, splashHidden),
    firstFrameToSplashHidden: diff(firstFrame, splashHidden),
    amTotal: parseAmStartTotalMs(amText)[0] ?? null,
    ioCalls: io?.calls ?? null,
    ioMaxInflight: io?.maxInflight ?? null,
    homePaintMarkers: paint.markers,
  };
}

export function summarize(runs) {
  const out = {};
  for (const key of Object.keys(runs[0] ?? {})) {
    const values = runs.map((r) => r[key]).filter((v) => typeof v === 'number').sort((a, b) => a - b);
    out[key] = { n: values.length, min: values[0] ?? null, median: percentile(values, 0.5), p90: percentile(values, 0.9), max: values[values.length - 1] ?? null, values };
  }
  return out;
}

function passport(serial, label) {
  const pkgDump = adb(serial, ['shell', 'dumpsys', 'package', PKG]);
  const pick = (re) => (re.exec(pkgDump)?.[1] ?? null);
  const flags = pick(/flags=\[([^\]]*)\]/) ?? '';
  return {
    label,
    serial,
    avd: serial.startsWith('emulator-') ? adb(serial, ['emu', 'avd', 'name']).split(/\r?\n/)[0].trim() : null,
    model: adb(serial, ['shell', 'getprop', 'ro.product.model']).trim(),
    android: adb(serial, ['shell', 'getprop', 'ro.build.version.release']).trim(),
    cores: Number(adb(serial, ['shell', 'nproc']).trim()),
    memTotalKb: Number(/MemTotal:\s+(\d+)/.exec(adb(serial, ['shell', 'cat', '/proc/meminfo']))?.[1] ?? NaN),
    versionName: pick(/versionName=(\S+)/),
    versionCode: pick(/versionCode=(\d+)/),
    lastUpdateTime: pick(/lastUpdateTime=(.+)/),
    debuggable: flags.includes('DEBUGGABLE'),
    measuredAt: new Date().toISOString(),
  };
}

function run(args) {
  const serial = argValue(args, '--serial');
  const out = argValue(args, '--out');
  const runs = Number(argValue(args, '--runs', '6'));
  const settleSec = Number(argValue(args, '--settle', '20'));
  if (!serial || !out) {
    console.error(`${LOG} нужны --serial и --out (устройство по умолчанию не выбирается)`);
    return 2;
  }
  fs.mkdirSync(out, { recursive: true });
  const info = passport(serial, argValue(args, '--label', 'unlabeled'));
  console.log(`${LOG} паспорт ${JSON.stringify(info)}`);
  if (info.versionName === null) {
    console.error(`${LOG} отказ: ${PKG} не установлен на ${serial}`);
    return 2;
  }
  if (info.debuggable) {
    // зачем: в отладочной сборке expo-router вычисляет все файлы app/ — такие числа уже выдавали за релизные (аудит 26.10).
    console.error(`${LOG} отказ: на ${serial} отладочная сборка (DEBUGGABLE) — замер старта по ней несопоставим с release`);
    return 2;
  }
  fs.writeFileSync(path.join(out, 'passport.json'), JSON.stringify(info, null, 2));
  adb(serial, ['logcat', '-G', '16M']);
  for (let i = 1; i <= runs; i += 1) {
    adb(serial, ['shell', 'am', 'force-stop', PKG]);
    adb(serial, ['logcat', '-c']);
    sleep(2_000);
    const am = adb(serial, ['shell', 'am', 'start', '-W', '-n', `${PKG}/.MainActivity`], 120_000);
    sleep(settleSec * 1_000);
    const log = adb(serial, ['logcat', '-d', '-v', 'epoch'], 120_000);
    fs.writeFileSync(path.join(out, `run${i}.am.txt`), am);
    fs.writeFileSync(path.join(out, `run${i}.log`), log);
    console.log(`${LOG} запуск ${i}/${runs}: ${JSON.stringify(parseRun(log, am))}`);
  }
  adb(serial, ['shell', 'am', 'force-stop', PKG]);
  return report([out]);
}

function report(args) {
  const dir = args[0];
  if (!dir || !fs.existsSync(dir)) {
    console.error(`${LOG} нет каталога замера: ${dir}`);
    return 2;
  }
  const names = fs.readdirSync(dir).filter((f) => /^run\d+\.log$/.test(f)).sort((a, b) => parseInt(a.slice(3), 10) - parseInt(b.slice(3), 10));
  if (names.length === 0) {
    console.error(`${LOG} в ${dir} нет журналов run*.log`);
    return 2;
  }
  const runs = names.map((name) => {
    const amFile = path.join(dir, name.replace('.log', '.am.txt'));
    return parseRun(fs.readFileSync(path.join(dir, name), 'utf8'), fs.existsSync(amFile) ? fs.readFileSync(amFile, 'utf8') : '');
  });
  const summary = summarize(runs);
  fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify({ runs, summary }, null, 2));
  for (const [key, s] of Object.entries(summary)) {
    console.log(`${LOG} ${key}: n=${s.n}/${runs.length} median=${s.median} p90=${s.p90} min=${s.min} max=${s.max} [${s.values.join(' ')}]`);
  }
  const missing = Object.entries(summary).filter(([, s]) => s.n < runs.length).map(([key, s]) => `${key} ${s.n}/${runs.length}`);
  if (missing.length) console.log(`${LOG} неполные метки: ${missing.join(', ')}`);
  return 0;
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href) {
  try {
    const [cmd, ...rest] = process.argv.slice(2);
    if (cmd === 'run') process.exit(run(rest));
    if (cmd === 'report') process.exit(report(rest));
    console.error(`${LOG} usage: cold_start_measure.mjs run --serial <serial> --out <каталог> [--runs 6] [--settle 20] [--label <имя>] | report <каталог>`);
    process.exit(2);
  } catch (error) {
    console.error(`${LOG} ошибка: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }
}
