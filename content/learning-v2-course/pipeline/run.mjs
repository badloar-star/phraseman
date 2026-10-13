#!/usr/bin/env node
// Фабрика курса Learning V2 — конвейер одной сессии.
//
// зачем: владелец (2026-09-03) хочет «запустил и ушёл»: 1 792 сессии × 8
// локалей пишутся скриптом, а не руками в чате. Судьи — отдельные вызовы с
// чистой памятью (свежий агент судит честнее — проверено 16.08).
//
// Бэкенд выбирается явно. Автоматический выбор внешнего провайдера запрещён:
// качество и стоимость нельзя незаметно привязывать к одному поставщику.
//
// Запуск:
//   node run.mjs draft    --session en/l01/s04 --backend <явно-настроенный-адаптер>
//   node run.mjs judge    --session en/l01/s04 --file draft_A.ru.md
//   node run.mjs edit     --session en/l01/s04 --file draft_A.ru.md
//   node run.mjs localize --session en/l01/s04 --file final.ru.md [--locales uk,es]
//   node run.mjs full     --session en/l01/s04
//
// Логи: префикс [FACTORY], каждый ранний выход и каждый catch пишет причину
// (правило владельца «сперва логи»).

import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { bindTasteReceiptToSource, isWellFormedBeShortAnswer, sessionIdFromDirectory, shortAnswerConstructionFacts, sourceBytesSha256, sourceSha256 } from "./owner_quality.mjs";
import { requirePreJudgeChoreography } from "./prejudge_choreography.mjs";
import { parseIntro, parsePractice } from "./build_release.mjs";
import { CANONICAL_BINDING_SCHEMA_VERSION, judgeIssues, judgeReceiptContractIssues, requiredJudgesForSession, sessionReadiness } from "./session_readiness.mjs";
import { preauthoringDocumentManifest, requirePreauthoringReceipt } from "./preauthoring_guard.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const WORK_DIR = process.env.FACTORY_WORK_DIR || path.join(process.env.TEMP || process.env.TMP || "C:/Temp", "learning-v2-factory");
const LOG = (...a) => console.log("[FACTORY]", ...a);
const WARN = (...a) => console.warn("[FACTORY][WARN]", ...a);

// ---------- аргументы ----------
const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const BACKEND = opt("backend", process.env.FACTORY_BACKEND || "disabled");
// зачем: прототип 03.09 (L1 S4): оба Sonnet-черновика получили «worse» —
// без юмора, слабые ловушки, возврат старых слов не состоялся; Opus — «equal».
// Авторы по умолчанию Opus; Sonnet остаётся для локализации после проверки.
const MODEL_DRAFT = opt("model-draft", process.env.FACTORY_MODEL_DRAFT || "opus");
// зачем: вкус владельца держит только Opus (он единственный судья, чья
// планка проверена на эталонах). Ученик просто честно проходит урок, а
// педагог сверяет с машинными фактами — Sonnet справляется и в ~5 раз дешевле.
const MODEL_JUDGE = opt("model-judge", process.env.FACTORY_MODEL_JUDGE || "opus");
const MODEL_CHEAP = opt("model-cheap", process.env.FACTORY_MODEL_CHEAP || "sonnet");
const MODEL_BY_JUDGE = { judge_taste: MODEL_JUDGE, judge_nonsense: MODEL_JUDGE, judge_reader: MODEL_JUDGE, judge_learner: MODEL_CHEAP, judge_pedagogy: MODEL_CHEAP };
const SESSION = opt("session", null); // en/l01/s04
// зачем: «запустил и ушёл» — при лимите подписки конвейер ждёт сброса,
// а не падает. --no-wait отключает (для быстрых проверок).
const WAIT_ON_LIMIT = !args.includes("--no-wait");
// зачем (владелец, 03.09): сейчас пишем только ru-мастер и uk. Локаль — чистая
// функция от мастера: доливается одним вызовом позже. Написанные заранее
// локали выбрасываются при любой правке мастера (так и вышло с S5).
// Полный набор: --locales uk,es,pt-BR,vi,id,tr,pl
const LOCALES = (opt("locales", "uk")).split(",").map((s) => s.trim()).filter(Boolean);

// ---------- файлы ----------
const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);
const write = (p, s) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s, "utf8");
  LOG("записан", path.relative(ROOT, p), `${s.length} зн.`);
};
let mockMutationConsumed = false;
let mockReceiptMutationConsumed = false;
let mockLocaleCommitMutationConsumed = false;
let mockLocaleCorrectionCommitMutationConsumed = false;
let mockLocaleJudgeCallCount = 0;
let mockCallCount = 0;
const listDir = (d, filter = () => true) =>
  exists(d) ? fs.readdirSync(d).filter(filter).sort().map((f) => path.join(d, f)) : [];

function applyMockMutation(envName, consumed) {
  const mutateFile = process.env[envName]?.trim();
  if (BACKEND !== "mock" || !mutateFile || consumed) return false;
  const allowedRoot = process.env.FACTORY_SESSION_DIR?.trim();
  const resolvedTarget = path.resolve(mutateFile);
  if (!allowedRoot || !resolvedTarget.startsWith(`${path.resolve(allowedRoot)}${path.sep}`)) {
    throw new Error(`${envName} вне FACTORY_SESSION_DIR`);
  }
  fs.appendFileSync(resolvedTarget, "\n<!-- mock mutation during judge -->\n", "utf8");
  return true;
}

// зачем (владелец, 03.09, дословно): «ХОЧУ ДОБАВИТЬ ЖЁСТКОЕ ТРЕБОВАНИЕ И ЕГО
// НАДО ВПИСАТЬ 45 РАЗ КАПСОМ, ЧТОБЫ НЕ ПРОЕБАТЬ НИКАК СЛУЧАЙНО». Файл
// ГЛАВНОЕ_ТРЕБОВАНИЕ.md вклеивается В НАЧАЛО КАЖДОГО системного промпта —
// автора, всех судей, редактора, локализаторов. Забыть невозможно: это код.
const MAIN_REQUIREMENT_PATH = path.join(ROOT, "ГЛАВНОЕ_ТРЕБОВАНИЕ.md");
const mainRequirement = () => {
  if (!exists(MAIN_REQUIREMENT_PATH)) {
    LOG("ранний выход: нет ГЛАВНОЕ_ТРЕБОВАНИЕ.md — без него промпты не собираются");
    process.exit(2);
  }
  return read(MAIN_REQUIREMENT_PATH);
};
// зачем: правило владельца 13.09 — «каждая сессия, проверять все мелочи по
// Кембриджу; сделай так, чтобы Codex тоже это учёл». Ссылки в промпте мало:
// модель не читает файлы с диска, она видит только промпт. Поэтому свод
// вклеивается КОДОМ в каждый системный промпт — как главное требование.
const CAMBRIDGE_DIGEST_PATH = path.join(ROOT, "СВОД_ГРАММАТИКИ_КЕМБРИДЖ.md");
const cambridgeDigest = () => {
  if (!exists(CAMBRIDGE_DIGEST_PATH)) {
    WARN("нет СВОД_ГРАММАТИКИ_КЕМБРИДЖ.md — промпт собран без проверенной грамматики");
    return "";
  }
  return read(CAMBRIDGE_DIGEST_PATH);
};
const prompt = (name) => `${mainRequirement()}\n\n---\n\n${cambridgeDigest()}\n\n---\n\n${read(path.join(HERE, "prompts", `${name}.md`))}`;
const fill = (tpl, vars) =>
  tpl.replace(/\{\{([A-ZА-Я_0-9]+)\}\}/g, (_, k) => {
    if (!(k in vars)) {
      WARN(`плейсхолдер без значения: {{${k}}} — оставлен пустым`);
      return "";
    }
    return vars[k];
  });

// ---------- контекст курса ----------
const LOCALE_NAMES = {
  uk: "украинский", es: "испанский", "pt-BR": "бразильский португальский", vi: "вьетнамский",
  id: "индонезийский", tr: "турецкий", pl: "польский", en: "английский",
};

function parseSession(id) {
  const m = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/.exec(id || "");
  if (!m) {
    LOG("ранний выход: --session ожидает вид en/l01/s04, получено:", id);
    process.exit(2);
  }
  const overriddenDir = process.env.FACTORY_SESSION_DIR?.trim();
  const testOverrideAllowed = BACKEND === "mock"
    || (process.env.NODE_ENV === "test" && process.env.FACTORY_ALLOW_TEST_SESSION_DIR === "1");
  if (overriddenDir && !testOverrideAllowed) {
    throw new Error("FACTORY_SESSION_DIR разрешён только при явном mock/test guard");
  }
  return { lang: m[1], lesson: Number(m[2]), session: Number(m[3]), dir: overriddenDir ? path.resolve(overriddenDir) : path.join(ROOT, "sessions", id) };
}

