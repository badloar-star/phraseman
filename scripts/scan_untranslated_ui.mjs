#!/usr/bin/env node
/**
 * Ищет русские строки-литералы в UI-компонентах, которые НЕ обёрнуты в переводчик.
 *
 * зачем (владелец 2026-08-15): один и тот же баг «экран показывал русский текст
 * на любом языке» чинился 14 раз подряд — главный экран плана, мастер настройки,
 * завершение задачи, теория дня, карточка плана, лобби турнира, сезон, билеты…
 * Каждый раз это была отдельная сессия «нашёл случайно → починил один экран».
 * Существующие 90 тестов локалей проверяют конкретные места, но не запрещают
 * класс ошибки целиком.
 *
 * зачем храповик, а не «почини всё сразу»: в проекте уже сотни таких мест,
 * и часть из них легальна (данные уроков, отладочные строки). Требовать
 * разовой зачистки — значит гарантировать, что сторож отключат. Храповик
 * фиксирует текущее число и не даёт ему расти: новый экран обязан быть
 * переведён с рождения, старые чинятся по мере того, как их всё равно трогают.
 *
 * Использование:
 *   node scripts/scan_untranslated_ui.mjs            # проверить против базы
 *   node scripts/scan_untranslated_ui.mjs --report   # показать, где именно
 *   node scripts/scan_untranslated_ui.mjs --update   # зафиксировать новую базу (только вниз)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'config', 'untranslated-ui-baseline.json');

/** Где живут экраны. Копии дерева и временные папки не считаются. */
const SCAN_DIRS = ['app', 'components'];
const SKIP_DIR = /^(node_modules|__tests__|\.git|\.claude|\.codex-tmp|\.worktrees|tmp)$/;

/**
 * Файлы, где русский текст — это КОНТЕНТ, а не интерфейс.
 *
 * зачем: данные уроков и словари по определению содержат русский — они и есть
 * материал для изучения. Считать их нарушением значит утопить сигнал в шуме.
 */
const CONTENT_FILES = [
  /lesson_help_theory_data\.tsx$/,
  /_data\.tsx$/,
  /_content\.tsx$/,
  // зачем эти четыре: русский в них — учебный материал (слова урока, подсказки
  // по грамматике, банки вопросов экзамена), а не подписи интерфейса.
  // Проверено чтением: это `topic`/`q`/`opts` внутри массивов заданий.
  /app\/lesson_words\.tsx$/,
  /app\/hint\.tsx$/,
  /app\/exam\.tsx$/,
  /app\/level_exam\.tsx$/,
];

/**
 * Строка уже переведена соседним полем — не нарушение этого сторожа.
 *
 * зачем: банки заданий переводят через парные поля (`topic` + `topicUK`),
 * а не через triLang. Это отдельная проблема — перевод только на два языка
 * вместо восьми, — но другого класса, и мешать её с «забыл обернуть вовсе»
 * значит утопить сигнал: сторож станет шуметь там, где перевод есть.
 */
const PAIRED_TRANSLATION = /\b\w+(UK|Uk|_uk|EN|En|_en|ES|Es|_es)\s*:/;

/**
 * Файл — сам словарь переводов: русский в нём и есть перевод.
 *
 * зачем распознавать по содержимому, а не списком имён: словари появляются
 * и переезжают, а захардкоженный список устареет молча. Признак — объявление
 * словаря языка (`const RU = {`, `ru: {`) рядом с таким же для другого языка.
 */
