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

  test('каждый tests/*.test.tsx подхватывает хотя бы один раннер (шаблон tests/**/*.test.tsx или поимённая запись)', () => {
    // зачем (разбор красных 18.10, 7a97f2fd7 от 13.10): основной раннер получил шаблон tests/**/*.test.tsx — .tsx-тесты исполняются без поимённой записи
    // (spire_pairs_board и theme_boot_* были «не вписаны» и красили сторож, хотя исполнялись). Смысл сторожа прежний — тест не должен остаться без раннера;
    // если шаблон снимут, поимённое правило вернётся само.
    const named = new Set(runners.flatMap((r) => namedEntries(r)).map((e) => e.replace('<rootDir>/', '')));
    const wildcardTsx = runners.some((r) => r.testMatch.includes('<rootDir>/tests/**/*.test.tsx'));
    const tsx = fs.readdirSync(path.join(root, 'tests')).filter((f) => f.endsWith('.test.tsx')).map((f) => `tests/${f}`);
    expect(tsx.filter((f) => !wildcardTsx && !named.has(f))).toEqual([]);
  });

  test('карантин не тихий: каждый тест из testPathIgnorePatterns либо идёт в другом раннере, либо перечислен в docs/work/test-quarantine-2026-10-18.md', () => {
    // зачем (координатор 18.10 03:50): тесты конвейеров не этого выпуска (Густав FR) вынесены из обычного прогона, но НЕ удалены; «мёртвый сторож хуже отсутствующего» —
    // поэтому исключение без причины, даты и условия возврата запрещено: запись обязана быть в файле-причине.
    // файлы-причины: общий и V2 (его ведёт V2, здесь только читается)
    const docNames = ['docs/work/test-quarantine-2026-10-18.md', 'docs/work/test-quarantine-v2-2026-10-18.md'];
    const doc = docNames
      .filter((rel) => fs.existsSync(path.join(root, rel)))
      .map((rel) => fs.readFileSync(path.join(root, rel), 'utf8'))
      .join('\n');
    const otherRunners = runners.slice(1);
    const runnerNames = new Set(otherRunners.flatMap((r) => namedEntries(r)).map((e) => e.replace('<rootDir>/', '')));
    const mainNamed = new Set(namedEntries(runners[0]!).map((e) => e.replace('<rootDir>/', '')));
    const ignored = (pkg[J].testPathIgnorePatterns as string[])
      .filter((e) => e.startsWith('<rootDir>/tests/'))
      .map((e) => e.replace('<rootDir>/', ''));
    const silent = ignored.filter((rel) => !runnerNames.has(rel) && !mainNamed.has(rel) && !doc.includes(rel.replace('tests/', '')));
    expect(silent).toEqual([]);
  });

  test('карантин V2: каждый тест из docs/work/test-quarantine-v2-2026-10-18.md исключён из основного раннера (файл ведёт V2, здесь только сверка)', () => {
    const rel = 'docs/work/test-quarantine-v2-2026-10-18.md';
    if (!fs.existsSync(path.join(root, rel))) return; // файла ещё нет — сверять нечего
    const doc = fs.readFileSync(path.join(root, rel), 'utf8');
    const listed = Array.from(new Set(Array.from(doc.matchAll(/\b([a-z0-9_]+\.test\.tsx?)\b/g)).map((m) => `tests/${m[1]}`)));
    const ignored = new Set((pkg[J].testPathIgnorePatterns as string[]).map((e) => e.replace('<rootDir>/', '')));
    // починен и возвращён в обычный прогон: журнал [INTRO-BLUR] за DIAG_ENABLED (18.10) — в списке V2 остался как «среда», но больше не красный
    // + четыре теста, которые чинит сам V2 (перепин сделан / файл в рабочей копии V2): в карантин не прячем, остаются в обычном прогоне
    const restored = new Set([
      'tests/learning_v2_session_intro_feedback_behavior.test.tsx',
      'tests/learning_v2_new_word_encounter_projection_v1.test.ts',
      'tests/learning_v2_all_ready_tasks_runtime_audit.test.ts',
      'tests/learning_v2_factory_production_audio_contract.test.ts',
      'tests/learning_v2_factory_native_projection_v1.test.ts',
    ]);
    expect(listed.filter((f) => fs.existsSync(path.join(root, f)) && !ignored.has(f) && !restored.has(f))).toEqual([]);
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
