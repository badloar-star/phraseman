// PM-008: автосбор пользовательских строк (Q52, решение координатора 2026-10-01).
// зачем: единой таблицы текстов нет — они в *copy.ts / i18n-словарях и инлайном в JSX/литералах.
// Владельцу нужен список, по которому он пачкой решает «оставить/сократить/удалить». Разбор идёт через
// typescript compiler API (createSourceFile, без program/typecheck — лёгкий), а не regex по репозиторию.
// Запуск из корня репозитория, ПОД СЛОТОМ СВЕТОФОРА:
//   node docs/phraseman-2.0/tools/pm008_copy_inventory.mjs
// Выход: registries/copy_inventory.json (счётчики + строки с признаками риска),
//        registries/copy_inventory_full.json (полный дамп, в .gitignore),
//        evidence/PM-008_copy_owner_review.csv (колонка «решение» пустая — заполняет владелец),
//        evidence/PM-008_copy_inventory_summary.md.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const ROOT = 'docs/phraseman-2.0';
const LOG = '[PM-008-COPY]';

// --- какие файлы берём --------------------------------------------------------------------------
const files = execFileSync('git', ['ls-files', 'app', 'components', 'modules'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\n')
  .filter((f) => /\.(ts|tsx)$/.test(f));

const EXCLUDE_PATH = [
  /(^|\/)tests?\//,
  /\.test\.tsx?$/,
  /\.probe\.tsx?$/,
  /modules\/learning-v2\/content\/source\//,
  /\.generated\.tsx?$/,
  /\.gen\.tsx?$/,
  /^components\/dev\//,
  /^app\/dev_/,
  /(^|\/)lesson_data/,
  /lesson_help_theory_data/,
  /(^|\/)idioms_data/,
  /lesson_intro_screens/,
  // зачем: учебный контент (теория, ловушки ошибок, разборы, курс V2) — отдельные реестры контента, не служебные тексты интерфейса
  /(^|\/)theory_content_/,
  /(^|\/)error_traps\//,
  /(^|\/)preposition_explanations/,
  /(^|\/)system-cards/,
  /^components\/theory\//,
  /^modules\/learning-v2\/(curriculum|content|authoring)\//,
];
const MAX_BYTES = 200 * 1024; // зачем: файлы-контент (уроки, идиомы) — отдельный реестр курса, не интерфейс
const skipped = { by_path: [], too_big: [], deleted_in_worktree: [] };
const scope = [];
for (const f of files) {
  if (EXCLUDE_PATH.some((re) => re.test(f))) { skipped.by_path.push(f); continue; }
  let size = 0;
  // зачем: файл ещё в git ls-files, но удалён в рабочем дереве (удаление ждёт коммита другой сессии) — не ошибка, считаем отдельно
  try { size = fs.statSync(f).size; } catch (e) { if (e && e.code === 'ENOENT') { skipped.deleted_in_worktree.push(f); } else { console.warn(`${LOG} stat_failed`, f, e && e.message); } continue; }
  if (size > MAX_BYTES) { skipped.too_big.push(`${f} (${Math.round(size / 1024)} КБ)`); continue; }
  scope.push(f);
}
console.log(`${LOG} files_total=${files.length} in_scope=${scope.length} skipped_path=${skipped.by_path.length} skipped_big=${skipped.too_big.length} deleted_in_worktree=${skipped.deleted_in_worktree.length}`);

// --- локаль, экран ------------------------------------------------------------------------------
const LOCALE_KEYS = new Set(['ru', 'en', 'es', 'de', 'fr', 'uk', 'it', 'pt', 'pl', 'tr', 'ar', 'zh', 'ja']);
const isCopyFile = (f) => /(copy|i18n|locale|strings|messages)/i.test(path.basename(f));
const cyr = /[а-яёА-ЯЁіїєґІЇЄҐ]/;
const ukr = /[іїєґІЇЄҐ]/;
const latinWords = /[A-Za-z]{2,}[\s.,!?'’-]+[A-Za-z]{2,}/;

function screenOf(f) {
  const parts = f.split('/');
  if (parts[0] === 'modules') return `modules/${parts[1]}`;
  if (parts[0] === 'components') return parts.length > 2 ? `components/${parts[1]}` : parts[1].replace(/\.tsx?$/, '');
  if (parts[1] === '(tabs)') return `tab:${parts[2].replace(/\.tsx?$/, '')}`;
  if (parts.length > 2) return `app/${parts[1]}`;
  return parts[1].replace(/\.tsx?$/, '');
}

// --- признаки риска -----------------------------------------------------------------------------
const NB = '(^|[^А-Яа-яЁё])';
const NE = '(?![А-Яа-яЁё])';
const RISK = [
  // зачем: «Арена» (раздел) отличаем от «аренда машины» — после основы допускаем только падежные окончания
  ['arena', new RegExp(`${NB}арен(а|ы|е|у|ой|ам|ами|ах)?${NE}`, 'i')],
  ['league', new RegExp(`${NB}лиг(а|и|у|е|ой|ам|ами|ах|ов)?${NE}`, 'i')],
  ['pearl', /жемчуг|жемчуж/i],
  ['runes', new RegExp(`${NB}рун(а|ы|у|е|ой|ам|ами|ах|ов)?${NE}`, 'i')],
  ['shards', /осколк/i],
  ['gifts', /подар(ок|к|и|ен|ить|оч)/i],
  // зачем: слово «опыт» обычное («Твой опыт»); флагуем только игровой опыт — XP, очки опыта, опыт за действие
  ['xp', /(\bXP\b|очк(а|и|ов|ам)\s+опыта|опыта\s+за\s|множител\S*\s+опыта|\+\d+\s*опыта)/i],
  ['max', new RegExp(`(\\bMAX\\b|${NB}макс(а|у|ом|е)?${NE})`, 'i')],
  ['voice_tutor', /тьютор|голосов\S*\s+(разбор|урок|звон|тренер)/i],
  ['spin_chest', /рулетк|сундук|спин(ы|ов|ам|у)?(?![а-яё])|множител|буст/i],
  ['bonus', /бонус/i],
];
const OFFICIALESE = /(осуществ|в целях|в рамках|вышеуказан|посредством|ввиду|необходимо|произведен|предоставл|уважаем|является|данн(ый|ая|ое|ые|ого|ой|ых)\s|настоящ(ий|ая|ее|ие)\s)/i;
const REMOVED_TAGS = new Set(['arena', 'league', 'pearl', 'runes', 'shards', 'gifts', 'xp', 'max', 'voice_tutor', 'spin_chest', 'bonus']);

function riskOf(text) {
  const tags = [];
  for (const [tag, re] of RISK) if (re.test(text)) tags.push(tag);
  if (/!\s*$/.test(text)) tags.push('exclaim_end');
  if (OFFICIALESE.test(text)) tags.push('officialese');
  if (text.length > 140) tags.push('long');
  return tags;
}

// --- разбор AST ---------------------------------------------------------------------------------
const SKIP_CALLEES = /^(console\.\w+|require|import|logger\.\w+|log\w*|debugLog\w*|warn\w*|trace\w*)$/;
const SKIP_ATTRS = new Set(['testID', 'key', 'name', 'type', 'id', 'source', 'uri', 'href', 'resizeMode', 'keyboardType', 'autoCapitalize', 'fontFamily', 'animation', 'size', 'variant']);
const norm = (s) => s.replace(/\s+/g, ' ').trim();

function calleeText(node) {
  const e = node.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression)) return `${e.expression.text}.${e.name.text}`;
  return '';
}

function propName(p) {
  const n = p.name;
  if (!n) return null;
  if (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n)) return n.text;
  return null;
}

