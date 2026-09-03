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
const MODEL_DRAFT = opt("model-draft", process.env.FACTORY_MODEL_DRAFT || "sonnet");
const MODEL_JUDGE = opt("model-judge", process.env.FACTORY_MODEL_JUDGE || "opus");
const SESSION = opt("session", null); // en/l01/s04
const LOCALES = (opt("locales", "uk,es,pt-BR,vi,id,tr,pl")).split(",").map((s) => s.trim()).filter(Boolean);

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

const prompt = (name) => read(path.join(HERE, "prompts", `${name}.md`));
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
  const lines = read(p).split(/\r?\n/);
  const rows = new Map();
  let scene = "";
  let arc = "";
  for (const line of lines) {
    const a = /^\*\*Арка:\*\*\s*(.+)$/.exec(line);
    if (a) arc = a[1].trim();
    const h = /^### Глава \d+ · (.+?) · сцена: (.+)$/.exec(line);
    if (h) scene = `${h[2].trim()} (грамматика главы: ${h[1].trim()})`;
    const r = /^\| (\d+) \| (.+?) \| (.+?) \| (.+?) \| (.+?) \|$/.exec(line);
    if (r && !rows.has(Number(r[1]))) {
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

function courseContext(lang) {
  const constitution = read(path.join(ROOT, "КОНСТИТУЦИЯ.md"));
  const exemplars = listDir(path.join(ROOT, "exemplars", lang), (f) => f.endsWith(".ru.md"))
    .map((f) => `\n\n<!-- эталон ${path.basename(f)} -->\n${read(f)}`).join("");
  const verdicts = listDir(path.join(ROOT, "judgements", "owner"), (f) => f.endsWith(".md"))
    .map((f) => read(f)).join("\n\n---\n\n");
  LOG(`контекст: конституция ${constitution.length} зн., эталонов ${(exemplars.match(/<!-- эталон/g) || []).length}, вердиктов владельца ${verdicts ? verdicts.split("\n\n---\n\n").length : 0}`);
  return { constitution, exemplars, verdicts };
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
function callModel({ system, user, model, maxTokens = 8000, label }) {
  const t0 = Date.now();
  LOG(`→ ${label}: backend=${BACKEND} model=${model} system=${system.length} user=${user.length} зн.`);
  let text = "";
  try {
    if (BACKEND === "mock") {
      text = `{"verdict":"PASS","verdict_reason":"mock"}\n\n# MOCK ${label}`;
    } else if (BACKEND === "claude") {
      const r = spawnSync("claude", ["-p", user, "--system-prompt", system, "--tools", "", "--output-format", "json", "--model", model], {
        encoding: "utf8", maxBuffer: 64 * 1024 * 1024, shell: process.platform === "win32",
      });
      if (r.error) throw r.error;
      const j = JSON.parse(r.stdout || "{}");
      if (j.is_error) throw new Error(`claude -p: ${j.result || "ошибка без текста"}`);
      text = j.result || "";
      LOG(`   стоимость: $${j.total_cost_usd ?? "?"}, ходов ${j.num_turns ?? "?"}`);
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
    throw e;
  }
  LOG(`← ${label}: ${text.length} зн. за ${Date.now() - t0} мс`);
  return text;
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

const extractJson = (text) => {
  const m = /```json\s*([\s\S]*?)```/.exec(text) || /(\{[\s\S]*\})/.exec(text);
  if (!m) throw new Error("в ответе судьи нет JSON");
  return JSON.parse(m[1]);
};
const stripFence = (text) => text.replace(/^```(?:markdown|md)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();

// ---------- этапы ----------
const PERSONAS = [
  ["A", "тёплый друг, который сам выучил английский в 30 лет и помнит, где было непонятно"],
  ["B", "остроумный редактор журнала, который ненавидит канцелярит и любит точные шутки по теме"],
  ["C", "сценарист сериала: каждая страница — сцена с людьми, репликами и причиной говорить"],
];

function buildVars(ctx, plan, row, known, S) {
  return {
    КОНСТИТУЦИЯ: ctx.constitution,
    ЭТАЛОНЫ: ctx.exemplars,
    ВЕРДИКТЫ_ВЛАДЕЛЬЦА: ctx.verdicts,
    СТРОКА_ПЛАНА: `Урок ${S.lesson}, сессия ${row.n} · тип: ${row.type} · грамматика: ${row.grammar} · новые слова: ${row.words} · момент сцены: ${row.moment}`,
    СЦЕНА_ГЛАВЫ: row.scene,
    АРКА_УРОКА: plan.arc,
    ПРОЙДЕННЫЕ_ОПЕРАЦИИ: known.ops.join("; ") || "(ничего)",
    ПРОЙДЕННЫЕ_СЛОВА: known.words.join(", ") || "(ничего)",
    СОСЕДНИЕ_СЕССИИ_КРАТКО: neighborsSummary(S.lang, S.lesson, row.n),
  };
}

function stageDraft(S, ctx, plan, row, known) {
  const files = [];
  for (const [tag, persona] of PERSONAS) {
    const vars = { ...buildVars(ctx, plan, row, known, S), ЛИЧНОСТЬ_АВТОРА: persona };
    const system = fill(prompt("author"), vars);
    const text = callModel({ system, user: "Напиши сессию.", model: MODEL_DRAFT, label: `автор ${tag}` });
    const f = path.join(S.dir, `draft_${tag}.ru.md`);
    write(f, stripFence(text));
    files.push(f);
  }
  return files;
}

function stageJudge(S, ctx, plan, row, known, file) {
  const session = read(file);
  const base = buildVars(ctx, plan, row, known, S);
  const same = exemplarOfSameType(S.lang, row);
  const out = {};
  for (const [name, vars] of [
    ["judge_learner", { ...base, СЕССИЯ: session }],
    ["judge_taste", { ...base, СЕССИЯ: session, ЭТАЛОН_ТОГО_ЖЕ_ТИПА: same }],
    ["judge_pedagogy", { ...base, СЕССИЯ: session }],
  ]) {
    const text = callModel({ system: fill(prompt(name), vars), user: "Вынеси вердикт.", model: MODEL_JUDGE, label: `${name} · ${path.basename(file)}` });
    let j;
    try { j = extractJson(text); } catch (e) { WARN(`${name}: ${e.message}; сырой ответ сохранён`); j = { verdict: "REVISE", verdict_reason: "судья не вернул JSON", raw: text }; }
    out[name] = j;
    write(path.join(S.dir, `${path.basename(file, ".ru.md")}.${name}.json`), JSON.stringify(j, null, 2));
    LOG(`   ${name}: ${j.verdict} — ${j.verdict_reason}`);
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
    ВЕРДИКТ_УЧЕНИКА: JSON.stringify(verdicts.judge_learner, null, 2),
    ВЕРДИКТ_РЕДАКТОРА: JSON.stringify(verdicts.judge_taste, null, 2),
    ВЕРДИКТ_ПЕДАГОГА: JSON.stringify(verdicts.judge_pedagogy, null, 2),
  };
  const text = callModel({ system: fill(prompt("editor"), vars), user: "Исправь сессию.", model: MODEL_JUDGE, label: `редактор · ${path.basename(file)}` });
  const body = stripFence(text).split(/\n## Изменения/)[0].trim();
  const f = path.join(S.dir, `${path.basename(file, ".ru.md")}.edited.ru.md`);
  write(f, body);
  write(path.join(S.dir, `${path.basename(file, ".ru.md")}.edit_notes.md`), text.split(/\n## Изменения/)[1] ? `## Изменения${text.split(/\n## Изменения/)[1]}` : "(редактор не оставил списка изменений)");
  return f;
}

function stageLocalize(S, ruFile) {
  const ru = read(ruFile);
  const results = {};
  for (const loc of LOCALES) {
    const vars = { ЛОКАЛЬ: loc, ЯЗЫК_ЛОКАЛИ: LOCALE_NAMES[loc] || loc, СЕССИЯ_RU: ru };
    const text = callModel({ system: fill(prompt("localize"), vars), user: "Сделай версию для своей локали.", model: MODEL_DRAFT, label: `локаль ${loc}` });
    const f = path.join(S.dir, `final.${loc}.md`);
    write(f, stripFence(text));
    const jt = callModel({ system: fill(prompt("judge_locale"), { ...vars, СЕССИЯ_ЛОКАЛЬ: read(f) }), user: "Вынеси вердикт.", model: MODEL_JUDGE, label: `судья локали ${loc}` });
    let j;
    try { j = extractJson(jt); } catch (e) { WARN(`судья ${loc}: ${e.message}`); j = { verdict: "REVISE", verdict_reason: "нет JSON", raw: jt }; }
    write(path.join(S.dir, `final.${loc}.judge.json`), JSON.stringify(j, null, 2));
    results[loc] = j.verdict;
    LOG(`   локаль ${loc}: ${j.verdict} — ${j.verdict_reason}`);
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
  if (cmd === "judge") return stageJudge(S, ctx, plan, row, known, path.join(S.dir, opt("file", "draft_A.ru.md")));
  if (cmd === "edit") {
    const f = path.join(S.dir, opt("file", "draft_A.ru.md"));
    const v = stageJudge(S, ctx, plan, row, known, f);
    return stageEdit(S, ctx, plan, row, known, f, v);
  }
  if (cmd === "localize") return stageLocalize(S, path.join(S.dir, opt("file", "final.ru.md")));
  if (cmd === "full") {
    // зачем: best-of-3 + критика + правка + повторный суд — до схождения (≤ 2 круга)
    const drafts = stageDraft(S, ctx, plan, row, known);
    let best = null;
    for (const f of drafts) {
      const v = stageJudge(S, ctx, plan, row, known, f);
      const s = score(v);
      LOG(`   итог ${path.basename(f)}: ${s}/6`);
      if (!best || s > best.s) best = { f, v, s };
    }
    let cur = best;
    for (let round = 1; round <= 2 && cur.s < 6; round++) {
      LOG(`круг правки ${round}: ${path.basename(cur.f)} (${cur.s}/6)`);
      const ef = stageEdit(S, ctx, plan, row, known, cur.f, cur.v);
      const v = stageJudge(S, ctx, plan, row, known, ef);
      cur = { f: ef, v, s: score(v) };
    }
    const finalRu = path.join(S.dir, "final.ru.md");
    fs.copyFileSync(cur.f, finalRu);
    LOG(`final.ru.md ← ${path.basename(cur.f)} (${cur.s}/6)`);
    if (cur.s < 6) WARN("сессия не сошлась к PASS×3 за 2 круга — нужна ручная проверка перед локализацией");
    const loc = stageLocalize(S, finalRu);
    write(path.join(S.dir, "status.json"), JSON.stringify({ session: SESSION, ru: cur.s, locales: loc, at: new Date().toISOString() }, null, 2));
    return;
  }
  LOG("ранний выход: неизвестная команда", cmd);
  process.exit(2);
}

main();
