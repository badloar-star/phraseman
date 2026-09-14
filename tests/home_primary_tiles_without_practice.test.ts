import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '../app/(tabs)/home.tsx'), 'utf8');

describe('home primary tiles', () => {
  test('places Dialogues between Lessons and Cards and reuses the exact themed MAX orb', () => {
    const quickItems = source.slice(source.indexOf('const quickItems = ['), source.indexOf('const visibleQuickItems'));
    expect(quickItems).toContain("key: 'lesson'");
    expect(quickItems).toContain("key: 'dialogs'");
    expect(quickItems).toContain("key: 'flashcards'");
    expect(quickItems.indexOf("key: 'lesson'")).toBeLessThan(quickItems.indexOf("key: 'dialogs'"));
    expect(quickItems.indexOf("key: 'dialogs'")).toBeLessThan(quickItems.indexOf("key: 'flashcards'"));
    expect(quickItems).not.toContain("key: 'practice'");
    expect(quickItems).toContain("ru: 'Диалоги'");
    expect(quickItems).toContain("nav.push('/ai_dialog_home' as never)");
    expect(source).toContain('homeQuickRowGap * 2) / 3');
    expect(source).toContain('const maxOrbLayers = getMaxHomeOrbLayers(themeMode)');
    expect(source).toContain("item.key === 'dialogs'");
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
