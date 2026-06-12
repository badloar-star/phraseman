import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_menu.tsx'), 'utf8');

describe('lesson menu gold dialog row', () => {
  it('renders a tappable dialog row gated by gold and 50 phrases', () => {
    expect(source).toContain("testID: 'lesson-menu-dialog'");
    expect(source).toContain('getLessonDialogScenarioId(lessonId)');
    expect(source).toContain('progress >= 50');
    expect(source).toContain("getMedalTier(score) === 'gold'");
  });

  it('opens the existing ai dialog session and shows a locked hint instead of hiding the row', () => {
    expect(source).toContain("pathname: '/ai_dialog_session'");
    expect(source).toContain('scenarioId: lessonDialogScenarioId');
    expect(source).toContain('lessonDialogLockedHint(lang)');
    expect(source).not.toContain("pathname: '/lesson_dialog'");
  });
});
