#!/usr/bin/env node
/**
 * Машинная проверка озвучки занятий урока перед прослушиванием владельцем («один голос на задание», Codex).
 *
 * зачем (координатор 15.10 ночь): утром у владельца должно остаться одно «да» после прослушивания. До этого всё,
 * что машина может доказать, доказано здесь — по ТЕКСТАМ ПРИЛОЖЕНИЯ (generated_release) и назначениям Codex
 * (content/learning-v2-course/audio/en/single-voice-v1.json):
 *  • у каждого задания со звуком есть назначение, и клипы назначения покрывают все реплики задания (текст = текст);
 *  • голос назначения одобрен (ash/onyx/nova/coral) и совпадает с голосом в имени файла, если он там указан;
 *  • файл клипа есть, размер и sha256 = записи назначения;
 *  • ffprobe: mp3, 24 кГц, моно, длительность > 0; ffmpeg: файл декодируется целиком без ошибок;
 *  • карточки слов: сколько их в тексте занятия и у каждой есть запись голосом ash.
 * Только чтение. Пишет отчёт-таблицу и пакет на прослушивание (по 2 клипа на занятие, разными голосами, если можно).
 *
 * Запуск: node scripts/learning_v2_lesson_audio_machine_check.mjs --lesson 1 --from 16 --to 56 \
 *           --report docs/work/tasks/lesson1-audio-machine-check-2026-10-16.md \
 *           --pack docs/work/tasks/lesson1-audio-approval-2026-10-16.md
 * Код 0 — проблем нет; 1 — есть (таблица всё равно пишется). Логи: [V2-AUDIO-MACHINE].
 */
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const LOG = "[V2-AUDIO-MACHINE]";
const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const lessonOrdinal = Number(arg("lesson", "1"));
const from = Number(arg("from", "16"));
const to = Number(arg("to", "56"));
const reportPath = arg("report", null);
const packPath = arg("pack", null);
const VOICES = new Set(["ash", "onyx", "nova", "coral"]);
const pad = (value) => String(value).padStart(2, "0");
const lesson = `l${pad(lessonOrdinal)}`;

const assignments = JSON.parse(fs.readFileSync(path.join(root, "content/learning-v2-course/audio/en/single-voice-v1.json"), "utf8")).assignments;
const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets/audio/learning-v2/factory-production-v1/manifest.json"), "utf8"));
const recorded = new Set(manifest.entries.map((entry) => `${entry.transcript}\u0000${entry.voiceId}`));
for (const assignment of Object.values(assignments))
  for (const clip of assignment.clips ?? []) recorded.add(`${clip.text}\u0000${assignment.voice}`);

const referenceTranscripts = (interaction) => {
  const payload = interaction?.modePayload ?? {};
  if (payload.family === "sound_contrast") return [payload.audioA, payload.audioB].filter(Boolean).map((ref) => ref.transcript);
  return payload.referenceAudio ? [payload.referenceAudio.transcript] : [];
};
const probeCache = new Map();
const inspect = (file) => {
  if (probeCache.has(file)) return probeCache.get(file);
  const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries",
    "stream=codec_name,sample_rate,channels,duration:format=duration", "-of", "json", file], { encoding: "utf8", windowsHide: true });
  let result;
  if (probe.error || probe.status !== 0) {
    result = { ok: false, reason: `ffprobe:${probe.error?.message ?? String(probe.stderr).trim().slice(0, 80)}` };
  } else {
    const parsed = JSON.parse(String(probe.stdout || "{}"));
    const stream = parsed.streams?.[0];
    const duration = Number(stream?.duration ?? parsed.format?.duration);
    const decode = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-map", "0:a:0", "-f", "null", "-"], { encoding: "utf8", windowsHide: true });
    const decodeOk = !decode.error && decode.status === 0 && !String(decode.stderr ?? "").trim();
    const formatOk = stream?.codec_name === "mp3" && Number(stream?.sample_rate) === 24000 && Number(stream?.channels) === 1;
    result = {
      ok: formatOk && Number.isFinite(duration) && duration > 0 && decodeOk,
      duration,
      reason: !formatOk ? `format:${stream?.codec_name}/${stream?.sample_rate}/${stream?.channels}` : !decodeOk ? "decode_failed" : !(duration > 0) ? "duration_zero" : "",
    };
  }
  probeCache.set(file, result);
  return result;
};
const hashOf = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const rows = [];
const problems = [];
const pack = [];
for (let sessionOrdinal = from; sessionOrdinal <= to; sessionOrdinal += 1) {
  const session = `s${pad(sessionOrdinal)}`;
  const where = `${lesson}/${session}`;
  const learnerPath = path.join(root, "modules/learning-v2/content/factory_native/generated_release/en", lesson, session, "learner.json");
  if (!fs.existsSync(learnerPath)) { problems.push(`${where}: нет learner.json приложения`); rows.push({ where, missing: true }); continue; }
  const interactions = JSON.parse(fs.readFileSync(learnerPath, "utf8")).interactions;
  const row = { where, audioTasks: 0, assigned: 0, clips: 0, filesOk: 0, decodeOk: 0, minDur: Infinity, maxDur: 0, wordCards: 0, wordCardsAsh: 0, issues: [] };
  const sessionClips = [];
  interactions.forEach((interaction, index) => {
    if (interaction.isWordCard === true || interaction.modePayload?.isWordCard === true) {
      const word = String(interaction.modePayload?.wordCard?.word ?? interaction.wordCard?.word ?? "").normalize("NFKC").trim();
      row.wordCards += 1;
      if (word && recorded.has(`${word}\u0000ash`)) row.wordCardsAsh += 1;
      else row.issues.push(`карточка «${word}» без записи ash`);
    }
    const transcripts = referenceTranscripts(interaction);
    if (!(interaction.audioTargetIds ?? []).length || transcripts.length === 0) return;
    row.audioTasks += 1;
    const key = `${lesson}/${session}/task/${index}`;
    const assignment = assignments[key];
    if (!assignment) { row.issues.push(`${interaction.interactionId.split(":").slice(-2).join(":")}: нет назначения`); return; }
    if (!VOICES.has(assignment.voice)) { row.issues.push(`${key}: голос «${assignment.voice}» не одобрен`); return; }
    const clips = transcripts.map((transcript) => (assignment.clips ?? []).find((clip) => clip.text === transcript));
    if (clips.some((clip) => !clip)) { row.issues.push(`${key}: клипы не покрывают реплики (${transcripts.join(" | ")})`); return; }
    row.assigned += 1;
    for (const clip of clips) {
      row.clips += 1;
      const named = /-(ash|onyx|nova|coral)\.mp3$/u.exec(clip.assetPath)?.[1];
      if (named && named !== assignment.voice) row.issues.push(`${key}: голос в имени файла ${named} ≠ назначению ${assignment.voice}`);
      const file = path.join(root, clip.assetPath);
      if (!fs.existsSync(file)) { row.issues.push(`${key}: нет файла ${clip.assetPath}`); continue; }
      if (fs.statSync(file).size !== clip.byteSize || hashOf(file) !== clip.contentHash) { row.issues.push(`${key}: размер/отпечаток файла ≠ записи`); continue; }
      row.filesOk += 1;
      const media = inspect(file);
      if (!media.ok) { row.issues.push(`${key}: ${media.reason}`); continue; }
      row.decodeOk += 1;
      row.minDur = Math.min(row.minDur, media.duration);
      row.maxDur = Math.max(row.maxDur, media.duration);
      sessionClips.push({ key, voice: assignment.voice, text: clip.text, assetPath: clip.assetPath, duration: media.duration });
    }
  });
  // Пакет на прослушивание: 2 клипа, по возможности разными голосами и самые длинные фразы (больше слышно).
  const byLength = [...sessionClips].sort((a, b) => b.text.length - a.text.length);
  const first = byLength[0];
  const second = byLength.find((clip) => clip !== first && clip.voice !== first?.voice) ?? byLength[1];
  for (const clip of [first, second].filter(Boolean)) pack.push({ where, ...clip });
  for (const issue of row.issues) problems.push(`${where}: ${issue}`);
  rows.push(row);
  console.log(`${LOG} ${where} audioTasks=${row.audioTasks} assigned=${row.assigned} clips=${row.clips} files=${row.filesOk} decode=${row.decodeOk} wordCards=${row.wordCards} issues=${row.issues.length}`);
}