function keyPath(node) {
  const names = [];
  for (let n = node.parent; n; n = n.parent) {
    if (ts.isPropertyAssignment(n) || ts.isPropertySignature(n)) {
      const nm = propName(n);
      if (nm != null) names.unshift(nm);
    } else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) {
      names.unshift(n.name.text);
      break;
    } else if (ts.isFunctionDeclaration(n) && n.name) {
      names.unshift(`${n.name.text}()`);
      break;
    }
    if (names.length >= 4 && !names.some((x) => x)) break;
  }
  return names;
}

function localeFromPath(names, text) {
  for (const n of names) if (LOCALE_KEYS.has(n)) return n;
  if (cyr.test(text)) return ukr.test(text) ? 'uk' : 'ru';
  return 'en?';
}

function isSkippableContext(node) {
  for (let n = node.parent; n; n = n.parent) {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n) || ts.isImportTypeNode(n)) return true;
    if (ts.isLiteralTypeNode(n) || ts.isTypeReferenceNode(n) || ts.isTypeAliasDeclaration(n) || ts.isInterfaceDeclaration(n)) return true;
    if (ts.isCallExpression(n) && SKIP_CALLEES.test(calleeText(n))) return true;
    if (ts.isCaseClause(n) && n.expression && n.expression === node) return true;
    if (ts.isJsxAttribute(n) && SKIP_ATTRS.has(n.name.text)) return true;
    if (ts.isBinaryExpression(n) && /^(===|!==|==|!=)$/.test(n.operatorToken.getText())) return true;
  }
  return false;
}

