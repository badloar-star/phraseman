#!/usr/bin/env node
/*
 * Перенос авторского пула новых механик Пика (записи Кодекса `peak-expanded-author-v1`) в репозиторий.
 *
 * зачем (владелец 11.11.2026: «давай включай уже» → «Да, делай»): сервер не мог класть задания новых механик,
 * потому что сам пул лежал вне проекта. Скрипт читает папку автора ТОЛЬКО на чтение и кладёт в
 * content/spire-expanded/{lang}/tasks.jsonl узкую форму записи — без редакторских пометок (уровни, происхождение).
 * Оттуда файл попадает в бандл функций (functions/scripts/copy_generated_assets.js).
 *
 * Запуск:  node scripts/import_peak_expanded_pool.mjs "<папка authoring-continuation>"
 *
 * Правила отбора:
 *   - из каждой папки пакета берётся файл candidates-vN.json с наибольшим N;
 *   - пакет из expanded-repairs/{lang}-batch-NNN-vM заменяет одноимённый пакет из new-formats-v1;
 *   - запись без схемы, языка, id или с чужим языком пакета — отбрасывается, причина в выводе;
 *   - повтор id — отбрасывается (остаётся первая запись).
 * Языковую приёмку скрипт НЕ делает и не заменяет: статус записи автора сохраняется в манифесте как есть.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LANGS = ['en', 'es', 'de', 'fr', 'it'];
const SCHEMA = 'peak-expanded-author-v1';
const here = path.dirname(fileURLToPath(import.meta.url));
const outRoot = path.resolve(here, '..', 'content', 'spire-expanded');

const sourceRoot = process.argv[2];
if (!sourceRoot || !fs.existsSync(sourceRoot)) {
  console.error('[peak-expanded-import] не задана или не найдена папка автора (authoring-continuation)');
  process.exit(1);
}

function latestCandidatesFile(dir) {
  const files = fs.readdirSync(dir)
    .map((name) => ({ name, match: /^candidates-v(\d+)\.json$/u.exec(name) }))
    .filter((entry) => entry.match)
    .sort((a, b) => Number(b.match[1]) - Number(a.match[1]));
  return files.length > 0 ? path.join(dir, files[0].name) : null;
}

/** Ключ пакета «en-batch-003» из имени папки (у починок в имени есть хвост «-v2»). */
function batchKey(dirName) {
  const match = /^([a-z]{2})-batch-(\d{3})/u.exec(dirName);
  return match ? `${match[1]}-batch-${match[2]}` : null;
}

function collectBatches() {
  const batches = new Map();
  for (const group of ['new-formats-v1', 'expanded-repairs']) {
    const groupDir = path.join(sourceRoot, group);
    if (!fs.existsSync(groupDir)) continue;
    for (const dirName of fs.readdirSync(groupDir).sort()) {
      const key = batchKey(dirName);
      const dir = path.join(groupDir, dirName);
      if (!key || !fs.statSync(dir).isDirectory()) continue;
      const file = latestCandidatesFile(dir);
      if (!file) continue;
      // починка идёт второй группой и заменяет исходный пакет целиком
      batches.set(key, { key, file, group });
    }
  }
  return [...batches.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function narrowRecord(record) {
  const week = record?.level && typeof record.level.week === 'number' ? record.level.week : 1;
  return {
    schema: SCHEMA,
    candidateId: record.candidateId,
    studyTarget: record.studyTarget,
    format: record.format,
    level: { week },
    exercise: record.exercise,
    ui: record.ui,
    feedback: record.feedback,
  };
}

const byLang = new Map(LANGS.map((lang) => [lang, []]));
const seen = new Set();
const rejected = [];
const sources = [];
const statuses = {};

for (const batch of collectBatches()) {
  const lang = batch.key.slice(0, 2);
  if (!byLang.has(lang)) continue;
  const bytes = fs.readFileSync(batch.file);
  const parsed = JSON.parse(bytes.toString('utf8'));
  const records = Array.isArray(parsed) ? parsed : parsed.candidates;
  if (!Array.isArray(records)) {
    rejected.push({ batch: batch.key, reason: 'no_candidates_array' });
    continue;
  }
  let accepted = 0;
  for (const record of records) {
    const id = record?.candidateId;
    const reason = record?.schema !== SCHEMA ? 'schema'
      : typeof id !== 'string' || id.length === 0 ? 'candidate_id'
        : record.studyTarget !== lang ? 'study_target'
          : seen.has(id) ? 'duplicate_id'
            : null;
    if (reason) {
      rejected.push({ batch: batch.key, candidateId: typeof id === 'string' ? id : null, reason });
      continue;
    }
    seen.add(id);
    byLang.get(lang).push(narrowRecord(record));
    const status = typeof record.status === 'string' ? record.status : 'unknown';
    statuses[status] = (statuses[status] ?? 0) + 1;
    accepted += 1;
  }
  sources.push({
    batch: batch.key,
    group: batch.group,
    file: path.basename(batch.file),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    records: records.length,
    accepted,
  });
}

const langs = {};
for (const lang of LANGS) {
  const rows = byLang.get(lang).sort((a, b) => a.candidateId.localeCompare(b.candidateId));
  const dir = path.join(outRoot, lang);
  fs.mkdirSync(dir, { recursive: true });
  const text = rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length > 0 ? '\n' : '');
  fs.writeFileSync(path.join(dir, 'tasks.jsonl'), text);
  const formats = {};
  for (const row of rows) formats[row.format] = (formats[row.format] ?? 0) + 1;
  langs[lang] = { tasks: rows.length, sha256: createHash('sha256').update(text, 'utf8').digest('hex'), formats };
  console.log(`[peak-expanded-import] ${lang}: ${rows.length} заданий`);
}

const manifest = {
  schema: 'spire-expanded-pool-manifest-v1',
  authorSchema: SCHEMA,
  // зачем: честная пометка состояния пула — независимой языковой приёмки у этих записей нет, статус автора записан как есть
  authorStatuses: statuses,
  langs,
  sources,
  rejected,
};
fs.writeFileSync(path.join(outRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[peak-expanded-import] отброшено записей: ${rejected.length}; манифест: content/spire-expanded/manifest.json`);
