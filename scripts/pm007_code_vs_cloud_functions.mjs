// PM-007 «Сопоставить код и реально развёрнутые cron/functions».
// зачем: PM-007-A1 — два списка (объявленные в коде / живые в облаке); A2 — найденные
// расхождения НЕ удаляются автоматически. Скрипт только читает исходники и (по желанию)
// JSON, который владелец сам получил командой `firebase functions:list --json`.
// В облако скрипт не ходит и ничего не удаляет — расхождения только печатаются.
//
// Запуск:
//   node scripts/pm007_code_vs_cloud_functions.mjs                       — только код
//   node scripts/pm007_code_vs_cloud_functions.mjs --cloud <list.json>   — код + облако
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { buildServerDecisionAtlas } from './server_decision_atlas/catalog.mjs';
import { readLiveExports } from './pm221_server_domain_map.mjs';

const OUT = 'docs/phraseman-2.0/evidence/PM-007_code_vs_cloud_functions.md';
const TYPE_LABEL = { callable: 'callable', http: 'http', schedule: 'schedule', 'firestore-trigger': 'trigger' };

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/(^|[^:'"`])\/\/[^\n]*/gu, '$1');
}

// зачем: остальные кодбазы firebase.json (max/content/english-test) экспортируют функции
// своими index-файлами; их имена тоже деплоятся и должны попасть в «код».
function readCodebaseExports(root, file) {
  const path = resolve(root, file);
  if (!existsSync(path)) {
    console.warn(`[PM-007] кодбаза без index-файла, пропущена: ${file}`);
    return new Set();
  }
  const code = stripComments(readFileSync(path, 'utf8'));
  const names = new Set();
  for (const m of code.matchAll(/\bexports\.([A-Za-z0-9_]+)\s*=\s*on[A-Z]/gu)) names.add(m[1]);
  for (const m of code.matchAll(/\bexport\s*\{([^}]*)\}\s*from/gu)) {
    for (const part of m[1].split(',')) {
      const t = part.trim().split(/\s+as\s+/u).at(-1);
      if (t && !/^[A-Z0-9_]+$/u.test(t)) names.add(t);
    }
  }
  return names;
}

