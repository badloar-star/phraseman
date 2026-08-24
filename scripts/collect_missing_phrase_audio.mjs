#!/usr/bin/env node
/**
 * collect_missing_phrase_audio.mjs — найти фразы, которые приложение
 * ПРОИЗНОСИТ, но для которых нет клипа в app/phrase_audio_url_map.generated.ts.
 *
 * зачем: 24.08.2026 аудит показал две дыры — служебные связки словаря
 * («there is», «going to», «has to») и `alternatives` уроков (запасные
 * формулировки ответа). Обе озвучиваются системным голосом всегда, потому что
 * клипа для них физически нет. Скрипт собирает их в манифест того же формата,
 * что и .codex-tmp/tts-voicing/manifest_gaps.json, чтобы дальше пройти
 * штатным конвейером generate → upload → rebuild map.
 *
 * Ничего не тратит и не пишет в сеть: только читает исходники и пишет манифест.
 *
 * Запуск:
 *   node scripts/collect_missing_phrase_audio.mjs
 *   node scripts/collect_missing_phrase_audio.mjs --out путь/манифест.json
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNTIME_MAP = path.join(ROOT, 'app', 'phrase_audio_url_map.generated.ts');

const outArgIndex = process.argv.indexOf('--out');
const OUT = outArgIndex !== -1 && process.argv[outArgIndex + 1]
  ? path.resolve(process.argv[outArgIndex + 1])
  : path.join(ROOT, '.codex-tmp', 'tts-voicing', 'manifest_missing_2026-08-24.json');

// ── та же нормализация, что в рантайме (normalizePhraseAudioKey) ────────────
const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, ' ');

// ── ключи существующей карты: читаем построчно, без хрупких regex по всему файлу
function readExistingKeys() {
  const lines = fs.readFileSync(RUNTIME_MAP, 'utf8').split(/\r?\n/);
  const keys = new Set();
  let inside = false;
  for (const line of lines) {
    if (line.startsWith('const ENTRIES')) { inside = true; continue; }
    if (!inside) continue;
    const t = line.trim();
    if (t === '};') break;
    if (!t.startsWith('"')) continue;
    const idx = t.lastIndexOf('":');
    if (idx < 0) continue;
    try { keys.add(JSON.parse(t.slice(0, idx + 1))); } catch { /* пропускаем битую строку */ }
  }
  return keys;
}

const LATIN = /[a-zA-Z]/;
const CYRILLIC = /[Ѐ-ӿ]/;

/** Годится ли строка в озвучку: латиница есть, кириллицы нет, длина разумная. */
function isSpeakableEnglish(value) {
  if (!value) return false;
  const s = String(value).trim();
  if (s.length === 0 || s.length > 200) return false;
  if (!LATIN.test(s)) return false;
  if (CYRILLIC.test(s)) return false;
  return true;
}

// Уроки в двух сборках: базовой и «испанской» (*_phrases_es.gen.ts — там L2=es,
// а английские варианты ответа лежат в тех же alternatives и тоже произносятся).
// зачем: первая версия скрипта сканировала только базовые файлы и пропустила
// 64 английские alternatives из es-сборки — их нашёл audit_phrase_audio_sync.
const LESSON_FILES = [
  'app/lesson_data_1_8.ts',
  'app/lesson_data_9_16.ts',
  'app/lesson_data_17_24.ts',
  'app/lesson_data_25_32.ts',
  'app/lesson_data_1_8_phrases_es.gen.ts',
  'app/lesson_data_9_16_phrases_es.gen.ts',
];

/** Словарь экрана «Слова урока»: записи вида { en: 'speak', ru: ..., pos: ... }. */
function collectVocabulary() {
  const file = path.join(ROOT, 'app', 'lesson_words.tsx');
  const src = fs.readFileSync(file, 'utf8');
  const re = /\ben:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const raw = m[1];
    let value;
    try {
      value = raw[0] === "'"
        ? raw.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\')
        : JSON.parse(raw);
    } catch { continue; }
    if (isSpeakableEnglish(value)) out.push({ text: value.trim(), source: 'word' });
  }
  return out;
}

/** Развернуть строковый литерал JS: и "двойные", и 'одинарные'. */
function parseJsStringLiteral(raw) {
  if (raw[0] === '"') return JSON.parse(raw);
  // зачем: сгенерированные *_phrases_es.gen.ts пишут alternatives в ОДИНАРНЫХ
  // кавычках. Первая версия ловила только двойные и молча теряла 64 фразы.
  const inner = raw.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"');
  return JSON.parse(`"${inner}"`);
}

/** `alternatives: [...]` — запасные формулировки ответа, они тоже произносятся. */
function collectAlternatives() {
  const out = [];
  for (const rel of LESSON_FILES) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    const re = /alternatives:\s*\[([^\]]*)\]/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const ire = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g;
      let im;
      while ((im = ire.exec(m[1])) !== null) {
        let value;
        try { value = parseJsStringLiteral(im[0]); } catch { continue; }
        if (isSpeakableEnglish(value)) out.push({ text: value.trim(), source: 'lesson' });
      }
    }
  }
  return out;
}

// ── сборка ──────────────────────────────────────────────────────────────────
const existing = readExistingKeys();
const candidates = [...collectVocabulary(), ...collectAlternatives()];

const seen = new Set();
const items = [];
for (const c of candidates) {
  const key = norm(c.text);
  if (existing.has(key) || seen.has(key)) continue;
  seen.add(key);
  // id стабилен по тексту: повторный прогон даёт тот же файл, а Storage
  // перезаписывает объект на месте — сирот не появляется.
  const id = `${c.source}_gap_${crypto.createHash('md5').update(key).digest('hex').slice(0, 12)}`;
  items.push({ id, source: c.source, text: c.text });
}

const bySource = {};
for (const it of items) bySource[it.source] = (bySource[it.source] || 0) + 1;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ items }, null, 1));

const chars = items.reduce((sum, it) => sum + it.text.length, 0);
console.log('клипов в текущей карте: ', existing.size);
console.log('кандидатов проверено:   ', candidates.length);
console.log('НЕ ОЗВУЧЕНО:            ', items.length, JSON.stringify(bySource));
console.log('символов на озвучку:    ', chars);
console.log('манифест:               ', path.relative(ROOT, OUT));
console.log('');
for (const it of items) console.log(`  ${it.source.padEnd(7)} ${JSON.stringify(it.text)}`);
