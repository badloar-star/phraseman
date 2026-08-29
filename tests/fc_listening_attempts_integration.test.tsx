import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards_listening_session.tsx'), 'utf8');

describe('passive listening shared session attempts integration', () => {
  test('shows attempts consistently without inventing pedagogical errors', () => {
    expect(SOURCE).toContain("from '../components/session_attempts/SessionAttemptsHud'");
    expect(SOURCE).toContain('<SessionAttemptsHud');
    expect(SOURCE).toContain('useSessionAttemptAutoReset');
    expect(SOURCE).not.toContain('SessionAttemptsRecoveryModal');
    expect(SOURCE).not.toContain("verdict: 'pedagogical_wrong'");
  });

  test('audio-engine failures are technical and stop playback before any recovery surface', () => {
    expect(SOURCE).toContain("verdict: 'technical_error'");
    expect(SOURCE).toContain("machineRef.current?.send({ type: 'PAUSE' })");
    expect(SOURCE).toContain('stopSpeech();');
  });
});
