#!/usr/bin/env node
/**
 * R125: аудит тишины во ВСЁМ звуке, который входит в сборку (по громкости, не по размеру).
 *
 * зачем (координатор 18.10): сервис озвучки возвращал пустоту — клипы 0,43 с с пиком −55…−91 дБ. Размер после
 * перекодирования в 64 кбит/с меняется, поэтому тишину ищем замером: пик (volumedetect) < −45 дБ — тишина;
 * RMS ниже −50 дБ при пике выше порога — «очень тихо», в таблицу с пометкой. Источник списка — все require() звуковых
 * файлов из app, components, modules, hooks, constants (то, что Metro положит в сборку). Для набора Learning V2
 * подписывается текст и занятия из таблицы одного голоса.
 * Только чтение. Итог — таблица Markdown (--out <файл>) и строка [AUDIO-SILENCE]; код 1, если тишина найдена.
 * Запуск: node scripts/audit_bundled_audio_silence.mjs [--out docs/…/AUDIO_SILENCE.md] [--jobs 4]
 */
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outArg = args.indexOf("--out");
const OUT = outArg >= 0 ? path.resolve(ROOT, args[outArg + 1]) : null;
const jobsArg = args.indexOf("--jobs");
const JOBS = jobsArg >= 0 ? Math.max(1, Number(args[jobsArg + 1]) || 4) : 4;
const FFMPEG = process.env.FFMPEG
  ?? "C:/Users/badlo/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1-full_build/bin/ffmpeg.exe";
const PEAK_SILENT_DB = -45;
const RMS_QUIET_DB = -50;
const LOG = "[AUDIO-SILENCE]";

// 1) все require() звуковых файлов в коде приложения
const sources = execFileSync("git", ["ls-files", "--", "app", "components", "modules", "hooks", "constants"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 })
  .split(/\r?\n/u).filter((f) => /\.(ts|tsx|js)$/u.test(f));
const audio = new Map(); // абсолютный путь → { rel, from }
for (const rel of sources) {
  const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
  for (const m of text.matchAll(/require\(\s*["']([^"']+\.(?:mp3|m4a|wav|aac|ogg))["']\s*\)/gu)) {
    const abs = path.resolve(path.dirname(path.join(ROOT, rel)), m[1]);
    if (!audio.has(abs)) audio.set(abs, { rel: path.relative(ROOT, abs).replace(/\\/gu, "/"), from: rel });
  }
}
// 2) подписи для набора V2: текст по хешу, занятия по таблице одного голоса
const bootstrapModule = fs.readFileSync(path.join(ROOT, "app/learning_v2_bootstrap_audio_assets_v1.generated.ts"), "utf8");
const transcriptByHash = new Map([...bootstrapModule.matchAll(/transcript: ("(?:[^"\\]|\\.)*"), voiceId: "([a-z]+)" as const, contentHash: "([0-9a-f]{64})"/gu)]
  .map((m) => [m[3], `${JSON.parse(m[1])} / ${m[2]}`]));
const sessionsByHash = new Map();
try {
  const sv = JSON.parse(fs.readFileSync(path.join(ROOT, "content/learning-v2-course/audio/en/single-voice-v1.json"), "utf8"));
  for (const [key, a] of Object.entries(sv.assignments ?? {})) for (const c of a.clips ?? []) {
    const where = key.split("/").slice(0, 2).join("/");
    const set = sessionsByHash.get(c.contentHash) ?? new Set();
    set.add(where);
    sessionsByHash.set(c.contentHash, set);
  }
} catch (error) {
  console.warn(`${LOG} таблица одного голоса не прочитана (${error instanceof Error ? error.message : String(error)}) — без занятий в подписи`);
}

function measure(file) {
  return new Promise((resolve) => {
    const child = spawn(FFMPEG, ["-hide_banner", "-nostats", "-i", file, "-af", "volumedetect,astats=metadata=0:measure_overall=RMS_level", "-f", "null", "-"]);
    let err = "";
    child.stderr.on("data", (d) => { err += d; });
    child.on("close", () => {
      const num = (re) => { const m = re.exec(err); return m ? (m[1] === "-inf" ? -200 : Number(m[1])) : NaN; };
      const dur = /Duration: (\d+):(\d+):([\d.]+)/u.exec(err);
      resolve({
        peak: num(/max_volume:\s+(-?[\d.]+|-inf) dB/u),
        rms: num(/RMS level dB:\s+(-?[\d.]+|-inf)/u),
        duration: dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : NaN,
      });
    });
  });
}

const list = [...audio.entries()];
const results = [];
let next = 0;
let missing = 0;
await Promise.all(Array.from({ length: JOBS }, async () => {
  for (;;) {
    const i = next++;
    if (i >= list.length) return;
    const [abs, info] = list[i];
    if (!fs.existsSync(abs)) { missing += 1; results.push({ ...info, missing: true }); continue; }
    results.push({ ...info, ...(await measure(abs)) });
  }
}));
const hashOf = (rel) => (/([0-9a-f]{64})\.mp3$/u.exec(rel) ?? [])[1];
const silent = results.filter((r) => !r.missing && !(r.peak >= PEAK_SILENT_DB));
const quiet = results.filter((r) => !r.missing && r.peak >= PEAK_SILENT_DB && r.rms < RMS_QUIET_DB);
const row = (r, tag) => {
  const h = hashOf(r.rel);
  const what = h ? (transcriptByHash.get(h) ?? "—") : "—";
  const where = h ? [...(sessionsByHash.get(h) ?? [])].slice(0, 6).join(", ") || "—" : r.from;
  return `| ${tag} | ${r.rel} | ${Number.isFinite(r.duration) ? r.duration.toFixed(2) : "?"} | ${r.peak} | ${r.rms} | ${what} | ${where} |`;
};
const md = [
  `# Аудит тишины звука сборки (${new Date().toISOString().slice(0, 16).replace("T", " ")})`,
  "",
  `Проверено файлов: ${results.length - missing} (нет на диске: ${missing}). Тишина — пик < ${PEAK_SILENT_DB} дБ; «тихо» — RMS < ${RMS_QUIET_DB} дБ при нормальном пике.`,
  "",
  `Тишина: ${silent.length}; тихо: ${quiet.length}.`,
  "",
  "| вид | путь | длит., с | пик, дБ | RMS, дБ | текст / голос | занятия / откуда require |",
  "|---|---|---|---|---|---|---|",
  ...silent.map((r) => row(r, "ТИШИНА")),
  ...quiet.map((r) => row(r, "тихо")),
  ...results.filter((r) => r.missing).map((r) => `| НЕТ ФАЙЛА | ${r.rel} | | | | | ${r.from} |`),
  "",
].join("\n");
if (OUT) { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, md); }
console.log(`${LOG} ${JSON.stringify({ files: results.length, missing, silent: silent.length, quiet: quiet.length, out: OUT ? path.relative(ROOT, OUT) : null })}`);
if (!OUT) console.log(md);
process.exitCode = silent.length > 0 || missing > 0 ? 1 : 0;
