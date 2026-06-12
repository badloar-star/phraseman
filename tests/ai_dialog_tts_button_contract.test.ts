import fs from 'fs';
import path from 'path';

describe('ai dialog TTS button contract', () => {
  const scenarioSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_dialog_session.tsx'), 'utf8');
  const companionSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_companion_session.tsx'), 'utf8');

  it('keeps speaker controls large enough to tap reliably', () => {
    for (const source of [scenarioSource, companionSource]) {
      expect(source).toContain('accessibilityLabel="Озвучить реплику"');
      expect(source).toContain('width: 44');
      expect(source).toContain('minHeight: 44');
      expect(source).toContain('justifyContent: \'center\'');
      expect(source).toContain('volume-medium-outline');
      expect(source).toContain("voice: ''");
    }
  });
});