function isTranslationDictionary(source) {
  // зачем `[^=\n]*` перед `=`: словари объявляются и с типом
  // (`const UK: typeof RU = {`), не только голым присваиванием.
  const hasRu = /\b(const\s+RU\b[^=\n]*=|['"]?ru['"]?\s*:\s*\{)/.test(source);
  const hasOther = /\b(const\s+(UK|EN|ES|PL|TR|VI|ID|PT_BR)\b[^=\n]*=|['"]?(uk|en|es|pl|tr|vi|id)['"]?\s*:\s*\{)/.test(source);
  return hasRu && hasOther;
}

/** Переводчики проекта: строки внутри их вызова легальны по определению. */
const TRANSLATORS = ['triLang', 'pickLang', 'localized', 't('];

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIR.test(entry.name)) walk(full, out);
    } else if (entry.name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Убирает комментарии и всё, что лежит внутри вызова переводчика.
 *
 * зачем по балансу скобок, а не регуляркой: вызовы переводчика содержат
 * вложенные шаблонные строки и объекты — регулярка на них ломается и даёт
 * ложные срабатывания, из-за которых сторожу перестают верить.
 */
function stripLegal(source) {
  let src = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');

  for (const name of TRANSLATORS) {
    let result = '';
    let cursor = 0;
    for (;;) {
      const found = src.indexOf(name, cursor);
      if (found < 0) {
        result += src.slice(cursor);
        break;
      }
      result += src.slice(cursor, found);
      const open = src.indexOf('(', found);
      if (open < 0) {
        cursor = found + name.length;
        continue;
      }
      let depth = 0;
      let i = open;
      for (; i < src.length; i += 1) {
        if (src[i] === '(') depth += 1;
        else if (src[i] === ')') {
          depth -= 1;
          if (depth === 0) { i += 1; break; }
        }
      }
      cursor = i;
    }
    src = result;
  }
  return src;
}

const CYRILLIC_LITERAL = /(['"`])(?:(?!\1)[^\r\n])*[а-яА-ЯёЁ](?:(?!\1)[^\r\n])*\1/g;

function scanFile(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (CONTENT_FILES.some((re) => re.test(rel))) return null;
  const source = fs.readFileSync(file, 'utf8');
  if (isTranslationDictionary(source)) return null;
  const stripped = stripLegal(source);
  // зачем построчно: только так видно, есть ли рядом парный перевод —
  // а он превращает находку в другую проблему, не в эту.
  const hits = [];
  for (const line of stripped.split('\n')) {
    if (PAIRED_TRANSLATION.test(line)) continue;
    const found = line.match(CYRILLIC_LITERAL);
    if (found) hits.push(...found);
  }
  return hits.length ? { file: rel, count: hits.length, samples: hits.slice(0, 3) } : null;
}

function scan() {
  const files = SCAN_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
  const findings = files.map(scanFile).filter(Boolean);
  findings.sort((a, b) => b.count - a.count);
  return findings;
}

function readBaseline() {
  if (!fs.existsSync(BASELINE)) return null;
  return JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
}

const args = new Set(process.argv.slice(2));
const findings = scan();
const total = findings.reduce((sum, f) => sum + f.count, 0);

if (args.has('--report')) {
  console.log(`Файлов с непереведёнными строками: ${findings.length}, строк всего: ${total}\n`);
  for (const f of findings.slice(0, 25)) {
    console.log(`${String(f.count).padStart(4)}  ${f.file}`);
    for (const s of f.samples) console.log(`      ${s.slice(0, 90)}`);
  }
  process.exit(0);
}

if (args.has('--update')) {
  const previous = readBaseline();
  // зачем только вниз: база — это храповик. Разрешить ей расти значит
  // разрешить узаконивать новые нарушения одной командой.
  if (previous && total > previous.total) {
    console.error(`ОТКАЗ: сейчас ${total}, в базе ${previous.total}. База двигается только вниз.`);
    console.error('Сначала почини новые места, потом фиксируй.');
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, `${JSON.stringify({
    total,
    files: findings.length,
    updatedAt: new Date().toISOString().slice(0, 10),
    note: 'Храповик: число может только уменьшаться. Обновлять через --update.',
  }, null, 2)}\n`, 'utf8');
  console.log(`База зафиксирована: ${total} строк в ${findings.length} файлах.`);
  process.exit(0);
}

const baseline = readBaseline();
if (!baseline) {
  console.error('Базы нет. Создай: node scripts/scan_untranslated_ui.mjs --update');
  process.exit(1);
}

if (total > baseline.total) {
  console.error(`ОТКАЗ: непереведённых строк стало больше — ${total}, было ${baseline.total}.`);
  console.error('');
  console.error('Русский текст в UI виден ВСЕМ не-русскоязычным пользователям.');
  console.error('Оберни новые строки в triLang, а не двигай базу вверх.');
  console.error('');
  console.error('Где именно: node scripts/scan_untranslated_ui.mjs --report');
  process.exit(1);
}

if (total < baseline.total) {
  console.log(`Стало лучше: ${total} против ${baseline.total} в базе.`);
  console.log('Зафиксируй: node scripts/scan_untranslated_ui.mjs --update');
  process.exit(0);
}

console.log(`OK: ${total} непереведённых строк, как в базе.`);