/** Строки плана урока: из ПЛАН_КУРСА.md, таблицы «### Глава N · … · сцена: …». */
function loadPlan(lang, lesson) {
  const p = path.join(ROOT, "curriculum", lang, "ПЛАН_КУРСА.md");
  if (!exists(p)) {
    LOG("ранний выход: нет плана", p);
    process.exit(2);
  }
  // зачем: СЕКЦИЯ УРОКА. Параметр lesson принимался, но не использовался —
  // читались все главы подряд и бралось первое совпадение по номеру. Урок 2
  // получил строку урока 1 («I am + слово»). Режем файл по «## Урок N».
  const all = read(p).split(/\r?\n/);
  const lessonNum = Number(String(lesson).replace(/[^0-9]/g, "")) || 1;
  const head = "## Урок " + lessonNum;
  const startIdx = all.findIndex((l) => l.startsWith(head) && !/^[0-9]/.test(l.slice(head.length)));
  let lines;
  if (startIdx < 0) {
    if (lessonNum === 1) lines = all;
    else { LOG("ранний выход: в плане нет раздела «## Урок " + lessonNum + "»"); process.exit(2); }
  } else {
    let endIdx = all.findIndex((l, k) => k > startIdx && /^## Урок \d+/.test(l));
    if (endIdx < 0) endIdx = all.length;
    lines = all.slice(startIdx, endIdx);
    LOG("план: читаю раздел «" + all[startIdx].trim() + "» (строк " + lines.length + ")");
  }
  const rows = new Map();
  let scene = "";
  let arc = "";
  for (const line of lines) {
    const a = /^\*\*Арка:\*\*\s*(.+)$/.exec(line);
    if (a) arc = a[1].trim();
    const h = /^### Глава \d+ · (.+?) · сцена: (.+)$/.exec(line);
    if (h) scene = `${h[2].trim()} (грамматика главы: ${h[1].trim()})`;
    const r = /^\| (\d+) \| (.+?) \| (.+?) \| (.+?) \| (.+?) \|$/.exec(line);
    // зачем: таблица 32 уроков тоже начинается с «| N |» — строки сессий
    // берём только внутри разделов «### Глава … · сцена: …»
    if (r && scene && !rows.has(Number(r[1]))) {
      rows.set(Number(r[1]), {
        n: Number(r[1]), type: r[2].trim(), grammar: r[3].trim(), words: r[4].trim(), moment: r[5].trim(), scene,
      });
    }
  }
  LOG(`план урока ${lesson}: строк ${rows.size}, арка: ${arc || "—"}`);
  return { rows, arc };
}

function knownBefore(plan, n, previousPlans = []) {
  const ops = new Set();
  const words = new Set();
  const scopes = [...previousPlans.map((p) => ({ plan: p, before: Infinity })), { plan, before: n }];
  for (const scope of scopes) {
    for (const [k, r] of scope.plan.rows) {
      if (k >= scope.before) continue;
      if (/^новая/.test(r.type) || /^тонкость/.test(r.type)) ops.add(r.grammar);
      for (const w of r.words.split(",")) {
        const t = w.replace(/[—–(].*$/, "").trim();
        if (t && t !== "—" && t !== "-") words.add(t);
      }
    }
  }
  return { ops: [...ops], words: [...words] };
}

function neighborsSummary(lang, lesson, n) {
  const out = [];
  for (let k = Math.max(1, n - 3); k < n; k++) {
    const id = `l${String(lesson).padStart(2, "0")}_s${String(k).padStart(2, "0")}`;
    const cands = [
      path.join(ROOT, "sessions", lang, `l${String(lesson).padStart(2, "0")}`, `s${String(k).padStart(2, "0")}`, "final.ru.md"),
      path.join(ROOT, "exemplars", lang, `${id}.ru.md`),
    ];
    const f = cands.find(exists);
    if (!f) {
      WARN(`соседняя сессия ${id} не найдена — дедуп по ней невозможен`);
      continue;
    }
    const text = read(f);
    const scene = /\*\*Сцена сессии\.\*\*([\s\S]*?)\n\n/.exec(text)?.[1]?.trim() ?? "";
    const heads = [...text.matchAll(/^### (.+)$/gm)].map((m) => m[1]).slice(0, 3).join(" · ");
    const jokes = [...text.matchAll(/\*([^*\n]{20,120})\*/g)].map((m) => m[1]).slice(0, 4).join(" | ");
    out.push(`- ${id}: сцена: ${scene}\n  заголовки интро: ${heads}\n  фразы разборов: ${jokes}`);
  }
  return out.join("\n") || "(соседей нет)";
}

/** Машинные факты о сессии для педагога/редактора: касания возвращаемых слов
 * (зачем: педагог считал «на глаз» и один раз ошибся бы; grep не ошибается). */
// зачем: владелец нашёл задание «как вы после недели» с вариантами tired /
// alone / warm — подходил ЛЮБОЙ, задание не проверяло ничего. Судьи такое
// пропускают: формально всё верно (слова знакомы, ответ помечен, разборы
// написаны). Формальных признаков у поломки нет — длина подсказки у плохого
// задания такая же, как у хороших. Поэтому проверку делает дешёвая модель,
// но узкая: один вызов на сессию, один вопрос — единственный ли ответ.
function extractFillTasks(text) {
  const lines = text.split(/\r?\n/);
  const tasks = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(.*)___\s*\.?\s*→\s*\*\*(.+?)\*\*\s*·\s*(.+)$/);
    if (!m) continue;
    const stem = m[1].trim();
    if (!stem) continue;
    const title = (lines[i - 1] || "").replace(new RegExp("\\*\\*","g"), "").trim();
    if (!title) continue;   // ранний выход: без подсказки проверять нечего
    tasks.push({ title, stem, right: m[2].trim(), options: m[3].split("·").map((x) => x.trim()).filter(Boolean) });
  }
  return tasks;
}

// Возвращает список сломанных заданий (пустой — всё в порядке).
function checkSingleAnswer(file, label) {
  const tasks = extractFillTasks(read(file));
  if (!tasks.length) { LOG("[ОДИН-ОТВЕТ] заданий на подстановку нет — пропускаю"); return []; }
  const listed = tasks.map((t) => `Задание ${(t.title.split(" ")[0] || "?")}. подсказка: ${t.title}
   фраза: ${t.stem} ___ 
   верный: ${t.right} · остальные: ${t.options.join(", ")}`).join(String.fromCharCode(10) + String.fromCharCode(10));
  let out;
  try {
    const text = callModel({ system: fill(prompt("check_single_answer"), { ЗАДАНИЯ: listed }), user: "Проверь.", model: MODEL_CHEAP, maxTokens: 2000, label: `один-ответ · ${label}` });
    out = extractJson(text);
  } catch (e) {
    // зачем: проверка не критична — падать из-за неё нельзя, но и молчать
    // нельзя: молчащая проверка хуже отсутствующей
    WARN(`[ОДИН-ОТВЕТ] проверка не отработала (${e.message}) — заданий ${tasks.length}, вердикта нет`);
    return [];
  }
  const broken = Array.isArray(out && out.broken) ? out.broken : [];
  LOG(`[ОДИН-ОТВЕТ] заданий ${tasks.length}, сломанных ${broken.length}`);
  for (const b of broken) WARN(`[ОДИН-ОТВЕТ] задание ${b.task}: подходят также ${(b.also_fit || []).join(", ")} — ${b.why || ""}`);
  return broken;
}

// зачем: один список машинных фактов-блокеров на весь конвейер. Раньше эта
// регулярка жила в двух местах и шесть раз ломалась при правке через heredoc
// (съедало обратные слэши) — расхождение молча выпускало сессию с дефектом.
// Целевая длина интро (её видит автор в правилах) и допуск, за которым
// выпуск блокируется. Цель и блокировка — РАЗНЫЕ числа намеренно.
const INTRO_LEN_MIN = 240;
const INTRO_LEN_MAX = 290;
const INTRO_LEN_TOLERANCE = 30;

// зачем: минимум сборок фразы за сессию (владелец 07.09). Считаются phrase_builder
// и listen_build_dictation — в обоих ученик строит фразу из плиток сам.
const PHRASE_BUILD_MIN = 4;
// зачем: норма сборок введена 07.09 и не применяется задним числом — владелец
// решил старые сессии не трогать. Урок 2 писался в момент решения, поэтому
// граница внутри него: сессии 1-30 заморожены, с 31 норма обязательна.
const PHRASE_BUILD_FROM_SESSION = 31;
// зачем: сколько сборок могут делить один скелет. Больше — ученик собирает одно
// и то же и правила не чувствует (владелец 07.09).
const PHRASE_SAME_SKELETON_MAX = 2;
export const HARD_FACT_RE = /НЕ УПОМЯНУТ|СЛОВА БЕЗ ОТРАБОТКИ|МЕНЬШЕ ДВУХ|ни разу правильным ответом|ОТСЫЛКА К ПРОШЛОМУ|ДЛИНА|ИНТРО НЕ ОБЪЯСНЯЕТ ОТВЕТ|МАЛО СБОРКИ ФРАЗЫ|ОДНООБРАЗНЫЕ СБОРКИ|ПОВТОР СБОРКИ ДОСЛОВНО|ФИНАЛ ПОДСКАЗАН|IS С МНОЖЕСТВЕННЫМ|КОРОТКИЙ ОТВЕТ БЕЗ ОШИБКИ КОНСТРУКЦИИ|ПАРЫ НИЖЕ СТУПЕНИ|ДИСТРАКТОРЫ НИЖЕ СТУПЕНИ|ПОВТОР СЛОВ МЕЖДУ ДОСКАМИ|ДУБЛИ В ДОСКЕ|МАЛО ЗАДАНИЙ|НЕРАЗРЕШЁННАЯ МЕХАНИКА|КАРТОЧКА БЕЗ НОВОГО СЛОВА|ATOMIC ANSWER НЕ ПРИВЯЗАН/;

const PRACTICE_SECTION_HEADER_RE = /^##\s+(?:Практика|Задания|Завдання)(?:[^\r\n]*)$/m;
const BUILDER_SECTION_HEADER_RE = /^##\s+Для сборщика(?:[^\r\n]*)$/m;

function practiceSections(text) {
  const source = String(text ?? "");
  const header = PRACTICE_SECTION_HEADER_RE.exec(source);
  if (!header) return { intro: source, practice: "" };
  const afterHeader = source.slice(header.index + header[0].length);
  const builderHeader = BUILDER_SECTION_HEADER_RE.exec(afterHeader);
  return {
    intro: source.slice(0, header.index),
    practice: builderHeader ? afterHeader.slice(0, builderHeader.index) : afterHeader,
  };
}

function finalBuilderPromptedByPreviousVoice(text, file, sessionIdentity = null) {
  const scope = /^en\/l(\d{2})\/s(\d{2})$/i.exec(String(sessionIdentity || ""))
    ?? String(file).match(/[\\\/]sessions[\\\/]en[\\\/]l(\d+)[\\\/]s(\d+)[\\\/]/i);
  if (!scope) return null;
  const lesson = Number(scope[1]);
  const session = Number(scope[2]);
  if (lesson < 2 || (lesson === 2 && session < 37)) return null;

  const { practice } = practiceSections(text);
  const tasks = practice.split(/^\*\*(?=\d+ · )/m).slice(1).map((chunk) => ({
    number: Number(/^(\d+) · /.exec(chunk)?.[1]),
    chunk,
  })).filter((task) => Number.isInteger(task.number));
  if (tasks.length < 2) return null;

  const modesBlock = /^modes:\s*([\s\S]*?)(?:\n\s*\n|$)/m.exec(text)?.[1] ?? "";
  const modes = new Map([...modesBlock.matchAll(/(\d+)\s*=\s*([a-z_]+)/g)].map((m) => [Number(m[1]), m[2]]));
  const previous = tasks[tasks.length - 2];
  const final = tasks[tasks.length - 1];
  if (modes.get(previous.number) !== "scripted_repeat_compare" || modes.get(final.number) !== "phrase_builder") return null;

  const spoken = (/🎙\s*\*\*([^*\r\n]+)\*\*/.exec(previous.chunk)?.[1] ??
    /^(?:Цель|Ціль):\s*`([^`]+)`/m.exec(previous.chunk)?.[1])?.trim();
  const built = (/→\s*\*\*([^*\r\n]+)\*\*/.exec(final.chunk)?.[1] ??
    /^(?:Цель|Ціль):\s*`([^`]+)`/m.exec(final.chunk)?.[1])?.trim();
  if (!spoken || !built) return null;
  const normalize = (value) => value.normalize("NFKC").toLocaleLowerCase("en").replace(/[‘’]/g, "'").replace(/[^\p{L}\p{N}']+/gu, " ").trim();
  return normalize(spoken) === normalize(built) ? { previous: previous.number, final: final.number, target: built } : null;
}

export function machineFacts(file, sessionIdentity = null, sourceText = null, atomicSource = null) {
  const text = sourceText ?? read(file);
  let atomicPractice = null;
  const atomicPath = path.join(path.dirname(file), "practice.atomic.json");
  try {
    const rawAtomic = atomicSource === null ? read(atomicPath) : atomicSource;
    const source = typeof rawAtomic === "string" || Buffer.isBuffer(rawAtomic)
      ? JSON.parse(String(rawAtomic))
      : rawAtomic;
    const localeMatch = /^final\.([a-z]{2})\.md$/i.exec(path.basename(file));
    const locale = localeMatch?.[1]?.toLowerCase() ?? "ru";
    const interactions = source?.interactionsByLocale?.[locale];
    if (source?.schemaVersion === "learning_v2_atomic_practice_source_v1" && Array.isArray(interactions) && Array.isArray(source?.answers)) {
      atomicPractice = { locale, interactions, answers: source.answers };
    }
  } catch {
    // The release builder and source verifier own the missing/malformed-sidecar
    // failure. Facts keep their legacy Markdown path so they cannot silently
    // invent evidence from an unreadable authority.
  }
  // зачем: владелец — «давай рассматривать каждую сессию как отдельную, юзер
  // может начать с A2 и не читал предыдущего». Отсылки к прошлому опыту
  // ловим машинно: это дешевле судьи и не пропускается.
  const { intro: introPart, practice } = practiceSections(text);
  const BACKREFS = [
    // «вы уже говорите не о себе» описывает ЭТУ страницу, а не прошлый опыт:
    // ловим только связку с английской фразой или словом курса
    [/[Вв]ы уже (?:умеете|знаете)/g, "«вы уже умеете/знаете»"],
    [/[Вв]ы уже говорите\s+[`«]/g, "«вы уже говорите <фраза>»"],
    [/уже (?:умеете|выучили|прошли|видели)/g, "«уже выучили/прошли»"],
    [/[Нн]овых формул не будет/g, "отсылка к ходу курса"],
    [/[Сс]нова|[Оо]пять/g, "«снова/опять»"],
    [/[Кк]ак и (?:в прошлый раз|раньше)/g, "«как раньше»"],
    [/[Тт]а же (?:скрепка|формула|коллега)/g, "«та же …»"],
  ];
  const ret = /^\*\*(?:Возвращаются|Повертаються):\*\*[^\S\r\n]*([^\r\n]*)$/m.exec(text)?.[1] ?? "";
  const canonicalTargets = practice.split("\n")
    .map((line) => /^(?:Цель|Ціль):[^\S\r\n]*`([^`\r\n]+)`[^\S\r\n]*$/u.exec(line)?.[1])
    .filter(Boolean);
  const facts = [];
  const identityScope = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/i.exec(String(sessionIdentity || ""));
  const ownerScope = identityScope
    ? `${identityScope[1].toLowerCase()}/l${identityScope[2]}/s${identityScope[3]}`
    : sessionIdFromDirectory(path.dirname(file));
  facts.push(...shortAnswerConstructionFacts(text, ownerScope));
  // зачем: длину автор на глаз не выдерживает (12 страниц из 21 вне нормы) —
  // считаем машинно и отдаём редактору, иначе подгонка ложится на человека
  const introPages = introPart.split(new RegExp("^## [ИІ]нтро \\d+", "m")).slice(1);
  const fileSessionScope = String(file).match(/[\\\/]sessions[\\\/]en[\\\/]l(\d+)[\\\/]s(\d+)[\\\/]/i);
  const scopeLesson = identityScope?.[1]?.toLowerCase() === "en" ? Number(identityScope[2]) : Number(fileSessionScope?.[1]);
  const scopeSession = identityScope?.[1]?.toLowerCase() === "en" ? Number(identityScope[3]) : Number(fileSessionScope?.[2]);
  const enforceIntroAnswerGrounding = Number.isFinite(scopeLesson)
    && (scopeLesson > 3 || (scopeLesson === 3 && scopeSession >= 25));
  introPages.forEach((page, k) => {
    const body = page.split(String.fromCharCode(10) + "**")[0].split(String.fromCharCode(10)).filter((x) => !x.trim().startsWith("###")).join(String.fromCharCode(10)).trim();
    const L = body.length;
    // зачем: владелец 06.09 — «перебор на 4 знака это вообще не проблема,
    // дай окно +-30, ничего страшного». Цель 240-290 автор видит в правилах,
    // но блокирует выпуск только выход за допуск: сессия 5 прошла четыре
    // круга подрезки ради 3-5 знаков — это дороже пользы.
    if (L < INTRO_LEN_MIN - INTRO_LEN_TOLERANCE) facts.push(`интро ${k + 1}: ДЛИНА ${L} знаков — короче нормы ${INTRO_LEN_MIN}-${INTRO_LEN_MAX} даже с допуском ${INTRO_LEN_TOLERANCE}, добавь пользы о слове (не воды)`);
    else if (L > INTRO_LEN_MAX + INTRO_LEN_TOLERANCE) facts.push(`интро ${k + 1}: ДЛИНА ${L} знаков — длиннее нормы ${INTRO_LEN_MIN}-${INTRO_LEN_MAX} даже с допуском ${INTRO_LEN_TOLERANCE}, убери повтор или разгон`);
    if (enforceIntroAnswerGrounding) {
      const correct = /^- ✅ \*\*([^*\r\n]+)\*\*/m.exec(page)?.[1]?.trim() ?? "";
      const normalize = (value) => value.normalize("NFKC").toLocaleLowerCase("en").replace(/[‘’]/g, "'").replace(/[^\p{L}\p{N}']+/gu, " ").trim();
      const answer = normalize(correct);
      const explanation = normalize(body);
      if (/[a-z]/i.test(answer) && !(` ${explanation} `).includes(` ${answer} `)) {
        facts.push(`интро ${k + 1}: ИНТРО НЕ ОБЪЯСНЯЕТ ОТВЕТ «${correct}» — точная проверяемая фраза должна быть разобрана в тексте этой же страницы`);
      }
    }
  });
  // ЛЕСТНИЦА: нагрузка обязана соответствовать ступени урока (владелец 06.09).
  // Уроки 1-2 заморожены — они написаны до правила и переписывать их не велено.
  const lessonFromPath = identityScope ? Number(identityScope[2]) : Number((String(file).match(/[\\\/]l(\d+)[\\\/]/) || [])[1] || 0);
  if (lessonFromPath > 2) {
    facts.push(...difficultyFacts(text, lessonFromPath, atomicPractice));
  }
  // СВЯЗКА КАК ОДИН ЗВУК: «price начинается с п» — там «пр», а не «п».
  const clusterWords = { price: "пр", street: "стр", plain: "пл", train: "тр", bread: "бр", bridge: "бр", crowded: "кр", pretty: "пр", school: "ск" };
  for (const [w, cl] of Object.entries(clusterWords)) {
    const re = new RegExp("`" + w + "`[^.]{0,40}(начинается|с) [«'\"]?" + cl[0] + "[»'\"]", "g");
    for (const m of practice.matchAll(re)) facts.push(`СВЯЗКА КАК ОДИН ЗВУК: «${m[0].slice(0, 60)}» — у ${w} в начале «${cl}», а не один звук`);
  }
  // ЗВУК ПО ОТСУТСТВИЮ: разбор на слух не должен строиться на «нет такого звука».
  const soundAbsence = [...practice.matchAll(new RegExp("(нет|без|не слышно|отсутствует)\s{0,3}(его |их |этого |такого )?[«»']?[а-яёА-ЯЁ]{1,4}[«»']?|[`«][^`»]{1,12}[`»]\s{0,3}[—,-]?\s{0,3}(нет|его нет|их нет|не слышно)", "g"))];
  if (soundAbsence.length) {
    const near = soundAbsence.filter((m) => {
      const around = practice.slice(Math.max(0, m.index - 220), m.index + 80);
      const line = practice.slice(practice.lastIndexOf(String.fromCharCode(10), m.index) + 1, m.index + 80);
      if (!line.trimStart().startsWith("- ")) return false;
      return /🔊|на слух|Различите звуки|Послушайте/.test(around);
    });
    for (const m of near) facts.push(`ЗВУК ПО ОТСУТСТВИЮ: «${m[0]}» — признак «звука нет» ненадёжен (зависит от произношения), различай по началу слова или по гласной`);
  }
  for (const [re, name] of BACKREFS) {
    const hits = introPart.match(re) || [];
    for (const h of hits) facts.push(`ОТСЫЛКА К ПРОШЛОМУ: ${name} — «${h}» ← сессию могут открыть первой, этого опыта у ученика нет`);
  }
  for (const w of ret.split(",").map((s) => s.trim()).filter(Boolean)) {
    const escapedWord = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escapedWord}\\b`, "gi");
    const markdownTouches = (practice.match(re) || []).length;
    // The Markdown cue for a gap contains only `___`; its visible choice and
    // correctness live in the atomic source.  Count atomic option text only
    // when Markdown has no occurrence, so one exercise is never counted twice.
    const atomicOptions = atomicPractice
      ? atomicPractice.interactions.flatMap((interaction) => Array.isArray(interaction?.responseOptions) ? interaction.responseOptions : [])
      : [];
    const atomicTouches = atomicOptions.filter((option) => new RegExp(`\\b${escapedWord}\\b`, "i").test(String(option?.text ?? ""))).length;
    const total = markdownTouches || atomicTouches;
    // правильный ответ в формате эталонов — жирным: «→ **I am fine.**», «**I am early. I am not tired.**»
    let asAnswer = (practice.match(new RegExp(`\\*\\*[^*\\n]*\\b${escapedWord}\\b[^*\\n]*\\*\\*`, "gi")) || []).length;
    // Phrase builders and dictations keep their canonical correct phrase on an
    // exact target line rather than in bold Markdown. Count only that contract:
    // tiles, conditions, support copy, and distractors remain non-answers.
    asAnswer += canonicalTargets.filter((target) => new RegExp(`\\b${escapedWord}\\b`, "i").test(target)).length;
    // Choice activities store the accepted text in answers.json.  Builders
    // have no correctResponseId and are already covered by canonical targets.
    if (atomicPractice) {
      asAnswer += atomicPractice.answers.filter((answer) => answer?.correctResponseId && new RegExp(`\\b${escapedWord}\\b`, "i").test(String(answer?.correctText ?? ""))).length;
    }
    // зачем: в Speed Match слова пишутся БЕЗ жирного («tired — устал · here —
    // здесь»), и счётчик не видел в них правильного ответа. Педагог получал
    // ноль и валил сессию за слово, которое ученик реально соединяет сам.
    // Пара — это тоже правильный ответ, просто не единственная цель задания.
    for (const line of practice.split("\n")) {
      if ((line.match(/·/g) || []).length >= 2 && /—/.test(line) && new RegExp(`\\b${w}\\b`, "i").test(line)) asAnswer++;
    }
    facts.push(`${w}: касаний в практике ${total}, из них правильным ответом ${asAnswer}${total < 2 ? " ← МЕНЬШЕ ДВУХ" : ""}${asAnswer === 0 ? " ← ни разу правильным ответом" : ""}`);
  }
  const v = validateModes(file, text);
  facts.push(`заданий: ${v.taskCount ?? "?"}; механики вне списка: ${v.unknown?.length ? v.unknown.map(([n, f]) => `${n}=${f}`).join(", ") : "нет"}`);
  // зачем: забракованный вариант S37 закончил независимой сборкой Whose is it?,
  // но задание прямо перед ней уже велело повторить Whose is it? вслух. Ученик
  // не извлекал фразу — переносил готовый ответ с соседнего экрана. Блокируем
  // только этот точный voice → final builder copy; раннее извлечение законно.
  const promptedFinal = finalBuilderPromptedByPreviousVoice(text, file, sessionIdentity);
  if (promptedFinal) {
    facts.push(`ФИНАЛ ПОДСКАЗАН: задание ${promptedFinal.previous} уже показывает «${promptedFinal.target}» в scripted_repeat_compare прямо перед финальной сборкой ${promptedFinal.final} — финал должен требовать самостоятельного извлечения`);
  }
  // зачем: владелец 07.09 — «задания собрать фразу из кусочков должны встречаться
  // чаще, это хорошее задание». Замер по 83 сессиям дал 3,1 в среднем и 0–2 в
  // 24 сессиях. Правило в промпте автор игнорировал так же, как длину интро,
  // поэтому счёт машинный. Сборка на слух считается — там ученик тоже строит фразу.
  {
    // Норма действует только на НОВЫЕ сессии (владелец 07.09: «не трогать,
    // норма только для новых»). 17 выпущенных сессий имеют по 3 сборки —
    // они проверены судьями и работают, переделка их только сломала бы.
    // Граница проходит внутри урока 2: всё с сессии 31 и дальше.
    const sessFromPath = identityScope ? Number(identityScope[3]) : Number((String(file).match(/[\\\/]s(\d+)[\\\/]/) || [])[1] || 0);
    const underNewRule = lessonFromPath > 2 || (lessonFromPath === 2 && sessFromPath >= PHRASE_BUILD_FROM_SESSION);
    const built = (v.entries || []).filter(([, f]) => f === "phrase_builder" || f === "listen_build_dictation").length;
    if (underNewRule && v.entries && v.entries.length && built < PHRASE_BUILD_MIN) {
      facts.push(`МАЛО СБОРКИ ФРАЗЫ: заданий на сборку ${built}, нужно минимум ${PHRASE_BUILD_MIN} — замени часть «вставь слово» на сборку из плиток`);
    }
  }
  // зачем: владелец 07.09 — «чтобы они не были одинаковыми можно фразы чуть
  // видоизменять». Разной механики мало: черновик сессии 31 дал 5 сборок, из них
  // 4 — одна конструкция What is the ___ с заменой последнего слова. Считаем
  // «скелет» (фраза без последнего слова): больше двух одинаковых — однообразие.
  // Порог проверен на живых сессиях: ловит s30/s31, пропускает эталоны s19/s29/s51.
  {
    const sessNo = identityScope ? Number(identityScope[3]) : Number((String(file).match(/[\\\/]s(\d+)[\\\/]/) || [])[1] || 0);
    const newRule = lessonFromPath > 2 || (lessonFromPath === 2 && sessNo >= PHRASE_BUILD_FROM_SESSION);
    if (newRule) {
      const answers = [];
      const tileSets = [];
      for (const line of practice.split("\n")) {
        if (!/Плитки:/.test(line)) continue;
        const m = /→\s*\*\*([^*]+)\*\*/.exec(line);
        if (m) { const tiles = (line.match(/`[^`]+`/g) || []).map((x) => x.replace(/`/g, "").toLowerCase()).sort().join(" "); answers.push(m[1].trim()); tileSets.push(tiles); }
      }
      const skeleton = (p) => p.replace(/[?.!,]/g, "").trim().toLowerCase().split(/\s+/).slice(0, -1).join(" ");
      const seen = {};
      for (const a of answers) { const k = skeleton(a); if (k) seen[k] = (seen[k] || 0) + 1; }
      const worst = Object.entries(seen).sort((a, b) => b[1] - a[1])[0];
      if (worst && worst[1] > PHRASE_SAME_SKELETON_MAX) {
        facts.push(`ОДНООБРАЗНЫЕ СБОРКИ: ${worst[1]} сборок из ${answers.length} — одна конструкция «${worst[0]} ___», меняется только последнее слово. Видоизменяй фразу: длиннее, вопрос вместо утверждения, отрицание, другое лицо`);
      }
      // зачем: черновик сессии 31 дважды дословно повторил «What is the bill?» —
      // это грубее однообразия: ученик собирает буквально ту же строку.
      // зачем: повтор ФРАЗЫ сам по себе законен — «Yes, I am» в сессии 3 собирается
      // трижды, но каждый раз из другого набора плиток, и работа растёт. Дефект
      // только когда совпадают И фраза, И плитки: это буквально то же задание.
      const exact = {};
      for (let n = 0; n < answers.length; n++) {
        const key = answers[n].toLowerCase().replace(/[?.!,]/g, "").trim() + " ⟨" + (tileSets[n] || "") + "⟩";
        if (key) exact[key] = (exact[key] || 0) + 1;
      }
      const dup = Object.entries(exact).filter(([, n]) => n > 1);
      if (dup.length) {
        facts.push(`ПОВТОР СБОРКИ ДОСЛОВНО: ${dup.map(([k2, n]) => `«${k2.split(" ⟨")[0]}» ${n}× с тем же набором плиток`).join(", ")} — это одно и то же задание дважды, поменяй фразу или набор плиток`);
      }
    }
  }
  // зачем: правило «бери разные конструкции» (07.09) дало побочный эффект —
  // автор берёт чужую конструкцию и путается в её грамматике. Черновик сессии 31
  // выдал «Where is the toilets?», хотя сессия 21 специально учила: несколько
  // предметов → are. В выпущенном курсе таких ошибок 0, значит дефект новый.
  {

    const reIs = /\b(is)\s+(?:the\s+)?(toilets|shops|prices|people|guests|twins|strangers)\b/gi;
    for (const m of text.matchAll(reIs)) {
      const from = text.lastIndexOf(String.fromCharCode(10), m.index) + 1;
      const to = text.indexOf(String.fromCharCode(10), m.index);
      const line = text.slice(from, to < 0 ? undefined : to);
      // строки, где это НАЗВАНО ошибкой, законны — там разбирают неверный вариант
      if (/❌|неверн|ошибк|не говорят/i.test(line)) continue;
      facts.push(`IS С МНОЖЕСТВЕННЫМ: «${m[0]}» — у нескольких предметов ставится are (это разбиралось в сессии 21): ${line.trim().slice(0, 70)}`);
    }
  }

  const timeRefs = [...(text.split(/^## Практика/m)[0] + practice).matchAll(/(вчера|позавчера|на прошлой сессии|в прошлый раз вы|вы уже учили|вы выучили)/gi)].map((m) => m[0]);
  facts.push(`ссылки на время обучения: ${timeRefs.length ? timeRefs.join(", ") : "не найдены (проверь «сегодня/утром» вручную — могут быть сценой)"}`);

  // зачем (владелец, 03.09): в Speed Match попали слова, которых ученик до
  // этого задания толком не видел — соединять можно только угадыванием.
  // Доска пар — это ПРОВЕРКА памяти, а не первое знакомство: каждое её слово
  // обязано иметь до неё карточку И хотя бы одну отработку (слух/фраза/выбор),
  // либо прийти из прошлых сессий.
  const taskChunks = practice.split(/^\*\*(?=\d+ · )/m).slice(1);
  const newWords = (/\*\*Новые слова:\*\*\s*(.+)/.exec(text)?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  taskChunks.forEach((chunk, idx) => {
    if (!/Соедините пары|Speed Match/i.test(chunk)) return;
    const line = chunk.split("\n").find((l) => (l.match(/·/g) || []).length >= 2 && /—/.test(l)) ?? "";
    const words = line.split("·").map((p) => p.split("—")[0].replace(/[*`]/g, "").trim()).filter(Boolean);
    const before = taskChunks.slice(0, idx);
    const weak = [];
    for (const w of words) {
      if (!newWords.some((nw) => nw.toLowerCase() === w.toLowerCase())) continue; // из прошлых сессий — нормально
      const hits = before.filter((t) => new RegExp(`\\b${w}\\b`, "i").test(t));
      const drilled = hits.filter((t) => !/Карточка слова/i.test(t)).length;
      if (drilled === 0) weak.push(`${w} (карточек ${hits.length}, отработок 0)`);
    }
    facts.push(`пары в задании ${idx + 1}: ${weak.length ? "СЛОВА БЕЗ ОТРАБОТКИ — " + weak.join(", ") + " ← ученик может только угадывать" : "все слова отработаны до доски"}`);
  });

  // зачем (владелец, 03.09): интро объясняло `I tired`, а вопрос под ним
  // спрашивал про `I am fine` — ученик читает про одно, отвечает про другое.
  // Проверяем машинно: слово из правильного ответа должно встречаться в тексте
  // страницы. Судьи этого не ловили — они смотрят каждую часть отдельно.
  const introBlocks = text.split(/^## [ИІ]нтро \d+[^\n]*$/m).slice(1);
  for (const [i, block] of introBlocks.entries()) {
    const page = block.split(/^---\s*$/m)[0];
    // зачем: сам вопрос — не объяснение. Пока в вопросе стояло английское
    // «Ready to go?», проверка засчитывала `ready` как объяснённое, хотя текст
    // страницы вёл к другому слову. Ищем только в абзацах ДО вопроса.
    const beforeQuestion = page.split(/^-\s+[✅❌]/m)[0];
    const paras = beforeQuestion.trimEnd().split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const lastPara = paras[paras.length - 1] ?? "";
    const body = /^\*\*[\s\S]+\*\*$/.test(lastPara) ? paras.slice(0, -1).join("\n\n") : beforeQuestion;
    const correct = /^-\s+✅\s+\*\*([^*]+)\*\*/m.exec(page)?.[1]?.trim() ?? "";
    if (!correct) { facts.push(`интро ${i + 1}: НЕ НАЙДЕН правильный ответ`); continue; }
    // ключевое слово ответа — последнее содержательное (fine, sure, new…)
    // зачем: короткий ответ («Yes, I am» / «No, I am not») не имеет
    // содержательного слова — ключом остаётся «No,» с запятой и не находится.
    // Такой ответ проверяем целиком по самой фразе.
    const bare = correct.replace(/[.?!]$/, "").trim();
    const isShortAnswer = /^(yes|no)/i.test(bare);
    const key = isShortAnswer
      ? bare
      : (bare.split(/\s+/).map((w) => w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "")).filter((w) => w && !/^(i|am|not|a|the)$/i.test(w)).pop() ?? "");
    const inBody = key && (isShortAnswer
      ? body.toLowerCase().includes(key.toLowerCase())
      : new RegExp(`\\b${key}\\b`, "i").test(body));
    facts.push(`интро ${i + 1}: ответ «${correct}» ключ «${key}» — ${inBody ? "объяснён на странице" : "НЕ УПОМЯНУТ в тексте страницы ← текст ведёт к другому слову"}`);
  }
  return facts.join("\n");
}

function courseContext(lang) {
  const constitution = read(path.join(ROOT, "КОНСТИТУЦИЯ.md"));
  // зачем: судьям — выжимка (контекст ×3 дешевле), авторам — полная
  const constitutionShort = exists(path.join(HERE, "КОНСТИТУЦИЯ_ДЛЯ_СУДЕЙ.md")) ? read(path.join(HERE, "КОНСТИТУЦИЯ_ДЛЯ_СУДЕЙ.md")) : constitution;
  const exemplars = listDir(path.join(ROOT, "exemplars", lang), (f) => f.endsWith(".ru.md"))
    .map((f) => `\n\n<!-- эталон ${path.basename(f)} -->\n${read(f)}`).join("");
  // зачем: 2026-09-05 аудит показал, что вердикты владельца читались из общей
  // папки без языка — французскому автору пошли бы вердикты про английские
  // сессии. Общие правила (длина, юмор, число заданий) остаются общими, а
  // разборы конкретных сессий берутся только своего языка.
  const verdictFiles = listDir(path.join(ROOT, "judgements", "owner"), (f) => f.endsWith(".md"))
    .filter((f) => {
      const base = path.basename(f);
      const m = /_([a-z]{2})_l\d{2}_s\d{2}\.md$/.exec(base);
      if (!m) return true;                 // общий вердикт без языка — всем
      return m[1] === lang;                // разбор сессии — только своему языку
    });
  const skipped = listDir(path.join(ROOT, "judgements", "owner"), (f) => f.endsWith(".md")).length - verdictFiles.length;
  if (skipped > 0) LOG(`вердикты: ${verdictFiles.length} взято, ${skipped} чужого языка пропущено`);
  const verdicts = verdictFiles.map((f) => read(f)).join("\n\n---\n\n");
  // зачем: особенности целевого языка (что нельзя утверждать про звук, мины,
  // настоящие и ложные различия с русским) — свои у каждого языка. Без этого
  // французский автор работал бы по английским правилам про `tall` и `fast`.
  const langFeaturesPath = path.join(ROOT, "curriculum", lang, "ОСОБЕННОСТИ_ЯЗЫКА.md");
  const langFeatures = exists(langFeaturesPath)
    ? read(langFeaturesPath)
    : `(файл ${langFeaturesPath} не заведён — особенностей языка нет; это ослабляет судью бреда)`;
  if (!exists(langFeaturesPath)) WARN(`нет ОСОБЕННОСТИ_ЯЗЫКА.md для «${lang}» — автор и судьи работают без языковых мин`);
  const langName = LOCALE_NAMES[lang] || lang;
  LOG(`контекст: конституция ${constitution.length} зн. (судьям ${constitutionShort.length}), эталонов ${(exemplars.match(/<!-- эталон/g) || []).length}, вердиктов владельца ${verdicts ? verdicts.split("\n\n---\n\n").length : 0}`);
  // зачем: длина интро, число заданий и касания слов записаны в трёх файлах
  // сразу; расхождение между ними ловилось только вручную и постфактум
  try {
    const sync = spawnSync(process.execPath, [path.join(HERE, 'check_rules_sync.mjs')], { encoding: 'utf8' });
    if (sync.status !== 0) {
      WARN('правила в Конституции, судейской версии и промпте автора РАЗОШЛИСЬ:');
      String(sync.stdout || "").split(String.fromCharCode(10)).filter((l) => l.includes("РАСХОЖДЕНИЕ")).forEach((l) => WARN("  " + l));
    }
  } catch (e) { WARN(`сторож согласованности правил не запустился: ${e.message}`); }
  // зачем: 2026-09-05 владелец заметил, что `early` заявлено новым в четырёх
  // сессиях. Слово в уроке повторять можно, врёт только строка «Новые слова».
  try {
    // зачем: сторож смотрел жёстко в sessions/en/l01 и для французского молча
    // отвечал «всё хорошо». Язык передаётся аргументом (аудит 2026-09-05).
    const nw = spawnSync(process.execPath, [path.join(HERE, 'check_new_words.mjs'), '--lang', lang], { encoding: 'utf8' });
    if (nw.status !== 0) {
      WARN('слово заявлено новым повторно — правьте строку «Новые слова», не сторожа:');
      String(nw.stderr || "").split(String.fromCharCode(10)).filter((l) => l.includes("уже заявлено")).forEach((l) => WARN("  " + l.trim()));
    }
  } catch (e) { WARN(`сторож новых слов не запустился: ${e.message}`); }
  // зачем: аудит 2026-09-05 нашёл три тихих переплетения языков (язык зашит в
  // промпт, общие вердикты, сторож слеп к чужому языку). Ни одно не роняет
  // конвейер — он просто пишет французскую сессию по английским правилам.
  try {
    const iso = spawnSync(process.execPath, [path.join(HERE, 'check_lang_isolation.mjs'), '--lang', lang], { encoding: 'utf8' });
    if (iso.status !== 0) {
      WARN('ЯЗЫКИ КУРСОВ ПЕРЕПЛЕЛИСЬ — сессия будет написана по правилам чужого языка:');
      String(iso.stderr || "").split(String.fromCharCode(10)).filter((l) => l.includes("ПРОБЛЕМА")).forEach((l) => WARN("  " + l.trim()));
    }
  } catch (e) { WARN(`сторож изоляции языков не запустился: ${e.message}`); }
  return { constitution, constitutionShort, exemplars, verdicts, langFeatures, langName };
}

function exemplarOfSameType(lang, row) {
  // зачем: судья-редактор сравнивает парно с эталоном ТОГО ЖЕ типа
  const map = { новая: "l01_s01", применение: "l01_s02", "голос/слух": "l01_s02", контраст: "l01_s03", перенос: "l01_s02", слова: "l01_s02", checkpoint: "l01_s02", тонкость: "l01_s03" };
  const key = Object.keys(map).find((k) => row.type.startsWith(k)) || "применение";
  // сессия с новой операцией поверх известной — эталон 3
  const id = row.type.startsWith("новая") && row.n > 1 ? "l01_s03" : map[key];
  const f = path.join(ROOT, "exemplars", lang, `${id}.ru.md`);
  LOG(`эталон того же типа для «${row.type}»: ${id}`);
  return read(f);
}

// ---------- бэкенды ----------
function callModel({ system, user, model, maxTokens = 8000, label, attempt = 0 }) {
  const t0 = Date.now();
  LOG(`→ ${label}: backend=${BACKEND} model=${model} system=${system.length} user=${user.length} зн.`);
  let text = "";
  try {
    if (BACKEND === "mock") {
      mockCallCount += 1;
      const mutateOnCall = Number(process.env.FACTORY_MOCK_MUTATE_ON_CALL_NUMBER || "1");
      if (!mockMutationConsumed && mockCallCount === mutateOnCall) {
        mockMutationConsumed = applyMockMutation("FACTORY_MOCK_MUTATE_FILE_ON_CALL", mockMutationConsumed);
      }
      if (label.startsWith("судья локалей") && process.env.FACTORY_MOCK_LOCALE_JUDGE_SEQUENCE) {
        const sequence = process.env.FACTORY_MOCK_LOCALE_JUDGE_SEQUENCE.split(",").map((value) => value.trim()).filter(Boolean);
        const verdict = sequence[Math.min(mockLocaleJudgeCallCount, sequence.length - 1)] || "PASS";
        mockLocaleJudgeCallCount += 1;
        text = JSON.stringify({ verdict, verdict_reason: "mock locale sequence", locales: Object.fromEntries(LOCALES.map((locale) => [locale, { verdict }])) });
      } else if (label.startsWith("судья локалей")) {
        text = JSON.stringify({ verdict: "PASS", verdict_reason: "mock", locales: Object.fromEntries(LOCALES.map((locale) => [locale, { verdict: "PASS" }])) });
      } else if (label.startsWith("правка локали") && process.env.FACTORY_MOCK_LOCALE_CORRECTION_FILE) {
        const correctionFile = path.resolve(process.env.FACTORY_MOCK_LOCALE_CORRECTION_FILE);
        const allowedRoot = process.env.FACTORY_SESSION_DIR?.trim();
        if (!allowedRoot || !correctionFile.startsWith(`${path.resolve(allowedRoot)}${path.sep}`)) {
          throw new Error("FACTORY_MOCK_LOCALE_CORRECTION_FILE вне FACTORY_SESSION_DIR");
        }
        text = read(correctionFile);
      } else {
        text = `{"verdict":"PASS","verdict_reason":"mock"}\n\n# MOCK ${label}`;
      }
    } else if (BACKEND === "claude") {
      // зачем: на Windows командная строка ≤ 32 тыс. знаков, а системный промпт
      // с эталонами — 60+ тыс.: промпт уходит файлом, реплика — через stdin.
      // cwd — ВНЕ репозитория, чтобы вызов не тащил CLAUDE.md и хуки проекта
      // (это лишние ~20 тыс. токенов и светофор на каждый вызов).
      fs.mkdirSync(WORK_DIR, { recursive: true });
      const sysFile = path.join(WORK_DIR, `system_${process.pid}_${Date.now()}.md`);
      fs.writeFileSync(sysFile, system, "utf8");
      // зачем: через shell:true пустой аргумент `--tools ""` на Windows исчезает,
      // флаги съезжают и claude печатает текст вместо JSON — поэтому командная
      // строка собирается вручную с явными кавычками.
      const cmdLine = `claude -p --system-prompt-file "${sysFile}" --tools "" --output-format json --model ${model}`;
      const r = spawnSync(cmdLine, {
        encoding: "utf8", input: user, maxBuffer: 64 * 1024 * 1024, shell: true, cwd: WORK_DIR,
      });
      try { fs.unlinkSync(sysFile); } catch (e) { WARN(`не удалось удалить ${sysFile}: ${e.message}`); }
      if (r.error) throw r.error;
      if (r.status !== 0 && !r.stdout) throw new Error(`claude -p завершился с кодом ${r.status}: ${(r.stderr || "").slice(0, 400)}`);
      let j;
      try { j = JSON.parse(r.stdout || "{}"); } catch (e) {
        // зачем: если вывод не JSON — сохранить его целиком для разбора, а не терять
        const dump = path.join(WORK_DIR, `bad_output_${Date.now()}.txt`);
        fs.writeFileSync(dump, `STDOUT:\n${r.stdout}\n\nSTDERR:\n${r.stderr}`, "utf8");
        throw new Error(`claude -p вернул не JSON (${e.message}); вывод сохранён в ${dump}`);
      }
      if (j.is_error) {
        // зачем: лимит подписки — не ошибка скрипта, а пауза. Отдельный тип,
        // чтобы конвейер встал на паузу и продолжил с того же шага, а не упал.
        const msg = String(j.result || "ошибка без текста");
        const e = new Error(`claude -p: ${msg}`);
        if (/session limit|usage limit|rate limit|weekly limit|hit your limit/i.test(msg)) e.isLimit = true;
        // зачем: 03.09 сервер вернул 500 на одном вызове, и упал ВЕСЬ пакет из
        // семи сессий. Сбой сервера временный — ждём минуту и повторяем до 3 раз.
        if (/\b5\d\d\b|Internal server error|overloaded|529/i.test(msg)) e.isTransient = true;
        throw e;
      }
      text = j.result || "";
      LOG(`   стоимость: $${j.total_cost_usd ?? "?"}, ходов ${j.num_turns ?? "?"}, токены in ${j.usage?.input_tokens ?? "?"} (+кэш ${j.usage?.cache_read_input_tokens ?? "?"}) out ${j.usage?.output_tokens ?? "?"}`);
    } else if (BACKEND === "api") {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error("ANTHROPIC_API_KEY не задан в окружении");
      const modelId = { sonnet: "claude-sonnet-5", opus: "claude-opus-5", haiku: "claude-haiku-4-5-20251001" }[model] || model;
      const res = fetchSync("https://api.anthropic.com/v1/messages", {
        "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json",
      }, JSON.stringify({ model: modelId, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }));
      const j = JSON.parse(res);
      if (j.error) throw new Error(`api: ${j.error.type}: ${j.error.message}`);
      text = (j.content || []).map((c) => c.text || "").join("");
      LOG(`   токены: in ${j.usage?.input_tokens} out ${j.usage?.output_tokens}`);
    } else if (BACKEND === "disabled") {
      throw new Error("внешний backend не выбран: укажите явно разрешённый адаптер; автоматический вызов модели запрещён");
    } else {
      throw new Error(`неизвестный backend: ${BACKEND}`);
    }
  } catch (e) {
    LOG(`✗ ${label} упал через ${Date.now() - t0} мс: ${e.message}`);
    // зачем: при лимите подписки ждём до сброса и повторяем тот же вызов —
    // владелец хочет «запустил и ушёл», а лимит приходит каждые ~5 часов.
    if (e.isTransient && (attempt ?? 0) < 3) {
      const n = (attempt ?? 0) + 1;
      LOG(`⏸ сбой сервера, попытка ${n} из 3 через 60 с: ${label}`);
      sleepSync(60_000);
      return callModel({ system, user, model, maxTokens, label, attempt: n });
    }
    if (e.isLimit && WAIT_ON_LIMIT) {
      const resetAt = parseResetTime(e.message);
      const waitMs = Math.max(60_000, resetAt - Date.now() + 60_000);
      // зачем: дневной лимит ждём (5 часов максимум), недельный — 10+ часов,
      // держать процесс и слот столько нельзя: останавливаемся с понятным словом
      const MAX_WAIT_MS = 3 * 60 * 60 * 1000;
      if (waitMs > MAX_WAIT_MS) {
        LOG(`ранний выход: лимит сбрасывается через ${Math.round(waitMs / 3600000)} ч (${new Date(resetAt).toLocaleTimeString()}) — это дольше трёх часов, не жду. Запусти заново после сброса.`);
        throw e;
      }
      LOG(`⏸ лимит подписки. Жду до сброса: ${new Date(resetAt).toLocaleTimeString()} (${Math.round(waitMs / 60000)} мин), затем повтор ${label}`);
      sleepSync(waitMs);
      LOG(`▶ продолжаю после лимита: ${label}`);
      return callModel({ system, user, model, maxTokens, label });
    }
    throw e;
  }
  LOG(`← ${label}: ${text.length} зн. за ${Date.now() - t0} мс`);
  return text;
}

/** «resets 11:50am (Europe/Dublin)» → метка времени ближайшего такого момента. */
function parseResetTime(msg) {
  const m = /resets\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(msg);
  if (!m) {
    LOG("   время сброса в сообщении не найдено — жду час");
    return Date.now() + 3600_000;
  }
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ap = (m[3] || "").toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  const d = new Date();
  d.setHours(h, min, 0, 0);
  // зачем: окно лимита ≤ 5 часов. Если названное время уже прошло больше
  // часа назад — это следующие сутки; если только что — сброс вот-вот
  // (сообщение могло опоздать), ждать сутки нельзя.
  const diff = d.getTime() - Date.now();
  if (diff < -3600_000) d.setDate(d.getDate() + 1);
  else if (diff <= 0) return Date.now() + 120_000;
  return d.getTime();
}

/** Синхронная пауза без busy-wait: дочерний node спит и выходит. */
function sleepSync(ms) {
  spawnSync(process.execPath, ["-e", `setTimeout(()=>{}, ${Math.round(ms)})`], { stdio: "ignore", timeout: ms + 30_000 });
}

// синхронный fetch через дочерний node: скрипт намеренно последовательный
function fetchSync(url, headers, body) {
  const code = `
    const r = await fetch(${JSON.stringify(url)}, { method: "POST", headers: ${JSON.stringify(headers)}, body: process.env.__BODY });
    process.stdout.write(await r.text());`;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, __BODY: body },
  });
  if (r.error) throw r.error;
  return r.stdout;
}

// зачем: владелец 03.09 — «новые режимы пока не добавляем». Любая механика
// вне этого списка в строке «modes:» — стоп ДО суда, чтобы судьи не тратили
// вызовы на сессию, которую приложение не сможет показать.
const ALLOWED_MODES = new Set([
  "word_card", "listen_choose", "listen_build_dictation", "phrase_builder",
  "context_gap_grammar", "speed_match", "scripted_repeat_compare", "sound_contrast",
]);
function validateModes(file, sourceText = null) {
  const text = sourceText ?? read(file);
  const m = /^modes:\s*([\s\S]*?)(?:\n\s*\n|$)/m.exec(text);
  if (!m) {
    WARN(`${path.basename(file)}: нет строки «modes:» в разделе «Для сборщика»`);
    return { ok: false, unknown: ["(нет строки modes)"] };
  }
  const entries = [...m[1].matchAll(/(\d+)\s*=\s*([a-z_]+)/g)].map((x) => [Number(x[1]), x[2]]);
  const unknown = entries.filter(([, f]) => !ALLOWED_MODES.has(f));
  const taskCount = (text.match(/^\*\*\d+ · /gm) || []).length;
  LOG(`${path.basename(file)}: заданий ${taskCount}, режимов в строке ${entries.length}, незнакомых ${unknown.length}${unknown.length ? " → " + unknown.map(([n, f]) => `${n}=${f}`).join(", ") : ""}`);
  if (entries.length !== taskCount) WARN(`${path.basename(file)}: число заданий (${taskCount}) ≠ записей modes (${entries.length})`);
  if (taskCount < 12) WARN(`${path.basename(file)}: заданий меньше 12`);
  return { ok: unknown.length === 0 && entries.length === taskCount && taskCount >= 12, unknown, taskCount, entries };
}

const extractJson = (text) => {
  const m = /```json\s*([\s\S]*?)```/.exec(text) || /(\{[\s\S]*\})/.exec(text);
  if (!m) throw new Error("в ответе судьи нет JSON");
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    // зачем: судья бреда написал верный разбор, но поставил живой перенос строки
    // внутри значения — JSON так нельзя, и весь вердикт превращался в
    // «судья не вернул JSON». Чиним переносы и табы ВНУТРИ строк и пробуем снова.
    let inStr = false, esc = false, out = "";
    for (const ch of m[1]) {
      if (esc) { out += ch; esc = false; continue; }
      if (ch === "\\") { out += ch; esc = true; continue; }
      if (ch === '"') { inStr = !inStr; out += ch; continue; }
      if (inStr && (ch === String.fromCharCode(10) || ch === String.fromCharCode(13))) { out += " "; continue; }
      if (inStr && ch === String.fromCharCode(9)) { out += " "; continue; }
      out += ch;
    }
    try {
      const fixed = JSON.parse(out);
      WARN(`ответ судьи чинился от переносов внутри строк — разобран со второй попытки`);
      return fixed;
    } catch (e2) { throw new Error(`${e.message}; после чистки переносов: ${e2.message}`); }
  }
};
const stripFence = (text) => {
  let s = text.replace(/^```(?:markdown|md)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  // зачем: редактор иногда пишет реплику до заголовка («Два незакрытых факта
  // чиню так: ...»), и она попадала прямо в урок ученику. Всё до строки
  // «# Английский» — служебное, отрезаем.
  const h = s.search(/^# /m);
  if (h > 0) { WARN(`отрезана служебная преамбула перед заголовком (${h} зн.)`); s = s.slice(h); }
  return s;
};

// ---------- этапы ----------
const PERSONAS = [
  ["A", "тёплый друг, который сам выучил английский в 30 лет и помнит, где было непонятно"],
  ["B", "остроумный редактор журнала, который ненавидит канцелярит и любит точные шутки по теме"],
  ["C", "сценарист сериала: каждая страница — сцена с людьми, репликами и причиной говорить"],
];

// ЛЕСТНИЦА СЛОЖНОСТИ. Владелец 06.09: «уроки должны прогрессировать со
// временем и становиться сложнее, больше слов соедините пары, больше
// дистракторов, более сложные фразы».
// Замер до правки: сессия 1 и сессия 56 были ОДИНАКОВЫ (17 заданий,
// 4 пары, 1.8 слова в ответе) — курс шёл плоско.
// Решения владельца: шкала по номеру УРОКА (внутри урока ровно, ступень
// между уроками); уроки 1-2 не трогаем, лестница начинается с урока 3.
export function difficultyLadder(lesson) {
  const L = Number(lesson) || 1;
  // ступени подобраны так, чтобы соседние уроки отличались незаметно,
  // а урок 1 и урок 32 — принципиально
  const step = (bands) => bands.find(([upTo]) => L <= upTo)[1];
  return {
    lesson: L,
    frozen: L <= 2, // уроки 1-2 уже написаны, правила к ним не применяем
    pairs: step([[2, 4], [4, 4], [12, 5], [24, 6], [32, 7]]),
    distractors: step([[2, 2], [8, 2], [18, 3], [32, 4]]),
    answerWords: step([[2, "1-3"], [6, "2-4"], [16, "3-5"], [32, "4-7"]]),
    tasks: step([[2, 17], [10, 17], [20, 19], [32, 21]]),
    boardTarget: step([[2, 1], [8, 1], [18, 2], [32, 3]]),
    allowedSourceTypes: 8,
  };
}

// Count authored payloads rather than numbers claimed in task headings.
// Numeric phrase/task/board targets guide the editor; they must not create filler.
export function difficultyFacts(text, lesson, atomicPractice = null) {
  const d = difficultyLadder(lesson);
  if (d.frozen) return [];
  const { practice } = practiceSections(text);
  const modesBlock = /^modes:\s*([\s\S]*?)(?:\n\s*\n|$)/m.exec(text)?.[1] ?? "";
  const modes = new Map([...modesBlock.matchAll(/(\d+)\s*=\s*([a-z_]+)/g)].map(m => [Number(m[1]), m[2]]));
  const allowed = new Set(["word_card", "listen_choose", "context_gap_grammar", "phrase_builder", "speed_match", "sound_contrast", "scripted_repeat_compare", "listen_build_dictation"]);
  const normalize = value => value.normalize("NFKC").toLowerCase().replace(/[‘’]/g, "'").replace(/[^\p{L}\p{N}']+/gu, " ").trim().replace(/\s+/g, " ");
  const tasks = practice.split(/^\*\*(?=\d+ · )/m).slice(1);
  const facts = [];
  if (tasks.length < 12) facts.push(`МАЛО ЗАДАНИЙ: ${tasks.length}, минимум 12`);
  if (tasks.length !== d.tasks) facts.push(`ОРИЕНТИР ЗАДАНИЙ: ${tasks.length}, целевой объём ${d.tasks}; оценить learning delta без filler`);
  const newWords = /\*\*(?:Новые слова|Нові слова):\*\*\s*([^\r\n]+)/.exec(text)?.[1]?.trim() ?? "";
  const hasNewWords = !/^(?:[—–-]|нет|немає|none|0)?\s*[.]?$/i.test(newWords);
  const boardTargets = new Set();
  const phraseTargets = new Set();
  let boards = 0;
  for (const [taskIndex, task] of tasks.entries()) {
    const ordinal = Number(/^(\d+)/.exec(task)?.[1]);
    const family = modes.get(ordinal);
    const atomic = atomicPractice?.interactions?.[taskIndex];
    const atomicAnswer = atomic
      ? atomicPractice.answers.find((answer) => answer?.interactionId === atomic.interactionId)
      : null;
    if (!allowed.has(family)) {
      facts.push(`НЕРАЗРЕШЁННАЯ МЕХАНИКА: задание ${ordinal}, ${family ?? "не указана"}`);
      continue;
    }
    if (family === "word_card" && !hasNewWords) facts.push(`КАРТОЧКА БЕЗ НОВОГО СЛОВА: задание ${ordinal}`);
    const body = task.slice(task.indexOf("**") + 2);
    if (family === "speed_match") {
      boards++;
      const atomicPairs = atomic?.family === "speed_match" && Array.isArray(atomic?.modePayload?.pairGrid)
        ? atomic.modePayload.pairGrid.map((pair) => [pair?.target, pair?.meaningByLocale?.[atomicPractice.locale]])
        : null;
      const line = body.split("\n").find(x => /·/.test(x) && /—/.test(x)) ?? "";
      const pairs = atomicPairs ?? line.split("·").map(x => x.split("—").map(y => y.replace(/[*_`]/g, "").trim())).filter(x => x[0] && x[1]);
      const current = new Set(pairs.map(x => normalize(x[0])));
      const meanings = new Set(pairs.map(x => normalize(x[1])));
      if (current.size < d.pairs) facts.push(`ПАРЫ НИЖЕ СТУПЕНИ: задание ${ordinal}, ${current.size}, минимум ${d.pairs}`);
      if (current.size !== pairs.length || meanings.size !== pairs.length) facts.push(`ДУБЛИ В ДОСКЕ: задание ${ordinal}, одинаковые видимые слова или переводы`);
      for (const target of current) {
        if (boardTargets.has(target)) facts.push(`ПОВТОР СЛОВ МЕЖДУ ДОСКАМИ: задание ${ordinal}, ${target}`);
      }
      for (const target of current) boardTargets.add(target);
    }
    if (["listen_choose", "context_gap_grammar"].includes(family)) {
      if (atomic?.modePayload?.isWordCard === true) continue;
      const inline = /→\s*\*\*([^*\r\n]+)\*\*((?:\s*·[^\r\n]+)+)/.exec(body);
      const atomicOptions = atomic?.family === family && Array.isArray(atomic?.responseOptions) ? atomic.responseOptions : null;
      const correctId = atomicAnswer?.correctResponseId ?? null;
      const correctText = normalize(atomicAnswer?.correctText ?? "");
      if (atomicOptions && atomicOptions.filter((option) => option?.responseId === correctId).length !== 1) {
        facts.push(`ATOMIC ANSWER НЕ ПРИВЯЗАН: задание ${ordinal}, правильный responseId отсутствует или неоднозначен`);
        continue;
      }
      const wrong = atomicOptions
        ? new Set(atomicOptions.map((option) => [option?.responseId, normalize(option?.text ?? "")])
          .filter(([responseId, value]) => value && responseId !== correctId && value !== correctText)
          .map(([, value]) => value)).size
        : inline
          ? new Set(inline[2].split("·").map(x => normalize(x)).filter(x => x && x !== normalize(inline[1]))).size
          : new Set([...body.matchAll(/^\s*-\s*❌\s*(.+)$/gm)].map(m => normalize(m[1].split(/\s+—\s+\*/)[0]))).size;
      if (wrong < d.distractors) facts.push(`ДИСТРАКТОРЫ НИЖЕ СТУПЕНИ: задание ${ordinal}, ${wrong}, минимум ${d.distractors}`);
    }
    if (["phrase_builder", "listen_build_dictation"].includes(family)) {
      const target = [...body.matchAll(/→\s*\*\*([^*\r\n]+)\*\*/g)].at(-1)?.[1]
        ?? /^(?:Цель|Ціль):\s*`([^`\r\n]+)`\s*$/mu.exec(body)?.[1];
      if (target && !isWellFormedBeShortAnswer(target)) phraseTargets.add(normalize(target));
    }
  }
  if (boards !== d.boardTarget) facts.push(`ОРИЕНТИР ДОСОК: ${boards}, целевая частота ${d.boardTarget}; верхнего лимита нет`);
  const counts = [...phraseTargets].filter(Boolean).map(x => x.split(" ").length).sort((a, b) => a - b);
  if (counts.length) {
    const median = (counts[Math.floor((counts.length - 1) / 2)] + counts[Math.floor(counts.length / 2)]) / 2;
    const [min, max] = d.answerWords.split("-").map(Number);
    if (median < min || median > max) facts.push(`ОРИЕНТИР ПОЛНОЙ ФРАЗЫ: медиана ${median}, диапазон ${d.answerWords}; не удлинять короткие ответы и не добавлять filler`);
  }
  return facts;
}

// Текст лестницы для автора: он должен видеть ЧИСЛА, а не «пиши сложнее».
function ladderBrief(lesson) {
  const d = difficultyLadder(lesson);
  if (d.frozen) return "Урок 1-2 — начало курса, нагрузка базовая: 17 заданий, 4 пары в Speed Match, 2 неверных варианта, ответы в 1-3 слова.";
  return [
    `Урок ${d.lesson} — ступень сложности:`,
    `- ориентир заданий: ${d.tasks}; минимум 12, повтор ради счётчика запрещён`,
    `- пар в каждом Speed Match: ${d.pairs}`,
    `- неверных вариантов в заданиях с выбором: ${d.distractors}`,
    `- ориентир медианы уникальных полных фраз в сборках: ${d.answerWords} слова; короткие ответы исключены`,
    `- ориентир досок Speed Match: ${d.boardTarget}; это не верхний лимит; слова разных досок не пересекаются`,
    `- только ${d.allowedSourceTypes} существующих source-типов; word_card применима только с новым словом, обязательной квоты разнообразия нет`,
    "Числа пар и неверных вариантов — обязательный минимум. Остальные ориентиры оцениваются педагогом без filler и без новых режимов.",
  ].join(String.fromCharCode(10));
}

function buildVars(ctx, plan, row, known, S) {
  const preauthoringPath = path.join(S.dir, "preauthoring.json");
  return {
    КОНСТИТУЦИЯ: ctx.constitution,
    ЭТАЛОНЫ: ctx.exemplars,
    ВЕРДИКТЫ_ВЛАДЕЛЬЦА: ctx.verdicts,
    // зачем: до 2026-09-05 язык курса был зашит в текст промпта словом
    // «английский» — французский автор получал инструкцию про другой язык.
    ЯЗЫК_КУРСА: ctx.langName,
    ОСОБЕННОСТИ_ЯЗЫКА: ctx.langFeatures,
    СТРОКА_ПЛАНА: `Урок ${S.lesson}, сессия ${row.n} · тип: ${row.type} · грамматика: ${row.grammar} · новые слова: ${row.words} · момент сцены: ${row.moment}`,
    СЦЕНА_ГЛАВЫ: row.scene,
    АРКА_УРОКА: plan.arc,
    ПРОЙДЕННЫЕ_ОПЕРАЦИИ: known.ops.join("; ") || "(ничего)",
    ПРОЙДЕННЫЕ_СЛОВА: known.words.join(", ") || "(ничего)",
    СОСЕДНИЕ_СЕССИИ_КРАТКО: neighborsSummary(S.lang, S.lesson, row.n),
    ЛЕСТНИЦА_СЛОЖНОСТИ: ladderBrief(S.lesson),
    ПРЕДАВТОРСКИЙ_ПАКЕТ: exists(preauthoringPath) ? read(preauthoringPath) : "(PREAUTHORING PASS отсутствует)",
  };
}

function stageDraft(S, ctx, plan, row, known) {
  const files = [];
  for (const [tag, persona] of PERSONAS) {
    const f = path.join(S.dir, `draft_${tag}.ru.md`);
    // зачем: перезапуск после лимита/обрыва не должен переписывать готовое
    if (exists(f) && read(f).length > 1000) {
      LOG(`пропуск автора ${tag}: ${path.basename(f)} уже есть (${read(f).length} зн.)`);
      files.push(f);
      continue;
    }
    // зачем: автор читал ВСЕ три эталона (38 тыс. знаков в каждом из трёх
    // вызовов). Голос задаёт один эталон того же типа + вердикты владельца;
    // остальные два — те же правила другими словами.
    const vars = { ...buildVars(ctx, plan, row, known, S), ЛИЧНОСТЬ_АВТОРА: persona, ЭТАЛОНЫ: exemplarOfSameType(S.lang, row) };
    const system = fill(prompt("author"), vars);
    const text = callModel({ system, user: "Напиши сессию.", model: MODEL_DRAFT, label: `автор ${tag}` });
    write(f, stripFence(text));
    files.push(f);
  }
  return files;
}

function candidateProjection(sessionIdentity, sourceText, sourceSha256) {
  return {
    schemaVersion: "learning_v2_judge_candidate_projection_v1",
    sessionIdentity,
    sourceSha256,
    intro: parseIntro(sourceText),
    practice: parsePractice(sourceText),
  };
}

function captureJudgeSnapshot(S, file) {
  const paths = {
    ru: path.join(S.dir, "final.ru.md"),
    atomic: path.join(S.dir, "practice.atomic.json"),
    ...Object.fromEntries(LOCALES
      .filter((locale) => exists(path.join(S.dir, `final.${locale}.md`)))
      .map((locale) => [locale, path.join(S.dir, `final.${locale}.md`)])),
  };
  if (path.resolve(file) !== path.resolve(paths.ru)) {
    const resolvedFile = path.resolve(file);
    if (path.dirname(resolvedFile) !== path.resolve(S.dir) || !/\.ru\.md$/u.test(path.basename(resolvedFile))) {
      throw new Error(`JUDGE SOURCE HOLD:candidate_source_outside_session:${path.basename(file)}`);
    }
    const bytes = { ru: fs.readFileSync(resolvedFile) };
    const digest = sourceBytesSha256(bytes.ru);
    const sourceText = bytes.ru.toString("utf8");
    const projectionText = JSON.stringify(candidateProjection(SESSION, sourceText, digest));
    const projectionDigest = sourceBytesSha256(Buffer.from(projectionText, "utf8"));
    return {
      kind: "candidate",
      paths: { ru: resolvedFile },
      bytes,
      text: { ru: sourceText, uk: "", atomic: projectionText },
      digests: { ru: digest, projection: projectionDigest },
      bindings: {
        bindingSchemaVersion: CANONICAL_BINDING_SCHEMA_VERSION,
        sourceKind: "candidate",
        sourceSha256: digest,
        exactRuSha256: digest,
        learnerProjectionSha256: projectionDigest,
        sourcePaths: [path.basename(resolvedFile)],
      },
    };
  }
  const bytes = Object.fromEntries(Object.entries(paths).map(([name, sourcePath]) => [name, fs.readFileSync(sourcePath)]));
  const digests = Object.fromEntries(Object.entries(bytes).map(([name, sourceBytes]) => [name, sourceBytesSha256(sourceBytes)]));
  const localeHashes = Object.fromEntries(Object.entries(digests).filter(([name]) => name !== "ru" && name !== "atomic"));
  return {
    kind: "canonical",
    paths,
    bytes,
    text: Object.fromEntries(Object.entries(bytes).map(([name, sourceBytes]) => [name, sourceBytes.toString("utf8")])),
    digests,
    bindings: {
      bindingSchemaVersion: CANONICAL_BINDING_SCHEMA_VERSION,
      sourceSha256: digests.ru,
      exactRuSha256: digests.ru,
      ...(digests.uk ? { exactUkSha256: digests.uk } : {}),
      practiceAtomicSha256: digests.atomic,
      localeHashes: { ru: digests.ru, ...localeHashes },
      sourcePaths: ["final.ru.md", ...Object.keys(localeHashes).map((locale) => `final.${locale}.md`), "practice.atomic.json"],
    },
  };
}

function assertJudgeSnapshot(snapshot) {
  for (const name of Object.keys(snapshot.paths)) {
    const liveSha256 = sourceSha256(snapshot.paths[name]);
    if (liveSha256 !== snapshot.digests[name]) {
      throw new Error(`JUDGE SOURCE HOLD:source_digest_changed:${name}:expected=${snapshot.digests[name]}:live=${liveSha256}`);
    }
  }
}

const captureCanonicalJudgeSnapshot = captureJudgeSnapshot;
const assertCanonicalJudgeSnapshot = assertJudgeSnapshot;

function canonicalReceiptFresh(receipt, snapshot) {
  if (snapshot.kind === "candidate") {
    return receipt?.sourceKind === "candidate"
      && receipt?.sourceSha256 === snapshot.digests.ru
      && receipt?.exactRuSha256 === snapshot.digests.ru
      && receipt?.learnerProjectionSha256 === snapshot.digests.projection;
  }
  return receipt?.sourceSha256 === snapshot.digests.ru
    && receipt?.exactRuSha256 === snapshot.digests.ru
    && Object.entries(snapshot.bindings.localeHashes ?? {}).every(([locale, digest]) => receipt?.localeHashes?.[locale] === digest)
    && receipt?.practiceAtomicSha256 === snapshot.digests.atomic;
}

function mockMeaningfulSourceQuote(sourceTexts) {
  for (const source of Object.values(sourceTexts)) {
    const line = String(source ?? "").split(/\r?\n/gu)
      .map((value) => ({
        value: value.replace(/[`*_#]/gu, "").trim(),
        heading: /^\s{0,3}#{1,6}\s+\S/u.test(value),
      }))
      .find(({ value, heading }) => !heading && value.length >= 12 && (value.match(/[\p{L}\p{N}]+/gu) ?? []).length >= 2)?.value;
    if (line) return line;
  }
  throw new Error("JUDGE RECEIPT HOLD: mock source has no meaningful exact quote");
}

