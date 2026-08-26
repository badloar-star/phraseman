// зачем (владелец, 2026-08-22): jest-прогон tests/runtime_lifecycle_ratchet.test.ts
// идёт ~110 секунд И падает на ПЕРВОЙ несовпавшей записи, маскируя все следующие —
// починка накопленного долга превращалась в цепочку двухминутных прогонов по одной
// поломке за раз (инцидент 2026-08-02, повтор 2026-08-22). Этот гард выполняет обе
// проверки сторожа за секунду и печатает СРАЗУ ВЕСЬ список поломок.
//
// Он НЕ заменяет сторож (авторитет — сам jest-тест), а служит быстрым пред-прогоном:
// чинишь всё, что он показал, и только финальный контрольный прогон делаешь через jest.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testPath = path.join(root, 'tests/runtime_lifecycle_ratchet.test.ts');
const testSource = fs.readFileSync(testPath, 'utf8');

// Реестр вынимаем из самого теста, а не дублируем: копия неизбежно разъехалась бы
// с оригиналом и гард начал бы врать. Литерал вырезаем по границам объявления.
const declarationStart = testSource.indexOf('const REVIEWED_MOTION_OWNERS');
const literalStart = testSource.indexOf('= {', declarationStart) + 2;
const literalEnd = testSource.indexOf('\n};', declarationStart) + 2;
if (declarationStart < 0 || literalEnd < 2) {
  console.error('guard_runtime_lifecycle_ratchet: не нашёл литерал REVIEWED_MOTION_OWNERS — тест переписан, обнови гард.');
  process.exit(2);
}

// Те же хелперы, что в тесте: литерал зовёт их при вычислении.
const guarded = (reason, appStateGateToken) => ({
  owner: 'explicit_focus_appstate',
  reason,
  requiredTokens: ['AppState.currentState', 'AppState.addEventListener'],
  appStateGateToken,
});
const owned = (reason, requiredTokens) => ({ owner: 'owner_prop', reason, requiredTokens });
const runtime = (reason, requiredTokens = []) => ({
  owner: 'runtime_active',
  reason,
  requiredTokens: ['useRuntimeActive', ...requiredTokens],
});

let registry;
try {
  // eslint-disable-next-line no-eval -- литерал из собственного тест-файла репозитория, не внешний ввод
  registry = eval(`(${testSource.slice(literalStart, literalEnd)})`);
} catch (error) {
  console.error(`guard_runtime_lifecycle_ratchet: литерал реестра не вычислился (${error.message}).`);
  process.exit(2);
}
void guarded; void owned; void runtime; // вызываются внутри eval выше

const MOTION_PATTERN = /Animated\.loop\s*\(|withRepeat\([\s\S]{0,220}?,\s*-1/g;
const hasRepeatingMotion = (source) => /Animated\.loop\s*\(/.test(source)
  || /withRepeat\([\s\S]{0,220}?,\s*-1/.test(source);

const walk = (relativeDirectory) => {
  const result = [];
  for (const entry of fs.readdirSync(path.join(root, relativeDirectory), { withFileTypes: true })) {
    const relative = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) result.push(...walk(relative));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) result.push(relative);
  }
  return result;
};

const readSource = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const problems = [];

// Проверка 1 (тест «keeps every repeating-motion file explicitly owned»): покрытие.
// зачем (аудит нагрева 2026-08-26): 'modules' здесь НЕ было — как и в самом
// тесте. Учебные режимы (modules/learning-v2/modes/*) крутили вечные анимации
// вне поля зрения любого сторожа. Список корней обязан совпадать с тестом.
const discovered = ['app', 'components', 'hooks', 'modules']
  .flatMap(walk)
  .filter((file) => hasRepeatingMotion(readSource(file)))
  .sort();
const registered = Object.keys(registry).sort();
for (const file of discovered.filter((item) => !registered.includes(item))) {
  problems.push({ kind: 'not_in_registry', file, hint: 'файл крутит бесконечную анимацию, но не внесён в реестр' });
}
for (const file of registered.filter((item) => !discovered.includes(item))) {
  problems.push({ kind: 'stale_entry', file, hint: 'в реестре есть, но бесконечной анимации в файле больше нет' });
}

// Проверка 2 (тест «keeps reviewed ownership reasons and existing explicit guards intact»):
// живые токены гардов. В отличие от jest, перебираем ВСЕ записи, не останавливаясь на первой.
for (const [file, review] of Object.entries(registry)) {
  if (!review.reason?.trim()) {
    problems.push({ kind: 'empty_reason', file, hint: 'запись без обоснования владения' });
  }
  let source;
  try {
    source = readSource(file);
  } catch {
    problems.push({ kind: 'missing_file', file, hint: 'файл из реестра не существует' });
    continue;
  }
  for (const token of review.requiredTokens ?? []) {
    if (!source.includes(token)) {
      problems.push({ kind: 'token_lost', file, token, hint: 'гард переписан — прочитать файл и решить: чинить код или перепломбировать токен' });
    }
  }
  if (review.owner !== 'explicit_focus_appstate') continue;
  if (!/(?:useIs(?:Screen)?Focused|useFocusEffect)\s*\(/.test(source)) {
    problems.push({ kind: 'no_focus_hook', file, hint: 'guarded-запись без хука фокуса экрана' });
  }
  const motionCalls = [...source.matchAll(MOTION_PATTERN)];
  if (motionCalls.length === 0) {
    problems.push({ kind: 'no_motion_calls', file, hint: 'guarded-запись без повторяющейся анимации' });
  }
  for (const motionCall of motionCalls) {
    const callIndex = motionCall.index ?? 0;
    const line = source.slice(0, callIndex).split(/\r?\n/).length;
    const effectWindow = source.slice(Math.max(0, callIndex - 1200), callIndex + 2500);
    const gated = /AppState\.currentState/.test(effectWindow)
      || (!!review.appStateGateToken && effectWindow.includes(review.appStateGateToken));
    if (!gated) problems.push({ kind: 'no_appstate_gate', file, line, hint: 'цикл не гейтится AppState рядом с вызовом' });
    if (!/(?:\.stop\s*\(\s*\)|cancelAnimation\s*\()/.test(effectWindow)) {
      problems.push({ kind: 'no_local_cleanup', file, line, hint: 'у цикла нет остановки рядом с вызовом' });
    }
  }
}

problems.sort((left, right) => left.kind.localeCompare(right.kind) || left.file.localeCompare(right.file));
if (problems.length === 0) {
  console.log(`runtime lifecycle ratchet: OK — ${registered.length} записей, ${discovered.length} файлов с бесконечной анимацией.`);
  process.exit(0);
}
console.log(`runtime lifecycle ratchet: ${problems.length} проблем(ы) — все сразу, без маскировки:\n`);
for (const problem of problems) {
  const where = problem.line ? `${problem.file}:${problem.line}` : problem.file;
  const token = problem.token ? ` :: ${problem.token}` : '';
  console.log(`  [${problem.kind}] ${where}${token}\n      ${problem.hint}`);
}
console.log('\nПравило: чинить контракт, а не удалять проверку. Финальный прогон:');
console.log('  npx jest --runTestsByPath tests/runtime_lifecycle_ratchet.test.ts --runInBand --watchman=false');
process.exit(1);
