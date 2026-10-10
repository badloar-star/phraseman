import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

// зачем (координатор 10.10, гейт «приложение = макет»): полосы прогресса приложения двигаются по kit.css `.trk > i` —
// 800 мс cubic-bezier(.2,.8,.2,1). Числа живут в KIT_MOTION, заливка практики/слов/глаголов/предлогов/опроса — один общий
// компонент KitProgressFill (раньше scaleX ставился мгновенно, скачком на каждый ответ).
describe('progress bars follow kit.css .trk > i', () => {
  test('KitProgressFill takes duration and curve from KIT_MOTION and starts at the target ratio', () => {
    const src = read('components', 'KitProgressFill.tsx');
    expect(src).toContain('KIT_MOTION.progressMs');
    expect(src).toContain('KIT_MOTION.progressEase');
    expect(src).toContain('useSharedValue(target)');
    expect(src).toContain('useReducedMotion');
    expect(src).not.toMatch(/withSpring/);
  });

  test.each([
    ['app', 'lesson_words.tsx'],
    ['app', 'lesson_irregular_verbs.tsx'],
    ['app', 'preposition_drill.tsx'],
    ['components', 'practice/PracticeStates.tsx'],
    ['components', 'survey/SurveySheetModal.tsx'],
  ])('%s/%s draws its fill through KitProgressFill, not an instant scaleX', (dir, file) => {
    const src = read(dir, ...file.split('/'));
    expect(src).toContain('<KitProgressFill');
    expect(src).not.toMatch(/transform:\s*\[\{\s*scaleX:\s*(ratio|words\.length|allVerbs\.length|total)/);
  });

  test.each([
    ['components', 'GradientProgressBar.tsx'],
    ['components', 'stats/StatProgressRow.tsx'],
    ['components', 'friends/DailyPollCard.tsx'],
  ])('%s/%s uses KIT_MOTION progress timing', (dir, file) => {
    const src = read(dir, ...file.split('/'));
    expect(src).toContain('KIT_MOTION.progressMs');
    expect(src).toContain('KIT_MOTION.progressEase');
  });
});
