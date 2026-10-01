import fs from 'fs';
import path from 'path';

/*
 * Account V2 — сторож сборки Metro (СРОЧНО 2026-10-01).
 *
 * зачем: `declare readonly code` в классах ошибок проходил tsc и jest (ts-jest),
 * но ронял бандлер Android: Babel (babel-preset-expo, flow-strip-types) без
 * allowDeclareFields отвергает модификатор `declare`. jest этого не видит —
 * поэтому сторож прогоняет каждый файл модуля через НАСТОЯЩИЙ Babel проекта.
 */

const ROOT = path.resolve(__dirname, '..');
const MODULE_DIR = path.join(ROOT, 'modules', 'account-session-v2');

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [absolute] : [];
  });
}

describe('account-session-v2 Metro/Babel guard', () => {
  const files = sourceFiles(MODULE_DIR);

  test('module has files to check', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  test('no class field uses the `declare` modifier', () => {
    const offenders = files.flatMap((file) => fs.readFileSync(file, 'utf8').split('\n')
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => /^\s+declare\s+(?:readonly\s+|public\s+|private\s+|protected\s+)*[\w$]+[!?]?\s*:/.test(line))
      .map(({ index }) => `${path.relative(ROOT, file)}:${index + 1}`));
    expect(offenders).toEqual([]);
  });

  test('every file compiles with the project Babel config as Metro (android, dev and release)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const babel = require('@babel/core') as {
      transformFileSync(file: string, options: Readonly<Record<string, unknown>>): unknown;
    };
    const failures: string[] = [];
    for (const file of files) {
      for (const isDev of [true, false]) {
        try {
          babel.transformFileSync(file, {
            cwd: ROOT,
            filename: file,
            caller: { name: 'metro', bundler: 'metro', platform: 'android', isDev },
          });
        } catch (error) {
          failures.push(`${path.relative(ROOT, file)} isDev=${isDev}: ${String((error as Error).message).split('\n')[0]}`);
        }
      }
    }
    expect(failures).toEqual([]);
  }, 120_000);
});
