import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_briefing.tsx'), 'utf8');

describe('Dialogue V2 briefing route transient layout', () => {
  it('keeps loading and unavailable states in the same safe-area shell as the ready screen', () => {
    expect(source).toContain('function DialogueV2BriefingTransientScreen');
    expect(source).toContain('testID="dialogue-v2-briefing-loading"');
    expect(source).toContain('testID="dialogue-v2-briefing-unavailable"');
    // Безопасные зоны сверху и снизу держит общий экран-гейт Liquid Glass.
    expect(source).toContain('<DialogueGlassGate');
    const gate = readFileSync(path.join(__dirname, '..', 'components', 'dialogs', 'glass', 'DialogueGlassKit.tsx'), 'utf8');
    expect(gate).toContain("edges={['top', 'bottom']}");
  });
});
