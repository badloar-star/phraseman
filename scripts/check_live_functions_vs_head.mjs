#!/usr/bin/env node
// check_live_functions_vs_head.mjs — сверка «что живёт на бою» с «что экспортирует HEAD» перед выкладкой функций.
// зачем (координатор 25.10): 23–24.10 функции выкладывали из рабочего дерева — на бою оказались функции без исходника в git
// (истории), а клиент звал функцию, которой на бою нет (learningV2CourseReleasedSessionGetV4). Перед утренним пакетом:
//   1) каждое имя из --only обязано экспортироваться в HEAD своей кодовой базы — иначе СТОП (выкладка создала бы/сломала бы не то);
//   2) список «на бою, но не в HEAD» печатается по кодовым базам: при адресной выкладке (--only с именами) firebase их не трогает,
//      а выкладка всей кодовой базы удалила бы их — поэтому цель вида functions:default / functions:content без имени — СТОП.
// Только чтение: git show HEAD и firebase functions:list. Ничего не выкладывает.
//
//   node scripts/check_live_functions_vs_head.mjs --only "functions:default:a,functions:content:b,firestore:rules"
import { execFileSync } from 'node:child_process';

const PROJECT = 'phraseman-ea0b3';
const CODEBASE_INDEX = { default: 'functions/src/index.ts', content: 'functions-content/index.ts' };

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] ?? '' : '';
}

/** Имена экспортов функций из index.ts в HEAD: `export { a, b as c } from …`, `export const x = on…`, `exports.x = …`. */
function headExports(file) {
  const src = execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const names = new Set();
  for (const m of src.matchAll(/export\s*\{([^}]*)\}\s*from/g)) {
    // зачем (25.10, ложный СТОП на supportInboxOnNewMail): внутри фигурных скобок бывают комментарии перед именем — без их вырезания
    // «// …\n  имя» не проходит проверку идентификатора, и экспортированная функция считалась «нет в HEAD»
    const body = m[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    for (const part of body.split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  for (const m of src.matchAll(/export\s+const\s+([A-Za-z_$][\w$]*)\s*=/g)) names.add(m[1]);
  for (const m of src.matchAll(/^exports\.([A-Za-z_$][\w$]*)\s*=/gm)) names.add(m[1]);
  return names;
}

function liveFunctions() {
  const raw = execFileSync(process.platform === 'win32' ? 'firebase.cmd' : 'firebase', ['functions:list', '--project', PROJECT, '--json'], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32',
  });
  const json = JSON.parse(raw.slice(raw.indexOf('{')));
  const list = Array.isArray(json.result) ? json.result : [];
  const byCodebase = new Map();
  for (const fn of list) {
    const id = String(fn.id ?? fn.name ?? '').split('/').pop();
    const codebase = String(fn.codebase ?? 'default');
    if (!id) continue;
    if (!byCodebase.has(codebase)) byCodebase.set(codebase, new Set());
    byCodebase.get(codebase).add(id);
  }
  return byCodebase;
}

const only = arg('--only');
if (!only) {
  console.error('[LIVE-VS-HEAD] нужен --only "functions:<codebase>:<имя>,…"');
  process.exit(2);
}
const problems = [];
const targets = only.split(',').map((t) => t.trim()).filter(Boolean);
const head = {};
for (const [codebase, file] of Object.entries(CODEBASE_INDEX)) head[codebase] = headExports(file);

for (const target of targets) {
  const parts = target.split(':');
  if (parts[0] !== 'functions') continue;
  if (parts.length < 3 || !parts[2]) {
    problems.push(`цель «${target}» без имени функции — выкладка всей кодовой базы удалит функции, которых нет в HEAD`);
    continue;
  }
  const [, codebase, name] = parts;
  if (!head[codebase]) problems.push(`кодовая база «${codebase}» не сверяется (нет в CODEBASE_INDEX)`);
  else if (!head[codebase].has(name)) problems.push(`функция ${codebase}:${name} не экспортируется в HEAD (${CODEBASE_INDEX[codebase]})`);
}

let live;
try {
  live = liveFunctions();
} catch (error) {
  problems.push(`firebase functions:list не прочитан: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
}
if (live) {
  for (const [codebase, names] of live) {
    if (!head[codebase]) continue;
    const absent = [...names].filter((n) => !head[codebase].has(n)).sort();
    console.log(`[LIVE-VS-HEAD] ${codebase}: на бою ${names.size}, в HEAD ${head[codebase].size}, на бою без экспорта в HEAD: ${absent.length}${absent.length ? ` → ${absent.join(', ')}` : ''}`);
  }
  const named = targets.filter((t) => t.startsWith('functions:') && t.split(':')[2]).map((t) => t.split(':'));
  const created = named.filter(([, cb, n]) => !(live.get(cb)?.has(n))).map(([, cb, n]) => `${cb}:${n}`);
  if (created.length) console.log(`[LIVE-VS-HEAD] будут СОЗДАНЫ (на бою их нет): ${created.join(', ')} — после выкладки проверить право вызова (check_callable_invoker)`);
}

if (problems.length) {
  for (const p of problems) console.error(`[LIVE-VS-HEAD] СТОП: ${p}`);
  process.exit(1);
}
console.log('[LIVE-VS-HEAD] OK: все имена пакета есть в HEAD; адресная выкладка не удаляет функции, которых нет в HEAD');
