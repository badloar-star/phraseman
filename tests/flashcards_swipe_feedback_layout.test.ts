import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards_swipe.tsx'), 'utf8');

describe('flashcard training feedback layout', () => {
  it('keeps long explanations scrollable without covering the continue action', () => {
    expect(source).toContain('styles.feedbackScroll');
    expect(source).toContain('{ maxHeight: feedbackMaxHeight }');
    expect(source).toContain('contentContainerStyle={styles.feedbackScrollContent}');
    expect(source).toContain('showsVerticalScrollIndicator');
    expect(source).toContain('const feedbackMaxHeight = Math.max(120, Math.floor(cardHeight * 0.5));');
    expect(source).toContain('minHeight: 56');
  });
});
