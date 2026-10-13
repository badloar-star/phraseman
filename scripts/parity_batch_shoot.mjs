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
 *   --stitch-only <ids> | --stitch-only-recent=<минуты>   БЕЗ эмулятора: склеить уже лежащие голые кадры (1080×2400) в evidence; голый → _runs/<метка>/<id>.bare.png
 *   --metro-url=http://127.0.0.1:8081/status  --metro-wait-ms=120000  --no-metro-check   перед каждым id ждать Metro (status=running); иначе статус metro_down и повтор в конце
 *   --no-screen-check    не распознавать красные экраны (uiautomator dump): «Unable to load script» → metro_down, «Render Error» и т. п. → redbox, «DEV-STATE…» висит → fixture_hang;
 *                        такие кадры только в _runs, id повторяется один раз в конце прогона
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
import { classifyScreenXml, waitMetro } from './parity_health.mjs';
import { parseUiNodes } from './parity_steps.mjs';

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

/** Что на экране устройства: 'metro_down' | 'redbox' | 'fixture_hang' | null (всё нормально или дамп не снялся). */
function classifyScreenOnDevice(device, id) {
  try {
    adb(device, ['shell', 'rm', '-f', '/sdcard/phm_health.xml']); // зачем: dump оставляет старый файл при пустом экране (память 2026-10-11)
    adb(device, ['shell', 'uiautomator', 'dump', '/sdcard/phm_health.xml'], { timeout: 20_000 });
    const xml = adb(device, ['exec-out', 'cat', '/sdcard/phm_health.xml'], { timeout: 20_000 });
    if (parseUiNodes(xml).length === 0) return null;
    return classifyScreenXml(xml);
  } catch (error) {
    console.warn(`${LOG} ${id}: экран не классифицирован (дамп не снялся): ${String(error).slice(0, 160)}`); // guard-ok: причина пропуска проверки экрана
    return null;
  }
}

