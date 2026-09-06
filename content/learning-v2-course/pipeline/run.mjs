#!/usr/bin/env node
// Фабрика курса Learning V2 — конвейер одной сессии.
//
// зачем: владелец (2026-09-03) хочет «запустил и ушёл»: 1 792 сессии × 8
// локалей пишутся скриптом, а не руками в чате. Судьи — отдельные вызовы с
// чистой памятью (свежий агент судит честнее — проверено 16.08).
//
// Бэкенды: claude (headless `claude -p`, подписка) | api (Anthropic API,
// ANTHROPIC_API_KEY в окружении — значение ключа скрипт не печатает) | mock.
//
// Запуск:
//   node run.mjs draft    --session en/l01/s04 [--backend claude|api|mock]
//   node run.mjs judge    --session en/l01/s04 --file draft_A.ru.md
//   node run.mjs edit     --session en/l01/s04 --file draft_A.ru.md
//   node run.mjs localize --session en/l01/s04 --file final.ru.md [--locales uk,es]
//   node run.mjs full     --session en/l01/s04
//
// Логи: префикс [FACTORY], каждый ранний выход и каждый catch пишет причину
// (правило владельца «сперва логи»).

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
const BACKEND = opt("backend", process.env.FACTORY_BACKEND || "claude");
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
const listDir = (d, filter = () => true) =>
  exists(d) ? fs.readdirSync(d).filter(filter).sort().map((f) => path.join(d, f)) : [];

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
const prompt = (name) => `${mainRequirement()}\n\n---\n\n${read(path.join(HERE, "prompts", `${name}.md`))}`;
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
  return { lang: m[1], lesson: Number(m[2]), session: Number(m[3]), dir: path.join(ROOT, "sessions", id) };
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

