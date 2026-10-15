#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildInteraction,
  atomicMarkdownParityIssues,
  introFeedbackContractIssues,
  parseHeader,
  parseIntro,
  parsePractice,
} from "./build_release.mjs";
import { taskInstructionIssues } from "./owner_quality.mjs";
import { newWordDeclarationIssues, parseSessionHeader } from "./session_header.mjs";
import {
  compositeGapReleaseIssues,
  dictationAudioTargetIssues,
  singlePhraseIntroIssues,
  singlePhraseReleaseIssues,
  projectSinglePhraseRelease,
  feedbackLocaleParityIssues,
} from "./single_phrase_release.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COURSE_ROOT = path.resolve(HERE, "..");
const REPO_ROOT = path.resolve(COURSE_ROOT, "..", "..");
const argv = process.argv.slice(2);
const positional = argv.find((value) => !value.startsWith("--"));
const valueOf = (name) => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : null;
};
const sessionIdentity = valueOf("session") ?? (/^[a-z]{2}\/l\d{2}\/s\d{2}$/u.test(positional ?? "") ? positional : null);
const explicitFile = valueOf("file") ?? (positional && !sessionIdentity ? positional : null);
const gitRef = valueOf("git-ref");

if (!sessionIdentity && !explicitFile && !gitRef) {
  console.error("Usage: node pipeline/check.mjs en/l01/s16");
  console.error("       node pipeline/check.mjs --session en/l01/s04 --file C:/temp/final.ru.md");
  console.error("       node pipeline/check.mjs --session en/l01/s04 --git-ref <commit>:<path>");
  process.exit(2);
}

const sessionDir = sessionIdentity ? path.join(COURSE_ROOT, "sessions", ...sessionIdentity.split("/")) : null;
const ruPath = gitRef ? null : path.resolve(explicitFile ?? path.join(sessionDir, "final.ru.md"));
const ukPath = explicitFile || gitRef ? null : path.join(sessionDir, "final.uk.md");
const problems = [];
const manual = [];
const add = (check, message) => problems.push({ check, message: String(message) });

function readSource(file, locale) {
  if (!fs.existsSync(file)) {
    add("files", `${locale}: файл не найден: ${file}`);
    return null;
  }
  const bytes = fs.readFileSync(file);
  const text = bytes.toString("utf8");
  if (text.includes("\uFFFD") || /(?:Ã.|Â.|Ð.|Ñ.|â€)/u.test(text)) add("encoding", `${locale}: признаки битой кодировки`);
  return text;
}

function readGitSource(ref) {
  const run = spawnSync("git", ["show", ref], { cwd: REPO_ROOT, encoding: "utf8", timeout: 20_000 });
  if (run.status !== 0) {
    add("files", `ru: git show не прочитал ${ref}: ${(run.stderr || run.stdout || "unknown").trim().slice(0, 240)}`);
    return null;
  }
  if (run.stdout.includes("\uFFFD") || /(?:Ã.|Â.|Ð.|Ñ.|â€)/u.test(run.stdout)) add("encoding", "ru: признаки битой кодировки");
  return run.stdout;
}

function loadApprovedPacket(identity) {
  if (!identity?.startsWith("en/")) return null;
  const match = /^en\/l(\d{2})\/s(\d{2})$/u.exec(identity);
  if (!match) return null;
  const packetId = `lesson-${match[1]}:session:${match[2]}`;
  const program = [
    "import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2 as b } from './modules/learning-v2/curriculum/en/course_blueprint_en_v2.ts';",
    `const p=b.sessionPackets.find(x=>x.sessionId===${JSON.stringify(packetId)});`,
    "const words=new Map(b.lexicalSenses.map(x=>[x.id,x.english]));",
    "console.log(JSON.stringify(p?{sessionId:p.sessionId,grammarOperationIds:p.grammarOperationIds,newWords:p.newLexicalSenseIds.map(id=>words.get(id)??id),activityModes:p.activityPlan.map(x=>x.modeFamily)}:null));",
  ].join("");
  const run = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "-e", program], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: 20_000,
  });
  if (run.status !== 0) {
    add("plan", `не удалось прочитать одобренный пакет: ${(run.stderr || run.stdout || "unknown").trim().slice(0, 240)}`);
    return null;
  }
  try {
    const packet = JSON.parse(run.stdout.trim());
    if (!packet) add("plan", `в плане нет пакета ${packetId}`);
    return packet;
  } catch (error) {
    add("plan", `пакет плана не разобран: ${error.message}`);
    return null;
  }
}

