import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '../app/(tabs)/home.tsx'), 'utf8');

describe('home primary tiles', () => {
  // зачем (координатор §46, 2026-10-01): сетка «Быстрого старта» V1 (ряд из трёх,
  // шар MAX на плитке Диалогов) удалена вместе с Главной V1. Плитки 2.0 берут
  // первые три пункта quickItems по индексу — порядок «Уроки → Диалоги → Карточки»
  // и вход в Диалоги по-прежнему держатся здесь.
  test('keeps Dialogues between Lessons and Cards in the V2 tiles', () => {
    const quickItems = source.slice(source.indexOf('const quickItems = ['), source.indexOf('const homeV2AllTiles'));
    expect(quickItems.indexOf("key: 'lesson'")).toBeGreaterThan(-1);
    expect(quickItems.indexOf("key: 'lesson'")).toBeLessThan(quickItems.indexOf("key: 'dialogs'"));
    expect(quickItems.indexOf("key: 'dialogs'")).toBeLessThan(quickItems.indexOf("key: 'flashcards'"));
    expect(quickItems).not.toContain("key: 'practice'");
    expect(quickItems).toContain("ru: 'Диалоги'");
    expect(quickItems).toContain("nav.push('/ai_dialog_home' as never)");

    const v2Tiles = source.slice(source.indexOf('const homeV2AllTiles'), source.indexOf('const homeV2TileVisible'));
    const lessonsTile = v2Tiles.indexOf("key: 'lessons'");
    const dialogsTile = v2Tiles.indexOf("key: 'dialogs'");
    const cardsTile = v2Tiles.indexOf("key: 'cards'");
    expect(lessonsTile).toBeGreaterThan(-1);
    expect(lessonsTile).toBeLessThan(dialogsTile);
    expect(dialogsTile).toBeLessThan(cardsTile);
    expect(v2Tiles.slice(dialogsTile, cardsTile)).toContain('onPress: quickItems[1]!.onPress');
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
