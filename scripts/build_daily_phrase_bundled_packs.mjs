#!/usr/bin/env node
/**
 * Фраза дня для es/de/it — принятые пакеты (2026.10.04.editorial-accepted-dev-v1) в сборку.
 *
 * зачем (владелец 12.10 через координатора: «Фразы дня должны быть подключены для ВСЕХ языков… ВКЛЮЧАЙ», решение D163):
 * пакеты лежали только в .artifacts/ (в .gitignore) и качались из облака лишь в dev-сборке — в стор-сборку не попадали.
 * Скрипт берёт принятые пакеты как есть (тексты НЕ правит), проверяет sha256 полезной нагрузки против manifest, 176 записей и
 * совпадение ru- и uk-пакетов одного языка по всем полям, убирает служебные поля и пишет один минифицированный JSON на язык:
 * constants/daily_phrase_packs/<цель>.json.
 *
 * Запуск: node scripts/build_daily_phrase_bundled_packs.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = '2026.10.04.editorial-accepted-dev-v1';
const SOURCE = path.join(ROOT, '.artifacts', 'daily-phrase-dev-server-packs', 'course-packs');
const OUT_DIR = path.join(ROOT, 'constants', 'daily_phrase_packs');
const TARGETS = ['es', 'de', 'it'];
const LOCALES = ['ru', 'uk'];
const EXPECTED_ROWS = 176;
const KEEP = ['id', 'order', 'targetText', 'literal_ru', 'meaning_ru', 'text_ru', 'literal_uk', 'meaning_uk', 'text_uk', 'quiz_ru', 'quiz_uk', 'allowSave', 'scheduledDate'];

function fail(message) {
  console.error(`[DAILY-PHRASE-PACKS] ОТКАЗ: ${message}`);
  process.exit(1);
}

function loadPack(target, locale) {
  const dir = path.join(SOURCE, target, locale, 'daily_phrase', VERSION);
  if (!fs.existsSync(dir)) fail(`нет папки пакета ${path.relative(ROOT, dir)}`);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const file = manifest.payloadShard || manifest.entryIndex;
  if (typeof file !== 'string' || !/^[A-Za-z0-9._-]+\.json$/.test(file)) fail(`${target}/${locale}: в manifest нет имени полезной нагрузки`);
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  const sha = crypto.createHash('sha256').update(text).digest('hex');
  const expected = String(manifest.payloadSha256 || manifest.sha256 || '').toLowerCase();
  if (sha !== expected) fail(`${target}/${locale}: sha256 ${sha} ≠ manifest ${expected}`);
  const payload = JSON.parse(text);
  if (payload.studyTarget !== target || payload.sourceLocale !== locale || payload.surface !== 'daily_phrase') {
    fail(`${target}/${locale}: заголовок полезной нагрузки не совпал (${payload.studyTarget}/${payload.sourceLocale}/${payload.surface})`);
  }
  if (!Array.isArray(payload.entries) || payload.entries.length !== EXPECTED_ROWS) fail(`${target}/${locale}: записей ${payload.entries?.length}, нужно ${EXPECTED_ROWS}`);
  return { sha, entries: payload.entries };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const target of TARGETS) {
  const [ru, uk] = LOCALES.map((locale) => loadPack(target, locale));
  ru.entries.forEach((entry, i) => {
    for (const key of KEEP) {
      if (JSON.stringify(entry[key]) !== JSON.stringify(uk.entries[i][key])) fail(`${target}: ru и uk расходятся в записи ${i} поле ${key}`);
    }
    if (typeof entry.targetText !== 'string' || !entry.targetText.trim()) fail(`${target}: пустой targetText в записи ${i}`);
  });
  const entries = ru.entries.map((entry) => Object.fromEntries(KEEP.filter((key) => entry[key] !== undefined).map((key) => [key, entry[key]])));
  const out = {
    schemaVersion: 'daily-phrase-bundled-pack-v1',
    studyTarget: target,
    contentVersion: VERSION,
    decision: 'D163',
    sourcePayloadSha256: { ru: ru.sha, uk: uk.sha },
    entries,
  };
  const file = path.join(OUT_DIR, `${target}.json`);
  fs.writeFileSync(file, `${JSON.stringify(out)}\n`);
  console.log(`[DAILY-PHRASE-PACKS] ${target}: ${entries.length} фраз → ${path.relative(ROOT, file)} (${fs.statSync(file).size} байт)`);
}