function normalizedList(values) {
  return (values ?? []).map((value) => String(value).normalize("NFKC").trim().toLocaleLowerCase("en-US"));
}

function inspectLocale(locale, markdown) {
  const header = parseSessionHeader(markdown);
  const intro = parseIntro(markdown);
  const tasks = parsePractice(markdown);
  if (!header.title || !header.scene || !header.operation) add("header", `${locale}: нужны заголовок, ситуация и операция`);
  for (const issue of newWordDeclarationIssues({ [locale]: header })) add("new_words", issue);
  if (header.newWords.length < 1 || header.newWords.length > 5) add("new_words", `${locale}: новых слов ${header.newWords.length}; нужно 1–5`);
  if (intro.length !== 3) add("intro", `${locale}: вводных страниц ${intro.length}; нужно 3`);
  for (const [index, page] of intro.entries()) {
    const correct = page.options.filter((option) => option.correct).length;
    if (page.options.length < 2) add("intro", `${locale}: вводная ${index + 1}: меньше двух вариантов`);
    if (correct !== 1) add("answer_keys", `${locale}: вводная ${index + 1}: правильных вариантов ${correct}`);
  }
  if (!tasks.length) add("practice", `${locale}: задания не найдены`);
  const ordinals = tasks.map((task) => task.ordinal);
  if (ordinals.some((ordinal, index) => ordinal !== index + 1)) add("practice", `${locale}: нарушен порядок номеров заданий: ${ordinals.join(", ")}`);
  for (const task of tasks) {
    const choiceFamily = ["listen_choose", "sound_contrast", "context_gap_grammar"].includes(task.family);
    if (choiceFamily && task.options.length < 2) add("answer_options", `${locale}: задание ${task.ordinal}: меньше двух вариантов`);
    if (choiceFamily && task.options.filter((option) => option.correct).length !== 1) {
      add("answer_keys", `${locale}: задание ${task.ordinal}: правильных вариантов ${task.options.filter((option) => option.correct).length}`);
    }
  }
  for (const issue of taskInstructionIssues(markdown)) add("learner_text", `${locale}: ${issue}`);
  return { locale, markdown, header, intro, tasks };
}

function projectionIssues(parsed, taskLocales) {
  const sessionId = sessionIdentity
    ? `${sessionIdentity.slice(0, 2)}:lesson-${sessionIdentity.slice(4, 6)}:session-${sessionIdentity.slice(8, 10)}`
    : "en:lesson-00:session-00";
  const interactions = parsed.tasks.map((task, index) => buildInteraction(
    task,
    taskLocales[task.ordinal],
    sessionId,
    index,
    parsed.tasks.length,
    parsed.locale,
  ));
  // Same answer contract as the release builder; this checks references and
  // targets, while grammatical truth remains with the two text reviewers.
  const answers = parsed.tasks.map((task, index) => ({
    interactionId: interactions[index].interactionId,
    correctText: task.target ?? task.speak ?? task.options.find(option => option.correct)?.text ?? "",
    correctResponseId: task.options.findIndex(option => option.correct) < 0 ? null
      : `${interactions[index].interactionId}:r${task.options.findIndex(option => option.correct) + 1}`,
  }));
  const projected = projectSinglePhraseRelease({ interactions, answers, locale: parsed.locale });
  for (const issue of singlePhraseReleaseIssues(interactions, parsed.locale)) add("one_phrase", `${parsed.locale}: ${JSON.stringify(issue)}`);
  for (const issue of compositeGapReleaseIssues(interactions, parsed.locale)) add("one_phrase", `${parsed.locale}: ${JSON.stringify(issue)}`);
  for (const issue of dictationAudioTargetIssues(interactions, parsed.locale)) add("answer_keys", `${parsed.locale}: ${JSON.stringify(issue)}`);
  const introProjection = {
    pages: parsed.intro.map((page, index) => ({
      pageId: `intro-${index + 1}`,
      question: { choicesByLocale: { [parsed.locale]: page.options.map((option, choiceIndex) => ({ responseId: `r${choiceIndex + 1}`, text: option.text })) } },
    })),
  };
  for (const issue of singlePhraseIntroIssues(introProjection, parsed.locale)) add("one_phrase", `${parsed.locale}: ${JSON.stringify(issue)}`);
  return projected;
}

