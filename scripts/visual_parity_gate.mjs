#!/usr/bin/env node
/**
 * Релиз-гейт «приложение = макет» (CLAUDE.md «ГЕЙТ: ПРИЛОЖЕНИЕ = МАКЕТ», владелец 04.10).
 *
 * Читает docs/phraseman-2.0/registries/visual_parity.json и ПАДАЕТ (код 1), если:
 *  - хоть одна строка не match (pending / diff / no_mockup) — «хоть одно расхождение → релиз запрещён»;
 *  - у match нет ревью координатора (reviewed_by), нет привязки к коду, нет файла склейки или его хэш не совпадает с записанным;
 *  - склейка СТАРШЕ последнего изменения кода экрана (коммит файла или незакоммиченная правка) — экран менялся после сверки;
 *  - в макете есть анимация (или это неизвестно), а записи экрана anim_evidence нет / она устарела / хэш не совпадает;
 *  - в реестре нет строки для какой-то строки матрицы STATE_CHECKLIST;
 *  - строка no_release_surface («в стор-сборке экрана нет») без доказательства: маршрут не вырезан регуляркой
 *    стор-режима router.ctx.js ИЛИ флаг не выключен по умолчанию / нет теста-сторожа флага; без reviewed_by.
 * Самопроверка исполнителя не считается: статус match и reviewed_by выставляет координатор, этот гейт лишь проверяет следы.
 *
 * Запуск: node scripts/visual_parity_gate.mjs [--json] [--max-lines=40] [--registry=<путь>] [--root=<каталог>] [--no-matrix-check]
 * Логи: [PARITY-GATE]. Подключён в release:precheck и eas-build-post-install.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const LOG = '[PARITY-GATE]';
const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const sha256File = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** Время последнего изменения файла кода: коммит ИЛИ незакоммиченная правка (что позже). null — файла нет в дереве. */
export function lastCodeChangeMs(root, relativePath, runGit = defaultGit) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) return null;
  const committed = Number(runGit(root, ['log', '-1', '--format=%ct', '--', relativePath]).trim()) * 1000 || 0;
  const dirty = runGit(root, ['status', '--porcelain', '--', relativePath]).trim().length > 0;
  return Math.max(committed, dirty ? fs.statSync(absolute).mtimeMs : 0);
}

function defaultGit(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return result.status === 0 ? result.stdout : '';
}

function checkTrace(root, row, field, atField, shaField, minAtMs, violations, label) {
  const rel = row[field];
  if (!rel || typeof rel !== 'string') {
    violations.push({ id: row.id, code: `${label}_missing`, detail: `нет ${field}` });
    return;
  }
  const absolute = path.join(root, rel);
  if (!fs.existsSync(absolute)) {
    violations.push({ id: row.id, code: `${label}_file_missing`, detail: rel });
    return;
  }
  const recordedSha = row[shaField];
  if (!recordedSha || sha256File(absolute) !== recordedSha) {
    violations.push({ id: row.id, code: `${label}_hash_mismatch`, detail: `${rel}: записанный хэш не совпадает с файлом (подмена или не записан)` });
  }
  const at = Date.parse(row[atField] ?? '');
  if (!Number.isFinite(at)) {
    violations.push({ id: row.id, code: `${label}_time_missing`, detail: `нет ${atField}` });
  } else if (minAtMs !== null && at < minAtMs) {
    violations.push({ id: row.id, code: `${label}_stale`, detail: `${rel}: снято ${row[atField]}, код экрана менялся позже (${new Date(minAtMs).toISOString()})` });
  }
}

/**
 * Журнал сверки (SVERKA_LOG.md): строки таблицы `| id | склейка | что на макете | что в приложении | файл кода |`.
 * Возвращает id, у которых в журнале записано расхождение (обе колонки заполнены и не «совпадает»).
 *
 * зачем (владелец 04.10, дыра в гейте): сверка писала отличия в журнал, а в реестре у строки оставалось diffs: [] — гейт ничего не видел.
 */
export function parseSverkaOpenDiffs(text) {
  const open = new Map();
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const match = /^\|\s*([a-z0-9-]+-\d{3})\s*\|(.*)\|\s*$/.exec(line);
    if (!match) continue;
    const cols = match[2].split('|').map((c) => c.trim());
    const mockup = cols[1] ?? '';
    const app = cols[2] ?? '';
    if (!mockup || !app || /^(—|-|нет|совпада)/i.test(app) || /^(—|-|нет)$/i.test(mockup)) continue;
    open.set(match[1], { mockup, app });
  }
  return open;
}

