import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(
  path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2BriefingScreen.tsx'),
  'utf8',
);

describe('Dialogue V2 briefing Design 2.0 contract', () => {
  it('uses the existing V2 system and makes goals plus participants learner-visible', () => {
    // Liquid Glass (макет dialogs.html B1): токены темы через общий набор диалогов.
    expect(source).toContain("from './glass/DialogueGlassKit'");
    expect(source).toContain('useDialogueGlass()');
    expect(source).toContain('objectives');
    expect(source).toContain('participants');
    expect(source).toContain('rankRequired');
  });

  it('does not reintroduce legacy purchase or subscription access into the briefing', () => {
    expect(source).not.toMatch(/purchase|runes|Plus|premium_modal/i);
  });
});
