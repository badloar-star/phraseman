#!/usr/bin/env node
/*
 * Дописывает к заданиям новых механик Пика оценку сложности автора (level.target, level.floor) — по candidateId.
 *
 * зачем (владелец 11.11.2026: «первый этаж самой первой башни должно быть изи-пизи … распредели по сложности не по
 * механикам, а по самим фразам»): при переносе пула в проект от оценки автора осталась только «неделя» (8 крупных корзин),
 * и накладка ставила на первый этаж фразы уровня B1–B2. Сам пул после переноса правила независимая вычитка (113 правок),
 * поэтому полный повторный импорт нельзя — он затёр бы правки. Скрипт меняет в строке ТОЛЬКО поле level.
 *
 * Запуск:  node scripts/attach_peak_expanded_levels.mjs "<папка authoring-continuation>"
 * Отказ (код 1), если у какой-то строки пула не нашлось оценки автора — без молчаливых пропусков.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LANGS = ['en', 'es', 'de', 'fr', 'it'];
const here = path.dirname(fileURLToPath(import.meta.url));
const poolRoot = path.resolve(here, '..', 'content', 'spire-expanded');
const sourceRoot = process.argv[2];
if (!sourceRoot || !fs.existsSync(sourceRoot)) {
  console.error('[peak-expanded-levels] не задана или не найдена папка автора (authoring-continuation)');
  process.exit(1);
}

/** Оценки автора по candidateId: из последних candidates-vN каждой папки; починка (expanded-repairs) идёт второй и главнее. */
function authorLevels() {
  const levels = new Map();
  for (const group of ['new-formats-v1', 'expanded-repairs']) {
    const groupDir = path.join(sourceRoot, group);
    if (!fs.existsSync(groupDir)) continue;
    for (const dirName of fs.readdirSync(groupDir).sort()) {
      const dir = path.join(groupDir, dirName);
      if (!fs.statSync(dir).isDirectory()) continue;
      const latest = fs.readdirSync(dir)
        .map((name) => ({ name, match: /^candidates-v(\d+)\.json$/u.exec(name) }))
        .filter((entry) => entry.match)
        .sort((a, b) => Number(b.match[1]) - Number(a.match[1]))[0];
      if (!latest) continue;
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, latest.name), 'utf8'));
      for (const record of (Array.isArray(parsed) ? parsed : parsed.candidates ?? [])) {
        const level = record?.level;
        if (typeof record?.candidateId === 'string' && level && typeof level.target === 'number' && typeof level.week === 'number') {
          levels.set(record.candidateId, { week: level.week, floor: typeof level.floor === 'number' ? level.floor : null, target: level.target });
        }
      }
    }
  }
  return levels;
}

const levels = authorLevels();
const missing = [];
const manifestPath = path.join(poolRoot, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
for (const lang of LANGS) {
  const file = path.join(poolRoot, lang, 'tasks.jsonl');
  const rows = fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line));
  const next = rows.map((row) => {
    const level = levels.get(row.candidateId);
    if (!level) {
      missing.push(row.candidateId);
      return row;
    }
    // неделя остаётся той, что в пуле: по ней считается трудность 1..3 задания; добавляются этаж и оценка фразы
    return { ...row, level: { week: row.level?.week ?? level.week, floor: level.floor, target: level.target } };
  });
  const text = next.map((row) => JSON.stringify(row)).join('\n') + (next.length > 0 ? '\n' : '');
  fs.writeFileSync(file, text);
  manifest.langs[lang] = { ...manifest.langs[lang], sha256: createHash('sha256').update(text, 'utf8').digest('hex') };
  const targets = next.map((row) => row.level.target).filter((value) => typeof value === 'number').sort((a, b) => a - b);
  console.log(`[peak-expanded-levels] ${lang}: ${next.length} заданий, оценка ${targets[0]}…${targets[targets.length - 1]}`);
}
if (missing.length > 0) {
  console.error(`[peak-expanded-levels] ОТКАЗ: нет оценки автора у ${missing.length} заданий: ${missing.slice(0, 5).join(', ')}…`);
  process.exit(1);
}
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('[peak-expanded-levels] манифест обновлён');
