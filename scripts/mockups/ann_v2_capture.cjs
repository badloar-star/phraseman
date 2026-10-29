// ═══════════════════════════════════════════════════════════════════════════
// ann_v2_capture.cjs — конвейер снимков объявлений 2.0 с эмулятора для гейта «приложение = макет» (запускает Сверка).
//
// зачем (владелец 28.10, строгий гейт; координатор: «конвейер на 432 кадра напиши сам, Сверка запустит»): для каждого из 36 шаблонов ×
// короткий/длинный заголовок × 3 темы гейта × тёмное/светлое открывает фотостудию объявлений в конечном состоянии
// (dev_state?theme=…&appearance=…&next=/dev_moments_preview?state=announcements&frame=…&long=…&settle=1), снимает экран и проверяет,
// что кадр не чёрный и не «красный Metro». Эмулятор на время съёмки переводится в 390 × 844 dp (wm size 1170x2532, density 480 —
// геометрия макета 1:1), в конце — reset. Выход: <OUT>/<design>_<short|long>_<theme>_<dark|light>.png + manifest.json.
//   node scripts/mockups/ann_v2_capture.cjs [--device=emulator-5554] [--wait-ms=2800] [--no-resize] [--only=poll,date] [--themes=graphite,ink,grad_lilac]
//   env OUT=C:/Temp/claude/ann_gate/emu. Перезапуск продолжает с места (готовые кадры пропускаются). Логи: [ANN-CAPTURE].
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const sharp = require('sharp');

