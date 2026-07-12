import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('visible-result surface integration', () => {
  test.each([
    'app/lesson_complete.tsx',
    'app/quizzes/result_view.tsx',
    'app/personal_plan_complete.tsx',
    'app/arena_results.tsx',
  ])('%s builds a confirmed completion model', (file) => {
    const source = read(file);
    expect(source).toContain('buildProgressCompletionModel');
    expect(source).toMatch(/ProgressCompletionView|ProgressProofBlock/);
  });

  test('arena gates celebration facts on the saved/server result', () => {
    const source = read('app/arena_results.tsx');
    expect(source).toContain('resultSaved');
    expect(source).toContain('confirmed: serverResultConfirmed ?');
    expect(source).toContain('arenaNextStepCopy(lang, isWinner, serverResultConfirmed)');
    expect(source).toContain("outcome: isWinner ? 'success' : isDraw ? 'neutral' : 'defeat'");
  });
});
