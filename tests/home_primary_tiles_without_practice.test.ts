import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '../app/(tabs)/home.tsx'), 'utf8');

describe('home primary tiles', () => {
  test('places gated MAX between Lessons and Cards without restoring Practice', () => {
    const quickItems = source.slice(source.indexOf('const quickItems = ['), source.indexOf('const visibleQuickItems'));
    expect(quickItems).toContain("key: 'lesson'");
    expect(quickItems).toContain("key: 'max'");
    expect(quickItems).toContain("key: 'flashcards'");
    expect(quickItems.indexOf("key: 'lesson'")).toBeLessThan(quickItems.indexOf("key: 'max'"));
    expect(quickItems.indexOf("key: 'max'")).toBeLessThan(quickItems.indexOf("key: 'flashcards'"));
    expect(quickItems).not.toContain("key: 'practice'");
    expect(source).toContain('homeQuickRowGap * 2) / 3');
    expect(source).toContain('isMaxVoiceEntryVisible');
    expect(source).toContain("pathname: '/max_call_session'");
    expect(source).toContain("params: { format: 'tutor', cefr: guessLearnerCefr() }");
    expect(source).toContain('<MaxHomeOrb');
  });

  test('does not preload or navigate to the retired trainer', () => {
    expect(source).not.toContain('prefetchTrainerPracticeSnapshot');
    expect(source).not.toContain('getTrainerTotalDue');
    expect(source).not.toContain('getMistakePracticeReadyCount');
    expect(source).not.toContain('dueItems');
    expect(source).not.toContain('setDueCount');
    expect(source).not.toContain("go('/trainer')");
  });
});
