// Гейт «приложение = макет» (CLAUDE.md, владелец 04.10): scripts/visual_parity_gate.mjs, реестр visual_parity.json и помощник parity_shot.mjs.
// зачем: гейт должен реально ПАДАТЬ на каждом способе обойти сверку (нет ревью, нет склейки, подмена файла, устаревшая склейка, нет записи анимации),
// а реестр — покрывать все строки матрицы. Запуск: node --test tests/visual_parity_gate.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evaluateRegistry, isRouteExcludedInStore, missingMatrixRows, parseSverkaHeadingDiffs, parseSverkaOpenDiffs, storeRouteRegex } from '../scripts/visual_parity_gate.mjs';
import { buildRows, parseMatrix } from '../scripts/visual_parity_build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REAL_REGISTRY = path.join(ROOT, 'docs/phraseman-2.0/registries/visual_parity.json');
const MINUTE = 60_000;
const T0 = Date.parse('2026-10-04T10:00:00Z');

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-gate-'));
  fs.mkdirSync(path.join(dir, 'app'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'app/screen.tsx'), 'export default 1;\n');
  fs.writeFileSync(path.join(dir, 'evidence.png'), 'png-bytes');
  fs.writeFileSync(path.join(dir, 'anim.mp4'), 'mp4-bytes');
  return dir;
}
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
// git подменён: «коммит файла кода» = CODE_COMMIT_MS, рабочее дерево чистое.
const fakeGit = (codeCommitMs) => (_root, args) => (args[0] === 'log' ? `${Math.floor(codeCommitMs / 1000)}\n` : '');
function matchRow(over = {}) {
  const merged = {
    id: 'demo-001', screen: 'Экран', state: 'Состояние', status: 'match', reviewed_by: 'coordinator', diffs: [], code: ['app/screen.tsx'],
    has_animation: false, evidence: 'evidence.png', evidence_at: new Date(T0 + 10 * MINUTE).toISOString(), evidence_sha256: sha('png-bytes'),
    anim_evidence: null, ...over,
  };
  // зачем (координатор 13.10): свежесть кадра считается по явному shot_at (время съёмки голого кадра) + shot_at_source; по умолчанию = evidence_at
  return { shot_at: merged.evidence_at, shot_at_source: 'shoot_log', ...merged };
}
const run = (dir, rows, commitMs = T0) => evaluateRegistry(dir, { rows }, { runGit: fakeGit(commitMs) });
const codes = (result) => result.violations.map((v) => v.code);

test('чистая строка match со склейкой, ревью и свежестью проходит', () => {
  const result = run(sandbox(), [matchRow()]);
  assert.equal(result.ok, true, JSON.stringify(result.violations));
  assert.equal(result.counts.match, 1);
});

test('pending / diff / no_mockup валят гейт', () => {
  for (const status of ['pending', 'diff', 'no_mockup']) {
    const result = run(sandbox(), [matchRow({ status })]);
    assert.equal(result.ok, false);
    assert.deepEqual(codes(result), [`status_${status}`]);
  }
});

test('пустой реестр валит гейт', () => {
  assert.deepEqual(codes(run(sandbox(), [])), ['registry_empty']);
});

test('match без ревью координатора, с непустыми diffs или без привязки к коду — отказ', () => {
  assert.ok(codes(run(sandbox(), [matchRow({ reviewed_by: null })])).includes('review_missing'));
  assert.ok(codes(run(sandbox(), [matchRow({ diffs: ['отступ 4px'] })])).includes('diffs_not_empty'));
  assert.ok(codes(run(sandbox(), [matchRow({ code: [] })])).includes('code_unmapped'));
  assert.ok(codes(run(sandbox(), [matchRow({ code: ['app/ghost.tsx'] })])).includes('code_file_missing'));
});

test('нет файла склейки, подмена файла (хэш) и отсутствие времени — отказ', () => {
  assert.ok(codes(run(sandbox(), [matchRow({ evidence: null })])).includes('evidence_missing'));
  assert.ok(codes(run(sandbox(), [matchRow({ evidence: 'nope.png' })])).includes('evidence_file_missing'));
  assert.ok(codes(run(sandbox(), [matchRow({ evidence_sha256: sha('другое') })])).includes('evidence_hash_mismatch'));
  assert.ok(codes(run(sandbox(), [matchRow({ evidence_at: null })])).includes('evidence_time_missing'));
});

test('склейка старше последнего изменения кода — отказ (экран менялся после сверки)', () => {
  const dir = sandbox();
  const result = run(dir, [matchRow()], T0 + 30 * MINUTE);
  assert.ok(codes(result).includes('evidence_stale'), JSON.stringify(result.violations));
});

