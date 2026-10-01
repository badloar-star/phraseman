import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('flashcards persistence diagnostics contract', () => {
  test('records a non-PII reason for every guarded persist exit', () => {
    const source = fs.readFileSync(path.join(ROOT, 'hooks', 'use-flashcards.ts'), 'utf8');
    const persist = source.slice(source.indexOf('async function persistFlashcards('), source.indexOf('export const saveFlashcards'));

    expect(persist).toContain("persistFlashcardsSkip('account_not_current')");
    expect(persist).toContain("persistFlashcardsSkip('scope_unavailable')");
    expect(persist).toContain("persistFlashcardsSkip('account_changed_before_commit')");
    expect(persist).toContain("persistFlashcardsSkip('commit_not_current')");
    expect(persist).toContain("persistFlashcardsSkip('storage_write_failed')");
    expect(persist).not.toMatch(/console\.(warn|error)\([^)]*(?:snapshot|cards|uid|accountToken)/i);
  });
});
