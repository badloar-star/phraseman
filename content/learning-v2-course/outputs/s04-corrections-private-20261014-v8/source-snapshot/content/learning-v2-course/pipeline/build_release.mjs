#!/usr/bin/env node
// Сборщик релиза: Markdown «как видит ученик» → JSON, который читает плеер.
//
// зачем: конвейер пишет человекочитаемый Markdown (владелец его вычитывает
// глазами), а приложение принимает строгий формат
// modules/learning-v2/runtime/course_session_client_children_v1.ts.
// Без этого моста ни одна написанная сессия не откроется на телефоне.
//
// Запуск:
//   node build_release.mjs --session en/l01/s04 [--locales ru,uk] [--out ../release]
//
// Логи: префикс [BUILD], каждый ранний выход и каждый catch пишет причину.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { scopedOwnerQualityRequired } from "./owner_quality.mjs";
import { progressionIssues } from "./progression_quality_gate.mjs";
import { CANONICAL_BINDING_SCHEMA_VERSION, progressionJudgeRequired, sessionReadiness } from "./session_readiness.mjs";
import { newWordDeclarationIssues, parseSessionHeader } from "./session_header.mjs";
import { assertSinglePhraseIntro, assertSinglePhraseSource, feedbackLocaleParityIssues, introPracticeTargetRepeatIssues, practiceTargetRepeatIssues, projectSinglePhraseRelease, scopedFamilyChoreographyIssues } from "./single_phrase_release.mjs";
import { writeMockupFile } from "./write_mockup_file.mjs";
import { applyPracticeExplanationsV1, projectIntroResponseAnalysesV1, projectIntroResponseDiagnosticsV1, validatePracticeExplanationsV1 } from "./practice_explanations_v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
function sharedVisibleTextModule(fromDirectory) {
  let current = fromDirectory;
  for (;;) {
    const candidate = path.join(current, "modules/learning-v2/content/learner_visible_text_v1.js");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) throw new Error("learning_v2_shared_visible_text_module_missing");
    current = parent;
  }
}
const { projectLearnerVisiblePromptV1 } = createRequire(import.meta.url)(sharedVisibleTextModule(HERE));
const ROOT = path.resolve(HERE, "..");
const LOG = (...a) => console.log("[BUILD]", ...a);
const WARN = (...a) => console.warn("[BUILD][WARN]", ...a);

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const SESSION = opt("session", null);
const LOCALES = opt("locales", "ru,uk").split(",").map((s) => s.trim()).filter(Boolean);
const DEFAULT_OUT = path.resolve(ROOT, "release");
const OUT_ARG = opt("out", "release");
const OUT = path.resolve(ROOT, OUT_ARG);
const MIGRATE_COMPOSITE_SOURCE = args.includes("--migration-composite-source");
const CHECK_SOURCE_RELEASE = args.includes("--check-source-release");
// A candidate projection is only a local preview. It must never mutate
// editable source status, even when it notices a stale status marker.
const CANDIDATE_PREVIEW = args.includes("--candidate-preview");

function actorClarityGate(scope) {
  const audit = spawnSync(process.execPath, [path.join(HERE, "audit_actor_clarity.mjs"), "--scope", scope], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (audit.error) return [`actor_clarity_audit_failed:${audit.error.message}`];
  if (audit.status === 0) return [];
  return String(audit.stderr || audit.stdout || "actor_clarity_audit_failed")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
}

const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);
const sha = (v) => crypto.createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(v)).digest("hex");

function resolvedDestinationPath(target) {
  let existingAncestor = path.resolve(target);
  const unresolvedTail = [];
  while (!exists(existingAncestor)) {
    const parent = path.dirname(existingAncestor);
    if (parent === existingAncestor) throw new Error(`cannot resolve output destination: ${target}`);
    unresolvedTail.unshift(path.basename(existingAncestor));
    existingAncestor = parent;
  }
  const realAncestor = fs.realpathSync.native
    ? fs.realpathSync.native(existingAncestor)
    : fs.realpathSync(existingAncestor);
  return path.resolve(realAncestor, ...unresolvedTail);
}

function sameFilesystemDestination(left, right) {
  const resolvedLeft = resolvedDestinationPath(left);
  const resolvedRight = resolvedDestinationPath(right);
  if (process.platform === "win32") return resolvedLeft.toLowerCase() === resolvedRight.toLowerCase();
  return resolvedLeft === resolvedRight;
}

// ---------- разбор Markdown ----------

/** Заголовок сессии: тема, операция, новые слова, сцена. */
export function parseHeader(md) {
  return parseSessionHeader(md);
}

function duplicateMarkedChoice(block) {
  const seen = new Set();
  for (const match of String(block ?? "").matchAll(/^-\s+[✅❌]\s*(.+)$/gmu)) {
    let text = match[1].trim();
    const feedback = /—\s*\*[\s\S]+?\*\s*$/u.exec(text);
    if (feedback) text = text.slice(0, feedback.index).trim();
    const key = text.replace(/^\*\*|\*\*$/gu, "").normalize("NFKC").toLocaleLowerCase("en-US").replace(/\s+/gu, " ").trim();
    if (!key) continue;
    if (seen.has(key)) return key;
    seen.add(key);
  }
  return null;
}

