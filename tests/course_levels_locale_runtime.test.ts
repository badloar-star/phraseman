import fs from 'node:fs';
import path from 'node:path';
import {
  getFirstLessonForLevel,
  getLastLessonForLevel,
} from '../app/course_levels';

const ROOT = path.resolve(__dirname, '..');

describe('course levels locale runtime audit', () => {
  it('keeps lesson range helpers stable without RU/UK/ES return-pattern noise', () => {
    expect(getFirstLessonForLevel('A1')).toBe(1);
    expect(getLastLessonForLevel('A1')).toBe(8);
    expect(getFirstLessonForLevel('B2')).toBe(29);
    expect(getLastLessonForLevel('B2')).toBe(32);

    const source = fs.readFileSync(path.join(ROOT, 'app', 'course_levels.ts'), 'utf8');
    expect(source).not.toMatch(/return\s+COURSE_LEVEL_RANGES/u);
  });
});
