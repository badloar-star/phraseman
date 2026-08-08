import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('visible-result surface integration', () => {
  // зачем: app/quizzes/result_view.tsx (квизы) и app/arena_results.tsx (Арена)
  // удалены вместе с этими фичами; живые экраны ниже сохраняют проверку модели.
  test.each([
    'app/lesson_complete.tsx',
    'app/personal_plan_complete.tsx',
  ])('%s builds a confirmed completion model', (file) => {
    const source = read(file);
    expect(source).toContain('buildProgressCompletionModel');
    expect(source).toMatch(/ProgressCompletionView|ProgressProofBlock/);
  });

  // зачем: 'arena gates celebration facts...' и 'quiz result keeps...' проверяли
  // только удалённые app/arena_results.tsx и app/quizzes/result_view.tsx — без них
  // от этих it не остаётся ни одной живой проверки, поэтому оба удалены целиком.
});
