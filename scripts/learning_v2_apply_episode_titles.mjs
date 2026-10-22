#!/usr/bin/env node
// Применение новых названий эпизодов Learning V2 (правило владельца 22.10: «интригующее имя, не более 2 слов»).
//
// зачем: название эпизода живёт в двух местах — колонка «Момент сцены» плана курса
// (content/learning-v2-course/curriculum/en/ПЛАН_КУРСА.md) и собранный файл
// modules/learning-v2/content/session_titles_v1.generated.ts (его читают Сезон, вкладка уроков, «Продолжить»).
// Правим оба синхронно, ТОЛЬКО уроки 1–3 (дальше план пишет Codex). В плане меняется лишь часть до « — »
// (хвост вроде «— ✅ эталон» сохраняется), в собранном файле — название целиком с заглавной буквы.
//
// Запуск: node scripts/learning_v2_apply_episode_titles.mjs <titles.json> [--write]
//   titles.json: { "1": { "1": "Первый день", ... }, "2": {...}, "3": {...} } — одобренная таблица 12 · ТЕОРИЯ.
// Без --write — только показывает, что изменится. Журнал [EPISODE-TITLES]: каждое изменение и каждый отказ.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLAN = path.join(ROOT, "content", "learning-v2-course", "curriculum", "en", "ПЛАН_КУРСА.md");
const GENERATED = path.join(ROOT, "modules", "learning-v2", "content", "session_titles_v1.generated.ts");
const LOG = (...a) => console.log("[EPISODE-TITLES]", ...a);
const FAIL = (msg) => { console.error("[EPISODE-TITLES] отказ:", msg); process.exit(1); };
const ALLOWED_LESSONS = new Set([1, 2, 3]);
const LESSON_HEADER = { 1: /^## Урок 1 /u, 2: /^## Урок 2 /u, 3: /^## Урок 3 /u };

const [inputPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const WRITE = process.argv.includes("--write");
if (!inputPath) FAIL("нет файла названий (titles.json)");
const titles = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"));

// Проверка входа: уроки 1–3, номера занятий 1–56, имя ≤ 2 слов, без двоеточий и латиницы.
const changes = [];
for (const [lessonKey, sessions] of Object.entries(titles)) {
  const lesson = Number(lessonKey);
  if (!ALLOWED_LESSONS.has(lesson)) FAIL(`урок ${lessonKey} вне 1–3 — дальше план ведёт Codex`);
  for (const [sessionKey, rawTitle] of Object.entries(sessions)) {
    const session = Number(sessionKey);
    const title = String(rawTitle).trim();
    if (!Number.isInteger(session) || session < 1 || session > 56) FAIL(`урок ${lesson}: номер занятия «${sessionKey}»`);
    if (!title) FAIL(`урок ${lesson} · ${session}: пустое название`);
    if (title.split(/\s+/u).length > 2) FAIL(`урок ${lesson} · ${session}: больше 2 слов — «${title}»`);
    if (/[:;A-Za-z]/u.test(title)) FAIL(`урок ${lesson} · ${session}: двоеточие или латиница — «${title}»`);
    changes.push({ lesson, session, title });
  }
}
LOG("вход", JSON.stringify({ file: inputPath, changes: changes.length, write: WRITE }));

// 1) План курса: строка таблицы «| N | … | Момент сцены |» внутри раздела урока.
const planRaw = fs.readFileSync(PLAN, "utf8");
const planCrlf = planRaw.includes("\r\n");
const plan = planRaw.replace(/\r\n/gu, "\n").split("\n");
function lessonRange(lesson) {
  const start = plan.findIndex((l) => LESSON_HEADER[lesson].test(l));
  if (start < 0) FAIL(`в плане нет раздела урока ${lesson}`);
  let end = plan.length;
  for (let i = start + 1; i < plan.length; i += 1) if (/^## Урок \d+/u.test(plan[i])) { end = i; break; }
  return [start, end];
}
const lowerFirst = (s) => s.charAt(0).toLocaleLowerCase("ru-RU") + s.slice(1);
for (const c of changes) {
  const [start, end] = lessonRange(c.lesson);
  const idx = plan.slice(start, end).findIndex((l) => new RegExp(`^\\| ${c.session} \\|`, "u").test(l));
  if (idx < 0) FAIL(`урок ${c.lesson}: в плане нет строки занятия ${c.session}`);
  const at = start + idx;
  const cells = plan[at].split("|");
  const lastCell = cells[cells.length - 2];
  const [before, ...tail] = lastCell.trim().split(" — ");
  const next = ` ${[lowerFirst(c.title), ...tail].join(" — ")} `;
  if (lastCell !== next) LOG("план", JSON.stringify({ lesson: c.lesson, session: c.session, was: before, now: lowerFirst(c.title) }));
  cells[cells.length - 2] = next;
  plan[at] = cells.join("|");
}

// 2) Собранный файл: блок LEARNING_V2_SESSION_TITLES_RU_V1, строки «  N: "…",» внутри «  урок: Object.freeze({».
const genRaw = fs.readFileSync(GENERATED, "utf8");
const genCrlf = genRaw.includes("\r\n");
const gen = genRaw.replace(/\r\n/gu, "\n").split("\n");
const tableStart = gen.findIndex((l) => l.startsWith("export const LEARNING_V2_SESSION_TITLES_RU_V1"));
const tableEnd = gen.findIndex((l, i) => i > tableStart && l === "});");
if (tableStart < 0 || tableEnd < 0) FAIL("в собранном файле нет таблицы LEARNING_V2_SESSION_TITLES_RU_V1");
for (const c of changes) {
  const lessonAt = gen.findIndex((l, i) => i > tableStart && i < tableEnd && l === `  ${c.lesson}: Object.freeze({`);
  if (lessonAt < 0) FAIL(`собранный файл: нет урока ${c.lesson}`);
  const rowAt = gen.findIndex((l, i) => i > lessonAt && i < tableEnd && new RegExp(`^    ${c.session}: ".*",?$`, "u").test(l));
  if (rowAt < 0) FAIL(`собранный файл: урок ${c.lesson}, нет занятия ${c.session}`);
  const capital = c.title.charAt(0).toLocaleUpperCase("ru-RU") + c.title.slice(1);
  const comma = gen[rowAt].trimEnd().endsWith(",") ? "," : "";
  gen[rowAt] = `    ${c.session}: ${JSON.stringify(capital)}${comma}`;
}

if (!WRITE) {
  LOG("пробный прогон: файлы не изменены. Для записи добавьте --write");
  process.exit(0);
}
fs.writeFileSync(PLAN, planCrlf ? plan.join("\r\n") : plan.join("\n"));
fs.writeFileSync(GENERATED, genCrlf ? gen.join("\r\n") : gen.join("\n"));
LOG("записано", JSON.stringify({ plan: path.relative(ROOT, PLAN), generated: path.relative(ROOT, GENERATED), changes: changes.length }));