function stitchEvidence(id, barePath, outDir, meta = {}) {
  const target = path.join(outDir, `${id}.png`);
  // зачем (Макеты через координатора 13.10): гейт с 06:00 смотрит на явное поле shot_at строки реестра — пишем его в журнал и передаём parity_shot (shoot_log | restitch_log)
  const shotAt = meta.shotAt || new Date().toISOString();
  const shotSource = meta.source || 'shoot_log';
  console.log(`[SHOT-AT] ${id} shot_at=${shotAt} source=${shotSource}`); // guard-ok: время съёмки для гейта Макетов
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [PARITY_SHOT, 'shot', id, '--no-registry', '--wait-ms=300'], {
    encoding: 'utf8',
    timeout: 180_000,
    env: { ...process.env, PARITY_FAKE_DEVICE_PNG: barePath, PARITY_EVIDENCE_DIR: outDir, PARITY_SHOT_AT: shotAt, PARITY_SHOT_AT_SOURCE: shotSource },
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

/** Строки журнала приложения, важные для разбора кадра, → _runs/<метка>/<id>.log (logcat чистится перед каждым id, поэтому иначе они теряются). */
// зачем (координатор 12.10, cards-028/009/034, dialogs-003/030): в журнал кадра попадают и метки разбора экранов — [THUMB] превью роликов, [CARDS-EMPTY]/[CARDS-HINT] карточки, [DIALOG-DONE]/[DIALOG-GOAL] диалоги, клавиатура и поле ввода
export const FRAME_LOG_RX = /\[(?:OVERLAY-QUEUE|APP-MESSAGE|DEV-STATE|PURCHASE-PENDING|PAYWALL[A-Z-]*|THUMB|CARDS-[A-Z-]+|DIALOG-[A-Z]+|DIALOGUE-KEYBOARD|DLG-INPUT-LAYOUT|HOME-CONTINUE|SPIRE-[A-Z]+)\]/; // зачем (spire-010, 15.10): теги Шпиля ([SPIRE-SCROLL], [SPIRE-DOCK], [SPIRE-LAYOUT], [SPIRE-TARGET]) должны попадать в журнал кадра
function saveFrameLog(device, id, runDir) {
  try {
    const text = adb(device, ['logcat', '-d', '-s', 'ReactNativeJS:V'], { timeout: 15_000 });
    const lines = text.split(/\r?\n/).filter((line) => FRAME_LOG_RX.test(line));
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, `${id}.log`), `${lines.join('\n')}\n`);
    console.log(`${LOG} ${id}: журнал приложения → ${lines.length} строк в _runs`); // guard-ok: итог сохранения лога
  } catch (error) {
    console.warn(`${LOG} ${id}: журнал приложения не сохранён:`, String(error).slice(0, 200)); // guard-ok: catch называет причину
  }
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
  // зачем (координатор 12.10, dialogs-029): мета-шаг `settle:<мс>` в строке заменяет --settle-ms
  const settleStep = row.steps.find((s) => s.op === 'settle');
  await sleep(burst ? opts.burstMs : (settleStep ? Number(settleStep.value) : opts.settleMs));
  const capture = () => adb(device, ['exec-out', 'screencap', '-p'], { timeout: 30_000, binary: true });
  const first = capture();
  saveFrameLog(device, row.id, runDir); // зачем (координатор 12.10, cards-010): строки журнала приложения рядом с кадром — ответ «дефект или артефакт» берётся из них
  if (!isPng(first)) return { ...result, outcome: 'error', detail: `screencap_не_png_${first.length}_байт`, file: null };
  let finalPng = first;
  let blankFirst = null;
  let msToNonblank = 0;
  let outcome = result.outcome;
  let detail = burst ? `${result.detail}+burst_${opts.burstMs}мс` : result.detail;
  // зачем (координатор 12.10): красный экран «Unable to load script» (Metro перезапускали), «Render Error» и зависшее «DEV-STATE…» — не кадры, а находки: файл только в _runs, id повторяется в конце
  if (opts.screenCheck && (outcome === 'ok' || outcome === 'timeout' || outcome === 'error')) {
    const verdict = classifyScreenOnDevice(device, row.id);
    // «DEV-STATE…» на кадре с маркером «replace вызван» — это переходное состояние, а не зависание
    if (verdict && !(verdict === 'fixture_hang' && outcome === 'ok')) {
      const bad = path.join(runDir, `${row.id}.${verdict}.png`);
      fs.mkdirSync(path.dirname(bad), { recursive: true });
      fs.writeFileSync(bad, first);
      return { ...result, outcome: verdict, detail: `${detail}+экран_${verdict}`, file: path.relative(ROOT, bad).split(path.sep).join('/'), bytes: first.length, msToNonblank: 0 };
    }
  }
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
    const shotAtIso = new Date().toISOString(); // момент снимка (кадр уже получен)
    save(bare, finalPng); // голый кадр всегда остаётся в _runs
    if (!opts.stitch) {
      save(target, finalPng); // --no-stitch: прежнее поведение, ТОЛЬКО для отладки — Макеты голый кадр сверять не могут
      console.log(`[SHOT-AT] ${row.id} shot_at=${shotAtIso} source=shoot_log`); // guard-ok: время съёмки (без склейки)
      return { ...result, outcome, detail: `${detail}+голый_кадр`, file: rel(target), bytes: finalPng.length, msToNonblank };
    }
    const stitched = stitchEvidence(row.id, bare, opts.outDir, { shotAt: shotAtIso, source: 'shoot_log' });
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

/** Размер PNG по заголовку IHDR (без декодирования); null — не PNG. */
export function pngSize(buffer) {
  if (!buffer || buffer.length < 24 || buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/**
 * --stitch-only <ids> | --stitch-only-recent=<минуты>: без эмулятора превращает уже лежащие в evidence ГОЛЫЕ кадры (размер экрана, по умолчанию 1080×2400)
 * в составные склейки «образец | приложение». Голый кадр копируется в _runs/<метка>/<id>.bare.png, склейку строит parity_shot (PARITY_FAKE_DEVICE_PNG) и
 * ложится на место <id>.png. Если склейка не вышла — исходный голый кадр остаётся на месте (ничего не теряем), в журнале причина.
 * зачем (координатор 12.10): прогон Сверки шёл старым роботом без склейки — 16 голых кадров Макеты сверить не могут; повторять съёмку на эмуляторе не нужно.
 */
async function stitchOnlyMain(argv, ids) {
  const outDir = path.resolve(arg(argv, '--out', path.join(ROOT, 'docs/phraseman-2.0/evidence/parity')));
  const [bareW, bareH] = arg(argv, '--bare-size', '1080x2400').split('x').map(Number);
  const recentRaw = arg(argv, '--stitch-only-recent', null);
  let targets = ids;
  if (recentRaw !== null) {
    const since = Date.now() - Number(recentRaw) * 60_000;
    const recent = fs.readdirSync(outDir)
      .filter((f) => /^[a-z0-9-]+-\d{3}\.png$/.test(f) && fs.statSync(path.join(outDir, f)).mtimeMs >= since)
      .map((f) => f.replace(/\.png$/, ''));
    targets = [...new Set([...ids, ...recent])].sort();
  }
  if (targets.length === 0) {
    console.error(`${LOG} stitch-only: нечего склеивать (нет id и нет свежих кадров)`); // guard-ok: ранний выход логируется
    return 2;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.join(outDir, '_runs', stamp);
  const journal = path.join(outDir, '_runs', `stitch_${stamp}.tsv`);
  fs.mkdirSync(runDir, { recursive: true });
  fs.appendFileSync(journal, 'id\ttime\tresult\tdetail\tfile\n');
  const totals = { stitched: 0, skipped: 0, failed: 0 };
  for (const id of targets) {
    const target = path.join(outDir, `${id}.png`);
    let result = 'failed';
    let detail = '';
    if (!fs.existsSync(target)) {
      result = 'skipped'; detail = 'нет_файла';
    } else {
      const bytes = fs.readFileSync(target);
      const size = pngSize(bytes);
      if (!size) { result = 'skipped'; detail = 'не_PNG'; }
      else if (size.width !== bareW || size.height !== bareH) { result = 'skipped'; detail = `уже_не_голый_${size.width}x${size.height}`; }
      else {
        const bare = path.join(runDir, `${id}.bare.png`);
        // зачем (координатор 13.10, дыра cards-070): пересклейка ставила склейке СВЕЖЕЕ время, и реестр принимал match по кадру 12.10 как по свежему.
        // Время съёмки голого кадра = mtime исходного файла (копируем с cp -p/utimes) — пишем в журнал, в «[RESTITCH]» и возвращаем склейке.
        const rawStat = fs.statSync(target);
        fs.copyFileSync(target, bare);
        fs.utimesSync(bare, rawStat.atime, rawStat.mtime);
        let codeChangedAt = 'неизвестно';
        try {
          codeChangedAt = spawnSync('git', ['log', '-1', '--format=%cI', '--', 'app', 'components', 'modules'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim() || 'неизвестно';
        } catch (error) {
          console.warn(`${LOG} restitch ${id}: время кода не получено: ${String(error).slice(0, 120)}`); // зачем: причина пустого code_changed_at
        }
        const rawIso = rawStat.mtime.toISOString();
        const staleVsCode = codeChangedAt !== 'неизвестно' && new Date(codeChangedAt).getTime() > rawStat.mtimeMs ? 'КАДР_СТАРШЕ_КОДА' : 'кадр_не_старше_кода';
        console.log(`[RESTITCH] ${id} raw_shot_at=${rawIso} code_changed_at=${codeChangedAt} ${staleVsCode}`); // guard-ok: время голого кадра для проверки свежести
        detail = `raw_shot_at=${rawIso} code_changed_at=${codeChangedAt} ${staleVsCode}`;
        const stitched = stitchEvidence(id, bare, outDir, { shotAt: rawIso, source: 'restitch_log' });
        if (stitched.ok) fs.utimesSync(target, rawStat.atime, rawStat.mtime); // склейка наследует время голого кадра, а не «сейчас»
        const after = pngSize(fs.readFileSync(target));
        if (stitched.ok && after && !(after.width === bareW && after.height === bareH)) { result = 'stitched'; detail = `склейка_${after.width}x${after.height} ${detail}`; }
        else { result = 'failed'; detail = `склейка_не_удалась: ${stitched.reason || 'размер не изменился'} — исходный голый кадр оставлен на месте`; }
      }
    }
    totals[result] += 1;
    fs.appendFileSync(journal, `${id}\t${new Date().toISOString()}\t${result}\t${detail}\t${path.relative(ROOT, target).split(path.sep).join('/')}\n`);
    console.log(`${LOG} stitch-only ${id}: ${result} ${detail}`); // guard-ok: итог по кадру
  }
  console.log(`${LOG} stitch-only готово: склеено=${totals.stitched} пропущено=${totals.skipped} не_удалось=${totals.failed}; журнал ${path.relative(ROOT, journal)}; голые кадры в ${path.relative(ROOT, runDir)}`); // guard-ok: итог пакета
  return totals.failed > 0 ? 1 : 0;
}

export async function main(argv) {
  const dryRun = argv.includes('--dry-run');
  const allPending = argv.includes('--all-pending');
  const includeNonUnique = argv.includes('--include-nonunique');
  const guest = argv.includes('--guest');
  const ids = argv.filter((a) => !a.startsWith('--'));
  if (argv.includes('--stitch-only') || arg(argv, '--stitch-only-recent', null) !== null) return stitchOnlyMain(argv, ids);
  const device = arg(argv, '--device', 'emulator-5554');
  const opts = {
    timeoutMs: Number(arg(argv, '--timeout-ms', '20000')),
    settleMs: Number(arg(argv, '--settle-ms', '1500')),
    blindWaitMs: Number(arg(argv, '--blind-wait-ms', '8000')),
    pollMs: Number(arg(argv, '--burst-ms', '0')) > 0 ? 250 : Number(arg(argv, '--poll-ms', '1000')),
    burstMs: Math.min(1000, Math.max(0, Number(arg(argv, '--burst-ms', '0')))),
    blankCheck: !argv.includes('--no-blank-check'),
    stitch: !argv.includes('--no-stitch'),
    metroCheck: !argv.includes('--no-metro-check'),
    metroUrl: arg(argv, '--metro-url', 'http://127.0.0.1:8081/status'),
    metroWaitMs: Number(arg(argv, '--metro-wait-ms', '120000')),
    screenCheck: !argv.includes('--no-screen-check'),
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
  const RETRYABLE = new Set(['metro_down', 'redbox', 'fixture_hang']);
  const finalStatus = new Map();
  const runOne = async (row, attempt) => {
    let result;
    try {
      // зачем (координатор 12.10): перед каждым id Metro должен отвечать; иначе кадр попадёт на красный экран «Unable to load script»
      const metro = opts.metroCheck ? await waitMetro(opts.metroUrl, opts.metroWaitMs, 2000, (msg) => console.log(`${LOG} ${row.id}: ${msg}`)) : { ok: true, waitedMs: 0, detail: 'проверка_выключена' }; // guard-ok: ход ожидания
      if (!metro.ok) {
        console.warn(`${LOG} ${row.id}: Metro не поднялся за ${metro.waitedMs} мс (${metro.detail}) — id пропущен до повтора`); // guard-ok: причина пропуска
        result = { outcome: 'metro_down', ms: metro.waitedMs, detail: `metro_не_отвечает:${metro.detail}`, file: null };
      } else {
        result = await shootOne(device, row, opts, runDir);
        if (metro.waitedMs > 0) result = { ...result, detail: `${result.detail}+ждали_metro_${metro.waitedMs}мс` };
      }
    } catch (error) {
      console.error(`${LOG} ${row.id}: ОШИБКА`, String(error).slice(0, 300)); // guard-ok: catch логируется
      result = { outcome: 'error', ms: 0, detail: String(error).slice(0, 160), file: null };
    }
    totals[result.outcome] = (totals[result.outcome] ?? 0) + 1;
    finalStatus.set(row.id, result.outcome);
    fs.appendFileSync(journal, `${row.id}\t${new Date().toISOString()}\t${result.outcome}\t${result.ms}\t${result.detail}${attempt > 1 ? '+повтор' : ''}\t${result.file ?? ''}\t${result.msToNonblank ?? 0}\n`);
    console.log(`${LOG} ${row.id}: ${result.outcome} ${result.ms}мс ${result.detail}${attempt > 1 ? ' (повтор)' : ''} → ${result.file ?? 'без файла'}`); // guard-ok: итог кадра
    return result;
  };
  const totals = { ok: 0, timeout: 0, error: 0, blank_too_long: 0, stitch_failed: 0, metro_down: 0, redbox: 0, fixture_hang: 0 };
  const retryQueue = [];
  for (const row of picked) {
    const result = await runOne(row, 1);
    if (RETRYABLE.has(result.outcome)) retryQueue.push(row);
  }
  // зачем (координатор 12.10): среда могла «моргнуть» (Metro, красный экран, зависшая фикстура) — каждый такой id повторяем ОДИН раз в конце прогона
  if (retryQueue.length > 0) console.log(`${LOG} повтор в конце прогона: ${retryQueue.map((r) => r.id).join(', ')}`); // guard-ok: список повторов
  for (const row of retryQueue) await runOne(row, 2);
  const finalCounts = {};
  for (const status of finalStatus.values()) finalCounts[status] = (finalCounts[status] ?? 0) + 1;
  console.log(`${LOG} готово (все попытки): ok=${totals.ok} timeout=${totals.timeout} error=${totals.error} blank_too_long=${totals.blank_too_long} stitch_failed=${totals.stitch_failed} metro_down=${totals.metro_down} redbox=${totals.redbox} fixture_hang=${totals.fixture_hang}; ИТОГ по id: ${JSON.stringify(finalCounts)}; журнал ${path.relative(ROOT, journal)}`); // guard-ok: итог пакета
  const unresolved = [...finalStatus.entries()].filter(([, status]) => RETRYABLE.has(status)).map(([id, status]) => `${id}:${status}`);
  if (unresolved.length > 0) console.warn(`${LOG} после повтора всё ещё нет кадра (списком координатору): ${unresolved.join(', ')}`); // guard-ok: итог нерешённых
  if (totals.blank_too_long > 0) console.warn(`${LOG} пустой экран дольше порога (находки для координатора, не кадры): см. журнал, файлы в _runs`); // guard-ok: итог находок
  if (totals.stitch_failed > 0) console.warn(`${LOG} склейка не удалась у ${totals.stitch_failed} кадров (сервер макетов http://127.0.0.1:8765 запущен? у строки есть mockup?): голые кадры в _runs, evidence не тронуты`); // guard-ok: итог отказов склейки
  const badFinal = [...finalStatus.values()].filter((status) => status !== 'ok').length;
  return badFinal > 0 ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (error) => { console.error(`${LOG} фатально:`, error); process.exit(4); }); // guard-ok: фатальная ошибка логируется
}
