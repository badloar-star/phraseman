import fs from 'fs';
import path from 'path';

describe('Dialogue V2 completion route', () => {
  test('renders the generated partner assessment, every objective and the correction in Design 2.0', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_completion.tsx'), 'utf8');
    expect(source).toContain('completeDialogueV2Session');
    expect(source).toContain('review.assessment');
    expect(source).toContain('review.objectiveResults.map');
    expect(source).toContain('review.corrections.map');
    expect(source).toContain('review.tip');
    expect(source).toContain('dialogue-v2-completion-retry');
    expect(source).toContain('selectionRef');
    expect(source).toContain('liquidGlassTokens');
    expect(source).toContain('V2_TYPE');
    expect(source).not.toContain('history:');
    expect(source).not.toContain('provider');
  });
});
