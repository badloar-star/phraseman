import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_dialog_session.tsx'), 'utf8');

describe('lesson AI dialog session contract', () => {
  it('builds lesson-specific scenarios from lesson phrase data', () => {
    expect(source).toContain('lessonId?: string');
    expect(source).toContain('buildLessonDialogScenario');
    expect(source).toContain('getLessonData(lessonId)');
    expect(source).toContain('lessonPhrases');
    expect(source).toContain('Useful lesson phrases');
  });
});