/**
 * зачем (координатор 05.10, обход реестра «строка с отличиями никогда не match»): журнал сверки пишут не только таблицей `| id | макет | приложение |`,
 * но и заголовками `### learn-016/017/018 · … — НЕ СОВПАДАЕТ` (и «отличия:»/«остались:»). Такие записи таблицей не ловились — гейт их «не видел».
 * Читаем заголовки: id (в том числе сокращение `learn-016/017/018`), открытое отличие = НЕ СОВПАДАЕТ / «отличия» / «остались» без слова ИСПРАВЛЕНО;
 * более поздний заголовок того же id с ИСПРАВЛЕНО (и без НЕ СОВПАДАЕТ) отличие закрывает.
 */
export function parseSverkaHeadingDiffs(text) {
  const open = new Map();
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const match = /^###\s+([a-z0-9-]+-\d{3}(?:\/\d{3})*)\b\s*·?\s*(.*)$/.exec(line);
    if (!match) continue;
    const parts = match[1].split('/');
    const prefix = parts[0].replace(/\d{3}$/, '');
    const ids = parts.map((part, index) => (index === 0 ? part : `${prefix}${part}`));
    const title = match[2];
    const fixed = /ИСПРАВЛЕНО/i.test(title) && !/НЕ СОВПАДАЕТ/i.test(title);
    const opened = /НЕ СОВПАДАЕТ|отличия|остались/i.test(title);
    for (const id of ids) {
      if (fixed) open.delete(id);
      else if (opened) open.set(id, { mockup: 'заголовок журнала', app: title.slice(0, 120) });
    }
  }
  return open;
}

/**
 * Регулярка маршрутов СТОР-сборки из router.ctx.js (первая ветка `EXPO_PUBLIC_STORE_RELEASE === '1'`).
 *
 * зачем (координатор 10.10 23:00): 105 строк реестра (Learning V2 и Шпиль) в стор-сборке недостижимы. Им нужен
 * законный не-красный статус, но только с доказательством, которое гейт проверяет сам, а не верит на слово.
 */
export function storeRouteRegex(root) {
  const file = path.join(root, 'router.ctx.js');
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const storeBranch = text.slice(text.indexOf("=== '1'"), text.indexOf(': require.context('));
  const literal = /\n\s*\/(\^[\s\S]*?)\/,\s*\n/.exec(storeBranch);
  if (!literal) return null;
  try {
    return new RegExp(literal[1]);
  } catch {
    console.warn(`${LOG} router.ctx.js: регулярка стор-режима не разбирается — no_release_surface по маршрутам не доказать`);
    return null;
  }
}

/** Маршрут (путь от корня проекта, `app/...tsx`) вырезан из стор-сборки, если регулярка стор-режима его НЕ берёт. */
export function isRouteExcludedInStore(regex, routeFile) {
  if (!regex || typeof routeFile !== 'string' || !/^app\/.+\.tsx$/.test(routeFile)) return false;
  return !regex.test(`./${routeFile.slice('app/'.length)}`);
}

/**
 * Доказательство строки no_release_surface (поле release_surface_proof):
 *  - { kind: 'store_route_excluded', routes: ['app/...tsx', ...] } — каждый маршрут существует и вырезан в стор-режиме;
 *  - { kind: 'flag_off', flag, flag_source, guard_test } — flag_source требует явного `=== true` для этого флага
 *    (по умолчанию выключен), а тест-сторож существует и упоминает флаг.
 */