/** Три страницы интро: заголовок, тело, вопрос, варианты с разборами. */
export function parseIntro(md) {
  const pages = [];
  // зачем: ранние эталоны пишут «## Интро 1 · Понятие», поздние — «## Интро 1».
  // Локали пишут заголовок на своём языке («## Інтро 1» на украинском) — это
  // естественно для носителя, поэтому ловим любое написание слова «интро».
  const blocks = md.split(/^##\s*[ИІ]нтро\s*\d+[^\n]*$/mi).slice(1);
  for (const [i, raw] of blocks.entries()) {
    const section = raw.split(/^##\s+/m, 1)[0];
    const body = section.split(/^---\s*$/m)[0];
    const heading = /^###\s+(.+)$/m.exec(body)?.[1]?.trim() ?? "";
    // зачем: вопрос — жирный блок перед списком вариантов, и он часто занимает
    // две-три строки; однострочный поиск его терял (интро 1–2 уходили без вопроса)
    // зачем: вопрос — это ПОСЛЕДНИЙ абзац перед вариантами, целиком жирный.
    // Жирные вставки внутри объяснения («Формула: **I am + слово**») вопросом
    // не являются — иначе тело обрезается по ним (интро 2 сессии 1 теряло текст).
    const beforeOptions = body.split(/^-\s+[✅❌]/m)[0];
    const paras = beforeOptions.trimEnd().split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const last = paras[paras.length - 1] ?? "";
    const isQuestion = /^\*\*[\s\S]+\*\*$/.test(last);
    const question = isQuestion ? last.replace(/^\*\*|\*\*$/g, "").replace(/\s+/g, " ").trim() : "";
    if (!isQuestion) WARN(`интро ${i + 1}: последний абзац не похож на вопрос — «${last.slice(0, 50)}»`);
    const bodyParas = (isQuestion ? paras.slice(0, -1) : paras)
      .filter((p) => p !== `### ${heading}` && !p.startsWith("###") && !/^[-*]\s/.test(p));
    // зачем (владелец, 03.09): «тексты на другом языке должны сразу писаться
    // другого цвета». В Markdown целевой язык размечен обратными кавычками —
    // сохраняем разметку как есть, макет и приложение красят её акцентом.
    const text = bodyParas.join("\n\n");
    const duplicateChoice = duplicateMarkedChoice(body);
    if (duplicateChoice) throw new Error(`intro_choice_duplicate:page=${i + 1}:choice=${duplicateChoice}`);
    const options = parseOptions(body);
    if (!options.length) WARN(`интро ${i + 1}: не найдено вариантов ответа`);
    pages.push({ kind: ["concept", "formula", "trap"][i] ?? "tip", heading, text, question, options });
  }
  return pages;
}

function requestedIntroQuestionIssues(perLocale, requestedLocales) {
  const issues = [];
  for (const locale of requestedLocales) {
    if (locale !== "ru" && locale !== "uk") continue;
    for (let pageIndex = 0; pageIndex < 3; pageIndex += 1) {
      if (!String(perLocale?.[locale]?.intro?.[pageIndex]?.question ?? "").trim()) {
        issues.push(`intro_question_missing:${SESSION}:${locale}:page=${pageIndex + 1}`);
      }
    }
  }
  return issues;
}

export function introFeedbackContractIssues(perLocale) {
  const requiredLocales = ["ru", "uk"];
  for (const locale of requiredLocales) {
    if (!perLocale?.[locale]) return [`reason=locale_missing:locale=${locale}`];
  }
  const ruPages = perLocale.ru.intro ?? [];
  const ukPages = perLocale.uk.intro ?? [];
  if (ruPages.length !== ukPages.length) return [`reason=page_count:ru=${ruPages.length}:uk=${ukPages.length}`];

  const issues = [];
  for (let pageIndex = 0; pageIndex < ruPages.length; pageIndex += 1) {
    const page = pageIndex + 1;
    const ruOptions = ruPages[pageIndex]?.options ?? [];
    const ukOptions = ukPages[pageIndex]?.options ?? [];
    if (ruOptions.length !== ukOptions.length) {
      issues.push(`page=${page}:reason=option_count:ru=${ruOptions.length}:uk=${ukOptions.length}`);
      continue;
    }
    const correctIndexes = Object.fromEntries(requiredLocales.map((locale) => [
      locale,
      (perLocale[locale].intro[pageIndex]?.options ?? []).flatMap((option, index) => option.correct ? [index] : []),
    ]));
    if (correctIndexes.ru.length !== 1 || correctIndexes.uk.length !== 1 || correctIndexes.ru[0] !== correctIndexes.uk[0]) {
      issues.push(`page=${page}:reason=correct_index:ru=${correctIndexes.ru.join(",") || "missing"}:uk=${correctIndexes.uk.join(",") || "missing"}`);
      continue;
    }
    const orderMismatch = ruOptions.findIndex((option, index) => option.text !== ukOptions[index]?.text);
    if (orderMismatch >= 0) {
      issues.push(`page=${page}:reason=option_order:index=${orderMismatch}:ru=${JSON.stringify(ruOptions[orderMismatch]?.text)}:uk=${JSON.stringify(ukOptions[orderMismatch]?.text)}`);
      continue;
    }
    for (const locale of requiredLocales) {
      const options = perLocale[locale].intro[pageIndex]?.options ?? [];
      for (const [index, option] of options.entries()) {
        if (option.correct) continue;
        if (!String(option.feedback ?? "").trim()) {
          issues.push(`page=${page}:reason=feedback_missing:locale=${locale}:index=${index}`);
        }
      }
    }
  }
  return issues;
}

/** Варианты ответа. Два формата, оба живут в эталонах:
 *  интро — «- ✅ **текст**» / «- ❌ текст — *разбор*»;
 *  практика — строка «→ **верный** · ловушка · ловушка», а под ней список
 *  «- ловушка — *разбор*» без значков. */
function parseOptions(block) {
  const out = [];
  const seen = new Set();
  const add = (text, correct, feedback) => {
    const t = text.replace(/^\*\*|\*\*$/g, "").replace(/\s*—\s*$/, "").trim();
    if (!t || seen.has(t.toLowerCase())) return;
    seen.add(t.toLowerCase());
    out.push({ text: t, correct, feedback });
  };

  // 1) строка выбора: «→ **верный** · ловушка · ловушка»
  const choiceLine = /→\s*\*\*([^*]+)\*\*((?:\s*·\s*[^\n]+)+)/.exec(block);
  if (choiceLine) {
    add(choiceLine[1], true, "");
    for (const alt of choiceLine[2].split("·").map((s) => s.trim()).filter(Boolean)) add(alt, false, "");
  }
  // 1b) sound_contrast: варианты ПЕРЕД стрелкой — «*right · wrong* → **wrong**»
  const contrastLine = /^\*?([^*\n]+·[^*\n]+?)\*?\s*→\s*\*\*([^*]+)\*\*/m.exec(block);
  if (contrastLine && !choiceLine) {
    const correct = contrastLine[2].trim();
    for (const alt of contrastLine[1].split("·").map((s) => s.replace(/[*_`]/g, "").trim()).filter(Boolean)) {
      add(alt, alt.toLowerCase() === correct.toLowerCase(), "");
    }
  }

  // 1c) compact authoring form: the first declared option is correct. Seed
  // the authored order before attaching the response-specific feedback below.
  const declaredOptions = /^(?:Варианты|Варіанти):\s*(.+)$/mi.exec(block)?.[1] ?? "";
  for (const [index, rawOption] of declaredOptions.split("·").map((item) => item.trim()).filter(Boolean).entries()) {
    const fence = rawOption.startsWith("``") && rawOption.endsWith("``") ? 2
      : rawOption.startsWith("`") && rawOption.endsWith("`") ? 1 : 0;
    add(fence ? rawOption.slice(fence, -fence).trim() : rawOption, index === 0, "");
  }

  // 2) список разборов. Пункт может переноситься на следующие строки —
  //    склеиваем до следующего «- » или пустой строки, иначе разбор теряется.
  const glued = block.replace(/\r?\n(?![ \t]*(?:-\s|\*\*\d))[ \t]+(?=\S)/gu, " ");
  for (const m of glued.matchAll(/^-\s+(✅|❌)?\s*(.+)$/gm)) {
    const marked = m[1];
    let rest = m[2].trim();
    if (/^\*[^*]/.test(rest) && !/—/.test(rest)) continue; // подсказка курсивом, не вариант
    const fb = /—\s*\*([\s\S]+?)\*\s*$/.exec(rest);
    const feedback = fb ? fb[1].replace(/\s+/g, " ").trim() : "";
    if (fb) rest = rest.slice(0, fb.index).trim();
    const text = rest.replace(/^\*\*|\*\*$/g, "").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    const existing = out.find((o) => o.text.toLowerCase() === key);
    if (existing) { if (feedback && !existing.feedback) existing.feedback = feedback; continue; }
    // без значка и без разбора — это не вариант, а строка сцены
    if (!marked && !feedback) continue;
    add(text, marked === "✅", feedback);
  }
  return out;
}

/** Механика по названию задания — запасной путь для сессий без строки modes. */
function familyFromTitle(title) {
  const t = title.toLowerCase();
  if (/карточка слова|картка слова/.test(t)) return "word_card";
  if (/послушайте и собер|послушайте и напиш|послухайте і склад|послухайте та склад/.test(t)) return "listen_build_dictation";
  if (/послушайте и выбер|что вы сейчас услышали|послухайте і вибер|послухайте та вибер/.test(t)) return "listen_choose";
  if (/различите звук|розрізніть звук/.test(t)) return "sound_contrast";
  if (/собери(те)? фразу|собери(те)? без подсказк|соберите|склад(іть|и) фразу|склад(іть|и) без підказ/.test(t)) return "phrase_builder";
  if (/вставьте (слово|скрепку)|вставьте|встав(те|ити) (слово|скріпку)|вставте/.test(t)) return "context_gap_grammar";
  if (/соедините пары|speed match|з.єднайте пари/.test(t)) return "speed_match";
  if (/скажите вслух|скажите три|скажите пять|произнесите (?:слово|фразу)|финал сцены|ответьте|скажіть уголос|скажіть три|скажіть п.ять|промовте (?:слово|фразу)|фінал сцени|відповідайте/.test(t)) return "scripted_repeat_compare";
  return null;
}

/** Механика по содержимому — последний запасной путь: заголовок бывает
 * сюжетным («Вспомните начало дня»), а форма задания видна по разметке. */
function familyFromBody(body) {
  if (/___/.test(body)) return "context_gap_grammar";
  // плитки пишут и как «Плитки: `a` `b`», и как «Соберите: `a` `b`»
  if (/(Плитки|Соберите|Складіть|Склади):[^\n]*`/.test(body)) return /🔊/.test(body) ? "listen_build_dictation" : "phrase_builder";
  if (/🎙/.test(body)) return "scripted_repeat_compare";
  if (/🔊/.test(body)) return "listen_choose";
  if (/·/.test(body) && /—/.test(body)) return "speed_match";
  return null;
}

function immediateTaskAnnotation(body) {
  const match = /^\s*<!--\s*([\s\S]*?)\s*-->/u.exec(body);
  if (!match) return new Map();
  return new Map([...match[1].matchAll(/([a-z_]+)\s*:\s*([^;]+?)(?=\s*;|\s*$)/gu)]
    .map(([, key, value]) => [key, value.trim()]));
}

/** Задания практики: номер, тип из «## Для сборщика», содержимое. */
export function parsePractice(md) {
  const modesLine = /^modes:\s*([\s\S]*?)(?:\n\s*\n|$)/m.exec(md)?.[1] ?? "";
  const modes = new Map([...modesLine.matchAll(/(\d+)\s*=\s*([a-z_]+)/g)].map((m) => [Number(m[1]), m[2]]));
  // зачем: заголовок практики локаль пишет на своём языке. Раздел «Для
  // сборщика» служебный и по контракту остаётся неизменным, поэтому границы
  // берём по нему: всё между третьим интро и служебным блоком — практика.
  const afterIntro = md.split(/^##\s*[ИІ]нтро\s*3[^\n]*$/mi)[1] ?? md;
  const practicePart = (afterIntro.split(/^##\s+(?!Для сборщика)/m)[1] ?? afterIntro).split(/^## Для сборщика/m)[0] ?? "";
  const chunks = practicePart.split(/^\*\*(?=\d+ · )/m).slice(1);
  const tasks = [];
  for (const chunk of chunks) {
    const head = /^(\d+) · ([^*]+)\*\*/.exec(chunk);
    if (!head) { WARN(`задание без заголовка: ${chunk.slice(0, 60)}`); continue; }
    const ordinal = Number(head[1]);
    // зачем: эталоны 1–3 написаны руками до появления раздела «Для сборщика».
    // Механику выводим из названия задания — оно у нас всегда называет действие.
    const bodyForFamily = chunk.slice(head[0].length);
    const annotation = immediateTaskAnnotation(bodyForFamily);
    const family = annotation.get("family") ?? modes.get(ordinal) ?? familyFromTitle(head[2]) ?? familyFromBody(bodyForFamily);
    if (!family) { WARN(`задание ${ordinal}: механика не определена ни строкой modes, ни названием «${head[2].trim()}»`); continue; }
    const bodyText = chunk.slice(head[0].length);
    // An ID annotation belongs to the task only when it is immediately under
    // that task heading. A later annotation is the next task's metadata and
    // must never be attached backwards.
    const interactionId = annotation.get("interaction_id") ?? "";
    const declaredPurpose = annotation.get("purpose");
    if (declaredPurpose) {
      const allowedPurposes = new Set(["supported_practice", "guided_practice", "retrieval_practice", "independent_check"]);
      if (!allowedPurposes.has(declaredPurpose)) throw new Error(`Unsupported authored purpose: ${declaredPurpose}`);
    }
    const title = head[2].trim();
    const parts = parseTaskParts(bodyText);
    let options = parseOptions(bodyText);
    if (family === "sound_contrast" && !options.length) {
      const contrast = /—\s*([^/—]+?)\s*\/\s*([^/—]+)\s*$/u.exec(title);
      if (contrast) options = [contrast[1], contrast[2]].map((text) => ({ text: text.trim(), correct: false, feedback: "" }));
    }
    tasks.push({ ordinal, title, family, interactionId, purpose: declaredPurpose, body: bodyText, options, ...parts });
  }
  return tasks;
}

/** Части задания: цель, плитки, аудио, пары, определение карточки. */
function parseTaskParts(body) {
  const parts = {};
  const declaredTarget = /^(?:Цель|Ціль):\s*`([^`]+)`/mi.exec(body)?.[1]?.trim();
  if (declaredTarget) parts.target = declaredTarget;
  const visibleCondition = /^(?:Условие|Умова):\s*([^\r\n]+)/mi.exec(body)?.[1]?.trim();
  if (visibleCondition) parts.condition = visibleCondition;
  const bodyLines = body.split(/\r?\n/u);
  const taskLineIndex = bodyLines.findIndex((line) =>
    /___|→|🔊|🎙/u.test(line)
    || /^(?:Плитки|Соберите|Складіть|Склади|Пары|Пари):/iu.test(line.trim())
    || /^>\s*\*\*/u.test(line.trim()));
  const guidanceLines = bodyLines.slice(0, taskLineIndex < 0 ? bodyLines.length : taskLineIndex)
    .map((line) => line.trim())
    .filter((line) => line
      && !/^<!--[\s\S]*-->$/u.test(line)
      && !/^#{1,6}\s/u.test(line)
      && !/^[-*]\s/u.test(line)
      && !/^\*\*(?:\d+\s*·|[^*]+:)\*\*/u.test(line)
      && !/^(?:Цель|Ціль|Варианты|Варіанти|Значения вариантов|Значення варіантів|Плитки|Соберите|Складіть|Склади|Пары|Пари|modes):/iu.test(line))
    .map((line) => line.replace(/^(?:Условие|Умова):\s*/iu, "").trim());
  if (guidanceLines.length) parts.visibleGuidance = guidanceLines.join(" ").replace(/\s+/gu, " ").trim();
  const optionMeaningsLine = /^(?:Значения вариантов|Значення варіантів):\s*(.+)$/mi.exec(body)?.[1];
  if (optionMeaningsLine) {
    parts.optionMeanings = Object.fromEntries(optionMeaningsLine.split(/[·;]/u).map((entry) => {
      const divider = entry.indexOf("—");
      if (divider < 0) return null;
      const target = entry.slice(0, divider).replace(/[*_`]/g, "").trim();
      const meaning = entry.slice(divider + 1).replace(/[*_`]/g, "").trim();
      return target && meaning ? [target, meaning] : null;
    }).filter(Boolean));
  }
  // цель: последняя жирная фраза после стрелки, либо жирная строка целиком
  const arrow = [...body.matchAll(/→\s*\*\*(.+?)\*\*/g)].map((m) => m[1].trim());
  if (arrow.length) parts.target = arrow[arrow.length - 1];
  const tiles = /(?:Плитки|Соберите|Складіть|Склади):\s*(.+)/.exec(body);
  if (tiles) parts.tokens = [...tiles[1].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const audio = /🔊\s*\*([^*]+)\*/.exec(body);
  if (audio) parts.audio = audio[1].trim();
  const completionFeedback = /^\*((?:Верно|Правильно):\s*[^*]+)\*\s*$/mu.exec(body);
  if (completionFeedback) parts.completionFeedback = completionFeedback[1].trim();
  // голос: жирная фраза после 🎙 может стоять на следующей строке и содержать
  // несколько предложений подряд (финал сцены) — берём весь жирный блок
  // окно 600: описание финала сцены бывает 250+ знаков до жирной фразы
  const speak = /🎙[\s\S]{0,600}?\*\*([\s\S]+?)\*\*/.exec(body);
  if (speak) parts.speak = speak[1].replace(/\s+/g, " ").trim();
  const card = /^>\s*\*\*([^*]+)\*\*\s*—\s*([\s\S]+)$/m.exec(body);
  if (card) parts.card = { word: card[1].trim(), definition: card[2].replace(/^>\s*/gm, "").replace(/\s+/g, " ").trim() };
  // пары speed_match: «слово — перевод · слово — перевод»
  if (/·/.test(body) && /—/.test(body)) {
    const line = body.split("\n").find((l) => (l.match(/·/g) || []).length >= 2 && /—/.test(l));
    if (line) parts.pairs = line.split("·").map((p) => {
      const [rawTarget, m] = p.split("—").map((s) => s.replace(/[*_`]/g, "").trim());
      const t = rawTarget.replace(/^(?:Пары|Пари):\s*/iu, "").trim();
      return t && m ? { target: t, meaning: m } : null;
    }).filter(Boolean);
  }
  // сцена/реплика собеседника
  const cue = /🗣[^*]*\*\*«?([^»*]+)»?\.?\*\*/.exec(body);
  if (cue) parts.cue = cue[1].trim();
  return parts;
}

// ---------- сборка формата приложения ----------

const PURPOSE_BY_INDEX = (i, total) =>
  i < total * 0.3 ? "supported_practice" : i < total * 0.6 ? "guided_practice" : i < total * 0.8 ? "retrieval_practice" : "independent_check";

const INPUT_MODE = {
  phrase_builder: "ordered_tokens",
  listen_build_dictation: "ordered_tokens",
  listen_choose: "single_choice",
  context_gap_grammar: "single_choice",
  sound_contrast: "single_choice",
  speed_match: "pair_grid",
  scripted_repeat_compare: "tap_record_compare",
  word_card: "single_choice",
};

const localized = (byLocale) => Object.fromEntries(LOCALES.map((l) => [l, byLocale[l] ?? byLocale.ru ?? ""]));
const normalizeRuntimePurpose = (interaction) => interaction?.purpose === "independent_final"
  ? { ...interaction, purpose: "independent_check" }
  : interaction;

function learnerPromptForValues({ title, family, correctText, isWordCard }) {
  return projectLearnerVisiblePromptV1({ title, family, correctText, isWordCard });
}

function learnerPromptForTask(task) {
  return learnerPromptForValues({
    title: task.title,
    family: task.family,
    correctText: task.options.find((o) => o.correct)?.text ?? task.target ?? task.card?.word ?? "",
    isWordCard: Boolean(task.card),
  });
}

function localizedLearnerPromptForTask(task, perLocale) {
  const correctOptionIndex = task.options.findIndex((option) => option.correct);
  return localized(Object.fromEntries(LOCALES.map((locale) => {
    const localeTask = perLocale[locale] ?? {};
    return [locale, learnerPromptForValues({
      title: localeTask.title ?? task.title,
      family: task.family,
      correctText: localeTask.options?.[correctOptionIndex]?.text ?? task.options[correctOptionIndex]?.text ?? task.target ?? task.card?.word ?? "",
      isWordCard: Boolean(task.card),
    })];
  })));
}

function orderedTokensForTask(task) {
  const words = (task.target ?? "").replace(/[.?!]$/, "").split(/\s+/).filter(Boolean);
  const normalize = (word) => word.replace(/[.,?!;:]+$/, "").toLowerCase();
  const chunks = (task.tokens ?? []).map((token) => token.trim().split(/\s+/))
    .filter((chunk) => chunk.length > 1).sort((a, b) => b.length - a.length);
  const ordered = [];
  for (let position = 0; position < words.length;) {
    const chunk = chunks.find((candidate) => candidate.every((word, offset) =>
      words[position + offset] !== undefined && normalize(word) === normalize(words[position + offset])));
    const count = chunk?.length ?? 1;
    ordered.push(words.slice(position, position + count).join(" "));
    position += count;
  }
  return ordered;
}

function authoredDistractorsForTask(task, ordered) {
  const normalize = (token) => token.trim().split(/\s+/).map((word) => word.replace(/[.,?!;:]+$/, "").toLowerCase()).join(" ");
  const remaining = new Map();
  for (const token of ordered) {
    const key = normalize(token);
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  return (task.tokens ?? []).filter((token) => {
    const key = normalize(token);
    const count = remaining.get(key) ?? 0;
    if (!count) return true;
    remaining.set(key, count - 1);
    return false;
  });
}

// A builder's wrong choice is a physical tile, not a response option.  Authors
// state its explanation alongside the tile list; preserve occurrence order so
// repeated distractor text still receives distinct d1/d2 identities.
export function slotFeedbackForTask(task, perLocale, sessionId, ordered) {
  const distractors = authoredDistractorsForTask(task, ordered);
  const normalize = (value) => String(value ?? "").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en");
  const annotationQueues = Object.fromEntries(LOCALES.map((locale) => {
    const body = String(perLocale[locale]?.body ?? "");
    const rows = [...body.matchAll(/\*?\(?\s*плитка\s+`([^`]+)`\s+(?:лишняя|зайва)\s*:\s*([^*\r\n)]+)\s*\)?\*?/giu)]
      .map((match) => ({ token: match[1], feedback: match[2].trim() }));
    return [locale, rows];
  }));
  const id = task.interactionId || `${sessionId}:i${String(task.ordinal).padStart(2, "0")}`;
  return distractors.map((token, index) => ({
    responseId: `${id}:tile:d${index + 1}`,
    correct: false,
    testedDimension: task.title,
    feedbackByLocale: localized(Object.fromEntries(LOCALES.map((locale) => {
      const annotation = annotationQueues[locale].shift();
      return [locale, annotation && normalize(annotation.token) === normalize(token) ? annotation.feedback : ""];
    }))),
  }));
}

function normalizedTokenSurface(value) {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function atomicTokensReconstructTarget(target, orderedTokens) {
  if (!Array.isArray(orderedTokens) || !orderedTokens.length || orderedTokens.some((token) => !normalizedTokenSurface(token))) return false;
  const normalizeTarget = (value) => normalizedTokenSurface(value).replace(/[.?!]+$/u, "");
  return normalizeTarget(orderedTokens.join(" ")) === normalizeTarget(target);
}

function validAtomicDistractors(distractors) {
  return Array.isArray(distractors) && distractors.every((token) => normalizedTokenSurface(token).length > 0);
}

function declaredTilesCoverOrdered(declaredTokens, orderedTokens) {
  if (!Array.isArray(declaredTokens)) return false;
  const normalize = (token) => normalizedTokenSurface(token)
    .split(" ")
    .map((word) => word.replace(/[.,?!;:]+$/u, "").toLocaleLowerCase("en"))
    .join(" ");
  const remaining = declaredTokens.map((token) => ({ key: normalize(token), used: false }));
  return orderedTokens.every((ordered) => {
    const index = remaining.findIndex((entry) => !entry.used && entry.key === normalize(ordered));
    if (index < 0) return false;
    remaining[index].used = true;
    return true;
  });
}

export function buildInteraction(task, perLocale, sessionId, index, total) {
  // Авторский ID обязателен для исторически расщеплённых реплик: порядковый
  // номер задания меняется при восстановлении, но ID ответа и аудио — нет.
  const id = task.interactionId || `${sessionId}:i${String(task.ordinal).padStart(2, "0")}`;
  // зачем: карточка нового слова — не выбор, а показ. В формате плеера своего
  // семейства для неё нет, поэтому идёт как listen_choose с единственным
  // «вариантом» — самим словом; макет и приложение узнают её по cardByLocale.
  const family = task.family === "word_card" ? "listen_choose" : task.family;
  const loc = (field) => localized(Object.fromEntries(LOCALES.map((l) => [l, perLocale[l]?.[field] ?? ""])));
  // One projection owns every learner-visible copy of an authored task title.
  // This prevents a fallback scene from disclosing an answer that prompt and
  // accessibilityLabel have correctly removed.
  const learnerPrompt = learnerPromptForTask(task);
  const localizedLearnerPrompt = localizedLearnerPromptForTask(task, perLocale);

  // IDs use positions in the full option list, including the correct answer.
  const feedback = task.options.flatMap((o, i) => o.correct ? [] : [{
    responseId: `${id}:r${i + 1}`,
    correct: false,
    testedDimension: task.title,
    feedbackByLocale: localized(Object.fromEntries(LOCALES.map((l) => {
      const alt = perLocale[l]?.options?.[i];
      return [l, alt?.feedback ?? o.feedback];
    }))),
  }]);

  const responseOptions = task.options.map((o, i) => ({ responseId: `${id}:r${i + 1}`, text: o.text }));

  let modePayload = null;
  if (family === "phrase_builder") {
    const ordered = orderedTokensForTask(task);
    modePayload = {
      family, targetPhrase: task.target ?? task.speak ?? "",
      localizedMeaning: loc("title"),
      orderedTokens: ordered,
      authoredDistractorTokens: authoredDistractorsForTask(task, ordered),
      slotFeedback: slotFeedbackForTask(task, perLocale, sessionId, ordered),
      completionFeedbackByLocale: loc("completionFeedback"),
    };
  } else if (family === "listen_choose") {
    const cardByLocale = task.card
      ? localized(Object.fromEntries(LOCALES.map((l) => [l, perLocale[l]?.card?.definition ?? task.card.definition])))
      : null;
    modePayload = {
      family,
      referenceAudio: task.audio || task.card ? { audioTargetId: `${id}:audio`, transcript: task.audio ?? task.card.word } : null,
      slowReferenceAudio: null,
      localizedMeaningChoices: task.card
        ? [{ responseId: `${id}:r1`, targetText: task.card.word, meaningByLocale: cardByLocale }]
        : responseOptions.map((r, optionIndex) => {
          // У локализованного listen_choose видимые варианты могут быть переведены
          // (например, «Это чашка» / «Це чашка»). Значения связываются позицией
          // ответа, а не русским текстом варианта.
          const authoredMeanings = Object.fromEntries(LOCALES.map((l) => {
            const localizedOption = perLocale[l]?.options?.[optionIndex]?.text ?? r.text;
            return [l, perLocale[l]?.optionMeanings?.[localizedOption] ?? ""];
          }));
          const hasAuthoredMeaning = Object.values(authoredMeanings).some((value) => value.trim().length > 0);
          return { responseId: r.responseId, targetText: r.text, meaningByLocale: hasAuthoredMeaning ? localized(authoredMeanings) : null };
        }),
      transcriptRevealPolicy: "after_first_attempt",
      choiceFeedback: feedback,
      // карточка слова: показ, а не выбор
      isWordCard: !!task.card,
      wordCard: task.card ? { word: task.card.word, definitionByLocale: cardByLocale } : null,
    };
  } else if (family === "listen_build_dictation") {
    const ordered = orderedTokensForTask(task);
    modePayload = {
      family,
      referenceAudio: task.audio ? { audioTargetId: `${id}:audio`, transcript: task.audio } : null,
      slowReferenceAudio: null,
      hiddenTargetPhrase: task.target ?? task.audio ?? "",
      orderedTokens: ordered,
      authoredDistractorTokens: authoredDistractorsForTask(task, ordered),
      slotFeedback: slotFeedbackForTask(task, perLocale, sessionId, ordered),
      completionFeedbackByLocale: loc("completionFeedback"),
    };
  } else if (family === "context_gap_grammar") {
    modePayload = {
      family, localizedScene: task.visibleGuidance ? loc("visibleGuidance") : task.condition ? loc("condition") : localizedLearnerPrompt,
      // зачем: строка пропуска в Markdown несёт и варианты («I ___ wrong. →
      // **am** · not · is») — в payload должна попасть только сама фраза
      gappedTargetPhrase: (/^[^\r\n]*___[^\r\n]*/m.exec(task.body)?.[0] ?? "").split("→")[0].replace(/[*`]/g, "").trim(),
      gapOptions: responseOptions, testedDimension: task.title, choiceFeedback: feedback,
    };
  } else if (family === "sound_contrast") {
    // зачем: у sound_contrast два слова стоят в строке «*right · wrong* → **wrong**»,
    // а не парами «слово — перевод»; берём их из разобранных вариантов
    const words = task.options.map((o) => o.text);
    const [a, b] = words.length >= 2 ? words : [task.target ?? "", ""];
    modePayload = { family, contrastA: a, contrastB: b, ipaA: "", ipaB: "",
      audioA: a ? { audioTargetId: `${id}:audioA`, transcript: a } : null,
      audioB: b ? { audioTargetId: `${id}:audioB`, transcript: b } : null,
      testedPhoneticContrast: task.title, choiceFeedback: feedback };
  } else if (family === "speed_match") {
    const pairs = (task.pairs ?? []).map((p, i) => ({ pairId: `${id}:p${i + 1}`, target: p.target, meaningByLocale: localized(Object.fromEntries(LOCALES.map((l) => [l, perLocale[l]?.pairs?.[i]?.meaning ?? p.meaning]))) }));
    modePayload = {
      family, pairGrid: pairs,
      leftColumn: pairs.map((p) => p.target),
      rightColumn: pairs.map((p) => p.meaningByLocale.ru ?? p.target),
      pairingKey: "pair_id",
      timerPolicy: { enabledByDefault: true, learnerCanDisable: true, pausesOnInterruption: true },
      finishStats: ["speed", "accuracy", "personal_best"],
    };
  } else if (family === "scripted_repeat_compare") {
    modePayload = {
      family, referenceAudio: task.speak ? { audioTargetId: `${id}:audio`, transcript: task.speak } : null,
      slowReferenceAudio: null, targetPhrase: task.speak ?? task.target ?? "",
      recordControlPolicy: "hold_press_release_with_accessible_toggle",
      modelPlayback: "reference_and_slow", learnerPlayback: "available_after_capture",
      honestOutcomeStates: ["PASS_CONFIDENT", "NEEDS_WORK_CONFIDENT", "UNCERTAIN", "INVALID_AUDIO_OR_SYSTEM"],
    };
  }

  if ((task.visibleGuidance || task.condition) && modePayload && !modePayload.localizedScene) {
    modePayload.localizedScene = task.visibleGuidance ? loc("visibleGuidance") : loc("condition");
  }

  // зачем (владелец, 03.09: «почему задания уже сами дают ответ?»): автор
  // пишет заголовок «Послушайте и выберите — welcome», а welcome и есть
  // правильный ответ. В заголовке для ученика хвост « — <ответ>» срезаем.
  return {
    interactionId: id, ordinal: task.ordinal + 3, purpose: task.purpose ?? (family === "scripted_repeat_compare" ? "guided_practice" : PURPOSE_BY_INDEX(index, total)),
    family, inputMode: INPUT_MODE[task.family] ?? "single_choice",
    prompt: learnerPrompt, responseOptions,
    mediaIds: [],
    audioTargetIds: modePayload?.referenceAudio ? [`${id}:audio`]
      : [modePayload?.audioA?.audioTargetId, modePayload?.audioB?.audioTargetId].filter(Boolean),
    accessibilityLabel: learnerPrompt, modePayload, scriptedAlternate: null,
  };
}

export function firstMarkdownAtomicLearnerMismatch(task, interaction, locale, answer = undefined) {
  const payload = interaction?.modePayload ?? {};
  const visibleText = (value) => String(value ?? "").replace(/^`+|`+$/gu, "").replace(/\s+/gu, " ").trim();
  const visibleFeedbackText = (value) => visibleText(String(value ?? "")
    // Resolve every inline code span while both delimiters are still present.
    // Running visibleText first can consume only the leading fence of a raw
    // string such as "`Gate` … `garden`.", cross-pairing unrelated spans.
    .replace(/(`+)([^`\r\n]+)\1/gu, "$2"))
    .replace(/!\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
    .replace(/(\*\*|__|~~)([^\r\n]+?)\1/gu, "$2")
    .replace(/(^|[\s(])([*_])([^*_\r\n]+)\2(?=$|[\s).,!?;:])/gu, "$1$3")
    .replace(/\s+/gu, " ")
    .trim();
  const choiceFamilies = new Set(["listen_choose", "context_gap_grammar", "sound_contrast"]);
  if (task.purpose && task.purpose !== interaction?.purpose) return "purpose";
  const requiresChoiceBinding = choiceFamilies.has(task.family) && !task.card && !payload.isWordCard;
  const markdownOptions = (task.options ?? []).map((item, index) => choiceFamilies.has(task.family)
    ? { responseId: `${interaction?.interactionId}:r${index + 1}`, text: visibleText(item.text) }
    : visibleText(item.text));
  const atomicOptions = (interaction?.responseOptions ?? []).map((item) => choiceFamilies.has(task.family)
    ? { responseId: item.responseId, text: visibleText(item.text) }
    : visibleText(item.text));
  if (JSON.stringify(markdownOptions) !== JSON.stringify(atomicOptions)) return "responseOptions";
  let confirmedCorrectResponseId = null;
  if (requiresChoiceBinding) {
    const correctIndexes = (task.options ?? []).flatMap((option, index) => option.correct ? [index] : []);
    if (correctIndexes.length !== 1 || answer === undefined) return "answers.correctResponseId";
    const correctIndex = correctIndexes[0];
    const expectedCorrectResponseId = `${interaction?.interactionId}:r${correctIndex + 1}`;
    const expectedCorrectText = visibleText(task.options[correctIndex].text);
    if (answer?.correctResponseId !== expectedCorrectResponseId) return "answers.correctResponseId";
    if (locale === "ru" && visibleText(answer?.correctText) !== expectedCorrectText) return "answers.correctText";
    confirmedCorrectResponseId = expectedCorrectResponseId;
  }
  if (task.family === "phrase_builder") {
    if (visibleText(task.target) !== visibleText(payload.targetPhrase)) return "modePayload.targetPhrase";
    const ordered = orderedTokensForTask(task);
    if (Object.prototype.hasOwnProperty.call(task, "tokens")) {
      if (!declaredTilesCoverOrdered(task.tokens, ordered)) return "modePayload.declaredTiles";
      if (JSON.stringify(ordered) !== JSON.stringify(payload.orderedTokens ?? [])) return "modePayload.orderedTokens";
      if (JSON.stringify(authoredDistractorsForTask(task, ordered)) !== JSON.stringify(payload.authoredDistractorTokens ?? [])) return "modePayload.authoredDistractorTokens";
    } else {
      if (!atomicTokensReconstructTarget(task.target, payload.orderedTokens)) return "modePayload.orderedTokens";
      if (!validAtomicDistractors(payload.authoredDistractorTokens ?? [])) return "modePayload.authoredDistractorTokens";
    }
  }
  if (task.family === "listen_build_dictation") {
    const target = task.target ?? task.audio ?? "";
    if (visibleText(target) !== visibleText(payload.hiddenTargetPhrase)) return "modePayload.hiddenTargetPhrase";
    const audio = task.audio ?? task.target ?? "";
    if (visibleText(audio) !== visibleText(payload.referenceAudio?.transcript)) return "modePayload.referenceAudio.transcript";
    const ordered = orderedTokensForTask(task);
    if (Object.prototype.hasOwnProperty.call(task, "tokens")) {
      if (!declaredTilesCoverOrdered(task.tokens, ordered)) return "modePayload.declaredTiles";
      if (JSON.stringify(ordered) !== JSON.stringify(payload.orderedTokens ?? [])) return "modePayload.orderedTokens";
      if (JSON.stringify(authoredDistractorsForTask(task, ordered)) !== JSON.stringify(payload.authoredDistractorTokens ?? [])) return "modePayload.authoredDistractorTokens";
    } else {
      if (!atomicTokensReconstructTarget(target, payload.orderedTokens)) return "modePayload.orderedTokens";
      if (!validAtomicDistractors(payload.authoredDistractorTokens ?? [])) return "modePayload.authoredDistractorTokens";
    }
  }
  if (task.family === "listen_choose") {
    const target = task.audio ?? task.card?.word ?? task.target ?? "";
    if (visibleText(target) !== visibleText(payload.referenceAudio?.transcript)) return "modePayload.referenceAudio.transcript";
    // The player can render meaningByLocale instead of responseOptions. Keep
    // every visible label bidirectionally tied to the reviewed Markdown.
    if (!payload.isWordCard) {
      const expectedMeaningChoices = (task.options ?? []).map((option, index) => ({
        responseId: `${interaction.interactionId}:r${index + 1}`,
        targetText: visibleText(option.text),
        meaning: Object.prototype.hasOwnProperty.call(task.optionMeanings ?? {}, option.text)
          ? visibleText(task.optionMeanings[option.text])
          : null,
      }));
      const atomicMeaningChoices = (payload.localizedMeaningChoices ?? []).map((choice) => ({
        responseId: choice.responseId,
        targetText: visibleText(choice.targetText),
        meaning: choice.meaningByLocale === null || choice.meaningByLocale === undefined
          ? null
          : visibleText(choice.meaningByLocale?.[locale]),
      }));
      if (JSON.stringify(expectedMeaningChoices) !== JSON.stringify(atomicMeaningChoices)) {
        return "modePayload.localizedMeaningChoices";
      }
    } else if (task.card) {
      const expectedMeaningChoice = [{
        responseId: `${interaction.interactionId}:r1`,
        targetText: visibleText(task.card?.word),
        meaning: visibleFeedbackText(task.card?.definition),
      }];
      const atomicMeaningChoices = (payload.localizedMeaningChoices ?? []).map((choice) => ({
        responseId: choice.responseId,
        targetText: visibleText(choice.targetText),
        meaning: visibleFeedbackText(choice.meaningByLocale?.[locale]),
      }));
      if (JSON.stringify(expectedMeaningChoice) !== JSON.stringify(atomicMeaningChoices)) {
        return "modePayload.localizedMeaningChoices";
      }
      if (visibleText(payload.wordCard?.word) !== visibleText(task.card?.word)) return "modePayload.wordCard.word";
      if (visibleFeedbackText(payload.wordCard?.definitionByLocale?.[locale]) !== visibleFeedbackText(task.card?.definition)) {
        return "modePayload.wordCard.definitionByLocale";
      }
    }
  }
  if (task.family === "scripted_repeat_compare") {
    const target = task.speak ?? task.target ?? "";
    if (visibleText(target) !== visibleText(payload.targetPhrase)) return "modePayload.targetPhrase";
    if (visibleText(target) !== visibleText(payload.referenceAudio?.transcript)) return "modePayload.referenceAudio.transcript";
  }
  if (task.family === "context_gap_grammar") {
    const gap = task.target?.includes("___")
      ? task.target
      : (/^[^\r\n]*___[^\r\n]*/m.exec(task.body)?.[0] ?? "").split("→")[0].replace(/^(?:Цель|Ціль):\s*/iu, "").replace(/[*`]/g, "").trim();
    if (visibleText(gap) !== visibleText(payload.gappedTargetPhrase)) return "modePayload.gappedTargetPhrase";
    const expectedGapOptions = (task.options ?? []).map((option, index) => ({
      responseId: `${interaction.interactionId}:r${index + 1}`,
      text: visibleText(option.text),
    }));
    const actualGapOptions = (payload.gapOptions ?? []).map((option) => ({
      responseId: option.responseId,
      text: visibleText(option.text),
    }));
    if (JSON.stringify(expectedGapOptions) !== JSON.stringify(actualGapOptions)) return "modePayload.gapOptions";
    if (task.title && visibleText(payload.testedDimension) !== visibleText(task.title)) return "modePayload.testedDimension";
  }
  if (task.family === "sound_contrast") {
    const [contrastA = "", contrastB = ""] = (task.options ?? []).map((option) => visibleText(option.text));
    if (visibleText(payload.contrastA) !== contrastA) return "modePayload.contrastA";
    if (visibleText(payload.contrastB) !== contrastB) return "modePayload.contrastB";
    if (visibleText(payload.audioA?.transcript) !== contrastA) return "modePayload.audioA.transcript";
    if (visibleText(payload.audioB?.transcript) !== contrastB) return "modePayload.audioB.transcript";
    const expectedAudioA = `${interaction.interactionId}:audioA`;
    const expectedAudioB = `${interaction.interactionId}:audioB`;
    if (payload.audioA?.audioTargetId !== expectedAudioA) return "modePayload.audioA.audioTargetId";
    if (payload.audioB?.audioTargetId !== expectedAudioB) return "modePayload.audioB.audioTargetId";
    if (JSON.stringify(interaction.audioTargetIds ?? []) !== JSON.stringify([expectedAudioA, expectedAudioB])) return "audioTargetIds";
  }
  if (task.family === "speed_match") {
    const markdownPairs = (task.pairs ?? []).map((item) => ({ target: visibleText(item.target), meaning: visibleText(item.meaning) }));
    const atomicPairs = (payload.pairGrid ?? []).map((item) => ({ target: visibleText(item.target), meaning: visibleText(item.meaningByLocale?.[locale]) }));
    if (JSON.stringify(markdownPairs) !== JSON.stringify(atomicPairs)) return "modePayload.pairGrid";
  }
  // Only gap tasks project an explicit learner-facing scene. For a pair grid,
  // its pair line is content, not a scene; treating it as one creates a false
  // parity failure and hides a correctly verified card.
  const expectedScene = task.family === "context_gap_grammar"
    ? (task.visibleGuidance ?? task.condition ?? learnerPromptForTask(task))
    : null;
  if (expectedScene && visibleText(expectedScene) !== visibleText(payload.localizedScene?.[locale])) {
    return "modePayload.localizedScene";
  }
  if (new Set(["listen_choose", "context_gap_grammar", "sound_contrast"]).has(task.family) && !task.card) {
    const expectedFeedback = (task.options ?? []).flatMap((option, index) => option.correct || !visibleFeedbackText(option.feedback) ? [] : [{
      responseId: `${interaction.interactionId}:r${index + 1}`,
      correct: Boolean(option.correct),
      testedDimension: visibleText(task.title),
      text: visibleFeedbackText(option.feedback),
    }]);
    const rawFeedback = Array.isArray(payload.choiceFeedback) ? payload.choiceFeedback : [];
    if (confirmedCorrectResponseId && rawFeedback.filter((entry) => entry?.responseId === confirmedCorrectResponseId).length > 1) {
      return "modePayload.choiceFeedback";
    }
    const actualFeedback = rawFeedback
      // Historical sidecars may retain correct-answer analysis. It is not
      // learner feedback and may be ignored only after evaluator/source
      // correctness has been proven above by the stable response ID.
      .filter((entry) => entry?.responseId !== confirmedCorrectResponseId)
      .map((entry) => ({
      responseId: entry?.responseId,
      correct: Boolean(entry?.correct),
      testedDimension: visibleText(entry?.testedDimension),
      text: visibleFeedbackText(entry?.feedbackByLocale?.[locale]),
      }));
    if (JSON.stringify(expectedFeedback) !== JSON.stringify(actualFeedback)) return "modePayload.choiceFeedback";
  }
  if (new Set(["phrase_builder", "listen_build_dictation"]).has(task.family)) {
    const ordered = orderedTokensForTask(task);
    const distractors = authoredDistractorsForTask(task, ordered);
    const normalizeToken = (value) => String(value ?? "").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en");
    const annotations = [...String(task.body ?? "").matchAll(/\*?\(?\s*плитка\s+`([^`]+)`\s+(?:лишняя|зайва)\s*:\s*([^*\r\n)]+)\s*\)?\*?/giu)]
      .map((match) => ({ token: match[1], feedback: match[2].trim() }));
    // Older atomic packets sometimes repeated the tile surface at the start
    // of its own explanation (`busy — …`). It adds no learner meaning and is
    // equivalent to the source annotation that already names the tile.
    const normalizeSlotFeedback = (text, token) => visibleFeedbackText(text)
      .replace(new RegExp(`^${String(token).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\s*[—-]\\s*`, "u"), "")
      .replace(/[.]+$/u, "")
      .replace(/^./u, (letter) => letter.toLocaleLowerCase())
      .trim();
    const expectedSlotFeedback = distractors.flatMap((token, index) => {
      const annotation = annotations.shift();
      const text = annotation && normalizeToken(annotation.token) === normalizeToken(token)
        ? normalizeSlotFeedback(annotation.feedback, token)
        : "";
      return text ? [{
        responseId: `${interaction.interactionId}:tile:d${index + 1}`,
        correct: false,
        testedDimension: visibleText(task.title),
        text,
      }] : [];
    });
    const actualSlotFeedback = Array.isArray(payload.slotFeedback) ? payload.slotFeedback.flatMap((entry, index) => {
      const text = normalizeSlotFeedback(entry?.feedbackByLocale?.[locale], distractors[index] ?? "");
      return text ? [{
        responseId: entry?.responseId,
        correct: Boolean(entry?.correct),
        testedDimension: visibleText(entry?.testedDimension),
        text,
      }] : [];
    }) : [];
    if (JSON.stringify(expectedSlotFeedback) !== JSON.stringify(actualSlotFeedback)) return "modePayload.slotFeedback";
  }
  const markdownWord = task.card?.word ?? (payload.wordCard ? task.target : "");
  if (visibleText(markdownWord) !== visibleText(payload.wordCard?.word)) return "modePayload.wordCard.word";
  return null;
}

export function atomicMarkdownParityIssues({ sessionIdentity, sessionId, atomicSource, tasksByLocale }) {
  const issues = [];
  if (!atomicSource || atomicSource.schemaVersion !== "learning_v2_atomic_practice_source_v1" || atomicSource.courseSessionId !== sessionId) {
    issues.push(`atomic_source_contract:${sessionIdentity}`);
    return issues;
  }
  // A word card is rendered by the learner as a single-answer listen_choose
  // payload (with isWordCard=true). Markdown keeps the learner-facing name
  // "word_card". Compare the runtime family, otherwise a correct word card is
  // falsely reported as a source/release divergence.
  const runtimeFamily = (family) => family === "word_card" ? "listen_choose" : family;
  for (const [locale, tasks] of Object.entries(tasksByLocale ?? {})) {
    const interactions = atomicSource.interactionsByLocale?.[locale];
    const mismatch = !Array.isArray(interactions) || tasks.length !== interactions.length
      ? 0
      : tasks.findIndex((task, index) => {
        const expectedInteractionId = task.interactionId || `${sessionId}:i${String(task.ordinal).padStart(2, "0")}`;
        // The interaction builder deliberately removes an answer-bearing title
        // tail before it is shown to the learner. Compare the same projection
        // here, then retain strict equality for every other divergence.
        const expectedLearnerPrompt = learnerPromptForValues({
          title: task.title,
          family: task.family,
          correctText: task.options.find((option) => option.correct)?.text ?? task.target ?? task.card?.word ?? interactions[index]?.modePayload?.wordCard?.word ?? "",
          isWordCard: Boolean(task.card) || Boolean(interactions[index]?.modePayload?.isWordCard),
        });
        return task.ordinal !== index + 1 || expectedLearnerPrompt !== interactions[index]?.prompt ||
          expectedInteractionId !== interactions[index]?.interactionId || runtimeFamily(task.family) !== interactions[index]?.family;
      });
    if (mismatch >= 0) {
      const task = tasks[mismatch] ?? null;
      const interaction = interactions?.[mismatch] ?? null;
      issues.push(`atomic_markdown_parity:${sessionIdentity}:${locale}:index=${mismatch}:markdown=${JSON.stringify(task && { ordinal: task.ordinal, title: task.title, interactionId: task.interactionId, family: task.family })}:atomic=${JSON.stringify(interaction && { prompt: interaction.prompt, interactionId: interaction.interactionId, family: interaction.family })}`);
      continue;
    }
    const duplicateChoiceAnswer = interactions.find((interaction) => (
      interaction?.inputMode === "single_choice"
      && (interaction?.responseOptions ?? []).filter((option) => option?.responseId).length >= 2
      && answerRowsFor(atomicSource.answers, interaction.interactionId).length > 1
    ));
    if (duplicateChoiceAnswer) {
      issues.push(`atomic_answer_authority_duplicate:${sessionIdentity}:${duplicateChoiceAnswer.interactionId}`);
      continue;
    }
    const answerByInteractionId = new Map((atomicSource.answers ?? []).map((answer) => [answer.interactionId, answer]));
    for (const [index, task] of tasks.entries()) {
      const interaction = interactions[index];
      const field = firstMarkdownAtomicLearnerMismatch(task, interaction, locale, answerByInteractionId.get(interaction.interactionId) ?? null);
      if (field) {
        issues.push(`atomic_markdown_learner_parity:${sessionIdentity}:${locale}:index=${index}:field=${field}`);
        break;
      }
    }
  }
  return issues;
}

const RELEASE_SEMANTIC_PATHS_BY_FAMILY = Object.freeze({
  listen_choose: [
    "modePayload.referenceAudio.transcript",
    "modePayload.slowReferenceAudio.transcript",
    "modePayload.localizedMeaningChoices",
    "modePayload.wordCard.word",
    "modePayload.choiceFeedback",
  ],
  phrase_builder: [
    "modePayload.targetPhrase",
    "modePayload.orderedTokens",
    "modePayload.authoredDistractorTokens",
    "modePayload.slotFeedback",
  ],
  scripted_repeat_compare: [
    "modePayload.targetPhrase",
    "modePayload.referenceAudio.transcript",
  ],
  context_gap_grammar: [
    "modePayload.localizedScene",
    "modePayload.gappedTargetPhrase",
    "modePayload.gapOptions",
    "modePayload.testedDimension",
    "modePayload.choiceFeedback",
  ],
  listen_build_dictation: [
    "modePayload.hiddenTargetPhrase",
    "modePayload.referenceAudio.transcript",
    "modePayload.orderedTokens",
    "modePayload.authoredDistractorTokens",
    "modePayload.slotFeedback",
  ],
  speed_match: ["modePayload.pairGrid"],
  sound_contrast: [
    "modePayload.contrastA",
    "modePayload.contrastB",
    "modePayload.audioA.transcript",
    "modePayload.audioB.transcript",
    "modePayload.testedPhoneticContrast",
    "modePayload.choiceFeedback",
  ],
});

function valueAtPath(value, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => current?.[key], value);
}

function exactJsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function duplicateIds(rows) {
  const seen = new Set();
  const duplicates = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = row?.interactionId;
    if (typeof id !== "string" || !id) continue;
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates].sort();
}

