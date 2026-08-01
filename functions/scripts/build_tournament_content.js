#!/usr/bin/env node
/*
 * Готовит контент планов для облака.
 *
 * зачем: генератор турнирных заданий берёт фразы из app/plan_content_*.ts —
 * это TypeScript в корне проекта, а в Cloud Functions уезжает только папка
 * functions/, и .ts там никто не исполнит. Поэтому на этапе сборки вытаскиваем
 * ТОЛЬКО нужные генератору поля (english, meaning.ru, words, topic, level) в
 * компактный JSON рядом с функциями. Полный контент 20 МБ, выжимка — доли от
 * этого: в рантайм не тянем объяснения и теорию; из словаря дня переносим
 * только авторские EN↔RU пары, нужные speed_match.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const PLANS = ['mitap', 'gavan', 'impuls', 'echo', 'voyazh'];
const OUT_DIR = path.resolve(__dirname, '..', 'src', 'generated');

/*
 * Файлы планов — TypeScript, но по содержимому это набор объявлений
 * `export const PLAN_DAY_N: PlanContentDay = { ... };` плюс итоговый массив
 * ссылок. ts-node в проекте не установлен, поэтому снимаем аннотации типов и
 * исполняем файл как обычный JS в песочнице, собирая объявленные дни.
 */
function extractDays(source) {
  const stripped = source
    // import type { ... } from '...';
    .replace(/^\s*import\s+type[\s\S]*?;\s*$/gm, '')
    .replace(/^\s*import\s[\s\S]*?;\s*$/gm, '')
    // export const NAME: Type = {   →   NAME = {
    .replace(/export\s+const\s+([A-Za-z0-9_]+)\s*:\s*[A-Za-z0-9_<>\[\].| ]+\s*=/g, 'var $1 =')
    .replace(/export\s+const\s+([A-Za-z0-9_]+)\s*=/g, 'var $1 =')
    .replace(/export\s+/g, '');

  const sandbox = {};
  const vm = require('node:vm');
  vm.runInNewContext(stripped, sandbox, { timeout: 180000 });

  // Предпочитаем итоговый массив *_CONTENT_DAYS; иначе собираем все дни.
  for (const [key, value] of Object.entries(sandbox)) {
    if (key.endsWith('_CONTENT_DAYS') && Array.isArray(value) && value.length) return value;
  }
  return Object.values(sandbox).filter((v) => v && Array.isArray(v.phrases));
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const bundle = [];

for (const planId of PLANS) {
  const file = path.join(ROOT, 'app', `plan_content_${planId}.ts`);
  if (!fs.existsSync(file)) { console.warn(`[skip] ${planId}: нет файла`); continue; }
  const days = extractDays(fs.readFileSync(file, 'utf8'));

  for (const day of days) {
    const phrases = (day.phrases || [])
      .filter((p) => p && p.english && p.meaning && p.meaning.ru)
      .map((p) => ({
        id: String(p.id),
        english: String(p.english),
        meaning: { ru: String(p.meaning.ru) },
        // Только текст дистракторов — partOfSpeech генератору не нужен.
        words: (p.words || []).map((w) => ({
          text: String(w.text),
          partOfSpeech: String(w.partOfSpeech || ''),
          distractors: (w.distractors || []).map(String),
        })),
      }));
    if (!phrases.length) continue;

    bundle.push({
      planId: String(day.planId || planId),
      dayIndex: Number(day.dayIndex),
      topic: day.topic && day.topic.ru ? { ru: String(day.topic.ru) } : undefined,
      level: day.level ? String(day.level) : undefined,
      phrases,
      vocabulary: (day.vocabulary || [])
        .filter((entry) => entry && entry.word && entry.translation && entry.translation.ru)
        .map((entry) => ({
          word: String(entry.word),
          partOfSpeech: String(entry.partOfSpeech || ''),
          translation: { ru: String(entry.translation.ru) },
        })),
    });
  }
  console.log(`[ok] ${planId}: ${days.length} дней`);
}

const out = path.join(OUT_DIR, 'tournament_content.json');
fs.writeFileSync(out, JSON.stringify(bundle));
const mb = (fs.statSync(out).size / 1024 / 1024).toFixed(2);
console.log(`\nИтого: ${bundle.length} дней, ${bundle.reduce((n, d) => n + d.phrases.length, 0)} фраз → ${mb} МБ`);
