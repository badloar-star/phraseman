#!/usr/bin/env node
/**
 * Гейт «готов» (владелец 04.10: «СТРОЖАЙШЕ ЗАПРЕЩЕНО говорить сделано, пока я не получу сравнение КАЖДОГО экрана с макетом»).
 *
 * Сообщение «готово / сделано / готов к склейке» по экрану можно отправлять ТОЛЬКО если этот скрипт для его строк реестра вернул код 0:
 *  - у строки указан код экрана (code);
 *  - есть файл сравнения «эмулятор рядом с макетом» (evidence), он существует, его sha256 записан и совпадает;
 *  - снимок НОВЕЕ последнего изменения кода экрана (коммит или незакоммиченная правка).
 * Это не ревью координатора (его ставит координатор) — это запрет докладывать «готово» без снимка.
 *
 * Шрифты: при сверке главнее шкала 16/13 (D145); разница в кегле при соблюдённой шкале — не отличие (см. docs/phraseman-2.0/PORT_READY_GATE.md).
 *
 * Запуск: node scripts/port_ready_gate.mjs <id> [<id> ...]   (id строки реестра или префикс: cards-section-001)
 * Логи: [PORT-READY-GATE].
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = '[PORT-READY-GATE]';

function git(root, args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return r.status === 0 ? r.stdout : '';
}

export function lastChangeMs(root, rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return null;
  const committed = Number(git(root, ['log', '-1', '--format=%ct', '--', rel]).trim()) * 1000 || 0;
  const dirty = git(root, ['status', '--porcelain', '--', rel]).trim().length > 0;
  // зачем: файл вне git (или без коммитов) — берём время изменения файла, иначе правка кода не сделала бы снимок «старым»
  return Math.max(committed, dirty || committed === 0 ? fs.statSync(abs).mtimeMs : 0);
}

export function checkRows(root, registry, ids) {
  const violations = [];
  const rows = (registry.rows ?? []).filter((r) => ids.some((id) => r.id === id || r.id.startsWith(id)));
  if (rows.length === 0) violations.push({ id: ids.join(','), code: 'no_rows', detail: 'в реестре нет таких строк' });
  for (const row of rows) {
    const files = Array.isArray(row.code) ? row.code : [];
    if (files.length === 0) { violations.push({ id: row.id, code: 'code_unmapped', detail: 'не указан код экрана' }); continue; }
    let minAt = 0;
    for (const f of files) {
      const t = lastChangeMs(root, f);
      if (t === null) violations.push({ id: row.id, code: 'code_file_missing', detail: f });
      else minAt = Math.max(minAt, t);
    }
    const rel = row.evidence;
    if (!rel || typeof rel !== 'string') { violations.push({ id: row.id, code: 'evidence_missing', detail: 'нет сравнения «эмулятор рядом с макетом» — докладывать «готово» ЗАПРЕЩЕНО' }); continue; }
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) { violations.push({ id: row.id, code: 'evidence_file_missing', detail: rel }); continue; }
    const sha = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    if (!row.evidence_sha256 || row.evidence_sha256 !== sha) violations.push({ id: row.id, code: 'evidence_hash_mismatch', detail: rel });
    const at = Date.parse(row.evidence_at ?? '');
    if (!Number.isFinite(at)) violations.push({ id: row.id, code: 'evidence_time_missing', detail: 'нет evidence_at' });
    else if (at < minAt) violations.push({ id: row.id, code: 'evidence_stale', detail: `${rel}: снят ${row.evidence_at}, код экрана менялся позже (${new Date(minAt).toISOString()})` });
  }
  return { ok: violations.length === 0, rows: rows.length, violations };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (ids.length === 0) { console.error(`${LOG} укажи id строк реестра`); process.exit(2); }
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/phraseman-2.0/registries/visual_parity.json'), 'utf8'));
  const res = checkRows(ROOT, registry, ids);
  for (const v of res.violations) console.error(`${LOG} FAIL ${v.id} ${v.code}: ${v.detail}`);
  console.log(`${LOG} rows=${res.rows} ok=${res.ok} violations=${res.violations.length}`);
  process.exit(res.ok ? 0 : 1);
}
