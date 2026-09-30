import fs from 'fs';
import path from 'path';

describe('Dialogue V2 completion glass shell', () => {
  test('renders only grounded review data inside a safe header, glass cards, and fixed Done action', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_completion.tsx'), 'utf8');

    expect(source).toContain('dialogue-v2-completion-header');
    expect(source).toContain('dialogue-v2-completion-done');
    expect(source).toContain('paddingBottom: V2.cta.height + V2.screenPad * 3');
    expect(source).toContain('backgroundColor: palette.glassRaised');
    expect(source).toContain('review.objectiveResults.map');
    expect(source).toContain('review.corrections.map');
    expect(source).toContain('review.evidence.map');
    expect(source).toContain('router.back()');

    // Completion payload intentionally carries no fabricated economy or score fields.
    expect(source).not.toContain('Монеты');
    expect(source).not.toContain('XP');
    expect(source).not.toContain('Точность');
    expect(source).not.toContain('Сценарий:');
  });
});