function answerRowsFor(answers, interactionId) {
  return (answers ?? []).filter((answer) => answer?.interactionId === interactionId);
}

export function projectWrongOnlyChoiceFeedback(interactions, answers) {
  return (interactions ?? []).map((interaction) => {
    const responseIds = (interaction?.responseOptions ?? []).map((option) => option?.responseId).filter(Boolean);
    if (interaction?.inputMode !== "single_choice" || responseIds.length < 2) return interaction;
    const answerRows = answerRowsFor(answers, interaction.interactionId);
    if (!answerRows.length) {
      throw new Error(`wrong_only_feedback_projection_hold:${interaction.interactionId}:answer_missing`);
    }
    if (answerRows.length > 1) {
      throw new Error(`wrong_only_feedback_projection_hold:${interaction.interactionId}:answer_duplicate`);
    }
    const correctResponseId = answerRows[0]?.correctResponseId;
    if (!String(correctResponseId ?? "").trim() || !responseIds.includes(correctResponseId)) {
      throw new Error(`wrong_only_feedback_projection_hold:${interaction.interactionId}:correct_response_missing`);
    }
    if (!Array.isArray(interaction?.modePayload?.choiceFeedback)) return interaction;
    const correctFeedbackRows = interaction.modePayload.choiceFeedback.filter((row) => row?.responseId === correctResponseId);
    if (correctFeedbackRows.length > 1) {
      throw new Error(`wrong_only_feedback_projection_hold:${interaction.interactionId}:${correctResponseId}:choice_feedback_correct_duplicate`);
    }
    return {
      ...interaction,
      modePayload: {
        ...interaction.modePayload,
        choiceFeedback: interaction.modePayload.choiceFeedback.filter((row) => row?.responseId !== correctResponseId),
      },
    };
  });
}

