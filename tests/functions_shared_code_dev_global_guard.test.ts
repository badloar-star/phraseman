// зачем (координатор 17.10, блокер полного деплоя): общий модуль Learning V2 собирается и в приложение, и в серверные
// функции. В приложении `__DEV__` объявлен, на сервере — нет, и голый `__DEV__` в общем файле валил сборку functions
// (TS2304, efdf2336a → 0f25d0ca5). Сторож обходит всё, что functions/src тянет из кода ВНЕ functions/ (по относительным
// импортам, транзитивно), и запрещает там любое имя `__DEV__` — даже под typeof (TS2304). Разрешено: `globalThis.__DEV__`,
// обращение через приведение `(globalThis as …).__DEV__`.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "..");
const FUNCTIONS_SRC = path.join(ROOT, "functions", "src");
const FUNCTIONS_DIR = path.join(ROOT, "functions") + path.sep;
const EXTENSIONS = [".ts", ".tsx", ".js", "/index.ts", "/index.js"];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(full);
    return /\.ts$/u.test(entry.name) && !/\.test\.ts$/u.test(entry.name) ? [full] : [];
  });
}

function resolveImport(fromFile: string, specifier: string): string | null {
  const base = path.resolve(path.dirname(fromFile), specifier);
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function relativeImports(file: string): string[] {
  // зачем: JSON (например, справка поддержки support_repo_context.json) хранит тексты исходников как строки —
  // их «импорты» в сборку не попадают, а обход по ним уходил во всё приложение (5021 ложный файл).
  if (!/\.(?:ts|tsx|js)$/u.test(file)) return [];
  const source = fs.readFileSync(file, "utf8");
  const found: string[] = [];
  const pattern = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/gu;
  for (const match of source.matchAll(pattern)) {
    const resolved = resolveImport(file, match[1]!);
    if (resolved) found.push(resolved);
  }
  return found;
}

function sharedFilesCompiledIntoFunctions(): string[] {
  const seen = new Set<string>();
  const shared = new Set<string>();
  const queue = walk(FUNCTIONS_SRC);
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (!file.startsWith(FUNCTIONS_DIR)) shared.add(file);
    for (const next of relativeImports(file)) if (!seen.has(next)) queue.push(next);
  }
  return [...shared].sort();
}

function bareDevUsages(file: string): string[] {
  const raw = fs.readFileSync(file, "utf8");
  // блочные комментарии гасим пробелами, сохраняя переносы — номера строк остаются верными
  const source = raw.replace(/\/\*[\s\S]*?\*\//gu, (block) => block.replace(/[^\n]/gu, " "));
  const lines = raw.split(/\r?\n/u);
  const problems: string[] = [];
  source.split(/\r?\n/u).forEach((line, index) => {
    const code = line.replace(/\/\/.*$/u, "");
    for (const match of code.matchAll(/__DEV__/gu)) {
      const before = code.slice(0, match.index);
      const after = code.slice(match.index! + "__DEV__".length);
      // зачем: `typeof __DEV__` НЕ спасает — TS2304 «Cannot find name» и под typeof (так и сломалось в efdf2336a).
      // Разрешено только обращение как к полю: `globalThis.__DEV__`, `(globalThis as …).__DEV__`.
      if (/[.?]\s*$/u.test(before) || /["'`][^"'`]*$/u.test(before)) continue;
      if (/^\s*\??:/u.test(after)) continue; // поле типа `{ __DEV__?: boolean }`, не обращение
      problems.push(`${path.relative(ROOT, file)}:${index + 1}: ${lines[index]!.trim()}`);
    }
  });
  return problems;
}

describe("functions build: shared code never uses a bare __DEV__", () => {
  const shared = sharedFilesCompiledIntoFunctions();

  test("functions/src actually pulls shared code from outside functions/ (the guard is not empty)", () => {
    expect(shared.length).toBeGreaterThan(0);
  });

  test("no shared file compiled into functions uses a bare __DEV__", () => {
    expect(shared.flatMap(bareDevUsages)).toEqual([]);
  });
});