export function releaseSurfaceViolations(root, row, regex) {
  const out = [];
  const proof = row.release_surface_proof;
  if (!row.reviewed_by) out.push({ id: row.id, code: 'review_missing', detail: 'no_release_surface без reviewed_by' });
  if (!proof || typeof proof !== 'object') {
    out.push({ id: row.id, code: 'release_surface_proof_missing', detail: 'no_release_surface без release_surface_proof' });
    return out;
  }
  if (proof.kind === 'store_route_excluded') {
    const routes = Array.isArray(proof.routes) ? proof.routes : [];
    if (routes.length === 0) out.push({ id: row.id, code: 'release_surface_routes_missing', detail: 'нет routes' });
    for (const route of routes) {
      if (!fs.existsSync(path.join(root, route))) out.push({ id: row.id, code: 'release_surface_route_missing', detail: route });
      else if (!isRouteExcludedInStore(regex, route)) {
        out.push({ id: row.id, code: 'release_surface_route_reachable', detail: `${route} не вырезан регуляркой стор-режима router.ctx.js` });
      }
    }
    return out;
  }
  if (proof.kind === 'flag_off') {
    const flag = typeof proof.flag === 'string' ? proof.flag : '';
    const source = typeof proof.flag_source === 'string' ? path.join(root, proof.flag_source) : '';
    const guard = typeof proof.guard_test === 'string' ? path.join(root, proof.guard_test) : '';
    const sourceText = source && fs.existsSync(source) ? fs.readFileSync(source, 'utf8') : '';
    const guardText = guard && fs.existsSync(guard) ? fs.readFileSync(guard, 'utf8') : '';
    if (!flag || !sourceText.includes(`'${flag}'`)) {
      out.push({ id: row.id, code: 'release_surface_flag_unknown', detail: `${flag || '(пусто)'} не найден в ${proof.flag_source ?? '(нет flag_source)'}` });
    } else if (!/===\s*true/.test(sourceText)) {
      out.push({ id: row.id, code: 'release_surface_flag_not_default_off', detail: `${proof.flag_source}: флаг не требует явного === true` });
    }
    if (!guardText) out.push({ id: row.id, code: 'release_surface_guard_missing', detail: proof.guard_test ?? '(нет guard_test)' });
    else if (flag && !guardText.includes(flag)) {
      out.push({ id: row.id, code: 'release_surface_guard_unrelated', detail: `${proof.guard_test} не упоминает ${flag}` });
    }
    return out;
  }
  out.push({ id: row.id, code: 'release_surface_proof_kind_unknown', detail: String(proof.kind) });
  return out;
}

export function evaluateRegistry(root, registry, options = {}) {
  const violations = [];
  const runGit = options.runGit ?? defaultGit;
  const rows = Array.isArray(registry?.rows) ? registry.rows : [];
  if (rows.length === 0) violations.push({ id: '*', code: 'registry_empty', detail: 'в реестре нет строк' });
  const sverkaOpen = options.sverkaOpenDiffs ?? new Map();
  const counts = { total: rows.length, match: 0, pending: 0, diff: 0, no_mockup: 0, removed_by_owner: 0, no_release_surface: 0, other: 0 };
  const storeRegex = options.storeRouteRegex !== undefined ? options.storeRouteRegex : storeRouteRegex(root);
  for (const row of rows) {
    if (row.status in counts) counts[row.status] += 1;
    else counts.other += 1;
    // зачем (координатор 04.10): экран удалён владельцем — это не расхождение и не pending, но причина обязательна.
    if (row.status === 'removed_by_owner') {
      if (!row.removed_reason) violations.push({ id: row.id, code: 'removed_reason_missing', detail: 'removed_by_owner без removed_reason' });
      continue;
    }
    // зачем (координатор 10.10 23:00): экрана нет в стор-сборке — не расхождение, но только с проверяемым доказательством.
    if (row.status === 'no_release_surface') {
      violations.push(...releaseSurfaceViolations(root, row, storeRegex));
      continue;
    }
    // зачем (владелец 04.10): отличие, записанное в журнале сверки, обязано быть в diffs строки реестра — иначе гейт его «не видит».
    // Исключение — строка match с ревью координатора ПОСЛЕ последней склейки (координатор оценил отличие и принял).
    const logged = sverkaOpen.get(row.id);
    if (logged && (!Array.isArray(row.diffs) || row.diffs.length === 0)) {
      const reviewedAfterEvidence = row.status === 'match' && !!row.reviewed_by
        && Date.parse(row.reviewed_at ?? '') >= Date.parse(row.evidence_at ?? '');
      if (!reviewedAfterEvidence) {
        violations.push({ id: row.id, code: 'sverka_diff_not_in_registry', detail: `журнал сверки: «${logged.mockup}» ≠ «${logged.app}», а diffs пуст` });
      }
    }
    if (row.status !== 'match') {
      violations.push({ id: row.id, code: `status_${row.status}`, detail: `${row.screen} / ${row.state}` });
      continue;
    }
    if (!row.reviewed_by) violations.push({ id: row.id, code: 'review_missing', detail: 'нет reviewed_by (ревью координатора)' });
    if (!Array.isArray(row.diffs) || row.diffs.length > 0) violations.push({ id: row.id, code: 'diffs_not_empty', detail: 'у match список diffs должен быть пустым' });
    const files = Array.isArray(row.code) ? row.code : [];
    if (files.length === 0) violations.push({ id: row.id, code: 'code_unmapped', detail: 'не указан экран/компонент в коде' });
    let minAtMs = null;
    for (const file of files) {
      const changed = lastCodeChangeMs(root, file, runGit);
      if (changed === null) violations.push({ id: row.id, code: 'code_file_missing', detail: file });
      else minAtMs = Math.max(minAtMs ?? 0, changed);
    }
    checkTrace(root, row, 'evidence', 'evidence_at', 'evidence_sha256', minAtMs, violations, 'evidence');
    if (row.has_animation === true) {
      checkTrace(root, row, 'anim_evidence', 'anim_evidence_at', 'anim_evidence_sha256', minAtMs, violations, 'anim_evidence');
    } else if (row.has_animation !== false) {
      violations.push({ id: row.id, code: 'animation_unknown', detail: 'неизвестно, есть ли анимация в макете (has_animation должно быть true/false)' });
    }
  }
  return { ok: violations.length === 0, counts, violations };
}

