import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const FEATURE_ROOT = path.join(ROOT, 'modules', 'mistake-practice');

function sourceFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(child);
    return /\.[jt]sx?$/.test(entry.name) ? [child] : [];
  });
}

describe('mistake practice Arena boundary', () => {
  test('imports at most public Arena presentation contracts', () => {
    const sources = sourceFiles(FEATURE_ROOT)
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');
    const arenaImports = [...sources.matchAll(/from\s+['"]([^'"]*arena[^'"]*)['"]/g)]
      .map((match) => match[1]);

    expect(arenaImports.every((value) =>
      value.endsWith('/arena/contract') || value.endsWith('/arena/task_adapter')),
    ).toBe(true);
  });

  test('does not pull competitive systems into mistake practice', () => {
    const sources = sourceFiles(FEATURE_ROOT)
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');

    expect(sources).not.toMatch(
      /arena_(?:match|queue|rating|stars|wallet|reward)|matchmaking|opponentKind|deadlineAtMs|ratingDelta|seasonStars/i,
    );
  });

  test('implementation does not edit protected Arena sources through generated copies', () => {
    expect(fs.existsSync(path.join(FEATURE_ROOT, 'arena'))).toBe(false);
    expect(fs.existsSync(path.join(FEATURE_ROOT, 'arena_contract.ts'))).toBe(false);
  });
});
