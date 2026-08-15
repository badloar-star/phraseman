import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * Каждый набор Арены обязан попадать в быстрый прогон.
 *
 * Набор, который не прогоняется, ничего не охраняет. Это не рассуждение, а
 * случай из жизни: три серверных договорных набора оказались вне круга, и
 * один из них молча краснел на правке, сделанной за день до того. Узналось
 * это только когда их добавили.
 *
 * Клиентские наборы забираются маской и попадают в прогон сами. Серверные
 * перечислены поимённо — вот там и появляется щель, которую сторожит этот
 * тест.
 */

/** Наборы вне быстрого прогона. Каждый — с причиной, и список не растёт молча. */
const EXCLUDED: Readonly<Record<string, string>> = {
  // Нужен запущенный эмулятор Firestore: правила доступа нельзя проверить,
  // читая исходники, их проверяют настоящими запросами.
  'functions/src/arena_v2_rules.emulator.test.ts': 'нужен эмулятор Firestore',
};

function includedPatterns(): readonly string[] {
  const config = JSON.parse(read('tools/arena_tests/tsconfig.json')) as { include?: readonly string[] };
  return (config.include ?? []).map((entry) => entry.replace(/^\.\.\/\.\.\//, ''));
}

function suites(): readonly string[] {
  const client = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((name) => /^arena_.*\.test\.ts$/.test(name))
    .map((name) => `tests/${name}`);
  const server = fs.readdirSync(path.join(ROOT, 'functions/src'))
    .filter((name) => /^arena_.*\.test\.ts$/.test(name))
    .map((name) => `functions/src/${name}`);
  return [...client, ...server];
}

function covered(rel: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => pattern === rel
    || (pattern.includes('*') && rel.startsWith(pattern.split('*')[0] as string)));
}

describe('Arena test coverage', () => {
  const patterns = includedPatterns();
  const all = suites();

  test('разбор не пустой', () => {
    expect(patterns.length).toBeGreaterThan(3);
    expect(all.length).toBeGreaterThan(30);
  });

  test('каждый набор Арены либо в прогоне, либо исключён с причиной', () => {
    const orphans = all.filter((rel) => !covered(rel, patterns) && !(rel in EXCLUDED));
    expect(orphans).toEqual([]);
  });

  test('исключения не залёживаются: каждое указывает на существующий файл', () => {
    // Иначе список исключений превращается в кладбище имён, и в нём легко
    // спрятать живой набор.
    for (const rel of Object.keys(EXCLUDED)) {
      expect(fs.existsSync(path.join(ROOT, rel))).toBe(true);
      expect(covered(rel, patterns)).toBe(false);
    }
  });
});
