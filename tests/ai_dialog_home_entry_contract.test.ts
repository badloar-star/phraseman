import fs from 'fs';
import path from 'path';

describe('ai dialog home entry contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8');

  it('shows the home dialogues card whenever the feature flag is enabled', () => {
    expect(source).toContain('testID="home-open-ai-dialog"');
    expect(source).toContain('isAiDialogEnabled() ? (');
    expect(source).not.toContain("isAiDialogEnabled() && studyTarget === 'en'");
  });
});
