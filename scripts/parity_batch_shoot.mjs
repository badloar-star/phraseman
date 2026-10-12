#!/usr/bin/env node
/**
 * Робот пакетной съёмки сверки «приложение = макет» поверх DEV_LINKS_R1.md.
 *
 * зачем (координатор 12.10): Сверка тратила ~1 минуту на кадр руками (devshot.sh). Робот сам доводит эмулятор до состояния
 * по готовой ссылке и снимает экран; реестр НЕ трогает (evidence/статусы пишут Макеты и Сверка), только кладёт <id>.png.
 *
 * Использование:
 *   node scripts/parity_batch_shoot.mjs cards-005 cards-014 [опции]
 *   node scripts/parity_batch_shoot.mjs --all-pending [--prefix=cards-] [--limit=20] [опции]
 * Опции:
 *   --dry-run            печатает команды, adb не запускает (эмулятор не нужен)
 *   --status=pending     какие статусы реестра брать для --all-pending (через запятую; по умолчанию pending)
 *   --guest              подтверждение: на устройстве вход — АНОНИМНЫЙ гость (pm clear + онбординг). Без него строки с cards=demo|empty|… пропускаются
 *   --burst-ms=0..1000   кадр через N мс после «replace вызван» без паузы settle и без повторов пустого кадра (анимации, конфетти)
 *   --no-stitch          НЕ клеить с образцом (в evidence — голый кадр; только для отладки). По умолчанию: составная склейка «образец | приложение» через scripts/parity_shot.mjs
 *                        (нужен сервер макетов http://127.0.0.1:8765 и playwright); голый кадр всегда в _runs/<метка>/<id>.bare.png; реестр не пишется
 *   --no-blank-check     не проверять «пустой кадр» (по умолчанию: >95 % одного цвета или <8 цветов → повтор до 6 раз через 1 с; пусто >3 с = статус blank_too_long)
 *   --blank-retries=6  --blank-poll-ms=1000  --blank-max-ms=3000
 *   --include-nonunique  брать и строки с «уникальна: нет» (ссылка общая с соседями — кадр будет НЕ тем состоянием; по умолчанию пропускаются)
 *   --device=emulator-5554   --timeout-ms=20000   --settle-ms=1500   --blind-wait-ms=8000   --poll-ms=1000
 *   --out=<папка>        куда класть <id>.png (по умолчанию docs/phraseman-2.0/evidence/parity)
 *   --journal=<файл>     журнал прогона (по умолчанию <out>/_runs/batch_<метка>.tsv)
 * Готовность: маркер «[DEV-STATE] route: replace вызван» (или «next не задан») в `logcat -s ReactNativeJS`.
 * Ссылка без dev_state (premium_modal?…) маркера не даёт — ждём --blind-wait-ms.
 * Кадр с таймаутом НЕ перезаписывает <id>.png: он падает в <out>/_runs/<метка>/<id>.timeout.png для разбора.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describeSteps, parseSteps, runSteps } from './parity_steps.mjs';
import { analyzeFrame, blankCheckAvailable, blankCheckUnavailableReason } from './parity_blank.mjs';

const LOG = '[BATCH-SHOOT]';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LINKS_DOC = process.env.BATCH_SHOOT_LINKS_DOC ? path.resolve(process.env.BATCH_SHOOT_LINKS_DOC) : path.join(ROOT, 'docs/phraseman-2.0/DEV_LINKS_R1.md');
const REGISTRY = process.env.PARITY_REGISTRY ? path.resolve(process.env.PARITY_REGISTRY) : path.join(ROOT, 'docs/phraseman-2.0/registries/visual_parity.json');
const ADB = process.env.ADB_PATH || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const APP = 'app.phraseman';
// зачем (координатор 12.10, Макеты e1b68c470): в evidence кладём СОСТАВНУЮ склейку «образец макета | кадр приложения» (как делает parity_shot Сверки), а не голый
// скриншот 1080×2400 — голый Макеты сверять не могут. Склейку строит сам parity_shot (сервер макетов + playwright), реестр он не трогает (--no-registry).
const PARITY_SHOT = process.env.PARITY_SHOT_SCRIPT ? path.resolve(process.env.PARITY_SHOT_SCRIPT) : path.join(ROOT, 'scripts', 'parity_shot.mjs');
const READY_MARKERS = ['route: replace вызван', 'route: next не задан'];
const FAIL_MARKERS = ['route: ОШИБКА до перехода', 'route: replace УПАЛ'];

export function parseLinksDoc(text) {
  // строка таблицы: | id | экран · состояние | ссылка / путь | перед кадром | shot list |
  const rows = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!/^\| [a-z0-9-]+-\d{3} \|/.test(line)) continue;
    const cells = line.split('|');
    const id = (cells[1] ?? '').trim();
    // зачем: ссылки в документе бывают без схемы (`premium_modal?…`, `dev_state?…`) — для am start добавляем phraseman://
    const match = (cells[3] ?? '').match(/`((?:phraseman:\/\/)?(?:dev_state|premium_modal)\?[^`]+|phraseman:\/\/[^`]+)`/);
    const before = (cells[4] ?? '').trim();
    // зачем: колонки «тапы» и «уникальна» стоят ПОСЛЕ shot list (индексы 6 и 7), чтобы не сдвигать старый разбор ссылки
    const stepsRaw = (cells[6] ?? '').trim();
    const uniqueRaw = (cells[7] ?? '').trim().toLowerCase();
    let steps = [];
    let stepsError = null;
    try {
      steps = parseSteps(stepsRaw);
    } catch (error) {
      stepsError = String(error.message ?? error);
      console.warn(`${LOG} ${id}: шаги не разобраны — строка будет пропущена:`, stepsError); // guard-ok: причина пропуска строки
    }
    rows.set(id, {
      id, screen: (cells[2] ?? '').trim(), link: match ? (match[1].startsWith('phraseman://') ? match[1] : `phraseman://${match[1]}`) : null, before,
      steps, stepsError, unique: uniqueRaw === 'да',
    });
  }
  return rows;
}

export function linkTraits(link) {
  const isDevState = /^phraseman:\/\/dev_state\?/.test(link);
  const query = link.includes('?') ? link.slice(link.indexOf('?') + 1) : '';
  const keys = query.split('&').map((pair) => decodeURIComponent(pair.split('=')[0] ?? ''));
  return {
    isDevState,
    hasNext: keys.includes('next'),
    // vip/plan читаются при старте приложения → после применения нужен второй холодный запуск
    needsRelaunch: keys.includes('vip') || keys.includes('plan'),
  };
}

// зачем (координатор 12.10, безопасность): фикстуры cards=* пишут в синхронизируемые ключи карточек/наборов; на настоящем аккаунте приложение их
// всё равно откажется выполнить (dev_state_account_guard), но робот не должен даже пытаться без явного подтверждения, что вход — анонимный гость.
export const GUEST_ONLY_FIXTURE_RX = /[?&]cards=(?:demo|demo_lessons|empty|custom50|demo_published|notranslation)(?:&|$|%26)/;

export function selectIds({ ids, allPending, prefix, statuses, limit, includeNonUnique, guest, rows, registryRows }) {
  const skipped = [];
  let candidates = ids;
  if (allPending) {
    candidates = registryRows.filter((r) => r.release === 'r1' && statuses.includes(r.status)).map((r) => r.id);
  }
  if (prefix) candidates = candidates.filter((id) => id.startsWith(prefix));
  const picked = [];
  for (const id of candidates) {
    const row = rows.get(id);
    if (!row) { skipped.push({ id, reason: 'нет_в_DEV_LINKS_R1' }); continue; }
    if (!row.link) { skipped.push({ id, reason: 'нет_готовой_ссылки' }); continue; }
    if (row.link.includes("'")) { skipped.push({ id, reason: 'кавычка_в_ссылке' }); continue; }
    if (row.stepsError) { skipped.push({ id, reason: `шаги_не_разобраны_${row.stepsError}` }); continue; }
    // зачем (координатор 12.10): ссылка общая с соседями ⇒ слепой робот снимет чужой кадр; берём только строки «уникальна: да»
    if (!guest && GUEST_ONLY_FIXTURE_RX.test(row.link)) { skipped.push({ id, reason: 'нужен_анонимный_гость_(--guest)' }); continue; }
    if (!row.unique && !includeNonUnique) { skipped.push({ id, reason: 'не_уникальна_(--include-nonunique)' }); continue; }
    picked.push(row);
  }
  return { picked: limit > 0 ? picked.slice(0, limit) : picked, skipped };
}

const quote = (s) => `'${s}'`;
export function commandsFor(row, device) {
  const traits = linkTraits(row.link);
  const adbBase = `adb -s ${device}`;
  const launch = `${adbBase} shell "am start -a android.intent.action.VIEW -d ${quote(row.link)} ${APP}"`;
  const steps = [`${adbBase} shell am force-stop ${APP}`, `${adbBase} logcat -c`, launch, `# ждать в logcat: «${READY_MARKERS[0]}»${traits.isDevState && traits.hasNext ? '' : ' (маркера нет — слепое ожидание)'}`];
  if (traits.needsRelaunch) steps.push(`${adbBase} shell am force-stop ${APP}`, `${adbBase} logcat -c`, launch, '# второй запуск (vip/plan читаются при старте): снова ждать маркер');
  if (row.steps.length > 0) {
    steps.push(`# шаги состояния (uiautomator dump → input): ${describeSteps(row.steps).join(' ⏵ ')}`);
    for (const s of row.steps) steps.push(`    ${s.op}${s.value ? ` ${s.value}` : ''}`);
  }
  steps.push('# пауза settle', `${adbBase} exec-out screencap -p > <out>/${row.id}.png`);
  return steps;
}

function stitchEvidence(id, barePath, outDir) {
  const target = path.join(outDir, `${id}.png`);
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [PARITY_SHOT, 'shot', id, '--no-registry', '--wait-ms=300'], {
    encoding: 'utf8',
    timeout: 180_000,
    env: { ...process.env, PARITY_FAKE_DEVICE_PNG: barePath, PARITY_EVIDENCE_DIR: outDir },
  });
  const fresh = fs.existsSync(target) && fs.statSync(target).mtimeMs >= startedAt - 1000;
  if (result.status === 0 && fresh) return { ok: true, reason: '' };
  const tail = `${result.stderr ?? ''} ${result.stdout ?? ''}`.replace(/\s+/g, ' ').trim().slice(-200);
  console.warn(`${LOG} ${id}: склейка не удалась (status=${result.status}, свежий файл=${fresh}): ${tail}`); // guard-ok: причина отказа склейки
  return { ok: false, reason: tail || `status_${result.status}` };
}

function arg(argv, name, fallback) {
  const found = argv.find((a) => a.startsWith(`${name}=`));
  return found ? found.slice(name.length + 1) : fallback;
}

function adb(device, args, { timeout = 30_000, binary = false } = {}) {
  // зачем: ADB_PATH может указывать на .js/.mjs — подставной adb для теста без эмулятора
  const [bin, prefix] = /\.m?js$/.test(ADB) ? [process.execPath, [ADB]] : [ADB, []];
  const result = spawnSync(bin, [...prefix, '-s', device, ...args], { maxBuffer: 256 * 1024 * 1024, timeout });
  if (result.error || result.status !== 0) {
    throw new Error(`adb_failed args=${args.join(' ').slice(0, 120)} status=${result.status} error=${result.error ? String(result.error) : ''} stderr=${String(result.stderr ?? '').slice(0, 200)}`);
  }
  return binary ? result.stdout : String(result.stdout ?? '');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isPng = (buffer) => buffer.length > 200 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;

async function waitMarker(device, timeoutMs, pollMs) {
  const started = Date.now();
  for (;;) {
    let text = '';
    try {
      text = adb(device, ['logcat', '-d', '-s', 'ReactNativeJS:V'], { timeout: 15_000 });
    } catch (error) {
      console.warn(`${LOG} logcat не прочитан (повторим):`, String(error).slice(0, 200)); // guard-ok: ошибка чтения лога не должна ронять пакет
    }
    const failed = FAIL_MARKERS.find((m) => text.includes(m));
    if (failed) return { outcome: 'error', ms: Date.now() - started, detail: failed };
    if (READY_MARKERS.some((m) => text.includes(m))) return { outcome: 'ok', ms: Date.now() - started, detail: 'marker' };
    if (Date.now() - started >= timeoutMs) return { outcome: 'timeout', ms: Date.now() - started, detail: 'нет маркера' };
    await sleep(pollMs);
  }
}

async function launchAndWait(device, row, opts) {
  const traits = linkTraits(row.link);
  adb(device, ['shell', 'am', 'force-stop', APP]);
  adb(device, ['logcat', '-c']);
  adb(device, ['shell', `am start -a android.intent.action.VIEW -d ${quote(row.link)} ${APP}`]);
  if (!traits.isDevState || !traits.hasNext) {
    await sleep(opts.blindWaitMs);
    return { outcome: 'ok', ms: opts.blindWaitMs, detail: 'слепое_ожидание' };
  }
  return waitMarker(device, opts.timeoutMs, opts.pollMs);
}

async function shootOne(device, row, opts, runDir) {
  const traits = linkTraits(row.link);
  let result = await launchAndWait(device, row, opts);
  if (result.outcome === 'ok' && traits.needsRelaunch) {
    console.log(`${LOG} ${row.id}: vip/plan → второй запуск`); // guard-ok: ход пакета
    result = await launchAndWait(device, row, opts);
  }
  if (result.outcome === 'ok' && row.steps.length > 0) {
    try {
      await runSteps((args, o) => adb(device, args, o), row.steps, { log: (msg) => console.log(`${LOG} ${row.id}: ${msg}`) }); // guard-ok: ход шагов
      result = { ...result, detail: `${result.detail}+шагов_${row.steps.length}` };
    } catch (error) {
      console.error(`${LOG} ${row.id}: шаг не выполнен:`, String(error).slice(0, 240)); // guard-ok: catch логируется
      result = { ...result, outcome: 'error', detail: String(error.message ?? error).slice(0, 160) };
    }
  }
  // --burst-ms: кадр СРАЗУ после перехода (конфетти, вспышки) — без паузы settle и без повторов пустого кадра
  const burst = opts.burstMs > 0 && result.outcome === 'ok';
  await sleep(burst ? opts.burstMs : opts.settleMs);
  const capture = () => adb(device, ['exec-out', 'screencap', '-p'], { timeout: 30_000, binary: true });
  const first = capture();
  if (!isPng(first)) return { ...result, outcome: 'error', detail: `screencap_не_png_${first.length}_байт`, file: null };
  let finalPng = first;
  let blankFirst = null;
  let msToNonblank = 0;
  let outcome = result.outcome;
  let detail = burst ? `${result.detail}+burst_${opts.burstMs}мс` : result.detail;
  // зачем (координатор 12.10): пустой кадр сразу после перехода/модалки — не доказательство; ждём и снимаем снова (до N раз), фиксируем ms_to_nonblank
  if (outcome === 'ok' && !burst && opts.blankCheck) {
    let verdict = analyzeFrame(first);
    if (verdict && verdict.blank) {
      blankFirst = first;
      const startedBlank = Date.now();
      console.warn(`${LOG} ${row.id}: пустой кадр (доминанта ${(verdict.dominantRatio * 100).toFixed(1)}%, цветов ${verdict.uniqueColors}) — ждём и снимаем снова`); // guard-ok: причина повтора
      for (let attempt = 1; attempt <= opts.blankRetries; attempt += 1) {
        await sleep(opts.blankPollMs);
        const shot = capture();
        if (!isPng(shot)) continue;
        verdict = analyzeFrame(shot);
        if (verdict && !verdict.blank) {
          finalPng = shot;
          msToNonblank = Date.now() - startedBlank;
          break;
        }
      }
      if (!finalPng || finalPng === first) {
        outcome = 'blank_too_long';
        detail = `${detail}+пусто_${opts.blankRetries}_повторов`;
      } else if (msToNonblank > opts.blankMaxMs) {
        outcome = 'blank_too_long';
        detail = `${detail}+пусто_${msToNonblank}мс`;
      } else {
        detail = `${detail}+пусто_${msToNonblank}мс`;
      }
    }
  }
  const rel = (target) => path.relative(ROOT, target).split(path.sep).join('/');
  const save = (target, data) => {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const tmp = `${target}.tmpw`;
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, target);
  };
  if (outcome === 'ok') {
    const target = path.join(opts.outDir, `${row.id}.png`);
    const bare = path.join(runDir, `${row.id}.bare.png`);
    save(bare, finalPng); // голый кадр всегда остаётся в _runs
    if (!opts.stitch) {
      save(target, finalPng); // --no-stitch: прежнее поведение, ТОЛЬКО для отладки — Макеты голый кадр сверять не могут
      return { ...result, outcome, detail: `${detail}+голый_кадр`, file: rel(target), bytes: finalPng.length, msToNonblank };
    }
    const stitched = stitchEvidence(row.id, bare, opts.outDir);
    if (stitched.ok) return { ...result, outcome, detail: `${detail}+склейка`, file: rel(target), bytes: finalPng.length, msToNonblank };
    // склейки нет → evidence НЕ пишем (не подменяем составной кадр голым), старый <id>.png остаётся; голый кадр лежит в _runs
    return { ...result, outcome: 'stitch_failed', detail: `${detail}+склейка_не_удалась: ${stitched.reason}`, file: rel(bare), bytes: finalPng.length, msToNonblank };
  }
  // не кадр, а находка: пустой экран дольше порога может быть настоящей вспышкой у человека — файлы только в _runs
  const target = path.join(runDir, `${row.id}.${outcome}.png`);
  save(target, blankFirst ?? first);
  if (outcome === 'blank_too_long' && finalPng !== first) save(path.join(runDir, `${row.id}.${outcome}.late.png`), finalPng);
  return { ...result, outcome, detail, file: rel(target), bytes: first.length, msToNonblank };
}

export async function main(argv) {
  const dryRun = argv.includes('--dry-run');
  const allPending = argv.includes('--all-pending');
  const includeNonUnique = argv.includes('--include-nonunique');
  const guest = argv.includes('--guest');
  const ids = argv.filter((a) => !a.startsWith('--'));
  const device = arg(argv, '--device', 'emulator-5554');
  const opts = {
    timeoutMs: Number(arg(argv, '--timeout-ms', '20000')),
    settleMs: Number(arg(argv, '--settle-ms', '1500')),
    blindWaitMs: Number(arg(argv, '--blind-wait-ms', '8000')),
    pollMs: Number(arg(argv, '--burst-ms', '0')) > 0 ? 250 : Number(arg(argv, '--poll-ms', '1000')),
    burstMs: Math.min(1000, Math.max(0, Number(arg(argv, '--burst-ms', '0')))),
    blankCheck: !argv.includes('--no-blank-check'),
    stitch: !argv.includes('--no-stitch'),
    blankRetries: Number(arg(argv, '--blank-retries', '6')),
    blankPollMs: Number(arg(argv, '--blank-poll-ms', '1000')),
    blankMaxMs: Number(arg(argv, '--blank-max-ms', '3000')),
    outDir: path.resolve(arg(argv, '--out', path.join(ROOT, 'docs/phraseman-2.0/evidence/parity'))),
  };
  if (!allPending && ids.length === 0) {
    console.error(`${LOG} не заданы id и нет --all-pending — нечего снимать`); // guard-ok: ранний выход логируется
    return 2;
  }
  const rows = parseLinksDoc(fs.readFileSync(LINKS_DOC, 'utf8'));
  const registryRows = allPending ? JSON.parse(fs.readFileSync(REGISTRY, 'utf8')).rows : [];
  const statuses = arg(argv, '--status', 'pending').split(',');
  const { picked, skipped } = selectIds({ ids, allPending, prefix: arg(argv, '--prefix', ''), statuses, limit: Number(arg(argv, '--limit', '0')), includeNonUnique, guest, rows, registryRows });
  console.log(`${LOG} режим=${dryRun ? 'DRY-RUN' : 'съёмка'} устройство=${device} к съёмке=${picked.length} пропущено=${skipped.length} потолок=${opts.timeoutMs}мс пауза=${opts.settleMs}мс`); // guard-ok: итог выбора
  for (const s of skipped) console.log(`${LOG} пропуск ${s.id}: ${s.reason}`); // guard-ok: причина пропуска
  if (dryRun) {
    for (const row of picked) {
      console.log(`${LOG} DRY ${row.id} — ${row.screen}`); // guard-ok: сухой прогон
      for (const step of commandsFor(row, device)) console.log(`    ${step}`); // guard-ok: сухой прогон
    }
    return 0;
  }
  try {
    const state = adb(device, ['get-state'], { timeout: 10_000 }).trim();
    if (state !== 'device') throw new Error(`state=${state}`);
  } catch (error) {
    console.error(`${LOG} устройство ${device} недоступно:`, String(error).slice(0, 300)); // guard-ok: ранний выход логируется
    return 3;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.join(opts.outDir, '_runs', stamp);
  const journal = path.resolve(arg(argv, '--journal', path.join(opts.outDir, '_runs', `batch_${stamp}.tsv`)));
  fs.mkdirSync(path.dirname(journal), { recursive: true });
  fs.appendFileSync(journal, 'id\ttime\tresult\tms\tdetail\tfile\tms_to_nonblank\n');
  if (opts.blankCheck && !blankCheckAvailable()) console.warn(`${LOG} проверка пустого кадра отключена: pngjs недоступен (${blankCheckUnavailableReason()})`); // guard-ok: причина отключения проверки
  const totals = { ok: 0, timeout: 0, error: 0, blank_too_long: 0, stitch_failed: 0 };
  for (const row of picked) {
    let result;
    try {
      result = await shootOne(device, row, opts, runDir);
    } catch (error) {
      console.error(`${LOG} ${row.id}: ОШИБКА`, String(error).slice(0, 300)); // guard-ok: catch логируется
      result = { outcome: 'error', ms: 0, detail: String(error).slice(0, 160), file: null };
    }
    totals[result.outcome] = (totals[result.outcome] ?? 0) + 1;
    fs.appendFileSync(journal, `${row.id}\t${new Date().toISOString()}\t${result.outcome}\t${result.ms}\t${result.detail}\t${result.file ?? ''}\t${result.msToNonblank ?? 0}\n`);
    console.log(`${LOG} ${row.id}: ${result.outcome} ${result.ms}мс ${result.detail} → ${result.file ?? 'без файла'}`); // guard-ok: итог кадра
  }
  console.log(`${LOG} готово: ok=${totals.ok} timeout=${totals.timeout} error=${totals.error} blank_too_long=${totals.blank_too_long} stitch_failed=${totals.stitch_failed}; журнал ${path.relative(ROOT, journal)}`); // guard-ok: итог пакета
  if (totals.blank_too_long > 0) console.warn(`${LOG} пустой экран дольше порога (находки для координатора, не кадры): см. журнал, файлы в _runs`); // guard-ok: итог находок
  if (totals.stitch_failed > 0) console.warn(`${LOG} склейка не удалась у ${totals.stitch_failed} кадров (сервер макетов http://127.0.0.1:8765 запущен? у строки есть mockup?): голые кадры в _runs, evidence не тронуты`); // guard-ok: итог отказов склейки
  return totals.error + totals.timeout + totals.blank_too_long + totals.stitch_failed > 0 ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (error) => { console.error(`${LOG} фатально:`, error); process.exit(4); }); // guard-ok: фатальная ошибка логируется
}
