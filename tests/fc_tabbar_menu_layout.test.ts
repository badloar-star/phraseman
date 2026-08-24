/**
 * Сторож центрирования раскрывающихся меню таббара карточек.
 *
 * Все группы должны иметь одну центральную ось независимо от того, какая кнопка
 * нижней капсулы их открыла. Иначе длинные подписи визуально уезжают к краям.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const tabbar = fs.readFileSync(
  path.join(ROOT, 'app', 'flashcards', 'FlashcardsTabBar.tsx'),
  'utf8',
);

describe('раскрывающиеся меню таббара карточек', () => {
  it('тренировка, создание и наборы используют общий центральный док', () => {
    expect(tabbar.match(/styles\.menuDock/g)).toHaveLength(3);
    expect(tabbar.match(/style=\{styles\.menuList\}/g)).toHaveLength(3);
  });

  it('общий док растянут по ширине и центрирует содержимое', () => {
    expect(tabbar).toMatch(/menuDock:\s*\{[\s\S]*?left:\s*0,[\s\S]*?right:\s*0,[\s\S]*?alignItems:\s*'center'/);
    expect(tabbar).toMatch(/menuList:\s*\{[\s\S]*?alignItems:\s*'center'/);
    expect(tabbar).not.toContain('menuSideInset');
  });
});