function receiptRuntimeIdentity(role) {
  return {
    sessionId: SESSION,
    role,
    reviewer: {
      schemaVersion: "learning_v2_reviewer_identity_v1",
      reviewerId: `pipeline-${role}`,
      sessionId: SESSION,
      role,
    },
  };
}

function structuredMockEvidence(sourceTexts, role, locales) {
  return locales.map((locale) => ({
    fieldPath: `final.${locale}.md`,
    quote: mockMeaningfulSourceQuote({ [locale]: sourceTexts[locale] }),
    analysis: "Точная цитата подтверждает проверяемый аспект текущей сессии.",
    coverage: role === "judge_locales" ? [role, locale] : [role],
  }));
}

function receiptEvidenceContractPrompt(role, locales) {
  return `\n\nОБЯЗАТЕЛЬНЫЙ КОНТРАКТ PASS-КВИТАНЦИИ: evidence — непустой JSON-массив объектов {fieldPath, quote, analysis, coverage}. fieldPath — точное имя final.<locale>.md; quote — точная содержательная цитата из этого файла; analysis — объяснение проверки; coverage — массив, содержащий \"${role}\"${role === "judge_locales" ? " и код соответствующей локали" : ""}. Для PASS нужны evidence по: ${locales.map((locale) => `final.${locale}.md`).join(", ")}. Строки вместо объектов запрещены.`;
}