const rows = [];
let parseFailures = 0;

function addRow(file, sf, node, rawText, copyFile, kind) {
  const text = norm(rawText);
  if (text.length < 2) return;
  const hasCyr = cyr.test(text);
  // зачем: в копирайт-файлах берём и не-русские локали; в обычном коде — только русские строки (иначе шум идентификаторов)
  const hasLatinCopy = copyFile && latinWords.test(text) && /\s/.test(text);
  if (!hasCyr && !hasLatinCopy) return;
  if (isSkippableContext(node)) return;
  const names = keyPath(node);
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  const keyTail = names.filter(Boolean).slice(-3).join('.');
  rows.push({
    file,
    line: line + 1,
    key: keyTail || null,
    kind,
    locale: localeFromPath(names, text),
    screen: screenOf(file),
    text,
    risk: riskOf(text),
  });
}

for (const f of scope) {
  let src;
  try { src = fs.readFileSync(f, 'utf8'); } catch (e) { parseFailures++; console.warn(`${LOG} read_failed`, f, e && e.message); continue; }
  if (!cyr.test(src) && !isCopyFile(f)) continue; // зачем: быстрый выход — без кириллицы и не копирайт-файл строк нет
  let sf;
  try {
    sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, f.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  } catch (e) { parseFailures++; console.warn(`${LOG} parse_failed`, f, e && e.message); continue; }
  const copyFile = isCopyFile(f);
  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      addRow(f, sf, node, node.text, copyFile, 'literal');
    } else if (ts.isTemplateExpression(node)) {
      const text = node.head.text + node.templateSpans.map((s) => `{}${s.literal.text}`).join('');
      addRow(f, sf, node, text, copyFile, 'template');
      for (const s of node.templateSpans) visit(s.expression);
      return;
    } else if (ts.isJsxText(node)) {
      addRow(f, sf, node, node.text, copyFile, 'jsx');
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
console.log(`${LOG} rows=${rows.length} parse_failures=${parseFailures}`);

// --- id, сводка ---------------------------------------------------------------------------------
const seen = new Map();
for (const r of rows) {
  const base = r.key ? `${r.file}:${r.key}` : `${r.file}:L${r.line}`;
  const n = (seen.get(base) || 0) + 1;
  seen.set(base, n);
  r.id = n === 1 ? base : `${base}#${n}`;
  r.removed_feature = r.risk.filter((t) => REMOVED_TAGS.has(t));
}
const risky = rows.filter((r) => r.risk.length > 0);
const removedRisk = rows.filter((r) => r.removed_feature.length > 0);

const byTag = {};
for (const r of rows) for (const t of r.risk) byTag[t] = (byTag[t] || 0) + 1;
const byLocale = {};
for (const r of rows) byLocale[r.locale] = (byLocale[r.locale] || 0) + 1;
const fileStats = new Map();
for (const r of rows) {
  const s = fileStats.get(r.file) || { total: 0, risky: 0, removed: 0 };
  s.total++; if (r.risk.length) s.risky++; if (r.removed_feature.length) s.removed++;
  fileStats.set(r.file, s);
}
const topBy = (key, n) => [...fileStats.entries()].sort((a, b) => b[1][key] - a[1][key]).slice(0, n).map(([file, s]) => ({ file, ...s }));
const summary = {
  generated_by: 'docs/phraseman-2.0/tools/pm008_copy_inventory.mjs',
  files_in_scope: scope.length,
  files_skipped_by_path: skipped.by_path.length,
  files_skipped_too_big: skipped.too_big,
  files_deleted_in_worktree_not_committed: skipped.deleted_in_worktree.length,
  parse_failures: parseFailures,
  strings_total: rows.length,
  strings_with_risk: risky.length,
  strings_about_removed_features: removedRisk.length,
  by_risk_tag: byTag,
  by_locale: byLocale,
  top_files_by_total: topBy('total', 15),
  top_files_by_risk: topBy('risky', 15),
  top_files_by_removed_features: topBy('removed', 15),
};

const pick = (r) => ({ id: r.id, screen: r.screen, string_key: r.key, locale: r.locale, current_text: r.text, risk: r.risk, line: r.line });
const SORT_RISK = (r) => (r.removed_feature.length ? 0 : 1);
risky.sort((a, b) => SORT_RISK(a) - SORT_RISK(b) || a.file.localeCompare(b.file) || a.line - b.line);

const inventory = {
  status: 'AUTO_COLLECTED_OWNER_DECISIONS_PENDING',
  purpose: 'Автосбор пользовательских строк (PM-008). Хранятся только строки с признаками риска; полный дамп — registries/copy_inventory_full.json (в .gitignore). Решения оставить/сократить/удалить принимает владелец пачкой по evidence/PM-008_copy_owner_review.csv.',
  columns: ['id', 'screen', 'string_key', 'locale', 'current_text', 'risk', 'decision', 'proposed_text', 'legal_or_accessibility', 'approval', 'evidence'],
  summary,
  entries: risky.map((r) => ({ ...pick(r), decision: null, proposed_text: null, legal_or_accessibility: null, approval: null, evidence: `${r.file}:${r.line}` })),
};
fs.writeFileSync(`${ROOT}/registries/copy_inventory.json`, JSON.stringify(inventory, null, 1) + '\n');
fs.writeFileSync(`${ROOT}/registries/copy_inventory_full.json`, JSON.stringify({ summary, entries: rows.map(pick) }) + '\n');

// --- CSV для владельца --------------------------------------------------------------------------
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const header = ['id', 'экран', 'язык', 'текст', 'признаки риска', 'решение: оставить/сократить/удалить', 'предложенный текст'];
const csv = [header.map(csvCell).join(',')];
for (const r of risky) csv.push([r.id, r.screen, r.locale, r.text, r.risk.join('+'), '', ''].map(csvCell).join(','));
fs.writeFileSync(`${ROOT}/evidence/PM-008_copy_owner_review.csv`, '﻿' + csv.join('\r\n') + '\r\n');

// --- сводка MD ----------------------------------------------------------------------------------
const tbl = (arr) => arr.map((x) => `| \`${x.file}\` | ${x.total} | ${x.risky} | ${x.removed} |`).join('\n');
const sample = removedRisk.slice(0, 40).map((r) => `- \`${r.file}:${r.line}\` [${r.removed_feature.join(',')}] ${r.text.length > 110 ? r.text.slice(0, 110) + '…' : r.text}`).join('\n');
const md = `# PM-008 — автосбор пользовательских строк

Скрипт \`docs/phraseman-2.0/tools/pm008_copy_inventory.mjs\` (typescript compiler API, createSourceFile; без regex по репозиторию). Область: \`app/\`, \`components/\`, \`modules/\`; без tests, \`modules/learning-v2/content/source\`, generated/gen, dev-экранов, контент-файлов (уроки, идиомы) и файлов > 200 КБ — они в отдельных реестрах контента.

## Числа
- файлов в области: ${scope.length}; пропущено по пути: ${skipped.by_path.length}; пропущено по размеру: ${skipped.too_big.length}; удалено в рабочем дереве (не закоммичено): ${skipped.deleted_in_worktree.length}; сбоев разбора: ${parseFailures}
- строк всего: **${rows.length}**; с признаком риска: **${risky.length}**; про удалённые разделы (арена, лига, жемчуг, руны, осколки, подарки, XP, MAX, голосовой тьютор, спины/сундуки/буст, бонусы): **${removedRisk.length}**
- по признакам: ${Object.entries(byTag).map(([k, v]) => `${k}=${v}`).join(', ')}
- по языкам: ${Object.entries(byLocale).map(([k, v]) => `${k}=${v}`).join(', ')}

## Топ файлов по числу строк про удалённые разделы
| файл | строк | с риском | про удалённое |
|---|---|---|---|
${tbl(topBy('removed', 15))}

## Топ файлов по числу строк с риском
| файл | строк | с риском | про удалённое |
|---|---|---|---|
${tbl(topBy('risky', 15))}

## Первые 40 строк про удалённые разделы (их видит пользователь, если экран достижим)
${sample}

## Как владельцу решать
Файл \`evidence/PM-008_copy_owner_review.csv\` (UTF-8, открывается в Excel): строки с риском, колонка «решение» пустая. Сверху — строки про удалённые разделы. Заполнить «оставить / сократить / удалить» (и при «сократить» — предложенный текст).

Честные границы: «экран» определён по пути файла, а не по реальному маршруту; ключ — имя свойства рядом, а не ключ локализации (единой таблицы ключей в приложении нет); достижимость строки из релизного графа не проверялась (часть строк про удалённое — в мёртвом коде или в серверных/админских текстах).
`;
fs.writeFileSync(`${ROOT}/evidence/PM-008_copy_inventory_summary.md`, md);
console.log(`${LOG} DONE`, JSON.stringify({ rows: rows.length, risky: risky.length, removed: removedRisk.length }));