test('незакоммиченная правка кода тоже делает склейку устаревшей', () => {
  const dir = sandbox();
  const dirtyGit = (_root, args) => (args[0] === 'log' ? `${Math.floor(T0 / 1000)}\n` : ' M app/screen.tsx\n');
  const future = new Date(Date.now() + 5 * MINUTE);
  fs.utimesSync(path.join(dir, 'app/screen.tsx'), future, future);
  const result = evaluateRegistry(dir, { rows: [matchRow({ evidence_at: new Date(Date.now()).toISOString() })] }, { runGit: dirtyGit });
  assert.ok(codes(result).includes('evidence_stale'), JSON.stringify(result.violations));
});

test('анимация в макете: нужна запись экрана, она должна быть свежей и с верным хэшем; «неизвестно» тоже отказ', () => {
  const dir = sandbox();
  const animated = { has_animation: true };
  assert.ok(codes(run(dir, [matchRow(animated)])).includes('anim_evidence_missing'));
  const withAnim = { ...animated, anim_evidence: 'anim.mp4', anim_evidence_at: new Date(T0 + 10 * MINUTE).toISOString(), anim_evidence_sha256: sha('mp4-bytes') };
  assert.equal(run(dir, [matchRow(withAnim)]).ok, true);
  assert.ok(codes(run(dir, [matchRow({ ...withAnim, anim_evidence_sha256: sha('x') })])).includes('anim_evidence_hash_mismatch'));
  assert.ok(codes(run(dir, [matchRow(withAnim)], T0 + 30 * MINUTE)).includes('anim_evidence_stale'));
  assert.ok(codes(run(dir, [matchRow({ has_animation: null })])).includes('animation_unknown'));
});

test('строка матрицы без строки в реестре обнаруживается', () => {
  const matrixRows = parseMatrix('## demo.html\n| 1 | Экран | Состояние | ✅ | `app/screen.tsx` |\n| 2 | Экран | Другое | ➖ | — |\n');
  assert.equal(matrixRows.length, 2);
  const missing = missingMatrixRows({ rows: [{ id: 'demo-001' }] }, matrixRows);
  assert.deepEqual(missing.map((m) => m.id), ['demo-002']);
});

// ── реальный реестр ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const registry = JSON.parse(fs.readFileSync(REAL_REGISTRY, 'utf8'));
const matrixText = fs.readFileSync(path.join(ROOT, registry.matrix), 'utf8');

test('реестр: уникальные id, допустимые статусы, все строки матрицы покрыты, плюс макеты 04.10', () => {
  const ids = registry.rows.map((row) => row.id);
  assert.equal(new Set(ids).size, ids.length, 'id повторяются');
  for (const row of registry.rows) assert.ok(registry.statuses.includes(row.status), `${row.id}: статус ${row.status}`);
  assert.deepEqual(missingMatrixRows(registry, parseMatrix(matrixText)), []);
  assert.ok(registry.rows.filter((row) => row.source === 'STATE_CHECKLIST').length >= 758);
  // зачем (владелец 04.10, «новый макет = эталон»): эталон «Моих ошибок» — mistakes-panel (MISTAKES_LOCKED); строки mistakes-v2 ушли законно (66bb7b933).
  assert.equal(registry.rows.filter((row) => row.id.startsWith('mistakes-v2-')).length, 0);
  // 11.10: 21 телефон макета mistakes-panel.html — после перепривязки 014–020 по подписям телефон 14 «Меню задания» получил строку 021.
  assert.equal(registry.rows.filter((row) => row.id.startsWith('mistakes-panel-')).length, 21);
  assert.equal(registry.rows.filter((row) => row.id.startsWith('themes-gradient-')).length, 3);
  // зачем: Карточки перешли на утверждённый макет cards-section (de6a828f8); cards-v2 из реестра ушли законно.
  assert.equal(registry.rows.filter((row) => row.id.startsWith('cards-section-')).length, 57, 'макет cards-section (04.10) должен быть в реестре');
});

