// Сторож (UX-волна 2, 04.11, владелец одобрил): полосы прогресса плеера курса, теста места, экзамена главы и меню урока едут через KitProgressFill
// (scaleX на нативном драйвере, Reduce Motion), а не прыгают по width: %.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('полосы прогресса: KitProgressFill вместо width: %', () => {
  it('плеер курса', () => {
    const s = read('app/learning_v2_direct_session_player_v1.tsx');
    expect(s).toContain('<KitProgressFill');
    expect(s).toContain('ratio={Math.max(0.04, progressOrdinal / totalInteractions)}');
    expect(s).not.toContain('Math.round((progressOrdinal / totalInteractions) * 100)');
  });
  it('тест места', () => {
    const s = read('components/learning-v2/placement/PlacementChrome.tsx');
    expect(s).toContain('<KitProgressFill testID="placement-progress-fill" ratio={progress.fraction}');
    expect(s).not.toMatch(/placement-progress-fill[^\n]*width:/);
  });
  it('экзамен главы', () => {
    const s = read('components/learning-v2/exam_v2/ChapterExamV2Run.tsx');
    expect(s).toContain('<KitProgressFill ratio={progress}');
    expect(s).not.toContain('width: `${Math.round(progress * 100)}%`');
  });
  it('меню урока (минимум 3 %: точка на нуле, как раньше minWidth 7)', () => {
    const s = read('components/lessons/LessonMenuGlass.tsx');
    expect(s).toContain('<KitProgressFill ratio={Math.max(0.03, ratio)}');
    expect(s).not.toContain('width: `${ratio * 100}%`');
  });
  it('заливка кита — scaleX на нативном драйвере и с Reduce Motion', () => {
    const s = read('components/KitProgressFill.tsx');
    expect(s).toContain('useNativeDriver: true');
    expect(s).toContain('useSystemReduceMotion');
  });
});
