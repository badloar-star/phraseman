import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const source = fs
  .readFileSync(path.join(ROOT, 'app/lesson_screen_bootstrap.ts'), 'utf8')
  .replace(/\r\n/g, '\n');

describe('lesson screen priming', () => {
  it('treats single-lesson priming as non-critical navigation optimization', () => {
    const start = source.indexOf('export async function primeLessonScreenFromStorage');
    const end = source.indexOf('\nexport function getLessonScreenPrimed', start);
    const body = source.slice(start, end);

    expect(body).toContain('try {');
    expect(body).toContain('await AsyncStorage.multiGet([');
    expect(body).toContain('} catch {');
    expect(body).not.toContain('throw ');
  });

  it('rejects damaged lesson ids before building storage keys', () => {
    expect(source).toContain('!Number.isInteger(lessonId)');
    expect(source).toContain('lessonId > LESSON_ID_MAX');
  });
});
