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

// зачем (Ядро/координатор 11.10): фабрика V2 стала требовать loadAuxiliary, а манифест его не давал — 186 из 187 занятий
// не собирались. Сторож обязан остановить коммит такой пары и пропустить согласованную.
const FACTORY = 'modules/learning-v2/content/factory_native/factory_native_course_v1.ts';
const MANIFEST = 'modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated.ts';
const headText = (rel) => execFileSync('git', ['show', `HEAD:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const stageText = (env, rel, text) => {
  const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], { cwd: ROOT, input: text, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).trim();
  execFileSync('git', ['update-index', '--cacheinfo', `100644,${blob},${rel}`], { cwd: ROOT, env });
};
const requiringFactory = () => `${headText(FACTORY)}\nfunction requireAuxiliaryForTest(row) {\n  if (!row.loadAuxiliary)\n    throw new Error("learning_v2_factory_native_auxiliary_missing");\n}\n`;

test('HEAD: пара фабрика/манифест согласована — сторож её считает и пропускает', () => {
  withTempIndex((env) => {
    const run = runGuard(env);
    assert.match(run.stdout, /\[RELEASE-GUARD\] factory requiresAuxiliary=(true|false) manifestRows=[1-9]\d* auxiliaryRows=\d+/);
    assert.equal(run.status, 0, run.stderr);
  });
});

test('фабрика требует loadAuxiliary, манифест без него → коммит остановлен', () => {
  withTempIndex((env) => {
    stageText(env, FACTORY, requiringFactory());
    // зачем (Ядро 17.10): манифест HEAD уже даёт loadAuxiliary всем 441 строкам; раньше тест «проходил» только из-за
    // лишней единицы в подсчёте строк (тип `loadIntro: () => unknown` считался данными). Манифест без auxiliary — явно.
    const manifest = headText(MANIFEST).replace(/^\s*loadAuxiliary: \(\) => require\([^)]*\) as unknown,\r?\n/gmu, '');
    assert.ok(!/loadAuxiliary: \(\) => require/u.test(manifest), 'заготовка: auxiliary убран из всех строк');
    stageText(env, MANIFEST, manifest);
    const run = runGuard(env);
    assert.match(run.stdout, /requiresAuxiliary=true/);
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /требует loadAuxiliary/);
  });
});

test('фабрика требует loadAuxiliary и манифест даёт его каждой строке → коммит проходит', () => {
  withTempIndex((env) => {
    stageText(env, FACTORY, requiringFactory());
    const manifest = headText(MANIFEST).replace(/\bloadAnswers:\s*\(\)\s*=>\s*(?!unknown\b)/g, (m) => `loadAuxiliary: () => null, ${m}`);
    stageText(env, MANIFEST, manifest);
    const run = runGuard(env);
    assert.doesNotMatch(run.stdout, /auxiliaryRows=0\b/);
    assert.equal(run.status, 0, run.stderr);
  });
});