function normalizedRawSourceFeedback(interactionsByLocale, answers) {
  const normalizedByLocale = {};
  const issues = [];
  for (const [locale, interactions] of Object.entries(interactionsByLocale ?? {})) {
    normalizedByLocale[locale] = (interactions ?? []).map((rawInteraction) => {
      const interaction = structuredClone(rawInteraction);
      const responseIds = (interaction?.responseOptions ?? []).map((option) => option?.responseId).filter(Boolean);
      if (interaction?.inputMode !== "single_choice" || responseIds.length < 2) return interaction;
      const answerRows = answerRowsFor(answers, interaction.interactionId);
      if (answerRows.length !== 1) return interaction;
      const correctResponseId = answerRows[0]?.correctResponseId;
      if (!String(correctResponseId ?? "").trim() || !responseIds.includes(correctResponseId)) return interaction;
      const feedbackRows = interaction?.modePayload?.choiceFeedback;
      if (!Array.isArray(feedbackRows)) return interaction;
      const correctIndexes = feedbackRows.flatMap((row, index) => row?.responseId === correctResponseId ? [index] : []);
      if (correctIndexes.length > 1) {
        issues.push({
          interactionId: interaction.interactionId,
          responseId: correctResponseId,
          projectionLocale: locale,
          reason: "choice_feedback_correct_duplicate",
        });
        return interaction;
      }
      if (correctIndexes.length === 1) feedbackRows.splice(correctIndexes[0], 1);
      return interaction;
    });
  }
  return { normalizedByLocale, issues };
}