/** Каждая строка матрицы обязана иметь строку реестра (иначе экран можно «потерять» из проверки). */
export function missingMatrixRows(registry, matrixRows) {
  const pad = (n) => String(n).padStart(3, '0');
  const ids = new Set((registry?.rows ?? []).map((row) => row.id));
  return matrixRows
    .map((row) => ({ id: `${row.section.replace(/\.html$/, '')}-${pad(row.n)}`, row }))
    .filter((entry) => !ids.has(entry.id))
    .map((entry) => ({ id: entry.id, code: 'matrix_row_missing', detail: `${entry.row.screen} / ${entry.row.state}` }));
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name) => args.includes(name);
  const value = (name, fallback) => (args.find((a) => a.startsWith(`${name}=`)) ?? `${name}=${fallback}`).slice(name.length + 1);
  const root = path.resolve(value('--root', SCRIPT_ROOT));
  const registryPath = path.resolve(root, value('--registry', 'docs/phraseman-2.0/registries/visual_parity.json'));
  const maxLines = Number(value('--max-lines', '40'));

  if (!fs.existsSync(registryPath)) {
    console.error(`${LOG} ОТКАЗ: нет реестра ${registryPath} — релиз запрещён (npm run parity:build)`);
    return 1;
  }
  let registry;
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch (error) {
    console.error(`${LOG} ОТКАЗ: реестр не читается: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  const logPath = path.join(root, 'docs/phraseman-2.0/evidence/parity/SVERKA_LOG.md');
  const sverkaLogText = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
  const sverkaOpenDiffs = new Map([...parseSverkaHeadingDiffs(sverkaLogText), ...parseSverkaOpenDiffs(sverkaLogText)]);
  const result = evaluateRegistry(root, registry, { sverkaOpenDiffs });
  if (!flag('--no-matrix-check')) {
    const matrixPath = path.join(root, registry.matrix ?? 'docs/phraseman-2.0/evidence/STATE_CHECKLIST_2026-09-30.md');
    if (fs.existsSync(matrixPath)) {
      const { parseMatrix } = await import('./visual_parity_build.mjs');
      const missing = missingMatrixRows(registry, parseMatrix(fs.readFileSync(matrixPath, 'utf8')));
      result.violations.push(...missing);
      result.ok = result.violations.length === 0;
    } else {
      console.warn(`${LOG} WARNING: матрица ${matrixPath} не найдена — сверка покрытия пропущена`);
    }
  }
  if (flag('--json')) {
    console.log(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 1;
  }
  const { counts } = result;
  console.log(`${LOG} строк=${counts.total} match=${counts.match} pending=${counts.pending} diff=${counts.diff} no_mockup=${counts.no_mockup} no_release_surface=${counts.no_release_surface} нарушений=${result.violations.length}`);
  if (result.ok) {
    console.log(`${LOG} OK: приложение = макет по всем строкам реестра`);
    return 0;
  }
  console.error(`${LOG} ОТКАЗ: релиз запрещён (CLAUDE.md «ГЕЙТ: ПРИЛОЖЕНИЕ = МАКЕТ»). Хоть одно расхождение или несверенный экран.`);
  const byCode = {};
  for (const violation of result.violations) byCode[violation.code] = (byCode[violation.code] ?? 0) + 1;
  console.error(`${LOG} по причинам: ${Object.entries(byCode).map(([code, n]) => `${code}=${n}`).join(' ')}`);
  for (const violation of result.violations.slice(0, maxLines)) console.error(`${LOG}   ${violation.id} · ${violation.code} · ${violation.detail}`);
  if (result.violations.length > maxLines) console.error(`${LOG}   … и ещё ${result.violations.length - maxLines} (--max-lines=N или --json)`);
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code), (error) => {
    console.error(`${LOG} FAILED reason=${error instanceof Error ? error.stack : String(error)}`);
    process.exit(1);
  });
}
