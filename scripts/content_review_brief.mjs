#!/usr/bin/env node
/**
 * Готовит вход для проверки готового сценария вторым ИИ.
 *
 * зачем (ресерч 2026-08-15): «второй ИИ проверяет первого по рубрике до того,
 * как текст попадёт человеку» — обкатанная индустриальная практика, а не
 * эксперимент. Сильные судьи дают 80-90% согласия с людьми, что сопоставимо
 * с согласием между самими людьми. Ключевое условие — рубрика с наблюдаемыми
 * критериями, а не «оцени качество».
 *
 * зачем не автоматический вызов модели: судья должен работать в ЧИСТОМ
 * контексте, не видя рассуждений автора — иначе он унаследует его слепые
 * пятна и начнёт соглашаться. Поэтому скрипт готовит текст для отдельной
 * сессии, а не дёргает API из того же процесса.
 *
 * зачем вообще машинная часть: у LINGMAN уже есть CHECKLIST.md на 30
 * наблюдаемых критериев — рубрика написана и не используется автоматически.
 * У VIRAL и MASON чек-листа нет, критерии живут внутри плейбуков.
 *
 * Использование:
 *   node scripts/content_review_brief.mjs content/lingman/scripts/2026-06-27_001_*.md
 *   node scripts/content_review_brief.mjs --last lingman
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PIPELINES = {
  lingman: {
    dir: 'content/lingman/scripts',
    /** Готовая рубрика: 30 наблюдаемых критериев, написана владельцем. */
    rubric: 'content/lingman/CHECKLIST.md',
    /** Откуда взять критерии, если рубрики нет. */
    fallback: ['content/lingman/STYLE_FUSION.md'],
  },
  viral: {
    dir: 'content/marketing/scripts',
    rubric: null,
    fallback: ['content/marketing/VIRAL_VIDEO_PLAYBOOK.md', 'content/marketing/CAROUSEL_PLAYBOOK.md'],
  },
  mason: {
    dir: 'content/scripts',
    rubric: null,
    fallback: ['content/CLARKSON_STYLE.md'],
  },
};

/**
 * Общие признаки машинного текста.
 *
 * зачем держать здесь, а не только в чек-листе LINGMAN: они одинаковы для
 * всех трёх конвейеров, а чек-лист есть только у одного. Список короткий
 * намеренно — длинный превращается в шум, который судья перестаёт читать.
 */
const SLOP_MARKERS = [
  'давайте погрузимся',
  'в этом видео мы рассмотрим',
  'в современном мире',
  'уникальная методика',
  'не секрет, что',
  'итак, запомните',
  'важно отметить',
  'стоит отметить',
];

function findLast(relDir) {
  const dir = path.join(ROOT, relDir);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ full: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0]?.full ?? null;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Укажи файл сценария или: --last <lingman|viral|mason>');
  process.exit(1);
}

let target;
let pipelineKey;

if (args[0] === '--last') {
  pipelineKey = (args[1] ?? '').toLowerCase();
  const pipeline = PIPELINES[pipelineKey];
  if (!pipeline) {
    console.error(`Неизвестный конвейер: ${args[1]}. Есть: ${Object.keys(PIPELINES).join(', ')}`);
    process.exit(1);
  }
  target = findLast(pipeline.dir);
  if (!target) {
    console.error(`В ${pipeline.dir} нет сценариев.`);
    process.exit(1);
  }
} else {
  target = path.resolve(ROOT, args[0]);
  if (!fs.existsSync(target)) {
    console.error(`Файл не найден: ${args[0]}`);
    process.exit(1);
  }
  const rel = path.relative(ROOT, target).split(path.sep).join('/');
  pipelineKey = Object.keys(PIPELINES).find((k) => rel.startsWith(PIPELINES[k].dir)) ?? 'lingman';
}

const pipeline = PIPELINES[pipelineKey];
const script = fs.readFileSync(target, 'utf8');

// зачем машинная часть проверки: очевидные штампы не должны тратить внимание
// судьи. Он нужен для суждения, а не для поиска подстрок.
const foundMarkers = SLOP_MARKERS.filter((m) => script.toLowerCase().includes(m));

const lines = [];
lines.push('# Проверка сценария перед отдачей автору');
lines.push('');
lines.push('Ты проверяющий. Ты НЕ писал этот текст и не видел рассуждений автора —');
lines.push('это намеренно: судья в чистом контексте не наследует его слепые пятна.');
lines.push('');
lines.push(`Конвейер: **${pipelineKey}**`);
lines.push(`Файл: \`${path.relative(ROOT, target).split(path.sep).join('/')}\``);
lines.push('');

if (foundMarkers.length > 0) {
  lines.push('## Машинная проверка нашла штампы');
  lines.push('');
  for (const m of foundMarkers) lines.push(`- «${m}»`);
  lines.push('');
  lines.push('Это признаки машинного текста. Отметь их как обязательные к правке.');
  lines.push('');
}

const rubricPath = pipeline.rubric ? path.join(ROOT, pipeline.rubric) : null;
if (rubricPath && fs.existsSync(rubricPath)) {
  lines.push('## Рубрика — проверяй по каждому пункту');
  lines.push('');
  lines.push(fs.readFileSync(rubricPath, 'utf8').trim());
  lines.push('');
} else {
  lines.push('## Критерии — из плейбука конвейера');
  lines.push('');
  // зачем предупредить: судья без рубрики склонен одобрять почти всё,
  // и об этом он должен знать заранее.
  lines.push('Готового чек-листа у этого конвейера нет. Выведи критерии из плейбука ниже');
  lines.push('и суди строго по ним — расплывчатая рубрика превращает проверку в согласие.');
  lines.push('');
  for (const f of pipeline.fallback) {
    const full = path.join(ROOT, f);
    if (!fs.existsSync(full)) continue;
    lines.push(`### ${f}`);
    lines.push('');
    lines.push(fs.readFileSync(full, 'utf8').trim());
    lines.push('');
  }
}

lines.push('## Как отвечать');
lines.push('');
lines.push('По каждому нарушенному критерию: что именно не так и в какой строке.');
lines.push('Не пересказывай сценарий и не хвали — автор увидит только замечания.');
lines.push('Ничего не нашёл по критерию — молчи о нём, а не пиши «здесь всё хорошо».');
lines.push('');
lines.push('В конце — вердикт одним словом: ГОТОВО или ДОРАБОТАТЬ.');
lines.push('');
lines.push('---');
lines.push('');
lines.push('## Сценарий на проверку');
lines.push('');
lines.push(script.trim());

const outPath = path.join(ROOT, '.content-review.md');
fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');

console.log(`Задание проверяющему собрано: ${path.relative(ROOT, outPath)}`);
console.log(`Рубрика: ${rubricPath && fs.existsSync(rubricPath) ? pipeline.rubric : 'из плейбука (готового чек-листа нет)'}`);
if (foundMarkers.length > 0) {
  console.log(`Штампов найдено машинно: ${foundMarkers.length} — ${foundMarkers.join(', ')}`);
} else {
  console.log('Машинных штампов не найдено.');
}
console.log('');
console.log('Дальше: открой файл в ОТДЕЛЬНОЙ сессии ассистента — судья');
console.log('не должен видеть, как писался сценарий.');
