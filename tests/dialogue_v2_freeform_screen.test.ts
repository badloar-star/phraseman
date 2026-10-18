import fs from 'fs';
import path from 'path';

describe('DialogueV2FreeformScreen', () => {
  it('uses the existing Design 2 chat tokens without scenario or legacy companion language', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2FreeformScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('useDialogueGlass()');
    expect(source).toContain('testID="dialogue-v2-freeform-empty"');
    expect(source).toContain('testID="dialogue-v2-freeform-screen"');
    expect(source).toContain('testID="dialogue-v2-freeform-typing"');
    expect(source).toContain('disabled={sending || !canSend}');
    expect(source).not.toContain('Compass');
    expect(source).not.toContain('ai_companion');
    expect(source).not.toContain('scenarioId');
    expect(source).not.toContain('rank');
    expect(source).not.toContain('task');
    expect(source).not.toContain('memoryNote');
    const route = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_freeform.tsx'), 'utf8');
    expect(route).not.toContain('Помнит контекст этого языка');
    expect(route).not.toContain('memoryNote=');
  });
});
