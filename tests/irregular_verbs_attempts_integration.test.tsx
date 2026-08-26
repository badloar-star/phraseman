import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_irregular_verbs.tsx'), 'utf8');

describe('irregular verbs shared session attempts integration', () => {
  test('renders the shared attempts HUD and recovery modal', () => {
    expect(SOURCE).toContain("from '../components/session_attempts/SessionAttemptsHud'");
    expect(SOURCE).toContain("from '../components/session_attempts/SessionAttemptsRecoveryModal'");
    expect(SOURCE).toContain('<SessionAttemptsHud');
    expect(SOURCE).toContain('<SessionAttemptsRecoveryModal');
  });

  test('third pedagogical wrong stops before the verb or form advances', () => {
    expect(SOURCE).toContain("verdict: isCorrect ? 'correct' : 'pedagogical_wrong'");
    expect(SOURCE).toContain("attemptEffect === 'attempts_exhausted'");
    expect(SOURCE).toContain('return; // Keep the current verb form for recovery.');
  });

  test('recovery unlocks the same form and ending follows the existing lesson route', () => {
    expect(SOURCE).toContain('retryCurrentVerbFormAfterRecovery');
    expect(SOURCE).toContain('endAttemptsSession();');
    expect(SOURCE).toContain("pathname: '/lesson_menu'");
  });
});
