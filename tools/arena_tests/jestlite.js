/**
 * Крошечный прогонщик тестов Арены.
 *
 * В проекте нет установленного jest, а тесты Арены написаны в его словаре
 * (`describe`/`it`/`expect`). Этот файл даёт ровно те проверки, которыми они
 * пользуются, и ничего сверх того.
 *
 * Живёт В РЕПОЗИТОРИИ намеренно. Раньше он лежал в /tmp — и однажды среда
 * перезапустилась, унеся с собой всю оснастку: проверить работу стало нечем
 * до тех пор, пока её не написали заново. Оснастка, которой нельзя доверять
 * пережить ночь, не оснастка.
 */
const state = { passed: 0, failed: 0, stack: [], queue: [] };

function label(name) {
  return [...state.stack, name].join(' › ');
}

function show(value) {
  if (typeof value === 'string') return JSON.stringify(value);
  if (value instanceof Error) return value.message;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function fail(name, error) {
  state.failed += 1;
  console.log(`FAIL ${name}`);
  console.log(`  ${error && error.message ? error.message : error}`);
}

/**
 * Тест не выполняется сразу: он встаёт в очередь и запускается из `report()`.
 * Иначе асинхронные тесты (а их у Арены хватает — снимки на диске) считались
 * бы пройденными в момент, когда они ещё не начали работать.
 */
function run(name, fn) {
  state.queue.push({ name: label(name), fn });
}

function describe(name, fn) {
  state.stack.push(name);
  try { fn(); } catch (error) { fail('(тело describe)', error); }
  state.stack.pop();
}

function format(template, args) {
  let index = 0;
  const text = String(template).replace(/%[sjdio]/g, () => show(args[index++]));
  return index ? text : `${template} ${args.map(show).join(', ')}`;
}

function makeEach(runner) {
  return (rows) => (template, fn) => {
    for (const row of rows) {
      const args = Array.isArray(row) ? row : [row];
      runner(format(template, args), () => fn(...args));
    }
  };
}

const it = (name, fn) => run(name, fn);
it.each = makeEach(run);
it.skip = () => {};
const test = it;

function equal(a, b) {
  if (b instanceof AsymmetricMatcher) return b.test(a);
  if (a instanceof AsymmetricMatcher) return a.test(b);
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a); const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((key) => equal(a[key], b[key]));
}

/** Частичное совпадение: в actual есть всё, что перечислено в expected. */
function subset(actual, expected) {
  // Асимметричные сравнения бывают ВЛОЖЕННЫМИ: objectContaining внутри
  // arrayContaining внутри objectContaining. Без этой строки вложенный
  // матчер разбирался как обычный объект — сравнивались его собственные
  // поля, и проверка проваливалась на верном значении.
  if (expected instanceof AsymmetricMatcher) return expected.test(actual);
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && expected.length === actual.length
      && expected.every((item, index) => subset(actual[index], item));
  }
  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object') return false;
    return Object.keys(expected).every((key) => subset(actual[key], expected[key]));
  }
  return equal(actual, expected);
}

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

