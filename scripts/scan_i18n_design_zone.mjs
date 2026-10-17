#!/usr/bin/env node
/**
 * Зонный сторож «тексты вне переводов» для зоны Дизайна: Карточки, Диалоги-клиент, Видео, Главная, пейволы-вид.
 *
 * зачем (координатор 13.10, к EN-интерфейсу и 9 языкам): общий сторож `scan_untranslated_ui.mjs` ищет русские литералы вне переводчика, но (а) не видит переводные объекты,
 * в которых ЯЗЫКОВ МЕНЬШЕ ДЕВЯТИ (такой текст молча падает на запасной язык: ru-объект без pt-BR/vi/id/tr/pl показывает английский — а без en показал бы русский),
 * (б) считает всё приложение разом. Здесь — только файлы зоны, два класса находок и храповик ПО ФАЙЛАМ: текущее число = потолок, новые не добавляются, падение базы фиксируется `--update`.
 *
 * Классы:
 *   LITERAL     — кириллица в строке/JSX-тексте, не внутри переводчика (языкового объекта или позиционного L()/T()/tri()), вне комментариев и вызовов журнала.
 *   INCOMPLETE  — языковой объект (есть ключ `ru`), где не все 9 языков: ru, uk, en, es, pt-BR, vi, id, tr, pl.
 *
 * Использование:
 *   node scripts/scan_i18n_design_zone.mjs            # проверить против базы
 *   node scripts/scan_i18n_design_zone.mjs --report   # показать каждую находку
 *   node scripts/scan_i18n_design_zone.mjs --update   # зафиксировать новую базу (только вниз)
 *   node scripts/scan_i18n_design_zone.mjs --json     # машинный вывод
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'config', 'i18n-design-zone-baseline.json');
const LANGS9 = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const CYR = /[А-Яа-яЁёІіЇїЄє]/;

/** Файлы зоны (Карточки, Диалоги-клиент, Видео, Главная, пейволы-вид). */
const ZONE = [
  /^app\/flashcards/, /^app\/(community_pack_create|community_packs\/)/, /^app\/dialogue_v2/, /^components\/dialogs\//, /^components\/packs\//, /^components\/youtube\//,
  /^app\/lingman_/, /^app\/youtube_/, /^app\/\(tabs\)\/home\.tsx$/, /^components\/home\//, /^components\/paywall\//, /^app\/(paywall|premium_modal)/, /^components\/cards/, /^app\/video/,
];
/** Не интерфейс игрока: тесты, учебный контент уроков (lesson_data*, intro, theory, error_traps — тексты курса на русском, не строки интерфейса), словарь переводов LangContext, dev-инструменты, лаборатории, зонд анимации, словарные данные, пока не переведённые целиком Ядром. */
// зачем (Темы через координатора 15.10): components/dev/ — dev-инструменты (полоса образцов шрифта с кириллицей), вырезаются из стор-сборки.
// зачем (координатор 15.10, Дизайн): spire_preview_fixtures — моки dev-превью Пика (не интерфейс игрока). Файлы *_gate.ts в пропуск НЕ входят: строки-причины журнала помечаются guard-ok в самом файле.
const SKIP = /\.test\.|(^|\/)dev[_-]|(^|\/)components\/dev\/|_dev\b|DevHub|motion_showcase|learning-v2-lab|CardsHubAnimProbe|\/system-cards\.ts$|\/spire_position_moments_core\.ts$|paywall_copy\.ts$|starter_pack_first_50\.ts$|dialogue_v2_visual_fixture\.tsx$|\/lesson_data_|lesson_help_theory_data|lesson_intro_screens|\/error_traps\/|\/LangContext\.tsx$|\/bot_names\.ts$|devToolRegistry|achievement_copy_ru|\/spire_preview_fixtures\.ts$|\/learningV2IconData\.generated\.ts$/;
// зачем (переводчик 17.10): learningV2IconData.generated.ts — данные иконок из макета; поле name глав (по-русски) на экран не выводится —
// learningV2Icons.ts берёт только icon по номеру урока и главы. Генератор — scripts/gen_learning_v2_icons.mjs.
/** Вызовы журнала/служебные — кириллица в них не видна игроку. */
// зачем (Ядро 15.10): локальные помощники журнала `log(...)` / `logCard(...)` (обёртки над DebugLogger — Пик, окна D191) — тоже журнал, не интерфейс.
const LOG_CALL = /(console\.\w+|DebugLogger\.\w+|logPublish|noteSwallowed\w*|fsLog|tfPrep|cardsPerfCount|logPackDeck\w*|formatLangFilterLog|logSpire\w+|\blog|\blogCard)\s*\(/;
/** Позиционные переводчики: все строковые аргументы — разные языки. */
const POSITIONAL = /\b(L|T|tri|tl|pickTri\w*|triLang|actionToastTri|pickTriLang)\s*\(/;

const isZone = (f) => ZONE.some((re) => re.test(f));

/** зачем (координатор 13.10): храповик считаем по ВСЕМУ app/ и components/ (чужие зоны тоже не должны расти), а ЧИНИТ каждая сессия только свою зону — поэтому в отчёте файлы делятся на «зона Дизайна» и «чужие». */
function zoneFiles() {
  const all = execFileSync('git', ['ls-files', 'app', 'components'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter((f) => /\.tsx?$/.test(f));
  return all.filter((f) => !SKIP.test(f));
}

/** Заменяет комментарии пробелами (номера строк сохраняются). */
function stripComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let quote = null;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') { out += src[i + 1] ?? ''; i += 2; continue; }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') { out += ' '; i += 1; } continue; }
    if (c === '/' && d === '*') {
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === '\n' ? '\n' : ' '; i += 1; }
      out += '  '; i += 2; continue;
    }
    if (c === '\'' || c === '"' || c === '`') quote = c;
    out += c;
    i += 1;
  }
  return out;
}

