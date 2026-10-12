// зачем (перепрогон красных 15.10 вечер, Ядро → Темы): прежний сторож проверял шесть иконок режимов Карточек в стиле Midnight (assets/images/flashcards/mode_icons/midnight),
// но папка удалена ещё в checkpoint 96c32bb97, а Карточки 2.0 не рисуют тематические плитки хаба — иконки режимов собраны из векторных значков и обложек наборов.
// Тест превращён в проверку обратного: старых ассетов и ссылок на них в коде нет (иначе сборка тащила бы мёртвый вес или ломалась на отсутствующем файле).
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SOURCE_DIRS = ['app', 'components', 'constants', 'hooks', 'modules'];

function sourceFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(rel);
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : [];
  });
}

describe('midnight flashcards mode icon assets (retired)', () => {
  it('the old mode_icons asset folder is gone', () => {
    expect(fs.existsSync(path.join(ROOT, 'assets', 'images', 'flashcards', 'mode_icons'))).toBe(false);
  });

  it('no source file references the removed mode_icons assets', () => {
    const offenders = SOURCE_DIRS.flatMap(sourceFiles).filter((file) => fs.readFileSync(path.join(ROOT, file), 'utf8').includes('flashcards/mode_icons'));
    expect(offenders).toEqual([]);
  });
});
