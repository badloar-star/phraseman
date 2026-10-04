// зачем (координатор 04.10): сторож выпуска сессий Learning V2 в pre-commit читал РАБОЧУЮ КОПИЮ —
// чужая незаконченная правка валила коммиты всех сессий. Теперь он проверяет то, что уходит в коммит:
// файл в коммите → индекс, иначе → HEAD. Проверяем оба случая на временном индексе (рабочая копия и
// общий индекс не трогаются).
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');
const GUARD = path.join(ROOT, 'scripts', 'guard_learning_v2_session_release.mjs');
const CLIENT = 'app/learning_v2_course_released_session_client_v3.ts';

function withTempIndex(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-guard-'));
  const index = path.join(dir, 'index');
  const env = { ...process.env, GIT_INDEX_FILE: index };
  try {
    execFileSync('git', ['read-tree', 'HEAD'], { cwd: ROOT, env });
    return fn(env);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const runGuard = (env) => spawnSync(process.execPath, [GUARD], { cwd: ROOT, env, encoding: 'utf8' });

test('файла нет в коммите → проверяется версия из HEAD, рабочая копия не влияет', () => {
  withTempIndex((env) => {
    const run = runGuard(env);
    assert.match(run.stdout, /\[RELEASE-GUARD\] mode=staged/);
    assert.match(run.stdout, new RegExp(`\\[RELEASE-GUARD\\] source=head path=${CLIENT.replace(/\./g, '\\.')} result=ok`));
    assert.equal(run.status, 0, run.stderr);
  });
});

test('коммит меняет охраняемый файл и рвёт подключение озвучки → проверяется индекс и коммит блокируется', () => {
  withTempIndex((env) => {
    const head = execFileSync('git', ['show', `HEAD:${CLIENT}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    // Ломаем ровно то, что сторож охраняет: вызовы подключения озвучки сессий.
    const broken = head.replace(/buildLearningV2(\w*)Session(\d+)BundledAudioChildV1\s*\(/g, 'removedForTest$1$2(');
    assert.notEqual(broken, head, 'в HEAD должны быть вызовы подключения озвучки');
    const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], { cwd: ROOT, input: broken, encoding: 'utf8' }).trim();
    execFileSync('git', ['update-index', '--cacheinfo', `100644,${blob},${CLIENT}`], { cwd: ROOT, env });
    const run = runGuard(env);
    assert.match(run.stdout, new RegExp(`source=index path=${CLIENT.replace(/\./g, '\\.')} result=ok`));
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /СТОРОЖ ВЫПУСКА СЕССИЙ LEARNING V2/);
  });
});
