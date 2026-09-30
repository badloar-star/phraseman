import fs from 'fs';
import path from 'path';

describe('Dialogs tab does not expose the retired tutor hub', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'DialogsTabContent.tsx'), 'utf8');

  it('does not import, prepare, or render the retired Max tutor poster', () => {
    for (const retiredHubToken of [
      'TutorHubPoster',
      'readTutorLessonTrace',
      'isTextTutorEnabled',
      'hasRemoteConfigSnapshotApplied',
      'tutorNextTopic',
      'tutorEnabled',
      'openTutorLesson',
      'dialogs-tutor-poster',
      'dialogs_tutor_poster',
      'ai_dialog_tutor_lesson_opened',
      "'/ai_dialog_tutor_session'",
    ]) {
      expect(source).not.toContain(retiredHubToken);
    }
  });
});
