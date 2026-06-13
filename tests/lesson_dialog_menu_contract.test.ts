import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_menu.tsx'), 'utf8');

describe('lesson menu dialog entry', () => {
  it('does not render a lesson-level dialog row', () => {
    expect(source).not.toContain("testID: 'lesson-menu-dialog'");
    expect(source).not.toContain('getLessonDialogScenarioId(lessonId)');
    expect(source).not.toContain('lessonDialogLockedHint(lang)');
  });

  it('does not keep a dev-only lesson dialog unlock toggle', () => {
    expect(source).not.toContain("testID=\"lesson-menu-dialog-dev-toggle\"");
    expect(source).not.toContain('lessonDialogUnlockedByProgress');
    expect(source).not.toContain('lessonDialogDevUnlocked');
    expect(source).not.toContain("AsyncStorage.setItem('lesson_dialog");
  });

  it('leaves lesson menu free of direct ai dialog session routing', () => {
    expect(source).not.toContain("pathname: '/ai_dialog_session'");
    expect(source).not.toContain('scenarioId: lessonDialogScenarioId');
    expect(source).not.toContain("pathname: '/lesson_dialog'");
  });
});
