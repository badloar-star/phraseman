import fs from 'fs';
import path from 'path';

describe('ai dialog entry contract', () => {
  const homeSource = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8');
  const lessonsSource = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'lessons.tsx'), 'utf8');

  it('no longer renders a dialogues card on the home screen', () => {
    expect(homeSource).not.toContain('testID="home-open-ai-dialog"');
    expect(homeSource).not.toContain("router.push('/ai_dialog_home'");
  });

  it('exposes the dialogues page inside the lessons tab behind the feature flag', () => {
    expect(lessonsSource).toContain('isAiDialogEnabled()');
    expect(lessonsSource).toContain('DialogsTabContent');
    expect(lessonsSource).not.toContain("isAiDialogEnabled() && studyTarget === 'en'");
  });
});
