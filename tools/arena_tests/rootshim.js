/**
 * Тесты-инспекторы читают исходники по пути от __dirname. Скомпилированные во
 * временную папку, они смотрят не туда — подменяем корень на настоящий
 * репозиторий. Загрузка самих модулей (.js) не трогается: иначе сломается
 * require.
 */
const path = require('path');
const fs = require('fs');

const REPO = process.env.ARENA_REPO;
const PREFIX = process.env.ARENA_BUILD_DIR || '';
if (!REPO || !PREFIX) {
  throw new Error('нужны переменные ARENA_REPO и ARENA_BUILD_DIR — см. tools/arena_tests/run.sh');
}

const redirect = (target) =>
  typeof target === 'string' && target.startsWith(PREFIX) && !target.endsWith('.js')
    ? path.join(REPO, target.slice(PREFIX.length))
    : target;

for (const name of ['readFileSync', 'existsSync', 'readdirSync', 'statSync']) {
  const originalFn = fs[name];
  fs[name] = function patched(target, ...rest) { return originalFn.call(fs, redirect(target), ...rest); };
}
