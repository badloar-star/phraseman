#!/usr/bin/env node
/**
 * Сторож непереведённого текста в JSX: текстовые узлы и строковые пропсы интерфейса.
 *
 * зачем (координатор 13.10, после базы 0 у scan_untranslated_ui): основной сторож ищет строки в кавычках построчно и не видит
 * текст прямо в разметке (`<Text>Пропустить</Text>`) и английские подписи для экранного диктора (`accessibilityLabel="Close"`) —
 * на экране проверки интро V2 нашлось 15 таких строк при 12 «видимых» ему. Этот сторож разбирает файлы компилятором TypeScript
 * и проверяет ровно эти места. Английский тоже нарушение: при русском интерфейсе он такой же непереведённый текст.
 *
 * Отдельный класс без исключений — «комментарий-текст»: `// …` среди детей JSX React рендерит как ТЕКСТ, а внутри View
 * React Native падает («Text strings must be rendered within a <Text> component»). 13.10 нашлось 3 таких места.
 *
 * Исключения: файлы-исключения основного сторожа (CONTENT_FILES читаются из scan_untranslated_ui.mjs текстом, чтобы правила
 * не разошлись), dev-файлы по имени, внутренние маршруты app/_*, строки с пометкой `i18n-ok: <причина>`, бренды.
 * Служебные id автотестов (`qa-…`) в accessibilityLabel в счёт не идут, но печатаются в отчёте: диктор читает их вслух.
 *
 * Использование:
 *   node scripts/scan_untranslated_jsx.mjs            # проверить против базы (храповик: только вниз)
 *   node scripts/scan_untranslated_jsx.mjs --report   # показать каждую находку файл:строка
 *   node scripts/scan_untranslated_jsx.mjs --update   # зафиксировать новую базу (только вниз)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ts = require(path.join(ROOT, 'node_modules', 'typescript'));
const BASELINE = path.join(ROOT, 'config', 'untranslated-jsx-baseline.json');
const SCAN_DIRS = ['app', 'components'];
const SKIP_DIR = /^(node_modules|__tests__|\.git|\.claude|\.codex-tmp|\.worktrees|tmp)$/;
// зачем: dev-экраны, витрины и пробники — по имени файла; app/_* — внутренние маршруты (смоук хранилища, аудит аналитики).
// Игрок их не видит: маршруты за ENABLE_DEV_TOOLS / IS_STORE_RELEASE.
const DEV_FILE = /(^|\/)(dev[_-]|_dev|Dev[A-Z]|.*[Pp]robe\.tsx$|.*[Ss]howcase|.*_preview\.tsx$|.*Preview[A-Z]?\w*\.tsx$)|\/dev\/|^app\/_/;
const I18N_OK_MARK = /i18n-ok:\s*\S.{8,}/;
const UI_PROPS = new Set(['title', 'label', 'placeholder', 'accessibilityLabel', 'accessibilityHint', 'subtitle', 'message', 'text',
  'headerTitle', 'caption', 'hint', 'description', 'emptyText', 'ctaLabel', 'buttonLabel', 'confirmLabel', 'cancelLabel']);
const CYR = /[А-Яа-яЁёІіЇїЄєҐґ]/;
const QA_ID = /^qa-[a-z0-9-]+$/;
// бренды и служебные токены, которые не переводятся
const BRAND = /^(YouTube|PhraseMan|Phraseman|Plus|PLUS|Pro|Google|Apple|App Store|Google Play|Telegram|iOS|Android|OK|Ok|ID|EN|RU|UK|ES|AI|XP|PM|A1|A2|B1|B2|C1|C2|Lingman|Professor Lingman|by Professor Lingman)$/;
const COMMENT_TEXT = /^\s*\/\/\s/;

function contentFiles() {
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'scan_untranslated_ui.mjs'), 'utf8');
  const start = src.indexOf('const CONTENT_FILES = [');
  const end = src.indexOf('\n];', start);
  return [...src.slice(start, end).matchAll(/^\s*\/(.+)\/,\s*$/gm)].map((m) => new RegExp(m[1]));
}
const CONTENT = contentFiles();
const qaIds = [];

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { console.warn(`[JSX-I18N] не прочитал ${dir}: ${e.message}`); return out; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!SKIP_DIR.test(entry.name)) walk(full, out); } else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** Текст — интерфейсный: кириллица или английские слова (не бренд, не одиночный символ). */
function isUiText(raw) {
  const t = raw.replace(/\s+/g, ' ').trim();
  if (!t) return false;
  if (CYR.test(t)) return true;
  if (BRAND.test(t)) return false;
  const words = (t.match(/[A-Za-z][A-Za-z'’]+/g) || []).filter((w) => !BRAND.test(w));
  return words.length >= 1 && /[a-z]{2,}/.test(words.join(' '));
}

function scanFile(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const exempt = CONTENT.some((re) => re.test(rel)) || DEV_FILE.test(rel);
  const source = fs.readFileSync(file, 'utf8');
  const lines = source.split('\n');
  const sf = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits = [];
  const lineAt = (pos) => sf.getLineAndCharacterOfPosition(pos).line;
  const marked = (n) => { for (let i = lineAt(n.getStart()); i <= lineAt(n.getEnd()); i += 1) if (I18N_OK_MARK.test(lines[i] || '')) return true; return false; };
  const push = (n, kind, text) => { if (!exempt && !marked(n)) hits.push({ file: rel, line: lineAt(n.getStart()) + 1, kind, text: text.replace(/\s+/g, ' ').trim().slice(0, 90) }); };
  const visit = (node) => {
    if (ts.isJsxText(node) && COMMENT_TEXT.test(node.getText())) {
      // без исключений: падение не зависит от того, dev это экран или нет
      const text = node.getText();
      const firstPos = node.getStart() + text.search(/\S/);
      hits.push({ file: rel, line: lineAt(firstPos) + 1, kind: 'комментарий-текст', text: text.trim().slice(0, 90) });
    } else if (ts.isJsxText(node) && isUiText(node.getText())) {
      push(node, 'jsx-текст', node.getText());
    }
    if (ts.isJsxExpression(node) && node.expression && !ts.isJsxAttribute(node.parent)
      && (ts.isStringLiteral(node.expression) || ts.isNoSubstitutionTemplateLiteral(node.expression)) && isUiText(node.expression.text)) {
      push(node, 'jsx-{строка}', node.expression.text);
    }
    if (ts.isJsxAttribute(node) && UI_PROPS.has(node.name.getText())) {
      const init = node.initializer;
      let val = null;
      if (init && ts.isStringLiteral(init)) val = init.text;
      else if (init && ts.isJsxExpression(init) && init.expression && (ts.isStringLiteral(init.expression) || ts.isNoSubstitutionTemplateLiteral(init.expression))) val = init.expression.text;
      if (val !== null && QA_ID.test(val)) { if (!exempt) qaIds.push({ file: rel, line: lineAt(node.getStart()) + 1, text: val }); }
      else if (val !== null && isUiText(val)) push(node, 'проп ' + node.name.getText(), val);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return hits;
}

const all = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d))).flatMap(scanFile);
const byFile = {};
for (const h of all) (byFile[h.file] = byFile[h.file] || []).push(h);
const args = new Set(process.argv.slice(2));
const total = all.length;
const comments = all.filter((h) => h.kind === 'комментарий-текст');
if (args.has('--report')) {
  console.log(`Файлов: ${Object.keys(byFile).length}, находок: ${total} (из них комментарий-текст: ${comments.length})`);
  for (const [f, hs] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  ${hs.length}  ${f}`);
    for (const h of hs) console.log(`      ${h.line}: [${h.kind}] ${h.text}`);
  }
  if (qaIds.length) {
    console.log(`\nДоступность (не в счёте): служебный id в accessibilityLabel — экранный диктор прочтёт его вслух: ${qaIds.length}`);
    for (const q of qaIds) console.log(`      ${q.file}:${q.line} ${q.text}`);
  }
  process.exit(0);
}
if (comments.length) {
  // зачем: этот класс роняет экран — в базу не принимается никогда
  console.error(`Комментарий-текст в JSX (падение «Text strings must be rendered within <Text>»): ${comments.length}`);
  for (const c of comments) console.error(`  ${c.file}:${c.line} ${c.text}`);
  process.exit(1);
}
let base = null;
try { base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch (e) { console.warn(`[JSX-I18N] базы нет (${e.code || e.message}) — считаю от нуля`); }
if (args.has('--update')) {
  if (base && total > base.total) { console.error(`Отказ: ${total} больше базы ${base.total} — база только вниз.`); process.exit(1); }
  const files = Object.fromEntries(Object.entries(byFile).map(([f, hs]) => [f, hs.length]).sort());
  fs.writeFileSync(BASELINE, JSON.stringify({ total, files }, null, 2) + '\n');
  console.log(`База зафиксирована: ${total} находок в ${Object.keys(files).length} файлах.`);
  process.exit(0);
}
const limit = base ? base.total : 0;
if (total > limit) { console.error(`Больше, чем в базе: ${total} против ${limit}. Где: node scripts/scan_untranslated_jsx.mjs --report`); process.exit(1); }
console.log(total < limit ? `Стало лучше: ${total} против ${limit} в базе. Зафиксируй: node scripts/scan_untranslated_jsx.mjs --update` : `OK: ${total} находок, как в базе.`);