function matchers(actual, negated) {
  const check = (ok, message) => assert(negated ? !ok : ok,
    negated ? `ожидалось НЕ ${message}` : `ожидалось ${message}`);
  return {
    toBe: (expected) => check(Object.is(actual, expected), `${show(actual)} === ${show(expected)}`),
    toEqual: (expected) => check(equal(actual, expected), `${show(actual)} равно ${show(expected)}`),
    toStrictEqual: (expected) => check(equal(actual, expected), `${show(actual)} равно ${show(expected)}`),
    toContain: (expected) => check(
      typeof actual === 'string' ? actual.includes(expected)
        : Array.isArray(actual) ? actual.some((item) => equal(item, expected)) : false,
      `${show(actual)} содержит ${show(expected)}`),
    toMatch: (re) => check(new RegExp(re).test(String(actual)), `${show(actual)} подходит под ${re}`),
    toHaveLength: (n) => check(actual && actual.length === n, `длина ${show(actual)} равна ${n}`),
    toBeGreaterThan: (n) => check(actual > n, `${show(actual)} > ${n}`),
    toBeGreaterThanOrEqual: (n) => check(actual >= n, `${show(actual)} >= ${n}`),
    toBeLessThan: (n) => check(actual < n, `${show(actual)} < ${n}`),
    toBeLessThanOrEqual: (n) => check(actual <= n, `${show(actual)} <= ${n}`),
    toBeCloseTo: (n, digits = 2) => check(Math.abs(actual - n) < Math.pow(10, -digits) / 2,
      `${show(actual)} ≈ ${n}`),
    toBeNull: () => check(actual === null, `${show(actual)} это null`),
    toBeUndefined: () => check(actual === undefined, `${show(actual)} это undefined`),
    toBeDefined: () => check(actual !== undefined, `${show(actual)} определено`),
    toBeTruthy: () => check(Boolean(actual), `${show(actual)} истинно`),
    toBeFalsy: () => check(!actual, `${show(actual)} ложно`),
    toBeInstanceOf: (type) => check(actual instanceof type, `${show(actual)} это ${type.name}`),
    toMatchObject: (expected) => check(subset(actual, expected),
      `${show(actual)} включает ${show(expected)}`),
    toHaveProperty: (...args) => {
      const [key, value] = args;
      const parts = String(key).split('.');
      let cursor = actual; let found = true;
      for (const part of parts) {
        if (cursor && typeof cursor === 'object' && part in cursor) cursor = cursor[part];
        else { found = false; break; }
      }
      // Значение сверяется, только если его передали: `toHaveProperty('a')`
      // спрашивает про наличие поля, а не про то, что оно равно undefined.
      check(found && (args.length < 2 || equal(cursor, value)),
        `у ${show(actual)} есть поле ${key}${args.length > 1 ? ` равное ${show(value)}` : ''}`);
    },
    toThrow: (expected) => {
      let threw = false; let message = '';
      try { actual(); } catch (error) { threw = true; message = String(error && error.message || error); }
      check(threw && (!expected || message.includes(String(expected))),
        `вызов бросает ${expected ? show(expected) : 'ошибку'}, а он ${threw ? `бросил ${show(message)}` : 'не бросил'}`);
    },
  };
}

/**
 * Асимметричные сравнения jest: `expect.any(String)` и
 * `expect.objectContaining({...})` внутри `toEqual`.
 */
class AsymmetricMatcher {
  constructor(test, description) { this.test = test; this.description = description; }
}

function expect(actual) {
  const api = matchers(actual, false);
  api.not = matchers(actual, true);
  api.resolves = api;
  return api;
}

expect.any = (type) => new AsymmetricMatcher(
  (value) => (type === String ? typeof value === 'string'
    : type === Number ? typeof value === 'number'
      : type === Boolean ? typeof value === 'boolean'
        : type === Object ? typeof value === 'object' && value !== null
          : type === Array ? Array.isArray(value)
            : type === Function ? typeof value === 'function'
              : value instanceof type),
  `any(${type && type.name})`);
expect.anything = () => new AsymmetricMatcher((value) => value !== null && value !== undefined, 'anything');
expect.objectContaining = (expected) => new AsymmetricMatcher(
  (value) => subset(value, expected), 'objectContaining');
expect.arrayContaining = (expected) => new AsymmetricMatcher(
  (value) => Array.isArray(value) && expected.every((item) => value.some((row) => equal(row, item))),
  'arrayContaining');
expect.stringContaining = (expected) => new AsymmetricMatcher(
  (value) => typeof value === 'string' && value.includes(expected), 'stringContaining');

globalThis.describe = describe;
globalThis.it = it;
globalThis.test = test;
globalThis.expect = expect;
globalThis.beforeEach = (fn) => fn();
globalThis.afterEach = () => {};
globalThis.beforeAll = (fn) => fn();
globalThis.afterAll = () => {};
globalThis.jest = { fn: () => () => {}, mock: () => {}, spyOn: () => ({ mockRestore: () => {} }) };

module.exports = {
  async report() {
    for (const entry of state.queue) {
      try {
        await entry.fn();
        state.passed += 1;
      } catch (error) {
        fail(entry.name, error);
      }
    }
    console.log(`${state.passed} passed, ${state.failed} failed`);
    return state.failed;
  },
};
