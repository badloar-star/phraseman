// зачем (координатор 15.10): dev_state?shortLesson=N — урок из N заданий для честной проверки итога (серия, монеты, звёзды — боевой код).
// Сторож: подменяется только число позиций урока; в стор-сборке — заглушка (null), metro её подставляет.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const g = globalThis as typeof globalThis & { __DEV__?: boolean };

describe('dev_state?shortLesson=N', () => {
  beforeEach(() => { jest.resetModules(); jest.spyOn(console, 'log').mockImplementation(() => undefined); jest.spyOn(console, 'warn').mockImplementation(() => undefined); });

  it('dev-сборка: 3 → урок из 3 заданий, off → обычный, вне 1..10 — отказ', async () => {
    g.__DEV__ = true;
    const m = await import('../app/dev_short_lesson');
    expect(m.getDevShortLessonCells()).toBeNull();
    expect(m.setDevShortLessonCells(3)).toBe(true);
    expect(m.getDevShortLessonCells()).toBe(3);
    expect(m.setDevShortLessonCells(11)).toBe(false);
    expect(m.getDevShortLessonCells()).toBe(3);
    expect(m.setDevShortLessonCells(null)).toBe(true);
    expect(m.getDevShortLessonCells()).toBeNull();
  });

  it('стор-сборка (__DEV__=false): подмена игнорируется', async () => {
    g.__DEV__ = false;
    const m = await import('../app/dev_short_lesson');
    expect(m.setDevShortLessonCells(3)).toBe(false);
    expect(m.getDevShortLessonCells()).toBeNull();
  });

  it('урок меняет только число позиций; заглушка стор-сборки и metro на месте', () => {
    const lesson = read('app/lesson1.tsx');
    expect(lesson).toContain('return getDevShortLessonCells() ?? FULL_LESSON_TOTAL;');
    expect(lesson).toContain('const effectiveTotal = Math.min(LESSON_DATA.length, lessonTotal());');
    expect(read('store_release_stubs/dev_state/dev_short_lesson_stub.ts')).toContain('export function getDevShortLessonCells(): null { return null; }');
    expect(read('metro.config.js')).toContain("'dev_short_lesson',");
    expect(read('app/dev_state_fixtures.ts')).toContain("await import('./dev_short_lesson')");
  });
});