/**
 * Compare the reviewed atomic/Markdown source with the checked-in learner
 * release.  Only explicit learner-facing schema fields are compared: this
 * deliberately does not invent equivalence between different exercise
 * families or infer a target from prose.
 */
export function sourceReleaseSemanticParityIssues({
  sessionIdentity,
  sessionId,
  atomicSource,
  practiceExplanationsSidecar = null,
  practiceExplanationsIssues = [],
  practiceExplanationsValidated = false,
  sourceIntroByLocale,
  sourceLearningOutcomeByLocale = {},
  releaseIntro,
  releaseAuxiliary,
  releaseLearnersByLocale,
  releaseAnswers,
  releaseIntroCorrectChoiceIndexes = null,
  locales = Object.keys(atomicSource?.interactionsByLocale ?? {}),
}) {
  const issue = (suffix) => `source_release_parity:${sessionIdentity}:${suffix}`;
  const issues = [];
  if (!atomicSource || atomicSource.schemaVersion !== "learning_v2_atomic_practice_source_v1" || atomicSource.courseSessionId !== sessionId) {
    issues.push(issue("atomic_source_contract"));
    return issues;
  }
  // `analysisV1` is authored in the separately validated explanations
  // sidecar, then deterministically materialized into the learner payload.
  // Compare that materialized source to the candidate: ignoring it would let
  // an altered learner explanation pass; comparing raw atomic JSON would
  // falsely reject the compiler's required projection.
  if (practiceExplanationsSidecar && !practiceExplanationsValidated) {
    issues.push(issue("practice_explanations_unvalidated"));
    return issues;
  }
  if (practiceExplanationsIssues.length) {
    issues.push(...practiceExplanationsIssues.map((detail) => issue(`practice_explanations_invalid:${detail}`)));
    return issues;
  }
  const semanticAtomicSource = practiceExplanationsSidecar
    ? applyPracticeExplanationsV1({ atomicSource, sidecar: practiceExplanationsSidecar })
    : atomicSource;
  if (releaseIntro?.courseSessionId !== sessionId) {
    issues.push(issue(`courseSessionId:source=${JSON.stringify(sessionId)}:release=${JSON.stringify(releaseIntro?.courseSessionId)}`));
  }

  for (const [locale, sourcePages] of Object.entries(sourceIntroByLocale ?? {})) {
    if (releaseIntro?.learningOutcomeByLocale?.[locale] !== sourceLearningOutcomeByLocale[locale]) {
      issues.push(issue(`intro:${locale}:learningOutcome:source=${JSON.stringify(sourceLearningOutcomeByLocale[locale])}:release=${JSON.stringify(releaseIntro?.learningOutcomeByLocale?.[locale])}`));
    }
    const releasePages = releaseIntro?.pages;
    if (!Array.isArray(releasePages)) {
      issues.push(issue(`intro:${locale}:release_pages_missing`));
      continue;
    }
    const pageCount = Math.max(sourcePages.length, releasePages.length);
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const sourcePage = sourcePages[pageIndex];
      const releasePage = releasePages[pageIndex];
      if (!sourcePage) {
        issues.push(issue(`intro:${locale}:page=${pageIndex + 1}:source_page_missing`));
        continue;
      }
      if (!releasePage) {
        issues.push(issue(`intro:${locale}:page=${pageIndex + 1}:release_page_missing`));
        continue;
      }
      const expectedPageId = `${sessionId}:intro${pageIndex + 1}`;
      if (releasePage.pageOrdinal !== pageIndex + 1) {
        issues.push(issue(`intro:${locale}:page=${pageIndex + 1}:pageOrdinal:source=${pageIndex + 1}:release=${JSON.stringify(releasePage.pageOrdinal)}`));
      }
      if (releasePage.pageId !== expectedPageId) {
        issues.push(issue(`intro:${locale}:page=${pageIndex + 1}:pageId:source=${JSON.stringify(expectedPageId)}:release=${JSON.stringify(releasePage.pageId)}`));
      }
      if (releasePage.kind !== sourcePage.kind) {
        issues.push(issue(`intro:${locale}:page=${pageIndex + 1}:kind:source=${JSON.stringify(sourcePage.kind)}:release=${JSON.stringify(releasePage.kind)}`));
      }
      if (releasePage?.titleByLocale?.[locale] !== sourcePage.heading) {
        issues.push(issue(`intro:${locale}:page=${pageIndex + 1}:title:source=${JSON.stringify(sourcePage.heading)}:release=${JSON.stringify(releasePage?.titleByLocale?.[locale])}`));
      }
      if (releasePage?.bodyByLocale?.[locale] !== sourcePage.text) {
        issues.push(issue(`intro:${locale}:page=${pageIndex + 1}:body:source=${JSON.stringify(sourcePage.text)}:release=${JSON.stringify(releasePage?.bodyByLocale?.[locale])}`));
      }
      if (releasePage?.question?.promptByLocale?.[locale] !== sourcePage.question) {
        issues.push(issue(`intro:${locale}:page=${pageIndex + 1}:question.prompt:source=${JSON.stringify(sourcePage.question)}:release=${JSON.stringify(releasePage?.question?.promptByLocale?.[locale])}`));
      }
      if (releasePage?.question?.accessibilityLabelByLocale?.[locale] !== sourcePage.question) {
        issues.push(issue(`intro:${locale}:page=${pageIndex + 1}:question.accessibilityLabel:source=${JSON.stringify(sourcePage.question)}:release=${JSON.stringify(releasePage?.question?.accessibilityLabelByLocale?.[locale])}`));
      }
      const expectedQuestionId = `${expectedPageId}:q`;
      if (releasePage?.question?.interactionId !== expectedQuestionId) {
        issues.push(issue(`intro:${locale}:page=${pageIndex + 1}:question.interactionId:source=${JSON.stringify(expectedQuestionId)}:release=${JSON.stringify(releasePage?.question?.interactionId)}`));
      }
      const sourceChoices = (sourcePage.options ?? []).map((option) => option.text);
      const releaseChoices = releasePage?.question?.choicesByLocale?.[locale];
      const releaseChoiceText = Array.isArray(releaseChoices) ? releaseChoices.map((option) => option?.text) : null;
      if (!exactJsonEqual(sourceChoices, releaseChoiceText)) {
        issues.push(issue(`intro:${locale}:page=${pageIndex + 1}:choices:source=${JSON.stringify(sourceChoices)}:release=${JSON.stringify(releaseChoiceText)}`));
      }
      const expectedResponseIds = sourceChoices.map((_, choiceIndex) => `${expectedPageId}:r${choiceIndex + 1}`);
      const releaseResponseIds = Array.isArray(releaseChoices) ? releaseChoices.map((option) => option?.responseId) : null;
      if (!exactJsonEqual(expectedResponseIds, releaseResponseIds)) {
        issues.push(issue(`intro:${locale}:page=${pageIndex + 1}:choices.responseIds:source=${JSON.stringify(expectedResponseIds)}:release=${JSON.stringify(releaseResponseIds)}`));
      }
      const sourceCorrectIndexes = (sourcePage.options ?? []).flatMap((option, choiceIndex) => option.correct ? [choiceIndex] : []);
      const explicitReleaseIndex = releasePage?.question?.correctChoiceIndex;
      const manifestIndex = Array.isArray(releaseIntroCorrectChoiceIndexes)
        ? releaseIntroCorrectChoiceIndexes[pageIndex]
        : undefined;
      const correctnessAuthorities = [
        ...(Number.isInteger(explicitReleaseIndex) ? [{ label: "release", value: explicitReleaseIndex }] : []),
        ...(Number.isInteger(manifestIndex) ? [{ label: "manifest", value: manifestIndex }] : []),
      ];
      for (const authority of correctnessAuthorities) {
        if (sourceCorrectIndexes.length !== 1 || sourceCorrectIndexes[0] !== authority.value) {
          const sourceCorrect = sourceCorrectIndexes.length === 1 ? sourceCorrectIndexes[0] : sourceCorrectIndexes;
          issues.push(issue(`intro:${locale}:page=${pageIndex + 1}:choices.correctIndex:source=${JSON.stringify(sourceCorrect)}:release=${authority.value}:authority=${authority.label}`));
        }
      }
    }
  }

  if (Array.isArray(practiceExplanationsSidecar?.introResponses)) {
    const expectedAnalyses = projectIntroResponseAnalysesV1(practiceExplanationsSidecar);
    const expectedDiagnostics = projectIntroResponseDiagnosticsV1(practiceExplanationsSidecar);
    const auxiliaryEntries = Array.isArray(releaseAuxiliary?.entries) ? releaseAuxiliary.entries : [];
    if (releaseAuxiliary?.courseSessionId !== sessionId) {
      issues.push(issue(`auxiliary:courseSessionId:source=${JSON.stringify(sessionId)}:release=${JSON.stringify(releaseAuxiliary?.courseSessionId)}`));
    }
    const auxiliaryByInteractionId = new Map(auxiliaryEntries.map((entry) => [entry?.interactionId, entry]));
    for (let pageIndex = 0; pageIndex < 3; pageIndex += 1) {
      const interactionId = `${sessionId}:intro${pageIndex + 1}:q`;
      const expectedById = Object.fromEntries(Object.entries(expectedAnalyses)
        .filter(([responseId]) => responseId.startsWith(`${sessionId}:intro${pageIndex + 1}:`)));
      const actualById = auxiliaryByInteractionId.get(interactionId)?.responseAnalysisById;
      if (!exactJsonEqual(expectedById, actualById)) {
        issues.push(issue(`auxiliary:${interactionId}:responseAnalysisById:source=${JSON.stringify(expectedById)}:release=${JSON.stringify(actualById)}`));
      }
      const expectedDiagnosticsById = Object.fromEntries(Object.entries(expectedDiagnostics)
        .filter(([responseId]) => responseId.startsWith(`${sessionId}:intro${pageIndex + 1}:`)));
      const actualDiagnosticsById = auxiliaryByInteractionId.get(interactionId)?.responseDiagnosticsById;
      if (!exactJsonEqual(expectedDiagnosticsById, actualDiagnosticsById)) {
        issues.push(issue(`auxiliary:${interactionId}:responseDiagnosticsById:source=${JSON.stringify(expectedDiagnosticsById)}:release=${JSON.stringify(actualDiagnosticsById)}`));
      }
    }
  }

  const rawSourceByLocale = {};
  const rawReleaseByLocale = {};
  const checkedReleaseAnswers = Array.isArray(releaseAnswers) ? releaseAnswers : [];
  let rawSourceMapComplete = true;
  for (const locale of locales) {
    const sourceInteractions = semanticAtomicSource.interactionsByLocale?.[locale];
    if (!Array.isArray(sourceInteractions)) {
      issues.push(issue(`practice:${locale}:source_interactions_missing`));
      rawSourceMapComplete = false;
      rawSourceByLocale[locale] = [];
    } else {
      rawSourceByLocale[locale] = sourceInteractions;
    }
    const releaseLearner = releaseLearnersByLocale?.[locale];
    if (releaseLearner?.courseSessionId !== sessionId) {
      issues.push(issue(`practice:${locale}:courseSessionId:source=${JSON.stringify(sessionId)}:release=${JSON.stringify(releaseLearner?.courseSessionId)}`));
    }
    const releaseInteractions = releaseLearner?.interactions;
    if (!Array.isArray(releaseInteractions)) {
      issues.push(issue(`practice:${locale}:release_interactions_missing`));
      rawReleaseByLocale[locale] = [];
      continue;
    }
    rawReleaseByLocale[locale] = releaseInteractions;
  }

  const rawSourceAnswers = Array.isArray(atomicSource.answers) ? atomicSource.answers : [];
  const { normalizedByLocale: normalizedRawSourceByLocale, issues: rawNormalizationIssues } = normalizedRawSourceFeedback(
    rawSourceByLocale,
    rawSourceAnswers,
  );
  for (const detail of rawNormalizationIssues) {
    issues.push(issue(`practice:source_raw_feedback_locale_parity:${JSON.stringify(detail)}`));
  }
  const rawSourceFeedbackIssues = feedbackLocaleParityIssues(normalizedRawSourceByLocale, { answers: rawSourceAnswers });
  for (const detail of rawSourceFeedbackIssues) {
    issues.push(issue(`practice:source_raw_feedback_locale_parity:${JSON.stringify(detail)}`));
  }
  const releaseFeedbackIssues = feedbackLocaleParityIssues(rawReleaseByLocale, { answers: checkedReleaseAnswers });
  for (const detail of releaseFeedbackIssues) {
    issues.push(issue(`practice:release_feedback_locale_parity:${JSON.stringify(detail)}`));
  }

  const projectedSourceByLocale = {};
  const projectedSourceAnswersByLocale = {};
  if (rawSourceMapComplete && rawNormalizationIssues.length === 0 && rawSourceFeedbackIssues.length === 0) {
    for (const locale of locales) {
      try {
        const expectedProjection = projectSinglePhraseRelease({
          interactions: normalizedRawSourceByLocale[locale],
          answers: rawSourceAnswers,
          locale,
        });
        projectedSourceByLocale[locale] = projectWrongOnlyChoiceFeedback(
          expectedProjection.interactions.map(normalizeRuntimePurpose),
          expectedProjection.answers,
        );
        projectedSourceAnswersByLocale[locale] = expectedProjection.answers;
      } catch (error) {
        issues.push(issue(`practice:${locale}:source_projection_failed:${error instanceof Error ? error.message : String(error)}`));
      }
    }
  }

  const firstProjectedLocale = locales.find((locale) => Array.isArray(projectedSourceByLocale[locale]));
  const sourceFeedbackAnswers = firstProjectedLocale ? projectedSourceAnswersByLocale[firstProjectedLocale] : [];
  for (const detail of feedbackLocaleParityIssues(projectedSourceByLocale, { answers: sourceFeedbackAnswers })) {
    issues.push(issue(`practice:source_feedback_locale_parity:${JSON.stringify(detail)}`));
  }

  for (const locale of locales) {
    const expectedInteractions = projectedSourceByLocale[locale];
    const releaseInteractions = rawReleaseByLocale[locale];
    if (!Array.isArray(expectedInteractions) || !Array.isArray(releaseInteractions)) continue;
    for (const id of duplicateIds(expectedInteractions)) issues.push(issue(`practice:${locale}:${id}:source_interaction_duplicate`));
    for (const id of duplicateIds(releaseInteractions)) issues.push(issue(`practice:${locale}:${id}:release_interaction_duplicate`));
    const sourceById = new Map(expectedInteractions.map((interaction) => [interaction?.interactionId, interaction]));
    const releaseById = new Map(releaseInteractions.map((interaction) => [interaction?.interactionId, interaction]));
    for (const sourceInteraction of expectedInteractions) {
      const interactionId = sourceInteraction?.interactionId;
      if (typeof interactionId !== "string" || !interactionId) {
        issues.push(issue(`practice:${locale}:source_interaction_id_missing`));
        continue;
      }
      const releaseInteraction = releaseById.get(interactionId);
      if (!releaseInteraction) {
        issues.push(issue(`practice:${locale}:${interactionId}:release_interaction_missing`));
        continue;
      }
      for (const field of ["family", "inputMode", "prompt", "responseOptions"]) {
        if (!exactJsonEqual(sourceInteraction[field], releaseInteraction[field])) {
          issues.push(issue(`practice:${locale}:${interactionId}:${field}:source=${JSON.stringify(sourceInteraction[field])}:release=${JSON.stringify(releaseInteraction[field])}`));
        }
      }
      const familyPaths = RELEASE_SEMANTIC_PATHS_BY_FAMILY[sourceInteraction.family] ?? [];
      for (const field of familyPaths) {
        const sourceValue = valueAtPath(sourceInteraction, field);
        const releaseValue = valueAtPath(releaseInteraction, field);
        if (!exactJsonEqual(sourceValue, releaseValue)) {
          issues.push(issue(`practice:${locale}:${interactionId}:${field}:source=${JSON.stringify(sourceValue)}:release=${JSON.stringify(releaseValue)}`));
        }
      }
    }
    for (const releaseInteraction of releaseInteractions) {
      const interactionId = releaseInteraction?.interactionId;
      if (typeof interactionId !== "string" || !interactionId) {
        issues.push(issue(`practice:${locale}:release_interaction_id_missing`));
      } else if (!sourceById.has(interactionId)) {
        issues.push(issue(`practice:${locale}:${interactionId}:source_interaction_missing`));
      }
    }
  }

  let sourceAnswers = [];
  try {
    const firstLocale = locales.find((locale) => Array.isArray(semanticAtomicSource.interactionsByLocale?.[locale]));
    sourceAnswers = firstLocale
      ? projectSinglePhraseRelease({
        interactions: semanticAtomicSource.interactionsByLocale[firstLocale],
        answers: semanticAtomicSource.answers ?? [],
        locale: firstLocale,
      }).answers
      : [];
  } catch (error) {
    issues.push(issue(`answers:source_projection_failed:${error instanceof Error ? error.message : String(error)}`));
  }
  for (const id of duplicateIds(sourceAnswers)) issues.push(issue(`answers:${id}:source_answer_duplicate`));
  for (const id of duplicateIds(checkedReleaseAnswers)) issues.push(issue(`answers:${id}:release_answer_duplicate`));
  const sourceAnswerById = new Map(sourceAnswers.map((answer) => [answer?.interactionId, answer]));
  const releaseAnswerById = new Map(checkedReleaseAnswers.map((answer) => [answer?.interactionId, answer]));
  for (const sourceAnswer of sourceAnswers) {
    const interactionId = sourceAnswer?.interactionId;
    if (typeof interactionId !== "string" || !interactionId) {
      issues.push(issue("answers:source_answer_id_missing"));
      continue;
    }
    const releaseAnswer = releaseAnswerById.get(interactionId);
    if (!releaseAnswer) {
      issues.push(issue(`answers:${interactionId}:release_answer_missing`));
      continue;
    }
    for (const field of ["correctText", "correctResponseId"]) {
      if (!exactJsonEqual(sourceAnswer[field], releaseAnswer[field])) {
        issues.push(issue(`answers:${interactionId}:answers.${field}:source=${JSON.stringify(sourceAnswer[field])}:release=${JSON.stringify(releaseAnswer[field])}`));
      }
    }
  }
  for (const releaseAnswer of checkedReleaseAnswers) {
    const interactionId = releaseAnswer?.interactionId;
    if (typeof interactionId !== "string" || !interactionId) {
      issues.push(issue("answers:release_answer_id_missing"));
    } else if (!sourceAnswerById.has(interactionId)) {
      issues.push(issue(`answers:${interactionId}:source_answer_missing`));
    }
  }
  return issues;
}