const fmt = (value) => (Number.isFinite(value) ? value.toFixed(2) : "—");
const table = [
  `# Машинная проверка озвучки ${lesson} s${pad(from)}–s${pad(to)} — ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`,
  "",
  "Сгенерировано `scripts/learning_v2_lesson_audio_machine_check.mjs` (только чтение). Источник текстов — тексты приложения",
  "(generated_release), назначения — `content/learning-v2-course/audio/en/single-voice-v1.json`.",
  "",
  `**Итог: ${problems.length === 0 ? "проблем нет ✅" : `проблем ${problems.length} ❌`}.**`,
  "",
  "| Занятие | Заданий со звуком | С назначением | Клипов | Файл и отпечаток | Декодируется (mp3 24 кГц моно) | Длительность, с | Карточек слов (с записью ash) | Проблемы |",
  "|---|---|---|---|---|---|---|---|---|",
  ...rows.map((row) => row.missing
    ? `| ${row.where} | — | — | — | — | — | — | — | нет текста занятия |`
    : `| ${row.where} | ${row.audioTasks} | ${row.assigned} | ${row.clips} | ${row.filesOk} | ${row.decodeOk} | ${fmt(row.minDur)}–${fmt(row.maxDur)} | ${row.wordCards} (${row.wordCardsAsh}) | ${row.issues.length || "—"} |`),
  "",
  ...(problems.length ? ["## Проблемы", "", ...problems.map((line) => `- ${line}`), ""] : []),
].join("\n");
if (reportPath) { fs.writeFileSync(path.join(root, reportPath), `${table}\n`, "utf8"); console.log(`${LOG} отчёт: ${reportPath}`); }
if (packPath) {
  const lines = [
    `# Пакет на прослушивание: озвучка ${lesson} s${pad(from)}–s${pad(to)} (2 клипа на занятие)`,
    "",
    "Для страницы с плеерами (координатор). По 2 клипа на занятие: самые длинные фразы, по возможности разными голосами.",
    "Каждый клип прошёл машинную проверку (файл, отпечаток, mp3 24 кГц моно, полное декодирование, длительность > 0).",
    "Одобрение — только словом владельца после прослушивания; этот файл одобрением НЕ является.",
    "",
    "| Занятие | Задание (ключ Codex) | Голос | Текст | Файл | Длит., с |",
    "|---|---|---|---|---|---|",
    ...pack.map((clip) => `| ${clip.where} | ${clip.key} | ${clip.voice} | ${clip.text.replaceAll("|", "\\|")} | \`${clip.assetPath}\` | ${clip.duration.toFixed(2)} |`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(root, packPath), lines, "utf8");
  console.log(`${LOG} пакет: ${packPath} (${pack.length} клипов)`);
}
console.log(`${LOG} итог: занятий ${rows.length}, проблем ${problems.length}`);
process.exit(problems.length === 0 ? 0 : 1);
