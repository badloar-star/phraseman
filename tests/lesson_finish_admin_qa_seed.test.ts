import fs from 'fs';
import path from 'path';

describe('lesson finish admin QA seed contract', () => {
  it('provides a deep-link QA seed that opens lesson 1 at the final question', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', '_admin_settings_testers.tsx'), 'utf8');

    expect(source).toContain("qa !== 'lesson_finish_49'");
    expect(source).toContain("lessonProgressKey(1, studyTarget)");
    expect(source).toContain("lessonSessionKey(1, 'cellIndex', studyTarget)");
    expect(source).toContain("lessonSessionKey(1, 'phraseOrder', studyTarget)");
    expect(source).toContain("lessonSessionKey(1, 'errorReplayOverride', studyTarget)");
    expect(source).toContain("seedDailyTasksAdminPack(['lc1'], 'empty', studyTarget)");
    expect(source).toContain("router.replace({ pathname: '/lesson1', params: { id: '1', from: 'qa_lesson_finish_49' } }");
  });
});