const LOG = '[ANN-CAPTURE]';
const ROOT = path.resolve(__dirname, '..', '..');
const APP = require(path.join(ROOT, 'app.json')).expo.android.package;
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); return m ? [m[1], m[2] ?? 'true'] : [a, 'true']; }));
const DEVICE = args.device || process.env.ANDROID_SERIAL || 'emulator-5554';
const OUT = process.env.OUT || 'C:/Temp/claude/ann_gate/emu';
const WAIT_MS = Number(args['wait-ms'] || 2800);
const THEMES = String(args.themes || 'graphite,ink,grad_lilac').split(',').filter(Boolean);
const ONLY = String(args.only || '').split(',').filter(Boolean);
const RESIZE = args['no-resize'] !== 'true';
/** Порядок и id шаблонов — из общего контракта (тот же, что в макете). */
const DESIGNS = ['manifest', 'editorial', 'quote', 'list3', 'qa', 'number', 'countdown', 'date', 'schedule', 'soon', 'today24', 'lessons', 'dialogs', 'cards', 'peak', 'duels', 'phrase', 'mistakes', 'video', 'exam', 'ai', 'plus', 'contest', 'challenge', 'invite', 'thanks', 'poll', 'author', 'newyear', 'holiday', 'birthday', 'theme', 'version', 'maintenance', 'feedback', 'tip'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** adb: env ADB → ANDROID_HOME / ANDROID_SDK_ROOT → %LOCALAPPDATA%/Android/Sdk → просто 'adb' из PATH. зачем: на ПК владельца adb не в PATH — первый прогон упал на undefined.trim(). */
function resolveAdb() {
  const exe = process.platform === 'win32' ? 'adb.exe' : 'adb';
  const roots = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'), process.env.HOME && path.join(process.env.HOME, 'Android', 'Sdk')].filter(Boolean);
  if (process.env.ADB) return process.env.ADB;
  for (const r of roots) { const c = path.join(r, 'platform-tools', exe); if (fs.existsSync(c)) return c; }
  return 'adb';
}
const ADB = resolveAdb();
function adb(a, opts = {}) {
  const r = spawnSync(ADB, ['-s', DEVICE, ...a], { encoding: opts.binary ? 'buffer' : 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const empty = opts.binary ? Buffer.alloc(0) : '';
  if (r.error) {
    if (!opts.soft) throw new Error(`adb не запустился (${ADB}): ${r.error.message}`);
    console.warn(LOG, `adb ${a.join(' ')} — не запустился (${ADB}): ${r.error.message}`); return empty;
  }
  if (r.status !== 0) {
    if (!opts.soft) throw new Error(`adb ${a.join(' ')} → ${r.status}: ${String(r.stderr).slice(0, 200)}`);
    console.warn(LOG, `adb ${a.join(' ')} → ${r.status}: ${String(r.stderr).slice(0, 200)}`);
  }
  return r.stdout == null ? empty : r.stdout;
}
/** Иерархия экрана (uiautomator): узлы с resource-id story-ann-* и их границы в px — доказательство, что на экране именно этот кадр
 * (а не сборка без маршрута), и сырьё для критерия (а) гейта: геометрия по testID ±2 dp. Сбой — null с причиной в логе. */
function uiNodes(design) {
  const dump = adb(['shell', 'uiautomator dump /sdcard/ann_ui.xml >/dev/null 2>&1 && cat /sdcard/ann_ui.xml'], { soft: true });
  if (!dump || !dump.includes('<hierarchy')) { console.warn(LOG, `${design}: иерархия не получена (${String(dump).slice(0, 80) || 'пусто'})`); return null; }
  const nodes = [];
  const re = /resource-id="(story-ann-[^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
  let m; while ((m = re.exec(dump))) nodes.push({ id: m[1], x: +m[2], y: +m[3], w: +m[4] - +m[2], h: +m[5] - +m[3] });
  return nodes;
}
const quote = (s) => `'${String(s).replace(/'/g, "'\\''")}'`;

/** Кадр годный: PNG, не чёрный (средняя яркость > 10), не экран ошибки Metro (красного в верхней трети < 25 %). */
async function judge(png) {
  if (png.length < 1000 || png.subarray(1, 4).toString('ascii') !== 'PNG') return { ok: false, why: 'not_png' };
  const img = sharp(png);
  const meta = await img.metadata();
  const small = await img.resize({ width: 60 }).raw().toBuffer({ resolveWithObject: true });
  const { data, info } = small;
  let sum = 0, red = 0, topPx = 0;
  const topRows = Math.floor(info.height / 3);
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    const i = (y * info.width + x) * info.channels; const r = data[i], g = data[i + 1], b = data[i + 2];
    sum += (r + g + b) / 3;
    if (y < topRows) { topPx += 1; if (r > 150 && g < 90 && b < 90) red += 1; }
  }
  const mean = sum / (info.width * info.height);
  if (mean < 10) return { ok: false, why: 'black', mean };
  if (red / Math.max(1, topPx) > 0.25) return { ok: false, why: 'red_metro', redRatio: red / topPx };
  return { ok: true, mean, width: meta.width, height: meta.height };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  console.log(LOG, 'adb:', ADB);
  const devices = String(adb(['devices'], { soft: true }) || '');
  const rows = devices.split(/\r?\n/).filter((l) => /\t/.test(l)).map((l) => l.trim());
  const mine = rows.find((l) => l.startsWith(DEVICE + '\t'));
  if (!mine || !/\tdevice$/.test(mine)) { console.error(LOG, `устройство ${DEVICE} не готово; adb devices:`, rows.length ? rows : ['(пусто — эмулятор не запущен или adb не найден)']); process.exit(2); }
  const before = { size: adb(['shell', 'wm', 'size'], { soft: true }).trim(), density: adb(['shell', 'wm', 'density'], { soft: true }).trim() };
  console.log(LOG, 'устройство', DEVICE, 'до съёмки:', before);
  if (RESIZE) { adb(['shell', 'wm', 'size', '1170x2532']); adb(['shell', 'wm', 'density', '480']); await sleep(1500); console.log(LOG, 'эмулятор переведён в 390 × 844 dp (1170x2532 @480)'); }
  const frames = []; const failures = [];
  let done = 0, skipped = 0;
  const total = DESIGNS.filter((d) => !ONLY.length || ONLY.includes(d)).length * 2 * THEMES.length * 2;
  try {
    for (const theme of THEMES) for (const ap of ['dark', 'light']) for (const long of [false, true]) for (const design of DESIGNS) {
      if (ONLY.length && !ONLY.includes(design)) continue;
      const name = `${design}_${long ? 'long' : 'short'}_${theme}_${ap}`;
      const file = path.join(OUT, `${name}.png`);
      if (fs.existsSync(file)) { skipped += 1; frames.push({ name, design, long, theme, ap, file: path.basename(file), reused: true }); continue; }
      const next = `/dev_moments_preview?state=announcements&frame=${design}&long=${long ? 1 : 0}&settle=1`;
      const link = `phraseman://dev_state?theme=${encodeURIComponent(theme)}&appearance=${ap}&next=${encodeURIComponent(next)}`;
      let verdict = null; let png = null;
      for (let attempt = 1; attempt <= 2 && !(verdict && verdict.ok); attempt += 1) {
        adb(['shell', `am start -a android.intent.action.VIEW -d ${quote(link)} ${APP}`]);
        await sleep(WAIT_MS + (attempt - 1) * 1500);
        png = adb(['exec-out', 'screencap', '-p'], { binary: true });
        verdict = await judge(png);
        if (verdict.ok) {
          // зачем: экран без узла story-ann-<design> — это не кадр объявления (сборка без маршрута, другая страница), а не «просто картинка»
          const nodes = uiNodes(design);
          verdict.nodes = nodes;
          const hasDesign = nodes ? nodes.some((n) => n.id === `story-ann-${design}`) : null;
          if (hasDesign === false) verdict = { ok: false, why: 'no_design_node', nodes: nodes.map((n) => n.id).slice(0, 8) };
        }
        if (!verdict.ok) console.log(LOG, `${name}: попытка ${attempt} — ${verdict.why}${verdict.nodes ? ' узлы: ' + JSON.stringify(verdict.nodes) : ''}`);
      }
      if (verdict && verdict.ok) { fs.writeFileSync(file, png); frames.push({ name, design, long, theme, ap, file: path.basename(file), width: verdict.width, height: verdict.height, nodes: verdict.nodes }); }
      else failures.push({ name, link, why: verdict ? verdict.why : 'no_frame' });
      done += 1;
      if (done % 12 === 0) console.log(LOG, `${done + skipped}/${total} (пропущено готовых ${skipped}, сбоев ${failures.length})`);
    }
  } finally {
    if (RESIZE) { adb(['shell', 'wm', 'size', 'reset'], { soft: true }); adb(['shell', 'wm', 'density', 'reset'], { soft: true }); console.log(LOG, 'размер и плотность эмулятора возвращены'); }
  }
  const manifest = { device: DEVICE, app: APP, before, resized: RESIZE ? { size: '1170x2532', density: 480, dp: { width: 390, height: 844 } } : null, themes: THEMES, frames, failures, madeAt: new Date().toISOString() };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log(LOG, JSON.stringify({ frames: frames.length, failures: failures.length, out: OUT }));
  if (failures.length) { console.log(LOG, 'сбои:', failures.slice(0, 10)); process.exit(1); }
})().catch((e) => { console.error(LOG, 'FATAL', e); process.exit(1); });
