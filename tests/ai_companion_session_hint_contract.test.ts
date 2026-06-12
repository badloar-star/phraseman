import fs from 'fs';
import path from 'path';

describe('ai companion session hint contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_companion_session.tsx'), 'utf8');

  it('uses a Russian next-step recommendation instead of canned answer buttons', () => {
    expect(source).toContain('Что можно спросить');
    expect(source).toContain('Спроси про фразу, прогресс или свой следующий шаг');
    expect(source).not.toContain("['Tell me more.'");
    expect(source).not.toContain('I’m not sure');
    expect(source).not.toContain('fromSuggested');
    expect(source).not.toContain('ai_dialog_suggested_tapped');
  });
});
