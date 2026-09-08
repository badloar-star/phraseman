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
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const LOG = (...a) => console.log("[BUILD]", ...a);
const WARN = (...a) => console.warn("[BUILD][WARN]", ...a);

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const SESSION = opt("session", null);
const LOCALES = opt("locales", "ru,uk").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = path.resolve(ROOT, opt("out", "release"));

const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);
const sha = (v) => crypto.createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(v)).digest("hex");

// ---------- разбор Markdown ----------

/** Заголовок сессии: тема, операция, новые слова, сцена. */
function parseHeader(md) {
  const title = /^#\s+(.+)$/m.exec(md)?.[1]?.trim() ?? "";
  const scene = /\*\*Сцена сессии\.\*\*\s*([\s\S]*?)\n\n/.exec(md)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  const operation = /\*\*Операц[иі]я:\*\*\s*(.+)/.exec(md)?.[1]?.trim() ?? "";
  const newWords = (/\*\*Новые слова:\*\*\s*(.+)/.exec(md)?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return { title, scene, operation, newWords };
}

/** Три страницы интро: заголовок, тело, вопрос, варианты с разборами. */
function parseIntro(md) {
  const pages = [];
  // зачем: ранние эталоны пишут «## Интро 1 · Понятие», поздние — «## Интро 1».
  // Локали пишут заголовок на своём языке («## Інтро 1» на украинском) — это
  // естественно для носителя, поэтому ловим любое написание слова «интро».
  const blocks = md.split(/^##\s*[ИІ]нтро\s*\d+[^\n]*$/mi).slice(1);
  for (const [i, raw] of blocks.entries()) {
    const body = raw.split(/^---\s*$/m)[0];
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
    const options = parseOptions(body);
    if (!options.length) WARN(`интро ${i + 1}: не найдено вариантов ответа`);
    pages.push({ kind: ["concept", "formula", "trap"][i] ?? "tip", heading, text, question, options });
  }
  return pages;
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

  // 2) список разборов. Пункт может переноситься на следующие строки —
  //    склеиваем до следующего «- » или пустой строки, иначе разбор теряется.
  const glued = block.replace(/\n(?![-*\s]*$)(?!\s*-\s)(?!\s*\*\*\d)[ \t]+(\S)/g, " $1");
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
  if (/скажите вслух|скажите три|скажите пять|финал сцены|ответьте|скажіть уголос|скажіть три|скажіть п.ять|фінал сцени|відповідайте/.test(t)) return "scripted_repeat_compare";
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

/** Задания практики: номер, тип из «## Для сборщика», содержимое. */
function parsePractice(md) {
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
    const family = modes.get(ordinal) ?? familyFromTitle(head[2]) ?? familyFromBody(bodyForFamily);
    if (!family) { WARN(`задание ${ordinal}: механика не определена ни строкой modes, ни названием «${head[2].trim()}»`); continue; }
    const bodyText = chunk.slice(head[0].length);
    tasks.push({ ordinal, title: head[2].trim(), family, body: bodyText, options: parseOptions(bodyText), ...parseTaskParts(bodyText) });
  }
  return tasks;
}

/** Части задания: цель, плитки, аудио, пары, определение карточки. */
function parseTaskParts(body) {
  const parts = {};
  // цель: последняя жирная фраза после стрелки, либо жирная строка целиком
  const arrow = [...body.matchAll(/→\s*\*\*(.+?)\*\*/g)].map((m) => m[1].trim());
  if (arrow.length) parts.target = arrow[arrow.length - 1];
  const tiles = /(?:Плитки|Соберите):\s*(.+)/.exec(body);
  if (tiles) parts.tokens = [...tiles[1].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const audio = /🔊\s*\*([^*]+)\*/.exec(body);
  if (audio) parts.audio = audio[1].trim();
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
      const [t, m] = p.split("—").map((s) => s.replace(/[*_`]/g, "").trim());
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

function buildInteraction(task, perLocale, sessionId, index, total) {
  const id = `${sessionId}:i${String(task.ordinal).padStart(2, "0")}`;
  // зачем: карточка нового слова — не выбор, а показ. В формате плеера своего
  // семейства для неё нет, поэтому идёт как listen_choose с единственным
  // «вариантом» — самим словом; макет и приложение узнают её по cardByLocale.
  const family = task.family === "word_card" ? "listen_choose" : task.family;
  const loc = (field) => localized(Object.fromEntries(LOCALES.map((l) => [l, perLocale[l]?.[field] ?? ""])));

  // IDs use positions in the full option list, including the correct answer.
  const feedback = task.options.flatMap((o, i) => o.correct ? [] : [{
    responseId: `${id}:r${i + 1}`,
    correct: false,
    testedDimension: task.title.slice(0, 40),
    feedbackByLocale: localized(Object.fromEntries(LOCALES.map((l) => {
      const alt = perLocale[l]?.options?.[i];
      return [l, alt?.feedback ?? o.feedback];
    }))),
  }]);

  const responseOptions = task.options.map((o, i) => ({ responseId: `${id}:r${i + 1}`, text: o.text }));

  let modePayload = null;
  if (family === "phrase_builder") {
    modePayload = {
      family, targetPhrase: task.target ?? task.speak ?? "",
      localizedMeaning: loc("title"),
      orderedTokens: (task.target ?? "").replace(/[.?!]$/, "").split(/\s+/).filter(Boolean),
      authoredDistractorTokens: (task.tokens ?? []).filter((t) => !(task.target ?? "").toLowerCase().includes(t.toLowerCase())),
      slotFeedback: feedback,
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
        : responseOptions.map((r) => ({ responseId: r.responseId, targetText: r.text, meaningByLocale: null })),
      transcriptRevealPolicy: "after_first_attempt",
      choiceFeedback: feedback,
      // карточка слова: показ, а не выбор
      isWordCard: !!task.card,
      wordCard: task.card ? { word: task.card.word, definitionByLocale: cardByLocale } : null,
    };
  } else if (family === "listen_build_dictation") {
    modePayload = {
      family,
      referenceAudio: task.audio ? { audioTargetId: `${id}:audio`, transcript: task.audio } : null,
      slowReferenceAudio: null,
      hiddenTargetPhrase: task.target ?? task.audio ?? "",
      orderedTokens: (task.target ?? "").replace(/[.?!]$/, "").split(/\s+/).filter(Boolean),
      authoredDistractorTokens: (task.tokens ?? []).filter((t) => !(task.target ?? "").toLowerCase().includes(t.toLowerCase())),
      slotFeedback: feedback,
    };
  } else if (family === "context_gap_grammar") {
    modePayload = {
      family, localizedScene: loc("title"),
      // зачем: строка пропуска в Markdown несёт и варианты («I ___ wrong. →
      // **am** · not · is») — в payload должна попасть только сама фраза
      gappedTargetPhrase: (/(\S[^\n]*___[^\n]*)/.exec(task.body)?.[1] ?? "").split("→")[0].replace(/[*`]/g, "").trim(),
      gapOptions: responseOptions, testedDimension: task.title.slice(0, 40), choiceFeedback: feedback,
    };
  } else if (family === "sound_contrast") {
    // зачем: у sound_contrast два слова стоят в строке «*right · wrong* → **wrong**»,
    // а не парами «слово — перевод»; берём их из разобранных вариантов
    const words = task.options.map((o) => o.text);
    const [a, b] = words.length >= 2 ? words : [task.target ?? "", ""];
    modePayload = { family, contrastA: a, contrastB: b, ipaA: "", ipaB: "",
      audioA: a ? { audioTargetId: `${id}:audioA`, transcript: a } : null,
      audioB: b ? { audioTargetId: `${id}:audioB`, transcript: b } : null,
      testedPhoneticContrast: task.title.slice(0, 40), choiceFeedback: feedback };
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

  // зачем (владелец, 03.09: «почему задания уже сами дают ответ?»): автор
  // пишет заголовок «Послушайте и выберите — welcome», а welcome и есть
  // правильный ответ. В заголовке для ученика хвост « — <ответ>» срезаем.
  const correctText = (task.options.find((o) => o.correct)?.text ?? task.target ?? task.card?.word ?? "").toLowerCase().replace(/[.?!]$/, "");
  let learnerPrompt = task.title;
  const tail = /\s+—\s+(.+)$/.exec(learnerPrompt);
  if (tail && correctText && tail[1].toLowerCase().replace(/[.?!]$/, "") === correctText && task.family !== "word_card") {
    learnerPrompt = learnerPrompt.slice(0, tail.index).trim();
  }

  return {
    interactionId: id, ordinal: task.ordinal + 3, purpose: PURPOSE_BY_INDEX(index, total),
    family, inputMode: INPUT_MODE[task.family] ?? "single_choice",
    prompt: learnerPrompt, responseOptions,
    mediaIds: [],
    audioTargetIds: modePayload?.referenceAudio ? [`${id}:audio`]
      : [modePayload?.audioA?.audioTargetId, modePayload?.audioB?.audioTargetId].filter(Boolean),
    accessibilityLabel: task.title, modePayload, scriptedAlternate: null,
  };
}

// ---------- main ----------

// зачем: снять протухший блок machine_facts можно только перепроверив факты,
// а не поверив статусу. Логика фактов живёт в run.mjs — зовём её оттуда, чтобы
// не заводить второй экземпляр правил, который разъедется с первым.
function recheckHardFacts(dir) {
  const session = dir.split(/[\\/]/).slice(-3).join("/");
  const r = spawnSync(process.execPath, [path.join(HERE, "run.mjs"), "facts", "--session", session], { encoding: "utf8" });
  if (r.status !== 0) {
    WARN(`перепроверка фактов не удалась (код ${r.status}) — блок снимать нельзя: ${(r.stderr || "").trim().slice(0, 200)}`);
    return ["перепроверка не выполнена"];
  }
  return String(r.stdout || "").split("\n").map((l) => l.trim())
    .filter((l) => l && !l.startsWith("[FACTORY]") && !l.startsWith("[BUILD]"));
}

function main() {
  if (!SESSION) { LOG("ранний выход: нужен --session en/l01/s04"); process.exit(2); }
  const m = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/.exec(SESSION);
  if (!m) { LOG(`ранний выход: --session ожидает en/l01/s04, получено: ${SESSION}`); process.exit(2); }
  const [, lang, lesson, session] = m;
  const dir = path.join(ROOT, "sessions", SESSION);
  const sessionId = `${lang}:lesson-${lesson}:session-${session}`;

  const perLocale = {};
  for (const loc of LOCALES) {
    const f = path.join(dir, loc === "ru" ? "final.ru.md" : `final.${loc}.md`);
    if (!exists(f)) { WARN(`нет файла локали ${loc}: ${path.basename(f)} — локаль пропущена`); continue; }
    const md = read(f);
    perLocale[loc] = { md, header: parseHeader(md), intro: parseIntro(md), tasks: parsePractice(md) };
    LOG(`${loc}: интро ${perLocale[loc].intro.length}, заданий ${perLocale[loc].tasks.length}`);
  }
  if (!perLocale.ru) { LOG("ранний выход: нет мастера final.ru.md"); process.exit(2); }

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
  // сверка структуры локалей с мастером
  for (const [loc, v] of Object.entries(perLocale)) {
    if (loc === "ru") continue;
    if (v.tasks.length !== master.tasks.length) WARN(`${loc}: заданий ${v.tasks.length} против ${master.tasks.length} в мастере`);
    if (v.intro.length !== master.intro.length) WARN(`${loc}: страниц интро ${v.intro.length} против ${master.intro.length}`);
  }

  const byOrdinal = (loc, ord) => perLocale[loc]?.tasks.find((t) => t.ordinal === ord);

  const introChild = {
    schemaVersion: "learning_v2_course_session_intro_child_v1",
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

  const interactions = master.tasks.map((t, i) =>
    buildInteraction(t, Object.fromEntries(LOCALES.map((l) => [l, byOrdinal(l, t.ordinal)])), sessionId, i, master.tasks.length));

  const learnerChild = {
    schemaVersion: "learning_v2_course_session_learner_child_v1",
    courseSessionId: sessionId, targetLanguage: lang,
    interactions, practiceInteractionCount: interactions.length, firstPracticeOrdinal: 4,
    evaluatorPayload: "absent_by_exact_schema", acceptedAnswerPayload: "absent_by_exact_schema",
    runtimeAuthority: "none_active_release_join_required", releaseAuthority: false,
    learnerFingerprint: "",
  };
  learnerChild.learnerFingerprint = sha(interactions);

  // ответы — отдельно: плеер их не получает, они нужны серверу-оценщику
  const answers = master.tasks.map((t) => ({
    interactionId: `${sessionId}:i${String(t.ordinal).padStart(2, "0")}`,
    correctText: t.target ?? t.speak ?? t.options.find((o) => o.correct)?.text ?? "",
    correctResponseId: t.options.findIndex((o) => o.correct) >= 0 ? `${sessionId}:i${String(t.ordinal).padStart(2, "0")}:r${t.options.findIndex((o) => o.correct) + 1}` : null,
  }));

  const outDir = path.join(OUT, lang, `l${lesson}`, `s${session}`);
  fs.mkdirSync(outDir, { recursive: true });
  const files = { "intro.json": introChild, "learner.json": learnerChild, "answers.json": answers };
  for (const [name, data] of Object.entries(files)) {
    const p = path.join(outDir, name);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
    LOG(`записан ${path.relative(ROOT, p)} (${fs.statSync(p).size} байт)`);
  }

  // сводка проблем, которые плеер не переживёт
  const problems = [];
  for (const it of interactions) {
    if (!it.modePayload) problems.push(`${it.interactionId}: нет modePayload (family ${it.family})`);
    else if (it.family === "phrase_builder" && !it.modePayload.orderedTokens.length) problems.push(`${it.interactionId}: пустые orderedTokens`);
    else if (it.family === "speed_match" && it.modePayload.pairGrid.length !== 4) problems.push(`${it.interactionId}: пар ${it.modePayload.pairGrid.length}, нужно 4`);
    // карточка слова вариантов не имеет по определению — это не дефект
    const isCard = master.tasks.find((t) => `${sessionId}:i${String(t.ordinal).padStart(2, "0")}` === it.interactionId)?.family === "word_card";
    if (!isCard && it.inputMode === "single_choice" && it.responseOptions.length < 2) problems.push(`${it.interactionId}: вариантов ${it.responseOptions.length}`);
    if (!isCard && it.inputMode === "single_choice" && it.responseOptions.length > 4) problems.push(`${it.interactionId}: вариантов ${it.responseOptions.length} — больше четырёх, проверь строку вариантов на лишние тире и звёздочки`);
    const correctCount = (it.responseOptions || []).filter((o) => o.correct).length;
    if (!isCard && correctCount > 1) problems.push(`${it.interactionId}: правильных ответов ${correctCount} — приложение поддерживает только один, перепиши задание на один пропуск`);
    for (const o of it.responseOptions || []) {
      if (new RegExp("\\*|—\\s*«").test(String(o.text || ""))) problems.push(`${it.interactionId}: в тексте варианта «${String(o.text).slice(0, 40)}» есть разметка — перевод должен быть в разборе, а не в строке вариантов`);
    }
  }
  // зачем: сессия 26 попала в курс заблокированной и без вердиктов —
  // сборщик собирал что дают, не спрашивая, проверял ли её кто-нибудь
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
  if (problems.length) { WARN(`проблем сборки: ${problems.length}`); for (const p of problems) WARN(`  ${p}`); }
  else LOG("проблем сборки нет");
  LOG(`готово: ${interactions.length} заданий, ${LOCALES.join("+")}`);
}

main();
