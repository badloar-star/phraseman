import fs from 'fs';
import path from 'path';

describe('free dialogue discovery card', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'DialogsTabContent.tsx'),
    'utf8',
  );

  it('gives Plus members a visible route into free conversation from the main catalogue', () => {
    expect(source).toContain("pathname: '/ai_companion_session'");
    expect(source).toContain("ru: 'Свободный разговор'");
    expect(source).toContain("ru: 'Открыть свободный разговор'");
    expect(source).toContain("ru: 'Практика без сценария'");
  });

  it('routes Free members to the existing Plus paywall instead of entering the chat', () => {
    expect(source).toContain("source: 'dialogs_companion'");
    expect(source).toContain("if (!accessResolved) return;");
    expect(source).toContain('if (!hasPremiumAccess)');
  });
});