function readJsonForParity(file, label, issues) {
  if (!exists(file)) {
    issues.push(`source_release_parity:${label}:file_missing:${path.basename(file)}`);
    return null;
  }
  try {
    return JSON.parse(read(file));
  } catch (error) {
    issues.push(`source_release_parity:${label}:file_unreadable:${path.basename(file)}:${error.message}`);
    return null;
  }
}

export function factoryManifestCorrectChoiceIndexes({ root = ROOT, sessionIdentity }) {
  const match = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/u.exec(sessionIdentity);
  if (!match || match[1] !== "en") return { indexes: null, issues: [] };
  const manifestFile = path.resolve(
    root,
    "..",
    "..",
    "modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated.ts",
  );
  const label = `source_release_parity:${sessionIdentity}:manifest`;
  if (!exists(manifestFile)) return { indexes: null, issues: [`${label}:file_missing`] };
  try {
    const source = read(manifestFile);
    const lessonOrdinal = Number(match[2]);
    const sessionOrdinal = Number(match[3]);
    const rowHeader = new RegExp(`lessonOrdinal:\\s*${lessonOrdinal}\\s*,\\s*sessionOrdinal:\\s*${sessionOrdinal}\\s*,`, "u");
    const headerMatch = rowHeader.exec(source);
    if (!headerMatch) return { indexes: null, issues: [`${label}:row_missing`] };
    const afterHeader = source.slice(headerMatch.index + headerMatch[0].length);
    const nextRow = /lessonOrdinal:\s*\d+\s*,\s*sessionOrdinal:\s*\d+\s*,/u.exec(afterHeader);
    const rowSource = afterHeader.slice(0, nextRow?.index ?? afterHeader.length);
    const indexesText = /introCorrectChoiceIndexes:\s*Object\.freeze\((\[[^\]\r\n]*\])\)/u.exec(rowSource)?.[1];
    if (!indexesText) return { indexes: null, issues: [`${label}:correct_indexes_missing`] };
    const indexes = JSON.parse(indexesText);
    if (!Array.isArray(indexes)) {
      return { indexes: null, issues: [`${label}:correct_indexes_invalid`] };
    }
    if (indexes.length !== 3) {
      return { indexes: null, issues: [`${label}:correct_indexes_length:expected=3:actual=${indexes.length}`] };
    }
    if (indexes.some((value) => !Number.isInteger(value) || value < 0 || value > 2)) {
      return { indexes: null, issues: [`${label}:correct_indexes_invalid`] };
    }
    return { indexes, issues: [] };
  } catch (error) {
    return { indexes: null, issues: [`${label}:unreadable:${error instanceof Error ? error.message : String(error)}`] };
  }
}

function sourceReleaseSessionIssues(root, sessionIdentity, locales, releaseRoot = path.join(root, "release")) {
  const match = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/u.exec(sessionIdentity);
  if (!match) return [`source_release_parity:${sessionIdentity}:invalid_session_identity`];
  const [, language, lesson, session] = match;
  const sessionId = `${language}:lesson-${lesson}:session-${session}`;
  const sourceDir = path.join(root, "sessions", sessionIdentity);
  const releaseDir = path.join(releaseRoot, language, `l${lesson}`, `s${session}`);
  const issues = [];
  const atomicSource = readJsonForParity(path.join(sourceDir, "practice.atomic.json"), sessionIdentity, issues);
  let practiceExplanationsSidecar = null;
  let practiceExplanationsIssues = [];
  const explanationsPath = path.join(sourceDir, "practice.explanations.v1.json");
  if (atomicSource && exists(explanationsPath)) {
    try {
      practiceExplanationsSidecar = JSON.parse(read(explanationsPath));
      practiceExplanationsIssues = validatePracticeExplanationsV1({
        sidecar: practiceExplanationsSidecar,
        atomicSource,
        sessionDir: sourceDir,
      });
    } catch (error) {
      practiceExplanationsIssues = [`unreadable:${error instanceof Error ? error.message : String(error)}`];
    }
  }
  const releaseIntro = readJsonForParity(path.join(releaseDir, "intro.json"), sessionIdentity, issues);
  const releaseAnswers = readJsonForParity(path.join(releaseDir, "answers.json"), sessionIdentity, issues);
  const releaseAuxiliary = Array.isArray(practiceExplanationsSidecar?.introResponses)
    ? readJsonForParity(path.join(releaseDir, "auxiliary.json"), sessionIdentity, issues)
    : null;
  const manifestAuthority = factoryManifestCorrectChoiceIndexes({ root, sessionIdentity });
  issues.push(...manifestAuthority.issues);
  const sourceIntroByLocale = {};
  const sourceLearningOutcomeByLocale = {};
  const tasksByLocale = {};
  const releaseLearnersByLocale = {};
  for (const locale of locales) {
    const sourceFile = path.join(sourceDir, `final.${locale}.md`);
    if (!exists(sourceFile)) {
      issues.push(`source_release_parity:${sessionIdentity}:${locale}:file_missing:${path.basename(sourceFile)}`);
    } else {
      try {
        const markdown = read(sourceFile);
        sourceIntroByLocale[locale] = parseIntro(markdown);
        sourceLearningOutcomeByLocale[locale] = parseHeader(markdown).operation;
        tasksByLocale[locale] = parsePractice(markdown);
      } catch (error) {
        issues.push(`source_release_parity:${sessionIdentity}:${locale}:source_unreadable:${error.message}`);
      }
    }
    const learnerName = locale === "ru" ? "learner.json" : `learner.${locale}.json`;
    const learner = readJsonForParity(path.join(releaseDir, learnerName), `${sessionIdentity}:${locale}`, issues);
    if (learner) releaseLearnersByLocale[locale] = learner;
  }
  if (atomicSource) {
    issues.push(...atomicMarkdownParityIssues({
      sessionIdentity,
      sessionId,
      atomicSource,
      practiceExplanationsSidecar,
      practiceExplanationsIssues,
      practiceExplanationsValidated: practiceExplanationsSidecar !== null && practiceExplanationsIssues.length === 0,
      tasksByLocale,
    }));
  }
  if (atomicSource && releaseIntro && releaseAnswers) {
    issues.push(...sourceReleaseSemanticParityIssues({
      sessionIdentity,
      sessionId,
      atomicSource,
      practiceExplanationsSidecar,
      practiceExplanationsIssues,
      practiceExplanationsValidated: practiceExplanationsSidecar !== null && practiceExplanationsIssues.length === 0,
      sourceIntroByLocale,
      sourceLearningOutcomeByLocale,
      releaseIntro,
      releaseAuxiliary,
      releaseLearnersByLocale,
      releaseAnswers,
      releaseIntroCorrectChoiceIndexes: manifestAuthority.indexes,
      locales,
    }));
  }
  return issues;
}