test('реестр: строки без макета в папке — no_mockup, остальные стартуют pending, ни одной «ранней» match без ревью', () => {
  for (const row of registry.rows) {
    if (row.status === 'match') {
      assert.ok(row.reviewed_by, `${row.id}: match без reviewed_by`);
      continue;
    }
    if (row.status === 'blocked') {
      assert.ok(row.blocked_reason, `${row.id}: blocked без причины`);
      continue;
    }
    // зачем (координатор 05:50): статус «экрана нет в стор-сборке» (91924d5b0) ставит человек с проверяемым
    // доказательством (раньше проверки закрепления: learning-v2-003 закреплена и снята с релиза) — сторож реестра его не знал и падал на всех 105 таких строках.
    if (row.status === 'no_release_surface') {
      assert.ok(row.release_surface_proof && row.release_surface_proof.kind, `${row.id}: no_release_surface без доказательства`);
      assert.ok(row.reviewed_by, `${row.id}: no_release_surface без reviewed_by`);
      continue;
    }
    // зачем (координатор 11.10: синхронизация гейта с отметками Сверки): Сверка ставит diff — склейка снята и записан непустой список отличий.
    // Это НЕ «ранняя match» (гейт такую строку не пропускает: status_diff), поэтому реестр с diff — норма, но без списка отличий — нет.
    if (row.status === 'diff') {
      assert.ok(Array.isArray(row.diffs) && row.diffs.length > 0, `${row.id}: diff без списка отличий`);
      continue;
    }
    // зачем (координатор 12.10, Макеты 70a32e6df): строку, снятую владельцем, проверяем РАНЬШЕ закрепления макета — иначе законно
    // снятая закреплённая строка (cards-001, п.55) падала как «не pending». Причина снятия по-прежнему обязательна.
    if (row.status === 'removed_by_owner') {
      assert.ok(row.removed_reason, `${row.id}: removed_by_owner без причины`);
      continue;
    }
    if (row.mockup_pinned) {
      assert.equal(row.status, 'pending', `${row.id}: переведённая строка стартует pending`);
      continue;
    }
    assert.equal(row.status, row.mockup.file ? 'pending' : 'no_mockup', `${row.id}: статус ${row.status} при макете ${row.mockup.file}`);
  }
});

test('счётчики гейта: blocked считается отдельно, сумма строк сходится', () => {
  const rows = [
    { id: 'a-001', status: 'blocked', blocked_reason: 'x', screen: 'S', state: 'T', mockup: { file: 'f' }, code: [], diffs: [] },
    { id: 'a-002', status: 'pending', screen: 'S', state: 'T', mockup: { file: 'f' }, code: [], diffs: [] },
    { id: 'a-003', status: 'diff', screen: 'S', state: 'T', mockup: { file: 'f' }, code: [], diffs: ['d'] },
  ];
  const { counts } = evaluateRegistry(process.cwd(), { rows }, { sverkaOpenDiffs: new Map(), runGit: () => null, storeRouteRegex: null });
  assert.equal(counts.blocked, 1);
  assert.equal(counts.other, 0);
  assert.equal(counts.blocked + counts.pending + counts.diff + counts.match + counts.no_mockup + counts.removed_by_owner + counts.no_release_surface + counts.other, counts.total);
});

// зачем (координатор 05:50): `npm run parity:build` пересобирает реестр из матрицы — ручные решения человека
// (статус, доказательство, причина удаления, кто проверил, закреплённый макет, причина блокировки) обязаны пережить
// пересборку, иначе она молча стирает работу координатора.
test('пересборка реестра сохраняет ручные статусы и поля', () => {
  const manual = {
    no_release_surface: {
      status: 'no_release_surface',
      release_surface_proof: { kind: 'store_route_excluded', routes: ['/learning_v2_session'] },
      reviewed_by: 'coordinator',
      reviewed_at: '2026-10-11T05:00:00.000Z',
    },
    removed_by_owner: { status: 'removed_by_owner', removed_reason: 'D136', reviewed_by: 'owner' },
    blocked: { status: 'blocked', blocked_reason: 'ждёт cards-states' },
  };
  const scan = { practice: [{ n: 1, label: 'Сессия', animations: [], replay: false }] };
  const matrix = [{ section: 'practice.html', n: 1, screen: 'Сессия', state: 'Сессия', files: ['app/x.tsx'], matrixStatus: null }];
  for (const [status, fields] of Object.entries(manual)) {
    const pinned = { file: 'docs/design/v2-app/other.html', phone: 3, label: 'X', mapping: 'pinned' };
    const old = { id: 'practice-001', mockup: pinned, mockup_pinned: 'owner-2026-10-04', ...fields };
    const [row] = buildRows(matrix, scan, [old]);
    for (const [key, value] of Object.entries(fields)) assert.deepEqual(row[key], value, `${status}: поле ${key} стёрто пересборкой`);
    assert.deepEqual(row.mockup, pinned, `${status}: закреплённый макет стёрт`);
    assert.equal(row.mockup_pinned, 'owner-2026-10-04', `${status}: mockup_pinned стёрт`);
  }
});

test('реестр: у каждой строки есть поля гейта', () => {
  for (const row of registry.rows) {
    for (const key of ['id', 'mockup', 'screen', 'state', 'code', 'evidence', 'anim_evidence', 'diffs', 'status', 'has_animation', 'anim_notes']) {
      assert.ok(key in row, `${row.id}: нет поля ${key}`);
    }
    assert.ok(Array.isArray(row.diffs) && Array.isArray(row.code) && Array.isArray(row.anim_notes));
  }
});

