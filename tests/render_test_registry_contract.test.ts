// зачем (координатор 14.10, после 2240f9778): рендер-тест, которому нужен настоящий react-native, надо вписывать в ДВА места —
// список jest.rntl.config.cjs (настоящий RN) и testPathIgnorePatterns основного раннера в package.json (там react-native — заглушка
// без StyleSheet). Забыли второе — основной раннер падает «Test suite failed to run» (так было с moment_coin_contract). Правило
// не держим в голове: этот сторож находит такие тесты и называет файл и строку, куда вписать.
//
// «Нужен настоящий react-native» = одновременно: снимает подмену jest.unmock('react-native'), импортирует @testing-library/react-native
// и рисует компоненты через render(. Просто импорт testing-library — не признак: часть тестов основного раннера использует renderHook
// с заглушкой и проходит; тесты рендер-списка, которые подменяют RN сами, проходят в обоих раннерах — двойной запуск не запрещён.
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const RNTL_CONFIG = 'jest.rntl.config.cjs';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- конфиг рендер-раннера — CommonJS
const rntlConfig = require(path.join(ROOT, RNTL_CONFIG)) as { testMatch: string[] };
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { jest: { testPathIgnorePatterns: string[] } };

const rel = (entry: string) => entry.replace('<rootDir>/', '');
const rntlList = new Set(rntlConfig.testMatch.map(rel));
const mainIgnored = new Set(pkg.jest.testPathIgnorePatterns.map(rel));

const testFiles = fs.readdirSync(path.join(ROOT, 'tests'))
  .filter((f) => /\.test\.tsx?$/.test(f))
  .map((f) => `tests/${f}`);

function needsRealReactNative(file: string): boolean {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  return /jest\.unmock\(['"]react-native['"]\)/.test(src)
    && /from ['"]@testing-library\/react-native['"]/.test(src)
    && /\brender\(/.test(src);
}

describe('render tests are registered in both runners', () => {
  it('every render-config entry points to an existing test file', () => {
    const missing = [...rntlList].filter((f) => !fs.existsSync(path.join(ROOT, f)));
    expect(missing.map((f) => `${f}: файла нет — убери строку '<rootDir>/${f}' из ${RNTL_CONFIG} (testMatch)`)).toEqual([]);
  });

  it('every test that needs the real react-native is in the render config AND excluded from the main runner', () => {
    const problems: string[] = [];
    for (const file of testFiles.filter(needsRealReactNative)) {
      if (!rntlList.has(file)) problems.push(`${file}: рисует компоненты с настоящим react-native — впиши '<rootDir>/${file}' в ${RNTL_CONFIG} → testMatch`);
      if (!mainIgnored.has(file)) problems.push(`${file}: основной раннер подменяет react-native заглушкой без StyleSheet — впиши "<rootDir>/${file}" в package.json → jest.testPathIgnorePatterns`);
    }
    expect(problems).toEqual([]);
  });

  it('the detector itself still sees the known render tests (guard is not blind)', () => {
    expect(needsRealReactNative('tests/moment_coin_contract.test.tsx')).toBe(true);
    expect(needsRealReactNative('tests/friend_list_row.test.tsx')).toBe(true);
  });
});