/** Все строковые литералы: [{ start, end, text, quote }]. */
function stringLiterals(src) {
  const res = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '\'' || c === '"' || c === '`') {
      const start = i;
      i += 1;
      while (i < n && src[i] !== c) {
        if (src[i] === '\\') i += 1;
        if (c !== '`' && src[i] === '\n') break;
        i += 1;
      }
      res.push({ start, end: i, text: src.slice(start + 1, i), quote: c });
    }
    i += 1;
  }
  return res;
}

/** Пары скобок: Map open → close (для {} () []), строки пропускаются. */
function bracketPairs(src, literals) {
  const skip = new Uint8Array(src.length);
  for (const l of literals) for (let k = l.start; k <= l.end && k < src.length; k += 1) skip[k] = 1;
  const stack = [];
  const pairs = new Map();
  for (let i = 0; i < src.length; i += 1) {
    if (skip[i]) continue;
    const c = src[i];
    if (c === '{' || c === '(' || c === '[') stack.push([c, i]);
    else if (c === '}' || c === ')' || c === ']') {
      const top = stack.pop();
      if (top) pairs.set(top[1], i);
    }
  }
  return { pairs, skip };
}

/** Ключи верхнего уровня объектного литерала с позиции `{`. */
function topLevelKeys(src, open, close, skip) {
  const keys = [];
  let depth = 0;
  let i = open + 1;
  let expectKey = true;
  while (i < close) {
    const c = src[i];
    if (skip[i] && depth === 0 && expectKey && (src[i] === '\'' || src[i] === '"')) {
      const q = src[i];
      let j = i + 1;
      while (j < close && src[j] !== q) j += 1;
      const key = src.slice(i + 1, j);
      let k = j + 1;
      while (k < close && /\s/.test(src[k])) k += 1;
      if (src[k] === ':') keys.push(key);
      expectKey = false;
      i = j + 1;
      continue;
    }
    if (skip[i]) { i += 1; continue; }
    if (c === '{' || c === '(' || c === '[') depth += 1;
    else if (c === '}' || c === ')' || c === ']') depth -= 1;
    else if (depth === 0) {
      if (c === ',') expectKey = true;
      else if (expectKey && /[A-Za-z_$]/.test(c)) {
        let j = i;
        while (j < close && /[A-Za-z0-9_$-]/.test(src[j])) j += 1;
        let k = j;
        while (k < close && /\s/.test(src[k])) k += 1;
        if (src[k] === ':') keys.push(src.slice(i, j));
        expectKey = false;
        i = j;
        continue;
      }
    }
    i += 1;
  }
  return keys;
}

