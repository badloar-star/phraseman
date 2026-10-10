import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('visible-result surface integration', () => {
  // зачем: app/quizzes/result_view.tsx (квизы) и app/arena_results.tsx (Арена)
  // удалены вместе с этими фичами; живые экраны ниже сохраняют проверку модели.
  test.each([
    'app/lesson_complete.tsx',
  ])('%s shows only confirmed completion facts on the shared 2.0 completion screen', (file) => {
    // зачем (10.10): итог урока — общий экран завершения 2.0 (владелец 01.10: «старые экраны заменить на макетные»);
    // прежняя модель buildProgressCompletionModel больше не используется. Суть сторожа — показывать только
    // подтверждённые цифры: неизвестное значение — null, а не выдуманный ноль.
    const source = read(file);
    expect(source).toContain('<V2DoneScreen');
    expect(source).toContain('correct={lessonCounts?.correct ?? null}');
  });

  // зачем: 'arena gates celebration facts...' и 'quiz result keeps...' проверяли
  // только удалённые app/arena_results.tsx и app/quizzes/result_view.tsx — без них
  // от этих it не остаётся ни одной живой проверки, поэтому оба удалены целиком.
});
