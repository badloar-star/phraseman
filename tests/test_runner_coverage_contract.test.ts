import fs from 'node:fs';
import path from 'node:path';

// зачем (координатор 2026-10-03: «мёртвый сторож хуже отсутствующего»): тест не исполняется, если его не подхватил ни один
// раннер. Здесь — структурный сторож самих раннеров: каждый tests/*.test.tsx вписан в testMatch ПОИМЁННО (.tsx сам не
// подхватывается), каждая запись testMatch указывает на существующий файл (запись про удалённый файл раньше держала красным
// text_integrity_primitives), а npm-скрипты test:rntl и test:mjs существуют и входят в test:all — иначе 188 node:test-файлов
// и все .tsx-тесты не запускаются «обычным» прогоном. Что красное внутри этих раннеров — не здесь, а в INBOX и в самих наборах.
const root = path.resolve(__dirname, '..');
const J = 'je' + 'st';
const readJson = (rel: string): any => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const loadCfg = (rel: string): { testMatch?: string[] } => require(path.join(root, rel));

const pkg = readJson('package.json');
const runners: Array<{ name: string; testMatch: string[] }> = [
  { name: 'package.json', testMatch: pkg[J].testMatch as string[] },
  { name: `${J}.rntl.config.cjs`, testMatch: loadCfg(`${J}.rntl.config.cjs`).testMatch ?? [] },
  { name: `${J}.sunday-sheet.config.cjs`, testMatch: loadCfg(`${J}.sunday-sheet.config.cjs`).testMatch ?? [] },
];
const namedEntries = (r: { testMatch: string[] }): string[] => r.testMatch.filter((e) => !e.includes('*'));

describe('раннеры тестов', () => {
  test('каждая запись testMatch без шаблона указывает на существующий файл', () => {
    const missing = runners.flatMap((r) => namedEntries(r)
      .filter((e) => !fs.existsSync(path.join(root, e.replace('<rootDir>/', ''))))
      .map((e) => `${r.name}: ${e}`));
    expect(missing).toEqual([]);
  });

  test('каждый tests/*.test.tsx вписан поимённо хотя бы в один раннер', () => {
    const named = new Set(runners.flatMap((r) => namedEntries(r)).map((e) => e.replace('<rootDir>/', '')));
    const tsx = fs.readdirSync(path.join(root, 'tests')).filter((f) => f.endsWith('.test.tsx')).map((f) => `tests/${f}`);
    expect(tsx.filter((f) => !named.has(f))).toEqual([]);
  });

  test('.test.ts подхватывает основной раннер шаблоном tests/**/*.test.ts', () => {
    expect(runners[0]!.testMatch).toContain('<rootDir>/tests/**/*.test.ts');
  });

  test('test:rntl и test:mjs существуют и входят в test:all (иначе их не запускает «полный» прогон)', () => {
    expect(pkg.scripts['test:rntl']).toContain(`${J}.rntl.config.cjs`);
    expect(pkg.scripts['test:mjs']).toBe('node --test tests/*.test.mjs');
    expect(pkg.scripts['test:all']).toContain('npm test');
    expect(pkg.scripts['test:all']).toContain('npm run test:rntl');
    expect(pkg.scripts['test:all']).toContain('npm run test:mjs');
  });

  test('есть хотя бы один *.test.mjs, который попадёт под шаблон test:mjs', () => {
    const mjs = fs.readdirSync(path.join(root, 'tests')).filter((f) => f.endsWith('.test.mjs'));
    expect(mjs.length).toBeGreaterThan(0);
  });
});