function assertPassReceiptContract(receipt, label, sourceTexts, expectedRole, requiredEvidenceLocales = []) {
  if (receipt?.verdict !== "PASS") return;
  const issues = judgeReceiptContractIssues(receipt, label, sourceTexts, SESSION, expectedRole, { requiredEvidenceLocales });
  if (issues.length) throw new Error(`JUDGE RECEIPT HOLD:${issues.join(" | ")}`);
}

function writeJudgeTransaction(entries, snapshot) {
  const originals = new Map(entries.map(({ file }) => [file, exists(file) ? fs.readFileSync(file) : null]));
  try {
    if (!mockReceiptMutationConsumed) {
      mockReceiptMutationConsumed = applyMockMutation("FACTORY_MOCK_MUTATE_FILE_BEFORE_RECEIPT_WRITE", mockReceiptMutationConsumed);
    }
    assertCanonicalJudgeSnapshot(snapshot);
    for (const { file, value, log = null } of entries) {
      assertCanonicalJudgeSnapshot(snapshot);
      write(file, JSON.stringify(value, null, 2));
      assertCanonicalJudgeSnapshot(snapshot);
      if (log) LOG(log);
    }
    assertCanonicalJudgeSnapshot(snapshot);
  } catch (error) {
    for (const [file, original] of originals) {
      if (original === null) {
        try { if (exists(file)) fs.unlinkSync(file); } catch {}
      } else {
        fs.writeFileSync(file, original);
      }
    }
    throw error;
  }
}

