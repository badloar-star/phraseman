import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(
  path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2BriefingScreen.tsx'),
  'utf8',
);

describe('Dialogue V2 briefing liquid-glass contract', () => {
  it('keeps the scene, briefing and tasks inside opaque glass surfaces', () => {
    expect(source).toContain('testID="dialogue-v2-briefing-scene"');
    // Непрозрачное стекло темы (макет dialogs.html .bcard) + медальон сцены 88.
    expect(source).toContain('dialogueGlassCardStyle(glass)');
    expect(source).toContain('width: 88, height: 88, borderRadius: 28');
    expect(source).toContain('testID="dialogue-v2-briefing-tasks"');
  });

  it('keeps the real rank gate visible and the start control safe-area pinned', () => {
    expect(source).toContain('locked: (rankRequired: number) => string;');
    expect(source).toContain('labels.locked(rankRequired)');
    expect(source).toContain('edges={[\'bottom\']}');
    expect(source).toContain('disabled={!unlocked}');
  });
});
