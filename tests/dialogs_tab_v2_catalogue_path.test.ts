import fs from 'fs';
import path from 'path';

describe('DialogsTabContent live V2 catalogue path', () => {
  it('renders only the V2 catalogue container and carries only scenarioId to the V2 briefing route', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'DialogsTabContent.tsx'), 'utf8');
    const livePath = source.slice(
      source.indexOf('export default function DialogsTabContent'),
      source.indexOf('function DialogsTabContentBody'),
    );

    expect(livePath).toContain('<DialogueV2CatalogueContainer');
    expect(livePath).toContain("pathname: '/dialogue_v2_briefing'");
    expect(livePath).toContain('params: { scenarioId: item.id }');
    expect(livePath).toContain('headerSlot');
    expect(livePath).toContain('bottomPadding');
    expect(livePath).toContain('topPadding');
    expect(livePath).toContain('onScroll');
    expect(livePath).not.toContain('ai_dialog_briefing');
    expect(livePath).not.toContain('premium_modal');
    expect(livePath).not.toContain('DialogScenarioTile');
    expect(livePath).not.toContain('runes');
    expect(livePath).not.toContain('Plus');
  });
});