test('CLI: боевой реестр (все pending) → код 1; синтетический чистый реестр → код 0', () => {
  const real = spawnSync(process.execPath, [path.join(ROOT, 'scripts/visual_parity_gate.mjs'), '--max-lines=2'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(real.status, 1, real.stdout + real.stderr);
  assert.match(real.stderr, /релиз запрещён/);
  const dir = sandbox();
  fs.writeFileSync(path.join(dir, 'reg.json'), JSON.stringify({ rows: [matchRow({ evidence_at: new Date(Date.now() + MINUTE).toISOString() })] }));
  const git = (args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  git(['init', '-q']);
  git(['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A']);
  git(['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'init']);
  const clean = spawnSync(process.execPath, [path.join(ROOT, 'scripts/visual_parity_gate.mjs'), `--root=${dir}`, '--registry=reg.json', '--no-matrix-check'], { encoding: 'utf8' });
  assert.equal(clean.status, 0, clean.stdout + clean.stderr);
  assert.match(clean.stdout, /OK/);
});

test('подключение: гейт в release:precheck (локально), НЕ в eas-build-post-install', () => {
  // зачем (координатор 11.10 03:05, вариант а): на сервере EAS нет docs/ (.easignore) — реестра и склеек там нет,
  // честно пройти гейт нельзя. Сверка макетов — перед сборкой на машине владельца: npm run release:precheck.
  const precheck = fs.readFileSync(path.join(ROOT, 'scripts/release_precheck.mjs'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.ok(precheck.includes('scripts/visual_parity_gate.mjs'));
  assert.ok(!pkg.scripts['eas-build-post-install'].includes('visual_parity_gate'));
  assert.ok(pkg.scripts['parity:gate'] && pkg.scripts['parity:build'] && pkg.scripts['parity:shot']);
});

// ── помощник parity_shot (нужен сервер макетов и playwright; без них тест пропускается) ───────────────────────────────────────────────────
const serverUp = await fetch('http://127.0.0.1:8765/dialogs.html').then((r) => r.ok).catch(() => false);
test('parity_shot: склейка «макет | кадр устройства» пишет файл и след в реестр, но НЕ ставит match', { skip: !serverUp && 'сервер макетов 8765 недоступен' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-shot-'));
  const reg = path.join(dir, 'reg.json');
  fs.writeFileSync(reg, JSON.stringify({ rows: [{ id: 'themes-gradient-001', mockup: { file: 'docs/design/v2-app/themes-gradient.html', phone: 1, label: 'Карточки', mapping: 'by_construction' }, screen: 'Карточки', state: 'Карточки', status: 'pending', has_animation: false, anim_notes: [], evidence: null }] }));
  const fake = path.join(dir, 'device.png');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(fake, Buffer.concat([png, Buffer.alloc(2000)]));
  const env = { ...process.env, PARITY_REGISTRY: reg, PARITY_EVIDENCE_DIR: path.join(dir, 'ev'), PARITY_FAKE_DEVICE_PNG: fake };
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/parity_shot.mjs'), 'shot', 'themes-gradient-001'], { env, encoding: 'utf8', timeout: 120_000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const row = JSON.parse(fs.readFileSync(reg, 'utf8')).rows[0];
  assert.equal(row.status, 'pending');
  assert.equal(row.evidence, 'ev/themes-gradient-001.png');
  assert.ok(fs.existsSync(path.join(dir, row.evidence)));
  assert.equal(row.evidence_sha256, sha(fs.readFileSync(path.join(dir, row.evidence))));
  assert.ok(Number.isFinite(Date.parse(row.evidence_at)));
});

// зачем (владелец 04.10, дыра гейта): отличия из журнала сверки обязаны попадать в diffs реестра.
test('журнал сверки: расхождение есть, а diffs пуст — отказ; с diffs или ревью после склейки — проходит', () => {
  const log = ['| id | склейка | что на макете | что в приложении | файл кода |', '|---|---|---|---|---|', '| demo-001 | demo.png | кнопка круглая | кнопка квадратная | app/screen.tsx |', '| demo-002 | demo2.png | всё | совпадает | app/screen.tsx |'].join(String.fromCharCode(10));
  const open = parseSverkaOpenDiffs(log);
  assert.deepEqual([...open.keys()], ['demo-001']);
  const dir = sandbox();
  const bad = evaluateRegistry(dir, { rows: [matchRow()] }, { runGit: fakeGit(T0), sverkaOpenDiffs: open });
  assert.ok(codes(bad).includes('sverka_diff_not_in_registry'));
  const withDiffs = evaluateRegistry(dir, { rows: [matchRow({ diffs: ['кнопка квадратная'] })] }, { runGit: fakeGit(T0), sverkaOpenDiffs: open });
  assert.ok(!codes(withDiffs).includes('sverka_diff_not_in_registry'));
  const reviewed = evaluateRegistry(dir, { rows: [matchRow({ reviewed_at: new Date(T0 + 20 * MINUTE).toISOString() })] }, { runGit: fakeGit(T0), sverkaOpenDiffs: open });
  assert.ok(!codes(reviewed).includes('sverka_diff_not_in_registry'));
});

test('склейка без ревью и match с непустыми diffs не проходят', () => {
  assert.ok(codes(run(sandbox(), [matchRow({ reviewed_by: null })])).includes('review_missing'));
  assert.ok(codes(run(sandbox(), [matchRow({ diffs: ['x'] })])).includes('diffs_not_empty'));
});

// зачем (координатор 05.10): отличия, записанные в журнале сверки ЗАГОЛОВКОМ (`### id · … — НЕ СОВПАДАЕТ`, «отличия:», «остались:»), а не таблицей,
// раньше гейт не видел. Теперь они открыты, пока более поздний заголовок того же id не скажет ИСПРАВЛЕНО.
test('заголовки журнала: НЕ СОВПАДАЕТ открывает отличие, сокращение 016/017/018 раскрывается, ИСПРАВЛЕНО закрывает', () => {
  const log = [
    '### learn-016/017/018 · «Смешать темы» — НЕ СОВПАДАЕТ',
    '### learn-004 · Поиск — ничего не нашлось — НЕ СОВПАДАЕТ',
    '### mistakes-panel-004 · Перед отработкой — раскладка СОВПАДАЕТ; отличия вида:',
    '### profile-002 · Настройки — СОВПАДАЕТ',
    '### learn-004 · Ничего не нашлось — ИСПРАВЛЕНО: убрана лишняя строка',
  ].join('\n');
  const open = parseSverkaHeadingDiffs(log);
  assert.deepEqual([...open.keys()].sort(), ['learn-016', 'learn-017', 'learn-018', 'mistakes-panel-004']);
  assert.ok(!open.has('learn-004'), 'более поздний ИСПРАВЛЕНО закрыл отличие');
  assert.ok(!open.has('profile-002'), 'просто СОВПАДАЕТ отличием не является');
});

test('строка с отличием в заголовке журнала и пустым diffs не проходит гейт', () => {
  const open = parseSverkaHeadingDiffs('### learn-001 · Обучение A1 — НЕ СОВПАДАЕТ');
  const rows = [matchRow({ id: 'learn-001', diffs: [] })];
  const result = evaluateRegistry(sandbox(), { rows }, { runGit: fakeGit(T0), sverkaOpenDiffs: open });
  assert.ok(codes(result).includes('sverka_diff_not_in_registry'));
});

// зачем (координатор 10.10 23:00): статус no_release_surface — экрана нет в стор-сборке (Learning V2 вырезан router.ctx.js,
// Шпиль за выключенным флагом). Допускается ТОЛЬКО с проверяемым доказательством и ревью.
const STORE_REGEX = /^(?:\.\/)(?!(?:.*learning[_-]v2.*)\.tsx?$).*\.tsx$/;
function hiddenRow(over = {}) {
  return { id: 'hidden-001', screen: 'Экран', state: 'Состояние', status: 'no_release_surface', reviewed_by: 'coordinator', ...over };
}
const runHidden = (dir, rows) => evaluateRegistry(dir, { rows }, { runGit: fakeGit(T0), storeRouteRegex: STORE_REGEX });

test('no_release_surface без доказательства — нарушение', () => {
  const result = runHidden(sandbox(), [hiddenRow()]);
  assert.equal(result.ok, false);
  assert.deepEqual(codes(result), ['release_surface_proof_missing']);
});

test('no_release_surface без ревью координатора — нарушение', () => {
  const dir = sandbox();
  fs.writeFileSync(path.join(dir, 'app/learning_v2_demo.tsx'), 'export default 1;\n');
  const proof = { kind: 'store_route_excluded', routes: ['app/learning_v2_demo.tsx'] };
  assert.ok(codes(runHidden(dir, [hiddenRow({ reviewed_by: null, release_surface_proof: proof })])).includes('review_missing'));
});

test('no_release_surface с маршрутом, вырезанным в стор-режиме, проходит', () => {
  const dir = sandbox();
  fs.writeFileSync(path.join(dir, 'app/learning_v2_demo.tsx'), 'export default 1;\n');
  const result = runHidden(dir, [hiddenRow({ release_surface_proof: { kind: 'store_route_excluded', routes: ['app/learning_v2_demo.tsx'] } })]);
  assert.equal(result.ok, true, JSON.stringify(result.violations));
  assert.equal(result.counts.no_release_surface, 1);
});

test('no_release_surface с маршрутом, который стор-сборка видит, — нарушение', () => {
  const result = runHidden(sandbox(), [hiddenRow({ release_surface_proof: { kind: 'store_route_excluded', routes: ['app/screen.tsx'] } })]);
  assert.deepEqual(codes(result), ['release_surface_route_reachable']);
});

test('no_release_surface за флагом: нужен флаг по умолчанию выключен и тест-сторож, который его упоминает', () => {
  const dir = sandbox();
  fs.writeFileSync(path.join(dir, 'app/flag.ts'), "const KEY = 'demo_tab_enabled'; export const on = (b) => b?.[KEY] === true;\n");
  fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'tests/demo_gate.test.mjs'), "// сторож demo_tab_enabled\n");
  const proof = { kind: 'flag_off', flag: 'demo_tab_enabled', flag_source: 'app/flag.ts', guard_test: 'tests/demo_gate.test.mjs' };
  assert.equal(runHidden(dir, [hiddenRow({ release_surface_proof: proof })]).ok, true);
  assert.deepEqual(codes(runHidden(dir, [hiddenRow({ release_surface_proof: { ...proof, guard_test: 'tests/none.test.mjs' } })])), ['release_surface_guard_missing']);
  fs.writeFileSync(path.join(dir, 'app/flag.ts'), "const KEY = 'demo_tab_enabled'; export const on = (b) => Boolean(b?.[KEY]);\n");
  assert.deepEqual(codes(runHidden(dir, [hiddenRow({ release_surface_proof: proof })])), ['release_surface_flag_not_default_off']);
});

// зачем (Макеты 12.10, красный на HEAD): коммит caafa92ab снял вырез Learning V2 из стор-сборки, а тест всё ещё требовал его вырезанным.
// Сторожим то, что стор-сборка вырезает сейчас (превью Шпиля на моках и dev_state — 42bfeb63c, ba16e10c5), и что Главная и Learning V2 в ней остаются.
// ВАЖНО: вырез Learning V2 — решение владельца на утро (handoff/r1_cut_v2.patch). Если владелец скажет «вырезать» и патч применят,
// последнее утверждение (learning_v2_direct_session_player_v1.tsx → false) надо вернуть в `true` в ТОМ ЖЕ коммите, что и патч.
test('настоящий router.ctx.js: стор-сборка вырезает dev-превью и оставляет Главную и Learning V2', () => {
  const regex = storeRouteRegex(ROOT);
  assert.ok(regex, 'регулярка стор-режима не найдена в router.ctx.js');
  assert.equal(isRouteExcludedInStore(regex, 'app/dev_spire_preview.tsx'), true);
  assert.equal(isRouteExcludedInStore(regex, 'app/dev_state.tsx'), true);
  assert.equal(isRouteExcludedInStore(regex, 'app/(tabs)/home.tsx'), false);
  assert.equal(isRouteExcludedInStore(regex, 'app/learning_v2_direct_session_player_v1.tsx'), false);
});

// зачем (координатор 12.10, решение владельца «гейт только по r1» — утром): `--release=r1` считает только строки выпуска R1;
// по умолчанию — весь реестр, как раньше.
test('release=r1: только строки выпуска R1; без фильтра — весь реестр', () => {
  const rows = [
    matchRow({ id: 'r1-ok', release: 'r1' }),
    matchRow({ id: 'r1-pending', release: 'r1', status: 'pending' }),
    matchRow({ id: 'later-pending', status: 'pending' }),
    matchRow({ id: 'r1-removed', release: 'r1', status: 'removed_by_owner', removed_reason: 'владелец снял' }),
  ];
  const all = evaluateRegistry(sandbox(), { rows }, { runGit: fakeGit(T0) });
  assert.equal(all.counts.total, 4);
  assert.deepEqual(all.violations.map((v) => v.id).sort(), ['later-pending', 'r1-pending']);
  const r1 = evaluateRegistry(sandbox(), { rows }, { runGit: fakeGit(T0), release: 'r1' });
  assert.equal(r1.counts.total, 3);
  assert.equal(r1.counts.removed_by_owner, 1);
  assert.deepEqual(r1.violations.map((v) => v.id), ['r1-pending']);
});

test('release=r1 на реальном реестре: прогон по умолчанию не изменился, r1 — подмножество', () => {
  if (!fs.existsSync(REAL_REGISTRY)) return;
  const gate = path.join(ROOT, 'scripts', 'visual_parity_gate.mjs');
  const full = spawnSync(process.execPath, [gate, '--max-lines=0'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PARITY_GATE_WAIVER: '' } });
  const r1 = spawnSync(process.execPath, [gate, '--max-lines=0', '--release=r1'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PARITY_GATE_WAIVER: '' } });
  const total = (out) => Number(/строк=(\d+)/.exec(out)?.[1]);
  assert.doesNotMatch(full.stdout, /фильтр выпуска/);
  assert.match(r1.stdout, /фильтр выпуска: release=r1/);
  assert.ok(total(r1.stdout) > 0 && total(r1.stdout) < total(full.stdout), `${total(r1.stdout)} vs ${total(full.stdout)}`);
});

// зачем (вариант «А+Б», handoff/r1_parity_gate_AB.md): отложенные корзины не нарушение, но и не молчат; без флага — строго.
test('--defer-triage: b_reshoot/c_owner_decides/d_mockup_stale/theme_tone — отдельный счётчик; без флага — нарушения', () => {
  const rows = [
    matchRow({ id: 'ok', release: 'r1' }),
    matchRow({ id: 'reshoot', release: 'r1', status: 'diff', triage: { bucket: 'b_reshoot' } }),
    matchRow({ id: 'owner', release: 'r1', status: 'pending', triage: { bucket: 'a2_layout_candidate', final_bucket: 'c_owner_decides' } }),
    matchRow({ id: 'stale', release: 'r1', status: 'diff', triage: { final_bucket: 'd_mockup_stale' } }),
    matchRow({ id: 'tone', release: 'r1', status: 'diff', triage: { theme_tone: true } }),
    matchRow({ id: 'defect', release: 'r1', status: 'diff', triage: { bucket: 'a_code_defect' } }),
    matchRow({ id: 'later', status: 'pending', triage: { bucket: 'b_reshoot' } }),
  ];
  const strict = evaluateRegistry(sandbox(), { rows }, { runGit: fakeGit(T0), release: 'r1' });
  assert.deepEqual(strict.violations.map((v) => v.id).sort(), ['defect', 'owner', 'reshoot', 'stale', 'tone']);
  assert.equal(strict.deferred.rows, 0);
  const ab = evaluateRegistry(sandbox(), { rows }, { runGit: fakeGit(T0), release: 'r1', deferTriage: true });
  assert.deepEqual(ab.violations.map((v) => v.id), ['defect']);
  assert.equal(ab.ok, false);
  assert.equal(ab.deferred.rows, 4);
  assert.deepEqual(ab.deferred.by, { b_reshoot: 1, c_owner_decides: 1, d_mockup_stale: 1, theme_tone: 1 });
});

test('--defer-triage: precheck считает r1 с отложенными корзинами, CLI печатает счётчик', () => {
  const precheck = fs.readFileSync(path.join(ROOT, 'scripts/release_precheck.mjs'), 'utf8');
  assert.match(precheck, /scripts\/visual_parity_gate\.mjs', env: \{\}, args: \['--release=r1', '--defer-triage'\]/);
  assert.match(precheck, /\[gate\.script, \.\.\.\(gate\.args \?\? \[\]\)\]/);
  if (!fs.existsSync(REAL_REGISTRY)) return;
  const gate = path.join(ROOT, 'scripts', 'visual_parity_gate.mjs');
  const out = spawnSync(process.execPath, [gate, '--max-lines=0', '--release=r1', '--defer-triage'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PARITY_GATE_WAIVER: '' } });
  assert.match(out.stderr, /ОТЛОЖЕНО по варианту «А\+Б» \(решение владельца\): строк \d+/);
});

// зачем (координатор 13.10, дыра cards-070): пересклейка ставила склейке свежий evidence_at, а голой кадр был снят ДО правки кода — гейт принимал match.
// Теперь время съёмки — явное поле shot_at с источником; нет поля или источник «mtime» — match не принимается; журнал печатает источник и code_changed_at.
test('shot_at: нет поля времени съёмки — match не принимается (shot_time_unknown)', () => {
  const result = run(sandbox(), [matchRow({ shot_at: null, shot_at_source: null })]);
  assert.ok(codes(result).includes('shot_time_unknown'));
});

test('shot_at: источник mtime или неизвестный не принимается (shot_source_invalid)', () => {
  assert.ok(codes(run(sandbox(), [matchRow({ shot_at_source: 'mtime' })])).includes('shot_source_invalid'));
  assert.ok(codes(run(sandbox(), [matchRow({ shot_at_source: null })])).includes('shot_source_invalid'));
});

test('дыра cards-070: evidence_at свежий, а shot_at старше кода — evidence_stale', () => {
  const fresh = new Date(T0 + 10 * MINUTE).toISOString();
  const rawBefore = new Date(T0 - 60 * MINUTE).toISOString();
  const result = run(sandbox(), [matchRow({ evidence_at: fresh, shot_at: rawBefore, shot_at_source: 'restitch_log' })], T0);
  assert.ok(codes(result).includes('evidence_stale'));
  const shot = result.shots.find((x) => x.id === 'demo-001');
  assert.equal(shot.verdict, 'rejected');
  assert.equal(shot.source, 'restitch_log');
  assert.equal(shot.reason, 'evidence_stale');
  assert.ok(shot.code_changed_at);
});

test('shot_at: свежий кадр из журнала съёмки принимается, запись журнала несёт источник и время кода', () => {
  const result = run(sandbox(), [matchRow({ shot_at: new Date(T0 + 5 * MINUTE).toISOString(), shot_at_source: 'bare_run_dir' })], T0);
  assert.deepEqual(codes(result), []);
  const shot = result.shots[0];
  assert.deepEqual([shot.verdict, shot.source, shot.shot_at], ['accepted', 'bare_run_dir', new Date(T0 + 5 * MINUTE).toISOString()]);
  assert.equal(shot.code_changed_at, new Date(T0).toISOString());
});

// ── пересборка не теряет строк и полей ──────────────────────────────────────────────────────────────────────────────────────────────────
// зачем (координатор 17.10): 306 строк жили вне матрицы, а полная пересборка их стирала вместе с полями release / emulator / triage /
// note / added_reason у ВСЕХ строк — после неё гейт `--release=r1` обнулялся. Теперь прежние поля идут первыми, строки вне матрицы
// переносятся с origin: 'carried'.
test('пересборка: прежние поля строки матрицы и строки вне матрицы переживают её', () => {
  const scan = { practice: [{ n: 1, label: 'Сессия', animations: [], replay: false }] };
  const matrix = [{ section: 'practice.html', n: 1, screen: 'Сессия', state: 'Сессия', files: ['app/x.tsx'], matrixStatus: '✅' }];
  const inMatrix = { id: 'practice-001', status: 'pending', release: 'r1', emulator: { link: 'phraseman://x' }, triage: { bucket: 'b' }, note: 'n', added_reason: 'a', screen: 'старое' };
  const outside = { id: 'cards-gap-001', source: 'COORDINATOR_AUDIT_2026-10-12', status: 'pending', release: 'r1', code: [], mockup: { file: null } };
  const rows = buildRows(matrix, scan, [inMatrix, outside]);
  assert.equal(rows.length, 2);
  const [fromMatrix, carried] = rows;
  for (const key of ['release', 'emulator', 'triage', 'note', 'added_reason', 'status']) assert.deepEqual(fromMatrix[key], inMatrix[key], `поле ${key} стёрто`);
  assert.equal(fromMatrix.screen, 'Сессия', 'описание из матрицы обновляется');
  assert.equal(fromMatrix.origin, undefined);
  assert.deepEqual(carried, { ...outside, origin: 'carried' });
});

test('пересборка на текущем реестре: те же строки, r1 считает столько же, cards-v2 ≥ 44, ни одно поле не потеряно', () => {
  // макеты «сканируются» из самого реестра — проверяем перенос строк и полей, а не playwright
  const scan = {};
  for (const row of registry.rows) {
    const file = row.mockup?.file;
    if (!file || !Number.isInteger(row.mockup.phone) || row.mockup.phone < 1) continue;
    const page = path.basename(file, '.html');
    scan[page] ??= [];
    scan[page][row.mockup.phone - 1] ??= { n: row.mockup.phone, label: row.mockup.label ?? '', animations: [], replay: false };
  }
  for (const phones of Object.values(scan)) for (let i = 0; i < phones.length; i += 1) phones[i] ??= { n: i + 1, label: '', animations: [], replay: false };
  const rebuilt = buildRows(parseMatrix(matrixText), scan, registry.rows);
  assert.equal(rebuilt.length, registry.rows.length, 'число строк изменилось');
  assert.ok(rebuilt.length >= 1151, `строк ${rebuilt.length} < 1151`);
  assert.equal(new Set(rebuilt.map((row) => row.id)).size, rebuilt.length, 'id повторяются');
  const byId = new Map(rebuilt.map((row) => [row.id, row]));
  for (const old of registry.rows) {
    const row = byId.get(old.id);
    assert.ok(row, `${old.id}: строка выпала`);
    for (const key of Object.keys(old)) assert.ok(key in row, `${old.id}: поле ${key} выпало`);
    for (const key of ['release', 'status', 'emulator', 'triage', 'note', 'added_reason', 'evidence', 'reviewed_by', 'removed_reason', 'release_surface_proof']) {
      if (key in old) assert.deepEqual(row[key], old[key], `${old.id}: поле ${key} изменилось`);
    }
  }
  // то, что считает `--release=r1`: строки выпуска R1 по статусам
  const r1 = (rows) => rows.filter((row) => row.release === 'r1').reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] ?? 0) + 1 }), {});
  assert.deepEqual(r1(rebuilt), r1(registry.rows));
  assert.ok(rebuilt.filter((row) => row.id.startsWith('cards-v2-')).length >= 44, 'строки cards-v2 (OWNER_PIN_54) выпали');
});
