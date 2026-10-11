import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(
  path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2BriefingScreen.tsx'),
  'utf8',
);

describe('Dialogue V2 briefing Design 2.0 contract', () => {
  it('uses the existing V2 system and makes goals learner-visible', () => {
    // Liquid Glass (макет dialogs.html B1): токены темы через общий набор диалогов.
    expect(source).toContain("from './glass/DialogueGlassKit'");
    expect(source).toContain('useDialogueGlass()');
    expect(source).toContain('objectives');
    expect(source).toContain('rankRequired');
  });

  // зачем (владелец 11.10, журнал 37): карточки участников на брифинге нет и возвращать её нельзя.
  it('has no participants card', () => {
    expect(source).not.toMatch(/participants|Participants/);
  });

  it('does not reintroduce legacy purchase or subscription access into the briefing', () => {
    expect(source).not.toMatch(/purchase|runes|Plus|premium_modal/i);
  });
});
