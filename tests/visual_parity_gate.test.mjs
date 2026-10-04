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
import { evaluateRegistry, missingMatrixRows } from '../scripts/visual_parity_gate.mjs';
import { parseMatrix } from '../scripts/visual_parity_build.mjs';

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
  return {
    id: 'demo-001', screen: 'Экран', state: 'Состояние', status: 'match', reviewed_by: 'coordinator', diffs: [], code: ['app/screen.tsx'],
    has_animation: false, evidence: 'evidence.png', evidence_at: new Date(T0 + 10 * MINUTE).toISOString(), evidence_sha256: sha('png-bytes'),
    anim_evidence: null, ...over,
  };
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
  assert.equal(registry.rows.filter((row) => row.id.startsWith('mistakes-v2-')).length, 17);
  assert.equal(registry.rows.filter((row) => row.id.startsWith('themes-gradient-')).length, 3);
  assert.ok(registry.rows.filter((row) => row.id.startsWith('cards-v2-')).length >= 40, 'макет cards-v2 (04.10) должен быть в реестре');
});

test('реестр: строки без макета в папке — no_mockup, остальные стартуют pending, ни одной «ранней» match без ревью', () => {
  for (const row of registry.rows) {
    if (row.status === 'match') {
      assert.ok(row.reviewed_by, `${row.id}: match без reviewed_by`);
      continue;
    }
    if (row.status === 'removed_by_owner') {
      assert.ok(row.removed_reason, `${row.id}: removed_by_owner без причины`);
      continue;
    }
    assert.equal(row.status, row.mockup.file ? 'pending' : 'no_mockup', `${row.id}: статус ${row.status} при макете ${row.mockup.file}`);
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

test('подключение: гейт в release:precheck и в eas-build-post-install', () => {
  const precheck = fs.readFileSync(path.join(ROOT, 'scripts/release_precheck.mjs'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.ok(precheck.includes('scripts/visual_parity_gate.mjs'));
  assert.ok(pkg.scripts['eas-build-post-install'].includes('scripts/visual_parity_gate.mjs'));
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