function writeBoundStatus(S, payload) {
  const finalRu = path.join(S.dir, "final.ru.md");
  const initialSession = read(finalRu);
  requirePreJudgeChoreography({ sessionIdentity: SESSION, sessionDir: S.dir, judgedFile: finalRu, judgedSource: initialSession });
  const snapshot = captureCanonicalJudgeSnapshot(S, finalRu);
  requirePreJudgeChoreography({
    sessionIdentity: SESSION,
    sessionDir: S.dir,
    judgedFile: finalRu,
    judgedSource: snapshot.text.ru,
    canonicalSources: snapshot.text,
  });
  writeJudgeTransaction([{
    file: path.join(S.dir, "status.json"),
    value: { ...payload, ...snapshot.bindings },
  }], snapshot);
}

export function composeCurrentJudgeInputs({ ru, uk, atomic }) {
  let source;
  try {
    source = JSON.parse(atomic);
  } catch (error) {
    throw new Error(`JUDGE SOURCE HOLD:practice_atomic_malformed:${error.message}`);
  }
  const projection = source.schemaVersion === "learning_v2_judge_candidate_projection_v1"
    ? source
    : {
      schemaVersion: source.schemaVersion,
      courseSessionId: source.courseSessionId,
      interactionsByLocale: source.interactionsByLocale,
      answers: source.answers,
    };
  return {
    kind: "canonical",
    СЕССИЯ: ru,
    СЕССИЯ_UK: uk,
    ФАКТИЧЕСКАЯ_LEARNER_PROJECTION: JSON.stringify(projection, null, 2),
  };
}

