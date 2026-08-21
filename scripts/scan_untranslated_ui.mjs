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
import { execFileSync } from 'node:child_process';
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
  const mask = (value) => value.replace(/[^\r\n]/g, ' ');
  let src = source
    .replace(/\/\*[\s\S]*?\*\//g, mask)
    .replace(/^[ \t]*\/\/.*$/gm, mask);

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
        result += mask(src.slice(found, found + name.length));
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
      result += mask(src.slice(found, i));
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

/**
 * Файлы, которые реально уходят в этот коммит.
 *
 * зачем (2026-08-16): сторож блокировал коммит за строку, добавленную
 * ПАРАЛЛЕЛЬНОЙ сессией в чужой файл. Дерево общее, и наказывать за чужую
 * работу — верный способ приучить обходить сторожа через --no-verify,
 * после чего он перестаёт защищать вообще.
 */
function stagedUiFiles() {
  try {
    const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    return new Set(out.split('\n').map((line) => line.trim()).filter((line) => line.endsWith('.tsx')));
  } catch {
    return null;
  }
}

/**
 * Непереведённые строки, добавленные ИМЕННО ЭТИМ коммитом.
 *
 * зачем (2026-08-16, владелец): проверки по именам файлов мало. Файл может
 * годами тащить чужой долг — и тогда сторож блокировал любую правку этого
 * файла, даже ту, что строки только УДАЛЯЕТ. На удалении экрана-стены
 * «Нужна безопасная проверка» диф был −168/+20 и ноль новых русских строк,
 * а сторож всё равно отказывал: _layout.tsx числился среди должников.
 *
 * Считаем по «+»-строкам стейджа тем же детектором, что и полное сканирование.
 * Чужой долг в том же файле больше не наказывает; новая непереведённая
 * строка ловится ровно как раньше.
 */
function addedUntranslatedLines() {
  try {
    const out = execFileSync('git', ['diff', '--cached', '--unified=0', '--diff-filter=ACMR', '--', '*.tsx'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const hits = [];
    let maskedLines = null;
    let newLineNumber = 0;
    for (const line of out.split('\n')) {
      const fileHeader = line.match(/^\+\+\+ b\/(.+)$/);
      if (fileHeader) {
        const rel = fileHeader[1];
        if (CONTENT_FILES.some((re) => re.test(rel))) {
          maskedLines = null;
          continue;
        }
        const stagedSource = execFileSync('git', ['show', `:${rel}`], {
          cwd: ROOT,
          encoding: 'utf8',
        });
        maskedLines = isTranslationDictionary(stagedSource)
          ? null
          : stripLegal(stagedSource).split('\n');
        continue;
      }

      const hunkHeader = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunkHeader) {
        newLineNumber = Number(hunkHeader[1]);
        continue;
      }

      // Проверяем добавленную строку в маске целого staged-файла. Так комментарии
      // и многострочные triLang-вызовы получают ту же трактовку, что полный scan().
      if (line.startsWith('+') && !line.startsWith('+++')) {
        const added = maskedLines?.[newLineNumber - 1] ?? '';
        if (!PAIRED_TRANSLATION.test(added)) {
          const found = added.match(CYRILLIC_LITERAL);
          if (found) hits.push(...found);
        }
        newLineNumber += 1;
        continue;
      }
      if (!line.startsWith('-') && !line.startsWith('\\')) newLineNumber += 1;
    }
    return hits;
  } catch {
    return null;
  }
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
  // зачем разделять свой и чужой рост: дерево общее, параллельные сессии
  // пишут в него одновременно. Блокировать коммит за чужую строку — верный
  // способ приучить обходить сторожа, после чего он не защищает вообще.
  const staged = args.has('--staged') ? stagedUiFiles() : null;
  const mine = staged
    ? findings.filter((f) => staged.has(f.file))
    : findings;

  if (staged && mine.length === 0) {
    console.log(`Непереведённых стало больше (${total} против ${baseline.total}),`);
    console.log('но ни один из этих файлов не в твоём коммите — пропускаю.');
    console.log('Кто-то работает в этом же дереве параллельно.');
    process.exit(0);
  }

  // Файл в коммите есть, но что именно ты в него добавил? Если ни одной новой
  // непереведённой строки — долг чужой, наказывать не за что.
  if (staged && mine.length > 0) {
    const added = addedUntranslatedLines();
    if (added !== null && added.length === 0) {
      console.log(`Непереведённых стало больше (${total} против ${baseline.total}),`);
      console.log('но твой диф не добавил ни одной непереведённой строки — пропускаю.');
      console.log(`Чужой долг в этих файлах: ${mine.map((f) => f.file).join(', ')}.`);
      process.exit(0);
    }
  }

  console.error(`ОТКАЗ: непереведённых строк стало больше — ${total}, было ${baseline.total}.`);
  console.error('');
  console.error('Русский текст в UI виден ВСЕМ не-русскоязычным пользователям.');
  console.error('Оберни новые строки в triLang, а не двигай базу вверх.');
  if (staged && mine.length > 0) {
    console.error('');
    console.error('В твоём коммите:');
    for (const f of mine.slice(0, 5)) console.error(`  ${f.file} — ${f.count}`);
  }
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
