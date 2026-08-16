#!/usr/bin/env node
/**
 * Собирает контекст контент-конвейера одной командой.
 *
 * зачем (ресерч 2026-08-15): у MASON, LINGMAN и VIRAL одинаковый первый шаг —
 * «прочитать 3-9 файлов контекста, посмотреть последние работы, не повторяться».
 * Этот ритуал выполняется заново в КАЖДОЙ сессии вручную, потому что память
 * ассистента — это просто файлы на диске. Три конвейера × каждый запуск.
 *
 * зачем это важнее, чем кажется: по последним 200 коммитам — 139 ушли в код
 * и 2 в продвижение. Последний файл маркетингового конвейера от начала июля,
 * обучающего — от конца июня. Конвейеры не сломаны, они просто стоят.
 * Чем выше порог входа («сначала прочитай четыре файла»), тем реже запуск.
 *
 * Скрипт НЕ пишет контент и не публикует. Он готовит вход: собирает
 * инструкции, показывает последние работы и напоминает, что не повторять.
 *
 * Использование:
 *   node scripts/content_pipeline_brief.mjs viral
 *   node scripts/content_pipeline_brief.mjs lingman
 *   node scripts/content_pipeline_brief.mjs mason
 *   node scripts/content_pipeline_brief.mjs --status   # когда что запускалось
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Описание конвейеров. Пути — из их собственных инструкций, не выдуманы.
 *
 * зачем `recent`: главное правило всех трёх — «не повторять недавние темы».
 * Без списка последних работ ассистент его выполнить не может.
 */
const PIPELINES = {
  viral: {
    title: 'VIRAL — продвижение приложения (рилсы, карусели, контент-план)',
    dir: 'content/marketing',
    context: ['VIRAL.md', 'MARKETING_SYSTEM.md', 'VIRAL_VIDEO_PLAYBOOK.md', 'CAROUSEL_PLAYBOOK.md'],
    recent: 'content/marketing/scripts',
    trigger: 'VIRAL',
  },
  lingman: {
    title: 'LINGMAN — обучающий канал (Professor Lingman, длинные уроки)',
    dir: 'content/lingman',
    context: ['LINGMAN.md', 'AUDIENCE.md', 'FORMAT_CHAIN.md', 'STYLE_FUSION.md', 'CHECKLIST.md'],
    recent: 'content/lingman/scripts',
    trigger: 'LINGMAN',
  },
  mason: {
    title: 'MASON — закулисье разработки (короткие видео, Кларксон-стиль)',
    dir: 'content',
    context: ['MASON.md', 'DOSSIER.md', 'CLARKSON_STYLE.md'],
    recent: 'content/scripts',
    trigger: 'MASON',
  },
};

function listRecent(relDir, limit = 8) {
  const dir = path.join(ROOT, relDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit);
}

function daysSince(ms) {
  return Math.floor((Date.now() - ms) / 86_400_000);
}

const args = process.argv.slice(2);

if (args.includes('--status') || args.length === 0) {
  console.log('Контент-конвейеры — когда работали в последний раз\n');
  for (const [key, p] of Object.entries(PIPELINES)) {
    const recent = listRecent(p.recent, 1);
    const last = recent[0];
    const age = last ? daysSince(last.mtime) : null;
    // зачем показывать возраст, а не только дату: «46 дней назад» говорит
    // само за себя, а «2026-07-02» требует считать в уме.
    const state = last ? `${age} дн. назад · ${last.name}` : 'работ нет';
    const mark = age === null || age > 21 ? '  ⚠' : '   ';
    console.log(`${mark} ${key.padEnd(8)} ${state}`);
  }
  console.log('\nЗапустить: node scripts/content_pipeline_brief.mjs <viral|lingman|mason>');
  process.exit(0);
}

const key = args[0].toLowerCase();
const pipeline = PIPELINES[key];
if (!pipeline) {
  console.error(`Неизвестный конвейер: ${key}. Есть: ${Object.keys(PIPELINES).join(', ')}`);
  process.exit(1);
}

const lines = [];
lines.push(`# Бриф конвейера ${pipeline.trigger}`);
lines.push('');
lines.push(pipeline.title);
lines.push('');

const recent = listRecent(pipeline.recent);
if (recent.length > 0) {
  lines.push('## Последние работы — НЕ повторять эти темы и форматы');
  lines.push('');
  for (const r of recent) lines.push(`- ${r.name} (${daysSince(r.mtime)} дн. назад)`);
  lines.push('');
} else {
  lines.push('## Последних работ нет — конвейер запускается впервые или папка пуста');
  lines.push('');
}

lines.push('## Инструкции конвейера');
lines.push('');
let missing = 0;
for (const file of pipeline.context) {
  const full = path.join(ROOT, pipeline.dir, file);
  if (!fs.existsSync(full)) {
    // зачем сообщать, а не молчать: пропавший плейбук означает, что ассистент
    // будет работать по неполным правилам и этого никто не заметит.
    lines.push(`> ОТСУТСТВУЕТ: ${pipeline.dir}/${file}`);
    lines.push('');
    missing += 1;
    continue;
  }
  lines.push(`### ${file}`);
  lines.push('');
  lines.push(fs.readFileSync(full, 'utf8').trim());
  lines.push('');
}

const brief = lines.join('\n');
const outPath = path.join(ROOT, '.content-brief.md');
fs.writeFileSync(outPath, `${brief}\n`, 'utf8');

console.log(`Бриф собран: ${path.relative(ROOT, outPath)}`);
console.log(`Файлов контекста: ${pipeline.context.length - missing} из ${pipeline.context.length}`);
if (missing > 0) console.log(`ВНИМАНИЕ: не найдено файлов — ${missing}`);
console.log(`Последних работ учтено: ${recent.length}`);
console.log('');
console.log('Дальше: открой бриф в сессии ассистента и скажи, что нужно —');
console.log(`рилс, карусель, урок или контент-план. Шаг «прочитай ${pipeline.context.length} файла» уже сделан.`);