function stageJudge(S, ctx, plan, row, known, file, only = null, options = {}) {
  const snapshot = options.snapshot ?? captureCanonicalJudgeSnapshot(S, file);
  const session = snapshot.text.ru;
  const preJudge = snapshot.kind === "canonical"
    ? requirePreJudgeChoreography({
      sessionIdentity: SESSION,
      sessionDir: S.dir,
      judgedFile: file,
      judgedSource: session,
      canonicalSources: snapshot.text,
    })
    : { session: SESSION };
  assertCanonicalJudgeSnapshot(snapshot);
  LOG(snapshot.kind === "canonical"
    ? `PREJUDGE PASS: ${preJudge.session}; atomic ↔ ru/uk Markdown и choreography подтверждены`
    : `PREJUDGE PASS: ${preJudge.session}; candidate bytes ↔ learner projection подтверждены`);
  const v = validateModes(file, session);
  if (!v.ok) {
    LOG(`ранний выход из суда: ${path.basename(file)} не проходит проверку механик/объёма — сначала правка`);
    const verdicts = { judge_learner: { verdict: "BLOCK", verdict_reason: "механики вне списка приложения или объём" }, judge_taste: { verdict: "BLOCK", verdict_reason: "не судился" }, judge_pedagogy: { verdict: "BLOCK", verdict_reason: `modes: ${v.unknown.map(([n, f]) => `${n}=${f}`).join(", ") || "объём"}` } };
    return options.returnRun ? { verdicts, pendingWrites: [], snapshot } : verdicts;
  }
  // зачем: судьям — сжатая Конституция и ОДИН эталон того же типа (не три):
  // контекст судьи ~в 3 раза дешевле, а вкус задаётся парным сравнением
  const base = {
    ...buildVars(ctx, plan, row, known, S),
    КОНСТИТУЦИЯ: ctx.constitutionShort,
    ЭТАЛОНЫ: "",
    ...composeCurrentJudgeInputs(snapshot.text),
  };
  const same = exemplarOfSameType(S.lang, row);
  const facts = machineFacts(file, SESSION, session, snapshot.text.atomic);
  LOG(`машинные факты:\n${facts}`);
  const out = {};
  const pendingWrites = [];
  const forceRoles = new Set(options.forceRoles ?? []);
  for (const [name, vars] of [
    ["judge_learner", { ...base, СЕССИЯ: session }],
    ["judge_taste", { ...base, СЕССИЯ: session, ЭТАЛОН_ТОГО_ЖЕ_ТИПА: same }],
    ["judge_pedagogy", { ...base, СЕССИЯ: session, МАШИННЫЕ_ФАКТЫ: facts }],
    // зачем: гладкая неправда («в русском свой оттенок, в английском одно fast»)
    // проходила мимо судьи вкуса — он смотрит на голос и юмор. Отдельный судья
    // проверяет только правду утверждений, больше ничего.
    ["judge_nonsense", { ...base, СЕССИЯ: session }],
    // зачем: 05.09.2026 владелец прочитал страницу, которую пропустили ВСЕ
    // четыре судьи, и не понял её сути. Все они эксперты: знают правила и
    // ищут нарушения. Этот читает как человек без языка и проверяет одно —
    // понятно ли. Не понял он — не поймёт и ученик.
    ["judge_reader", { ...base, СЕССИЯ: session }],
  ].filter(([name]) => !only || only.includes(name))) {
    const cacheFile = path.join(S.dir, `${path.basename(file, ".ru.md")}.${name}.json`);
    // зачем: вердикт по неизменившемуся файлу не пересуживаем — экономия
    // после обрыва по лимиту (один вызов судьи ≈ $0.31)
    let verdictFresh = exists(cacheFile) && !forceRoles.has(name);
    if (verdictFresh) {
      try {
        const cached = JSON.parse(read(cacheFile));
        if (!canonicalReceiptFresh(cached, snapshot)) {
          verdictFresh = false;
          LOG(`   ${name}: кэш не связан со всем canonical source set — сужу заново`);
        }
        if (verdictFresh && cached.verdict) {
          const cachedSources = Object.fromEntries(Object.entries({ ru: snapshot.text.ru, uk: snapshot.text.uk }).filter(([, value]) => value));
          const cachedIssues = cached.verdict === "PASS"
            ? judgeReceiptContractIssues(cached, name, cachedSources, SESSION, name)
            : [];
          if (cachedIssues.length) {
            verdictFresh = false;
            LOG(`   ${name}: кэш не проходит receipt contract (${cachedIssues.join("; ")}) — сужу заново`);
          }
        }
        if (verdictFresh && cached.verdict) {
          LOG(`   ${name}: из кэша — ${cached.verdict}`);
          out[name] = cached;
          continue;
        }
      } catch (e) { WARN(`кэш вердикта ${path.basename(cacheFile)} нечитаем (${e.message}) — сужу заново`); }
    }
    assertCanonicalJudgeSnapshot(snapshot);
    const text = callModel({ system: `${fill(prompt(name), vars)}${receiptEvidenceContractPrompt(name, ["ru"])}`, user: "Вынеси вердикт.", model: MODEL_BY_JUDGE[name] || MODEL_JUDGE, label: `${name} · ${path.basename(file)}` });
    assertCanonicalJudgeSnapshot(snapshot);
    let j;
    try { j = extractJson(text); } catch (e) {
      // зачем: судья бреда оборвал JSON на середине, но словами написал внятный
      // вердикт («вердикт — на доработку, поправить три места»). Раньше вся его
      // работа превращалась в «судья не вернул JSON» и терялась. Достаём вердикт
      // из текста, а сырой ответ всё равно сохраняем для чтения человеком.
      const vm = /"verdict"s*:s*"(PASS|REVISE|BLOCK)"/.exec(text)
        || (/BLOCK/.test(text) ? [null, "BLOCK"] : null)
        || (/на доработку|REVISE|доработ/i.test(text) ? [null, "REVISE"] : null);
      const verdict = vm ? vm[1] : "REVISE";
      WARN(`${name}: ${e.message}; вердикт взят из текста ответа — ${verdict}`);
      j = { verdict, verdict_reason: "JSON повреждён, вердикт прочитан из текста ответа", raw: text };
    }
    if (BACKEND === "mock" && process.env.FACTORY_MOCK_JUDGE_OMIT_EVIDENCE !== "1") {
      j = { ...j, evidence: structuredMockEvidence({ ru: snapshot.text.ru, uk: snapshot.text.uk }, name, ["ru"]) };
    }
    j = name === "judge_taste"
      ? bindTasteReceiptToSource(j, file, { expectedSourceSha256: snapshot.digests.ru, sourceBytes: snapshot.bytes.ru })
      : j;
    j = { ...j, ...receiptRuntimeIdentity(name), ...snapshot.bindings };
    assertPassReceiptContract(j, name, Object.fromEntries(Object.entries({ ru: snapshot.text.ru, uk: snapshot.text.uk }).filter(([, value]) => value)), name);
    out[name] = j;
    pendingWrites.push({ file: cacheFile, name, value: j, log: `   ${name}: ${j.verdict} — ${j.verdict_reason}` });
  }
  assertCanonicalJudgeSnapshot(snapshot);
  if (!options.deferWrites) writeJudgeTransaction(pendingWrites, snapshot);
  return options.returnRun ? { verdicts: out, pendingWrites, snapshot } : out;
}

// зачем: замер 05.09.2026 на ОДНОМ тексте — три прогона дали разные вердикты
// (reader 2/3, 2/3, 1/3; nonsense REVISE, BLOCK, REVISE), и из 12 претензий
// лишь ОДНА повторилась во всех трёх, девять оказались разовым шумом.
// Сессия 45 прошла 12 кругов, потому что чинился шум. Решение владельца:
// судить дважды и чинить только то, что нашлось в обоих прогонах.
const DOUBLE_JUDGE = ["judge_nonsense", "judge_reader", "judge_taste"];

function problemsOf(name, j) {
  if (!j) return [];
  const raw = name === "judge_reader"
    ? (j.pages || []).flatMap((pg) => pg.problems || [])
    : (j.problems || []);
  return raw.map((x) => String(x.quote || "").slice(0, 45).trim()).filter(Boolean);
}

// Вердикт из двух прогонов: худший из совпавших. Претензия, которой нет во
// втором прогоне, не может блокировать — она не воспроизводится.
function mergeTwo(name, a, b) {
  if (!b) return a;
  const setB = new Set(problemsOf(name, b));
  const both = problemsOf(name, a).filter((q) => setB.has(q));
  const worst = RANK[a.verdict] <= RANK[b.verdict] ? a : b;
  const best = worst === a ? b : a;
  // обе стороны согласны на BLOCK/REVISE только если есть общая претензия
  if (both.length === 0 && worst.verdict !== "PASS") {
    LOG(`   ${name}: прогоны разошлись полностью (${a.verdict}/${b.verdict}) — беру мягкий ${best.verdict}, претензии не воспроизвелись`);
    return { ...best, verdict_reason: `два прогона разошлись (${a.verdict}/${b.verdict}), общих претензий нет: ${best.verdict_reason || ""}` };
  }
  LOG(`   ${name}: два прогона ${a.verdict}/${b.verdict}, общих претензий ${both.length} — беру ${worst.verdict}`);
  return { ...worst, confirmed_problems: both };
}

// Судит дважды тех судей, чьи вердикты нестабильны, и оставляет пересечение.
function stageJudgeStable(S, ctx, plan, row, known, file, only = null) {
  const snapshot = captureCanonicalJudgeSnapshot(S, file);
  const firstRun = stageJudge(S, ctx, plan, row, known, file, only, { snapshot, deferWrites: true, returnRun: true });
  const first = firstRun.verdicts;
  const needSecond = Object.keys(first).filter((n) => DOUBLE_JUDGE.includes(n) && first[n].verdict !== "PASS");
  if (!needSecond.length) {
    writeJudgeTransaction(firstRun.pendingWrites, snapshot);
    return first;
  }
  LOG(`второй прогон для: ${needSecond.join(", ")} — чиним только повторяющееся`);
  const out = { ...first };
  const writes = firstRun.pendingWrites.filter(({ name }) => !needSecond.includes(name));
  for (const name of needSecond) {
    const cacheFile = path.join(S.dir, `${path.basename(file, ".ru.md")}.${name}.json`);
    const secondRun = stageJudge(S, ctx, plan, row, known, file, [name], {
      snapshot,
      deferWrites: true,
      forceRoles: [name],
      returnRun: true,
    });
    const second = secondRun.verdicts[name];
    out[name] = mergeTwo(name, first[name], second);
    writes.push({ file: cacheFile, name, value: { ...out[name], ...snapshot.bindings }, log: `   ${name}: merged ${first[name].verdict}/${second.verdict} → ${out[name].verdict}` });
    writes.push({ file: path.join(S.dir, `${path.basename(file, ".ru.md")}.${name}.run1.json`), name: `${name}.run1`, value: { ...first[name], ...snapshot.bindings } });
  }
  assertCanonicalJudgeSnapshot(snapshot);
  writeJudgeTransaction(writes, snapshot);
  return out;
}

const RANK = { PASS: 2, REVISE: 1, BLOCK: 0 };
const score = (v) => Object.values(v).reduce((s, j) => s + (RANK[j.verdict] ?? 0), 0);

