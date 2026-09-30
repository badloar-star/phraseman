/**
 * зачем: PM-192-A2 — фасет `pronunciation` означает «не прошла проверка
 * произношения». Его вправе писать ТОЛЬКО сессия говорения карточек
 * (app/flashcards_speaking_session.tsx). Любой другой писатель испортит
 * карту слабых мест (проценты «Произношение» в хабе ошибок и награды).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'hooks', 'modules'];
const ALLOWED_WRITER = 'app/flashcards_speaking_session.tsx';
const WRITE_PATTERN = /\b(?:kind|facet)\s*:\s*['"]pronunciation['"]/;

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|probe)\.tsx?$/.test(entry.name)) out.push(full);
  }
}

describe('facet pronunciation пишется только из сессии говорения', () => {
  it('единственный писатель — flashcards_speaking_session.tsx', () => {
    const files: string[] = [];
    for (const dir of SCAN_DIRS) walk(path.join(ROOT, dir), files);
    const writers = files
      .filter((file) => WRITE_PATTERN.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(ROOT, file).split(path.sep).join('/'));
    console.log('[PM-192] writers of pronunciation facet:', JSON.stringify(writers));
    expect(writers).toEqual([ALLOWED_WRITER]);
  });
});