function lineOf(src, idx) { let n = 1; for (let i = 0; i < idx; i += 1) if (src.charCodeAt(i) === 10) n += 1; return n; }

// зачем (координатор 15.10, Дизайн): таблицы строк с типом `Nine` — девять языков в строгом кортеже, полноту проверяет компилятор (`satisfies Record<string, Nine>`), а читают их по индексу языка,
// поэтому сторож не должен считать их кириллицу «текстом вне переводов». Признак таблицы — объявление кортежа из девяти строк `type Nine = readonly [string × 9]` и тип `Record<string, Nine>`.
const NINE_TUPLE = /type Nine = readonly \[(?:string, ){8}string\]/;
const NINE_RECORD = /Record<string, Nine>/;

function scanFile(rel) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (NINE_TUPLE.test(text) && NINE_RECORD.test(text)) return { literals: [], incomplete: [] };
  return scanSource(text);
}

/** Разбор одного исходника (экспортируется для теста на синтетических примерах). */
export function scanSource(rawText) {
  const raw = rawText.replace(/\r\n/g, '\n');
  const src = stripComments(raw);
  const literals = stringLiterals(src);
  const { pairs, skip } = bracketPairs(src, literals);
  const positionalSpans = [];
  for (const m of src.matchAll(new RegExp(POSITIONAL.source, 'g'))) {
    const popen = m.index + m[0].length - 1;
    const pclose = pairs.get(popen);
    if (pclose) positionalSpans.push([popen, pclose]);
  }
  // зачем (координатор 13.10; тот же приём, что у scripts/untranslated_ui_positional.mjs): вызов журнала маскируется ЦЕЛИКОМ вместе с аргументами на следующих строках
  // (многострочный `logSpireDock('home', { source: 'DEV-превью', … })`) — это строки для разработчика, игроку они не видны. Потолок не поднимаем: такие литералы просто не считаются.
  const logSpans = [];
  for (const m of src.matchAll(new RegExp(LOG_CALL.source, 'g'))) {
    const lopen = m.index + m[0].length - 1;
    const lclose = pairs.get(lopen);
    if (lclose) logSpans.push([lopen, lclose]);
  }
  const langSpans = [];
  const incomplete = [];
  for (const [open, close] of pairs) {
    if (src[open] !== '{') continue;
    const keys = topLevelKeys(src, open, close, skip);
    const langKeys = keys.filter((k) => LANGS9.includes(k) || k === 'fr' || k === 'de' || k === 'it');
    if (!(keys.includes('ru') && langKeys.length >= 2)) continue;
    langSpans.push([open, close]);
    const missing = LANGS9.filter((k) => !keys.includes(k));
    // «неполный» считаем только для переводного вызова (triLang(lang, {...}) / actionToastTri({...}) / L(...)): таблицы вида `Record<ContentLang, …>` — данные по языку КОНТЕНТА, не интерфейса
    const passedToTranslator = positionalSpans.some(([a, b]) => open > a && close < b);
    if (missing.length > 0 && passedToTranslator) {
      const ruMatch = src.slice(open, close).match(/(?:^|[\s{,])['"]?ru['"]?\s*:\s*(['"`])([\s\S]*?)\1/);
      incomplete.push({ line: lineOf(src, open), missing, have: langKeys.length, ru: ruMatch ? ruMatch[2].replace(/\s+/g, ' ').slice(0, 60) : '' });
    }
  }
  const inSpans = (idx, spans) => spans.some(([a, b]) => idx > a && idx < b);
  /** Группа переводов: во внутренней скобке литерала есть ДРУГОЙ литерал с латиницей без кириллицы (английский вариант рядом) — значит, это не одинокий русский текст. */
  const pairList = [...pairs.entries()];
  const innermostPair = (lit) => {
    let best = null;
    for (const [open, close] of pairList) {
      if (open < lit.start && close > lit.end && (best === null || open > best[0])) best = [open, close];
    }
    return best;
  };
  /** Таблица своего языка: ближайшая внешняя скобка открыта как `const X_RU = [` / `X_UK: Type = {` — любая вложенность. */
  const inLangNamedTable = (lit) => {
    let best = null;
    for (const [open, close] of pairList) {
      if (open < lit.start && close > lit.end && /\b\w*_(RU|UK)\b\s*(:[^=\n]*)?=\s*$/.test(src.slice(Math.max(0, open - 90), open).replace(/[\[{(]\s*$/, ''))) { best = [open, close]; break; }
    }
    return best !== null;
  };
  /** Диспетчер языков: ближайшая фигурная скобка (≤20 000 знаков), внутри которой проверяются ≥8 из 9 кодов `lang === 'xx'` — функция выдаёт текст на КАЖДЫЙ язык, русский хвост по умолчанию тоже её часть. */
  const dispatcherCache = new Map();
  const inLangDispatcher = (lit) => {
    for (const [open, close] of pairList) {
      if (!(open < lit.start && close > lit.end) || src[open] !== '{' || close - open > 20000) continue;
      const key = open;
      if (!dispatcherCache.has(key)) {
        const codes = new Set();
        for (const m of src.slice(open, close).matchAll(/(?:lang|uiLang|locale)\s*===?\s*['"](ru|uk|en|es|pt-BR|vi|id|tr|pl)['"]/g)) codes.add(m[1]);
        dispatcherCache.set(key, codes.size >= 8);
      }
      if (dispatcherCache.get(key)) return true;
    }
    return false;
  };
  const hasLatinSibling = (lit) => {
    const best = innermostPair(lit);
    if (!best) return false;
    return literals.some((o) => o !== lit && o.start > best[0] && o.end < best[1] && /[A-Za-z]{3}/.test(o.text) && !CYR.test(o.text) && !/^[\w./:@#${}()-]+$/.test(o.text));
  };
  const literalsOut = [];
  const lines = src.split('\n');
  // зачем (Ядро 15.10): пометка «guard-ok» пишется В КОММЕНТАРИИ, а src — уже без комментариев: проверка по src её не видела никогда.
  // Номера строк у src и raw совпадают (stripComments заменяет комментарии пробелами), поэтому пометку ищем в исходной строке.
  const rawLines = raw.split('\n');
  for (const lit of literals) {
    if (!CYR.test(lit.text)) continue;
    if (inSpans(lit.start, langSpans) || inSpans(lit.start, positionalSpans) || inSpans(lit.start, logSpans)) continue;
    const ln = lineOf(src, lit.start);
    const lineText = lines[ln - 1] ?? '';
    if (LOG_CALL.test(lineText) || /guard-ok|\[DEV-STATE\]|__DEV__/.test(lineText) || /guard-ok/.test(rawLines[ln - 1] ?? '')) continue;
    // поле данных «titleRu: 'Путешествия'» — не интерфейс
    const before = src.slice(Math.max(0, lit.start - 40), lit.start);
    if (/(Ru|Uk|Es)\s*:\s*$/.test(before)) continue;
    // литерал внутри вызова журнала на соседней строке
    if (/(console\.\w+|DebugLogger\.\w+)\s*\([^)]*$/.test(src.slice(Math.max(0, lit.start - 200), lit.start).split('\n').slice(-3).join('\n'))) continue;
    if (hasLatinSibling(lit)) continue;
    // языковые контейнеры: `const GREETINGS_RU = [...]` / `const X_UK: ... = {...}` — таблица текстов своего языка; ветка `if (lang === 'uk') { ... }` / тернарник по языку — копия текстов этого языка
    const back = src.slice(Math.max(0, lit.start - 700), lit.start);
    if (inLangNamedTable(lit) || inLangDispatcher(lit)) continue;
    if (/(lang|uiLang|locale)\s*===?\s*['"](ru|uk)['"]\s*\)?\s*(\{|\?|&&|return)[\s\S]*$/.test(back) && !/\n\s*\}\s*\n\s*(if|return|const|function)\b[\s\S]*$/.test(back.slice(back.search(/(lang|uiLang|locale)\s*===?\s*['"](ru|uk)['"]/)))) continue;
    literalsOut.push({ line: ln, text: lit.text.replace(/\s+/g, ' ').slice(0, 70) });
  }
  // JSX-текст между тегами
  for (const m of src.matchAll(/>([^<>{}=;]*[А-Яа-яЁё][^<>{}=;]*)</g)) {
    const t = m[1].trim();
    if (!t || inSpans(m.index, langSpans) || inSpans(m.index, positionalSpans)) continue;
    literalsOut.push({ line: lineOf(src, m.index), text: `<jsx> ${t.replace(/\s+/g, ' ').slice(0, 60)}` });
  }
  return { literals: literalsOut, incomplete };
}

export function scanZone() {
  const res = { files: {}, totals: { literals: 0, incomplete: 0 } };
  for (const rel of zoneFiles()) {
    const { literals, incomplete } = scanFile(rel);
    if (literals.length === 0 && incomplete.length === 0) continue;
    res.files[rel] = { literals, incomplete };
    res.totals.literals += literals.length;
    res.totals.incomplete += incomplete.length;
  }
  return res;
}

function counts(res) {
  const out = { totals: res.totals, files: {} };
  for (const [f, v] of Object.entries(res.files)) out.files[f] = { literals: v.literals.length, incomplete: v.incomplete.length };
  return out;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const res = scanZone();
  const cur = counts(res);
  if (args.has('--json')) { console.log(JSON.stringify(res, null, 1)); return; }
  if (args.has('--report')) {
    const mine = args.has('--all') ? Object.entries(res.files) : Object.entries(res.files).filter(([f]) => isZone(f));
    const sum = (k) => mine.reduce((n, [, v]) => n + v[k].length, 0);
    console.log(`${args.has('--all') ? 'Всё приложение' : 'Зона Дизайна'}: литералов вне переводов ${sum('literals')}, неполных языковых объектов ${sum('incomplete')}, файлов ${mine.length} (всего по app/components: ${res.totals.literals}/${res.totals.incomplete}, файлов ${Object.keys(res.files).length})`);
    for (const [f, v] of mine.sort((a, b) => (b[1].literals.length + b[1].incomplete.length) - (a[1].literals.length + a[1].incomplete.length))) {
      console.log(`\n${isZone(f) ? '' : '[чужая зона] '}${f}  (литералов ${v.literals.length}, неполных ${v.incomplete.length})`);
      for (const l of v.literals) console.log(`  L${l.line}: LITERAL ${l.text}`);
      for (const o of v.incomplete) console.log(`  L${o.line}: INCOMPLETE нет ${o.missing.join(',')} — ru: «${o.ru}»`);
    }
    return;
  }
  if (args.has('--update')) {
    fs.writeFileSync(BASELINE, `${JSON.stringify(cur, null, 2)}\n`);
    console.log(`База обновлена: литералов ${cur.totals.literals}, неполных ${cur.totals.incomplete}`);
    return;
  }
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  const grew = [];
  for (const [f, v] of Object.entries(cur.files)) {
    const b = base.files[f] ?? { literals: 0, incomplete: 0 };
    if (v.literals > b.literals) grew.push(`${f}: литералов ${v.literals} > ${b.literals}`);
    if (v.incomplete > b.incomplete) grew.push(`${f}: неполных объектов ${v.incomplete} > ${b.incomplete}`);
  }
  if (grew.length > 0) {
    console.error(`FAIL: в app/components выросло число текстов вне переводов / неполных переводов:\n  ${grew.join('\n  ')}\nПереведите на все 9 языков (ru, uk, en, es, pt-BR, vi, id, tr, pl) или, если это dev/лог, не выводите игроку.`);
    process.exit(1);
  }
  if (cur.totals.literals < base.totals.literals || cur.totals.incomplete < base.totals.incomplete) {
    console.log(`OK, но стало меньше (было ${base.totals.literals}/${base.totals.incomplete}, стало ${cur.totals.literals}/${cur.totals.incomplete}) — зафиксируйте: node scripts/scan_i18n_design_zone.mjs --update`);
    return;
  }
  console.log(`OK: литералов ${cur.totals.literals}, неполных объектов ${cur.totals.incomplete} — как в базе.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