const ru = gitRef ? readGitSource(gitRef) : readSource(ruPath, "ru");
const uk = ukPath ? readSource(ukPath, "uk") : null;
let parsedRu = null;
let parsedUk = null;
if (ru !== null) {
  try { parsedRu = inspectLocale("ru", ru); }
  catch (error) { add("parse", `ru: ${error instanceof Error ? error.message : String(error)}`); }
}
if (uk !== null) {
  try { parsedUk = inspectLocale("uk", uk); }
  catch (error) { add("parse", `uk: ${error instanceof Error ? error.message : String(error)}`); }
}

const taskLocales = {};
for (const parsed of [parsedRu, parsedUk].filter(Boolean)) {
  for (const task of parsed.tasks) {
    (taskLocales[task.ordinal] ??= {})[parsed.locale] = task;
  }
}
let ruProjection = null;
let ukProjection = null;
if (parsedRu) {
  try { ruProjection = projectionIssues(parsedRu, taskLocales); }
  catch (error) { add("projection", `ru: ${error instanceof Error ? error.message : String(error)}`); }
}
if (parsedUk) {
  try { ukProjection = projectionIssues(parsedUk, taskLocales); }
  catch (error) { add("projection", `uk: ${error instanceof Error ? error.message : String(error)}`); }
}
if (parsedRu && parsedUk) {
  for (const issue of introFeedbackContractIssues({
    ru: { intro: parsedRu.intro },
    uk: { intro: parsedUk.intro },
  })) add("locale_parity", issue);
  const ruShape = parsedRu.tasks.map((task) => `${task.ordinal}:${task.family}`);
  const ukShape = parsedUk.tasks.map((task) => `${task.ordinal}:${task.family}`);
  if (JSON.stringify(ruShape) !== JSON.stringify(ukShape)) add("locale_parity", `RU/UK расходятся по числу, порядку или типу заданий`);
  if (ruProjection && ukProjection) {
    for (const issue of feedbackLocaleParityIssues(
      { ru: ruProjection.interactions, uk: ukProjection.interactions },
      { answers: ruProjection.answers },
    )) add("locale_parity", JSON.stringify(issue));
  }
}

// Older sessions still carry an atomic source. Reuse the builder's existing
// parity check so a Markdown PASS cannot conceal a different build input.
if (sessionDir && !explicitFile && !gitRef && parsedRu) {
  const atomicPath = path.join(sessionDir, "practice.atomic.json");
  if (fs.existsSync(atomicPath)) {
    try {
      const sessionId = `${sessionIdentity.slice(0, 2)}:lesson-${sessionIdentity.slice(4, 6)}:session-${sessionIdentity.slice(8, 10)}`;
      for (const issue of atomicMarkdownParityIssues({
        sessionIdentity, sessionId,
        atomicSource: JSON.parse(fs.readFileSync(atomicPath, "utf8")),
        tasksByLocale: { ru: parsedRu.tasks, ...(parsedUk ? { uk: parsedUk.tasks } : {}) },
      })) add("source_parity", issue);
    } catch (error) { add("source_parity", error.message); }
  }
}
const packet = loadApprovedPacket(sessionIdentity);
if (packet && parsedRu) {
  const expectedWords = normalizedList(packet.newWords);
  const actualWords = normalizedList(parsedRu.header.newWords);
  if (JSON.stringify(actualWords) !== JSON.stringify(expectedWords)) {
    add("plan", `новые слова не совпадают с пакетом: план [${packet.newWords.join(", ")}], текст [${parsedRu.header.newWords.join(", ")}]`);
  }
  const actualModes = parsedRu.tasks.map((task) => task.family === "word_card" ? "listen_choose" : task.family);
  if (JSON.stringify(actualModes) !== JSON.stringify(packet.activityModes)) {
    add("plan", `типы/число заданий не совпадают с пакетом: план ${packet.activityModes.length}, текст ${actualModes.length}`);
  }
  manual.push(`Грамматика пакета: ${packet.grammarOperationIds.join(", ")} — смысл формулировок проверяют ученик и носитель.`);
}
manual.push("Неверный английский, ложные утверждения и признаки ИИ нельзя надёжно доказать регулярными выражениями: обязательны два ручных просмотра по заданию владельца.");
manual.push("Аудио проверяется при выпуске главы, а не при авторской проверке Markdown.");

const grouped = new Map();
for (const problem of problems) {
  const items = grouped.get(problem.check) ?? [];
  items.push(problem);
  grouped.set(problem.check, items);
}
for (const [check, items] of grouped) {
  console.log(`FIX [${check}]`);
  for (const item of items) console.log(`  - ${item.message}`);
}
for (const note of manual) console.log(`MANUAL ${note}`);
console.log(problems.length ? `FIX (${problems.length})` : "PASS");
process.exitCode = problems.length ? 1 : 0;