function stageEdit(S, ctx, plan, row, known, file, verdicts) {
  const vars = {
    ...buildVars(ctx, plan, row, known, S),
    СЕССИЯ: read(file),
    ЭТАЛОН_ТОГО_ЖЕ_ТИПА: exemplarOfSameType(S.lang, row),
    ВЕРДИКТ_УЧЕНИКА: JSON.stringify(verdicts.judge_learner ?? { verdict: "—" }, null, 2),
    ВЕРДИКТ_РЕДАКТОРА: JSON.stringify(verdicts.judge_taste ?? { verdict: "—" }, null, 2),
    ВЕРДИКТ_ПЕДАГОГА: JSON.stringify(verdicts.judge_pedagogy ?? { verdict: "—" }, null, 2),
    ВЕРДИКТ_БРЕДА: JSON.stringify(verdicts.judge_nonsense ?? { verdict: "—" }, null, 2),
    МАШИННЫЕ_ФАКТЫ: machineFacts(file, SESSION),
  };
  const text = callModel({ system: fill(prompt("editor"), vars), user: "Исправь сессию.", model: MODEL_JUDGE, label: `редактор · ${path.basename(file)}` });
  const body = stripFence(text).split(/\n## Изменения/)[0].trim();
  const f = path.join(S.dir, `${path.basename(file, ".ru.md")}.edited.ru.md`);
  write(f, body);
  write(path.join(S.dir, `${path.basename(file, ".ru.md")}.edit_notes.md`), text.split(/\n## Изменения/)[1] ? `## Изменения${text.split(/\n## Изменения/)[1]}` : "(редактор не оставил списка изменений)");

  // зачем: 03.09 вторая правка починила интро 3 и СЛОМАЛА интро 1 — редактор
  // не видел последствий своей работы до следующего круга. Сверяем сразу и
  // даём одну попытку доправить, называя, что именно он сломал или не закрыл.
  const hard = (p) => machineFacts(p, SESSION).split("\n").filter((l) => HARD_FACT_RE.test(l));
  const left = hard(f);
  if (left.length) {
    LOG(`   после правки осталось незакрытым (${left.length}): ${left.map((l) => l.split("—")[0].trim()).join("; ")}`);
    const retry = callModel({
      system: fill(prompt("editor"), { ...vars, СЕССИЯ: body, МАШИННЫЕ_ФАКТЫ: left.join("\n") }),
      user: `Ты уже правил эту сессию, но эти посчитанные факты остались незакрытыми:\n${left.join("\n")}\nЗакрой КАЖДЫЙ, не ломая остальное. Верни полную сессию.`,
      model: MODEL_JUDGE, label: `редактор (добор) · ${path.basename(file)}`,
    });
    const retryBody = stripFence(retry).split(/\n## Изменения/)[0].trim();
    const tmp = path.join(S.dir, `${path.basename(file, ".ru.md")}.edited.retry.ru.md`);
    write(tmp, retryBody);
    const after = hard(tmp);
    if (after.length < left.length) { write(f, retryBody); LOG(`   добор помог: было ${left.length}, стало ${after.length}`); }
    else LOG(`   добор не помог (${after.length}) — оставляю первую правку, решать судьям`);
  }
  return f;
}

/** Структурная сверка локали с мастером — бесплатно, без модели. */
function compareStructure(ru, loc) {
  const issues = [];
  const count = (t) => (t.match(/^\*\*\d+ · /gm) || []).length;
  if (count(ru) !== count(loc)) issues.push(`заданий ${count(loc)} против ${count(ru)}`);
  const modes = (t) => (/^modes:\s*([\s\S]*?)(?:\n\s*\n|$)/m.exec(t)?.[1] ?? "").replace(/\s+/g, " ").trim();
  if (modes(ru) !== modes(loc)) issues.push("строка modes расходится");
  // английские цели: жирные латинские фразы должны совпадать по множеству
  const targets = (t) => new Set([...t.matchAll(/\*\*([A-Za-z][A-Za-z' .,?!-]{2,40})\*\*/g)].map((m) => m[1].trim().toLowerCase()));
  const a = targets(ru), b = targets(loc);
  const lost = [...a].filter((x) => !b.has(x));
  if (lost.length) issues.push(`потеряны английские цели: ${lost.slice(0, 5).join(", ")}`);
  return issues;
}

/** Разбор пакетного ответа «===LOCALE: xx===» на файлы по локалям. */
function splitLocaleBatch(text, expected = LOCALES) {
  const out = {};
  const parts = text.split(/^===LOCALE:\s*([a-zA-Z-]+)\s*===\s*$/m);
  for (let i = 1; i < parts.length; i += 2) out[parts[i].trim()] = parts[i + 1].trim();
  // зачем: когда локаль запрошена ОДНА, модель не ставит разделитель — ей нечего
  // разделять — и весь готовый перевод терялся, а сессия получала BLOCK «локаль
  // не приложена». Текст без разделителей при единственной локали и есть она.
  if (!Object.keys(out).length && expected.length === 1 && text.trim().length > 500) {
    WARN(`локаль ${expected[0]}: ответ без разделителя — беру весь текст как эту локаль`);
    out[expected[0]] = text.trim();
  }
  return out;
}

function captureLocaleAuthority(S, ruFile) {
  const paths = { ru: path.join(S.dir, "final.ru.md"), atomic: path.join(S.dir, "practice.atomic.json") };
  if (path.resolve(ruFile) !== path.resolve(paths.ru)) {
    throw new Error(`LOCALE SOURCE HOLD:candidate_source_not_canonical:${path.basename(ruFile)}`);
  }
  const bytes = Object.fromEntries(Object.entries(paths).map(([name, file]) => [name, fs.readFileSync(file)]));
  return {
    paths,
    bytes,
    text: { ru: bytes.ru.toString("utf8"), atomic: bytes.atomic.toString("utf8") },
    digests: Object.fromEntries(Object.entries(bytes).map(([name, value]) => [name, sourceBytesSha256(value)])),
  };
}

function assertLocaleAuthority(snapshot) {
  for (const name of ["ru", "atomic"]) {
    const liveSha256 = sourceSha256(snapshot.paths[name]);
    if (liveSha256 !== snapshot.digests[name]) {
      throw new Error(`JUDGE SOURCE HOLD:source_digest_changed:${name}:expected=${snapshot.digests[name]}:live=${liveSha256}`);
    }
  }
}

function artifactSnapshot(files) {
  return new Map(files.map((file) => [file, exists(file) ? fs.readFileSync(file) : null]));
}

function restoreArtifactSnapshot(snapshot) {
  for (const [file, original] of snapshot) {
    if (original === null) {
      try { if (exists(file)) fs.unlinkSync(file); } catch {}
    } else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, original);
    }
  }
}

function writeLocaleTransaction(entries, authoritySnapshot, {
  mutationEnv = "FACTORY_MOCK_MUTATE_FILE_BEFORE_LOCALE_COMMIT",
  originalSnapshot = null,
} = {}) {
  const originals = new Map(entries.map(({ file }) => [
    file,
    originalSnapshot?.has(file) ? originalSnapshot.get(file) : (exists(file) ? fs.readFileSync(file) : null),
  ]));
  const staged = [];
  try {
    for (let index = 0; index < entries.length; index += 1) {
      const { file, value } = entries[index];
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const temp = value === null ? null : `${file}.tmp-${process.pid}-${Date.now()}-${index}`;
      if (temp) fs.writeFileSync(temp, value, "utf8");
      staged.push({ file, temp });
    }
    if (mutationEnv === "FACTORY_MOCK_MUTATE_FILE_BEFORE_LOCALE_COMMIT" && !mockLocaleCommitMutationConsumed) {
      mockLocaleCommitMutationConsumed = applyMockMutation(
        mutationEnv,
        mockLocaleCommitMutationConsumed,
      );
    } else if (mutationEnv === "FACTORY_MOCK_MUTATE_FILE_BEFORE_LOCALE_CORRECTION_COMMIT" && !mockLocaleCorrectionCommitMutationConsumed) {
      mockLocaleCorrectionCommitMutationConsumed = applyMockMutation(
        mutationEnv,
        mockLocaleCorrectionCommitMutationConsumed,
      );
    }
    // The authority check is deliberately after every output is staged and
    // immediately before the first rename: no generated locale is visible
    // unless the captured RU + atomic source set is still exact.
    assertLocaleAuthority(authoritySnapshot);
    for (const { file, temp } of staged) {
      assertLocaleAuthority(authoritySnapshot);
      if (exists(file)) fs.unlinkSync(file);
      if (temp) fs.renameSync(temp, file);
      assertLocaleAuthority(authoritySnapshot);
    }
    assertLocaleAuthority(authoritySnapshot);
    for (const { file, value } of entries) {
      LOG(value === null ? "удалён" : "записан", path.relative(ROOT, file), value === null ? "(инвалидация старой квитанции)" : `${value.length} зн.`);
    }
  } catch (error) {
    for (const { temp } of staged) {
      try { if (exists(temp)) fs.unlinkSync(temp); } catch {}
    }
    restoreArtifactSnapshot(originals);
    throw error;
  }
}

function serializeLocaleBatch(batch) {
  return LOCALES.filter((locale) => batch[locale])
    .map((locale) => `===LOCALE: ${locale}===\n${batch[locale].trim()}`)
    .join("\n\n");
}

function stageLocalize(S, ruFile) {
  // зачем: 03.09 локализация стоила 14 вызовов из 28 ($4+ на сессию) — по
  // вызову на каждую из 7 локалей и по вызову на каждого судью локали.
  // Один вызов пишет все семь, один судит все семь: 14 → 2.
  const authoritySnapshot = captureLocaleAuthority(S, ruFile);
  const ru = authoritySnapshot.text.ru;
  const results = {};
  const batchFile = path.join(S.dir, "locales_batch.md");
  const localeReceiptFile = path.join(S.dir, "locales.judge.json");
  const stageArtifactSnapshot = artifactSnapshot([
    batchFile,
    localeReceiptFile,
    ...LOCALES.map((locale) => path.join(S.dir, `final.${locale}.md`)),
  ]);
  let batch;
  let batchText;
  let generatedBatch = false;
  const batchFresh = exists(batchFile) && fs.statSync(batchFile).mtimeMs >= fs.statSync(ruFile).mtimeMs;
  if (exists(batchFile) && !batchFresh) LOG(`кэш перевода устарел (русский правился позже) — перевожу заново`);
  if (batchFresh && read(batchFile).length > 5000) {
    LOG(`пропуск локализации: locales_batch.md уже есть (${read(batchFile).length} зн.)`);
    batchText = read(batchFile);
    batch = splitLocaleBatch(batchText);
  } else {
    assertLocaleAuthority(authoritySnapshot);
    const text = callModel({ system: fill(prompt("localize_batch"), { СЕССИЯ_RU: ru, ЛОКАЛИ: LOCALES.join(", ") }), user: `Сделай версии для локалей: ${LOCALES.join(", ")}. Только эти, по порядку.`, model: MODEL_DRAFT, maxTokens: 32000, label: `локали ×${LOCALES.length} (пакет)` });
    assertLocaleAuthority(authoritySnapshot);
    batchText = stripFence(text);
    batch = splitLocaleBatch(batchText);
    generatedBatch = true;
  }
  const missing = LOCALES.filter((l) => !batch[l] || batch[l].length < 500);
  if (missing.length) WARN(`в пакете нет или пусты локали: ${missing.join(", ")}`);
  const structural = {};
  const localeWrites = generatedBatch ? [{ file: batchFile, value: batchText }] : [];
  for (const loc of LOCALES) {
    if (!batch[loc]) continue;
    const f = path.join(S.dir, `final.${loc}.md`);
    localeWrites.push({ file: f, value: batch[loc] });
    // зачем: структуру (номера заданий, английские цели, строку modes)
    // проверяет скрипт бесплатно — судье остаётся только язык и вкус.
    structural[loc] = compareStructure(ru, batch[loc]);
  }
  writeLocaleTransaction(localeWrites, authoritySnapshot);
  const structIssues = Object.entries(structural).filter(([, v]) => v.length);
  if (structIssues.length) WARN(`структурные расхождения: ${structIssues.map(([l, v]) => `${l}: ${v.join("; ")}`).join(" | ")}`);
  const judgeLocaleBatch = (currentBatch) => {
    const currentMissing = LOCALES.filter((locale) => !currentBatch[locale] || currentBatch[locale].length < 500);
    const parts = LOCALES.filter((locale) => currentBatch[locale])
      .map((locale) => `===LOCALE: ${locale}===\n${currentBatch[locale].trim()}`);
    // зачем: список локалей задаётся флагом (сейчас ru+uk). Раньше и промпт, и
    // реплика говорили «семь» — судья выдавал BLOCK за отсутствие локалей,
    // которых мы сознательно не заказывали.
    assertLocaleAuthority(authoritySnapshot);
    requirePreJudgeChoreography({ sessionIdentity: SESSION, sessionDir: S.dir, judgedFile: ruFile, judgedSource: ru });
    const localeSnapshot = captureCanonicalJudgeSnapshot(S, ruFile);
    if (localeSnapshot.digests.ru !== authoritySnapshot.digests.ru || localeSnapshot.digests.atomic !== authoritySnapshot.digests.atomic) {
      throw new Error("JUDGE SOURCE HOLD:source_digest_changed:locale_authority");
    }
    requirePreJudgeChoreography({
      sessionIdentity: SESSION,
      sessionDir: S.dir,
      judgedFile: ruFile,
      judgedSource: localeSnapshot.text.ru,
      canonicalSources: localeSnapshot.text,
    });
    assertCanonicalJudgeSnapshot(localeSnapshot);
    const jt = callModel({ system: `${fill(prompt("judge_locale_batch"), { СЕССИЯ_RU: ru, СЕССИИ_ЛОКАЛЕЙ: parts.join("\n\n") })}${receiptEvidenceContractPrompt("judge_locales", ["ru", ...LOCALES])}`, user: `Вынеси вердикт по присланным локалям: ${LOCALES.join(", ")}.`, model: MODEL_JUDGE, maxTokens: 8000, label: `судья локалей ×${LOCALES.length}` });
    assertCanonicalJudgeSnapshot(localeSnapshot);
    let verdict;
    try { verdict = extractJson(jt); } catch (e) { WARN(`судья локалей: ${e.message}`); verdict = { verdict: "REVISE", verdict_reason: "нет JSON", raw: jt }; }
    if (BACKEND === "mock" && process.env.FACTORY_MOCK_LOCALE_JUDGE_OMIT_EVIDENCE !== "1") {
      verdict = { ...verdict, evidence: structuredMockEvidence(localeSnapshot.text, "judge_locales", ["ru", ...LOCALES]) };
    }
    verdict = { ...verdict, ...receiptRuntimeIdentity("judge_locales"), ...localeSnapshot.bindings };
    assertPassReceiptContract(verdict, "locales.judge.json", localeSnapshot.text, "judge_locales", ["ru", ...LOCALES]);
    writeJudgeTransaction([{ file: localeReceiptFile, value: verdict }], localeSnapshot);
    const localeResults = {};
    for (const loc of LOCALES) {
      const value = verdict.locales?.[loc]?.verdict ?? (currentMissing.includes(loc) ? "BLOCK" : "?");
      localeResults[loc] = value;
      LOG(`   локаль ${loc}: ${value}`);
    }
    LOG(`   итог локалей: ${verdict.verdict} — ${verdict.verdict_reason}`);
    return { verdict, localeResults };
  };
  let judged = judgeLocaleBatch(batch);
  Object.assign(results, judged.localeResults);
  // зачем: круг правки перевода. Судья находит кальки и непереведённые
  // строки, но раньше его замечания никуда не шли — перевод так и оставался
  // битым. Один круг: переводчик получает вердикт и переписывает.
  const badLocales = LOCALES.filter((l) => results[l] === 'BLOCK' || results[l] === 'REVISE');
  if (badLocales.length) {
    try {
      LOG(`   круг правки локалей: ${badLocales.join(', ')}`);
      const correctedBatch = { ...batch };
      let corrected = false;
      for (const loc of badLocales) {
        const issues = JSON.stringify(judged.verdict.locales?.[loc] ?? judged.verdict, null, 2);
        const cur = correctedBatch[loc] ?? '';
        if (!cur) { WARN(`локаль ${loc}: нечего править — файла нет`); continue; }
        assertLocaleAuthority(authoritySnapshot);
        const fixed = callModel({
          system: fill(prompt('localize_batch'), { СЕССИЯ_RU: ru, ЛОКАЛИ: loc }),
          user: `Ниже твой перевод на ${loc} и замечания судьи-носителя. Перепиши перевод, закрыв КАЖДОЕ замечание. Выдай только готовый текст локали, без преамбулы и без строк ===LOCALE===.

--- ТВОЙ ПЕРЕВОД ---
${cur}

--- ЗАМЕЧАНИЯ ---
${issues}`,
          model: MODEL_JUDGE, maxTokens: 8000, label: `правка локали ${loc}`,
        });
        assertLocaleAuthority(authoritySnapshot);
        const clean = stripFence(fixed).trim();
        if (clean.length > 500) {
          correctedBatch[loc] = clean;
          corrected = true;
        } else WARN(`локаль ${loc}: правка вернула ${clean.length} зн. — оставляю прежний перевод`);
      }
      if (corrected) {
        const correctedBatchText = serializeLocaleBatch(correctedBatch);
        const correctionWrites = [
          { file: batchFile, value: correctedBatchText },
          ...LOCALES.filter((locale) => correctedBatch[locale]).map((locale) => ({
            file: path.join(S.dir, `final.${locale}.md`),
            value: correctedBatch[locale],
          })),
          // The first verdict is bound to the uncorrected locale bytes. Remove
          // it in the same transaction that publishes corrected locale bytes.
          { file: localeReceiptFile, value: null },
        ];
        writeLocaleTransaction(correctionWrites, authoritySnapshot, {
          mutationEnv: "FACTORY_MOCK_MUTATE_FILE_BEFORE_LOCALE_CORRECTION_COMMIT",
          originalSnapshot: stageArtifactSnapshot,
        });
        batch = correctedBatch;
        batchText = correctedBatchText;
        judged = judgeLocaleBatch(batch);
        for (const locale of Object.keys(results)) delete results[locale];
        Object.assign(results, judged.localeResults);
      }
    } catch (error) {
      restoreArtifactSnapshot(stageArtifactSnapshot);
      throw error;
    }
  }
  return results;
}

// ---------- main ----------
async function main() {
  if (!cmd || !SESSION) {
    console.log("usage: node run.mjs <preflight|draft|judge|edit|localize|full|review-export|review-import|review-existing-locales|finalize-status> --session en/l01/s04 [--file x.ru.md] --backend <явно-настроенный-адаптер>");
    process.exit(2);
  }
  const S = parseSession(SESSION);
  if (cmd === "review-export") {
    const { exportReviewPacket } = await import("./review_renewal.mjs");
    const out = opt("out", null);
    if (!out) throw new Error("REVIEW HOLD: review-export requires --out <path>");
    const packet = exportReviewPacket({
      sessionId: SESSION,
      sessionDir: S.dir,
      locales: LOCALES,
      outPath: path.resolve(out),
    });
    LOG(`review packet exported: ${path.resolve(out)}; roles=${packet.requiredRoles.join(",")}`);
    return;
  }
  if (cmd === "review-import") {
    const { importReviewBundle } = await import("./review_renewal.mjs");
    const input = opt("in", null);
    if (!input) throw new Error("REVIEW HOLD: review-import requires --in <path>");
    const receipts = importReviewBundle({ sessionId: SESSION, sessionDir: S.dir, locales: LOCALES, inPath: path.resolve(input) });
    LOG(`review receipts imported: ${receipts.map((receipt) => `${receipt.role}=${receipt.verdict}`).join(", ")}`);
    return;
  }
  if (cmd === "review-existing-locales") {
    const { importExistingLocaleReview } = await import("./review_renewal.mjs");
    const input = opt("in", null);
    if (!input) throw new Error("REVIEW HOLD: review-existing-locales requires --in <path>");
    const receipt = importExistingLocaleReview({ sessionId: SESSION, sessionDir: S.dir, locales: LOCALES, inPath: path.resolve(input) });
    LOG(`existing locale review imported: ${LOCALES.map((locale) => `${locale}=${receipt.locales[locale].verdict}`).join(", ")}`);
    return;
  }
  if (cmd === "finalize-status") {
    const { finalizeReviewedStatus } = await import("./review_renewal.mjs");
    const status = finalizeReviewedStatus({ sessionId: SESSION, sessionDir: S.dir, locales: LOCALES });
    LOG(`status finalized: converged=${status.converged}; sourceSha256=${status.sourceSha256}`);
    return;
  }
  const plan = loadPlan(S.lang, S.lesson);
  const row = plan.rows.get(S.session);
  if (!row) {
    LOG(`ранний выход: в плане урока ${S.lesson} нет сессии ${S.session}`);
    process.exit(2);
  }
  const previousPlans = Array.from({ length: S.lesson - 1 }, (_, index) => loadPlan(S.lang, index + 1));
  const known = knownBefore(plan, S.session, previousPlans);
  LOG(`сессия ${SESSION}: тип «${row.type}», грамматика «${row.grammar}», слова «${row.words}»; известно операций ${known.ops.length}, слов ${known.words.length}`);
  const ctx = courseContext(S.lang);
  fs.mkdirSync(S.dir, { recursive: true });

  const curriculumRow = `Урок ${S.lesson}, сессия ${row.n} · тип: ${row.type} · грамматика: ${row.grammar} · новые слова: ${row.words} · момент сцены: ${row.moment}`;
  const previousSession = S.session > 1
    ? `${S.lang}/l${String(S.lesson).padStart(2, "0")}/s${String(S.session - 1).padStart(2, "0")}`
    : (S.lesson > 1 ? `${S.lang}/l${String(S.lesson - 1).padStart(2, "0")}/s56` : "none");
  const plannedNewWords = String(row.words || "")
    .replace(/^новое:\s*/i, "")
    .split(/;\s*возврат:/i)[0]
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean);
  const priorRangeIssues = [];
  if (S.lang === "en" && S.lesson === 3 && S.session > 25) {
    for (let prior = 25; prior < S.session; prior += 1) {
      const id = `en/l03/s${String(prior).padStart(2, "0")}`;
      const dir = path.join(ROOT, "sessions", "en", "l03", `s${String(prior).padStart(2, "0")}`);
      const readiness = sessionReadiness(dir, ["uk"], { sessionId: id });
      if (!readiness.ready) priorRangeIssues.push(`${id}: ${readiness.issues.slice(0, 2).join(", ")}`);
    }
  }
  const preauthoringExpected = {
    session: SESSION,
    curriculumRow,
    previousSession,
    expectedNewWords: plannedNewWords,
    priorRangeReady: priorRangeIssues.length === 0,
    priorRangeIssues,
  };
  if (cmd === "preflight") {
    console.log(JSON.stringify({
      verdict: "BLOCK",
      session: SESSION,
      documentHashes: preauthoringDocumentManifest(),
      curriculumRow,
      previousSession,
      instruction: "Передайте этот пакет независимому PREAUTHORING GUARDIAN; автор не заполняет его сам.",
    }, null, 2));
    return;
  }
  if (["draft", "edit", "full"].includes(cmd)) {
    const gate = requirePreauthoringReceipt(S.dir, preauthoringExpected);
    if (!gate.ready) {
      WARN(`PREAUTHORING HOLD — автору запрещено начинать:\n  ${gate.issues.join("\n  ")}`);
      process.exit(2);
    }
    LOG(`PREAUTHORING PASS: ${SESSION}; обязательные документы и строка плана подтверждены`);
  }

  if (cmd === "draft") return stageDraft(S, ctx, plan, row, known);
  if (cmd === "single") { checkSingleAnswer(path.join(S.dir, opt("file", "final.ru.md")), SESSION); return; }
  // зачем: 06.09 status.json врал «blockedBy: machine_facts» о живой сессии —
  // гейт пишет статус и выходит, ручная правка его не переписывает. Команда
  // даёт сборщику релиза перепроверить факты по ФИНАЛУ, не дублируя логику.
  // Печатает только не закрытые факты; пустой вывод = фактов нет. Код 0 всегда,
  // чтобы вызывающий отличал «фактов нет» от «скрипт упал».
  if (cmd === "facts") {
    const f = path.join(S.dir, opt("file", "final.ru.md"));
    if (!fs.existsSync(f)) { console.error("НЕТ ФАЙЛА " + f); process.exit(2); }
    const hard = machineFacts(f, SESSION).split("\n").filter((l) => HARD_FACT_RE.test(l));
    for (const l of hard) console.log(l);
    return;
  }
  if (cmd === "judge") return stageJudgeStable(S, ctx, plan, row, known, path.join(S.dir, opt("file", "draft_A.ru.md")));
  if (cmd === "edit") {
    const f = path.join(S.dir, opt("file", "draft_A.ru.md"));
    const v = stageJudge(S, ctx, plan, row, known, f);
    return stageEdit(S, ctx, plan, row, known, f, v);
  }
  if (cmd === "localize") return stageLocalize(S, path.join(S.dir, opt("file", "final.ru.md")));
  if (cmd === "full") {
    // зачем: best-of-3 по ДЕШЁВОМУ предотбору (только судья вкуса, парно с
    // эталоном), полный суд — лишь лучшему. 3 вызова вместо 9 на этом шаге.
    const allDrafts = stageDraft(S, ctx, plan, row, known);
    // зачем: 03.09 судья вкуса дал PASS всем трём черновикам — два суда из
    // трёх были выброшенными деньгами. Машинные факты (касания возвращаемых
    // слов, объём, механики) отсеивают слабейшего бесплатно.
    const scored = allDrafts.map((f) => {
      const facts = machineFacts(f, SESSION);
      const penalty = (facts.match(/МЕНЬШЕ ДВУХ/g) || []).length * 2 + (facts.match(/ни разу правильным ответом/g) || []).length;
      LOG(`машинный отбор ${path.basename(f)}: штраф ${penalty}`);
      return { f, penalty };
    }).sort((a, b) => a.penalty - b.penalty);
    const drafts = scored.length > 2 && scored[2].penalty > scored[0].penalty
      ? (LOG(`отсеян без суда: ${path.basename(scored[2].f)} (штраф ${scored[2].penalty} против ${scored[0].penalty})`), scored.slice(0, 2).map((d) => d.f))
      : allDrafts;
    const PAIR = { better: 3, equal: 2, worse: 1 };
    let best = null;
    for (const f of drafts) {
      const v = stageJudge(S, ctx, plan, row, known, f, ["judge_taste"]);
      const t = v.judge_taste || {};
      const s = (PAIR[t.pairwise] ?? 0) * 10 + (RANK[t.verdict] ?? 0);
      LOG(`   предотбор ${path.basename(f)}: pairwise=${t.pairwise} verdict=${t.verdict} → ${s}`);
      if (!best || s > best.s) best = { f, s, taste: t };
    }
    LOG(`лучший черновик: ${path.basename(best.f)}`);
    const fullV = { ...stageJudgeStable(S, ctx, plan, row, known, best.f, ["judge_learner", "judge_pedagogy", "judge_nonsense", "judge_reader"]), judge_taste: best.taste };
    let cur = { f: best.f, v: fullV, s: score(fullV) };
    const openFacts = (f) => machineFacts(f, SESSION).split(String.fromCharCode(10)).filter((l) => HARD_FACT_RE.test(l));
    for (let round = 1; round <= 2 && (judgeIssues(cur.v, SESSION).length || openFacts(cur.f).length); round++) {
      const facts = openFacts(cur.f);
      LOG(`круг правки ${round}: ${path.basename(cur.f)} (${cur.s}/6, открытых фактов ${facts.length})`);
      if (facts.length) for (const ff of facts) LOG(`   факт: ${ff}`);
      const ef = stageEdit(S, ctx, plan, row, known, cur.f, cur.v);
      const v = stageJudgeStable(S, ctx, plan, row, known, ef);
      cur = { f: ef, v, s: score(v) };
    }
    const finalRu = path.join(S.dir, "final.ru.md");
    // зачем: копируем в final.ru.md только ПОСЛЕ проверок — иначе
    // заблокированная сессия лежит как готовая и попадает в курс
    const publishFinal = () => { fs.copyFileSync(cur.f, finalRu); LOG(`final.ru.md ← ${path.basename(cur.f)} (${cur.s}/6)`); };
    // зачем: 03.09 конвейер ушёл локализовать сессию, которой судья-ученик
    // поставил BLOCK («задания 16 и 17 невыполнимы») — 14 вызовов впустую.
    // BLOCK у любого судьи означает стоп, а не предупреждение.
    // зачем: 03.09 сессия 8 вышла с разрывом «интро ↔ вопрос» — педагог дал
    // REVISE, а REVISE не останавливает. Посчитанный факт не зависит от
    // настроения судьи: пока он не закрыт, сессия не выпускается.
    const hardFacts = machineFacts(cur.f, SESSION)
      .split("\n")
      .filter((l) => HARD_FACT_RE.test(l));
    if (hardFacts.length) {
      WARN(`СТОП перед локализацией — не закрытые машинные факты:\n  ${hardFacts.join("\n  ")}`);

      writeBoundStatus(S, { session: SESSION, ru: cur.s, blockedBy: "machine_facts", facts: hardFacts, at: new Date().toISOString() });
      return;
    }
    const requiredJudges = requiredJudgesForSession(SESSION);
    const blocked = Object.entries(cur.v).filter(([role, j]) => requiredJudges.includes(role) && j?.verdict === "BLOCK");
    if (blocked.length) {
      WARN(`СТОП перед локализацией: ${blocked.map(([n, j]) => `${n} — ${j.verdict_reason}`).join(" | ")}`);
      writeBoundStatus(S, { session: SESSION, ru: cur.s, blocked: blocked.map(([n]) => n), locales: null, at: new Date().toISOString() });
      return;
    }
    if (judgeIssues(cur.v, SESSION).length) WARN(`черновик не получил PASS всех обязательных судей (${requiredJudges.join(", ")}) — проверю финал перед локализацией`);
    publishFinal();
    // зачем: СУД ПО ФИНАЛУ. Ночью 06.09 четыре сессии несли блок, поставленный
    // по ЧЕРНОВИКУ, хотя редактор его уже исправил: s49 при пересуде дала PASS,
    // блок висел зря. Статус обязан отражать то, что реально уйдёт ученику.
    const finalV = stageJudgeStable(S, ctx, plan, row, known, finalRu);
    const brokenTasks = checkSingleAnswer(finalRu, SESSION);
    const finalScore = score(finalV);
    // зачем: 07.09 сессии 29 и 31 набрали порог §10 (четыре PASS) и были
    // прокручены ещё через 6 и 13 кругов правки. Правило было записано, но
    // держалось на дисциплине сессии. Теперь пайплайн говорит это вслух.
    {
      const KEY = requiredJudgesForSession(SESSION);
      const passed = KEY.filter((k) => finalV && finalV[k] && finalV[k].verdict === "PASS");
      if (passed.length === KEY.length) {
        LOG("=".repeat(60));
        LOG(`ПОРОГ ВЫПУСКА ДОСТИГНУТ: ${KEY.length} обязательных судей дали PASS.`);
        LOG("Дальнейшие круги правки ЗАПРЕЩЕНЫ (Конституция §10).");
        const taste = finalV.judge_taste && finalV.judge_taste.verdict;
        if (taste && taste !== "PASS") LOG(`Вердикт judge_taste (${taste}) идёт в отчёт владельцу, а не в правку.`);
        LOG("Следующий шаг: localize → build_release → build_mockup → коммит.");
        LOG("=".repeat(60));
      } else {
        LOG(`до порога выпуска: PASS у ${passed.length}/${KEY.length} обязательных судей (${passed.join(", ") || "нет"})`);
      }
    }
    const finalBlocked = judgeIssues(finalV, SESSION);
    if (finalScore !== cur.s) LOG(`финал судился заново: было ${cur.s}/6 по черновику, стало ${finalScore}/6`);
    if (finalBlocked.length || brokenTasks.length) {
      WARN(`СТОП перед локализацией: нет PASS всех обязательных судей или есть неоднозначные задания (${finalBlocked.join(", ")})`);
      writeBoundStatus(S, { session: SESSION, ru: finalScore, converged: false, needsHumanReview: true, blocked: finalBlocked, brokenTasks, locales: null, at: new Date().toISOString() });
      return;
    }
    const loc = stageLocalize(S, finalRu);
    const incompleteLocales = LOCALES.filter((locale) => loc[locale] !== "PASS");
    if (incompleteLocales.length) {
      WARN(`СТОП перед сборкой: локали без PASS: ${incompleteLocales.join(", ")}`);
      writeBoundStatus(S, { session: SESSION, ru: finalScore, converged: false, needsHumanReview: true, blockedBy: "locales", locales: loc, at: new Date().toISOString() });
      return;
    }
    writeBoundStatus(S, { session: SESSION, ru: finalScore, converged: true, needsHumanReview: false, draftScore: cur.s, locales: loc, at: new Date().toISOString() });
    // зачем: владелец спросил «почему макет не позволяет выбирать сессии
    // урока 2» — макет ничего не запрещал, он был собран ДО того, как эти
    // сессии появились. Пересобираем сами: релиз этой сессии и общий макет,
    // чтобы владелец всегда открывал свежее, а не спрашивал о свежести.
    try {
      const rel = spawnSync(process.execPath, [path.join(HERE, "build_release.mjs"), "--session", SESSION], { encoding: "utf8" });
      const buildProblems = (String(rel.stdout || "") + String(rel.stderr || "")).split(String.fromCharCode(10)).filter((l) => /[BUILD][WARN]/.test(l) && !/ЗАБЛОКИРОВАНА|нет status/.test(l));
      if (buildProblems.length) {
        WARN(`СБОРКА НАШЛА ПРОБЛЕМЫ (${buildProblems.length}) — судьи такое не видят:`);
        for (const bp of buildProblems) WARN(`  ${bp.replace(/^.*[BUILD][WARN]s*/, "")}`);
        try {
          const stp = path.join(S.dir, "status.json");
          const st = exists(stp) ? JSON.parse(read(stp)) : {};
          st.buildProblems = buildProblems.map((l) => l.replace(/^.*[BUILD][WARN]s*/, ""));
          st.needsHumanReview = true;
          writeBoundStatus(S, st);
        } catch (e) { WARN(`не смог записать buildProblems в статус: ${e.message}`); }
      }
      if (rel.status !== 0) WARN(`сборка релиза не прошла (код ${rel.status}) — макет не обновлён`);
      else {
        const mock = spawnSync(process.execPath, [path.join(HERE, "build_mockup.mjs")], { encoding: "utf8" });
        if (mock.status !== 0) WARN(`макет не пересобрался (код ${mock.status})`);
        else LOG(String(mock.stdout || "").split(String.fromCharCode(10)).find((l) => l.includes("сессий в макете")) || "макет пересобран");
      }
    } catch (e) { WARN(`автосборка макета не запустилась: ${e.message}`); }
    return;
  }
  LOG("ранний выход: неизвестная команда", cmd);
  process.exit(2);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