// зачем: атлас не видит firestore/auth-триггеры v2 (onDocumentCreated и т.п.) — для них
// ищем объявление прямо в functions/src и берём тип по имени фабрики.
function triggerIndex(root) {
  const index = new Map();
  const walk = (dir) => {
    for (const ent of readdirSync(resolve(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${ent.name}`;
      if (ent.isDirectory()) { if (ent.name !== 'node_modules' && ent.name !== 'lib') walk(rel); continue; }
      if (!/\.(ts|js)$/u.test(ent.name) || /\.test\.(ts|js)$/u.test(ent.name)) continue;
      const lines = readFileSync(resolve(root, rel), 'utf8').split('\n');
      lines.forEach((line, i) => {
        // зачем: фабрика может стоять на следующей строке (const x = <перенос> createXCallable()).
        const joined = /=\s*$/u.test(line) ? `${line} ${lines[i + 1] ?? ''}` : line;
        const m = /(?:export\s+const|exports\.|^const)\s*([A-Za-z0-9_]+)\s*=\s*([A-Za-z0-9_.]+)/u.exec(joined.trim());
        if (!m || index.has(m[1])) return;
        const f = m[2];
        // зачем: обёртки-фабрики (trigger('…'), createRecordAiConsentCallable) и алиасы
        // (`= adminDeactivateGlobalBroadcast`) типа не говорят — алиас разрешаем позже.
        const kind = /Schedule|pubsub|scheduler/u.test(f) ? 'schedule'
          : /onCall|Callable/u.test(f) ? 'callable'
            : /onRequest/u.test(f) ? 'http'
              : /^on[A-Z]|trigger|[Ww]ritten|[Cc]reated|firestore\.|auth\./u.test(f) ? 'trigger'
                : `alias:${f}`;
        index.set(m[1], { type: kind, source: `${rel}:${i + 1}` });
      });
    }
  };
  walk('functions/src');
  walk('functions-english-test');
  for (const [name, v] of index) {
    if (!v.type.startsWith('alias:')) continue;
    const target = index.get(v.type.slice(6));
    index.set(name, { ...v, type: target && !target.type.startsWith('alias:') ? target.type : 'unknown' });
  }
  return index;
}

export function buildCodeList(root = process.cwd()) {
  const triggers = triggerIndex(root);
  const atlas = buildServerDecisionAtlas(root);
  const byName = new Map();
  for (const r of atlas.records) {
    if (TYPE_LABEL[r.routeType] && !byName.has(r.name)) byName.set(r.name, r);
  }
  const rows = [];
  const add = (codebase, names) => {
    for (const name of [...names].sort()) {
      const rec = byName.get(name);
      const fallback = rec ? null : triggers.get(name);
      // зачем: константы/типы из index.ts — не функции; без записи атласа и с именем
      // в ВЕРХНЕМ_РЕГИСТРЕ это не деплоится, в список не берём (но печатаем причину).
      if (/^[A-Z0-9_]+$/u.test(name)) {
        console.log(`[PM-007] skip non-function export ${codebase}:${name}`);
        continue;
      }
      rows.push({
        codebase,
        name,
        type: rec ? TYPE_LABEL[rec.routeType] : (fallback?.type ?? 'unknown'),
        source: rec ? `${rec.sourcePath}:${rec.line}` : (fallback?.source ?? 'unknown'),
      });
    }
  };
  add('default', readLiveExports(root));
  add('content', readCodebaseExports(root, 'functions-content/index.ts'));
  add('english-test', readCodebaseExports(root, 'functions-english-test/index.js'));
  return rows;
}

// зачем: формат `firebase functions:list --json` менялся между версиями CLI —
// принимаем и массив, и { result: [...] }, имя берём из id/name/entryPoint.
export function readCloudList(file) {
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const list = Array.isArray(raw) ? raw : (raw.result ?? raw.functions ?? []);
  if (!Array.isArray(list)) throw new Error(`[PM-007] не понял формат ${file}`);
  return new Set(list.map((f) => String(f.id ?? f.entryPoint ?? f.name ?? '').split('/').at(-1)).filter(Boolean));
}

export function renderMarkdown(rows, cloud) {
  const count = (pred) => rows.filter(pred).length;
  const out = [];
  out.push('# PM-007 — функции и кроны: объявленные в коде против живых в облаке', '');
  out.push('Сгенерировано `node scripts/pm007_code_vs_cloud_functions.mjs` (без даты и без сети; детерминированно).', '');
  out.push('Скрипт ничего не удаляет и не деплоит (PM-007-A2): расхождения только перечисляются, решение — за владельцем, деплой — после релиза 2.0 (D91), порядок отключения кронов — `PM-222_cron_retirement_plan.md`.', '');
  out.push('## Список 1 — объявлено в коде', '');
  out.push(`Всего: **${rows.length}** (default ${count((r) => r.codebase === 'default')}, max ${count((r) => r.codebase === 'max')}, content ${count((r) => r.codebase === 'content')}, english-test ${count((r) => r.codebase === 'english-test')}). Кронов (schedule): **${count((r) => r.type === 'schedule')}**.`, '');
  out.push('### Кроны', '', '| Кодбаза | Функция | Исходник |', '|---|---|---|');
  for (const r of rows.filter((x) => x.type === 'schedule')) out.push(`| ${r.codebase} | \`${r.name}\` | ${r.source} |`);
  out.push('', '### Все функции', '', '| Кодбаза | Функция | Тип | Исходник |', '|---|---|---|---|');
  for (const r of rows) out.push(`| ${r.codebase} | \`${r.name}\` | ${r.type} | ${r.source} |`);
  out.push('', '## Список 2 — живые в облаке', '');
  if (!cloud) {
    out.push('**NOT_RUN.** Читать прод этой сессии запрещено. Владелец получает список так:', '');
    out.push('```bash', 'firebase functions:list --project phraseman-ea0b3 --json > .tmp/pm007_cloud_functions.json', 'node scripts/pm007_code_vs_cloud_functions.mjs --cloud .tmp/pm007_cloud_functions.json', '```', '');
    out.push('После этого здесь появятся список облака и два расхождения: «в облаке, но нет в коде» (кандидаты на удаление при следующем деплое — Firebase спросит подтверждение) и «в коде, но нет в облаке» (не задеплоено).', '');
    return out.join('\n') + '\n';
  }
  const code = new Set(rows.map((r) => r.name));
  const onlyCloud = [...cloud].filter((n) => !code.has(n)).sort();
  const onlyCode = rows.filter((r) => !cloud.has(r.name));
  out.push(`Всего в облаке: **${cloud.size}**.`, '');
  out.push('| Функция |', '|---|', ...[...cloud].sort().map((n) => `| \`${n}\` |`), '');
  out.push('## Расхождения (НЕ удалены автоматически)', '');
  out.push(`### В облаке, но нет в коде: ${onlyCloud.length}`, '', ...onlyCloud.map((n) => `- \`${n}\``), '');
  out.push(`### В коде, но нет в облаке: ${onlyCode.length}`, '', ...onlyCode.map((r) => `- \`${r.name}\` (${r.codebase}, ${r.type})`), '');
  return out.join('\n') + '\n';
}

async function main() {
  const root = process.cwd();
  const idx = process.argv.indexOf('--cloud');
  const cloudFile = idx >= 0 ? process.argv[idx + 1] : null;
  const rows = buildCodeList(root);
  const cloud = cloudFile ? readCloudList(cloudFile) : null;
  const md = renderMarkdown(rows, cloud);
  const out = resolve(root, OUT);
  // зачем (01.10, ревью): запуск без --cloud затирал evidence со списком облака (516 функций).
  // По умолчанию — только проверка; запись — явным --write; без облака существующий список не трогаем.
  if (!process.argv.includes('--write')) {
    console.log(`[PM-007] dry-run code=${rows.length} cloud=${cloud ? cloud.size : 'NOT_RUN'} (без записи; --write чтобы обновить ${OUT})`);
    return;
  }
  if (!cloud) {
    const existing = await readFile(out, 'utf8').catch(() => '');
    if (existing.includes('Всего в облаке:') && !process.argv.includes('--force')) {
      console.error(`[PM-007] отказ: в ${OUT} уже есть список облака, а --cloud не передан — запись стёрла бы его (добавь --cloud <json> или --force)`);
      process.exit(2);
    }
  }
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, md);
  console.log(`[PM-007] code=${rows.length} cloud=${cloud ? cloud.size : 'NOT_RUN'} → ${OUT}`);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/gu, '/')}` || process.argv[1]?.endsWith('pm007_code_vs_cloud_functions.mjs')) {
  main().catch((error) => {
    console.error('[PM-007] failed', error);
    process.exit(1);
  });
}
