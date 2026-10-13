#!/usr/bin/env node
/**
 * Помощник сверки «приложение = макет»: склейка «макет | приложение» для строки реестра и запись анимации.
 *
 * зачем (CLAUDE.md «ГЕЙТ: ПРИЛОЖЕНИЕ = МАКЕТ»): сверка по коду не считается — нужен кадр макета и кадр эмулятора рядом, который смотрит координатор.
 *
 * Использование:
 *   node scripts/parity_shot.mjs shot <id> [--device=emulator-5554] [--phone=N] [--wait-ms=900] [--mockup-only] [--no-registry] [--fit=height|width] [--device-dp=411]  (или PARITY_FIT=width / PARITY_DEVICE_DP=411 в окружении)
 *   node scripts/parity_shot.mjs anim <id> [--device=emulator-5554] [--seconds=8] [--phone=N] [--no-registry]
 *   node scripts/parity_shot.mjs list [--pending] [--page=dialogs]
 * <id> — из docs/phraseman-2.0/registries/visual_parity.json (например dialogs-032).
 *
 * shot: кадр телефона N из макета (сервер макетов http://127.0.0.1:8765, playwright из node_modules) + `adb exec-out screencap -p`
 *       → docs/phraseman-2.0/evidence/parity/<id>.png; в реестр пишутся evidence, evidence_at, evidence_sha256.
 * anim: запись `adb shell screenrecord` (mp4) + запись страницы макета с проигрыванием анимации (webm) → <id>.anim.mp4 / <id>.anim.mockup.webm;
 *       в реестр пишутся anim_evidence, anim_evidence_at, anim_evidence_sha256.
 * Статус match и reviewed_by помощник НЕ ставит — их ставит координатор после просмотра склейки (самопроверка исполнителя не считается).
 * Реестр правится атомарно под блокировкой (несколько сессий гоняют помощник одновременно). Логи: [PARITY-SHOT].
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const LOG = '[PARITY-SHOT]';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// зачем: переменные окружения нужны ТЕСТАМ (подмена реестра/каталога склеек/кадра устройства), чтобы не трогать боевой реестр и не требовать эмулятор.
const REGISTRY = process.env.PARITY_REGISTRY ? path.resolve(process.env.PARITY_REGISTRY) : path.join(ROOT, 'docs/phraseman-2.0/registries/visual_parity.json');
const EVIDENCE_DIR = process.env.PARITY_EVIDENCE_DIR ? path.resolve(process.env.PARITY_EVIDENCE_DIR) : path.join(ROOT, 'docs/phraseman-2.0/evidence/parity');
const SERVER = process.env.PARITY_MOCKUP_SERVER || 'http://127.0.0.1:8765';
const ADB = process.env.ADB_PATH || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk', 'platform-tools', 'adb.exe');

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const rel = (absolute) => path.relative(process.env.PARITY_REGISTRY ? path.dirname(REGISTRY) : ROOT, absolute).split(path.sep).join('/');

export function readRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
}

/** Атомарное обновление ОДНОЙ строки: блокировка, повторное чтение, запись во временный файл и переименование. */
export async function updateRow(id, patch) {
  const lockPath = `${REGISTRY}.lock`;
  let fd = null;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      fd = fs.openSync(lockPath, 'wx');
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const age = Date.now() - fs.statSync(lockPath).mtimeMs;
      if (age > 30_000) {
        console.warn(`${LOG} stale_lock age_ms=${Math.round(age)} — снимаю`);
        fs.rmSync(lockPath, { force: true });
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (fd === null) throw new Error('registry_lock_timeout');
  try {
    const registry = readRegistry();
    const row = registry.rows.find((candidate) => candidate.id === id);
    if (!row) throw new Error(`row_not_found:${id}`);
    Object.assign(row, patch);
    const temporary = `${REGISTRY}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(registry, null, 2) + '\n');
    fs.renameSync(temporary, REGISTRY);
  } finally {
    fs.closeSync(fd);
    fs.rmSync(lockPath, { force: true });
  }
}

function adb(args, options = {}) {
  const result = spawnSync(ADB, args, { maxBuffer: 256 * 1024 * 1024, timeout: options.timeout ?? 60_000 });
  if (result.status !== 0) {
    throw new Error(`adb_failed args=${args.join(' ')} status=${result.status} stderr=${String(result.stderr ?? '').slice(0, 300)}`);
  }
  return result.stdout;
}

async function openMockup(playwright, page, row, phoneOverride) {
  const file = row.mockup?.file;
  if (!file) throw new Error(`no_mockup_file:${row.id} — макета нет (status ${row.status}); не придумывать: сначала макет и одобрение владельца`);
  const phone = phoneOverride ?? row.mockup.phone;
  if (row.mockup.mapping === 'label_mismatch' || row.mockup.mapping === 'no_phone') {
    console.warn(`${LOG} mapping=${row.mockup.mapping} id=${row.id}: номер строки матрицы может не совпадать с телефоном макета (подпись «${row.mockup.label ?? '—'}»). Проверьте глазами или задайте --phone=N`);
  }
  const url = `${SERVER}/${path.basename(file)}`;
  const response = await page.goto(url, { waitUntil: 'load' });
  if (!response || response.status() !== 200) throw new Error(`mockup_unreachable:${url} status=${response ? response.status() : 'none'}`);
  const cols = page.locator('.col');
  const count = await cols.count();
  if (phone < 1 || phone > count) throw new Error(`phone_out_of_range:${phone} of ${count} in ${path.basename(file)}`);
  const col = cols.nth(phone - 1);
  await revealPhone(page, col, phone, path.basename(file));
  return { phone, count, col, url };
}

// зачем (координатор 12.10, stitch_failed у profile-030/cards-043/081): телефоны 16–24 в profile.html лежат в закрытом <details class="proposal-area"> —
// Playwright 8 с ждал «element is not visible» и склейка падала молча. Раскрываем все <details>, а если телефон всё равно скрыт (display:none, как №37/№76
// в cards-states.html) — падаем сразу с понятной причиной phone_hidden, а не таймаутом.
export async function revealPhone(page, col, phone, fileName = '') {
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
  const visible = await col.locator('.ph').isVisible();
  if (!visible) throw new Error(`phone_hidden:${phone} in ${fileName} — телефон скрыт (display:none или закрытый блок); нужен другой номер или правка макета`);
}

const arg = (name, fallback = null) => {
  const found = process.argv.find((a) => a.startsWith(`${name}=`));
  return found ? found.slice(name.length + 1) : fallback;
};
const has = (name) => process.argv.includes(name);

function findRow(id) {
  const registry = readRegistry();
  const row = registry.rows.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`row_not_found:${id} (node scripts/parity_shot.mjs list)`);
  return row;
}

// зачем (координатор 12.10, ложное «+5–8 %»): склейка ставила макет и кадр устройства ОДИНАКОВОЙ ВЫСОТОЙ (1200 px), а у Pixel_8 экран 411 dp шириной и 2400 px высотой
// (соотношение 0.45), у макета 390 × 932 (0.418) — при равной высоте приложение выходило шире макета на ≈ 7,6 % и все размеры казались больше. Флаг --fit=width приводит оба кадра
// к равной ШИРИНЕ (390-dp эквивалент); по умолчанию поведение прежнее (--fit=height) — у Сверки идёт пачка, менять на ходу нельзя.
export const MOCKUP_DP = 390;
export const DEVICE_DP = 411;
export const ROW_HEIGHT_PX = 1200;

/** Размер PNG из заголовка IHDR (без библиотек изображений). */
export function pngSize(buffer) {
  if (!buffer || buffer.length < 24 || buffer.subarray(1, 4).toString('ascii') !== 'PNG') throw new Error('png_expected');
  return { w: buffer.readUInt32BE(16), h: buffer.readUInt32BE(20) };
}

/** Во сколько раз уменьшить кадр устройства шириной `deviceDp` dp, чтобы он стал эквивалентен макету шириной `mockupDp` dp: 411 → 390/411, 390 → 1. */
export function fitScale(deviceDp, mockupDp = MOCKUP_DP) {
  if (!(deviceDp > 0) || !(mockupDp > 0)) throw new Error(`fit_dp_invalid:${deviceDp}/${mockupDp}`);
  return mockupDp / deviceDp;
}

/**
 * Высоты картинок в склейке. height (по умолчанию, прежнее поведение): обе по rowHeight px.
 * width: макет остаётся rowHeight px высотой, кадр устройства масштабируется так, чтобы его ширина (в dp, приведённая через fitScale) совпала с шириной макета.
 */
export function layoutHeights({ fit = 'height', rowHeight = ROW_HEIGHT_PX, mockup, device, deviceDp = DEVICE_DP, mockupDp = MOCKUP_DP }) {
  if (fit === 'height') return { mockupH: rowHeight, deviceH: rowHeight };
  if (fit !== 'width') throw new Error(`fit_unknown:${fit} (height|width)`);
  if (!device) return { mockupH: rowHeight, deviceH: rowHeight };
  const mockupWidthPx = (rowHeight * mockup.w) / mockup.h;
  const pxPerMockupDp = mockupWidthPx / mockupDp;
  const deviceWidthPx = deviceDp * fitScale(deviceDp, mockupDp) * pxPerMockupDp;
  return { mockupH: rowHeight, deviceH: Math.round((deviceWidthPx * device.h) / device.w) };
}

/** Склейка двух кадров рядом (макет слева, приложение справа) средствами самого браузера — без сторонних библиотек изображений. */
async function composeSideBySide(page, mockupPng, devicePng, labels, heights = { mockupH: ROW_HEIGHT_PX, deviceH: ROW_HEIGHT_PX }) {
  const toUrl = (buffer) => `data:image/png;base64,${buffer.toString('base64')}`;
  await page.setViewportSize({ width: 1800, height: 1290 });
  await page.setContent(`<!doctype html><meta charset="utf-8"><body style="margin:0;background:#101012;color:#e8e8ea;font:600 18px system-ui;">
    <div style="display:flex;gap:28px;padding:20px;align-items:flex-start;">
      <figure style="margin:0"><div style="margin-bottom:10px">${labels.left}</div><img id="a" style="height:${heights.mockupH}px;display:block" src="${toUrl(mockupPng)}"></figure>
      <figure style="margin:0"><div style="margin-bottom:10px">${labels.right}</div>${devicePng ? `<img id="b" style="height:${heights.deviceH}px;display:block" src="${toUrl(devicePng)}">` : '<div style="height:1200px;width:560px;display:flex;align-items:center;justify-content:center;border:1px dashed #666">нет кадра приложения (--mockup-only)</div>'}</figure>
    </div></body>`);
  await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0));
  return page.screenshot({ fullPage: true, type: 'png' });
}

// зачем: см. вызов в commandShot — запись склейки с повтором и подробным логом ошибки открытия файла
async function writeEvidenceFile(target, data) {
  const temporary = `${target}.tmp-${process.pid}`;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      fs.writeFileSync(temporary, data);
      fs.renameSync(temporary, target);
      if (attempt > 1) console.warn(`${LOG} write_ok_after_retry path=${target} attempt=${attempt}`);
      return;
    } catch (error) {
      let existing = 'нет файла';
      try { existing = `size=${fs.statSync(target).size}`; } catch (statError) { existing = `stat_failed:${statError.code}`; }
      console.warn(`${LOG} write_failed attempt=${attempt}/4 path=${target} bytes=${data.length} code=${error.code} errno=${error.errno} syscall=${error.syscall} existing=${existing} message=${error.message}`);
      try { fs.rmSync(temporary, { force: true }); } catch (cleanError) { console.warn(`${LOG} tmp_cleanup_failed path=${temporary} code=${cleanError.code}`); }
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
    }
  }
}

async function commandShot(id) {
  const row = findRow(id);
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
    const { phone, count, col } = await openMockup(null, page, row, arg('--phone') ? Number(arg('--phone')) : null);
    await page.waitForTimeout(Number(arg('--wait-ms', '900')));
    const mockupPng = await col.locator('.ph').screenshot({ type: 'png' });
    let devicePng = null;
    if (!has('--mockup-only')) {
      const device = arg('--device', 'emulator-5554');
      devicePng = process.env.PARITY_FAKE_DEVICE_PNG ? fs.readFileSync(process.env.PARITY_FAKE_DEVICE_PNG) : adb(['-s', device, 'exec-out', 'screencap', '-p']);
      if (devicePng.length < 1000 || devicePng.subarray(1, 4).toString('ascii') !== 'PNG') throw new Error('screencap_not_png');
      console.log(`${LOG} device=${device} frame_bytes=${devicePng.length}`);
    }
    // зачем: пакетный робот (parity_batch_shoot.mjs) зовёт этот скрипт без флага; Сверка включает нормировку по ширине переменной окружения PARITY_FIT=width после пачки, не меняя робота
    const fit = arg('--fit', process.env.PARITY_FIT || 'height');
    const heights = layoutHeights({ fit, mockup: pngSize(mockupPng), device: devicePng ? pngSize(devicePng) : null, deviceDp: Number(arg('--device-dp', process.env.PARITY_DEVICE_DP || String(DEVICE_DP))) });
    console.log(`${LOG} fit=${fit} mockup_h=${heights.mockupH} device_h=${heights.deviceH}`);
    const output = await composeSideBySide(page, mockupPng, devicePng, {
      left: `макет · ${path.basename(row.mockup.file)} · телефон ${phone}/${count} · ${row.mockup.label ?? ''}`,
      right: `приложение · ${row.id} · ${row.screen} / ${row.state}`,
    }, heights);
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    const target = path.join(EVIDENCE_DIR, `${row.id}.png`);
    // зачем (Сверка/координатор 13.10): на 4 кадрах запись склейки падала «UNKNOWN: unknown error, open …png» без причины (cards-gap-011, cards-v2-044/046,
    // dialogs-gap-016); пишем во временный файл рядом + переименование, повторяем до 4 раз и логируем полный путь, размер и код — чтобы по журналу было видно, занят файл или нет.
    await writeEvidenceFile(target, output);
    console.log(`${LOG} wrote ${rel(target)} bytes=${output.length} mockup_phone=${phone} animation_in_mockup=${row.has_animation}`);
    if (!has('--no-registry') && !has('--mockup-only')) {
      await updateRow(id, { evidence: rel(target), evidence_at: new Date().toISOString(), evidence_sha256: sha256(output) });
      console.log(`${LOG} registry updated id=${id} (status не менялся: match ставит координатор)`);
    }
    if (row.has_animation !== false) console.log(`${LOG} В макете есть анимация/неизвестно (${(row.anim_notes ?? []).join('; ') || '—'}): запишите её командой anim ${id}`);
  } finally {
    await browser.close();
  }
}

async function commandAnim(id) {
  const row = findRow(id);
  const seconds = Number(arg('--seconds', '8'));
  const device = arg('--device', 'emulator-5554');
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const deviceTarget = path.join(EVIDENCE_DIR, `${row.id}.anim.mp4`);
  try {
    const context = await browser.newContext({ viewport: { width: 1400, height: 1100 }, recordVideo: { dir: EVIDENCE_DIR, size: { width: 1400, height: 1100 } } });
    const page = await context.newPage();
    const { phone, col } = await openMockup(null, page, row, arg('--phone') ? Number(arg('--phone')) : null);
    const remote = `/sdcard/parity_${row.id}.mp4`;
    // Запись устройства идёт ПАРАЛЛЕЛЬНО с проигрыванием макета: действия на устройстве (тап и т. п.) исполнитель делает вручную в эти секунды.
    const recorder = spawnSync(ADB, ['-s', device, 'shell', 'screenrecord', '--time-limit', String(seconds), remote], { timeout: (seconds + 20) * 1000 });
    const replay = col.locator('.replay, [data-replay]').first();
    if (await replay.count()) await replay.click().catch((error) => console.warn(`${LOG} replay_click_failed reason=${error.message}`));
    await page.waitForTimeout(seconds * 1000);
    await context.close();
    if (recorder.status !== 0) throw new Error(`screenrecord_failed status=${recorder.status} stderr=${String(recorder.stderr ?? '').slice(0, 200)}`);
    adb(['-s', device, 'pull', remote, deviceTarget], { timeout: 120_000 });
    spawnSync(ADB, ['-s', device, 'shell', 'rm', remote]);
    const videoPath = await page.video()?.path();
    const mockupTarget = path.join(EVIDENCE_DIR, `${row.id}.anim.mockup.webm`);
    if (videoPath) fs.renameSync(videoPath, mockupTarget);
    console.log(`${LOG} wrote ${rel(deviceTarget)} + ${rel(mockupTarget)} seconds=${seconds} mockup_phone=${phone}`);
    if (!has('--no-registry')) {
      await updateRow(id, { anim_evidence: rel(deviceTarget), anim_evidence_at: new Date().toISOString(), anim_evidence_sha256: sha256(fs.readFileSync(deviceTarget)) });
      console.log(`${LOG} registry updated id=${id} anim_evidence (сверять длительности/кривые: ${(row.anim_notes ?? []).join('; ') || '—'})`);
    }
  } finally {
    await browser.close();
  }
}

function commandList() {
  const page = arg('--page');
  const rows = readRegistry().rows.filter((row) => (!page || row.id.startsWith(`${page}-`)) && (!has('--pending') || row.status !== 'match'));
  for (const row of rows) console.log(`${row.id}\t${row.status}\tanim=${row.has_animation}\t${row.mockup.mapping}\t${row.screen} / ${row.state}`);
  console.log(`${LOG} rows=${rows.length}`);
}

async function main() {
  const [command, id] = process.argv.slice(2);
  if (command === 'shot' && id) return commandShot(id);
  if (command === 'anim' && id) return commandAnim(id);
  if (command === 'list') return commandList();
  console.error(`${LOG} usage: parity_shot.mjs shot <id> | anim <id> | list [--pending] [--page=dialogs]`);
  process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`${LOG} FAILED reason=${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