function discoverSourceReleaseSessions(root) {
  const sessionsRoot = path.join(root, "sessions");
  if (!exists(sessionsRoot)) return [];
  const result = [];
  for (const language of fs.readdirSync(sessionsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const languageDir = path.join(sessionsRoot, language.name);
    for (const lesson of fs.readdirSync(languageDir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && /^l\d{2}$/u.test(entry.name))) {
      const lessonDir = path.join(languageDir, lesson.name);
      for (const session of fs.readdirSync(lessonDir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && /^s\d{2}$/u.test(entry.name))) {
        result.push(`${language.name}/${lesson.name}/${session.name}`);
      }
    }
  }
  return result.sort();
}

export function sourceReleaseScopeIssues({ root = ROOT, scope, locales = ["ru", "uk"], releaseRoot = path.join(root, "release") }) {
  const sessions = scope === "all"
    ? discoverSourceReleaseSessions(root)
    : String(scope ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!sessions.length) return ["source_release_parity:scope_empty"];
  return sessions.flatMap((sessionIdentity) => sourceReleaseSessionIssues(root, sessionIdentity, locales, releaseRoot));
}

export async function factoryIntroPracticeCourseReport({ root = ROOT } = {}) {
  const { auditFactoryIntroPractice } = await import("./factory_intro_practice_gate.mjs");
  return auditFactoryIntroPractice({ sessionsRoot: path.join(root, "sessions", "en") });
}

async function holdForFactoryIntroPractice(context) {
  const report = await factoryIntroPracticeCourseReport();
  if (report.verdict === "PASS") return false;
  WARN(`factory_intro_practice_course_hold:${context}:${JSON.stringify(report)}`);
  process.exitCode = 1;
  return true;
}

// ---------- main ----------

// зачем: снять протухший блок machine_facts можно только перепроверив факты,
// а не поверив статусу. Логика фактов живёт в run.mjs — зовём её оттуда, чтобы
// не заводить второй экземпляр правил, который разъедется с первым.
function recheckHardFacts(dir, file = "final.ru.md") {
  const session = dir.split(/[\\/]/).slice(-3).join("/");
  const r = spawnSync(process.execPath, [path.join(HERE, "run.mjs"), "facts", "--session", session, "--file", file], { encoding: "utf8" });
  if (r.status !== 0) {
    WARN(`перепроверка фактов не удалась (код ${r.status}) — блок снимать нельзя: ${(r.stderr || "").trim().slice(0, 200)}`);
    return ["перепроверка не выполнена"];
  }
  return String(r.stdout || "").split("\n").map((l) => l.trim())
    .filter((l) => l && !l.startsWith("[FACTORY]") && !l.startsWith("[BUILD]"));
}

async function main() {
  if (!SESSION) { LOG("ранний выход: нужен --session en/l01/s04"); process.exit(2); }
  if (CHECK_SOURCE_RELEASE) {
    if (await holdForFactoryIntroPractice("check_source_release")) return;
    const issues = sourceReleaseScopeIssues({ root: ROOT, scope: SESSION, locales: LOCALES });
    for (const parityIssue of issues) WARN(parityIssue);
    if (issues.length) {
      WARN(`source/release semantic parity: BLOCKED (${issues.length} mismatches)`);
      process.exitCode = 1;
      return;
    }
    LOG("source/release semantic parity: PASS");
    return;
  }
  const m = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/.exec(SESSION);
  if (!m) { LOG(`ранний выход: --session ожидает en/l01/s04, получено: ${SESSION}`); process.exit(2); }
  const [, lang, lesson, session] = m;
  const dir = path.join(ROOT, "sessions", SESSION);
  const sessionId = `${lang}:lesson-${lesson}:session-${session}`;

  // `build_release.mjs` resolves relative output paths from the course root.
  // A repository-root path here silently creates a second nested course tree,
  // leaving the actual mockup stale. Reject that ambiguous spelling before
  // any source validation or file writes.
  const normalizedOutArg = String(OUT_ARG).replaceAll("\\", "/").replace(/^\.\/+/, "");
  if (!path.isAbsolute(OUT_ARG) && /^content\/learning-v2-course(?:\/|$)/u.test(normalizedOutArg)) {
    WARN(`nested_course_output_path:${OUT_ARG}: use a path relative to content/learning-v2-course, for example mockup/reviewed-source`);
    process.exit(2);
  }

  const writesDefaultRelease = sameFilesystemDestination(DEFAULT_OUT, OUT);
  if (writesDefaultRelease && await holdForFactoryIntroPractice(`canonical_build:${SESSION}`)) return;

  // Никакой безличный текст не должен попасть к ученику: проверяем именно
  // исходник этой сессии до разбора Markdown и до любой записи релиза.
  const actorClarityIssues = actorClarityGate(SESSION);
  if (actorClarityIssues.length) {
    WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА actor-clarity gate: ${actorClarityIssues.join("; ")}`);
    process.exit(1);
  }

  // A private --out is a review artifact. Writing the canonical release is a
  // publication step and must fail before touching existing files when the
  // current session has incomplete or stale independent review.
  // Resolve filesystem identity, not only spelling: a junction/symlink alias
  // of release is still the canonical publication destination. Walking to the
  // nearest existing ancestor also closes aliases whose final tail is new.
  if (CANDIDATE_PREVIEW && writesDefaultRelease) {
    WARN("candidate_preview_requires_private_output");
    process.exit(2);
  }
  if (MIGRATE_COMPOSITE_SOURCE && writesDefaultRelease) {
    WARN("ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: migration-composite-source разрешён только с приватным --out");
    process.exit(1);
  }
  if (writesDefaultRelease) {
    if (!LOCALES.includes("ru") || !LOCALES.includes("uk")) {
      WARN("ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: основной макет требует обе локали ru,uk");
      process.exit(1);
    }
    const requestedLocales = LOCALES.filter((locale) => locale !== "ru");
    const ownerQualityRequired = scopedOwnerQualityRequired(SESSION);
    if (ownerQualityRequired && progressionJudgeRequired(SESSION)) {
      const progression = progressionIssues(path.dirname(dir), Number(session));
      if (progression.length) {
        WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА progression gate: ${progression.join("; ")}`);
        process.exit(1);
      }
    }
    const readiness = sessionReadiness(dir, requestedLocales);
    if (!readiness.ready) {
      WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: ${readiness.issues.join("; ")}`);
      process.exit(1);
    }
    if (ownerQualityRequired && Number(lesson) > 2) {
      const facts = LOCALES.flatMap(locale => recheckHardFacts(dir, `final.${locale}.md`).map(fact => `${locale}: ${fact}`));
      if (facts.length) {
        WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: ${facts.join("; ")}`);
        process.exit(1);
      }
    }
  }

  const perLocale = {};
  for (const loc of LOCALES) {
    const f = path.join(dir, loc === "ru" ? "final.ru.md" : `final.${loc}.md`);
    if (!exists(f)) { WARN(`нет файла локали ${loc}: ${path.basename(f)} — локаль пропущена`); continue; }
    const md = read(f);
    perLocale[loc] = { md, header: parseHeader(md), intro: parseIntro(md), tasks: parsePractice(md) };
    LOG(`${loc}: интро ${perLocale[loc].intro.length}, заданий ${perLocale[loc].tasks.length}`);
  }
  if (!perLocale.ru) { LOG("ранний выход: нет мастера final.ru.md"); process.exit(2); }
  const introQuestionIssues = requestedIntroQuestionIssues(perLocale, LOCALES);
  if (introQuestionIssues.length) {
    WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: ${introQuestionIssues[0]}`);
    process.exit(1);
  }

  let guardianNewWords = null;
  const guardianFile = path.join(dir, "preauthoring.json");
  if (exists(guardianFile)) {
    try {
      const guardian = JSON.parse(read(guardianFile));
      guardianNewWords = Array.isArray(guardian?.newWords) ? guardian.newWords : [];
    } catch (error) {
      WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: new_words_guardian_unreadable:${error.message}`);
      process.exit(1);
    }
  }
  const declarationIssues = newWordDeclarationIssues(
    Object.fromEntries(Object.entries(perLocale).map(([locale, value]) => [locale, value.header])),
    { guardianNewWords },
  );
  if (declarationIssues.length) {
    WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: ${declarationIssues[0]}`);
    process.exit(1);
  }

  // зачем: за сутки ТРИЖДЫ правка русского не доходила до того, что видит
  // человек — перевод оставался старым, и в приложении два языка рассказывали
  // бы разное. Ловим машинно: если final.<loc>.md старше final.ru.md, значит
  // перевод не переделан после правки.
  const ruMtime = fs.statSync(path.join(dir, "final.ru.md")).mtimeMs;
  const staleLocales = [];
  for (const loc of Object.keys(perLocale)) {
    if (loc === "ru") continue;
    const lf = path.join(dir, `final.${loc}.md`);
    if (!exists(lf)) continue;   // ранний выход: локали нет — о ней уже предупредили выше
    if (fs.statSync(lf).mtimeMs < ruMtime) staleLocales.push(loc);
  }
  if (staleLocales.length) {
    WARN(`ПЕРЕВОД ОТСТАЛ от русского: ${staleLocales.join(", ")} — переведи заново, иначе языки разойдутся:`);
    WARN(`  node pipeline/run.mjs localize --session ${lang}/l${lesson}/s${session} --file final.ru.md`);
  }

  const master = perLocale.ru;
  const buildsBilingualAuxiliary = LOCALES.includes("ru") && LOCALES.includes("uk");
  if (buildsBilingualAuxiliary) {
    const introFeedbackIssues = introFeedbackContractIssues(perLocale);
    if (introFeedbackIssues.length) {
      WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: intro_feedback_contract_hold:${SESSION}:${introFeedbackIssues[0]}`);
      process.exit(1);
    }
  }
  let sourceBindingSchemaVersion = null;
  try {
    const status = JSON.parse(read(path.join(dir, "status.json")));
    if (status?.bindingSchemaVersion === CANONICAL_BINDING_SCHEMA_VERSION) {
      sourceBindingSchemaVersion = CANONICAL_BINDING_SCHEMA_VERSION;
    }
  } catch {
    // Readiness owns missing/malformed status. Private review builds may not
    // have one and therefore cannot claim the versioned binding contract.
  }
  const atomicSourcePath = path.join(dir, "practice.atomic.json");
  const atomicSource = exists(atomicSourcePath) ? JSON.parse(read(atomicSourcePath)) : null;
  if (atomicSource) {
    const parityIssues = atomicMarkdownParityIssues({
      sessionIdentity: SESSION,
      sessionId,
      atomicSource,
      tasksByLocale: Object.fromEntries(Object.entries(perLocale).map(([locale, value]) => [locale, value.tasks])),
    });
    if (parityIssues.length) {
      WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: ${parityIssues[0]}`);
      process.exit(1);
    }
  }
  const explanationSidecarPath = path.join(dir, "practice.explanations.v1.json");
  const explanationContractRequired = SESSION === "en/l01/s01" || exists(explanationSidecarPath);
  let releaseAtomicSource = atomicSource;
  let explanationSidecar = null;
  if (explanationContractRequired) {
    if (!atomicSource || !exists(explanationSidecarPath)) {
      WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: practice_explanations_v1_missing:${SESSION}`);
      process.exit(1);
    }
    explanationSidecar = JSON.parse(read(explanationSidecarPath));
    const explanationIssues = validatePracticeExplanationsV1({
      sidecar: explanationSidecar,
      atomicSource,
      sessionDir: dir,
    });
    if (explanationIssues.length) {
      WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: practice_explanations_v1_hold:${explanationIssues[0]}`);
      process.exit(1);
    }
    releaseAtomicSource = applyPracticeExplanationsV1({ atomicSource, sidecar: explanationSidecar });
  }
  // сверка структуры локалей с мастером
  for (const [loc, v] of Object.entries(perLocale)) {
    if (loc === "ru") continue;
    if (v.tasks.length !== master.tasks.length) WARN(`${loc}: заданий ${v.tasks.length} против ${master.tasks.length} в мастере`);
    if (v.intro.length !== master.intro.length) WARN(`${loc}: страниц интро ${v.intro.length} против ${master.intro.length}`);
  }

  const byOrdinal = (loc, ord) => perLocale[loc]?.tasks.find((t) => t.ordinal === ord);

  const introChild = {
    schemaVersion: "learning_v2_course_session_intro_child_v1",
    ...(sourceBindingSchemaVersion ? { sourceBindingSchemaVersion } : {}),
    courseSessionId: sessionId,
    learningOutcomeByLocale: localized(Object.fromEntries(LOCALES.map((l) => [l, perLocale[l]?.header.operation ?? ""]))),
    pages: master.intro.map((p, i) => ({
      pageOrdinal: i + 1, pageId: `${sessionId}:intro${i + 1}`, kind: p.kind,
      titleByLocale: localized(Object.fromEntries(LOCALES.map((l) => [l, perLocale[l]?.intro[i]?.heading ?? p.heading]))),
      bodyByLocale: localized(Object.fromEntries(LOCALES.map((l) => [l, perLocale[l]?.intro[i]?.text ?? p.text]))),
      question: {
        interactionId: `${sessionId}:intro${i + 1}:q`,
        promptByLocale: localized(Object.fromEntries(LOCALES.map((l) => [l, perLocale[l]?.intro[i]?.question ?? p.question]))),
        choicesByLocale: localized(Object.fromEntries(LOCALES.map((l) => [l, (perLocale[l]?.intro[i]?.options ?? p.options).map((o, j) => ({ responseId: `${sessionId}:intro${i + 1}:r${j + 1}`, text: o.text })) ]))),
        accessibilityLabelByLocale: localized(Object.fromEntries(LOCALES.map((l) => [l, perLocale[l]?.intro[i]?.question ?? p.question]))),
      },
    })),
    pageCount: 3, embeddedQuestionCount: 3, practiceStartOrdinal: 4,
    questionPolicy: "one_question_at_bottom_of_each_intro_page_no_post_intro_duplicate",
    answerDataPolicy: "none_server_evaluator_child_only",
    runtimeAuthority: "none_active_release_join_required", releaseAuthority: false,
    introFingerprint: "",
  };
  introChild.introFingerprint = sha(introChild.pages);

  // Intro option objects are sealed. Response-specific explanations travel
  // beside them and keep the same stable response IDs after UI shuffling.
  const auxiliaryChild = buildsBilingualAuxiliary ? {
    schemaVersion: "learning_v2_release_auxiliary_projection_v1",
    courseSessionId: sessionId,
    entries: master.intro.map((page, pageIndex) => {
      const interactionId = `${sessionId}:intro${pageIndex + 1}:q`;
      const responseFeedbackById = Object.fromEntries(page.options.flatMap((option, optionIndex) => {
        if (option.correct) return [];
        const feedbackByLocale = Object.fromEntries(LOCALES.map((locale) => [
          locale,
          perLocale[locale]?.intro[pageIndex]?.options?.[optionIndex]?.feedback ?? option.feedback ?? "",
        ]));
        return Object.values(feedbackByLocale).some((value) => String(value).trim())
          ? [[`${sessionId}:intro${pageIndex + 1}:r${optionIndex + 1}`, feedbackByLocale]]
          : [];
      }));
      const allIntroAnalyses = explanationSidecar ? projectIntroResponseAnalysesV1(explanationSidecar) : {};
      const responseAnalysisById = Object.fromEntries(Object.entries(allIntroAnalyses)
        .filter(([responseId]) => responseId.startsWith(`${sessionId}:intro${pageIndex + 1}:`)));
      const allIntroDiagnostics = explanationSidecar ? projectIntroResponseDiagnosticsV1(explanationSidecar) : {};
      const responseDiagnosticsById = Object.fromEntries(Object.entries(allIntroDiagnostics)
        .filter(([responseId]) => responseId.startsWith(`${sessionId}:intro${pageIndex + 1}:`)));
      return {
        interactionId,
        responseFeedbackById,
        ...(Object.keys(responseAnalysisById).length ? { responseAnalysisById } : {}),
        ...(Object.keys(responseDiagnosticsById).length ? { responseDiagnosticsById } : {}),
      };
    }),
    auxiliaryFingerprint: "",
  } : null;
  if (auxiliaryChild) auxiliaryChild.auxiliaryFingerprint = sha(auxiliaryChild.entries);

  try {
    assertSinglePhraseIntro(introChild, `${SESSION}:intro`);
  } catch (error) {
    WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  const sourceInteractions = releaseAtomicSource
    ? structuredClone(releaseAtomicSource.interactionsByLocale?.ru ?? [])
    : master.tasks.map((t, i) =>
      buildInteraction(t, Object.fromEntries(LOCALES.map((l) => [l, byOrdinal(l, t.ordinal)])), sessionId, i, master.tasks.length));

  // Answers are authored against the unsplit source interaction.  The release
  // projection below gives every derived sentence its own answer identity.
  const sourceAnswers = atomicSource
    ? structuredClone(atomicSource.answers ?? [])
    : master.tasks.map((t) => ({
      interactionId: `${sessionId}:i${String(t.ordinal).padStart(2, "0")}`,
      correctText: t.target ?? t.speak ?? t.options.find((o) => o.correct)?.text ?? "",
      correctResponseId: t.options.findIndex((o) => o.correct) >= 0 ? `${sessionId}:i${String(t.ordinal).padStart(2, "0")}:r${t.options.findIndex((o) => o.correct) + 1}` : null,
    }));

  // Owner judgment 2026-10-03, strengthened after the all-course audit:
  // every English source master must already contain one assessed phrase per
  // interaction. A clean release projection is not permission to keep a
  // composite source that could reintroduce the defect on a later rebuild.
  const strictSinglePhraseMasterRequired = true;
  if (strictSinglePhraseMasterRequired && !MIGRATE_COMPOSITE_SOURCE) {
    try {
      assertSinglePhraseSource(sourceInteractions, `${SESSION}:ru`);
    } catch (error) {
      WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
    const introPracticeRepeats = introPracticeTargetRepeatIssues(introChild, sourceInteractions, { source: `${SESSION}:ru`, newWords: master.header.newWords });
    if (introPracticeRepeats.length) {
      WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: intro_practice_target_repeat_hold:${JSON.stringify(introPracticeRepeats[0])}`);
      process.exit(1);
    }
    const practiceRepeats = practiceTargetRepeatIssues(sourceInteractions, { source: `${SESSION}:ru`, newWords: master.header.newWords });
    if (practiceRepeats.length) {
      WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: practice_target_cross_family_repeat_hold:${JSON.stringify(practiceRepeats[0])}`);
      process.exit(1);
    }
    const choreography = scopedFamilyChoreographyIssues(SESSION, sourceInteractions, {
      source: `${SESSION}:ru`,
      newWords: master.header.newWords,
      answers: sourceAnswers,
    });
    if (choreography.length) {
      WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: family_choreography_hold:${JSON.stringify(choreography[0])}`);
      process.exit(1);
    }
  }

  let projected;
  let answers;
  let interactions;
  try {
    projected = projectSinglePhraseRelease({ interactions: sourceInteractions, answers: sourceAnswers, locale: "ru" });
    answers = projected.answers;
    interactions = projectWrongOnlyChoiceFeedback(projected.interactions.map(normalizeRuntimePurpose), answers);
  } catch (error) {
    WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
  if (strictSinglePhraseMasterRequired && !MIGRATE_COMPOSITE_SOURCE) {
    const projectedChoreography = scopedFamilyChoreographyIssues(SESSION, interactions, {
      source: `${SESSION}:ru:projected`,
      newWords: master.header.newWords,
      answers,
    });
    if (projectedChoreography.length) {
      WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: projected_family_choreography_hold:${JSON.stringify(projectedChoreography[0])}`);
      process.exit(1);
    }
  }

  const learnerChild = {
    schemaVersion: "learning_v2_course_session_learner_child_v1",
    ...(sourceBindingSchemaVersion ? { sourceBindingSchemaVersion } : {}),
    courseSessionId: sessionId, targetLanguage: lang,
    interactions, practiceInteractionCount: interactions.length, firstPracticeOrdinal: 4,
    evaluatorPayload: "absent_by_exact_schema", acceptedAnswerPayload: "absent_by_exact_schema",
    runtimeAuthority: "none_active_release_join_required", releaseAuthority: false,
    learnerFingerprint: "",
  };
  learnerChild.learnerFingerprint = sha(interactions);

  const localizedLearnerFiles = {};
  for (const loc of Object.keys(perLocale)) {
    if (loc === "ru") continue;
    const localeSourceInteractions = releaseAtomicSource
      ? structuredClone(releaseAtomicSource.interactionsByLocale?.[loc] ?? [])
      : sourceInteractions.map((interaction, index) => {
        const localeTask = byOrdinal(loc, master.tasks[index].ordinal) ?? master.tasks[index];
        // Собираем локальный interaction целиком: переводятся не только prompt,
        // но и видимые responseOptions/targetText. Идентификаторы сохраняются,
        // потому что позиции заданий и вариантов сверены с мастером.
        return buildInteraction(
          localeTask,
          Object.fromEntries(LOCALES.map((l) => [l, byOrdinal(l, master.tasks[index].ordinal)])),
          sessionId,
          index,
          master.tasks.length,
        );
      });
    if (strictSinglePhraseMasterRequired && !MIGRATE_COMPOSITE_SOURCE) {
      try {
        assertSinglePhraseSource(localeSourceInteractions, `${SESSION}:${loc}`);
      } catch (error) {
        WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
      const introPracticeRepeats = introPracticeTargetRepeatIssues(introChild, localeSourceInteractions, { source: `${SESSION}:${loc}`, newWords: master.header.newWords });
      if (introPracticeRepeats.length) {
        WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: intro_practice_target_repeat_hold:${JSON.stringify(introPracticeRepeats[0])}`);
        process.exit(1);
      }
      const practiceRepeats = practiceTargetRepeatIssues(localeSourceInteractions, { source: `${SESSION}:${loc}`, newWords: master.header.newWords });
      if (practiceRepeats.length) {
        WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: practice_target_cross_family_repeat_hold:${JSON.stringify(practiceRepeats[0])}`);
        process.exit(1);
      }
      const choreography = scopedFamilyChoreographyIssues(SESSION, localeSourceInteractions, {
        source: `${SESSION}:${loc}`,
        newWords: master.header.newWords,
        answers: sourceAnswers,
      });
      if (choreography.length) {
        WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: family_choreography_hold:${JSON.stringify(choreography[0])}`);
        process.exit(1);
      }
    }
    let localeInteractions;
    let localeAnswers;
    try {
      const localeProjection = projectSinglePhraseRelease({ interactions: localeSourceInteractions, answers: sourceAnswers, locale: loc });
      localeAnswers = localeProjection.answers;
      localeInteractions = projectWrongOnlyChoiceFeedback(localeProjection.interactions.map(normalizeRuntimePurpose), localeAnswers);
    } catch (error) {
      WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
    if (strictSinglePhraseMasterRequired && !MIGRATE_COMPOSITE_SOURCE) {
      const projectedChoreography = scopedFamilyChoreographyIssues(SESSION, localeInteractions, {
        source: `${SESSION}:${loc}:projected`,
        newWords: master.header.newWords,
        answers: localeAnswers,
      });
      if (projectedChoreography.length) {
        WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: projected_family_choreography_hold:${JSON.stringify(projectedChoreography[0])}`);
        process.exit(1);
      }
    }
    const shapeMismatchIndex = localeInteractions.findIndex((interaction, index) => {
      const base = interactions[index];
      return !base || interaction.interactionId !== base.interactionId || interaction.family !== base.family ||
        (/:s\d{2}$/u.test(interaction.interactionId) && interaction.responseOptions.length !== base.responseOptions.length);
    });
    if (shapeMismatchIndex >= 0 || localeInteractions.length !== interactions.length) {
      const base = interactions[shapeMismatchIndex] ?? null;
      const localizedInteraction = localeInteractions[shapeMismatchIndex] ?? null;
      WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: single_phrase_projection_hold:${SESSION}:${loc}:locale_shape_alignment:index=${shapeMismatchIndex}:base=${base?.interactionId ?? "missing"}/${base?.family ?? "missing"}/${base?.responseOptions?.length ?? "missing"}:locale=${localizedInteraction?.interactionId ?? "missing"}/${localizedInteraction?.family ?? "missing"}/${localizedInteraction?.responseOptions?.length ?? "missing"}:counts=${interactions.length}/${localeInteractions.length}`);
      process.exit(1);
    }
    localizedLearnerFiles[`learner.${loc}.json`] = {
      ...learnerChild,
      interactions: localeInteractions,
      learnerFingerprint: sha(localeInteractions),
    };
  }

  // Cross-locale feedback is one authored contract. Validate the assembled
  // projections here, before any canonical file is touched, so a direct build
  // cannot bypass the global all-source verifier.
  const projectedByLocale = {
    ru: interactions,
    ...Object.fromEntries(Object.entries(localizedLearnerFiles).map(([name, child]) => [
      /^learner\.([a-z]{2}(?:-[A-Z]{2})?)\.json$/u.exec(name)?.[1],
      child.interactions,
    ]).filter(([locale]) => locale)),
  };
  const feedbackParity = feedbackLocaleParityIssues(projectedByLocale, { answers });
  if (feedbackParity.length) {
    WARN(`ПУБЛИКАЦИЯ ОСТАНОВЛЕНА: feedback_locale_parity_hold:${SESSION}:${JSON.stringify(feedbackParity[0])}`);
    process.exit(1);
  }

  const outDir = path.join(OUT, lang, `l${lesson}`, `s${session}`);
  fs.mkdirSync(outDir, { recursive: true });
  const files = {
    "intro.json": introChild,
    ...(auxiliaryChild ? { "auxiliary.json": auxiliaryChild } : {}),
    "learner.json": learnerChild,
    ...localizedLearnerFiles,
    "answers.json": answers,
  };
  if (MIGRATE_COMPOSITE_SOURCE && !atomicSource) {
    files["source.snapshot.json"] = {
      schemaVersion: "learning_v2_composite_source_snapshot_v1",
      courseSessionId: sessionId,
      interactionsByLocale: Object.fromEntries([
        ["ru", sourceInteractions],
        ...Object.keys(perLocale).filter((locale) => locale !== "ru").map((locale) => {
          const localeInteractions = sourceInteractions.map((interaction, index) => {
            const localeTask = byOrdinal(locale, master.tasks[index].ordinal) ?? master.tasks[index];
            return buildInteraction(
              localeTask,
              Object.fromEntries(LOCALES.map((item) => [item, byOrdinal(item, master.tasks[index].ordinal)])),
              sessionId,
              index,
              master.tasks.length,
            );
          });
          return [locale, localeInteractions];
        }),
      ]),
      answers: sourceAnswers,
    };
    files["preservation.ledger.json"] = {
      schemaVersion: "learning_v2_single_phrase_preservation_ledger_v1",
      courseSessionId: sessionId,
      rows: projected.preservationLedger,
    };
  }
  for (const [name, data] of Object.entries(files)) {
    const p = path.join(outDir, name);
    await writeMockupFile(p, JSON.stringify(data, null, 2));
    LOG(`записан ${path.relative(ROOT, p)} (${fs.statSync(p).size} байт)`);
  }

  // сводка проблем, которые плеер не переживёт
  const problems = [];
  for (const it of interactions) {
    if (!it.modePayload) problems.push(`${it.interactionId}: нет modePayload (family ${it.family})`);
    else if (it.family === "phrase_builder" && !it.modePayload.orderedTokens.length) problems.push(`${it.interactionId}: пустые orderedTokens`);
    else if (it.family === "speed_match" && (it.modePayload.pairGrid.length < 4 || it.modePayload.pairGrid.length > (Number(lesson) <= 2 ? 4 : 7))) problems.push(`${it.interactionId}: пар ${it.modePayload.pairGrid.length}, поддерживается ${Number(lesson) <= 2 ? "4" : "4–7"}`);
    // карточка слова вариантов не имеет по определению — это не дефект
    const isCard = Boolean(it.modePayload?.isWordCard) ||
      master.tasks.find((t) => `${sessionId}:i${String(t.ordinal).padStart(2, "0")}` === it.interactionId)?.family === "word_card";
    if (!isCard && it.inputMode === "single_choice" && it.responseOptions.length < 2) problems.push(`${it.interactionId}: вариантов ${it.responseOptions.length}`);
    const optionCapacity = Number(lesson) <= 2 ? 4 : 5;
    if (!isCard && it.inputMode === "single_choice" && it.responseOptions.length > optionCapacity) problems.push(`${it.interactionId}: вариантов ${it.responseOptions.length} — больше ${optionCapacity}, проверь строку вариантов на лишние тире и звёздочки`);
    const correctCount = (it.responseOptions || []).filter((o) => o.correct).length;
    if (!isCard && correctCount > 1) problems.push(`${it.interactionId}: правильных ответов ${correctCount} — приложение поддерживает только один, перепиши задание на один пропуск`);
    for (const o of it.responseOptions || []) {
      if (new RegExp("\\*|—\\s*«").test(String(o.text || ""))) problems.push(`${it.interactionId}: в тексте варианта «${String(o.text).slice(0, 40)}» есть разметка — перевод должен быть в разборе, а не в строке вариантов`);
    }
  }
  // зачем: сессия 26 попала в курс заблокированной и без вердиктов —
  // сборщик собирал что дают, не спрашивая, проверял ли её кто-нибудь
  if (!CANDIDATE_PREVIEW) {
  try {
    const stPath = path.join(dir, "status.json");
    if (fs.existsSync(stPath)) {
      const st = JSON.parse(fs.readFileSync(stPath, "utf8"));
      // зачем: 07.09 сессия 30 лежала с blocked=[judge_nonsense] от прогона,
      // который был ДО правок, а свежий вердикт того же судьи давал PASS.
      // Та же болезнь, что с machine_facts: статус пишется один раз и не
      // пересматривается. Сверяем список с реальными файлами вердиктов.
      if (st.blocked) {
        const stale = [];
        const still = [];
        for (const j of [].concat(st.blocked)) {
          const vp = path.join(dir, `final.${j}.json`);
          if (!fs.existsSync(vp)) { still.push(`${j} (нет вердикта)`); continue; }
          let v = null;
          try { v = JSON.parse(fs.readFileSync(vp, "utf8")); }
          catch (e) { still.push(`${j} (вердикт нечитаем: ${e.message})`); continue; }
          if (v && v.verdict === "PASS") stale.push(j); else still.push(`${j} (${v && v.verdict})`);
        }
        if (still.length) WARN(`СЕССИЯ ЗАБЛОКИРОВАНА судьями (${still.join(", ")}) — собирать её в курс нельзя, сначала правка`);
        else {
          LOG(`протухший блок судей снят: ${stale.join(", ")} дают PASS по свежему вердикту`);
          const fixed = { ...st, blocked: undefined, staleBlockClearedAt: new Date().toISOString() };
          delete fixed.blocked;
          fs.writeFileSync(stPath, JSON.stringify(fixed, null, 2));
        }
      }
      // зачем: 06.09 сессия 3 урока 2 лежала в релизе живой, а status.json
      // говорил blockedBy=machine_facts — гейт пишет статус и делает return,
      // поэтому ручная правка + пересборка релиза его не переписывали. Статус
      // врал, а run_batch читает именно его. Сборщик пересчитывает факты сам:
      // закрыты — снимает протухший блок, не закрыты — кричит.
      else if (st.blockedBy === "machine_facts") {
        const stillOpen = recheckHardFacts(dir);
        if (stillOpen.length) {
          WARN(`СЕССИЯ ЗАБЛОКИРОВАНА машинными фактами — собирать нельзя:`);
          for (const f of stillOpen) WARN(`  ${f}`);
        } else {
          LOG("протухший блок machine_facts снят: факты закрыты, статус переписан");
          const fixed = { ...st, blockedBy: undefined, facts: undefined, staleBlockClearedAt: new Date().toISOString() };
          delete fixed.blockedBy; delete fixed.facts;
          fs.writeFileSync(stPath, JSON.stringify(fixed, null, 2));
        }
      }
      else if (st.ru === 0) WARN(`сессия собрана с нулём очков — судьи её не приняли`);
    } else WARN(`нет status.json — неизвестно, судилась ли сессия вообще`);
  } catch (e) { WARN(`не смог прочитать статус сессии: ${e.message}`); }
  } else LOG("черновой просмотр: status.json не изменяется");
  if (problems.length) { WARN(`проблем сборки: ${problems.length}`); for (const p of problems) WARN(`  ${p}`); }
  else LOG("проблем сборки нет");
  LOG(`готово: ${interactions.length} заданий, ${LOCALES.join("+")}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