function knownBefore(plan, n) {
  const ops = new Set();
  const words = new Set();
  for (const [k, r] of plan.rows) {
    if (k >= n) continue;
    if (/^новая/.test(r.type) || /^тонкость/.test(r.type)) ops.add(r.grammar);
    for (const w of r.words.split(",")) {
      const t = w.replace(/[—–(].*$/, "").trim();
      if (t && t !== "—" && t !== "-") words.add(t);
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

const HARD_FACT_RE = /НЕ УПОМЯНУТ|СЛОВА БЕЗ ОТРАБОТКИ|МЕНЬШЕ ДВУХ|ОТСЫЛКА К ПРОШЛОМУ|ДЛИНА/;

function machineFacts(file) {
  const text = read(file);
  // зачем: владелец — «давай рассматривать каждую сессию как отдельную, юзер
  // может начать с A2 и не читал предыдущего». Отсылки к прошлому опыту
  // ловим машинно: это дешевле судьи и не пропускается.
  const introPart = text.split(/^## Практика/m)[0] ?? "";
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
  const ret = /\*\*Возвращаются:\*\*\s*(.+)/.exec(text)?.[1] ?? "";
  const practice = text.split(/^## Практика/m)[1] ?? "";
  const facts = [];
  // зачем: длину автор на глаз не выдерживает (12 страниц из 21 вне нормы) —
  // считаем машинно и отдаём редактору, иначе подгонка ложится на человека
  const introPages = introPart.split(new RegExp("^## Интро \\d+", "m")).slice(1);
  introPages.forEach((page, k) => {
    const body = page.split(String.fromCharCode(10) + "**")[0].split(String.fromCharCode(10)).filter((x) => !x.trim().startsWith("###")).join(String.fromCharCode(10)).trim();
    const L = body.length;
    // зачем: владелец 06.09 — «перебор на 4 знака это вообще не проблема,
    // дай окно +-30, ничего страшного». Цель 240-290 автор видит в правилах,
    // но блокирует выпуск только выход за допуск: сессия 5 прошла четыре
    // круга подрезки ради 3-5 знаков — это дороже пользы.
    if (L < INTRO_LEN_MIN - INTRO_LEN_TOLERANCE) facts.push(`интро ${k + 1}: ДЛИНА ${L} знаков — короче нормы ${INTRO_LEN_MIN}-${INTRO_LEN_MAX} даже с допуском ${INTRO_LEN_TOLERANCE}, добавь пользы о слове (не воды)`);
    else if (L > INTRO_LEN_MAX + INTRO_LEN_TOLERANCE) facts.push(`интро ${k + 1}: ДЛИНА ${L} знаков — длиннее нормы ${INTRO_LEN_MIN}-${INTRO_LEN_MAX} даже с допуском ${INTRO_LEN_TOLERANCE}, убери повтор или разгон`);
  });
  // ЛЕСТНИЦА: нагрузка обязана соответствовать ступени урока (владелец 06.09).
  // Уроки 1-2 заморожены — они написаны до правила и переписывать их не велено.
  const lessonFromPath = Number((String(file).match(/[\\\/]l(\d+)[\\\/]/) || [])[1] || 0);
  if (lessonFromPath > 2) {
    const d = difficultyLadder(lessonFromPath);
    const taskCount = (practice.match(/^\*\*\d+ · /gm) || []).length;
    if (taskCount && taskCount < d.tasks) facts.push(`НАГРУЗКА НИЖЕ СТУПЕНИ: заданий ${taskCount}, урок ${lessonFromPath} требует ${d.tasks}`);
    for (const m of practice.matchAll(/Speed Match,\s*(\d+)\s*пар/g)) {
      const got = Number(m[1]);
      if (got < d.pairs) facts.push(`НАГРУЗКА НИЖЕ СТУПЕНИ: пар в Speed Match ${got}, урок ${lessonFromPath} требует ${d.pairs}`);
    }
  }
  // ЗВУК ПО ОТСУТСТВИЮ: разбор на слух не должен строиться на «нет такого звука».
  const soundAbsence = [...practice.matchAll(new RegExp("(нет|без|не слышно|отсутствует)\s{0,3}[«\"']?[а-яёА-ЯЁ]{1,3}[»\"']?", "g"))];
  if (soundAbsence.length) {
    const near = soundAbsence.filter((m) => {
      const around = practice.slice(Math.max(0, m.index - 220), m.index + 80);
      return /🔊|на слух|Различите звуки|Послушайте/.test(around);
    });
    for (const m of near) facts.push(`ЗВУК ПО ОТСУТСТВИЮ: «${m[0]}» — признак «звука нет» ненадёжен (зависит от произношения), различай по началу слова или по гласной`);
  }
  for (const [re, name] of BACKREFS) {
    const hits = introPart.match(re) || [];
    for (const h of hits) facts.push(`ОТСЫЛКА К ПРОШЛОМУ: ${name} — «${h}» ← сессию могут открыть первой, этого опыта у ученика нет`);
  }
  for (const w of ret.split(",").map((s) => s.trim()).filter(Boolean)) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const total = (practice.match(re) || []).length;
    // правильный ответ в формате эталонов — жирным: «→ **I am fine.**», «**I am early. I am not tired.**»
    let asAnswer = (practice.match(new RegExp(`\\*\\*[^*\\n]*\\b${w}\\b[^*\\n]*\\*\\*`, "gi")) || []).length;
    // зачем: в Speed Match слова пишутся БЕЗ жирного («tired — устал · here —
    // здесь»), и счётчик не видел в них правильного ответа. Педагог получал
    // ноль и валил сессию за слово, которое ученик реально соединяет сам.
    // Пара — это тоже правильный ответ, просто не единственная цель задания.
    for (const line of practice.split("\n")) {
      if ((line.match(/·/g) || []).length >= 2 && /—/.test(line) && new RegExp(`\\b${w}\\b`, "i").test(line)) asAnswer++;
    }
    facts.push(`${w}: касаний в практике ${total}, из них правильным ответом ${asAnswer}${total < 2 ? " ← МЕНЬШЕ ДВУХ" : ""}${asAnswer === 0 ? " ← ни разу правильным ответом" : ""}`);
  }
  const v = validateModes(file);
  facts.push(`заданий: ${v.taskCount ?? "?"}; механики вне списка: ${v.unknown?.length ? v.unknown.map(([n, f]) => `${n}=${f}`).join(", ") : "нет"}`);
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
  const introBlocks = text.split(/^## Интро \d+[^\n]*$/m).slice(1);
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
      text = `{"verdict":"PASS","verdict_reason":"mock"}\n\n# MOCK ${label}`;
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
function validateModes(file) {
  const text = read(file);
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
  return { ok: unknown.length === 0 && entries.length === taskCount && taskCount >= 12, unknown, taskCount };
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
function difficultyLadder(lesson) {
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
    mechanicRepeat: step([[2, 1], [8, 1], [18, 2], [32, 3]]),
    mechanicVariety: step([[2, 8], [12, 8], [24, 9], [32, 10]]),
  };
}

// Текст лестницы для автора: он должен видеть ЧИСЛА, а не «пиши сложнее».
function ladderBrief(lesson) {
  const d = difficultyLadder(lesson);
  if (d.frozen) return "Урок 1-2 — начало курса, нагрузка базовая: 17 заданий, 4 пары в Speed Match, 2 неверных варианта, ответы в 1-3 слова.";
  return [
    `Урок ${d.lesson} — ступень сложности:`,
    `- заданий: ${d.tasks}`,
    `- пар в каждом Speed Match: ${d.pairs}`,
    `- неверных вариантов в заданиях с выбором: ${d.distractors}`,
    `- длина правильного ответа: ${d.answerWords} слова`,
    `- одна механика может повторяться до ${d.mechanicRepeat} раз за сессию, КАЖДЫЙ раз на своём наборе слов (пересечение наборов запрещено)`,
    `- разных механик за сессию: не меньше ${d.mechanicVariety}`,
    "Это НЕ потолок качества, а нижняя планка нагрузки: курс обязан становиться труднее, а не топтаться на месте.",
  ].join(String.fromCharCode(10));
}

function buildVars(ctx, plan, row, known, S) {
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

function stageJudge(S, ctx, plan, row, known, file, only = null) {
  const v = validateModes(file);
  if (!v.ok) {
    LOG(`ранний выход из суда: ${path.basename(file)} не проходит проверку механик/объёма — сначала правка`);
    return { judge_learner: { verdict: "BLOCK", verdict_reason: "механики вне списка приложения или объём" }, judge_taste: { verdict: "BLOCK", verdict_reason: "не судился" }, judge_pedagogy: { verdict: "BLOCK", verdict_reason: `modes: ${v.unknown.map(([n, f]) => `${n}=${f}`).join(", ") || "объём"}` } };
  }
  const session = read(file);
  // зачем: судьям — сжатая Конституция и ОДИН эталон того же типа (не три):
  // контекст судьи ~в 3 раза дешевле, а вкус задаётся парным сравнением
  const base = { ...buildVars(ctx, plan, row, known, S), КОНСТИТУЦИЯ: ctx.constitutionShort, ЭТАЛОНЫ: "" };
  const same = exemplarOfSameType(S.lang, row);
  const facts = machineFacts(file);
  LOG(`машинные факты:\n${facts}`);
  const out = {};
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
    const verdictFresh = exists(cacheFile) && fs.statSync(cacheFile).mtimeMs >= fs.statSync(file).mtimeMs;
    if (exists(cacheFile) && !verdictFresh) LOG(`   ${name}: кэш вердикта устарел (файл правился позже) — сужу заново`);
    if (verdictFresh) {
      try {
        const cached = JSON.parse(read(cacheFile));
        if (cached.verdict) {
          LOG(`   ${name}: из кэша — ${cached.verdict}`);
          out[name] = cached;
          continue;
        }
      } catch (e) { WARN(`кэш вердикта ${path.basename(cacheFile)} нечитаем (${e.message}) — сужу заново`); }
    }
    const text = callModel({ system: fill(prompt(name), vars), user: "Вынеси вердикт.", model: MODEL_BY_JUDGE[name] || MODEL_JUDGE, label: `${name} · ${path.basename(file)}` });
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
    out[name] = j;
    write(path.join(S.dir, `${path.basename(file, ".ru.md")}.${name}.json`), JSON.stringify(j, null, 2));
    LOG(`   ${name}: ${j.verdict} — ${j.verdict_reason}`);
  }
  return out;
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
  const first = stageJudge(S, ctx, plan, row, known, file, only);
  const needSecond = Object.keys(first).filter((n) => DOUBLE_JUDGE.includes(n) && first[n].verdict !== "PASS");
  if (!needSecond.length) return first;
  LOG(`второй прогон для: ${needSecond.join(", ")} — чиним только повторяющееся`);
  const out = { ...first };
  for (const name of needSecond) {
    const cacheFile = path.join(S.dir, `${path.basename(file, ".ru.md")}.${name}.json`);
    const keep = exists(cacheFile) ? read(cacheFile) : null;
    try { if (exists(cacheFile)) fs.unlinkSync(cacheFile); } catch (e) { WARN(`не удалось убрать кэш ${name}: ${e.message}`); }
    const second = stageJudge(S, ctx, plan, row, known, file, [name])[name];
    out[name] = mergeTwo(name, first[name], second);
    write(cacheFile, JSON.stringify(out[name], null, 2));
    if (keep) write(path.join(S.dir, `${path.basename(file, ".ru.md")}.${name}.run1.json`), keep);
  }
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
    МАШИННЫЕ_ФАКТЫ: machineFacts(file),
  };
  const text = callModel({ system: fill(prompt("editor"), vars), user: "Исправь сессию.", model: MODEL_JUDGE, label: `редактор · ${path.basename(file)}` });
  const body = stripFence(text).split(/\n## Изменения/)[0].trim();
  const f = path.join(S.dir, `${path.basename(file, ".ru.md")}.edited.ru.md`);
  write(f, body);
  write(path.join(S.dir, `${path.basename(file, ".ru.md")}.edit_notes.md`), text.split(/\n## Изменения/)[1] ? `## Изменения${text.split(/\n## Изменения/)[1]}` : "(редактор не оставил списка изменений)");

  // зачем: 03.09 вторая правка починила интро 3 и СЛОМАЛА интро 1 — редактор
  // не видел последствий своей работы до следующего круга. Сверяем сразу и
  // даём одну попытку доправить, называя, что именно он сломал или не закрыл.
  const hard = (p) => machineFacts(p).split("\n").filter((l) => HARD_FACT_RE.test(l));
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

/** Что видит судья локали: все три интро + первые три задания. Голос живёт
 * в интро; проверять весь список заданий ×7 — платить за одно и то же. */
function excerptForLocaleJudge(text) {
  const intro = text.split(/^## Практика/m)[0] ?? text;
  const practice = text.split(/^## Практика/m)[1] ?? "";
  const firstTasks = practice.split(/^\*\*(?=\d+ · )/m).slice(0, 4).join("**");
  return `${intro}\n## Практика (первые задания)\n${firstTasks}`;
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

function stageLocalize(S, ruFile) {
  // зачем: 03.09 локализация стоила 14 вызовов из 28 ($4+ на сессию) — по
  // вызову на каждую из 7 локалей и по вызову на каждого судью локали.
  // Один вызов пишет все семь, один судит все семь: 14 → 2.
  const ru = read(ruFile);
  const results = {};
  const batchFile = path.join(S.dir, "locales_batch.md");
  let batch;
  const batchFresh = exists(batchFile) && fs.statSync(batchFile).mtimeMs >= fs.statSync(ruFile).mtimeMs;
  if (exists(batchFile) && !batchFresh) LOG(`кэш перевода устарел (русский правился позже) — перевожу заново`);
  if (batchFresh && read(batchFile).length > 5000) {
    LOG(`пропуск локализации: locales_batch.md уже есть (${read(batchFile).length} зн.)`);
    batch = splitLocaleBatch(read(batchFile));
  } else {
    const text = callModel({ system: fill(prompt("localize_batch"), { СЕССИЯ_RU: ru, ЛОКАЛИ: LOCALES.join(", ") }), user: `Сделай версии для локалей: ${LOCALES.join(", ")}. Только эти, по порядку.`, model: MODEL_DRAFT, maxTokens: 32000, label: `локали ×${LOCALES.length} (пакет)` });
    write(batchFile, stripFence(text));
    batch = splitLocaleBatch(stripFence(text));
  }
  const missing = LOCALES.filter((l) => !batch[l] || batch[l].length < 500);
  if (missing.length) WARN(`в пакете нет или пусты локали: ${missing.join(", ")}`);
  const parts = [];
  const structural = {};
  for (const loc of LOCALES) {
    if (!batch[loc]) continue;
    const f = path.join(S.dir, `final.${loc}.md`);
    write(f, batch[loc]);
    // зачем: структуру (номера заданий, английские цели, строку modes)
    // проверяет скрипт бесплатно — судье остаётся только язык и вкус.
    structural[loc] = compareStructure(ru, batch[loc]);
    // судье отдаём интро целиком (там весь голос) + первые три задания,
    // а не всю сессию ×7: 45 тыс. знаков → ~14 тыс.
    parts.push(`===LOCALE: ${loc}===\n${excerptForLocaleJudge(batch[loc])}`);
  }
  const structIssues = Object.entries(structural).filter(([, v]) => v.length);
  if (structIssues.length) WARN(`структурные расхождения: ${structIssues.map(([l, v]) => `${l}: ${v.join("; ")}`).join(" | ")}`);
  // зачем: список локалей задаётся флагом (сейчас ru+uk). Раньше и промпт, и
  // реплика говорили «семь» — судья выдавал BLOCK за отсутствие локалей,
  // которых мы сознательно не заказывали.
  const jt = callModel({ system: fill(prompt("judge_locale_batch"), { СЕССИЯ_RU: excerptForLocaleJudge(ru), СЕССИИ_ЛОКАЛЕЙ: parts.join("\n\n") }), user: `Вынеси вердикт по присланным локалям: ${LOCALES.join(", ")}.`, model: MODEL_JUDGE, maxTokens: 8000, label: `судья локалей ×${LOCALES.length}` });
  let j;
  try { j = extractJson(jt); } catch (e) { WARN(`судья локалей: ${e.message}`); j = { verdict: "REVISE", verdict_reason: "нет JSON", raw: jt }; }
  write(path.join(S.dir, "locales.judge.json"), JSON.stringify(j, null, 2));
  for (const loc of LOCALES) {
    const v = j.locales?.[loc]?.verdict ?? (missing.includes(loc) ? "BLOCK" : "?");
    results[loc] = v;
    LOG(`   локаль ${loc}: ${v}`);
  }
  LOG(`   итог локалей: ${j.verdict} — ${j.verdict_reason}`);
  // зачем: круг правки перевода. Судья находит кальки и непереведённые
  // строки, но раньше его замечания никуда не шли — перевод так и оставался
  // битым. Один круг: переводчик получает вердикт и переписывает.
  const badLocales = LOCALES.filter((l) => results[l] === 'BLOCK' || results[l] === 'REVISE');
  if (badLocales.length) {
    LOG(`   круг правки локалей: ${badLocales.join(', ')}`);
    for (const loc of badLocales) {
      const issues = JSON.stringify(j.locales?.[loc] ?? j, null, 2);
      const cur = exists(path.join(S.dir, `final.${loc}.md`)) ? read(path.join(S.dir, `final.${loc}.md`)) : '';
      if (!cur) { WARN(`локаль ${loc}: нечего править — файла нет`); continue; }
      const fixed = callModel({
        system: fill(prompt('localize_batch'), { СЕССИЯ: ru, ЛОКАЛИ: loc }),
        user: `Ниже твой перевод на ${loc} и замечания судьи-носителя. Перепиши перевод, закрыв КАЖДОЕ замечание. Выдай только готовый текст локали, без преамбулы и без строк ===LOCALE===.

--- ТВОЙ ПЕРЕВОД ---
${cur}

--- ЗАМЕЧАНИЯ ---
${issues}`,
        model: MODEL_JUDGE, maxTokens: 8000, label: `правка локали ${loc}`,
      });
      const clean = stripFence(fixed).trim();
      if (clean.length > 500) { write(path.join(S.dir, `final.${loc}.md`), clean); results[loc] = 'FIXED'; LOG(`   локаль ${loc}: переписана по замечаниям`); }
      else WARN(`локаль ${loc}: правка вернула ${clean.length} зн. — оставляю прежний перевод`);
    }
  }
  return results;
}

// ---------- main ----------
function main() {
  if (!cmd || !SESSION) {
    console.log("usage: node run.mjs <draft|judge|edit|localize|full> --session en/l01/s04 [--file x.ru.md] [--backend claude|api|mock]");
    process.exit(2);
  }
  const S = parseSession(SESSION);
  const plan = loadPlan(S.lang, S.lesson);
  const row = plan.rows.get(S.session);
  if (!row) {
    LOG(`ранний выход: в плане урока ${S.lesson} нет сессии ${S.session}`);
    process.exit(2);
  }
  const known = knownBefore(plan, S.session);
  LOG(`сессия ${SESSION}: тип «${row.type}», грамматика «${row.grammar}», слова «${row.words}»; известно операций ${known.ops.length}, слов ${known.words.length}`);
  const ctx = courseContext(S.lang);
  fs.mkdirSync(S.dir, { recursive: true });

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
    const hard = machineFacts(f).split("\n").filter((l) => HARD_FACT_RE.test(l));
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
      const facts = machineFacts(f);
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
    const openFacts = (f) => machineFacts(f).split(String.fromCharCode(10)).filter((l) => HARD_FACT_RE.test(l));
    for (let round = 1; round <= 2 && (cur.s < 6 || openFacts(cur.f).length); round++) {
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
    const hardFacts = machineFacts(cur.f)
      .split("\n")
      .filter((l) => HARD_FACT_RE.test(l));
    if (hardFacts.length) {
      WARN(`СТОП перед локализацией — не закрытые машинные факты:\n  ${hardFacts.join("\n  ")}`);
      write(path.join(S.dir, "status.json"), JSON.stringify({ session: SESSION, ru: cur.s, blockedBy: "machine_facts", facts: hardFacts, at: new Date().toISOString() }, null, 2));
      return;
    }
    const blocked = Object.entries(cur.v).filter(([, j]) => j.verdict === "BLOCK");
    if (blocked.length) {
      WARN(`СТОП перед локализацией: ${blocked.map(([n, j]) => `${n} — ${j.verdict_reason}`).join(" | ")}`);
      write(path.join(S.dir, "status.json"), JSON.stringify({ session: SESSION, ru: cur.s, blocked: blocked.map(([n]) => n), locales: null, at: new Date().toISOString() }, null, 2));
      return;
    }
    if (cur.s < 6) WARN("сессия не сошлась к PASS×3 за 2 круга — локализую, но нужна ручная проверка");
    publishFinal();
    // зачем: СУД ПО ФИНАЛУ. Ночью 06.09 четыре сессии несли блок, поставленный
    // по ЧЕРНОВИКУ, хотя редактор его уже исправил: s49 при пересуде дала PASS,
    // блок висел зря. Статус обязан отражать то, что реально уйдёт ученику.
    const finalV = stageJudgeStable(S, ctx, plan, row, known, finalRu);
    const brokenTasks = checkSingleAnswer(finalRu, SESSION);
    const finalScore = score(finalV);
    const finalBlocked = Object.entries(finalV).filter(([, j]) => j.verdict === "BLOCK").map(([n]) => n);
    if (finalScore !== cur.s) LOG(`финал судился заново: было ${cur.s}/6 по черновику, стало ${finalScore}/6`);
    if (finalBlocked.length) WARN(`финал несёт блок: ${finalBlocked.join(", ")} — нужен разбор`);
    const loc = stageLocalize(S, finalRu);
    write(path.join(S.dir, "status.json"), JSON.stringify({ session: SESSION, ru: finalScore, converged: finalScore >= 6 && !finalBlocked.length, needsHumanReview: finalScore < 6 || finalBlocked.length > 0 || brokenTasks.length > 0, brokenTasks: brokenTasks.length ? brokenTasks : undefined, blocked: finalBlocked.length ? finalBlocked : undefined, draftScore: cur.s, locales: loc, at: new Date().toISOString() }, null, 2));
    // зачем: владелец спросил «почему макет не позволяет выбирать сессии
    // урока 2» — макет ничего не запрещал, он был собран ДО того, как эти
    // сессии появились. Пересобираем сами: релиз этой сессии и общий макет,
    // чтобы владелец всегда открывал свежее, а не спрашивал о свежести.
    try {
      const rel = spawnSync(process.execPath, [path.join(HERE, "build_release.mjs"), "--session", SESSION], { encoding: "utf8" });
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

main();
