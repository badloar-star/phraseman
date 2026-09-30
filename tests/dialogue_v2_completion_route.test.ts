import fs from 'fs';
import path from 'path';

// зачем (владелец 2026-09-30, макет dialogs.html D1–D5): итог диалога — единый экран
// завершения на токенах Liquid Glass: оценка собеседника, цели, «было → стало», отзыв.

describe('Dialogue V2 completion route', () => {
  test('renders the partner assessment, every objective and the corrections in the 2.0 finale', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_completion.tsx'), 'utf8');
    expect(source).toContain('completeDialogueV2Session');
    expect(source).toContain('review.assessment');
    expect(source).toContain('review.objectiveResults.map');
    expect(source).toContain('errorRows.map');
    expect(source).toContain('readDialogueV2SessionOutcome');
    expect(source).toContain('dialogue-v2-completion-retry');
    expect(source).toContain('selectionRef');
    expect(source).toContain('useDialogueGlass()');
    expect(source).toContain('kind="dialogue"');
    expect(source).toContain('presentation="liquid-glass-rate"');
    expect(source).not.toContain('history:');
    expect(source).not.toContain('provider');
  });
});
